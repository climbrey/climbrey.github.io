const assert=require('assert');
const M=require('../src/games/feihua/model.js');
const library=require('../scripts/content.js').collectContent();
const settings=require('../scripts/feihua.js').collectFeihua(library);
const pool=M.collect(library,settings);
assert(pool.length>200);
assert.equal(pool.length,new Set(pool.map(l=>l.text)).size);
for(const line of pool){
  const w=library.works.find(w=>w.id===line.workId);
  assert(w.lines[line.index].includes(line.text));assert.equal(w.author,line.authorId);
  assert.equal(library.authors[w.author].name,line.author);
}
for(const {char} of settings.words){
  let state=M.initial(char,settings),count=0;
  const total=M.available(pool,state).length;
  while(M.available(pool,state).length>=2){
    if(state.rest)state=M.resume(state,pool,settings);
    const next=M.available(pool,state)[0];
    const result=M.play(state,pool,next.text,count%2===0,()=>.3);
    assert.equal(result.kind,'ok');state=result.state;count++;
    assert(result.user.text!==result.reply.text);assert(result.reply.text.includes(char));
    assert.equal(state.entries.length,count*2);
    assert.deepEqual(M.restore(JSON.parse(JSON.stringify(state)),pool,settings).state,state);
  }
  assert.equal(count,Math.floor(total/2));assert(state.rest);
  assert.equal(M.resume(state,pool,settings),null);
  assert.equal(new Set(state.entries.map(e=>e.text)).size,state.entries.length);
}
const initial=M.initial('月',settings);
assert.equal(M.check(initial,pool,'春眠不觉晓').kind,'missing');
assert.equal(M.check(initial,pool,'月色落在我心间').kind,'unknown');
assert.equal(M.check(initial,pool,'').kind,'empty');
const result=M.play(initial,pool,' 床前明月光， ',true,()=>.5);
assert.equal(result.kind,'ok');assert(result.state.entries[0].borrowed);
assert.equal(M.check(result.state,pool,result.reply.text).kind,'duplicate');
assert.equal(M.check(initial,pool,'床前明月亮').near.text,'床前明月光');
assert.equal(initial.entries.length,0,'play must commit both turns as a new value');
const odd={...result.state,entries:result.state.entries.slice(0,1)};
assert.equal(M.sanitize(odd,settings),null);
assert.equal(M.sanitize({...result.state,entries:[result.state.entries[0],{...result.state.entries[0],who:'host'}]},settings),null);
assert.equal(M.sanitize({...result.state,restAt:Infinity},settings),null);
assert.equal(M.sanitize({...result.state,entries:[{...result.state.entries[0],text:'<img>'},result.state.entries[1]]},settings),null);
const changed=JSON.parse(JSON.stringify(library));
changed.works.find(w=>w.id===result.user.workId).lines[result.user.index]='个人改写的这一行';
const restored=M.restore(result.state,M.collect(changed,settings),settings);
assert(restored.notice.includes('更新'));assert.equal(restored.state.entries.length,0);
const removed=pool.filter(l=>l.id!==result.reply.id);assert(M.restore(result.state,removed,settings).notice);
const editedAuthor=pool.map(l=>l.id===result.reply.id?{...l,authorId:'different-author'}:l);assert(M.restore(result.state,editedAuthor,settings).notice);
const renamed=pool.map(l=>({...l,title:'新标题',author:'修订名'}));assert.equal(M.restore(result.state,renamed,settings).notice,'');
assert.deepEqual(M.collect({authors:library.authors,works:[{id:'prose',author:'libai',form:'古文',lines:['床前明月光，举头望明月。']}]},settings),[]);
assert.throws(()=>M.config({...settings,words:[settings.words[0],settings.words[0]]}));
assert.throws(()=>M.config({...settings,words:[{char:'月',caption:'x'.repeat(100)}]}));
assert.equal(M.choose([],null),null);
const empty=M.restore(null,[],settings);assert.equal(empty.state.entries.length,0);
console.log('PASS: '+pool.length+' sourced Feihua lines, every word through exhaustion, atomic rounds, hints, duplicates, invalid backups, content/author changes and limited libraries');
