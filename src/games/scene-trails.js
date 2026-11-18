(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ShanyueScenes=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const fail=message=>{throw new Error('寻景配置：'+message);};
  const text=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail(label+'无效');return value;};
  const id=value=>{if(typeof value!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(value)||['constructor','prototype','__proto__'].includes(value))fail('标识无效');return value;};
  function validate(rows){
    if(!Array.isArray(rows)||rows.length>100)fail('需要场景列表');
    const ids=new Set();
    return rows.map(row=>{
      const key=id(row.id);if(ids.has(key))fail('场景标识重复');ids.add(key);
      if(!Array.isArray(row.clues)||row.clues.length<1||row.clues.length>6)fail('线索数量无效');
      const clues=row.clues.map(c=>{
        for(const p of ['x','y','tx','ty'])if(!Number.isFinite(c[p])||c[p]<0||c[p]>100)fail('线索坐标无效');
        return {name:text(c.name,'线索名',30),text:text(c.text,'线索说明',500),target:id(c.target),x:c.x,y:c.y,tx:c.tx,ty:c.ty};
      });
      if(!Array.isArray(row.options)||row.options.length!==3)fail('需要三张诗笺');
      const options=row.options.map(o=>{
        if(!Array.isArray(o.lines)||o.lines.length!==2||o.lines.some(n=>!Number.isInteger(n)||n<0||n>499)||o.lines[0]>=o.lines[1])fail('选句行号无效');
        if(!Array.isArray(o.expected)||o.expected.length!==2)fail('缺少校核引文');
        return {workId:id(o.workId),authorId:id(o.authorId),lines:o.lines.slice(),expected:o.expected.map(t=>text(t,'校核引文',100)),response:text(o.response,'反馈',600)};
      });
      if(new Set(options.map(o=>o.workId)).size!==3||options.filter(o=>o.workId===row.answer).length!==1)fail('候选或目标作品不唯一');
      return {id:key,name:text(row.name,'名称',40),stamp:text(row.stamp,'印章',12),alt:text(row.alt,'画面说明'),clues,answer:id(row.answer),options,reading:text(row.reading,'赏读',1000)};
    });
  }
  function available(rows,library){
    return rows.flatMap(row=>{
      const options=[];
      for(const option of row.options){
        const w=library.works.find(w=>w.id===option.workId),author=w&&library.authors[w.author];
        if(!w||!author||w.author!==option.authorId||option.lines.some((n,i)=>w.lines[n]!==option.expected[i]))return [];
        options.push({...option,title:w.title,author:author.name,dynasty:author.dynasty,quote:option.lines.map(n=>w.lines[n]),original:w.lines,intro:w.intro});
      }
      return [{...row,options}];
    });
  }
  return {validate,available};
});
