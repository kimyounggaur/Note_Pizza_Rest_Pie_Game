/* Durable, backward-compatible storage for Note Pizza. No DOM dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PizzaSave = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const V1 = 'npizza.save.v1', V2 = 'npizza.save.v2', BACKUP = 'npizza.save.v1.backup';
  const MODES = ['pizza', 'pie', 'mix'];
  const TICKS = {whole:16, wholeRest:16, dottedHalf:12, dottedHalfRest:12, half:8, halfRest:8, quarter:4, quarterRest:4, eighth:2, eighthRest:2, sixteenth:1, sixteenthRest:1};
  const knownNote = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(TICKS,id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const integer = n => number(n) && Number.isSafeInteger(n);
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const strings = x => Array.isArray(x) && x.every(y => typeof y === 'string' && y.length > 0) && new Set(x).size === x.length;
  function storageOf(storage) { try { return storage || globalThis.localStorage; } catch (_) { return null; } }
  function merge(defaults, value) {
    const out = {};
    for (const key of Object.keys(defaults)) {
      const v = value[key], d = defaults[key];
      out[key] = v === undefined ? clone(d) : object(d) && object(v) ? merge(d, v) : clone(v);
    }
    for (const key of Object.keys(value)) if (!(key in out) && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') out[key] = clone(value[key]);
    return out;
  }
  function validateSave(s) {
    if (!object(s) || s.schemaVersion !== 1 || !integer(s.coins) || !integer(s.totalServes) || !integer(s.totalPerfectServes) || s.totalPerfectServes > s.totalServes || !object(s.settings) || !object(s.tutorialDone) || !object(s.progress) || !object(s.rushBest) || !strings(s.codexUnlocked)) return false;
    if (!['on','off','bgmOff','muteAll'].includes(s.settings.sound) || typeof s.settings.skin !== 'string' || !['haptic','lefty','showBeats','slowMode'].every(k => typeof s.settings[k] === 'boolean')) return false;
    if (s.lastPlayedAt !== null && typeof s.lastPlayedAt !== 'string' && !number(s.lastPlayedAt)) return false;
    return MODES.every(m => typeof s.tutorialDone[m] === 'boolean' && object(s.progress[m]) && integer(s.progress[m].unlocked) && s.progress[m].unlocked >= 1 && s.progress[m].unlocked <= 10 && Array.isArray(s.progress[m].stars) && s.progress[m].stars.length === 10 && s.progress[m].stars.every(x => integer(x) && x <= 3) && object(s.rushBest[m]) && number(s.rushBest[m].score) && integer(s.rushBest[m].servedOrders));
  }
  function orderValid(order) {
    if (!object(order) || typeof order.id !== 'string' || !order.id || !Array.isArray(order.items) || !order.items.length || order.items.length > 48) return false;
    const ids = [];
    for (const item of order.items) {
      if (!object(item) || !knownNote(item.noteId) || !integer(item.count) || item.count < 1 || item.count > 48 || ids.length + item.count > 48) return false;
      for (let i=0; i<item.count; i++) ids.push(item.noteId);
    }
    const ticks = ids.reduce((s, id) => s + TICKS[id], 0);
    if (ticks < 1 || ticks > 48 || order.totalTicks !== ticks || order.beats !== ticks/4) return false;
    if (order.sequence != null && (!Array.isArray(order.sequence) || order.sequence.length !== ids.length || [...order.sequence].sort().join('|') !== ids.sort().join('|'))) return false;
    return typeof order.customerId === 'string' && order.customerId.length > 0;
  }
  function validateSnapshot(s) {
    if (!object(s) || s.version !== 1 || typeof s.sessionId !== 'string' || !s.sessionId || !MODES.includes(s.mode) || !integer(s.stage) || s.stage < 1 || s.stage > 10 || !['practice','challenge','rush'].includes(s.activity) || typeof s.rush !== 'boolean' || !Array.isArray(s.orders) || !s.orders.length || s.orders.length > 999 || !s.orders.every(orderValid) || new Set(s.orders.map(o => o.id)).size !== s.orders.length || !integer(s.orderIndex) || s.orderIndex >= s.orders.length || s.orderId !== s.orders[s.orderIndex].id || !strings(s.awardedOrderIds)) return false;
    if (s.awardedOrderIds.includes(s.orderId) || !s.awardedOrderIds.every(id => s.orders.slice(0, s.orderIndex).some(o => o.id === id))) return false;
    if (!Array.isArray(s.plates) || !s.plates.length || s.plates.length > 3) return false;
    let total = 0;
    for (let i=0; i<s.plates.length; i++) {
      const p = s.plates[i];
      if (!object(p) || p.index !== i || !Array.isArray(p.slices) || p.slices.length > 16 || !p.slices.every(knownNote)) return false;
      const ticks = p.slices.reduce((sum,id) => sum + TICKS[id],0);
      if (ticks > 16 || (i < s.plates.length-1 && ticks !== 16)) return false;
      total += ticks;
    }
    if (total > s.orders[s.orderIndex].totalTicks || !object(s.timer) || !number(s.timer.limitSec) || s.timer.limitSec <= 0 || !(s.timer.leftMs === null && s.activity === 'practice') && (!number(s.timer.leftMs) || s.timer.leftMs <= 0 || s.timer.leftMs > s.timer.limitSec * 1000)) return false;
    if (![s.score,s.tips,s.combo,s.memoryRemainingMs].every(number) || !object(s.stageStats) || !['successes','firstTrySuccess','remainSec','tips'].every(k => number(s.stageStats[k])) || !integer(s.stageStats.successes) || !integer(s.stageStats.firstTrySuccess) || s.stageStats.firstTrySuccess > s.stageStats.successes || s.stageStats.successes > s.orderIndex || typeof s.memoryVisible !== 'boolean') return false;
    return true;
  }
  function makeSnapshot(st, options) {
    try {
      options = options || {};
      if (!object(st) || st.screen !== 'KITCHEN' || st.busy || st.result || !st.currentOrder || !st.timer) return null;
      const now = number(options.now) ? options.now : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const activity = options.activity || st.activity || 'challenge';
      const s = {version:1, sessionId:options.sessionId || st.sessionId, mode:st.mode, stage:st.stage, activity, rush:!!st.rush, orders:clone(st.orders), orderIndex:st.orderIndex, orderId:st.currentOrder.id, plates:clone(st.plates), timer:{limitSec:st.timer.limitSec,leftMs:Number.isFinite(st.timer.leftMs) ? st.timer.leftMs : null}, score:st.score, tips:st.tips, combo:st.combo, stageStats:clone(st.stageStats), memoryVisible:!!st.memoryVisible, memoryRemainingMs:st.memoryVisible ? Math.max(0,st.memoryEndsAt-now) : 0, awardedOrderIds:clone(options.awardedOrderIds || st.awardedOrderIds || []), savedAt:Date.now()};
      return validateSnapshot(s) ? s : null;
    } catch (_) { return null; }
  }
  function restoreSnapshot(s, now) {
    try {
      if (!validateSnapshot(s)) return null;
      const time = number(now) ? now : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const plates = s.plates.map((p,index) => ({index,slices:[...p.slices],ticks:p.slices.reduce((n,id) => n+TICKS[id],0)}));
      return {screen:'KITCHEN',sessionId:s.sessionId,mode:s.mode,stage:s.stage,activity:s.activity,rush:s.rush,orders:clone(s.orders),orderIndex:s.orderIndex,currentOrder:clone(s.orders[s.orderIndex]),plates,servedTicks:plates.reduce((n,p)=>n+p.ticks,0),timer:{limitSec:s.timer.limitSec,leftMs:s.timer.leftMs === null ? Infinity : s.timer.leftMs,running:false,lastTick:time},score:s.score,tips:s.tips,combo:s.combo,stageStats:clone(s.stageStats),busy:false,result:null,hintId:null,memoryVisible:s.memoryVisible,memoryEndsAt:time+s.memoryRemainingMs,awardedOrderIds:[...s.awardedOrderIds],pauseReasons:['user'],overlay:{type:'pause',payload:{}}};
    } catch (_) { return null; }
  }
  function readParsed(raw) { try { return JSON.parse(raw); } catch (_) { return null; } }
  function backup(storage, key, raw) {
    let dest = key, existing = storage.getItem(dest);
    if (existing !== null && existing !== raw) { dest = key + '.' + Date.now(); let i=0; while (storage.getItem(dest) !== null) dest=key+'.'+Date.now()+'.'+(++i); }
    if (storage.getItem(dest) !== raw) storage.setItem(dest, raw);
    return storage.getItem(dest) === raw;
  }
  function ledgerMatches(session, ledger) { return !session || (validateSnapshot(session) && session.awardedOrderIds.length === ledger.length && session.awardedOrderIds.every(id => ledger.includes(id))); }
  function load(defaults, storage) {
    const fresh = () => clone(defaults);
    let recoveredSave = null;
    const failed = (status, save) => ({save:save || recoveredSave || fresh(),session:null,awardedOrderIds:[],status,writable:false});
    try {
      const store = storageOf(storage);
      if (!store) return failed('unavailable');
      const raw = store.getItem(V2);
      if (raw !== null) {
        const e = readParsed(raw);
        if (!object(e) || e.schemaVersion !== 2 || !object(e.save) || !strings(e.awardedOrderIds)) return failed('invalid_v2');
        const save = merge(defaults,e.save);
        if (!validateSave(save)) return failed('invalid_save');
        if (e.session != null && !ledgerMatches(e.session,e.awardedOrderIds)) {
          if (!backup(store,V2+'.invalid-session',raw)) return failed('backup_failed',save);
          return {save,session:null,awardedOrderIds:e.awardedOrderIds,status:'invalid_session',writable:true};
        }
        return {save,session:e.session || null,awardedOrderIds:e.awardedOrderIds,status:'ok',writable:true};
      }
      const old = store.getItem(V1);
      if (old === null) return {save:fresh(),session:null,awardedOrderIds:[],status:'new',writable:true};
      const parsed = readParsed(old);
      if (!object(parsed) || parsed.schemaVersion !== 1) return failed('invalid_v1');
      const save = merge(defaults,parsed);
      if (!validateSave(save)) return failed('invalid_v1');
      recoveredSave = save;
      if (!backup(store,BACKUP,old)) return failed('backup_failed',save);
      const envelope = {schemaVersion:2,save,session:null,awardedOrderIds:[],updatedAt:Date.now()};
      const encoded = JSON.stringify(envelope);
      store.setItem(V2,encoded);
      if (store.getItem(V2) !== encoded) return failed('write_failed',save);
      return {save,session:null,awardedOrderIds:[],status:'migrated',writable:true};
    } catch (_) { return failed('unavailable'); }
  }
  function write(data, storage) {
    try {
      const store = storageOf(storage);
      if (!store) return {ok:false,reason:'unavailable'};
      if (!object(data) || !validateSave(data.save) || !strings(data.awardedOrderIds || [])) return {ok:false,reason:'invalid_save'};
      const ids = data.awardedOrderIds || [], session = data.session || null;
      if (!ledgerMatches(session,ids)) return {ok:false,reason:'invalid_session'};
      const previous = store.getItem(V2);
      let previousEnvelope = null;
      if (previous !== null) {
        const e = readParsed(previous);
        previousEnvelope = e;
        if (!object(e) || e.schemaVersion !== 2 || !object(e.save) || !validateSave(e.save) || !strings(e.awardedOrderIds)) return {ok:false,reason:'protected_data'};
        const nextSessionId = data.sessionId || (session && session.sessionId);
        const previousSessionId = e.sessionId || (e.session && e.session.sessionId);
        if (nextSessionId && nextSessionId === previousSessionId && !e.awardedOrderIds.every(id => ids.includes(id))) return {ok:false,reason:'stale_ledger'};
      } else if (store.getItem(V1) !== null) {
        /* Migration must have created and verified a v1 backup first. */
        return {ok:false,reason:'migration_required'};
      }
      const sessionId = data.sessionId || (session && session.sessionId) || (ids.length && previousEnvelope && previousEnvelope.sessionId) || null;
      if (session && sessionId !== session.sessionId) return {ok:false,reason:'invalid_session'};
      const encoded=JSON.stringify({schemaVersion:2,save:data.save,session,sessionId,awardedOrderIds:ids,updatedAt:Date.now()});
      store.setItem(V2,encoded);
      if (store.getItem(V2) !== encoded) return {ok:false,reason:'write_failed'};
      return {ok:true};
    } catch (_) { return {ok:false,reason:'unavailable'}; }
  }
  return {load,write,makeSnapshot,restoreSnapshot,validateSave,validateSnapshot,keys:{v1:V1,v2:V2,backup:BACKUP}};
});
