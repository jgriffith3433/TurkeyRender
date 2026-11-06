// Part 6, bars 52-58: his body. Writes acts/04b-hang.json. Lights, sets, the screen, feathers and type stay in acts/04-lifted.json.
// The fall back, the landing, the feet going, over the edge, the hang, the heave, the fingers. He moves by key `root`, never move/rotate.
// The hang is a real pendulum about his hands: everything he does in it is computed about the grip, so the hands stay locked.
// No jawOpen between 148.4 and 152.5 or 153.9 and 158.1: acts/08-lipsync.json owns his jaw there.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const song = JSON.parse(fs.readFileSync(path.join(ROOT, 'song.json'), 'utf8'));
const T = (s) => { const [bar, beat] = s.split(':').map(Number), n = song.downbeatPhase + (bar - 1) * song.meter + ((beat ?? 1) - 1), i = Math.floor(n); return song.beats[i] + (n - i) * (song.beats[i + 1] - song.beats[i]); };
const r3 = (x) => Math.round(x * 1000) / 1000;
const rad = Math.PI / 180;
const SYW = -57;
const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qE = ([x, y, z]) => qMul(qMul([0, Math.sin(y * rad / 2), 0, Math.cos(y * rad / 2)], [Math.sin(x * rad / 2), 0, 0, Math.cos(x * rad / 2)]), [0, 0, Math.sin(z * rad / 2), Math.cos(z * rad / 2)]);
const qV = (q, v) => { const u = q.slice(0, 3), c = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], t = c(u, v).map((x) => x * 2), d = c(u, t); return v.map((x, i) => x + q[3] * t[i] + d[i]); };
const toLocal = (rot, d) => { const q = qE(rot); return qV([-q[0], -q[1], -q[2], q[3]], d); };
const lerp3 = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

const cues = [], C = (c) => cues.push(c);
let cur = { pos: [0, 10.5, -1], rot: [-20, 640, 12] };
const v3 = (v) => v.map(r3);
const act = (at, verb, extra) => C({ at: r3(at), do: verb, on: 'person', ...extra });
const seg = (at, keys, o = {}) => {
  const base = { pos: [...cur.pos], rot: [...cur.rot] };
  const list = keys.map((k) => {
    const out = { t: `${r3(k.t - at)}s` };
    for (const f of ['bones', 'hips', 'ease', 'flat', 'anticipate', 'overshoot', 'settle', 'hold']) if (k[f] !== undefined) out[f] = k[f];
    if (k.rot || k.pos) {
      const rot = k.rot ?? cur.rot, pos = k.pos ?? cur.pos;
      out.root = { rot: v3(rot.map((x, i) => x - base.rot[i])), pos: v3(toLocal(base.rot, pos.map((x, i) => x - base.pos[i]))) };
      cur = { pos: [...pos], rot: [...rot] };
    }
    return out;
  });
  C({ at: r3(at), do: 'keys', on: 'person', successive: 0.035, ...o, keys: list });
};
const pathTo = (from, to, fn, step = 0.06) => {
  const n = Math.max(2, Math.ceil((to - from) / step)), keys = [];
  for (let i = 1; i <= n; i++) { const t = from + (to - from) * i / n, s = fn(t); keys.push({ t, pos: s.pos, rot: s.rot }); }
  seg(from, keys, { successive: 0, blend: 0 });
};
const clip = (at, name, blend = 0.12, extra = {}) => C({ at: r3(at), do: 'anim', on: 'person', clip: name, blend: `${blend}s`, ...extra });

// ------------------------------------------------------------- 52: HE FALLS BACK
const B52 = T('52:1'), FB = T('52:2'), HIT = T('53:1');
C({ at: T('49:1'), do: 'overlap', on: 'person', amount: 1, arms: 0.8, for: '0.5s' });
// 49-51 lifted: head back, arms drifting out like wings, a slow arch that opens as he rises, one leg trailing. He does nothing; the air does it.
seg(T('49:1') + 0.02, [
  { t: T('49:3'), bones: { chest: [-8, 0, 4], head: [-14, 0, 8], leftUpperArm: [-6, 0, 38], rightUpperArm: [-6, 0, -30], leftLowerArm: [0, 0, 14], rightLowerArm: [0, 0, -18], leftUpperLeg: [10, 0, 6], rightUpperLeg: [-14, 0, -4], leftLowerLeg: [24, 0, 0], rightLowerLeg: [44, 0, 0] }, ease: 'inout' },
  { t: T('50:2'), bones: { chest: [-16, 0, -4], head: [-20, 0, -6], leftUpperArm: [-18, 0, 54], rightUpperArm: [-16, 0, -58], leftLowerArm: [0, 0, 8], rightLowerArm: [0, 0, -8], leftUpperLeg: [-6, 0, 6], rightUpperLeg: [6, 0, -6], leftLowerLeg: [34, 0, 0], rightLowerLeg: [18, 0, 0] } },
  { t: T('51:1'), bones: { chest: [-6, 0, 6], head: [-8, 0, 12], leftUpperArm: [-10, 0, 46], rightUpperArm: [-22, 0, -44], leftLowerArm: [0, 0, 20], rightLowerArm: [0, 0, -10], leftUpperLeg: [12, 0, 8], rightUpperLeg: [-18, 0, -4], leftLowerLeg: [30, 0, 0], rightLowerLeg: [52, 0, 0] } },
  { t: B52 - 0.05, bones: { chest: [-10, 0, 0], head: [8, 0, 0], leftUpperArm: [-8, 0, 40], rightUpperArm: [-8, 0, -40], leftUpperLeg: [4, 0, 6], rightUpperLeg: [-8, 0, -6], leftLowerLeg: [24, 0, 0], rightLowerLeg: [30, 0, 0] } },
], { successive: 0.05 });
clip(B52, 'Falling', 0.4);
seg(B52 + 0.01, [
  { t: FB - 0.08, bones: { chest: [-28, 0, 0], hips: [-14, 0, 0], head: [-22, 0, 0], leftUpperArm: [-30, 0, 30], rightUpperArm: [-30, 0, -30] }, ease: 'out' },
  { t: FB + 0.3, bones: { chest: [-12, 0, 0], head: [-10, 0, 0], leftUpperArm: [-60, 0, 44], rightUpperArm: [-60, 0, -44], leftUpperLeg: [-24, 0, 8], rightUpperLeg: [12, 0, -8] }, overshoot: 0.1 },
  { t: T('52:3.5'), bones: { chest: [8, 0, 0], head: [8, 0, 0], leftUpperArm: [-30, 0, 50], rightUpperArm: [-40, 0, -50], leftUpperLeg: [12, 0, 8], rightUpperLeg: [-30, 0, -8], leftLowerLeg: [30, 0, 0], rightLowerLeg: [50, 0, 0] } },
  { t: HIT - 0.06, bones: { chest: [14, 0, 0], head: [4, 0, 0], leftUpperArm: [10, 0, 50], rightUpperArm: [10, 0, -50], leftUpperLeg: [-30, 0, 6], rightUpperLeg: [-20, 0, -6], leftLowerLeg: [40, 0, 0], rightLowerLeg: [30, 0, 0] }, ease: 'out' },
]);
{
  const p0 = [...cur.pos], r0 = [...cur.rot], p1 = [0, -29.92, -8.7], r1 = [0, 900, 0];
  pathTo(FB, HIT, (t) => { const k = (t - FB) / (HIT - FB); return { pos: [p0[0] + (p1[0] - p0[0]) * smooth(k), p0[1] + (p1[1] - p0[1]) * k * k, p0[2] + (p1[2] - p0[2]) * smooth(k)], rot: lerp3(r0, r1, smooth(k)) }; }, 0.09);
}

// ------------------------------------------------------------- 53: THE BEZEL
clip(HIT, 'LandingHeavy', 0.03, { once: 1, for: '2.5b', speed: 0.9 });
act(HIT + 0.04, 'plant', { foot: 'both', for: '4b', blend: '0.03s' });
act(HIT, 'gaze', { to: [0, -29.2, -13], for: '0.5b' });
act(HIT, 'face', { jawOpen: 0.6, fear: 0.7, eyesWide: 0.8, for: '0.3b' });
C({ at: r3(HIT), do: 'set', on: 'p5_focus', pos: [0.1, -29.6, -7.6] });
const PUSHAT = T('53:3.5');
clip(PUSHAT, 'PushCubeIdle1', 0.35, { for: '2bars' });
seg(PUSHAT + 0.3, [{ t: PUSHAT + 1.05, bones: { spine: [8, 0, 0], chest: [16, 0, 0], head: [-18, 0, 0] }, ease: 'inout', overshoot: 0.08, settle: '0.5s' }]);

// ------------------------------------------------------------- 54: HIS FEET GO
// Each kick of the bar takes him back a step, soles flat. Between kicks he fights it, chest down, leaning into the pull.
const KICKS = [[146.68, 0.28], [147.02, 0.28], [148.05, 0.3], [148.4, 0.3], [148.75, 0.24]], Z0 = -8.7;
act(T('54:1'), 'plant', { foot: 'both', weight: 0, for: '0.03s' });
C({ at: r3(T('54:1')), sfx: 'wood_scrape', volume: 0.6 });
act(T('54:1'), 'face', { jawOpen: 0.75, fear: 1, eyesWide: 1, for: '0.5b' });
{
  const zAt = (t) => KICKS.reduce((z, [k, d]) => z + d * (t > k ? 1 - Math.exp(-(t - k) * 22) : 0), Z0);
  pathTo(T('54:1') - 0.05, 148.74, (t) => ({ pos: [0, -29.92, zAt(t)], rot: [0, 900, 0] }), 0.035);
}
const IN = { chest: [28, 0, 0], hips: [10, 0, 0], head: [-30, 0, 0], leftUpperArm: [0, 0, 0], rightUpperArm: [0, 0, 0] };
const BACK = (a) => ({ chest: [2, 0, 0], hips: [-8, 0, 0], head: [-6, 0, 0], leftUpperArm: [-10, 0, a], rightUpperArm: [-10, 0, -a] });
seg(T('54:1') + 0.005, [
  { t: 146.71, bones: BACK(26), ease: 'out' }, { t: 146.98, bones: IN, flat: 1 }, { t: 147.08, bones: BACK(30), ease: 'out' },
  { t: 147.6, bones: { ...IN, chest: [34, 0, 0], hips: [14, 0, 0] }, hold: 0.38 }, { t: 148.1, bones: BACK(36), ease: 'out' },
  { t: 148.36, bones: IN }, { t: 148.46, bones: BACK(42), ease: 'out' }, { t: 148.72, bones: { ...IN, chest: [20, 0, 0] } },
], { release: '0.1s' });
// 54:3 he scrabbles, the legs run on the spot under a body that's still leaning in.
clip(T('54:3'), 'PushCube1', 0.12, { for: '1b', speed: 2.2 });

// ------------------------------------------------------------- 54:4 OVER THE EDGE
// The heel finds nothing. Physics takes him over: a shove at the shoulders, the bezel under him, arms fighting for it.
const OVER = 148.74, CATCH = T('55:1');
C({ at: OVER, do: 'ragdoll', on: 'person', for: `${r3(CATCH - OVER + 0.05)}s`, floor: -60, collide: ['p6_rim_s'], impulse: [0, 0.9, 2.6], spin: [200, 0, 0], gravity: [0, -7, 4], drag: 0.5, drive: 0.16, thrash: 26, seed: 11, blendIn: '0.05s', from: 'GetHitFrontHeavyCombat@0.25' });
act(OVER, 'face', { fear: 1, for: '0.2b' });
// From under the edge, so he goes over against the dark and never seems to stand on the picture.
C({ at: OVER, shot: { name: 'over the edge', pos: [1.5, -31.3, -5.4], move: [1.35, -31.0, -5.5], look: 'person.hips', fov: 50, handheld: 0.5, dutch: -8, ease: 'out', deadzone: false } });
act(OVER, 'gaze', { weight: 0, to: [0, 0, 0], for: '0.1s' });

// ------------------------------------------------------------- 55-56 THE HANG
// H is the middle of his grip. He hangs along `up` from there: L metres from grip to feet, tilted out from the wall by the pull of the picture.
// The bezel's raised rail: top at RAIL_Y, a thin bright strip he can get his fingers over. Wrists sit just under it on the well side, forearms straight up.
const RAIL_Y = -29.86, GRIP_Y = RAIL_Y - 0.092, GRIP_Z = -6.955;
const LGRIP = { lean: 0, handRot: [0, 90, -120], worldRot: 1 }, RGRIP = { lean: 0, handRot: [0, -90, 120], worldRot: 1 };   // hands fixed in the world: fingers up the wall and tipped over the rail, palm to it, whatever the body swings
const H = [0, GRIP_Y, GRIP_Z], LH = [0.27, GRIP_Y, GRIP_Z], RH = [-0.27, GRIP_Y - 0.015, GRIP_Z];
const DIP = 150.48, HEAVE = T('55:3'), TOP = 151.5, GIVE = 151.95, GONE = 152.45;
const SLIPS = [153.19, 153.53, 153.88, 154.22], TEAR = 154.56, GO_ = T('57:1');
const hangAt = (t) => {
  const d = t - CATCH;
  let L = 1.93 - 0.3 * Math.exp(-11 * d) * Math.cos(15 * d);
  L += 0.05 * smooth((t - DIP) / 0.2) * (1 - smooth((t - HEAVE) / 0.14));                  // the dip before the pull
  L -= 0.05 * smooth((t - HEAVE) / (TOP - HEAVE)) * (1 - smooth((t - GIVE) / (GONE - GIVE))); // chin to the rim, then it's gone
  if (t > TOP && t < GIVE) L += 0.012 * Math.sin((t - TOP) * 44) * smooth((t - TOP) / 0.1);  // shaking at the top
  if (t > GIVE) L += 0.005 * smooth((t - GIVE) / 0.5);
  L -= 0.1 * smooth((t - 151.9) / 0.5);                                                      // arms soft, not past reach, once the fingers go                                        // sinks further than he started
  for (const s of SLIPS) if (t > s) L += 0.014 * (1 - Math.exp(-(t - s) * 16));
  L -= 0.13 * smooth((t - TEAR) / 0.25);                                                     // all on one arm, shoulder hauled up to it, so the last hand stays on the rail
  // A real swing: he came over the edge with speed, so the pendulum carries him far out over the drop and back.
  let A = 21 + 25 * Math.exp(-0.42 * d) * Math.cos(d * 2 * Math.PI / 2.5);
  A -= 5 * smooth((t - HEAVE) / 0.6) * (1 - smooth((t - GIVE) / 0.5));
  if (t > GIVE) { const g = t - GIVE; A += 5 * Math.exp(-1.1 * g) * Math.sin(g * 4.2); }
  let Z = 13 * Math.exp(-0.34 * d) * Math.sin(d * 2 * Math.PI / 3.3), pivot = H;
  for (const s of SLIPS) if (t > s) { const b = t - s; Z -= 1.4 * (1 - Math.exp(-b * 9)) + 1.6 * Math.exp(-3.4 * b) * Math.sin(b * 13); }
  if (t > TEAR) {
    const b = t - TEAR, k = 1 - Math.exp(-b * 10);
    pivot = lerp3(H, RH, k);
    Z -= 7 * k - 15 * Math.exp(-0.75 * b) * Math.sin(b * 2 * Math.PI / 1.45);
  }
  Z += 8 * Math.sin((t - 150.2) * 2 * Math.PI / 2.3) * smooth((t - 149.9) / 0.5) * (1 - smooth((t - 152.3) / 0.4));
  const rot = [A, 180, Z], up = qV(qE(rot), [0, 1, 0]);
  const lean = smooth((t - HEAVE) / 0.5) * (1 - smooth((t - GIVE) / 0.5));
  return { pos: pivot.map((x, i) => x - up[i] * L + (i === 2 ? 0.12 + 0.12 * lean : 0)), rot }; // +z: he hangs out from the rim, not through it, further as he pulls
};
{ const s = hangAt(CATCH); C({ at: r3(CATCH), do: 'set', on: 'person', pos: v3(s.pos), rot: v3(s.rot) }); cur = { pos: s.pos, rot: s.rot }; }
const GRIPCURL = 0.68;
clip(CATCH, 'mx_hanging_idle', 0);
act(CATCH + 0.13, 'reach', { hand: 'left', to: LH, for: '0.05s', ease: 'in', ...LGRIP });   // right hand first, then the left slams on
act(CATCH, 'reach', { hand: 'right', to: RH, for: '0.03s', ...RGRIP });
act(CATCH + 0.14, 'fingers', { hand: 'left', curl: GRIPCURL, for: '0.05s' });
act(CATCH, 'fingers', { hand: 'right', curl: GRIPCURL, for: '0.04s' });
act(CATCH, 'gaze', { to: [0, -29, -7.6], for: '1b' });
act(CATCH, 'face', { fear: 0.9, eyesWide: 0.6, for: '1b' });
pathTo(CATCH + 0.005, GO_ + 3.6, hangAt, 0.05);
const LEG = (lu, ru, ll, rl, extra = {}) => ({ leftUpperLeg: [lu, 0, 4], rightUpperLeg: [ru, 0, -4], leftLowerLeg: [ll, 0, 0], rightLowerLeg: [rl, 0, 0], ...extra });
const UP = { head: [-26, 0, 0], neck: [-10, 0, 0], chest: [-6, 0, 0] };
seg(CATCH + 0.01, [
  { t: CATCH + 0.14, bones: { chest: [14, 0, 0], head: [10, 0, 0], ...LEG(-48, -30, 40, 26) }, ease: 'out' },   // legs swing on through
  { t: CATCH + 0.42, bones: { ...UP, chest: [-10, 0, 0], ...LEG(16, 6, 18, 8) }, overshoot: 0.1, settle: '0.3s' },  // and back
  { t: CATCH + 0.72, bones: { ...UP, ...LEG(-22, -8, 28, 30) } },                                                  // a foot looks for the wall
  { t: DIP - 0.02, bones: { ...UP, ...LEG(-8, -18, 40, 20) } },
  { t: HEAVE - 0.02, bones: { ...UP, chest: [10, 0, 0], hips: [-8, 0, 0], ...LEG(10, 14, 60, 52) }, ease: 'inout' }, // knees back, gathers himself
  { t: HEAVE + 0.34, bones: { head: [-30, 0, 0], neck: [-12, 0, 0], chest: [-12, 0, 0], hips: [8, 0, 0], ...LEG(-58, -24, 84, 34) }, ease: 'out', overshoot: 0.08 }, // kicks up off nothing
  { t: TOP, bones: { head: [-34, 0, 0], neck: [-12, 0, 0], chest: [-14, 0, 0], ...LEG(-30, -64, 40, 90) } },
  { t: GIVE, bones: { head: [-30, 0, 0], neck: [-12, 0, 0], chest: [-12, 0, 0], ...LEG(-60, -30, 90, 44) }, hold: 0.04 },
  { t: GONE, bones: { head: [-8, 0, 0], chest: [8, 0, 0], ...LEG(10, 4, 12, 22) }, ease: 'out', overshoot: 0.14, settle: '0.4s' },
  { t: 153.1, bones: { head: [20, 16, 0], neck: [10, 8, 0], chest: [6, 0, 0], ...LEG(6, -4, 22, 14) } },            // down at the picture, then to the hand
  ...SLIPS.flatMap((s, i) => [
    { t: s + 0.06, bones: { head: [-14 - i * 4, -18, 4], neck: [-6, -8, 0], chest: [-4, -6, -4 - i], ...LEG(-22 - i * 8, 8, 34, 16) }, ease: 'out', overshoot: 0.12, settle: '0.18s' },
    { t: s + 0.26, bones: { head: [-10 - i * 4, -14, 4], neck: [-6, -8, 0], chest: [-2, -6, -4 - i], ...LEG(-4, -14 - i * 6, 18, 28) } },
  ]),
  { t: TEAR + 0.12, bones: { head: [-20, -22, 12], neck: [-8, -10, 4], chest: [-8, -14, -14], spine: [-4, -8, -10], leftUpperArm: [0, 0, 20], ...LEG(-44, 10, 60, 20) }, ease: 'out', overshoot: 0.16, settle: '0.3s' },
], { blend: 0 });
function wellActors() {
  const a = {}, from = T('55:1'), until = '59:1', tex = { texture: 'Assets/P6Type/p6_wall.png', smooth: 0.06, from, until };
  const yC = (-35 + SYW) / 2, h = -35 - SYW;
  a.p6_deep_s = { model: 'prim:cube', pos: [0, yC, -8.5], scale: [22, h, 3], color: '#3a3530', tile: [6, h / 2.5], ...tex };
  a.p6_deep_n = { model: 'prim:cube', pos: [0, yC, 6.5], scale: [22, h, 3], color: '#3a3530', tile: [6, h / 2.5], ...tex };
  a.p6_deep_w = { model: 'prim:cube', pos: [-9.5, yC, -1], scale: [3, h, 12], color: '#3a3530', tile: [3.3, h / 2.5], ...tex };
  a.p6_deep_e = { model: 'prim:cube', pos: [9.5, yC, -1], scale: [3, h, 12], color: '#3a3530', tile: [3.3, h / 2.5], ...tex };
  const pc = { model: 'prim:cube', color: '#26221f', smooth: 0.08, from, until };
  // Pilasters the full height of the wall.
  [-6.2, -3.1, 3.1, 6.2].forEach((x, i) => {
    a['p6_pil_s' + i] = { ...pc, pos: [x, -43, -6.8], scale: [0.8, 26, 0.5] };
    a['p6_pil_n' + i] = { ...pc, pos: [x, -43, 4.8], scale: [0.8, 26, 0.5] };
  });
  [-4, 2].forEach((z, i) => { a['p6_pil_w' + i] = { ...pc, pos: [-7.8, -43, z], scale: [0.5, 26, 0.8] }; a['p6_pil_e' + i] = { ...pc, pos: [7.8, -43, z], scale: [0.5, 26, 0.8] }; });
  // Rings of light every 4.5 m, so depth counts down to the picture.
  [-35, -39.5, -44, -48.5, -53].forEach((y, i) => {
    const e = ['#3a4458', '#566480', '#7686a8', '#a0b2d8', '#e0ecff'][i];
    const ring = { model: 'prim:cube', color: '#101010', emission: e, from, until };
    a['p6_ring_s' + i] = { ...ring, pos: [0, y, -6.62], scale: [16, 0.09, 0.1] };
    a['p6_ring_n' + i] = { ...ring, pos: [0, y, 4.62], scale: [16, 0.09, 0.1] };
    a['p6_ring_w' + i] = { ...ring, pos: [-7.62, y, -1], scale: [0.1, 0.09, 12] };
    a['p6_ring_e' + i] = { ...ring, pos: [7.62, y, -1], scale: [0.1, 0.09, 12] };
  });
  return a;
}
const TOSS = [0, 0.1, -0.05];
act(GONE + 0.1, 'gaze', { to: [1.2, -35, -4], for: '0.45s', ease: 'inout', limit: 28 });   // head only: a big gaze turns the chest and tears the arms off the rail
act(GONE + 0.1, 'face', { fear: 1, eyesWide: 1, for: '0.4s' });
act(153.05, 'gaze', { to: LH, for: '0.2s', ease: 'out', limit: 28 });
// Each tick one finger comes all the way off (straight, then past straight, curl -1.6), the fingers still on open a little, and the whole hand drops.
const ORDER = ['pinky', 'ring', 'middle', 'index'];
SLIPS.forEach((s, i) => {
  act(s, 'fingers', { hand: 'left', finger: ORDER[i], curl: -1.6, for: '0.1s', ease: 'out', sfx: 'frame_tick' });
  ORDER.slice(i + 1).forEach((f) => act(s + 0.02, 'fingers', { hand: 'left', finger: f, curl: GRIPCURL - 0.07 * (i + 1), for: '0.1s', ease: 'out' }));
  // Not down through the rail: the whole hand sags and peels back off it, jerking on each tick, so what's left hooks by less and less.
  act(s, 'reach', { hand: 'left', to: [LH[0], r3(LH[1] - 0.006 * (i + 1)), r3(LH[2] + 0.014 * (i + 1))], for: '0.07s', ease: 'out', ...LGRIP, handRot: [0, 90, -120 + 9 * (i + 1)] });
  act(s, 'face', { eyesWide: 1, fear: 1, for: '0.06s' });
});
// The last finger goes on TEAR: the arm is dead weight at once, drops past his shoulder, and swings under him.
act(TEAR, 'reach', { hand: 'left', to: [0, 0, 0], weight: 0, for: '0.12s', ease: 'in' });
C({ at: r3(TEAR), do: 'layer', on: 'person', clip: 'IdleBreathe', mask: 'leftArm', weight: 1, blend: '0.22s' });
act(TEAR, 'fingers', { hand: 'left', curl: 0.3, for: '0.2s' });
act(T('58:1.5'), 'fingers', { hand: 'right', curl: 0, for: '0.5b', ease: 'out' });

// ------------------------------------------------------------- THE HANG, ON CAMERA
// A touch of the wide to place it, then in the wall (the rim is hidden, so the lens can stand where the wall is) on his face: hands up at the top of frame.
const CLOSE = 150.38, SLIPSHOT = 152.5, CUTSLIP = 153.08;   // the bird's walk counts from SLIPSHOT; the cut waits for the arms to settle after the sag
const SY = SYW + 1;   // the picture, from the catch on: the well is 26 m deep. Above 55 it is 5 m, so the bezel shots keep the picture close.
const actors = {
  // The bezel's lip, what his hands are on when the wall is out of the way.
  p6_lip: { model: 'prim:cube', pos: [0, (RAIL_Y - 30) / 2, -7.0], scale: [22, 30 + RAIL_Y, 0.04], color: '#4c525e', smooth: 0.5, from: r3(OVER), until: '59:1' },
  p6_lipedge: { model: 'prim:cube', pos: [0, RAIL_Y, -7.0], scale: [22, 0.012, 0.042], color: '#101010', emission: '#9fb0cc', from: r3(OVER), until: '59:1' },
  // The well below the bezel: 26 m of wall, ribs and light rings, all running to one vanishing point in the picture.
  ...wellActors(),
  p6_downaim: { model: 'prim:cube', pos: [-0.12, -33, -5.9], scale: 0.001, color: '#000000' },
  p6_wideaim: { model: 'prim:cube', pos: [-0.3, -31.4, -6.5], scale: 0.001, color: '#000000' },
  p6_slipaim: { model: 'prim:cube', pos: [0.34, -29.9, -7.0], scale: 0.001, color: '#000000' },
  p6_oneaim: { model: 'prim:cube', pos: [0.1, -30.5, -6.7], scale: 0.001, color: '#000000' },
  p6_grabaim: { model: 'prim:cube', pos: [0, -30, -6.95], scale: 0.001, color: '#000000' },
  p6_lastaim: { model: 'prim:cube', pos: [-0.2, -29.85, -7.0], scale: 0.001, color: '#000000' },
  // The nemesis, on the rim beside his fingers.
  p6_tiebird: { model: 'turkey_white_hero', pos: [2.1, -30, -7.3], rot: [0, 270, 0], scale: 0.38, from: T('56:1'), until: T('57:1') },
  p6_birdtie: { model: 'prim:cube', pos: [0, -100, 0], scale: [0.01, 0.032, 0.005], color: '#d4141c', smooth: 0.5, from: T('56:1'), until: T('57:1') },
};
const lights = { p6_well: { type: 'point', pos: [0, -49, -1], color: '#dfeaff', intensity: 0, range: 30 }, p6_well2: { type: 'directional', rot: [-78, 20, 0], color: '#dfeaff', intensity: 0 }, p6_face: { type: 'point', pos: [0.4, -30.7, -7.9], color: '#dfe6ff', intensity: 0, range: 4 }, p6_bird: { type: 'point', pos: [0.5, -29.1, -7.9], color: '#dfeaff', intensity: 0, range: 4 } };
C({ at: T('56:1'), do: 'attach', on: 'p6_birdtie', to: 'p6_tiebird.neck3', pos: [0, -0.01, 0.05], rot: [0, 0, 0] });
C({ at: r3(CATCH), do: 'set', on: 'p5_focus', pos: [0.05, -30.9, -6.7] });
C({ at: r3(CATCH), do: 'set', on: 'p6_screen', pos: [0, SY, -1] });
C({ at: r3(CATCH), light: 'p6_up', intensity: 0 });
C({ at: r3(CATCH), light: 'p6_glow', intensity: 6 });
C({ at: r3(CATCH), light: 'p6_well', intensity: 420 });
C({ at: r3(CATCH), light: 'p6_well2', intensity: 0.8 });
for (const p of [[-5, -28.5, -5.5], [6, -28.5, -5], [1.5, -27.5, -2]]) C({ at: r3(CATCH), fx: 'stream', pos: p, to: [0, SY, -1], rate: 260, life: 2, swirl: 1.2, spread: 1.6, for: '12b' });
C({ at: r3(CATCH), shot: { name: 'the grab', pos: [0.05, -29.5, -7.85], move: [0.05, -29.56, -7.7], look: 'p6_grabaim', fov: 40, handheld: 0.3, ease: 'out', deadzone: false } });
C({ at: r3(CATCH + 0.14), pulse: { shake: 0.3, exposure: 0.25 }, for: '0.4b', sharp: 3 });
C({ at: r3(CATCH + 0.14), sfx: 'remote_thunk', volume: 0.8 });
C({ at: r3(CATCH + 0.46), shot: { name: 'he has the edge', pos: [1.7, -29.2, -4.2], move: [1.3, -29.5, -4.6], look: 'p6_wideaim', fov: 56, fovTo: 62, fovFor: '1.1s', ease: 'out', handheld: 0.35, dutch: -9 } });
C({ at: r3(CLOSE), do: 'hide', on: ['p6_rim_s', 'p6_led'], for: `${r3(CUTSLIP - CLOSE)}s` });
C({ at: r3(CLOSE), light: 'p6_face', intensity: 3.6 });
C({ at: r3(CUTSLIP), light: 'p6_face', intensity: 0 });
C({ at: r3(CUTSLIP), do: 'show', on: ['p6_rim_s', 'p6_led'] });
act(CLOSE, 'gaze', { to: [0.22, -30.2, -8.5], for: '0.3s', ease: 'out' });
act(150.95, 'gaze', { to: [-0.5, -29.7, -8.2], for: '0.22s', ease: 'inout' });   // up at the hand that's going
act(151.42, 'gaze', { to: [0.2, -30.6, -9], for: '0.1s', ease: 'out' });          // and straight at us on ME
// Re-grip on ME: the right hand opens, comes up an inch, and slams back on.
act(151.3, 'fingers', { hand: 'right', curl: 0.35, for: '0.1s', ease: 'out' });
act(151.3, 'reach', { hand: 'right', to: [RH[0], r3(RH[1] + 0.03), RH[2]], for: '0.14s', ease: 'out', ...RGRIP });
act(151.46, 'reach', { hand: 'right', to: RH, for: '0.05s', ease: 'in', ...RGRIP });
act(151.47, 'fingers', { hand: 'right', curl: GRIPCURL + 0.1, for: '0.05s', ease: 'in' });
C({ at: r3(CLOSE), shot: { name: 'he sings it up at us', pos: [0.26, -30.98, -8.95], move: [0.14, -30.9, -8.6], look: 'person.head', lookOffset: [0, 0.3, 0], fov: 37, fovTo: 31, fovFor: `${r3(CUTSLIP - CLOSE)}s`, fovEase: 'inout', ease: 'inout', handheld: 0.18 } });
C({ at: r3(CUTSLIP), shot: { name: 'the fingers, and who is watching', pos: [0.33, -29.68, -7.5], move: [0.34, -29.7, -7.44], look: 'p6_slipaim', fov: 30, ease: 'linear', deadzone: false } });
C({ at: r3(CUTSLIP), light: 'p6_bird', intensity: 1.6 });
C({ at: r3(CATCH), light: 'p6_red', intensity: 0.5 });
C({ at: r3(CUTSLIP), light: 'p6_red', intensity: 0.2 });
C({ at: r3(T('57:1')), light: 'p6_red', intensity: 0.5 });
C({ at: r3(TEAR + 0.05), shot: { name: 'one hand left', pos: [0.6, -28.2, -7.5], move: [0.55, -28.35, -7.45], look: 'p6_oneaim', fov: 44, handheld: 0.35, dutch: -6, ease: 'out', deadzone: false } });
C({ at: r3(T('57:1')), light: 'p6_bird', intensity: 0 });
// It walks in along the rim, stops by his hand, looks at each finger as it goes, and takes the last one personally.
C({ at: r3(SLIPSHOT - 0.2), do: 'walk', on: 'p6_tiebird', clip: 'walk', to: [0.64, -30, -7.24], for: '0.68s', stride: 0.3 });
C({ at: r3(SLIPSHOT + 0.48), do: 'anim', on: 'p6_tiebird', clip: 'idle', blend: '0.15s' });
C({ at: r3(SLIPSHOT + 0.48), do: 'keys', on: 'p6_tiebird', overshoot: 0.15, settle: '0.2s', keys: [
  { t: `${r3(SLIPS[0] - SLIPSHOT - 0.44)}s`, bones: { neck3: [0, 0, 26], head: [0, 0, 22] } },
  { t: `${r3(SLIPS[1] - SLIPSHOT - 0.44)}s`, bones: { neck3: [0, 0, 34], head: [0, 0, -18] } },
  { t: `${r3(SLIPS[2] - SLIPSHOT - 0.44)}s`, bones: { neck3: [0, 0, 40], head: [0, 0, 22] } },
  { t: `${r3(SLIPS[3] - SLIPSHOT - 0.44)}s`, bones: { neck3: [0, 0, 50], head: [0, 0, -18] }, hold: 0.1 },
] });
C({ at: 154.3, do: 'anim', on: 'p6_tiebird', clip: 'bite', beats: 0.75, blend: '0.06s' });
C({ at: 154.32, do: 'move', on: 'p6_tiebird', pos: [0.56, -30, -7.2], for: '0.22s', ease: 'in' });

// ------------------------------------------------------------- 57-58 HE GOES. The biggest moment: close on him, the whole drop behind him.
const TO = [0.3, SY, -2.6], ST = { to: TO, order: 'feet,legs,hips,chest,arms,head,hand', span: 0.15, thin: 0.35, lines: 80, glow: '#d8e8ff' };
const S4 = 156.32, S5 = T('58:1') + 0.05, DIVE = T('58:2.2');
C({ at: r3(GO_), do: 'stretch', on: 'person', ...ST, amount: 0.74, for: '4.5b', ease: 'linear', sfx: 'glass_stretch', sfxVolume: 0.8 });
C({ at: r3(T('58:1.75')), do: 'stretch', on: 'person', ...ST, amount: 1, for: '0.74b', ease: 'in' });
C({ at: r3(GO_), do: 'hide', on: ['p6_rim_s', 'p6_led'], for: r3(S4 - GO_) + 's' });
C({ at: r3(S4), do: 'show', on: ['p6_rim_s', 'p6_led'] });
C({ at: r3(GO_), fx: 'stream', on: 'person.chest', to: TO, rate: 700, life: 1.1, spread: 0.25, size: 0.1, swirl: 0.5, for: '5b' });
C({ at: r3(GO_), light: 'p6_face', intensity: 5 });
C({ at: r3(S5), light: 'p6_face', intensity: 0 });
C({ at: r3(S5), light: 'p6_bird', intensity: 1.6 });
C({ at: r3(DIVE), light: 'p6_bird', intensity: 0 });
C({ at: r3(GO_), shot: { name: 'he goes', pos: [0.75, -30.05, -8.0], move: [0.35, -29.7, -7.75], look: 'person.chest', lookOffset: [0, -0.45, 0], fov: 58, fovTo: 70, fovFor: r3(S4 - GO_) + 's', ease: 'inout', handheld: 0.4, dutch: 7 } });
C({ at: r3(S4), shot: { name: 'down the length of him', pos: [-0.35, -29.2, -6.4], move: [-0.3, -29.75, -6.45], look: 'p6_downaim', fov: 74, ease: 'in', handheld: 0.5 } });
act(S4, 'gaze', { to: [-0.35, -29.4, -6.4], for: '0.3s', ease: 'out', limit: 70 });
C({ at: r3(S5), shot: { name: 'his hand, last', pos: [-0.2, -29.63, -7.52], move: [-0.26, -29.7, -7.42], look: 'p6_lastaim', fov: 30, ease: 'inout', handheld: 0.15, deadzone: false } });
C({ at: r3(DIVE), shot: { name: 'down the shaft', pos: [-1.1, -30.4, -5.9], move: [0, SY + 1.4, -1.6], rot: [90, 0, 0], fov: 74, ease: 'in' } });
fs.writeFileSync(path.join(ROOT, 'acts', '04b-hang.json'), '// Generated by Director/tools/p6_hang.mjs. Edit that, not this.\n' + JSON.stringify({ actors, lights, cues }, null, 0).replace(/\},\{"at"/g, '},\n{"at"') + '\n');
console.log(cues.length, 'cues');

// Takes his body and the old hang shots out of 04-lifted, once. Other agents edit that file, so it is read fresh and rewritten at once.
const f = path.join(ROOT, 'acts', '04-lifted.json');
let lines = fs.readFileSync(f, 'utf8').split('\n');
const a = lines.findIndex((l) => l.includes('// ---- 52:1.5')), b = lines.findIndex((l) => l.includes('// ---- Lyrics'));
let out = [], inKeys = false, n = 0;
lines.forEach((l, i) => {
  if (i <= a || i >= b) { out.push(l); return; }
  if (inKeys) { n++; if (/^\s*\] \},?\s*$/.test(l)) inKeys = false; return; }
  if (/"do": "keys", "on": "person"/.test(l)) { inKeys = true; n++; return; }
  const body = /"on": "person"[,\s}]/.test(l) && !/"do": "(stretch|feather|hide)"/.test(l);
  const oldShot = /"name": "(the long hold|the fingers)"/.test(l) || /"on": "p5_focus"/.test(l) && /"(55:1|55:2|53:1)"/.test(l);
  if (body || oldShot) { n++; return; }
  out.push(l);
});
if (n) { const tmp = f + '.tmp'; fs.writeFileSync(tmp, out.join('\n')); fs.renameSync(tmp, f); }
console.log('took', n, 'lines out of 04-lifted');
