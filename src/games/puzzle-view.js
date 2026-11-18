(function(root){
  'use strict';
  const Model=root.ShanyuePuzzle;
  let session=null,recent=[];
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gardenIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V11a8 8 0 0 1 16 0v10M2 21h20M8 21v-9a4 4 0 0 1 8 0v9M12 3v5M4.5 8l4 2M19.5 8l-4 2"/></svg>';
  function entry(library){
    const round=Model.collect(library.works)[0];if(!round)return '';
    return '<a class="puzzle-entry" href="#play"><span class="puzzle-entry-icon">'+gardenIcon+'</span><span class="puzzle-entry-copy"><span class="eyebrow">游园 · 诗意小游戏</span><strong>拾起几片字，拼出一幅诗。</strong><span>轻点碎片，让散落的诗句重新相逢。</span></span><span class="puzzle-entry-go">去玩一会儿 <span aria-hidden="true">↗</span></span></a>';
  }
  function prepare(library,renew=false){
    const rounds=Model.collect(library.works);
    if(!rounds.length){session=null;return null;}
    const existing=session&&rounds.find(r=>r.id===session.round.id&&r.lines.join('')===session.round.lines.join(''));
    if(!renew&&existing)return session;
    const round=Model.choose(rounds,recent,session?.round,library.discovery.defaultWork);
    session=Model.create(round);recent.push(round.workId);recent=recent.slice(-4);return session;
  }
  function markup(library,scene){
    const state=prepare(library);
    if(!state)return '<section class="puzzle-empty"><p class="eyebrow">游园 · 拾句成诗</p><h1 class="page-title">等几句诗，来这里相逢。</h1><p>当前小集中暂时没有适合拼句的五言或七言诗，先去读一篇吧。</p><a class="btn primary" href="#explore">去发现文字</a></section>';
    const round=state.round,w=library.works.find(w=>w.id===round.workId),a=library.authors[w.author];
    let offset=0;
    const rows=round.rows.map((row,i)=>'<div class="puzzle-line" role="group" aria-label="第'+(i+1)+'句">'+row.map(text=>{const index=offset++;return '<button class="puzzle-slot" data-puzzle="remove" data-index="'+index+'" style="--piece-size:'+text.length+'" aria-label="第'+(i+1)+'句，第'+(index-i*row.length+1)+'处，'+text.length+'字待放入"></button>';}).join('')+'<span class="puzzle-punctuation" aria-hidden="true">'+round.ends[i]+'</span></div>').join('');
    return '<section class="puzzle-page" aria-labelledby="puzzle-title"><header class="puzzle-heading"><div><p class="eyebrow">游园 · 在字句之间，玩一会儿</p><h1 id="puzzle-title">拾句成诗</h1></div><button class="text-btn" data-puzzle="next">换一幅 <span aria-hidden="true">↻</span></button></header><p class="puzzle-intro">轻点碎片，拼回两句诗。让眼前的山水，慢慢清晰。</p><div class="puzzle-layout"><div class="puzzle-picture"><div class="puzzle-landscape">'+scene(w.scene,'puzzle')+'</div><div class="puzzle-mist"></div><span class="puzzle-seal" aria-hidden="true">诗中有画</span><div class="puzzle-picture-copy"><p class="puzzle-picture-label">山水，藏在字里</p><blockquote class="puzzle-finished-quote" hidden>'+round.lines.map(line=>'<span>'+esc(line)+'</span>').join('')+'</blockquote><p class="puzzle-picture-note">每拾起一句，便走近一点。</p></div></div><div class="puzzle-table"><div class="puzzle-source"><h2>'+esc(w.title)+'</h2><span>'+esc(a.dynasty)+' · '+esc(a.name)+'</span></div><div class="puzzle-slots">'+rows+'</div><p class="puzzle-help">轻点下方碎片放入空位；轻点已放入的碎片可取回。</p><div class="puzzle-bank" data-pieces="'+round.pieces.length+'" role="group" aria-label="待拾起的诗句碎片">'+state.order.map(id=>'<button class="puzzle-piece" data-puzzle="place" data-index="'+id+'">'+esc(round.pieces[id])+'</button>').join('')+'</div><p class="puzzle-status" role="status" aria-live="polite" aria-atomic="true"></p><div class="puzzle-tools"><button class="btn small" data-puzzle="hint">给点灵感 <span aria-hidden="true">✧</span></button><button class="text-btn" data-puzzle="undo">退一步</button><button class="text-btn" data-puzzle="reset">重新拾起</button></div><div class="puzzle-complete" hidden><p>诗句相逢，山水也有了回声。</p><div class="row"><a class="btn primary puzzle-read" href="#work/'+esc(w.id)+'">走进这首诗 →</a><button class="btn" data-puzzle="share">留作诗卡</button></div></div></div></div><footer class="puzzle-footer"><span>不赶时间，慢慢拾句。</span><a class="text-btn" href="#work/'+esc(w.id)+'">先读读原作 →</a></footer></section>';
  }
  function paint(host,message=''){
    if(!session||!host.querySelector('.puzzle-page'))return;
    const state=session,result=Model.status(state),{round}=state;
    host.querySelectorAll('.puzzle-slot').forEach((button,i)=>{
      const id=state.placed[i];button.textContent=id===null?'· '.repeat(round.pieces[i].length).trim():round.pieces[id];
      button.classList.toggle('is-filled',id!==null);button.disabled=id===null||result.complete;
      const position='第'+(Math.floor(i/round.rows[0].length)+1)+'句第'+(i%round.rows[0].length+1)+'处，';
      button.setAttribute('aria-label',position+(id===null?'空位，'+round.pieces[i].length+'字':round.pieces[id]+(result.complete?'':'，轻点取回')));
    });
    host.querySelectorAll('.puzzle-piece').forEach(button=>{
      const used=state.placed.includes(Number(button.dataset.index));button.disabled=used||result.complete;button.classList.toggle('is-used',used);
      button.setAttribute('aria-label',button.textContent+(used?'，已放入':'，放入诗句'));
    });
    host.querySelector('[data-puzzle="undo"]').disabled=!state.history.length;
    host.querySelector('[data-puzzle="reset"]').disabled=state.placed.every(id=>id===null);
    host.querySelector('[data-puzzle="hint"]').disabled=result.complete;
    host.querySelector('.puzzle-page').classList.toggle('is-complete',result.complete);
    host.querySelector('.puzzle-picture').style.setProperty('--mist',String(result.complete?0:.87-result.correct/state.placed.length*.57));
    host.querySelector('.puzzle-complete').hidden=!result.complete;
    host.querySelector('.puzzle-finished-quote').hidden=!result.complete;
    host.querySelector('.puzzle-picture-label').textContent=result.complete?'这一刻，诗与画相逢':'山水，藏在字里';
    host.querySelector('.puzzle-picture-note').hidden=result.complete;
    host.querySelector('.puzzle-status').textContent=result.complete?'拼好了！可以读原作，或把这两句留作诗卡。':result.full?'再挪一挪，诗意就要相逢了。可取回碎片，或点“给点灵感”。':message||'从任意一片开始，把诗句拾回来。';
  }
  function mount(host,library,scene,share){
    paint(host);
    host.onclick=event=>{
      const button=event.target.closest('[data-puzzle]');if(!button||button.disabled||!session)return;
      const action=button.dataset.puzzle,index=Number(button.dataset.index),before=Model.status(session),removed=session.placed[index];
      if(action==='next'){
        prepare(library,true);host.innerHTML=markup(library,scene);paint(host,'又遇见两句诗，慢慢来。');
        host.querySelector('[data-puzzle="next"]')?.focus({preventScroll:true});
        root.ShanyueExperience.unfold(host.querySelector('.puzzle-table'));return;
      }
      if(action==='share'){
        if(before.complete)share(session.round);return;
      }
      const changed=action==='place'?Model.place(session,index):action==='remove'?Model.remove(session,index):Model[action]?.(session);
      if(!changed)return;
      paint(host,action==='hint'?'替你安放一片，顺着它继续试试。':action==='remove'?'碎片已回到下方，可以重新安放。':action==='reset'?'从头拾起，慢慢来。':action==='undo'?'回到刚才，可以换一种摆法。':'轻点已放入的碎片，可以取回调整。');
      const after=Model.status(session);
      if(after.complete&&!before.complete){
        root.ShanyueExperience.unfold(host.querySelector('.puzzle-finished-quote'));
        root.ShanyueExperience.scene(host.querySelector('.puzzle-landscape'));
        host.querySelector('.puzzle-read').focus({preventScroll:true});
      }else if(action==='remove')host.querySelector('.puzzle-piece[data-index="'+removed+'"]').focus({preventScroll:true});
      else if(button.disabled)(host.querySelector('.puzzle-piece:not(:disabled)')||host.querySelector('[data-puzzle="hint"]')).focus({preventScroll:true});
      if(action==='place'){
        const slot=session.placed.indexOf(index);
        root.ShanyueExperience.play(host.querySelector('.puzzle-slot[data-index="'+slot+'"]'),[{transform:'translateY(-5px)',opacity:.4},{transform:'none',opacity:1}],{duration:230});
      }
    };
  }
  root.ShanyuePuzzleView={entry,markup,mount};
})(globalThis);
