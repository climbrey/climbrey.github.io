(function(root){
  'use strict';
  const Model=root.ShanyueScenes,Experience=root.ShanyueExperience;
  const data=JSON.parse(document.querySelector('#scene-data').textContent);
  const definitions=Model.validate(data.scenes),template='INLINE_SCENE_TEMPLATE';
  const memory=new Map();let currentId='',dispose=()=>{};
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function available(library){return Model.available(definitions,library);}
  function stateOf(scene){
    const signature=JSON.stringify(scene.options.map(o=>[o.workId,o.quote]));
    if(memory.get(scene.id)?.signature!==signature)memory.set(scene.id,{signature,seen:[],matched:false,selected:null});
    return memory.get(scene.id);
  }
  function markup(library){
    if(!available(library).length)return '<div class="game-breadcrumb"><a href="#play">← 返回游园</a></div><section class="empty"><h1>等一处风景，来这里相逢。</h1><p>当前小集暂时没有可用的寻景作品，先去读一篇，或玩一会儿拾句吧。</p><a class="btn primary" href="#explore">去发现文字</a><a class="btn" href="#play/compose">拾句成诗</a></section>';
    return '<div class="scene-game">'+template+'</div>';
  }
  function art(id){return data.art[id]||'';}
  function cleanup(){dispose();dispose=()=>{};}
  function mount(host,library,callbacks){
    cleanup();let active=true,busy=false,revision=0;
    dispose=()=>{active=false;host.onclick=null;};
    const scenes=available(library);if(!scenes.length)return;
    let index=Math.max(0,scenes.findIndex(s=>s.id===currentId));currentId=scenes[index].id;
    const $=selector=>host.querySelector(selector),all=selector=>Array.from(host.querySelectorAll(selector));
    function tabs(){
      $('#scenes').innerHTML=scenes.map((scene,i)=>'<button class="scene-tab" data-scene="'+i+'" aria-pressed="'+(i===index)+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+esc(scene.name)+(stateOf(scene).matched?'<i class="done" aria-label="已经相逢"></i>':'')+'</button>').join('');
    }
    function updateResult(){
      const scene=scenes[index],state=stateOf(scene),answer=scene.options.find(o=>o.workId===scene.answer);
      $('#options').hidden=state.matched;$('#discovery').hidden=!state.matched;$('#reveal').hidden=state.matched;$('#response').hidden=state.matched;
      $('#prompt').textContent=state.matched?'这幅风景，有了自己的诗。':'哪两句，藏着眼前的风景？';
      $('.question-hint').textContent=state.matched?'再停一停，读读字句里的小心思。':'留意画中不同的细节，选一张诗笺。';
      $('#matched-quote').textContent=answer.quote.join('\n');$('#matched-source').textContent=answer.dynasty+' · '+answer.author+'《'+answer.title+'》';$('#reading').textContent=scene.reading;
      $('#read').href='#work/'+encodeURIComponent(answer.workId);
      $('#next').innerHTML=(index===scenes.length-1?'再逛一轮':'再逛一处')+' <span aria-hidden="true">→</span>';
    }
    function refresh(){
      revision++;Experience.clear();const scene=scenes[index],state=stateOf(scene);tabs();
      $('#art').innerHTML=art(scene.id);$('#art svg').setAttribute('aria-label',scene.alt);$('#seal').textContent=scene.stamp;$('#alt').textContent=scene.alt;
      $('#hotspots').innerHTML='<svg class="leaders" viewBox="0 0 800 600" aria-hidden="true">'+scene.clues.map(c=>'<path d="M'+c.x*8+' '+c.y*6+'L'+c.tx*8+' '+c.ty*6+'"/>').join('')+'</svg>'+scene.clues.map((c,i)=>'<button class="hotspot" data-clue="'+i+'" style="left:'+c.x+'%;top:'+c.y+'%" aria-label="'+esc(c.name)+'" aria-pressed="'+state.seen.includes(i)+'"></button>').join('');
      $('#clues').innerHTML=scene.clues.map((c,i)=>'<button class="clue" data-clue="'+i+'" aria-pressed="'+state.seen.includes(i)+'">'+esc(c.name)+'</button>').join('');
      $('#clue-note').textContent=state.seen.length?scene.clues[state.seen.at(-1)].text:'画可以慢慢看，诗也可以慢慢读。';
      $('#options').innerHTML=scene.options.map((o,i)=>'<button class="verse-choice" data-choice="'+i+'" aria-pressed="'+(state.selected===i)+'"><span class="verse-text">'+o.quote.map(l=>'<span>'+esc(l)+'</span>').join('')+'</span><span class="verse-byline">'+esc(o.author)+' · '+esc(o.title)+'</span></button>').join('');
      $('#response').textContent=state.selected!==null?scene.options[state.selected].response:'';
      $('#save').disabled=busy;updateResult();
    }
    function detail(i){
      const scene=scenes[index],state=stateOf(scene),clue=scene.clues[i];if(!clue)return;
      if(!state.seen.includes(i))state.seen.push(i);$('#clue-note').textContent=clue.text;
      all('[data-clue="'+i+'"]').forEach(b=>b.setAttribute('aria-pressed','true'));
      Experience.play($('[data-detail="'+clue.target+'"]'),[{opacity:.35},{opacity:1}],{duration:800});
    }
    function complete(revealed=false){
      const scene=scenes[index],state=stateOf(scene);state.matched=true;state.selected=scene.options.findIndex(o=>o.workId===scene.answer);
      scene.clues.forEach((_,i)=>detail(i));tabs();updateResult();Experience.unfold($('#discovery'));
      if(scene.id==='pond')Experience.play($('[data-detail="dragonfly"]'),[{transform:'translateY(-6px)'},{transform:'none'}],{duration:850});
      if(scene.id==='snow')Experience.play($('.snowflakes'),[{transform:'translateY(-13px)',opacity:.15},{transform:'none',opacity:.9}],{duration:900});
      $('#read').focus({preventScroll:true});$('#clue-note').textContent=(revealed?'画里的细节，正好落在这两句里。':'你看见了，诗也回应了。')+' '+scene.clues[0].text;
    }
    function changeScene(i){
      if(i<0||i>=scenes.length||i===index)return;
      index=i;currentId=scenes[i].id;refresh();$('.scene-tab[aria-pressed=true]').focus({preventScroll:true});
      $('#picture').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
    async function save(){
      if(busy||!stateOf(scenes[index]).matched)return;
      busy=true;const version=revision,scene=scenes[index],answer=scene.options.find(o=>o.workId===scene.answer);$('#save').disabled=true;
      try{
        const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas');
        ctx.fillStyle='#f7f5ec';ctx.fillRect(0,0,1080,1440);
        const svg=art(scene.id).replace('<svg ','<svg width="800" height="600" '),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),picture=new Image();
        try{picture.src=url;await picture.decode();ctx.drawImage(picture,56,64,968,726);}finally{URL.revokeObjectURL(url);}
        if(!active||!host.isConnected||version!==revision)return;
        ctx.fillStyle='#60715e';ctx.font='24px "Microsoft YaHei",sans-serif';ctx.fillText('山月 · 诗里寻景',84,858);
        ctx.fillStyle='#29483b';ctx.font='54px "Songti SC","SimSun",serif';answer.quote.forEach((line,i)=>ctx.fillText(line,84,966+i*91,912));
        const source=answer.dynasty+' · '+answer.author+'《'+answer.title+'》';ctx.fillStyle='#60715e';ctx.font='25px "Microsoft YaHei",sans-serif';
        const bylines=wrap(ctx,source,912);bylines.forEach((line,i)=>ctx.fillText(line,84,1150+i*34));
        ctx.strokeStyle='#ced8c0';ctx.beginPath();ctx.moveTo(84,1310);ctx.lineTo(996,1310);ctx.stroke();ctx.font='24px "Songti SC","SimSun",serif';ctx.fillText('把一幅风景，读成一句诗。',84,1365);
        callbacks.poster({url:canvas.toDataURL('image/png'),title:answer.title,quote:answer.quote.join('')});
      }catch(error){if(active&&host.isConnected&&version===revision)callbacks.toast('图片暂时没有生成，可以稍后再试。');}
      finally{busy=false;if(active&&host.isConnected)$('#save').disabled=false;}
    }
    host.onclick=event=>{
      const button=event.target.closest('button');if(!button||button.disabled)return;
      if(button.dataset.clue!==undefined){detail(Number(button.dataset.clue));return;}
      if(button.dataset.scene!==undefined){changeScene(Number(button.dataset.scene));return;}
      if(button.dataset.choice!==undefined){
        const n=Number(button.dataset.choice),scene=scenes[index],state=stateOf(scene);state.selected=n;
        if(scene.options[n].workId===scene.answer)complete();
        else{$('#response').textContent=scene.options[n].response;all('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.choice)===n)));Experience.play($('#response'),[{opacity:.3},{opacity:1}],{duration:250});}
        return;
      }
      if(button.id==='hint'){const state=stateOf(scenes[index]),next=scenes[index].clues.findIndex((_,i)=>!state.seen.includes(i));detail(next<0?0:next);}
      if(button.id==='reveal')complete(true);
      if(button.id==='again'){const state=stateOf(scenes[index]);state.matched=false;state.selected=null;refresh();$('.verse-choice').focus({preventScroll:true});}
      if(button.id==='next')changeScene((index+1)%scenes.length);
      if(button.id==='save')save();
    };
    refresh();
  }
  function wrap(ctx,text,width){
    let size=25,lines=[];
    do{ctx.font=size+'px "Microsoft YaHei",sans-serif';lines=[''];for(const char of text){if(ctx.measureText(lines.at(-1)+char).width>width)lines.push('');lines[lines.length-1]+=char;}if(lines.length<=4)break;size-=1;}while(size>=14);
    return lines;
  }
  root.ShanyueSceneView={available,markup,mount,art,cleanup};
})(globalThis);
