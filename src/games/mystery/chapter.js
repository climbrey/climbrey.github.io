(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ShanyueMysteryChapter=factory();})(globalThis,function(){
  'use strict';
  const fail=()=>{throw Error('诗境章节配置无效');};
  const text=(s,max=1000)=>{if(typeof s!=='string'||!s.trim()||s.length>max)fail();return s;};
  const id=s=>{if(typeof s!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(s))fail();return s;};
  function validate(c){
    if(!c||c.id!=='lotus-letter')fail();
    const result={id:c.id,title:text(c.title,40),subtitle:text(c.subtitle,160)};
    if(!Array.isArray(c.rooms)||c.rooms.length!==3||c.rooms.map(r=>r.id).join()!=='court,stream,pond')fail();
    result.rooms=c.rooms.map(r=>({id:id(r.id),name:text(r.name,15),caption:text(r.caption,180)}));
    for(const field of ['poem','bonus']){const r=c[field];if(!r||!Array.isArray(r.lines)||r.lines.length!==2||r.lines.some(n=>!Number.isInteger(n)||n<0||n>499)||r.lines[0]>=r.lines[1]||!Array.isArray(r.expected)||r.expected.length!==2)fail();result[field]={workId:id(r.workId),authorId:id(r.authorId),lines:r.lines.slice(),expected:r.expected.map(s=>text(s,100))};}
    if(!Array.isArray(c.letter)||c.letter.length>12)fail();result.letter=c.letter.map(s=>text(s,600));
    result.hints={};for(const phase of ['key','box','plant','water','visitor','frame','done']){const values=c.hints?.[phase];if(!Array.isArray(values)||values.length!==3)fail();result.hints[phase]=values.map(s=>text(s,400));}
    return result;
  }
  function resolve(chapter,library){
    const out={...chapter};
    for(const field of ['poem','bonus']){const ref=chapter[field],w=library.works.find(w=>w.id===ref.workId),a=w&&library.authors[w.author];if(!w||!a||w.author!==ref.authorId||ref.lines.some((n,i)=>w.lines[n]!==ref.expected[i]))return null;out[field]={...ref,title:w.title,author:a.name,dynasty:a.dynasty,expected:ref.lines.map(n=>w.lines[n]),original:w.lines,intro:w.intro};}
    return out;
  }
  return {validate,resolve};
});
