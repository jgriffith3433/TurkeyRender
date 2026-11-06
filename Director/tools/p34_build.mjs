// Parts 3-4 (bars 25-40). Writes Director/acts/03-the-pull.json and empties 07-cuts-b.json.
// The keyed physics (topple, stick-slip, tumble) is why this is a script. Owner: Parts 3-4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const song = JSON.parse(fs.readFileSync(path.join(ROOT, 'song.json'), 'utf8'));
const T = (s) => { // "26:2.5" to seconds
  if (typeof s === 'number') return s;
  const [bar, beat] = s.split(':').map(Number);
  const n = song.downbeatPhase + (bar - 1) * song.meter + ((beat ?? 1) - 1), i = Math.floor(n);
  return song.beats[i] + (n - i) * (song.beats[i + 1] - song.beats[i]);
};
import { fall } from './p4_fall.mjs';
const r3 = (x) => Math.round(x * 1000) / 1000;
const cues = [], actors = {}, lights = {};
const STOP0 = 88.97;
const C = (o) => cues.push(o);
const shot = (at, name, s) => { // look at a point: turned into a rotation, since the compiler's look wants an actor
  if (Array.isArray(s.look)) {
    const d = [0, 1, 2].map((i) => s.look[i] - s.pos[i]), h = Math.hypot(d[0], d[2]);
    s = { ...s, rot: [r3(-Math.atan2(d[1], h) * 180 / Math.PI), r3(Math.atan2(d[0], d[2]) * 180 / Math.PI), 0] };
    delete s.look;
  }
  C({ at, shot: { name, aperture: 16, ...s } });
};
const on = (o, name, extra) => C({ ...extra, do: o, on: name });
const hit = (at, pulse, f = '0.75b', sharp = 2) => C({ at, pulse, for: f, sharp });

// Rigid rotation about the X axis through a floor pivot, keyed as short linear segments so the arc is a true arc.
function pivotX(name, base, baseRot, py, pz, keys) {
  const place = (deg) => {
    const a = deg * Math.PI / 180, y = base[1] - py, z = base[2] - pz;
    return [[base[0], r3(py + y * Math.cos(a) - z * Math.sin(a)), r3(pz + y * Math.sin(a) + z * Math.cos(a))], [r3(baseRot[0] + deg), baseRot[1], baseRot[2]]];
  };
  for (let i = 1; i < keys.length; i++) {
    const [t0] = keys[i - 1], [t1, d1] = keys[i], [p, r] = place(d1), len = r3(t1 - t0);
    C({ at: r3(t0), do: 'move', on: name, pos: p, for: `${len}s`, ease: 'linear' });
    C({ at: r3(t0), do: 'rotate', on: name, rot: r, for: `${len}s`, ease: 'linear' });
  }
  return place(keys[keys.length - 1][1]);
}
// A body falling over: quick start from the blast, gravity, a bounce, a settle.
function toppleKeys(t0, t1, angle) {
  const k = [], n = 10;
  for (let i = 0; i <= n; i++) { const u = i / n; k.push([t0 + (t1 - t0) * u, angle * (0.35 * u + 0.65 * u * u * u)]); }
  const d = 0.69;
  k.push([t1 + d * 0.22, angle * 0.93], [t1 + d * 0.44, angle], [t1 + d * 0.56, angle * 0.982], [t1 + d * 0.68, angle]);
  return k;
}
// Stick-slip: stay put, then lurch on each kick. Each lurch overshoots a little.
function lurches(name, from, kicks) {
  let p = from;
  for (const [at, d, f] of kicks) {
    p = [r3(p[0] + d[0]), r3(p[1] + d[1]), r3(p[2] + d[2])];
    C({ at, do: 'move', on: name, pos: p, for: f ?? '0.3b', ease: 'back' });
  }
  return p;
}

const KICKS = (from, to) => song.onsets.kick.filter((t) => t >= T(from) - 0.04 && t < T(to) - 0.04);

// ------------------------------------------------------------- actors
const FALL = [0, -100, 0]; // the fall happens down here, in the middle of the shaft, away from what's left of the set
actors.p3_paper1 = { model: 'prim:cube', pos: [-0.02, 0.44, 0.62], rot: [0, 18, 0], scale: [0.21, 0.004, 0.3], color: '#d8d4c8' };
actors.p3_paper2 = { model: 'prim:cube', pos: [0.1, 0.44, 0.82], rot: [0, -32, 0], scale: [0.21, 0.004, 0.3], color: '#c8c6c0' };
actors.p3_paper3 = { model: 'prim:cube', pos: [0.3, 0.44, 0.62], rot: [0, 70, 0], scale: [0.21, 0.004, 0.3], color: '#dad6cc' };
// Three that come out of the screen one at a time.
actors.p3_bird1 = { model: 'turkey_white_hero', pos: [0, 0.8, 2.75], rot: [32, 180, 0], scale: 0.8, from: '29:1', until: '32:1' }; // the tie bird (STORYBOARD, The nemesis)
actors.p3_tie = { model: 'Assets/MusicVideo/Props/tie.obj', material: 'Assets/MusicVideo/Props/tie.mat', pos: [0, 0.8, 2.6], scale: 0.22, from: '29:2.5', until: '32:1' };
actors.p3_bird2 = { model: 'turkey_black', pos: [-0.12, 0.72, 2.6], rot: [14, 180, 0], scale: 1.35, from: '30:1', until: '32:1' };
actors.p3_bird3 = { model: 'turkey_white', pos: [0.14, 0.72, 2.6], rot: [14, 180, 0], scale: 1.35, from: '30:1', until: '32:1' };
// The pour: they keep coming out of the glass.
actors.p3_pour = { model: 'turkey_brown', models: ['turkey_brown', 'turkey_black', 'turkey_white'], pos: [0, 0, 1.75], from: '30:3', until: '33:4.5',
  crowd: { count: 70, shape: 'scatter', radius: 1.1, seed: 7, face: 180, modelScale: 1.5, scaleVar: 0.2 } };
actors.p3_flood = { model: 'turkey_white', models: ['turkey_white', 'turkey_brown', 'turkey_black'], pos: [0, 0, 2.2], from: '31:3', until: 90,
  crowd: { count: 90, shape: 'scatter', radius: 3, seed: 17, face: 180, modelScale: 1.8, scaleVar: 0.3, yRange: [0, 0.9] } };
// Bars 34-40: tools/p4_fall.mjs writes these.

// Red is the watcher: it comes from the corner camera, and it grows.
lights.chase_fill = { type: 'spot', pos: [2.2, 2.6, 2.2], rot: [32, 218, 0], angle: 120, range: 12, color: '#ff1a10', intensity: 0 };
// The TV's cold wash down the room once the birds are out, so the chase isn't lost in the dark. And a face light for the stare.
lights.p3_wash = { type: 'directional', rot: [14, 186, 0], color: '#9fb8ff', intensity: 0 };
lights.p3_cf = { type: 'point', pos: [2.35, 0.7, -1.3], color: '#9fb8ff', intensity: 0, range: 2.4 };
lights.p3_bkey = { type: 'point', pos: [0.4, 1.25, 0.8], color: '#b4c8ff', intensity: 0, range: 2.6 };
lights.p3_stare = { type: 'spot', pos: [0.6, 1.3, 0.6], rot: [8, 15, 0], angle: 40, range: 4, color: '#a8c0ff', intensity: 0 };
lights.void_key = { type: 'directional', rot: [55, 150, 0], color: '#ffd8c0', intensity: 0, shadows: true };
lights.void_rim = { type: 'directional', rot: [-20, 20, 0], color: '#40a0ff', intensity: 0 };

// A hump running up under the carpet.
actors.p3_hump = { model: 'prim:sphere', pos: [-0.1, -0.03, -1.3], scale: [3.0, 0.2, 0.5], color: '#2a2024', from: '27:1', until: '29:1' };
// ------------------------------------------------------------- 25: THE SLAM
// The kick at 24:4.51 is the real transient. It lands in the crash zoom of Parts 1-2: the screen swells white. The snare at 25:1 cuts to the side.
C({ at: '24:4.51', tv: 'tv1', bright: 30, mask: '#ffffff', static: 0.6, feed: 0, for: '0.1b' });
C({ at: '24:4.51', tv: 'tv_r', bright: 12, for: '0.1b' });
C({ at: '24:4.51', tv: 'tv_b', bright: 12, for: '0.1b' });
hit('24:4.51', { flash: 0.5, exposure: 2.5, bloom: 4, rgb: 1.5 }, '0.5b', 1.5);
C({ at: '25:1', tvreact: 'tv1', band: 'kick', floor: 0.7, gain: 1.1, until: '29:1' });
hit('25:1', { flash: 1.1, exposure: 2.6, bloom: 5, shake: 0.4, rgb: 1.6 }, '1b', 2.4);
C({ at: '25:1', grade: { suck: 0, twist: 0, rgb: 0.06, swirl: 0, contrast: 22, saturation: 6, chroma: 0.2, grain: 0.3, vignette: 0.42, bloom: 0.5, threshold: 1.15, exposure: 0.1 } });
C({ at: '25:1', fx: 'shockwave', pos: [0, 1.2, 2.3], rot: [90, 0, 0], scale: 1.6, color2: '#ffffff' });
C({ at: '25:1', tv: 'tv1', bright: 7, tint: '#b4ccff', for: '2b', ease: 'out' });
C({ at: '25:1', tv: 'tv_r', bright: 0 });
C({ at: '25:1', tv: 'tv_b', bright: 0 });

const SITTING = [0, 0.02, -0.8];
C({ at: '25:1', do: 'set', on: 'person', pos: SITTING, rot: [0, 0, 0] });
C({ at: '25:1', do: 'anim', on: 'person', clip: 'IdleSit14' });
C({ at: '25:1', do: 'set', on: 'sofa', pos: [0, 0, -0.9], rot: [0, 0, 0] });
const SLAM = T('25:2.96'), TIP = toppleKeys(T('25:1'), SLAM, -90);
const SOFA_DOWN = pivotX('sofa', [0, 0, -0.9], [0, 0, 0], 0, -1.35, TIP);
pivotX('person', SITTING, [0, 0, 0], 0, -1.35, TIP.slice(0, 11));
// Blast: head and chest whip back, legs kick up with the seat, the hands are thrown off it. The arms are aimed in the sofa's frame, so they go over with him.
C({ at: '25:1', do: 'overlap', on: 'person', amount: 1, for: '0.05s' });
C({ at: '25:1', do: 'keys', on: 'person', successive: true, overshoot: 0.1, settle: '0.3s', keys: [{ t: 0 },
  { t: '0.5b', bones: { spine: [-10, 0, 0], chest: [-14, 0, 0], neck: [-8, 0, 0], head: [-16, 0, 0], leftUpperLeg: [-34, 0, 5], rightUpperLeg: [-44, 0, -5], leftLowerLeg: [-30, 0, 0], rightLowerLeg: [-44, 0, 0] }, ease: 'out' },
  { t: '1.9b', bones: { spine: [-6, 0, 0], chest: [-8, 4, 0], neck: [-4, 0, 0], head: [-10, 0, 0], leftUpperLeg: [-48, 0, 8], rightUpperLeg: [-30, 0, -8], leftLowerLeg: [-50, 0, 0], rightLowerLeg: [-24, 0, 0] } }], release: '0.05s' });
C({ at: SLAM, do: 'reach', on: 'person', hand: 'left', weight: 0, to: [0, 0, 0], for: '0.03s' });
C({ at: SLAM, do: 'reach', on: 'person', hand: 'right', weight: 0, to: [0, 0, 0], for: '0.03s' });
// The slam throws him: a back-roll over the top of the sofa, into the gap against the south wall.
C({ at: SLAM, do: 'ragdoll', on: 'person', for: '2.78b', impulse: [0.25, 1.5, -1.5], spin: [-200, 20, 0], floor: 0, blendIn: '0.04s', blendOut: '0.05s', seed: 3, stiff: 1.2, collide: ['sofa', 'wall_s1', 'wall_s2'] });

// The slam: everything jumps once, dust out from under it.
hit(SLAM, { flash: 0.3, shake: 1, zoom: -0.14, exposure: 1.2, chroma: 0.7 }, '1b', 3);
C({ at: SLAM, fx: 'dust', pos: [0, 0.1, -1.9], count: 160, scale: 1.6 });
C({ at: SLAM, fx: 'smoke', pos: [0, 0.2, -2.3], count: 40 });
on('jump', 'table', { at: SLAM, pos: [0, 0, 0.75], height: 0.06, for: '0.5b' });
on('jump', 'remote', { at: SLAM, pos: [0.52, 0.05, 0.86], height: 0.08, for: '0.5b' });
on('shake', 'shelf1', { at: SLAM, amount: 0.02, speed: 30, for: '1b', decay: 1 });
on('shake', 'cabinet', { at: SLAM, amount: 0.008, speed: 30, for: '1b', decay: 1 });

// Ringing quiet. The corner camera has the whole room, nothing moves, dust hangs. Grey, REC.
C({ at: '25:3.75', grade: { saturation: -100, scan: 0.4, distort: -0.3 } });
C({ at: '25:3.75', text: 'REC', style: 'fade', size: 40, pos: [0.1, 0.9, 0], color: '#ff2a18', for: '3.75b', in: 0.01, out: 0.01 });
// The picture drops out for a moment, and when it's back he's on his front, out from behind it.
hit('26:1.7', { tear: 1, exposure: -0.5 }, '0.35b', 1);
C({ at: '25:3.75', tv: 'tv1', bright: 3.2, for: '1b', ease: 'out' });
// The TV's cold wash stays up through the slam and the corner camera's view, so the room never goes black after the hit.
C({ at: '25:2.5', light: 'p3_wash', intensity: 0.9, for: '0.1b' });
C({ at: '26:1.74', light: 'p3_wash', intensity: 0.28, for: '1b', ease: 'inout' });
C({ at: '26:2.5', light: 'chase_fill', intensity: 0.6, for: '2bars' });
C({ at: '28:1.74', strobe: 'chase_fill', every: '2b', low: 0.7, high: 2.2, sharp: 2, until: '29:1' });

// ------------------------------------------------------------- 26: SMALL THINGS
C({ at: '26:3.5', grade: { saturation: 6, scan: 0, distort: 0 } });
// He's out from behind the couch, on his front, at the east end, into the light.
// The picture tears; when it's back he has rolled onto his front in the gap and is dragging himself along it, head east. Hidden by the sofa until the end of it.
const CRAWL = { clip: 'CrawlZombie', stride: 0.9 };
C({ at: '26:1.74', do: 'set', on: 'person', pos: [0.75, 0.02, -2.58], rot: [0, 90, 0] });
C({ at: '26:1.74', do: 'walk', on: 'person', ...CRAWL, to: [1.42, 0.02, -2.5], for: '2.76b', blend: '0.08s' });
C({ at: '26:4.5', do: 'walk', on: 'person', ...CRAWL, to: [1.6, 0.02, -1.8], for: '3b', blend: '0.1s' });
// The remote. One lurch on each kick.
{
  const k = KICKS('26:2.5', '29:1');
  let z = 0.86, st = 0.03;
  for (const t of k) { z = Math.min(z + st, 2.1); st *= 1.3; C({ at: r3(t), do: 'move', on: 'remote', pos: [r3(0.52 - (z - 0.86) * 0.2), 0.05, r3(z)], for: '0.28b', ease: 'back' }); }
}
C({ at: '27:1.75', do: 'move', on: 'p3_hump', pos: [-0.1, -0.03, 1.2], for: '1.5b', ease: 'in' });
C({ at: '27:3.75', do: 'set', on: 'p3_hump', pos: [-0.1, -0.03, -1.2] });
C({ at: '27:3.75', do: 'move', on: 'p3_hump', pos: [-0.1, -0.03, 1.2], for: '1b', ease: 'in' });
C({ at: '27:2.5', do: 'rotate', on: 'carpet1', rot: [-3, 0, 2], for: '1bar', ease: 'back' });
// The papers go off the table one at a time.
for (const [n, y] of [['p1_glass', 0.432], ['p1_water', 0.52]]) {
  C({ at: '26:3.75', do: 'move', on: n, pos: [-0.28, y, 0.74], for: '0.3b', ease: 'back' });
  C({ at: '26:4.5', do: 'move', on: n, pos: [-0.28, y, 0.92], for: '0.3b', ease: 'back' });
}
C({ at: '27:1.75', do: 'jump', on: 'p1_glass', pos: [-0.28, 0.08, 1.4], height: 0.05, for: '0.75b', ease: 'in' });
C({ at: '27:1.75', do: 'rotate', on: 'p1_glass', rot: [100, 0, 0], for: '0.75b', ease: 'linear' });
C({ at: '27:1.75', do: 'hide', on: 'p1_water', for: '0.1b' });
C({ at: '27:2.5', do: 'jump', on: 'p1_glass', pos: [-0.2, 0.08, 1.7], height: 0.1, for: '0.4b' });
on('move', 'p3_paper1', { at: '26:4.5', pos: [-0.1, 0.44, 0.95], for: '0.7b', ease: 'in' });
on('move', 'p3_paper2', { at: '26:4.5', pos: [0.1, 0.44, 1.05], for: '0.6b', ease: 'in' });
on('jump', 'p3_paper1', { at: '27:1', pos: [-0.1, 0.02, 1.6], height: 0.25, for: '2b', ease: 'in' });
on('rotate', 'p3_paper1', { at: '27:1', rot: [40, 90, 200], for: '2b' });
on('jump', 'p3_paper2', { at: '27:1', pos: [0.14, 0.02, 1.8], height: 0.3, for: '2b', ease: 'in' });
on('rotate', 'p3_paper2', { at: '27:1', rot: [-30, 20, 260], for: '2b' });
on('jump', 'p3_paper3', { at: '27:1.75', pos: [0.3, 0.02, 2.1], height: 0.3, for: '2b', ease: 'in' });
on('rotate', 'p3_paper3', { at: '27:1.75', rot: [80, 200, 100], for: '2b' });

// ------------------------------------------------------------- 27: THE FLOOR
// He reaches the end of the sofa, gets up on his knees and hangs on to it, looking at the TV over it. All one body: see THE DRAG below.
// The carpet: a low line down its length at the TV.
C({ at: '27:1.75', do: 'bob', on: 'carpet1', axis: [0, 1, 0], amount: 0.03, every: '0.75b', for: '3bars' });
C({ at: '27:1.75', do: 'move', on: 'carpet1', pos: [0, 0.01, 0.1], for: '2.5bars', ease: 'in' });
// The table scrapes on the kicks from here. Hard stops.
{
  const k = KICKS('27:2.5', '29:1'); let z = 0.75, st = 0.08;
  for (const t of k) { z = Math.min(z + st, 1.72); st *= 1.2; C({ at: r3(t), do: 'move', on: 'table', pos: [0, 0, r3(z)], for: '0.28b', ease: 'back' }); C({ at: r3(t), do: 'shake', on: 'table', amount: 0.012, speed: 40, for: '0.3b', decay: 1 }); }
}
on('shake', 'cabinet', { at: '27:2.5', amount: 0.006, speed: 20, for: '2bars' });
// The shelf leans over and starts walking.
// The lamp beside him leans over, drags past, and goes down. It moves out of the crawl's sightline on the cut at 26:3.5.
C({ at: '26:3.5', do: 'set', on: 'p1_lamp', pos: [1.0, 0, -1.1] });
{
  const k = KICKS('27:3.75', '29:1'); let z = -1.1, st = 0.14;
  k.forEach((t, i) => { z += st; st *= 1.3;
    C({ at: r3(t), do: 'move', on: 'p1_lamp', pos: [1.0, i >= 2 ? 0.1 : 0, r3(z)], for: '0.3b', ease: 'back' });
    if (i === 1) C({ at: r3(t), do: 'rotate', on: 'p1_lamp', rot: [80, 0, -12], for: '0.6b', ease: 'in' });
  });
}
on('rotate', 'shelf1', { at: '27:4.5', rot: [14, 0, -7], for: '1b', ease: 'back' });
{
  const k = KICKS('28:1', '29:1');
  lurches('shelf1', [-2.3, 0, 2.4], k.slice(0, 2).map((t) => [r3(t), [0.25, 0, -0.02]]));
}
on('rotate', 'shelf1', { at: '28:3', rot: [90, 0, -18], for: '1.2b', ease: 'in' });
on('move', 'shelf1', { at: '28:3', pos: [-1.8, 0.1, 2.3], for: '1.2b', ease: 'in' });

// ------------------------------------------------------------- 28: THE COUCH
// A kick, and the couch he's next to jerks. He grabs it, and he goes with it.
const act0 = (at, verb, extra) => C({ at, do: verb, on: 'person', ...extra });
const pull = KICKS('28:1', '29:1');
const KNEEL = [1.6, 0.02, -1.8], KH = 15; // where the crawl ends, and his heading there
const toLocal = (w) => { const a = KH * Math.PI / 180, d = [w[0] - KNEEL[0], w[1] - KNEEL[1], w[2] - KNEEL[2]]; return [r3(d[0] * Math.cos(a) - d[2] * Math.sin(a)), r3(d[1]), r3(d[0] * Math.sin(a) + d[2] * Math.cos(a))]; };
const yawTo = (y) => r3(y - KH);
const GRIP = { x: 1.06, z: -1.78 }; // the middle of his two hands on the sofa's east arm, before it moves
let HIM29;
{
  // THE DRAG. One keys cue, 27:3.5 to 29:4: crawl to kneel, yanked flat on the first kick, towed on each kick with both hands locked on the arm,
  // his body swinging in behind them, then the sofa stops and he pushes up. The sofa carries the hands; the root keeps him an arm's length behind them.
  const T0 = T('27:3.5'), S = (t) => `${r3(t - T0)}s`;
  const REACH = 0.72, PRONE = 'CrawlZombie@0.9';
  const hipsAt = (d, yaw) => { const a = yaw * Math.PI / 180; return [r3(GRIP.x - Math.sin(a) * REACH), 0.03, r3(GRIP.z + d - Math.cos(a) * REACH)]; };
  const keys = [{ t: 0 },
    { t: S(T('27:4.5')), pose: 'kneel', root: { pos: [0, 0, 0], rot: [0, yawTo(-75), 0] }, ease: 'inout' }];
  // A key with no pose falls back to the clip underneath (the kneel), so a hold must repeat the pose it holds.
  const holdKey = (t) => { const { pose, from, bones, root } = keys.at(-1), k = { t: S(t) }; if (pose) k.pose = pose; if (from) k.from = from; if (bones) k.bones = bones; if (root) k.root = root; return k; };
  let z = SOFA_DOWN[0][2], st = 0.36, d = 0;
  const n = pull.length;
  pull.forEach((t, i) => {
    z += st; d += st; st *= 1.3;
    const yaw = -62 + 44 * (i / Math.max(1, n - 1)), side = i % 2 ? 1 : -1, hit = r3(t);
    C({ at: hit, do: 'move', on: 'sofa', pos: [SOFA_DOWN[0][0], SOFA_DOWN[0][1], r3(z)], for: '0.35b', ease: 'back' });
    C({ at: hit, do: 'shake', on: 'sofa', amount: 0.02, speed: 40, for: '0.4b', decay: 1 });
    keys.push(holdKey(t - 0.02));
    keys.push({ t: S(t + (i ? 0.26 : 0.34)), from: PRONE, ease: 'out', root: { pos: toLocal(hipsAt(d, yaw)), rot: [0, yawTo(yaw), 0] },
      bones: { spine: [-8, 0, 0], chest: [-12, 0, 0], head: [-22, 8 * side, 0], neck: [-14, 0, 0], leftUpperLeg: [0, 0, 7 * side], rightUpperLeg: [0, 0, 7 * side], leftLowerLeg: [-14 - 10 * side, 0, 0], rightLowerLeg: [-14 + 10 * side, 0, 0] } });
    if (i === n - 1) keys.at(-1).overshoot = 0.08;
  });
  const end = hipsAt(d, -18);
  // It stops. He lies there one beat, lifts his head, pushes up, turns to the screen.
  HIM29 = [r3(end[0] + 0.05), 0.02, r3(end[2] + 0.05)]; end[1] = 0.1;
  const faceTV = r3(Math.atan2(0 - HIM29[0], 2.2 - HIM29[2]) * 180 / Math.PI);
  keys.push(holdKey(T('29:1.6')));
  keys.push({ t: S(T('29:2.3')), from: PRONE, ease: 'inout', bones: { spine: [-16, 0, 0], chest: [-22, 0, 0], neck: [-8, 0, 0], head: [-14, 0, 0] }, root: { pos: toLocal(end), rot: [0, yawTo(-10), 0] } });
  keys.push({ t: S(T('29:3.3')), pose: 'kneel', ease: 'inout', overshoot: 0.08, settle: '0.4s', root: { pos: toLocal(HIM29), rot: [0, yawTo(faceTV), 0] } });
  C({ at: T0, do: 'set', on: 'person', pos: KNEEL, rot: [0, KH, 0] });
  C({ at: T0, do: 'anim', on: 'person', clip: 'IdleKneelInjuredB', blend: '0.55s' });
  C({ at: T0, do: 'keys', on: 'person', keys, release: '0.5s' });
  // Hands: up onto the arm, shut, locked to it until it stops.
  const spot = (dz) => [1.0, r3(-1.35 - (GRIP.z + dz)), 0.17];
  C({ at: '27:4', do: 'gaze', on: 'person', to: 'tv1.screen', for: '1b', ease: 'inout' });
  C({ at: '27:3.9', do: 'reach', on: 'person', hand: 'left', to: 'sofa', offset: spot(-0.18), for: '0.5b', ease: 'out' });
  C({ at: '28:1', do: 'reach', on: 'person', hand: 'right', to: 'sofa', offset: spot(0.18), for: '0.5b', ease: 'out' });
  C({ at: '27:4.4', do: 'fingers', on: 'person', hand: 'left', curl: 0.9, for: '0.15b' });
  C({ at: '28:1.5', do: 'fingers', on: 'person', hand: 'right', curl: 0.9, for: '0.15b' });
  C({ at: '27:4.5', do: 'plant', on: 'person', hand: 'left', to: 'sofa', blend: '0.05s', follow: 0.3 });
  C({ at: '28:1.5', do: 'plant', on: 'person', hand: 'right', to: 'sofa', blend: '0.05s', follow: 0.3 });
}
C({ at: '27:1', for: '2bars', grade: { suck: 0.08, twist: 0.12, wave: 0.2, suckRadius: 7 }, ease: 'in' });
C({ at: '26:1.74', onsets: 'kick', until: '29:1', pulse: { zoom: -0.05, shake: 0.07, chroma: 0.2 }, for: '0.5b' });

// ------------------------------------------------------------- 29: IT STOPS. ONE BIRD.
C({ at: '29:1', grade: { suck: 0, twist: 0, wave: 0 } });
C({ at: '27:1.75', light: 'p3_cf', intensity: 1.2 });
C({ at: '29:1', light: 'p3_cf', intensity: 0, for: '0.5b' });
C({ at: '29:3', light: 'p3_stare', intensity: 5, for: '0.5b' });
C({ at: '29:2.4', light: 'p3_bkey', intensity: 2.6, for: '0.2b' });
C({ at: '29:3.4', light: 'p3_bkey', intensity: 1.5, for: '0.4b' });
C({ at: '30:3', light: 'p3_bkey', intensity: 0, for: '0.5b' });
C({ at: '30:3', light: 'p3_stare', intensity: 0, for: '0.5b' });
C({ at: '30:3', light: 'p3_wash', intensity: 0.7, for: '1b' });
C({ at: '33:4.46', light: 'p3_wash', intensity: 0 });
C({ at: '29:1', tv: 'tv1', bright: 1.1, static: 0.5, for: '0.5b' });
C({ at: '29:1', light: 'chase_fill', intensity: 1, for: '1b' });
C({ at: '29:3.5', do: 'anim', on: 'person', clip: 'IdleKneelInjuredA', blend: '0.5s' });
C({ at: '30:1', do: 'anim', on: 'person', clip: 'GoToKneelHandsUp', once: 1, speed: 1, blend: '0.4s' });
// The glass takes the push. Blocked with a head just coming through until the skin lands.
// The glass is skin: the head comes against it from inside, stretches it out over itself, and tears through on 29:2.5.
C({ at: '29:1.74', tv: 'tv1', bright: 1.5, for: '0.3b' });
C({ at: '29:1.5', do: 'glass', on: 'tv1', amount: 1, push: 'p3_bird1.head:0.12,p3_bird1.neck3:0.09', for: '0.1b' });
C({ at: '29:2.5', do: 'glass', on: 'tv1', open: 1, for: '0.4b' });
C({ at: STOP0, do: 'glass', on: 'tv1', amount: 0, open: 0, for: '0.05b' });
C({ at: '29:1', do: 'attach', on: 'p3_tie', to: 'p3_bird1.neck3', pos: [0, -0.04, 0.035], rot: [0, 0, 0] });
C({ at: '29:1', do: 'anim', on: 'p3_bird1', clip: 'idle' });
on('move', 'p3_bird1', { at: '29:1.74', pos: [0, 0.82, 2.54], for: '0.75b', ease: 'out' });
on('move', 'p3_bird1', { at: '29:2.5', pos: [0, 0.74, 1.9], for: '0.5b', ease: 'in' });
on('rotate', 'p3_bird1', { at: '29:2.5', rot: [0, 180, 0], for: '0.5b' });
on('jump', 'p3_bird1', { at: '29:3', pos: [0, 0.43, 1.72], height: 0.3, for: '0.5b' });
on('scale', 'p3_bird1', { at: '29:3', to: 1.35, for: '0.5b', ease: 'back' });
C({ at: '29:3.5', do: 'anim', on: 'p3_bird1', clip: 'prancing', beats: 1 });
C({ at: '29:4.25', do: 'anim', on: 'p3_bird1', clip: 'idle' });
on('rotate', 'p3_bird1', { at: '29:4.5', rot: [0, r3(Math.atan2(HIM29[0], HIM29[2] - 1.72) * 180 / Math.PI), 8], for: '0.2b', ease: 'back' });

// ------------------------------------------------------------- 30: THEY COME
on('move', 'p3_bird2', { at: '30:2.5', pos: [-0.12, 0.72, 1.95], for: '0.5b', ease: 'in' });
on('rotate', 'p3_bird2', { at: '30:2.5', rot: [0, 180, 0], for: '0.5b' });
on('jump', 'p3_bird2', { at: '30:2.9', pos: [-0.5, 0.02, 1.5], height: 0.3, for: '0.5b' });
on('move', 'p3_bird3', { at: '30:3', pos: [0.14, 0.72, 1.95], for: '0.3b', ease: 'in' });
on('rotate', 'p3_bird3', { at: '30:3', rot: [0, 180, 0], for: '0.3b' });
on('jump', 'p3_bird3', { at: '30:3.3', pos: [0.55, 0.02, 1.5], height: 0.3, for: '0.5b' });
C({ at: '30:2.5', tv: 'tv1', bright: 2.6, static: 0.2, for: '0.2b' });
C({ at: '30:1.74', tvreact: 'tv1', band: 'kick', floor: 0.8, gain: 1.4, until: '33:1' });
// He backs away, then turns and goes.
// He scrambles up off his knees going backward, never taking his eyes off them, then spins and runs.
const BACK = [r3(HIM29[0] + 0.08), 0.02, r3(HIM29[2] - 0.28)];
C({ at: '30:2.5', do: 'walk', on: 'person', clip: 'WalkBackwardsScared', to: BACK, for: '1.25b', stride: 0.7, face: 0, blend: '0.4s' });
C({ at: '30:3', do: 'anim', on: 'p3_bird1', clip: 'runAngry', beats: 1 });
C({ at: '30:3', do: 'anim', on: 'p3_bird2', clip: 'runAngry', beats: 1 });
C({ at: '30:3', do: 'anim', on: 'p3_bird3', clip: 'runAngry', beats: 1 });
on('move', 'p3_bird1', { at: '30:3.3', pos: [0.5, 0.02, -1.6], for: '2.5b', ease: 'in' });
on('move', 'p3_bird2', { at: '30:3.4', pos: [0.1, 0.02, -1.8], for: '2.8b', ease: 'in' });
on('move', 'p3_bird3', { at: '30:3.5', pos: [1.1, 0.02, -1.5], for: '2.6b', ease: 'in' });
C({ at: '30:3', do: 'anim', on: 'p3_pour', clip: 'runAngry', beats: 1, offset: 1 });
C({ at: '30:3', do: 'pop', on: 'p3_pour', for: '0.4b', stagger: 0.09 });
C({ at: '30:3', do: 'move', on: 'p3_pour', pos: [0.7, 0, -6], rel: 1, for: '6b', stagger: 0.09, ease: 'in' });
// Run. Screen right, the door is at x=1.5 on the south wall. The pull holds him: it takes a bar and a half.
const DOOR = [1.88, 0.02, -2.38];
C({ at: '30:3.75', do: 'walk', on: 'person', clip: 'RunForwardUnarmed', to: DOOR, for: '1.25b', stride: 1.2, turn: '0.2b', blend: '0.12s' });
C({ at: '30:3.75', do: 'pose', on: 'person', bones: { spine: [14, 0, 0], chest: [14, 0, 0], head: [-16, 0, 0] }, for: '0.3b', ease: 'out' });
C({ at: '30:3', steps: 12, for: '3.2bars' });
C({ at: '30:3', tv: 'tv1', bright: 4, static: 0, for: '1b' });
C({ at: '30:3', light: 'chase_fill', intensity: 3, for: '1b' });
C({ at: '30:3', strobe: 'chase_fill', every: '1b', low: 0.6, high: 1.8, sharp: 2, until: '33:1' });

// ------------------------------------------------------------- 31: THE DOOR
// Behind the door: packed solid, floor to lintel, every bird looking at him. The tie bird is in front, at his eye level. It must read in one look.
const WALLON = '31:1.74'; // the door starts to swing: nothing behind it exists before that
actors.p3_doorback = { model: 'prim:cube', pos: [1.5, 1.05, -3.5], scale: [1.3, 2.3, 0.1], color: '#000000', from: WALLON, until: '32:1' };
{ // A crush of bodies: every bird its own place, size and turn, each on its own part of the idle.
  const WB = ['turkey_black', 'turkey_brown', 'turkey_white', 'turkey_black', 'turkey_brown'];
  let n = 7; const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647, v = (a) => (rnd() * 2 - 1) * a;
  [0.02, 0.46, 0.92, 1.36].forEach((y, r) => { for (const [z, k] of [[-3.12, 0], [-3.3, 1]]) for (let i = 0; i < 4; i++) {
    const name = `p3_dw${r}${k}${i}`;
    actors[name] = { model: WB[(r * 2 + k + i * 3) % 5], pos: [r3(1.1 + i * 0.27 + k * 0.09 + v(0.07)), r3(y + (y ? v(0.09) : 0)), r3(z + v(0.05))], rot: [r3(v(9)), r3(v(32)), r3(v(10))], scale: r3(1.25 * (1 + v(0.16))), from: WALLON, until: '32:1' };
    C({ at: WALLON, do: 'anim', on: name, clip: 'idle', offset: r3(rnd()) });
  } });
}
actors.p3_dwtie = { model: 'turkey_white_hero', pos: [1.5, 0.74, -3.02], rot: [0, 0, 0], scale: 1.05, from: WALLON, until: '32:1' };
actors.p3_dwtiet = { model: 'Assets/MusicVideo/Props/tie.obj', material: 'Assets/MusicVideo/Props/tie.mat', pos: [1.5, 0.8, -2.9], scale: 0.17, from: WALLON, until: '32:1' };
lights.p3_dwl = { type: 'spot', pos: [1.5, 2.15, -1.7], rot: [52, 180, 0], angle: 70, range: 4.5, color: '#fff2e4', intensity: 0 };
C({ at: '31:1', do: 'attach', on: 'p3_dwtiet', to: 'p3_dwtie.neck3', pos: [0, -0.04, 0.035], rot: [0, 0, 0] });
C({ at: WALLON, do: 'anim', on: 'p3_dwtie', clip: 'idle' });
actors.p3_door = { model: 'prim:cube', pos: [1.5, 1.02, -2.84], scale: [0.94, 2.04, 0.05], color: '#4a3a2c', until: '32:4' };
actors.p3_knob = { model: 'prim:sphere', parent: 'p3_door', pos: [0.37, -0.02, 0.06], scale: [0.065, 0.065, 0.065], color: '#a08a50', smooth: 0.7, metal: 0.8, until: '32:4' };
actors.p3_knobr = { model: 'prim:cylinder', parent: 'p3_door', pos: [0.37, -0.02, 0.03], rot: [90, 0, 0], scale: [0.03, 0.03, 0.03], color: '#a08a50', smooth: 0.6, metal: 0.8, until: '32:4' };
{
  const O = T('31:1.74');
  for (let i = 1; i <= 6; i++) {
    const a = 112 * (1 - Math.pow(1 - i / 6, 2.4)), r = a * Math.PI / 180, t0 = O + (i - 1) * 0.1;
    C({ at: r3(t0), do: 'move', on: 'p3_door', pos: [r3(1.03 + Math.cos(r) * 0.47), 1.02, r3(-2.84 + Math.sin(r) * 0.47)], for: '0.1s', ease: 'linear' });
    C({ at: r3(t0), do: 'rotate', on: 'p3_door', rot: [0, r3(-a), 0], for: '0.1s', ease: 'linear' });
  }
}
// He hits the door, left hand on the handle, rattles it, hauls it open and it swings past him. Then he steps into the doorway and stops dead.
C({ at: '31:1', do: 'set', on: 'person', pos: DOOR, rot: [0, 180, 0] });
C({ at: '31:1', do: 'anim', on: 'person', clip: 'IdleBreathe', blend: '0.15s' });
C({ at: '31:1', do: 'pose', on: 'person', bones: { spine: [0, 0, 0], chest: [12, 0, 0], head: [0, 0, 0] }, for: '0.25b', ease: 'out', overshoot: 0.2, settle: '0.3s' });
C({ at: '31:1', do: 'reach', on: 'person', hand: 'right', to: [1.6, 1.3, -2.8], for: '0.25b', ease: 'out' });
C({ at: '31:1', do: 'fingers', on: 'person', hand: 'right', curl: 0.15, for: '0.1b' });
C({ at: '31:1.25', do: 'plant', on: 'person', hand: 'right', to: 'p3_door', blend: '0.05s', for: '0.4b', release: '0.1s', follow: 0 });
C({ at: '31:1.75', do: 'reach', on: 'person', hand: 'right', weight: 0, to: [0, 0, 0], for: '0.3b' });
C({ at: '31:1', light: 'p3_dwl', intensity: 1.4, for: '0.2b' });
C({ at: '31:1', do: 'reach', on: 'person', hand: 'left', to: 'p3_knob', offset: [0, 0, 0.035], for: '0.25b', ease: 'out' });
C({ at: '31:1.25', do: 'fingers', on: 'person', hand: 'left', curl: 0.85, for: '0.1b' });
C({ at: '31:1.3', do: 'plant', on: 'person', hand: 'left', to: 'p3_knob', offset: [0, 0, 0.035], blend: '0.05s', for: '0.6b', release: '0.1s', follow: 0.2 });
C({ at: '31:1.3', do: 'pose', on: 'person', bone: 'chest', rot: [12, -7, 0], for: '0.12b', ease: 'out' });
C({ at: '31:1.45', do: 'pose', on: 'person', bone: 'chest', rot: [12, 7, 0], for: '0.12b', ease: 'out' });
C({ at: '31:1.6', do: 'pose', on: 'person', bone: 'chest', rot: [-4, 8, 0], for: '0.2b', ease: 'out' });
C({ at: '31:1.9', do: 'reach', on: 'person', hand: 'left', weight: 0, to: [0, 0, 0], for: '0.2b' });
C({ at: '31:1.9', do: 'fingers', on: 'person', hand: 'left', curl: 0.1, for: '0.3b' });
// The door swings, the light comes on them, he sees it and goes straight back, eyes on them. Mocap: arms from the scared walk.
C({ at: '31:2.2', light: 'p3_dwl', intensity: 4.5, for: '0.2b' });
C({ at: '31:4.6', light: 'p3_dwl', intensity: 2, for: '0.5b' });
C({ at: '32:1', light: 'p3_dwl', intensity: 0, for: '0.1b' });
C({ at: '31:2.5', do: 'walk', on: 'person', clip: 'WalkBackwardsScared', to: [1.08, 0.02, -1.95], for: '1.25b', stride: 0.8, face: 0, blend: '0.2s' });
C({ at: '31:2.5', do: 'layer', on: 'person', clip: 'ScaredHostage', mask: 'arms', for: '2b', blend: '0.2s' });
act0('31:2.5', 'face', { jawOpen: 0.7, eyesWide: 1, fear: 1, for: '0.2b', ease: 'out' });
act0('31:3.3', 'blink', { for: '0.12s' });
C({ at: '31:3.75', do: 'anim', on: 'person', clip: 'ScaredHostage', blend: '0.15s' });

// ------------------------------------------------------------- 32: THE FLOOD
// 31:3.75: the wall bursts. The ones in the door come out first, the room fills behind them, all running up the room toward the screen.
actors.p3_burst = { model: 'turkey_white', models: ['turkey_black', 'turkey_brown', 'turkey_white'], pos: [1.5, 0, -2.75], from: '31:3.75', until: 90, crowd: { count: 46, shape: 'scatter', radius: 0.5, seed: 23, face: 0, modelScale: 1.6, scaleVar: 0.25, yRange: [0, 0.9] } };
C({ at: '31:3.75', do: 'hide', on: ['p3_pour'], for: '0.02b' });
C({ at: '31:3.75', do: 'hide', on: ['p3_door'], for: '0.02b' });
C({ at: '31:3.75', do: 'anim', on: 'p3_burst', clip: 'runAngry', beats: 1, offset: 1 });
C({ at: '31:3.75', do: 'pop', on: 'p3_burst', for: '0.2b', stagger: 0.01 });
C({ at: '31:3.75', do: 'move', on: 'p3_burst', pos: [-1.05, 0, 4.4], rel: 1, for: '5b', stagger: 0.012, ease: 'linear' });
C({ at: '31:4', do: 'set', on: 'p3_flood', pos: [0.7, 0, -1.6] });
C({ at: '31:4', do: 'anim', on: 'p3_flood', clip: 'runAngry', beats: 1, offset: 1 });
C({ at: '31:4', do: 'pop', on: 'p3_flood', for: '0.4b', stagger: 0.02 });
C({ at: '31:4', do: 'move', on: 'p3_flood', pos: [-0.3, 0, 2.4], rel: 1, for: '7b', stagger: 0.012, ease: 'linear' });
// They hit him at 31:4.5 and he goes over backward onto them: carried up the room on their backs, on his back, feet to the door, thrashing. Always under the ceiling. No ragdoll: he is keyed, so he can't leave the room.
C({ at: '31:4.5', do: 'anim', on: 'person', clip: 'FallingUnarmed', speed: 1.2, blend: '0.15s' });
{ const bob = [[0.3, [0, 0.42, -0.3], [-42, 0, 0]], [1, [0.05, 1.05, -0.95], [-74, 4, -6]], [2, [0.2, 1.16, -1.45], [-82, -8, 8]], [3, [0.3, 1.04, -2.0], [-76, 10, -8]], [4, [0.52, 1.18, -2.45], [-84, -6, 6]], [5, [0.62, 1.08, -2.9], [-78, 8, -6]], [6, [0.8, 1.2, -3.05], [-84, 0, 4]], [6.9, [0.9, 1.14, -3.15], [-80, 0, 0]]];
  C({ at: '31:4.5', do: 'keys', on: 'person', successive: true, keys: [{ t: 0 }, ...bob.map(([b, pos, rot]) => ({ t: `${b}b`, root: { pos, rot }, ease: b < 1 ? 'out' : undefined }))], release: '0.3s' }); }
// One wall at a time, on the kicks. East, west, then behind him, then the ceiling.
// The TV's own wall stays: one wall, one TV, the red light hanging in nothing.
const peel = [['32:2.5', 'wall_w1'], ['32:3', ['wall_s1', 'wall_s2']], ['32:3.4', 'wall_e1'], ['32:3.75', 'room_ceiling'], ['32:4.2', 'wall_w2'], ['32:4.5', 'wall_e2']];
for (const [at, who] of peel) C({ at, do: 'suck', on: who, for: '1.4b', swirl: 100, tumble: 200 });
C({ at: '32:1.75', sky: { top: '#701408', mid: '#e02a10', bottom: '#300404', ambient: '#5a3038', fog: '#a02010', density: 0.012 }, for: '1.6bars' });
C({ at: '31:3.75', light: 'void_key', intensity: 1.6, color: '#ff3a20', for: '1b' });
C({ at: '31:3.75', light: 'void_rim', intensity: 2.2, color: '#ff5030', for: '1b' });
C({ at: '31:4.5', for: '6b', grade: { suck: 0.2, twist: 0.4, wave: 0.4, suckRadius: 7 }, ease: 'in' });
C({ at: '30:3', onsets: 'kick', until: '33:1', pulse: { zoom: -0.07, shake: 0.1, swirl: 0.15, chroma: 0.25 }, for: '0.5b' });
C({ at: '30:3', onsets: 'snare', until: '33:1', pulse: { rgb: 0.25 }, for: '0.4b' });
C({ at: '31:4', repeat: '1b', until: '33:1', fx: 'feathers', pos: [1.0, 0.9, -1.0], count: 22, speed: 6, for: '3s' });

// ------------------------------------------------------------- 33: THE MUSIC CUTS
// The band stops at 88.97, not on the bar line. The picture stops with it.
const STOP = 88.97;
C({ at: STOP - 0.03, speed: 0.02, for: 0.06 });
C({ at: STOP, grade: { suck: 0, twist: 0, wave: 0, bloom: 1.4, threshold: 0.7 } });
C({ at: STOP, light: 'red', intensity: 3, for: '1b' });
C({ at: STOP, light: 'cctv_fill', intensity: 0.6 });
C({ at: STOP, pulse: { flash: 0.8, zoom: -0.2 }, for: '1b', sharp: 4, flashColor: '#ff1008' });
C({ at: STOP, sky: { top: '#0a0000', mid: '#240404', bottom: '#0a0000', ambient: '#301010', fog: '#100000', density: 0.02 } });
C({ at: 90.0, light: 'cctv_fill', intensity: 0 });
C({ at: STOP, do: 'set', on: 'feedcam', pos: [2.3, 2.75, 2.3], rot: [-5, 224, 0] });
C({ at: STOP, do: 'fov', on: 'feedcam', to: 40, for: 0.05 });
hit(90.0, { flash: 1 }, '0.1s', 1);
C({ at: 90.0, text: "SOMEBODY'S", style: 'slam', size: 170, for: 0.48, pos: [0.5, 0.5, 0], color: '#ff2a18', in: 0.08, out: 0.01 });
C({ at: 90.0, tv: 'tv1', feed: 1, bright: 1.4, static: 0, mask: '#ffffff', tint: '#ffffff' });
C({ at: 90.0, tvreact: 'tv1', band: 'vocal', floor: 1, gain: 0, for: 0.1 });
C({ at: 90.0, do: 'hide', on: ['p3_flood', 'p3_pour', 'p3_burst'], for: 0.05 });
C({ at: 90.48, text: 'WATCHING', style: 'slam', size: 170, for: 0.32, pos: [0.5, 0.5, 0], color: '#ffffff', in: 0.08, out: 0.01 });
C({ at: 90.8, text: 'ME', style: 'slam', size: 300, for: '0.45b', pos: [0.5, 0.5, 0], color: '#ff2a18', in: 0.08, out: 0.05 });

// ------------------------------------------------------------- 34-40: THE FALL
const GO = r3(T('33:4.46'));

// ------------------------------------------------------------- THE SHOTS
// Part 3 target 1.5-2 cuts a bar, Part 4 1-2. Long takes with several events in them; the energy is in the frame.
shot('25:1', 'the blast, from the side', { pos: [-2.8, 0.82, -0.2], look: [0.4, 0.72, -0.2], fov: 64, handheld: 0.35 });
// Low in the corner beside the fall, not under it: the sofa comes down past the lens and he goes over it, TV-lit, instead of a black back filling the frame.
shot('25:2.5', 'it comes down', { pos: [1.72, 0.22, -2.72], look: [-0.2, 0.62, -1.15], fov: 58, handheld: 0.3 });
shot('25:3.75', 'it watches', { pos: [2.2, 2.5, 2.2], look: [0.3, 0.3, -1.6], fov: 40 });
// One low take: remote, glass, papers, carpet, table, all going the same way.
shot('26:3.5', 'everything starts to go', { pos: [-2.05, 0.62, 0.35], move: [-1.5, 0.56, 0.75], look: [0.1, 0.34, 1.25], fov: 46, ease: 'linear', handheld: 0.12 });
shot('27:1.75', 'the crawl', { pos: [2.72, 0.44, -0.8], move: [2.68, 0.48, -1.05], look: 'person.head', fov: 46, ease: 'linear', handheld: 0.2, focus: 'person.head' });
shot('27:3.75', 'over his shoulder', { pos: [2.85, 1.1, -2.2], move: [2.7, 1.05, -1.9], look: [-0.3, 0.7, 1.2], fov: 50, ease: 'linear', handheld: 0.25 });
shot('28:2.5', 'dragged', { pos: [2.7, 0.4, -2.3], move: [2.7, 0.5, -0.4], look: 'person.chest', fov: 46, ease: 'out', handheld: 0.5, focus: 'person.head' });
shot('29:1', 'it stops', { pos: [2.2, 1.05, -2.0], move: [2.05, 1.0, -1.6], look: 'tv1.screen', fov: 30, ease: 'linear' });
shot('29:1.6', 'the glass stretches', { pos: [0.5, 1.02, 0.55], move: [0.42, 1.02, 0.78], look: [0, 1.04, 2.2], fov: 30, ease: 'in', focus: 'tv1.screen' });
shot('29:2.5', 'one bird', { pos: [0.4, 1.12, 0.5], move: [0.32, 1.1, 0.85], look: 'p3_bird1', lookOffset: [0, 0.62, 0], fov: 30, ease: 'linear' });
{ const a = Math.atan2(0 - HIM29[0], 2.2 - HIM29[2]); shot('30:1', 'he looks at it', { pos: [r3(HIM29[0] + Math.sin(a) * 1.15 + 0.22), 0.98, r3(HIM29[2] + Math.cos(a) * 1.15 + 0.1)], look: 'person.head', lookOffset: [0, 0.05, 0], fov: 26, focus: 'person.head' }); }
shot('30:2.5', 'a second, a third', { pos: [0.9, 1.45, -2.3], look: 'tv1.screen', fov: 44, handheld: 0.3 });
shot('30:3.75', 'what they see', { pos: [1.65, 1.15, 0.7], move: [1.5, 1.2, -1.4], look: 'person.chest', fov: 54, ease: 'linear', handheld: 0.7 });
// The door: past his shoulder, the doorway fills the frame. Then they burst, then we go with him up the room, close, always on him.
shot('31:2.5', 'the wall of birds', { pos: [2.35, 1.42, -0.45], move: [2.3, 1.38, -0.68], look: [1.3, 1.02, -2.9], fov: 38, ease: 'out', handheld: 0.15, aperture: 32 });
shot('31:3.75', 'they burst', { pos: [0.2, 1.75, -0.5], look: 'person.chest', fov: 58, handheld: 0.8, focus: 'person.head' });
shot('32:1', 'carried', { pos: [1.95, 2.3, -1.25], move: [1.45, 2.3, 0.75], look: 'person.chest', fov: 44, ease: 'linear', handheld: 0.6, focus: 'person.head' });
shot(STOP, 'THE RED LIGHT', { pos: [1.7, 2.2, 1.75], move: [2.12, 2.58, 2.2], look: 'cctv_led', fov: 26, fovTo: 12, fovEase: 'in', ease: 'in' });
shot(90.48, 'the feed', { pos: [0, 1.25, 1.65], look: 'tv1.screen', fov: 42, fovTo: 30, fovEase: 'out' });
shot(90.8, 'him, caught', { pos: [0.9, 4.3, -1.3], look: 'person.head', lookOffset: [0, 0.06, 0], fov: 30, focus: 'person.head' });

// ------------------------------------------------------------- ACTING, on top of the clips
const act = (at, verb, extra) => C({ at, do: verb, on: 'person', ...extra });
// 25: arms thrown up by the blast, mouth open, all the way down.
act('25:1', 'face', { jawOpen: 0.9, for: '0.3b', ease: 'out' });
act('25:1', 'reach', { hand: 'left', to: 'sofa', offset: [-0.5, 1.28, 0.34], for: '0.5b', ease: 'out' });
act('25:1', 'reach', { hand: 'right', to: 'sofa', offset: [0.5, 1.22, 0.42], for: '0.42b', ease: 'out' });
act('25:1', 'fingers', { hand: 'left', curl: 0.1, for: '0.2b' });
act('25:1', 'fingers', { hand: 'right', curl: 0.1, for: '0.2b' });
act('26:1.74', 'face', { jawOpen: 0.3, for: '0.2b' });
act('26:1.74', 'gaze', { to: 'tv1.screen', limit: 34, for: '2b', ease: 'inout' });
act('27:3.75', 'face', { jawOpen: 0.15, eyesWide: 0.7, for: '1b' });
// 28: the sofa yanks him flat. Mouth open. It stops: let go, breathe.
act(pull[0], 'face', { jawOpen: 0.7, fear: 0.7, for: '0.2b' });
act('29:1.4', 'plant', { hand: 'left', weight: 0, for: '0.25b' });
act('29:1.5', 'plant', { hand: 'right', weight: 0, for: '0.25b' });
act('29:1.4', 'reach', { hand: 'left', weight: 0, to: [0, 0, 0], for: '0.3b' });
act('29:1.5', 'reach', { hand: 'right', weight: 0, to: [0, 0, 0], for: '0.3b' });
act('29:1.4', 'fingers', { hand: 'left', curl: 0.3, for: '0.3b' });
act('29:1.5', 'fingers', { hand: 'right', curl: 0.3, for: '0.3b' });
act('29:1.4', 'face', { jawOpen: 0.25, fear: 0.5, for: '0.5b' });
act('29:1.74', 'gaze', { to: 'p3_bird1', offset: [0, 0.8, 0], for: '0.5b', ease: 'inout' });
// The stare. Dead still, then one slow blink, the jaw sags, the head tips with the bird's, a swallow of nothing.
act('29:3.5', 'pose', { bones: { head: [-8, 0, 0], neck: [-3, 0, 0] }, for: '0.5b', ease: 'inout' });
act('30:1.3', 'pose', { bones: { neck: [0, 0, 0] }, for: '0.7b', ease: 'inout' });
act('30:1', 'face', { eyesWide: 0.9, fear: 0.55, jawOpen: 0.12, for: '0.5b', ease: 'out' });
act('30:1.5', 'blink', { for: '0.32b' });
act('30:1.7', 'pose', { bone: 'head', rot: [8, 0, 9], for: '0.5b', ease: 'inout' });
act('30:2.2', 'face', { jawOpen: 0.3, for: '0.3b', ease: 'in' });
act('30:2.5', 'pose', { bone: 'head', rot: [0, 0, 0], for: '0.2b', ease: 'out' });
act('30:3', 'face', { jawOpen: 0.85, eyesWide: 1, fear: 0.9, for: '0.2b', ease: 'out' });
act('30:3.75', 'gaze', { weight: 0, to: [0, 0, 0], for: '0.2b' });
act('31:4.5', 'gaze', { weight: 0, to: [0, 0, 0], for: '0.2b' });
act('31:4.5', 'face', { jawOpen: 1, for: '0.2b' });
// ------------------------------------------------------------- SOUND, under the song
const SFX = (at, name, volume = 0.7) => C({ at, sfx: `Assets/MusicVideo/Sfx/${name}.mp3`, volume });
SFX('24:4.51', 'tv_power_thump', 0.8);
SFX(SLAM, 'couch_slam', 1);
SFX('26:1.7', 'static_burst', 0.3);
for (const t of KICKS('26:2.5', '28:1')) SFX(r3(t), 'wood_scrape', 0.28);
SFX('27:2.5', 'glass_ring', 0.5);
for (const t of KICKS('28:1', '29:1')) SFX(r3(t), 'wood_scrape', 0.6);
SFX('29:1.74', 'glass_stretch', 0.7);
SFX('29:3.5', 'turkey_gobble_1', 0.8);
SFX('30:2.5', 'turkey_gobble_2', 0.7);
SFX('30:3', 'turkey_gobble_3', 0.7);
SFX('30:3', 'turkey_flock', 0.6);
SFX('31:4.5', 'turkey_flock', 0.9);
SFX(STOP, 'static_burst', 0.5);
SFX(STOP, 'camera_servo', 0.6);
fall({ C, T, r3, shot, on, hit, song, actors, lights, FALL, GO });

const body = JSON.stringify({ actors, lights, cues }, null, 0)
  .replace(/\},\{/g, '},\n{').replace(/"cues":\[/, '"cues":[\n').replace(/"actors":\{/, '"actors":{\n');
fs.writeFileSync(path.join(ROOT, 'acts', '03-the-pull.json'), '// Generated by Director/tools/p34_build.mjs. Edit that, not this.\n' + body + '\n');
fs.writeFileSync(path.join(ROOT, 'acts', '07-cuts-b.json'), '{ "cues": [] }\n');
console.log(cues.length, 'cues');
