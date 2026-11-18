const fs=require('fs'),path=require('path'),Chapter=require('../src/games/mystery/chapter.js');
function collectMystery(library){
  const chapter=Chapter.validate(JSON.parse(fs.readFileSync(path.resolve(__dirname,'../content/games/mystery/lotus-letter.json'),'utf8')));
  if(!Chapter.resolve(chapter,library))throw Error('荷塘来信引用的作品或作者已变化，请重新校核章节');
  const svg=fs.readFileSync(path.resolve(__dirname,'../src/art/mystery/pond.svg'),'utf8');
  if(/<(?:script|foreignObject|image|use|a)\b|\bon\w+\s*=|(?:href|src)\s*=|<!|<\?|<style|@import/i.test(svg))throw Error('诗境插画需要内置静态 SVG');
  return chapter;
}
module.exports={collectMystery};
