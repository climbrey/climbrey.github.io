const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const data = require('./content.js').collectContent();
const feihua = require('./feihua.js').collectFeihua(data);
const mystery = require('./mystery.js').collectMystery(data);
const voyage = require('./voyage.js').collectVoyage(data);
let html = read('src/shell.html');
html = html.replace('/* INLINE_STYLES */', () => read('src/style.css')+'\n'+read('src/experience.css')+'\n'+read('src/games/puzzle.css')+'\n'+read('src/games/garden.css'));
html = html.replace('"INLINE_FEIHUA"', () => JSON.stringify(feihua).replace(/</g, '\\u003c'));
html = html.replace('"INLINE_VOYAGE"', () => JSON.stringify(voyage).replace(/</g, '\\u003c'));
html = html.replace('"INLINE_MYSTERY"', () => JSON.stringify(mystery).replace(/</g, '\\u003c'));
html = html.replace('"INLINE_LIBRARY"', () => JSON.stringify(data).replace(/</g, '\\u003c'));
html = html.replace('/* INLINE_DATA */', () => read('src/data/library.js')+'\n'+read('src/data/personal-content.js'));
html = html.replace('"INLINE_LEGACY"', () => read('src/data/legacy-v1-fingerprints.json'));
const mysteryCode=['model.js','chapter.js','art.js','motion.js','view.js'].map(file=>read('src/games/mystery/'+file)).join('\n')
  .replace("'INLINE_MYSTERY_POND'",()=>JSON.stringify(read('src/art/mystery/pond.svg')))
  .replace("'INLINE_MYSTERY_CSS'",()=>JSON.stringify(read('src/games/mystery/view.css')))
  .replace("'INLINE_MYSTERY_TEMPLATE'",()=>JSON.stringify(read('src/games/mystery/view.html')));
const feihuaCode=['model.js','art.js','view.js'].map(file=>read('src/games/feihua/'+file)).join('\n')
  .replace("'INLINE_FEIHUA_CSS'",()=>JSON.stringify(read('src/games/feihua/view.css')))
  .replace("'INLINE_FEIHUA_TEMPLATE'",()=>JSON.stringify(read('src/games/feihua/view.html')));
const voyageCode=['model.js','art.js','motion.js','view.js'].map(file=>read('src/games/voyage/'+file)).join('\n')
  .replace("'INLINE_VOYAGE_CSS'",()=>JSON.stringify(read('src/games/voyage/view.css')))
  .replace("'INLINE_VOYAGE_TEMPLATE'",()=>JSON.stringify(read('src/games/voyage/view.html')));
html = html.replace('/* INLINE_APP */', () => read('src/experience.js')+'\n'+read('src/games/poem-puzzle.js')+'\n'+read('src/games/puzzle-view.js')+'\n'+mysteryCode+'\n'+feihuaCode+'\n'+voyageCode+'\n'+read('src/games/garden.js')+'\n'+read('src/app.js'));
fs.writeFileSync(path.join(root, 'offline.html'), html);
console.log('Built offline.html · ' + data.works.length + ' works · ' + Math.round(Buffer.byteLength(html) / 1024) + ' KB');
