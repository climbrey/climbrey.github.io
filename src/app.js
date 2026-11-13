(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const KEY = 'shanyue.reading.v1';
  const SEED = JSON.parse($('#library-data').textContent);
  const initial = JSON.parse($('#initial-state').textContent);
  let library = clone(SEED);
  let state = {favorites:[], quotes:[], records:[], fontSize:23, lastWork:'niaomingjian', ...initial};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) { if (saved.library) library = validateLibrary(saved.library); state = normalizeState(saved.state); }
  } catch (error) { storageAvailable = false; }
  let currentHome = library.works.some(w => w.id === state.lastWork) ? state.lastWork : library.works[0].id;
  let explore = {search:'',tags:[],author:'',form:'',stage:'',topic:''};
  let savedTab = 'works', lastListing = '#home', previousRoute = '', toastTimer;
  const positions = new Map(), expanded = new Map();
  let share = null, pendingImport = null, returnFocus = null;
  const dialog = $('#modal');
  const workById = id => library.works.find(w => w.id === id);
  const authorOf = work => library.authors[work.author];
  const tagById = id => library.tags.find(t => t.id === id);
  function localDate() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  const paths = {
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    share:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 15h8M8 11h5M8 2v5m8-5v5"/>',
    shuffle:'<path d="m17 3 4 4-4 4M3 7h18M7 21l-4-4 4-4m14 4H3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.arrow)+'</svg>';

  function toast(message) {
    const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove('show'),3300);
  }
  function persist() {
    try { localStorage.setItem(KEY,JSON.stringify({version:1,library,state})); storageAvailable=true; return true; }
    catch(error) { storageAvailable=false; toast('浏览器暂时无法保存，请在设置中导出备份。'); return false; }
  }
  function serifSize() { document.documentElement.style.setProperty('--reading-size',state.fontSize+'px'); }
  function scene(type='mountain', id='scene') {
    const palettes={moon:['#e4e9dd','#a6b9a9','#668374','#345b4d'],mountain:['#e6ecdf','#b5c7b1','#7d9b87','#4d7460'],water:['#e5ece1','#b6cec4','#80a799','#527f70'],rain:['#dfe5df','#acbdb1','#7a9986','#526c60'],snow:['#eef0e9','#d4dcd4','#a7b8ac','#718a7e'],bamboo:['#e5ebda','#b5c9a4','#799b74','#4b7658'],flower:['#ececde','#cbd2ae','#a3b58e','#728b65']};
    const p=palettes[type]||palettes.mountain;
    let detail='';
    if(type==='rain') for(let i=0;i<18;i++) detail+='<path d="M'+(30+i*29)+' '+(30+i%4*28)+'l-18 65" stroke="#688979" stroke-opacity=".13" stroke-width="1"/>';
    if(type==='snow') for(let i=0;i<20;i++) detail+='<circle cx="'+(i*47%520)+'" cy="'+(40+i*31%300)+'" r="'+(1+i%3)+'" fill="#fff" opacity=".75"/>';
    if(type==='bamboo') detail+='<g stroke="#416348" fill="#567d50" opacity=".28"><path d="M430 490 443 140M469 500 472 220" stroke-width="3"/><path d="M441 245q-65-74-64-23 40 35 64 23m0-45q50-69 57-37-18 33-57 37m30 135q-66-46-58-11 31 25 58 11"/></g>';
    if(type==='flower') detail+='<g fill="#b98577" opacity=".45"><circle cx="408" cy="288" r="7"/><circle cx="418" cy="282" r="6"/><circle cx="422" cy="295" r="7"/><circle cx="410" cy="301" r="6"/><circle cx="454" cy="250" r="5"/></g><path d="m390 500 23-212 41-38" fill="none" stroke="#668164" opacity=".3" stroke-width="2"/>';
    return '<svg viewBox="0 0 520 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="'+id+'-bg" x2="0" y2="1"><stop stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient></defs><rect width="520" height="500" fill="url(#'+id+'-bg)"/><circle cx="370" cy="114" r="49" fill="#fffdf1" opacity=".85"/><circle cx="370" cy="114" r="61" fill="none" stroke="#fffef4" opacity=".22"/><path d="M-60 324 66 219q18-17 37 3l53 61 75-111q12-23 31-4l93 121 66-67 139 132V500H-60Z" fill="'+p[1]+'"/><path d="M-20 373 91 290q20-17 36 3l77 84 90-130q19-24 39-4l135 128 86-54v200H-20Z" fill="'+p[2]+'" opacity=".65"/><path d="M-30 435q70-53 151-28t146-5q93-70 189-27t90 36v120H-30Z" fill="'+p[3]+'" opacity=".72"/><path d="M180 356q59 17 112 4t145 16M86 391q81 12 127 6" stroke="#f9f8e9" opacity=".24" fill="none"/><path d="M80 142q8-8 15 0 7-8 14 0m-37 13q6-6 12 0 5-6 10 0" stroke="'+p[3]+'" stroke-width="1.3" fill="none" opacity=".38"/>'+detail+'<path d="M0 475q151-42 287-6t233-18v49H0Z" fill="'+p[3]+'" opacity=".5"/></svg>';
  }
  function tagButton(id) { const t=tagById(id);return t?'<button class="tag" data-action="tag" data-id="'+esc(id)+'">'+esc(t.name)+'</button>':''; }
  function favoriteButton(w,tile=false) { const active=state.favorites.includes(w.id);return '<button class="'+(tile?'icon-btn tile-save':'btn')+(active?' is-saved active':'')+'" data-action="favorite" data-id="'+esc(w.id)+'" aria-label="'+(active?'取消收藏':'收藏')+esc(w.title)+'" aria-pressed="'+active+'">'+icon('heart')+(tile?'':(active?'已收藏':'收藏'))+'</button>'; }
  function tile(w,index=0) {
    const a=authorOf(w), q=w.quote.map(i=>w.lines[i]).join('\n');
    return '<article class="work-tile"><a class="tile-link" href="#work/'+esc(w.id)+'"><h3>'+esc(w.title)+'</h3><p class="tile-author">'+esc(a.dynasty)+' · '+esc(a.name)+'</p><p class="tile-quote">'+esc(q)+'</p></a>'+favoriteButton(w,true)+'<div class="tile-bottom"><span>'+esc((tagById(w.tags[0])||{}).name||w.form)+' · '+esc((tagById(w.tags[1])||{}).name||'诗意')+'</span><a href="#work/'+esc(w.id)+'" aria-label="阅读'+esc(w.title)+'">读一读 ↗</a></div></article>';
  }
  function home() {
    const w=workById(currentHome)||library.works[0],a=authorOf(w);
    const isLong=w.lines.length>8||w.lines.join('').length>100;
    const lines=isLong?w.quote.map(i=>w.lines[i]):w.lines;
    const motifs=[['wind','风','风起有声','#e7eadd'],['flower','花','花开有时','#eee4db'],['snow','雪','天地留白','#e5e9e4'],['moon','月','千里同光','#e9e8d9'],['mountain','山','山中有回响','#dfe8db'],['rain','雨','听雨片刻','#dfe8e5']];
    const others=library.works.filter(x=>x.id!==w.id).slice(0,3);
    return '<section class="home-intro"><div><p class="eyebrow">一页诗文 · 一次相逢</p><h1>在字里行间，遇见天地。</h1></div><p class="intro-side">不妨慢一点<br>让一首诗，停在今天</p></section><section class="reading-card" aria-label="随读作品"><div class="hero-copy"><p class="hero-meta">此刻，读一首'+(isLong?' · 节选':'')+'</p><h2>'+esc(w.title)+'</h2><p class="byline">'+esc(a.dynasty)+' · '+esc(a.name)+'</p><div class="hero-verse">'+lines.map(l=>'<p>'+esc(l)+'</p>').join('')+'</div><div class="hero-tags">'+w.tags.slice(0,3).map(tagButton).join('')+'</div><div class="hero-actions"><a class="btn primary" href="#work/'+esc(w.id)+'">读深一点 '+icon('arrow')+'</a>'+favoriteButton(w,true).replace('icon-btn tile-save','icon-btn')+'<button class="icon-btn" data-action="share" data-id="'+esc(w.id)+'" aria-label="生成分享卡" title="生成分享卡">'+icon('share')+'</button><button class="text-btn shuffle" data-action="shuffle">'+icon('shuffle')+' 换一首</button></div></div><div class="hero-art">'+scene(w.scene,'hero')+'<span class="art-label">'+esc(w.intro)+'</span><span class="art-foot">山水有相逢</span><span class="art-seal">山月</span></div></section><section><div class="section-heading"><div><h2>循着一缕诗意</h2><p>从眼前的景，走进心里的远方。</p></div><a class="text-btn" href="#explore">随心寻篇 ↗</a></div><div class="motifs">'+motifs.map(([id,name,note,color])=>'<button class="motif" data-action="tag" data-id="'+id+'"><span class="motif-orb" style="--orb:'+color+'">'+name+'</span><span class="motif-name">'+name+'<span class="motif-note">'+note+'</span></span></button>').join('')+'</div></section><section><div class="section-heading"><div><h2>几条小径，通往诗里</h2><p>同一种景物，也有不同的心事。</p></div></div><div class="topics">'+library.topics.map((t,i)=>'<a class="topic-card" href="#explore?topic='+encodeURIComponent(t.id)+'">'+scene(t.scene,'topic'+i)+'<h3>'+esc(t.name)+'</h3><p>'+esc(t.subtitle)+'</p><span class="topic-arrow">↗</span></a>').join('')+'</div></section><section><div class="section-heading"><h2>不妨，再读一篇</h2><a class="text-btn" href="#explore">全部作品 ↗</a></div><div class="work-grid">'+others.map(tile).join('')+'</div></section>';
  }
  function rootTag(id) { let tag=tagById(id),n=0;while(tag&&tag.parent&&n++<30)tag=tagById(tag.parent);return tag?tag.id:id; }
  function descendant(id,parent) { let t=tagById(id),n=0;while(t&&n++<30){if(t.id===parent)return true;t=tagById(t.parent);}return false; }
  function filteredWorks() {
    const groups={};explore.tags.forEach(id=>(groups[rootTag(id)]||(groups[rootTag(id)]=[])).push(id));
    const topic=library.topics.find(t=>t.id===explore.topic),q=explore.search.trim().toLocaleLowerCase();
    return library.works.filter(w=>{
      const a=authorOf(w),searchText=[w.title,a.name,a.dynasty,w.form,w.lines.join(''),w.tags.map(t=>(tagById(t)||{}).name).join(' ')].join(' ').toLocaleLowerCase();
      return (!q||searchText.includes(q))&&(!explore.author||w.author===explore.author)&&(!explore.form||w.form===explore.form)&&(!explore.stage||w.stage.includes(explore.stage))&&(!topic||topic.works.includes(w.id))&&Object.values(groups).every(ids=>ids.some(id=>w.tags.some(t=>descendant(t,id))));
    });
  }
  function filterRow(root) {
    const r=tagById(root);if(!r)return '';
    let members=library.tags.filter(t=>t.parent===root);if(!members.length)members=[r];
    const branch=(t,depth=0)=>'<button class="filter-chip '+(depth?'filter-child ':'')+(explore.tags.includes(t.id)?'selected':'')+'" data-action="filter" data-id="'+esc(t.id)+'" aria-pressed="'+explore.tags.includes(t.id)+'">'+(depth?'· ':'')+esc(t.name)+'</button>'+library.tags.filter(c=>c.parent===t.id).map(c=>branch(c,depth+1)).join('');
    return '<div class="filter-row"><span class="filter-label">'+esc(r.name)+'</span><div class="filter-options">'+members.map(t=>branch(t)).join('')+'</div></div>';
  }
  function explorePage() {
    const topic=library.topics.find(t=>t.id===explore.topic);
    return '<section><p class="eyebrow">循景寻情 · 自在漫游</p><h1 class="page-title">'+esc(topic?topic.name:'寻一篇，合此刻心意。')+'</h1><p class="page-intro">'+esc(topic?topic.subtitle:'一轮月，一阵风，或是一个记得的名字。')+'</p><label class="search-field">'+icon('search')+'<input id="search" type="search" value="'+esc(explore.search)+'" placeholder="搜篇名、诗句、作者……" aria-label="搜索篇名、诗句、作者"></label><div class="filter-panel">'+filterRow('sky')+filterRow('earth')+filterRow('plants')+filterRow('feeling')+'<details id="more-filters"><summary class="filter-more">更多线索：题材、流派、手法、作者</summary>'+library.tags.filter(t=>!t.parent&&!['feeling'].includes(t.id)).map(t=>filterRow(t.id)).join('')+'<div class="row"><label class="field"><span>作者</span><select id="author-filter"><option value="">所有作者</option>'+Object.entries(library.authors).map(([id,a])=>'<option value="'+esc(id)+'" '+(explore.author===id?'selected':'')+'>'+esc(a.dynasty+' · '+a.name)+'</option>').join('')+'</select></label><label class="field"><span>文体</span><select id="form-filter"><option value="">所有文体</option>'+Array.from(new Set(library.works.map(w=>w.form))).map(f=>'<option '+(explore.form===f?'selected':'')+'>'+esc(f)+'</option>').join('')+'</select></label><label class="field"><span>学段标签（可选）</span><select id="stage-filter"><option value="">不限</option>'+['小学','初中','高中'].map(s=>'<option '+(s===explore.stage?'selected':'')+'>'+s+'</option>').join('')+'</select></label></div></details></div><div id="explore-results">'+exploreResults()+'</div></section>';
  }
  function exploreResults() {
    const works=filteredWorks();
    const filters=explore.tags.map(id=>'<button class="tag" data-action="filter" data-id="'+esc(id)+'">'+esc((tagById(id)||{}).name)+' ×</button>').join('');
    return '<div class="selected-filters">'+filters+(explore.topic?'<button class="tag" data-action="clear-topic">当前专题 ×</button>':'')+'</div><div class="result-heading"><span>'+works.length+' 篇文字，等你停留</span><button class="text-btn" data-action="clear-filters">重置筛选</button></div>'+(works.length?'<div class="work-grid">'+works.map(tile).join('')+'</div>':'<div class="empty"><h2>这条小径，暂时还没有作品。</h2><p>试着少选一个条件，或换个词找找。</p><button class="btn" data-action="clear-filters">看看全部作品</button></div>');
  }
  function updateResults() { const target=$('#explore-results');if(target)target.innerHTML=exploreResults();$$('[data-action="filter"]').forEach(b=>{const active=explore.tags.includes(b.dataset.id);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}); }
  function moduleContent(w,m) {
    const a=authorOf(w);
    switch(m.id){
      case 'notes':return '<dl>'+w.notes.map(n=>'<dt>'+esc(n.q)+'</dt><dd>'+esc(n.text)+'</dd>').join('')+'</dl>';
      case 'author':return '<p class="author-life">'+esc(a.name)+' · '+esc(a.life)+'</p><p>'+esc(a.bio)+'</p><a class="text-btn" href="#explore?author='+encodeURIComponent(w.author)+'">再读读'+esc(a.name)+'的作品 ↗</a>';
      case 'background':return '<p>'+esc(w.background)+'</p>';
      case 'reading':return w.reading.map(r=>'<h4>'+esc(r.title)+'</h4><blockquote>'+esc(r.quote)+'</blockquote><p>'+esc(r.text)+'</p>').join('');
      case 'thought':return '<p>'+esc(w.thought)+'</p>';
      case 'sources':return w.sources.map(s=>'<p>'+esc(s)+'</p>').join('')+'<p class="help">文字与解读可以分别阅读。存疑处保留说明，欢迎对照原作细看。</p>';
      default:return w.extra&&w.extra[m.id]?'<p style="white-space:pre-wrap">'+esc(w.extra[m.id])+'</p>':'';
    }
  }
  function detail(w) {
    const a=authorOf(w),isProse=w.form.includes('古文');
    const open=expanded.get(w.id)||[];
    return '<div class="breadcrumb"><a href="'+esc(lastListing)+'">← 回到刚才那一页</a><span>／</span><span>'+esc(w.title)+'</span></div><div class="detail-layout"><article class="poem-page"><header class="detail-heading"><h1>'+esc(w.title)+'</h1><p class="byline">'+esc(a.dynasty)+' · <a href="#explore?author='+encodeURIComponent(w.author)+'">'+esc(a.name)+'</a> · '+esc(w.form)+'</p></header>'+(w.preface?'<p class="work-preface">'+esc(w.preface)+'</p>':'')+'<div class="poem-lines '+(isProse?'prose':'')+'">'+w.lines.map((line,i)=>'<button class="verse-line" data-action="line" data-id="'+esc(w.id)+'" data-line="'+i+'" aria-label="查看这句：'+esc(line)+'">'+esc(line)+'</button>').join('')+'</div><p class="poem-hint">轻点一句，看看字词，或把它留下。</p><div id="line-note"></div><div class="detail-actions">'+favoriteButton(w)+'<button class="btn primary" data-action="share" data-id="'+esc(w.id)+'">'+icon('share')+' 生成分享卡</button></div><div class="details-modules">'+library.modules.filter(m=>m.enabled).map(m=>{const c=moduleContent(w,m);return c?'<details class="content-module" data-module="'+esc(m.id)+'" '+(open.includes(m.id)?'open':'')+'><summary>'+esc(m.label)+'</summary><div class="module-body">'+c+'</div></details>':'';}).join('')+'</div></article><aside class="detail-aside"><div class="aside-art">'+scene(w.scene,'detail')+'</div><h2>沿着这些线索</h2><div class="tag-list">'+w.tags.map(tagButton).join('')+'</div><h2>诗意，还有回响</h2>'+(w.related||[]).filter(r=>workById(r.id)).map(r=>'<a class="related-item" href="#work/'+esc(r.id)+'"><h3>'+esc(workById(r.id).title)+' ↗</h3><p>'+esc(r.reason)+'</p></a>').join('')+(w.stage.length?'<p class="stage-note">学段标签'+w.stage.map(s=>'<span>'+esc(s)+'</span>').join('')+'</p>':'')+'</aside></div>';
  }
  function showLine(id,index) {
    const w=workById(id);if(!w||!w.lines[index])return;
    $$('.verse-line').forEach(b=>b.classList.toggle('picked',Number(b.dataset.line)===index));
    const notes=w.notes.filter(n=>w.lines[index].includes(n.q));
    const saved=state.quotes.some(q=>q.workId===id&&q.index===index);
    $('#line-note').innerHTML='<aside class="line-note"><p class="line-title">'+esc(w.lines[index])+'</p>'+notes.map(n=>'<p><strong>'+esc(n.q)+'：</strong>'+esc(n.text)+'</p>').join('')+'<div class="row"><button class="btn small" data-action="save-quote" data-id="'+esc(id)+'" data-line="'+index+'">'+icon('heart')+(saved?'已收藏这句':'收藏这句')+'</button><button class="btn small" data-action="share-line" data-id="'+esc(id)+'" data-line="'+index+'">'+icon('share')+' 把这句制成卡片</button></div></aside>';
  }
  function savedPage() {
    let body='';
    if(savedTab==='works'){const works=state.favorites.map(workById).filter(Boolean);body=works.length?'<div class="work-grid">'+works.map(tile).join('')+'</div>':emptySaved('还没有收藏的作品。','遇见喜欢的文字，轻点心形就能留下。');}
    if(savedTab==='quotes'){body=state.quotes.length?state.quotes.map(q=>{const w=workById(q.workId);return '<article class="quote-card"><blockquote>'+esc(q.text)+'</blockquote><p class="source">'+esc(q.author)+' · '+esc(q.title)+'</p><div class="row">'+(w?'<a class="btn small" href="#work/'+esc(w.id)+'">回到原作</a><button class="btn small" data-action="share-saved-quote" data-id="'+esc(q.id)+'">生成分享卡</button>':'')+'<button class="text-btn" data-action="remove-quote" data-id="'+esc(q.id)+'">移出收藏</button></div></article>';}).join(''):emptySaved('有些句子，值得留在身边。','打开作品，轻点喜欢的那一句。');}
    if(savedTab==='records'){body=state.records.length?state.records.slice().reverse().map(r=>'<article class="quote-card"><p class="eyebrow">'+esc(r.date||'阅读留念')+'</p><blockquote>'+esc(r.text)+'</blockquote><p class="source">'+esc(r.author)+' · '+esc(r.title)+'</p>'+(r.note?'<p class="note">'+esc(r.note)+'</p>':'')+'<div class="row"><button class="btn small" data-action="edit-record" data-id="'+esc(r.id)+'">编辑 / 再次制卡</button><button class="text-btn" data-action="delete-record" data-id="'+esc(r.id)+'">删除记录</button></div></article>').join(''):emptySaved('给某一天，留一页诗意。','制卡时勾选“同时记下这次阅读”，就能在这里重温。');}
    return '<p class="eyebrow">文字有归处 · 喜欢有回声</p><h1 class="page-title">把喜欢的，留在身边。</h1><p class="page-intro">不赶路的时候，回来读读。</p><div class="collection-tabs" aria-label="收藏类型">'+[['works','作品'],['quotes','句子'],['records','阅读留念']].map(([id,label])=>'<button class="filter-chip '+(id===savedTab?'selected':'')+'" data-action="saved-tab" data-id="'+id+'" aria-pressed="'+(id===savedTab)+'">'+label+'</button>').join('')+'</div>'+body;
  }
  function emptySaved(title,text) { return '<div class="empty"><h2>'+title+'</h2><p>'+text+'</p><a class="btn" href="#explore">去寻一篇 '+icon('arrow')+'</a></div>'; }
  function renderRoute() {
    const hash=location.hash||'#home';
    if(previousRoute){positions.set(previousRoute,window.scrollY);const id=previousRoute.split('/')[1];if(id)expanded.set(id,$$('.content-module[open]').map(d=>d.dataset.module));}
    const [route,query='']=hash.slice(1).split('?');const params=new URLSearchParams(query);
    if(route!=='home'&&!route.startsWith('work/'))lastListing=hash;else if(route==='home')lastListing='#home';
    let html='';
    if(route==='explore'){
      if(params.has('topic'))explore={search:'',tags:[],author:'',form:'',stage:'',topic:params.get('topic')};
      if(params.has('author'))explore={search:'',tags:[],author:params.get('author'),form:'',stage:'',topic:''};
      if(params.has('tag'))explore={search:'',tags:[params.get('tag')].filter(tagById),author:'',form:'',stage:'',topic:''};
      html=explorePage();
    }else if(route==='saved')html=savedPage();
    else if(route.startsWith('work/')){const w=workById(decodeURIComponent(route.slice(5)));if(w){state.lastWork=w.id;currentHome=w.id;persist();html=detail(w);}else html=emptySaved('这篇作品暂时不在小集中。','可以回到寻篇，看看其他作品。');}
    else html=home();
    $('#app').innerHTML='<div class="fade-in">'+html+'</div>';
    $$('[data-nav]').forEach(a=>{const active=a.dataset.nav===(route==='explore'?'explore':route==='saved'?'saved':'home');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=route.startsWith('work/')&&workById(route.slice(5))?workById(route.slice(5)).title+' · 山月':'山月 · 在字里行间，遇见天地';
    previousRoute=hash;requestAnimationFrame(()=>window.scrollTo(0,positions.get(hash)||0));
  }
  function refreshPage() { const y=window.scrollY;previousRoute='';renderRoute();requestAnimationFrame(()=>window.scrollTo(0,y)); }
  function openModal(title,body,small=false) {
    returnFocus=document.activeElement;dialog.className=small?'small-dialog':'';
    dialog.innerHTML='<header class="modal-header"><h2 id="modal-title">'+esc(title)+'</h2><button class="icon-btn" data-action="close-modal" aria-label="关闭">'+icon('close')+'</button></header><div class="modal-body">'+body+'</div>';
    if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';
  }
  function closeModal() { dialog.close(); }
  dialog.addEventListener('close',()=>{document.body.style.overflow='';share=null;pendingImport=null;if(returnFocus&&returnFocus.isConnected)returnFocus.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});

  function openShare(workId,lineIndex=null,record=null,quote=null) {
    const w=workById(workId);if(!w&&!record&&!quote){toast('暂时找不到这篇作品。');return;}
    const a=w?authorOf(w):{};
    share={workId,recordId:record?record.id:null,title:record?record.title:quote?quote.title:w.title,author:record?record.author:quote?quote.author:a.name,dynasty:record?record.dynasty:quote?(quote.dynasty||a.dynasty||''):a.dynasty,lines:record?record.lines.slice():quote?[quote.text]:w.lines.slice(),picked:record?record.picked.slice():quote?[0]:lineIndex!==null?[lineIndex]:w.quote.slice(),intro:record?record.intro:quote?'':w.intro,excerpt:record?!!record.excerpt:!!quote,theme:record?record.theme:'paper',ratio:record?record.ratio:'portrait',mode:record?record.mode:'quote',date:record?record.date:localDate(),showDate:record?record.showDate:false,note:record?record.note:'',signature:record?record.signature:'',showIntro:record?record.showIntro:false,keepRecord:!!record,dataUrl:null};
    openModal('把诗意，留成一张卡片','<div class="share-layout"><div class="share-preview"><img id="share-image" alt="分享卡图片预览"><p class="preview-caption">预览即导出效果 · 可保存高清图片</p><p id="share-error" class="error" role="alert" hidden></p></div><div class="share-controls"><div class="field"><span>卡片内容</span><div class="segmented">'+[['quote','摘句'],['whole','作品'],['memory','阅读留念']].map(([id,label])=>'<button data-action="share-mode" data-id="'+id+'" class="'+(share.mode===id?'active':'')+'">'+label+'</button>').join('')+'</div></div><div id="quote-picks" class="quote-select" '+(share.mode==='whole'?'hidden':'')+'>'+share.lines.map((line,i)=>'<label class="check"><input type="checkbox" data-quote-index="'+i+'" '+(share.picked.includes(i)?'checked':'')+'><span>'+esc(line)+'</span></label>').join('')+'</div><div class="field"><span>纸上的风景</span><div class="segmented">'+[['paper','素笺','#eee8d8'],['night','月夜','#253d3d'],['botanic','草木','#c3d3ad']].map(([id,label,color])=>'<button data-action="share-theme" data-id="'+id+'" class="'+(share.theme===id?'active':'')+'"><i class="theme-swatch" style="background:'+color+'"></i>'+label+'</button>').join('')+'</div></div><div class="field"><span>画幅</span><div class="segmented">'+[['portrait','竖版 3:4'],['square','方形 1:1']].map(([id,label])=>'<button data-action="share-ratio" data-id="'+id+'" class="'+(share.ratio===id?'active':'')+'">'+label+'</button>').join('')+'</div></div><label class="field"><span>写下一句感受 <small>（可选，最多 80 字）</small></span><textarea id="share-note" maxlength="80" placeholder="今天，这一句让我想到……">'+esc(share.note)+'</textarea></label><div class="row"><label class="field" style="flex:1;min-width:110px"><span>署名（可选）</span><input id="share-signature" maxlength="18" value="'+esc(share.signature)+'" placeholder="留个名字"></label><label class="field" style="flex:1;min-width:125px"><span>日期</span><input id="share-date" type="date" value="'+esc(share.date)+'"></label></div><label class="check"><input id="share-show-date" type="checkbox" '+(share.showDate?'checked':'')+'>在卡片上显示日期</label><label class="check"><input id="share-intro" type="checkbox" '+(share.showIntro?'checked':'')+'>附上一句赏读</label><label class="check"><input id="share-record" type="checkbox" '+(share.keepRecord?'checked':'')+'>同时记下这次阅读，留在收藏里</label><button class="btn primary save-image" data-action="download-image">'+icon('download')+' 保存高清图片</button><p class="help">保存后可自行分享朋友圈。手机若未直接下载，可长按上方图片保存。图片在本地生成。</p></div></div>');
    renderShare();
    if(document.fonts)document.fonts.ready.then(()=>{if(share)renderShare();});
  }
  function wrapCanvas(ctx,text,maxWidth) {
    const chars=Array.from(text);const lines=[];let current='';
    const noStart=/^[，。！？；：、）》」』】…,.!?;:]/;
    chars.forEach(ch=>{if(ch==='\n'){lines.push(current);current='';return;}if(current&&ctx.measureText(current+ch).width>maxWidth){if(noStart.test(ch)){const arr=Array.from(current),last=arr.pop();lines.push(arr.join(''));current=last+ch;}else{lines.push(current);current=ch;}}else current+=ch;});
    if(current)lines.push(current);return lines;
  }
  function renderShare() {
    if(!share||!$('#share-image'))return;
    const img=$('#share-image'),error=$('#share-error'),save=$('[data-action="download-image"]');
    const chosen=share.mode==='whole'?share.lines:share.lines.filter((_,i)=>share.picked.includes(i));
    const fail=message=>{share.dataUrl=null;img.hidden=true;img.removeAttribute('src');error.hidden=false;error.textContent=message;save.disabled=true;};
    if(!chosen.length){fail('先选一句喜欢的文字，再生成卡片。');return;}
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=share.ratio==='square'?1080:1440;
    const ctx=canvas.getContext('2d');if(!ctx){fail('这个浏览器暂时不能生成图片，请换一个浏览器打开。');return;}
    const W=canvas.width,H=canvas.height;
    const colors={paper:{bg:'#f7f3e9',ink:'#344a3b',muted:'#89917c',accent:'#a66c50',art:'#b9c4a8'},night:{bg:'#203b3b',ink:'#f3eedc',muted:'#b4c4b8',accent:'#dbc18d',art:'#44635c'},botanic:{bg:'#eaf0de',ink:'#385b3c',muted:'#7e9473',accent:'#a47655',art:'#aac397'}}[share.theme];
    const serif='"Songti SC", "STSong", "SimSun", serif';
    const sans='"Microsoft YaHei", sans-serif';
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=colors.muted;ctx.globalAlpha=.23;ctx.lineWidth=1;ctx.strokeRect(42,42,W-84,H-84);ctx.globalAlpha=1;
    ctx.save();ctx.globalAlpha=share.theme==='night'?.75:.35;ctx.fillStyle=share.theme==='night'?'#e9dfbf':colors.art;ctx.beginPath();ctx.arc(875,180,share.theme==='night'?49:63,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.globalAlpha=.2;ctx.fillStyle=colors.art;ctx.beginPath();ctx.moveTo(43,H-180);ctx.bezierCurveTo(220,H-260,370,H-85,540,H-170);ctx.bezierCurveTo(720,H-275,900,H-170,W-43,H-210);ctx.lineTo(W-43,H-43);ctx.lineTo(43,H-43);ctx.fill();ctx.restore();
    if(share.theme==='botanic'){ctx.save();ctx.strokeStyle=colors.muted;ctx.fillStyle=colors.art;ctx.globalAlpha=.45;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(903,H-65);ctx.quadraticCurveTo(917,H-260,850,H-380);ctx.stroke();for(let i=0;i<5;i++){const x=895-i*8,y=H-130-i*44;ctx.beginPath();ctx.ellipse(x+(i%2?19:-17),y,31,9,i%2?-.7:.6,0,Math.PI*2);ctx.fill();}ctx.restore();}
    ctx.fillStyle=colors.muted;ctx.font='22px '+sans;ctx.fillText(share.mode==='memory'?'一日一笺 · 阅读留念':'字里行间 · '+(share.mode==='whole'?'一篇好文字':'一瞬诗意'),96,104);
    ctx.fillStyle=colors.ink;ctx.font='48px '+serif;
    const titleLines=wrapCanvas(ctx,share.title,770);titleLines.forEach((line,i)=>ctx.fillText(line,96,183+i*65));
    const bylineY=183+(titleLines.length-1)*65+56;
    ctx.font='25px '+sans;ctx.fillStyle=colors.muted;
    const excerpt=share.excerpt||(share.mode!=='whole'&&chosen.length<share.lines.length);
    ctx.fillText(share.dynasty+' · '+share.author+(excerpt?'  /  节选':''),96,bylineY);
    const extras=[];ctx.font='29px '+serif;
    if(share.showIntro&&share.intro)extras.push({label:'赏读',lines:wrapCanvas(ctx,share.intro,850)});
    if(share.note.trim())extras.push({label:'随记',lines:wrapCanvas(ctx,share.note.trim(),850)});
    const extraHeight=extras.reduce((n,e)=>n+42+e.lines.length*47+25,0);
    const top=bylineY+80,bottom=H-145-extraHeight-30,available=bottom-top;
    let size=chosen.join('').length<45?72:62,rendered=[];
    while(size>=46){ctx.font=size+'px '+serif;rendered=chosen.flatMap(line=>wrapCanvas(ctx,line,850));if(rendered.length*size*1.62<=available)break;size-=2;}
    if(size<46){fail('这段文字有些长。请减少选句或感想，或换成竖版，让每个字都清楚。');return;}
    const leading=size*1.62,total=rendered.length*leading;let y=top+Math.max(0,(available-total)/2)+size;
    ctx.fillStyle=colors.ink;ctx.font=size+'px '+serif;
    rendered.forEach(line=>{ctx.fillText(line,110,y);y+=leading;});
    if(extras.length){y=H-145-extraHeight;ctx.strokeStyle=colors.muted;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(96,y-23);ctx.lineTo(186,y-23);ctx.stroke();ctx.globalAlpha=1;extras.forEach(extra=>{ctx.fillStyle=colors.accent;ctx.font='20px '+sans;ctx.fillText(extra.label,96,y+17);y+=42;ctx.fillStyle=colors.ink;ctx.font='29px '+serif;extra.lines.forEach(line=>{ctx.fillText(line,96,y+25);y+=47;});y+=25;});}
    ctx.font='22px '+sans;ctx.fillStyle=colors.muted;
    if(share.showDate&&share.date)ctx.fillText(share.date.replace(/-/g,' . '),96,H-88);
    if(share.signature.trim()){ctx.textAlign='right';ctx.fillText(share.signature.trim(),W-96,H-88);ctx.textAlign='left';}
    try {share.dataUrl=canvas.toDataURL('image/png');img.src=share.dataUrl;img.hidden=false;img.alt=share.title+'分享卡：'+chosen.join('');error.hidden=true;save.disabled=false;}
    catch(error){fail('图片生成失败，请重试或切换样式。');}
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
    $$('[data-action="share-'+kind+'"]').forEach(b=>b.classList.toggle('active',b.dataset.id===id));
    if(kind==='mode'){$('#quote-picks').hidden=id==='whole';if(id==='memory'){share.showDate=true;$('#share-show-date').checked=true;}}
    renderShare();
  }

  function settings() {
    const parents='<option value="">顶级分类</option>'+library.tags.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
    openModal('阅读与内容设置','<p class="modal-subtitle">按自己的喜好，整理这本小集。</p><label class="field"><span>原文字号 <output id="font-output">'+state.fontSize+' px</output></span><input id="font-size" type="range" min="18" max="30" value="'+state.fontSize+'"></label><details class="settings-group"><summary>内容模块</summary><p class="help">决定详情里显示什么，以及它们的顺序。</p><div class="manager-list">'+library.modules.map((m,i)=>'<div class="manage-row module-row"><label class="check"><input type="checkbox" data-module-toggle="'+esc(m.id)+'" '+(m.enabled?'checked':'')+'><span>'+esc(m.label)+'</span></label><button class="btn small" data-action="module-up" data-id="'+esc(m.id)+'" '+(i===0?'disabled':'')+' aria-label="上移'+esc(m.label)+'">↑</button><button class="btn small" data-action="module-edit" data-id="'+esc(m.id)+'">编辑</button><button class="btn small" data-action="module-delete" data-id="'+esc(m.id)+'">移除</button></div>').join('')+'</div><div class="manage-row"><input id="new-module" placeholder="新模块名称，如：一处地名" maxlength="24" aria-label="新模块名称"><button class="btn small" data-action="module-add">添加模块</button></div></details><details class="settings-group"><summary>分类与作品标签</summary><p class="help">分类可以分层。移除分类只解除标签，不删除作品。</p><div class="manage-row"><input id="new-tag" placeholder="新分类名称" maxlength="20" aria-label="新分类名称"><select id="new-tag-parent" aria-label="上级分类">'+parents+'</select><button class="btn small" data-action="tag-add">添加</button></div><div class="manager-list">'+library.tags.map(t=>'<div class="manage-row"><span style="flex:1;font-size:12px">'+esc(t.parent?(tagById(t.parent)||{}).name+' / ':'')+esc(t.name)+'</span><button class="btn small" data-action="tag-edit" data-id="'+esc(t.id)+'">编辑</button><button class="btn small" data-action="tag-delete" data-id="'+esc(t.id)+'">移除</button></div>').join('')+'</div><label class="field"><span>为作品调整标签</span><select id="tag-work">'+library.works.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.title)+'</option>').join('')+'</select></label><button class="btn small" data-action="work-tags">编辑这篇的标签</button></details><details class="settings-group"><summary>导入、导出与备份</summary><p class="help">设置与收藏保存在当前浏览器。换设备前，可以导出一份备份。</p><div class="row" style="margin:14px 0"><button class="btn small" data-action="export-backup">导出个人备份</button><button class="btn small" data-action="export-content">导出内容包</button><button class="btn small" data-action="export-html">导出阅读 HTML</button></div><label class="field"><span>导入内容包或个人备份（JSON）</span><input id="import-file" type="file" accept="application/json,.json"></label><p class="help">内容包按作品标识合并；个人备份会恢复其中的内容、配置和收藏。导入前会显示变化预览。</p><div id="import-preview"></div></details><div class="settings-group"><button class="text-btn" data-action="about">关于这本小集 ↗</button>'+(!storageAvailable?'<p class="error">当前浏览器无法保存本地记录，请及时导出备份。</p>':'')+'</div>',true);
  }
  function refreshSettings(section=0) { const oldY=dialog.scrollTop;settings();const details=$$('.settings-group',dialog).filter(x=>x.tagName==='DETAILS');if(details[section])details[section].open=true;dialog.scrollTop=oldY; }
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
  function exportJson(kind) { const payload={format:'shanyue',version:1,kind,library,...(kind==='backup'?{state}:{}),exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);downloadUrl(url,'山月-'+(kind==='backup'?'个人备份':'内容包')+'-'+localDate()+'.json');setTimeout(()=>URL.revokeObjectURL(url),20000);toast('导出文件已准备好。'); }
  function exportHtml() {
    const copy=document.documentElement.cloneNode(true);
    copy.querySelectorAll('[data-hosted-only]').forEach(element=>element.remove());
    copy.querySelector('#app').innerHTML='';const m=copy.querySelector('#modal');m.innerHTML='';m.removeAttribute('open');m.className='';
    copy.querySelector('#toast').textContent='';copy.querySelector('#toast').className='toast';copy.querySelector('body').style.overflow='';
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
      if(data.format!=='shanyue'||data.version!==1||!['content','backup'].includes(data.kind))throw new Error('不是当前版本支持的山月内容包或备份。');
      const incoming=validateLibrary(data.library);
      if(data.kind==='backup'&&(!data.state||typeof data.state!=='object'))throw new Error('备份缺少个人记录。');
      const additions=incoming.works.filter(w=>!workById(w.id)).length;
      let merged=incoming;
      if(data.kind==='content'){
        const merge=(a,b)=>Array.from(new Map(a.concat(b).map(x=>[x.id,x])).values());
        merged=validateLibrary({...library,authors:{...library.authors,...incoming.authors},works:merge(library.works,incoming.works),tags:merge(library.tags,incoming.tags),modules:merge(library.modules,incoming.modules),topics:merge(library.topics,incoming.topics)});
      }
      pendingImport={library:merged,state:data.kind==='backup'?normalizeState(data.state):state,kind:data.kind};
      area.innerHTML='<div class="import-preview"><h4>'+esc(data.kind==='backup'?'恢复个人备份':'合并内容包')+'</h4><p>'+incoming.works.length+' 篇作品；新增 '+additions+' 篇，已有标识 '+(incoming.works.length-additions)+' 篇。</p><p>'+(data.kind==='backup'?'将替换当前内容、收藏与设置。':'同标识作品、分类及模块将采用导入内容，个人收藏保留。')+'</p><div class="row" style="margin-top:13px"><button class="btn primary small" data-action="apply-import">确认导入</button><button class="btn small" data-action="cancel-import">取消</button></div></div>';
    }catch(error){pendingImport=null;area.innerHTML='<p class="error" role="alert">'+esc(error.message)+'</p>';}
  }
  function about() {
    openModal('关于这本小集','<div class="about-copy"><div class="about-brand">山月</div><p>在字里行间，遇见天地。</p><p>从一轮月、一阵风、一份心情出发，读到文字，也读到写下它的人。把喜欢的一句制成卡片，送给今天，或送给一个想起的人。</p><p class="tiny">当前为 MVP 预览，收录 '+library.works.length+' 篇代表作品。原文采用通行文本；作者与背景的存疑处保留说明，赏读为本工具编写。完整收录范围与逐版校勘将在后续完善。</p><p class="tiny">可离线阅读、制卡。收藏和设置留在当前浏览器；分享朋友圈时，请先保存图片后自行发布。</p></div>',true);
  }

  function validateLibrary(input) {
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
    return {version:1,name:str(input.name||'山月','内容库名称',50),authors,tags,modules,works,topics};
  }
  function normalizeState(raw) {
    if(!raw||typeof raw!=='object')raw={};
    const text=(v,max=10000)=>typeof v==='string'?v.slice(0,max):'';
    const arr=v=>Array.isArray(v)?v:[];
    const normalized={favorites:[...new Set(arr(raw.favorites).filter(x=>typeof x==='string'))].slice(0,2000),fontSize:Math.max(18,Math.min(30,Number(raw.fontSize)||23)),lastWork:text(raw.lastWork,64)||'niaomingjian',quotes:[],records:[]};
    normalized.quotes=arr(raw.quotes).filter(q=>q&&typeof q.text==='string'&&Number.isInteger(q.index)).slice(0,5000).map(q=>({id:text(q.id,140),workId:text(q.workId,64),index:q.index,text:text(q.text,2000),title:text(q.title,160),author:text(q.author,100),dynasty:text(q.dynasty,30)}));
    normalized.records=arr(raw.records).filter(r=>r&&Array.isArray(r.lines)&&r.lines.length&&r.lines.every(l=>typeof l==='string')&&Array.isArray(r.picked)&&r.picked.length&&r.picked.every(i=>Number.isInteger(i)&&i>=0&&i<r.lines.length)).slice(0,2000).map(r=>({id:text(r.id,80),workId:text(r.workId,64),title:text(r.title,160),author:text(r.author,100),dynasty:text(r.dynasty,30),lines:r.lines.slice(0,500).map(l=>text(l,2000)),picked:r.picked.filter(i=>i<500),text:text(r.text,20000),intro:text(r.intro,500),excerpt:!!r.excerpt,theme:['paper','night','botanic'].includes(r.theme)?r.theme:'paper',ratio:r.ratio==='square'?'square':'portrait',mode:['quote','whole','memory'].includes(r.mode)?r.mode:'quote',date:/^\d{4}-\d{2}-\d{2}$/.test(r.date)?r.date:localDate(),showDate:!!r.showDate,note:text(r.note,80),signature:text(r.signature,18),showIntro:!!r.showIntro}));
    return normalized;
  }
  function newId(prefix) {return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);}
  function filterChanged() {if(location.hash!=='#explore'){history.replaceState(null,'','#explore');previousRoute='#explore';lastListing='#explore';}updateResults();}
  function toggleFavorite(id) {
    const w=workById(id);if(!w)return;
    const has=state.favorites.includes(id);state.favorites=has?state.favorites.filter(x=>x!==id):[id,...state.favorites];persist();
    if(location.hash.startsWith('#saved'))refreshPage();
    else $$('[data-action="favorite"]').filter(b=>b.dataset.id===id).forEach(b=>{b.classList.toggle('is-saved',!has);b.classList.toggle('active',!has);b.setAttribute('aria-pressed',String(!has));b.setAttribute('aria-label',(has?'收藏':'取消收藏')+w.title);b.innerHTML=icon('heart')+(b.classList.contains('btn')?(has?'收藏':'已收藏'):'');});
    toast(has?'已移出收藏。':'已把这篇文字留在收藏里。');
  }
  function saveQuote(id,index) {
    const w=workById(id);if(!w||!w.lines[index])return;
    const existed=state.quotes.find(q=>q.workId===id&&q.index===index);
    if(existed)state.quotes=state.quotes.filter(q=>q.id!==existed.id);
    else state.quotes.push({id:id+'-'+index,workId:id,index,text:w.lines[index],title:w.title,author:authorOf(w).name,dynasty:authorOf(w).dynasty});
    persist();showLine(id,index);toast(existed?'已移出句子收藏。':'这一句，留下了。');
  }
  const recentHome=[currentHome];
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action,id=b.dataset.id;
    try {
      switch(action){
        case 'close-modal':closeModal();break;
        case 'about':about();break;
        case 'settings':settings();break;
        case 'search':if(location.hash.startsWith('#explore'))$('#search').focus();else{location.hash='#explore';setTimeout(()=>{if($('#search'))$('#search').focus();},80);}break;
        case 'shuffle':{let candidates=library.works.filter(w=>!recentHome.slice(-4).includes(w.id));if(!candidates.length)candidates=library.works;const w=candidates[Math.floor(Math.random()*candidates.length)];currentHome=w.id;state.lastWork=w.id;recentHome.push(w.id);persist();refreshPage();break;}
        case 'favorite':toggleFavorite(id);break;
        case 'tag':location.hash='#explore?tag='+encodeURIComponent(id);break;
        case 'filter':explore.tags=explore.tags.includes(id)?explore.tags.filter(x=>x!==id):[...explore.tags,id];filterChanged();break;
        case 'clear-topic':explore.topic='';filterChanged();break;
        case 'clear-filters':explore={search:'',tags:[],author:'',form:'',stage:'',topic:''};history.replaceState(null,'','#explore');previousRoute='';renderRoute();break;
        case 'line':showLine(id,Number(b.dataset.line));break;
        case 'save-quote':saveQuote(id,Number(b.dataset.line));break;
        case 'saved-tab':savedTab=id;refreshPage();break;
        case 'remove-quote':state.quotes=state.quotes.filter(q=>q.id!==id);persist();refreshPage();toast('已移出收藏。');break;
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
        case 'module-up':{const i=library.modules.findIndex(m=>m.id===id);if(i>0){[library.modules[i-1],library.modules[i]]=[library.modules[i],library.modules[i-1]];persist();refreshSettings(0);refreshPage();}break;}
        case 'module-add':{const label=$('#new-module').value.trim();if(!label){toast('给新模块起个名字吧。');break;}library.modules.push({id:newId('module'),label,enabled:true});persist();refreshSettings(0);toast('已添加。点击“编辑”可为作品填写内容。');break;}
        case 'module-edit':editModule(id);break;
        case 'save-module':{const m=library.modules.find(m=>m.id===id),label=$('#edit-module-name').value.trim();if(!label){toast('模块名称不能为空。');break;}m.label=label;if($('#module-work')){const w=workById($('#module-work').value);w.extra=w.extra||{};w.extra[id]=$('#module-content').value;}persist();refreshSettings(0);refreshPage();toast('模块已保存。');break;}
        case 'module-delete':confirmAction('移除这个内容模块？','详情页将不再显示这个模块。原文和已有资料保留在内容包中，也可以先取消勾选来隐藏。','confirm-module-delete',id);break;
        case 'confirm-module-delete':library.modules=library.modules.filter(m=>m.id!==id);persist();refreshSettings(0);refreshPage();break;
        case 'tag-add':{const name=$('#new-tag').value.trim(),parent=$('#new-tag-parent').value||null;if(!name){toast('分类名称不能为空。');break;}if(library.tags.some(t=>t.name===name&&t.parent===parent)){toast('这个层级已有同名分类。');break;}library.tags.push({id:newId('tag'),name,parent});persist();refreshSettings(1);refreshPage();toast('分类已添加。');break;}
        case 'tag-edit':editTag(id);break;
        case 'save-tag':{const t=tagById(id),name=$('#edit-tag-name').value.trim(),parent=$('#edit-tag-parent').value||null;if(!name){toast('分类名称不能为空。');break;}if(parent&&descendant(parent,id)){toast('不能将分类移入自己的子分类。');break;}t.name=name;t.parent=parent;persist();refreshSettings(1);refreshPage();toast('分类已保存。');break;}
        case 'tag-delete':{const count=library.works.filter(w=>w.tags.includes(id)).length;confirmAction('移除这个分类？','将解除 '+count+' 篇作品的这个标签，子分类会移到上一层，作品正文不受影响。','confirm-tag-delete',id);break;}
        case 'confirm-tag-delete':{const t=tagById(id);library.tags.forEach(c=>{if(c.parent===id)c.parent=t.parent;});library.tags=library.tags.filter(t=>t.id!==id);library.works.forEach(w=>{w.tags=w.tags.filter(t=>t!==id);});explore.tags=explore.tags.filter(t=>t!==id);persist();refreshSettings(1);refreshPage();break;}
        case 'work-tags':editWorkTags($('#tag-work').value);break;
        case 'save-work-tags':{const w=workById(id);w.tags=$$('[data-work-tag]:checked').map(x=>x.dataset.workTag);persist();refreshSettings(1);refreshPage();toast('作品标签已保存。');break;}
        case 'export-backup':exportJson('backup');break;
        case 'export-content':exportJson('content');break;
        case 'export-html':exportHtml();break;
        case 'cancel-import':pendingImport=null;$('#import-preview').innerHTML='';$('#import-file').value='';break;
        case 'apply-import':if(pendingImport){library=pendingImport.library;state=pendingImport.state;state.favorites=state.favorites.filter(id=>workById(id));currentHome=workById(state.lastWork)?state.lastWork:library.works[0].id;explore.tags=explore.tags.filter(tagById);persist();serifSize();closeModal();previousRoute='';renderRoute();toast('导入完成。');}break;
      }
    }catch(error){toast('操作没有完成：'+error.message);console.error(error);}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='search'){explore.search=el.value;filterChanged();}
    if(el.id==='font-size'){state.fontSize=Number(el.value);$('#font-output').textContent=el.value+' px';serifSize();persist();}
    if(share){const fields={'share-note':'note','share-signature':'signature','share-date':'date'};if(fields[el.id]){share[fields[el.id]]=el.value;renderShare();}}
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(['author-filter','form-filter','stage-filter'].includes(el.id)){explore[el.id.split('-')[0]]=el.value;filterChanged();}
    if(el.dataset.moduleToggle){const m=library.modules.find(m=>m.id===el.dataset.moduleToggle);m.enabled=el.checked;persist();refreshPage();}
    if(el.id==='module-work'){$('#module-content').value=(workById(el.value).extra||{})[el.dataset.module]||'';}
    if(el.id==='import-file')previewImport(el.files[0]);
    if(share){
      if(el.dataset.quoteIndex!==undefined){const i=Number(el.dataset.quoteIndex);share.picked=el.checked?[...share.picked,i].sort((a,b)=>a-b):share.picked.filter(j=>j!==i);renderShare();}
      const flags={'share-show-date':'showDate','share-intro':'showIntro','share-record':'keepRecord'};
      if(flags[el.id]){share[flags[el.id]]=el.checked;renderShare();}
    }
  });
  window.addEventListener('hashchange',()=>{if(dialog.open)closeModal();renderRoute();});
  serifSize();renderRoute();
  if(!storageAvailable)setTimeout(()=>toast('本地记录暂时无法读取，可以先阅读，并在设置中导出备份。'),500);

})();
