const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const os=require('os');
const Model=require('../src/games/scene-trails.js');
const {collectScenes}=require('../scripts/scenes.js');
const library=require('../scripts/content.js').collectContent();
const bundle=collectScenes(library),copy=value=>JSON.parse(JSON.stringify(value));
assert.equal(bundle.scenes.length,3);
assert.equal(Model.available(bundle.scenes,library).length,3);
for(const scene of Model.available(bundle.scenes,library)){
  assert.equal(scene.options.length,3);
  for(const o of scene.options)assert.deepEqual(o.quote,o.expected);
  for(const c of scene.clues)assert(bundle.art[scene.id].includes('data-detail="'+c.target+'"'));
}
const changed=copy(library);changed.works.find(w=>w.id==='xiaochi').lines[2]='校核后已修改的原文，';
assert.deepEqual(Model.available(bundle.scenes,changed).map(s=>s.id),['snow','window']);
assert.throws(()=>collectScenes(changed),/校核引文/);
const removed=copy(library);removed.works=removed.works.filter(w=>w.id!=='jiangxue');
assert.deepEqual(Model.available(bundle.scenes,removed).map(s=>s.id),['pond']);
const reassigned=copy(library);reassigned.works.find(w=>w.id==='xiaochi').author='libai';
assert.deepEqual(Model.available(bundle.scenes,reassigned).map(s=>s.id),['snow','window']);
const renamed=copy(library);renamed.works.find(w=>w.id==='xiaochi').title='用户补充的标题';
assert.equal(Model.available(bundle.scenes,renamed)[0].options.find(o=>o.workId==='xiaochi').title,'用户补充的标题');
assert.equal(Model.available(bundle.scenes,{works:[],authors:{}}).length,0);
for(const mutate of [s=>s.push(s[0]),s=>s[0].clues[0].x=NaN,s=>s[0].clues[0].target='../unsafe',s=>s[0].answer='missing',s=>s[0].options[0].expected=[],s=>s[0].options[0].lines=[1,1],s=>s[0].options[1].workId=s[0].options[0].workId]){
  const data=copy(bundle.scenes);mutate(data);assert.throws(()=>Model.validate(data));
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shanyue-scenes-'));
try{
  fs.cpSync(path.resolve(__dirname,'../content/games'),path.join(dir,'content/games'),{recursive:true});
  fs.cpSync(path.resolve(__dirname,'../src/art'),path.join(dir,'src/art'),{recursive:true});
  const file=path.join(dir,'src/art/scene-trails/pond.svg'),original=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,original.replace('</svg>','<script>alert(1)</script></svg>'));
  assert.throws(()=>collectScenes(library,dir),/静态 SVG/);
  fs.writeFileSync(file,original.replace('data-detail="lotus"','data-detail="missing"'));
  assert.throws(()=>collectScenes(library,dir),/图层不存在/);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
const html=fs.readFileSync(path.resolve(__dirname,'../offline.html'),'utf8');
const embedded=JSON.parse(html.match(/<script id="scene-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(embedded,bundle);
assert(!html.includes('INLINE_SCENE_TEMPLATE'));
console.log('PASS: scene references, original changes/removals, author identity, coordinates, static art and embedded delivery');
