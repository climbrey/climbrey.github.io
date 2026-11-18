(function(root){
  'use strict';
  const ns='http://www.w3.org/2000/svg',clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  function mount(host,state,options={}){
    const $=id=>host.querySelector('#'+id),svg=host.querySelector('svg'),controller=new AbortController();
    const on=(target,type,fn)=>target?.addEventListener(type,fn,{signal:controller.signal});
    let simple=options.simple,paused=options.paused,suspended=false,visible=true,dead=false,raf=0,last=0,time=0;
    let effect='',elapsed=0,following=0,pointer={x:640,y:210},fish={x:300,y:480},fishTarget=null,reed=0,reedTarget=0,reedHold=0,drag=null,ripples=[];
    const pond=!!$('inlet'),grown=state.planted&&state.water;
    let dragon=state.visitor?{x:562,y:301}:{x:822,y:205},raining=false;
    function set(id,key,v){const el=$(id);if(el)el.setAttribute(key,String(v));}
    function sync(){host.classList.toggle('motion-still',!!simple);host.classList.toggle('motion-paused',!!paused);host.classList.toggle('motion-suspended',suspended||!visible||document.hidden);if(dead||simple||paused||suspended||!visible||document.hidden||!pond){cancelAnimationFrame(raf);raf=0;last=0;}else if(!raf)raf=requestAnimationFrame(tick);}
    function finalPose(){
      if(!pond)return;
      set('inlet','stroke-dashoffset',state.water?0:1);set('inlet-glint','opacity',state.water?.8:0);set('warm-water','opacity',state.water?.24:0);set('stem','stroke-dashoffset',grown?0:1);set('bud','opacity',grown?1:0);set('bud','transform','');set('plant-shadow','opacity',grown?1:0);
      dragon=state.visitor?{x:562,y:301}:{x:822,y:205};set('dragon','transform','translate('+dragon.x+' '+dragon.y+')');$('dragon').classList.toggle('landed',state.visitor);options.poem?.(state.finished?1:0);
    }
    function transition(name){
      if(!pond)return;
      effect=name;elapsed=0;following=0;
      if(simple||paused){effect='';finalPose();return;}
      if(name==='grow'||name==='replay')poseGrow(0);
      if(name==='fly'||name==='replay'){dragon={x:822,y:205};$('dragon').classList.remove('landed');}
      if(name==='reveal'||name==='replay')options.poem?.(0);
      sync();
    }
    function poseGrow(t){const w=ease(t/1.5),g=ease((t-1.3)/1.9);set('inlet','stroke-dashoffset',1-w);set('inlet-glint','opacity',w*.8);set('warm-water','opacity',w*.24);set('stem','stroke-dashoffset',1-g);set('bud','opacity',g);set('plant-shadow','opacity',g);set('bud','transform','translate(570 423) scale('+Math.max(.015,g)+') translate(-570 -423)');}
    function poseFlight(t){const v=ease(t/2.1),u=1-v;dragon.x=u*u*u*822+3*u*u*v*720+3*u*v*v*415+v*v*v*562;dragon.y=u*u*u*205+3*u*u*v*92+3*u*v*v*205+v*v*v*301;}
    function splash(x=430,y=465,invite=true){
      if(!pond)return;if(y<300)return;
      while(ripples.length>=18)ripples.shift().el.remove();
      const el=document.createElementNS(ns,'ellipse');for(const [k,v] of Object.entries({cx:x,cy:y,rx:8,ry:2}))el.setAttribute(k,v);$('ripples').appendChild(el);ripples.push({el,start:time});
      if(invite)fishTarget={x:clamp(x,100,850),y:clamp(y,345,545),until:time+4};
      if(simple||paused){el.setAttribute('rx',42);el.setAttribute('ry',10);if(invite){fish={x:x-20,y};set('fish','transform','translate('+fish.x+' '+fish.y+')');}}
    }
    function reeds(){if(!pond)return;reedTarget=-29;reedHold=time+1.6;options.clue?.();if(simple||paused){reed=-29;set('reed-base','transform','rotate(-29 870 600)');set('clue','opacity',1);}}
    function lure(){if(!pond||effect)return;following=time+4.5;pointer={x:640,y:210};$('dragon').classList.remove('landed');if(simple){set('dragon','transform','translate(640 210)');}}
    function weather(value){raining=value;set('rain','opacity',raining?1:0);set('rain-tint','opacity',raining?.15:0);}
    function tick(now){
      raf=0;if(dead||simple||paused||suspended||!visible||document.hidden)return;
      if(last&&now-last<30){raf=requestAnimationFrame(tick);return;}const dt=last?Math.min(.08,(now-last)/1000):0;last=now;time+=dt;
      let flight=false;
      if(effect){elapsed+=dt;
        if(effect==='grow'||effect==='replay')poseGrow(elapsed);
        if(effect==='fly'){poseFlight(elapsed);flight=true;}
        if(effect==='replay'&&elapsed>=3.1){poseFlight(elapsed-3.1);flight=true;}
        if(effect==='reveal')options.poem?.(ease(elapsed/1.2));
        if(effect==='replay')options.poem?.(ease((elapsed-5.2)/1.3));
        if(elapsed>=({grow:3.2,fly:2.1,reveal:1.5,replay:7}[effect]||0)){effect='';finalPose();}
      }
      const landed=state.visitor&&!effect&&time>=following;
      if(!flight){let tx=state.visitor?562:822,ty=state.visitor?301:205;if(time<following){tx=pointer.x+Math.sin(time*2.3)*24;ty=pointer.y+Math.sin(time*3.2)*10;}else if(!state.visitor){tx+=Math.sin(time*1.5)*6;ty+=Math.cos(time*1.7)*4;}const r=1-Math.exp(-dt*3.1);dragon.x+=(tx-dragon.x)*r;dragon.y+=(ty-dragon.y)*r;}
      set('dragon','transform','translate('+dragon.x.toFixed(2)+' '+dragon.y.toFixed(2)+')');$('dragon').classList.toggle('landed',landed);
      const target=fishTarget&&time<fishTarget.until?fishTarget:{x:360+Math.sin(time*.27)*230,y:465+Math.sin(time*.43)*45};const vx=target.x-fish.x;fish.x+=vx*(1-Math.exp(-dt*1.4));fish.y+=(target.y-fish.y)*(1-Math.exp(-dt*1.4));set('fish','transform','translate('+fish.x+' '+fish.y+')');set('fish-body','transform','scale('+(vx>=0?1:-1)+' 1)');set('fish-tail','transform','rotate('+(Math.sin(time*8)*10)+' -14 0)');
      if(!drag&&time>reedHold)reedTarget=0;reed+=(reedTarget-reed)*(1-Math.exp(-dt*(drag?18:5)));set('reed-base','transform','rotate('+reed.toFixed(2)+' 870 600)');set('clue','opacity',clamp(-reed/23));
      for(let i=ripples.length-1;i>=0;i--){const r=ripples[i],age=time-r.start;if(age>2.4){r.el.remove();ripples.splice(i,1);continue;}r.el.setAttribute('rx',8+age*43);r.el.setAttribute('ry',2+age*10);r.el.setAttribute('opacity',(1-age/2.4)*.8);}
      if(raining&&Math.floor(time*5)!==Math.floor((time-dt)*5))splash(130+(Math.sin(time*31)*.5+.5)*720,350+(Math.sin(time*19)*.5+.5)*190,false);
      set('inlet-glint','stroke-dashoffset',-time*.13);raf=requestAnimationFrame(tick);
    }
    function point(e){const matrix=svg.getScreenCTM();return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):{x:0,y:0};}
    if(pond){
      $('rain').innerHTML=Array.from({length:24},(_,i)=>'<path class="rain-line" d="M'+(i*137%1050)+' '+(i*89%620)+'l-7 30" style="animation-delay:-'+(i%7/7)+'s"/>').join('');
      on(host,'pointermove',e=>{if(!e.target.closest('button'))pointer=point(e);});
      on(host,'click',e=>{if(e.target.closest('button'))return;const p=point(e);if(p.y>=300)splash(p.x,p.y);else if(state.visitor){lure();pointer=p;}});
      const handle=host.querySelector('#reed-handle');
      on(handle,'pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();});
      on(handle,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;reedTarget=clamp((e.clientX-drag.x)/host.clientWidth*150,-34,0);if(reedTarget<-17)options.clue?.();if(simple||paused){reed=reedTarget;set('reed-base','transform','rotate('+reed+' 870 600)');set('clue','opacity',clamp(-reed/23));}});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])on(handle,event,()=>{drag=null;reedHold=time+.4;});
      on(handle,'click',reeds);
    }
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.03});observer.observe(host);on(document,'visibilitychange',sync);
    finalPose();if(options.effect)transition(options.effect);sync();
    return {splash,reeds,lure,weather,transition,suspend:value=>{suspended=value;sync();},preferences:(s,p)=>{simple=s;paused=p;if(simple){effect='';finalPose();}sync();},skip:()=>{effect='';finalPose();},destroy:()=>{dead=true;cancelAnimationFrame(raf);observer.disconnect();controller.abort();ripples.forEach(r=>r.el.remove());ripples=[];}};
  }
  root.ShanyueMysteryMotion={mount};
})(globalThis);
