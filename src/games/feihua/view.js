(function(root){
'use strict';
const M=ShanyueFeihua,settings=M.config(JSON.parse(document.querySelector('#feihua-data').textContent));
const STORAGE='shanyue.feihua.v1';let cached=null,dispose=()=>{};
const normalizeSnapshot=raw=>({version:1,state:M.sanitize(raw?.state,settings),prefs:{still:raw?.prefs?.still===true}});
function snapshot(){if(!cached){try{cached=normalizeSnapshot(JSON.parse(localStorage.getItem(STORAGE)));}catch(e){cached=normalizeSnapshot(null);}}return JSON.parse(JSON.stringify(cached));}
function restore(raw){cached=normalizeSnapshot(raw);try{localStorage.setItem(STORAGE,JSON.stringify(cached));}catch(e){}}
function isAvailable(library){const pool=M.collect(library,settings);return settings.words.some(w=>pool.filter(l=>l.text.includes(w.char)).length>=2);}
function markup(library){return isAvailable(library)?'<div id="feihua-host"></div>':'<section class="empty"><h1>等诗句，再来相逢。</h1><p>当前小集里还没有足够的五言、七言诗句，先读一篇喜欢的作品吧。</p><a class="btn" href="#explore">去发现文字</a></section>';}
function cleanup(){dispose();dispose=()=>{};}
function mount(host,library,callbacks){
cleanup();if(!host||!isAvailable(library))return;
const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<style>'+'INLINE_FEIHUA_CSS'+'</style>'+'INLINE_FEIHUA_TEMPLATE';
const $=s=>shadow.querySelector(s),$$=s=>[...shadow.querySelectorAll(s)],view=$('.feihua-main');
const controller=new AbortController(),on=(target,type,fn)=>target.addEventListener(type,fn,{signal:controller.signal});
let alive=true,offscreen=false,storageWarned=false;
const timers=new Set(),later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(alive)fn();},ms);timers.add(id);return id;};
const data={lines:M.collect(library,settings),words:settings.words.map(w=>w.char),works:Object.fromEntries(library.works.map(w=>[w.id,{...w,author:library.authors[w.author].name,dynasty:library.authors[w.author].dynasty}]))};
const saved=snapshot(),restored=M.restore(saved.state,data.lines,settings);let game=restored.state;
const byId=new Map(data.lines.map(l=>[l.id,l]));
const viable=new Set(settings.words.filter(w=>data.lines.filter(l=>l.text.includes(w.char)).length>=2).map(w=>w.char));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=M.normalize;
const index=new Map(data.lines.map(l=>[l.text,l]));
const captions=Object.fromEntries(settings.words.map(w=>[w.char,w.caption]));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let word=game.word,entries=[],used=new Set(),rounds=0,phase='ready',hintLine=null,hintLevel=0,borrowed=null,version=0,composing=false;
let still=saved.prefs.still||reduced.matches,posterUrl=null,returnFocus=null,lockedScroll=0,dialogLocked=false;
const modal=$('#feihua-modal'),input=$('#verse-input'),scene=$('.garden');
$('#landscape').innerHTML=ShanyueFeihuaArt.scene();
$('.themes').innerHTML=data.words.filter(w=>viable.has(w)).map(w=>`<button class="theme" data-word="${w}" aria-label="以${w}为令" aria-pressed="${w===word}">${w}<small>${escape(captions[w].slice(0,2))}</small></button>`).join('');
$('#buds').innerHTML=Array.from({length:6},()=>'<i aria-hidden="true"></i>').join('');
function available(){return M.available(data.lines,game);}
function persist(){cached={version:1,state:game,prefs:{still}};try{localStorage.setItem(STORAGE,JSON.stringify(cached));}catch(e){if(!storageWarned){storageWarned=true;const note=document.createElement('p');note.id='storage-note';note.textContent='此浏览器暂时不能保存进度，本次仍可继续游玩。可从设置导出个人备份。';$('.conversation').append(note);}}}
function moving(){return !still&&!document.hidden&&!modal.open&&!offscreen;}
function setMotion(value){still=value;view.classList.toggle('still',still);view.classList.toggle('motion-opt-in',!still);$('#motion').textContent=still?'让画面动起来':'静止画面';$('#motion').setAttribute('aria-pressed',String(still));persist();}
function visibility(){view.classList.toggle('sleeping',document.hidden||modal.open||offscreen);}
function feedback(message){$('#feedback').textContent=message;input.removeAttribute('aria-invalid');}
function update(){
  $('#word').textContent=word;$$('.current-word').forEach(e=>e.textContent=word);
  $$('.theme').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.word===word)));
  $('#garden-caption').textContent=captions[word];
  $('#round-label').textContent=rounds?`已往来 ${rounds} 次`:'等第一句诗';
  $('#garden-note').textContent=rounds>=6?'这些花，是我们一起开的。':rounds?'每次往来，都开出一点风景。':'轻点水面，也有回响。';
  $$('#buds i').forEach((el,i)=>el.classList.toggle('open',i<Math.min(rounds,6)));
  $$('.blossom').forEach((el,i)=>el.classList.toggle('open',i<Math.min(rounds,6)));
  $('#buds').setAttribute('aria-label',`已完成${rounds}次往来`);
  $('#welcome').hidden=entries.length>0;
  $('#finish').hidden=!rounds;
  $('#finish').disabled=phase==='waiting';
  $('#composer').hidden=phase==='rest';
  $('#rest-panel').hidden=phase!=='rest';
  $('#send').disabled=phase!=='ready';input.disabled=phase!=='ready';$('#hint').disabled=phase!=='ready';
  $('#turn-label').textContent=phase==='waiting'?'山月接住了，正送来下一句…':phase==='rest'?'这一场相逢，留在诗里。':entries.length?'轮到你了，慢慢想。':'山月在这里，等你一句';
  scene.classList.toggle('moon-theme',word==='月');scene.classList.toggle('winter-theme',word==='雪');
}
function clearHint(){hintLine=null;hintLevel=0;$('#hint-panel').hidden=true;$('#hint-panel').replaceChildren();}
function openDialog(title,html){
  modal.posterRequest=null;
  if(posterUrl){URL.revokeObjectURL(posterUrl);posterUrl=null;}
  if(!dialogLocked){dialogLocked=true;returnFocus=shadow.activeElement||document.activeElement;lockedScroll=window.scrollY;document.body.style.position='fixed';document.body.style.top=`-${lockedScroll}px`;document.body.style.width='100%';}
  $('#modal-title').textContent=title;$('#modal-body').innerHTML=html;
  if(!modal.open)modal.showModal();visibility();
}
function closeDialog(){modal.close();}
on(modal,'close',unlock);
function unlock(){
  if(modal.open||!dialogLocked)return;
  modal.posterRequest=null;
  dialogLocked=false;
  document.body.style.position='';document.body.style.top='';document.body.style.width='';window.scrollTo(0,lockedScroll);
  if(posterUrl){URL.revokeObjectURL(posterUrl);posterUrl=null;}
  visibility();if(alive&&returnFocus?.isConnected&&!returnFocus.disabled)returnFocus.focus({preventScroll:true});
}
$('#close').onclick=closeDialog;
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function decorate(text){return escape(text).split(word).join(`<mark>${word}</mark>`);}
function append(line,who,isBorrowed=false){
  const entry={...line,who,borrowed:isBorrowed};entries.push(entry);used.add(line.text);
  const article=document.createElement('article');article.className='verse '+who;
  article.innerHTML=`<div class="verse-head"><span>${who==='user'?'你':'山月'}</span><i>${isBorrowed?'借来一缕灵感':who==='host'?'与你相和':''}</i></div><p>${decorate(line.text)}</p><button class="source-link" data-work="${escape(line.workId)}">${escape(line.author)} ·《${escape(line.title)}》 <span aria-hidden="true">↗</span></button>`;
  $('#verses').append(article);$('#verses').scrollTop=$('#verses').scrollHeight;
}
function particles(x,y,petals=false){
  if(!moving())return;
  const r=scene.getBoundingClientRect(),layer=$('#touch-effects');
  const count=petals?7:2;
  for(let i=0;i<count;i++){
    const el=document.createElement('i');el.className=petals?'fleck':'ripple';
    el.style.left=`${x-r.left}px`;el.style.top=`${y-r.top}px`;
    el.style.setProperty('--dx',`${Math.round(Math.random()*100-50)}px`);el.style.setProperty('--dy',`${45+Math.round(Math.random()*80)}px`);
    el.style.animationDelay=`${i*.06}s`;layer.append(el);el.addEventListener('animationend',()=>el.remove(),{once:true});later(()=>el.remove(),2800);
  }
}
function flowerReaction(){const r=scene.getBoundingClientRect();particles(r.left+r.width*.7,r.top+r.height*.33,true);}
function stopSceneTransition(){scene.classList.remove('sending','replying','bird-flight');}
function start(newWord){
  version++;word=newWord;game=M.initial(word,settings);entries=[];used=new Set();rounds=0;phase='ready';borrowed=null;
  clearHint();feedback('');input.value='';$('#verses').replaceChildren();$('#touch-effects').replaceChildren();stopSceneTransition();persist();update();
}
function chooseWord(newWord){
  if(word===newWord)return;
  if(!entries.length){start(newWord);return;}
  openDialog(`换到“${newWord}”字？`,`<p>换字会开始一场新的接诗。眼前这些相逢，可以先收成一张诗笺。</p><div class="modal-actions"><button class="primary" id="confirm-word">换一个字，重新开始</button>${rounds?'<button class="secondary" id="keep-card">先收成诗笺</button>':''}<button class="text-button" id="keep-playing">留下继续</button></div>`);
  $('#confirm-word').onclick=()=>{closeDialog();start(newWord);};$('#keep-playing').onclick=closeDialog;
  if($('#keep-card'))$('#keep-card').onclick=()=>makePoster();
}
function rest(exhausted=false){
  phase='rest';game.rest=true;persist();clearHint();
  $('#rest-title').textContent=exhausted?'这些诗，先陪你到这里。':'花开得正好。';
  $('#rest-description').textContent=exhausted?`这一字还有的诗句不够再往来一次了。已相逢的 ${entries.length} 句，可以收起来慢慢读。`:`你与山月，已接住 ${entries.length} 句带“${word}”的诗。收成一张诗笺，或再坐一会儿。`;
  $('#continue').hidden=available().length<2;update();
}
function submit(event){
  event.preventDefault();if(composing||phase!=='ready')return;
  const value=normalize(input.value);feedback('');
  if(!value){feedback(`想起一句带“${word}”的诗，就写在这里。也可以借个提示。`);input.focus();return;}
  if(!value.includes(word)){feedback(`这一句里还没有“${word}”。再想一句，或借一点灵感。`);return;}
  if(used.has(value)){feedback('这句我们刚刚相逢过。换一句，让风景再多一点。');return;}
  const line=index.get(value);
  if(!line){
    feedback('这句暂时没在山月的诗集中找到，不代表你记错了。可以换一句，或借个提示。');
    const near=available().find(l=>l.text.length===value.length&&[...l.text].filter((c,i)=>c!==value[i]).length===1);
    if(near){const b=document.createElement('button');b.type='button';b.className='correction';b.textContent=`你想起的是“${near.text}”吗？点此填入`;b.onclick=()=>{input.value=near.text;borrowed=null;feedback('已填入，看看是不是你想起的那句。');input.focus();};$('#feedback').append(b);}
    return;
  }
  if(available().length<2){rest(true);return;}
  const transaction=M.play(game,data.lines,value,borrowed===value);if(transaction.kind!=='ok'){feedback('当前诗集的可用句子发生了变化，请换一个字再试。');return;}game=transaction.state;persist();
  const ticket=version;append(line,'user',borrowed===value);borrowed=null;input.value='';clearHint();phase='waiting';update();
  stopSceneTransition();if(moving())scene.classList.add('sending');
  const waiting=document.createElement('div');waiting.className='replying-label';waiting.textContent='一只小杯，载来下一句…';$('#verses').append(waiting);$('#verses').scrollTop=$('#verses').scrollHeight;
  later(()=>{
    if(ticket!==version)return;
    waiting.remove();const reply=transaction.reply;
    if(!reply){rest(true);return;}
    append(reply,'host');rounds++;phase='ready';stopSceneTransition();
    if(moving())scene.classList.add('replying');
    if(rounds%3===0&&moving())scene.classList.add('bird-flight');
    update();flowerReaction();
    if(rounds>=game.restAt||available().length<2)rest(available().length<2);
    else feedback('');
  },still?180:1050);
}
function newHint(){
  if(phase!=='ready')return;
  const options=available();if(!options.length){rest(true);return;}
  hintLine=options[Math.floor(Math.random()*options.length)];hintLevel=0;renderHint();
}
function renderHint(){
  if(!hintLine)return;
  const text=hintLevel===0?`${hintLine.author}的《${hintLine.title}》里，有一句带“${word}”的诗。`:hintLevel===1?hintLine.text.slice(0,2)+' · '.repeat(hintLine.text.length-2):hintLine.text;
  $('#hint-panel').hidden=false;$('#hint-panel').innerHTML=`<span class="hint-label">借一缕灵感 · ${hintLevel+1} / 3</span><p>${escape(text)}</p><div class="hint-actions"><button id="hint-next">${hintLevel===0?'露出半句':hintLevel===1?'看看整句':'借这句，填入'}</button><button id="hint-other">换个线索</button><button class="close-hint" id="hint-close" aria-label="收起提示">收起</button></div>`;
  $('#hint-next').onclick=()=>{
    if(hintLevel<2){hintLevel++;renderHint();}
    else{input.value=hintLine.text;borrowed=hintLine.text;clearHint();feedback('灵感已经落在纸上，想送出时再轻点“送出”。');input.focus({preventScroll:true});}
  };
  $('#hint-other').onclick=newHint;$('#hint-close').onclick=clearHint;
}
function readWork(id){
  const w=data.works[id];if(!w)return;
  openDialog(w.title,`<p class="poem-meta">${escape(w.dynasty)} · ${escape(w.author)}</p><p>${escape(w.intro)}</p><div class="poem-text">${w.lines.map(escape).join('\n')}</div><button class="read-link" data-read="${escape(w.id)}">读原文与赏析 ↗</button><details class="poem-source"><summary>文字来源</summary>${w.sources.map(s=>`<p>${escape(s)}</p>`).join('')}</details>`);
}
function linesOfText(ctx,text,width){let rows=[],row='';for(const c of text){if(row&&ctx.measureText(row+c).width>width){rows.push(row);row='';}row+=c;}if(row)rows.push(row);return rows;}
async function makePoster(){
  if(!entries.length)return;
  const snapshot=entries.slice(-6).map(e=>({...e})),snapshotCount=entries.length,snapshotRounds=rounds,currentWord=word,requestVersion=version;
  openDialog('把这一场相逢收起来','<p role="status">正在把诗句写进画面…</p>');
  const requestId=Symbol();modal.posterRequest=requestId;
  try{
    const c=document.createElement('canvas');c.width=1080;c.height=1440;const ctx=c.getContext('2d');
    ctx.fillStyle='#f8f7ef';ctx.fillRect(0,0,1080,1440);
    const svg=$('#landscape svg').cloneNode(true);svg.setAttribute('width','1080');svg.setAttribute('height','810');
    svg.querySelectorAll('.flower-open').forEach((g,i)=>{if(i>=Math.min(snapshotRounds,6))g.remove();});
    svg.querySelectorAll('.closed-bud').forEach((g,i)=>{if(i<Math.min(snapshotRounds,6))g.remove();});
    svg.querySelector('.little-bird')?.remove();svg.querySelector('.falling-petals')?.remove();svg.querySelector('.cup-route').setAttribute('transform','translate(145 480)');
    svg.innerHTML=svg.innerHTML.replaceAll('var(--petal,#edbcb1)',word==='雪'?'#f9f7ec':'#edbcb1');
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
    try{const img=new Image();img.src=url;await img.decode();ctx.drawImage(img,0,0,1080,810);}finally{URL.revokeObjectURL(url);}
    ctx.fillStyle='#294a3f';ctx.font='34px "Microsoft Yahei",sans-serif';ctx.fillText('山月 · 飞花令',72,91);
    ctx.font='148px "SimSun",serif';ctx.fillText(currentWord,92,340);
    ctx.font='27px "SimSun",serif';ctx.fillText('与你，共接一字的风景。',78,410);
    const gradient=ctx.createLinearGradient(0,650,0,820);gradient.addColorStop(0,'#f8f7ef00');gradient.addColorStop(1,'#f8f7ef');ctx.fillStyle=gradient;ctx.fillRect(0,650,1080,170);
    ctx.fillStyle='#5e755f';ctx.font='22px sans-serif';ctx.fillText('这一场相逢 · '+(snapshotCount>6?'最后六句':'共'+snapshotCount+'句'),72,785);
    const rows=snapshot.map(entry=>{ctx.font='19px "Microsoft Yahei",sans-serif';const meta=linesOfText(ctx,`${entry.author} ·《${entry.title}》`,850);return {entry,meta,height:Math.max(78,54+meta.length*24)};});
    const tableHeight=rows.reduce((total,row)=>total+row.height,0),scale=Math.min(1,492/tableHeight);
    ctx.save();ctx.translate(0,842);ctx.scale(scale,scale);
    let y=0;
    for(const {entry,meta,height} of rows){
      ctx.fillStyle='#7c8c74';ctx.font='19px sans-serif';ctx.fillText(entry.who==='user'?'你':'山月',72,y);
      ctx.fillStyle='#294a3f';ctx.font='35px "SimSun",serif';ctx.fillText(entry.text,150,y+2);
      ctx.fillStyle='#70806a';ctx.font='19px "Microsoft Yahei",sans-serif';
      meta.forEach((row,i)=>ctx.fillText(row,150,y+31+i*24));
      y+=height;
    }
    ctx.restore();
    ctx.strokeStyle='#d8dfcd';ctx.beginPath();ctx.moveTo(72,1350);ctx.lineTo(1008,1350);ctx.stroke();
    ctx.fillStyle='#7a866e';ctx.font='22px "SimSun",serif';ctx.fillText('不赶路，来山月坐一坐。',72,1396);ctx.font='20px sans-serif';ctx.textAlign='right';ctx.fillText('climbrey.github.io',1008,1396);
    const png=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!png)throw new Error('PNG unavailable');
    if(!alive||!modal.open||requestId!==modal.posterRequest||requestVersion!==version)return;
    if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl=URL.createObjectURL(png);
    $('#modal-body').innerHTML=`<img class="poster" alt="本场接诗的分享诗笺，包含每句出处"><p class="card-note">可保存图片；手机上也可以长按图片保存。</p><div class="modal-actions"><a class="primary download-link" download="山月-飞花令-${currentWord}.png">保存诗笺</a><button class="secondary" id="back-from-poster">回到花间</button></div>`;
    $('.poster').src=posterUrl;$('.download-link').href=posterUrl;$('#back-from-poster').onclick=closeDialog;
  }catch(error){if(alive&&modal.open&&requestId===modal.posterRequest)$('#modal-body').innerHTML='<p>这次图片没有生成成功。接诗记录还在，可以关闭后再试一次。</p>';}
}
$('.themes').addEventListener('click',e=>{const b=e.target.closest('[data-word]');if(b)chooseWord(b.dataset.word);});
$('#verses').addEventListener('click',e=>{const b=e.target.closest('[data-work]');if(b)readWork(b.dataset.work);});
$('#composer').addEventListener('submit',submit);input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>later(()=>composing=false,0));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.isComposing||composing))e.preventDefault();});
$('#hint').onclick=newHint;$('#first-hint').onclick=newHint;$('#finish').onclick=makePoster;$('#save-rest').onclick=makePoster;
$('#continue').onclick=()=>{const next=M.resume(game,data.lines,settings);if(!next)return;game=next;phase='ready';persist();feedback('');update();input.focus({preventScroll:true});};
$('#new-word').onclick=()=>{openDialog('下一场，想遇见什么？',`<p>挑一个字，开始新的风景。</p><div class="modal-actions">${data.words.filter(w=>w!==word&&viable.has(w)).map(w=>`<button class="secondary" data-new-word="${w}">${w}</button>`).join('')}</div>`);$$('[data-new-word]').forEach(b=>b.onclick=()=>{closeDialog();start(b.dataset.newWord);});};
$('#motion').onclick=()=>setMotion(!still);on(reduced,'change',e=>setMotion(e.matches));on(document,'visibilitychange',visibility);
scene.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=scene.getBoundingClientRect();particles(e.clientX,e.clientY,e.clientY<r.top+r.height*.68);});
$('#rules').onclick=()=>openDialog('一字，一场相逢',`<p>选一个字，你接一句，山月回一句。${settings.rounds}次往来，枝头会开满花；随时可以收成诗笺，也可以继续坐坐。</p><ol><li>初版先接<strong>五言、七言诗的一句</strong>，其中含有令字即可，不限定令字的位置；标点和空格可以省略。</li><li>同一场里，你与山月都不重复用过的句子。山月从已收录原诗中选句，每句都能打开出处。</li><li>想不起来时，可以先看篇名，再露出半句，最后借整句继续。</li><li>没有倒计时，也不扣分。未收录或版本不同的诗句会说明情况，不直接判你记错。</li></ol><p class="poem-source">这是适合一个人慢慢玩的“自由飞花”，并非严格按令字位置递移的传统酒令。接诗进度保存在当前浏览器，刷新或离开后可以接着玩，也可通过山月设置中的个人备份迁移。</p>`);
on(shadow,'click',event=>{const button=event.target.closest('[data-read]');if(button){event.preventDefault();closeDialog();callbacks.read(button.dataset.read);}});
$('#restart').onclick=()=>{if(!game.entries.length){start(word);return;}openDialog('重新开始这一场？','<p>会清空这一场的接诗记录，枝头从第一朵花重新开起。</p><div class="modal-actions"><button class="primary" id="confirm-restart">重新开始</button><button class="secondary" id="cancel-restart">继续这一场</button></div>');$('#confirm-restart').onclick=()=>{closeDialog();start(word);};$('#cancel-restart').onclick=closeDialog;};
for(const entry of game.entries)append(byId.get(entry.id),entry.who,entry.borrowed);
rounds=entries.length/2;phase=game.rest?'rest':'ready';
if(game.rest)rest(available().length<2);
setMotion(still);update();if(restored.notice)feedback(restored.notice);
const observer=new IntersectionObserver(records=>{offscreen=!records[0].isIntersecting;visibility();},{threshold:0});observer.observe(scene);
dispose=()=>{alive=false;version++;modal.posterRequest=null;modal.close();unlock();view.classList.add('sleeping');shadow.getAnimations?.().forEach(a=>a.cancel());controller.abort();observer.disconnect();timers.forEach(clearTimeout);timers.clear();};
}
root.ShanyueFeihuaView={available:isAvailable,markup,mount,cleanup,snapshot,restore,art:()=>ShanyueFeihuaArt.scene()};
})(globalThis);
