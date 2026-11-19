const fs=require('fs');
const path=require('path');
const M=require('../src/games/voyage/model.js');
function collectVoyage(library){
  const chapter=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/games/voyage/chapter.json'),'utf8'));
  if(M.compatible(library,chapter).length!==chapter.routes.length)throw Error('借水行舟：原诗引用与内容不符');
  return chapter;
}
module.exports={collectVoyage};
