const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function context() {
  const nodes = new Map();
  const document = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, {
        classList: {toggle() {}}, dataset: {}, hidden: false, disabled: false,
        style: {}, value: ""
      });
      return nodes.get(selector);
    },
    querySelectorAll() {return [];}
  };
  const ctx = vm.createContext({document, AbortController, AbortSignal, console,
    localStorage: {getItem() {return null;}, setItem() {}}});
  const source = fs.readFileSync(`${__dirname}/app.js`, "utf8").replace(
    /bindEvents\(\);\s*syncPromptSourceUi\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/, "");
  vm.runInContext(source, ctx);
  vm.runInContext(`
    authIsComplete = () => true;
    authHeaders = () => ({});
    state.resultJob = {id:'vid_source',model:'MiniMax/MiniMax-H3-SH2',status:'completed',quality:'768P'};
    state.history = [{...state.resultJob,phase:'h3',irSnapshot:{prompt:'original prompt'}}];
    globalThis.posts=[]; globalThis.polls=[]; globalThis.results=[];
    fetchJson = async (url,options) => {posts.push(JSON.parse(options.body)); return {id:'vid_sr',status:'queued'};};
    pollJob = async (job,model,phase) => {
      polls.push({id:job.id,model,phase});
      state.currentJob={...job,model,phase,status:'completed'};
      return state.currentJob;
    };
    showCompletedVideo = async (job,quality) => {results.push({id:job.id,quality}); state.resultJob={...job,quality};};
  `, ctx);
  return {ctx,nodes};
}

test("manual upscale creates only SR from the displayed 768P job and preserves its prompt", async () => {
  const {ctx,nodes}=context();
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.posts)),[{model:"FreyrAI/SR-D3-2K",source_job_id:"vid_source"}]);
  assert.equal(ctx.polls[0].phase,"sr");
  assert.equal(ctx.results[0].quality,"2K");
  assert.equal(vm.runInContext("state.history[0].sourceJobId",ctx),"vid_source");
  assert.equal(vm.runInContext("state.history[0].irSnapshot.prompt",ctx),"original prompt");
  assert.equal(nodes.get("#upscaleVideo").hidden,true);
  assert.equal(vm.runInContext("state.busy",ctx),false);
});

test("known SR resumes without another POST", async () => {
  const {ctx}=context();
  vm.runInContext("state.history.unshift({id:'vid_existing_sr',model:'FreyrAI/SR-D3-2K',phase:'sr',status:'running',sourceJobId:'vid_source'});",ctx);
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  assert.equal(ctx.posts.length,0);
  assert.equal(ctx.polls[0].id,"vid_existing_sr");
});

test("double clicking cannot submit twice", async () => {
  const {ctx}=context();
  vm.runInContext("fetchJson=async(url,options)=>{posts.push(JSON.parse(options.body)); return await new Promise(resolve=>globalThis.finish=resolve);};",ctx);
  const first=vm.runInContext("upscaleCompletedVideo()",ctx);
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  assert.equal(ctx.posts.length,1);
  ctx.finish({id:"vid_sr",status:"queued"});
  await first;
});

test("non-completed or 2K results and missing auth do not submit", async () => {
  for (const setup of ["state.resultJob.quality='2K'", "state.resultJob.status='running'", "authIsComplete=()=>false", "state.manualQuerying=true"]) {
    const {ctx}=context();vm.runInContext(setup,ctx);
    await vm.runInContext("upscaleCompletedVideo()",ctx);
    assert.equal(ctx.posts.length,0);
  }
});

test("uncertain POST outcome locks resubmission and retains the 768P result", async () => {
  const {ctx,nodes}=context();
  vm.runInContext("fetchJson=async()=>{posts.push('POST');throw new TypeError('Failed to fetch');};",ctx);
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  assert.equal(ctx.posts.length,1);
  assert.equal(vm.runInContext("state.resultJob.id",ctx),"vid_source");
  assert.equal(nodes.get("#upscaleVideo").disabled,true);
  assert.equal(nodes.get("#statusTitle").textContent,"超分提交结果未确认");
});

test("definite authorization rejection permits retry after credentials are corrected", async () => {
  const {ctx,nodes}=context();
  vm.runInContext("fetchJson=async()=>{throw new ApiError(403,{});};",ctx);
  await vm.runInContext("upscaleCompletedVideo()",ctx);
  assert.equal(vm.runInContext("state.srSubmissionSourceId",ctx),"");
  assert.equal(nodes.get("#upscaleVideo").disabled,false);
});

test("late submission after reset records the task but does not replace the new view", async () => {
  const {ctx}=context();
  vm.runInContext("fetchJson=async()=>new Promise(resolve=>globalThis.finish=resolve);",ctx);
  const first=vm.runInContext("upscaleCompletedVideo()",ctx);
  vm.runInContext("state.abortController=null;state.resultJob=null;",ctx);
  ctx.finish({id:"vid_sr",status:"queued"});
  await first;
  assert.equal(ctx.polls.length,0);
  assert.equal(ctx.results.length,0);
  assert.equal(vm.runInContext("state.history[0].sourceJobId",ctx),"vid_source");
});
