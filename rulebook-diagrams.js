/* Original visual explanations for the Rhythm Oven rulebook. */
(() => {
  'use strict';
  const c = { ink:'#6F4518', red:'#E94F37', tomato:'#C83C2B', cheese:'#F6BD60', cream:'#FFF8E7', paper:'#FFFFFF', purple:'#5F6CAF', green:'#6A994E', pale:'#F5E7C9', peach:'#FBE0C9', blue:'#E7E8F6' };
  const svg = (label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 160" role="img" aria-label="${label}" focusable="false">${body}</svg>`;
  const circle = (x,y,r,fill,stroke=c.ink,sw=3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const note = (x,y,scale=1,hollow=false,color=c.ink) => `<g transform="translate(${x} ${y}) scale(${scale})" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="0" cy="0" rx="9" ry="6.5" transform="rotate(-18)" fill="${hollow?'white':color}"/><path d="M8 -2 V-35" fill="none"/></g>`;
  const smallStar = (x,y,s=1,color=c.cheese) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -16 4.8 -5 16 -5 7 2 10 14 0 7 -10 14 -7 2 -16 -5 -4.8 -5Z" fill="${color}" stroke="${c.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  const arrow = (x1,y1,x2,y2,color=c.ink) => `<path d="M${x1} ${y1} L${x2} ${y2} m-8 -5 8 5 -8 5" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const badge = (x,y,text,color=c.cream) => `<g><rect x="${x-23}" y="${y-13}" width="46" height="26" rx="13" fill="${color}" stroke="${c.ink}" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="800" fill="${c.ink}" font-family="system-ui,sans-serif">${text}</text></g>`;
  const pizzaBase = (x,y,r=55) => `${circle(x,y,r+7,'#F8D69A')}${circle(x,y,r,c.cheese)}`;
  const pizzaFour = (x,y,r=55) => `${pizzaBase(x,y,r)}<path d="M${x} ${y-r} V${y+r} M${x-r} ${y} H${x+r}" stroke="${c.ink}" stroke-width="3"/>${[[x-22,y-23],[x+21,y-23],[x-22,y+25],[x+21,y+25]].map(([a,b])=>circle(a,b,6,c.red,'none',0)).join('')}`;
  const check = (x,y,color=c.green) => `<path d="M${x-10} ${y} l7 7 14 -17" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const cross = (x,y,color=c.red) => `<path d="M${x-7} ${y-7} l14 14 M${x+7} ${y-7} l-14 14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`;
  const illustrations = {
    plate: () => svg('피자 한 접시를 네 조각으로 나누면 한 접시는 4박이고 한 조각은 1박입니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.pale}"/>
      ${pizzaFour(105,80,53)}${badge(105,80,'4박',c.paper)}
      <g>${[0,1,2,3].map(i=>`<rect x="${190+i*33}" y="48" width="27" height="50" rx="9" fill="${i%2?c.cheese:c.red}" stroke="${c.ink}" stroke-width="2"/><text x="${203.5+i*33}" y="80" text-anchor="middle" font-size="16" font-weight="800" fill="${i%2?c.ink:c.paper}" font-family="system-ui,sans-serif">${i+1}</text>`).join('')}</g>
      <text x="255" y="123" text-anchor="middle" font-size="15" font-weight="800" fill="${c.ink}" font-family="system-ui,sans-serif">한 접시 = 4박</text>`),
    fractions: () => svg('2박짜리 반 조각 하나와 1박짜리 사분의 일 조각 두 개를 합치면 4박입니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.peach}"/>
      ${circle(70,78,47,'#F8D69A')}
      <path d="M70 35 A43 43 0 0 0 70 121 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/><path d="M70 35 A43 43 0 0 1 70 121 Z" fill="${c.cream}" stroke="${c.ink}" stroke-width="3"/>
      ${badge(70,137,'2박',c.paper)}<text x="125" y="87" font-size="28" font-weight="800" fill="${c.ink}">+</text>
      ${circle(181,78,41,'#F8D69A')}<path d="M181 78 L181 41 A37 37 0 0 1 218 78 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/><path d="M181 41 A37 37 0 1 0 218 78" fill="none" stroke="${c.ink}" stroke-width="2"/>${badge(181,137,'1박',c.paper)}
      <text x="229" y="87" font-size="28" font-weight="800" fill="${c.ink}">+</text>
      ${circle(286,78,41,'#F8D69A')}<path d="M286 78 L286 41 A37 37 0 0 1 323 78 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/><path d="M286 41 A37 37 0 1 0 323 78" fill="none" stroke="${c.ink}" stroke-width="2"/>${badge(286,137,'1박',c.paper)}`),
    order: () => svg('주문서 예시: 2분음표 한 개와 4분음표 두 개. 종류와 개수를 확인하세요.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.blue}"/>
      <g transform="translate(22 18)"><rect x="0" y="0" width="172" height="124" rx="14" fill="white" stroke="${c.ink}" stroke-width="3"/><path d="M12 16 H160" stroke="${c.cheese}" stroke-width="7" stroke-dasharray="8 5"/><text x="16" y="43" font-size="14" font-weight="900" fill="${c.ink}" font-family="system-ui,sans-serif">주문서</text>
      <rect x="13" y="51" width="146" height="28" rx="9" fill="${c.peach}"/>${note(34,72,.55,true)}<text x="67" y="71" font-size="15" font-weight="900" fill="${c.ink}" font-family="system-ui,sans-serif">2분음표 × 1</text>
      <rect x="13" y="84" width="146" height="28" rx="9" fill="${c.peach}"/>${note(34,105,.55)}<text x="67" y="104" font-size="15" font-weight="900" fill="${c.ink}" font-family="system-ui,sans-serif">4분음표 × 2</text></g>
      ${arrow(204,80,226,80)}${circle(280,79,48,'#F8D69A')}<path d="M280 35 A44 44 0 0 0 280 123 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/><path d="M280 35 A44 44 0 0 1 324 79 H280 Z M280 79 H324 A44 44 0 0 1 280 123 Z" fill="${c.cheese}" stroke="${c.ink}" stroke-width="3"/>`),
    drag: () => svg('아래 재료에서 조각을 누른 채 접시로 끌어 놓습니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.pale}"/>
      <rect x="20" y="30" width="92" height="100" rx="18" fill="white" stroke="${c.ink}" stroke-width="3"/>
      ${circle(66,69,29,c.cheese)}<path d="M66 69 V41 A28 28 0 0 1 94 69 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/>${note(66,107,.42)}
      <path d="M121 103 C154 34 196 34 227 63" stroke="${c.green}" stroke-width="4" stroke-dasharray="7 6" fill="none"/><path d="M216 62 l12 1 -5 -11" fill="none" stroke="${c.green}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${circle(275,79,54,'#F8D69A')}${circle(275,79,46,c.cream)}<path d="M275 79 V35 A44 44 0 0 1 319 79 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/>
      <g transform="translate(157 84) rotate(-20)"><path d="M0 35 L-11 19 Q-15 11 -10 9 Q-6 7 -2 13 L2 18 V-11 Q2 -18 7 -18 Q12 -18 12 -11 V5 Q18 -1 23 5 Q30 2 33 9 Q40 8 40 16 L37 34 Q35 42 29 46 H9Z" fill="#F7BF92" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/></g>`),
    matching: () => svg('주문과 재료의 종류 및 개수가 모두 일치하면 정답이며, 박자 합계가 같아도 재료가 다르면 일치하지 않습니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.blue}"/>
      <rect x="20" y="21" width="96" height="118" rx="14" fill="white" stroke="${c.ink}" stroke-width="3"/>
      <text x="68" y="42" text-anchor="middle" font-size="14" font-weight="900" fill="${c.ink}" font-family="system-ui,sans-serif">주문</text>${note(40,79,.75,true)}<text x="55" y="81" font-size="15" fill="${c.ink}" font-weight="800">×1</text>${note(40,117,.75)}<text x="55" y="119" font-size="15" fill="${c.ink}" font-weight="800">×2</text>
      ${arrow(121,80,145,80)}<rect x="151" y="22" width="190" height="53" rx="14" fill="#E5F0D8" stroke="${c.green}" stroke-width="2"/>${note(178,61,.68,true)}${note(215,61,.68)}${note(244,61,.68)}${check(308,52)}
      <rect x="151" y="84" width="190" height="53" rx="14" fill="#FADEDA" stroke="${c.red}" stroke-width="2"/>${[174,201,228,255].map(x=>note(x,123,.61)).join('')}${cross(308,110)}`),
    plates: () => svg('한 접시는 최대 4박이며, 더 많은 박자가 주문되면 다음 접시를 채웁니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.peach}"/>
      ${pizzaFour(92,76,46)}${badge(92,76,'4박',c.paper)}${badge(92,137,'1접시',c.paper)}
      ${arrow(153,76,197,76)}
      ${circle(263,76,53,'#F8D69A')}${circle(263,76,46,c.cream)}<path d="M263 76 V31 A45 45 0 0 1 263 121 Z" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/>${badge(263,137,'2접시',c.paper)}`),
    serve: () => svg('남은 시간을 보며 주문 박자를 채운 뒤 서빙 버튼을 누릅니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.pale}"/>
      ${circle(74,79,48,c.paper)}<path d="M74 43 V79 L96 91" fill="none" stroke="${c.ink}" stroke-width="5" stroke-linecap="round"/><path d="M74 31 A48 48 0 0 1 116 102" fill="none" stroke="${c.green}" stroke-width="8" stroke-linecap="round"/>${circle(74,79,5,c.ink,'none',0)}
      ${arrow(134,79,169,79)}<rect x="181" y="39" width="151" height="82" rx="21" fill="${c.red}" stroke="${c.ink}" stroke-width="3"/><path d="M216 87 Q216 69 230 66 Q244 69 244 87 Z M212 90 H248" fill="${c.cheese}" stroke="${c.ink}" stroke-width="3" stroke-linecap="round"/><circle cx="230" cy="63" r="4" fill="${c.cheese}" stroke="${c.ink}" stroke-width="2"/><text x="280" y="86" text-anchor="middle" font-size="21" font-weight="900" fill="white" font-family="system-ui,sans-serif">서빙!</text>`),
    stars: () => svg('스테이지에서 별을 획득하면 다음 스테이지가 열립니다.', `
      <rect x="8" y="8" width="344" height="144" rx="25" fill="${c.blue}"/>
      <path d="M38 103 C83 30 128 123 174 76 S253 27 317 72" stroke="${c.ink}" stroke-width="4" stroke-dasharray="7 8" fill="none" opacity=".45"/>
      ${circle(55,99,26,c.green)}<text x="55" y="106" text-anchor="middle" font-size="19" font-weight="900" fill="white" font-family="system-ui,sans-serif">1</text>
      ${smallStar(45,132,.52)}${smallStar(65,132,.52)}
      ${circle(180,76,26,c.cheese)}<text x="180" y="83" text-anchor="middle" font-size="19" font-weight="900" fill="${c.ink}" font-family="system-ui,sans-serif">2</text>
      ${circle(301,70,26,'#DAD4C9')}<path d="M292 70 V64 a9 9 0 0 1 18 0 v6 M290 70 h22 v17 h-22z" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>`)
  };
  window.rulebookDiagram = name => Object.hasOwn(illustrations,name) ? illustrations[name]() : '';
})();
