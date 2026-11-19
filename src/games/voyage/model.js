(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShanyueVoyage=api;})(globalThis,function(){
  'use strict';
  const stages=['inlet','fork','bend','landing','done'];
  const routes=['bamboo','lotus'];
  const initial=()=>({stage:'inlet',route:null,flow:2,leaf:0,method:null});
  function sanitize(raw){
    const s=initial();if(!raw||!stages.includes(raw.stage))return s;
    s.flow=[0,1,2,3].includes(raw.flow)?raw.flow:2;s.leaf=[-1,0,1].includes(raw.leaf)?raw.leaf:0;
    s.stage=raw.stage;s.route=routes.includes(raw.route)?raw.route:null;
    s.method=['inside','outside'].includes(raw.method)?raw.method:null;
    if(['bend','landing','done'].includes(s.stage)&&!s.route)return initial();
    if(['landing','done'].includes(s.stage)&&!s.method){s.stage='bend';}
    if(['inlet','fork'].includes(s.stage)){s.route=null;s.method=null;}
    return s;
  }
  function compatible(library,chapter){return chapter.routes.filter(r=>{const w=library.works.find(w=>w.id===r.work);return w&&w.author===r.author&&r.lines.every((n,i)=>w.lines[n]===r.expected[i]);});}
  function preview(s){
    if(!s.flow)return 'still';if(s.flow===3)return 'rush';
    if(!s.route)return 'open';if(!s.leaf)return 'blocked';
    const inner=s.route==='bamboo'?-1:1;
    if(s.flow===1&&s.leaf===inner)return 'inside';
    if(s.flow===2&&s.leaf===-inner)return 'outside';
    return 'blocked';
  }
  function act(input,action){
    const s=sanitize(input),next={...s};let effect='adjust';
    if(action.type==='flow'&&[0,1,2,3].includes(action.value)&&s.stage!=='done')next.flow=action.value;
    else if(action.type==='leaf'&&s.stage==='bend'&&[-1,0,1].includes(action.value))next.leaf=action.value;
    else if(action.type==='sail'&&s.stage==='inlet'){
      if(!s.flow)return {state:s,effect:'still'};
      if(s.flow===3)return {state:s,effect:'rush'};
      next.stage='fork';effect='release';
    }else if(action.type==='route'&&s.stage==='fork'&&routes.includes(action.value)){
      next.route=action.value;next.stage='bend';next.leaf=0;effect='branch';
    }else if(action.type==='sail'&&s.stage==='bend'){
      const result=preview(s);
      if(!['inside','outside'].includes(result))return {state:s,effect:result};
      next.method=result;next.stage='landing';effect='arrive';
    }else if(action.type==='discover'&&s.stage==='landing'){
      if(s.flow>1)return {state:s,effect:'restless'};
      next.stage='done';effect='discover';
    }else if(action.type==='fork'&&s.stage!=='inlet'){
      Object.assign(next,{stage:'fork',route:null,method:null,leaf:0,flow:2});effect='return';
    }else return {state:s,effect:'none'};
    return {state:next,effect};
  }
  function snapshot(raw){
    const state=sanitize(raw?.state),history=Array.isArray(raw?.history)?raw.history.slice(-20).map(sanitize):[];
    const journal=Array.isArray(raw?.journal)?raw.journal.filter(r=>routes.includes(r.route)&&['inside','outside'].includes(r.method)).slice(-12).map(r=>({route:r.route,method:r.method})):[];
    return {version:1,state,history,journal,prefs:{still:raw?.prefs?.still===true,sound:raw?.prefs?.sound===true}};
  }
  return {initial,sanitize,compatible,preview,act,snapshot};
});
