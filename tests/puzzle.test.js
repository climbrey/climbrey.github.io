const assert = require('assert');
const Puzzle = require('../src/games/poem-puzzle.js');
const library = require('../scripts/content.js').collectContent();
const rounds = Puzzle.collect(library.works);
assert(rounds.length > 20);
const clean = text => text.replace(/\s/g, '');
for (const round of rounds) {
  const work = library.works.find(w => w.id === round.workId);
  assert(clean(work.lines.join('')).includes(round.lines.join('')), '游戏选句须来自当前原文');
  assert(round.rows.every((row,i) => row.join('') + round.ends[i] === round.lines[i]), '碎片须完整还原句子');
  const state = Puzzle.create(round, () => 0.5);
  assert.strictEqual(new Set(state.order).size, round.pieces.length);
  assert(!state.order.every((id,i) => round.pieces[id] === round.pieces[i]), '碎片起始顺序不能已经完成');
  for (const id of state.order) Puzzle.place(state,id);
  let previous = Puzzle.status(state).correct;
  for (let n=0; !Puzzle.status(state).complete && n<round.pieces.length; n++) {
    assert(Puzzle.hint(state));
    const current = Puzzle.status(state).correct;
    assert(current > previous, '提示须向正确结果推进');
    previous = current;
    const used = state.placed.filter(id => id !== null);
    assert.strictEqual(new Set(used).size, used.length, '提示不能复制或丢失碎片');
  }
  assert(Puzzle.status(state).complete, '提示必须能引导所有选句完成');
}

const duplicate = Puzzle.collect([{id:'repeat',form:'五言绝句',lines:['明月明月照，','明月明月来。']}])[0];
const state = Puzzle.create(duplicate);
[2,1,0,3].forEach(id => assert(Puzzle.place(state,id)));
assert(Puzzle.status(state).complete, '相同文字的碎片应可互换');
assert(!Puzzle.place(state,0));
assert(!Puzzle.hint(state));
assert(Puzzle.undo(state));
assert(!Puzzle.status(state).complete);
const before = state.placed.slice();
assert(Puzzle.reset(state));
assert(state.placed.every(id => id === null));
assert(Puzzle.undo(state));
assert.deepStrictEqual(state.placed,before);
assert(!Puzzle.remove(state,-1));
assert(!Puzzle.place(state,Infinity));

assert.deepStrictEqual(Puzzle.collect([{id:'prose',form:'古文',lines:['人闲桂花落，夜静春山空。']}]), []);
assert.deepStrictEqual(Puzzle.collect([{id:'long',form:'诗',lines:['这里是一段很长的人闲桂花落，夜静春山空。']}]), []);
assert.deepStrictEqual(Puzzle.collect([{id:'unsafe',form:'诗',lines:['<img src=x>，夜静春山空。']}]), []);
const inline = Puzzle.collect([{id:'inline',form:'五言绝句',lines:['人闲桂花落，夜静春山空。月出惊山鸟，时鸣春涧中。']}]);
assert.strictEqual(inline.length,2, '同一物理行的两联均可发现');
assert.strictEqual(Puzzle.choose([],[]),null);
assert.strictEqual(Puzzle.choose([inline[0]],[inline[0].workId],inline[0]),inline[0]);
assert.strictEqual(Puzzle.choose(inline,['inline'],inline[0]).id,inline[1].id);
const first = Puzzle.choose(rounds,[],null,library.discovery.defaultWork);
assert.strictEqual(first.workId,library.discovery.defaultWork);
assert.notStrictEqual(Puzzle.choose(rounds,[first.workId],first).workId,first.workId);
console.log('PASS: '+rounds.length+' genuine couplets, fragment conservation, duplicate text, hints, undo and limited libraries');
