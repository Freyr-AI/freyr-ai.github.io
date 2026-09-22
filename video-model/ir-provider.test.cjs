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
