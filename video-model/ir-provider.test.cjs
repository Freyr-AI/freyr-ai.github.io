const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function context() {
  const nodes = new Map();
  const document = {querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {classList: {toggle() {}}, value: "", disabled: false});
    return nodes.get(selector);
  }};
  const ctx = vm.createContext({document, localStorage: {getItem() {return null;}, setItem() {}}, console});
  const source = fs.readFileSync(`${__dirname}/app.js`, "utf8").replace(/bindEvents\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/, "");
  vm.runInContext(source, ctx);
  vm.runInContext(`state.preparedAssets = [{type:'image',sha256:'a',file:{name:'test.png'}}];
    state.preparedSettings = {irProvider:'H3Offical-IR'};`, ctx);
  return {ctx, nodes};
}

test("persistent IR uses short requests and reuses the key after a lost POST response", async () => {
  const {ctx} = context();
  const saved = new Map();
  Object.assign(ctx, {crypto: require('node:crypto').webcrypto, TextEncoder, AbortSignal,
    sessionStorage: {getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key)}});
  vm.runInContext(`authHeaders = () => ({Authorization:'Bearer test'});
    delay = async () => {}; setDiagnostics = () => {}; setStatus = () => {};
    globalThis.keys = [];
    fetchJson = async (url, options) => {
      if (options.method === 'POST') keys.push(options.headers['Idempotency-Key']);
      throw new Error('network lost');
    };`, ctx);
  await assert.rejects(vm.runInContext(`fetchPersistentIr('{"intent":"same"}')`, ctx), /network lost/);
  assert.equal(saved.size, 1);
  vm.runInContext(`fetchJson = async (url, options) => {
    if (options.method === 'POST') { keys.push(options.headers['Idempotency-Key']); return {id:'irjob_test'}; }
    return url.endsWith('/result') ? {id:'irjob_test',ir:{prompt:'ready'}} : {status:'completed'};
  };`, ctx);
  const result = await vm.runInContext(`fetchPersistentIr('{"intent":"same"}')`, ctx);
  assert.equal(result.id, 'irjob_test');
  assert.equal(new Set(ctx.keys).size, 1);
  assert.equal(saved.size, 0);
});

test("persistent IR polling survives a transient signal timeout", async () => {
  const {ctx} = context();
  Object.assign(ctx, {AbortSignal, AbortController});
  vm.runInContext(`authHeaders = () => ({Authorization:'Bearer test'});
    delay = async () => {}; setDiagnostics = () => {};
    globalThis.statusTitles = []; setStatus = title => statusTitles.push(title);
    globalThis.calls = 0;
    fetchJson = async url => {
      calls++;
      if (calls === 1) throw new Error('signal timed out');
      if (url.endsWith('/result')) return {id:'irjob_test',ir:{prompt:'ready'}};
      return {status:'completed'};
    };`, ctx);
  const result = await vm.runInContext(`pollPersistentIr('irjob_test')`, ctx);
  assert.equal(result.id, 'irjob_test');
  assert.ok(ctx.statusTitles.includes('IR 查询连接波动'));
});

test("asset upload reuses a server-side SHA after page state is lost", async () => {
  const {ctx} = context();
  Object.assign(ctx, {AbortSignal, AbortController});
  vm.runInContext(`
    sha256Hex = async () => 'a'.repeat(64);
    setStatus = () => {}; authHeaders = () => ({Authorization:'Bearer test'});
    state.abortController = {signal:new AbortController().signal};
    globalThis.lookups = 0; globalThis.uploads = 0;
    fetch = async () => ({ok:true,status:200});
    fetchJson = async () => { uploads++; };
    globalThis.asset = {id:'new-page-id',type:'image',number:1,
      file:{name:'large.png',type:'image/png',arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}};`, ctx);
  const result = await vm.runInContext('uploadAsset(asset, 0, 1)', ctx);
  assert.equal(result.sha256.length, 64);
  assert.equal(ctx.uploads, 0);
});

test("missing asset uploads the original binary file instead of base64 JSON", async () => {
  const {ctx} = context();
  vm.runInContext(`
    sha256Hex = async () => 'b'.repeat(64);
    setStatus = () => {}; authHeaders = () => ({Authorization:'Bearer test'});
    state.abortController = {signal:{}};
    globalThis.uploadOptions = null; globalThis.fetchCalls = 0;
    fetch = async () => ({ok:false,status:404,text:async()=>'{"detail":"not found"}',headers:{get:()=>''}});
    assetRequest = async (url, options) => {
      fetchCalls++;
      if (options.method === 'PUT') { uploadOptions = options; return {ok:true,status:201}; }
      return {ok:false,status:404,text:async()=>'{"detail":"not found"}',headers:{get:()=>''}};
    };
    globalThis.asset = {id:'new-file',type:'image',number:1,
      file:{name:'large.png',type:'image/png',arrayBuffer:async()=>new Uint8Array([4,5,6]).buffer}};`, ctx);
  await vm.runInContext('uploadAsset(asset, 0, 1)', ctx);
  assert.equal(ctx.uploadOptions.body, ctx.asset.file);
  assert.equal(ctx.uploadOptions.headers['Content-Type'], 'image/png');
  assert.equal(ctx.uploadOptions.headers.Authorization, 'Bearer test');
});

test("asset requests retry transient upstream connection failures", async () => {
  const {ctx} = context();
  Object.assign(ctx, {AbortSignal});
  vm.runInContext(`delay = async () => {}; globalThis.calls = 0;
    fetch = async () => {
      calls++;
      if (calls === 1) return {ok:false,status:500};
      if (calls === 2) throw new Error('temporary connect failure');
      return {ok:true,status:200};
    };`, ctx);
  const response = await vm.runInContext(`assetRequest('/asset', {}, undefined)`, ctx);
  assert.equal(response.status, 200);
  assert.equal(ctx.calls, 3);
});

test("refresh recovery restores settings and asset mapping without creating another task", async () => {
  const {ctx, nodes} = context();
  const records = new Map();
  Object.assign(ctx, {crypto: require('node:crypto').webcrypto, TextEncoder, AbortSignal, AbortController,
    localStorage: {getItem: key => records.get(key) || null,
      setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key)}});
  vm.runInContext(`authHeaders = () => ({Authorization:'Bearer secret-not-to-persist'});
    setStatus = () => {}; updatePipeline = () => {};
    state.preparedSettings = {irProvider:'H3Offical-IR', model:'MiniMax/MiniMax-H3-SH2',seconds:13,quality:'768P'};`, ctx);
  await vm.runInContext(`saveIrResume('irjob_' + 'a'.repeat(32))`, ctx);
  assert.equal(nodes.get('#irResumePanel').hidden, false);
  assert.doesNotMatch([...records.values()].join(''), /secret-not-to-persist/);
  vm.runInContext(`state.preparedSettings = null; state.preparedAssets = [];
    pollPersistentIr = async id => ({id,provider:'H3Offical-IR',validation:{passed:true},
      ir:{manifest:[{kind:'image',sha256:'a',label:'<Picture 1>'}]}});`, ctx);
  await vm.runInContext('resumeIrTask()', ctx);
  assert.equal(vm.runInContext('state.preparedSettings.seconds', ctx), 13);
  assert.equal(vm.runInContext('state.preparedAssets[0].sha256', ctx), 'a');
  assert.equal(vm.runInContext('state.irVerified', ctx), true);
});

test("recovery refuses a different credential before polling", async () => {
  const {ctx} = context();
  const record = {id:'irjob_'+'a'.repeat(32),credentialDigest:'different',savedAt:Date.now(),assets:[],settings:{}};
  Object.assign(ctx, {crypto: require('node:crypto').webcrypto, TextEncoder, AbortController,
    localStorage: {getItem: () => JSON.stringify(record)}});
  vm.runInContext(`authHeaders = () => ({Authorization:'Bearer other'});
    globalThis.polls=0; pollPersistentIr=async()=>{polls++;};
    setStatus=(title,message)=>{globalThis.message=message;};`, ctx);
  await vm.runInContext('resumeIrTask()', ctx);
  assert.equal(ctx.polls, 0);
  assert.match(ctx.message, /相同鉴权/);
});

test("new provider requires validated result and exact manifest", () => {
  const {ctx, nodes} = context();
  vm.runInContext(`state.brief = {id:'h3official_test', provider:'H3Offical-IR',validation:{passed:true},
    ir:{manifest:[{kind:'image',sha256:'a',label:'<Picture 1>'}]}};
    renderIrReview(state.brief); setBusy(false);`, ctx);
  assert.equal(nodes.get("#confirmGenerate").disabled, false);
  vm.runInContext(`state.brief.ir.manifest[0].label='<Picture 2>'; renderIrReview(state.brief); setBusy(false);`, ctx);
  assert.equal(nodes.get("#confirmGenerate").disabled, true);
});

test("provider substitution is blocked", () => {
  const {ctx, nodes} = context();
  vm.runInContext(`state.brief = {id:'old',provider:'OpenH3-IR',ir:{manifest:[{kind:'image',sha256:'a',label:'<Picture 1>'}]}};
    renderIrReview(state.brief); setBusy(false);`, ctx);
  assert.equal(nodes.get("#confirmGenerate").disabled, true);
});

test("validation reasons are visible", () => {
  const {ctx} = context();
  const result = vm.runInContext(`friendlyError(new ApiError(422, {detail:{code:'ir_validation_failed',errors:['missing voice binding']}}))`, ctx);
  assert.match(result, /missing voice binding/);
});

test("official audio omits optional role/note; old IR payload stays unchanged", () => {
  const {ctx} = context();
  const result = vm.runInContext(`irAssetPayload({type:'audio',sha256:'a',file:{name:'林雪音色.wav'}}, 'H3Offical-IR')`, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {kind:'audio',sha256:'a',filename:'林雪音色.wav'});
  const old = vm.runInContext(`irAssetPayload({type:'audio',sha256:'a',file:{name:'林雪音色.wav'}}, 'OpenH3-IR')`, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(old)), {kind:'audio',sha256:'a'});
});

test("audio inference is visible as text for review", () => {
  const {ctx, nodes} = context();
  vm.runInContext(`renderIrReview({id:'x',audio_resolution:[{label:'<Audio 1>',filename:'林雪音色.wav',role:'voice',note:'林雪',inferred:true}],ir:{manifest:[]}})`, ctx);
  assert.equal(nodes.get('#audioResolution').hidden, false);
  assert.match(nodes.get('#audioResolution').textContent, /自动推断，请核对/);
});

test("submitted prompt survives completion, reset and another task refresh", () => {
  const {ctx} = context();
  vm.runInContext(`
    const submitted = snapshotIr({id:'brief1',provider:'H3Offical-IR',ir:{prompt:'original prompt'}}, {});
    rememberJob({id:'job1',status:'queued'}, 'H3', 'h3', submitted);
    state.brief = {id:'different',ir:{prompt:'DO NOT USE'}};
    rememberJob({id:'job1',status:'completed'}, 'H3', 'h3');
    state.brief = null;
    rememberJob({id:'job1',status:'completed'}, 'H3', 'h3');`, ctx);
  assert.equal(vm.runInContext('state.history[0].irSnapshot.prompt', ctx), 'original prompt');
  assert.equal(vm.runInContext('state.history[0].irSnapshot.briefId', ctx), 'brief1');
});

test("SR inherits source prompt, legacy records do not borrow current prompt", () => {
  const {ctx} = context();
  vm.runInContext(`
    rememberJob({id:'source'}, 'H3', 'h3', snapshotIr({id:'brief1',ir:{prompt:'source prompt'}}, {}));
    rememberJob({id:'sr'}, 'SR', 'sr', state.history.find(r=>r.id==='source').irSnapshot);
    rememberJob({id:'legacy',status:'completed'}, 'H3', 'h3');`, ctx);
  assert.equal(vm.runInContext("state.history.find(r=>r.id==='sr').irSnapshot.prompt", ctx), 'source prompt');
  assert.equal(vm.runInContext("state.history.find(r=>r.id==='legacy').irSnapshot", ctx), null);
});

test("prompt HTML is escaped and missing history is explicit", () => {
  const {ctx} = context();
  const html = vm.runInContext(`irSnapshotMarkup({prompt:'<script>alert(1)</script>',provider:'<b>',briefId:'x'})`, ctx);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(vm.runInContext('irSnapshotMarkup(null)', ctx), /未保存/);
});
