'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pizza-domain.js'), 'utf8'), browser);
const PizzaDomain = browser.window.PizzaDomain;

// 실제 게임의 음표와 30개 단계 설정을 그대로 사용한다.
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const notesStart = source.indexOf('const NOTES = Object.freeze({');
const notesCode = source.slice(notesStart, source.indexOf('const CHARACTERS', notesStart));
const stagesStart = source.indexOf('function makeStages()');
const stagesEnd = 'const STAGES = makeStages();';
const stagesCode = source.slice(stagesStart, source.indexOf(stagesEnd, stagesStart) + stagesEnd.length);
const { NOTES, STAGES } = vm.runInNewContext(`${notesCode}\n${stagesCode}\n({ NOTES, STAGES })`, { COLORS: { red: 'red', purple: 'purple' } });
const domain = PizzaDomain.create(NOTES);
const item = (noteId, count) => ({noteId, count});

test('실제 조각으로 진행도를 계산하며 예상 밖 조각과 같은 총량의 오답을 구분한다', () => {
  const state = domain.progress({items:[item('quarter',2), item('half',1)]}, [{ticks:999, slices:['quarter','quarter','quarter','quarter']}]);
  assert.equal(state.requiredTicks, 16);
  assert.equal(state.placedTicks, 16);
  assert.equal(state.activePlateTicks, 16);
  assert.equal(state.quantityReady, true);
  assert.equal(state.exactMatch, false);
  assert.equal(state.items.find(x=>x.noteId==='quarter').excess, 2);
  assert.equal(state.items.find(x=>x.noteId==='half').remaining, 1);
  const wrong = domain.progress({items:[item('quarter',1)]}, [{slices:['quarter','sixteenth']}]);
  assert.equal(wrong.unexpected.length, 1);
  assert.equal(wrong.unexpected[0].noteId, 'sixteenth');
  assert.equal(wrong.unexpected[0].placed, 1);
  assert.equal(wrong.exactMatch, false);
  assert.equal(domain.progress({items:[]}, []).exactMatch, false);
});

test('동일 재료의 중복 주문을 합치고 1/16 조각도 정확하게 센다', () => {
  const state = domain.progress({items:[item('sixteenth',1),item('sixteenth',2)]}, [{slices:['sixteenth','sixteenth','sixteenth']}]);
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].required, 3);
  assert.equal(state.requiredTicks, 3);
  assert.equal(state.activePlateRemainingTicks, 13);
  assert.equal(state.exactMatch, true);
});

test('접시 경계를 실제로 채울 수 있는 주문만 해결 가능하다', () => {
  assert.equal(domain.isSolvable([item('dottedHalf',2)]), false); // 12 + 12
  assert.equal(domain.isSolvable([item('dottedHalf',2),item('quarter',1)]), true); // 12 + 4 | 12
  assert.equal(domain.isSolvable([item('whole',1),item('half',1)]), true);
  assert.equal(domain.isSolvable([item('sixteenth',3)]), true);
  assert.equal(domain.isSolvable([item('whole',3),item('sixteenth',1)]), false);
  assert.equal(domain.isSolvable([item('bogus',1)]), false);
  assert.equal(domain.isSolvable([item('quarter',-1)]), false);
});

test('30개 실제 단계에서 고정 난수와 경계값으로 생성한 모든 주문이 유한하고 해결 가능하다', () => {
  assert.equal(STAGES.length, 30);
  for (const stage of STAGES) for (const n of [0, 0.25, 0.5, 0.999999]) for (const index of [0,1,2]) {
    let calls=0;
    const order = domain.generateItems(stage,index,()=>{ calls++; assert.ok(calls < 1000, '생성 시도 상한'); return n; });
    assert.ok(domain.isSolvable(order), `${stage.mode} ${stage.stage} 주문 ${JSON.stringify(order)}`);
    assert.ok(order.every(x=>stage.allowed.includes(x.noteId)));
    const firstIntroducesPiece = index === 0 && stage.newPiece;
    if (stage.mixRule && !firstIntroducesPiece) {
      assert.ok(order.some(x=>NOTES[x.noteId].kind==='note'));
      assert.ok(order.some(x=>NOTES[x.noteId].kind==='rest'));
    }
    if (!firstIntroducesPiece) assert.ok(order.reduce((s,x)=>s+x.count,0) >= stage.itemsPerOrder[0]);
  }
});

test('12종의 박자와 틱은 같은 음표·쉼표에서 일치하고 각도 합계가 한 접시와 같다', () => {
  const durations = [
    ['whole', 'wholeRest', 4, 16],
    ['dottedHalf', 'dottedHalfRest', 3, 12],
    ['half', 'halfRest', 2, 8],
    ['quarter', 'quarterRest', 1, 4],
    ['eighth', 'eighthRest', .5, 2],
    ['sixteenth', 'sixteenthRest', .25, 1],
  ];
  assert.equal(Object.keys(NOTES).length, 12);
  for (const [noteId, restId, beats, ticks] of durations) {
    for (const id of [noteId, restId]) {
      assert.equal(NOTES[id].beats, beats);
      assert.equal(NOTES[id].ticks, ticks);
      assert.equal(beats * 90, ticks / PizzaDomain.PLATE_TICKS * 360);
    }
    assert.equal(NOTES[noteId].kind, 'note');
    assert.equal(NOTES[restId].kind, 'rest');
  }
});

test('순서와 같은 박자의 대체 재료를 구분하며 기존 판정 비율을 보존한다', () => {
  const order = { items: [item('half', 1), item('quarter', 2)] };
  assert.equal(domain.judge(order, [{ slices: ['quarter', 'half', 'quarter'] }]).grade, 'PERFECT');
  const sameBeats = domain.judge(order, [{ slices: ['quarter', 'quarter', 'quarter', 'quarter'] }]);
  assert.equal(sameBeats.grade, 'PARTIAL');
  assert.equal(sameBeats.accuracy, 2 / 3);
  assert.equal(sameBeats.correct, 2);
  assert.equal(sameBeats.wrong, 2);
  assert.equal(domain.judge({ items: [item('quarter', 1)] }, [{ slices: ['quarterRest'] }]).grade, 'MISS');
  assert.equal(domain.judge(order, [{ slices: ['half'] }]).grade, 'MISS');
  assert.equal(domain.judge(order, [{ slices: ['quarter', 'quarter'] }]).grade, 'PARTIAL');
  assert.equal(domain.judge({ items: [] }, []).grade, 'MISS');
  const immutable = JSON.stringify(order);
  domain.judge(order, [{ slices: ['quarter', 'half', 'quarter'] }]);
  assert.equal(JSON.stringify(order), immutable);
});

test('재료 한 종류의 생성과 비정상 난수도 정해진 횟수 안에 안전한 주문으로 끝난다', () => {
  for (const id of Object.keys(NOTES)) {
    for (const random of [() => 0, () => 1, () => -1, () => NaN, () => Infinity]) {
      let calls = 0;
      const generated = domain.generateItems({ allowed: [id], itemsPerOrder: [2, 2] }, 1, () => {
        assert.ok(++calls <= 120, '한 재료의 반복 추첨은 상한을 넘지 않음');
        return random();
      });
      assert.equal(generated.length, 1);
      assert.equal(generated[0].noteId, id);
      assert.ok(domain.isSolvable(generated));
    }
  }
});

// 주문의 부분집합으로 완전한 접시를 떼어 내는 독립 검산이다.
// 제품 코드의 재료별 남은 개수 탐색과 다른 표현으로 포장 가능성을 확인한다.
function independentlyPack(items) {
  const pieces = items.flatMap(row => Array(row.count).fill(NOTES[row.noteId].ticks));
  const total = pieces.reduce((sum, ticks) => sum + ticks, 0);
  if (total <= 0 || total > 48) return false;
  const sums = new Map([[0, 0]]);
  function sum(mask) {
    if (!sums.has(mask)) {
      const bit = mask & -mask;
      sums.set(mask, sum(mask ^ bit) + pieces[Math.log2(bit)]);
    }
    return sums.get(mask);
  }
  const memo = new Map();
  function pack(mask) {
    if (sum(mask) <= 16) return true;
    if (memo.has(mask)) return memo.get(mask);
    for (let subset = mask; subset; subset = (subset - 1) & mask) {
      if (sum(subset) === 16 && pack(mask ^ subset)) {
        memo.set(mask, true);
        return true;
      }
    }
    memo.set(mask, false);
    return false;
  }
  return pack((1 << pieces.length) - 1);
}

test('포장 판정은 독립 부분집합 검산과 일치하고 30단계의 연속 난수 주문에 해답이 있다', () => {
  const ids = ['dottedHalf', 'half', 'quarter', 'eighth', 'sixteenth'];
  for (const a of ids) for (const b of ids) for (const ca of [1, 2, 3]) for (const cb of [1, 2, 3]) {
    const items = [item(a, ca), item(b, cb)];
    assert.equal(domain.isSolvable(items), independentlyPack(items), JSON.stringify(items));
  }
  let state = 7;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (const stage of STAGES) for (let index = 0; index < stage.orders; index++) {
    const items = domain.generateItems(stage, index, random);
    assert.ok(independentlyPack(items), `${stage.mode} ${stage.stage}: ${JSON.stringify(items)}`);
  }
});
