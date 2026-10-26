const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function context() {
  const nodes=new Map(),revoked=[];
  const document={
    querySelector(key){
      if(!nodes.has(key)) nodes.set(key,{value:'',style:{},dataset:{},classList:{toggle(){}},
        pause(){},load(){},removeAttribute(key){delete this[key];},setAttribute(){}});
      return nodes.get(key);
    },querySelectorAll(){return [];}
  };
  const ctx=vm.createContext({document,AbortController,console,
    URL:{createObjectURL(){return 'blob:preview';},revokeObjectURL(url){revoked.push(url);}},
    localStorage:{getItem(){return null;},setItem(){}}});
  vm.runInContext(fs.readFileSync(`${__dirname}/app.js`,'utf8').replace(
    /bindEvents\(\);\s*syncPromptSourceUi\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/,''),ctx);
  vm.runInContext(`
    authIsComplete=()=>true;
    globalThis.record={id:'vid_old',model:'MiniMax/MiniMax-H3-SH1',phase:'h3',quality:'768P',status:'completed',seconds:13,ratio:'16:9'};
    state.history=[record];
    globalThis.button={disabled:false};globalThis.reads=[];
    state.abortController=new AbortController();globalThis.generationController=state.abortController;
    queryJobWithRetry=async(url,signal)=>{
      reads.push({url,signal});return {id:'vid_old',status:'completed',created_at:100,started_at:105,completed_at:165};
    };
    fetchVideoBlob=async(job,model,signal)=>{reads.push({id:job.id,model,signal});return 'bytes';};
    fetchJson=()=>{throw new Error('Preview must not submit anything');};
  `,ctx);
  return {ctx,nodes,revoked};
}

test('history preview reads existing authenticated content and shows queue/processing times',async()=>{
  const {ctx,nodes}=context();
  await vm.runInContext('previewHistoryJob(record,button)',ctx);
  assert.equal(nodes.get('#historyPreviewPanel').hidden,false);
  assert.equal(nodes.get('#historyPreviewVideo').src,'blob:preview');
  assert.match(nodes.get('#historyPreviewInfo').textContent,/H3 排队 5.0 秒/);
  assert.match(nodes.get('#historyPreviewInfo').textContent,/H3 处理 1 分 0.0 秒/);
  assert.equal(ctx.reads.length,2);
  assert.equal(ctx.reads[1].model,'MiniMax/MiniMax-H3-SH1');
  assert.equal(vm.runInContext('state.abortController===generationController',ctx),true);
  assert.equal(ctx.button.disabled,false);
});

test('close revokes preview bytes and never aborts the current generation',async()=>{
  const {ctx,nodes,revoked}=context();
  await vm.runInContext('previewHistoryJob(record,button)',ctx);
  const signal=ctx.reads[0].signal;
  vm.runInContext('closeHistoryPreview()',ctx);
  assert.equal(signal.aborted,true);
  assert.equal(vm.runInContext('generationController.signal.aborted',ctx),false);
  assert.deepEqual(revoked,['blob:preview']);
  assert.equal(nodes.get('#historyPreviewPanel').hidden,true);
  assert.equal(nodes.get('#historyPreviewVideo').src,undefined);
});

test('late responses after closing cannot restore the preview',async()=>{
  const {ctx,nodes}=context();
  let finish;
  ctx.pending=new Promise(resolve=>{finish=resolve;});
  vm.runInContext('fetchVideoBlob=()=>pending',ctx);
  const work=vm.runInContext('previewHistoryJob(record,button)',ctx);
  await new Promise(resolve=>setImmediate(resolve));
  vm.runInContext('closeHistoryPreview()',ctx);
  finish('late bytes');await work;
  assert.equal(nodes.get('#historyPreviewPanel').hidden,true);
  assert.equal(nodes.get('#historyPreviewVideo').src,undefined);
});

test('expired content shows a recoverable error without changing completed status',async()=>{
  const {ctx,nodes}=context();
  vm.runInContext(`fetchVideoBlob=async()=>{throw new Error('HTTP 410');}`,ctx);
  await vm.runInContext('previewHistoryJob(record,button)',ctx);
  assert.match(nodes.get('#historyPreviewInfo').textContent,/预览未加载/);
  assert.equal(vm.runInContext('state.history[0].status',ctx),'completed');
  assert.equal(ctx.button.disabled,false);
});

test('unfinished jobs and missing auth do not fetch video',async()=>{
  const {ctx}=context();
  await vm.runInContext(`previewHistoryJob({...record,status:'queued'},button)`,ctx);
  vm.runInContext('authIsComplete=()=>false',ctx);
  await vm.runInContext('previewHistoryJob(record,button)',ctx);
  assert.equal(ctx.reads.length,0);
});

test('refreshing old history retains original duration/ratio instead of current form settings',async()=>{
  const {ctx,nodes}=context();
  vm.runInContext(`state.preparedSettings={seconds:5,ratio:'9:16'};`,ctx);
  await vm.runInContext('previewHistoryJob(record,button)',ctx);
  assert.equal(vm.runInContext('state.history[0].seconds',ctx),13);
  assert.equal(vm.runInContext('state.history[0].ratio',ctx),'16:9');
  assert.match(nodes.get('#historyList').innerHTML,/data-history-preview="vid_old"/);
  assert.match(nodes.get('#historyList').innerHTML,/H3 总计 1 分 5.0 秒/);
});
