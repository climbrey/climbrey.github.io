const fs=require('fs');
const path=require('path');
const Model=require('../src/games/scene-trails.js');
const ROOT=path.resolve(__dirname,'..');
function collectScenes(library,root=ROOT){
  const dir=path.join(root,'content/games/scene-trails');
  const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort():[];
  const rows=Model.validate(files.map(file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))));
  const playable=Model.available(rows,library);
  for(const row of rows)if(!playable.some(s=>s.id===row.id))throw Error('寻景配置 '+row.id+'：作品、作者或校核引文已变化，请审阅后更新配置');
  const art={};
  for(const row of rows){
    const svg=fs.readFileSync(path.join(root,'src/art/scene-trails',row.id+'.svg'),'utf8').trim();
    if(!svg.startsWith('<svg ')||!svg.endsWith('</svg>')||/<(?:script|foreignObject|image|use|a)\b|\bon\w+\s*=|(?:href|src)\s*=|<!|<\?|<style|@import/i.test(svg))throw Error('寻景插画只能使用内置静态 SVG：'+row.id);
    for(const clue of row.clues)if(!svg.includes('data-detail="'+clue.target+'"'))throw Error('寻景图层不存在：'+row.id+'/'+clue.target);
    art[row.id]=svg;
  }
  return {scenes:rows,art};
}
module.exports={collectScenes};
