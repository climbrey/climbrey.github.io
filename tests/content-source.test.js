const assert=require('node:assert/strict');
const fs=require('fs');
const os=require('os');
const path=require('path');
const YAML=require('yaml');
const {collectContent}=require('../scripts/content.js');
const source=path.resolve(__dirname,'../content');
function fixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shanyue-content-'));
  try {fs.cpSync(source,dir,{recursive:true});run(dir);}
  finally {fs.rmSync(dir,{recursive:true,force:true});}
}
const edit=(dir,file,change)=>{const p=path.join(dir,file);fs.writeFileSync(p,change(fs.readFileSync(p,'utf8')));};
fixture(dir=>{
  const before=collectContent(dir);
  const text=fs.readFileSync(path.join(dir,'works/tang/jingyesi.md'),'utf8').replace('id: jingyesi','id: newwork').replace('title: 静夜思','title: 新增测试作品');
  fs.mkdirSync(path.join(dir,'works/unknown'));
  fs.writeFileSync(path.join(dir,'works/unknown/newwork.md'),text);
  const after=collectContent(dir);
  assert.equal(after.works.length,before.works.length+1);
  assert.equal(after.works.find(w=>w.id==='newwork').title,'新增测试作品');
  fs.renameSync(path.join(dir,'works/unknown/newwork.md'),path.join(dir,'works/tang/moved.md'));
  assert.deepEqual(collectContent(dir),after,'Moving a file must not change its identity or order');
  fs.unlinkSync(path.join(dir,'works/tang/moved.md'));
  assert.deepEqual(collectContent(dir),before,'Unreferenced work deletion must require no registry edits');
  edit(dir,'authors/libai.md',text=>text+'\n共享作者补充资料。\n');
  assert(collectContent(dir).authors.libai.bio.endsWith('共享作者补充资料。'));
  const modules=YAML.parse(fs.readFileSync(path.join(dir,'modules.yaml'),'utf8'));
  modules.push({id:'place',label:'一处地名',enabled:true});
  fs.writeFileSync(path.join(dir,'modules.yaml'),YAML.stringify(modules));
  edit(dir,'works/tang/jingyesi.md',text=>text+'\n## 地名 {#place}\n\n长安。\n');
  assert.equal(collectContent(dir).works.find(w=>w.id==='jingyesi').extra.place,'长安。');
});
for(const [file,change,pattern] of [
  ['works/tang/jingyesi.md',s=>s.replace('author: libai','author: missing'),/jingyesi.md.*作者不存在/],
  ['works/tang/jingyesi.md',s=>s.replace('id: jingyesi','id: niaomingjian'),/标识重复/],
  ['works/tang/jingyesi.md',s=>s.replace('title: 静夜思','title: 静夜思\ntitle: 重复'),/unique|唯一|Map keys/i],
  ['works/tang/jingyesi.md',s=>s.replace('quote:\n  - 2','quote:\n  - 999'),/jingyesi.md.*选句越界/],
  ['works/tang/jingyesi.md',s=>s+'\n## 重复 {#lines}\n\n正文\n',/模块标识重复/],
  ['works/tang/jingyesi.md',s=>s.replace('author: libai','auther: libai'),/未知字段/],
  ['works/tang/jingyesi.md',s=>s.replace('id: shuidiaogetou','id: missing'),/关联作品无效/],
  ['taxonomy.yaml',s=>s.replace('id: landscape\n  name: 景物\n  parent: null','id: landscape\n  name: 景物\n  parent: moon'),/分类存在循环/],
  ['discovery.yaml',s=>s.replace('defaultWork: niaomingjian','defaultWork: missing'),/首页作品不存在/],
])fixture(dir=>{edit(dir,file,change);assert.throws(()=>collectContent(dir),pattern);});
console.log('PASS: automatic content discovery, moves/deletion, author reuse, custom modules and invalid-source diagnostics');
