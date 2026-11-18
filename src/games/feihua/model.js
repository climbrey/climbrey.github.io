(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ShanyueFeihua=factory();})(globalThis,function(){
  'use strict';
  const normalize=text=>String(text).normalize('NFKC').replace(/[\s\p{P}]/gu,'');
  function config(raw){
    if(!raw||!Number.isInteger(raw.rounds)||raw.rounds<2||raw.rounds>12||!Array.isArray(raw.words)||!raw.words.length||raw.words.length>12)throw Error('飞花令配置无效');
    const seen=new Set();
    const words=raw.words.map(w=>{
      if(!w||typeof w.char!=='string'||!/^\p{Script=Han}$/u.test(w.char)||seen.has(w.char)||typeof w.caption!=='string'||!w.caption.trim()||w.caption.length>24)throw Error('飞花令令字或场景名无效');
      seen.add(w.char);return {char:w.char,caption:w.caption};
    });
    return {rounds:raw.rounds,words};
  }
  function collect(library,settings){
    const lines=[],seen=new Set(),words=settings.words.map(w=>w.char);
    for(const work of library.works){
      if(!/五言|七言|古体诗|乐府|歌行/.test(work.form)||/古文|词|曲/.test(work.form))continue;
      const author=library.authors[work.author];if(!author)continue;
      work.lines.forEach((original,index)=>{
        for(const part of original.split(/[，。！？；、,!?;]+/u)){
          const text=part.trim();
          if(!/^(?:\p{Script=Han}{5}|\p{Script=Han}{7})$/u.test(text)||!words.some(w=>text.includes(w))||seen.has(text))continue;
          seen.add(text);lines.push({id:work.id+':'+index+':'+text,text,workId:work.id,index,title:work.title,author:author.name,authorId:work.author,dynasty:author.dynasty});
        }
      });
    }
    return lines;
  }
  function initial(word,settings){return {version:1,word,entries:[],restAt:settings.rounds,rest:false};}
  function available(pool,state){const used=new Set(state.entries.map(e=>e.text));return pool.filter(l=>l.text.includes(state.word)&&!used.has(l.text));}
  function sanitize(raw,settings){
    if(!raw||raw.version!==1||!settings.words.some(w=>w.char===raw.word)||!Array.isArray(raw.entries)||raw.entries.length>2048||raw.entries.length%2||!Number.isInteger(raw.restAt)||raw.restAt<settings.rounds||raw.restAt>2050||raw.restAt%settings.rounds)return null;
    const seen=new Set(),entries=[];
    for(let i=0;i<raw.entries.length;i++){
      const e=raw.entries[i];
      if(!e||typeof e.id!=='string'||e.id.length>240||typeof e.text!=='string'||!/^\p{Script=Han}{5}(?:\p{Script=Han}{2})?$/u.test(e.text)||!e.text.includes(raw.word)||typeof e.authorId!=='string'||e.authorId.length>64||e.who!==(i%2?'host':'user')||seen.has(e.text))return null;
      seen.add(e.text);entries.push({id:e.id,text:e.text,authorId:e.authorId,who:e.who,borrowed:e.who==='user'&&e.borrowed===true});
    }
    if(raw.restAt<entries.length/2)return null;
    return {version:1,word:raw.word,entries,restAt:raw.restAt,rest:raw.rest===true};
  }
  function restore(raw,pool,settings){
    const usable=settings.words.find(w=>pool.filter(l=>l.text.includes(w.char)).length>=2)?.char||settings.words[0].char;
    if(raw==null)return {state:initial(usable,settings),notice:''};
    const state=sanitize(raw,settings),byId=new Map(pool.map(l=>[l.id,l]));
    if(!state)return {state:initial(usable,settings),notice:'原来的接诗记录暂时无法恢复，这一场从新的一句开始。'};
    if(state.entries.some(e=>{const l=byId.get(e.id);return !l||l.text!==e.text||l.authorId!==e.authorId;})||(!state.entries.length&&available(pool,state).length<2))return {state:initial(usable,settings),notice:'小集里的原文或作者已更新，这一场重新开始，以当前原诗为准。'};
    state.rest=state.rest||state.entries.length/2>=state.restAt||(state.entries.length>0&&available(pool,state).length<2);
    return {state,notice:''};
  }
  function check(state,pool,input){
    const text=normalize(input);
    if(!text)return {kind:'empty'};
    if(!text.includes(state.word))return {kind:'missing'};
    if(state.entries.some(e=>e.text===text))return {kind:'duplicate'};
    const line=pool.find(l=>l.text===text);
    if(!line){const near=available(pool,state).find(l=>l.text.length===text.length&&[...l.text].filter((c,i)=>c!==text[i]).length===1);return {kind:'unknown',near:near||null};}
    if(state.rest)return {kind:'rest'};
    if(available(pool,state).length<2)return {kind:'exhausted'};
    return {kind:'ok',line};
  }
  function choose(pool,previous,random=Math.random){
    if(!pool.length)return null;
    const otherAuthors=pool.filter(l=>l.authorId!==previous?.authorId),otherWorks=pool.filter(l=>l.workId!==previous?.workId);
    const choices=otherAuthors.length?otherAuthors:otherWorks.length?otherWorks:pool;
    const pick=items=>items[Math.min(items.length-1,Math.max(0,Math.floor(random()*items.length)))];
    const work=pick([...new Set(choices.map(l=>l.workId))]);return pick(choices.filter(l=>l.workId===work));
  }
  const ref=(line,who,borrowed=false)=>({id:line.id,text:line.text,authorId:line.authorId,who,borrowed:!!borrowed});
  function play(state,pool,input,borrowed=false,random=Math.random){
    const result=check(state,pool,input);if(result.kind!=='ok')return result;
    const user=result.line,entries=state.entries.concat(ref(user,'user',borrowed));
    const reply=choose(available(pool,{...state,entries}),user,random);if(!reply)return {kind:'exhausted'};
    entries.push(ref(reply,'host'));const next={...state,entries};
    next.rest=entries.length/2>=state.restAt||available(pool,next).length<2;
    return {kind:'ok',state:next,user,reply};
  }
  function resume(state,pool,settings){if(available(pool,state).length<2)return null;return {...state,rest:false,restAt:state.entries.length/2+settings.rounds};}
  return {normalize,config,collect,initial,available,sanitize,restore,check,choose,play,resume};
});
