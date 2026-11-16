(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./library.js'));
  else root.ShanyuePersonal=factory(root.ShanyueLibrary);
})(typeof globalThis!=='undefined'?globalThis:this,function(libraryApi){
  'use strict';
  const {validateLibrary}=libraryApi;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const groups=['authors','works','tags','modules','topics','config'];
  const safe=key=>typeof key==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(key)&&!['constructor','prototype','__proto__'].includes(key);
  function canonical(value){
    if(value===undefined)return 'undefined';
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  }
  // Content comparison only; these fingerprints are not security signatures.
  function fingerprint(value){
    const text=canonical(value);let a=2166136261,b=5381;
    for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
    return text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
  }
  function tables(library){
    const result={authors:copy(library.authors),config:{site:{name:library.name},discovery:copy(library.discovery)}};
    for(const group of groups.filter(g=>!['authors','config'].includes(g)))result[group]=Object.fromEntries(library[group].map(row=>[row.id,copy(row)]));
    return result;
  }
  function fields(row){
    const result={};
    for(const [key,value] of Object.entries(row)){
      if(key==='extra'){for(const [id,text] of Object.entries(value||{}))result['extra/'+id]=text;}
      else result[key]=value;
    }
    return result;
  }
  function fingerprints(library){
    const result={groups:{},moduleOrder:library.modules.map(m=>m.id)};
    for(const [group,rows] of Object.entries(tables(library))){
      result.groups[group]={};
      for(const [id,row] of Object.entries(rows))result.groups[group][id]={whole:fingerprint(row),fields:Object.fromEntries(Object.entries(fields(row)).map(([k,v])=>[k,fingerprint(v)]))};
    }
    return result;
  }
  function diff(base,current,baseline=fingerprints(base)){
    const local=tables(current), result={groups:{},authors:{}};
    for(const group of groups){
      const old=baseline.groups[group]||{}, changes={};
      for(const id of new Set([...Object.keys(old),...Object.keys(local[group])])){
        const before=old[id], row=local[group][id];
        if(!row){changes[id]={kind:'delete',base:before.whole};continue;}
        if(!before){changes[id]={kind:'add',value:row};continue;}
        const now=fields(row), set={}, removed=[], hashes={};
        for(const key of new Set([...Object.keys(before.fields),...Object.keys(now)])){
          const previous=before.fields[key]||fingerprint(undefined);
          if(previous===fingerprint(now[key]))continue;
          hashes[key]=previous;
          if(own(now,key))set[key]=now[key];else removed.push(key);
        }
        if(Object.keys(hashes).length)changes[id]={kind:'edit',set,removed,base:hashes,fallback:row};
      }
      if(Object.keys(changes).length)result.groups[group]=changes;
    }
    const order=current.modules.map(m=>m.id);
    if(canonical(order)!==canonical(baseline.moduleOrder))result.moduleOrder=order;
    for(const change of Object.values(result.groups.works||{})){
      const work=change.value||change.fallback;
      if(work&&current.authors[work.author])result.authors[work.author]=copy(current.authors[work.author]);
    }
    return result;
  }
  function assign(row,key,value,remove){
    if(key.startsWith('extra/')){
      const id=key.slice(6);if(!safe(id))throw new Error('个人模块标识无效');
      row.extra=row.extra||{};if(remove)delete row.extra[id];else row.extra[id]=copy(value);
    }else{
      if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key)||['constructor','prototype','__proto__'].includes(key))throw new Error('个人内容字段无效');
      if(remove)delete row[key];else row[key]=copy(value);
    }
  }
  function apply(seed,personal={groups:{}}){
    if(!personal||typeof personal!=='object'||!personal.groups||typeof personal.groups!=='object')throw new Error('个人内容格式无效');
    const data=tables(seed), notices=[];
    const notice=(group,id,field)=>notices.push({group,id,field});
    for(const [group,changes] of Object.entries(personal.groups)){
      if(!groups.includes(group)||!changes||typeof changes!=='object')throw new Error('个人内容分类无效');
      for(const [id,change] of Object.entries(changes)){
        if(!safe(id)||!change||typeof change!=='object')throw new Error('个人内容标识无效');
        const row=data[group][id];
        if(change.kind==='delete'){
          if(row&&fingerprint(row)!==change.base)notice(group,id,'*');
          delete data[group][id];
        }else if(change.kind==='add'){
          if(row&&fingerprint(row)!==fingerprint(change.value))notice(group,id,'*');
          data[group][id]=copy(change.value);
        }else if(change.kind==='edit'){
          if(!row){data[group][id]=copy(change.fallback);notice(group,id,'*');continue;}
          const before=fields(row);
          for(const key of new Set([...Object.keys(change.set||{}),...(change.removed||[])])){
            const removed=(change.removed||[]).includes(key), value=removed?undefined:change.set[key];
            if(fingerprint(before[key])!==change.base?.[key]&&fingerprint(before[key])!==fingerprint(value))notice(group,id,key);
            assign(row,key,value,removed);
          }
        }else throw new Error('个人内容修改类型无效');
      }
    }
    for(const w of Object.values(data.works)){
      if(!own(data.authors,w.author)&&own(personal.authors||{},w.author))data.authors[w.author]=copy(personal.authors[w.author]);
      w.tags=w.tags.filter(id=>own(data.tags,id));
      w.related=w.related.filter(r=>own(data.works,r.id));
    }
    // Removed built-in references must not prevent reading the remaining collection.
    for(const tag of Object.values(data.tags))if(tag.parent&&!own(data.tags,tag.parent))tag.parent=null;
    for(const topic of Object.values(data.topics)){
      topic.works=topic.works.filter(id=>own(data.works,id));
      if(topic.tag&&!own(data.tags,topic.tag))topic.tag='';
    }
    let modules=Object.values(data.modules);
    if(personal.moduleOrder){
      if(!Array.isArray(personal.moduleOrder))throw new Error('模块顺序格式无效');
      const rank=new Map(personal.moduleOrder.map((id,i)=>[id,i]));
      modules.sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
    }
    const library=validateLibrary({version:1,name:data.config.site.name,discovery:data.config.discovery,authors:data.authors,works:Object.values(data.works),tags:Object.values(data.tags),topics:Object.values(data.topics),modules});
    return {library,notices};
  }
  function migrate(seed,old,baseline){return apply(seed,diff(seed,old,baseline));}
  function uniqueNotices(notices){
    return [...new Map(notices.filter(n=>n&&groups.includes(n.group)&&safe(n.id)&&typeof n.field==='string').map(n=>[n.group+'/'+n.id+'/'+n.field,n])).values()];
  }
  function usePublished(seed,current,notices){
    const personal=diff(seed,current);
    for(const n of notices){
      const changes=personal.groups[n.group], change=changes?.[n.id];if(!change)continue;
      if(n.field==='*'||change.kind!=='edit')delete changes[n.id];
      else {
        delete change.set[n.field];delete change.base[n.field];
        change.removed=change.removed.filter(key=>key!==n.field);
        if(!Object.keys(change.base).length)delete changes[n.id];
      }
    }
    return apply(seed,personal).library;
  }
  return {fingerprint,fingerprints,diff,apply,migrate,uniqueNotices,usePublished};
});
