(function(root){
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function homeEntry(){return '<a class="puzzle-entry" href="#play"><span class="puzzle-entry-icon" aria-hidden="true">✧</span><span class="puzzle-entry-copy"><span class="eyebrow">游园 · 诗意小游戏</span><strong>在字与画之间，玩一会儿。</strong><span>拾句成诗 · 诗里寻景</span></span><span class="puzzle-entry-go">去逛逛 ↗</span></a>';}
  function markup(library,scene){
    const available=root.ShanyueSceneView.available(library),rounds=root.ShanyuePuzzle.collect(library.works);
    const pieces=(rounds.find(r=>r.workId===library.discovery.defaultWork)||rounds[0])?.pieces.slice(0,3)||['拾','句','成诗'];
    return '<section class="garden"><header class="garden-heading"><p class="eyebrow">游园 · 留一点闲暇，给好奇心</p><h1>诗里，有好玩的事。</h1><p>拾起一片字，走近一幅画。慢慢来，总会遇见。</p></header><div class="garden-grid"><a class="garden-card" href="#play/compose"><div class="garden-art compose-art">'+scene('moon','garden-compose')+'<span class="garden-pieces" aria-hidden="true">'+pieces.map(text=>'<i>'+esc(text)+'</i>').join('')+'</span></div><div class="garden-copy"><span class="eyebrow">在字句里，重新相逢</span><h2>拾句成诗</h2><p>轻点散落的碎片，拼回两句诗，让山水慢慢清晰。</p><span class="garden-go">拾起一句诗 <span aria-hidden="true">→</span></span></div></a><a class="garden-card" href="#play/scenes"><div class="garden-art">'+root.ShanyueSceneView.art(available[0]?.id||'pond')+'<span class="garden-badge">新作</span></div><div class="garden-copy"><span class="eyebrow">在画中，发现诗意</span><h2>诗里寻景</h2><p>'+esc(available.length?'轻点画中的细节，找一张诗笺与它相应。':'先看看玩法，待小集中的诗与画重新相逢。')+'</p><span class="garden-go">走进一幅画 <span aria-hidden="true">→</span></span></div></a></div><p class="garden-note">喜欢的那一句，还可以留作诗卡。</p></section>';
  }
  root.ShanyueGarden={homeEntry,markup};
})(globalThis);
