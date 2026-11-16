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
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const notesStart = html.indexOf('  const NOTES = Object.freeze({');
const notesCode = html.slice(notesStart, html.indexOf('\n  });', notesStart) + '\n  });'.length);
const stagesStart = html.indexOf('  function makeStages(){');
const stagesEnd = '  const STAGES = makeStages();';
const stagesCode = html.slice(stagesStart, html.indexOf(stagesEnd, stagesStart) + stagesEnd.length);
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
