/* Execute the actual rulebook with a small DOM/pause model. Pixel layout still needs a browser. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const repo=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(repo,file),'utf8');
function setup() {
  const documentHandlers={}, listeners={}, attrs={};
  const app={inert:false}, header={inert:false}, pauseReasons=new Set();
  let scrolled=null, dragGhostRemoved=false, dragClassRemoved=false, now=1000;
  const doc={activeElement:null,body:{appendChild(el){this.last=el}},addEventListener(n,fn){(documentHandlers[n] ||= []).push(fn)},getElementById(id){if(id==='guide-open')return opener;if(id==='app-root')return app;return {scrollIntoView(){scrolled=id}}},querySelector(){return {classList:{remove(){}}}},createElement(){return root}};
  const close={isConnected:true,getClientRects(){return [1]},focus(){doc.activeElement=this},closest(){return null},addEventListener(n,fn){listeners.close=fn}};
  const opener={isConnected:true,attributes:attrs,closest(s){return s==='header'?header:null},setAttribute(k,v){attrs[k]=v},focus(){doc.activeElement=this},addEventListener(n,fn){listeners.open=fn}};
  const initial={isConnected:true,closest(){return null},focus(){doc.activeElement=this}};doc.activeElement=initial;
  const root={hidden:false,innerHTML:'',className:'',querySelector(s){return s==='.guide-close'?close:null},querySelectorAll(){return [close]},addEventListener(n,fn){listeners.root=fn},contains(el){return el===close}};
  const NOTES={};for(const [id,beats] of Object.entries({whole:4,dottedHalf:3,half:2,quarter:1,eighth:.5,sixteenth:.25})){NOTES[id]={name:id,beats};NOTES[id+'Rest']={name:id+'Rest',beats}}
  const Game={state:{screen:'KITCHEN',overlay:{type:'pause'},timer:{lastTick:10},memoryVisible:false},drag:{button:{classList:{remove(){dragClassRemoved=true}}},ghost:{remove(){dragGhostRemoved=true}}}};
  const ctx={window:null,document:doc,Game,SCREEN:{KITCHEN:'KITCHEN'},NOTES,noteMark:id=>`<svg data-note="${id}"></svg>`,performance:{now:()=>now}};
  ctx.window=ctx;ctx.rulebookDiagram=name=>`<svg data-diagram="${name}"></svg>`;
  ctx.PizzaPause={add:r=>pauseReasons.add(r),remove:r=>pauseReasons.delete(r),has:r=>pauseReasons.has(r)};vm.createContext(ctx);
  vm.runInContext(read('rulebook.js'),ctx,{filename:'rulebook.js'});
  return {ctx,doc,app,header,attrs,root,opener,close,initial,pauseReasons,listeners,dispatch(key,extra={}){const e={key,prevented:false,preventDefault(){this.prevented=true},...extra};for(const fn of documentHandlers.keydown||[])fn(e);return e},get scrolled(){return scrolled},get dragGhostRemoved(){return dragGhostRemoved},get dragClassRemoved(){return dragClassRemoved},setTime(t){now=t}};
}
test('상단 헤더의 룰북 버튼은 실제 대화상자에 연결된다',()=>{
  const html=read('index.html');
  assert.match(html,/<header\b[^>]*class="game-header"[\s\S]*?<button\b[^>]*id="guide-open"[^>]*aria-haspopup="dialog"[^>]*aria-controls="rulebook-dialog"/);
  const {root,attrs}=setup();assert.match(root.innerHTML,/id="rulebook-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/);assert.equal(root.hidden,true);assert.equal(attrs['aria-expanded'],'false');
});
test('롤북을 열고 닫아도 일시정지와 포커스, 이전 inert 상태가 보존된다',()=>{
  const x=setup();x.pauseReasons.add('user');x.header.inert=true;x.listeners.open();
  assert.equal(x.ctx.rulebook.isOpen,true);assert.equal(x.root.hidden,false);assert.equal(x.app.inert,true);assert.equal(x.header.inert,true);assert.equal(x.attrs['aria-expanded'],'true');assert.equal(x.pauseReasons.has('guide'),true);assert.equal(x.ctx.Game.drag,null);assert.equal(x.dragGhostRemoved,true);assert.equal(x.dragClassRemoved,true);assert.equal(x.doc.activeElement,x.close);
  x.setTime(9999);assert.equal(x.dispatch('Escape').prevented,true);assert.equal(x.ctx.rulebook.isOpen,false);assert.equal(x.root.hidden,true);assert.equal(x.app.inert,false);assert.equal(x.header.inert,true);assert.equal(x.attrs['aria-expanded'],'false');assert.equal(x.pauseReasons.has('user'),true);assert.equal(x.pauseReasons.has('guide'),false);assert.equal(x.ctx.Game.state.overlay.type,'pause');assert.equal(x.doc.activeElement,x.initial);
});
test('모든 목차는 실제 설명 절을 가리키며 클릭 시 해당 절로 이동한다',()=>{
  const x=setup(),targets=[...x.root.innerHTML.matchAll(/data-guide-target="(guide-[^"]+)"/g)].map(m=>m[1]),ids=new Set([...x.root.innerHTML.matchAll(/id="(guide-[^"]+)"/g)].map(m=>m[1]));
  assert.ok(targets.length>=10);assert.equal(new Set(targets).size,targets.length);for(const id of targets)assert.ok(ids.has(id),`${id} 절 누락`);
  const button={dataset:{guideTarget:targets[1]}};x.listeners.root({target:{closest:s=>s==='[data-guide-target]'?button:null}});assert.equal(x.scrolled,targets[1]);
});
test('설명은 주문 개수와 모드별 힌트, 실제 설정을 반영한다',()=>{
  const html=setup().root.innerHTML;assert.match(html,/현재\/필요 개수/);assert.match(html,/1\/2개/);assert.match(html,/연습과 도전 1~3단계에서는 무료/);assert.match(html,/도전 4단계부터는 5코인/);assert.doesNotMatch(html,/천천히 모드/);assert.match(html,/하던 요리 이어하기/);assert.match(html,/되돌리기/);
});
test('새 장면 열두 개가 설명에 연결되고 이미지 파일이 존재한다',()=>{
  const html=setup().root.innerHTML, css=read('rulebook.css');
  for(const sheet of ['a','b']){
    const ref=css.match(new RegExp(`guide-sheet-${sheet}\\s*\\{[^}]*url\\(['\"]?([^'\")]+)`));assert.ok(ref,`${sheet} 이미지 CSS 누락`);assert.ok(fs.existsSync(path.join(repo,ref[1])),`${ref[1]} 파일 누락`);const bytes=fs.readFileSync(path.join(repo,ref[1]));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    for(let i=0;i<6;i++)assert.match(html,new RegExp(`guide-sheet-${sheet} guide-frame-${i}[^>]*role="img" aria-label="[^"]+"`),`${sheet}/${i} 설명 그림 누락`);
  }
});
