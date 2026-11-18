const fs=require('fs');
const path=require('path');
const Model=require('../src/games/feihua/model.js');
function collectFeihua(library){
  const settings=Model.config(JSON.parse(fs.readFileSync(path.join(__dirname,'../content/games/feihua/settings.json'),'utf8')));
  const pool=Model.collect(library,settings);
  for(const {char} of settings.words)if(pool.filter(l=>l.text.includes(char)).length<2)throw Error('飞花令令字「'+char+'」需要至少两句可用的原诗');
  return settings;
}
module.exports={collectFeihua};
