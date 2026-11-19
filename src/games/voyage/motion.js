(function(root){
'use strict';
function mount(svg,options){
  const $=s=>svg.querySelector(s),paths=ShanyueVoyageArt.paths,boat=$('.boat-position'),preview=$('.preview-path');
  let frame=0,alive=true,last=0,elapsed=0,waterOffset=0,tween=null,sceneState=null,paused=false,still=false;
  let camera=[130,85,640,711],cameraTarget=camera.slice(),position={x:445,y:285};
  const pathCache=new Map();
  const point=(name,t)=>{if(!pathCache.has(name)){const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d',paths[name]||name);pathCache.set(name,{el,length:el.getTotalLength()});}const p=pathCache.get(name);return p.el.getPointAtLength(p.length*t);};
  const endPoint=s=>s.stage==='inlet'?{x:445,y:285}:s.stage==='fork'?{x:450,y:447}:s.stage==='bend'?point(s.route,1):point(s.route+(s.method==='inside'?'Inside':'Outside'),1);
  function destination(s){return s.stage==='inlet'?[130,85,640,711]:s.stage==='fork'?[0,0,900,1000]:s.stage==='bend'?[s.route==='bamboo'?0:290,322,610,678]:[s.route==='bamboo'?40:420,466,440,489];}
  function paintPosition(p){position=p;boat.setAttribute('transform',`translate(${p.x} ${p.y})`);}
  function settle(){if(!sceneState)return;paintPosition(endPoint(sceneState));camera=cameraTarget.slice();svg.setAttribute('viewBox',camera.join(' '));}
  function state(s){
    sceneState=s;cameraTarget=destination(s);
    svg.dataset.stage=s.stage;svg.dataset.route=s.route||'';svg.dataset.flow=s.flow;
    $('.gate').setAttribute('transform',s.stage==='inlet'?'':'translate(0 -18)');
    $('.blocking-leaf').style.opacity=s.stage==='inlet'?'1':'.5';
    $('.blocking-leaf').setAttribute('transform',s.stage==='inlet'?'translate(456 354)':'translate(529 377) rotate(63)');
    $('.steering-leaf').style.opacity=s.stage==='bend'?'1':'0';
    if(s.route){const p=point(s.route,1);$('.steering-leaf').setAttribute('transform',`translate(${p.x+17} ${p.y+43})`);}
    $('.leaf-turn').setAttribute('transform',`rotate(${s.leaf*48})`);
    const mode=ShanyueVoyage.preview(s);
    const path=s.stage==='inlet'?'release':s.stage==='bend'?s.route+(mode==='inside'?'Inside':mode==='outside'?'Outside':'Blocked'):s.route||'release';
    preview.setAttribute('d',paths[path]);preview.style.opacity=['inlet','bend'].includes(s.stage)&&s.flow?'1':'0';
    preview.setAttribute('stroke',['rush','blocked'].includes(mode)?'#d2a36b':'#fff4b8');
    $('.fish-school').style.opacity=s.stage==='done'&&s.route==='lotus'?'.95':'.13';
    if(s.stage!=='done')$('.fish-school').removeAttribute('transform');
    $('.dragonfly').style.opacity=s.stage==='done'&&s.route==='bamboo'?'1':'.22';
    svg.querySelectorAll('[data-stream]').forEach(el=>{const n=el.dataset.stream;el.style.opacity=!s.route||n==='release'||n.startsWith(s.route)?'.6':'.12';});
    if(!tween)paintPosition(endPoint(s));if(still)settle();options.onFrame?.();wake();
  }
  function animate(effect,previous,next,complete){
    if(tween){const old=tween;tween=null;old.complete?.();}
    const fail=['rush','blocked','still','restless'].includes(effect);
    const name=effect==='release'?'release':effect==='branch'?next.route:effect==='arrive'?next.route+(next.method==='inside'?'Inside':'Outside'):fail&&previous.stage==='bend'?previous.route+'Blocked':effect==='rush'&&previous.stage==='inlet'?'release':effect==='return'&&previous.route?(paths[previous.route]+(previous.method?paths[previous.route+(previous.method==='inside'?'Inside':'Outside')]:' ')):null;
    tween={effect,previous,next,complete,name,time:0,duration:effect==='release'?2900:effect==='branch'?1900:effect==='arrive'?2700:effect==='discover'?1700:effect==='return'?2300:1100};
    state(next);paintPosition(endPoint(previous));
    if(effect==='release'){
      $('.blocking-leaf').setAttribute('transform','translate(456 354)');
      $('.gate').setAttribute('transform','translate(0 -18)');
    }
    if(still||paused){finish();return;}wake();
  }
  function finish(){if(!tween)return;const done=tween;tween=null;state(done.next);settle();done.complete?.();}
  function ripple(x,y){$('.touch-rings').setAttribute('transform',`translate(${x} ${y})`);svg.classList.remove('touched');void svg.getBoundingClientRect();svg.classList.add('touched');}
  function tick(now){
    frame=0;if(!alive||paused||still)return;
    const dt=Math.min(last?now-last:32,64);if(last&&dt<30){frame=requestAnimationFrame(tick);return;}last=now;elapsed+=dt;
    const speed=sceneState?.flow??1;waterOffset+=dt*.012*speed;
    svg.querySelectorAll('.current-lines path').forEach(el=>el.style.strokeDashoffset=String(-waterOffset));
    preview.style.strokeDashoffset=String(-waterOffset*3);
    $('.boat-bob').setAttribute('transform',`translate(0 ${Math.sin(elapsed/630)*2.4}) rotate(${Math.sin(elapsed/830)*2.5})`);
    camera=camera.map((v,i)=>v+(cameraTarget[i]-v)*Math.min(1,dt/470));svg.setAttribute('viewBox',camera.join(' '));
    if(tween){
      const t=tween;t.time+=dt;const progress=Math.min(1,t.time/t.duration);
      let p=progress*progress*(3-2*progress);
      if(t.effect==='release'){
        const leafP=Math.min(1,Math.max(0,(t.time-250)/650));$('.blocking-leaf').setAttribute('transform',`translate(${456+73*leafP} ${354+23*leafP}) rotate(${63*leafP})`);
        p=Math.max(0,(t.time-850)/(t.duration-850));
      }
      if(t.name){
        if(t.effect==='return')p=1-p;
        if(['rush','blocked'].includes(t.effect))p=Math.sin(progress*Math.PI)*.76;
        paintPosition(point(t.name,Math.max(0,Math.min(1,p))));
      }
      if(t.effect==='discover'){
        const group=t.next.route==='bamboo'?$('.dragonfly'):$('.fish-school');group.style.opacity=String(.2+.8*progress);
        if(t.next.route==='bamboo')group.setAttribute('transform',`translate(${-7+80*(1-p)} ${-79-60*Math.sin(progress*Math.PI)})`);
        else group.setAttribute('transform',`translate(${75*(1-p)} ${-40*(1-p)})`);
      }
      if(progress>=1)finish();
    }
    options.onFrame?.();frame=requestAnimationFrame(tick);
  }
  function wake(){if(alive&&!paused&&!still&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  function suspend(value){paused=value;svg.classList.toggle('sleeping',value);if(value){cancelAnimationFrame(frame);frame=0;if(tween)finish();}else wake();}
  function reduced(value){still=value;svg.classList.toggle('still',value);if(value){cancelAnimationFrame(frame);frame=0;finish();settle();$('.boat-bob').removeAttribute('transform');}else wake();}
  function destroy(){alive=false;cancelAnimationFrame(frame);frame=0;tween=null;}
  return {state,animate,suspend,reduced,ripple,destroy,settle};
}
root.ShanyueVoyageMotion={mount};
})(globalThis);
