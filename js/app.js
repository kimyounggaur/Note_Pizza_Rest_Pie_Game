"use strict";

// [S1] CONST — 단일 불변식: 접시 1개 = 4박 = 16틱 = 360도
const Game = { state: {}, save: null, audio: {}, drag: null, raf: 0, uid: 0 };
const SCREEN = Object.freeze({
  SPLASH: "SPLASH",
  MAIN: "MAIN",
  MODE: "MODE",
  STAGE: "STAGE",
  KITCHEN: "KITCHEN",
  RESULT: "RESULT",
  CODEX: "CODEX",
});
const BPM = 80,
  BEAT_MS = 750,
  PLATE_TICKS = 16;
const COLORS = {
  cream: "#FFF8E7",
  brown: "#6F4518",
  red: "#E94F37",
  yellow: "#F6BD60",
  purple: "#5F6CAF",
  green: "#6A994E",
};
const REWARD_CONFIG = {
  score: {
    basePerfect: 100,
    wrongPiecePenalty: 0.5,
    timeBonusPerSec: 2,
    timeBonusCap: 60,
    comboMultipliers: [1, 1, 1.2, 1.5, 1.8, 2],
  },
  coins: {
    servePerfect: 5,
    serveGood: 2,
    serveGoodThreshold: 0.5,
    combo3Bonus: 3,
    combo5Bonus: 5,
    combo5Sustain: 2,
    stageStars: [10, 20, 40],
    firstClearBonus: 15,
    rushScoreDivisor: 100,
    cap: 99999,
  },
  titles: [
    { serves: 10, name: "견습 리듬 요리사", bonusCoin: 0 },
    { serves: 50, name: "박자 보조 셰프", bonusCoin: 0 },
    { serves: 150, name: "리듬 셰프", bonusCoin: 30 },
    { serves: 300, name: "박자 마스터 셰프", bonusCoin: 50 },
    { serves: 500, name: "그랜드 마에스트로 셰프", bonusCoin: 100 },
  ],
};
const NOTES = Object.freeze({
  whole: {
    id: "whole",
    name: "온음표",
    short: "온음표",
    beats: 4,
    ticks: 16,
    frac: "1/1",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-hollow", stem: false, flags: 0, dot: false },
  },
  dottedHalf: {
    id: "dottedHalf",
    name: "점2분음표",
    short: "점2분",
    beats: 3,
    ticks: 12,
    frac: "3/4",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-hollow", stem: true, flags: 0, dot: true },
  },
  half: {
    id: "half",
    name: "2분음표",
    short: "2분음표",
    beats: 2,
    ticks: 8,
    frac: "1/2",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-hollow", stem: true, flags: 0, dot: false },
  },
  quarter: {
    id: "quarter",
    name: "4분음표",
    short: "4분음표",
    beats: 1,
    ticks: 4,
    frac: "1/4",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-filled", stem: true, flags: 0, dot: false },
  },
  eighth: {
    id: "eighth",
    name: "8분음표",
    short: "8분음표",
    beats: 0.5,
    ticks: 2,
    frac: "1/8",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-filled", stem: true, flags: 1, dot: false },
  },
  sixteenth: {
    id: "sixteenth",
    name: "16분음표",
    short: "16분음표",
    beats: 0.25,
    ticks: 1,
    frac: "1/16",
    kind: "note",
    color: COLORS.red,
    svg: { head: "ellipse-filled", stem: true, flags: 2, dot: false },
  },
  wholeRest: {
    id: "wholeRest",
    name: "온쉼표",
    short: "온쉼표",
    beats: 4,
    ticks: 16,
    frac: "1/1",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "hang-block" },
  },
  dottedHalfRest: {
    id: "dottedHalfRest",
    name: "점2분쉼표",
    short: "점2분쉼",
    beats: 3,
    ticks: 12,
    frac: "3/4",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "sit-block", dot: true },
  },
  halfRest: {
    id: "halfRest",
    name: "2분쉼표",
    short: "2분쉼표",
    beats: 2,
    ticks: 8,
    frac: "1/2",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "sit-block" },
  },
  quarterRest: {
    id: "quarterRest",
    name: "4분쉼표",
    short: "4분쉼표",
    beats: 1,
    ticks: 4,
    frac: "1/4",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "zigzag" },
  },
  eighthRest: {
    id: "eighthRest",
    name: "8분쉼표",
    short: "8분쉼표",
    beats: 0.5,
    ticks: 2,
    frac: "1/8",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "hook", hooks: 1 },
  },
  sixteenthRest: {
    id: "sixteenthRest",
    name: "16분쉼표",
    short: "16분쉼",
    beats: 0.25,
    ticks: 1,
    frac: "1/16",
    kind: "rest",
    color: COLORS.purple,
    svg: { rest: "hook", hooks: 2 },
  },
});
const CHARACTERS = {
  dodo: {
    name: "마에스트로 도도",
    emoji: "🦤",
    color: "#F6BD60",
    line: "흠, 실력을 볼까?",
  },
  beat: {
    name: "비트",
    emoji: "🐶",
    color: "#D99455",
    line: "박자에 맞춰 멍!",
  },
  melo: {
    name: "멜로",
    emoji: "🐱",
    color: "#EAA6BC",
    line: "달콤한 리듬이네!",
  },
  tempo: {
    name: "템포",
    emoji: "🐰",
    color: "#F6D48B",
    line: "빨리빨리 부탁해!",
  },
  mongmong: {
    name: "몽몽",
    emoji: "🐻",
    color: "#B47B52",
    line: "천천히 먹을게…",
  },
};
const MODES = {
  pizza: {
    name: "음표 피자 주방",
    desc: "음표 조각으로 피자 완성!",
    color: COLORS.red,
    icon: "🍕",
  },
  pie: {
    name: "쉼표 파이 주방",
    desc: "조용한 쉼표 파이를 구워요!",
    color: COLORS.purple,
    icon: "🥧",
  },
  mix: {
    name: "믹스 주방",
    desc: "소리와 침묵을 한 판에!",
    color: COLORS.brown,
    icon: "🎵",
  },
};
function makeStages() {
  const p = (
    mode,
    stage,
    allowed,
    orders,
    items,
    time,
    newPiece = null,
    boss = null,
    extra = {},
  ) => ({
    mode,
    stage,
    allowed,
    orders,
    itemsPerOrder: items,
    timeLimitSec: time,
    newPiece,
    boss,
    notes: "",
    ...extra,
  });
  return [
    p("pizza", 1, ["quarter"], 3, [1, 2], 40, "quarter"),
    p("pizza", 2, ["quarter", "half"], 4, [2, 3], 35, "half"),
    p("pizza", 3, ["quarter", "half", "whole"], 4, [1, 3], 32, "whole"),
    p("pizza", 4, ["quarter", "half", "whole"], 5, [2, 4], 30),
    p("pizza", 5, ["quarter", "half", "whole"], 3, [2, 4], 25, null, "course3"),
    p(
      "pizza",
      6,
      ["quarter", "half", "whole", "eighth"],
      5,
      [2, 4],
      28,
      "eighth",
    ),
    p("pizza", 7, ["quarter", "half", "whole", "eighth"], 6, [3, 5], 26),
    p(
      "pizza",
      8,
      ["quarter", "half", "whole", "eighth", "dottedHalf"],
      6,
      [3, 5],
      26,
      "dottedHalf",
    ),
    p(
      "pizza",
      9,
      ["quarter", "half", "whole", "eighth", "dottedHalf", "sixteenth"],
      7,
      [3, 6],
      24,
      "sixteenth",
    ),
    p(
      "pizza",
      10,
      ["whole", "dottedHalf", "half", "quarter", "eighth", "sixteenth"],
      4,
      [3, 6],
      22,
      null,
      "memory",
    ),
    p("pie", 1, ["quarterRest"], 3, [1, 2], 43, "quarterRest"),
    p("pie", 2, ["quarterRest", "halfRest"], 4, [2, 3], 38, "halfRest"),
    p(
      "pie",
      3,
      ["quarterRest", "halfRest", "wholeRest"],
      4,
      [1, 3],
      35,
      "wholeRest",
    ),
    p("pie", 4, ["quarterRest", "halfRest", "wholeRest"], 5, [2, 4], 33),
    p(
      "pie",
      5,
      ["quarterRest", "halfRest", "wholeRest"],
      3,
      [2, 4],
      28,
      null,
      "course3",
    ),
    p(
      "pie",
      6,
      ["quarterRest", "halfRest", "wholeRest", "eighthRest"],
      5,
      [2, 4],
      31,
      "eighthRest",
    ),
    p(
      "pie",
      7,
      ["quarterRest", "halfRest", "wholeRest", "eighthRest"],
      6,
      [3, 5],
      29,
    ),
    p(
      "pie",
      8,
      ["quarterRest", "halfRest", "wholeRest", "eighthRest", "dottedHalfRest"],
      6,
      [3, 5],
      29,
      "dottedHalfRest",
    ),
    p(
      "pie",
      9,
      [
        "quarterRest",
        "halfRest",
        "wholeRest",
        "eighthRest",
        "dottedHalfRest",
        "sixteenthRest",
      ],
      7,
      [3, 6],
      27,
      "sixteenthRest",
    ),
    p(
      "pie",
      10,
      [
        "wholeRest",
        "dottedHalfRest",
        "halfRest",
        "quarterRest",
        "eighthRest",
        "sixteenthRest",
      ],
      4,
      [3, 6],
      25,
      null,
      "memory",
    ),
    p("mix", 1, ["quarter", "quarterRest"], 3, [2, 3], 36, null, null, {
      mixRule: true,
    }),
    p(
      "mix",
      2,
      ["quarter", "half", "quarterRest", "halfRest"],
      4,
      [2, 4],
      33,
      null,
      null,
      { mixRule: true },
    ),
    p(
      "mix",
      3,
      ["quarter", "half", "whole", "quarterRest", "halfRest", "wholeRest"],
      5,
      [2, 4],
      31,
      null,
      null,
      { mixRule: true },
    ),
    p(
      "mix",
      4,
      ["quarter", "half", "whole", "quarterRest", "halfRest", "wholeRest"],
      5,
      [3, 5],
      29,
      null,
      null,
      { mixRule: true, rhythmSentence: true },
    ),
    p(
      "mix",
      5,
      ["quarter", "half", "whole", "quarterRest", "halfRest", "wholeRest"],
      3,
      [3, 5],
      26,
      null,
      "course3",
      { mixRule: true, rhythmSentence: true },
    ),
    p(
      "mix",
      6,
      [
        "quarter",
        "half",
        "whole",
        "quarterRest",
        "halfRest",
        "wholeRest",
        "eighth",
        "eighthRest",
      ],
      6,
      [3, 5],
      27,
      "eighth",
      null,
      { mixRule: true },
    ),
    p(
      "mix",
      7,
      [
        "quarter",
        "half",
        "whole",
        "quarterRest",
        "halfRest",
        "wholeRest",
        "eighth",
        "eighthRest",
      ],
      6,
      [4, 6],
      25,
      null,
      null,
      { mixRule: true, twoCustomers: true },
    ),
    p(
      "mix",
      8,
      [
        "quarter",
        "half",
        "whole",
        "dottedHalf",
        "quarterRest",
        "halfRest",
        "wholeRest",
        "dottedHalfRest",
        "eighth",
        "eighthRest",
      ],
      7,
      [4, 6],
      25,
      "dottedHalf",
      null,
      { mixRule: true },
    ),
    p(
      "mix",
      9,
      [
        "quarter",
        "half",
        "whole",
        "dottedHalf",
        "quarterRest",
        "halfRest",
        "wholeRest",
        "dottedHalfRest",
        "eighth",
        "eighthRest",
        "sixteenth",
        "sixteenthRest",
      ],
      7,
      [4, 7],
      23,
      "sixteenth",
      null,
      { mixRule: true },
    ),
    p(
      "mix",
      10,
      [
        "whole",
        "dottedHalf",
        "half",
        "quarter",
        "eighth",
        "sixteenth",
        "wholeRest",
        "dottedHalfRest",
        "halfRest",
        "quarterRest",
        "eighthRest",
        "sixteenthRest",
      ],
      5,
      [4, 7],
      20,
      null,
      "grand",
      { mixRule: true, rhythmSentence: true },
    ),
  ];
}
const STAGES = makeStages();
const domain = window.PizzaDomain.create(NOTES);
window.PizzaSave.configure({ notes: NOTES, stages: STAGES });
const pauseReasons = new Set();
let pausedAt = null;
window.PizzaPause = {
  add(reason) {
    if (!pauseReasons.size) pausedAt = performance.now();
    pauseReasons.add(reason);
  },
  remove(reason) {
    if (!pauseReasons.delete(reason)) return;
    if (!pauseReasons.size && pausedAt !== null) {
      const st = Game.state;
      const now = performance.now();
      if (st?.memoryVisible) st.memoryEndsAt += now - pausedAt;
      if (st?.timer) st.timer.lastTick = now;
      pausedAt = null;
    }
  },
  has(reason) {
    return pauseReasons.has(reason);
  },
};
const DEFAULT_SAVE = () => ({
  schemaVersion: 1,
  coins: 0,
  settings: {
    sound: "on",
    haptic: true,
    skin: "default",
    lefty: false,
    showBeats: true,
    slowMode: false,
  },
  tutorialDone: { pizza: false, pie: false, mix: false },
  progress: {
    pizza: { unlocked: 1, stars: Array(10).fill(0) },
    pie: { unlocked: 1, stars: Array(10).fill(0) },
    mix: { unlocked: 1, stars: Array(10).fill(0) },
  },
  rushBest: {
    pizza: { score: 0, servedOrders: 0 },
    pie: { score: 0, servedOrders: 0 },
    mix: { score: 0, servedOrders: 0 },
  },
  codexUnlocked: ["quarter", "quarterRest"],
  totalServes: 0,
  totalPerfectServes: 0,
  lastPlayedAt: null,
});

// [S2] AUDIO — 외부 파일 없이 Web Audio API로 톤·효과음 합성
Game.audio.ctx = null;
Game.audio.master = null;
Game.audio.voices = new Set();
Game.audio.ensure = function () {
  if (!this.allowed()) return;
  try {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    Game.state.audioReady = true;
  } catch (_) {
    /* Play continues when audio is unavailable. */
  }
};
Game.audio.allowed = function (kind = "sfx") {
  return (
    !["muteAll", "off"].includes(Game.save?.settings.sound) &&
    (kind !== "bgm" || Game.save?.settings.sound === "on")
  );
};
Game.audio.tone = function (
  freq,
  dur = 120,
  type = "sine",
  peak = 0.18,
  delay = 0,
) {
  if (!this.ctx || !this.allowed("sfx")) return;
  if (this.voices.size >= 16) {
    const oldest = this.voices.values().next().value;
    this.voices.delete(oldest);
    try {
      oldest.stop();
    } catch (_) {
      /* Already ended. */
    }
  }
  const t = this.ctx.currentTime + delay / 1000,
    o = this.ctx.createOscillator(),
    g = this.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur / 1000);
  o.connect(g);
  g.connect(this.master);
  this.voices.add(o);
  o.onended = () => {
    this.voices.delete(o);
    o.disconnect();
    g.disconnect();
  };
  o.start(t);
  o.stop(t + dur / 1000 + 0.03);
};
Game.audio.note = function (note) {
  const freqs = {
    whole: 523.25,
    dottedHalf: 587.33,
    half: 659.25,
    quarter: 783.99,
    eighth: 880,
    sixteenth: 1046.5,
    wholeRest: 0,
    dottedHalfRest: 0,
    halfRest: 0,
    quarterRest: 0,
    eighthRest: 0,
    sixteenthRest: 0,
  };
  const n = NOTES[note];
  if (n.kind === "note") this.tone(freqs[note], n.beats * BEAT_MS, "sine", 0.2);
  else hush(n.beats);
};
Game.audio.button = function () {
  this.tone(660, 70, "triangle", 0.12);
};
Game.audio.success = function () {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    this.tone(f, 120, "triangle", 0.22, i * 120),
  );
};
Game.audio.fail = function () {
  this.tone(329.63, 200, "square", 0.13);
  this.tone(233.08, 240, "square", 0.13, 180);
};
Game.audio.complete = function () {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    this.tone(f, 90, "sine", 0.2, i * 90),
  );
};
Game.audio.coin = function () {
  this.tone(987.77, 60, "square", 0.12);
  this.tone(1318.5, 180, "square", 0.12, 70);
};
function haptic(pattern) {
  if (Game.save?.settings.haptic && navigator.vibrate)
    navigator.vibrate(pattern);
}

// [S3] SVG — Source 폴더의 토마토 피자·블루베리 파이 방향을 인라인 SVG로 재해석
function esc(v) {
  return String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx, cy, r, a0, a1) {
  if (a1 - a0 >= 359.9)
    return `M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`;
  const p0 = polar(cx, cy, r, a0),
    p1 = polar(cx, cy, r, a1),
    large = a1 - a0 > 180 ? 1 : 0;
  return `M${cx},${cy} L${p0.x},${p0.y} A${r},${r} 0 ${large} 1 ${p1.x},${p1.y} Z`;
}
function noteMark(note, size = 70) {
  const n = NOTES[note];
  if (!n) return "";
  let inner = "";
  if (n.kind === "note") {
    const fill = n.svg.head === "ellipse-hollow" ? "none" : COLORS.red;
    inner = `<g transform="rotate(-20 50 52)" stroke="${COLORS.brown}" stroke-width="3" stroke-linecap="round"><ellipse cx="42" cy="68" rx="14" ry="9" fill="${fill}"/>${n.svg.stem ? '<line x1="55" y1="64" x2="55" y2="20"/>' : ""}${n.svg.flags > 0 ? '<path d="M55 21 C70 19 78 25 80 32 C69 29 61 29 55 34" fill="' + COLORS.red + '" stroke="none"/>' : ""}${n.svg.flags > 1 ? '<path d="M55 30 C70 28 78 34 80 41 C68 37 61 37 55 42" fill="' + COLORS.red + '" stroke="none"/>' : ""}${n.svg.dot ? '<circle cx="73" cy="68" r="4" fill="' + COLORS.red + '" stroke="none"/>' : ""}</g>`;
  } else {
    if (n.svg.rest === "hang-block")
      inner = `<g stroke="${COLORS.brown}" stroke-width="2"><path d="M18 34 H82 M18 48 H82 M18 62 H82" opacity=".3"/><rect x="29" y="44" width="42" height="17" rx="3" fill="${COLORS.purple}"/></g>`;
    else if (n.svg.rest === "sit-block")
      inner = `<g stroke="${COLORS.brown}" stroke-width="2"><path d="M18 34 H82 M18 48 H82 M18 62 H82" opacity=".3"/><rect x="29" y="31" width="42" height="17" rx="3" fill="${COLORS.purple}"/>${n.svg.dot ? '<circle cx="78" cy="38" r="4" fill="' + COLORS.purple + '" stroke="none"/>' : ""}</g>`;
    else if (n.svg.rest === "zigzag")
      inner = `<path d="M62 18 L42 33 L58 43 L38 58 L54 68 L37 82" fill="none" stroke="${COLORS.purple}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M57 78 Q69 84 78 75" fill="none" stroke="${COLORS.purple}" stroke-width="6" stroke-linecap="round"/>`;
    else {
      const hooks = n.svg.hooks || 1;
      inner = `<g fill="${COLORS.purple}" stroke="${COLORS.brown}" stroke-width="2"><circle cx="34" cy="${27 + hooks * 10}" r="7"/><path d="M42 ${28 + hooks * 10} L72 68" stroke="${COLORS.purple}" stroke-width="8" stroke-linecap="round"/>${hooks > 1 ? '<circle cx="42" cy="31" r="6"/><path d="M50 32 L75 56" stroke="' + COLORS.purple + '" stroke-width="7" stroke-linecap="round"/>' : ""}</g>`;
    }
  }
  return `<svg class="note-mark" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}
function sliceSvg(noteId, a0 = 0, a1 = 360, size = 100, withMark = true) {
  const n = NOTES[noteId],
    uid = `slice-${++Game.uid}`,
    r = 43,
    c = 50;
  if (!n) return "";
  const fill = n.kind === "note" ? COLORS.red : COLORS.purple,
    rim = n.kind === "note" ? COLORS.yellow : COLORS.brown;
  const path = arcPath(c, c, r, a0, a1),
    imageX = n.kind === "note" ? 0 : -100;
  return `<svg class="slice" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="${uid}-food" patternUnits="userSpaceOnUse" width="100" height="100"><image href="assets/drybrush/food-props.webp" x="${imageX}" y="0" width="400" height="300"/></pattern></defs><circle cx="50" cy="50" r="47" fill="#F7D99B" stroke="${COLORS.brown}" stroke-width="3"/><path d="${path}" fill="${fill}"/><path d="${path}" fill="url(#${uid}-food)" opacity=".88"/><path d="${path}" fill="${fill}" fill-opacity=".15" stroke="${rim}" stroke-width="2.5"/>${withMark ? `<circle cx="50" cy="50" r="21" fill="#FFF8E7" fill-opacity=".91"/><g transform="translate(25 25) scale(.5)">${noteMark(noteId, 100).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>` : ""}</svg>`;
}
function modeArt(mode) {
  const id =
    mode === "pizza" ? "quarter" : mode === "pie" ? "quarterRest" : "quarter";
  return mode === "mix"
    ? `<div style="display:flex;gap:-10px">${sliceSvg("quarter", 0, 90, 78, false)}${sliceSvg("quarterRest", 180, 270, 78, false)}</div>`
    : sliceSvg(id, 0, mode === "pizza" ? 90 : 90, 100, true);
}
function customerSvg(id) {
  const c = CHARACTERS[id] || CHARACTERS.beat;
  const key = Object.hasOwn(CHARACTERS, id) ? id : "beat";
  return `<span class="customer-portrait customer-${key}" role="img" aria-label="${esc(c.name)}"></span>`;
}

// [S4] STATE — localStorage 저장·복원과 화면 상태
let savedSession = null,
  saveWritable = true,
  saveWarned = false;
function loadSave() {
  let loaded;
  try {
    loaded = PizzaSave.load(DEFAULT_SAVE(), localStorage);
  } catch (_) {
    loaded = { save: DEFAULT_SAVE(), session: null, writable: false };
  }
  savedSession = loaded.session;
  saveWritable = loaded.writable;
  if (!saveWritable) setTimeout(warnSave, 0);
  return loaded.save;
}
function warnSave() {
  if (saveWarned) return;
  saveWarned = true;
  showToast("진행 저장을 사용할 수 없어요");
}
function saveNow() {
  if (!Game.save) return;
  Game.save.lastPlayedAt = new Date().toISOString();
  Game.save.coins = Math.max(
    0,
    Math.min(REWARD_CONFIG.coins.cap, Math.floor(Game.save.coins)),
  );
  if (!saveWritable) {
    warnSave();
    return;
  }
  const st = Game.state || {},
    session = PizzaSave.makeSnapshot(st, {
      sessionId: st.sessionId,
      activity: st.activity,
      awardedOrderIds: st.awardedOrderIds || [],
      now: pausedAt ?? performance.now(),
    }),
    res = PizzaSave.write(
      {
        save: Game.save,
        session,
        sessionId: st.sessionId,
        awardedOrderIds: st.awardedOrderIds || [],
      },
      localStorage,
    );
  if (res.ok) savedSession = session;
  else warnSave();
}
function currentMode() {
  return Game.state.mode || "pizza";
}
function stageConfig(mode = Game.state.mode, stage = Game.state.stage) {
  return STAGES.find((s) => s.mode === mode && s.stage === Number(stage));
}
function isModeUnlocked(mode) {
  if (mode === "pizza") return true;
  if (mode === "pie") return (Game.save.progress.pizza.stars[2] || 0) > 0;
  return (
    Game.save.progress.pizza.stars.every((s) => s > 0) &&
    Game.save.progress.pie.stars.every((s) => s > 0)
  );
}
function isStageUnlocked(mode, stage) {
  if (stage === 1) return true;
  return (Game.save.progress[mode].stars[stage - 2] || 0) > 0;
}
function modeStars(mode) {
  return Game.save.progress[mode].stars.reduce((a, b) => a + b, 0);
}
function setScreen(next, payload = {}) {
  cancelDrag();
  Game.state.screen = next;
  if (payload.mode) Game.state.mode = payload.mode;
  render();
  if (next === SCREEN.KITCHEN) startLoop();
  else if (next !== SCREEN.KITCHEN) stopLoop();
  history.replaceState({ screen: next }, "");
}
let overlayReturnFocus = null,
  overlayReturnAction = null;
function openOverlay(type, payload = {}, trigger = document.activeElement) {
  if (!Game.state.overlay) {
    overlayReturnFocus = trigger;
    overlayReturnAction = overlayReturnFocus?.dataset?.action || null;
  }
  if (Game.state.screen === SCREEN.KITCHEN) window.PizzaPause.add("overlay");
  Game.state.overlay = { type, payload };
  if (
    Game.state.screen === SCREEN.KITCHEN &&
    ["pause", "lesson", "tutorial"].includes(type)
  )
    Game.state.timer.running = false;
  renderOverlay();
}
function closeOverlay() {
  const type = Game.state.overlay?.type;
  Game.state.overlay = null;
  window.PizzaPause.remove("overlay");
  if (type === "pause" && Game.state.screen === SCREEN.KITCHEN)
    Game.state.timer.running = Game.state.activity !== "practice";
  if (type === "tutorial" && Game.state.screen === SCREEN.KITCHEN)
    Game.state.timer.running = Game.state.activity !== "practice";
  renderOverlay();
  const previous = overlayReturnFocus?.isConnected
    ? overlayReturnFocus
    : [...document.querySelectorAll("[data-action]")].find(
        (el) => el.dataset.action === overlayReturnAction,
      );
  overlayReturnFocus = null;
  overlayReturnAction = null;
  previous?.focus({ preventScroll: true });
}

// [S5] LOGIC — 주문·접시·판정·점수
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function generateOrder(config, index) {
  return makeOrder(domain.generateItems(config, index), config, index);
}
function makeOrder(items, config, index) {
  const sequence = [];
  items.forEach((x) => {
    for (let i = 0; i < x.count; i++) sequence.push(x.noteId);
  });
  if (config.rhythmSentence && sequence.length > 1)
    sequence.sort(() => Math.random() - 0.5);
  const totalTicks = sequence.reduce((s, id) => s + NOTES[id].ticks, 0);
  return {
    id: `ord_${config.mode}_${config.stage}_${index}`,
    items,
    totalTicks,
    beats: totalTicks / 4,
    sequence: config.rhythmSentence ? sequence : null,
    customerId:
      config.boss === "course3" ||
      config.boss === "memory" ||
      config.boss === "grand"
        ? "dodo"
        : pick(
            config.mode === "pizza"
              ? ["beat", "melo", "tempo", "mongmong"]
              : config.mode === "pie"
                ? ["melo", "mongmong", "beat"]
                : ["beat", "melo", "tempo", "mongmong"],
          ),
  };
}
function createPlates() {
  return [{ index: 0, ticks: 0, slices: [] }];
}
function flatSlices() {
  return Game.state.plates.flatMap((p) => p.slices);
}
function countMap(ids) {
  return ids.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
}
function orderIds(order) {
  return (
    order.sequence || order.items.flatMap((x) => Array(x.count).fill(x.noteId))
  );
}
function judge(order) {
  return domain.judge(order, Game.state.plates);
}
function calcScore(result, remain, combo) {
  const base = Math.round(
    100 *
      Math.max(
        0,
        result.accuracy -
          (result.wrong * 0.5) /
            Math.max(
              1,
              Object.values(result.need).reduce((a, b) => a + b, 0),
            ),
      ),
  );
  const time =
    result.grade === "PERFECT" ? Math.min(60, Math.floor(remain * 2)) : 0;
  const mult = REWARD_CONFIG.score.comboMultipliers[Math.min(combo, 5)] || 2;
  return Math.floor((base + time) * mult);
}
function canInteract() {
  const st = Game.state;
  return (
    st.screen === SCREEN.KITCHEN &&
    !st.busy &&
    !st.overlay &&
    !document.hidden &&
    !window.rulebook?.isOpen &&
    !pauseReasons.size &&
    !!st.currentOrder
  );
}
function addPiece(id, source = "command", expected = null) {
  const n = NOTES[id],
    st = Game.state,
    order = st.currentOrder;
  if (!n || !order || !canInteract()) return false;
  if (
    expected &&
    (expected.sessionId !== st.sessionId || expected.orderId !== order.id)
  )
    return false;
  if (!stageConfig().allowed.includes(id)) return false;
  if (st.servedTicks + n.ticks > order.totalTicks) {
    reject("주문 전체 박자를 넘어요. 되돌리거나 더 작은 조각을 골라 보세요.");
    return false;
  }
  let plate = st.plates[st.plates.length - 1];
  if (plate.ticks + n.ticks > PLATE_TICKS) {
    reject(
      `접시에 ${(PLATE_TICKS - plate.ticks) / 4}박 자리가 남았어요. 더 작은 조각을 골라 보세요.`,
    );
    return false;
  }
  plate.slices.push(id);
  plate.ticks += n.ticks;
  st.servedTicks += n.ticks;
  if (st.tutorialStep != null && st.tutorialStep < 2 && id === "quarter")
    st.tutorialStep++;
  if (st.activity !== "practice" && !Game.save.codexUnlocked.includes(id)) {
    Game.save.codexUnlocked.push(id);
    showToast(`${n.name} 도감이 열렸어요!`);
  }
  if (n.kind === "note") Game.audio.note(id);
  else hush(n.beats);
  haptic(20);
  if (plate.ticks === PLATE_TICKS) {
    Game.audio.complete();
    if (st.servedTicks < order.totalTicks)
      st.plates.push({ index: st.plates.length, ticks: 0, slices: [] });
  }
  render();
  saveNow();
  return true;
}
function reject(message) {
  const el = document.querySelector(".active-plate");
  el?.classList.remove("shake");
  void el?.offsetWidth;
  el?.classList.add("shake");
  Game.audio.fail();
  haptic([60, 40, 60]);
  showToast(message);
}
function undoPiece() {
  const st = Game.state;
  if (!canInteract() || !st.plates.length) return;
  let plate = st.plates[st.plates.length - 1];
  if (!plate.slices.length && st.plates.length > 1) {
    st.plates.pop();
    plate = st.plates[st.plates.length - 1];
  }
  const id = plate.slices.pop();
  if (!id) return;
  if (st.tutorialStep != null)
    st.tutorialStep = Math.min(
      2,
      Math.max(0, plate.slices.filter((x) => x === "quarter").length),
    );
  const n = NOTES[id];
  plate.ticks -= n.ticks;
  st.servedTicks -= n.ticks;
  render();
  saveNow();
}
function finishOrder(force = false) {
  const st = Game.state;
  if (!canInteract()) return;
  if (st.activity === "practice") {
    const result = judge(st.currentOrder);
    if (result.grade !== "PERFECT") {
      showToast("주문과 담은 조각을 비교하고 되돌려 보세요");
      return;
    }
    st.busy = true;
    st.stageStats.successes++;
    st.stageStats.firstTrySuccess++;
    st.stageStats.lastResult = result;
    if (st.tutorialStep === 2) {
      Game.save.tutorialDone.pizza = true;
      Game.save.tutorialStatus = "complete";
      saveNow();
      st.tutorialStep = null;
    }
    Game.audio.success();
    flashStamp("✓", true);
    render();
    saveNow();
    scheduleAdvance(850);
    return;
  }
  if (!force && st.servedTicks !== st.currentOrder.totalTicks) {
    showToast(
      `앞으로 ${(st.currentOrder.totalTicks - st.servedTicks) / 4}박 더 채워요`,
    );
    return;
  }
  if (st.rush && st.servedTicks !== st.currentOrder.totalTicks) {
    rushFinish(true);
    return;
  }
  st.busy = true;
  const result = judge(st.currentOrder),
    remain = Math.max(0, st.timer.leftMs / 1000);
  if (force && result.grade === "PERFECT") result.grade = "PARTIAL";
  result.score = calcScore(result, remain, st.combo);
  const perfect = result.grade === "PERFECT";
  if (perfect) st.combo++;
  else if (result.grade === "MISS") st.combo = 0;
  const tip = perfect
    ? REWARD_CONFIG.coins.servePerfect
    : result.grade === "PARTIAL"
      ? REWARD_CONFIG.coins.serveGood
      : 0;
  st.stageStats.successes += result.grade === "MISS" ? 0 : 1;
  st.stageStats.firstTrySuccess += perfect ? 1 : 0;
  st.stageStats.remainSec += remain;
  st.stageStats.tips += tip;
  st.stageStats.lastResult = result;
  st.score += result.score;
  st.tips += tip;
  Game.save.coins += tip;
  Game.save.totalServes++;
  if (perfect) Game.save.totalPerfectServes++;
  st.awardedOrderIds.push(st.currentOrder.id);
  Game.audio[perfect ? "success" : "fail"]();
  haptic(perfect ? [30, 30, 30, 30, 30] : 200);
  flashStamp(perfect ? "✓" : "×", perfect);
  render();
  showCustomerReaction(perfect);
  if (result.grade !== "PERFECT") {
    openOverlay("lesson", {
      noteId: Object.keys(result.need)[0] || "quarter",
      result,
    });
  } else {
    scheduleAdvance(850);
  }
  saveNow();
}
function scheduleAdvance(delay) {
  const state = Game.state,
    order = state.currentOrder;
  let last = performance.now(),
    remaining = delay;
  function tick() {
    if (
      Game.state !== state ||
      state.currentOrder !== order ||
      state.screen !== SCREEN.KITCHEN
    )
      return;
    const now = performance.now();
    if (
      !state.overlay &&
      !document.hidden &&
      !pauseReasons.size &&
      !window.rulebook?.isOpen
    )
      remaining -= now - last;
    last = now;
    if (remaining <= 0) advanceOrder();
    else setTimeout(tick, 50);
  }
  setTimeout(tick, 50);
}
function advanceOrder() {
  if (!Game.state.currentOrder) return;
  Game.state.orderIndex++;
  if (Game.state.orderIndex >= Game.state.orders.length) {
    if (Game.state.rush) {
      Game.state.busy = false;
      rushFinish();
      return;
    }
    finishStage();
    return;
  }
  startOrder(Game.state.orderIndex);
}
function finishStage() {
  const st = Game.state;
  if (st.activity === "practice") {
    stopLoop();
    st.result = {
      practice: true,
      successes: st.stageStats.successes,
      total: st.orders.length,
      learned: [
        ...new Set(st.orders.flatMap((o) => o.items.map((x) => x.noteId))),
      ],
    };
    setScreen(SCREEN.RESULT);
    saveNow();
    return;
  }
  const cfg = stageConfig(),
    total = st.orders.length,
    accuracy = total ? (st.stageStats.firstTrySuccess / total) * 100 : 0,
    remainRatio = (st.stageStats.remainSec / (total * cfg.timeLimitSec)) * 100;
  let stars = 0;
  if (accuracy >= 60) stars = 1;
  if (accuracy >= 80 && remainRatio >= 20) stars = 2;
  if (accuracy === 100 && remainRatio >= 35) stars = 3;
  const mode = st.mode,
    old = Game.save.progress[mode].stars[st.stage - 1] || 0,
    first = old === 0 && stars > 0;
  if (stars > old) Game.save.progress[mode].stars[st.stage - 1] = stars;
  if (stars > 0)
    Game.save.progress[mode].unlocked = Math.max(
      Game.save.progress[mode].unlocked,
      Math.min(10, st.stage + 1),
    );
  if (st.stage === 10 && stars > 0) st.rushUnlocked = true;
  const stageCoins =
    (REWARD_CONFIG.coins.stageStars[stars - 1] || 0) +
    (first ? REWARD_CONFIG.coins.firstClearBonus : 0);
  Game.save.coins += stageCoins;
  saveNow();
  stopLoop();
  st.result = {
    stars,
    accuracy,
    remainRatio,
    stageCoins,
    score: st.score,
    tips: st.tips,
    successes: st.stageStats.successes,
    perfect: st.stageStats.firstTrySuccess,
    total,
    learned: [...new Set(flatSlices())],
  };
  setScreen(SCREEN.RESULT);
}
function startStage(
  mode,
  stage,
  rush = false,
  activity = rush ? "rush" : "challenge",
  forceTutorial = false,
) {
  Game.audio.ensure();
  const cfg = stageConfig(mode, stage);
  if (!cfg) return;
  pauseReasons.clear();
  pausedAt = null;
  Game.state = {
    screen: SCREEN.KITCHEN,
    mode,
    stage: Number(stage),
    rush,
    activity,
    sessionId:
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    awardedOrderIds: [],
    orders: [],
    orderIndex: 0,
    currentOrder: null,
    plates: createPlates(),
    servedTicks: 0,
    timer: {
      limitSec: cfg.timeLimitSec,
      leftMs: cfg.timeLimitSec * 1000,
      running: true,
      lastTick: performance.now(),
    },
    score: 0,
    tips: 0,
    combo: 0,
    busy: false,
    stageStats: {
      successes: 0,
      firstTrySuccess: 0,
      remainSec: 0,
      tips: 0,
      lastResult: null,
    },
    result: null,
    hintId: null,
    memoryVisible: false,
    memoryEndsAt: 0,
    tutorialStep:
      activity === "practice" &&
      (forceTutorial ||
        (!Game.save.tutorialDone.pizza &&
          Game.save.tutorialStatus !== "skipped"))
        ? 0
        : null,
  };
  Game.state.orders = Array.from({ length: rush ? 999 : cfg.orders }, (_, i) =>
    activity === "practice" && i === 0
      ? makeOrder([{ noteId: "quarter", count: 2 }], cfg, i)
      : generateOrder(cfg, i),
  );
  setScreen(SCREEN.KITCHEN);
  startOrder(0);
}
function rushFinishOrder(force = false) {
  const st = Game.state,
    order = st.currentOrder;
  if (!canInteract() || !order) return;
  if (st.servedTicks !== order.totalTicks) {
    st.rushFailureNote = order.items[0]?.noteId || "quarter";
    rushFinish(true);
    return;
  }
  const result = judge(order);
  if (result.grade !== "PERFECT") {
    st.rushFailureNote =
      Object.keys(result.need || {})[0] || order.items[0]?.noteId || "quarter";
    rushFinish(true);
    return;
  }
  st.busy = true;
  const remain = Math.max(0, st.timer.leftMs / 1000);
  st.combo = Math.min(2, Math.max(1, st.combo) * 1.1);
  const orderScore = Math.round((100 + remain * 5) * st.combo);
  st.score += orderScore;
  st.stageStats.successes++;
  st.stageStats.remainSec += remain;
  st.stageStats.lastResult = result;
  Game.save.totalServes++;
  Game.save.totalPerfectServes++;
  st.awardedOrderIds.push(st.currentOrder.id);
  Game.audio.success();
  haptic([30, 30, 30, 30, 30]);
  flashStamp("✓", true);
  render();
  showCustomerReaction(true);
  saveNow();
  scheduleAdvance(420);
}
function rushFinish(failed = false) {
  const st = Game.state;
  if (st.busy) return;
  st.busy = true;
  st.timer.running = false;
  const rushScore = st.score,
    best = Game.save.rushBest[st.mode],
    isNew =
      rushScore > best.score || st.stageStats.successes > best.servedOrders;
  if (isNew) {
    best.score = Math.max(best.score, rushScore);
    best.servedOrders = Math.max(best.servedOrders, st.stageStats.successes);
  }
  const rushCoins = Math.floor(
    rushScore / REWARD_CONFIG.coins.rushScoreDivisor,
  );
  Game.save.coins += rushCoins;
  saveNow();
  stopLoop();
  st.result = {
    rush: true,
    stars: 0,
    accuracy: st.stageStats.successes ? 100 : 0,
    remainRatio: 0,
    stageCoins: rushCoins,
    score: rushScore,
    tips: 0,
    successes: st.stageStats.successes,
    total: st.orderIndex + 1,
    learned: [],
    isNew,
    failed,
    mostConfused: st.rushFailureNote || null,
  };
  setScreen(SCREEN.RESULT);
}
function startOrder(index) {
  const st = Game.state;
  st.busy = false;
  st.orderIndex = index;
  st.currentOrder = st.orders[index];
  st.plates = createPlates();
  st.servedTicks = 0;
  st.hintId = null;
  st.lastAutosave = null;
  const cfg = stageConfig();
  st.timer = {
    limitSec: st.rush ? Math.max(8, 24 - 0.5 * index) : cfg.timeLimitSec,
    leftMs: (st.rush ? Math.max(8, 24 - 0.5 * index) : cfg.timeLimitSec) * 1000,
    running: !st.overlay && st.activity !== "practice",
    lastTick: performance.now(),
  };
  st.memoryVisible =
    !st.rush && (cfg.boss === "memory" || cfg.boss === "grand");
  st.memoryEndsAt = performance.now() + (st.memoryVisible ? 5000 : 0);
  render();
  saveNow();
}
function continueAfterLesson() {
  closeOverlay();
  advanceOrder();
}
function hint() {
  const st = Game.state;
  if (!canInteract() || st.hintId) return;
  const need = orderIds(st.currentOrder),
    have = countMap(flatSlices()),
    id = need.find((x) => (have[x] || 0) < (countMap(need)[x] || 0));
  if (!id) return;
  if (st.activity !== "practice" && st.stage > 3 && Game.save.coins < 5) {
    showToast("코인이 5개 필요해요");
    return;
  }
  if (st.activity !== "practice" && st.stage > 3) {
    Game.save.coins -= 5;
    saveNow();
  }
  const order = st.currentOrder;
  st.hintId = id;
  render();
  setTimeout(() => {
    if (
      Game.state !== st ||
      st.currentOrder !== order ||
      st.screen !== SCREEN.KITCHEN
    )
      return;
    st.hintId = null;
    render();
  }, 3000);
}
function flashStamp(text, ok) {
  const layer = document.getElementById("fx-layer");
  const el = document.createElement("div");
  el.className = `stamp ${ok ? "ok" : "bad"}`;
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 700);
  if (ok) {
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.className = "fx-star";
      s.textContent = "✦";
      s.style.left = 150 + Math.random() * 90 + "px";
      s.style.top = 250 + Math.random() * 70 + "px";
      s.style.setProperty("--dx", `${(Math.random() - 0.5) * 140}px`);
      s.style.setProperty("--dy", `${-30 - Math.random() * 90}px`);
      layer.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }
}
function showCustomerReaction(ok) {
  const el = document.querySelector(".customer-box .customer-portrait");
  if (el) el.style.animation = ok ? "walk 600ms ease 2" : "shake 500ms ease 1";
}
function showToast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(Game.toastTimer);
  Game.toastTimer = setTimeout(() => t.classList.remove("show"), 2100);
}
function hush(beats) {
  document.querySelector(".hush-bubble")?.remove();
  const bubble = document.createElement("div");
  bubble.className = "hush-bubble";
  bubble.textContent = `${beats}박 쉬어요 · 쉿…`;
  document.getElementById("scale-wrap").appendChild(bubble);
  setTimeout(() => bubble.remove(), Math.max(500, beats * BEAT_MS));
}

// [S6] UI — 화면 렌더링
function coinBadge() {
  return `<div class="coin-badge"><span class="coin">●</span>${Game.save.coins}</div>`;
}
let lastOrderAnnouncement = "";
function render() {
  const focused = document.activeElement?.closest?.("[data-action]");
  const focusAction = focused?.dataset.action,
    focusNote = focused?.dataset.note;
  document
    .querySelectorAll(".screen")
    .forEach((el) =>
      el.classList.toggle("active", el.dataset.screen === Game.state.screen),
    );
  const map = {
    SPLASH: "screen-splash",
    MAIN: "screen-main",
    MODE: "screen-mode",
    STAGE: "screen-stage",
    KITCHEN: "screen-kitchen",
    RESULT: "screen-result",
    CODEX: "screen-codex",
  };
  const id = map[Game.state.screen];
  if (id) {
    const el = document.getElementById(id);
    if (Game.state.screen === SCREEN.SPLASH) el.innerHTML = renderSplash();
    if (Game.state.screen === SCREEN.MAIN) el.innerHTML = renderMain();
    if (Game.state.screen === SCREEN.MODE) el.innerHTML = renderMode();
    if (Game.state.screen === SCREEN.STAGE) el.innerHTML = renderStage();
    if (Game.state.screen === SCREEN.KITCHEN) el.innerHTML = renderKitchen();
    if (Game.state.screen === SCREEN.RESULT) el.innerHTML = renderResult();
    if (Game.state.screen === SCREEN.CODEX) el.innerHTML = renderCodex();
  }
  renderOverlay();
  const soundButton = document.getElementById("sound-toggle");
  const soundOn = Game.audio.allowed();
  soundButton.textContent = soundOn ? "🔊" : "🔇";
  soundButton.setAttribute("aria-label", soundOn ? "소리 끄기" : "소리 켜기");
  soundButton.setAttribute("aria-pressed", String(soundOn));
  updateScale();
  if (Game.state.screen === SCREEN.KITCHEN && Game.state.currentOrder) {
    const p = domain.progress(Game.state.currentOrder, Game.state.plates);
    const summary =
      p.items
        .map((x) => `${NOTES[x.noteId].name} ${x.placed}/${x.required}개`)
        .join(", ") +
      ` 주문 전체 ${p.placedTicks / 4}/${p.requiredTicks / 4}박`;
    if (summary !== lastOrderAnnouncement) {
      document.getElementById("order-live").textContent = summary;
      lastOrderAnnouncement = summary;
    }
  }
  if (focusAction && Game.state.screen === SCREEN.KITCHEN) {
    const candidates = document.querySelectorAll("[data-action]");
    const target = [...candidates].find(
      (x) =>
        x.dataset.action === focusAction &&
        (!focusNote || x.dataset.note === focusNote),
    );
    target?.focus({ preventScroll: true });
  }
}
function renderSplash() {
  return `<div class="splash-screen screen active" data-action="splash-start"><div class="splash-center"><div class="logo-mark"></div><h1 class="splash-title">음표 피자 &amp; 쉼표 파이</h1><p class="splash-sub">리듬 요리사</p></div><div class="start-hint">화면을 톡 눌러 시작</div></div>`;
}
function titleForMode(mode) {
  return MODES[mode]?.name || "";
}
function renderMain() {
  const latest = ["mix", "pie", "pizza"].find(
    (m) =>
      isModeUnlocked(m) && Game.save.progress[m].stars.some((star) => star > 0),
  );
  const nextStage = latest
    ? Game.save.progress[latest].stars.findIndex(
        (star, i) => !star && isStageUnlocked(latest, i + 1),
      ) + 1 || 10
    : null;
  return `<div class="main-screen screen active"><div class="main-header"><div class="logo-mini"></div><h1>리듬 오븐</h1><p>주문대로 조각을 담아 리듬 요리를 완성해요</p></div><div class="home-choices">${savedSession ? `<button class="home-choice continue-choice" data-action="resume-session"><strong>하던 요리 이어하기</strong><small>${MODES[savedSession.mode].name} ${savedSession.stage}단계 · 손님 ${savedSession.orderIndex + 1} · ${new Date(savedSession.savedAt).toLocaleString("ko-KR")}</small></button>` : latest ? `<button class="home-choice continue-choice" data-action="next-stage-start" data-mode="${latest}" data-stage="${nextStage}"><strong>다음 단계 시작</strong><small>${MODES[latest].name} ${nextStage}단계</small></button>` : ""}<button class="home-choice practice-choice" data-action="practice-start"><span>🍕</span><strong>연습하기</strong><small>시간 걱정 없이 하나씩 배워요</small></button><button class="home-choice challenge-choice" data-action="go-mode"><span>⭐</span><strong>도전하기</strong><small>주문을 맞추고 별을 모아요</small></button></div><div class="home-utilities"><button data-action="go-codex">📖 음표 도감</button><button data-action="open-settings">⚙ 설정</button><button data-action="tutorial-replay">처음 배우기</button><button data-action="go-rush">⚡ 러시</button></div><div class="main-footer"><div class="coin-badge">💰 ${Game.save.coins}</div><div class="version">안단테 음악 마을의 박자 주방</div></div></div>`;
}
function renderMode() {
  return renderStage();
}
function renderStage() {
  const mode = currentMode(),
    m = MODES[mode],
    prog = Game.save.progress[mode];
  return `<div class="stage-screen screen active"><div class="stage-header"><button class="back-btn" data-action="go-main" aria-label="홈으로">‹</button><div class="stage-heading">도전할 주방 고르기</div>${coinBadge()}</div><div class="stage-tabs" aria-label="주방 선택">${["pizza", "pie", "mix"].map((id) => `<button class="${id === mode ? "selected" : ""}" data-action="select-kitchen" data-mode="${id}" ${id === mode ? 'aria-current="true"' : ""}>${MODES[id].icon} ${MODES[id].name}${isModeUnlocked(id) ? "" : " 🔒"}</button>`).join("")}</div><div class="stage-list">${Array.from(
    { length: 10 },
    (_, i) => {
      const stage = i + 1,
        cfg = stageConfig(mode, stage),
        unlocked = isStageUnlocked(mode, stage),
        stars = prog.stars[i] || 0;
      return `<button class="stage-card ${unlocked ? "available" : "locked"}" data-action="stage-node" data-stage="${stage}"><strong>${stage}단계 ${stars ? "★".repeat(stars) : ""}</strong><span>${cfg.allowed
        .slice(0, 4)
        .map((id) => NOTES[id].name)
        .join(
          " · ",
        )}</span><small>${unlocked ? "손님 " + cfg.orders + "명 · 주문당 " + cfg.timeLimitSec + "초" : "이전 단계를 별 1개 이상으로 완료하면 열려요"}</small></button>`;
    },
  ).join(
    "",
  )}</div><div class="rush-bar"><button class="btn btn-yellow" data-action="stage-rush">⚡ 무한 러시 ${prog.stars[9] ? "" : "🔒"}</button></div></div>`;
}
function renderKitchen() {
  const st = Game.state,
    cfg = stageConfig(),
    order = st.currentOrder,
    n = order ? order.items : [],
    c = order ? CHARACTERS[order.customerId] : CHARACTERS.beat;
  const active = st.plates[st.plates.length - 1] || { ticks: 0, slices: [] };
  const progress = order ? domain.progress(order, st.plates) : null;
  const ready =
    order &&
    (st.activity === "practice" ? progress.exactMatch : progress.quantityReady);
  const missing = progress?.items.find((x) => x.remaining > 0);
  const unexpected = progress?.unexpected || [];
  return `<div class="kitchen-screen screen active ${Game.save.settings.lefty ? "lefty" : ""}"><div class="kitchen-hud"><button class="icon-btn" data-action="pause" aria-label="일시정지">Ⅱ</button><div class="hud-center">${st.rush ? `러시 · 주문 ${st.orderIndex + 1}` : `${st.activity === "practice" ? "연습" : "도전"} · 손님 ${Math.min(st.orderIndex + 1, cfg.orders)}/${cfg.orders}`}<strong>${st.activity === "practice" ? "시간 제한 없음" : st.rush ? `콤보 ×${Math.max(1, st.combo)}` : `${st.score}점`}</strong></div><div class="coin-badge hud-coin">💰 ${Game.save.coins}</div></div><div class="customer-ticket"><div class="customer-box">${customerSvg(order?.customerId || "beat")}<div class="customer-name">${esc(c.name)}</div></div><button class="ticket ${st.memoryVisible ? "is-memory" : ""}" data-action="ticket-preview"><div class="ticket-top"><div class="ticket-title">${esc(order ? `${c.name}의 주문` : "주문 준비 중")}</div><span>♪</span></div><div class="ticket-items">${progress ? progress.items.map((x) => `<span class="item-chip ${NOTES[x.noteId].kind}">${noteMark(x.noteId, 32)} ${esc(NOTES[x.noteId].name)} · ${NOTES[x.noteId].beats}박 · ${x.placed}/${x.required}개 ${x.excess ? `· ${x.excess}개 많아요` : x.complete ? "✓ 완료" : ""}</span>`).join("") + unexpected.map((x) => `<span class="item-chip">주문에 없는 ${esc(NOTES[x.noteId].name)} ${x.placed}개</span>`).join("") : ""}</div>${st.activity === "practice" ? '<div class="practice-time">시간 제한 없음</div>' : '<div class="ticket-time"><div class="time-track"><div id="time-fill" class="time-fill"></div></div><span id="time-number" class="time-number">--</span></div>'}${st.memoryVisible ? '<div class="memory-note">5초 기억 주문</div>' : ""}</button></div><div class="kitchen-worktop"></div>${st.tutorialStep != null ? `<div class="tutorial-guide" role="status"><strong>${["4분음표를 눌러 보세요", "한 번 더 담아 2개를 만들어 보세요", "주문이 완성됐어요. 서빙해 보세요"][st.tutorialStep]}</strong><button data-action="tutorial-skip">건너뛰기</button><button data-action="tutorial-leave">나가기</button></div>` : ""}<div class="plate-area"><div class="plate-stack">${st.plates
    .slice(0, -1)
    .map(
      (p) =>
        `<div class="stack-mini">${sliceSvg(p.slices[0] || "quarter", 0, 360, 44, false)}</div>`,
    )
    .join(
      "",
    )}</div><div class="plate-badge">접시 ${st.plates.length}/${Math.max(1, Math.ceil((order?.totalTicks || 16) / 16))}</div><div class="active-plate">${plateSvg(active)}</div><div class="drop-ring"></div><div class="gauge"><div class="gauge-cells">${[
    0, 1, 2, 3,
  ]
    .map((i) => {
      const ticks = active.ticks - i * 4;
      const pct = Math.max(0, Math.min(1, ticks / 4));
      const id =
        active.slices[Math.max(0, active.slices.length - 1)] || "quarter";
      const color = NOTES[id]?.kind === "rest" ? COLORS.purple : COLORS.red;
      return `<div class="gauge-cell"><div class="gauge-fill" style="height:${pct * 100}%;background:${color}"></div></div>`;
    })
    .join(
      "",
    )}</div><div class="gauge-label">현재 접시 ${active.ticks / 4}/4박</div><div class="gauge-tick">주문 전체 ${(st.servedTicks / 4).toFixed(st.servedTicks % 4 ? 2 : 0)} / ${order ? order.beats : "4"}박</div></div>${ready ? "" : '<div class="serve-hint">' + (st.activity === "practice" && missing ? `${NOTES[missing.noteId].name}를 ${missing.remaining}개 더 담아 보세요` : order && st.servedTicks ? `남은 박자 ${(order.totalTicks - st.servedTicks) / 4}` : "조각을 눌러 담거나 끌어와요") + "</div>"}</div><div class="tray"><div class="tray-inner">${cfg.allowed
    .map((id) => {
      const nn = NOTES[id];
      return `<div class="piece-card"><button class="piece-btn ${st.hintId === id ? "hinting" : st.tutorialStep != null && st.tutorialStep < 2 && id === "quarter" ? "is-tutorial-target" : ""}" data-action="add-piece" data-note="${id}" aria-label="${nn.name} ${nn.beats}박 담기"><div class="piece-art">${sliceSvg(id, 0, nn.beats * 90, 96, true)}</div><div class="piece-label">${nn.name}<span class="piece-sub">${Game.save.settings.showBeats ? `${nn.beats}박 · ${nn.frac}` : "조각"}</span></div></button><button class="listen-piece" data-action="listen-piece" data-note="${id}" aria-label="${nn.name} 소리 듣기">🔊 듣기</button></div>`;
    })
    .join(
      "",
    )}</div></div><div class="action-bar"><button class="btn btn-yellow undo-btn" data-action="undo">↶ 되돌리기</button><button class="btn btn-cream hint-btn" data-action="hint" aria-label="${st.activity !== "practice" && st.stage > 3 ? "힌트 · 5코인" : "힌트 · 무료"}">💡 ${st.activity !== "practice" && st.stage > 3 ? "힌트 · 5코인" : "힌트 · 무료"}</button><button class="btn btn-red serve-btn ${st.tutorialStep === 2 ? "is-tutorial-target" : ""} ${ready ? "ready" : ""}" data-action="serve" ${ready ? "" : "disabled"}>${st.activity === "practice" ? "완성! 서빙하기" : "주문 확인하기"}</button></div></div>`;
}
function plateSvg(plate) {
  const uid = `plate-${++Game.uid}`;
  let angle = 0,
    parts = "";
  plate.slices.forEach((id) => {
    const n = NOTES[id],
      end = angle + n.beats * 90,
      path = arcPath(140, 140, 126, angle, end),
      color = n.kind === "note" ? COLORS.red : COLORS.purple,
      texture = n.kind === "note" ? "note" : "rest";
    parts += `<path d="${path}" fill="${color}"/><path d="${path}" fill="url(#${uid}-${texture})" opacity=".88"/><path d="${path}" fill="${color}" fill-opacity=".18" stroke="${n.kind === "note" ? COLORS.yellow : COLORS.brown}" stroke-width="4"/>`;
    const mid = angle + n.beats * 45,
      p = polar(140, 140, 74, mid),
      badge = n.beats <= 0.25 ? 11 : n.beats <= 0.5 ? 16 : 20,
      markScale = (0.44 * badge) / 20;
    parts += `<circle cx="${p.x}" cy="${p.y}" r="${badge}" fill="#FFF8E7" fill-opacity=".93"/><g transform="translate(${p.x - 50 * markScale} ${p.y - 50 * markScale}) scale(${markScale})">${noteMark(id, 100).replace(/<svg[^>]*>|<\/svg>/g, "")}</g>`;
    angle = end;
  });
  if (angle < 360)
    parts += `<path d="${arcPath(140, 140, 126, angle, 360)}" fill="rgba(255,248,231,.76)" stroke="${COLORS.brown}" stroke-width="3" stroke-dasharray="7 7"/>`;
  return `<svg class="plate-svg" viewBox="0 0 280 280"><defs><pattern id="${uid}-note" patternUnits="userSpaceOnUse" width="280" height="280"><image href="assets/drybrush/food-props.webp" x="0" y="0" width="1120" height="840"/></pattern><pattern id="${uid}-rest" patternUnits="userSpaceOnUse" width="280" height="280"><image href="assets/drybrush/food-props.webp" x="-280" y="0" width="1120" height="840"/></pattern></defs><circle cx="140" cy="140" r="136" fill="#F7D99B" stroke="${COLORS.brown}" stroke-width="8"/><circle cx="140" cy="140" r="126" fill="#FFF8E7" stroke="rgba(111,69,24,.22)" stroke-width="2"/>${parts}<circle cx="140" cy="140" r="17" fill="${COLORS.yellow}" stroke="${COLORS.brown}" stroke-width="3"/><text x="140" y="145" text-anchor="middle" font-size="12" font-weight="900" fill="${COLORS.brown}">4박</text></svg>`;
}
function renderResult() {
  if (Game.state.result?.practice) {
    const r = Game.state.result;
    return `<div class="result-screen screen active practice-result"><div class="result-banner">연습을 마쳤어요!</div><h2>오늘 배운 조각</h2><div class="learned-strip">${r.learned.map((id) => `<span>${noteMark(id, 48)} ${NOTES[id].name}</span>`).join("")}</div><p>시간 걱정 없이 ${r.successes}개 주문을 완성했어요.</p><div class="result-actions"><button class="btn btn-red" data-action="practice-start">한 번 더 연습하기</button><button class="btn btn-yellow" data-action="go-mode">도전하기</button><button class="btn btn-green" data-action="go-main">홈으로</button></div></div>`;
  }
  const r = Game.state.result || {
    stars: 0,
    accuracy: 0,
    remainRatio: 0,
    stageCoins: 0,
    score: 0,
    tips: 0,
    successes: 0,
    total: 0,
    learned: [],
  };
  const next = Game.state.stage < 10 && r.stars > 0;
  return `<div class="result-screen screen active"><div class="result-banner ${r.stars ? "" : "fail"}">${r.stars ? "영업 종료!" : "아깝다! 한 번 더?"}</div><div class="stars-row">${[1, 2, 3].map((i) => `<span class="result-star ${i <= r.stars ? "earned" : ""}" style="animation-delay:${(i - 1) * 0.3}s">★</span>`).join("")}</div><p class="star-caption">정확도 ${Math.round(r.accuracy)}% · 남은 시간 ${Math.round(r.remainRatio)}%<br>${r.stars ? `별 ${r.stars}개를 모았어요!` : "학습 카드를 보고 다시 도전해요."}</p><div class="score-card"><h3>완벽한 주문 ${r.perfect ?? 0}/${r.total}</h3><details><summary>점수와 보상 자세히 보기</summary><div class="score-grid"><div class="score-cell"><small>점수</small><strong>${r.score}</strong></div><div class="score-cell"><small>성공 주문</small><strong>${r.successes}/${r.total}</strong></div><div class="score-cell"><small>서빙 팁</small><strong>+${r.tips}코인</strong></div><div class="score-cell"><small>스테이지 보상</small><strong>+${r.stageCoins}코인</strong></div></div></details><div class="learned-strip">${r.learned
    .slice(0, 6)
    .map(
      (id) =>
        `<button data-action="codex-note" data-note="${id}">${noteMark(id, 38)}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="result-actions">${next ? '<button class="btn btn-red" data-action="result-next">다음 스테이지</button>' : ""}<button class="btn btn-yellow" data-action="result-retry">다시 요리하기</button><button class="btn btn-green" data-action="result-stage">스테이지 목록</button></div></div>`;
}
function renderRushResult() {
  const r = Game.state.result || {},
    best = Game.save.rushBest[Game.state.mode] || { score: 0, servedOrders: 0 },
    note = r.mostConfused && NOTES[r.mostConfused];
  return `<div class="result-screen rush-result screen active"><div class="result-banner fail">⚡ 러시 종료!</div><div class="rush-score-hero"><strong>${r.score || 0}</strong><span>점</span></div><p class="rush-caption">${r.successes || 0}건 성공 · ${r.total || 0}번째 주문에서 종료</p><div class="score-card"><h3>${r.isNew ? "NEW! 최고 기록을 갱신했어요" : "오늘의 러시 기록"}</h3><div class="score-grid"><div class="score-cell"><small>최종 점수</small><strong>${r.score || 0}</strong></div><div class="score-cell"><small>성공 주문</small><strong>${r.successes || 0}건</strong></div><div class="score-cell"><small>획득 코인</small><strong>+${r.stageCoins || 0}</strong></div><div class="score-cell"><small>최고 기록</small><strong>${best.score}</strong></div></div><div class="rush-best">${note ? `가장 헷갈린 재료: ${note.name}` : "끝까지 집중한 멋진 러시였어요!"}</div></div><div class="result-actions"><button class="btn btn-yellow" data-action="result-retry">다시 도전</button><button class="btn btn-green" data-action="result-stage">스테이지 목록</button><button class="btn btn-purple" data-action="result-main">메인 메뉴</button></div></div>`;
}
const defaultRender = render;
render = function () {
  defaultRender();
  if (Game.state.screen === SCREEN.RESULT && Game.state.result?.rush) {
    document.getElementById("screen-result").innerHTML = renderRushResult();
  }
};
function renderCodex() {
  const kind = Game.state.codexKind || "note";
  const ids = Object.keys(NOTES).filter((id) => NOTES[id].kind === kind);
  return `<div class="codex-screen screen active"><div class="codex-header"><button class="back-btn" data-action="codex-back" aria-label="돌아가기">‹</button><h2>리듬 레시피 북</h2><div class="codex-tabs"><button class="codex-tab ${kind === "note" ? "active note" : ""}" data-action="codex-kind" data-kind="note">음표</button><button class="codex-tab ${kind === "rest" ? "active rest" : ""}" data-action="codex-kind" data-kind="rest">쉼표</button></div></div><div class="codex-grid">${ids
    .map((id) => {
      const n = NOTES[id],
        unlocked = Game.save.codexUnlocked.includes(id);
      return `<article class="codex-card ${unlocked ? "" : "locked"}"><div class="codex-art"><div class="slice">${unlocked ? sliceSvg(id, 0, n.beats * 90, 82, false) : '<span style="font-size:44px">?</span>'}</div><div class="mark">${unlocked ? noteMark(id, 46) : '<span style="font-size:32px">🔒</span>'}</div></div><h3>${unlocked ? n.name : "???"}</h3><p>${unlocked ? `${n.beats}박 · ${n.frac} 조각` : "새 재료를 만나 보세요"}</p><button class="listen-btn" data-action="listen-note" aria-label="${esc(n.name)} 소리 듣기" data-note="${id}" ${unlocked ? "" : "disabled"}>🔊</button></article>`;
    })
    .join("")}</div></div>`;
}
function lessonComparison(result) {
  const rows = (counts) =>
    Object.entries(counts || {})
      .map(
        ([id, count]) =>
          `<p>${noteMark(id, 48)}<span>${NOTES[id].name} ${count}개</span></p>`,
      )
      .join("") || "<p>아직 담지 않았어요</p>";
  return `<div class="lesson-comparison"><section><h3>주문한 재료</h3>${rows(result?.need)}</section><section><h3>내가 담은 재료</h3>${rows(result?.have)}</section></div>`;
}
function renderOverlay() {
  const layer = document.getElementById("overlay-layer"),
    o = Game.state.overlay,
    wasInside = !!layer.contains?.(document.activeElement),
    oldFocused = wasInside ? document.activeElement : null,
    oldAction = oldFocused?.dataset?.action,
    oldValue = oldFocused?.dataset?.value,
    oldSetting = oldFocused?.dataset?.setting,
    opening = layer.dataset.overlayType !== o?.type;
  if (!o) {
    layer.className = "";
    layer.innerHTML = "";
    delete layer.dataset.overlayType;
    return;
  }
  layer.dataset.overlayType = o.type;
  layer.className = "open";
  let body = "";
  if (o.type === "preview") {
    const cfg = stageConfig(o.payload.mode, o.payload.stage);
    body = `<div class="overlay-dim"></div><div class="overlay-card preview-card"><button class="overlay-close" data-action="close-overlay">×</button><div class="eyebrow">${MODES[o.payload.mode].icon} ${MODES[o.payload.mode].name}</div><h2>스테이지 ${o.payload.stage}</h2><div class="preview-art">${cfg.allowed
      .slice(0, 5)
      .map((id) => noteMark(id, 56))
      .join(
        "",
      )}</div><div class="preview-meta">손님 ${cfg.orders}명 · 주문당 ${cfg.timeLimitSec}초<br>${cfg.boss ? "보스 손님 특수 주문!" : "박자를 맞춰 주문을 완성해요"}</div><button class="btn btn-red" data-action="start-preview">요리 시작!</button></div>`;
  } else if (o.type === "pause") {
    body = `<div class="overlay-dim"></div><div class="overlay-card pause-card"><div class="eyebrow">리듬 오븐 잠깐 쉬기</div><h2>일시정지</h2><div class="pause-status">스테이지 ${Game.state.stage} · 손님 ${Game.state.orderIndex + 1}/${Game.state.orders.length}</div><div class="overlay-actions"><button class="btn btn-green" data-action="resume">계속하기</button><button class="btn btn-yellow" data-action="restart-stage">다시 하기</button><button class="btn btn-red" data-action="leave-stage">주방 나가기</button></div></div>`;
  } else if (o.type === "lesson") {
    const id = o.payload.noteId || "quarter",
      n = NOTES[id];
    body = `<div class="overlay-dim"></div><div class="overlay-card lesson-card"><div class="eyebrow">할아버지 노트가 도와줘요</div><h2>다시 살펴볼까요?</h2><div class="lesson-visual">${noteMark(id, 86)}<span class="lesson-eq">=</span>${sliceSvg(id, 0, n.beats * 90, 86, false)}</div><p><strong>${n.name}</strong>는 ${n.beats === 4 ? "피자 한 판" : n.beats === 3 ? "3박 조각" : n.beats === 2 ? "피자 반 판" : n.beats === 1 ? "피자 1/4 조각" : `${n.beats}박 조각`}이에요.<br>다음 주문에서 다시 맞춰 봐요!</p>${lessonComparison(o.payload.result)}<p>${Object.entries(
      o.payload.result?.need || {},
    )
      .map(
        ([key, count]) =>
          `${esc(NOTES[key]?.name || key)} ${count}개 주문 · ${o.payload.result.have[key] || 0}개 담음`,
      )
      .join("<br>")}${Object.entries(o.payload.result?.have || {})
      .filter(([key]) => !o.payload.result.need[key])
      .map(
        ([key, count]) =>
          `<br>주문에 없는 ${esc(NOTES[key]?.name || key)} ${count}개`,
      )
      .join(
        "",
      )}</p><div class="overlay-actions"><button class="btn btn-yellow" data-action="listen-note" data-note="${id}">🔊 소리 들어보기</button><button class="btn btn-green" data-action="lesson-ok">알겠어요!</button></div></div>`;
  } else if (o.type === "settings") {
    const s = Game.save.settings;
    body = `<div class="overlay-dim"></div><div class="overlay-card settings-card"><button class="overlay-close" data-action="close-overlay">×</button><h2>설정</h2><div class="setting-row"><strong>소리</strong><div class="segment">${[
      ["on", "켜기"],
      ["bgmOff", "배경음 끄기"],
      ["muteAll", "끄기"],
    ]
      .map(
        ([v, l]) =>
          `<button class="${s.sound === v ? "active" : ""}" data-action="set-sound" data-value="${v}">${l}</button>`,
      )
      .join(
        "",
      )}</div></div><div class="setting-row"><strong>햅틱 진동</strong><button class="toggle ${s.haptic ? "on" : ""}" data-action="toggle-setting" data-setting="haptic" aria-label="햅틱 진동" aria-pressed="${s.haptic}"></button></div><div class="setting-row"><strong>왼손 모드</strong><button class="toggle ${s.lefty ? "on" : ""}" data-action="toggle-setting" data-setting="lefty" aria-label="왼손 모드" aria-pressed="${s.lefty}"></button></div><div class="setting-row"><strong>박자 숫자 표시</strong><button class="toggle ${s.showBeats ? "on" : ""}" data-action="toggle-setting" data-setting="showBeats" aria-label="박자 숫자 표시" aria-pressed="${s.showBeats}"></button></div><p>시간 걱정 없이 배우려면 홈의 연습하기를 선택하세요.</p><button class="danger" data-action="reset-progress">진행 기록 초기화</button></div>`;
  } else if (o.type === "rush") {
    body = `<div class="overlay-dim"></div><div class="overlay-card rush-card"><button class="overlay-close" data-action="close-overlay">×</button><h2>무한 러시</h2><p>성공할수록 빨라져요.<br>어느 주방에 도전할까요?</p><div class="rush-choice">${[
      "pizza",
      "pie",
      "mix",
    ]
      .map((m) => {
        const unlocked = Game.save.progress[m].stars[9] > 0;
        return `<button class="btn ${m === "pizza" ? "btn-red" : m === "pie" ? "btn-purple" : "btn-yellow"} ${unlocked ? "" : "disabled"}" data-action="start-rush" data-mode="${m}"><span class="icon">${MODES[m].icon}</span>${m === "pizza" ? "피자" : m === "pie" ? "파이" : "믹스"}</button>`;
      })
      .join("")}</div></div>`;
  } else if (o.type === "tutorial") {
    const mode = o.payload.mode;
    body = `<div class="overlay-dim"></div><div class="overlay-card tutorial-card"><div class="tutorial-icon">👨‍🍳</div><h2>${mode === "pizza" ? "리듬 주방에 어서 와요!" : mode === "pie" ? "쉼표 파이를 배워요!" : "믹스 주문을 읽어 봐요!"}</h2><p>${mode === "pizza" ? "접시 하나는 4박이에요. 조각을 끌어 담고, 박자가 맞으면 서빙해요!" : mode === "pie" ? "쉼표는 소리 없이 쉬는 박자예요. 화면의 쉿 점멸로 박자를 세어 봐요!" : "음표와 쉼표는 색과 모양이 달라요. 한 접시에서 박자를 합산해요!"}</p><button class="btn btn-green" data-action="tutorial-continue">요리 시작!</button></div>`;
  }
  layer.innerHTML = body;
  const card = layer.querySelector(".overlay-card"),
    heading = card?.querySelector("h2");
  if (card) {
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.tabIndex = -1;
    if (heading) {
      heading.id = "game-overlay-title";
      card.setAttribute("aria-labelledby", heading.id);
    }
    card
      .querySelectorAll(".overlay-close")
      .forEach((button) => button.setAttribute("aria-label", "닫기"));
    if ((opening || wasInside) && !window.rulebook?.isOpen) {
      const controls = [
        ...card.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const same = controls.find(
        (el) =>
          oldAction &&
          el.dataset.action === oldAction &&
          (!oldValue || el.dataset.value === oldValue) &&
          (!oldSetting || el.dataset.setting === oldSetting),
      );
      (same || controls[0] || card).focus({ preventScroll: true });
    }
  }
}

// [S7] INPUT — Pointer Events 하나로 탭·드래그를 통합
let suppressClickUntil = 0;
function gamePoint(e) {
  const rect = document.getElementById("scale-wrap").getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function onPointerDown(e) {
  const btn = e.target.closest(".piece-btn");
  if (!btn || !canInteract() || Game.drag || e.button > 0) return;
  const p = gamePoint(e);
  Game.drag = {
    id: btn.dataset.note,
    button: btn,
    pointerId: e.pointerId,
    startX: p.x,
    startY: p.y,
    lastX: p.x,
    lastY: p.y,
    startT: performance.now(),
    active: false,
    order: Game.state.currentOrder,
    sessionId: Game.state.sessionId,
  };
  Game.audio.ensure();
  btn.focus({ preventScroll: true });
  previewPlacement(btn.dataset.note);
  btn.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function onPointerMove(e) {
  const d = Game.drag;
  if (!d || d.pointerId !== e.pointerId) return;
  const p = gamePoint(e);
  d.lastX = p.x;
  d.lastY = p.y;
  const dist = Math.hypot(p.x - d.startX, p.y - d.startY);
  if (!d.active && dist > 8) beginDrag(d);
  if (d.active) moveGhost(p.x, p.y, e.clientX, e.clientY);
  e.preventDefault();
}
function beginDrag(d) {
  d.active = true;
  d.button.classList.add("dragging");
  Game.audio.note(d.id);
  const ghost = document.createElement("div");
  ghost.className = "ghost-piece";
  ghost.innerHTML = sliceSvg(d.id, 0, NOTES[d.id].beats * 90, 106, true);
  document.getElementById("drag-layer").appendChild(ghost);
  d.ghost = ghost;
  document.querySelector(".drop-ring")?.classList.add("show");
}
function overPlate(clientX, clientY) {
  const r = document.querySelector(".active-plate")?.getBoundingClientRect();
  if (!r || !r.width || !r.height) return false;
  return (
    Math.hypot(
      (clientX - (r.left + r.width / 2)) / (r.width / 2),
      (clientY - (r.top + r.height / 2)) / (r.height / 2),
    ) <= 1
  );
}
function moveGhost(x, y, clientX, clientY) {
  const d = Game.drag;
  if (!d?.ghost) return;
  d.ghost.style.left = clientX + "px";
  d.ghost.style.top = clientY - 40 + "px";
  document
    .querySelector(".drop-ring")
    ?.classList.toggle("valid", overPlate(clientX, clientY));
}
function cancelDrag() {
  const d = Game.drag;
  if (!d) return;
  d.button.classList.remove("dragging");
  d.ghost?.remove();
  document.querySelector(".drop-ring")?.classList.remove("show", "valid");
  Game.drag = null;
  clearPlacementPreview();
  if (d.button.hasPointerCapture?.(d.pointerId))
    d.button.releasePointerCapture(d.pointerId);
}
function endPointer(e, cancel = false) {
  const d = Game.drag;
  if (!d || d.pointerId !== e.pointerId) return;
  const valid =
    !cancel &&
    d.order === Game.state.currentOrder &&
    (!d.active || overPlate(e.clientX, e.clientY));
  const wasDrag = d.active;
  cancelDrag();
  if (valid)
    addPiece(d.id, wasDrag ? "drag" : "tap", {
      sessionId: d.sessionId,
      orderId: d.order.id,
    });
  else if (!cancel && wasDrag) showToast("접시 가까이에 놓아 주세요");
  e.preventDefault();
}
function clearPlacementPreview() {
  document.querySelector(".placement-preview")?.remove();
}
function previewPlacement(id) {
  clearPlacementPreview();
  if (!canInteract() || !NOTES[id]) return;
  const st = Game.state,
    plate = st.plates.at(-1);
  const ticks = NOTES[id].ticks;
  const blocked =
    plate.ticks + ticks > PLATE_TICKS ||
    st.servedTicks + ticks > st.currentOrder.totalTicks;
  const preview = document.createElement("div");
  preview.className = "placement-preview" + (blocked ? " is-blocked" : "");
  preview.setAttribute("aria-hidden", "true");
  preview.innerHTML = `<svg viewBox="0 0 280 280"><path d="${arcPath(140, 140, 126, plate.ticks * 22.5, Math.min(16, plate.ticks + ticks) * 22.5)}" fill="${NOTES[id].kind === "note" ? COLORS.red : COLORS.purple}" stroke="${COLORS.brown}" stroke-width="3" stroke-dasharray="6 4"/></svg>`;
  document.querySelector(".active-plate")?.appendChild(preview);
}
function previewPiece(id) {
  if (!canInteract() || !NOTES[id]) return;
  Game.audio.note(id);
  if (NOTES[id].kind === "rest") hush(NOTES[id].beats);
  showToast(`${NOTES[id].name} · ${NOTES[id].beats}박`);
}

// [S8] FX / TIMER — rAF 단일 루프
function startLoop() {
  stopLoop();
  const tick = (now) => {
    Game.raf = requestAnimationFrame(tick);
    if (Game.state.screen !== SCREEN.KITCHEN) return;
    const st = Game.state;
    if (
      st.timer.running &&
      !st.overlay &&
      !window.rulebook?.isOpen &&
      !pauseReasons.size &&
      !document.hidden
    ) {
      const dt = now - st.timer.lastTick;
      st.timer.leftMs -= dt;
      st.timer.lastTick = now;
      if (st.memoryVisible && now >= st.memoryEndsAt) {
        st.memoryVisible = false;
        render();
      }
      updateTimerUi();
      if (!st.lastAutosave || now - st.lastAutosave >= 5000) {
        st.lastAutosave = now;
        saveNow();
      }
      if (st.timer.leftMs <= 0) {
        st.timer.leftMs = 0;
        st.timer.running = false;
        showToast("시간이 다 됐어요!");
        if (st.rush) rushFinish(true);
        else finishOrder(true);
      }
    } else st.timer.lastTick = now;
  };
  Game.state.timer.lastTick = performance.now();
  Game.raf = requestAnimationFrame(tick);
}
function stopLoop() {
  if (Game.raf) cancelAnimationFrame(Game.raf);
  Game.raf = 0;
}
function updateTimerUi() {
  const st = Game.state,
    cfg = stageConfig();
  const limit = st.timer.limitSec * 1000,
    left = Math.max(0, st.timer.leftMs),
    ratio = left / limit;
  const fill = document.getElementById("time-fill"),
    num = document.getElementById("time-number");
  if (fill) {
    fill.style.width = ratio * 100 + "%";
    fill.classList.toggle("warn", ratio <= 0.3);
  }
  if (num) num.textContent = Math.ceil(left / 1000) + "초";
}
function updateScale() {
  cancelDrag();
  Game.state.scale = 1;
  const wrap = document.getElementById("scale-wrap");
  if (wrap) wrap.style.transform = "";
}

// [S9] BOOT / EVENTS
function action(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  Game.audio.ensure();
  Game.audio.button();
  if (a === "toggle-sound") {
    Game.save.settings.sound = Game.audio.allowed() ? "muteAll" : "on";
    if (!Game.audio.allowed()) {
      for (const voice of Game.audio.voices) {
        try {
          voice.stop();
        } catch (_) {}
      }
      Game.audio.voices.clear();
    } else Game.audio.ensure();
    saveNow();
    render();
    return;
  }
  if (a === "next-stage-start") {
    const mode = el.dataset.mode,
      stage = Number(el.dataset.stage);
    if (isModeUnlocked(mode) && isStageUnlocked(mode, stage))
      startStage(mode, stage);
    return;
  }
  if (a === "resume-session") {
    const restored = PizzaSave.restoreSnapshot(savedSession, performance.now());
    if (!restored) {
      savedSession = null;
      showToast("이어갈 수 있는 주문이 없어요");
      render();
      return;
    }
    pauseReasons.clear();
    pausedAt = null;
    window.PizzaPause.add("overlay");
    Game.state = restored;
    Game.state.tutorialStep =
      restored.activity === "practice" &&
      !Game.save.tutorialDone.pizza &&
      Game.save.tutorialStatus !== "skipped" &&
      restored.orderIndex === 0
        ? Math.min(
            2,
            restored.plates
              .flatMap((p) => p.slices)
              .filter((id) => id === "quarter").length,
          )
        : null;
    render();
    startLoop();
    return;
  }
  if (a === "practice-start") {
    startStage("pizza", 1, false, "practice");
    return;
  }
  if (a === "tutorial-replay") {
    startStage("pizza", 1, false, "practice", true);
    return;
  }
  if (a === "tutorial-skip") {
    Game.state.tutorialStep = null;
    Game.save.tutorialStatus = "skipped";
    saveNow();
    render();
    return;
  }
  if (a === "tutorial-leave") {
    setScreen(SCREEN.MAIN);
    return;
  }
  if (a === "select-kitchen") {
    const mode = el.dataset.mode;
    if (!isModeUnlocked(mode)) {
      showToast(
        mode === "pie"
          ? "피자 주방 3단계를 깨면 열려요"
          : "피자와 파이 주방을 모두 완료하면 열려요",
      );
      return;
    }
    Game.state.mode = mode;
    render();
    return;
  }
  if (a === "splash-start") {
    setScreen(SCREEN.MAIN);
    return;
  }
  if (a === "go-main") {
    setScreen(SCREEN.MAIN);
    return;
  }
  if (a === "go-mode") {
    setScreen(SCREEN.STAGE);
    return;
  }
  if (a === "go-codex") {
    Game.state.codexKind = "note";
    Game.state.codexBack = Game.state.screen;
    setScreen(SCREEN.CODEX);
    return;
  }
  if (a === "open-settings") {
    openOverlay("settings", {}, el);
    return;
  }
  if (a === "choose-mode") {
    const mode = el.dataset.mode;
    if (!isModeUnlocked(mode)) {
      showToast("아직 잠긴 주방이에요");
      return;
    }
    Game.state.mode = mode;
    setScreen(SCREEN.STAGE);
    return;
  }
  if (a === "stage-node") {
    const stage = Number(el.dataset.stage);
    if (!isStageUnlocked(Game.state.mode, stage)) {
      showToast(`스테이지 ${stage - 1}을 별 1개로 깨면 열려요`);
      return;
    }
    openOverlay("preview", { mode: Game.state.mode, stage }, el);
    return;
  }
  if (a === "start-preview") {
    const p = Game.state.overlay.payload;
    closeOverlay();
    startStage(p.mode, p.stage);
    return;
  }
  if (a === "stage-rush") {
    if (Game.save.progress[Game.state.mode].stars[9] > 0)
      startStage(Game.state.mode, 10, true);
    else showToast("스테이지 10을 먼저 깨 주세요");
    return;
  }
  if (a === "go-rush") {
    if (["pizza", "pie", "mix"].some((m) => Game.save.progress[m].stars[9] > 0))
      openOverlay("rush", {}, el);
    else showToast("스테이지 10을 깨면 러시가 열려요");
    return;
  }
  if (a === "start-rush") {
    const mode = el.dataset.mode;
    if (Game.save.progress[mode].stars[9] <= 0) return;
    closeOverlay();
    startStage(mode, 10, true);
    return;
  }
  if (a === "pause") {
    openOverlay("pause", {}, el);
    return;
  }
  if (a === "resume") {
    closeOverlay();
    return;
  }
  if (a === "restart-stage") {
    closeOverlay();
    startStage(
      Game.state.mode,
      Game.state.stage,
      Game.state.rush,
      Game.state.activity,
    );
    return;
  }
  if (a === "leave-stage") {
    closeOverlay();
    setScreen(SCREEN.STAGE);
    saveNow();
    return;
  }
  if (a === "add-piece") {
    if (e.detail === 0) addPiece(el.dataset.note, "keyboard");
    return;
  }
  if (a === "listen-piece") {
    previewPiece(el.dataset.note);
    return;
  }
  if (a === "undo") {
    undoPiece();
    return;
  }
  if (a === "hint") {
    hint();
    return;
  }
  if (a === "serve") {
    if (Game.state.rush) rushFinishOrder();
    else finishOrder();
    return;
  }
  if (a === "ticket-preview") {
    if (!canInteract() || Game.state.memoryVisible) return;
    const state = Game.state,
      order = state.currentOrder;
    const ids = orderIds(order || { items: [] });
    ids.forEach((id, i) =>
      setTimeout(() => {
        if (
          Game.state !== state ||
          state.currentOrder !== order ||
          !canInteract()
        )
          return;
        Game.audio.note(id);
        if (NOTES[id].kind === "rest") hush(NOTES[id].beats);
      }, i * BEAT_MS),
    );
    return;
  }
  if (a === "lesson-ok") {
    continueAfterLesson();
    return;
  }
  if (a === "result-next") {
    startStage(Game.state.mode, Game.state.stage + 1);
    return;
  }
  if (a === "result-retry") {
    startStage(Game.state.mode, Game.state.stage, Game.state.rush);
    return;
  }
  if (a === "result-stage") {
    setScreen(SCREEN.STAGE);
    return;
  }
  if (a === "result-main") {
    setScreen(SCREEN.MAIN);
    return;
  }
  if (a === "codex-back") {
    setScreen(Game.state.codexBack || SCREEN.MAIN);
    return;
  }
  if (a === "codex-kind") {
    Game.state.codexKind = el.dataset.kind;
    render();
    return;
  }
  if (a === "listen-note") {
    Game.audio.note(el.dataset.note);
    if (NOTES[el.dataset.note].kind === "rest")
      hush(NOTES[el.dataset.note].beats);
    return;
  }
  if (a === "codex-note") {
    Game.state.codexKind = NOTES[el.dataset.note].kind;
    setScreen(SCREEN.CODEX);
    return;
  }
  if (a === "close-overlay") {
    closeOverlay();
    return;
  }
  if (a === "tutorial-continue") {
    Game.save.tutorialDone[Game.state.mode] = true;
    saveNow();
    closeOverlay();
    return;
  }
  if (a === "set-sound") {
    Game.save.settings.sound = el.dataset.value;
    if (!Game.audio.allowed()) {
      for (const voice of Game.audio.voices) {
        try {
          voice.stop();
        } catch (_) {}
      }
      Game.audio.voices.clear();
    }
    saveNow();
    render();
    return;
  }
  if (a === "toggle-setting") {
    const k = el.dataset.setting;
    Game.save.settings[k] = !Game.save.settings[k];
    saveNow();
    renderOverlay();
    if (k === "lefty" || k === "showBeats") render();
    return;
  }
  if (a === "reset-progress") {
    if (el.dataset.confirm === "yes") {
      Game.save = DEFAULT_SAVE();
      Game.state.overlay = null;
      Game.state.awardedOrderIds = [];
      Game.state.sessionId = null;
      setScreen(SCREEN.MAIN);
      saveNow();
      showToast("진행 기록을 초기화했어요");
    } else {
      el.dataset.confirm = "yes";
      el.textContent = "정말 지울까요? 다시 눌러 주세요";
      setTimeout(() => {
        if (el.isConnected) {
          el.dataset.confirm = "";
          el.textContent = "진행 기록 초기화";
        }
      }, 2500);
    }
    return;
  }
}
document.addEventListener(
  "keydown",
  (e) => {
    if (!Game.state.overlay || window.rulebook?.isOpen) return;
    const card = document.querySelector("#overlay-layer .overlay-card");
    if (!card) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (["preview", "settings", "rush"].includes(Game.state.overlay.type))
        closeOverlay();
      return;
    }
    if (e.key !== "Tab") return;
    const controls = [
      ...card.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.getClientRects().length);
    if (!controls.length) {
      e.preventDefault();
      card.focus();
      return;
    }
    const index = controls.indexOf(document.activeElement);
    if (e.shiftKey && index <= 0) {
      e.preventDefault();
      controls[controls.length - 1].focus();
    } else if (!e.shiftKey && (index === -1 || index === controls.length - 1)) {
      e.preventDefault();
      controls[0].focus();
    }
  },
  true,
);
document.addEventListener("focusin", (e) => {
  if (!Game.state.overlay || window.rulebook?.isOpen) return;
  const card = document.querySelector("#overlay-layer .overlay-card");
  if (card && !card.contains(e.target))
    (card.querySelector("button:not([disabled])") || card).focus({
      preventScroll: true,
    });
});
document.addEventListener("focusin", (event) => {
  const button = event.target.closest?.(".piece-btn");
  if (button) previewPlacement(button.dataset.note);
  else if (!Game.drag) clearPlacementPreview();
});
document.addEventListener("pointerover", (event) => {
  if (Game.drag) return;
  const button = event.target.closest?.(".piece-btn");
  if (button) previewPlacement(button.dataset.note);
});
document.addEventListener("pointerout", (event) => {
  if (!Game.drag && event.target.closest?.(".piece-btn"))
    clearPlacementPreview();
});
document.addEventListener("click", action);
document.addEventListener("pointerdown", onPointerDown, { passive: false });
document.addEventListener("pointermove", onPointerMove, { passive: false });
document.addEventListener("pointerup", (e) => endPointer(e, false), {
  passive: false,
});
document.addEventListener("pointercancel", (e) => endPointer(e, true), {
  passive: false,
});
document.addEventListener("lostpointercapture", (e) => {
  if (Game.drag?.pointerId === e.pointerId) cancelDrag();
});
window.addEventListener("blur", cancelDrag);
window.addEventListener("resize", updateScale);
window.visualViewport?.addEventListener("resize", updateScale);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelDrag();
    window.PizzaPause.add("visibility");
    if (Game.state.screen === SCREEN.KITCHEN && !Game.state.overlay)
      openOverlay("pause");
  } else window.PizzaPause.remove("visibility");
});
window.addEventListener("popstate", () => {
  if (Game.state.overlay) closeOverlay();
  else if (Game.state.screen === SCREEN.KITCHEN) openOverlay("pause");
  else if (Game.state.screen === SCREEN.MODE) setScreen(SCREEN.MAIN);
  else if (Game.state.screen === SCREEN.STAGE) setScreen(SCREEN.MODE);
  else setScreen(SCREEN.MAIN);
});
Game.save = loadSave();
Game.state = {
  screen: SCREEN.MAIN,
  mode: "pizza",
  stage: 1,
  scale: 1,
  overlay: null,
  codexKind: "note",
  codexBack: SCREEN.MAIN,
};
render();
