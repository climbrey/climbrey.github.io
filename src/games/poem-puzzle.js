(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ShanyuePuzzle=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const split=text=>text.length===5?[text.slice(0,2),text.slice(2)]:[text.slice(0,2),text.slice(2,4),text.slice(4)];

  function collect(works){
    const rounds=[];
    for(const work of works){
      if(/古文|词|曲/.test(work.form))continue;
      const parts=Array.from(work.lines.join('\n').matchAll(/([^，。！？；：]+)([，。！？；：])/gu),m=>({text:m[1].trim(),end:m[2]}));
      for(let i=0;i<parts.length-1;i++){
        const a=parts[i],b=parts[i+1];
        if(a.end!=='，'||!/[。！？]/.test(b.end)||a.text.length!==b.text.length||![5,7].includes(a.text.length))continue;
        if(!/^\p{Script=Han}+$/u.test(a.text+b.text))continue;
        const rows=[split(a.text),split(b.text)];
        rounds.push({id:work.id+':'+i,workId:work.id,rows,ends:[a.end,b.end],lines:[a.text+a.end,b.text+b.end],pieces:rows.flat()});
      }
    }
    return rounds;
  }
  function choose(rounds,recent=[],current=null,preferred='',random=Math.random){
    if(!rounds.length)return null;
    if(!current&&preferred){const first=rounds.find(r=>r.workId===preferred);if(first)return first;}
    let pool=rounds.filter(r=>!recent.slice(-4).includes(r.workId));
    if(!pool.length)pool=rounds.filter(r=>r.workId!==current?.workId);
    if(!pool.length)pool=rounds.filter(r=>r.id!==current?.id);
    if(!pool.length)pool=rounds;
    // Pick the work first so long poems do not dominate the selection.
    const works=[...new Set(pool.map(r=>r.workId))],workId=works[Math.floor(random()*works.length)];
    const choices=pool.filter(r=>r.workId===workId);
    return choices[Math.floor(random()*choices.length)];
  }
  function create(round,random=Math.random){
    const order=round.pieces.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    if(order.every((id,i)=>round.pieces[id]===round.pieces[i]))order.push(order.shift());
    return {round,order,placed:round.pieces.map(()=>null),history:[]};
  }
  function status(state){
    const correct=state.placed.filter((id,i)=>id!==null&&state.round.pieces[id]===state.round.pieces[i]).length;
    return {correct,complete:correct===state.placed.length,full:state.placed.every(id=>id!==null)};
  }
  function remember(state){state.history.push(state.placed.slice());if(state.history.length>40)state.history.shift();}
  function place(state,id){
    const slot=state.placed.indexOf(null);
    if(!Number.isInteger(id)||id<0||id>=state.placed.length||slot<0||state.placed.includes(id))return false;
    remember(state);state.placed[slot]=id;return true;
  }
  function remove(state,slot){
    if(!Number.isInteger(slot)||slot<0||slot>=state.placed.length||state.placed[slot]===null)return false;
    remember(state);state.placed[slot]=null;return true;
  }
  function hint(state){
    const {pieces}=state.round,slot=state.placed.findIndex((id,i)=>id===null||pieces[id]!==pieces[i]);
    if(slot<0)return false;
    // Identical fragments are interchangeable; preserve already correct positions.
    const tile=pieces.findIndex((text,id)=>text===pieces[slot]&&!state.placed.some((other,i)=>other===id&&pieces[i]===text));
    if(tile<0)return false;
    remember(state);
    state.placed=state.placed.map(id=>id===tile?null:id);
    state.placed[slot]=tile;return true;
  }
  function undo(state){if(!state.history.length)return false;state.placed=state.history.pop();return true;}
  function reset(state){if(state.placed.every(id=>id===null))return false;remember(state);state.placed.fill(null);return true;}
  return {collect,choose,create,status,place,remove,hint,undo,reset};
});
