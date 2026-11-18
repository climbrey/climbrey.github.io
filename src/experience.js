(function(root){
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const active=new Set();
  let observer;
  function play(element,frames,options={}) {
    if(!element?.isConnected||preference.matches||document.hidden||!element.animate)return;
    const animation=element.animate(frames,{duration:360,easing:'cubic-bezier(.2,.75,.25,1)',...options});
    active.add(animation);
    animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
    return animation;
  }
  function clear(){observer?.disconnect();active.forEach(a=>a.cancel());active.clear();}
  function reveal(element,index=0){
    if(element.dataset.arrived)return;
    element.dataset.arrived='true';
    play(element,[{opacity:.3,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:460,delay:Math.min(index*45,135)});
  }
  function observe(container){
    observer?.disconnect();
    if(preference.matches||!('IntersectionObserver' in root))return;
    observer=new IntersectionObserver(entries=>{
      entries.filter(e=>e.isIntersecting).forEach((e,i)=>{reveal(e.target,i);scene(e.target);observer.unobserve(e.target);});
    },{threshold:.12});
    container.querySelectorAll('.letter-room,.topic-card,.reading-invitation,.reader-trail').forEach(el=>observer.observe(el));
  }
  function scene(container){
    container?.querySelectorAll('.scene-leaves').forEach(el=>play(el,[{transform:'rotate(-2deg)'},{transform:'rotate(1deg)',offset:.6},{transform:'none'}],{duration:1050}));
    container?.querySelectorAll('.scene-light').forEach(el=>play(el,[{opacity:.45},{opacity:1}],{duration:900}));
    container?.querySelectorAll('.scene-ripples').forEach(el=>play(el,[{transform:'translateX(-9px)',opacity:.05},{transform:'none',opacity:.24}],{duration:1000}));
    container?.querySelectorAll('.scene-rain').forEach(el=>play(el,[{transform:'translateY(-16px)',opacity:.05},{transform:'none',opacity:.3}],{duration:750}));
  }
  function unfold(element){
    play(element,[{opacity:.25,transform:'perspective(900px) rotateX(-8deg) translateY(8px)'},{opacity:1,transform:'none'}],{duration:440});
  }
  function stamp(button){
    if(!button||preference.matches||document.hidden)return;
    play(button,[{transform:'scale(.92)'},{transform:'scale(1.07)',offset:.55},{transform:'none'}],{duration:340});
    for(let i=0;i<3;i++){
      const petal=document.createElement('span');petal.className='save-petal';petal.setAttribute('aria-hidden','true');button.appendChild(petal);
      const animation=play(petal,[{opacity:.9,transform:'translate(0,0) rotate(0)'},{opacity:0,transform:'translate('+(i-1)*20+'px,-32px) rotate('+(i-1)*55+'deg)'}],{duration:550,delay:i*35});
      if(animation)animation.finished.catch(()=>{}).finally(()=>petal.remove());else petal.remove();
    }
  }
  preference.addEventListener?.('change',()=>{if(preference.matches)clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){active.forEach(a=>a.cancel());active.clear();}});
  root.ShanyueExperience={play,clear,observe,scene,unfold,stamp};
})(globalThis);
