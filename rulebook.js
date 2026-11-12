/* Player guide. The game continues from the same state after closing. */
(() => {
  const guide = window.rulebook = { isOpen:false, openedAt:0, focusBefore:null };
  const sections = [
    ['start','처음 시작'],['order','주문 읽기'],['drag','조각 옮기기'],['beats','박자와 조각'],['match','서빙과 판정'],['tools','도움 도구'],['modes','주방과 잠금'],['stars','별과 보상'],['rush','러시·설정']
  ];
  const scene = (i, caption) => `<figure><div class="guide-scene scene-${i}" role="img" aria-label="${caption}"></div><figcaption>${caption}</figcaption></figure>`;
  const diagram = (name, caption) => `<figure class="guide-visual">${window.rulebookDiagram(name)}<figcaption>${caption}</figcaption></figure>`;
  const noteCards = ['whole','dottedHalf','half','quarter','eighth','sixteenth'].map(id => {
    const note=NOTES[id], rest=NOTES[id+'Rest'];
    return `<div class="guide-note"><div class="guide-note-pics">${noteMark(id,46)}${noteMark(id+'Rest',46)}</div><strong>${note.beats}박</strong><small>${note.name}<br>${rest.name}</small></div>`;
  }).join('');
  const body = `
  <div class="guide-hero">${scene(0,'따뜻한 리듬 오븐 주방')}<div><span class="guide-kicker">RHYTHM OVEN GUIDE</span><h3>그림으로 배우는<br>리듬 요리</h3><p>주문서를 읽고 음표 피자와 쉼표 파이를 만들어 보세요. 필요한 규칙을 언제든 다시 볼 수 있어요.</p></div></div>
  <nav class="guide-toc" aria-label="롤북 목차">${sections.map(([id,label])=>`<button type="button" class="guide-jump" data-guide-target="guide-${id}">${label}</button>`).join('')}</nav>
  <section class="guide-section" id="guide-start"><span class="guide-kicker">01 · START</span><h3>요리사가 되어 볼까요?</h3><div class="guide-grid"><div><p>손님의 주문에 맞는 조각을 접시에 담고, 시간이 다 되기 전에 서빙하는 게임이에요.</p><ol><li><strong>요리 시작!</strong>을 누르고 주방과 스테이지를 선택해요.</li><li>주문서에서 재료의 종류와 개수를 확인해요.</li><li>재료를 접시로 끌어 놓고 <strong>서빙!</strong>을 눌러요.</li></ol><p class="guide-tip">처음에는 음표 피자 주방의 1단계부터 시작해요.</p></div>${diagram('order','손님의 주문을 확인하고 재료를 골라요')}</div></section>
  <section class="guide-section" id="guide-order"><span class="guide-kicker">02 · ORDER</span><h3>주문서에는 무엇이 있을까요?</h3><div class="guide-grid"><div>${scene(1,'손님에게 주문을 받는 요리사')}</div><div><p>주문서의 <strong>음표 또는 쉼표 모양과 × 옆의 개수</strong>를 살펴보세요. 같은 모양을 표시된 개수만큼 담아야 해요.</p><p>예를 들어 4분음표 × 2라면 4분음표 조각 두 개가 필요해요. 주문서를 누르면 주문 재료의 소리를 들을 수 있어요.</p><p class="guide-tip">박자의 총합이 같더라도 조각의 종류나 개수가 다르면 완벽한 주문이 아니에요.</p></div></div></section>
  <section class="guide-section" id="guide-drag"><span class="guide-kicker">03 · PLAY</span><h3>조각을 접시로 옮겨요</h3><div class="guide-grid"><div>${scene(2,'조각을 접시 쪽으로 끌어가는 모습')}</div><div><ol><li>아래쪽 재료 선반에서 필요한 조각을 찾아요.</li><li>조각을 누른 채 접시 가까이 끌어서 놓아요.</li><li>화면의 박자 게이지와 남은 주문을 확인해요.</li></ol><p>조각을 살짝 누르기만 하면 재료 정보와 소리를 미리 확인해요. <strong>접시에 담으려면 끌어 놓아야</strong> 해요.</p></div></div><div class="guide-art-pair">${diagram('drag','조각을 선택해 접시까지 끌어 놓아요')}${diagram('plate','한 접시에는 최대 4박까지 담아요')}</div></section>
  <section class="guide-section" id="guide-beats"><span class="guide-kicker">04 · RHYTHM</span><h3>한 접시와 박자의 관계</h3><p>한 접시는 <strong>최대 4박</strong>이에요. 주문이 4박보다 작으면 접시를 다 채우지 않아도 주문한 만큼 완성하면 돼요. 주문이 4박을 넘으면 꽉 찬 뒤 다음 접시가 생겨요.</p><div class="guide-art-pair">${diagram('fractions','같은 접시도 박자에 따라 크기가 달라요')}${diagram('plates','4박을 채우고 주문이 남으면 다음 접시로')}</div><h4>음표와 쉼표 박자표</h4><p>왼쪽은 음표, 오른쪽은 같은 길이의 쉼표예요. 쉼표는 그 박자 동안 쉬는 표시예요.</p><div class="guide-note-grid">${noteCards}</div><div class="guide-tip">예: 2분음표 1개와 4분음표 2개는 2 + 1 + 1 = 4박이에요. 실제 주문서에 적힌 종류와 개수를 확인해 주세요.</div></section>
  <section class="guide-section" id="guide-match"><span class="guide-kicker">05 · SERVE</span><h3>주문을 확인하고 서빙!</h3><div class="guide-grid"><div>${diagram('matching','총 박자와 함께 조각의 종류·개수를 확인해요')}</div><div><p>주문한 전체 박자만큼 채우면 <strong>서빙!</strong> 버튼이 활성화돼요. 종류와 개수가 주문서와 같은지 한 번 더 살펴본 뒤 눌러 주세요.</p><p>종류와 개수가 모두 맞으면 완벽한 주문이에요. 순서는 판정 기준이 아니에요. 실수해도 학습 카드를 보고 다음 주문에 도전할 수 있어요.</p></div></div><div class="guide-art-pair">${scene(4,'완성한 요리와 서빙 벨')}${diagram('serve','남은 시간을 확인하고 종을 눌러 서빙해요')}</div></section>
  <section class="guide-section" id="guide-tools"><span class="guide-kicker">06 · TOOLS</span><h3>어려울 때 사용하는 도구</h3><ul><li><strong>되돌리기 ↶</strong> : 마지막으로 담은 조각을 꺼내요.</li><li><strong>힌트 💡</strong> : 다음에 필요한 재료를 잠시 강조해요. 1~3단계는 무료, 4단계부터는 5코인이 필요해요.</li><li><strong>일시정지 Ⅱ</strong> : 잠시 쉬거나 다시 시작할 수 있어요.</li><li><strong>롤북 📖</strong> : 지금처럼 안내를 볼 수 있어요. 롤북을 여는 동안 주문 타이머는 멈춰요.</li></ul><p class="guide-tip">주문 총량이나 현재 접시에 남은 자리를 넘는 조각은 담을 수 없어요. 더 작은 조각을 선택해 보세요.</p></section>
  <section class="guide-section" id="guide-modes"><span class="guide-kicker">07 · KITCHENS</span><h3>세 가지 리듬 주방</h3><div class="guide-grid"><div>${scene(3,'피자와 블루베리 파이 두 가지 요리')}</div><div><p>🍕 <strong>음표 피자</strong> : 음표를 조각으로 배워요. 처음부터 열려 있어요.</p><p>🥧 <strong>쉼표 파이</strong> : 쉼표를 조각으로 배워요. 피자 3단계를 별 1개 이상으로 깨면 열려요.</p><p>🎵 <strong>믹스 주방</strong> : 음표와 쉼표를 함께 사용해요. 피자와 파이 각 10단계를 모두 별 1개 이상으로 깨면 열려요.</p></div></div></section>
  <section class="guide-section" id="guide-stars"><span class="guide-kicker">08 · PROGRESS</span><h3>별을 모아 다음 단계로</h3><div class="guide-grid"><div>${scene(5,'별길을 따라 다음 주방으로 가요')}</div><div><p>현재 단계를 <strong>별 1개 이상</strong>으로 마치면 다음 단계에 도전할 수 있어요. 정확한 주문과 남은 시간이 별에 반영돼요.</p><ul><li>★ 완벽 주문 비율 60% 이상</li><li>★★ 완벽 주문 비율 80% 이상 + 평균 남은 시간 20% 이상</li><li>★★★ 모든 주문 완벽 + 평균 남은 시간 35% 이상</li></ul><p>서빙 팁과 스테이지 보상으로 코인을 모을 수 있어요.</p></div></div>${diagram('stars','정확하게 요리하고 별을 모아요')}</section>
  <section class="guide-section" id="guide-rush"><span class="guide-kicker">09 · EXTRA</span><h3>러시 모드와 나만의 설정</h3><p>각 주방의 10단계를 별 1개 이상으로 깨면 해당 주방의 <strong>무한 러시</strong>가 열려요. 연속으로 주문을 완벽하게 처리해 보세요. 실패하거나 시간이 끝나면 러시가 종료돼요.</p><p>러시는 처음 24초로 시작하고 주문이 늘수록 제한시간이 조금씩 줄어들어 최소 8초가 돼요.</p><p>메인 화면의 <strong>설정</strong>에서 소리, 진동, 왼손 모드, 박자 숫자 표시와 천천히 모드를 조절할 수 있어요. 음표 도감에서는 만난 재료를 다시 살펴볼 수 있어요.</p><p class="guide-tip">상단의 × 또는 Esc 키를 누르면 원래 화면으로 돌아가요.</p></section><p class="guide-footer">음표 피자 &amp; 쉼표 파이 · 즐거운 리듬 요리 시간</p>`;
  const root=document.createElement('div');
  root.className='guide-backdrop'; root.hidden=true;
  root.innerHTML=`<div class="guide-dialog" id="rulebook-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div class="guide-bar"><div><h2 id="guide-title">📖 리듬 요리 롤북</h2><p>그림으로 배우는 게임 규칙</p></div><button type="button" class="guide-close" aria-label="롤북 닫기">×</button></div><div class="guide-scroll" tabindex="0">${body}</div></div>`;
  document.body.appendChild(root);
  const opener=document.getElementById('guide-open'),close=root.querySelector('.guide-close'),app=document.getElementById('app-root');
  function openGuide(){
    if(guide.isOpen)return;
    guide.isOpen=true;guide.openedAt=performance.now();guide.focusBefore=document.activeElement;
    if(Game.drag){Game.drag.button?.classList.remove('dragging');Game.drag.ghost?.remove();document.querySelector('.drop-ring')?.classList.remove('show','valid');Game.drag=null;}
    app.inert=true;opener.setAttribute('aria-expanded','true');root.hidden=false;close.focus();
  }
  function closeGuide(){
    if(!guide.isOpen)return;
    const now=performance.now(),st=Game.state;
    if(st.screen===SCREEN.KITCHEN&&st.timer){st.timer.lastTick=now;if(st.memoryVisible&&st.memoryEndsAt)st.memoryEndsAt+=Math.max(0,now-Math.max(guide.openedAt,st.memoryEndsAt-5000));}
    guide.isOpen=false;root.hidden=true;app.inert=false;opener.setAttribute('aria-expanded','false');(guide.focusBefore?.isConnected?guide.focusBefore:opener).focus();
  }
  opener.setAttribute('aria-expanded','false');opener.addEventListener('click',openGuide);close.addEventListener('click',closeGuide);
  root.addEventListener('click',e=>{if(e.target===root)closeGuide();const button=e.target.closest('[data-guide-target]');if(button)document.getElementById(button.dataset.guideTarget)?.scrollIntoView({block:'start'});});
  document.addEventListener('keydown',e=>{if(!guide.isOpen)return;if(e.key==='Escape'){e.preventDefault();closeGuide();return;}if(e.key==='Tab'){const list=[...root.querySelectorAll('button:not(:disabled),[tabindex="0"]')];if(!list.length)return;const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
})();
