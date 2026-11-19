/* 음악 규칙에서 DOM과 화면 상태를 분리한다. 브라우저와 Node에서 같은 순수 함수를 쓴다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PizzaDomain = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const PLATE_TICKS = 16;
  const MAX_ORDER_TICKS = 48;

  function create(notes) {
    if (!notes || typeof notes !== 'object') throw new TypeError('재료 정의가 필요합니다.');
    const known = id => Object.prototype.hasOwnProperty.call(notes, id);
    const valid = id => known(id) && Number.isInteger(notes[id].ticks) && notes[id].ticks > 0 && notes[id].ticks <= PLATE_TICKS;
    const flatten = plates => (Array.isArray(plates) ? plates : []).flatMap(p => Array.isArray(p.slices) ? p.slices : []);
    function counts(ids) {
      const out = Object.create(null);
      for (const id of ids) out[id] = (out[id] || 0) + 1;
      return out;
    }
    function normalize(items) {
      if (!Array.isArray(items) || items.length === 0) return null;
      const tally = Object.create(null);
      for (const item of items) {
        if (!item || !valid(item.noteId) || !Number.isInteger(item.count) || item.count <= 0) return null;
        tally[item.noteId] = (tally[item.noteId] || 0) + item.count;
        if (tally[item.noteId] > MAX_ORDER_TICKS) return null;
      }
      return Object.keys(tally).map(noteId => ({ noteId, count: tally[noteId] }));
    }
    /** 현재 규칙: 접시는 정확히 16틱을 채워야 다음 접시가 열림. */
    function isSolvable(items) {
      const rows = normalize(items);
      if (!rows) return false;
      const total = rows.reduce((n, row) => n + row.count * notes[row.noteId].ticks, 0);
      if (total <= 0 || total > MAX_ORDER_TICKS) return false;
      const remaining = rows.map(x => x.count);
      const memo = new Map();
      function solve(used, left) {
        if (left === 0) return true;
        const key = used + ':' + remaining.join(',');
        if (memo.has(key)) return memo.get(key);
        for (let i = 0; i < rows.length; i++) {
          const value = notes[rows[i].noteId].ticks;
          if (!remaining[i] || used + value > PLATE_TICKS) continue;
          remaining[i]--;
          if (solve((used + value) % PLATE_TICKS, left - value)) { remaining[i]++; memo.set(key, true); return true; }
          remaining[i]++;
        }
        memo.set(key, false);
        return false;
      }
      return solve(0, total);
    }
    function progress(order, plates) {
      const items = normalize(order?.items) || [];
      const have = counts(flatten(plates));
      const need = Object.fromEntries(items.map(x => [x.noteId, x.count]));
      const entries = items.map(({ noteId, count: required }) => {
        const placed = have[noteId] || 0;
        return { noteId, required, placed, remaining: Math.max(0, required - placed), excess: Math.max(0, placed - required), complete: placed === required };
      });
      const unexpected = Object.keys(have).filter(id => !need[id]).map(noteId => ({ noteId, placed: have[noteId] }));
      const requiredTicks = items.reduce((sum, x) => sum + notes[x.noteId].ticks * x.count, 0);
      const placedTicks = flatten(plates).reduce((sum, id) => sum + (valid(id) ? notes[id].ticks : 0), 0);
      const current = Array.isArray(plates) && plates.length ? plates[plates.length - 1] : { slices: [] };
      const activePlateTicks = (current.slices || []).reduce((sum, id) => sum + (valid(id) ? notes[id].ticks : 0), 0);
      return { items: entries, unexpected, requiredTicks, placedTicks, remainingTicks: Math.max(0, requiredTicks - placedTicks), activePlateTicks, activePlateRemainingTicks: Math.max(0, PLATE_TICKS - activePlateTicks), quantityReady: requiredTicks > 0 && requiredTicks === placedTicks, exactMatch: items.length > 0 && unexpected.length === 0 && entries.every(x => x.complete) };
    }
    /** 판정은 화면의 카운터나 배치 순서 대신 주문과 실제 조각을 비교한다. */
    function judge(order, plates) {
      const rows = normalize(order?.items) || [];
      const need = Object.fromEntries(rows.map(row => [row.noteId, row.count]));
      const have = Object.fromEntries(Object.entries(counts(flatten(plates))));
      let correct = 0;
      let total = 0;
      for (const { noteId, count } of rows) {
        correct += Math.min(count, have[noteId] || 0);
        total += count;
      }
      let wrong = 0;
      for (const [noteId, count] of Object.entries(have)) {
        wrong += Math.max(0, count - (need[noteId] || 0));
      }
      const accuracy = total ? correct / total : 0;
      const grade = accuracy === 1 && wrong === 0 ? 'PERFECT' : accuracy >= .5 ? 'PARTIAL' : 'MISS';
      return { grade, accuracy, correct, wrong, need, have };
    }
    function randomIndex(random, length) {
      const n = Number(random());
      return Math.min(length - 1, Math.max(0, Math.floor((Number.isFinite(n) ? n : 0) * length)));
    }
    function pick(random, arr) { return arr[randomIndex(random, arr.length)]; }
    function generateItems(config, index, random = Math.random) {
      const allowed = [...new Set((config?.allowed || []).filter(valid))];
      if (!allowed.length) throw new RangeError('사용할 수 있는 재료가 없습니다.');
      if (index === 0 && allowed.includes(config.newPiece)) {
        const limit = Math.min(2, Math.max(1, Number(config.itemsPerOrder?.[1]) || 1));
        for (let n = limit; n >= 1; n--) {
          const items = [{ noteId: config.newPiece, count: n }];
          if (isSolvable(items)) return items;
        }
      }
      const noteIds = allowed.filter(id => notes[id].kind === 'note');
      const restIds = allowed.filter(id => notes[id].kind === 'rest');
      const mixed = !!config.mixRule && noteIds.length > 0 && restIds.length > 0;
      const lo = Math.max(mixed ? 2 : 1, Math.min(12, Number(config.itemsPerOrder?.[0]) || 1));
      const hi = Math.max(lo, Math.min(12, Number(config.itemsPerOrder?.[1]) || lo));
      for (let attempt = 0; attempt < 40; attempt++) {
        const target = lo + randomIndex(random, hi - lo + 1);
        const ids = mixed ? [pick(random, noteIds), pick(random, restIds)] : [];
        while (ids.length < target) ids.push(pick(random, allowed));
        const c = counts(ids);
        const items = Object.keys(c).map(noteId => ({ noteId, count: c[noteId] }));
        if (isSolvable(items)) return items;
      }
      // 최소 조각 수를 유지할 수 있는 결정적 대체 경로. 난수 값에 의존하지 않는다.
      const sorted = [...allowed].sort((a, b) => notes[a].ticks - notes[b].ticks);
      if (mixed) for (const a of noteIds) for (const b of restIds) for (const filler of sorted) {
        const c = counts([a, b, ...Array(Math.max(0, lo - 2)).fill(filler)]);
        const items = Object.keys(c).map(noteId => ({ noteId, count: c[noteId] }));
        if (isSolvable(items)) return items;
      }
      if (!mixed) for (const id of sorted) {
        const items = [{ noteId: id, count: lo }];
        if (isSolvable(items)) return items;
      }
      // 잘못된 외부 단계 설정에 대해서도 종료하며 안전한 한 조각을 제공한다.
      return [{ noteId: sorted[0], count: 1 }];
    }
    return Object.freeze({ progress, judge, isSolvable, generateItems });
  }
  return Object.freeze({ create, PLATE_TICKS, MAX_ORDER_TICKS });
});
