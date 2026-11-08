// Cleans a dumped take. Works over the whole take at once, which the engine can't: it needs no state because it is run once, at bake time.
// In: every bone's local rotation at 60 Hz, read with MVGround off (leg IK per frame is the worst source of knee flips; this does the feet with time on its side).
// Out: the same bones, where each limb is a true hinge, each foot is held on the floor, and nothing jumps.
import { v, q, DEG, fk, twistOf } from './body.mjs';

const R = Math.PI / 180;
const gauss = (s) => { const n = Math.ceil(s * 3), k = []; let t = 0; for (let i = -n; i <= n; i++) { const w = Math.exp(-i * i / (2 * s * s)); k.push(w); t += w; } return { n, k: k.map((x) => x / t) }; };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };

/** Low-pass of numbers, with optional per-frame confidence. */
export function smooth(a, s, conf) {
  if (s <= 0) return [...a];
  const { n, k } = gauss(s), out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    let sum = 0, w = 0;
    for (let j = -n; j <= n; j++) { const f = Math.min(a.length - 1, Math.max(0, i + j)), g = k[j + n] * (conf ? conf[f] : 1); sum += a[f] * g; w += g; }
    out[i] = sum / (w || 1);
  }
  return out;
}
const smoothV = (a, s, conf) => { const c = [0, 1, 2].map((i) => smooth(a.map((x) => x[i]), s, conf)); return a.map((_, f) => [c[0][f], c[1][f], c[2][f]]); };
const smoothDir = (a, s, conf) => smoothV(a, s, conf).map(v.norm);

/** Keeps a quaternion track on one side of the sphere. */
export function continuous(t) { for (let i = 1; i < t.length; i++) if (q.dot(t[i - 1], t[i]) < 0) t[i] = t[i].map((x) => -x); return t; }

/** Low-pass of a rotation track, with a per-frame sigma: normalized average of nearby, continuous quaternions. */
function smoothQ(t, sigmaOf) {
  const out = new Array(t.length), cache = new Map();
  const K = (s) => { const r = Math.round(s * 4) / 4; if (!cache.has(r)) cache.set(r, gauss(Math.max(r, .05))); return cache.get(r); };
  for (let i = 0; i < t.length; i++) {
    const { n, k } = K(sigmaOf(i)); const c = [0, 0, 0, 0];
    for (let j = -n; j <= n; j++) { const a = t[Math.min(t.length - 1, Math.max(0, i + j))], w = k[j + n] * (q.dot(a, t[i]) < 0 ? -1 : 1); c[0] += a[0] * w; c[1] += a[1] * w; c[2] += a[2] * w; c[3] += a[3] * w; }
    out[i] = q.norm(c);
  }
  return out;
}

const stepsOf = (t) => { const s = new Array(t.length).fill(0); for (let i = 1; i < t.length; i++) s[i] = q.angle(t[i - 1], t[i]) * DEG; return s; };

/** Frames where a track jumps: a one-frame step far bigger than the ones around it. */
function snapFrames(step, floor = 4) {
  const out = [];
  for (let i = 1; i < step.length; i++) {
    if (step[i] < floor) continue;
    const near = []; for (let k = -6; k <= 6; k++) if (Math.abs(k) >= 2 && step[i + k] != null) near.push(step[i + k]);
    if (step[i] > Math.max(1.6 * median(near), floor)) out.push(i);
  }
  return out;
}

/** A gentle base filter, and a heavier one only around each jump. Real hits are a run of big steps, not one, so they keep their edge. */
export function despike(t, base, heavy, rounds = 4) {
  let cur = smoothQ(t, () => base);
  for (let r = 0; r < rounds; r++) {
    const snaps = snapFrames(stepsOf(cur));
    if (!snaps.length) break;
    const sig = new Float32Array(t.length).fill(0); const reach = Math.ceil(heavy * 2.6);
    for (const s of snaps) for (let j = -reach; j <= reach; j++) { const f = s + j; if (f < 0 || f >= t.length) continue; const w = .5 + .5 * Math.cos(Math.PI * j / (reach + 1)); sig[f] = Math.max(sig[f], w); }
    cur = smoothQ(cur, (i) => .05 + sig[i] * heavy);
  }
  return cur;
}

const softMax = (x, hi, m) => (x <= hi - m ? x : hi - m + m * (1 - Math.exp(-(x - (hi - m)) / m)));
export const softLim = (x, lo, hi, m = 8) => { m = Math.min(m, (hi - lo) * .25); return x > hi - m ? softMax(x, hi, m) : x < lo + m ? -softMax(-x, -lo, m) : x; };
const rise = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
// Same bone, pitch and roll gone, heading kept, against the rest pose, as MVGround's Flat.
const flat = (Q, rest) => q.mul(q.from(q.rot(Q, q.rot(q.inv(rest), [0, 1, 0])), [0, 1, 0]), Q);
/** A world rotation from where the bone's own axes must point: local y to dir, local a (perpendicular) to hinge. */
function aim(dir, hinge, a) {
  const y = v.norm(dir), x = v.norm(v.sub(hinge, v.mul(y, v.dot(hinge, y)))), z = v.cross(x, y);
  const ly = [0, 1, 0], lx = v.norm(v.sub(a, v.mul(ly, v.dot(a, ly)))), lz = v.cross(lx, ly);
  const from = basisQ(lx, ly, lz), to = basisQ(x, y, z);
  return q.mul(to, q.inv(from));
}
function basisQ(x, y, z) {
  const t = x[0] + y[1] + z[2]; let w, a, b, c;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; a = (y[2] - z[1]) / s; b = (z[0] - x[2]) / s; c = (x[1] - y[0]) / s; }
  else if (x[0] > y[1] && x[0] > z[2]) { const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2; w = (y[2] - z[1]) / s; a = s / 4; b = (y[0] + x[1]) / s; c = (z[0] + x[2]) / s; }
  else if (y[1] > z[2]) { const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2; w = (z[0] - x[2]) / s; a = (y[0] + x[1]) / s; b = s / 4; c = (z[1] + y[2]) / s; }
  else { const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2; w = (x[1] - y[0]) / s; a = (z[0] + x[2]) / s; b = (z[1] + y[2]) / s; c = s / 4; }
  return q.norm([a, b, c, w]);
}

/** Where the bend of a limb goes: the direction from the root-tip line to the middle joint, for every frame, in the parent's frame. */
function poleTrack(world, up, mid, tip, par) {
  return world.map((w) => {
    const x = v.norm(v.sub(w.P[tip], w.P[up])), e = v.sub(w.P[mid], w.P[up]);
    const p = v.sub(e, v.mul(x, v.dot(e, x))), h = v.len(p);
    return { dir: q.rot(q.inv(w.Q[par]), v.norm(p)), h };
  });
}

function solveLimb(S, T, pole, L1, L2) {
  const d = v.sub(T, S), D = Math.min(v.len(d), (L1 + L2) * .9995), x = v.norm(d);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const p = v.norm(v.sub(pole, v.mul(x, v.dot(pole, x))));
  const E = v.add(v.add(S, v.mul(x, a)), v.mul(p, h));
  return { E, W: v.add(S, v.mul(x, D)), hinge: v.norm(v.cross(p, x)) };
}

export function clean(d, o = {}) {
  const { H, nb, nf, fps, head } = d, rest = head.rest, P = d.parent, K = fps / 60;
  const base = (o.base ?? .75) * K, heavy = (o.heavy ?? 3.2) * K;
  const floor = o.floor ?? d.top(0).p[1];
  const local = []; for (let i = 0; i < nb; i++) { const t = new Array(nf); for (let f = 0; f < nf; f++) t[f] = d.lq(f, i); local.push(continuous(t)); }
  const iHips = H.Hips;
  // 1. Spikes out of every bone, gently, then a look at what the body now does.
  const fingers = new Set(); for (const n of Object.keys(H)) if (/Thumb|Index|Middle|Ring|Little/.test(n)) fingers.add(H[n]);
  for (let i = 0; i < nb; i++) local[i] = despike(local[i], fingers.has(i) ? 2.2 * K : base, heavy);
  let hipsP = smoothV(Array.from({ length: nf }, (_, f) => d.lp(f, iHips)), base);
  const tops = Array.from({ length: nf }, (_, f) => d.top(f));
  const pose = (f, ov) => fk(d, f, (i) => ({ p: i === iHips ? hipsP[f] : d.lp(0, i), q: ov?.[i] ? ov[i][f] : local[i][f] }), tops[f]);
  let world = []; for (let f = 0; f < nf; f++) world.push(pose(f));
  const SIDE = ['Left', 'Right'];
  const armature = (f) => world[f].Q[P[iHips]];

  // 1b. He stays upright. A mocap dip reads as a bow from a low lens and a head roll puts the top of his head to camera, so the chest and the head keep inside a cone around up, softly, with the correction low-passed.
  const tilts = (Qs, restQ, fwdOf, F, Sd) => Qs.map((Q, f) => {
    const u = v.norm(q.rot(Q, q.rot(q.inv(restQ), [0, 1, 0]))), fw = fwdOf(f), rt = v.cross([0, 1, 0], fw);
    const tf = Math.asin(Math.max(-1, Math.min(1, v.dot(u, fw)))) * DEG, ts = Math.asin(Math.max(-1, Math.min(1, v.dot(u, rt)))) * DEG;
    const nf_ = softLim(tf, F[0], F[1], F[2]) * R, ns = softLim(ts, -Sd[0], Sd[0], Sd[1]) * R;
    const n = v.add(v.add(v.mul(fw, Math.sin(nf_)), v.mul(rt, Math.sin(ns))), [0, Math.sqrt(Math.max(.05, 1 - Math.sin(nf_) ** 2 - Math.sin(ns) ** 2)), 0]);
    return q.log(q.from(u, v.norm(n)));
  });
  const flatFwd = (Q, restQ) => { const d0 = q.rot(Q, q.rot(q.inv(restQ), [0, 0, 1])); d0[1] = 0; return v.norm(d0); };
  if (o.upright !== false) {
    const cQ = world.map((w) => w.Q[H.Chest]), hipFwd = world.map((w) => flatFwd(w.Q[iHips], rest.Hips));
    const fix = smoothV(tilts(cQ, rest.Chest, (f) => hipFwd[f], o.chestCone ?? [-20, 30, 10], [24, 10]), 6 * K);
    for (let f = 0; f < nf; f++) {
      const half = q.exp(v.mul(fix[f], .5)), all = q.exp(fix[f]), W = world[f], Qs = q.mul(half, W.Q[H.Spine]), Qc = q.mul(all, W.Q[H.Chest]);
      local[H.Spine][f] = q.mul(q.inv(W.Q[P[H.Spine]]), Qs); local[H.Chest][f] = q.mul(q.inv(Qs), Qc);
    }
    world = []; for (let f = 0; f < nf; f++) world.push(pose(f));
    // The head: its path low-passed in the world, so the clip's roll goes, then held in its cone. The neck takes some, so it never hinges at one joint.
    let hQ = smoothQ(continuous(world.map((w) => w.Q[H.Head])), () => 5 * K);
    // A neck turns so far and no further. Against the chest, in rest space: the head's turn is held inside it, so in a spin it goes round with the body.
    { const toRest = (f) => q.mul(world[f].Q[H.Chest], q.inv(rest.Chest)), parts = hQ.map((Q, f) => twistOf(q.mul(q.inv(toRest(f)), q.mul(Q, q.inv(rest.Head))), [0, 1, 0]));
      const yaw = smooth(parts.map((x) => softLim(x.ang * DEG, -45, 45, 15)), 3 * K);
      hQ = continuous(hQ.map((_, f) => q.mul(q.mul(toRest(f), q.mul(parts[f].swing, q.axis([0, 1, 0], yaw[f] * R))), rest.Head))); }
    const fix2 = smoothV(tilts(hQ, rest.Head, (f) => flatFwd(hQ[f], rest.Head), o.headCone ?? [-16, 20, 8], [15, 7]), 3 * K);
    for (let f = 0; f < nf; f++) {
      const W = world[f], Qh = q.mul(q.exp(fix2[f]), hQ[f]), toH = q.log(q.mul(Qh, q.inv(W.Q[H.Head]))), Qn = q.mul(q.exp(v.mul(toH, .4)), W.Q[H.Neck]);
      local[H.Neck][f] = q.mul(q.inv(W.Q[P[H.Neck]]), Qn); local[H.Head][f] = q.mul(q.inv(Qn), Qh);
    }
    continuous(local[H.Spine]); continuous(local[H.Chest]); continuous(local[H.Neck]); continuous(local[H.Head]);
    for (const i of [H.Spine, H.Chest, H.Neck, H.Head]) local[i] = despike(local[i], .6 * K, 3 * K);
    world = []; for (let f = 0; f < nf; f++) world.push(pose(f));
  }

  // 2. Feet. Sole height comes from the rest pose, as MVGround's.
  const lenF = v.len(d.lp(0, H.LeftToes));
  const restD = v.norm(q.rot(rest.LeftFoot, d.lp(0, H.LeftToes)));
  const ankle = (Math.min(.9, Math.max(.2, -restD[1])) + .04) * lenF, ball = .04 * lenF;
  const sink = o.sink ?? .045, stairs = !!o.planted;
  const feet = SIDE.map((S) => {
    const a = H[S + 'Foot'];
    const pos = world.map((w) => w.P[a]), rot = world.map((w) => w.Q[a]);
    const sp = new Array(nf).fill(0);
    for (let f = 1; f < nf - 1; f++) sp[f] = Math.hypot(pos[f + 1][0] - pos[f - 1][0], pos[f + 1][1] - pos[f - 1][1], pos[f + 1][2] - pos[f - 1][2]) * fps / 2;
    return { S, a, pos, rot, sp: smooth(sp, 1.5 * K) };
  });
  // The lower foot decides the hips, over time, so one step can't throw them. Both feet well up is a jump: he stays up.
  const heights = feet.map((F) => F.pos.map((p) => p[1] - floor - ankle));
  const low = heights[0].map((_, f) => Math.min(heights[0][f], heights[1][f]));
  let drop = stairs ? low.map(() => 0) : smooth(low.map((x) => -(Math.min(x, .1) + sink) * (1 - rise(.12, .24, x))), 5 * K);
  // Contact: near the floor and slow, with hysteresis, then short gaps closed and short touches dropped.
  for (const [fi, F] of feet.entries()) {
    const h = heights[fi].map((x, f) => x + drop[f]); let on = false; const c = new Array(nf);
    for (let f = 0; f < nf; f++) {
      const hOK = stairs ? true : h[f] < (on ? .06 : .035), vOK = F.sp[f] < (on ? (stairs ? 1.05 : 2.4) : (stairs ? .7 : 1.8));
      on = hOK && vOK; c[f] = on;
    }
    for (let f = 0, last = -999; f < nf; f++) { if (c[f]) { if (f - last > 1 && f - last <= 4 * K) for (let g = last; g < f; g++) c[g] = true; last = f; } }
    const spans = []; for (let f = 0; f < nf; f++) { if (!c[f]) continue; let e = f; while (e + 1 < nf && c[e + 1]) e++; if (e - f + 1 >= 5 * K) spans.push([f, e]); f = e; }
    F.spans = spans;
  }
  // World target of each ankle, and each foot's rotation.
  const ramp = 5 * K;
  for (const [fi, F] of feet.entries()) {
    const w = new Float32Array(nf), tgt = F.pos.map((p) => [...p]), restF = rest[F.S + 'Foot'], lift = new Float32Array(nf);
    // Every stay on the floor is one or more stances, each dead still at the slowest place in it. A clip's slide becomes a held foot and then a short real step, never a skate.
    const segs = [], maxSlide = o.slideMax ?? .2;
    for (const [a, b] of F.spans) {
      let st = a;
      for (let f = a; f <= b; f++) {
        const far = Math.hypot(F.pos[f][0] - F.pos[st][0], F.pos[f][2] - F.pos[st][2]);
        if (far > maxSlide && f - st >= (o.minStance ?? 16) * K) { segs.push([st, f - 1]); st = f; }
      }
      if (b - st >= 12 * K || !segs.length || st === a) segs.push([st, b]); else segs[segs.length - 1][1] = b;
    }
    F.segs = segs.map(([a, b]) => {
      let bx = 0, bz = 0, by = 0, tw = 0;
      for (let f = a; f <= b; f++) { const g = 1 / (F.sp[f] + .05); bx += F.pos[f][0] * g; bz += F.pos[f][2] * g; by += F.pos[f][1] * g; tw += g; }
      return { a, b, x: bx / tw, z: bz / tw, y: by / tw };
    });
    const swap = 5 * K;    // frames of a step between two stances, each side of the join
    F.segs.forEach((g, n) => {
      for (let f = g.a; f <= g.b; f++) w[f] = 1;
      const next = F.segs[n + 1], prev = F.segs[n - 1];
      // Stances close together trade over a short lifted step, taken out of their ends; a longer gap is the clip's own swing.
      const aIn = prev && g.a - prev.b <= 2 * swap ? g.a : Math.max(0, g.a - ramp), bOut = next && next.a - g.b <= 2 * swap ? g.b : Math.min(nf - 1, g.b + ramp);
      for (let f = aIn; f < g.a; f++) { const k = rise(0, 1, (f - (g.a - ramp)) / ramp); if (k > w[f]) w[f] = k; }
      for (let f = g.b + 1; f <= bOut; f++) { const k = 1 - rise(0, 1, (f - g.b) / ramp); if (k > w[f]) w[f] = k; }
    });
    for (let f = 0; f < nf; f++) {
      const y0 = stairs ? F.pos[f][1] : F.pos[f][1] + drop[f];
      tgt[f] = [F.pos[f][0], y0, F.pos[f][2]];
    }
    F.segs.forEach((g, n) => {
      const y = stairs ? g.y : floor + ankle;
      for (let f = g.a; f <= g.b; f++) tgt[f] = [g.x, y, g.z];
      const next = F.segs[n + 1];
      if (next && next.a - g.b <= 2 * swap) {
        // A step takes a fixed time, and starts before the join, so the foot lands on the next stance's first frame.
        const st = Math.max(g.a + 2, g.b - swap), en = Math.min(next.b - 2, next.a + swap), dist = Math.hypot(next.x - g.x, next.z - g.z), yN = stairs ? next.y : floor + ankle;
        for (let f = st; f <= en; f++) {
          const u = (f - st) / (en - st), k = rise(0, 1, u);
          tgt[f] = [g.x + (next.x - g.x) * k, y + (yN - y) * k + Math.sin(Math.PI * u) * Math.min(.05, .08 + dist * .2), g.z + (next.z - g.z) * k];
          lift[f] = Math.sin(Math.PI * u); w[f] = Math.min(w[f], 1 - Math.sin(Math.PI * u));
        }
      } else {
        for (let f = Math.max(0, g.a - ramp); f < g.a; f++) { const k = rise(0, 1, (f - (g.a - ramp)) / ramp); const p = tgt[f]; if (w[f] > 0 && f < g.a) tgt[f] = [p[0] + (g.x - p[0]) * k, p[1] + (y - p[1]) * k, p[2] + (g.z - p[2]) * k]; }
        for (let f = g.b + 1; f <= Math.min(nf - 1, g.b + ramp); f++) { const k = 1 - rise(0, 1, (f - g.b) / ramp); const p = tgt[f]; tgt[f] = [p[0] + (g.x - p[0]) * k, p[1] + (y - p[1]) * k, p[2] + (g.z - p[2]) * k]; }
      }
    });
    // A foot in the air that skims the floor at speed is a step, so it comes up.
    if (!stairs) for (let f = 0; f < nf; f++) if (w[f] < .5 && !lift[f]) tgt[f][1] = Math.max(tgt[f][1], floor + ankle + .045 * rise(.7, 1.4, F.sp[f]) * (1 - w[f]));
    // Nothing under the floor, ever.
    if (!stairs) for (let f = 0; f < nf; f++) tgt[f][1] = Math.max(tgt[f][1], floor + ankle - .002);
    F.w = w; F.tgt = smoothV(tgt, .8 * K);
    for (const g of F.segs) for (let f = g.a + 2; f <= g.b - 2; f++) if (!lift[f]) F.tgt[f] = [g.x, stairs ? g.y : floor + ankle, g.z];
    // A foot is built, not filtered: its heading (where the toes point, kept near the hips', low-passed), and how far the toes drop in the air, inside what an ankle does. No roll, so no bent ankle. Flat on the floor.
    const fwdH = q.rot(q.inv(rest.Hips), [0, 0, 1]), headOf = (d3) => Math.atan2(d3[0], d3[2]), wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const toeL = d.lp(0, H[F.S + 'Toes']), restToe = v.norm(q.rot(restF, toeL)), rho = headOf(restToe);
    const hipYaw = world.map((w) => headOf(q.rot(w.Q[iHips], fwdH)));
    const raw = F.rot.map((Q) => v.norm(q.rot(Q, toeL)));
    const conf = raw.map((t) => rise(.2, .65, Math.hypot(t[0], t[2])) + .02);
    let u = raw.map((t, f) => wrap(headOf(t) - hipYaw[f] - rho));
    for (let f = 1; f < nf; f++) { while (u[f] - u[f - 1] > Math.PI) u[f] -= 2 * Math.PI; while (u[f] - u[f - 1] < -Math.PI) u[f] += 2 * Math.PI; }
    u = smooth(u.map((a) => softLim(wrap(a) * DEG, -55, 55, 18) * R), 5 * K, conf);
    const toeUp = smooth(raw.map((t, f) => softLim((Math.asin(Math.max(-1, Math.min(1, t[1]))) - Math.asin(restToe[1])) * DEG, -42, 14, 10)), 2.2 * K);
    F.q = continuous(F.rot.map((_, f) => {
      const h = F.tgt[f][1] - floor - ankle, near = stairs ? Math.min(1, w[f] * 1.5) : Math.max(w[f], 1 - rise(.025, .1, h));
      const yaw = hipYaw[f] + u[f], B = q.mul(q.axis([0, 1, 0], yaw), restF), lat = q.rot(q.axis([0, 1, 0], yaw + rho), [1, 0, 0]);
      return q.mul(q.axis(lat, -toeUp[f] * R * (1 - near)), B);
    }));
    F.heading = F.q.map((_, f) => hipYaw[f] + u[f] + rho);
    F.q = despike(F.q, 2 * K, 5 * K);
    if (!stairs) for (let f = 0; f < nf; f++) { const toe = F.tgt[f][1] + q.rot(F.q[f], d.lp(0, H[F.S + 'Toes']))[1], need = floor + ball; if (toe < need) { const fl = flat(F.q[f], restF), lie = F.tgt[f][1] + q.rot(fl, d.lp(0, H[F.S + 'Toes']))[1]; if (lie > toe) F.q[f] = q.slerp(F.q[f], fl, Math.min(1, (need - toe) / (lie - toe))); } }
  }
  // Natural width, while both are down: ankles at least this far apart across his hips.
  const width = o.width ?? .18;
  { const push = new Array(nf).fill(0), side = [];
    for (let f = 0; f < nf; f++) {
      const w = world[f]; let s = v.sub(w.P[H.RightUpperLeg], w.P[H.LeftUpperLeg]); s[1] = 0; s = v.norm(s); side.push(s);
      const sep = v.dot(v.sub(feet[1].tgt[f], feet[0].tgt[f]), s); push[f] = Math.max(0, width - sep) * .5 * feet[0].w[f] * feet[1].w[f];
    }
    const pz = smooth(push, 4 * K);
    for (let f = 0; f < nf; f++) { feet[0].tgt[f] = v.sub(feet[0].tgt[f], v.mul(side[f], pz[f])); feet[1].tgt[f] = v.add(feet[1].tgt[f], v.mul(side[f], pz[f])); }
  }
  // The hips, then: down far enough that a planted leg is never locked straight.
  const LU = v.len(d.lp(0, H.LeftLowerLeg)), LL = v.len(d.lp(0, H.LeftFoot)), reach = (LU + LL) * .98;
  const need = new Array(nf).fill(0);
  for (let f = 0; f < nf; f++) {
    for (const F of feet) {
      if (F.w[f] < .2) continue;
      const u = world[f].P[H[F.S + 'UpperLeg']], h = [u[0], u[1] + drop[f], u[2]], t = F.tgt[f], dx = Math.hypot(h[0] - t[0], h[2] - t[2]);
      if (dx >= reach) continue;
      need[f] = Math.max(need[f], (h[1] - t[1]) - Math.sqrt(reach * reach - dx * dx));
    }
  }
  const maxed = need.map((_, f) => { let m = 0; for (let j = -6; j <= 6; j++) m = Math.max(m, need[Math.min(nf - 1, Math.max(0, f + j))] ?? 0); return m; });
  const extra = smooth(maxed.map((x) => Math.min(x, .1)), 3.5 * K);
  drop = drop.map((x, f) => x - Math.max(0, extra[f]));
  // Weight landing on a foot and the sway with a phrase go in here, before the legs are solved, so the knees take them.
  let hipsShift = null;
  if (o.mech) { const m = o.mech.hips({ d, feet, drop, world, K, fps, nf, H }); drop = m.drop; hipsShift = m.shift; }
  hipsP = hipsP.map((p, f) => { const a = armature(f), up = hipsShift ? v.add([0, drop[f], 0], hipsShift[f]) : [0, drop[f], 0]; return v.add(p, q.rot(q.inv(a), up)); });
  world = []; for (let f = 0; f < nf; f++) world.push(pose(f));

  const out = local.map((t) => t.slice());
  // 3. Legs: a hinge at the knee, the bend's direction low-passed where the leg is nearly straight and so says little.
  const restLocal = (name, parent) => q.mul(q.inv(rest[parent]), rest[name]);
  for (const F of feet) {
    const S = F.S, u = H[S + 'UpperLeg'], l = H[S + 'LowerLeg'], parQ = iHips;
    // A leg nearly straight says nothing about where the knee points, so there the foot's heading decides, and a knee can never swing round. A pole that points backward is noise.
    const pole = poleTrack(world, u, l, F.a, parQ), toeI = H[S + 'Toes'];
    const heading = world.map((w, f) => q.rot(q.inv(w.Q[parQ]), [Math.sin(F.heading[f]), 0, Math.cos(F.heading[f])]));
    const dirs = smoothDir(pole.map((p, f) => { const c = rise(.02, .1, p.h) * rise(-.5, .1, v.dot(p.dir, heading[f])); return v.add(v.mul(p.dir, c), v.mul(heading[f], (1 - c) + .02)); }), 3.5 * K);
    // The hinge comes from the skeleton, never from the take: a retargeted clip spends frames with the knee bent backward, and those would vote the axis the wrong way round.
    const au = q.rot(q.inv(rest[S + 'UpperLeg']), [1, 0, 0]), al = q.rot(q.inv(restLocal(S + 'LowerLeg', S + 'UpperLeg')), au);
    // A flat foot under a leaning shin is a bent ankle. So a foot does what a foot does: with the knee far over the toes the heel comes up, rolling about the ball; in a wide stance the sole tilts a little with the shin.
    { const heel = new Array(nf).fill(0), roll = new Array(nf).fill(0);
      for (let f = 0; f < nf; f++) {
        const w = world[f], T = F.tgt[f], so = solveLimb(w.P[u], T, q.rot(w.Q[parQ], dirs[f]), LU, LL), up = v.norm(v.sub(so.E, T)), h = F.heading[f], fw = [Math.sin(h), 0, Math.cos(h)], lt = v.cross([0, 1, 0], fw);
        const fd = Math.asin(Math.max(-1, Math.min(1, v.dot(up, fw)))) * DEG, sd = Math.asin(Math.max(-1, Math.min(1, v.dot(up, lt)))) * DEG;
        heel[f] = Math.max(0, fd - (o.dorsi ?? 26)); roll[f] = Math.max(-10, Math.min(10, sd * .4));
      }
      // A real step rolls: it lands on the heel with the toes up, rocks flat, and leaves off the ball with the heel high. Only where the foot really travels, so a dance stays on its feet.
      const push = new Array(nf).fill(0), strike = new Array(nf).fill(0);
      if (o.heelToe) F.segs.forEach((g, n) => {
        const prev = F.segs[n - 1], next = F.segs[n + 1], gap = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.z - b.z) : 0), s0 = rise(.12, .5, gap(prev, g)), s1 = rise(.12, .5, gap(g, next));
        if (next && s1 > 0) { const a = Math.max(g.a, g.b - .24 * fps), up = (stairs ? 34 : 30) * s1; for (let f = Math.floor(a); f <= Math.min(nf - 1, g.b + 7 * K); f++) push[f] = Math.max(push[f], up * rise(a, g.b, f) * (f > g.b ? 1 - rise(g.b + 2 * K, g.b + 7 * K, f) : 1)); }
        // Going down a stair he lands on the ball instead, the heel coming down after.
        if (prev && s0 > 0) { const e = g.a + .14 * fps, st = g.a - 8 * K, tgtA = (stairs ? 12 : 17) * s0; for (let f = Math.max(0, Math.floor(st)); f <= Math.min(nf - 1, e); f++) { const k = rise(st, g.a - 2 * K, f) * (1 - rise(g.a, e, f)) * tgtA; if (stairs) push[f] = Math.max(push[f], k); else strike[f] = Math.max(strike[f], k); } }
      });
      const hs = smooth(heel.map((x, f) => Math.min(x, stairs ? 50 : 26) + push[f]), 2.5 * K), st = smooth(strike, 1.5 * K), rs = smooth(roll, 3.5 * K), ballL = d.lp(0, toeI);
      for (let f = 0; f < nf; f++) {
        const h = F.heading[f], fw = [Math.sin(h), 0, Math.cos(h)], lat = q.rot(q.axis([0, 1, 0], h), [1, 0, 0]);
        const Rq = q.mul(q.axis(fw, -rs[f] * R), q.axis(lat, hs[f] * R)), B = v.add(F.tgt[f], q.rot(F.q[f], ballL));
        F.tgt[f] = v.add(B, q.rot(Rq, v.sub(F.tgt[f], B))); F.q[f] = q.mul(Rq, F.q[f]);
        if (st[f] > .01) { const Rs = q.axis(lat, -st[f] * R), C = v.add(v.add(F.tgt[f], [0, -ankle, 0]), v.mul(fw, -.05)); F.tgt[f] = v.add(C, q.rot(Rs, v.sub(F.tgt[f], C))); F.q[f] = q.mul(Rs, F.q[f]); }
      }
      continuous(F.q); }
    const tw = smooth(local[l].map((t) => { const rr = q.mul(q.inv(restLocal(S + 'LowerLeg', S + 'UpperLeg')), t); return Math.max(-.3, Math.min(.3, twistOf(rr, [0, 1, 0]).ang)); }), 6 * K);
    for (let f = 0; f < nf; f++) {
      // A knee's angle changes fastest as the leg straightens, so a soft stop short of straight: this is what turns a locked leg's snap into a bend.
      const w = world[f], T0 = F.tgt[f], d0 = v.sub(T0, w.P[u]), D0 = v.len(d0), T1 = v.add(w.P[u], v.mul(d0, softMax(D0, (LU + LL) * .992, .025) / D0));
      const s = solveLimb(w.P[u], T1, q.rot(w.Q[parQ], dirs[f]), LU, LL);
      const Ru = aim(v.sub(s.E, w.P[u]), s.hinge, au); let Rl = aim(v.sub(s.W, s.E), s.hinge, al);
      Rl = q.mul(q.axis(v.norm(v.sub(s.W, s.E)), tw[f]), Rl);
      out[u][f] = q.mul(q.inv(w.Q[P[u]]), Ru); out[l][f] = q.mul(q.inv(Ru), Rl); out[F.a][f] = q.mul(q.inv(Rl), F.q[f]);
    }
    continuous(out[u]); continuous(out[l]); continuous(out[F.a]);
    out[u] = despike(out[u], .05, 2 * K, 2); out[l] = despike(out[l], .05, 2 * K, 2);
    // The foot stays what it was built to be, whatever that last pass did to the shin.
    for (let f = 0; f < nf; f++) out[F.a][f] = q.mul(q.inv(q.mul(q.mul(world[f].Q[P[u]], out[u][f]), out[l][f])), F.q[f]);
    continuous(out[F.a]);
    const toe = H[S + 'Toes'], rt = restLocal(S + 'Toes', S + 'Foot'); for (let f = 0; f < nf; f++) out[toe][f] = q.slerp(out[toe][f], rt, Math.max(F.w[f], .6));
    out[F.a] = despike(continuous(out[F.a]), .6 * K, 3 * K);
  }
  // 4. Arms: wrist path from the mocap, the elbow's swing low-passed, a true hinge, a soft stop short of locking, and the twist carried by the forearm where a real arm carries it.
  const stats = {};
  for (const S of SIDE) {
    const u = H[S + 'UpperArm'], l = H[S + 'LowerArm'], h = H[S + 'Hand'], parQ = H.Chest, L1 = v.len(d.lp(0, l)), L2 = v.len(d.lp(0, h));
    // The same for an elbow: nearly straight, it points down, back and out, as the engine's IK has it.
    const pole = poleTrack(world, u, l, h, parQ), side = S === 'Left' ? -1 : 1, ref = q.rot(q.inv(rest.Chest), v.norm([side * .4, -.6, -.7])), refOut = q.rot(q.inv(rest.Chest), v.norm([side * .8, -.6, -.05]));
    // With the hand low, the elbow doesn't ride up level with the shoulder: on a hand on the hip that collapses the sleeve into a stump. The hand stays; the elbow swings down and back.
    const dirs = smoothDir(pole.map((p, f) => {
      const w = world[f], c = rise(.015, .09, p.h), low = rise(.1, .35, w.P[u][1] - w.P[h][1]), up = rise(-.55, .05, q.rot(w.Q[parQ], p.dir)[1]), g = low * up * (o.elbowDown ?? .7), dir = v.norm(v.add(v.mul(p.dir, 1 - g), v.mul(refOut, g)));
      return v.add(v.mul(dir, c), v.mul(ref, (1 - c) + .02));
    }), 3.2 * K);
    const restArm = v.norm(q.rot(rest[S + 'UpperArm'], [0, 1, 0]));
    const au = v.norm(q.rot(q.inv(rest[S + 'UpperArm']), v.cross([0, 0, -1], restArm))), rl = restLocal(S + 'LowerArm', S + 'UpperArm'), al = q.rot(q.inv(rl), au);
    const rh = restLocal(S + 'Hand', S + 'LowerArm');
    const curl = v.norm(head.curl[S + 'IndexProximal']), across = v.norm(v.cross([0, 1, 0], curl));
    const fTw = local[l].map((t) => twistOf(q.mul(q.inv(rl), t), [0, 1, 0]).ang);
    const hSplit = local[h].map((t) => { const { ang, swing } = twistOf(q.mul(q.inv(rh), t), [0, 1, 0]); const r = q.log(swing); return { ang, flex: v.dot(r, curl) * DEG, dev: v.dot(r, across) * DEG, rest: v.sub(v.sub(r, v.mul(curl, v.dot(r, curl))), v.mul(across, v.dot(r, across))) }; });
    // Unwrapped, so a twist past 180 can't flip.
    const un = (t) => { const o2 = [...t]; for (let i = 1; i < o2.length; i++) { while (o2[i] - o2[i - 1] > Math.PI) o2[i] -= 2 * Math.PI; while (o2[i] - o2[i - 1] < -Math.PI) o2[i] += 2 * Math.PI; } return o2; };
    // Twist belongs to the forearm, up to what a forearm has. A little past that sits at the wrist; the rest is dropped.
    const total = smooth(un(fTw).map((t, f) => t + hSplit[f].ang), 3 * K).map((t) => t * DEG);
    const fore = total.map((t) => softLim(t, -84, 84, 22)), wristT = total.map((t, f) => softLim(t - fore[f], -22, 22, 10));
    const flex = smooth(hSplit.map((x) => softLim(x.flex, -58, 62, 16)), 1.6 * K), dev = smooth(hSplit.map((x) => softLim(x.dev, -24, 24, 10)), 2.2 * K);
    const minBend = (o.minElbow ?? 7) * R;
    // A hand never crosses in front of his face: it is pushed aside, around the head. Hands framing the head, beside it, stay.
    const off = smoothV(world.map((w) => {
      const Cn = v.add(w.P[H.Head], q.rot(w.Q[H.Head], q.rot(q.inv(rest.Head), [0, .09, .04]))), fw = v.norm(q.rot(w.Q[H.Head], q.rot(q.inv(rest.Head), [0, 0, 1]))), dd = v.sub(w.P[H[S + 'MiddleDistal']], Cn), along = v.dot(dd, fw);
      if (along < .02) return [0, 0, 0];
      const lat = v.sub(dd, v.mul(fw, along)), r = v.len(lat), need = .2;
      if (r >= need) return [0, 0, 0];
      const dir = r > .01 ? v.norm(lat) : v.norm(q.rot(w.Q[H.Head], q.rot(q.inv(rest.Head), [side, -.5, 0])));
      return v.mul(dir, (need - r) * rise(.02, .08, along));
    }), 4 * K);
    for (let f = 0; f < nf; f++) {
      const w = world[f];
      // A soft stop short of a locked elbow: pull the wrist in a little.
      let T = v.add(w.P[h], off[f]); const S0 = w.P[u], D0 = v.len(v.sub(T, S0));
      const Dmax = Math.sqrt(L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(minBend));
      // And short of folding flat: a real elbow stops well before the forearm meets the arm.
      const Dmin = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos((o.maxFold ?? 38) * R));
      const D1 = Math.max(softMax(D0, Dmax, .03), -softMax(-D0, -Dmin, .03)); T = v.add(S0, v.mul(v.norm(v.sub(T, S0)), D1));
      const s = solveLimb(S0, T, q.rot(w.Q[parQ], dirs[f]), L1, L2);
      const Ru = aim(v.sub(s.E, S0), s.hinge, au); const fdir = v.norm(v.sub(s.W, s.E));
      const Rl = q.mul(q.axis(fdir, fore[f] * R), aim(fdir, s.hinge, al));
      out[u][f] = q.mul(q.inv(w.Q[P[u]]), Ru); out[l][f] = q.mul(q.inv(Ru), Rl);
      const sw = q.exp(v.add(v.mul(curl, flex[f] * R), v.mul(across, dev[f] * R)));
      out[h][f] = q.mul(rh, q.mul(sw, q.axis([0, 1, 0], wristT[f] * R)));
    }
    continuous(out[u]); continuous(out[l]); continuous(out[h]);
    out[u] = despike(out[u], .6 * K, 3 * K); out[l] = despike(out[l], .6 * K, 3 * K); out[h] = despike(out[h], 1 * K, 3.5 * K);
    stats[S] = { au: au.map((x) => +x.toFixed(2)), al: al.map((x) => +x.toFixed(2)) };
  }
  // 4b. Body mechanics: see mechanics.mjs.
  if (o.mech) o.mech.body({ d, out, hipsP, tops, K, H, P, rest, nf, fps });
  // 5. The hands: see hands.mjs.
  if (o.hands) o.hands({ d, out, feet, world, K, H, smooth, q, v });
  const data = new Float32Array(nf * nb * 7);
  for (let f = 0; f < nf; f++) for (let i = 0; i < nb; i++) {
    const p = i === iHips ? hipsP[f] : d.lp(f, i), a = q.norm(out[i][f]), g = (f * nb + i) * 7;
    data[g] = p[0]; data[g + 1] = p[1]; data[g + 2] = p[2]; data[g + 3] = a[0]; data[g + 4] = a[1]; data[g + 5] = a[2]; data[g + 6] = a[3];
  }
  return { data, stats: { ...stats, ankle, spans: feet.map((F) => F.segs.length), maxDropExtra: +Math.max(...extra).toFixed(3) } };
}
