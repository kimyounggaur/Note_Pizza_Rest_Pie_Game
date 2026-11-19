const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../js/pizza-save.js');
const P = globalThis.PizzaSave;
const defaults = () => ({schemaVersion:1,coins:0,settings:{sound:'on',haptic:true,skin:'default',lefty:false,showBeats:true,slowMode:false},tutorialDone:{pizza:false,pie:false,mix:false},progress:Object.fromEntries(['pizza','pie','mix'].map(k=>[k,{unlocked:1,stars:Array(10).fill(0)}])),rushBest:Object.fromEntries(['pizza','pie','mix'].map(k=>[k,{score:0,servedOrders:0}])),codexUnlocked:['quarter','quarterRest'],totalServes:0,totalPerfectServes:0,lastPlayedAt:null});
class Storage { constructor() { this.map=new Map(); } getItem(k) { return this.map.has(k) ? this.map.get(k) : null; } setItem(k,v) { this.map.set(k,String(v)); } }
function state() { const order = {id:'ord_pizza_1_0',items:[{noteId:'quarter',count:2}],totalTicks:8,beats:2,sequence:null,customerId:'beat'}; return {screen:'KITCHEN',mode:'pizza',stage:1,activity:'challenge',rush:false,orders:[order],orderIndex:0,currentOrder:order,plates:[{index:0,ticks:999,slices:['quarter']}],timer:{limitSec:40,leftMs:25000},score:0,tips:0,combo:0,stageStats:{successes:0,firstTrySuccess:0,remainSec:0,tips:0,lastResult:null},busy:false,result:null,memoryVisible:false}; }
test('v1 migration preserves raw backup and all records across reload',()=>{const store=new Storage(), original=defaults(); original.coins=57; original.progress.pizza.unlocked=4; original.progress.pizza.stars[0]=3; original.codexUnlocked.push('eighth'); original.rushBest.pie={score:44,servedOrders:2}; original.settings.lefty=true; original.extra={preserved:true};const raw=JSON.stringify(original);store.setItem(P.keys.v1,raw);const result=P.load(defaults(),store);assert.equal(result.status,'migrated');assert.equal(store.getItem(P.keys.v1),raw);assert.equal(store.getItem(P.keys.backup),raw);assert.deepEqual(result.save,original);assert.deepEqual(P.load(defaults(),store).save,original);});
test('unknown or corrupt versions are protected against overwrites',()=>{for (const raw of ['broken',JSON.stringify({schemaVersion:9,save:defaults(),awardedOrderIds:[]})]) {const store=new Storage();store.setItem(P.keys.v2,raw);assert.equal(P.load(defaults(),store).writable,false);assert.equal(P.write({save:defaults(),session:null},store).ok,false);assert.equal(store.getItem(P.keys.v2),raw);}});
test('quota failure keeps original save and gameplay data readable',()=>{const store=new Storage();const saved=defaults();saved.coins=23;store.setItem(P.keys.v1,JSON.stringify(saved));store.setItem=()=>{throw Error('quota');};const result=P.load(defaults(),store);assert.equal(result.writable,false);assert.equal(result.save.coins,23);assert.equal(JSON.parse(store.getItem(P.keys.v1)).coins,23);assert.equal(P.write({save:saved,session:null},store).ok,false);});
test('snapshot reload is paused, recomputes plate ticks and rejects corrupted orders',()=>{const snap=P.makeSnapshot(state(),{sessionId:'session-1',activity:'challenge',now:100});assert.ok(snap);const restored=P.restoreSnapshot(snap,200);assert.equal(restored.timer.running,false);assert.deepEqual(restored.pauseReasons,['user']);assert.equal(restored.servedTicks,4);assert.equal(restored.plates[0].ticks,4);snap.orders[0].totalTicks=100;assert.equal(P.restoreSnapshot(snap,200),null);});
test('resolving, expired and invalid snapshots cannot be resumed',()=>{const s=state();s.busy=true;assert.equal(P.makeSnapshot(s,{sessionId:'a'}),null);s.busy=false;s.timer.leftMs=0;assert.equal(P.makeSnapshot(s,{sessionId:'a'}),null);});
test('v2 progress, ledger and session are atomic and old snapshots are rejected',()=>{const store=new Storage(), save=defaults(), st=state(), snap=P.makeSnapshot(st,{sessionId:'abc'});assert.equal(P.write({save,session:snap,sessionId:'abc',awardedOrderIds:[]},store).ok,true);save.coins=5;assert.equal(P.write({save,session:null,sessionId:'abc',awardedOrderIds:[st.currentOrder.id]},store).ok,true);assert.equal(P.write({save,session:snap,sessionId:'abc',awardedOrderIds:[]},store).reason,'stale_ledger');const loaded=P.load(defaults(),store);assert.equal(loaded.save.coins,5);assert.equal(loaded.session,null);assert.deepEqual(loaded.awardedOrderIds,[st.currentOrder.id]);});
test('invalid snapshot is isolated without erasing progress',()=>{const store=new Storage(), save=defaults();save.coins=11;const raw=JSON.stringify({schemaVersion:2,save,session:{version:77},awardedOrderIds:[]});store.setItem(P.keys.v2,raw);const loaded=P.load(defaults(),store);assert.equal(loaded.status,'invalid_session');assert.equal(loaded.save.coins,11);assert.equal(loaded.session,null);assert.equal(store.getItem(P.keys.v2+'.invalid-session'),raw);});

test('saved sound settings and hostile note identifiers are validated',()=>{for(const sound of ['on','bgmOff','muteAll']){const save=defaults();save.settings.sound=sound;assert.equal(P.validateSave(save),true);}const snap=P.makeSnapshot(state(),{sessionId:'safe'});snap.plates[0].slices=['constructor'];assert.equal(P.validateSnapshot(snap),false);});

test('rush sessions retain their activity and resume paused',()=>{const s=state();s.rush=true;s.activity='rush';s.timer={limitSec:24,leftMs:23000};const snap=P.makeSnapshot(s,{sessionId:'rush-1',activity:'rush'});assert.ok(snap);assert.equal(P.restoreSnapshot(snap).activity,'rush');});


test('unsafe customer, impossible orders and mismatched activities cannot resume', () => {
  const snap = P.makeSnapshot(state(), {sessionId:'safe'});
  for (const edit of [
    s => { s.orders[0].customerId = 'missing-customer'; },
    s => { s.rush = true; },
    s => { delete s.savedAt; },
    s => { s.orders[0].items = [{noteId:'dottedHalf',count:2}]; s.orders[0].totalTicks = 24; s.orders[0].beats = 6; },
    s => { s.memoryVisible = true; s.memoryRemainingMs = 6000; },
  ]) {
    const changed = structuredClone(snap);
    edit(changed);
    assert.equal(P.validateSnapshot(changed), false);
  }
});

test('completed-order indices, reward ledger and accumulated statistics agree', () => {
  const st = state();
  st.orders = [st.currentOrder, {...st.currentOrder,id:'second-order'}];
  st.orderIndex = 1;
  st.currentOrder = st.orders[1];
  st.stageStats = {successes:1,firstTrySuccess:1,remainSec:23,tips:5,lastResult:null};
  st.combo = 1;
  st.tips = 5;
  st.score = 146;
  const snap = P.makeSnapshot(st, {sessionId:'reward-safe',awardedOrderIds:[st.orders[0].id]});
  assert.ok(snap);
  for (const edit of [
    s => { s.awardedOrderIds = []; },
    s => { s.stageStats.successes = 2; },
    s => { s.stageStats.remainSec = 41; },
    s => { s.stageStats.tips = 6; },
    s => { s.combo = 2; },
  ]) {
    const changed = structuredClone(snap);
    edit(changed);
    assert.equal(P.validateSnapshot(changed), false);
  }
});

test('envelope session identity mismatch is isolated while keeping prior achievements', () => {
  const store = new Storage(), save = defaults();
  save.coins = 25;
  const session = P.makeSnapshot(state(), {sessionId:'actual-session'});
  const raw = JSON.stringify({schemaVersion:2,save,session,sessionId:'different-session',awardedOrderIds:[]});
  store.setItem(P.keys.v2,raw);
  const loaded = P.load(defaults(),store);
  assert.equal(loaded.status,'invalid_session');
  assert.equal(loaded.save.coins,25);
  assert.equal(loaded.session,null);
  assert.equal(store.getItem(P.keys.v2 + '.invalid-session'),raw);
});

test('backup failure while isolating a corrupt v2 session keeps valid achievements readable', () => {
  const store = new Storage(), save = defaults();
  save.coins = 42;
  const raw = JSON.stringify({schemaVersion:2,save,session:{version:77},awardedOrderIds:[]});
  store.setItem(P.keys.v2,raw);
  store.setItem = () => { throw Error('quota'); };
  const loaded = P.load(defaults(),store);
  assert.equal(loaded.writable,false);
  assert.equal(loaded.save.coins,42);
  assert.equal(loaded.session,null);
  assert.equal(store.getItem(P.keys.v2),raw);
});

test('configured game stages validate allowed ingredients, counts and timer limits', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '../js/app.js'),'utf8');
  const start = html.indexOf('const NOTES = Object.freeze({');
  const notesCode = html.slice(start, html.indexOf('\n});',start) + '\n});'.length);
  const stagesStart = html.indexOf('function makeStages()');
  const end = 'const STAGES = makeStages();';
  const stagesCode = html.slice(stagesStart, html.indexOf(end,stagesStart) + end.length);
  const config = vm.runInNewContext(`${notesCode}\n${stagesCode}\n({notes:NOTES,stages:STAGES})`,{COLORS:{red:'red',purple:'purple'}});
  assert.equal(P.configure(config),true);
  const st = state();
  st.orders = Array.from({length:3},(_,i) => ({...st.currentOrder,id:'order-' + i}));
  st.currentOrder = st.orders[0];
  const snap = P.makeSnapshot(st,{sessionId:'configured'});
  assert.ok(snap);
  for (const edit of [
    s => { s.orders[0].items = [{noteId:'half',count:1}]; },
    s => { s.plates[0].slices = ['quarterRest']; },
    s => { s.timer.limitSec = 35; },
    s => { s.orders.pop(); },
  ]) {
    const changed = structuredClone(snap);
    edit(changed);
    assert.equal(P.validateSnapshot(changed),false);
  }
});
