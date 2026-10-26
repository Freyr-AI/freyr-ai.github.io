const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function context() {
  const nodes = new Map();
  const document = {
    querySelector(key) {
      if (!nodes.has(key)) nodes.set(key, {value:'', style:{}, dataset:{},
        classList:{toggle(){}}, removeAttribute(){}, load(){}});
      return nodes.get(key);
    },
    querySelectorAll(){return [];}
  };
  const ctx = vm.createContext({document, AbortController, console,
    URL:{revokeObjectURL(){}}, localStorage:{getItem(){return null;},setItem(){}}});
  vm.runInContext(fs.readFileSync(`${__dirname}/app.js`, 'utf8').replace(
    /bindEvents\(\);\s*syncPromptSourceUi\(\);\s*renderAssets\(\);\s*renderHistory\(\);\s*$/, ''), ctx);
  return {ctx,nodes};
}

test('server Unix timestamps separate queue, processing and total, independent of polling',()=>{
  const {ctx}=context();
  const result=vm.runInContext(`jobDurations({created_at:100,started_at:110,completed_at:168,status:'completed'},9999999)`,ctx);
  assert.equal(result.queue,10);
  assert.equal(result.processing,58);
  assert.equal(result.total,68);
});

test('IR ISO timestamps support queue and processing while active and after completion',()=>{
  const {ctx}=context();
  const result=vm.runInContext(`jobDurations({created_at:'2026-10-26T00:00:00Z',started_at:'2026-10-26T00:00:05Z',completed_at:'2026-10-26T00:01:00Z',status:'completed'})`,ctx);
  assert.equal(result.queue,5);
  assert.equal(result.processing,55);
  assert.equal(result.total,60);
  assert.equal(vm.runInContext(`jobDurations({created_at:100,status:'queued'},120000).queue`,ctx),20);
  assert.equal(vm.runInContext(`jobDurations({created_at:100,started_at:110,status:'running'},120000).processing`,ctx),10);
});

test('missing and invalid timestamps are not invented or treated as zero',()=>{
  const {ctx}=context();
  for (const expr of [
    `jobDurations({status:'completed'}).processing`,
    `jobDurations({created_at:100,completed_at:160,status:'completed'}).queue`,
    `jobDurations({created_at:'bad',started_at:110,status:'running'}).queue`,
    `jobDurations({created_at:100,started_at:90,status:'completed'}).queue`,
    `jobDurations({created_at:100,started_at:110,status:'failed'}).processing`
  ]) assert.equal(vm.runInContext(expr,ctx),null);
  assert.equal(vm.runInContext(`durationText(null)`,ctx),'未提供');
  assert.equal(vm.runInContext(`durationText(0)`,ctx),'0.0 秒');
});

test('H3 and SR timings coexist and local timing freezes when waiting stops',()=>{
  const {ctx,nodes}=context();
  vm.runInContext(`
    captureJobTiming({id:'h3',created_at:100,started_at:105,completed_at:165,status:'completed'},'h3');
    captureJobTiming({id:'sr',created_at:200,started_at:202,completed_at:212,status:'completed'},'sr');
    startStepTiming('assets','素材准备（浏览器）'); endStepTiming('assets');
  `,ctx);
  assert.equal(nodes.get('#stepTimings').hidden,false);
  assert.match(nodes.get('#stepTimingList').innerHTML,/H3 排队/);
  assert.match(nodes.get('#stepTimingList').innerHTML,/2K 超分 处理/);
  assert.match(nodes.get('#stepTimingList').innerHTML,/素材准备（浏览器）/);
  const ended=vm.runInContext('state.stepTimings.assets.ended',ctx);
  vm.runInContext(`endStepTiming('assets')`,ctx);
  assert.equal(vm.runInContext('state.stepTimings.assets.ended',ctx),ended);
});

test('history retains timestamps on partial refresh and displays server durations',()=>{
  const {ctx,nodes}=context();
  vm.runInContext(`
    rememberJob({id:'one',created_at:100,started_at:105,completed_at:165,status:'completed'},'MiniMax/MiniMax-H3-SH1','h3');
    rememberJob({id:'one',status:'completed'},'MiniMax/MiniMax-H3-SH1','h3');
  `,ctx);
  assert.equal(vm.runInContext('state.history[0].serverTiming.started_at',ctx),105);
  assert.match(nodes.get('#historyList').innerHTML,/H3 排队 5.0 秒/);
  assert.match(nodes.get('#historyList').innerHTML,/H3 处理 1 分 0.0 秒/);
});

test('new task removes all prior step and job timings',()=>{
  const {ctx,nodes}=context();
  vm.runInContext(`
    startStepTiming('h3Submit','H3 提交');
    captureJobTiming({id:'old',created_at:100,status:'queued'},'h3');
    resetTask();
  `,ctx);
  assert.equal(nodes.get('#stepTimings').hidden,true);
  assert.equal(nodes.get('#stepTimingList').innerHTML,'');
});

test('timing panel labels overlapping browser and server measurements without new API fields',()=>{
  const html=fs.readFileSync(`${__dirname}/index.html`,'utf8');
  assert.match(html,/id="stepTimings"/);
  assert.match(html,/部分阶段有重叠，请勿相加/);
  assert.match(html,/处理包含服务端准备、生成及归档/);
});
