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
assert.ok(state.prompts.every(prompt=>vm.runInContext('CORE_PROMPTS',ctx).some(item=>item[1]===prompt)));
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
const rubric=vm.runInContext('RUBRIC',ctx);
assert.equal(vm.runInContext('RUBRIC_MAX',ctx),100);
function audit(text,change){
  const criteria=Object.fromEntries(rubric.map(criterion=>[criterion.name,Object.fromEntries(criterion.parts.map(([name,max])=>[name,{
    points:change?.criterion===criterion.name&&change?.part===name?change.points:text?max:0,
    quote:text?text.slice(0,8):'',reason:text?'Specific textual evidence supports or limits this point.':'No response was submitted for assessment.'
  }]))]));
  return {assessment:{strengths:text?['One concrete action is stated.']:[],weaknesses:[],errors:[],missingElements:text?[]:['No response']},criteria};
}
const sample='I organized a team.';
ctx.sampleEssays=[{prompt:'Example',text:sample}];
ctx.firstPayload={audits:[audit(sample)]};
const profileKeys=['Leadership','Responsibility','Initiative','Adaptability','Maturity','Independence','Problem-solving','Community involvement','Cross-cultural readiness','Conflict handling','Teamwork','Self-awareness','Personal growth','Authenticity','Representing country','English clarity','Specificity','Reflection'];
ctx.secondPayload={audits:[audit(sample,{criterion:'Grammar',part:'Sentence control',points:2})],review:{summary:'The response is short and needs a fuller example.',scores:Object.fromEntries(profileKeys.map(key=>[key,5])),essays:[{sentenceFeedback:[{quote:'invented'}]}]}};
assert.throws(()=>vm.runInContext("validateAudits([{assessment:{strengths:[],weaknesses:[],errors:[],missingElements:[]},criteria:{}}],sampleEssays)",ctx));
ctx.badPayload={audits:[audit(sample)]};
ctx.badPayload.audits[0].criteria.Grammar['Sentence control'].quote='invented quote';
assert.throws(()=>vm.runInContext('validateAudits(badPayload.audits,sampleEssays)',ctx));
ctx.blankPayload={audits:[audit('')]};
assert.equal(vm.runInContext("validateAudits(blankPayload.audits,[{text:''}])[0].total",ctx),0);
const fallback=await vm.runInContext(`(async()=>{
  let failures=0,successfulCalls=0;
  aiModel=[{generateContent:async()=>{failures++;throw new Error('[500] high demand')}},
    {generateContent:async()=>({response:{text:()=>JSON.stringify(++successfulCalls===1?firstPayload:secondPayload)}})}];
  const progress=[];
  const result=await requestReview(sampleEssays,null,message=>progress.push(message));
  return {failures,successfulCalls,progress,score:result.overallScore,changes:result.verificationChanges,invalidNotes:result.essays[0].sentenceFeedback.length};
})()`,ctx);
assert.equal(fallback.failures,2);
assert.equal(fallback.successfulCalls,2);
assert.equal(fallback.score,97);
assert.equal(fallback.invalidNotes,0);
assert.ok(fallback.changes.some(line=>line.includes('Grammar')));
assert.ok(fallback.progress.some(line=>line.includes('verification pass')));
const corrected=await vm.runInContext(`(async()=>{
  let calls=0;
  aiModel=[{generateContent:async prompt=>({response:{text:()=>JSON.stringify(++calls===1?badPayload:calls===2?firstPayload:secondPayload)}})}];
  const result=await requestReview(sampleEssays);
  return {calls,score:result.overallScore};
})()`,ctx);
assert.equal(corrected.calls,3);
assert.equal(corrected.score,97);
vm.runInContext("archive();state={...history()[0],archived:true,review:{overallScore:73}};archive()",ctx);
assert.equal(JSON.parse(storage.get('relay-flex-history-v1'))[0].review.overallScore,73);
console.log('Timed rollover, rubric arithmetic, evidence checks, correction, independent verification, and backup model: OK');
