/* Integration tests of the game runtime script using a small deterministic DOM clock.
   Layout, browser events and rendered pixels still require an actual browser. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const repo=path.join(__dirname,'..');
function boot(seed) {
  let time=1000,nextId=1,queue=[],raf=new Map();
  const listeners={}, windowListeners={}, elements=new Map();
  function element(id='') {return {id,innerHTML:'',textContent:'',dataset:{},style:{setProperty(){}},isConnected:true,classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},focus(){},setAttribute(){},closest(){return null},querySelector(){return null},querySelectorAll(){return []},getBoundingClientRect(){return {left:0,top:0,width:200,height:200,right:200,bottom:200}},setPointerCapture(){},releasePointerCapture(){}}}
  const doc={hidden:false,body:element('body'),getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement(){return element()},querySelector(){return null},querySelectorAll(){return []},addEventListener(n,cb){(listeners[n] ||= []).push(cb)}};
  const store=new Map(seed || []);
  const ctx={console,document:doc,navigator:{},performance:{now:()=>time},history:{replaceState(){}},localStorage:{getItem(k){return store.has(k)?store.get(k):null},setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)}},setTimeout(fn,ms){const id=nextId++;queue.push({id,at:time+ms,fn});return id},clearTimeout(id){queue=queue.filter(x=>x.id!==id)},requestAnimationFrame(fn){const id=nextId++;raf.set(id,fn);return id},cancelAnimationFrame(id){raf.delete(id)},addEventListener(n,cb){(windowListeners[n] ||= []).push(cb)},innerWidth:390,innerHeight:844};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  for(const src of ['pizza-domain.js','js/pizza-save.js'])vm.runInContext(fs.readFileSync(path.join(repo,src),'utf8'),ctx,{filename:src});
  const main=fs.readFileSync(path.join(repo,'js/app.js'),'utf8');
  vm.runInContext(main+'\n;globalThis.TEST={Game,SCREEN,NOTES,startStage,addPiece,undoPiece,finishOrder,rushFinishOrder,openOverlay,closeOverlay,action,judge,startOrder,advanceOrder,renderKitchen,saveNow,setScreen,hint};',ctx,{filename:'app.js'});
  function advance(ms, runRaf=true){const end=time+ms;while(true){queue.sort((a,b)=>a.at-b.at);const x=queue[0];if(!x||x.at>end)break;queue.shift();time=x.at;x.fn()}time=end;if(runRaf)for(const [id,fn] of [...raf]){raf.delete(id);fn(time)}}
  function click(action, dataset={}) { const el={dataset:{action,...dataset},closest(){return this}};ctx.TEST.action({target:el,detail:0}); }
  return {ctx,doc,store,elements,advance,click,dispatch(name,event){for(const f of listeners[name]||[])f(event)},dispatchWindow(name,event){for(const f of windowListeners[name]||[])f(event)}};
}
test('첫 화면과 연습 게임: 타이머 없이 실제 조각을 담고 보상을 바꾸지 않는다',()=>{
  const {ctx,advance}=boot(),{Game,startStage,addPiece,finishOrder,undoPiece}=ctx.TEST;
  assert.equal(Game.state.screen,'MAIN');startStage('pizza',1,false,'practice');
  assert.equal(Game.state.screen,'KITCHEN');assert.equal(Game.state.activity,'practice');
  const coins=Game.save.coins,serves=Game.save.totalServes;
  assert.equal(Game.state.timer.running,false);const left=Game.state.timer.leftMs;advance(120000);assert.equal(Game.state.timer.leftMs,left);
  assert.equal(addPiece('quarter'),true);assert.equal(Game.state.servedTicks,4);undoPiece();assert.equal(Game.state.servedTicks,0);
  assert.equal(addPiece('quarter'),true);assert.equal(addPiece('quarter'),true);finishOrder();
  assert.equal(Game.state.busy,true);assert.equal(Game.save.coins,coins);assert.equal(Game.save.totalServes,serves);
  assert.equal(addPiece('quarter'),false);advance(1000);assert.equal(Game.state.orderIndex,1);
});
test('도전 모드: 동량 오답을 구별하고 전환 중 중복 입력을 차단한다',()=>{
  const {ctx,advance}=boot(),{Game,startStage,addPiece,finishOrder}=ctx.TEST;startStage('pizza',2,false,'challenge');
  const st=Game.state;st.currentOrder={id:'test',items:[{noteId:'quarter',count:2}],totalTicks:8,beats:2,sequence:null,customerId:'beat'};st.orders[0]=st.currentOrder;
  assert.equal(addPiece('half'),true);assert.equal(ctx.TEST.judge(st.currentOrder).grade,'MISS');finishOrder();
  const serves=Game.save.totalServes;assert.equal(addPiece('quarter'),false);finishOrder();assert.equal(Game.save.totalServes,serves);
});
test('사용자 일시정지 위에 롤북 정지가 겹쳐도 닫은 뒤 일시정지가 유지된다',()=>{
  const {ctx}=boot(),{Game,startStage,openOverlay,addPiece}=ctx.TEST;startStage('pizza',1,false,'challenge');openOverlay('pause');ctx.PizzaPause.add('guide');ctx.PizzaPause.remove('guide');assert.equal(Game.state.overlay.type,'pause');assert.equal(addPiece('quarter'),false);
});

test('롤북이 열린 동안 서빙 전환이 멈추고 닫으면 진행된다',()=>{
  const env=boot(), {Game,startStage,addPiece,finishOrder}=env.ctx.TEST;startStage('pizza',1,false,'practice');
  addPiece('quarter');addPiece('quarter');finishOrder();env.ctx.PizzaPause.add('guide');env.advance(3000);
  assert.equal(Game.state.orderIndex,0);env.ctx.PizzaPause.remove('guide');env.advance(1000);assert.equal(Game.state.orderIndex,1);
});
test('도전 주문을 새로고침 후 일시정지 상태로 이어가며 기록을 유지한다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',1,false,'challenge');assert.equal(first.ctx.TEST.addPiece('quarter'),true);
  const original=first.ctx.TEST.Game.state;const id=original.currentOrder.id;const served=original.servedTicks;
  const second=boot(first.store);assert.match(second.elements.get('screen-main').innerHTML,/이어하기/);second.click('resume-session');
  const st=second.ctx.TEST.Game.state;assert.equal(st.screen,'KITCHEN');assert.equal(st.currentOrder.id,id);assert.equal(st.servedTicks,served);assert.equal(st.overlay.type,'pause');
});
test('러시 주문을 새로고침 후 일시정지 상태로 이어간다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',10,true);const original=first.ctx.TEST.Game.state;const note=original.currentOrder.items[0].noteId;first.ctx.TEST.addPiece(note);
  const second=boot(first.store);assert.match(second.elements.get('screen-main').innerHTML,/이어하기/);second.click('resume-session');assert.equal(second.ctx.TEST.Game.state.rush,true);assert.equal(second.ctx.TEST.Game.state.servedTicks,original.servedTicks);assert.equal(second.ctx.TEST.Game.state.overlay.type,'pause');
});
test('보상 반영 직후 새로고침해도 같은 주문의 보상을 다시 받지 않는다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',1,false,'challenge');const st=first.ctx.TEST.Game.state;
  for(const item of st.currentOrder.items)for(let i=0;i<item.count;i++)assert.equal(first.ctx.TEST.addPiece(item.noteId),true);
  first.ctx.TEST.finishOrder();const coins=first.ctx.TEST.Game.save.coins,served=first.ctx.TEST.Game.save.totalServes;
  const second=boot(first.store);assert.equal(second.ctx.TEST.Game.save.coins,coins);assert.equal(second.ctx.TEST.Game.save.totalServes,served);
  assert.doesNotMatch(second.elements.get('screen-main').innerHTML,/이어하기/);
});

test('중첩 정지 중 시계와 기억 주문 시간이 줄지 않는다',()=>{
  const env=boot(),{Game,startStage,openOverlay,closeOverlay}=env.ctx.TEST;startStage('pizza',1,false,'challenge');
  const st=Game.state;st.memoryVisible=true;st.memoryEndsAt=env.ctx.performance.now()+5000;const left=st.timer.leftMs;
  env.ctx.PizzaPause.add('guide');openOverlay('pause');env.advance(10000,false);env.ctx.PizzaPause.remove('guide');assert.equal(st.overlay.type,'pause');closeOverlay();
  assert.equal(st.memoryEndsAt-env.ctx.performance.now(),5000);env.advance(1);assert.ok(st.timer.leftMs>=left-1,`unexpected timer decrement: ${left-st.timer.leftMs}`);assert.equal(st.memoryVisible,true);
});
test('완료 주문 후 진행과 보상 장부가 다음 주문 복원까지 보존된다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',1,false,'challenge');const st=first.ctx.TEST.Game.state;
  for(const item of st.currentOrder.items)for(let i=0;i<item.count;i++)assert.equal(first.ctx.TEST.addPiece(item.noteId),true);
  first.ctx.TEST.finishOrder();first.advance(1000);assert.equal(st.orderIndex,1);const coins=first.ctx.TEST.Game.save.coins;
  const second=boot(first.store);second.click('resume-session');const resumed=second.ctx.TEST.Game.state;
  assert.equal(resumed.orderIndex,1);assert.equal(resumed.stageStats.successes,1);assert.equal(resumed.stageStats.firstTrySuccess,1);assert.equal(resumed.awardedOrderIds.length,1);assert.equal(second.ctx.TEST.Game.save.coins,coins);
});
test('키보드 활성화는 한 조각을 넣고 소리 듣기는 조각을 넣지 않는다',()=>{
  const env=boot();env.ctx.TEST.startStage('pizza',1,false,'challenge');const st=env.ctx.TEST.Game.state;
  env.click('listen-piece',{note:'quarter'});assert.equal(st.servedTicks,0);
  env.click('add-piece',{note:'quarter'});assert.equal(st.servedTicks,4);
});

test('게임 대화상자의 제목, 포커스 순환, Escape와 포커스 복원',()=>{
  const env=boot(), {doc,ctx}=env, layer=doc.getElementById('overlay-layer');
  const opener={dataset:{action:'open-settings'},isConnected:true,focus(){doc.activeElement=this}};
  const makeControl=action=>({dataset:{action},isConnected:true,getClientRects(){return [1]},setAttribute(){},focus(){doc.activeElement=this}});
  const first=makeControl('close-overlay'),last=makeControl('reset-progress'),heading={},attributes={};
  const card={setAttribute(k,v){attributes[k]=v},contains(el){return el===first||el===last||el===card},focus(){doc.activeElement=this},querySelector(sel){return sel==='h2'?heading:first},querySelectorAll(sel){return sel==='.overlay-close'?[first]:[first,last]}};
  layer.contains=el=>card.contains(el);layer.querySelector=sel=>sel==='.overlay-card'?card:null;
  doc.querySelector=sel=>sel==='#overlay-layer .overlay-card'?card:null;
  opener.focus();ctx.TEST.openOverlay('settings');
  assert.equal(attributes.role,'dialog');assert.equal(attributes['aria-modal'],'true');assert.equal(attributes['aria-labelledby'],heading.id);assert.equal(doc.activeElement,first);
  const key=(key,shiftKey=false)=>{const e={key,shiftKey,prevented:false,preventDefault(){this.prevented=true},stopPropagation(){}};env.dispatch('keydown',e);return e};
  assert.equal(key('Tab',true).prevented,true);assert.equal(doc.activeElement,last);
  assert.equal(key('Tab').prevented,true);assert.equal(doc.activeElement,first);
  key('Escape');assert.equal(ctx.TEST.Game.state.overlay,null);assert.equal(doc.activeElement,opener);
  ctx.TEST.startStage('pizza',1,false,'challenge');ctx.TEST.openOverlay('pause');key('Escape');assert.equal(ctx.TEST.Game.state.overlay.type,'pause');
  ctx.TEST.closeOverlay();ctx.TEST.openOverlay('lesson',{noteId:'quarter',result:{need:{quarter:1},have:{}}});key('Escape');assert.equal(ctx.TEST.Game.state.overlay.type,'lesson');
});

test('정지한 기억 주문을 저장해도 남은 안내 시간이 보존된다',()=>{
  const env=boot(),{Game,startStage,openOverlay,saveNow}=env.ctx.TEST;
  startStage('pizza',10,false,'challenge');
  const left=Game.state.memoryEndsAt-env.ctx.performance.now();
  openOverlay('pause');env.advance(20000,false);saveNow();
  const saved=JSON.parse(env.store.get('npizza.save.v2'));
  assert.equal(saved.session.memoryRemainingMs,left);
});
test('서빙한 뒤 홈으로 나가면 예약 주문 전환이 멈춘다',()=>{
  const env=boot(),{Game,startStage,addPiece,finishOrder,setScreen,SCREEN}=env.ctx.TEST;
  startStage('pizza',1,false,'practice');addPiece('quarter');addPiece('quarter');finishOrder();
  const before=Game.state.orderIndex;setScreen(SCREEN.MAIN);env.advance(2000);
  assert.equal(Game.state.screen,SCREEN.MAIN);assert.equal(Game.state.orderIndex,before);
});
test('다른 주문에서 온 재료 명령은 접시를 바꾸지 않는다',()=>{
  const env=boot(),{Game,startStage,addPiece}=env.ctx.TEST;
  startStage('pizza',1,false,'practice');
  assert.equal(addPiece('quarter','drag',{sessionId:Game.state.sessionId,orderId:'previous-order'}),false);
  assert.equal(Game.state.servedTicks,0);
});
test('튜토리얼을 건너뛴 연습을 다시 열어도 안내가 되살아나지 않는다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',1,false,'practice');first.click('tutorial-skip');
  const second=boot(first.store);second.click('resume-session');
  assert.equal(second.ctx.TEST.Game.state.tutorialStep,null);
  assert.equal(second.ctx.TEST.Game.save.tutorialDone.pizza,false);
  assert.equal(second.ctx.TEST.Game.save.tutorialStatus,'skipped');
});
test('러시의 준비된 주문을 모두 마쳐도 도전 별을 지급하지 않는다',()=>{
  const env=boot(),{Game,startStage,advanceOrder}=env.ctx.TEST;
  startStage('pizza',10,true);
  const stars=JSON.stringify(Game.save.progress);
  Game.state.orderIndex=Game.state.orders.length-1;Game.state.busy=true;
  advanceOrder();
  assert.equal(Game.state.screen,'RESULT');
  assert.equal(Game.state.result.rush,true);
  assert.equal(JSON.stringify(Game.save.progress),stars);
});

test('홈의 소리 설정을 바꿔도 이어갈 주문과 보상 장부가 유지된다',()=>{
  const first=boot();first.ctx.TEST.startStage('pizza',1,false,'challenge');
  first.ctx.TEST.addPiece('quarter');const before=first.ctx.TEST.Game.state;
  const second=boot(first.store);second.click('toggle-sound');
  const written=JSON.parse(second.store.get('npizza.save.v2'));
  assert.equal(written.session.orderId,before.currentOrder.id);
  assert.equal(written.session.plates[0].slices.length,1);
  second.click('resume-session');assert.equal(second.ctx.TEST.Game.state.servedTicks,4);
});
test('사용자가 주방에서 나가거나 기록을 초기화하면 이어갈 주문을 지운다',()=>{
  const env=boot();env.ctx.TEST.startStage('pizza',1,false,'practice');env.ctx.TEST.addPiece('quarter');
  env.ctx.TEST.openOverlay('pause');env.click('leave-stage');
  assert.equal(JSON.parse(env.store.get('npizza.save.v2')).session,null);
  env.ctx.TEST.startStage('pizza',1,false,'practice');env.ctx.TEST.addPiece('quarter');
  env.ctx.TEST.setScreen(env.ctx.TEST.SCREEN.MAIN);
  env.click('reset-progress',{confirm:'yes'});
  const written=JSON.parse(env.store.get('npizza.save.v2'));
  assert.equal(written.session,null);assert.deepEqual(written.awardedOrderIds,[]);
});
