const assert = require('assert');
const fs = require('fs');
const path = require('path');
const data = require('../scripts/content.js').collectContent();
const ids = new Set(data.works.map(w => w.id));
assert.strictEqual(ids.size, data.works.length, '作品标识必须唯一');
assert(data.works.length > 0, '内容库需至少有一篇作品');
const tags = new Map(data.tags.map(t => [t.id,t]));
const plain = text => text.replace(/[\p{P}\p{Z}\s]/gu, '');
assert.strictEqual(tags.size, data.tags.length, '标签标识必须唯一');
for (const tag of data.tags) {
  const visited = new Set([tag.id]);
  let parent = tag.parent;
  while (parent) {
    assert(tags.has(parent), '父分类必须存在');
    assert(!visited.has(parent), '分类不能构成循环');
    visited.add(parent); parent = tags.get(parent).parent;
  }
}
for (const w of data.works) {
  assert(data.authors[w.author], w.title + ' 缺少作者');
  assert(w.lines.length && w.lines.every(l => l.trim()), w.title + ' 原文为空');
  assert(Array.isArray(w.notes) && Array.isArray(w.reading) && Array.isArray(w.sources), w.title + ' 详情类型无效');
  assert(data.authors[w.author].bio.trim() && w.intro.trim() && w.background.trim() && w.thought.trim(), w.title + ' 缺少正式导读');
  assert(w.notes.length >= 2 && w.reading.length >= 2, w.title + ' 需有字词与具体细读');
  assert(w.sources.some(s => /https:\/\/[^\s]+/.test(s)), w.title + ' 缺少原文对照链接');
  assert(!w.lines.some(l => /一作[：:]|通[：:]|同[：:]/.test(l)), w.title + ' 版本旁注不应混入原文');
  for (const r of w.reading) {
    assert(r.title.trim() && r.text.trim() && r.quote.trim(), w.title + ' 细读不完整');
    assert(plain(w.lines.join('') + w.preface).includes(plain(r.quote)), w.title + ' 细读引文应与原文一致：' + r.quote);
  }
  if (w.title.includes('节选')) assert(w.sources.some(s => /节选范围|节选自|选文/.test(s)), w.title + ' 需说明节选首尾');
  assert(w.quote.length && w.quote.every(i => Number.isInteger(i) && i >= 0 && i < w.lines.length), w.title + ' 选句越界');
  assert(w.tags.every(t => tags.has(t)), w.title + ' 标签不存在');
  assert(w.related.every(r => ids.has(r.id) && r.id !== w.id && r.reason), w.title + ' 关联无效');
  assert(w.stage.every(s => ['小学','初中','高中'].includes(s)));
}
for (const topic of data.topics) assert(topic.works.every(id => ids.has(id)), '专题必须引用实际作品');
const html = fs.readFileSync(path.join(__dirname,'../offline.html'),'utf8');
assert(!html.includes('/* INLINE_') && !html.includes('"INLINE_LIBRARY"'), '构建占位符未替换');
assert(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(html), '单文件不可依赖联网资源');
assert(!/<(?:script|link|meta)\s+data-hosted-only\b/.test(html), '独立 HTML 不应包含站点资源依赖');
const embedded = JSON.parse(html.match(/<script id="library-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepStrictEqual(embedded,data, '交付文件应包含最新内容');
const hosted = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(hosted.includes('href="./manifest.webmanifest"') && hosted.includes('src="./pwa.js"'), '首页必须包含手机网页版入口');
const root = path.resolve(__dirname, '..');
for (const file of ['index.html', 'manifest.webmanifest', 'pwa.js', 'sw.js', '.nojekyll',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) {
  assert(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(root, 'site', file))), '根目录与部署包必须一致：' + file);
}
assert(!fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('__RELEASE__'), '离线缓存版本必须生成');
console.log('PASS: ' + data.works.length + ' 篇作品、分类引用、关联阅读、详情完整性、独立 HTML 与首页部署文件');
