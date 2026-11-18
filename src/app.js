(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const KEY = 'shanyue.reading.v2';
  const Personal = ShanyuePersonal;
  const Experience = ShanyueExperience;
  const PuzzleView = ShanyuePuzzleView;
  let letters = [], openedLetter = null;
  const SEED = ShanyueLibrary.validateLibrary(JSON.parse($('#library-data').textContent));
  const seedFingerprints = Personal.fingerprints(SEED);
  const validateLibrary = input => ShanyueLibrary.validateLibrary(input, SEED);
  const initial = JSON.parse($('#initial-state').textContent);
  let library = clone(SEED);
  let state = {favorites:[], quotes:[], records:[], fontSize:23, lastWork:SEED.discovery.defaultWork||SEED.works[0].id, ...initial};
  let storageAvailable = true, storageBlocked = false, contentNotices = [], migrated = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.version !== 2) throw new Error('不支持的个人数据版本');
      const result = Personal.apply(SEED, saved.personal);
      library = result.library; state = normalizeState(saved.state);
      contentNotices = Personal.uniqueNotices([...(saved.notices||[]), ...result.notices]);
    } else {
      const legacy = JSON.parse(localStorage.getItem('shanyue.reading.v1') || 'null');
      if (legacy) {
        const result = legacy.library ? Personal.migrate(SEED, validateLibrary(legacy.library), JSON.parse($('#legacy-content').textContent)) : {library,notices:[]};
        library = result.library; state = normalizeState(legacy.state); contentNotices = result.notices; migrated = true;
      }
    }
  } catch (error) { storageAvailable = false; storageBlocked = true; }
  let personalContent = Personal.diff(SEED, library, seedFingerprints);
  let currentHome = library.works.some(w => w.id === state.lastWork) ? state.lastWork : library.works[0].id;
  let explore = {search:'',tags:[],author:'',form:'',stage:'',topic:''};
  let savedTab = 'works', lastListing = '#home', previousRoute = '', toastTimer;
  const positions = new Map(), expanded = new Map();
  let share = null, pendingImport = null, returnFocus = null;
  let routeVersion = 0, focusSearch = false, searchTimer, shareTimer, shareKey = '', modalScroll = 0, modalLocked = false;
  let shareReturn = '#home', shareTool = '', shuffleVersion = 0, shuffleAnimation, navigationVersion = 0, routeTransition, undoAction;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const dialog = $('#modal');
  const workById = id => library.works.find(w => w.id === id);
  const authorOf = work => library.authors[work.author];
  const tagById = id => library.tags.find(t => t.id === id);
  function localDate() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  const paths = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    share:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 5 5 3-3 5 5"/><circle cx="15" cy="8" r="2"/>',
    shuffle:'<path d="m17 3 4 4-4 4M3 7h18M7 21l-4-4 4-4m14 4H3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',
    sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
    book:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3ZM12 6v15"/>',
    pen:'<path d="m4 16 12-12 4 4L8 20H4v-4ZM13 7l4 4"/>',
    stamp:'<path d="M8 16v-3l2-4V5a2 2 0 0 1 4 0v4l2 4v3M5 16h14v4H5Z"/>',
    frame:'<rect x="5" y="3" width="14" height="18" rx="2"/>',
    wind:'<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a2 2 0 1 1-2 2M4 16h7a3 3 0 1 1-3 3"/>',
    flower:'<path d="M12 12C3 9 7 1 12 6c5-5 9 3 0 6ZM12 12c9-3 13 5 6 6-1 7-9 3-6-6ZM12 12c3 9-5 13-6 6-7-1-3-9 6-6Z"/>',
    snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 11l4-1-1-4M18 18l-1-4 4-1M3 13l4 1-1 4M18 6l-1 4 4 1"/>',
    moon:'<path d="M20.5 14.2A9 9 0 0 1 9.8 3.5a9 9 0 1 0 10.7 10.7Z"/>',
    mountain:'<path d="m2 20 8-15 5 9 3-5 5 11H2ZM7 11l3 2 2-2"/>',
    rain:'<path d="M6 14a5 5 0 1 1 1-9 5 5 0 0 1 9 2 4 4 0 1 1 2 7M7 17l-1 3m6-3-1 4m6-4-1 3"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.arrow)+'</svg>';

  function toast(message,undo=null) {
    const el=$('#toast');undoAction=undo;el.innerHTML='<span>'+esc(message)+'</span>'+(undo?'<button data-action="undo">撤销</button>':'');el.classList.add('show');clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{el.classList.remove('show');undoAction=null;},5000);
  }
  function persist(contentChanged=false) {
    if(storageBlocked)return false;
    try {
      if(contentChanged)personalContent=Personal.diff(SEED,library,seedFingerprints);
      localStorage.setItem(KEY,JSON.stringify({version:2,personal:personalContent,state,notices:contentNotices})); storageAvailable=true; return true;
    }
    catch(error) { storageAvailable=false; toast('浏览器暂时无法保存，请在设置中导出备份。'); return false; }
  }
  function serifSize() { document.documentElement.style.setProperty('--reading-size',state.fontSize+'px'); }
  function scene(type='mountain',id='scene') {
    const palettes={moon:['#eef0e4','#becdb5','#597e6d'],mountain:['#edf0e5','#b9c9a7','#648776'],water:['#e7efeb','#b4d1c6','#5b887b'],rain:['#e4eeea','#b2c7bc','#668d7e'],snow:['#f0f1eb','#d0dcd2','#8aa396'],bamboo:['#e9efdf','#b6c69b','#64865d'],flower:['#f3eae0','#d8c6ad','#a87963']};
    const [sky,soft,ink]=palettes[type]||palettes.mountain;
    const lake='<path d="M-20 366Q140 300 300 346T550 332V500H-20Z" fill="'+soft+'" opacity=".42"/><g class="scene-ripples" fill="none" stroke="'+ink+'" opacity=".24"><path d="M90 390q140-35 380 0M45 418q220-40 455-4M180 448q120-18 280-3"/></g>';
    const leaves='<g class="scene-leaves"><g fill="none" stroke="'+ink+'" stroke-width="2" opacity=".65"><path d="M423 520q-10-146-75-256M468 510q-44-87-35-193"/></g><g fill="'+ink+'" opacity=".45"><path d="M397 408q-80-16-70-90 64 20 70 90M409 431q8-77 59-89 5 62-59 89M365 318q-50-18-48-61 44 8 48 61M446 430q-39-36-29-77 32 20 29 77"/></g></g>';
    let art='';
    if(type==='moon')art='<circle class="scene-light" cx="356" cy="134" r="65" fill="#fffbed"/><circle cx="356" cy="134" r="79" fill="none" stroke="#fffbed" opacity=".45"/>'+lake+leaves+'<path d="M244 237q10-9 20 0 9-9 18 0m-30 25q7-6 14 0 7-6 14 0" stroke="'+ink+'" stroke-width="2" fill="none" opacity=".65"/>';
    else if(type==='flower')art='<circle cx="360" cy="135" r="68" fill="#fbf4e6"/><path d="M515 510Q388 319 244 155M378 326l81-118M316 242l-76-10" stroke="#8f9b75" stroke-width="4" fill="none"/><g fill="#c99682" opacity=".72">'+[[269,190],[315,243],[393,287],[449,222],[361,331]].map(([x,y])=>'<g transform="translate('+x+' '+y+')"><ellipse rx="10" ry="23" transform="rotate(-38)"/><ellipse rx="10" ry="23" transform="rotate(38)"/><ellipse rx="10" ry="23" transform="rotate(90)"/><circle r="5" fill="#e6cbaa"/></g>').join('')+'</g><path d="M422 410q-75 5-83-63 56 1 83 63M295 214q-41 11-49-33 40-4 49 33" fill="#9aaa80" opacity=".75"/>';
    else if(type==='rain'||type==='bamboo')art='<path d="M0 403Q160 369 520 407V500H0Z" fill="'+soft+'" opacity=".4"/>'+Array.from({length:3},(_,i)=>'<g stroke="'+ink+'" stroke-width="3" fill="none" opacity="'+(.4+i*.15)+'"><path d="M'+(320+i*60)+' 510l'+(15-i*17)+'-350"/><path d="M'+(326+i*56)+' 310l52-57m-52 57-54-30m54-90 42-40"/></g><g fill="'+ink+'" opacity=".5"><path d="M'+(330+i*55)+' 307q50-67 72-53-27 40-72 53m0 0q-48-46-65-32 32 31 65 32"/></g>').join('')+(type==='rain'?'<g class="scene-rain" stroke="#638e83" stroke-width="1" opacity=".3">'+Array.from({length:19},(_,i)=>'<path d="M'+(50+i*28)+' '+(30+i%4*45)+'l-20 95"/>').join('')+'</g>':'');
    else if(type==='water')art='<circle cx="345" cy="110" r="40" fill="#f9f7e9"/><path d="M160 330q65-105 125-79t119-55 140 101v203H160Z" fill="'+soft+'" opacity=".48"/>'+lake+'<path d="M288 366h94l-18 15h-58Z" fill="'+ink+'"/><path d="M336 366v-69l42 59h-42" fill="#f9f6e9" stroke="'+ink+'" stroke-width="1.5"/><path d="M313 396h71" stroke="'+ink+'" opacity=".4"/>';
    else art='<circle cx="352" cy="115" r="46" fill="#fbf8e8"/><path d="M44 397 230 157q12-14 24 0l94 135 80-110 127 188v130H44Z" fill="'+soft+'" opacity=".6"/><path d="M90 458 306 246q15-16 28 2l195 185v67H90Z" fill="'+ink+'" opacity=".28"/><path d="M-20 478Q160 416 300 452T550 428v72H-20Z" fill="'+ink+'" opacity=".33"/>'+(type==='snow'?'<path d="m206 185 24-28q12-14 24 0l37 52-34-7-16-15-15 10Z" fill="#fffef8"/>'+Array.from({length:15},(_,i)=>'<circle cx="'+(180+i*43%330)+'" cy="'+(35+i*31%300)+'" r="3" fill="#fff"/>').join(''):leaves);
    return '<svg viewBox="0 0 520 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="'+id+'-sky" x2="0" y2="1"><stop stop-color="'+sky+'"/><stop offset="1" stop-color="#f7f6ed"/></linearGradient></defs><rect width="520" height="500" fill="url(#'+id+'-sky)"/>'+art+'</svg>';
  }
  function tagButton(id) { const t=tagById(id);return t?'<button class="tag" data-action="tag" data-id="'+esc(id)+'">'+esc(t.name)+'</button>':''; }
  function favoriteButton(w,tile=false) { const active=state.favorites.includes(w.id);return '<button class="'+(tile?'icon-btn tile-save':'btn')+(active?' is-saved active':'')+'" data-action="favorite" data-id="'+esc(w.id)+'" aria-label="'+(active?'取消收藏':'收藏')+esc(w.title)+'" aria-pressed="'+active+'">'+icon('heart')+(tile?'':(active?'已收藏':'收藏'))+'</button>'; }
  function tile(w) {
    const a=authorOf(w),q=w.quote.slice(0,2).map(i=>w.lines[i]).join('\n');
    return '<article class="work-tile"><a class="tile-link" href="#work/'+esc(w.id)+'"><h3>'+esc(w.title)+'</h3><p class="tile-author">'+esc(a.dynasty)+' · '+esc(a.name)+'</p><p class="tile-quote">'+esc(q)+'</p></a>'+favoriteButton(w,true)+'<div class="tile-bottom"><span>'+esc(w.tags.slice(0,2).map(id=>tagById(id)?.name).filter(Boolean).join(' · ')||w.form)+'</span><a href="#work/'+esc(w.id)+'" aria-label="阅读'+esc(w.title)+'">读这篇 '+icon('arrow')+'</a></div></article>';
  }
  function readingCard() {
    const w=workById(currentHome)||library.works[0],a=authorOf(w);
    const isLong=w.lines.length>4||w.lines.join('').length>70;
    const lines=isLong?w.quote.map(i=>w.lines[i]):w.lines;
    return '<section class="reading-card" aria-label="此刻的作品"><div class="poem-cover"><div class="hero-copy"><p class="hero-meta">此刻，遇见一篇文字'+(isLong?' · 节选':'')+'</p><h2><a href="#work/'+esc(w.id)+'">'+esc(w.title)+'</a></h2><p class="byline">'+esc(a.dynasty)+' · '+esc(a.name)+'</p><div class="hero-verse">'+lines.map(l=>'<p>'+esc(l)+'</p>').join('')+'</div></div><div class="hero-art">'+scene(w.scene,'hero')+'</div><span class="art-seal">山月</span></div><div class="hero-actions"><a class="btn primary" href="#work/'+esc(w.id)+'">'+(isLong?'阅读全文':w.form.includes('古文')?'读这篇文字':'读这首诗')+' '+icon('arrow')+'</a><button class="text-btn shuffle" data-action="shuffle">'+icon('shuffle')+' 换一篇</button></div></section>';
  }
  function excerpt(w, limit=72) {
    const text=w.quote.slice(0,2).map(i=>w.lines[i]).filter(Boolean).join('\n')||w.lines[0]||'';
    return text.length>limit?text.slice(0,limit).trimEnd()+'…':text;
  }
  function letterClue(w) {
    return [...library.discovery.motifs,...library.discovery.feeling,...library.discovery.landscape].find(m=>w.tags.includes(m.tag))||{hint:w.form.split('·')[0].trim(),icon:'book'};
  }
  function prepareLetters(renew=false) {
    if(!renew&&letters.length&&letters.every(id=>workById(id)))return;
    const previous=new Set(letters);
    let pool=library.works.filter(w=>!previous.has(w.id));
    if(pool.length<Math.min(3,library.works.length))pool=[...library.works];
    letters=[];openedLetter=null;
    const seen=new Set();
    while(pool.length&&letters.length<3){
      const varied=pool.filter(w=>!seen.has(letterClue(w).hint)),choices=varied.length?varied:pool;
      const w=choices[Math.floor(Math.random()*choices.length)];
      letters.push(w.id);seen.add(letterClue(w).hint);pool=pool.filter(item=>item.id!==w.id);
    }
  }
  function letterChoices() {
    return letters.map((id,i)=>{
      const w=workById(id),motif=letterClue(w),active=openedLetter===id;
      return '<button class="poem-letter letter-'+i+'" data-action="open-letter" data-id="'+esc(id)+'" aria-expanded="'+active+'" aria-controls="letter-result" aria-label="拆开第'+(i+1)+'封诗笺：'+esc(motif?.hint||'字里行间')+'"><span class="letter-number">'+['壹','贰','叁'][i]+'</span><span class="letter-emblem">'+icon(motif?.icon||'book')+'</span><span class="letter-cue">'+esc(motif?.hint||'字里行间')+'</span><span class="letter-open">'+(active?'已展开':'轻点拆开')+'</span></button>';
    }).join('');
  }
  function letterResult() {
    const w=workById(openedLetter);
    if(!w)return '<div class="letter-waiting"><span class="letter-postmark" aria-hidden="true">寄予此刻</span><p class="eyebrow">有些相遇，不必事先安排</p><h3>把一段闲暇，<br>交给偶然。</h3><p>选一封诗笺，看看哪一句<br>会在今天，轻轻叩响你的心。</p></div>';
    const a=authorOf(w);
    return '<div class="letter-revealed"><p class="eyebrow">这封诗笺，来自'+esc(a.name)+'</p><blockquote>'+esc(excerpt(w))+'</blockquote><p class="letter-source">'+esc(a.dynasty)+' · '+esc(a.name)+'《'+esc(w.title)+'》</p><div class="row"><a class="btn primary" href="#work/'+esc(w.id)+'">读这篇 '+icon('arrow')+'</a><button class="text-btn" data-action="share" data-id="'+esc(w.id)+'">'+icon('share')+' 做成诗卡</button></div></div>';
  }
  function letterRoom() {
    prepareLetters();
    return '<section class="letter-room" aria-labelledby="letter-heading"><div class="letter-desk"><div class="letter-heading"><div><p class="eyebrow">偶然读到，也是一种缘分</p><h2 id="letter-heading">拆一封诗笺</h2></div><button class="text-btn" data-action="new-letters">'+icon('shuffle')+' 换一组</button></div><div class="letter-choices">'+letterChoices()+'</div></div><div id="letter-result" class="letter-result" role="region" aria-label="诗笺内容">'+letterResult()+'</div><span id="letter-announcement" class="sr-only" role="status" aria-live="polite"></span></section>';
  }
  function openLetter(id) {
    if(!letters.includes(id)||!workById(id)||openedLetter===id)return;
    openedLetter=id;
    $$('.poem-letter').forEach(b=>{const active=b.dataset.id===id;b.setAttribute('aria-expanded',String(active));$('.letter-open',b).textContent=active?'已展开':'轻点拆开';});
    const result=$('#letter-result');result.innerHTML=letterResult();Experience.unfold(result.firstElementChild);
    const w=workById(id);$('#letter-announcement').textContent='已拆开《'+w.title+'》，'+authorOf(w).name+'。'+excerpt(w);
  }
  function readingTrail(w) {
    const related=(w.related||[]).filter(r=>r.id!==w.id&&workById(r.id)).slice(0,2);
    if(!related.length)return '';
    return '<section class="reader-trail" aria-labelledby="trail-heading"><p class="eyebrow">读到这里，也许还想走远一点</p><h2 id="trail-heading">下一站，字里山河</h2><div class="trail-cards">'+related.map((r,i)=>{const next=workById(r.id);return '<a class="trail-card" href="#work/'+esc(next.id)+'"><span class="trail-art">'+scene(next.scene,'trail'+i)+'</span><span class="trail-copy"><span class="trail-meta">'+esc(authorOf(next).name)+' · '+esc(next.form)+'</span><h3>'+esc(next.title)+'</h3><span class="trail-quote">'+esc(excerpt(next,44))+'</span><span class="trail-reason">'+esc(r.reason)+'</span><span class="trail-go">继续读 '+icon('arrow')+'</span></span></a>';}).join('')+'</div></section>';
  }
  function home() {
    const motifs=library.discovery.motifs;
    const topic=library.topics[0];
    return '<h1 class="sr-only">山月 · 遇见文字里的天地</h1><div class="home-stage">'+readingCard()+'<section class="home-paths"><div class="desktop-intro"><p class="eyebrow">不赶路的时候</p><h2>留一点时间，<br>给眼前的诗。</h2><p>从一轮月、一阵风，走进心里的远方。</p></div><div class="discovery-entries"><a href="#explore" class="discovery-entry"><strong>按风景找</strong><span>月色、花事、山川</span>'+icon('arrow')+'</a><a href="#explore?view=feeling" class="discovery-entry"><strong>按心情找</strong><span>思念、闲适、旷达</span>'+icon('arrow')+'</a></div>'+(topic?'<a class="editorial-link" href="#explore?topic='+encodeURIComponent(topic.id)+'"><span class="editorial-mark">'+esc(library.discovery.featuredMark)+'</span><span><strong>'+esc(topic.name)+'</strong><small>'+esc(topic.subtitle)+'</small></span>'+icon('arrow')+'</a>':'')+'</section></div>'+PuzzleView.entry(library)+'<section><div class="section-heading"><div><p class="eyebrow">诗里的风景</p><h2>你想走近哪一处？</h2></div><a class="text-btn" href="#explore">全部线索 '+icon('arrow')+'</a></div><div class="motifs">'+motifs.filter(c=>tagById(c.tag)).map(({tag:id,label:name,hint:note,icon:iconName})=>'<button class="motif" data-action="tag" data-id="'+id+'"><span class="motif-orb">'+icon(iconName)+'</span><span class="motif-name">'+esc(name)+'<span class="motif-note">'+esc(note)+'</span></span></button>').join('')+'</div></section>'+letterRoom()+'<section><div class="section-heading"><div><p class="eyebrow">一组文字，一次漫游</p><h2>走一条诗里的小径</h2></div></div><div class="topics">'+library.topics.map((t,i)=>'<a class="topic-card topic-'+i+'" href="#explore?topic='+encodeURIComponent(t.id)+'"><div class="topic-art">'+scene(t.scene,'topic'+i)+'</div><div class="topic-copy"><span class="topic-kicker">诗意小集</span><h3>'+esc(t.name)+'</h3><p>'+esc(t.subtitle)+'</p><span class="topic-arrow">'+icon('arrow')+'</span></div></a>').join('')+'</div></section><section><div class="section-heading"><h2>不妨，再读一篇</h2><a class="text-btn" href="#explore">全部作品 '+icon('arrow')+'</a></div><div class="work-grid home-recommendations">'+library.works.filter(w=>w.id!==currentHome).slice(0,3).map(tile).join('')+'</div></section>';
  }
  async function shuffleWork() {
    const version=++shuffleVersion,route=routeVersion,old=$('.reading-card'),scroll=window.scrollY;
    if(!old)return;
    if(shuffleAnimation)shuffleAnimation.cancel();
    let candidates=library.works.filter(w=>!recentHome.slice(-4).includes(w.id));if(!candidates.length)candidates=library.works;
    const w=candidates[Math.floor(Math.random()*candidates.length)];
    shuffleAnimation=Experience.play(old.querySelector('.poem-cover'),[{opacity:1,transform:'none'},{opacity:0,transform:'perspective(1000px) rotateY(-7deg) translateX(-14px)'}],{duration:170,easing:'ease-in'});
    if(shuffleAnimation)await shuffleAnimation.finished.catch(()=>{});
    if(version!==shuffleVersion||route!==routeVersion)return;
    currentHome=w.id;state.lastWork=w.id;recentHome.push(w.id);persist();
    const holder=document.createElement('div');holder.innerHTML=readingCard();old.replaceWith(holder.firstElementChild);
    $('.shuffle').focus({preventScroll:true});
    window.scrollTo({top:scroll,behavior:'auto'});
    requestAnimationFrame(()=>{if(version===shuffleVersion&&route===routeVersion)window.scrollTo({top:scroll,behavior:'auto'});});
    Experience.play($('.poem-cover'),[{opacity:.15,transform:'perspective(1000px) rotateY(7deg) translateX(14px)'},{opacity:1,transform:'none'}],{duration:330});
    Experience.scene($('.hero-art'));
  }

  function rootTag(id) { let tag=tagById(id),n=0;while(tag&&tag.parent&&n++<30)tag=tagById(tag.parent);return tag?tag.id:id; }
  function descendant(id,parent) { let t=tagById(id),n=0;while(t&&n++<30){if(t.id===parent)return true;t=tagById(t.parent);}return false; }
  function tagSearchNames(ids) {const names=new Set();ids.forEach(id=>{let t=tagById(id),n=0;while(t&&n++<30){names.add(t.name);t=tagById(t.parent);}});return [...names].join(' ');}
  function filteredWorks() {
    const groups={};explore.tags.forEach(id=>(groups[rootTag(id)]||(groups[rootTag(id)]=[])).push(id));
    const topic=library.topics.find(t=>t.id===explore.topic),q=explore.search.trim().toLocaleLowerCase();
    return library.works.filter(w=>{
      const a=authorOf(w),searchText=[w.title,a.name,a.dynasty,w.form,w.lines.join(''),tagSearchNames(w.tags),w.extra.places||''].join(' ').toLocaleLowerCase();
      return (!q||searchText.includes(q))&&(!explore.author||w.author===explore.author)&&(!explore.form||w.form===explore.form)&&(!explore.stage||w.stage.includes(explore.stage))&&(!topic||topic.works.includes(w.id))&&Object.values(groups).every(ids=>ids.some(id=>w.tags.some(t=>descendant(t,id))));
    });
  }
  function filterRow(root) {
    const r=tagById(root);if(!r)return '';
    let members=library.tags.filter(t=>t.parent===root);if(!members.length)members=[r];
    const branch=(t,depth=0)=>'<button class="filter-chip '+(depth?'filter-child ':'')+(explore.tags.includes(t.id)?'selected':'')+'" data-action="filter" data-id="'+esc(t.id)+'" aria-pressed="'+explore.tags.includes(t.id)+'">'+(depth?'· ':'')+esc(t.name)+'</button>'+library.tags.filter(c=>c.parent===t.id).map(c=>branch(c,depth+1)).join('');
    if(root==='geography')return '<div class="filter-row geography-filters"><span class="filter-label">'+esc(r.name)+'</span><div class="place-groups">'+members.map(t=>'<details class="place-group" '+(explore.tags.some(id=>descendant(id,t.id))?'open':'')+'><summary>'+esc(t.name)+'</summary><div class="filter-options">'+branch(t)+'</div></details>').join('')+'</div></div>';
    return '<div class="filter-row"><span class="filter-label">'+esc(r.name)+'</span><div class="filter-options">'+members.map(t=>branch(t)).join('')+'</div></div>';
  }
  function discoveryCards() {
    const choices=library.discovery[explore.view]||[];
    return choices.filter(c=>tagById(c.tag)).map(({tag:id,label:name,hint:note,scene:art})=>'<button class="discovery-card" data-action="filter" data-id="'+id+'" aria-pressed="'+explore.tags.includes(id)+'"><span class="discovery-art">'+scene(art,'find-'+id)+'</span><strong>'+esc(name)+'</strong><span>'+esc(note)+'</span><span class="selection-check" aria-hidden="true">'+icon('check')+'</span></button>').join('');
  }
  function exploreIntro() {return explore.view==='places'?'从锦官城到成都，在字里行间重逢一座城。':'一个熟悉的名字，一句记得的文字。';}
  function explorePage() {
    const topic=library.topics.find(t=>t.id===explore.topic);
    return '<section class="explore-page"><p class="eyebrow">循着喜欢，自在漫游</p><h1 id="explore-title" class="page-title">'+esc(topic?topic.name:'从眼前的景，走向心里的诗。')+'</h1><p id="explore-intro" class="page-intro">'+esc(topic?topic.subtitle:exploreIntro())+'</p><div class="search-field">'+icon('search')+'<input id="search" type="search" value="'+esc(explore.search)+'" placeholder="搜索诗文、作者、古今地名" aria-label="搜索诗文、作者、古今地名" autocomplete="off"><button class="icon-btn search-clear" data-action="clear-search" aria-label="清除搜索" '+(!explore.search?'hidden':'')+'>'+icon('close')+'</button></div><div class="discovery-heading"><div class="discovery-tabs" aria-label="发现方式"><button data-action="explore-view" data-id="landscape" aria-pressed="'+(explore.view==='landscape')+'">风景</button><button data-action="explore-view" data-id="feeling" aria-pressed="'+(explore.view==='feeling')+'">心境</button><button data-action="explore-view" data-id="places" aria-pressed="'+(explore.view==='places')+'">地名</button></div><button class="text-btn" data-action="filters">'+icon('sliders')+' 更多线索</button></div><div id="discovery-cards" class="discovery-cards" data-view="'+explore.view+'">'+discoveryCards()+'</div><div id="explore-results">'+exploreResults()+'</div></section>';
  }
  function exploreResults() {
    const works=filteredWorks();
    let filters=explore.tags.map(id=>'<button class="tag" data-action="filter" data-id="'+esc(id)+'">'+esc((tagById(id)||{}).name)+' '+icon('close')+'</button>').join('');
    if(explore.topic)filters+='<button class="tag" data-action="clear-topic">当前专题 '+icon('close')+'</button>';
    for(const key of ['author','form','stage'])if(explore[key])filters+='<button class="tag" data-action="clear-condition" data-id="'+key+'">'+esc(key==='author'?(library.authors[explore.author]||{}).name||explore.author:explore[key])+' '+icon('close')+'</button>';
    return (filters?'<div class="selected-filters" aria-label="已选线索">'+filters+'</div>':'')+'<div class="result-heading"><span role="status" aria-live="polite">'+works.length+' 篇文字，等你停留</span>'+(filters||explore.search?'<button class="text-btn" data-action="clear-filters">清除条件</button>':'<span>慢慢读，自在遇见</span>')+'</div>'+(works.length?'<div class="work-grid result-list">'+works.map(tile).join('')+'</div>':'<div class="empty"><h2>这条小径，暂时还没有作品。</h2><p>试着少选一个条件，或换个词找找。</p><button class="btn" data-action="clear-filters">看看全部作品</button></div>');
  }
  function updateResults() {
    const target=$('#explore-results');if(!target)return;
    target.innerHTML=exploreResults();
    $$('[data-action="filter"]').forEach(b=>{const active=explore.tags.includes(b.dataset.id);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    const topic=library.topics.find(t=>t.id===explore.topic);
    $('#explore-title').textContent=topic?topic.name:'从眼前的景，走向心里的诗。';
    $('#explore-intro').textContent=topic?topic.subtitle:exploreIntro();
    $('.search-clear').hidden=!explore.search;
    if($('#filter-count'))$('#filter-count').textContent='查看 '+filteredWorks().length+' 篇作品';
  }
  function openFilters() {
    const selects='<div class="row">'+[['author','作者'],['form','文体'],['stage','学段标签（可选）']].map(([key,label])=>{
      const options=key==='author'?Object.entries(library.authors).map(([id,a])=>[id,a.dynasty+' · '+a.name]):(key==='form'?Array.from(new Set(library.works.map(w=>w.form))):['小学','初中','高中']).map(v=>[v,v]);
      return '<label class="field"><span>'+label+'</span><select id="'+key+'-filter"><option value="">不限</option>'+options.map(([value,name])=>'<option value="'+esc(value)+'" '+(explore[key]===value?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>';
    }).join('')+'</div>';
    openModal('沿着更多线索','<p class="modal-subtitle">同一类别可任选其一，不同类别会一起筛选。</p><div class="advanced-filters">'+library.tags.filter(t=>!t.parent).sort((a,b)=>explore.view==='places'?Number(b.id==='geography')-Number(a.id==='geography'):0).map(t=>filterRow(t.id)).join('')+selects+'</div>',true);
    dialog.classList.add('filter-dialog');
    const footer=document.createElement('footer');footer.className='modal-footer';footer.innerHTML='<button class="text-btn" data-action="clear-filters">清除条件</button><button class="btn primary" data-action="close-modal" id="filter-count">查看 '+filteredWorks().length+' 篇作品</button>';dialog.appendChild(footer);
  }

  function sourceMarkup(source) {
    const pattern=/https?:\/\/[^\s<>"'，。；！？）】]+/g;
    let html='',offset=0;
    for(const match of source.matchAll(pattern)){
      html+=esc(source.slice(offset,match.index));
      html+='<a class="source-link" href="'+esc(match[0])+'" target="_blank" rel="noopener noreferrer">查看资料 ↗</a>';
      offset=match.index+match[0].length;
    }
    return html+esc(source.slice(offset));
  }
  function moduleContent(w,m) {
    const a=authorOf(w);
    switch(m.id){
      case 'notes':return '<dl>'+w.notes.map(n=>'<dt>'+esc(n.q)+'</dt><dd>'+esc(n.text)+'</dd>').join('')+'</dl>';
      case 'author':return '<p class="author-life">'+esc(a.name)+' · '+esc(a.life)+'</p><p>'+esc(a.bio)+'</p><a class="text-btn" href="#explore?author='+encodeURIComponent(w.author)+'">再读读'+esc(a.name)+'的作品 ↗</a>';
      case 'background':return '<p>'+esc(w.background)+'</p>';
      case 'reading':return w.reading.map(r=>'<h4>'+esc(r.title)+'</h4><blockquote>'+esc(r.quote)+'</blockquote><p>'+esc(r.text)+'</p>').join('');
      case 'thought':return '<p>'+esc(w.thought)+'</p>';
      case 'sources':return w.sources.map(s=>'<p>'+sourceMarkup(s)+'</p>').join('')+'<p class="help">文字与解读可以分别阅读。存疑处保留说明，欢迎对照原作细看。</p>';
      default:return w.extra&&w.extra[m.id]?'<p style="white-space:pre-wrap">'+esc(w.extra[m.id])+'</p>':'';
    }
  }
  function annotatedLine(line,notes) {
    const terms=notes.map(n=>n.q).filter(q=>q&&line.includes(q)).sort((a,b)=>b.length-a.length);
    let html='',i=0;
    while(i<line.length){const term=terms.find(q=>line.startsWith(q,i));if(term){html+='<span class="annotated-word">'+esc(term)+'</span>';i+=term.length;}else html+=esc(line[i++]);}
    return html;
  }
  function detail(w) {
    const a=authorOf(w),isProse=w.form.includes('古文'),open=expanded.get(w.id)||[];
    const teaser=w.reading[0],showTeaser=teaser&&library.modules.some(m=>m.id==='reading'&&m.enabled);
    return '<div class="reader-top"><div class="breadcrumb"><a href="'+esc(lastListing)+'">'+icon('back')+' 返回'+(lastListing.startsWith('#explore')?'发现':lastListing.startsWith('#saved')?'收藏':lastListing.startsWith('#play')?'游园':'遇见')+'</a></div><button class="text-btn" data-action="settings">'+icon('sliders')+' 阅读设置</button></div><div class="detail-layout"><article class="poem-page"><header class="detail-heading"><p class="eyebrow">在字里行间，停一停</p><h1>'+esc(w.title)+'</h1><p class="byline">'+esc(a.dynasty)+' · <a href="#explore?author='+encodeURIComponent(w.author)+'">'+esc(a.name)+'</a> · '+esc(w.form)+'</p></header>'+(w.preface?'<p class="work-preface">'+esc(w.preface)+'</p>':'')+'<div class="poem-lines '+(isProse?'prose':'')+'">'+w.lines.map((line,i)=>'<button class="verse-line" data-action="line" data-id="'+esc(w.id)+'" data-line="'+i+'" aria-expanded="false" aria-controls="line-note" aria-label="查看这句：'+esc(line)+'">'+annotatedLine(line,w.notes)+'</button>').join('')+'</div>'+(!state.hintDismissed?'<div class="poem-hint"><span>轻点字词或诗句，读一处解释。</span><button class="text-btn" data-action="dismiss-hint" aria-label="不再显示阅读提示">知道了</button></div>':'')+'<div id="line-note"></div><div class="detail-actions">'+favoriteButton(w)+'<button class="btn primary" data-action="share" data-id="'+esc(w.id)+'">'+icon('share')+' 选句制作诗卡</button></div>'+(showTeaser?'<section class="reading-invitation"><p class="eyebrow">再读一层</p><h2>'+esc(teaser.title)+'</h2><p>'+esc(teaser.quote)+'</p><button class="text-btn" data-action="read-insight">看看这一处的妙处 '+icon('arrow')+'</button></section>':'')+'<div class="details-modules">'+library.modules.filter(m=>m.enabled).map(m=>{const c=moduleContent(w,m);return c?'<details class="content-module" data-module="'+esc(m.id)+'" '+(open.includes(m.id)?'open':'')+'><summary>'+esc(m.label)+'</summary><div class="module-body">'+c+'</div></details>':'';}).join('')+'</div>'+readingTrail(w)+'</article><aside class="detail-aside"><div class="aside-art">'+scene(w.scene,'detail')+'</div><h2>沿着这些线索</h2><div class="tag-list">'+w.tags.map(tagButton).join('')+'</div>'+(w.stage.length?'<p class="stage-note">学段标签'+w.stage.map(s=>'<span>'+esc(s)+'</span>').join('')+'</p>':'')+'</aside></div>';
  }
  function showLine(id,index,toggle=false) {
    const w=workById(id);if(!w||!w.lines[index])return;
    const line=$$('.verse-line').find(b=>Number(b.dataset.line)===index),note=$('#line-note');if(!line||!note)return;
    const closing=toggle&&line.classList.contains('picked');
    $$('.verse-line').forEach(b=>{const picked=!closing&&b===line;b.classList.toggle('picked',picked);b.setAttribute('aria-expanded',String(picked));});
    if(closing){note.innerHTML='';return;}
    const notes=w.notes.filter(n=>w.lines[index].includes(n.q)),saved=state.quotes.some(q=>q.workId===id&&q.index===index);
    note.innerHTML='<aside class="line-note" aria-label="句子注释"><div class="line-note-head"><span>这一句，慢慢读</span><button class="icon-btn" data-action="close-line" aria-label="收起句子注释">'+icon('close')+'</button></div><p class="line-title">'+esc(w.lines[index])+'</p>'+(notes.length?notes.map(n=>'<p><strong>'+esc(n.q)+'：</strong>'+esc(n.text)+'</p>').join(''):'<p>把喜欢的这一句留下，也可以到下方的赏读中继续看看。</p>')+'<div class="row"><button class="btn small" data-action="save-quote" data-id="'+esc(id)+'" data-line="'+index+'">'+icon('heart')+(saved?'已收藏这句':'收藏这句')+'</button><button class="btn small" data-action="share-line" data-id="'+esc(id)+'" data-line="'+index+'">'+icon('share')+' 制作诗卡</button></div></aside>';
    line.insertAdjacentElement('afterend',note);
    if(toggle){if(!reducedMotion())note.animate([{opacity:0,transform:'translateY(-7px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});requestAnimationFrame(()=>{if(!note.isConnected)return;const r=note.getBoundingClientRect();if(r.bottom>innerHeight-100&&r.height<innerHeight-180)note.scrollIntoView({block:'nearest',behavior:reducedMotion()?'auto':'smooth'});});}
  }

  function savedPage() {
    let body='';
    if(savedTab==='works'){const works=state.favorites.map(workById).filter(Boolean);body=works.length?'<div class="work-grid">'+works.map(tile).join('')+'</div>':emptySaved('还没有收藏的作品。','遇见喜欢的文字，轻点心形就能留下。');}
    if(savedTab==='quotes'){body=state.quotes.length?state.quotes.map(q=>{const w=workById(q.workId);return '<article class="quote-card"><blockquote>'+esc(q.text)+'</blockquote><p class="source">'+esc(q.author)+' · '+esc(q.title)+'</p><div class="row">'+(w?'<a class="btn small" href="#work/'+esc(w.id)+'">回到原作</a><button class="btn small" data-action="share-saved-quote" data-id="'+esc(q.id)+'">生成分享卡</button>':'')+'<button class="text-btn" data-action="remove-quote" data-id="'+esc(q.id)+'">移出收藏</button></div></article>';}).join(''):emptySaved('有些句子，值得留在身边。','打开作品，轻点喜欢的那一句。');}
    if(savedTab==='records'){body=state.records.length?state.records.slice().reverse().map(r=>'<article class="quote-card"><p class="eyebrow">'+esc(r.date||'阅读留念')+'</p><blockquote>'+esc(r.text)+'</blockquote><p class="source">'+esc(r.author)+' · '+esc(r.title)+'</p>'+(r.note?'<p class="note">'+esc(r.note)+'</p>':'')+'<div class="row"><button class="btn small" data-action="edit-record" data-id="'+esc(r.id)+'">编辑 / 再次制卡</button><button class="text-btn" data-action="delete-record" data-id="'+esc(r.id)+'">删除记录</button></div></article>').join(''):emptySaved('给某一天，留一页诗意。','制卡时勾选“同时留在我的诗卡里”，就能在这里重温。');}
    return '<p class="eyebrow">文字有归处 · 喜欢有回声</p><h1 class="page-title">把喜欢的，留在身边。</h1><p class="page-intro">不赶路的时候，回来读读。</p><div class="collection-tabs" aria-label="收藏类型">'+[['works','作品'],['quotes','句子'],['records','诗卡']].map(([id,label])=>'<button class="filter-chip '+(id===savedTab?'selected':'')+'" data-action="saved-tab" data-id="'+id+'" aria-pressed="'+(id===savedTab)+'">'+label+'</button>').join('')+'</div>'+body+'<div class="collection-settings"><h2>整理这本小集</h2><div class="row"><button class="btn" data-action="settings">'+icon('sliders')+' 阅读与内容设置</button><button class="btn" data-action="backup-settings">'+icon('download')+' 备份与迁移</button></div></div>';
  }
  function emptySaved(title,text) { return '<div class="empty"><h2>'+title+'</h2><p>'+text+'</p><a class="btn" href="#explore">去发现一篇 '+icon('arrow')+'</a></div>'; }
  function rememberView() {
    if(!previousRoute)return;
    positions.set(previousRoute,modalLocked?modalScroll:window.scrollY);
    const id=previousRoute.startsWith('#work/')?decodeURIComponent(previousRoute.slice(6)):'';
    if(id)expanded.set(id,$$('.content-module[open]').map(d=>d.dataset.module));
  }
  function renderRoute(animate=true) {
    clearTimeout(searchTimer);clearTimeout(shareTimer);Experience.clear();
    const hash=location.hash||'#home';rememberView();
    const [route,query='']=hash.slice(1).split('?'),params=new URLSearchParams(query);
    if(['home','explore','saved','play'].includes(route))lastListing=hash;
    let html='',work=null;
    if(route==='explore'){
      explore={search:params.get('q')||'',tags:params.getAll('tag').filter(tagById),author:params.get('author')||'',form:params.get('form')||'',stage:params.get('stage')||'',topic:params.get('topic')||'',view:['feeling','places'].includes(params.get('view'))?params.get('view'):'landscape'};
      html=explorePage();
    }else if(route==='saved')html=savedPage();
    else if(route==='play')html='<div id="puzzle-root">'+PuzzleView.markup(library,scene)+'</div>';
    else if(route.startsWith('work/')){
      work=workById(decodeURIComponent(route.slice(5)));
      if(work){state.lastWork=work.id;currentHome=work.id;persist();html=detail(work);}else html=emptySaved('这篇作品暂时不在小集中。','可以回到发现，看看其他作品。');
    }else if(route.startsWith('card/')){
      const id=decodeURIComponent(route.slice(5));
      if(!share||share.workId!==id){share=createShare(id);shareTool='';shareReturn=workById(id)?'#work/'+id:'#home';}
      html=share?sharePage():emptySaved('暂时找不到这篇作品。','回到发现，选一篇喜欢的文字吧。');
    }else html=home();
    document.body.dataset.page=route.startsWith('card/')?'card':route.startsWith('work/')?'work':route;
    document.body.dataset.longReading=String(!!work&&(work.form.includes('古文')||work.lines.length>8));
    $('#app').innerHTML='<div'+(animate?' class="fade-in"':'')+'>'+html+'</div>';
    if(route==='play')PuzzleView.mount($('#puzzle-root'),library,scene,round=>{const w=workById(round.workId);if(w)openShare(w.id,null,null,{title:w.title,author:authorOf(w).name,dynasty:authorOf(w).dynasty,text:round.lines.join('\n')});});
    Experience.observe($('#app'));Experience.scene($('.hero-art')||$('.aside-art'));
    const section=route.startsWith('work/')||route.startsWith('card/')?lastListing.slice(1).split('?')[0]:route;
    $$('[data-nav]').forEach(a=>{const active=a.dataset.nav===(['explore','saved','play'].includes(section)?section:'home');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=work?work.title+' · 山月':route==='play'?'拾句成诗 · 山月':route.startsWith('card/')?'制作诗卡 · 山月':'山月 · 在字里行间，遇见天地';
    if(route.startsWith('card/')&&share){renderShare();renderTemplatePreviews();}
    previousRoute=hash;const version=++routeVersion,wantsSearch=focusSearch;focusSearch=false;
    if(!dialog.open)window.scrollTo({top:wantsSearch?0:positions.get(hash)||0,behavior:'auto'});
    requestAnimationFrame(()=>{
      if(version===routeVersion&&!dialog.open){const target=wantsSearch?$('#search'):$('#main');if(target)target.focus({preventScroll:true});}
    });
  }
  function navigateRoute() {
    const token=++navigationVersion;if(routeTransition)routeTransition.skipTransition();
    if(dialog.open)closeModal();
    const update=()=>token===navigationVersion?renderRoute(false):undefined;
    if(document.startViewTransition&&!reducedMotion()){
      routeTransition=document.startViewTransition(update);
      // A newer route may intentionally skip the previous visual transition.
      routeTransition.ready.catch(()=>{});routeTransition.finished.catch(()=>{});
    }else renderRoute(!reducedMotion());
  }

  function refreshPage() { renderRoute(false); }
  function openModal(title,body,small=false) {
    const opening=!dialog.open;
    if(opening){returnFocus=document.activeElement;modalScroll=window.scrollY;}
    dialog.className=small?'small-dialog':'';
    dialog.innerHTML='<header class="modal-header"><h2 id="modal-title">'+esc(title)+'</h2><button class="icon-btn" data-action="close-modal" aria-label="关闭">'+icon('close')+'</button></header><div class="modal-body">'+body+'</div>';
    if(opening){modalLocked=true;document.body.style.position='fixed';document.body.style.top=-modalScroll+'px';document.body.style.width='100%';dialog.showModal();}
  }
  function finishModal() {
    if(!modalLocked)return;
    modalLocked=false;
    document.body.style.position='';document.body.style.top='';document.body.style.width='';
    window.scrollTo({top:modalScroll,behavior:'auto'});
    pendingImport=null;
    dialog.innerHTML='';
    if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});
  }
  function closeModal() { dialog.close();finishModal(); }
  dialog.addEventListener('close',()=>{if(!dialog.open)finishModal();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});

  function createShare(workId,lineIndex=null,record=null,quote=null) {
    const w=workById(workId);if(!w&&!record&&!quote)return null;
    const a=w?authorOf(w):{};
    return {workId,recordId:record?record.id:null,title:record?record.title:quote?quote.title:w.title,author:record?record.author:quote?quote.author:a.name,dynasty:record?record.dynasty:quote?(quote.dynasty||a.dynasty||''):a.dynasty,lines:record?record.lines.slice():quote?[quote.text]:w.lines.slice(),picked:record?record.picked.slice():quote?[0]:lineIndex!==null?[lineIndex]:w.quote.slice(),intro:record?record.intro:quote?'':w.intro,excerpt:record?!!record.excerpt:!!quote,theme:record?record.theme:'paper',ratio:record?record.ratio:'portrait',mode:record?record.mode:'quote',date:record?record.date:localDate(),showDate:record?record.showDate:false,note:record?record.note:'',signature:record?record.signature:'',showIntro:record?record.showIntro:false,keepRecord:!!record,dataUrl:null};
  }
  function openShare(workId,lineIndex=null,record=null,quote=null) {
    const next=createShare(workId,lineIndex,record,quote);if(!next){toast('暂时找不到这篇作品。');return;}
    shareReturn=location.hash||'#home';share=next;shareKey='';shareTool='';
    location.hash='#card/'+encodeURIComponent(workId);
  }
  function sharePage() {
    const buttons=(kind,items)=>'<div class="segmented">'+items.map(([id,label])=>'<button data-action="share-'+kind+'" data-id="'+id+'" aria-pressed="'+(share[kind]===id)+'" class="'+(share[kind]===id?'active':'')+'">'+label+'</button>').join('')+'</div>';
    return '<section class="maker-page"><header class="maker-header"><a class="text-btn maker-back" href="'+esc(shareReturn)+'">'+icon('back')+' 返回'+(shareReturn.startsWith('#saved')?'收藏':shareReturn.startsWith('#work/')?'原文':shareReturn.startsWith('#play')?'游园':'遇见')+'</a><h1>制作诗卡</h1><span>把喜欢的文字，留在身边</span></header><div class="share-layout"><div class="share-preview"><button class="preview-zoom" data-action="zoom-card" aria-label="放大查看诗卡"><img id="share-image" alt="分享卡图片预览"></button><p class="preview-caption">轻点放大 · 手机可长按图片保存</p><div id="share-error" class="error" role="alert" hidden></div><button class="btn small" id="adjust-quotes" data-action="share-tool" data-id="quote" hidden>调整选句</button></div><div class="share-controls"><p class="eyebrow">给这句诗，留个模样</p><div class="template-grid">'+[['paper','素笺','留白与印记'],['night','月夜','月光里的诗'],['botanic','草木','一页自然']].map(([id,label,note])=>'<button class="template-choice '+(share.theme===id?'active':'')+'" data-action="share-theme" data-id="'+id+'" aria-pressed="'+(share.theme===id)+'"><span class="template-image"><img data-template-preview="'+id+'" alt="'+label+'模板缩略图"></span><strong>'+label+'</strong><small>'+note+'</small></button>').join('')+'</div><div class="maker-tools" aria-label="诗卡编辑工具">'+[['quote','选句','book'],['note','文字','pen'],['sign','落款','stamp'],['layout','画幅','frame']].map(([id,label,ico])=>'<button data-action="share-tool" data-id="'+id+'" aria-expanded="'+(shareTool===id)+'" aria-controls="panel-'+id+'">'+icon(ico)+label+'</button>').join('')+'</div><section class="maker-panel" id="panel-quote" '+(shareTool==='quote'?'':'hidden')+'><h2>选几句喜欢的文字</h2>'+buttons('mode',[['quote','摘句'],['whole','整篇'],['memory','阅读留念']])+'<div id="quote-picks" class="quote-select" '+(share.mode==='whole'?'hidden':'')+'>'+share.lines.map((line,i)=>'<label class="check"><input type="checkbox" data-quote-index="'+i+'" '+(share.picked.includes(i)?'checked':'')+'><span>'+esc(line)+'</span></label>').join('')+'</div><p class="help" id="share-selection-count" role="status"></p><button class="text-btn" data-action="share-tool" data-id="quote">收起选句 '+icon('check')+'</button></section><section class="maker-panel" id="panel-note" '+(shareTool==='note'?'':'hidden')+'><label class="field"><span>写下一句感受 <small>（可选，最多 80 字）</small></span><textarea id="share-note" maxlength="80" placeholder="今天，这一句让我想到……">'+esc(share.note)+'</textarea></label><label class="check"><input id="share-intro" type="checkbox" '+(share.showIntro?'checked':'')+'>附上一句赏读</label></section><section class="maker-panel" id="panel-sign" '+(shareTool==='sign'?'':'hidden')+'><div class="row"><label class="field"><span>署名（可选）</span><input id="share-signature" maxlength="18" value="'+esc(share.signature)+'" placeholder="留个名字"></label><label class="field"><span>日期</span><input id="share-date" type="date" value="'+esc(share.date)+'"></label></div><label class="check"><input id="share-show-date" type="checkbox" '+(share.showDate?'checked':'')+'>在卡片上显示日期</label></section><section class="maker-panel" id="panel-layout" '+(shareTool==='layout'?'':'hidden')+'><h2>选择画幅</h2>'+buttons('ratio',[['portrait','竖版 3:4'],['square','方形 1:1']])+'</section><label class="check keep-record"><input id="share-record" type="checkbox" '+(share.keepRecord?'checked':'')+'>同时留在我的诗卡里</label><p class="help">保存后可自行分享朋友圈。图片在本机生成，感受与落款不会上传。</p></div></div><footer class="maker-footer"><p><span id="share-size">1080 × 1440</span><small>PNG · 留一页诗意</small></p><button class="btn primary save-image" data-action="download-image">'+icon('download')+' 保存高清图片</button></footer></section>';
  }
  function setShareTool(id,forceOpen=false) {
    shareTool=shareTool===id&&!forceOpen?'':id;
    $$('.maker-panel').forEach(panel=>panel.hidden=panel.id!=='panel-'+shareTool);
    $$('[data-action="share-tool"]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.id===shareTool)));
    if(shareTool&&!reducedMotion())$('#panel-'+shareTool).animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'});
    if(shareTool)requestAnimationFrame(()=>{const panel=$('#panel-'+shareTool);if(panel)panel.scrollIntoView({block:'nearest',behavior:reducedMotion()?'auto':'smooth'});});
  }

  function wrapCanvas(ctx,text,maxWidth) {
    const chars=Array.from(text);const lines=[];let current='';
    const noStart=/^[，。！？；：、）》」』】…,.!?;:]/;
    chars.forEach(ch=>{if(ch==='\n'){lines.push(current);current='';return;}if(current&&ctx.measureText(current+ch).width>maxWidth){if(noStart.test(ch)){const arr=Array.from(current),last=arr.pop();lines.push(arr.join(''));current=last+ch;}else{lines.push(current);current=ch;}}else current+=ch;});
    if(current)lines.push(current);return lines;
  }
  function scheduleShare() {clearTimeout(shareTimer);shareTimer=setTimeout(renderShare,140);}
  function composeShare(card,scale=1) {
    const chosen=card.mode==='whole'?card.lines:card.lines.filter((_,i)=>card.picked.includes(i));
    if(!chosen.length)return {error:'先选一句喜欢的文字，再生成卡片。'};
    const W=1080,H=card.ratio==='square'?1080:1440,canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
    const ctx=canvas.getContext('2d');if(!ctx)return {error:'这个浏览器暂时不能生成图片，请换一个浏览器打开。'};ctx.scale(scale,scale);
    const colors={paper:{bg:'#f6f0e3',ink:'#30473c',muted:'#62725f',accent:'#a65b3f',art:'#d2d4bd'},night:{bg:'#203f38',ink:'#f7eedc',muted:'#c1d1c0',accent:'#dac28d',art:'#638975'},botanic:{bg:'#e8eddd',ink:'#2d513a',muted:'#5c7655',accent:'#9c6344',art:'#a9bf94'}}[card.theme];
    const serif='"Songti SC", "STSong", "SimSun", serif',sans='"Microsoft YaHei", sans-serif';
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,W,H);
    if(card.theme==='paper'){
      ctx.strokeStyle='#c9c8b4';ctx.lineWidth=1;ctx.strokeRect(42,42,W-84,H-84);
      ctx.fillStyle=colors.accent;ctx.fillRect(96,85,34,3);ctx.fillRect(96,85,3,34);
    }else if(card.theme==='night'){
      ctx.fillStyle='#e5d5a9';ctx.beginPath();ctx.arc(934,117,39,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#678a79';ctx.globalAlpha=.35;ctx.lineWidth=2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(780,H-190+i*34,300+i*75,38,0,Math.PI,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
    }else{
      ctx.save();ctx.strokeStyle=colors.muted;ctx.fillStyle=colors.art;ctx.globalAlpha=.55;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1010,H-50);ctx.quadraticCurveTo(948,H-300,900,H-460);ctx.stroke();
      for(let i=0;i<6;i++){const x=987-i*16,y=H-116-i*55;ctx.beginPath();ctx.ellipse(x+(i%2?17:-24),y,43,13,i%2?-.9:.7,0,Math.PI*2);ctx.fill();}ctx.restore();
      ctx.fillStyle=colors.muted;ctx.fillRect(96,88,80,2);
    }
    ctx.fillStyle=colors.muted;ctx.font='22px '+sans;ctx.fillText(card.mode==='memory'?'一日一笺 · 阅读留念':'山月 · '+(card.mode==='whole'?'一篇文字':'一瞬诗意'),96,140);
    ctx.fillStyle=colors.ink;ctx.font='48px '+serif;
    const titleLines=wrapCanvas(ctx,card.title,770);titleLines.forEach((line,i)=>ctx.fillText(line,96,218+i*65));
    const bylineY=218+(titleLines.length-1)*65+52;
    ctx.font='25px '+sans;ctx.fillStyle=colors.muted;
    const excerpt=card.excerpt||(card.mode!=='whole'&&chosen.length<card.lines.length);
    ctx.fillText(card.dynasty+' · '+card.author+(excerpt?'  /  节选':''),96,bylineY);
    const extras=[];ctx.font='29px '+serif;
    if(card.showIntro&&card.intro)extras.push({label:'赏读',lines:wrapCanvas(ctx,card.intro,850)});
    if(card.note.trim())extras.push({label:'随记',lines:wrapCanvas(ctx,card.note.trim(),850)});
    const extraHeight=extras.reduce((n,e)=>n+42+e.lines.length*47+25,0);
    const top=bylineY+62,bottom=H-150-extraHeight-25,available=bottom-top;
    let size=chosen.join('').length<45?76:64,rendered=[];
    while(size>=46){ctx.font=size+'px '+serif;rendered=chosen.flatMap(line=>wrapCanvas(ctx,line,850));if(rendered.length*size*1.6<=available)break;size-=2;}
    if(size<46)return {error:'这段文字有些长。请减少选句或感想，或换成竖版，让每个字都清楚。'};
    const leading=size*1.6,total=rendered.length*leading;let y=top+Math.max(0,(available-total)/2)+size;
    ctx.fillStyle=colors.ink;ctx.font=size+'px '+serif;ctx.textAlign=card.theme==='night'?'center':'left';
    rendered.forEach(line=>{ctx.fillText(line,card.theme==='night'?W/2:110,y);y+=leading;});ctx.textAlign='left';
    if(extras.length){y=H-150-extraHeight;ctx.strokeStyle=colors.muted;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(96,y-23);ctx.lineTo(186,y-23);ctx.stroke();ctx.globalAlpha=1;extras.forEach(extra=>{ctx.fillStyle=colors.accent;ctx.font='20px '+sans;ctx.fillText(extra.label,96,y+17);y+=42;ctx.fillStyle=colors.ink;ctx.font='29px '+serif;extra.lines.forEach(line=>{ctx.fillText(line,96,y+25);y+=47;});y+=25;});}
    ctx.strokeStyle=colors.accent;ctx.lineWidth=1.5;ctx.strokeRect(96,H-105,54,42);ctx.font='20px '+serif;ctx.fillStyle=colors.accent;ctx.fillText('山月',103,H-77);
    ctx.font='22px '+sans;ctx.fillStyle=colors.muted;
    if(card.showDate&&card.date)ctx.fillText(card.date.replace(/-/g,' . '),174,H-78);
    if(card.signature.trim()){ctx.textAlign='right';ctx.fillText(card.signature.trim(),W-96,H-78);}
    try{return {dataUrl:canvas.toDataURL('image/png')};}catch(error){return {error:'图片生成失败，请重试或切换样式。'};}
  }
  function renderShare() {
    clearTimeout(shareTimer);if(!share||!$('#share-image'))return;
    const img=$('#share-image'),error=$('#share-error'),save=$('[data-action="download-image"]');
    const chosen=share.mode==='whole'?share.lines:share.lines.filter((_,i)=>share.picked.includes(i));
    const key=JSON.stringify([share.title,share.author,share.dynasty,chosen,share.theme,share.ratio,share.mode,share.excerpt,share.showIntro?share.intro:'',share.note,share.signature,share.showDate?share.date:'']);
    $('#share-size').textContent=share.ratio==='square'?'1080 × 1080':'1080 × 1440';
    $('#share-selection-count').textContent='已选 '+chosen.length+' 句 · '+chosen.join('').length+' 字';
    if(key===shareKey&&share.dataUrl){img.src=share.dataUrl;return;}
    const result=composeShare(share);
    if(result.error){share.dataUrl=null;img.hidden=true;img.removeAttribute('src');error.hidden=false;error.textContent=result.error;save.disabled=true;$('#adjust-quotes').hidden=false;return;}
    const changed=!!share.dataUrl;share.dataUrl=result.dataUrl;shareKey=key;img.src=result.dataUrl;img.hidden=false;img.alt=share.title+'分享卡：'+chosen.join('');error.hidden=true;save.disabled=false;$('#adjust-quotes').hidden=true;
    if(changed&&!reducedMotion())img.animate([{opacity:.65},{opacity:1}],{duration:200});
  }
  function renderTemplatePreviews() {
    if(!share)return;
    const example={...share,mode:'quote',picked:share.picked.length?share.picked.slice(0,2):[0],ratio:'portrait',note:'',signature:'',showDate:false,showIntro:false};
    $$('[data-template-preview]').forEach(img=>{const result=composeShare({...example,theme:img.dataset.templatePreview},.2);if(result.dataUrl)img.src=result.dataUrl;});
  }

  function downloadUrl(url,name) { const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove(); }
  function safeName(text) {return text.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,60);}
  function saveShareImage() {
    if(!share)return;renderShare();if(!share.dataUrl)return;
    downloadUrl(share.dataUrl,safeName(share.title)+'-'+share.theme+'-'+share.ratio+'.png');
    if(share.keepRecord){
      const chosen=share.mode==='whole'?share.lines:share.lines.filter((_,i)=>share.picked.includes(i));
      const record={...share,text:chosen.join('\n'),id:share.recordId||'r-'+Date.now().toString(36),picked:share.mode==='whole'?share.lines.map((_,i)=>i):share.picked.slice()};delete record.dataUrl;delete record.keepRecord;delete record.recordId;
      const fingerprint=JSON.stringify([record.workId,record.text,record.date,record.note,record.signature]);
      const index=state.records.findIndex(r=>r.id===share.recordId||JSON.stringify([r.workId,r.text,r.date,r.note,r.signature])===fingerprint);
      if(index>=0){record.id=state.records[index].id;state.records[index]=record;}else state.records.push(record);
      share.recordId=record.id;persist();if(location.hash.startsWith('#saved'))refreshPage();
      toast('已准备图片，也记下了这次阅读。');
    }else toast('图片已准备好；手机也可以长按预览保存。');
  }
  function setShareChoice(kind,id) {
    if(!share)return;
    share[kind]=id;
    $$('[data-action="share-'+kind+'"]').forEach(b=>{const active=b.dataset.id===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    if(kind==='mode'){$('#quote-picks').hidden=id==='whole';if(id==='memory'){share.showDate=true;$('#share-show-date').checked=true;}}
    renderShare();
  }

  function contentUpdateNotice() {
    if(!contentNotices.length)return '<p class="help">内置内容随版本更新。你的内容调整、收藏和诗卡保存在当前浏览器，可用个人备份迁移。</p>';
    return '<div class="import-preview"><p>部分内容有新版，其中与你修改重合的部分已优先保留个人版本。</p><button class="text-btn" data-action="content-updates">查看更新说明 '+icon('arrow')+'</button></div>';
  }
  function showContentUpdates() {
    const labels={background:'写作缘起',reading:'赏读',thought:'核心思想',notes:'字词解释',lines:'原文',tags:'标签',sources:'出处',label:'模块名称',enabled:'显示设置','*':'整个条目'};
    const entries=contentNotices.map(n=>{
      const lookup=(data)=>n.group==='authors'?data.authors[n.id]:n.group==='config'?null:data[n.group]?.find(r=>r.id===n.id);
      const row=lookup(library)||lookup(SEED);
      return '<li>'+esc(row?.title||row?.name||row?.label||(n.group==='config'?'内容展示配置':n.id))+' · '+esc(labels[n.field]||(n.field.startsWith('extra/')?'自定义内容':n.field))+'</li>';
    }).join('');
    openModal('内容更新说明','<p class="modal-subtitle">下面这些位置同时有内置更新和个人修改。目前继续使用你的版本，其他未修改内容已随版本更新。</p><ul>'+entries+'</ul><div class="row" style="margin-top:22px"><button class="btn primary" data-action="keep-content">继续使用我的内容</button><button class="btn" data-action="use-published">这些位置采用新版</button></div>',true);
  }
  function settings() {
    const parents='<option value="">顶级分类</option>'+library.tags.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
    openModal('阅读与内容设置','<p class="modal-subtitle">按自己的喜好，整理这本小集。</p>'+contentUpdateNotice()+'<label class="field"><span>原文字号 <output id="font-output">'+state.fontSize+' px</output></span><input id="font-size" type="range" min="18" max="30" value="'+state.fontSize+'"></label><details class="settings-group"><summary>内容模块</summary><p class="help">决定详情里显示什么，以及它们的顺序。</p><div class="manager-list">'+library.modules.map((m,i)=>'<div class="manage-row module-row"><label class="check"><input type="checkbox" data-module-toggle="'+esc(m.id)+'" '+(m.enabled?'checked':'')+'><span>'+esc(m.label)+'</span></label><button class="btn small" data-action="module-up" data-id="'+esc(m.id)+'" '+(i===0?'disabled':'')+' aria-label="上移'+esc(m.label)+'">↑</button><button class="btn small" data-action="module-edit" data-id="'+esc(m.id)+'">编辑</button><button class="btn small" data-action="module-delete" data-id="'+esc(m.id)+'">移除</button></div>').join('')+'</div><div class="manage-row"><input id="new-module" placeholder="新模块名称，如：一处地名" maxlength="24" aria-label="新模块名称"><button class="btn small" data-action="module-add">添加模块</button></div></details><details class="settings-group"><summary>分类与作品标签</summary><p class="help">分类可以分层。移除分类只解除标签，不删除作品。</p><div class="manage-row"><input id="new-tag" placeholder="新分类名称" maxlength="20" aria-label="新分类名称"><select id="new-tag-parent" aria-label="上级分类">'+parents+'</select><button class="btn small" data-action="tag-add">添加</button></div><div class="manager-list">'+library.tags.map(t=>'<div class="manage-row"><span style="flex:1;font-size:12px">'+esc(t.parent?(tagById(t.parent)||{}).name+' / ':'')+esc(t.name)+'</span><button class="btn small" data-action="tag-edit" data-id="'+esc(t.id)+'">编辑</button><button class="btn small" data-action="tag-delete" data-id="'+esc(t.id)+'">移除</button></div>').join('')+'</div><label class="field"><span>为作品调整标签</span><select id="tag-work">'+library.works.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.title)+'</option>').join('')+'</select></label><button class="btn small" data-action="work-tags">编辑这篇的标签</button></details><details class="settings-group"><summary>导入、导出与备份</summary><p class="help">设置与收藏保存在当前浏览器。换设备前，可以导出一份备份。</p><div class="row" style="margin:14px 0"><button class="btn small" data-action="export-backup">导出个人备份</button><button class="btn small" data-action="export-content">导出内容包</button><button class="btn small" data-action="export-html">导出阅读 HTML</button></div><label class="field"><span>导入内容包或个人备份（JSON）</span><input id="import-file" type="file" accept="application/json,.json"></label><p class="help">内容包按作品标识合并；个人备份会恢复其中的内容、配置和收藏。导入前会显示变化预览。</p><div id="import-preview"></div></details><div class="settings-group"><button class="text-btn" data-action="about">关于这本小集 ↗</button>'+(!storageAvailable?'<p class="error">当前浏览器无法保存本地记录，请及时导出备份。</p>':'')+'</div>',true);
  }
  function refreshSettings(section=0) { const oldY=$('.modal-body',dialog).scrollTop;settings();const details=$$('.settings-group',dialog).filter(x=>x.tagName==='DETAILS');if(details[section])details[section].open=true;$('.modal-body',dialog).scrollTop=oldY; }
  function editTag(id) {
    const tag=tagById(id);if(!tag)return;
    openModal('编辑分类','<label class="field"><span>名称</span><input id="edit-tag-name" maxlength="20" value="'+esc(tag.name)+'"></label><label class="field"><span>上级分类</span><select id="edit-tag-parent"><option value="">顶级分类</option>'+library.tags.filter(t=>!descendant(t.id,id)).map(t=>'<option value="'+esc(t.id)+'" '+(t.id===tag.parent?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select></label><button class="btn primary" data-action="save-tag" data-id="'+esc(id)+'">保存分类</button>',true);
  }
  function editModule(id) {
    const m=library.modules.find(m=>m.id===id);if(!m)return;
    const custom=!['notes','author','background','reading','thought','sources'].includes(id);
    openModal('编辑内容模块','<label class="field"><span>模块名称</span><input id="edit-module-name" maxlength="24" value="'+esc(m.label)+'"></label>'+(custom?'<label class="field"><span>为一篇作品填写内容</span><select id="module-work" data-module="'+esc(id)+'">'+library.works.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.title)+'</option>').join('')+'</select></label><label class="field"><span>正文（留空时不显示）</span><textarea id="module-content" maxlength="6000">'+esc((library.works[0].extra||{})[id]||'')+'</textarea></label>':'<p class="help">内置模块可以改名、排序或隐藏。批量修改原文及讲解可通过内容包导入。</p>')+'<button class="btn primary" data-action="save-module" data-id="'+esc(id)+'" style="margin-top:15px">保存模块</button>',true);
  }
  function editWorkTags(id) {
    const w=workById(id);if(!w)return;
    openModal('作品标签 · '+w.title,'<div class="filter-options">'+library.tags.map(t=>'<label class="check" style="min-width:125px"><input type="checkbox" data-work-tag="'+esc(t.id)+'" '+(w.tags.includes(t.id)?'checked':'')+'>'+esc(t.name)+'</label>').join('')+'</div><button class="btn primary" data-action="save-work-tags" data-id="'+esc(id)+'" style="margin-top:20px">保存标签</button>',true);
  }
  function confirmAction(title,text,action,id) { openModal(title,'<p style="line-height:2;margin-bottom:23px">'+esc(text)+'</p><div class="row"><button class="btn primary" data-action="'+action+'" data-id="'+esc(id)+'">确认</button><button class="btn" data-action="close-modal">取消</button></div>',true); }
  function exportJson(kind) { const payload={format:'shanyue',version:kind==='backup'?2:1,kind,library,...(kind==='backup'?{state,personal:personalContent,notices:contentNotices}:{}),exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);downloadUrl(url,'山月-'+(kind==='backup'?'个人备份':'内容包')+'-'+localDate()+'.json');setTimeout(()=>URL.revokeObjectURL(url),20000);toast('导出文件已准备好。'); }
  function exportHtml() {
    const copy=document.documentElement.cloneNode(true);
    copy.querySelectorAll('[data-hosted-only]').forEach(element=>element.remove());
    copy.querySelector('#app').innerHTML='';const m=copy.querySelector('#modal');m.innerHTML='';m.removeAttribute('open');m.className='';
    copy.querySelector('#toast').textContent='';copy.querySelector('#toast').className='toast';copy.querySelector('body').removeAttribute('style');copy.querySelector('body').removeAttribute('data-page');copy.querySelector('body').classList.remove('keyboard-open');
    copy.querySelector('#library-data').textContent=JSON.stringify(library).replace(/</g,'\\u003c');
    copy.querySelector('#initial-state').textContent=JSON.stringify({fontSize:state.fontSize});
    copy.querySelector('title').textContent='山月 · 在字里行间，遇见天地';
    const url=URL.createObjectURL(new Blob(['<!doctype html>\n'+copy.outerHTML],{type:'text/html;charset=utf-8'}));downloadUrl(url,'山月-阅读小集.html');setTimeout(()=>URL.revokeObjectURL(url),20000);toast('已导出阅读文件，不包含个人收藏与留念。');
  }
  async function previewImport(file) {
    if(!file)return;
    const area=$('#import-preview');
    try{
      if(file.size>8*1024*1024)throw new Error('文件过大，请使用 8 MB 以内的内容包。');
      const data=JSON.parse(await file.text());
      if(data.format!=='shanyue'||![1,2].includes(data.version)||!['content','backup'].includes(data.kind)||(data.version===2&&data.kind!=='backup'))throw new Error('不是当前版本支持的山月内容包或备份。');
      const incoming=validateLibrary({...data.library,discovery:data.library?.discovery||library.discovery});
      if(data.kind==='backup'&&(!data.state||typeof data.state!=='object'))throw new Error('备份缺少个人记录。');
      const additions=incoming.works.filter(w=>!workById(w.id)).length;
      let merged=incoming, notices=[];
      if(data.kind==='backup'){
        const result=data.version===2?Personal.apply(SEED,data.personal):Personal.migrate(SEED,incoming,JSON.parse($('#legacy-content').textContent));
        merged=result.library;notices=Personal.uniqueNotices([...(data.notices||[]),...result.notices]);
      }
      if(data.kind==='content'){
        const merge=(a,b)=>Array.from(new Map(a.concat(b).map(x=>[x.id,x])).values());
        merged=validateLibrary({...library,discovery:incoming.discovery,authors:{...library.authors,...incoming.authors},works:merge(library.works,incoming.works),tags:merge(library.tags,incoming.tags),modules:merge(library.modules,incoming.modules),topics:merge(library.topics,incoming.topics)});
      }
      pendingImport={library:merged,state:data.kind==='backup'?normalizeState(data.state):state,notices,kind:data.kind};
      area.innerHTML='<div class="import-preview"><h4>'+esc(data.kind==='backup'?'恢复个人备份':'合并内容包')+'</h4><p>'+incoming.works.length+' 篇作品；新增 '+additions+' 篇，已有标识 '+(incoming.works.length-additions)+' 篇。</p><p>'+(data.kind==='backup'?'将恢复收藏、设置与个人修改；未修改的内置内容采用当前版本。':'同标识作品、分类及模块将采用导入内容，个人收藏保留。')+'</p><div class="row" style="margin-top:13px"><button class="btn primary small" data-action="apply-import">确认导入</button><button class="btn small" data-action="cancel-import">取消</button></div></div>';
    }catch(error){pendingImport=null;area.innerHTML='<p class="error" role="alert">'+esc(error.message)+'</p>';}
  }
  function about() {
    openModal('关于这本小集','<div class="about-copy"><div class="about-brand">山月</div><p>在字里行间，遇见天地。</p><p>从一轮月、一阵风、一份心情出发，读到文字，也读到写下它的人。把喜欢的一句制成卡片，送给今天，或送给一个想起的人。</p><p class="tiny">这本小集目前收录 '+library.works.length+' 篇古诗文。原文附对照来源，节选、异文与存疑处分别说明；注释和赏读为山月编写。学段仅是阅读参考标签。</p><p class="tiny">可离线阅读、制卡。收藏和设置留在当前浏览器；分享朋友圈时，请先保存图片后自行发布。</p></div>',true);
  }

  function normalizeState(raw) {
    if(!raw||typeof raw!=='object')raw={};
    const text=(v,max=10000)=>typeof v==='string'?v.slice(0,max):'';
    const arr=v=>Array.isArray(v)?v:[];
    const normalized={favorites:[...new Set(arr(raw.favorites).filter(x=>typeof x==='string'))].slice(0,2000),fontSize:Math.max(18,Math.min(30,Number(raw.fontSize)||23)),lastWork:text(raw.lastWork,64)||SEED.discovery.defaultWork||SEED.works[0].id,hintDismissed:!!raw.hintDismissed,quotes:[],records:[]};
    normalized.quotes=arr(raw.quotes).filter(q=>q&&typeof q.text==='string'&&Number.isInteger(q.index)).slice(0,5000).map(q=>({id:text(q.id,140),workId:text(q.workId,64),index:q.index,text:text(q.text,2000),title:text(q.title,160),author:text(q.author,100),dynasty:text(q.dynasty,30)}));
    normalized.records=arr(raw.records).filter(r=>r&&Array.isArray(r.lines)&&r.lines.length&&r.lines.every(l=>typeof l==='string')&&Array.isArray(r.picked)&&r.picked.length&&r.picked.every(i=>Number.isInteger(i)&&i>=0&&i<r.lines.length)).slice(0,2000).map(r=>({id:text(r.id,80),workId:text(r.workId,64),title:text(r.title,160),author:text(r.author,100),dynasty:text(r.dynasty,30),lines:r.lines.slice(0,500).map(l=>text(l,2000)),picked:r.picked.filter(i=>i<500),text:text(r.text,20000),intro:text(r.intro,500),excerpt:!!r.excerpt,theme:['paper','night','botanic'].includes(r.theme)?r.theme:'paper',ratio:r.ratio==='square'?'square':'portrait',mode:['quote','whole','memory'].includes(r.mode)?r.mode:'quote',date:/^\d{4}-\d{2}-\d{2}$/.test(r.date)?r.date:localDate(),showDate:!!r.showDate,note:text(r.note,80),signature:text(r.signature,18),showIntro:!!r.showIntro}));
    return normalized;
  }
  function newId(prefix) {return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);}
  function filterChanged(defer=false) {
    clearTimeout(searchTimer);
    const params=new URLSearchParams();
    if(explore.search)params.set('q',explore.search);
    explore.tags.forEach(id=>params.append('tag',id));
    for(const key of ['author','form','stage','topic'])if(explore[key])params.set(key,explore[key]);
    if(explore.view!=='landscape')params.set('view',explore.view);
    const hash='#explore'+(params.toString()?'?'+params:'');
    history.replaceState(null,'',hash);previousRoute=hash;lastListing=hash;
    if(defer)searchTimer=setTimeout(updateResults,100);else updateResults();
  }
  function toggleFavorite(id) {
    const w=workById(id);if(!w)return;
    const has=state.favorites.includes(id);state.favorites=has?state.favorites.filter(x=>x!==id):[id,...state.favorites];persist();
    if(location.hash.startsWith('#saved'))refreshPage();
    else $$('[data-action="favorite"]').filter(b=>b.dataset.id===id).forEach(b=>{b.classList.toggle('is-saved',!has);b.classList.toggle('active',!has);b.setAttribute('aria-pressed',String(!has));b.setAttribute('aria-label',(has?'收藏':'取消收藏')+w.title);b.innerHTML=icon('heart')+(b.classList.contains('btn')?(has?'收藏':'已收藏'):'');});
    if(!has)$$('[data-action="favorite"]').filter(b=>b.dataset.id===id).forEach(b=>Experience.stamp(b));
    toast(has?'已移出收藏。':'已把这篇文字留在收藏里。',()=>{state.favorites=state.favorites.filter(x=>x!==id);if(has)state.favorites.unshift(id);persist();refreshPage();});
  }
  function saveQuote(id,index) {
    const w=workById(id);if(!w||!w.lines[index])return;
    const existed=state.quotes.find(q=>q.workId===id&&q.index===index);
    if(existed)state.quotes=state.quotes.filter(q=>q.id!==existed.id);
    else state.quotes.push({id:id+'-'+index,workId:id,index,text:w.lines[index],title:w.title,author:authorOf(w).name,dynasty:authorOf(w).dynasty});
    persist();showLine(id,index);const button=$('[data-action="save-quote"]');button?.focus({preventScroll:true});if(!existed)Experience.stamp(button);toast(existed?'已移出句子收藏。':'这一句，留下了。');
  }
  const recentHome=[currentHome];
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action,id=b.dataset.id;
    try {
      switch(action){
        case 'content-updates':showContentUpdates();break;
        case 'keep-content':contentNotices=[];persist();closeModal();toast('已保留你的修改。');break;
        case 'use-published':confirmAction('采用这些内容的新版？','仅处理更新说明中的冲突字段，其他个人内容和收藏保留。新版已移除的条目也会随之移除。','confirm-published','');break;
        case 'confirm-published':library=Personal.usePublished(SEED,library,contentNotices);contentNotices=[];persist(true);closeModal();refreshPage();toast('已采用内置新版。');break;
        case 'close-modal':closeModal();break;
        case 'undo':if(undoAction){const undo=undoAction;undoAction=null;undo();$('#toast').classList.remove('show');}break;
        case 'filters':openFilters();break;
        case 'explore-view':explore.view=id;$$('[data-action="explore-view"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));$('#discovery-cards').dataset.view=explore.view;$('#discovery-cards').innerHTML=discoveryCards();filterChanged();break;
        case 'backup-settings':settings();$$('.settings-group',dialog).filter(x=>x.tagName==='DETAILS')[2].open=true;break;
        case 'dismiss-hint':state.hintDismissed=true;persist();$('.poem-hint')?.remove();break;
        case 'read-insight':{const module=$('[data-module="reading"]');if(module){module.open=true;Experience.unfold($('.module-body',module));module.scrollIntoView({block:'start',behavior:reducedMotion()?'auto':'smooth'});}break;}
        case 'share-tool':setShareTool(id,b.id==='adjust-quotes');break;
        case 'zoom-card':if(share?.dataUrl){openModal('长按图片，保存这一页','<img class="full-card-preview" src="'+share.dataUrl+'" alt="'+esc(share.title)+'诗卡">',true);}break;
        case 'about':about();break;
        case 'settings':settings();break;
        case 'search':if($('#search')){$('#search').focus();$('#search').scrollIntoView({block:'center',behavior:'auto'});}else{focusSearch=true;location.hash='#explore';}break;
        case 'open-letter':openLetter(id);break;
        case 'new-letters':prepareLetters(true);$('.letter-choices').innerHTML=letterChoices();$('#letter-result').innerHTML=letterResult();$('#letter-announcement').textContent='新的诗笺已备好，选一封拆开吧。';Experience.unfold($('.letter-choices'));break;
        case 'shuffle':shuffleWork();break;
        case 'favorite':toggleFavorite(id);break;
        case 'tag':location.hash='#explore?tag='+encodeURIComponent(id)+(rootTag(id)==='geography'?'&view=places':'');break;
        case 'filter':explore.tags=explore.tags.includes(id)?explore.tags.filter(x=>x!==id):[...explore.tags,id];filterChanged();if(b.getAttribute('aria-pressed')==='true'){Experience.play(b,[{transform:'scale(.97)'},{transform:'none'}]);Experience.scene($('.discovery-art',b));}break;
        case 'clear-topic':explore.topic='';filterChanged();break;
        case 'clear-filters':explore={search:'',tags:[],author:'',form:'',stage:'',topic:'',view:explore.view};$('#search').value='';['author','form','stage'].forEach(key=>{const field=$('#'+key+'-filter');if(field)field.value='';});filterChanged();break;
        case 'clear-search':explore.search='';$('#search').value='';filterChanged();$('#search').focus({preventScroll:true});break;
        case 'clear-condition':explore[id]='';if($('#'+id+'-filter'))$('#'+id+'-filter').value='';filterChanged();break;
        case 'line':showLine(id,Number(b.dataset.line),true);break;
        case 'close-line':{const line=$('.verse-line.picked');if(line){showLine(line.dataset.id,Number(line.dataset.line),true);line.focus({preventScroll:true});}break;}
        case 'save-quote':saveQuote(id,Number(b.dataset.line));break;
        case 'saved-tab':savedTab=id;refreshPage();break;
        case 'remove-quote':{const removed=state.quotes.find(q=>q.id===id);state.quotes=state.quotes.filter(q=>q.id!==id);persist();refreshPage();toast('已移出摘句。',()=>{if(removed&&!state.quotes.some(q=>q.id===id)){state.quotes.push(removed);persist();refreshPage();}});break;}
        case 'share':openShare(id);break;
        case 'share-line':openShare(id,Number(b.dataset.line));break;
        case 'share-saved-quote':{const q=state.quotes.find(q=>q.id===id);if(q)openShare(q.workId,null,null,q);break;}
        case 'share-mode':setShareChoice('mode',id);break;
        case 'share-theme':setShareChoice('theme',id);break;
        case 'share-ratio':setShareChoice('ratio',id);break;
        case 'download-image':saveShareImage();break;
        case 'edit-record':{const r=state.records.find(r=>r.id===id);if(r)openShare(r.workId,null,r);break;}
        case 'delete-record':confirmAction('删除这次阅读留念？','将移除这条记录，已经保存到设备的图片不受影响。','confirm-delete-record',id);break;
        case 'confirm-delete-record':state.records=state.records.filter(r=>r.id!==id);persist();closeModal();refreshPage();toast('已移除这次记录。');break;
        case 'module-up':{const i=library.modules.findIndex(m=>m.id===id);if(i>0){[library.modules[i-1],library.modules[i]]=[library.modules[i],library.modules[i-1]];persist(true);refreshSettings(0);refreshPage();}break;}
        case 'module-add':{const label=$('#new-module').value.trim();if(!label){toast('给新模块起个名字吧。');break;}library.modules.push({id:newId('module'),label,enabled:true});persist(true);refreshSettings(0);toast('已添加。点击“编辑”可为作品填写内容。');break;}
        case 'module-edit':editModule(id);break;
        case 'save-module':{const m=library.modules.find(m=>m.id===id),label=$('#edit-module-name').value.trim();if(!label){toast('模块名称不能为空。');break;}m.label=label;if($('#module-work')){const w=workById($('#module-work').value);w.extra=w.extra||{};w.extra[id]=$('#module-content').value;}persist(true);refreshSettings(0);refreshPage();toast('模块已保存。');break;}
        case 'module-delete':confirmAction('移除这个内容模块？','详情页将不再显示这个模块。原文和已有资料保留在内容包中，也可以先取消勾选来隐藏。','confirm-module-delete',id);break;
        case 'confirm-module-delete':library.modules=library.modules.filter(m=>m.id!==id);persist(true);refreshSettings(0);refreshPage();break;
        case 'tag-add':{const name=$('#new-tag').value.trim(),parent=$('#new-tag-parent').value||null;if(!name){toast('分类名称不能为空。');break;}if(library.tags.some(t=>t.name===name&&t.parent===parent)){toast('这个层级已有同名分类。');break;}library.tags.push({id:newId('tag'),name,parent});persist(true);refreshSettings(1);refreshPage();toast('分类已添加。');break;}
        case 'tag-edit':editTag(id);break;
        case 'save-tag':{const t=tagById(id),name=$('#edit-tag-name').value.trim(),parent=$('#edit-tag-parent').value||null;if(!name){toast('分类名称不能为空。');break;}if(parent&&descendant(parent,id)){toast('不能将分类移入自己的子分类。');break;}t.name=name;t.parent=parent;persist(true);refreshSettings(1);refreshPage();toast('分类已保存。');break;}
        case 'tag-delete':{const count=library.works.filter(w=>w.tags.includes(id)).length;confirmAction('移除这个分类？','将解除 '+count+' 篇作品的这个标签，子分类会移到上一层，作品正文不受影响。','confirm-tag-delete',id);break;}
        case 'confirm-tag-delete':{const t=tagById(id);library.tags.forEach(c=>{if(c.parent===id)c.parent=t.parent;});library.tags=library.tags.filter(t=>t.id!==id);library.works.forEach(w=>{w.tags=w.tags.filter(t=>t!==id);});explore.tags=explore.tags.filter(t=>t!==id);persist(true);refreshSettings(1);refreshPage();break;}
        case 'work-tags':editWorkTags($('#tag-work').value);break;
        case 'save-work-tags':{const w=workById(id);w.tags=$$('[data-work-tag]:checked').map(x=>x.dataset.workTag);persist(true);refreshSettings(1);refreshPage();toast('作品标签已保存。');break;}
        case 'export-backup':exportJson('backup');break;
        case 'export-content':exportJson('content');break;
        case 'export-html':exportHtml();break;
        case 'cancel-import':pendingImport=null;$('#import-preview').innerHTML='';$('#import-file').value='';break;
        case 'apply-import':if(pendingImport){library=pendingImport.library;state=pendingImport.state;contentNotices=pendingImport.kind==='backup'?pendingImport.notices:contentNotices;storageBlocked=false;state.favorites=state.favorites.filter(id=>workById(id));currentHome=workById(state.lastWork)?state.lastWork:library.works[0].id;explore.tags=explore.tags.filter(tagById);persist(true);serifSize();closeModal();previousRoute='';renderRoute();toast('导入完成。');}break;
      }
    }catch(error){toast('操作没有完成：'+error.message);console.error(error);}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='search'&&!event.isComposing){explore.search=el.value;filterChanged(true);}
    if(el.id==='font-size'){state.fontSize=Number(el.value);$('#font-output').textContent=el.value+' px';serifSize();persist();}
    if(share){const fields={'share-note':'note','share-signature':'signature','share-date':'date'};if(fields[el.id]){share[fields[el.id]]=el.value;scheduleShare();}}
  });
  document.addEventListener('compositionend',event=>{if(event.target.id==='search'){explore.search=event.target.value;filterChanged(true);}});
  document.addEventListener('change',event=>{
    const el=event.target;
    if(['author-filter','form-filter','stage-filter'].includes(el.id)){explore[el.id.split('-')[0]]=el.value;filterChanged();}
    if(el.dataset.moduleToggle){const m=library.modules.find(m=>m.id===el.dataset.moduleToggle);m.enabled=el.checked;persist(true);refreshPage();}
    if(el.id==='module-work'){$('#module-content').value=(workById(el.value).extra||{})[el.dataset.module]||'';}
    if(el.id==='import-file')previewImport(el.files[0]);
    if(share){
      if(el.dataset.quoteIndex!==undefined){const i=Number(el.dataset.quoteIndex);share.picked=el.checked?[...share.picked,i].sort((a,b)=>a-b):share.picked.filter(j=>j!==i);renderShare();}
      const flags={'share-show-date':'showDate','share-intro':'showIntro','share-record':'keepRecord'};
      if(flags[el.id]){share[flags[el.id]]=el.checked;renderShare();}
    }
  });
  window.addEventListener('hashchange',navigateRoute);
  if(window.visualViewport){const syncKeyboard=()=>{const offset=Math.max(0,innerHeight-visualViewport.height-visualViewport.offsetTop);document.body.style.setProperty('--keyboard-offset',offset+'px');document.body.classList.toggle('keyboard-open',offset>120);};visualViewport.addEventListener('resize',syncKeyboard);visualViewport.addEventListener('scroll',syncKeyboard);}
  if(document.fonts)document.fonts.ready.then(()=>{if($('#share-image')){shareKey='';renderShare();renderTemplatePreviews();}});
  if(migrated)persist();
  serifSize();renderRoute();
  if(!storageAvailable)setTimeout(()=>toast('本地记录暂时无法读取，原数据已保留。可在设置中导入已有备份恢复。'),500);

})();
