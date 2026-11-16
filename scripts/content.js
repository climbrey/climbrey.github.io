const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { validateLibrary } = require('../src/data/library.js');

const ROOT = path.resolve(__dirname, '../content');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function fail(file, message) { throw new Error(path.relative(process.cwd(), file) + ': ' + message); }
function yaml(text, file) {
  const doc = YAML.parseDocument(text, { uniqueKeys: true, version: '1.2' });
  if (doc.errors.length || doc.warnings.length) fail(file, [...doc.errors, ...doc.warnings].map(e => e.message).join('\n'));
  try { return doc.toJS({ maxAliasCount: 0 }); } catch (e) { fail(file, e.message); }
}
function files(dir, extension) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)
    .flatMap(entry => entry.isDirectory() ? files(path.join(dir,entry.name),extension)
      : entry.isFile() && entry.name.endsWith(extension) ? [path.join(dir,entry.name)] : []);
}
function metadata(file) {
  const text = read(file), match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) fail(file, '缺少以 --- 包围的 YAML 文件头');
  const meta = yaml(match[1], file);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) fail(file, '文件头必须是字段对象');
  return { meta, body: match[2].trim() };
}
function keys(meta, allowed, file) {
  for (const key of Object.keys(meta)) if (!allowed.includes(key)) fail(file, '未知字段：' + key);
  if ('order' in meta && (!Number.isFinite(meta.order) || meta.order < 0)) fail(file, 'order 必须是非负数字');
}
function sections(body, file) {
  const headings = [...body.matchAll(/^## (.+?) \{#([a-z][a-z0-9_-]*)\}\s*$/gm)];
  if (!headings.length || body.slice(0,headings[0].index).trim()) fail(file, '正文应从带固定标识的二级标题开始');
  const result = {};
  headings.forEach((heading,i)=>{
    const id=heading[2];
    if (Object.hasOwn(result,id)) fail(file,'模块标识重复：'+id);
    result[id]=body.slice(heading.index+heading[0].length,headings[i+1]?.index??body.length).trim();
    if (/^## /m.test(result[id])) fail(file,'二级标题需要固定模块标识 {#id}');
  });
  return result;
}
function entries(text, file) {
  if (!text) return [];
  const headings=[...text.matchAll(/^### (.+)$/gm)];
  if (!headings.length || text.slice(0,headings[0].index).trim()) fail(file,'注释与赏读条目需用 ### 标题分隔');
  return headings.map((h,i)=>({title:h[1].trim(),text:text.slice(h.index+h[0].length,headings[i+1]?.index??text.length).trim()}));
}
function sorted(rows) { return rows.sort((a,b)=>(a.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)||(a.id<b.id?-1:a.id>b.id?1:0)).map(({order,...row})=>row); }
function collectContent(root=ROOT) {
  const config=name=>yaml(read(path.join(root,name+'.yaml')),path.join(root,name+'.yaml'));
  const site=config('site'), modules=config('modules'), tags=config('taxonomy'), discovery=config('discovery');
  if(!site||typeof site!=='object'||Array.isArray(site))fail(path.join(root,'site.yaml'),'需要站点字段对象');
  keys(site,['version','name'],path.join(root,'site.yaml'));
  for(const [name,items,allowed] of [['modules',modules,['id','label','enabled']],['taxonomy',tags,['id','name','parent']]]){
    if(!Array.isArray(items))fail(path.join(root,name+'.yaml'),'需要列表，每条以 - 开始');
    for(const item of items){
      if(!item||typeof item!=='object'||Array.isArray(item))fail(path.join(root,name+'.yaml'),'列表条目需要字段对象');
      keys(item,allowed,path.join(root,name+'.yaml'));
    }
  }
  if(!discovery||typeof discovery!=='object'||Array.isArray(discovery))fail(path.join(root,'discovery.yaml'),'需要发现配置对象');
  keys(discovery,['defaultWork','featuredMark','motifs','landscape','feeling','places'],path.join(root,'discovery.yaml'));
  for(const key of ['motifs','landscape','feeling','places']){
    if(key==='places'&&discovery[key]===undefined)continue;
    if(!Array.isArray(discovery[key]))fail(path.join(root,'discovery.yaml'),key+' 需要入口列表');
    for(const item of discovery[key]){
      if(!item||typeof item!=='object')fail(path.join(root,'discovery.yaml'),'入口需要字段对象');
      keys(item,['tag','label','hint',key==='motifs'?'icon':'scene'],path.join(root,'discovery.yaml'));
    }
  }
  const authors={}, workFiles=new Map(), topicFiles=new Map();
  for(const file of files(path.join(root,'authors'),'.md')) {
    const {meta,body}=metadata(file);
    keys(meta,['id','name','dynasty','life'],file);
    if (typeof meta.id!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(meta.id)||['constructor','prototype','__proto__'].includes(meta.id)) fail(file,'作者 id 无效');
    if(Object.hasOwn(authors,meta.id))fail(file,'作者标识重复：'+meta.id);
    const {id,...author}=meta; authors[id]={...author,bio:body};
  }
  const works=sorted(files(path.join(root,'works'),'.md').map(file=>{
    const {meta,body}=metadata(file);
    keys(meta,['order','id','title','author','form','stage','scene','tags','quote','intro','related'],file);
    for(const key of ['stage','tags','quote','related'])if(key in meta&&!Array.isArray(meta[key]))fail(file,key+' 必须是列表');
    if(workFiles.has(meta.id))fail(file,'作品标识重复：'+meta.id);
    workFiles.set(meta.id,file);
    const s=sections(body,file), extra={};
    for(const [id,text] of Object.entries(s)) {
      if(['lines','notes','preface','background','reading','thought','sources'].includes(id))continue;
      if(!Array.isArray(modules)||!modules.some(m=>m.id===id)||id==='author')fail(file,'未注册的文本模块：'+id);
      extra[id]=text;
    }
    if(!s.lines)fail(file,'缺少原文 {#lines}');
    const lines=s.lines.split('\n').map(l=>l.trim()).filter(Boolean);
    const notes=entries(s.notes,file).map(n=>({q:n.title,text:n.text}));
    const reading=entries(s.reading,file).map(r=>{
      const match=r.text.match(/^((?:>[^\n]*(?:\n|$))+)([\s\S]*)$/);
      if(!match)fail(file,'赏读条目应以 > 引文开头：'+r.title);
      return {title:r.title,quote:match[1].trim().split('\n').map(l=>l.replace(/^> ?/,'')).join('\n'),text:match[2].trim()};
    });
    const sources=(s.sources||'').split('\n').filter(l=>l.trim()).map(l=>{
      if(!l.startsWith('- '))fail(file,'每条出处应以 - 开头');
      return l.slice(2).trim();
    });
    if(meta.stage?.some(s=>!['小学','初中','高中'].includes(s)))fail(file,'学段标签只能为小学、初中、高中');
    if(meta.scene&&!['moon','mountain','water','rain','snow','bamboo','flower'].includes(meta.scene))fail(file,'未知插画 scene：'+meta.scene);
    return {...meta,lines,notes,reading,sources,background:s.background||'',thought:s.thought||'',preface:s.preface||'',extra};
  }));
  const topics=sorted(files(path.join(root,'topics'),'.yaml').map(file=>{
    const topic=yaml(read(file),file);
    keys(topic,['order','id','name','subtitle','scene','works','tag'],file);
    if(topicFiles.has(topic.id))fail(file,'专题标识重复：'+topic.id);
    topicFiles.set(topic.id,file);return topic;
  }));
  const tagIds=new Set(tags.map(t=>t.id)), workIds=new Set(works.map(w=>w.id));
  for(const w of works) {
    const file=workFiles.get(w.id);
    if(!Object.hasOwn(authors,w.author))fail(file,'作者不存在：'+w.author);
    for(const tag of w.tags||[])if(!tagIds.has(tag))fail(file,'分类不存在：'+tag);
    for(const r of w.related||[])if(!workIds.has(r.id)||r.id===w.id)fail(file,'关联作品无效：'+r.id);
    if(!w.quote?.length||w.quote.some(i=>!Number.isInteger(i)||i<0||i>=w.lines.length))fail(file,'quote 选句越界；行号从 0 开始');
  }
  for(const t of topics) {
    for(const id of t.works||[])if(!workIds.has(id))fail(topicFiles.get(t.id),'专题作品不存在：'+id);
    if(t.tag&&!tagIds.has(t.tag))fail(topicFiles.get(t.id),'专题分类不存在：'+t.tag);
  }
  if(discovery.defaultWork&&!workIds.has(discovery.defaultWork))fail(path.join(root,'discovery.yaml'),'首页作品不存在：'+discovery.defaultWork);
  for(const key of ['motifs','landscape','feeling','places'])for(const c of discovery[key]||[])if(!tagIds.has(c.tag))fail(path.join(root,'discovery.yaml'),'入口分类不存在：'+c.tag);
  try { return validateLibrary({...site,authors,works,tags,topics,modules,discovery}); }
  catch(e) { fail(root,e.message); }
}
module.exports={collectContent};
if(require.main===module){const content=collectContent();if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(content));else console.log('PASS: '+content.works.length+' 篇作品、'+Object.keys(content.authors).length+' 位作者；内容格式与引用有效');}
