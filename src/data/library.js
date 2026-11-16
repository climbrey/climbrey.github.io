(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ShanyueLibrary=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
  function validateLibrary(input, defaults={}) {
    const error=message=>{throw new Error('内容校验：'+message);};
    const str=(v,label,max=6000)=>{if(typeof v!=='string'||v.length>max)error(label+'不是有效文本');return v;};
    const ident=(v,label)=>{if(typeof v!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(v)||['constructor','prototype','__proto__'].includes(v))error(label+'标识无效');return v;};
    const list=(v,label,max=5000)=>{if(!Array.isArray(v)||v.length>max)error(label+'不是有效列表');return v;};
    const unique=(items,label)=>{const ids=new Set();items.forEach(x=>{if(ids.has(x.id))error(label+'标识重复：'+x.id);ids.add(x.id);});};
    if(!input||typeof input!=='object'||input.version!==1)error('不支持的版本');
    if(!input.authors||typeof input.authors!=='object'||Array.isArray(input.authors))error('缺少作者资料');
    const authors={};Object.entries(input.authors).forEach(([key,a])=>{ident(key,'作者');if(!a||typeof a!=='object')error('作者资料无效');authors[key]={name:str(a.name,'作者名',100),dynasty:str(a.dynasty,'朝代',30),life:str(a.life||'','生卒年',100),bio:str(a.bio||'','作者简介')};});
    const tags=list(input.tags,'分类',1000).map(t=>({id:ident(t.id,'分类'),name:str(t.name,'分类名称',50),parent:t.parent?ident(t.parent,'上级分类'):null}));unique(tags,'分类');
    const tagMap=new Map(tags.map(t=>[t.id,t]));tags.forEach(t=>{const seen=new Set([t.id]);let p=t.parent;while(p){if(!tagMap.has(p))error('分类上级不存在');if(seen.has(p))error('分类存在循环');seen.add(p);p=tagMap.get(p).parent;if(seen.size>30)error('分类层级过深');}});
    const modules=list(input.modules,'模块',50).map(m=>({id:ident(m.id,'模块'),label:str(m.label,'模块名称',50),enabled:!!m.enabled}));unique(modules,'模块');
    const works=list(input.works,'作品',2000).map(w=>{
      const id=ident(w.id,'作品'),author=ident(w.author,'作者');if(!Object.prototype.hasOwnProperty.call(authors,author))error('作品作者不存在：'+id);
      const lines=list(w.lines,'原文',500).map(l=>str(l,'原文',2000));if(!lines.length||lines.some(l=>!l.trim()))error('原文不能留空');
      const quote=list(w.quote||[0],'选句',500);if(!quote.length||quote.some(i=>!Number.isInteger(i)||i<0||i>=lines.length))error('选句位置无效：'+id);
      const wt=list(w.tags||[],'作品标签',1000).map(t=>ident(t,'标签'));if(wt.some(t=>!tagMap.has(t)))error('作品引用了不存在的标签：'+id);
      const extra={};if(w.extra){if(typeof w.extra!=='object'||Array.isArray(w.extra))error('自定义模块无效');Object.entries(w.extra).forEach(([k,v])=>{extra[ident(k,'模块')]=str(v,'模块内容',12000);});}
      return {id,title:str(w.title,'篇名',160),author,form:str(w.form,'文体',60),stage:list(w.stage||[],'学段标签',3).filter(s=>['小学','初中','高中'].includes(s)),scene:['moon','mountain','water','rain','snow','bamboo','flower'].includes(w.scene)?w.scene:'mountain',tags:[...new Set(wt)],lines,quote:[...new Set(quote)],preface:str(w.preface||'','序文'),intro:str(w.intro||'','引言',500),notes:list(w.notes||[],'注释',500).map(n=>({q:str(n.q,'注释词语',200),text:str(n.text,'注释')})),background:str(w.background||'','背景',12000),reading:list(w.reading||[],'赏读',100).map(r=>({quote:str(r.quote||'','赏读引文',2000),title:str(r.title||'','赏读题名',200),text:str(r.text,'赏读内容',12000)})),thought:str(w.thought||'','思想情感',12000),sources:list(w.sources||[],'来源',100).map(s=>str(s,'来源',2000)),related:list(w.related||[],'关联作品',100).map(r=>({id:ident(r.id,'关联作品'),reason:str(r.reason,'关联理由',1000)})),extra};
    });unique(works,'作品');if(!works.length)error('至少需要一篇作品');
    const ids=new Set(works.map(w=>w.id));works.forEach(w=>{if(w.related.some(r=>!ids.has(r.id)))error('关联作品不存在：'+w.id);});
    const topics=list(input.topics||[],'专题',200).map(t=>({id:ident(t.id,'专题'),name:str(t.name,'专题名称',100),subtitle:str(t.subtitle||'','专题简介',500),scene:['moon','mountain','water','rain','snow','bamboo','flower'].includes(t.scene)?t.scene:'mountain',works:list(t.works,'专题作品',2000).map(id=>ident(id,'作品')),tag:t.tag||''}));unique(topics,'专题');topics.forEach(t=>{if(t.works.some(id=>!ids.has(id)))error('专题作品不存在：'+t.id);});
    const discovery=validateDiscovery(input.discovery||defaults.discovery||{},str,ident,list);
    return {discovery,version:1,name:str(input.name||'山月','内容库名称',50),authors,tags,modules,works,topics};
  }

function validateDiscovery(input,str,ident,list){
  if(!input||typeof input!=='object')throw new Error('发现配置无效');
  const choices=(key)=>list(input[key]||[],'发现入口',100).map(c=>({tag:ident(c.tag,'入口分类'),label:str(c.label,'入口名称',50),hint:str(c.hint||'','入口说明',100),...(key==='motifs'?{icon:ident(c.icon||c.tag,'入口图标')}:{scene:['moon','mountain','water','rain','snow','bamboo','flower'].includes(c.scene)?c.scene:'mountain'})}));
  // Keep absent optional fields absent so old backups do not override new published entries.
  return {defaultWork:input.defaultWork?ident(input.defaultWork,'首页作品'):'',featuredMark:str(input.featuredMark||'','专题标记',10),motifs:choices('motifs'),landscape:choices('landscape'),feeling:choices('feeling'),...(input.places!==undefined?{places:choices('places')}:{})};
}
return {validateLibrary};
});
