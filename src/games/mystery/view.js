(function(root){
  let dispose=()=>{};
  const data=JSON.parse(document.querySelector('#mystery-data').textContent);
  const definition=ShanyueMysteryChapter.validate(data);
  const STORAGE='shanyue.mystery.v1';
  let cached=null;
  function snapshot(){if(cached)return JSON.parse(JSON.stringify(cached));try{cached=normalize(JSON.parse(localStorage.getItem(STORAGE)));}catch(e){cached=normalize(null);}return JSON.parse(JSON.stringify(cached));}
  function normalize(raw){return {version:1,chapter:definition.id,state:ShanyueMystery.restore(raw?.state),prefs:{simple:raw?.prefs?.simple===true,paused:false}};}
  function restore(raw){cached=normalize(raw);try{localStorage.setItem(STORAGE,JSON.stringify(cached));}catch(e){} }
  function available(library){return ShanyueMysteryChapter.resolve(definition,library);}
  function markup(library){return available(library)?'<div id="mystery-host"></div>':'<section class="empty"><h1>等诗与画，重新相逢。</h1><p>这一章所用原文发生了变化，先去小集中读一篇吧。</p><a class="btn" href="#explore">去发现文字</a></section>';}
  function cleanup(){dispose();dispose=()=>{};}
  function mount(host,library,callbacks){
  cleanup();const CHAPTER=available(library);if(!CHAPTER||!host)return;
  const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<style>'+'INLINE_MYSTERY_CSS'+'</style>'+'INLINE_MYSTERY_TEMPLATE';
  const controller=new AbortController(),on=(target,type,fn)=>target.addEventListener(type,fn,{signal:controller.signal});
  let alive=true,motion=null,modalScroll=0,modalLocked=false,pendingEffect='',simple=false,paused=false,raining=false;

  'use strict';
  const M=ShanyueMystery,A=ShanyueMysteryArt,$=q=>shadow.querySelector(q);
  const names={key:'铜钥匙',seed:'莲子',frame:'取景框'},esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=M.initial(),selected=null,showSpots=false,modalKind='',modalVersion=0,returnFocus=null,toastTimer,storageWarned=false;
  let frame={x:270,y:250},drag=null;
  const saved=snapshot();state=M.restore(saved.state);simple=saved.prefs.simple||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const animations=new Set();
  function animate(el,frames,options){if(simple||paused||document.hidden||!el?.animate)return;const a=el.animate(frames,{duration:550,easing:'cubic-bezier(.2,.7,.2,1)',...options});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a;}
  function clearMotion(){animations.forEach(a=>a.cancel());animations.clear();}
  on(document,'visibilitychange',()=>{if(document.hidden)clearMotion();});on(reduce,'change',()=>{simple=reduce.matches;setPreferences();});
  function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
  function persist(){try{cached={version:1,chapter:CHAPTER.id,state:M.clone(state),prefs:{simple,paused:false}};localStorage.setItem(STORAGE,JSON.stringify(cached));}catch(e){if(!storageWarned){storageWarned=true;toast('此浏览器暂时不能保存进度，本次仍可继续游玩。');}}}
  function setPreferences(){
    shadow.querySelector('.mystery-main').classList.toggle('motion-still',simple);
    shadow.querySelector('.mystery-main').classList.toggle('motion-paused',paused);
    $('#simple').setAttribute('aria-pressed',String(simple));$('#simple').textContent=simple?'恢复动效':'简化动效';
    $('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'继续画面':'暂停画面';
    if(simple)clearMotion();else animations.forEach(a=>paused?a.pause():a.play());
    motion?.preferences(simple,paused);persist();
  }
  function mountMotion(effect){
    const pond=state.room==='pond';shadow.querySelector('.world').dataset.room=state.room;
    $('#pond-tools').hidden=!pond;$('#reed-handle').hidden=!pond;$('#replay').hidden=!state.finished;
    $('#motion-poem').textContent=CHAPTER.poem.expected.join('\n');$('#motion-poem').style.opacity=pond&&state.finished?'1':'0';
    motion=ShanyueMysteryMotion.mount($('#scene'),state,{simple,paused,effect,poem:v=>{$('#motion-poem').style.opacity=v;$('#motion-poem').style.transform='translateY('+((1-v)*12)+'px)';},clue:()=>{
      if(!state.reedClue){state.reedClue=true;state.notes.push('芦叶后的鱼纹：顺着水声，去找浅泥。');persist();}
      $('#feedback').textContent='芦苇弯向一旁，露出鱼纹：顺着水声，去找浅泥。';
    }});
    motion.weather(raining);motion.suspend($('#mystery-modal').open);setPreferences();
  }
  function flyItem(id){
    const target=$('[data-item="'+id+'"]');if(!target||simple||paused)return;
    const to=target.getBoundingClientRect(),from=$('#scene').getBoundingClientRect(),el=document.createElement('span');
    el.className='fly-item';el.innerHTML=A.icon(id);el.style.left=to.left+'px';el.style.top=to.top+'px';shadow.appendChild(el);
    const a=el.animate([{transform:'translate('+(from.left+from.width*.55-to.left)+'px,'+(from.top+from.height*.5-to.top)+'px) scale(1.3)',opacity:0},{opacity:1,offset:.2},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:750,easing:'cubic-bezier(.2,.7,.3,1)'});
    animations.add(a);a.finished.catch(()=>{}).finally(()=>{el.remove();animations.delete(a);});
  }
  function spots(){
    if(state.room==='court')return [{id:'letter',name:'读一读来信',x:46,y:52,w:18,h:17},{id:'box',name:'看看木匣',x:79,y:58,w:20,h:22},...(!state.stone?[{id:'stone',name:'看看青石',x:19,y:79,w:19,h:16}]:!state.key?[{id:'key',name:'拾起铜钥匙',x:22,y:79,w:10,h:12}]:[])];
    if(state.room==='stream')return [{id:'gate',name:state.water?'看看通水的石渠':'查看错位的石渠',x:51,y:55,w:42,h:45}];
    return [...(state.water&&state.planted?[{id:'lotus',name:'看看新荷尖',x:57,y:59,w:16,h:24}]:[{id:'soil',name:'看看浅泥洼',x:57,y:86,w:18,h:15}]),...(!state.visitor?[{id:'twig',name:'看看芦苇梢',x:82,y:34,w:15,h:17}]:[]),{id:'fish',name:'看看荷叶旁的鱼影',x:25,y:82,w:17,h:12}];
  }
  function render(message){
    clearMotion();motion?.destroy();motion=null;const room=CHAPTER.rooms.find(r=>r.id===state.room);
    $('#rooms').innerHTML=CHAPTER.rooms.map((r,i)=>'<button data-room="'+r.id+'" aria-pressed="'+(r.id===state.room)+'"><span>0'+(i+1)+'</span>'+r.name+'</button>').join('');
    $('#room-name').textContent=room.name;$('#room-caption').textContent=room.caption;
    $('#landscape').innerHTML=A.scene(state.room,state);
    mountMotion(pendingEffect);pendingEffect='';
    $('#hotspots').innerHTML=spots().map(t=>'<button class="spot" data-target="'+t.id+'" aria-label="'+t.name+'" style="left:'+t.x+'%;top:'+t.y+'%;width:'+t.w+'%;height:'+t.h+'%"></button>').join('');
    $('#scene').classList.toggle('show-spots',showSpots);$('#scene').classList.toggle('using',!!selected);
    $('#spots').setAttribute('aria-pressed',String(showSpots));
    const items=M.inventory(state);if(selected&&!items.includes(selected))selected=null;
    $('#inventory').innerHTML=items.map(id=>'<button class="item" data-item="'+id+'" aria-pressed="'+(id===selected)+'" aria-label="选择'+names[id]+'">'+A.icon(id)+'<span>'+names[id]+'</span></button>').join('')+Array.from({length:3-items.length},()=>'<span class="empty-slot" aria-hidden="true">·</span>').join('');
    $('#bag-instruction').textContent=selected?'已选'+names[selected]+' · 再点画中要使用的位置':items.length?'点选物件，再点画中目标':'找到的物件会收在这里';
    $('#progress').innerHTML=[state.key,state.box,state.planted,state.water,state.visitor,state.finished].map((v,i)=>'<span class="'+(v?'done':'')+'" title="'+['拾到钥匙','打开木匣','种下莲子','石渠通水','蜻蜓停落','留住诗景'][i]+'" aria-label="'+['拾到钥匙','打开木匣','种下莲子','石渠通水','蜻蜓停落','留住诗景'][i]+(v?'，已完成':'，未完成')+'"></span>').join('');
    const recent=state.notes.slice(-3),older=state.notes.slice(0,-3);
    $('#notes').innerHTML=state.notes.length?(older.length?'<details><summary class="note">之前的 '+older.length+' 条线索</summary>'+older.map(n=>'<p class="note">'+esc(n)+'</p>').join('')+'</details>':'')+recent.map(n=>'<p class="note">'+esc(n)+'</p>').join(''):'<p class="empty-note">院子很安静。<br>从一封信开始吧。</p>';
    $('#objective').textContent=state.finished?'你找回了，那个小小瞬间':'找回池中的小小瞬间';
    $('#ending').hidden=!state.finished;$('#ending-quote').textContent=CHAPTER.poem.expected.join('\n');$('#ending-source').textContent=source(CHAPTER.poem);
    $('#hint-text').textContent='先给一点方向，再慢慢说清楚。';$('#hint').textContent='借一点灵感 →';
    if(message)$('#feedback').textContent=message;
    persist();
  }
  function source(p){return p.dynasty+' · '+p.author+'《'+p.title+'》';}
  function open(title,html,kind){
    modalVersion++;returnFocus=shadow.activeElement;modalKind=kind;$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;
    if(!$('#mystery-modal').open){modalScroll=window.scrollY;modalLocked=true;document.body.style.position='fixed';document.body.style.top=-modalScroll+'px';document.body.style.width='100%';$('#mystery-modal').showModal();}motion?.suspend(true);$('#close').focus({preventScroll:true});
  }
  function unlock(){if(!modalLocked)return;modalLocked=false;document.body.style.position='';document.body.style.top='';document.body.style.width='';window.scrollTo({top:modalScroll,behavior:'auto'});motion?.suspend(false);}
  function close(){if($('#mystery-modal').open)$('#mystery-modal').close();unlock();}
  on($('#mystery-modal'),'close',()=>{if($('#mystery-modal').open)return;modalVersion++;modalKind='';drag=null;unlock();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else $('#help').focus({preventScroll:true});});
  function handle(target){
    const previous=M.clone(state),result=M.act(state,target,selected);state=result.state;
    if(!previous.water&&state.water||!(previous.water&&previous.planted)&&state.water&&state.planted)pendingEffect='grow';else if(!previous.visitor&&state.visitor)pendingEffect='fly';
    if(result.panel||M.inventory(state).length!==M.inventory(previous).length)selected=null;
    render(result.message);
    if(result.panel)panel(result.panel);
    else{
      const focus=$('[data-target="'+target+'"]')||$('#inventory .item');focus?.focus({preventScroll:true});
      if(JSON.stringify(previous)!==JSON.stringify(state))animate($('#landscape'),[{filter:'brightness(1.1)'},{filter:'brightness(1)'}]);
      if(!previous.stone&&state.stone)animate($('#landscape .stone'),[{transform:'translate(35px,40px)'},{transform:'none'}],{duration:650});
      if(!previous.box&&state.box){
        animate($('#landscape .box-lid'),[{transform:'scaleY(.1)',transformOrigin:'0 35px'},{transform:'scaleY(1)',transformOrigin:'0 35px'}],{duration:700,delay:250,fill:'backwards'});
        const box=$('[data-target="box"]').getBoundingClientRect(),key=document.createElement('span');key.className='fly-item';key.innerHTML=A.icon('key');key.style.left=box.x+box.width/2-25+'px';key.style.top=box.y+box.height/2-25+'px';shadow.appendChild(key);
        const a=animate(key,[{transform:'translateX(-35px) rotate(0)',opacity:1},{transform:'translateX(0) rotate(80deg)',opacity:1,offset:.65},{transform:'rotate(80deg)',opacity:0}],{duration:600});if(a)a.finished.catch(()=>{}).finally(()=>key.remove());else key.remove();
      }
      for(const id of M.inventory(state).filter(id=>!M.inventory(previous).includes(id)))flyItem(id);
    }
  }
  function panel(kind){
    if(kind==='letter')open('一封未署名的信','<div class="letter">'+CHAPTER.letter.map(t=>'<p>'+esc(t)+'</p>').join('')+'</div>','letter');
    if(kind==='help')open('在小院里，慢慢找','<p class="modal-help">这一章有三个相连的地方。信、物件和机关，会把你带向同一个瞬间。</p><ol class="help-list"><li>点画面中的物件观察。想找入口时，点“找找可探索处”。</li><li>找到的物件收进行囊。先点选它，再点画中要使用的地方。</li><li>水渠需要转动连接；取景框可以拖动，也可以用方向按钮。</li><li>卡住时点“借一点灵感”。提示分三层，慢慢展开。</li></ol><p class="modal-help">没有倒计时，也不扣分。进度会自动保存在当前浏览器。</p>','help');
    if(kind==='pipes'){
      open('把水，送回池塘','<p class="modal-help">轻点石渠转动方向。水从左下方进入，沿着连通的渠流向右上方。</p><div id="pipe-board" class="pipe-board"></div><div class="pipe-actions"><button id="test-water" class="primary">放水试试</button><button id="pipe-hint" class="quiet">看看流向提示</button></div><p id="pipe-message" class="pipe-message" role="status" aria-live="polite">每段都可以转动。先顺着水来的方向看看。</p>','pipes');renderPipes(state.water);if(state.water){$('#test-water').textContent='水已经接通';$('#test-water').disabled=true;}
    }
    if(kind==='frame'){
      open('留住这一刻','<p class="modal-help">把小框移到荷尖与蜻蜓身上，让它们一起留在画中。可以拖动，也可以用下方方向键。</p><div class="frame-stage" id="frame-stage">'+A.scene('pond',state)+'<button id="viewfinder" class="viewfinder" aria-label="取景框，使用方向键移动"></button></div><div class="frame-controls"><button data-move="left" aria-label="向左移动">←</button><button data-move="up" aria-label="向上移动">↑</button><button data-move="down" aria-label="向下移动">↓</button><button data-move="right" aria-label="向右移动">→</button><button id="capture" class="primary">留住这一刻</button></div><p id="frame-message" class="frame-message" role="status" aria-live="polite">不急，等它们一起出现在小框里。</p>','frame');positionFrame();
    }
    if(kind==='bonus')open('水下，又遇见一首诗','<p class="eyebrow">一条藏在荷叶旁的小线索</p><div class="reader-lines">'+esc(CHAPTER.bonus.expected.join('\n'))+'</div><p class="reader-source">'+esc(source(CHAPTER.bonus))+'</p><p class="reader-intro">新荷尖上有蜻蜓，荷叶之间有游鱼。同一片池水，也可以走进另一首诗。</p><a class="quiet" href="#work/'+CHAPTER.bonus.workId+'" data-read="'+CHAPTER.bonus.workId+'">到山月读读原作 ↗</a>','bonus');
    if(kind==='read'){close();callbacks.read(CHAPTER.poem.workId);return;}
  }
  let waterShown=false;
  function renderPipes(showWater=false){
    waterShown=showWater;const reached=showWater?M.flow(state.pipes).reached:[];
    $('#pipe-board').innerHTML=Array.from({length:9},(_,cell)=>{
      const i=M.cells.indexOf(cell);if(i<0)return '<div class="pipe-cell rock" aria-hidden="true"></div>';
      const ports=M.ports(i,state.pipes[i]),ends=[[50,0],[100,50],[50,100],[0,50]],d='M'+ends[ports[0]].join(' ')+' L50 50 L'+ends[ports[1]].join(' '),wet=reached.includes(i);
      return '<button class="pipe-cell" data-pipe="'+i+'" aria-label="第'+(i+1)+'段石渠，接口朝'+ports.map(p=>['上','右','下','左'][p]).join('和')+'" '+(state.water?'disabled':'')+'><svg viewBox="0 0 100 100" aria-hidden="true"><path d="'+d+'" fill="none" stroke="#a3b398" stroke-width="27"/><path d="'+d+'" fill="none" stroke="'+(wet?'#64a79e':'#81967e')+'" stroke-width="16"/><path d="'+d+'" fill="none" stroke="'+(wet?'#d5f1dc':'#bdcbb0')+'" stroke-width="2"/></svg></button>';
    }).join('')+'<span class="pipe-in">水从这里来 →</span><span class="pipe-out">↑ 流向池塘</span>';
    if(showWater)reached.forEach((index,order)=>{const path=$('[data-pipe="'+index+'"] svg path:nth-child(2)'),length=path.getTotalLength();animate(path,[{strokeDasharray:String(length),strokeDashoffset:String(length)},{strokeDasharray:String(length),strokeDashoffset:'0'}],{duration:300,delay:order*170,fill:'backwards'});});
  }
  function testWater(){
    const flow=M.flow(state.pipes);if(flow.solved){state.water=true;pendingEffect='grow';if(!state.notes.includes('水渠接通，清水已经流向池心。'))state.notes.push('水渠接通，清水已经流向池心。');persist();render('水声重新响起。去池心看看，那里会有什么变化。');renderPipes(true);$('#test-water').disabled=true;$('#test-water').textContent='水已经接通';$('#pipe-message').innerHTML='清水到了。<button id="go-pond" class="quiet">去池心看看 →</button>';animate($('#pipe-board'),[{filter:'brightness(1.15)'},{filter:'brightness(1)'}]);}
    else{renderPipes(true);$('#pipe-message').textContent=flow.reached.length?'水走了 '+flow.reached.length+' 段，在下一处断开了。看看浅蓝色的尽头。':'水还没进来。先看看左下角第一段的接口。';}
  }
  function aligned(){return [[562,301],[570,385]].every(([x,y])=>Math.abs(x-frame.x)<155&&Math.abs(y-frame.y)<112);}
  function positionFrame(){const el=$('#viewfinder');if(!el)return;frame.x=Math.max(180,Math.min(820,frame.x));frame.y=Math.max(135,Math.min(465,frame.y));el.style.left=frame.x/10+'%';el.style.top=frame.y/6+'%';el.classList.toggle('aligned',aligned());$('#frame-message').textContent=aligned()?'荷尖与蜻蜓都在框里了，可以留住这一刻。':'不急，等它们一起出现在小框里。';}
  function moveFrame(direction){const delta={left:[-35,0],right:[35,0],up:[0,-35],down:[0,35]}[direction];if(!delta)return;frame.x+=delta[0];frame.y+=delta[1];positionFrame();}
  function capture(){
    if(!state.visitor)return;
    if(![[562,301],[570,385]].every(([x,y])=>Math.abs(x-frame.x)<155&&Math.abs(y-frame.y)<112)){$('#frame-message').textContent='再挪一挪，让蜻蜓和新荷尖都完整地留在框里。';return;}
    state.finished=true;pendingEffect='reveal';state.capture={...frame};if(!state.notes.includes('那个小小瞬间，原来藏着杨万里的《小池》。'))state.notes.push('那个小小瞬间，原来藏着杨万里的《小池》。');persist();render('那位看荷的人，也曾这样停下来。你找到这首诗了。');
    open('诗，原来在这里','<div class="ending-intro"><span>相逢</span><blockquote>'+esc(CHAPTER.poem.expected.join('\n'))+'</blockquote><p>'+esc(source(CHAPTER.poem))+'</p><p>找、种、引水、等它停下。<br>这一回，是你让诗里的瞬间发生了。</p></div><div class="ending-actions"><button id="save-modal" class="primary">留下这幅诗景</button><button id="read-modal" class="quiet">读读原作 ↗</button><button id="continue" class="quiet">回小院再逛逛</button></div>','ending');
  }
  async function save(){
    if(!state.finished)return;
    open('留一张诗景','<p class="modal-help">正在把荷塘与诗句收进画里……</p>','saving');const version=modalVersion;
    try{
      const raw=A.scene('pond',state).replace('<svg ','<svg width="1000" height="600" '),url=URL.createObjectURL(new Blob([raw],{type:'image/svg+xml'})),img=new Image();
      try{img.src=url;await img.decode();}finally{URL.revokeObjectURL(url);}
      if(!alive||version!==modalVersion||!$('#mystery-modal').open)return;
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas');
      const crop=state.capture||{x:560,y:380};
      ctx.fillStyle='#f3f0e3';ctx.fillRect(0,0,1080,1440);ctx.drawImage(img,crop.x-180,crop.y-135,360,270,54,64,972,729);
      ctx.fillStyle='#819476';ctx.font='24px "Microsoft YaHei",sans-serif';ctx.fillText('山月 · 诗境解谜 / 荷塘来信',80,852);
      ctx.fillStyle='#315a48';ctx.font='54px "Songti SC","SimSun",serif';CHAPTER.poem.expected.forEach((t,i)=>ctx.fillText(t,80,938+i*98));
      ctx.fillStyle='#6b8067';let bylines=[],size=26;
      do{ctx.font=size+'px "Microsoft YaHei",sans-serif';bylines=[''];for(const char of source(CHAPTER.poem)){if(ctx.measureText(bylines.at(-1)+char).width>920)bylines.push('');bylines[bylines.length-1]+=char;}if(bylines.length<=4)break;size-=2;}while(size>=14);
      bylines.forEach((line,i)=>ctx.fillText(line,80,1136+i*30));
      ctx.strokeStyle='#cbd3ba';ctx.beginPath();ctx.moveTo(80,1285);ctx.lineTo(1000,1285);ctx.stroke();ctx.font='26px "Songti SC","SimSun",serif';ctx.fillText('我在一座小院里，找回了一个夏天。',80,1351);
      const png=canvas.toDataURL('image/png');$('#modal-body').innerHTML='<img class="poster" src="'+png+'" alt="荷塘来信诗景卡：'+esc(CHAPTER.poem.expected.join(''))+'"><p class="modal-help">手机可长按图片保存，或下载 PNG。</p><a class="primary download" download="山月-荷塘来信.png" href="'+png+'">保存诗景卡</a>';modalKind='poster';
    }catch(e){if(alive&&version===modalVersion)$('#modal-body').innerHTML='<p>图片暂时没有生成。请关闭后再试，进度仍然保留。</p>';}
  }
  on(shadow,'click',event=>{
    const read=event.target.closest('[data-read]');if(read){event.preventDefault();close();callbacks.read(read.dataset.read);return;}
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.room){state.room=button.dataset.room;render(CHAPTER.rooms.find(r=>r.id===state.room).caption);$('[data-room="'+state.room+'"]').focus({preventScroll:true});return;}
    if(button.dataset.target){handle(button.dataset.target);return;}
    if(button.dataset.item){selected=selected===button.dataset.item?null:button.dataset.item;render(selected?'选好了'+names[selected]+'，再点画中要使用的位置。':'暂时把它收回行囊。');$('[data-item="'+button.dataset.item+'"]')?.focus({preventScroll:true});return;}
    if(button.dataset.pipe!==undefined){const i=Number(button.dataset.pipe);state.pipes[i]=(state.pipes[i]+1)%4;persist();renderPipes(waterShown);const tile=$('[data-pipe="'+i+'"]');tile.focus({preventScroll:true});animate(tile.querySelector('svg'),[{transform:'rotate(-90deg)'},{transform:'rotate(0)'}],{duration:230});return;}
    if(button.dataset.move){moveFrame(button.dataset.move);return;}
    switch(button.id){
      case 'simple':simple=!simple;setPreferences();break;
      case 'pause':paused=!paused;setPreferences();break;
      case 'splash':motion?.splash();$('#feedback').textContent='涟漪散开，水下的鱼转身游过来了。';break;
      case 'reeds':motion?.reeds();break;
      case 'lure':if(state.visitor){motion?.lure();$('#feedback').textContent='它又起飞了。轻点画面，引它绕一圈。';}else handle('twig');break;
      case 'rain-toggle':raining=!raining;motion?.weather(raining);button.setAttribute('aria-pressed',String(raining));break;
      case 'replay':if(state.finished)motion?.transition('replay');break;
      case 'help':panel('help');break;
      case 'spots':showSpots=!showSpots;$('#scene').classList.toggle('show-spots',showSpots);button.setAttribute('aria-pressed',String(showSpots));break;
      case 'hint':{const phase=M.phase(state),i=state.hintCounts[phase]||0;$('#hint-text').textContent=CHAPTER.hints[phase][Math.min(i,2)];state.hintCounts[phase]=Math.min(i+1,3);button.textContent=i<2?'再具体一点 →':'这一步的提示已展开';persist();break;}
      case 'close':case 'continue':close();break;
      case 'test-water':testWater();break;
      case 'pipe-hint':$('#pipe-message').textContent='从左下入口向右 → 向上 ↑ 向右 → 向上 ↑，接到右上方的出口。';break;
      case 'go-pond':close();state.room='pond';pendingEffect=state.planted?'grow':'';render(state.planted?'池水回来了，新荷已经露尖。':'池水回来了，浅泥还在等一颗莲子。');break;
      case 'capture':capture();break;
      case 'read':case 'read-modal':panel('read');break;
      case 'save':case 'save-modal':save();break;
      case 'restart':open('重新走进小院','<p class="modal-help">会清空本章的物件、机关和线索，从最初的来信重新开始。</p><button id="confirm-restart" class="primary">重新开始</button><button id="continue" class="quiet" style="margin-left:20px">继续当前探索</button>','restart');break;
      case 'confirm-restart':close();state=M.initial();selected=null;showSpots=false;frame={x:270,y:250};render('先看看院中的信。它像是特意留给你的。');break;
    }
  });
  on($('#mystery-modal'),'keydown',event=>{if(modalKind!=='frame'||event.target.id!=='viewfinder')return;const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[event.key];if(direction){event.preventDefault();moveFrame(direction);}});
  on($('#mystery-modal'),'pointerdown',event=>{if(event.target.id!=='viewfinder'||event.button!==0||!event.isPrimary)return;event.preventDefault();const bounds=$('#frame-stage').getBoundingClientRect();drag={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:frame.x,y:frame.y,bounds};event.target.setPointerCapture(event.pointerId);});
  on($('#mystery-modal'),'pointermove',event=>{if(!drag||event.pointerId!==drag.pointer)return;frame.x=drag.x+(event.clientX-drag.startX)/drag.bounds.width*1000;frame.y=drag.y+(event.clientY-drag.startY)/drag.bounds.height*600;positionFrame();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on($('#mystery-modal'),name,()=>{drag=null;});
  on($('#mystery-modal'),'cancel',event=>{event.preventDefault();close();});
  dispose=()=>{alive=false;modalVersion++;close();controller.abort();motion?.destroy();clearMotion();clearTimeout(toastTimer);};
  render(state.finished?'欢迎回来，这座小院还留着你找到的诗。':state.notes.length?'欢迎回来。物件与线索都还在，可以接着探索。':undefined);
  }
  root.ShanyueMysteryView={available,markup,mount,cleanup,snapshot,restore,art:()=>ShanyueMysteryArt.scene('pond',{water:true,planted:true,visitor:true})};
})(globalThis);
