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
  const ctx = vm.createContext({document, localStorage: {getItem() {return null;}}, console});
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
