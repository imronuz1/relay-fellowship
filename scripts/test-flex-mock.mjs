import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/flex-mock/mock.js',import.meta.url),'utf8');
const storage=new Map();
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const elements=new Map();
function element(selector){
  if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',value:'',disabled:false,classList:{toggle(){}},after(){},focus(){}});
  return elements.get(selector);
}
const document={querySelector:element,querySelectorAll:()=>[],createElement:()=>({innerHTML:'',className:'',after(){}})};
const sandbox={document,localStorage,crypto:{randomUUID:()=>String(Math.random())},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,Date,Math,JSON,console};
const ctx=vm.createContext(sandbox);
vm.runInContext(source,ctx);
vm.runInContext("start('full')",ctx);
let state=JSON.parse(storage.get('relay-flex-active-v1'));
assert.equal(state.essays.length,3);
assert.equal(new Set(state.prompts).size,3);
state.essays[0].text='A saved draft';
state.deadline=Date.now()-29*60*1000;
storage.set('relay-flex-active-v1',JSON.stringify(state));
vm.runInContext('state=read(ACTIVE_KEY,null);render()',ctx);
state=JSON.parse(storage.get('relay-flex-active-v1'));
assert.equal(state.status,'writing');
assert.equal(state.index,2);
assert.equal(state.essays[0].text,'A saved draft');
assert.equal(state.essays[0].expired,true);
assert.equal(state.essays[1].expired,true);
assert.ok(state.deadline>Date.now());
state.deadline=Date.now()-1000;
storage.set('relay-flex-active-v1',JSON.stringify(state));
vm.runInContext('state=read(ACTIVE_KEY,null);submitCurrent(false)',ctx);
state=JSON.parse(storage.get('relay-flex-active-v1'));
assert.equal(state.status,'complete');
assert.equal(state.essays[2].expired,true);
assert.equal(state.localEstimate,JSON.parse(storage.get('relay-flex-active-v1')).localEstimate);
assert.ok(state.localEstimate>0);
assert.match(element('#app').innerHTML,/PRELIMINARY WRITING SCORE/);
assert.equal(vm.runInContext("structuralScore({text:''})",ctx),0);
assert.ok(vm.runInContext("structuralScore({text:'When our team disagreed, I asked each person for their view. I learned to listen.'})",ctx)<=50);
const reviewed=vm.runInContext(`validateReview({overallScore:999,scores:{Leadership:99},essays:[{sentenceFeedback:[{quote:'invented'}]},{},{}]},[{text:'A saved draft'},{text:''},{text:''}])`,ctx);
assert.equal(reviewed.overallScore,100);
assert.equal(reviewed.scores.Leadership,10);
assert.equal(reviewed.essays[0].sentenceFeedback.length,0);
const fallback=await vm.runInContext(`(async()=>{
  aiModel=[{generateContent:async()=>{throw new Error('[500] This model is currently experiencing high demand')}},
    {generateContent:async()=>({response:{text:()=>JSON.stringify({overallScore:73,scores:{Leadership:7},essays:[{}]})}})}];
  let attempted=false;
  const result=await requestReview([{prompt:'Example',text:'I organized a team.'}],null,()=>{attempted=true});
  return {attempted,score:result.overallScore};
})()`,ctx);
assert.equal(fallback.attempted,true);
assert.equal(fallback.score,73);
console.log('Timed rollover, preliminary score, backup model, and review validation: OK');
