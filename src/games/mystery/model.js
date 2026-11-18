(function(root){
  const cells=[6,7,4,5,2],types=['straight','elbow','elbow','elbow','straight'];
  const initial=()=>({room:'court',stone:false,key:false,box:false,planted:false,water:false,visitor:false,finished:false,bonus:false,reedClue:false,pipes:[1,0,0,1,0],notes:[],hintCounts:{}});
  const clone=s=>JSON.parse(JSON.stringify(s));
  function ports(i,rotation){return (types[i]==='straight'?[1,3]:[0,1]).map(p=>(p+rotation)%4);}
  function flow(rotations){
    const reached=[],seen=new Set();let cell=6,entry=3;
    while(true){
      const i=cells.indexOf(cell);if(i<0||seen.has(cell)||!ports(i,rotations[i]).includes(entry))return {solved:false,reached};
      seen.add(cell);reached.push(i);const exit=ports(i,rotations[i]).find(p=>p!==entry);
      if(cell===2&&exit===0)return {solved:true,reached};
      const row=Math.floor(cell/3),col=cell%3,nr=row+[-1,0,1,0][exit],nc=col+[0,1,0,-1][exit];
      if(nr<0||nr>2||nc<0||nc>2)return {solved:false,reached};
      cell=nr*3+nc;entry=(exit+2)%4;
    }
  }
  function inventory(s){return [s.key&&!s.box&&'key',s.box&&!s.planted&&'seed',s.box&&'frame'].filter(Boolean);}
  function phase(s){return !s.key?'key':!s.box?'box':!s.planted?'plant':!s.water?'water':!s.visitor?'visitor':!s.finished?'frame':'done';}
  function act(state,target,item){
    const s=clone(state);let message='',panel=null;
    const note=text=>{if(!s.notes.includes(text))s.notes.push(text);};
    if(item&&!inventory(s).includes(item))return {state:s,message:'这件物品暂时不在行囊里。'};
    if(item&&!(item==='key'&&target==='box'||item==='seed'&&target==='soil'||item==='frame'&&target==='lotus'))return {state:s,message:{key:'钥匙需要一个锁孔。这里似乎用不上。',seed:'莲子要落在浅泥里，这里不太合适。',frame:'小框留给池心的荷尖与那位来客。'}[item]};
    switch(target){
      case 'letter': panel='letter';note('来信：青石下有旧物，木匣里有新生。');break;
      case 'stone':s.stone=true;message=s.key?'青石下已经空了。':'青石轻轻移开，下面有一点铜色。';break;
      case 'key':if(s.stone){s.key=true;message='拾到一枚铜钥匙。点行囊里的物品，再点它能派上用场的地方。';note('铜钥匙：或许能打开院中的木匣。');}break;
      case 'box':if(s.box)message='匣子空了。莲子与取景框已经放进行囊。';else if(item==='key'){s.box=true;message='咔嗒。匣里有一颗莲子，和一个小小的取景框。';note('匣中附言：莲子落浅泥，水到新荷生。');}else message=s.key?'锁孔的形状很熟悉。试着用行囊里的钥匙。':'木匣锁着。桌上的信，也许留了线索。';break;
      case 'soil':if(s.planted)message=s.water?'新荷已经醒了。看看它的尖角。':'莲子已经种下，还在等水。';else if(item==='seed'){s.planted=true;message=s.water?'莲子落进浅泥，新荷慢慢舒展开来。':'莲子落进浅泥。这里有点干，水声从哪边来？';note('莲子已种下，接通水口后才会长出新荷。');}else message='一处靠水的浅泥，恰好容得下一点新生。';break;
      case 'gate':panel='pipes';note('石渠：水从左下进，从右上流向池塘。');break;
      case 'twig':if(s.water&&s.planted){s.visitor=true;message='芦苇轻轻一晃，它飞来了，停在新荷的尖上。';note('新荷与蜻蜓重逢。匣中的小框能留住这一刻。');}else message='芦苇梢上伏着一只蜻蜓，似乎还没找到合意的落脚处。';break;
      case 'lotus':if(item==='frame'&&s.visitor)panel='frame';else message=s.visitor?'荷尖上的客人停住了。留住这个瞬间吧。':'新荷刚刚露尖，旁边的芦苇似乎动了一下。';break;
      case 'fish':if(s.water){s.bonus=true;panel='bonus';note('水下的小鱼，带来了另一首诗。');}else message='荷叶边有一点浅浅的鱼影，等水来。';break;
    }
    return {state:s,message,panel};
  }
  function restore(raw){
    const s=initial();if(!raw||typeof raw!=='object')return s;
    if(['court','stream','pond'].includes(raw.room))s.room=raw.room;
    for(const key of ['stone','key','box','planted','water','visitor','finished','bonus','reedClue'])s[key]=raw[key]===true;
    if(Array.isArray(raw.pipes)&&raw.pipes.length===5&&raw.pipes.every(n=>Number.isInteger(n)&&n>=0&&n<4))s.pipes=raw.pipes;
    s.key=s.key&&s.stone;s.box=s.box&&s.key;s.planted=s.planted&&s.box;s.water=s.water&&flow(s.pipes).solved;s.visitor=s.visitor&&s.planted&&s.water;s.finished=s.finished&&s.visitor;s.bonus=s.bonus&&s.water;
    s.notes=Array.isArray(raw.notes)?raw.notes.filter(n=>typeof n==='string'&&n.length<150).slice(0,12):[];
    if(s.finished&&Number.isFinite(raw.capture?.x)&&Number.isFinite(raw.capture?.y))s.capture={x:Math.min(820,Math.max(180,raw.capture.x)),y:Math.min(465,Math.max(135,raw.capture.y))};
    for(const key of ['key','box','plant','water','visitor','frame','done'])s.hintCounts[key]=Math.min(3,Math.max(0,Math.floor(Number(raw.hintCounts?.[key])||0)));
    return s;
  }
  root.ShanyueMystery={initial,clone,flow,ports,cells,inventory,phase,act,restore};
  if(typeof module==='object'&&module.exports)module.exports=root.ShanyueMystery;
})(globalThis);
