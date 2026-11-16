const assert=require('node:assert/strict');
const {collectContent}=require('../scripts/content.js');
const {validateLibrary}=require('../src/data/library.js');
const P=require('../src/data/personal-content.js');
const seed=collectContent(),copy=x=>JSON.parse(JSON.stringify(x));
const work=(lib,id)=>lib.works.find(w=>w.id===id);
const tags=new Map(seed.tags.map(t=>[t.id,t]));
const within=(id,parent)=>{while(id){if(id===parent)return true;id=tags.get(id)?.parent;}return false;};
for(const w of seed.works){
  const hasPlace=w.tags.some(id=>within(id,'geography'));
  assert.equal(hasPlace,!!w.extra.places,w.id+' must pair place tags with contextual explanations');
}
assert(work(seed,'chunyu').tags.includes('geo_chengdu'));
assert.match(work(seed,'chunyu').extra.places,/锦官城 → 成都/);
assert(!work(seed,'jiuyuejiuriyishandongxiongdi').tags.some(id=>within(id,'geo_region_shandong')),'Ancient Shandong must not imply modern Shandong');
assert.match(work(seed,'baixuegesongwupanguanguijing').extra.places,/不是同一地点/);
assert(work(seed,'chibifu').tags.includes('geo_ezhou'),'Ancient Wuchang here is Ezhou');
assert(work(seed,'huixiangoushu').tags.includes('geo_hangzhou'),'Yongxing in historical Yuezhou is now Xiaoshan, Hangzhou');
assert(work(seed,'yugezi').tags.some(id=>within(id,'geo_region_uncertain')));
assert(work(seed,'wuti').tags.some(id=>within(id,'geo_region_imagined')));
assert(!work(seed,'jingyesi').extra.places,'Do not infer geography from author birthplace');
// A content package made before the optional discovery dimension must stay readable.
const old=copy(seed);
delete old.discovery.places;
old.tags=old.tags.filter(t=>!within(t.id,'geography'));
old.modules=old.modules.filter(m=>m.id!=='places');
for(const w of old.works){w.tags=w.tags.filter(id=>!within(id,'geography'));delete w.extra.places;}
const normalized=validateLibrary(old),baseline=P.fingerprints(old);
assert(!Object.hasOwn(normalized.discovery,'places'));
assert.deepEqual(P.migrate(seed,normalized,baseline).library,seed,'Untouched old content must adopt published geography');
const changed=copy(normalized);
work(changed,'chunyu').thought='我记下的雨夜心情';
const upgraded=P.migrate(seed,changed,baseline).library;
assert.deepEqual(upgraded.discovery.places,seed.discovery.places);
assert.equal(work(upgraded,'chunyu').extra.places,work(seed,'chunyu').extra.places);
assert.equal(work(upgraded,'chunyu').thought,'我记下的雨夜心情');
const custom=copy(seed);
work(custom,'chunyu').extra.places='锦官城 → 成都\n\n我走过浣花溪。';
const next=copy(seed);
work(next,'chunyu').background+=' 新的背景补充。';
const backedUp=JSON.parse(JSON.stringify(P.diff(seed,custom)));
assert.equal(work(P.apply(next,backedUp).library,'chunyu').extra.places,work(custom,'chunyu').extra.places);
console.log('PASS: geographic contexts, disputed and imagined places, old-package migration and personal place notes');
