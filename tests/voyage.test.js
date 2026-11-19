const assert=require('node:assert/strict');
const M=require('../src/games/voyage/model.js');
const chapter=require('../content/games/voyage/chapter.json');
const {collectContent}=require('../scripts/content.js');
const library=collectContent();
assert.equal(M.compatible(library,chapter).length,2);
assert.equal(M.compatible({...library,works:library.works.filter(w=>w.id!=='xiaochi')},chapter).length,1);
const edited=structuredClone(library);edited.works.find(w=>w.id==='jiangnan').lines[1]='用户修改的诗句';assert.equal(M.compatible(edited,chapter).length,1);
for(const route of ['bamboo','lotus'])for(const method of ['inside','outside'])for(const order of ['flow','leaf']){
  let state=M.initial();const step=a=>{const result=M.act(state,a);state=result.state;return result.effect;};
  assert.equal(step({type:'sail'}),'release');assert.equal(state.stage,'fork');
  assert.equal(step({type:'route',value:route}),'branch');assert.equal(state.stage,'bend');
  assert.equal(step({type:'sail'}),'blocked');assert.equal(state.stage,'bend');
  const inner=route==='bamboo'?-1:1;
  const settings={flow:method==='inside'?1:2,leaf:method==='inside'?inner:-inner};
  for(const type of order==='flow'?['flow','leaf']:['leaf','flow'])step({type,value:settings[type]});
  assert.equal(M.preview(state),method);assert.equal(step({type:'sail'}),'arrive');assert.equal(state.stage,'landing');assert.equal(state.method,method);
  // A reload in the middle of the visual voyage resumes at the committed shore.
  assert.deepEqual(M.snapshot(JSON.parse(JSON.stringify({state}))).state,state);
  if(method==='outside')assert.equal(step({type:'discover'}),'restless');
  step({type:'flow',value:0});assert.equal(step({type:'discover'}),'discover');assert.equal(state.stage,'done');
  assert.equal(step({type:'route',value:route==='bamboo'?'lotus':'bamboo'}),'none');
  assert.equal(step({type:'fork'}),'return');assert.deepEqual(state,{...M.initial(),stage:'fork'});
}
let s=M.initial();s.flow=3;assert.equal(M.act(s,{type:'sail'}).effect,'rush');assert.equal(M.act(s,{type:'sail'}).state.stage,'inlet');
s.flow=0;assert.equal(M.act(s,{type:'sail'}).effect,'still');
assert.deepEqual(M.sanitize({stage:'done',route:'unknown'}),M.initial());
assert.equal(M.sanitize({stage:'landing',route:'bamboo'}).stage,'bend');
const restored=M.snapshot({state:{stage:'fork',flow:99,leaf:-99},history:Array(100).fill({stage:'bad'}),journal:[{route:'lotus',method:'outside',html:'<script>'},{route:'bad',method:'inside'}],prefs:{still:true,sound:'true'}});
assert.equal(restored.history.length,20);assert.equal(restored.journal.length,1);assert.equal(restored.journal[0].html,undefined);assert.equal(restored.prefs.sound,false);assert.equal(restored.state.flow,2);
console.log('Voyage: both shores, both routes, action order, interruptions, content compatibility and restore passed.');
