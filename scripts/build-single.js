const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const data = require('./content.js').collectContent();
const mystery = require('./mystery.js').collectMystery(data);
let html = read('src/shell.html');
html = html.replace('/* INLINE_STYLES */', () => read('src/style.css')+'\n'+read('src/experience.css')+'\n'+read('src/games/puzzle.css')+'\n'+read('src/games/garden.css'));
html = html.replace('"INLINE_MYSTERY"', () => JSON.stringify(mystery).replace(/</g, '\\u003c'));
html = html.replace('"INLINE_LIBRARY"', () => JSON.stringify(data).replace(/</g, '\\u003c'));
html = html.replace('/* INLINE_DATA */', () => read('src/data/library.js')+'\n'+read('src/data/personal-content.js'));
html = html.replace('"INLINE_LEGACY"', () => read('src/data/legacy-v1-fingerprints.json'));
const mysteryCode=['model.js','chapter.js','art.js','motion.js','view.js'].map(file=>read('src/games/mystery/'+file)).join('\n')
  .replace("'INLINE_MYSTERY_POND'",()=>JSON.stringify(read('src/art/mystery/pond.svg')))
  .replace("'INLINE_MYSTERY_CSS'",()=>JSON.stringify(read('src/games/mystery/view.css')))
  .replace("'INLINE_MYSTERY_TEMPLATE'",()=>JSON.stringify(read('src/games/mystery/view.html')));
html = html.replace('/* INLINE_APP */', () => read('src/experience.js')+'\n'+read('src/games/poem-puzzle.js')+'\n'+read('src/games/puzzle-view.js')+'\n'+mysteryCode+'\n'+read('src/games/garden.js')+'\n'+read('src/app.js'));
fs.writeFileSync(path.join(root, 'offline.html'), html);
console.log('Built offline.html · ' + data.works.length + ' works · ' + Math.round(Buffer.byteLength(html) / 1024) + ' KB');
