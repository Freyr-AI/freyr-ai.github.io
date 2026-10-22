const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function context() {
  const nodes = new Map();
  const revoked = [];
  const document = {
    querySelector(key) {
      if (!nodes.has(key)) nodes.set(key, {
        value:'', dataset:{}, style:{}, classList:{toggle() {}},
        removeAttribute(name) { delete this[name]; }, load() { this.loads=(this.loads||0)+1; }
      });
      return nodes.get(key);
    },
    querySelectorAll() { return []; }
  };
  const ctx = vm.createContext({document, AbortController, Blob, console,
    URL:{revokeObjectURL: url => revoked.push(url)},
    localStorage:{getItem() {return null;},setItem() {}}});
  vm.runInContext(fs.readFileSync(`${__dirname}/app.js`,'utf8').replace(
    /bindEvents\(\);\s*syncPromptSourceUi\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/, ''),ctx);
  vm.runInContext(`
    $('#promptSourceInput').value='direct';
    $('#intentInput').value='Use <Picture 1>.';
    $('#modelSelect').value='MiniMax/MiniMax-H3-SH1';
    $('#secondsInput').value='7'; $('#ratioInput').value='9:16';
    state.assets=[{id:'image',type:'image',file:{name:'person.png',type:'image/png',size:10}}];
    authIsComplete=()=>true; authHeaders=()=>({Authorization:'Bearer test'});
    fileToDataUri=async file=>'data:'+file.type+';base64,AA==';
    globalThis.posts=[];globalThis.polls=[];
    fetchPersistentIr=()=>{throw new Error('Must not run IR');};
    fetchJson=async(url,options)=>{
      posts.push({url,body:JSON.parse(options.body),signal:options.signal});
      return {id:'vid_'+posts.length,status:'queued'};
    };
    pollJob=async(job,model,phase)=>{
      polls.push(job.id); state.currentJob={...job,model,phase,status:'completed'};
      return state.currentJob;
    };
    showCompletedVideo=async(job,quality)=>{
      state.resultObjectUrl='blob:'+job.id;
      state.resultJob={...job,quality}; $('#resultVideo').src=state.resultObjectUrl;
      $('#resultCard').hidden=false;
    };
  `,ctx);
  return {ctx,nodes,revoked};
}

test('repeat direct generation starts clean, preserves files/form/history and uses a fresh controller',async()=>{
  const {ctx,nodes,revoked}=context();
  await vm.runInContext('createDirectH3Job()',ctx);
  assert.equal(ctx.posts.length,1);
  const firstSignal=ctx.posts[0].signal;
  vm.runInContext("state.srSubmissionSourceId='old';state.irVerified=true;",ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  assert.equal(ctx.posts.length,2);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.posts[0].body)),JSON.parse(JSON.stringify(ctx.posts[1].body)));
  assert.equal(firstSignal.aborted,true);
  assert.notEqual(ctx.posts[1].signal,firstSignal);
  assert.equal(ctx.posts[1].signal.aborted,false);
  assert.deepEqual(revoked,['blob:vid_1']);
  assert.equal(nodes.get('#resultVideo').loads,2);
  assert.equal(vm.runInContext('state.resultJob.id',ctx),'vid_2');
  assert.equal(vm.runInContext('state.srSubmissionSourceId',ctx),'');
  assert.equal(vm.runInContext('state.irVerified',ctx),false);
  assert.equal(vm.runInContext('state.assets.length',ctx),1);
  assert.equal(vm.runInContext('state.history.length',ctx),2);
  assert.equal(vm.runInContext('state.busy',ctx),false);
});

test('repeat uses current prompt/model/seed/order instead of the previous job settings',async()=>{
  const {ctx}=context();await vm.runInContext('createDirectH3Job()',ctx);
  vm.runInContext(`$('#intentInput').value='Updated <Picture 1>.';
    $('#modelSelect').value='MiniMax/MiniMax-H3-SH4'; $('#seedInput').value='42';
    $('#secondsInput').value='15'; $('#ratioInput').value='16:9';`,ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  assert.equal(ctx.posts[1].body.prompt,'Updated <Picture 1>.');
  assert.equal(ctx.posts[1].body.model,'MiniMax/MiniMax-H3-SH4');
  assert.equal(ctx.posts[1].body.seed,42);
  assert.equal(ctx.posts[1].body.seconds,15);
  assert.equal(ctx.posts[1].body.generation_config.ratio,'16:9');
});

test('double click submits once, and reset during file reading prevents a stale POST',async()=>{
  const {ctx}=context();
  vm.runInContext('fileToDataUri=()=>new Promise(resolve=>globalThis.finishRead=resolve);',ctx);
  const run=vm.runInContext('createDirectH3Job()',ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  vm.runInContext('resetTask()',ctx);
  ctx.finishRead('data:image/png;base64,AA==');await run;
  assert.equal(ctx.posts.length,0);
  assert.equal(vm.runInContext('state.currentJob',ctx),null);
  assert.equal(vm.runInContext('state.busy',ctx),false);
});

test('an old POST acknowledgement is saved but does not replace or unlock a newer flow',async()=>{
  const {ctx}=context();
  vm.runInContext('fetchJson=()=>new Promise(resolve=>globalThis.finishPost=resolve);',ctx);
  const run=vm.runInContext('createDirectH3Job()',ctx);
  // Let file conversion finish and submission start.
  await new Promise(resolve=>setImmediate(resolve));
  vm.runInContext('resetTask();state.abortController=new AbortController();state.busy=true;',ctx);
  ctx.finishPost({id:'vid_late',status:'queued'});await run;
  assert.equal(ctx.polls.length,0);
  assert.equal(vm.runInContext('state.history[0].id',ctx),'vid_late');
  assert.equal(vm.runInContext('state.currentJob',ctx),null);
  assert.equal(vm.runInContext('state.busy',ctx),true);
});

test('lost POST response is not retried or reported as a model failure',async()=>{
  const {ctx,nodes}=context();
  vm.runInContext("fetchJson=async()=>{posts.push('POST');throw new TypeError('Failed to fetch');};",ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  assert.equal(ctx.posts.length,1);
  assert.equal(nodes.get('#statusTitle').textContent,'提交结果未确认');
  assert.match(nodes.get('#statusDetail').textContent,/不代表模型生成失败/);
  assert.equal(vm.runInContext('state.currentJob',ctx),null);
  assert.equal(vm.runInContext('state.history.length',ctx),0);
});

test('after checking a lost submission, a manual click can start a fresh independent request',async()=>{
  const {ctx}=context();
  vm.runInContext(`globalThis.failedSignal=null;
    fetchJson=async(url,options)=>{failedSignal=options.signal;throw new TypeError('Failed to fetch');};`,ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  vm.runInContext(`fetchJson=async(url,options)=>{
    posts.push({signal:options.signal,body:JSON.parse(options.body)});
    return {id:'vid_manual',status:'queued'};
  };`,ctx);
  await vm.runInContext('createDirectH3Job()',ctx);
  assert.equal(ctx.posts.length,1);
  assert.notEqual(ctx.posts[0].signal,ctx.failedSignal);
  assert.equal(ctx.failedSignal.aborted,true);
  assert.equal(ctx.posts[0].signal.aborted,false);
  assert.equal(vm.runInContext('state.resultJob.id',ctx),'vid_manual');
});
