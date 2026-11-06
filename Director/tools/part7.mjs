#!/usr/bin/env node
// Parts 7-8, bars 59-73: eight TV shows, the flips, the wall of TVs, the next viewer.
// This script writes Director/acts/05-inside.json and Director/acts/07-cuts-d.json. Edit it, not them:  node Director/tools/part7.mjs
// A set is a root actor with no mesh of its own; its pieces are children, so hiding the root hides all of them.
// Convention: origin O(i). Action faces -Z, the backdrop is at +Z, the studio camera looks +Z from -Z.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- time: everything is in absolute beats, written back as bar:beat ----------
const bb = (bar, beat = 1) => (bar - 1) * 4 + (beat - 1);
const t = (b) => { const bar = Math.floor(b / 4) + 1, beat = b - (bar - 1) * 4 + 1; return `${bar}:${+beat.toFixed(3)}`; };
const S = (i) => bb(58, 4.5) + i * 4;        // show i cuts in on the last kick of the bar before
const KICKS = [1.25, 2, 3.25];               // kicks inside a show, in beats from S

// ---------- output ----------
const actors = {}, lights = {}, cues = [], cuts = [];
const cue = (o) => (cues.push(o), o);
const cut = (o) => (cuts.push(o), o);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------- the shows ----------
const SHOWS = ['news', 'weather', 'cooking', 'gameshow', 'workout', 'sitcom', 'nature', 'latenight'];
const O = (i) => [200 + 60 * i, 0, 0];
const SKY0 = { top: '#000000', mid: '#000000', bottom: '#000000', fog: '#000000', density: 0 };
const GRADE0 = { suck: 0, twist: 0, wave: 0, pixel: 0, kaleido: 0, poster: 0, ink: 0, toon: 0, scan: 0, duo: 0, radial: 0, swirl: 0, rgb: 0, neon: 0, hatch: 0, halftone: 0, invert: 0, tear: 0, blur: 0, chroma: 0.08, grain: 0.1, vignette: 0.16, bloom: 0.5, threshold: 1, contrast: 8, saturation: 6, exposure: 0, wall: 1, hue: 0, mirror: 0, pinch: 0, mask: 0 };
const LOOK = {
  news:      { grade: { contrast: 14, saturation: 8, bloom: 0.55, threshold: 1, vignette: 0.14 }, sky: { ambient: '#121828' } },
  weather:   { grade: { contrast: 6, saturation: 16, bloom: 0.45, threshold: 1.1, vignette: 0.08 }, sky: { ambient: '#2c3844' } },
  cooking:   { grade: { contrast: 12, saturation: 4, bloom: 0.5, threshold: 1, vignette: 0.14, grain: 0.06 }, sky: { ambient: '#241c16' } },
  gameshow:  { grade: { contrast: 18, saturation: 30, bloom: 0.9, threshold: 0.9, vignette: 0.22 }, sky: { ambient: '#1c0a24' } },
  workout:   { grade: { contrast: 16, saturation: 34, bloom: 1, threshold: 0.8, vignette: 0.2, scan: 0.24, rgb: 0.1, chroma: 0.25, grain: 0.2 }, sky: { ambient: '#1a0a24' } },
  sitcom:    { grade: { contrast: 2, saturation: 4, bloom: 0.35, threshold: 1.1, vignette: 0.1, grain: 0.14, scan: 0.08 }, sky: { ambient: '#4a3e30' } },
  nature:    { grade: { contrast: 10, saturation: 12, bloom: 0.7, threshold: 0.9, vignette: 0.22, grain: 0.08 }, sky: { ambient: '#3a3820', top: '#c8d8a8', mid: '#f0d890', bottom: '#d0a860', fog: '#e8c880', density: 0.006 } },
  latenight: { grade: { contrast: 12, saturation: 12, bloom: 0.7, threshold: 0.95, vignette: 0.26 }, sky: { ambient: '#0e0e24' } },
  wall:      { grade: { contrast: 14, saturation: 6, bloom: 0.9, threshold: 0.9, vignette: 0.3, scan: 0.1 }, sky: { ambient: '#060608' } },
};
const setLights = {};   // show -> [[light name, intensity], ...]
const animated = {};    // show -> child actors that have tracks of their own
const WINDOWS = [[bb(3), bb(9)], [bb(58, 4), bb(73)]];

// A set, with shorthand for its pieces. Every piece is a child of the root, in local coordinates.
function Set(i) {
  const name = [...SHOWS, 'ad'][i], root = 'show_' + name, o = O(i);
  actors[root] = { model: 'prim:cube', pos: o, crowd: { count: 0 } };
  setLights[name] = []; animated[name] = [];
  let n = 0;
  const id = (p) => `${name}_${p}${++n}`;
  const piece = (model, p, s, c, x = {}) => { const k = x.name ?? id('p'); delete x.name;
    actors[k] = { model, parent: root, pos: p, ...(s != null ? { scale: s } : {}), ...(c ? { color: c } : {}), ...x }; return k; };
  const api = {
    name, root, o, at: (p) => add(o, p),
    box: (p, s, c, x) => piece('prim:cube', p, s, c, x),
    cyl: (p, s, c, x) => piece('prim:cylinder', p, s, c, x),
    ball: (p, s, c, x) => piece('prim:sphere', p, s, c, x),
    glow: (p, s, c, x = {}) => piece(x.shape ?? 'prim:cube', p, s, '#000000', { emission: c, ...x, shape: undefined }),
    model: (m, p, s, x) => piece(m, p, s, null, x),
    pic: (tex, p, wh, x = {}) => piece('Assets/Shows/quad.obj', p, [wh[0], wh[1], 1], null, { material: `Assets/Shows/${tex}.mat`, ...x }),
    mover: (key, model, p, s, c, x = {}) => { actors[key] = { model, parent: root, pos: p, ...(s != null ? { scale: s } : {}), ...(c ? { color: c } : {}), ...x }; animated[name].push(key); return key; },
    turkey: (key, kind, p, rot, s) => { actors[key] = { model: 'turkey_' + kind + (/coanchor|chef|host|_hit|_op/.test(key) ? '_hero' : ''), parent: root, pos: p, rot, scale: s }; animated[name].push(key); return key; },
    crowd: (key, def) => { actors[key] = { parent: root, ...def }; animated[name].push(key); return key; },
    light: (l, def, level) => { lights[`${name}_${l}`] = { ...def, pos: add(o, def.pos), intensity: 0 }; setLights[name].push([`${name}_${l}`, level]); },
  };
  return api;
}

// A truss across the top of a studio, with lamps hanging from it. Real pack models, seen in the wide.
function truss(s, y, z, width, lamps, col = '#ffffff') {
  const n = Math.ceil(width / 5);
  for (let i = 0; i < n; i++) s.model('truss', [(i - (n - 1) / 2) * 5, y, z], 1);
  for (let i = 0; i < lamps; i++) {
    const x = (i - (lamps - 1) / 2) * (width / lamps);
    s.model('spotlamp', [x, y - 0.25, z], 1.3, { rot: [0, 0, 0] });
    s.glow([x, y - 0.62, z], [0.14, 0.03, 0.14], col, { shape: 'prim:cylinder' });
  }
}

// ---------- switching what's on ----------
let lastSet = null;
function liveSet(show, b, on = true) {
  if (lastSet && lastSet !== show) for (const [l] of setLights[lastSet] ?? []) cue({ at: t(b), light: l, intensity: 0 });
  if (setLights[show]) for (const [l, v] of setLights[show]) cue({ at: t(b), light: l, intensity: on ? v : 0 });
  const k = LOOK[show];
  cue({ at: t(b), sky: { ...SKY0, ...k.sky } });
  cue({ at: t(b), grade: { ...GRADE0, ...k.grade } });
  lastSet = show;
}

function himAt(b, pos, rot, clip, x = {}) {
  cue({ at: t(b), do: 'set', on: 'person', pos, rot, scale: 1 });
  if (clip) cue({ at: t(b), do: 'anim', on: 'person', clip, blend: x.blend ?? 0, for: x.for ?? '2bars', ...(x.beats ? { beats: x.beats } : {}), ...(x.speed ? { speed: x.speed } : {}), ...(x.start ? { start: x.start } : {}), ...(x.root ? { root: x.root } : {}) });
}

// The channel change: a few frames of snow on the kick, a green number top right, and on we go.
function flip(b, ch, sn = 0.25) {
  cue({ at: t(b - sn), flip: ch ? `CH ${ch}` : '', for: `${sn}b`, hold: '1.5b', sfx: 'channel_flip', sfxVolume: 0.5 });
  cue({ at: t(b - sn), pulse: { tear: 0.7, rgb: 1 }, for: '0.3b', sharp: 2 });
  cue({ at: t(b), pulse: { exposure: 0.6, zoom: -0.04 }, for: '0.5b', sharp: 3 });
}
const TXT = (b, text, pos, size, color, len, style = 'fade', x = {}) => cue({ at: t(b), text, style, size, pos, color, for: `${len}b`, in: 0.06, out: 0.03, ...x });

// ---------- helpers for the rebuild: lights that aim, and him acting ----------
const DEG = 180 / Math.PI;
const aim = (f, to) => { const d = [to[0] - f[0], to[1] - f[1], to[2] - f[2]], l = Math.hypot(...d); return [+(-Math.asin(d[1] / l) * DEG).toFixed(1), +(Math.atan2(d[0], d[2]) * DEG).toFixed(1), 0]; };
const spot = (s, l, from, to, angle, color, level, x = {}) => s.light(l, { type: 'spot', pos: from, rot: aim(from, to), angle, range: Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]) * 2.2, color, ...x }, level);
const BONES0 = Object.fromEntries(['spine', 'chest', 'neck', 'head', 'hips', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'].map((b) => [b, [0, 0, 0]]));
const clean = (b) => { cue({ at: t(b), do: 'pose', on: 'person', bones: BONES0, for: '0.05b' }); cue({ at: t(b), do: 'gaze', on: 'person', weight: 0, for: '0.05b' }); for (const hand of ['left', 'right']) cue({ at: t(b), do: 'reach', on: 'person', hand, weight: 0, for: '0.05b' }); };
const pose = (b, bones, len = 0.3, ease = 'back') => cue({ at: t(b), do: 'pose', on: 'person', bones, for: `${len}b`, ease });
const act = (b, clip, len = 2, x = {}) => cue({ at: t(b), do: 'anim', on: 'person', clip, blend: '0.06s', for: `${len}b`, ...x });
const mug = (b, o, len = 0.2) => cue({ at: t(b), do: 'face', on: 'person', for: `${len}b`, ...o });
const SCREAM = { jawOpen: 1, fear: 1, eyesWide: 1, smile: 0 };
const armsUp = (a, bend = 0) => ({ leftUpperArm: [0, 0, -a], rightUpperArm: [0, 0, a], leftLowerArm: [0, 0, -bend], rightLowerArm: [0, 0, bend] });
const birdLoop = (on, clip, b, len, beats = 1, x = {}) => cue({ at: t(b), do: 'anim', on, clip, for: `${len}b`, beats, ...x });
// Whole-body keys. `t` in beats from b.
const K = (b, keys, x = {}) => { const { on = 'person', ...o } = x; return cue({ at: t(b), do: 'keys', on, keys: keys.map((k) => ({ ...k, t: `${k.t}b`, ...(k.hold ? { hold: `${k.hold}b` } : {}) })), ...o }); };
// A bird's neck: pitch p (down), yaw y (to its right), shared along the neck.
const neck = (p, y = 0, tail = 0) => ({ neck1: [p * 0.2, y * 0.15, 0], neck2: [p * 0.3, y * 0.25, 0], neck3: [p * 0.3, y * 0.3, 0], head: [p * 0.2, y * 0.3, 0], ...(tail ? { tail: [tail, 0, 0] } : {}) });
const neckKeys = (on, b, keys, x = {}) => K(b, keys.map(([tt, p, y, tail, more]) => ({ t: tt, bones: neck(p, y, tail), ...more })), { on, successive: true, ...x });
const alive = (on, b) => cue({ at: t(b), do: 'overlap', on, chains: 'neck,tail', amount: 1, for: '0.1s' });
// A crowd on foot: each member walks by `d` metres over `len` beats and the cycle is tied to the speed, so feet don't skate.
function herd(on, b, d, len, stride, clip = 'runAngry', x = {}) {
  const dist = Math.hypot(d[0], d[1], d[2]), beats = +(stride / (dist / len)).toFixed(3);
  cue({ at: t(b), do: 'walk', on, clip, to: d, rel: 1, for: `${len}b`, ease: 'linear', stride, face: 0, ...(x.stagger ? { stagger: x.stagger } : {}), ...(x.jitter ? { jitter: x.jitter } : {}) });
  cue({ at: t(b), do: 'anim', on, clip, for: `${len}b`, beats, offset: 1 });
}
// The tie bird. One model, one tie, in every show. It watches him.
const TIE = { scale: [0.075, 0.25, 0.02], color: '#d4141c' };
function nemesis(s, key, p, rot, sc = 2.2) {
  s.turkey(key, 'white', p, rot, sc); actors[key].model = 'turkey_white_hero';
  s.mover(key + '_tie', 'prim:cube', [0, 0, 0], TIE.scale, TIE.color, { smooth: 0.5 });
  cue({ at: 0, do: 'attach', on: key + '_tie', to: key + '.neck2', pos: [0, -0.04, 0.12], rot: [0, 0, 0] });
  alive(key, 0);
  return key;
}

// The funnel's red directional is still on at bar 58: nothing after it wants it, and it was lighting all of Parts 7 and 8.
for (const l of ['p6_red', 'p6_well', 'p6_well2']) cue({ at: t(S(0) - 0.25), light: l, intensity: 0 });
cue({ at: t(S(0) - 0.5), do: 'show', on: 'person' });
cue({ at: t(S(0) - 0.5), do: 'stretch', on: 'person', amount: 0, for: '0.05b' });
for (const hand of ['left', 'right']) { cue({ at: t(S(0) - 0.5), do: 'reach', on: 'person', hand, weight: 0, for: '0.1b' }); cue({ at: t(S(0) - 0.5), do: 'fingers', on: 'person', hand, curl: 0, for: '0.1b' }); }
cue({ at: t(S(0) - 0.5), do: 'gaze', on: 'person', weight: 0, for: '0.1b' });
cue({ at: t(S(0) - 0.5), do: 'face', on: 'person', jawOpen: 0, fear: 0, eyesWide: 0, smile: 0, for: '0.1b' });
cue({ at: t(S(0)), do: 'overlap', on: 'person', amount: 0.8, for: '0.1s' });

// ========== 0. NEWS ==========
{
  const s = Set(0), B = '#0a1a3e', B2 = '#102a66', R = '#d4141c', I = 0, Si = S(I);
  s.box([0, -0.05, 0], [26, 0.1, 18], '#080f24', { smooth: 0.82, metal: 0.2, name: 'news_floor' });
  s.box([0, 3, 5], [26, 7, 0.2], '#060a18', { name: 'news_back' });
  // The LED wall: tiles with real gaps. Blue, a brighter centre, a red band through it.
  for (let y = 0; y < 4; y++) for (let x = -5; x <= 5; x++) {
    const c = Math.abs(x) <= 1 && y >= 1 && y <= 2 ? '#2a6cff' : (x + y) % 3 === 0 ? '#14387e' : '#0e2a66';
    s.glow([x * 1.86, 0.95 + y * 1.1, 4.85], [1.78, 1.02, 0.05], c);
  }
  s.pic('news_wall', [0, 2.6, 4.76], [11, 4.4]);
  // Slanted wings frame the desk.
  for (const d of [-1, 1]) {
    s.box([d * 8.2, 3, 2.2], [0.3, 7, 6.5], B, { rot: [0, d * 62, 0], smooth: 0.6 });
    for (let k = 0; k < 6; k++) s.glow([d * (7.45 + k * 0.1), 0.9 + k * 0.9, 1.0 + k * 0.05], [0.04, 0.05, 4.2], '#3c86ff', { rot: [0, d * 62, 0] });
  }
  // Desk: a curved white top on a dark drum, with a lit strip and the station badge in red.
  s.cyl([0, 0.38, 0.35], [5.4, 0.38, 1.7], '#0b1838', { smooth: 0.7, metal: 0.2 });
  s.cyl([0, 0.79, 0.35], [5.7, 0.03, 1.9], '#7884a0', { smooth: 0.8 });
  s.glow([0, 0.1, 0.35], [5.42, 0.012, 1.72], '#58a8ff', { shape: 'prim:cylinder' });
  s.box([0, 0.42, -0.5], [1.3, 0.5, 0.05], R, { smooth: 0.7 });
  s.pic('news_badge', [0, 0.42, -0.53], [1.2, 0.44]);
  // On the desk: two slim monitors, his papers.
  s.box([-1.95, 0.98, 0.15], [0.5, 0.32, 0.03], '#0c0c10', { rot: [0, -10, 0], smooth: 0.8 });
  s.glow([-1.95, 0.98, 0.128], [0.46, 0.28, 0.01], '#2a6cff', { rot: [0, -10, 0] });
  s.box([1.95, 0.98, 0.15], [0.5, 0.32, 0.03], '#0c0c10', { rot: [0, 10, 0], smooth: 0.8 });
  s.glow([1.95, 0.98, 0.128], [0.46, 0.28, 0.01], '#d4141c', { rot: [0, 10, 0] });
  s.mover('news_paper', 'prim:cube', [-1.05, 0.835, 1.12], [0.42, 0.012, 0.3], '#f4f2ea', { rot: [0, 4, 0] });
  // His chair: he sits behind the desk now, not in it.
  s.box([-1.05, 0.23, 1.66], [0.5, 0.44, 0.5], '#0c1224', { smooth: 0.5, name: 'news_chair' }); s.box([-1.05, 0.8, 1.94], [0.5, 0.75, 0.07], '#0c1224', { smooth: 0.5, name: 'news_chairb' });
  // The foreground camera, on a pedestal, worked by a turkey.
  const cx = 3.5, cz = -4.6;
  s.cyl([cx, 0.5, cz], [0.14, 0.5, 0.14], '#15151a', { smooth: 0.5, metal: 0.6 });
  s.cyl([cx, 0.04, cz], [0.9, 0.04, 0.9], '#101014', { smooth: 0.4 });
  s.box([cx, 1.25, cz], [0.34, 0.42, 0.75], '#1a1a20', { smooth: 0.4 });
  s.cyl([cx, 1.3, cz + 0.5], [0.2, 0.16, 0.2], '#08080a', { rot: [90, 0, 0], smooth: 0.9, metal: 0.6 });
  s.turkey('news_op', 'black', [cx + 0.1, 0, cz - 0.75], [0, 0, 0], 2);
  truss(s, 6.4, 1.5, 22, 7, '#fff0dc');
  truss(s, 6.4, -2.5, 22, 5, '#fff0dc');
  // Her co-anchor. A proper tie.
  nemesis(s, 'news_coanchor', [1.05, 0.34, 1.44], [0, 180, 0], 2.15);
  cue({ at: 0, do: 'pose', on: 'news_coanchor', bone: 'tail', rot: [80, 0, 0], for: '0.1s' });
  // The crew: birds in the gap behind the desk, always going somewhere, and a floor manager counting him down.
  s.crowd('news_crew', { model: 'turkey_black', models: ['turkey_black', 'turkey_brown'], pos: [-12, 0, 3.4], crowd: { count: 6, shape: 'line', spacing: 1.7, seed: 12, modelScale: 1.9, scaleVar: 0.1, face: 90 } });
  s.turkey('news_fm', 'white', [-3.6, 0, -2.2], [0, 150, 0], 1.9);
  // Foreground: a teleprompter glass and a cable run.
  s.box([-3.1, 0.75, -3.4], [0.12, 1.5, 0.12], '#121216', { smooth: 0.6, metal: 0.5 });
  s.glow([-3.1, 1.6, -3.4], [0.9, 0.55, 0.03], '#16284a', { rot: [8, 18, 0] });
  // Motivated: a hard key from camera left, a blue kicker behind, the wall washing the set from behind.
  spot(s, 'key', [-5, 5.6, -4.6], [-0.4, 1.0, 0.8], 34, '#fff0dc', 160, { shadows: true });
  spot(s, 'rim', [4.2, 5.2, 3.8], [-0.6, 1.1, 0.8], 40, '#58a0ff', 620);
  spot(s, 'rimr', [-5.5, 4.2, 3.6], [1, 1.1, 0.8], 40, '#ff3040', 300);
  s.light('wall', { type: 'point', pos: [0, 2.6, 3], color: '#2a6cff', range: 9 }, 18);
  s.light('strap', { type: 'point', pos: [0, 0.3, -1.2], color: '#3070ff', range: 4 }, 3);

  const T0 = Si, HE = s.at([-1.05, 0.02, 1.62]);
  himAt(T0, HE, [0, 180, 0], 'IdleSit13', { for: '1bar' });
  clean(T0); mug(T0, { fear: 0.7, eyesWide: 0.6, smile: 0.3 }, 0.3);
  // Rigid, on air: shoulders square, both hands on the script, reading it with little nods.
  pose(T0, { spine: [4, 0, 0], head: [0, 0, 0] }, 0.2);
  for (const [hand, x, hx] of [['left', -0.8, -0.3], ['right', -1.3, -1.8]]) {
    cue({ at: t(T0), do: 'reach', on: 'person', hand, to: s.at([x, 0.87, 1.14]), hint: s.at([hx, 0.7, 1.75]), for: '0.15b', ease: 'out' });
    cue({ at: t(T0), do: 'fingers', on: 'person', hand, curl: 0.12, for: '0.15b' });
  }
  K(T0 + 0.15, [{ t: 0.22, bones: { head: [7, 0, 0] } }, { t: 0.48, bones: { head: [0, 0, 0] } }, { t: 0.72, bones: { head: [6, 0, 0] } }, { t: 0.98, bones: { head: [3, -3, 0] } }]);
  cut({ at: t(T0), shot: { name: 'news: the two-shot', pos: s.at([-0.25, 1.3, -1.8]), move: s.at([-0.25, 1.3, -1.6]), rot: [3, 0, 0], fov: 24, ease: 'linear' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'news: the bird turns', pos: s.at([-0.2, 1.25, -1.6]), move: s.at([-0.2, 1.25, -1.4]), rot: [2, -3, 0], fov: 22, ease: 'out' } });
  cut({ at: t(T0 + 3.25), shot: { name: 'news: it goes for him', pos: s.at([-2.6, 1.5, -0.9]), look: 'person.chest', fov: 50, dutch: -9, handheld: 0.7 } });
  // The room keeps working: crew crossing, the floor manager counting, the operator on his camera.
  herd('news_crew', T0, [22, 0, 0], 4, 1.3, 'walk');
  cue({ at: t(T0), do: 'walk', on: 'news_fm', clip: 'walk', to: [-2.6, 0, -2.5], for: '2b', stride: 0.9 });
  birdLoop('news_op', 'eat', T0, 4, 2);
  // It has been looking at him since before we cut in. It turns, rears, strikes on the kick, comes away with the script.
  neckKeys('news_coanchor', T0, [[0, 0, 62, 0], [0.9, -6, 70, 0], [1.25, 0, 20, 0], [1.55, -44, 0, -18], [1.86, 62, 0, 14, { 'ease': 'in' }], [2.25, 10, 0, 0], [2.6, 38, 0, 10], [2.85, -30, 0, -20], [3.25, 58, 0, 18, { 'ease': 'in' }], [3.7, -20, 0, 0]], { overshoot: 0.1, settle: '0.2s' });
  cue({ at: t(T0 + 1.0), do: 'rotate', on: 'news_coanchor', rot: [-8, 225, 0], for: '0.2b', ease: 'out' });
  cue({ at: t(T0 + 1.2), do: 'rotate', on: 'news_coanchor', rot: [0, 250, 0], for: '0.3b', ease: 'back' });
  cue({ at: t(T0 + 1.25), do: 'gaze', on: 'person', to: s.at([0.9, 1.3, 1.44]), limit: 45, for: '0.3b', ease: 'inout' });
  pose(T0 + 1.4, { chest: [-4, 0, 4], spine: [-2, 0, 3] }, 0.25);
  mug(T0 + 1.3, { eyesWide: 1, fear: 0.9, smile: 0 }, 0.15);
  cue({ at: t(T0 + 1.55), do: 'rotate', on: 'news_coanchor', rot: [-14, 262, 0], for: '0.2b', ease: 'out' });
  cue({ at: t(T0 + 1.8), do: 'rotate', on: 'news_coanchor', rot: [26, 270, 0], for: '0.2b', ease: 'in', sfx: 'turkey_gobble_1', sfxVolume: 0.7 });
  cue({ at: t(T0 + 1.8), do: 'move', on: 'news_coanchor', pos: [-0.1, 0.34, 1.42], for: '0.2b', ease: 'in' });
  cue({ at: t(T0 + 2), do: 'anim', on: 'news_coanchor', clip: 'bite', for: '0.75b', speed: 1 });
  cue({ at: t(T0 + 2), do: 'attach', on: 'news_paper', to: 'news_coanchor.head', pos: [0, 0.03, 0.12], rot: [20, 0, 0], blend: '0.05b' });
  cue({ at: t(T0 + 2), fx: 'feathers', pos: s.at([-0.7, 1.05, 0.9]), count: 30, speed: 3.4, color: '#f4f2ea', color2: '#ffffff', for: '2s' });
  // Tug of war: he won't let go of the script. It drags him into the desk, then he's holding nothing.
  cue({ at: t(T0 + 2), do: 'reach', on: 'person', hand: 'right', to: 'news_paper', for: '0.1b', ease: 'out' });
  K(T0 + 2, [{ t: 0.14, bones: { chest: [22, 0, -14], spine: [12, 0, -8], head: [8, 0, 0] } }, { t: 0.32, hold: 0.04, bones: { chest: [18, 0, -10], spine: [10, 0, -6], head: [6, 0, 0] } }, { t: 0.62, bones: { chest: [-12, 0, 18], spine: [-6, 0, 12], head: [-6, 12, 0] }, ease: 'back' }]);
  cue({ at: t(T0 + 2.38), do: 'reach', on: 'person', hand: 'right', weight: 0, for: '0.1b' });
  cue({ at: t(T0 + 2.38), do: 'fingers', on: 'person', hand: 'right', curl: 0, for: '0.1b' });
  mug(T0 + 2.05, SCREAM, 0.12);
  // Crouch, spring: over the desk and on him for the last kick. His hands go up too late, and he goes over backward.
  cue({ at: t(T0 + 2.6), do: 'rotate', on: 'news_coanchor', rot: [20, 268, 0], for: '0.25b', ease: 'out' });
  cue({ at: t(T0 + 2.85), do: 'rotate', on: 'news_coanchor', rot: [-20, 268, 0], for: '0.4b', ease: 'out' });
  cue({ at: t(T0 + 2.85), do: 'jump', on: 'news_coanchor', pos: [-0.72, 0.84, 0.88], height: 1.0, for: '0.4b' });
  cue({ at: t(T0 + 2.85), do: 'reach', on: 'person', hand: 'left', weight: 0, for: '0.1b' });
  pose(T0 + 2.9, { spine: [8, 0, 0] }, 0.2);
  cue({ at: t(T0 + 2.85), do: 'layer', on: 'person', clip: 'Idle1SurprisedB', start: 0.5, mask: 'arms', weight: 1, for: '0.4b', blend: '0.08s' });
  pose(T0 + 3.25, BONES0, 0.04);
  cue({ at: t(T0 + 3.25), do: 'gaze', on: 'person', weight: 0, for: '0.05b' });
  cue({ at: t(T0 + 3.25), do: 'ragdoll', on: 'person', for: '1b', impulse: [-0.5, 1.2, 1.9], spin: [-160, 0, 40], hit: 'chest', floor: 0, drive: 0.12, pose: 'cower', blendIn: '0.05s', seed: 11, collide: ['news_chairb'] });
  cue({ at: t(T0 + 3.25), fx: 'feathers', pos: s.at([-1, 1.2, 1.1]), count: 120, speed: 8, for: '2s', sfx: 'impact_big', sfxVolume: 0.5 });
  cue({ at: t(T0 + 3.25), do: 'anim', on: 'news_coanchor', clip: 'bite', for: '0.45b', speed: 2 });
  // Off the desk and out of the top of the frame: the first thing to land on the next channel.
  cue({ at: t(T0 + 3.7), do: 'anim', on: 'news_coanchor', clip: 'jump', for: '0.3b', speed: 2 });
  cue({ at: t(T0 + 3.7), do: 'move', on: 'news_coanchor', pos: [-0.9, 8, 0.6], for: '0.3b', ease: 'in' });
  cue({ at: t(T0), onsets: 'kick', until: t(T0 + 4), pulse: { exposure: 0.15 }, for: '0.3b' });
  cue({ at: t(T0 + 2), strobe: 'news_rimr', every: '0.25b', low: 0.1, high: 2.2, sharp: 2, for: '2b' });
}

// ========== 1. WEATHER ==========
{
  const s = Set(1), T0 = S(1);
  s.box([0, -0.05, 0], [24, 0.1, 16], '#3a4a56', { smooth: 0.5, name: 'wx_floor' });
  s.box([0, 3, 4], [24, 7, 0.2], '#0a2038', { name: 'wx_back' });
  // The map. Sea, then land in relief, then isobars and storm icons. Real shapes in front of a lit wall.
  // The map stands on one board, so all of it can come down. Sea, then land in relief, then isobars and storm icons.
  s.mover('wx_board', 'none', [0, 0.1, 3.8], null, null);
  s.pic('wx_map', [0, 2.8, 0.04], [12.6, 5.0], { parent: 'wx_board' });
  s.box([0, 5.44, 0], [12.9, 0.26, 0.2], '#101820', { smooth: 0.6, parent: 'wx_board' });
  s.box([-6.42, 2.8, 0], [0.26, 5.3, 0.2], '#101820', { smooth: 0.6, parent: 'wx_board' });
  s.box([6.42, 2.8, 0], [0.26, 5.3, 0.2], '#101820', { smooth: 0.6, parent: 'wx_board' });
  s.glow([0, 0.23, -0.08], [12.9, 0.42, 0.04], '#ffcc00', { parent: 'wx_board' });
  // Behind the map: the bare stage wall, wired, seen when the board comes down.
  for (let i = 0; i < 6; i++) s.glow([(i - 2.5) * 2.6, 2.8, 3.86], [0.08, 5.6, 0.02], '#ffcc00');
  s.turkey('wx_stage', 'black', [-5.2, 0, -2.4], [0, 40, 0], 2.3);
  s.turkey('wx_stage2', 'brown', [5.6, 0, -1.6], [0, -30, 0], 2.3);
  s.model('kit_plant', [-6.4, 0, 0.8], 1.6);
  s.box([6.3, 0.5, 0.6], [1.6, 1.0, 1.0], '#14202c', { smooth: 0.7, rot: [0, -18, 0] });
  s.glow([6.28, 1.06, 0.56], [1.2, 0.06, 0.6], '#4ea8ff', { rot: [0, -18, 0] });
  // The clouds are real: little clusters on the map with turkeys dropping out of them.
  const cloud = (x, y, k) => { for (const [dx, dy, r] of [[0, 0, 0.8], [0.6, -0.08, 0.6], [-0.6, -0.08, 0.6], [0.2, 0.26, 0.55]]) s.ball([x + dx * k, y + dy * k, -0.3], [r * k * 1.3, r * k, 0.3], '#f0f4fa', { emission: '#28282c', smooth: 0.2, parent: 'wx_board' }); };
  cloud(-3.2, 4.5, 1); cloud(0.4, 4.8, 1.2); cloud(3.6, 4.3, 0.9);
  s.crowd('wx_tiny', { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [0, 0, 3.3], crowd: { count: 32, shape: 'grid', spacing: 1.05, seed: 5, modelScale: 0.5, scaleVar: 0.2, face: 200 } });
  // Them, the real ones, in a ring round him.
  s.crowd('wx_rain', { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [-1.5, 0, 1.4], crowd: { count: 12, shape: 'scatter', radius: 3.4, inner: 1.5, seed: 11, modelScale: 1.8, scaleVar: 0.2 } });
  // The bird from the news, already here: up on the map's top rail, looking down at him.
  nemesis(s, 'wx_hit', [-1.0, 5.6, 3.72], [0, 180, 0], 2.15);
  s.glow([-7.6, 3, 2.6], [0.1, 6, 2.6], '#ffcc00', { rot: [0, 40, 0] });
  s.glow([7.6, 3, 2.6], [0.1, 6, 2.6], '#ffcc00', { rot: [0, -40, 0] });
  truss(s, 6.3, 0.5, 20, 6, '#ffffff');
  spot(s, 'key', [-6, 6, -5], [-1.2, 1, 0.5], 36, '#fff6e8', 420, { shadows: true });
  spot(s, 'rim', [3.5, 5.6, 3.2], [-1.4, 1.2, 0.5], 40, '#ffcc40', 520);
  s.light('fill', { type: 'point', pos: [3, 3, -2], color: '#a8c8ff', range: 12 }, 4);
  s.light('map', { type: 'point', pos: [0, 3, 2], color: '#4ea8ff', range: 8 }, 14);

  clean(T0); mug(T0, { smile: 0.3, fear: 0.5, eyesWide: 0.3, jawOpen: 0 }, 0.2);
  cut({ at: t(T0), shot: { name: 'wx: he points', pos: s.at([-3.1, 1.3, -2.5]), move: s.at([-2.8, 1.3, -1.9]), look: 'person.chest', lookOffset: [0.5, 0.25, 0], fov: 52, ease: 'out' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'wx: he looks up', pos: s.at([-2.2, 0.5, -1.0]), look: 'person.chest', fov: 50, dutch: 7, handheld: 0.6 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'wx: the map comes down', pos: s.at([1.5, 2.1, -8.4]), rot: [-5, -8, 0], fov: 58, handheld: 0.9 } });
  cue({ at: t(T0), do: 'fall', on: 'wx_rain', for: '0.01b', height: 30, gravity: 0 });
  neckKeys('wx_hit', T0, [[0, 26, 8, 0], [1.2, 34, 4, 0], [2.3, 40, 0, 12], [2.55, -20, 0, -16]]);
  // The tiny ones rain down the map from the first frame. The big ones come for him. The stagehands run.
  cue({ at: t(T0), do: 'fall', on: 'wx_tiny', for: '1bar', stagger: 0.03, height: 7, gravity: 12, jitter: 0.3 });
  cue({ at: t(T0), do: 'anim', on: 'wx_tiny', clip: 'roll', for: '1bar', beats: 2, offset: 1 });
  cue({ at: t(T0 + 1.25), do: 'walk', on: 'wx_stage', clip: 'runAngry', to: [-1, 0, -3.6], for: '2.5b', stride: 1.6 });
  cue({ at: t(T0 + 1.25), do: 'walk', on: 'wx_stage2', clip: 'runAngry', to: [1.6, 0, -3.2], for: '2.5b', stride: 1.6 });
  himAt(T0, s.at([-1.5, 0.02, 0.5]), [0, 165, 0], 'Idle1PointOut', { for: '1.25b', speed: 1.2 });
  // Showman's line: he leans into the point, weight on the front foot.
  pose(T0, { spine: [6, 0, -10], chest: [0, 14, -8], head: [0, -18, 0] }, 0.25);
  cue({ at: t(T0 + 0.9), do: 'fall', on: 'wx_rain', for: '1.5bars', stagger: 0.09, height: 14, gravity: 16, jitter: 0.5 });
  cue({ at: t(T0 + 0.9), do: 'anim', on: 'wx_rain', clip: 'roll', for: '4b', beats: 1, offset: 1 });
  // First kick: one lands beside him. Whole body snaps back, eyes up.
  pose(T0 + 1.25, BONES0, 0.05);
  act(T0 + 1.25, 'GetHitFrontHeavyCombat', 0.75); mug(T0 + 1.25, SCREAM, 0.1);
  cue({ at: t(T0 + 1.25), do: 'gaze', on: 'person', to: s.at([-1.2, 7, 0.2]), for: '0.2b', ease: 'out' });
  // Second kick: he backs off, away from us, towards the map, hands on his head, feet walking.
  cue({ at: t(T0 + 2), do: 'walk', on: 'person', clip: 'WalkBackwardsScared', to: s.at([-1.3, 0.02, 1.15]), for: '1.25b', stride: 0.9, face: 0, ease: 'out', blend: '0.1s' });
  cue({ at: t(T0 + 2), do: 'layer', on: 'person', clip: 'IdleBreatheHandsOnHead', mask: 'arms', weight: 0.95, for: '1.2b', blend: '0.1s' });
  cue({ at: t(T0 + 2), fx: 'feathers', pos: s.at([-1.6, 0.5, 0.5]), count: 60, speed: 5, for: '2s' });
  pose(T0 + 2, { spine: [18, 0, 0], chest: [8, 0, 0] }, 0.2);
  // The bird leaves the rail, crosses the whole set, and drives him flat on the third. It stays standing on him, a beat before the map follows.
  cue({ at: t(T0 + 2.55), do: 'jump', on: 'wx_hit', pos: [-1.3, 1.5, 1.2], height: 1, for: '0.7b' });
  cue({ at: t(T0 + 2.55), do: 'anim', on: 'wx_hit', clip: 'jump', for: '0.7b', speed: 1.4 });
  pose(T0 + 3.25, BONES0, 0.04);
  cue({ at: t(T0 + 3.25), do: 'gaze', on: 'person', weight: 0, for: '0.05b' });
  cue({ at: t(T0 + 3.25), do: 'ragdoll', on: 'person', for: '1b', impulse: [0, -1.5, 1.4], hit: 'chest', spin: [-90, 0, 0], floor: 0.02, drive: 0.08, blendIn: '0.04s', seed: 4, sfx: 'impact_big', sfxVolume: 0.5 });
  cue({ at: t(T0 + 3.25), fx: 'feathers', pos: s.at([-1.3, 1.2, 1.2]), count: 140, speed: 8, for: '2.5s' });
  cue({ at: t(T0 + 3.25), fx: 'dust', pos: s.at([-1.3, 0.2, 1.6]), for: '1.5s' });
  cue({ at: t(T0 + 3.25), do: 'move', on: 'wx_hit', pos: [-1.3, 0.3, 1.7], for: '0.28b', ease: 'in' });
  cue({ at: t(T0 + 3.5), do: 'anim', on: 'wx_hit', clip: 'idle', for: '0.5b', blend: '0.05s' });
  neckKeys('wx_hit', T0 + 3.3, [[0.2, 48, 0, 16], [0.5, 54, 0, 22]]);
  cue({ at: t(T0 + 3.25), pulse: { shake: 1 }, for: '0.5b', sharp: 3 });
  // The board has been shaking since the first kick. It lets go, and it lands on the frame.
  cue({ at: t(T0 + 1.25), do: 'tremble', on: 'wx_board', amount: 0.03, band: 'kick', for: '1.5b' });
  cue({ at: t(T0 + 2.6), do: 'topple', on: 'wx_board', pivot: [0, 0, 0], axis: [1, 0, 0], angle: -86, bounce: 0.1, land: t(T0 + 3.55), for: '1.15b', sfx: 'wood_scrape', sfxVolume: 0.5 });
  cue({ at: t(T0 + 3.55), fx: 'dust', pos: s.at([0, 0.3, 1.2]), for: '1s', sfx: 'couch_slam', sfxVolume: 0.6 });
  cue({ at: t(T0 + 1.25), strobe: 'weather_rim', every: '0.5b', low: 0.3, high: 1.8, sharp: 2, for: '2.75b' });
}

// ========== 2. COOKING ==========
{
  const s = Set(2), T0 = S(2), Cream = '#f0e0c0', Tile = '#f6efe0';
  s.box([0, -0.05, 0], [18, 0.1, 14], '#9a6a44', { smooth: 0.4, name: 'ck_floor' });
  s.box([0, 3, 3.6], [18, 7, 0.2], Cream, { name: 'ck_back' });
  // Tiled splashback in rows.
  for (let y = 0; y < 5; y++) for (let x = -6; x <= 6; x++) s.box([x * 0.6 + (y % 2) * 0.3, 1.05 + y * 0.33, 3.47], [0.56, 0.3, 0.04], (x + y) % 5 === 0 ? '#d84830' : Tile, { smooth: 0.8 });
  // The back kitchen: real counters, stove, fridge, cabinets, hanging pots.
  for (let x = -6; x <= -2; x += 1) s.model('kit_counter', [x * 0.85 - 0.2, 0, 3.0], 1);
  s.model('kit_stove', [0.55, 0, 3.0], 1);
  for (let x = 2; x <= 5; x += 1) s.model('kit_counter', [x * 0.85, 0, 3.0], 1);
  s.model('kit_fridge', [-5.7, 0, 2.9], 1);
  s.box([0.55, 2.55, 3.1], [1.5, 0.5, 0.7], '#c8c8cc', { smooth: 0.7, metal: 0.6 });
  s.box([-3.2, 2.6, 3.46], [3.4, 0.05, 0.4], '#7a4a2a');
  for (const [m, x] of [['kit_pot', -4], ['kit_jar', -3.5], ['kit_jar', -3.1], ['kit_pot', -2.5], ['kit_plates', -1.9]]) s.model(m, [x, 2.63, 3.4], 1);
  s.box([4.1, 3.1, 3.42], [2.6, 1.6, 0.04], '#fff6d0', { emission: '#b89a60' });
  for (const d of [-1, 1]) s.box([4.1 + d * 1.0, 3.1, 3.38], [0.7, 1.9, 0.08], '#c82820', { smooth: 0.2 });
  // Sign over the island, Hollywood bulbs round it.
  s.box([0, 5.0, 3.3], [7.5, 1.4, 0.12], '#c8301e', { smooth: 0.4 });
  s.pic('ck_sign', [0, 5.0, 3.22], [7.2, 1.3]);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 1; s.glow([Math.max(-1, Math.min(1, Math.cos(a) * 1.6)) * 3.75, 5.0 + Math.max(-1, Math.min(1, Math.sin(a) * 1.6)) * 0.7, 3.22], 0.12, '#ffe8a0', { shape: 'prim:sphere' }); }
  // The island: skirted in red, butcher-block on top.
  s.box([0, 0.48, 0.2], [5.4, 0.96, 2.1], '#b42018', { smooth: 0.25 });
  s.box([0, 1.0, 0.2], [5.6, 0.09, 2.3], '#b8824c', { smooth: 0.45 });
  s.pic('ck_gingham', [0, 0.48, -0.87], [5.4, 0.92]);
  // The platter, the garnish.
  s.cyl([0, 1.07, 0.2], [3.5, 0.03, 1.72], '#e4e6ea', { smooth: 0.88, metal: 0.8 });
  s.cyl([0, 1.1, 0.2], [3.1, 0.02, 1.4], '#c4c8ce', { smooth: 0.88, metal: 0.8 });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; s.ball([Math.cos(a) * 1.55, 1.15, 0.2 + Math.sin(a) * 0.72], [0.17, 0.12, 0.17], i % 4 ? '#3f8a2a' : '#5eaa30', { smooth: 0.2 }); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3; s.cyl([Math.cos(a) * 1.34, 1.14, 0.2 + Math.sin(a) * 0.56], [0.17, 0.014, 0.17], '#ff9a18', { smooth: 0.6 }); }
  // Chef. Tall white hat, a neckerchief, and the baster.
  s.turkey('ck_chef', 'brown', [1.75, 0.0, 2.0], [0, 215, 0], 3.2);
  s.mover('ck_hat', 'prim:cylinder', [1.58, 2.74, 1.1], [0.3, 0.2, 0.3], '#fbfbf6', { smooth: 0.2 });
  s.mover('ck_hat2', 'prim:sphere', [1.58, 3.05, 1.1], [0.46, 0.28, 0.46], '#ffffff', { smooth: 0.2 });
  cue({ at: 0, do: 'attach', on: 'ck_hat', to: 'ck_chef.neck3', pos: [0, 0.2, 0], rot: [0, 0, 0] });
  cue({ at: 0, do: 'attach', on: 'ck_hat2', to: 'ck_chef.neck3', pos: [0, 0.27, 0], rot: [0, 0, 0] });
  s.mover('ck_baster', 'prim:cylinder', [0.8, 1.5, 0.45], [0.05, 0.62, 0.05], '#d8b070', { smooth: 0.5 });
  s.mover('ck_baster2', 'prim:sphere', [0.28, 1.28, 0.45], [0.14, 0.14, 0.14], '#a04a12', { smooth: 0.8 });
  // The baster is in its beak: no floating props.
  cue({ at: 0, do: 'attach', on: 'ck_baster', to: 'ck_chef.head', pos: [0, -0.04, 0.72], rot: [98, 0, 0] });
  cue({ at: 0, do: 'attach', on: 'ck_baster2', to: 'ck_chef.head', pos: [0, -0.1, 1.36], rot: [0, 0, 0] });
  alive('ck_chef', 0);
  // The tie bird has the back counter, and it's not cooking.
  nemesis(s, 'ck_nem', [-2.0, 0.92, 2.72], [0, 158, 0], 2);
  // More kitchen: the rack over the island (foreground), produce, the cloche waiting on its hoist.
  s.box([0, 3.2, -1.6], [6.5, 0.06, 0.06], '#3a3a40', { metal: 0.9, smooth: 0.6 });
  for (let i = 0; i < 7; i++) { const x = -2.7 + i * 0.9; s.cyl([x, 2.9, -1.6], [0.01, 0.25, 0.01], '#3a3a40', { metal: 0.9 }); s.model('kit_pot', [x, 2.45, -1.6], 1.1); }
  for (let i = 0; i < 8; i++) s.ball([-2.5 + (i % 4) * 0.18, 1.14, -0.45 + (i >> 2) * 0.16], 0.12, i % 3 ? '#d83018' : '#e88010', { smooth: 0.6 });
  s.cyl([2.3, 1.2, -0.3], [0.2, 0.17, 0.2], '#101014', { smooth: 0.8, metal: 0.7 });
  s.mover('ck_cloche', 'prim:sphere', [0, 9, 0.2], [3.3, 2.5, 1.75], '#d8dce4', { smooth: 0.92, metal: 1 });
  s.mover('ck_knob', 'prim:sphere', [0, 0.53, 0], [0.04, 0.06, 0.07], '#2a2a30', { smooth: 0.8, metal: 1, parent: 'ck_cloche' });
  s.crowd('ck_rain', { model: 'turkey_brown', models: ['turkey_brown', 'turkey_black', 'turkey_white'], pos: [0, 0, 2.15], crowd: { count: 9, shape: 'line', spacing: 1.25, seed: 21, modelScale: 2.1, scaleVar: 0.2, face: 170 } });
  spot(s, 'key', [-4.5, 6, -3.6], [0, 1.2, 0.2], 40, '#fff0d8', 170, { shadows: true });
  spot(s, 'rim', [3.2, 4.6, 2.6], [0, 1.4, 0.2], 44, '#ffb060', 160);
  s.light('fill', { type: 'point', pos: [3, 3, -3], color: '#ffd8a8', range: 10 }, 3);
  s.light('back', { type: 'point', pos: [0.55, 2, 2.3], color: '#ff5a18', range: 7 }, 5);

  // He lies on his back along the platter, head at -X, and he fights it: thrashing key poses, one per half beat.
  himAt(T0, s.at([0.2, 1.2, 0.2]), [0, 270, 0], 'IdleLayDownCampfire');
  clean(T0); mug(T0, { fear: 1, eyesWide: 0.7, jawOpen: 0.3 }, 0.2);
  cue({ at: t(T0), do: 'layer', on: 'person', clip: 'CalmDown2Hostage', mask: 'arms', weight: 1, for: '1.2b', blend: '0.08s' });
  pose(T0 + 0.1, { leftUpperLeg: [34, 0, 0], head: [10, -24, 0] }, 0.25);
  pose(T0 + 0.6, { leftUpperLeg: [0, 0, 0], rightUpperLeg: [40, 0, 0], head: [10, 24, 0] }, 0.25);
  cut({ at: t(T0), shot: { name: 'ck: overhead, the dish', pos: s.at([0.1, 3.7, -1.1]), move: s.at([0.1, 3.3, -1.0]), rot: [60, 0, 0], fov: 44, ease: 'out' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'ck: bastes him', pos: s.at([-0.5, 1.5, -2.5]), look: 'person.chest', fov: 46, handheld: 0.4 } });
  cut({ at: t(T0 + 2.72), shot: { name: 'ck: the lid', pos: s.at([0.2, 1.3, -3.2]), rot: [-16, 0, 0], fov: 52, handheld: 0.5 } });
  birdLoop('ck_chef', 'idle', T0, 4, 2);
  // Two squirts, down the neck and back, then it follows him along the platter.
  neckKeys('ck_chef', T0, [[0.4, 10, 12, -8], [0.8, 58, 12, 10, { 'ease': 'in' }], [1.1, 20, 12, 0], [1.4, 62, 8, 10, { 'ease': 'in' }], [1.8, 16, -4, 0], [2.6, 34, -14, 0], [3.25, -30, 0, -20]], { overshoot: 0.12, settle: '0.2s' });
  neckKeys('ck_nem', T0, [[0, 12, -20, 0], [3.25, 24, -6, 10]]);
  cue({ at: t(T0 + 1.25), fx: 'sparks', pos: s.at([-0.5, 1.3, 0.3]), count: 40, speed: 2.5, color2: '#a04a12', for: '1s' });
  // On the kick he's over on hands and knees, and he crawls for the rim, a belly drag, hand over hand, screaming at us.
  cue({ at: t(T0 + 1.25), do: 'set', on: 'person', pos: s.at([0.1, 1.13, 0.45]), rot: [0, 180, 0] });
  cue({ at: t(T0 + 1.27), do: 'walk', on: 'person', clip: 'CrawlZombie', to: s.at([0.0, 1.13, -0.36]), for: '1.45b', stride: 0.62, ease: 'linear', blend: 0, turn: '0.01s' });
  // Two hauls: the torso digs in on the pull and lifts on the reach, over the clip.
  K(T0 + 1.3, [{ t: 0.35, bones: { chest: [-10, 0, 8], head: [-16, 8, 0] } }, { t: 0.7, bones: { chest: [6, 0, -8], head: [-8, -8, 0] } }, { t: 1.05, bones: { chest: [-12, 0, 8], head: [-18, 6, 0] } }, { t: 1.4, bones: { chest: [4, 0, -6], head: [-10, 0, 0] } }]);
  // The rim. One hand planted on it, chest up, head back: he has seen the lid.
  cue({ at: t(T0 + 2.72), do: 'anim', on: 'person', clip: 'CrawlZombie', blend: '0.1s', speed: 0.01, for: '0.6b' });
  cue({ at: t(T0 + 2.72), do: 'plant', on: 'person', hand: 'right', to: s.at([-0.22, 1.15, -0.62]), blend: '0.08s', for: '0.5b', release: '0.03s', follow: 0.4 });
  K(T0 + 2.72, [{ t: 0.16, bones: { chest: [-26, 0, 0], spine: [-14, 0, 0], head: [-34, 0, 0] } }, { t: 0.32, hold: 0.05, bones: { chest: [14, 0, 0], spine: [10, 0, 0], head: [20, 0, 0] } }], { overshoot: 0.1 });
  cue({ at: t(T0 + 2.9), do: 'layer', on: 'person', clip: 'IdleBreatheHandsOnHead', mask: 'leftArm', weight: 1, for: '0.35b', blend: '0.06s' });
  mug(T0 + 1.25, SCREAM, 0.12);
  // The storm has followed him in: the ceiling goes and the rain lands in the kitchen behind him. The stove catches.
  cue({ at: t(T0), do: 'fall', on: 'ck_rain', for: '0.01b', height: 20, gravity: 0 });
  cue({ at: t(T0 + 1.6), do: 'fall', on: 'ck_rain', for: '2b', stagger: 0.14, height: 9, gravity: 18, jitter: 0.3 });
  cue({ at: t(T0 + 1.6), do: 'anim', on: 'ck_rain', clip: 'roll', for: '2.4b', beats: 1, offset: 1 });
  cue({ at: t(T0 + 2), fx: 'fire', pos: s.at([0.55, 1, 3]), for: '4b' });
  cue({ at: t(T0 + 2), fx: 'smoke', pos: s.at([0.55, 1.4, 3]), for: '4b' });
  cue({ at: t(T0 + 2), fx: 'feathers', pos: s.at([-1, 2.4, 2.2]), count: 80, speed: 5, for: '2s' });
  // He gets one hand over the rim and looks up. The hoist lets go. He ducks, one arm over his head, as the lid lands on the last kick.
  cue({ at: t(T0 + 2.75), do: 'move', on: 'ck_cloche', pos: [0, 1.12, 0.2], for: '0.5b', ease: 'in' });
  cue({ at: t(T0 + 3.25), do: 'hide', on: 'person' });
  cue({ at: t(T0 + 4), do: 'show', on: 'person' });
  cue({ at: t(T0 + 3.25), do: 'wobble', on: 'ck_cloche', amount: 5, decay: 3, for: '0.75b', sfx: 'couch_slam', sfxVolume: 0.8 });
  cue({ at: t(T0 + 3.25), do: 'rotate', on: 'ck_chef', rot: [18, 215, 0], for: '0.3b', ease: 'back' });
  cue({ at: t(T0 + 3.25), do: 'jump', on: 'ck_chef', pos: [2.0, 0, 1.75], height: 0.7, for: '0.7b' });
  cue({ at: t(T0 + 3.25), fx: 'dust', pos: s.at([0.1, 1.3, 0.2]), color: '#fff4e0', for: '1.5s' });
  cue({ at: t(T0 + 3.5), do: 'shake', on: 'ck_cloche', amount: 0.05, speed: 26, for: '0.5b' });
}

// ========== 3. GAME SHOW ==========
const WHEEL = { hub: [0, 3.6, 2.4], beats: 3.25, deg: 900 };
{
  const s = Set(3), T0 = S(3), M = '#c8107a', V = '#3a0f6a', G = '#ffc828';
  s.box([0, -0.05, 0], [30, 0.1, 18], '#14061e', { smooth: 0.9, metal: 0.3, name: 'gs_floor' });
  s.box([0, 4, 5], [30, 9, 0.2], '#14041e', { name: 'gs_back' });
  // Sunburst behind the wheel: radial strips of gold and magenta, the classic.
  for (let i = 0; i < 18; i++) s.box([0, 3.6, 4.82], [0.55, 16, 0.02], i % 2 ? '#7a0c58' : '#2a0a50', { rot: [0, 0, i * 20], smooth: 0.3, emission: i % 2 ? '#40062c' : '#120428' });
  // Stepped stage with lit noses.
  for (let k = 0; k < 3; k++) { const y = 0.16 + k * 0.32, z = 0.6 + k * 0.7; s.box([0, y, z + 1.2], [15 - k * 2.4, 0.32, 3.5 - k * 0.7], V, { smooth: 0.8 }); s.glow([0, y + 0.13, z - 0.56 + k * 0.35], [15 - k * 2.4, 0.05, 0.05], G); }
  // The wheel, spinning as one actor. Wedges are long boxes, the rim is a ring of real bulbs, and two pointers on top.
  s.mover('gs_wheel', 'prim:cube', [0, 3.6, 2.4], null, null, { crowd: { count: 0 } });
  actors.gs_wheel.parent = 'show_gameshow';
  const WC = ['#e81c24', '#ffc828', '#1c8cf0', '#28c040', '#f06a10', '#d418a0', '#ffffff', '#301040'];
  const w = (p, sc, c, x) => { const k = `gs_w${Object.keys(actors).length}`; actors[k] = { model: x?.model ?? 'prim:cube', parent: 'gs_wheel', pos: p, scale: sc, color: c, ...x, model: x?.model ?? 'prim:cube' }; };
  w([0, 0, 0.3], [6.6, 0.12, 6.6], '#180830', { model: 'prim:cylinder', rot: [90, 0, 0], smooth: 0.7 });
  for (let i = 0; i < 36; i++) { const r = i * 10 * Math.PI / 180; w([Math.sin(r) * 3.3, Math.cos(r) * 3.3, -0.05], 0.13, '#000000', { model: 'prim:sphere', emission: i % 2 ? '#ffe070' : '#ff6a20' }); }
  { const k = 'gs_face'; actors[k] = { model: 'Assets/Shows/quad.obj', parent: 'gs_wheel', pos: [0, 0, -0.02], scale: [6.5, 6.5, 1], material: 'Assets/Shows/gs_wheel.mat' }; }
  for (const [x, y, sx, sy] of [[0, 0.72, 2.6, 0.2], [0, -0.4, 1.8, 0.2], [0, -1.1, 1.4, 0.18]]) w([x, y, -0.06], [sx, sy, 0.05], '#2a1a10', { smooth: 0.5 });
  s.box([0, 7.05, 2.2], [0.3, 0.6, 0.2], '#ffffff', { rot: [0, 0, 45], emission: '#808080' });
  // Straps across him, on the wheel, as dark bars. The wheel keeps turning with him on it.
  // The cuffs: he is bolted to the wheel at the wrists and ankles.
  const CUFF = [[-0.56, 0.86], [0.56, 0.86], [-0.36, -0.93], [0.36, -0.93]];
  for (const [x, y] of CUFF) { w([x, y, -0.13], [0.2, 0.12, 0.16], '#1a1016', { smooth: 0.7, metal: 0.7 }); w([x, y, -0.2], [0.09, 0.05, 0.03], '#ffc828', { smooth: 0.9, metal: 1 }); }
  // Contestants: three podiums, three birds, three buzzers.
  const pods = [[-6.2, 0.6], [-4.3, 0.1], [-2.4, -0.4]];
  pods.forEach(([x, z], i) => {
    s.box([x, 0.52, z], [1.3, 1.04, 0.8], ['#1868d8', '#e0a018', '#d81848'][i], { smooth: 0.7, rot: [0, 14, 0] });
    s.glow([x, 0.62, z - 0.42], [1.1, 0.3, 0.02], '#ffffff', { rot: [0, 14, 0] });
    s.turkey(`gs_c${i}`, ['black', 'white', 'brown'][i], [x, 0.0, z + 0.75], [0, 195, 0], 2.3);
    s.mover(`gs_b${i}`, 'prim:sphere', [x, 1.1, z - 0.1], [0.36, 0.18, 0.36], '#300000', { emission: '#e01010', smooth: 0.8 });
  });
  // The scoreboard and a marquee arch of bulbs.
  s.box([6.6, 3.2, 3.6], [4.4, 2.6, 0.3], '#0a0a14', { smooth: 0.7, rot: [0, -12, 0] });
  s.pic('gs_score', [6.6, 3.2, 3.42], [4.1, 2.3], { rot: [0, -12, 0] });
  s.pic('gs_sign', [0, 7.9, 3.4], [9, 2]);
  for (let i = 0; i <= 42; i++) { const a = Math.PI * i / 42, R = 7.6; s.glow([Math.cos(a) * R * 1.3, 0.5 + Math.sin(a) * R, 3.6], 0.2, i % 2 ? '#ffe070' : '#ff40a0', { shape: 'prim:sphere' }); }
  truss(s, 8.6, 1.5, 24, 8, '#ff60c0');
  // The house: a bank of birds either side of the stage, and the chef's hat, which has found work.
  for (const d of [-1, 1]) for (let r = 0; r < 3; r++) { s.box([d * 12, 0.2 + r * 0.5, -3 + r * 1.3], [8, 0.4 + r, 1.3], '#1a0a2a'); s.crowd(`gs_aud${d}${r}`, { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [d * 12, 0.4 + r, -3 + r * 1.3], crowd: { count: 8, shape: 'line', spacing: 1.05, seed: 50 + r, modelScale: 1.7, scaleVar: 0.1, face: d * -30 } }); }
  s.mover('gs_hat', 'prim:cylinder', [0, 0, 0], [0.34, 0.24, 0.34], '#fbfbf6', { smooth: 0.2 });
  // The tie bird hosts. Everyone jumps but it.
  nemesis(s, 'gs_nem', [3.6, 0.96, 1.5], [0, 215, 0], 2.15);
  cue({ at: 0, do: 'attach', on: 'gs_hat', to: 'gs_c1.neck3', pos: [0, 0.2, 0], rot: [0, 0, 0] });
  spot(s, 'key', [-5, 7.4, -7], [0, 3.2, 2.2], 30, '#fff0e8', 620, { shadows: true });
  s.light('l', { type: 'spot', pos: [-7, 7, 0], rot: [60, 40, 0], angle: 50, range: 16, color: '#ff20a0' }, 110);
  s.light('r', { type: 'spot', pos: [7, 7, 0], rot: [60, -40, 0], angle: 50, range: 16, color: '#30a0ff' }, 110);
  s.light('pods', { type: 'point', pos: [-4.3, 2.6, -2], color: '#ffd090', range: 7 }, 10);

  // The wheel turns, fast then slowing with a tick, and stops on the last kick.
  const hub0 = add(s.o, WHEEL.hub), R = 0.98, SP = 3.25;
  const angle = (b) => { const u = Math.min(1, b / WHEEL.beats); const a = WHEEL.deg * (1 - (1 - u) ** 2.4); return b > SP ? a + (b - SP) * 640 : a; };
  // On the last kick the axle shears: the wheel drops to the floor and rolls off, stage right, and he goes with it.
  const hubAt = (b) => { if (b <= SP) return hub0; const u = (b - SP) / 0.75; return add(hub0, [u * u * 18, -u * 0.4, -u * 2.6]); };
  clean(T0); mug(T0, SCREAM, 0.1);
  // Bolted to a spinning wheel he moves with it: the limb springs would read the spin as a whip and tear him off his cuffs.
  cue({ at: t(T0), do: 'overlap', on: 'person', amount: 0, for: '0.05s' });
  cue({ at: t(T0 + 4), do: 'overlap', on: 'person', amount: 0.8, for: '0.1s' });
  cue({ at: t(T0), do: 'anim', on: 'person', clip: 'IdleBreatheHandsUp', for: '1bar', blend: 0 });
  // Bolted on: he rides the wheel as part of it, wrists and ankles in the cuffs. All he can do is fight them, on every kick.
  cue({ at: t(T0), do: 'set', on: 'person', pos: [hub0[0], hub0[1] - 0.98, hub0[2] - 0.22], rot: [0, 180, 0], scale: 1 });
  cue({ at: t(T0), do: 'attach', on: 'person', to: 'gs_wheel', pos: [0, -0.98, -0.22], rot: [0, 180, 0] });
  for (const [i, part, side] of [[0, 'hand', 'right'], [1, 'hand', 'left'], [2, 'foot', 'right'], [3, 'foot', 'left']]) cue({ at: t(T0), do: 'plant', on: 'person', [part]: side, to: 'gs_wheel', offset: [CUFF[i][0], CUFF[i][1], -0.14], blend: '0.02s', follow: 0, lockRot: 0 });
  for (const hand of ['left', 'right']) cue({ at: t(T0), do: 'fingers', on: 'person', hand, curl: 0.85, for: '0.1b' });
  K(T0, [{ t: 0.4, bones: { chest: [8, 0, 10], spine: [6, 0, 8], head: [10, -14, 0] } }, { t: 0.95, bones: { chest: [8, 0, -8], spine: [4, 0, -6], head: [10, 12, 0] } }, { t: 1.25, bones: { chest: [20, 0, 16], spine: [14, 0, 10], head: [18, -26, 0] }, ease: 'back' }, { t: 1.7, bones: { chest: [10, 0, 2], spine: [6, 0, 2], head: [6, -8, 0] } }, { t: 2, bones: { chest: [22, 0, -18], spine: [14, 0, -12], head: [20, 26, 0] }, ease: 'back' }, { t: 2.8, bones: { chest: [6, 0, 0], head: [4, 8, 0] } }, { t: 3.25, bones: { chest: [28, 0, 8], spine: [18, 0, 6], head: [26, 0, 0] }, ease: 'back' }, { t: 3.9, bones: { chest: [-14, 0, 0], head: [-20, 0, 0] } }], { overshoot: 0.12, settle: '0.25s' });
  const seg = 0.125;
  for (let b = 0; b < 4; b += seg) {
    const a1 = angle(b + seg), r1 = a1 * Math.PI / 180, hub = hubAt(b + seg);
    cue({ at: t(T0 + b), do: 'rotate', on: 'gs_wheel', rot: [0, 0, -a1], for: `${seg}b`, ease: 'linear' });
    if (b >= SP) cue({ at: t(T0 + b), do: 'move', on: 'gs_wheel', pos: [hub[0] - s.o[0], hub[1], hub[2]], for: `${seg}b`, ease: 'linear' });
  }
  cut({ at: t(T0 + 0), shot: { name: 'gs: the wheel', pos: s.at([-0.3, 3.2, -3.0]), move: s.at([-0.1, 3.3, -2.0]), rot: [-1, 1, 0], fov: 58, dutch: -2, ease: 'out' } });
  neckKeys('gs_nem', T0, [[0, -6, 22, 0], [2, -12, 6, 0], [3.25, -2, 30, 14]]);
  cue({ at: t(T0 + 3.98), do: 'detach', on: 'person' });
  for (const part of [['hand', 'left'], ['hand', 'right'], ['foot', 'left'], ['foot', 'right']]) cue({ at: t(T0 + 3.98), do: 'plant', on: 'person', [part[0]]: part[1], weight: 0, for: '0.01b' });
  cut({ at: t(T0 + 1.25), shot: { name: 'gs: his face, the world turns', pos: add(hub0, [0, 0.1, -3.6]), rot: [0, 0, 0], rotate: [0, 0, 200], fov: 46, ease: 'linear' } });
  cut({ at: t(T0 + 2.5), shot: { name: 'gs: the buzzers', pos: s.at([-5.8, 1.15, -3.0]), rot: [-14, 28, 0], fov: 50, handheld: 0.7 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'gs: it comes off', pos: s.at([0.5, 1.5, -6.5]), rot: [-10, 24, 0], fov: 60, dutch: 5, handheld: 0.9 } });
  // All three on every kick, harder each time.
  for (const [off, k] of [[1.25, 0.7], [2, 1], [2.5, 1.2], [2.85, 1.4], [3.25, 1.8]]) [0, 1, 2].forEach((i) => {
    const at = off + i * 0.06;
    cue({ at: t(T0 + at), do: 'jump', on: `gs_c${i}`, pos: [0, 0, 0], rel: 1, height: 0.5 * k, for: '0.4b' });
    cue({ at: t(T0 + at), do: 'anim', on: `gs_c${i}`, clip: 'bite', for: '0.4b', speed: 2 });
    cue({ at: t(T0 + at + 0.2), do: 'squash', on: `gs_b${i}`, amount: 0.7, every: 1, for: '0.4b' });
    cue({ at: t(T0 + at + 0.2), do: 'glow', on: `gs_b${i}`, color: '#ff3020', power: 6, for: '0.05b' });
  });
  for (const d of [-1, 1]) for (let r = 0; r < 3; r++) { const k = `gs_aud${d}${r}`; cue({ at: t(T0), do: 'hop', on: k, height: 0.3, every: 0.5, for: '4b', stagger: 0.02, jitter: 0.1 }); birdLoop(k, 'eat', T0, 4, 0.5, { offset: 1 }); }
  cue({ at: t(T0 + 3.25), fx: 'confetti', pos: s.at([0, 8, 1.5]), count: 500, for: '4s' });
  cue({ at: t(T0 + 3.25), fx: 'sparks', pos: add(hub0, [0, 0, -0.6]), count: 200, speed: 9, for: '1s', sfx: 'impact_big', sfxVolume: 0.5 });
  cue({ at: t(T0 + 3.25), fx: 'fireworks', pos: s.at([-5, 6, 2]), for: '2s' });
  cue({ at: t(T0 + 3.25), fx: 'fireworks', pos: s.at([5, 6, 2]), color: '#20d0ff', color2: '#ff40a0', for: '2s' });
  cue({ at: t(T0), strobe: 'gameshow_l', every: '0.5b', low: 0.2, high: 1.6, sharp: 2, for: '4b' });
  cue({ at: t(T0 + 0.25), strobe: 'gameshow_r', every: '0.5b', low: 0.2, high: 1.6, sharp: 2, for: '4b' });
}

// ========== 4. WORKOUT ==========
{
  const s = Set(4), T0 = S(4), P = '#ff1a8c', C = '#18e8ff';
  s.box([0, -0.05, 0], [30, 0.1, 22], '#0a0420', { smooth: 0.9, metal: 0.4, name: 'wk_floor' });
  // Neon grid floor running to a sunset.
  for (let x = -12; x <= 12; x++) s.glow([x * 1.2, 0.01, 2], [0.03, 0.01, 22], P);
  for (let z = -6; z <= 6; z++) s.glow([0, 0.01, z * 1.5 + 2], [30, 0.01, 0.03], P);
  s.box([0, 4, 7], [34, 11, 0.2], '#14063a', { name: 'wk_back' });
  // The sun, in slats, and triangles of mountains in cyan outline.
  for (let i = 0; i < 9; i++) { const y = 1.2 + i * 0.62, w = 9 * Math.sqrt(Math.max(0, 1 - ((i - 4) / 5) ** 2)); s.mover(`wk_sun${i}`, 'prim:cube', [0, y, 6.85], [w, 0.42, 0.04], '#000000', { emission: i < 3 ? '#ff2a90' : i < 6 ? '#ff7a30' : '#ffd030' }); }
  for (const [x, h, rot] of [[-9, 4, 45], [-5.2, 3, 45], [5.4, 3.4, 45], [9.4, 4.2, 45]]) { s.box([x, 0.2, 6.6], [h, h, 0.1], '#180844', { rot: [0, 0, rot] }); s.glow([x, 0.2, 6.5], [h + 0.1, 0.06, 0.05], C, { rot: [0, 0, rot] }); s.glow([x, 0.2, 6.5], [0.06, h + 0.1, 0.05], C, { rot: [0, 0, rot] }); }
  s.pic('wk_sign', [0, 5.6, 6.6], [8.8, 2.86]);
  // Neon tubes, a chrome step bench he stands on.
  for (const d of [-1, 1]) for (let k = 0; k < 3; k++) s.glow([d * (6 + k * 2.1), 3, 5 - k * 1.8], [0.14, 6, 0.14], k % 2 ? C : P, { shape: 'prim:cylinder' });
  s.box([0, 0.14, -0.4], [1.8, 0.28, 0.8], '#ff60b0', { smooth: 0.7 });
  s.box([0, 0.3, -0.4], [1.9, 0.04, 0.9], '#16ffe8', { smooth: 0.8, emission: '#0a4a44' });
  // Two rows of turkeys in sweatbands. Each one a real mover so its band goes with it.
  const row = (z, y, n, sc, kindA, band) => { for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (9 / n) * 1.35, k = `wk_t${z}_${i}`;
    s.turkey(k, [kindA, 'white', 'black'][i % 3], [x, y, z], [0, 180, 0], sc);
    s.mover(k + '_band', 'prim:cylinder', [0, 0, 0], [0.26, 0.04, 0.26], band, { emission: band, smooth: 0.3 });
    cue({ at: 0, do: 'attach', on: k + '_band', to: k + '.neck3', pos: [0, 0.05, 0], rot: [0, 0, 0] });
  } };
  row(1.5, 0, 5, 2.3, 'brown', P); row(3.2, 0, 7, 2.1, 'white', C);
  // Dead still in the front row, the only one not jumping, facing him.
  nemesis(s, 'wk_nem', [2.1, 0, 0.5], [0, 248, 0], 2.15);
  s.mover('wk_hb', 'prim:cylinder', [0, 0.09, 0.01], [0.2, 0.028, 0.22], P, { parent: 'person.head', emission: '#a01060', smooth: 0.3, from: t(T0), until: t(T0 + 4) });
  animated.workout.pop();
  // Gym kit along the front edge, foreground.
  for (const d of [-1, 1]) { s.box([d * 5.2, 0.5, -3.2], [0.08, 1, 0.08], '#d0d0d8', { metal: 1, smooth: 0.8 }); s.cyl([d * 5.2, 1.0, -3.2], [0.34, 0.34, 0.34], '#101018', { rot: [0, 0, 90], smooth: 0.7 }); s.glow([d * 5.2, 1.0, -3.0], [0.2, 0.05, 0.02], d < 0 ? P : C); }
  spot(s, 'key', [-4, 6.5, -6], [0, 1, -0.4], 32, '#ffe8f4', 420, { shadows: true });
  spot(s, 'p', [-8, 4, 4], [0, 1.2, -0.4], 42, P, 900);
  spot(s, 'c', [8, 4, 4], [0, 1.2, -0.4], 42, C, 900);

  himAt(T0, s.at([0, 0.32, -0.4]), [0, 180, 0], null);
  // A tired man doing an aerobics routine in time: real jumping jacks, whole body, a jack every two beats, nobody home behind the face.
  // He keeps going when the sun comes down: he can't stop until the wheel is on him.
  cue({ at: t(T0), do: 'anim', on: 'person', clip: 'mx_jumping_jacks', beats: 2, for: '2.75b', blend: 0 });
  clean(T0); mug(T0, { smile: 0.12, fear: 0.2, eyesWide: 0, jawOpen: 0, blink: 0.4 }, 0.2);
  neckKeys('wk_nem', T0, [[0, 8, 6, 0], [2, 4, 0, 10], [3.1, 4, 28, 0]]);
  const birds = Object.keys(actors).filter((k) => k.startsWith('wk_t') && !k.endsWith('_band'));
  birds.forEach((b, i) => { cue({ at: t(T0), do: 'hop', on: b, height: 0.5, every: 1, for: '1bar' }); cue({ at: t(T0), do: 'sway', on: b, amount: 14, every: 2, for: '2b' }); cue({ at: t(T0), do: 'anim', on: b, clip: 'prancing', for: '1bar', beats: 2 }); });
  cut({ at: t(T0), shot: { name: 'wk: the class', pos: s.at([0.3, 1.1, -3.3]), move: s.at([0.1, 1.15, -2.7]), rot: [-5, 0, 0], fov: 50, ease: 'out' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'wk: his face', pos: s.at([0.6, 1.55, -2.4]), look: 'person.head', lookOffset: [0, -0.1, 0], fov: 34 } });
  cut({ at: t(T0 + 2), shot: { name: 'wk: behind the class, the sun', pos: s.at([1.6, 0.7, -2.2]), rot: [-14, -8, 0], fov: 74, handheld: 0.8 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'wk: it goes through', pos: s.at([-3, 0.6, -4.3]), look: 'person.hips', fov: 66, dutch: -7, handheld: 1 } });
  // The wheel, still going, comes through the back of the set and the sun comes down around it.
  const W0 = 60, rollZ = (b) => 16 - (b - 1.8) * 9.4;   // z along the centre aisle, beats from T0
  cue({ at: t(T0 + 1.8), do: 'set', on: 'gs_wheel', pos: [W0, 3.3, rollZ(1.8)], rot: [0, 90, 0] });
  for (let b = 1.8; b < 3.95; b += 0.125) cue({ at: t(T0 + b), do: 'move', on: 'gs_wheel', pos: [W0, 3.3, rollZ(b + 0.125)], for: '0.125b', ease: 'linear' }), cue({ at: t(T0 + b), do: 'rotate', on: 'gs_wheel', rot: [0, 90, (b - 1.8) * 163], for: '0.125b', ease: 'linear' });
  cue({ at: t(T0 + 2), fx: 'explosion', pos: s.at([0, 3, 6.6]), for: '2s', sfx: 'impact_big', sfxVolume: 0.5 });
  cue({ at: t(T0 + 2), fx: 'sparks', pos: s.at([0, 3, 6.6]), count: 300, speed: 10, for: '1.5s' });
  for (let i = 0; i < 9; i++) cue({ at: t(T0 + 2 + (i % 3) * 0.06), do: 'drop', on: `wk_sun${i}`, floor: 0.2, bounce: 0.3, height: 0.2, tumble: [20 + i * 8, 0, (i % 2 ? 1 : -1) * 40], for: '1.5b' });
  // The class breaks: the centre birds go up in the air, everyone else runs for the wings.
  ['wk_t1.5_2', 'wk_t3.2_3'].forEach((k, i) => { cue({ at: t(T0 + 2.5 - i * 0.3), do: 'jump', on: k, pos: [i ? -5 : 5, 2.5, -1], height: 5, for: '1b', spin: 2 }); });
  birds.forEach((b, i) => { if (['wk_t1.5_2', 'wk_t3.2_3'].includes(b)) return; cue({ at: t(T0 + 2.2 + (i % 4) * 0.07), do: 'anim', on: b, clip: 'runAngry', for: '1.8b', beats: 0.5 }); });
  // He sees it. He stops dead mid-jack, sinks, gathers, and dives on the last kick: it misses him by a hand and takes the lens.
  cue({ at: t(T0 + 2.65), do: 'gaze', on: 'person', to: s.at([0, 2, 6]), for: '0.15b', ease: 'out' });
  mug(T0 + 2.65, SCREAM, 0.1);
  K(T0 + 2.7, [{ t: 0.3, pose: 'crouch', bones: { spine: [14, 0, 0] }, ease: 'inout' }, { t: 0.65, from: 'JumpForwardCreature@0.45', root: { pos: [1.5, 1.0, 0.4], rot: [0, 80, -30] }, ease: 'out' }, { t: 0.95, pose: 'fall_air', root: { pos: [3.0, 0.55, 0.8], rot: [0, 90, -78] } }, { t: 1.3, pose: 'fall_air', root: { pos: [3.5, -0.18, 0.9], rot: [0, 90, -86] }, ease: 'in' }], { anticipate: 0.12, overshoot: 0.08 });
  cue({ at: t(T0), onsets: 'kick', until: t(T0 + 4), pulse: { exposure: 0.25 }, for: '0.4b' });
}

// ========== 5. SITCOM ==========
{
  const s = Set(5), T0 = S(5), W = '#e8d4a0';
  // His own sofa, table and remote. The set is three walls under a lighting rig, and the fourth wall is an audience.
  s.box([0, -0.05, 0], [11, 0.1, 9], '#8a5a34', { smooth: 0.4, name: 'sc_floor' });
  s.model('carpet', [0, 0.02, -0.8], 1);
  // Three flats with nothing behind them, each on its own braces, so they can fall.
  s.mover('sc_wb', 'none', [0, 0, 3.1], null, null); s.mover('sc_wl', 'none', [-5.4, 0, 0], null, null); s.mover('sc_wr', 'none', [5.4, 0, 0], null, null);
  s.box([0, 1.9, 0], [11, 3.8, 0.2], W, { name: 'sc_back', parent: 'sc_wb' });
  s.box([0, 1.9, 0], [0.2, 3.8, 6.4], '#dcc088', { name: 'sc_l', parent: 'sc_wl' });
  s.box([0, 1.9, 0], [0.2, 3.8, 6.4], '#dcc088', { name: 'sc_r', parent: 'sc_wr' });
  for (let x = -3; x <= 3; x++) s.box([x * 1.75, 3.76, -0.1], [1.6, 0.1, 0.1], '#fff4dc', { name: `sc_tr${x}`, parent: 'sc_wb' });
  s.box([0, 0.5, -0.1], [11, 1, 0.08], '#b89860', { smooth: 0.3, name: 'sc_dado', parent: 'sc_wb' });
  // The window and the front door, a framed picture, a plant, the lamp.
  s.box([-2.8, 2.2, -0.1], [1.9, 1.5, 0.1], '#fff8e0', { emission: '#b0a888', parent: 'sc_wb' });
  s.box([-2.8, 2.2, -0.14], [0.06, 1.5, 0.05], '#7a5030', { parent: 'sc_wb' }); s.box([-2.8, 2.2, -0.14], [1.9, 0.06, 0.05], '#7a5030', { parent: 'sc_wb' });
  s.box([3.0, 1.15, -0.1], [1.1, 2.3, 0.12], '#7a3a24', { smooth: 0.5, parent: 'sc_wb' });
  s.ball([2.62, 1.1, -0.18], 0.08, '#d8b040', { metal: 1, smooth: 0.7, parent: 'sc_wb' });
  s.model('painting', [0.1, 2.2, -0.1], 1, { rot: [0, 180, 0], parent: 'sc_wb' });
  // What's really back there: the dark stage, and a hundred red tally lights looking at him.
  s.crowd('sc_tally', { model: 'prim:sphere', pos: [0, 4, 15], color: '#200000', emission: '#ff1208', crowd: { count: 160, shape: 'grid', spacing: 1.5, seed: 9, modelScale: 0.11, scaleVar: 0.2 } });
  s.crowd('sc_crew', { model: 'turkey_black', pos: [0, 0, 8.5], crowd: { count: 18, shape: 'line', spacing: 1.4, seed: 44, modelScale: 2.4, scaleVar: 0.15, face: 180 } });
  s.crowd('sc_run', { model: 'turkey_white', models: ['turkey_white', 'turkey_brown', 'turkey_black'], pos: [3.0, 0, 2.6], crowd: { count: 7, shape: 'line', spacing: 0.7, seed: 3, modelScale: 2, scaleVar: 0.1, face: 180 } });
  s.model('kit_plant', [-4.5, 0, 2.2], 1.3);
  s.model('lamp_st', [-1.9, 0, 0.5], 1);
  s.model('sofa', [0, 0, 0.3], 1, { rot: [0, 180, 0] });
  // Beside him on his own sofa, sat down, looking at the side of his head.
  nemesis(s, 'sc_nem', [0.95, 0.3, 0.42], [0, 272, 0], 2.05);
  s.model('coffee_table', [0, 0, -1.3], 1);
  s.model('remote', [0.1, 0.42, -1.3], 1, { rot: [0, 30, 0] });
  // Above the set, the sign. Below it the bleachers.
  s.box([0, 4.5, 3.0], [3.6, 0.8, 0.18], '#200806');
  s.mover('sc_laugh', 'Assets/Shows/quad.obj', [0, 4.5, 2.88], [3.2, 0.72, 1], null, { material: 'Assets/Shows/sc_sign.mat' });
  truss(s, 5.6, 0, 12, 5, '#fff0d0');
  // The audience: raked rows looking in at him, every seat a turkey.
  for (let r = 0; r < 5; r++) {
    s.box([0, 0.2 + r * 0.5, -7.2 - r * 1.25], [18, 0.5 + r * 0.5, 1.3], '#23162a', { name: `sc_rake${r}` });
    s.crowd(`sc_aud${r}`, { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [0, 0.45 + r * 0.5, -7.2 - r * 1.25], crowd: { count: 13, shape: 'line', spacing: 1.32, seed: 40 + r, modelScale: 2, scaleVar: 0.08, face: 0 } });
  }
  spot(s, 'key', [-4, 5.2, -5], [0, 0.9, 0.3], 44, '#fff2dc', 300, { shadows: true });
  s.light('fill', { type: 'point', pos: [3, 3, -2], color: '#ffe0b8', range: 11 }, 7);
  spot(s, 'rim', [3, 4.6, 2.4], [0, 1.2, 0.3], 44, '#ffc880', 220);
  spot(s, 'aud', [0, 8, -6.5], [0, 1.2, -10], 100, '#ffd8b0', 160);
  spot(s, 'stage', [-5, 6, 4], [0, 0, 8.5], 70, '#ff3020', 0);
  spot(s, 'chorus', [-1.5, 3.4, -3.6], [0, 1.2, -8], 60, '#ffe6c4', 0);

  himAt(T0, s.at([-0.3, 0.02, 0.42]), [0, 180, 0], 'IdleSit13GreetA', { for: '1.25b' });
  clean(T0); mug(T0, { smile: 1, fear: 0.5, eyesWide: 0.4 }, 0.2);
  for (const foot of ['left', 'right']) cue({ at: t(T0), do: 'plant', on: 'person', foot, blend: 0, for: '3.9b', release: '0.1s' });
  birdLoop('sc_nem', 'squart', T0, 4, 8);
  neckKeys('sc_nem', T0, [[0, 6, 0, 0], [2.75, 10, -8, 0], [3.25, -6, 18, 12]]);
  pose(T0, { chest: [-6, 0, 8], spine: [-4, 0, 0] }, 0.3);
  cut({ at: t(T0), shot: { name: 'sc: three cameras', pos: s.at([0.25, 1.2, -2.5]), move: s.at([0.15, 1.16, -2.1]), rot: [-1, 0, 0], fov: 50, ease: 'out' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'sc: the audience', pos: s.at([1.2, 0.9, -3.2]), rot: [-10, 186, 0], fov: 52, handheld: 0.3 } });
  cut({ at: t(T0 + 2), shot: { name: 'sc: the flats go', pos: s.at([-0.4, 1.2, -2.8]), move: s.at([-0.3, 1.6, -4.6]), rot: [-3, 2, 0], fov: 62, ease: 'out', handheld: 0.5 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'sc: what was behind it', pos: s.at([0.6, 0.9, -1.2]), look: 'person.head', lookOffset: [0, 0.1, 0], fov: 60, dutch: 4 } });
  // Laugh track: he plays to it, frozen grin, then the lights behind.
  // He plays to the laugh: legs stay sat, a real laugh goes over the top half, and it dies on his face.
  cue({ at: t(T0 + 1.25), do: 'anim', on: 'person', clip: 'IdleSit13', blend: '0.25s', for: '2b' });
  cue({ at: t(T0 + 1.2), do: 'layer', on: 'person', clip: 'Idle1LaughB', mask: 'arms,head,spine', weight: [['0b', 0], ['0.25b', 0.75], ['1.1b', 0.6], ['1.5b', 0]], for: '1.5b', blend: '0.1s', speed: 1.2 });
  cue({ at: t(T0 + 2.5), do: 'gaze', on: 'person', to: s.at([3.0, 1.2, 2.6]), limit: 80, for: '0.3b', ease: 'out' });
  mug(T0 + 2.6, { smile: 0.2, eyesWide: 0.8, fear: 0.7 }, 0.2);
  for (let r = 0; r < 5; r++) {
    cue({ at: t(T0 + 1.25), do: 'hop', on: `sc_aud${r}`, height: 0.3, every: 0.5, for: '2.75b', stagger: 0.012, jitter: 0.1 });
    cue({ at: t(T0 + 1.25), do: 'anim', on: `sc_aud${r}`, clip: 'eat', for: '2.75b', beats: 0.5, offset: 1 });
    cue({ at: t(T0 + 1.25), do: 'sway', on: `sc_aud${r}`, amount: 16, every: 1, for: '2.75b', jitter: 0.2 });
  }
  cue({ at: t(T0), do: 'glow', on: 'sc_laugh', color: '#000000', for: '0.01b' });
  cue({ at: t(T0 + 1.1), do: 'glow', on: 'sc_laugh', color: '#ff2010', power: 4, for: '0.05b', sfx: 'turkey_flock', sfxVolume: 0.7 });
  cue({ at: t(T0 + 1.25), do: 'pulse', on: 'sc_laugh', amount: 0.06, every: 0.5, for: '2.7b' });
  // The workout class comes in through the front door, at a run, and the set can't take it.
  cue({ at: t(T0), do: 'hide', on: 'sc_run' });
  cue({ at: t(T0 + 1.9), do: 'show', on: 'sc_run' });
  herd('sc_run', T0 + 1.9, [-6.5, 0, -1.4], 2.1, 1.3, 'runAngry', { stagger: 0.04 });
  cue({ at: t(T0 + 2), do: 'topple', on: 'sc_wl', pivot: [0, 0, 0], axis: [0, 0, 1], angle: 88, bounce: 0.18, land: t(T0 + 2.75), for: '1.1b', sfx: 'couch_slam', sfxVolume: 0.7 });
  cue({ at: t(T0 + 2.3), do: 'topple', on: 'sc_wr', pivot: [0, 0, 0], axis: [0, 0, 1], angle: -88, bounce: 0.18, land: t(T0 + 3), for: '1.1b', sfx: 'couch_slam', sfxVolume: 0.7 });
  cue({ at: t(T0 + 2.5), do: 'topple', on: 'sc_wb', pivot: [0, 0, 0], axis: [1, 0, 0], angle: 88, bounce: 0.14, land: t(T0 + 3.25), for: '1.2b', sfx: 'impact_big', sfxVolume: 0.5 });
  cue({ at: t(T0 + 3.25), fx: 'dust', pos: s.at([0, 0.3, 4.5]), for: '2s' });
  cue({ at: t(T0 + 2.75), light: 'sitcom_stage', intensity: 240, for: '0.5b' });
  cue({ at: t(T0 + 4), light: 'sitcom_stage', intensity: 0 });
  cue({ at: t(T0 + 3.25), do: 'hop', on: 'sc_crew', height: 0.3, every: 0.5, for: '0.75b' });
  cue({ at: t(T0 + 3.25), do: 'pop', on: 'sc_tally', for: '0.5b', stagger: 0.003, jitter: 0.1 });
  // What's behind it: he twists round on the seat, right hand slams onto the sofa back, and he half gets up, away from it.
  mug(T0 + 3.25, SCREAM, 0.12);
  cue({ at: t(T0 + 3.1), do: 'reach', on: 'person', hand: 'right', to: s.at([-0.75, 0.84, 0.74]), for: '0.2b', ease: 'out' });
  cue({ at: t(T0 + 3.1), do: 'fingers', on: 'person', hand: 'right', curl: 0.8, for: '0.2b' });
  K(T0 + 3.05, [{ t: 0.2, bones: { chest: [4, 30, 0], spine: [6, 22, 0], head: [-6, 16, 0] } }, { t: 0.55, bones: { chest: [18, 44, 0], spine: [16, 30, 0], head: [-14, 20, 0] }, root: { pos: [0, 0.2, 0.1] }, ease: 'back' }], { anticipate: 0.15 });
  cue({ at: t(T0 + 3.25), do: 'gaze', on: 'person', to: s.at([0, 2, 8]), limit: 70, for: '0.25b', ease: 'out' });
  // The wheel crosses the dark, behind everything, on its way to the next channel.
  cue({ at: t(T0 + 2.6), do: 'set', on: 'gs_wheel', pos: [120 - 18, 3.3, 7.2], rot: [0, 0, 0] });
  for (let b = 2.6; b < 3.95; b += 0.125) cue({ at: t(T0 + b), do: 'move', on: 'gs_wheel', pos: [120 - 18 + (b - 2.6 + 0.125) * 26, 3.3, 7.2], for: '0.125b', ease: 'linear' }), cue({ at: t(T0 + b), do: 'rotate', on: 'gs_wheel', rot: [0, 0, -(b - 2.6) * 400], for: '0.125b', ease: 'linear' });
}

// ========== 6. NATURE ==========
{
  const s = Set(6), T0 = S(6);
  s.box([0, -0.05, 0], [80, 0.1, 80], '#4a5a22', { name: 'nt_floor' });
  for (let i = 0; i < 4; i++) s.crowd(`nt_grass${i}`, { model: 'grass_big', pos: [0, 0, 0], crowd: { count: 44, shape: 'scatter', radius: 8.5, inner: 4.2, seed: 70 + i, modelScale: 7 + i * 2, scaleVar: 0.3 } });
  // The near rise the herd comes over, close enough to read, and the far hills behind it.
  s.ball([3, -1, 23], [64, 14, 28], '#7a8a38', { name: 'nt_rise' });
  s.ball([26, 2, 60], [60, 16, 30], '#6a8040', { name: 'nt_hill' });
  s.ball([-32, 0, 56], [70, 22, 30], '#566c34', { name: 'nt_hill2' });
  s.turkey('nt_op', 'black', [2.2, 0, 2.6], [0, 215, 0], 2.2);
  // The bird's shoulder camera: a matte-black ENG box with a lens and a red tally.
  s.mover('nt_cam', 'prim:cube', [1.8, 1.45, 2.25], [0.2, 0.26, 0.6], '#17171b', { rot: [0, 215, 0], smooth: 0.45 });
  s.mover('nt_lens', 'prim:cylinder', [1.58, 1.46, 1.94], [0.17, 0.16, 0.17], '#07070a', { rot: [90, 215, 0], smooth: 0.9, metal: 0.8 });
  s.mover('nt_tally', 'prim:sphere', [1.77, 1.62, 2.14], 0.035, '#200000', { emission: '#ff1a10' });
  // The wreckage has got here first: the wheel in the hillside, and the whole film coming over the hill.
  // Rows, each behind the one before, buried behind the crest until they come over it.
  const HERD = [0, 1, 2, 3, 4].map((r) => [r ? `nt_herd${r}` : 'nt_herd', [2, -1, 5, 0, 3][r], 15, 77 + r, 1.45 + r * 0.05, 3.2]);
  for (const [k, x, count, seed, sp, sc] of HERD) s.crowd(k, { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [x, 2.6, 23], crowd: { count, shape: 'line', spacing: sp, seed, modelScale: sc, scaleVar: 0.25, face: 180 } });
  // At the head of the stampede, and it isn't running from anything.
  nemesis(s, 'nt_lead', [3, 2.6, 21], [0, 186, 0], 3);
  s.light('sun', { type: 'directional', pos: [0, 40, 0], rot: [24, 18, 0], color: '#ffd8a0', shadows: true }, 3.4);
  s.light('sky', { type: 'point', pos: [0, 5, -3], color: '#b8c8a0', range: 16 }, 5);

  // He creeps through it, low, feet actually stepping, looking the wrong way.
  himAt(T0, s.at([0.5, 0.02, 0.5]), [0, 215, 0], null);
  cue({ at: t(T0), do: 'walk', on: 'person', clip: 'CrouchForwardUnarmed', to: s.at([-0.3, 0.02, -0.4]), for: '2b', stride: 0.95, ease: 'linear', blend: 0 });
  clean(T0); mug(T0, { fear: 0.6, eyesWide: 0.6 }, 0.2);
  cue({ at: t(T0 + 1.2), do: 'gaze', on: 'person', to: s.at([1.5, 1.2, 1.6]), limit: 90, for: '0.3b', ease: 'inout' });
  cue({ at: t(T0), do: 'set', on: 'gs_wheel', pos: [180 - 11, 3.4, 16], rot: [14, 30, -24] });
  cut({ at: t(T0), shot: { name: 'nt: long lens, the specimen', pos: s.at([-1.9, 0.75, -2.9]), look: 'person.chest', lookOffset: [0.3, 0.1, 0], fov: 32 } });
  cut({ at: t(T0 + 1.25), shot: { name: 'nt: the viewfinder', pos: s.at([0.72, 1.3, 0.78]), look: 'person.chest', fov: 38, handheld: 0.9 } });
  cut({ at: t(T0 + 2), shot: { name: 'nt: the horizon moves', pos: s.at([0.5, 4.3, -2.2]), rot: [3, 6, 0], fov: 34, handheld: 0.5 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'nt: run', pos: s.at([-0.9, 1.2, -2.95]), rot: [-5, 6, 0], fov: 66, dutch: -6, handheld: 1 } });
  cue({ at: t(T0 + 0.2), do: 'walk', on: 'nt_op', clip: 'walk', to: [1.5, 0, 1.6], for: '2.25b', stride: 0.8 });
  for (const [k, p] of [['nt_cam', [1.1, 1.45, 1.25]], ['nt_lens', [0.88, 1.46, 0.94]], ['nt_tally', [1.07, 1.62, 1.14]]]) cue({ at: t(T0 + 0.2), do: 'move', on: k, pos: p, for: '2.25b', ease: 'linear' });
  // The bird with the camera isn't what he should be looking at. The whole film is coming over the hill.
  // Over the crest, down the face of the rise, flat out across the open ground: three legs of a walk, the rise's own curve under them, feet tied to speed.
  const Y = (z) => (z < 9.2 ? 0 : -1 + 7 * Math.sqrt(Math.max(0, 1 - ((z - 23) / 14) ** 2)));
  HERD.forEach(([k, x], r) => {
    let b = T0 + 1.3 + r * 0.14, z = 23, y = 2.6;
    for (const [z1, len] of [[21, 0.3], [17.5, 0.42], [14, 0.42], [11, 0.36], [9.2, 0.2], [1.5, 1]]) { herd(k, b, [-(x - 1) * 0.1 * len, Y(z1) - y, z1 - z], len, 3, 'runAngry', { jitter: 0.12 }); b += len; z = z1; y = Y(z1); }
    cue({ at: t(T0 + 1.6), do: 'hop', on: k, height: 0.3, every: 0.5, for: '2.4b', jitter: 0.15 });
  });
  { let b = T0 + 1.2, z = 21, x = 3;
    for (const [z1, len] of [[18.5, 0.38], [14.5, 0.48], [11, 0.42], [9.2, 0.2], [2.6, 0.9]]) { x -= 0.3; cue({ at: t(b), do: 'walk', on: 'nt_lead', clip: 'runAngry', to: [x, Y(z1), z1], for: `${len}b`, stride: 2.4, ease: 'linear', face: 0, blend: '0.05s' }); b += len; z = z1; } }
  // He feels it through the ground first: stops, hand down to the dirt, then looks. Eyes, head, chest. Up, and gone on the kick.
  cue({ at: t(T0 + 2), do: 'anim', on: 'person', clip: 'CrouchIdleBreathe1Unarmed', blend: '0.15s', for: '1.25b' });
  cue({ at: t(T0 + 2.05), do: 'gaze', on: 'person', weight: 0, for: '0.2b' });
  cue({ at: t(T0 + 2.05), do: 'reach', on: 'person', hand: 'right', to: s.at([-0.55, 0.03, -0.72]), for: '0.3b', ease: 'inout' });
  cue({ at: t(T0 + 2.05), do: 'tremble', on: 'person', amount: 0.008, band: 'kick', for: '1.1b' });
  mug(T0 + 2.5, SCREAM, 0.12);
  cue({ at: t(T0 + 2.5), do: 'gaze', on: 'person', to: s.at([3, 2, 14]), limit: 70, for: '0.3b', ease: 'out' });
  cue({ at: t(T0 + 2.8), do: 'reach', on: 'person', hand: 'right', weight: 0, for: '0.2b' });
  K(T0 + 2.75, [{ t: 0.5, pose: 'stand', bones: { spine: [20, 0, 0], head: [-12, 0, 0] }, root: { rot: [0, -8, 0] }, ease: 'out' }]);
  cue({ at: t(T0 + 3.25), do: 'gaze', on: 'person', weight: 0, for: '0.05b' });
  cue({ at: t(T0 + 3.25), do: 'walk', on: 'person', clip: 'RunFastForwardUnarmed', to: s.at([-0.65, 0.02, -2.2]), for: '0.75b', stride: 3, ease: 'in', blend: '0.08s' });
  pose(T0 + 3.25, { spine: [24, 0, 0], head: [-14, 0, 0] }, 0.15);
  cue({ at: t(T0 + 2), onsets: 'kick', until: t(T0 + 4), pulse: { shake: 0.6 }, for: '0.4b', sharp: 3 });
}

// ========== 7. LATE NIGHT ==========
{
  const s = Set(7), T0 = S(7), V = '#180f3c';
  s.box([0, -0.05, 0], [24, 0.1, 16], '#2a1a12', { smooth: 0.75, name: 'ln_floor' });
  s.cyl([-0.5, 0.01, 0.4], [10, 0.01, 7], '#5a1830', { smooth: 0.2, name: 'ln_rug' });
  // The city at night through a two-storey window: real glass blocks in the distance, lit windows, a moon.
  s.box([0, 24, 34], [70, 56, 0.2], '#0a0a2c', { name: 'ln_back' });
  s.glow([0, 24, 33], [70, 48, 0.02], '#2a1858');
  s.glow([0, 2, 32], [46, 5, 0.02], '#7a2a6a');
  for (let i = 0; i < 24; i++) {
    const x = -14 + i * 1.22, h = 1.3 + ((i * 7) % 5) * 0.42 + (i % 3) * 0.2, w = 1.0 + (i % 2) * 0.2;
    s.box([x, h / 2 + 0.4, 5.2], [w, h, 0.05], '#0c0a24');
    for (let y = 0; y < Math.floor(h / 0.36); y++) for (let k = 0; k < 3; k++) if ((i * 3 + y * 5 + k * 7) % 4) s.glow([x - 0.28 + k * 0.28, 0.65 + y * 0.36, 5.16], [0.13, 0.17, 0.01], (i + y) % 5 ? '#ffd080' : '#80c0ff');
  }
  s.glow([7.2, 11, 30], [4, 4, 0.02], '#f0e8d0', { shape: 'prim:sphere' });
  s.mover('ln_kaiju', 'turkey_white_hero', [3.4, -32, 21], 42, null, { rot: [0, 196, 0] });
  alive('ln_kaiju', 0);
  cue({ at: 0, do: 'pose', on: 'ln_kaiju', bone: 'tail', rot: [80, 0, 0], for: '0.1s' });
  // Same bird, same tie, the size of the city: that's what makes it read.
  s.mover('ln_kaiju_tie', 'prim:cube', [0, 0, 0], [1.46, 4.9, 0.4], TIE.color, { smooth: 0.5, emission: '#5a0408' });
  cue({ at: 0, do: 'attach', on: 'ln_kaiju_tie', to: 'ln_kaiju.neck2', pos: [0, -0.8, 2.4], rot: [0, 0, 0] });
  s.pic('ln_sign', [0, 4.4, 5.05], [7.4, 2.1]);
  // Heavy drapes either side, a warm valance, window frame in dark wood.
  for (const d of [-1, 1]) for (let i = 0; i < 8; i++) s.cyl([d * (7.8 + i * 0.52), 3.6, 4.6 - i * 0.05], [0.56, 3.7, 0.5], i % 2 ? '#581428' : '#4a1022', { smooth: 0.15 });
  s.box([0, 7.2, 4.8], [24, 0.6, 0.4], '#2a1410', { smooth: 0.3 });
  // The desk, left, in wood with a lit edge. A mug, cards, a mic. The guest chair and couch, right. A little band.
  s.box([-2.6, 0.45, 0.8], [2.8, 0.9, 1.1], '#5a2a14', { smooth: 0.55 });
  s.box([-2.6, 0.92, 0.8], [3.0, 0.07, 1.3], '#2a120a', { smooth: 0.75 });
  s.glow([-2.6, 0.08, 0.2], [2.8, 0.03, 0.02], '#ffa850');
  for (const x of [-3.6, -2.6, -1.6]) s.box([x, 0.45, 0.22], [0.8, 0.7, 0.03], '#3a1a0c', { smooth: 0.6 });
  s.model('coffee_mug', [-1.7, 0.96, 0.7], 1.5);
  s.cyl([-3.3, 1.08, 0.75], [0.015, 0.16, 0.015], '#101014', { smooth: 0.7, metal: 0.8, rot: [0, 0, -14] });
  s.ball([-3.34, 1.26, 0.75], [0.06, 0.08, 0.06], '#1a1a20', { smooth: 0.2 });
  s.model('coffee_table', [2.0, 0, 0.3], 0.7);
  s.model('sofa1', [0.55, 0, 0.9], 1.1, { rot: [0, 215, 0] });
  s.model('sofa', [3.1, 0, 1.3], 1, { rot: [0, 180, 0] });
  s.model('lamp_st', [4.6, 0, 1.8], 1);
  // Host. A bird in a dark suit jacket of shadow and a very good tie.
  nemesis(s, 'ln_host', [-2.6, 0.32, 1.55], [0, 102, 0], 2.15);
  // The band, in the corner, in silhouette.
  s.crowd('ln_band', { model: 'turkey_black', pos: [-6.6, 0.32, 2.4], crowd: { count: 5, shape: 'line', spacing: 0.95, seed: 3, modelScale: 1.9, face: 150 } });
  s.box([-6.6, 0.16, 2.4], [5.6, 0.32, 1.9], '#301408', { smooth: 0.5 });
  s.glow([-6.6, 0.33, 1.42], [5.6, 0.03, 0.03], '#ff9040');
  spot(s, 'key', [-5, 6, -5.6], [0.5, 1, 0.9], 36, '#ffe8d0', 420, { shadows: true });
  spot(s, 'rim', [3.5, 5.5, 3.8], [0.5, 1.2, 0.9], 44, '#7050ff', 520);
  spot(s, 'kaiju', [3.4, 0.8, 5.6], [3.4, 13, 14], 110, '#ffe4ec', 0, { range: 50 });
  spot(s, 'kaijuh', [-7, 30, -4], [3.4, 26, 21], 44, '#ffe8dc', 0, { range: 80 });
  s.light('lamp', { type: 'point', pos: [4.6, 1.5, 1.8], color: '#ffc080', range: 5 }, 5);
  s.light('desk', { type: 'point', pos: [-2.5, 1.7, -0.3], color: '#ffc8a0', range: 5 }, 3);

  himAt(T0, s.at([0.55, 0.13, 0.88]), [0, 215, 0], 'IdleSit13Explain', { for: '1.5b' });
  clean(T0); mug(T0, { smile: 0.25, jawOpen: 0, fear: 0, eyesWide: 0 }, 0.3);
  // A talk-show lounge: one shoulder down, right arm along the chair arm, the other hand telling the story.
  pose(T0, { chest: [-8, 0, 10], spine: [-6, 0, 5] }, 0.4, 'inout');
    cut({ at: t(T0), shot: { name: 'ln: the crane comes in', pos: s.at([1.2, 2.2, -3.6]), move: s.at([0.65, 1.35, -1.5]), look: 'person.chest', lookOffset: [0, 0.15, 0], fov: 42, ease: 'out' } });
  cut({ at: t(T0 + 1.25), shot: { name: 'ln: behind him, it stands up', pos: s.at([0.55, 0.95, -2.1]), rot: [-22, 3, 0], fov: 68, handheld: 0.4 } });
  cut({ at: t(T0 + 2.5), shot: { name: 'ln: he looks at us', pos: s.at([-0.5, 1.25, -1.5]), look: 'person.head', lookOffset: [0, -0.05, 0], fov: 30 } });
  cut({ at: t(T0 + 3.25), shot: { name: 'ln: it looks in', pos: s.at([0.5, 1.0, -2.6]), rot: [-27, 3, 0], fov: 68, handheld: 0.8, dutch: 3 } });
  // Its fan folded down behind it: the host is a bird with a tie, not a wall of tail.
  cue({ at: 0, do: 'pose', on: 'ln_host', bone: 'tail', rot: [80, 0, 0], for: '0.1s' });
  birdLoop('ln_host', 'idle', T0, 4, 4);
  neckKeys('ln_host', T0, [[0, 4, 4, 0], [1.6, 6, -2, 0], [2.5, 2, 2, 0], [3.25, 10, 6, 6]]);
  cue({ at: t(T0), do: 'sway', on: 'ln_band', amount: 8, every: 1, for: '1bar', jitter: 0.2 });
  cue({ at: t(T0), do: 'hop', on: 'ln_band', height: 0.12, every: 0.5, for: '1bar', jitter: 0.1 });
  // Something the size of the city gets up behind the skyline. Each kick it's higher and the set shakes. Nobody minds.
  for (const [off, y] of [[1.25, -9], [2, -6], [3.25, -4]]) {
    cue({ at: t(T0 + off), do: 'move', on: 'ln_kaiju', pos: [3.4, y, 21], for: '0.4b', ease: 'back' });
    cue({ at: t(T0 + off), pulse: { shake: 0.8 }, for: '0.4b', sharp: 3 });
  }
  cue({ at: t(T0 + 1.25), light: 'latenight_kaiju', intensity: 700 }); cue({ at: t(T0 + 1.25), light: 'latenight_kaijuh', intensity: 9000 });
  birdLoop('ln_kaiju', 'idle', T0 + 1.25, 2.75, 4);
  // Slow, huge: head comes up over the roofs, sweeps across the city, then bends down to look in at the window.
  neckKeys('ln_kaiju', T0 + 1.25, [[0.1, 10, 0, 0], [0.9, 18, -24, 0], [1.9, 26, 18, 0], [2.3, 38, 4, 0], [2.75, 44, 0, 0]], { overshoot: 0.06, settle: '0.5s' });
  cue({ at: t(T0 + 3.25), do: 'anim', on: 'ln_kaiju', clip: 'bite', for: '0.75b', speed: 0.5, sfx: 'turkey_gobble_3', sfxVolume: 0.7 });
  // He glances over his shoulder, turns back to the lens, and for the first time he likes it.
  // Story hand, a laugh at his own joke, a look round. Legs stay sat, the arms and head are clips.
  cue({ at: t(T0 + 0.9), do: 'layer', on: 'person', clip: 'Idle1LaughB', mask: 'arms,head,spine', weight: [['0b', 0], ['0.2b', 0.7], ['0.7b', 0.5], ['0.95b', 0]], for: '0.95b', blend: '0.1s', speed: 1.2 });
  cue({ at: t(T0 + 1.6), do: 'gaze', on: 'person', to: s.at([1.0, 6, 12]), limit: 55, for: '0.4b', ease: 'inout' });
  K(T0 + 1.5, [{ t: 0.4, bones: { chest: [-6, 16, 0], spine: [-4, 8, 0] } }, { t: 1.1, bones: { chest: [-8, 0, 8], spine: [-6, 0, 4] } }]);
  cue({ at: t(T0 + 2.5), do: 'anim', on: 'person', clip: 'IdleSit13GreetA', blend: '0.25s', for: '1.5b' });
  cue({ at: t(T0 + 2.5), do: 'face', on: 'person', fear: 0, eyesWide: 0, smile: 1, for: '0.6b', ease: 'inout' });
  cue({ at: t(T0 + 2.5), do: 'gaze', on: 'person', to: s.at([-0.5, 1.25, -1.5]), for: '0.4b', ease: 'inout' });
}

// The late night set is the next one along: keep it off while Nature looks that way.
const lnOff = (a, z) => { for (const r of ['show_latenight', ...animated.latenight]) { cue({ at: t(a), do: 'hide', on: r }); cue({ at: t(z), do: 'show', on: r }); } };
lnOff(S(6) - 0.02, S(7));

// ---------- feathers on him, a bit more each show ----------
[[59, 0.005], [60, 0.01], [61, 0.015], [62, 0.02], [63, 0.03], [64, 0.04], [65, 0.05], [66, 0.055], [67, 0.065], [68, 0.08]].forEach(([bar, amount]) => cue({ at: t(bb(bar)), do: 'feather', on: 'person', amount, strip: 0, for: '1b', ease: 'inout' }));
if (false) {
  const stages = [[bb(59), ['leftLowerArm', 'rightLowerArm'], 2], [bb(60), ['leftLowerArm', 'rightLowerArm', 'leftUpperArm', 'rightUpperArm'], 3],
    [bb(62), ['neck', 'chest', 'leftUpperArm', 'rightUpperArm'], 4], [bb(63), ['chest', 'spine', 'leftLowerArm', 'rightLowerArm'], 4],
    [bb(65), ['spine', 'hips', 'neck', 'leftShoulder', 'rightShoulder'], 4], [bb(66), ['chest', 'head', 'leftUpperArm', 'rightUpperArm', 'hips'], 3]];
  const R = { chest: 0.15, spine: 0.14, hips: 0.15, neck: 0.07, head: 0.1, leftUpperArm: 0.055, rightUpperArm: 0.055, leftLowerArm: 0.045, rightLowerArm: 0.045, leftShoulder: 0.08, rightShoulder: 0.08 };
  let n = 0;
  const FC = ['#f2ead8', '#c89a60', '#7a4a26', '#f8f2e6', '#a06a38'];
  for (const [b, bones, k] of stages) for (const bone of bones) for (let i = 0; i < k; i++) {
    const a = (i / k + n * 0.137) * Math.PI * 2, r = R[bone], key = 'hf' + (n++);
    actors[key] = { model: 'prim:sphere', pos: [0, -50, 0], scale: [0.04, 0.17, 0.012], color: FC[n % 5], smooth: 0.2, from: t(b), until: t(bb(69, 1.75)) };
    cue({ at: 0, do: 'attach', on: key, to: 'person.' + bone, pos: [Math.cos(a) * r, 0.02 + (n % 3) * 0.05, Math.sin(a) * r], rot: [Math.sin(a) * 50, 0, -Math.cos(a) * 50] });
    cue({ at: t(b), do: 'pop', on: key, for: '0.25b', ease: 'back' });
  }
}

// ---------- they're all in on it: every crowd bird nods on the kick, no stagger ----------
{
  const NOD = { 0: ['news_op', 'news_fm'], 1: [], 2: [], 3: [...[-1, 1].flatMap((d) => [0, 1, 2].map((r) => `gs_aud${d}${r}`))], 4: Object.keys(actors).filter((k) => k.startsWith('wk_t') && !k.endsWith('_band')), 5: [0, 1, 2, 3, 4].map((r) => `sc_aud${r}`).concat('sc_crew'), 6: ['nt_op'], 7: ['ln_band'] };
  for (const [i, list] of Object.entries(NOD)) for (const on of list) for (const k of [0, ...KICKS]) {
    if (+i === 4 && k > 2) continue;
    cue({ at: t(S(+i) + k), do: 'anim', on, clip: 'bite', for: '0.35b', speed: 1.8, blend: '0.02s', return: '0.05s' });
  }
}

// ---------- the show order, the flips ----------
SHOWS.forEach((name, i) => { cue({ at: t(S(i)), note: name }); delete cues[cues.length - 1].note; cues.pop(); });
const CH = [4, 5, 7, 9, 11, 13, 22, 33];
const showCues = [];
for (let i = 0; i < 8; i++) { liveSet(SHOWS[i], S(i)); flip(S(i), CH[i]); }

// Broadcast graphics.
const hasShow = (f) => fs.existsSync(path.join(ROOT, '..', f));
const GFX = (b, kind, o) => { if (kind === 'image' && !hasShow(o.path)) return console.log('skipped, not on disk: ' + o.path); return cue({ at: t(b), gfx: kind, ...o }); };
// Lower thirds are pictures now: big type, and the words are part of the slab so they can't vanish on it.
const LT = (b, name, len) => GFX(b, 'image', { path: `Assets/Shows/${name}.png`, pos: [0.335, 0.2, 0], size: [1240, 210, 0], for: `${len}b`, in: 0.08, out: 0.08 });
GFX(S(0) + 0.1, 'bug', { text: 'WTKS 4', box: '#c01020', for: '3.7b' });
GFX(S(0) + 0.1, 'ticker', { text: 'LOCAL MAN STILL BEING WATCHED', label: 'BREAKING', color: '#c01020', speed: 300, for: '3.7b' });
LT(S(0) + 0.5, 'lt_him', 2.7);
GFX(S(1) + 0.1, 'bug', { text: 'STORM 5', box: '#0a3a8a', for: '3.7b' });
LT(S(1) + 0.4, 'lt_wx', 2.7);
LT(S(2) + 1.3, 'lt_chef', 1.4);
LT(S(3) + 0.3, 'lt_game', 2.2);
GFX(S(4) + 0.3, 'phone', { text: 'CALL 1-800-GOBBLE', color: '#18e8ff', for: '0.95b' });
GFX(S(4) + 2.1, 'phone', { text: 'MAY CAUSE TURKEYS', color: '#ffe020', for: '1.7b' });
LT(S(5) + 0.25, 'lt_laugh', 1.7);
LT(S(6) + 0.25, 'lt_nature', 1.7);
GFX(S(6) + 2, 'bug', { text: 'REC', box: '#b01010', for: '1.8b' });
GFX(S(7) + 0.1, 'bug', { text: 'GOBBLES', box: '#5a1830', for: '3.7b' });
LT(S(7) + 0.4, 'lt_late', 2);
GFX(S(7) + 0.1, 'ticker', { text: 'STAY TUNED. YOU HAVE NO CHOICE.', label: 'GOBBLES', color: '#5a1830', speed: 260, for: '3.7b' });

// The ad takes the hard kick after the wall; Part 8 starts when it's over.
const AD0 = bb(68, 3.75), AD1 = bb(69, 4.5);
// ---------- 67-68. The flips. Each one a beat of his own, all of it now his. ----------
// The channels stop being separate. Each set is what the others left of it; the crowd comes with him; the graphics pile up.
const F = bb(66, 4.5);
// Every channel is his now. A specific presenter's move on each, and the tie bird is on every one, facing him.
const faceTo = (from, to) => +(Math.atan2(to[0] - from[0], to[2] - from[2]) * DEG).toFixed(1);
const birdAt = (on, s, p, him, x = {}) => cue({ at: t(x.b), do: 'set', on, pos: p, rot: [0, faceTo(p, him), 0] });
const CHORUS = [[265.75, 0.32], [266.15, 0.62], [267.15, 0.34]];
const sing = (on, b, n) => cue({ at: t(b), do: 'anim', on, clip: 'bite', start: 0.12, stop: 0.32, speed: 0.6, blend: '0.02s', for: `${n}b`, return: '0.04s' });
const singHop = (on, b, n) => cue({ at: t(b), do: 'hop', on, height: 0.28, every: n, for: `${n}b` });
const FLIP_ACT = {
  news(b, s, len) {
    birdAt('news_coanchor', s, [1.05, 0.34, 1.44], [-1.05, 0, 1.62], { b });
    cue({ at: t(b), do: 'reach', on: 'person', hand: 'left', to: s([-1.3, 0.86, 1.2]), for: '0.15b', ease: 'out' });
    pose(b, { chest: [-5, 0, 8], spine: [-3, 0, 4] }, 0.3, 'inout');
    K(b + 0.1, [{ t: 0.4, bones: { head: [8, -10, 0] } }, { t: 0.8, bones: { head: [-4, 10, 0] } }]);
  },
  weather(b, s, len) {
    birdAt('wx_hit', s, [3.2, 0.14, 1.2], [-0.5, 0, 0.2], { b });
    cue({ at: t(b), do: 'anim', on: 'wx_hit', clip: 'idle', for: '1b' });
    pose(b, { chest: [-4, 26, -8], spine: [0, 10, -6], head: [0, -16, 0] }, 0.3, 'back');
  },
  cooking(b, s, len) {
    K(b, [{ t: 0.45, bones: { chest: [-14, 0, 0], head: [-12, 0, 0] } }, { t: 1.1, bones: { chest: [6, 0, 8], head: [4, 0, -6] } }], { overshoot: 0.1 });
  },
  gameshow(b, s, len) {
    pose(b, { chest: [-4, -14, 0], head: [0, 16, 0] }, 0.25, 'back');
  },
  sitcom(b, s, len) {
    cue({ at: t(b), do: 'anim', on: 'sc_nem', clip: 'squart', for: '2b', blend: 0 });
    // The hook, read off the vocal stem: three shapes at 67:2.75, 67:3.15, 67:4.15. Every beak in the room, no stagger.
    for (const [at, n] of CHORUS) for (const on of ['sc_aud0', 'sc_aud1', 'sc_aud2', 'sc_aud3', 'sc_aud4']) { sing(on, at, n); singHop(on, at, n); }
    cue({ at: t(b), light: 'sitcom_chorus', intensity: 520 }); cue({ at: t(b + len), light: 'sitcom_chorus', intensity: 0 });
  },
  nature(b, s, len) { birdAt('nt_lead', s, [1.5, 0, 1.2], [0, 0, 0], { b }); cue({ at: t(b), do: 'anim', on: 'nt_lead', clip: 'idle', for: '1b', blend: 0 }); },
  latenight(b, s, len) { birdAt('ln_host', s, [-1.86, 0.32, 1.76], [-2.85, 0, 1.84], { b }); },
};
// The sitcom one is the long one: the chorus. He has his back to us, conducting; the whole audience sings the hook at the lens.
const FLIPS = [
  ['news', 0.75, [-0.5, 1.22, -1.9], [-2, 0, 0], 40, [-1.05, 0.02, 1.62], [0, 180, 0], 'IdleSit13Explain'],
  ['weather', 0.75, [-0.5, 1.5, -2.4], [-8, 0, 0], 56, [-0.5, 0.14, 0.2], [0, 180, 0], 'Idle1PointOut'],
  ['cooking', 0.75, [0.45, 2.7, -2.0], [-18, -6, 0], 56, [0, 2.3, 0.2], [0, 180, 0], 'Taunt3'],
  ['sitcom', 1.75, [-0.35, 1.3, -3.9], [-3, 180, 0], 40, [3.4, 0.02, -6], [0, 180, 0], 'Idle1ExplainB'],
  ['nature', 0.5, [-1.2, 1.0, -3.2], [0, 10, 0], 30, [0, 0.02, 0], [0, 200, 0], 'Idle1Wave'],
];
actors.mob = { model: 'turkey_brown', models: ['turkey_brown', 'turkey_white', 'turkey_black'], pos: [0, -60, 0], from: t(F - 0.25), until: t(bb(68, 1.75)), crowd: { count: 22, shape: 'scatter', radius: 3.8, inner: 1, seed: 91, modelScale: 2.1, scaleVar: 0.2, face: 5 } };
cue({ at: t(F), do: 'anim', on: 'mob', clip: 'prancing', for: '0.75b', beats: 1, offset: 1 });
cue({ at: t(F), do: 'hop', on: 'mob', height: 0.4, every: 0.5, for: '0.75b', jitter: 0.12 });
// 67:1: they stop dead and every head comes round to the lens at once, and stays.
cue({ at: t(bb(67)), do: 'anim', on: 'mob', clip: 'idle', for: '8b', blend: '0.05s' });
cue({ at: t(bb(67)), do: 'rotate', on: 'mob', rot: [0, 180, 0], for: '0.25b', ease: 'back' });
// Two doors: the news wall opens on the game show, the bare weather wall on the workout.
actors.bleed_news = { model: 'prim:quad', pos: add(O(0), [0, 2.6, 4.6]), scale: [11, 4.4, 1], portal: { offset: [180, 0, -9] }, from: t(F), until: t(F + 0.75) };
actors.bleed_wx = { model: 'prim:quad', pos: add(O(1), [0, 3, 3.8]), scale: [14, 6, 1], portal: { offset: [180, 0, -7] }, from: t(F + 0.75), until: t(F + 1.5) };
{
  let b = F;
  cue({ at: t(F), do: 'set', on: 'gs_wheel', pos: [0, 3.6, 2.4], rot: [0, 0, 0] });
  cue({ at: t(F), do: 'rotate', on: 'gs_wheel', rot: [0, 0, 720], for: '8b', ease: 'linear' });
  clean(b);
  for (const [name, len, cam, rot, fov, him, hr, clip] of FLIPS) {
    const i = SHOWS.indexOf(name), s = (p) => add(O(i), p);
    liveSet(name, b); flip(b, CH[i], 0.12);
    clean(b);
    for (const p of [['hand', 'left'], ['hand', 'right'], ['foot', 'left'], ['foot', 'right']]) cue({ at: t(b), do: 'plant', on: 'person', [p[0]]: p[1], weight: 0, for: '0.01b' });
    if (name === 'nature') lnOff(b - 0.02, b + len);
    himAt(b, s(him), hr, clip, { for: `${len + 0.5}b`, ...(clip === 'mx_jumping_jacks' ? { beats: 1, root: 'y' } : {}) });
    FLIP_ACT[name]?.(b, s, len);
    cue({ at: t(b), do: 'face', on: 'person', smile: 1, jawOpen: 0.25, fear: 0, eyesWide: 0.2, for: '0.15b' });
    cue({ at: t(b), do: 'set', on: 'mob', pos: name === 'sitcom' ? [0, -60, 0] : s([him[0], 0, him[2] + 2.4]) });
    cut({ at: t(b), shot: { name: `flip ${name}`, pos: s(cam), rot, fov, handheld: 0.5 } });
    cue({ at: t(b), pulse: { zoom: 0.1 }, for: '0.3b' });
    b += len;
  }
  // 68:1.75. He's taken the desk, the bird beside him. Hold still on the biggest smile in the film.
  const i = 7, s = (p) => add(O(i), p);
  liveSet('latenight', b); flip(b, CH[i]);
  clean(b);
  himAt(b, s([-2.85, 0.2, 1.84]), [0, 180, 0], 'IdleSit13', { for: '8bars' });
  FLIP_ACT.latenight(b, s, 0);
  // Nothing moves him from here on: the head must stay dead still on the smile.
  cue({ at: t(b), do: 'overlap', on: 'person', amount: 0, for: '0.05s' });
  for (const hand of ['left', 'right']) { cue({ at: t(b), do: 'reach', on: 'person', hand, to: s([hand === 'left' ? -3.15 : -2.55, 0.97, 1.42]), for: '0.2b', ease: 'out' }); cue({ at: t(b), do: 'fingers', on: 'person', hand, curl: 0.25, for: '0.2b' }); }
  K(b + 0.1, [{ t: 0.5, bones: { head: [-5, 0, 5] } }, { t: 1.2, bones: { head: [-2, 0, 2] } }]);
  pose(b, { ...BONES0, chest: [-6, 0, 0], neck: [-8, 0, 0] }, 0.1);
  cut({ at: t(b), shot: { name: 'the host, he smiles', pos: s([-2.85, 1.28, -0.2]), look: 'person.head', lookOffset: [0, 0.02, 0], fov: 26 } });
  cue({ at: t(b), do: 'face', on: 'person', smile: 1, jawOpen: 0, for: '0.4b', ease: 'out' });
  cue({ at: t(b), do: 'gaze', on: 'person', to: s([-2.85, 1.3, -0.6]), for: '0.2b' });
  cue({ at: t(b), tv: 'tv1', show: 'host' });
}
// The graphics of every channel at once.
GFX(F + 0.05, 'ticker', { text: "LOCAL MAN STILL BEING WATCHED  +++  100% CHANCE OF TURKEY  +++  SIDE EFFECTS MAY INCLUDE TURKEYS  +++  STAY TUNED. YOU HAVE NO CHOICE.", label: 'LIVE', color: '#c01020', speed: 760, for: '4.4b' });
GFX(F + 1.55, 'phone', { text: 'CALL 1-800-GOBBLE', color: '#18e8ff', y: 200, for: '0.9b' });
GFX(F + 0.05, 'bug', { text: 'CH ALL', box: '#c01020', for: '4.4b' });
LT(F + 4.6, 'lt_host', 0.6);

// ---------- 68:1.75. Back through the wall. ----------
{
  const b = bb(68, 1.75), o = [780, 0, 0], end = AD0;
  actors.tvwall2 = { model: 'tv', pos: add(o, [0, 0, 0]), crowd: { count: 169, shape: 'wall', spacing: 1.6, seed: 8, modelScale: 1.6, face: 0, screen: { pos: [0, 0.425, -0.302], size: [0.74, 0.555] } } };
  cue({ at: 0, do: 'hide', on: 'tvwall2' });
  cue({ at: t(b), do: 'show', on: 'tvwall2' });
  cue({ at: t(end), do: 'hide', on: 'tvwall2' });
  lights.wall_a = { type: 'spot', pos: add(o, [0, 12, -18]), rot: [6, 0, 0], angle: 95, range: 80, color: '#8fb4ff', intensity: 0 };
  // The screens carry his face: the host camera is on the late night set, so its lights stay up through the wall.
  setLights.wall = [['wall_a', 260], ...setLights.latenight];
  liveSet('wall', b);
  cue({ at: t(b), tv: 'tv1', bright: 2.2, static: 0.02 });
  cut({ at: t(b), shot: { name: 'through the wall', pos: add(o, [0, 8.36, -1.55]), move: add(o, [0, 8, -40]), rot: [0, 0, 0], fov: 46, ease: 'in' } });
}

// ---------- 68:3.75. A word from our sponsor. Clean, calm, bright, and the band doesn't stop for it. ----------
{
  const s = Set(8), S0 = AD0;
  LOOK.ad = { grade: { contrast: -4, saturation: 8, bloom: 0.4, threshold: 1.1, vignette: 0.03, grain: 0, chroma: 0, scan: 0, rgb: 0, exposure: 0.15 }, sky: { top: '#7fc0f4', mid: '#c4e6fa', bottom: '#f4fbea', fog: '#eaf6e4', ambient: '#c8d0c0', density: 0.004 } };
  s.box([0, -0.05, 0], [90, 0.1, 60], '#6cb838', { name: 'ad_lawn', smooth: 0.1 });
  s.crowd('ad_grass', { model: 'grass_big', pos: [0, 0, 1], crowd: { count: 60, shape: 'scatter', radius: 13, inner: 0, seed: 81, modelScale: 2.2, scaleVar: 0.3 } });
  // A white fence, a soft hill, two round trees. Nothing that could hurt anyone.
  for (let i = -14; i <= 14; i++) s.box([i * 0.72, 0.5, 6.5], [0.14, 1.05, 0.05], '#fbfbf6', { name: `ad_pk${i}` });
  for (const y of [0.34, 0.76]) s.box([0, y, 6.53], [21, 0.07, 0.03], '#fbfbf6', { name: `ad_rail${y}` });
  s.ball([-10, -1.5, 22], [44, 9, 14], '#7ed048', { name: 'ad_hill' });
  s.ball([9, 3.4, 13], [3.4, 3.9, 3.4], '#49a838', { name: 'ad_tree1' }); s.cyl([9, 1, 13], [0.28, 1, 0.28], '#7a5636', { name: 'ad_trunk1' });
  s.ball([-7, 2.8, 15], [3, 3.2, 3], '#57b440', { name: 'ad_tree2' }); s.cyl([-7, 0.8, 15], [0.26, 0.8, 0.26], '#7a5636', { name: 'ad_trunk2' });
  // The patient. No tie: a different bird, in the best health of its life.
  s.mover('ad_bird', 'turkey_brown_hero', [4.2, 0, 0.6], 2.3, null, { rot: [0, 270, 0] });
  alive('ad_bird', 0);
  s.mover('ad_collar', 'prim:cylinder', [0, 0, 0], [0.2, 0.024, 0.2], '#d42020', { smooth: 0.5 });
  cue({ at: 0, do: 'attach', on: 'ad_collar', to: 'ad_bird.neck3', pos: [0, 0, 0], rot: [0, 0, 0] });
  // The end card as a thing in the world, off behind the hill, so her TV can show it too. Generic: the drug's name, no company.
  s.pic('ad_card', [40, 3, 8], [16, 9]);
  spot(s, 'sun', [-9, 14, -9], [0, 0, 1], 60, '#fff6e0', 900, { shadows: true });
  s.light('fill', { type: 'point', pos: [2, 3, -5], color: '#fff8e8', range: 22 }, 18);

  cue({ at: t(S0), do: 'hide', on: 'person' });
  liveSet('ad', S0); flip(S0, 2);
  // It walks like a good dog on a good day: unhurried, head up, tail open, delighted with you.
  cue({ at: t(S0), do: 'walk', on: 'ad_bird', clip: 'walk', to: [-2.6, 0, 0.6], for: '4.75b', stride: 1.0, ease: 'linear', blend: 0 });
  cue({ at: t(S0), do: 'pose', on: 'ad_bird', bone: 'tail', rot: [-16, 0, 0], for: '0.1s' });
  neckKeys('ad_bird', S0, [[0, -14, 0, 0], [1.4, -12, 34, 0], [2.6, -18, 62, 0], [4, -18, 62, 0]], { overshoot: 0.05, settle: '0.3s' });
  cut({ at: t(S0), shot: { name: 'ad: the lawn', pos: s.at([2.2, 1.05, -4.6]), move: s.at([0.6, 1.05, -4.6]), rot: [-3, 0, 0], fov: 44, ease: 'linear', aperture: 4, focus: 'ad_bird' } });
  cut({ at: t(S0 + 2), shot: { name: 'ad: it looks at you', pos: s.at([-0.8, 1.2, -2.2]), move: s.at([-1.5, 1.2, -2.1]), look: 'ad_bird.head', fov: 30, ease: 'linear', aperture: 4 } });
  GFX(S0 + 0.2, 'image', { path: 'Assets/Shows/ad_doctor.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], for: '3.05b', in: 0.15, out: 0.1 });
  GFX(S0 + 2.05, 'image', { path: 'Assets/Shows/ad_sides.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], for: '1.2b', in: 0.12, out: 0.06 });
  GFX(S0 + 3.25, 'image', { path: 'Assets/Shows/ad_mark.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], for: '1.5b', in: 0.25, out: 0.01 });
}

// ---------- 69:4.5. Part 8. The same room, someone else, and her set is still on the sponsor when we get there. ----------
{
  const b = AD1, HERS = [40.62, 0.04, -0.8], last = bb(72, 3.75), dotOff = bb(73, 2), REMOTE = { pos: [0.034, 0.095, -0.028], rot: [35, -90, 90] };
  // She is a different person before anyone looks twice: smaller, sitting sideways with her feet up, long hair.
  // A real ring (Assets/Shows/bangle.obj), wider than the wrist, tipped and hanging a little off-centre so it sits loose. A solid cylinder here was pierced by the arm.
  actors.her_bangle = { model: 'Assets/Shows/bangle.obj', material: 'Assets/Shows/bangle_gold.mat', parent: 'person2.rightLowerArm', pos: [0, 0.205, 0], rot: [7, 0, 5], scale: [0.036, 0.006, 0.036], from: t(b) };
  cue({ at: t(b), tv: 'tv1', show: 'ad' });
  cue({ at: t(b), tv: 'tv1', bright: 0.4, static: 0.03, tint: '#8ce8ff' });
  cue({ at: t(b), do: 'set', on: 'person2', pos: HERS, rot: [0, -78, 0], scale: [0.9, 0.92, 0.9] });
  // Person2.fbx stores DeformPercent 100 on all five shape keys, so Unity imports her with eyes shut and lips pursed. Hold every key at 0; `blink` still works over it.
  cue({ at: 0, do: 'face', on: 'person2', blink: 0, smile: 0, jawOpen: 0, fear: 0, eyesWide: 0, for: '0.01b' });
  cue({ at: t(b), do: 'anim', on: 'person2', clip: 'IdleSit14', for: '40b' });
  // Back against the arm of the sofa, knees up, both feet on the cushion: real contact, the legs solved to the seat.
  cue({ at: t(b), do: 'pose', on: 'person2', bones: { spine: [-16, 0, 0], chest: [-8, 0, 0] }, for: '0.05b' });
  cue({ at: t(b), do: 'reach', on: 'person2', foot: 'left', to: [39.92, 0.5, -0.92], hint: [40.3, 1.05, -0.98], for: '0.05b' });
  cue({ at: t(b), do: 'reach', on: 'person2', foot: 'right', to: [40.0, 0.5, -0.66], hint: [40.3, 1.05, -0.6], for: '0.05b' });
  cue({ at: t(b), do: 'reach', on: 'person2', hand: 'left', to: [40.44, 0.74, -1.18], for: '0.05b' });
  cue({ at: t(b), do: 'fingers', on: 'person2', hand: 'left', curl: 0.3, for: '0.05b' });
  cue({ at: t(b), do: 'gaze', on: 'person2', to: 'tv2.screen', limit: 70, for: '0.05b' });
  // Part 1's look, exactly: black and cold, one blue TV. Nothing else in the world is on.
  cue({ at: t(b), grade: { ...GRADE0, exposure: 0.75, grain: 0.3, vignette: 0.42, contrast: 24, saturation: -24, bloom: 0.4, threshold: 1.1, chroma: 0.1 } });
  cue({ at: t(b), sky: { top: '#000000', mid: '#000000', bottom: '#000000', ambient: '#0a0d12', fog: '#000000', density: 0 } });
  cue({ at: t(b), tv: 'tv2', bright: 0.32, static: 0.03, feed: 1, tint: '#8ce8ff' });
  for (const l of ['p1_dfill', 'p1_dback']) cue({ at: t(b), light: l, intensity: 0 });
  // The glow on the wall round the set, as bar 1 has it, and the light of the screen on her.
  lights.p8_halo = { type: 'point', pos: [39.8, 1.3, 2.75], color: '#8ce8ff', range: 3.4, intensity: 0 };
  lights.p8_face = { type: 'point', pos: [40.3, 1.2, 0.55], color: '#9cdcff', range: 2.8, intensity: 0 };
  cue({ at: t(b), light: 'p8_halo', intensity: 0.5 }); cue({ at: t(b), light: 'p8_face', intensity: 2.4 });
  // The set lights her face in her close shots; the wide ones stay a silhouette.
  lights.p8_face.range = 3.6;
  for (const [at, v] of [[bb(70, 3.75), 3.5], [bb(71, 2.5), 2.4], [bb(72, 1), 7.5], [bb(72, 2.5), 2.4]]) cue({ at: t(at), light: 'p8_face', intensity: v });
  cue({ at: t(b), tvreact: 'tv2', band: 'kick', floor: 0.8, gain: 0.5, until: t(last) });
  // Slow and calm, six long holds: bar 1's frame with her shape in it; her thumb through the clicks; him on the screen while the bird looks at her, then at the corner; her lit face; the camera; the dot.
  cut({ at: t(b), shot: { name: 'the silhouette again', pos: [40.5, 1.4, -2.75], move: [40.5, 1.38, -2.4], look: 'tv2.screen', lookOffset: [0.3, 0.2, 0], fov: 36, ease: 'linear', handheld: 0.1 } });
  cut({ at: t(bb(70, 3.75)), shot: { name: 'her thumb', pos: [40.35, 1.2, -0.3], move: [40.36, 1.18, -0.33], look: 'person2.rightHand', lookOffset: [-0.06, -0.02, 0.08], fov: 26, focus: 'person2.rightHand', aperture: 16, ease: 'linear', handheld: 0.1 } });
  // She surfs: the same arm as his, the same thumb, the same room. Someone else's habit.
  cue({ at: t(b), do: 'attach', on: 'remote_2', to: 'person2.rightHand', pos: REMOTE.pos, rot: REMOTE.rot });
  // His grip (macro `grip` in 02-watching), mirrored: four fingers under it, each a little tighter toward the little finger, thumb on top.
  cue({ at: t(b), do: 'pose', on: 'person2', bones: { rightThumbProximal: [18, 0, -18], rightThumbIntermediate: [14, 0, -14] }, for: '0.05b' });
  for (const [finger, curl] of [['index', 0.62], ['middle', 0.68], ['ring', 0.72], ['pinky', 0.76], ['thumb', 0.62]]) cue({ at: t(b), do: 'fingers', on: 'person2', hand: 'right', finger, curl, for: '0.05b' });
  // The clip has her palm down: turn the forearm over so the remote lies in the palm, buttons up, thumb over them.
  cue({ at: t(b), do: 'pose', on: 'person2', bone: 'rightLowerArm', space: 'local', rot: [0, -70, 0], for: '0.05b' });
  cue({ at: t(b), do: 'layer', on: 'person2', clip: 'IdleSitPhoneTextMessage', mask: 'rightArm', weight: 1, blend: 0 });
  // Small and specific: she settles, a blink, a weight shift, chin into it.
  K(b + 1, [{ t: 1.2, bones: { head: [3, 0, -4], chest: [0, -3, 0] }, ease: 'inout' }, { t: 3, bones: { head: [1, 2, -2], chest: [-2, 0, 0] }, ease: 'inout' }], { on: 'person2' });
  for (const a of [bb(69, 3.5), bb(71, 1)]) cue({ at: t(a), do: 'blink', on: 'person2', for: '0.2s' });
  // One click on a kick, a different show each time.
  const hits = [[bb(70, 1.75), 'news'], [bb(70, 3.75), 'cooking'], [bb(71, 1.75), 'gameshow']];
  // Everything he broke is put back for the next viewer.
  cue({ at: t(bb(69)), do: 'set', on: 'gs_wheel', pos: [0, 3.6, 2.4], rot: [0, 0, 0] });
  cue({ at: t(bb(69)), do: 'set', on: 'ck_cloche', pos: [0, 9, 0.2] });
  for (const [h, name] of hits) {
    cue({ at: t(h), tv: 'tv1', show: name, sfx: 'tv_click', sfxVolume: 0.9 });
    if (lastSet !== name) { for (const [l] of setLights[lastSet] ?? []) cue({ at: t(h), light: l, intensity: 0 }); for (const [l, v] of setLights[name]) cue({ at: t(h), light: l, intensity: v }); lastSet = name; }
    cue({ at: t(h), tvflash: 'tv2', every: '0.17b', amount: 1.3, low: 0.7, for: '0.3b' });
    cue({ at: t(h - 0.12), do: 'fingers', on: 'person2', hand: 'right', finger: 'thumb', curl: 0.78, for: '0.1b' });
    cue({ at: t(h - 0.12), do: 'pose', on: 'person2', bone: 'rightHand', rot: [9, 0, 0], for: '0.1b', ease: 'out' });
    cue({ at: t(h + 0.05), do: 'pose', on: 'person2', bone: 'rightHand', rot: [0, 0, 0], for: '0.2b', ease: 'inout' });
    cue({ at: t(h + 0.05), do: 'fingers', on: 'person2', hand: 'right', finger: 'thumb', curl: 0.62, for: '0.15b' });
  }
  // The fourth click stops her. It's him, at the desk, looking right at her. He waves. The bird looks out of the set at her.
  const stop = bb(71, 2.5), back = bb(71, 4.5), she = bb(72, 1), turn = bb(72, 2.5);
  for (const [l] of setLights[lastSet] ?? []) cue({ at: t(stop), light: l, intensity: 0 });
  for (const [l, v] of setLights.latenight) cue({ at: t(stop), light: l, intensity: v });
  cue({ at: t(stop), do: 'show', on: 'person' });
  cue({ at: t(stop), tv: 'tv1', show: 'host', sfx: 'tv_click' });
  cue({ at: t(stop), tv: 'tv2', bright: 0.55, tint: '#c8e4ff', for: '0.2b' });
  cue({ at: t(stop), gfx: 'bug', on: 'feed', text: 'CH 33', for: '6b' });
  cut({ at: t(stop), shot: { name: 'the screen, it\'s him', pos: [40, 1.15, 1.75], move: [40, 1.15, 1.2], look: 'tv2.screen', fov: 34, ease: 'linear' } });
  cue({ at: t(stop + 0.2), do: 'anim', on: 'person', clip: 'IdleSit13GreetA', blend: '0.25s', for: '2.5b' });
  // The bird turns from him to the lens: it looks out of the TV at her.
  cue({ at: t(stop + 0.5), do: 'rotate', on: 'ln_host', rot: [0, 205, 0], for: '0.6b', ease: 'inout' });
  neckKeys('ln_host', stop + 0.5, [[0.6, -26, 0, 0], [1.4, -20, 0, 0]], { overshoot: 0.08, settle: '0.2s' });
  cue({ at: t(stop + 0.05), do: 'fingers', on: 'person2', hand: 'right', finger: 'thumb', curl: 0.7, for: '0.2b' });
  // Her: the thumb stays where it stopped. Her head tips, very slightly, when he waves.
  K(stop + 0.7, [{ t: 0.9, bones: { head: [2, 0, 7], chest: [3, 0, 0] }, ease: 'inout' }], { on: 'person2', release: '20b' });
  cut({ at: t(she), shot: { name: 'she stops', pos: [40.2, 1.05, 1.2], move: [40.2, 1.05, 0.95], look: 'person2.head', lookOffset: [0, 0, 0], fov: 21, ease: 'linear' } });
  cue({ at: t(she + 0.35), do: 'blink', on: 'person2', for: '0.25s' });
  // Still on the screen: the bird turns away from her, up and to the side, to the corner of the room.
  neckKeys('ln_host', back + 0.02, [[0.32, -32, -78, 0]], { overshoot: 0.08, settle: '0.15s' });
  // The corner camera answers it. A close, hard look at the thing itself: its head comes round, the light comes on.
  cut({ at: t(turn), shot: { name: 'the camera turns', pos: [41.1, 1.75, 1.05], look: 'cctv_2', fov: 20, fovTo: 11, aperture: 16 } });
  cue({ at: t(b), do: 'set', on: 'cctv_head_2', rot: [-26, -35, 0] });
  cue({ at: t(turn), do: 'rotate', on: 'cctv_head_2', rot: [-22, 37, 0], for: '1.2b', ease: 'inout' });
  cue({ at: t(turn), sfx: 'camera_servo', volume: 1 });
  cue({ at: t(turn), light: 'red2', intensity: 0.12, for: '1.25b', ease: 'in' });
  actors.p8_dot = { model: 'prim:sphere', pos: [0, -50, 0], scale: 0.03, color: '#000000', emission: '#ff0000', from: t(b), until: t(dotOff) };
  cue({ at: 0, do: 'attach', on: 'p8_dot', to: 'cctv_head_2.led' });
  // The last hit: the room goes, the red light does not. One hard dot on black, two beats, and out.
  cue({ at: t(last - 0.5), tv: 'tv2', bright: 0 });
  cut({ at: t(last), shot: { name: 'the red light', pos: [41.42, 2.2, 1.55], look: 'p8_dot', fov: 11, aperture: 16 } });
  for (const a of ['room_floor_2', 'room_ceiling_2', 'wall_n1_2', 'wall_n2_2', 'wall_s1_2', 'wall_s2_2', 'wall_w1_2', 'wall_w2_2', 'wall_e1_2', 'wall_e2_2', 'carpet1_2', 'cabinet_2', 'sofa_2', 'table_2', 'shelf1_2', 'remote_2', 'tv2', 'person2', 'her_bangle', 'cctv_base_2', 'cctv_head_2']) cue({ at: t(last), do: 'hide', on: a });
  for (const l of ['p8_halo', 'p8_face', 'red2']) cue({ at: t(last), light: l, intensity: 0 });
  cue({ at: t(last), do: 'glow', on: 'p8_dot', color: '#ff0000', power: 2.2, for: '0.05b' });
  cue({ at: t(last), sky: { top: '#000000', mid: '#000000', bottom: '#000000', ambient: '#000000', fog: '#000000', density: 0 } });
  cue({ at: t(last), grade: { ...GRADE0, bloom: 0, threshold: 2, vignette: 0, chroma: 0, grain: 0, saturation: 0, exposure: 0, contrast: 0 }, for: '0.05b' });
  // In the black: a remote. Somebody is still watching. Two seconds of promo, and off on the end of the song.
  cue({ at: '200.3s', sfx: 'tv_click', volume: 1 });
  cue({ at: '200.36s', flip: '', for: '0.18b', hold: '0b', sfx: 'channel_flip', sfxVolume: 0.25 });
  if (hasShow('Assets/Shows/next_wtks.png')) cue({ at: '200.48s', gfx: 'image', path: 'Assets/Shows/next_wtks.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], for: '2.1s', in: 0.01, out: 0.01 });
}

// Bits that were true before all of this.
cue({ at: 0, tv: 'tv2', feed: 1, bright: 1.1, static: 0.03 });

// The room TV can show any set: {"tv":"tv1","show":"news"}. The sets are lit for bars 3-9, while Part 1 plants them.
const showDefs = {
  news: { set: 'show_news', pos: [0, 1.5, -6.2], rot: [2, 0, 0], fov: 34, label: 'WTKS NEWS 4', channel: 4 },
  weather: { set: 'show_weather', pos: [0.8, 1.6, -7], rot: [-4, 0, 0], fov: 44, label: 'WTKS STORM CENTER', channel: 5 },
  cooking: { set: 'show_cooking', pos: [0, 2, -5.2], rot: [8, 0, 0], fov: 38, label: 'BASTE OF THE BEST', channel: 7 },
  gameshow: { set: 'show_gameshow', pos: [0, 2.6, -11], rot: [-5, 0, 0], fov: 46, label: 'SPIN TO LOSE', channel: 9 },
  workout: { set: 'show_workout', pos: [0, 0.8, -7.5], rot: [-4, 0, 0], fov: 46, label: 'TURKEY TONE 3000', channel: 11 },
  sitcom: { set: 'show_sitcom', pos: [0, 1.5, -6.5], rot: [2, 0, 0], fov: 40, label: "HE'S BACK!", channel: 13 },
  nature: { set: 'show_nature', pos: [-3.4, 0.9, -16], rot: [0, 12, 0], fov: 11, label: 'THE COMMON VIEWER', channel: 22 },
  latenight: { set: 'show_latenight', pos: [0.4, 1.8, -6.8], rot: [8, 0, 0], fov: 42, label: 'LATE LATE GOBBLES', channel: 33 },
  ad: { set: 'show_ad', pos: [40, 3, -6.2], rot: [0, 0, 0], fov: 32, label: 'A WORD FROM OUR SPONSOR', channel: 2 },
  host: { set: 'show_latenight', pos: [-2.42, 1.42, -1.85], rot: [3, 0, 0], fov: 25, label: 'LATE LATE GOBBLES', channel: 33 },
};
for (const name of SHOWS) for (const [l, v] of setLights[name]) { cue({ at: t(bb(3)), light: l, intensity: v }); cue({ at: t(bb(9)), light: l, intensity: 0 }); }

// Every set exists only while it's wanted, so feedcam can reach them early without paying for them all film.
const setCues = [];
const shown = (name, windows = WINDOWS) => {
  const roots = ['show_' + name, ...animated[name]];
  for (const r of roots) {
    setCues.push({ at: 0, do: 'hide', on: r });
    for (const [a, b] of windows) { setCues.push({ at: t(a), do: 'show', on: r }); setCues.push({ at: t(b), do: 'hide', on: r }); }
  }
};
// Each set runs only while something can see it: its show, its flip, its door, her clicks. All eight running through Part 8 cost about 0.7 s a frame.
{
  const P = 0.3, C1 = bb(70, 1.75), C2 = bb(70, 3.75), C3 = bb(71, 1.75), C4 = bb(71, 2.5);
  const FL = { news: [F, F + 0.75], weather: [F + 0.75, F + 1.5], cooking: [F + 1.5, F + 2.25], sitcom: [F + 2.25, F + 4], nature: [F + 4, F + 4.5] };
  const W = (a, z) => [a - P, z + P], own = (i) => [S(i) - 1, S(i + 1) + 0.5], early = [bb(3), bb(9)];
  shown('news', [early, own(0), W(...FL.news), W(C1, C2)]);
  shown('weather', [early, own(1), W(...FL.weather)]);
  shown('cooking', [early, own(2), W(...FL.cooking), W(C2, C3)]);
  // The wheel lives on this set and tours the others, and the news door looks into it.
  shown('gameshow', [early, [S(3) - 1, S(7)], W(F, F + 0.75), W(C3, C4)]);
  shown('workout', [early, own(4), W(...FL.weather)]);
  shown('sitcom', [early, own(5), W(...FL.sitcom)]);
  shown('nature', [early, own(6), W(...FL.nature)]);
  shown('latenight', [early, [S(7) - 0.02, AD0 + P], [C4 - P, bb(73)]]);
}
shown('ad', [[AD0 - 0.3, bb(70, 2)]]);
setCues.sort((a, b) => 0);

// ---------- write ----------
const line = (o) => '    ' + JSON.stringify(o);
const objBlock = (o) => Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
const models = {
  truss: 'Assets/SpaceZeta_Spotlight/Assets/SpotlightStructure1.fbx', spotlamp: 'Assets/SpaceZeta_Spotlight/Assets/Spotlight.fbx',
  kit_counter: 'Assets/AtmosphericHouse/Prefabs/Props/Kitchen_cabinets/Kitchen_counter_A.prefab', kit_stove: 'Assets/AtmosphericHouse/Prefabs/Props/Electronics/Stove.prefab',
  kit_fridge: 'Assets/AtmosphericHouse/Prefabs/Props/Electronics/Fridge.prefab', grass_big: 'Assets/CityPack7/Source/Foliage/Mesh/SM_grass_patch_a_large.fbx',
};
const find = (n) => { const stack = [path.join(ROOT, '..', 'Assets', 'AtmosphericHouse', 'Prefabs')]; while (stack.length) { const d = stack.pop(); for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) stack.push(f); else if (e.name === n) return 'Assets' + f.split('Assets').slice(1).join('Assets').replace(/\\/g, '/'); } } throw new Error('no ' + n); };
Object.assign(models, { kit_pot: find('Pot.prefab'), kit_jar: find('Jar_ceramic.prefab'), kit_plates: find('Plate_set.prefab'), kit_plant: find('Interior_plant_A.prefab'), painting: find('Painting_B.prefab'), lamp_st: find('Lamp_standing.prefab'), sofa1: find('Sofa_1seat.prefab'), coffee_mug: find('Coffee_mug.prefab') });

const head = `{
  // GENERATED by Director/tools/part7.mjs. Edit that, not this: node Director/tools/part7.mjs
  // Bars 59-73. Eight shows, the flips, the wall of TVs, the next viewer.
`;
const A = `${head}  "models": {\n${objBlock(models)}
  },
  "shows": {
${objBlock(showDefs)}\n  },\n  "actors": {\n${objBlock(actors)}\n  },\n  "lights": {\n${objBlock(lights)}\n  },\n  "cues": [\n${[...setCues, ...cues].map(line).join(',\n')}\n  ]\n}\n`;
JSON.parse(A.replace(/^\s*\/\/.*$/gm, ''));
fs.writeFileSync(path.join(ROOT, 'acts', '05-inside.json'), A);
const Bfile = `{\n  // GENERATED by Director/tools/part7.mjs. Shots for bars 58:4.5-73.\n  "cues": [\n${cuts.map(line).join(',\n')}\n  ]\n}\n`;
fs.writeFileSync(path.join(ROOT, 'acts', '07-cuts-d.json'), Bfile);
console.log(`actors ${Object.keys(actors).length}, lights ${Object.keys(lights).length}, cues ${setCues.length + cues.length}, shots ${cuts.length}`);
