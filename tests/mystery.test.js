const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const M=require('../src/games/mystery/model.js'),Chapter=require('../src/games/mystery/chapter.js');
const lib=require('../scripts/content.js').collectContent(),chapter=require('../scripts/mystery.js').collectMystery(lib),copy=o=>JSON.parse(JSON.stringify(o));
let s=M.initial();assert(!M.flow(s.pipes).solved);assert(M.flow([0,3,1,3,1]).solved);assert(M.flow([2,3,1,3,3]).solved);
for(let i=0;i<5;i++){const p=[0,3,1,3,1];p[i]=(p[i]+1)%4;assert(!M.flow(p).solved);}
assert(!M.act(s,'box','key').state.box);assert(!M.act(s,'key').state.key);
s=M.act(s,'stone').state;s=M.act(s,'key').state;assert.deepEqual(M.inventory(s),['key']);
const wrong=M.act(s,'soil','key');assert(!wrong.state.planted);assert.deepEqual(M.inventory(wrong.state),['key']);
s=M.act(s,'box','key').state;assert.deepEqual(M.inventory(s),['seed','frame']);s=M.act(s,'soil','seed').state;assert(s.planted);assert(!M.act(s,'twig').state.visitor);
s.pipes=[0,3,1,3,1];s.water=true;s=M.act(s,'twig').state;assert(s.visitor);assert.equal(M.act(s,'lotus','frame').panel,'frame');
let alt={...M.initial(),water:true,pipes:[0,3,1,3,1]};for(const [target,item] of [['stone'],['key'],['box','key'],['soil','seed'],['twig']])alt=M.act(alt,target,item).state;assert(alt.visitor);
assert(M.act(s,'fish').state.bonus);assert.equal(M.phase({...s,finished:true}),'done');
assert.deepEqual(M.restore({...s,finished:true,capture:{x:555,y:355}}).capture,{x:555,y:355});assert(!M.restore({finished:true,visitor:true,water:true}).finished);assert.deepEqual(M.restore({pipes:[8,0,0,0,0]}).pipes,M.initial().pipes);
assert.equal(Chapter.resolve(chapter,lib).poem.title,'小池');
const changed=copy(lib);changed.works.find(w=>w.id==='xiaochi').lines[2]='个人改写的句子';assert.equal(Chapter.resolve(chapter,changed),null);
const author=copy(lib);author.works.find(w=>w.id==='xiaochi').author='libai';assert.equal(Chapter.resolve(chapter,author),null);
const renamed=copy(lib);renamed.works.find(w=>w.id==='xiaochi').title='新的标题';assert.equal(Chapter.resolve(chapter,renamed).poem.title,'新的标题');
for(const mutate of [c=>c.hints.key=[],c=>c.poem.lines=[3,2],c=>c.rooms[0].id='unknown',c=>c.poem.authorId='../bad']){const c=copy(chapter);mutate(c);assert.throws(()=>Chapter.validate(c));}
const html=fs.readFileSync(path.resolve(__dirname,'../offline.html'),'utf8');assert(!html.includes('INLINE_MYSTERY'));
assert.deepEqual(JSON.parse(html.match(/<script id="mystery-data" type="application\/json">([\s\S]*?)<\/script>/)[1]),chapter);
console.log('PASS: mystery channel topology, inventory, both puzzle orders, progress, checked author/text references and standalone delivery');
