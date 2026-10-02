const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function context() {
  const nodes = new Map();
  const document = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, {
        classList: {toggle() {}}, style: {}, dataset: {}, hidden: false,
        value: "", disabled: false
      });
      return nodes.get(selector);
    },
    querySelectorAll() { return []; }
  };
  const ctx = vm.createContext({document, AbortSignal, AbortController, DOMException,
    localStorage: {getItem() {return null;}, setItem() {}}, console});
  const source = fs.readFileSync(`${__dirname}/app.js`, "utf8").replace(
    /bindEvents\(\);\s*syncPromptSourceUi\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/, "");
  vm.runInContext(source, ctx);
  vm.runInContext(`delay = async () => {};
    state.abortController = new AbortController();
    state.currentJob = {id:'vid_test',model:'MiniMax/MiniMax-H3-SH3',phase:'h3',status:'running',progress:60};
    globalThis.updates = [];
    const realSetStatus = setStatus;
    setStatus = (...args) => { updates.push(args); realSetStatus(...args); };`, ctx);
  return {ctx, nodes};
}

test("job queries retry fetch, timeout, rate-limit and Cloudflare errors using GET only", async () => {
  for (const failure of ["new TypeError('Failed to fetch')", "new DOMException('Timed out','TimeoutError')",
    "new ApiError(429, {}, '0')", "new ApiError(524, {})"]) {
    const {ctx} = context();
    vm.runInContext(`globalThis.calls = 0; fetchJson = async (url, options) => {
      calls++; if (options.method) throw new Error('Must not submit');
      if (!options.signal) throw new Error('Missing bounded signal');
      if (calls < 3) throw ${failure};
      return {id:'vid_test',status:'completed'};
    };`, ctx);
    assert.equal((await vm.runInContext("fetchJobWithRetry('vid_test','model')", ctx)).status, "completed");
    assert.equal(ctx.calls, 3);
  }
});

test("authentication errors and intentional aborts are not retried", async () => {
  for (const failure of ["new ApiError(401, {})", "new DOMException('Aborted','AbortError')"]) {
    const {ctx} = context();
    vm.runInContext(`globalThis.calls=0; fetchJson=async()=>{calls++; throw ${failure};};`, ctx);
    await assert.rejects(vm.runInContext("fetchJobWithRetry('vid_test','model')", ctx));
    assert.equal(ctx.calls, 1);
  }
});

test("history queries also work without an active generation controller", async () => {
  const {ctx} = context();
  vm.runInContext("state.abortController=null; fetchJson=async()=>({id:'vid_history',status:'completed'});", ctx);
  assert.equal((await vm.runInContext("fetchJobWithRetry('vid_history','model')", ctx)).status, "completed");
});

test("manual and automatic queries share one in-flight request", async () => {
  const {ctx} = context();
  vm.runInContext(`globalThis.calls=0;
    fetchJson=()=>{calls++; return new Promise(resolve=>{globalThis.finish=resolve;});};`, ctx);
  const first = vm.runInContext("fetchJobWithRetry('vid_test','model')", ctx);
  const second = vm.runInContext("fetchJobWithRetry('vid_test','model')", ctx);
  assert.equal(first, second);
  ctx.finish({status:"completed"});
  await Promise.all([first, second]);
  assert.equal(ctx.calls, 1);
  assert.equal(vm.runInContext("state.jobQueries.size", ctx), 0);
});

test("polling survives exhausted network retries and preserves progress until recovery", async () => {
  const {ctx} = context();
  vm.runInContext(`globalThis.calls=0; fetchJson=async()=>{
    calls++; if(calls<=8) throw new TypeError('Failed to fetch');
    return {id:'vid_test',status:'completed',progress:100};
  };`, ctx);
  const result = await vm.runInContext("pollJob(state.currentJob,state.currentJob.model,'h3')", ctx);
  assert.equal(result.status, "completed");
  assert.equal(ctx.calls, 9);
  assert.ok(ctx.updates.some(([title,,progress]) => title === "视频查询连接波动" && progress === 65));
  assert.ok(ctx.updates.every(([title,,progress]) => !title.includes("失败") && progress > 0));
  assert.equal(vm.runInContext("state.currentJob.status", ctx), "completed");
});

test("persistent query errors pause querying without declaring the backend failed", async () => {
  const {ctx} = context();
  vm.runInContext("fetchJson=async()=>{throw new ApiError(403, {message:'forbidden'});};", ctx);
  await assert.rejects(vm.runInContext("pollJob(state.currentJob,state.currentJob.model,'h3')", ctx));
  vm.runInContext("reportVideoError(new ApiError(403, {message:'forbidden'}))", ctx);
  const [title, detail, progress] = ctx.updates.at(-1);
  assert.equal(title, "视频状态查询已暂停");
  assert.match(detail, /手动查询/);
  assert.equal(progress, 65);
  assert.equal(vm.runInContext("state.currentJob.status", ctx), "running");
});

test("manual recovery updates the result and history without creating H3 or SR", async () => {
  for (const phase of ["h3", "sr"]) {
    const {ctx, nodes} = context();
    vm.runInContext(`state.currentJob.phase='${phase}';
      globalThis.methods=[]; globalThis.loaded=[];
      fetchJson=async(url,options)=>{methods.push(options.method||'GET'); return {id:'vid_test',status:'completed',progress:100};};
      showCompletedVideo=async(...args)=>loaded.push(args);
      createSrJob=()=>{throw new Error('No new SR task');};`, ctx);
    await vm.runInContext("queryCurrentJob()", ctx);
    assert.deepEqual(Array.from(ctx.methods), ["GET"]);
    assert.equal(ctx.loaded[0][1], phase === "sr" ? "2K" : "768P");
    assert.equal(ctx.loaded[0][2], "MiniMax/MiniMax-H3-SH3");
    assert.equal(vm.runInContext("state.history[0].status", ctx), "completed");
    assert.equal(nodes.get("#queryTask").disabled, false);
    assert.equal(nodes.get("#statusTitle").textContent, "视频生成完成");
  }
});

test("manual query during polling does not duplicate result loading or regress a terminal result", async () => {
  const {ctx} = context();
  vm.runInContext(`state.busy=true; globalThis.loads=0; globalThis.queries=0;
    showCompletedVideo=async()=>{loads++;};
    fetchJson=async()=>{queries++; return {id:'vid_test',status:'completed',progress:100};};
    globalThis.initial={...state.currentJob};
    delay=async()=>{await queryCurrentJob();};`, ctx);
  const result = await vm.runInContext("pollJob(initial,initial.model,'h3')", ctx);
  assert.equal(result.status, "completed");
  assert.equal(ctx.queries, 1);
  assert.equal(ctx.loads, 0);
});

test("manual transient failure retains the job and last known progress", async () => {
  const {ctx} = context();
  vm.runInContext("fetchJson=async()=>{throw new TypeError('Failed to fetch');};", ctx);
  await vm.runInContext("queryCurrentJob()", ctx);
  assert.equal(ctx.updates.at(-1)[0], "视频状态查询已暂停");
  assert.equal(ctx.updates.at(-1)[2], 65);
  assert.equal(vm.runInContext("state.currentJob.id", ctx), "vid_test");
});

test("only an explicit failed or cancelled job becomes a terminal failure", async () => {
  for (const status of ["failed", "cancelled"]) {
    const {ctx} = context();
    vm.runInContext(`fetchJson=async()=>({id:'vid_test',status:'${status}',error:{message:'actual backend error'}});`, ctx);
    await assert.rejects(vm.runInContext("pollJob(state.currentJob,state.currentJob.model,'h3')", ctx), /actual backend error/);
    vm.runInContext("reportVideoError(new Error('actual backend error'))", ctx);
    assert.equal(ctx.updates.at(-1)[0], status === "failed" ? "视频任务失败" : "视频任务已取消");
  }
});

test("a result download error preserves completed status at 100 percent", async () => {
  const {ctx} = context();
  vm.runInContext(`state.currentJob.status='completed';
    fetch=async()=>{throw new TypeError('Failed to fetch');};`, ctx);
  await vm.runInContext("showCompletedVideo(state.currentJob,'768P',state.currentJob.model)", ctx);
  assert.equal(ctx.updates.at(-1)[0], "视频已生成，结果加载失败");
  assert.equal(ctx.updates.at(-1)[2], 100);
  assert.equal(vm.runInContext("state.currentJob.status", ctx), "completed");
});

test("result GET retries fetch and body failures without submitting a new task", async () => {
  const {ctx} = context();
  vm.runInContext(`globalThis.calls=0; fetch=async(url, options)=>{
    calls++; if(options.method) throw new Error('Must not submit');
    if(!options.signal) throw new Error('Missing timeout');
    if(calls===1) throw new TypeError('Failed to fetch');
    return {ok:true,blob:async()=>{if(calls===2) throw new TypeError('Body interrupted'); return 'video-blob';}};
  };`, ctx);
  assert.equal(await vm.runInContext("fetchVideoBlob(state.currentJob,state.currentJob.model,state.abortController.signal)", ctx), "video-blob");
  assert.equal(ctx.calls, 3);
});

test("result GET does not retry auth, expired results or cancellation", async () => {
  for (const code of [401,403,404]) {
    const {ctx} = context();
    vm.runInContext(`globalThis.calls=0; fetch=async()=>{calls++; throw new ApiError(${code},{});};`, ctx);
    await assert.rejects(vm.runInContext("fetchVideoBlob(state.currentJob,state.currentJob.model)",ctx));
    assert.equal(ctx.calls,1);
  }
  const {ctx} = context();
  vm.runInContext(`globalThis.calls=0; fetch=async()=>{calls++; state.abortController.abort(); throw new DOMException('Aborted','AbortError');};`,ctx);
  await assert.rejects(vm.runInContext("fetchVideoBlob(state.currentJob,state.currentJob.model,state.abortController.signal)",ctx));
  assert.equal(ctx.calls,1);
});

test("manual completion loads authenticated content without prepared form settings", async () => {
  const {ctx, nodes} = context();
  vm.runInContext(`state.preparedSettings=null;
    globalThis.contentRequests=[];
    fetchJson=async()=>({id:'vid_test',status:'completed',progress:100,duration_seconds:13});
    fetch=async(url,options)=>{contentRequests.push(url); return {ok:true,blob:async()=>({})};};
    globalThis.URL={createObjectURL:()=> 'blob:test-result',revokeObjectURL:()=>{}};`, ctx);
  await vm.runInContext("queryCurrentJob()", ctx);
  assert.match(ctx.contentRequests[0], /\/vid_test\/content\?model=MiniMax%2FMiniMax-H3-SH3$/);
  assert.equal(nodes.get("#resultVideo").src, "blob:test-result");
  assert.equal(nodes.get("#resultCard").hidden, false);
  assert.equal(nodes.get("#statusTitle").textContent, "视频生成完成");
});

test("a late manual response cannot overwrite a reset or a different task", async () => {
  const {ctx} = context();
  vm.runInContext("fetchJson=()=>new Promise(resolve=>{globalThis.finish=resolve;});", ctx);
  const query = vm.runInContext("queryCurrentJob()", ctx);
  vm.runInContext("state.currentJob={id:'vid_new',status:'queued'}; state.abortController=new AbortController();", ctx);
  ctx.finish({id:"vid_test",status:"completed"});
  await query;
  assert.equal(vm.runInContext("state.currentJob.id", ctx), "vid_new");
  assert.equal(ctx.updates.length, 0);
});

test("automatic waiting timeout leaves the manual query available", async () => {
  const {ctx, nodes} = context();
  vm.runInContext("globalThis.clock=0; Date.now=()=>{clock+=JOB_TIMEOUT_MS+1; return clock;};", ctx);
  await assert.rejects(vm.runInContext("pollJob(state.currentJob,state.currentJob.model,'h3')", ctx), /40 分钟/);
  vm.runInContext("reportVideoError(new Error('等待超过 40 分钟'))", ctx);
  assert.equal(nodes.get("#queryTask").hidden, false);
  assert.match(ctx.updates.at(-1)[1], /手动查询/);
});
