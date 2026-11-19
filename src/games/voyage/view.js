(function(root){
'use strict';
const M=ShanyueVoyage,Art=ShanyueVoyageArt,chapter=JSON.parse(document.querySelector('#voyage-data').textContent);
const KEY='shanyue.voyage.v1';let cached=null,dispose=()=>{};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function snapshot(){if(!cached){try{cached=M.snapshot(JSON.parse(localStorage.getItem(KEY)));}catch(e){cached=M.snapshot(null);}}return structuredClone(cached);}
function restore(raw){cached=M.snapshot(raw);try{localStorage.setItem(KEY,JSON.stringify(cached));}catch(e){}}
function cleanup(){dispose();dispose=()=>{};}
function markup(){return '<div id="voyage-host"></div>';}
function mount(host,library,callbacks){
  cleanup();if(!host)return;
  const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<style>'+'INLINE_VOYAGE_CSS'+'</style>'+'INLINE_VOYAGE_TEMPLATE';
  const $=s=>shadow.querySelector(s),$$=s=>[...shadow.querySelectorAll(s)],controller=new AbortController();
  const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:controller.signal});
  const saved=snapshot(),routes=M.compatible(library,chapter),available=new Set(routes.map(r=>r.id));
  let state=saved.state,history=saved.history,journal=saved.journal,still=saved.prefs.still||matchMedia('(prefers-reduced-motion: reduce)').matches,sound=saved.prefs.sound;
  const contentChanged=!!state.route&&!available.has(state.route);
  if(contentChanged){state=M.initial();history=[];}
  history=history.filter(s=>!s.route||available.has(s.route));
  let alive=true,busy=false,audio=null,posterUrl=null,posterRequest=0,returnFocus=null,offscreen=false;
  const dialog=$('#voyage-dialog'),scene=$('#scene'),view=$('.voyage');
  $('#landscape').innerHTML=Art.scene();const svg=$('.pond-art');
  function hotspots(){
    const matrix=svg.getScreenCTM();if(!matrix)return;const r=scene.getBoundingClientRect();
    $$('.hotspot').forEach(b=>{const p=svg.createSVGPoint();p.x=Number(b.dataset.x);p.y=Number(b.dataset.y);const q=p.matrixTransform(matrix);b.style.left=(q.x-r.left)+'px';b.style.top=(q.y-r.top)+'px';});
  }
  const motion=ShanyueVoyageMotion.mount(svg,{onFrame:hotspots});
  const route=()=>chapter.routes.find(r=>r.id===state.route);
  function persist(){cached=M.snapshot({state,history,journal,prefs:{still,sound}});try{localStorage.setItem(KEY,JSON.stringify(cached));}catch(e){$('#storage-note').hidden=false;}}
  function status(text){$('#feedback').textContent=text;}
  function soundCue(){
    if(!sound||document.hidden)return;
    try{
      audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
      const buffer=audio.createBuffer(1,audio.sampleRate*.32,audio.sampleRate),channel=buffer.getChannelData(0);
      for(let i=0;i<channel.length;i++)channel[i]=(Math.random()*2-1)*Math.pow(1-i/channel.length,2);
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=700;gain.gain.value=.14;source.connect(filter).connect(gain).connect(audio.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }catch(e){sound=false;updateTools();status('当前浏览器暂时无法播放水声，仍可继续游玩。');}
  }
  function updateTools(){
    view.classList.toggle('still',still);$('#pause').setAttribute('aria-pressed',String(still));$('#pause').textContent=still?'动':'静';$('#pause').setAttribute('aria-label',still?'让画面动起来':'静止画面');
    $('#sound').setAttribute('aria-pressed',String(sound));$('#sound').textContent=sound?'水声开':'水声';$('#sound').setAttribute('aria-label',sound?'关闭水声':'打开水声');motion.reduced(still);
  }
  function visibility(){const paused=document.hidden||dialog.open||offscreen;motion.suspend(paused);view.classList.toggle('sleeping',paused);if(paused&&audio?.state==='running')audio.suspend().catch(()=>{});}
  function segments(kind,values,labels,value){return '<div class="segments" role="group" aria-label="'+(kind==='flow'?'水流大小':'浮叶方向')+'">'+values.map((v,i)=>`<button data-action="${kind}" data-value="${v}" aria-pressed="${v===value}">${labels[i]}</button>`).join('')+'</div>';}
  function flowControl(){return '<div class="control-label"><span>水流</span><small>先看水的去向，再放小舟</small></div>'+segments('flow',[0,1,2,3],['停水','缓流','轻推','急流'],state.flow);}
  const sail=label=>`<button class="primary" data-action="sail">${label}<span aria-hidden="true">→</span></button>`;
  function hotspot(action,x,y,label,value='',symbol='↗',routeStyle=false){return `<button class="hotspot${routeStyle?' route-hotspot':''}" data-action="${action}" data-value="${value}" data-x="${x}" data-y="${y}" aria-label="${label}">${routeStyle?esc(label):'<b aria-hidden="true">'+symbol+'</b><span>'+esc(label)+'</span>'}</button>`;}
  function render(focus=false){
    const active=shadow.activeElement,focusedControl=active?.closest('#controls button');
    const focusAction=focusedControl?.dataset.action,focusValue=focusedControl?.dataset.value;
    const r=route(),stage=state.stage;
    const texts={inlet:['一 · 水口','借一点水，送它一程。','一片浮叶挡住了纸舟。轻开水口，看看水会把它带向哪里。','水正轻轻流过，纸舟却停了下来。'],fork:['二 · 岔口','这一次，想往哪边？','左边竹影摇曳，右边荷叶田田。两条路，都藏着一句诗。','小舟在岔口停下，等你选一处风景。'],bend:['三 · 转弯','借一片叶，转一个弯。','水线指向小舟的去处。转动浮叶，再调水流，让它绕过浅石。',r?.name+' · 看水线，找一条通路。'],landing:['四 · 靠岸',state.route==='bamboo'?'让蜻蜓，停一会儿。':'荷叶下，藏着什么？',state.route==='bamboo'?'水声慢下来时，蜻蜓才愿意靠近。缓一缓水，再轻触荷尖。':'水流太快，鱼儿会躲起来。缓一缓水，再轻点荷叶间的水面。',state.route==='bamboo'?'荷尖才露，等一位小小的来客。':'水下有一道影子，正穿过荷叶。'],done:['拾得 · '+r?.discovery,state.route==='bamboo'?'原来，诗就在这里。':'游进了，一句旧诗。',state.method==='inside'?'你沿着缓缓的水，绕过了浅岸。':'你借一片叶，把小舟送过了弯道。',r?.name+' · '+(state.method==='inside'?'顺岸缓行':'借叶绕行')]};
    const t=texts[stage];$('#chapter-label').textContent=t[0];$('#task-title').textContent=t[1];$('#task-description').textContent=t[2];$('#scene-caption').textContent=t[3];
    let controls='',spots='';
    if(!routes.length){controls='<p class="feedback">这处荷塘的原诗暂时不在当前小集中。恢复《小池》或《江南》后，就能来放一只小舟。</p><a class="secondary" href="#explore">去发现文字</a>';}
    else if(stage==='inlet'){controls=flowControl()+sail('轻开水口');spots=hotspot('sail',446,192,'轻开水口','','≈');}
    else if(stage==='fork'){
      controls='<div class="route-choices">'+chapter.routes.map(r=>`<button class="route-choice" data-action="route" data-value="${r.id}" ${available.has(r.id)?'':'disabled'}><strong>${esc(r.name)}</strong><small>${available.has(r.id)?esc(r.invitation):'原诗暂未收录'}</small><span aria-hidden="true">↗</span></button>`).join('')+'</div>';
      spots=chapter.routes.filter(r=>available.has(r.id)).map(r=>hotspot('route',r.id==='bamboo'?265:652,515,r.name,r.id,'',true)).join('');
    }else if(stage==='bend'){
      controls='<div class="control-label"><span>浮叶方向</span><small>也可以轻划画面中的浮叶</small></div>'+segments('leaf',[-1,0,1],['↖ 向左','横着','向右 ↗'],state.leaf)+flowControl()+sail('放舟，试试这条水路');
      spots=hotspot('turn',state.route==='bamboo'?254:686,620,'转动浮叶','','↻');
    }else if(stage==='landing'){
      controls=flowControl()+`<button class="primary" data-action="discover">${state.route==='bamboo'?'轻触荷尖':'轻点水面'}<span aria-hidden="true">✧</span></button>`;
      spots=hotspot('discover',state.route==='bamboo'?305:699,state.route==='bamboo'?711:845,state.route==='bamboo'?'轻触荷尖':'轻点水面','','✧');
    }else{
      const w=library.works.find(w=>w.id===r.work),a=library.authors[w.author];
      controls=`<div class="poem">${r.lines.map(i=>esc(w.lines[i])).join('<br>')}<small>${esc(a.name)} ·《${esc(w.title)}》</small></div><button class="primary" data-action="poster">把此刻收成诗笺<span aria-hidden="true">↗</span></button><div class="finish-actions"><button class="secondary" data-action="read">读一读原诗</button><button class="secondary" data-action="fork">回岔口，走另一边</button></div>`;
    }
    $('#controls').innerHTML=controls;$('#scene-controls').innerHTML=spots;$('#scene-controls').dataset.busy=String(busy);
    $$('#controls button').forEach(b=>{if(busy)b.disabled=true;});$('#undo').disabled=busy||!history.length;$('#hint').hidden=stage==='done';$('#journal-count').textContent=journal.length;
    motion.state(state);hotspots();if(focus)$('#task-title').focus({preventScroll:true});
    else if(focusAction&&!busy){const next=$$('#controls button').find(b=>b.dataset.action===focusAction&&b.dataset.value===focusValue&&!b.disabled);next?.focus({preventScroll:true});}
  }
  const feedback={still:'水口关着呢。给它一点缓流，小舟才会动起来。',rush:'水太急，小舟被推回了浅岸。缓一点，再试一次。',blocked:'水线碰上了浅石。换一下叶片的方向，或调小水流。',restless:'水还在催着它走。调成缓流或停水，让这片荷塘静下来。',release:'叶片让开了，小舟正顺水驶向岔口。',branch:'先看看水线会去哪里，再让小舟出发。',arrive:'过来了。水边还有一点小动静，走近看看。',discover:'这一程已经收进「我的拾景」。',return:'另一边的风景，还在等你。'};
  function perform(action,keyboard=false){
    if(busy)return;
    if(action.type==='route'&&!available.has(action.value))return;
    const previous=state,result=M.act(state,action);if(result.effect==='none')return;
    const changed=JSON.stringify(result.state)!==JSON.stringify(state);
    if(changed){history.push({...state});history=history.slice(-20);state=result.state;}
    if(result.effect==='discover'&&!journal.some(j=>j.route===state.route&&j.method===state.method))journal.push({route:state.route,method:state.method});
    persist();soundCue();
    if(result.effect==='adjust'){
      render();const p=M.preview(state);status(state.stage==='bend'?p==='inside'?'水线沿着浅岸，留出了一条窄窄的路。':p==='outside'?'水线绕到外侧，可以借叶片转过弯。':p==='still'?'水停了。浮叶可以慢慢调。':p==='rush'?'水线冲向浅岸，试着缓一缓。':'水线还对着浅石，试试别的方向。':'');return;
    }
    busy=true;render();status(feedback[result.effect]||'');
    motion.animate(result.effect,previous,state,()=>{if(!alive)return;busy=false;render(keyboard);if(result.effect==='discover')motion.ripple(state.route==='bamboo'?310:700,820);});
  }
  function openDialog(title,body){
    posterRequest++;if(posterUrl){URL.revokeObjectURL(posterUrl);posterUrl=null;}
    if(!dialog.open)returnFocus=shadow.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;
    if(!dialog.open)dialog.showModal();visibility();
  }
  function help(){openDialog('让好奇心，带一会儿路。','<p>轻开水口 → 选择一岸 → 转叶引水 → 靠岸拾诗。</p><p>画面里发光的地方都可以碰。水线会预告去向：浅金色是通路，赭色表示可能碰上浅岸。</p><p>缓流沿岸走；轻推时，用反向的浮叶借力绕行。同一岸，也有两种走法。方向和水流，先调哪一个都可以。</p><p>不必拖得很准：底部按钮和键盘也能完成全部操作。可以随时撤回、离开，进度会自动保存在这台设备。</p><p class="small-note">荷塘是为游玩创作的诗意场景，并非诗人的真实经历。水声默认关闭；点「静」可以暂停画面。</p>');}
  function showJournal(){openDialog('这一园，拾得的风景',journal.length?journal.map(j=>{const r=chapter.routes.find(r=>r.id===j.route);return '<div class="journal-row"><strong>'+esc(r.discovery)+'</strong><p>'+esc(r.name)+' · '+(j.method==='inside'?'顺岸缓行':'借叶绕行')+'</p><p class="small-note">'+r.expected.map(esc).join('')+'</p></div>';}).join('')+'<p class="small-note">风景留在当前设备，也会随个人备份一同导出。</p>':'<p>还没有收下的风景。放一只小舟，去遇见第一句诗吧。</p>');}
  async function makePoster(){
    if(state.stage!=='done')return;
    const r=route(),w=library.works.find(w=>w.id===r.work),a=library.authors[w.author];
    openDialog('把这一程，留在身边。','<div class="poster-settings"><button class="secondary" data-frame="near" aria-pressed="true">靠近此刻</button><button class="secondary" data-frame="wide" aria-pressed="false">展开两岸</button></div><p id="poster-loading" role="status">正在装裱这片风景…</p><div id="poster-preview"></div><div id="poster-actions" class="poster-actions"></div><p class="small-note">高清诗笺 · 1080 × 1440。手机可长按图片保存，再发给朋友。</p>');
    async function generate(framing){
      const ticket=++posterRequest;$('#poster-loading').hidden=false;$('#poster-loading').textContent='正在装裱这片风景…';$('#poster-actions').replaceChildren();
      $$('#dialog-body [data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.frame===framing)));
      const clone=svg.cloneNode(true);clone.setAttribute('width','1080');clone.setAttribute('height','980');clone.setAttribute('preserveAspectRatio','xMidYMid slice');clone.setAttribute('viewBox',framing==='wide'?'0 0 900 1000':state.route==='bamboo'?'20 445 470 522':'430 445 470 522');
      clone.querySelector('.touch-rings').remove();clone.querySelector('.preview-current').remove();clone.querySelector('.steering-leaf').remove();
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',Art.paths[state.route]+Art.paths[state.route+(state.method==='inside'?'Inside':'Outside')]);path.setAttribute('fill','none');path.setAttribute('stroke','#fff2c4');path.setAttribute('stroke-width','2');path.setAttribute('stroke-dasharray','4 10');path.setAttribute('opacity','.65');clone.querySelector('.current-lines').after(path);
      const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
      try{
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});if(!alive||ticket!==posterRequest||!dialog.open)return;
        const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');
        ctx.fillStyle='#f8f2df';ctx.fillRect(0,0,1080,1440);ctx.drawImage(img,0,0,1080,980);
        const shade=ctx.createLinearGradient(0,0,0,270);shade.addColorStop(0,'#f8f0d6dd');shade.addColorStop(1,'#f8f0d600');ctx.fillStyle=shade;ctx.fillRect(0,0,1080,270);
        ctx.fillStyle='#244d40';ctx.font='30px serif';ctx.fillText('山月  /  荷塘来信',70,84);ctx.font='58px serif';ctx.fillText(r.discovery,70,163);
        ctx.fillStyle='#778269';ctx.font='24px sans-serif';ctx.fillText(r.name+'  ·  '+(state.method==='inside'?'顺岸缓行':'借叶绕行'),70,1043);
        ctx.fillStyle='#274d3e';ctx.font='49px serif';r.lines.forEach((n,i)=>ctx.fillText(w.lines[n],70,1144+i*80));
        ctx.fillStyle='#7a806c';ctx.font='25px serif';ctx.fillText(a.name+' ·《'+w.title+'》',72,1294);
        ctx.strokeStyle='#d5d7bf';ctx.beginPath();ctx.moveTo(70,1340);ctx.lineTo(1010,1340);ctx.stroke();ctx.font='22px serif';ctx.fillText('不赶路，也会遇见。',70,1390);ctx.textAlign='right';ctx.font='20px sans-serif';ctx.fillText('climbrey.github.io',1010,1390);
        const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw Error('export');if(!alive||ticket!==posterRequest||!dialog.open)return;
        if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl=URL.createObjectURL(png);
        $('#poster-loading').hidden=true;$('#poster-preview').innerHTML='<img alt="'+esc(r.name+' · '+r.expected.join(''))+'" src="'+posterUrl+'">';
        const link=document.createElement('a');link.className='primary';link.href=posterUrl;link.download='山月-'+r.discovery+'.png';link.textContent='保存高清诗笺';$('#poster-actions').append(link);
        const file=new File([png],link.download,{type:'image/png'});if(navigator.canShare?.({files:[file]})){const b=document.createElement('button');b.className='secondary';b.textContent='分享';b.onclick=async()=>{try{await navigator.share({files:[file],title:'山月 · '+r.discovery});}catch(e){if(e.name!=='AbortError'&&alive&&ticket===posterRequest){$('#poster-loading').hidden=false;$('#poster-loading').textContent='可以长按图片保存后分享。';}}};$('#poster-actions').append(b);}
      }catch(e){if(alive&&ticket===posterRequest){$('#poster-loading').hidden=false;$('#poster-loading').textContent='这次没有装裱成功，请切换构图再试一次。';}}finally{URL.revokeObjectURL(url);}
    }
    $$('#dialog-body [data-frame]').forEach(b=>b.onclick=()=>generate(b.dataset.frame));await generate('near');
  }
  on(shadow,'click',e=>{
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;
    if(action==='poster'){makePoster();return;}if(action==='read'){callbacks.read(route().work);return;}
    if(action==='turn'){perform({type:'leaf',value:state.leaf===1?-1:state.leaf+1},e.detail===0);return;}
    perform({type:action,value:['flow','leaf'].includes(action)?Number(b.dataset.value):b.dataset.value},e.detail===0);
  });
  let drag=null,suppressClick=false;
  on($('#scene-controls'),'pointerdown',e=>{if(e.target.closest('[data-action="turn"]')&&!busy){drag={x:e.clientX,id:e.pointerId};e.target.closest('button').setPointerCapture(e.pointerId);}});
  on($('#scene-controls'),'pointerup',e=>{if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.x;drag=null;if(Math.abs(dx)>18){suppressClick=true;perform({type:'leaf',value:dx>0?1:-1});}}});
  on($('#scene-controls'),'click',e=>{if(suppressClick){suppressClick=false;e.stopPropagation();e.preventDefault();}},{capture:true});
  on($('#scene-controls'),'pointercancel',()=>{drag=null;suppressClick=false;});
  on(scene,'pointerdown',e=>{if(e.target.closest('button'))return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());motion.ripple(q.x,q.y);soundCue();});
  on($('#undo'),'click',()=>{if(busy||!history.length)return;state=history.pop();persist();render();motion.settle();status('小舟回到了上一步。');});
  on($('#hint'),'click',()=>{status(state.stage==='inlet'?'先试试「缓流」或「轻推」，再打开水口。':state.stage==='fork'?'两边都能到达。选一岸，另一岸稍后还可以回来。':state.stage==='bend'?route().hint:'把水流调成「缓流」或「停水」，再碰一碰画面里发光的地方。');});
  on($('#help'),'click',help);on($('#journal'),'click',showJournal);
  on($('#pause'),'click',()=>{still=!still;updateTools();persist();});on($('#sound'),'click',()=>{sound=!sound;updateTools();soundCue();persist();});
  on($('#close'),'click',()=>dialog.close());on(dialog,'close',()=>{posterRequest++;if(posterUrl){URL.revokeObjectURL(posterUrl);posterUrl=null;}visibility();if(returnFocus?.isConnected&&!returnFocus.disabled)returnFocus.focus({preventScroll:true});});
  on(dialog,'click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  on(document,'visibilitychange',visibility);on(window,'resize',hotspots);
  const observer=new IntersectionObserver(entries=>{offscreen=!entries[0].isIntersecting;visibility();},{threshold:0});observer.observe(scene);
  const media=matchMedia('(prefers-reduced-motion: reduce)');on(media,'change',()=>{if(media.matches){still=true;updateTools();persist();}});
  updateTools();render();motion.settle();hotspots();visibility();
  if(contentChanged){persist();status('上次水道引用的原诗或作者已更新。这次从水口重新出发，仍可选择可用的另一岸。');}
  dispose=()=>{alive=false;posterRequest++;controller.abort();observer.disconnect();motion.destroy();if(dialog.open)dialog.close();if(audio)audio.close().catch(()=>{});if(posterUrl)URL.revokeObjectURL(posterUrl);};
}
root.ShanyueVoyageView={markup,mount,cleanup,snapshot,restore,art:()=>ShanyueVoyageArt.scene('voyage-lobby')};
})(globalThis);
