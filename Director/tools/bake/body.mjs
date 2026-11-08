// A take as numbers: read what `call bakedump` wrote, forward kinematics, quaternions, and the measurements of Director/tools/bake.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'gen', 'bake');

export const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
export const DEG = 180 / Math.PI;

export const q = {
  id: () => [0, 0, 0, 1],
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  inv: (a) => [-a[0], -a[1], -a[2], a[3]],
  rot: (a, p) => { const t = v.mul(v.cross(a, p), 2); return v.add(v.add(p, v.mul(t, a[3])), v.cross(a, t)); },
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1; return [a[0] / l, a[1] / l, a[2] / l, a[3] / l]; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3],
  axis: (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  // The rotation vector of a quaternion, shortest way round.
  log: (a) => { const w = a[3] < 0 ? -1 : 1, x = a[0] * w, y = a[1] * w, z = a[2] * w, s = Math.hypot(x, y, z); if (s < 1e-9) return [2 * x, 2 * y, 2 * z]; const k = 2 * Math.atan2(s, a[3] * w) / s; return [x * k, y * k, z * k]; },
  exp: (r) => { const t = Math.hypot(r[0], r[1], r[2]); if (t < 1e-9) return [r[0] / 2, r[1] / 2, r[2] / 2, 1]; const s = Math.sin(t / 2) / t; return [r[0] * s, r[1] * s, r[2] * s, Math.cos(t / 2)]; },
  angle: (a, b) => 2 * Math.acos(Math.min(1, Math.abs(q.dot(a, b)))),
  slerp: (a, b, t) => { const d = q.dot(a, b), c = d < 0 ? q.mul(b, [0, 0, 0, -1]) : b; return q.mul(a, q.exp(v.mul(q.log(q.mul(q.inv(a), c)), t))); },
  // The shortest rotation taking direction a to direction b.
  from: (a, b) => { const c = v.cross(a, b), d = v.dot(a, b); if (d < -.99999) { const o = v.norm(Math.abs(a[0]) < .9 ? v.cross(a, [1, 0, 0]) : v.cross(a, [0, 1, 0])); return [o[0], o[1], o[2], 0]; } return q.norm([c[0], c[1], c[2], 1 + d]); },
};

// A rotation split about an axis: q = swing * twist. The twist angle is signed, shortest way.
export function twistOf(a, axis) {
  const p = v.dot([a[0], a[1], a[2]], axis);
  const t = q.norm([axis[0] * p, axis[1] * p, axis[2] * p, a[3]]);
  let ang = 2 * Math.atan2(p, a[3]); if (ang > Math.PI) ang -= 2 * Math.PI; if (ang < -Math.PI) ang += 2 * Math.PI;
  return { ang, twist: t, swing: q.mul(a, q.inv(t)) };
}

export function load(name, file) {
  const head = JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8'));
  const b = fs.readFileSync(path.join(DIR, (file ?? name) + '.bin')); const data = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
  const r = fs.readFileSync(path.join(DIR, name + '.root.bin')); const root = new Float32Array(r.buffer.slice(r.byteOffset, r.byteOffset + r.length));
  const nb = head.bones.length, nf = head.frames;
  const lp = (f, i) => { const o = (f * nb + i) * 7; return [data[o], data[o + 1], data[o + 2]]; };
  const lq = (f, i) => { const o = (f * nb + i) * 7 + 3; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };
  const top = (f) => ({ p: [root[f * 7], root[f * 7 + 1], root[f * 7 + 2]], q: [root[f * 7 + 3], root[f * 7 + 4], root[f * 7 + 5], root[f * 7 + 6]] });
  return { name, head, data, root, nb, nf, lp, lq, top, fps: head.fps, H: head.human, parent: head.bones.map((x) => x.parent) };
}

/** World positions and rotations of every bone at one frame. local(i) gives {p,q}. */
export function fk(d, f, local, top) {
  const T = top ?? d.top(f), P = new Array(d.nb), Q = new Array(d.nb);
  for (let i = 0; i < d.nb; i++) {
    const l = local ? local(i) : { p: d.lp(f, i), q: d.lq(f, i) }, par = d.parent[i];
    if (par < 0) { P[i] = v.add(T.p, q.rot(T.q, l.p)); Q[i] = q.mul(T.q, l.q); }
    else { P[i] = v.add(P[par], q.rot(Q[par], l.p)); Q[i] = q.mul(Q[par], l.q); }
  }
  return { P, Q };
}

const SIDES = ['Left', 'Right'];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };

/** One-frame steps of a rotation track, in degrees. */
const stepsOf = (qs) => { const s = new Array(qs.length).fill(0); for (let i = 1; i < qs.length; i++) s[i] = q.angle(qs[i - 1], qs[i]) * DEG; return s; };

/** Every snap in a track: a one-frame step far bigger than the steps around it. */
function spikes(step, fps) {
  const out = []; const hz = 60 / fps, floor = 5 * hz;   // 5 degrees in a 60th of a second is 300 deg/s
  for (let i = 2; i < step.length - 1; i++) {
    if (step[i] < floor || step[i] < step[i - 1] || step[i] < step[i + 1]) continue;
    const near = []; for (let k = -6; k <= 6; k++) if (Math.abs(k) >= 2 && step[i + k] != null) near.push(step[i + k]);
    if (step[i] > Math.max(1.9 * median(near), floor)) out.push({ f: i, step: step[i] });
  }
  return out;
}

export function measure(d, opts = {}) {
  const { H, nf, fps, head } = d, rest = head.rest, floor = opts.floor ?? d.top(0).p[1];
  const world = []; for (let f = 0; f < nf; f++) world.push(fk(d, f));
  const restLocal = (name, parent) => q.mul(q.inv(rest[parent]), rest[name]);
  const rows = {}, list = [];
  const track = (key, kind, parent, name) => {
    const R = restLocal(name, parent), i = H[name], j = H[parent];
    const qs = world.map((w) => q.mul(q.inv(R), q.mul(q.inv(w.Q[j]), w.Q[i])));
    const step = stepsOf(qs), sp = spikes(step, fps); let acc = 0, peak = 0, jerk = 0;
    for (let f = 2; f < nf; f++) { const a = Math.abs(step[f] - step[f - 1]) * fps * fps; if (a > 45000) jerk++; acc = Math.max(acc, a); peak = Math.max(peak, step[f] * fps); }
    rows[key] = { kind, snaps: sp.length, jerk, peakSpeed: Math.round(peak), peakAcc: Math.round(acc) };
    for (const s of sp) list.push({ joint: key, kind, t: +(s.f / fps).toFixed(3), f: s.f, deg: +s.step.toFixed(1) });
    return qs;
  };
  track('neck', 'neck', 'Chest', 'Neck'); track('head', 'head', 'Neck', 'Head'); track('chest', 'spine', 'Spine', 'Chest');
  const counts = { headOver: 0, chestOver: 0, elbowFlip: 0, kneeFlip: 0, hyperElbow: 0, hyperKnee: 0, wristOver: 0, twistOver: 0, ankleOver: 0, toesUnder: 0, footSlide: 0, heelUp: 0 };
  const maxes = { headTilt: 0, chestTilt: 0, plantedTravelM: 0, ankleLowCm: 0, elbow: 0, knee: 0, wristFlex: 0, wristDev: 0, wristTwist: 0, forearmTwist: 0, ankle: 0, ankleRoll: 0, toeBelowCm: 0, slideCm: 0 };
  const events = (k, f, deg) => list.push({ joint: k, kind: 'flip', t: +(f / fps).toFixed(3), f, deg: +deg.toFixed(1) });
  for (const S of SIDES) {
    const s = S[0];
    track('shoulder' + s, 'shoulder', 'Chest', S + 'UpperArm');
    const elbowQ = track('elbow' + s, 'elbow', S + 'UpperArm', S + 'LowerArm');
    const wristQ = track('wrist' + s, 'wrist', S + 'LowerArm', S + 'Hand');
    track('knee' + s, 'knee', S + 'UpperLeg', S + 'LowerLeg');
    const ankleQ = track('ankle' + s, 'ankle', S + 'LowerLeg', S + 'Foot');
    track('hip' + s, 'hip', 'Hips', S + 'UpperLeg');
    track('finger' + s, 'finger', S + 'Hand', S + 'IndexProximal');
    // Hinges: the axis of the bend as the limb plane, in the parent's frame so a body turn doesn't count.
    for (const [key, ku, kl, kh, par, cnt, hyper, mx] of [['elbow', 'UpperArm', 'LowerArm', 'Hand', 'Chest', 'elbowFlip', 'hyperElbow', 'elbow'], ['knee', 'UpperLeg', 'LowerLeg', 'Foot', 'Hips', 'kneeFlip', 'hyperKnee', 'knee']]) {
      let prev = null, avg = [0, 0, 0];
      const u = H[S + ku], l = H[S + kl], t = H[S + kh], par0 = H[par];
      const n = world.map((w) => { const a = v.sub(w.P[l], w.P[u]), b = v.sub(w.P[t], w.P[l]), ang = Math.acos(Math.min(1, Math.max(-1, v.dot(v.norm(a), v.norm(b))))); const ax = q.rot(q.inv(w.Q[u]), v.norm(v.cross(a, b))); return { ang: ang * DEG, ax }; });
      for (const x of n) if (x.ang > 20) avg = v.add(avg, x.ax);
      avg = v.norm(avg);
      for (let f = 0; f < nf; f++) {
        const x = n[f]; maxes[mx] = Math.max(maxes[mx], x.ang);
        if (v.dot(x.ax, avg) < 0 && x.ang > 4) counts[hyper]++;
        if (x.ang < 3) counts[hyper]++;
        if (prev && x.ang > 12 && prev.ang > 12) { const st = Math.acos(Math.min(1, v.dot(prev.ax, x.ax))) * DEG; if (st > 8) { counts[cnt]++; events(key + s, f, st); } }
        prev = x;
      }
    }
    // Wrist: flexion about the finger curl axis, deviation across it, twist about the forearm. Natural: 70 flex, 60 extend, 30 deviation, no twist to speak of.
    const curl = v.norm(head.curl[S + 'IndexProximal']);
    const across = v.norm(v.cross([0, 1, 0], curl));
    let wOver = 0;
    for (const a of wristQ) {
      const { ang: tw, swing } = twistOf(a, [0, 1, 0]); const r = q.log(swing), flex = v.dot(r, curl) * DEG, dev = v.dot(r, across) * DEG;
      maxes.wristFlex = Math.max(maxes.wristFlex, Math.abs(flex)); maxes.wristDev = Math.max(maxes.wristDev, Math.abs(dev)); maxes.wristTwist = Math.max(maxes.wristTwist, Math.abs(tw * DEG));
      if (flex > 70 || flex < -60 || Math.abs(dev) > 32 || Math.abs(tw * DEG) > 45) wOver++;
    }
    counts.wristOver += wOver;
    for (const a of elbowQ) { const tw = Math.abs(twistOf(a, [0, 1, 0]).ang * DEG); maxes.forearmTwist = Math.max(maxes.forearmTwist, tw); if (tw > 95) counts.twistOver++; }
    // Ankle against the shin: pitch and roll. Natural: 25 up, 50 down, 22 roll.
    const shinFoot = v.norm(q.rot(q.inv(rest[S + 'LowerLeg']), v.norm(q.rot(rest[S + 'Foot'], [0, 1, 0]))));
    for (const a of ankleQ) { const r = q.log(a), ang = v.len(r) * DEG; maxes.ankle = Math.max(maxes.ankle, ang); const roll = Math.abs(v.dot(r, [0, 1, 0])) * DEG; maxes.ankleRoll = Math.max(maxes.ankleRoll, roll); if (ang > 50 || roll > 25) counts.ankleOver++; }
    // Feet on the floor.
    const fi = H[S + 'Foot'], ti = H[S + 'Toes'];
    for (let f = 1; f < nf; f++) {
      const w = world[f], y = w.P[ti][1] - floor, an = w.P[fi][1] - floor;
      if (y < -.008) { counts.toesUnder++; maxes.toeBelowCm = Math.max(maxes.toeBelowCm, -y * 100); }
      const low0 = world[f - 1].P[fi], dx = Math.hypot(w.P[fi][0] - low0[0], w.P[fi][2] - low0[2]);
      const ank = opts.ankle ?? .1245;
      maxes.ankleLowCm = Math.max(maxes.ankleLowCm, (ank - an) * 100);
      if (an < ank + .012 && Math.abs(w.P[fi][1] - low0[1]) < .003) { if (dx > .0035) counts.footSlide++; maxes.slideCm = Math.max(maxes.slideCm, dx * 100); maxes.plantedTravelM += dx; }
    }
    void shinFoot;
  }
  for (const w of world) {
    const tilt = (n) => Math.acos(Math.min(1, v.norm(q.rot(w.Q[H[n]], q.rot(q.inv(rest[n]), [0, 1, 0])))[1])) * DEG, th = tilt('Head'), tc = tilt('Chest');
    maxes.headTilt = Math.max(maxes.headTilt, th); maxes.chestTilt = Math.max(maxes.chestTilt, tc); if (th > 38) counts.headOver++; if (tc > 42) counts.chestOver++;
  }
  let snaps = 0, jerk = 0; const byKind = {};
  for (const r of Object.values(rows)) { snaps += r.snaps; jerk += r.jerk; const b = (byKind[r.kind] ??= { snaps: 0, jerk: 0, peakSpeed: 0, peakAcc: 0 }); b.snaps += r.snaps; b.jerk += r.jerk; b.peakSpeed = Math.max(b.peakSpeed, r.peakSpeed); b.peakAcc = Math.max(b.peakAcc, r.peakAcc); }
  list.sort((a, b) => a.t - b.t);
  return { snaps, jerk, byKind, rows, counts, maxes: Object.fromEntries(Object.entries(maxes).map(([k, x]) => [k, +x.toFixed(2)])), list };
}
