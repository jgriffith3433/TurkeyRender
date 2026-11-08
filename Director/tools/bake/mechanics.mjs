// Body mechanics: the last pass of a bake, over the cleaned take. It works on joint angles, so an elbow stays a hinge and a foot stays planted whatever it adds.
// What it adds, and where it comes from:
//   hips before the legs are solved: a small drop as weight lands on a foot, a weight shift with the sung phrase (plant(), called by clean.mjs)
//   torso: shoulders turn against the hips, breath through the chest, the chest and shoulders moving with the phrase
//   head: leads a turn, trails a bounce, settles after a stop
//   arms: the upper arm leads, the forearm trails it, the hand trails the forearm, each with a spring that overshoots a stop and settles
// Hits stay on the beat: each spring reads its input ahead by its own lag, so the hand lands where the take put it and the shoulder gets there first.
import { v, q, DEG, fk, twistOf } from './body.mjs';
import { smooth, continuous, despike, softLim } from './clean.mjs';

const R = Math.PI / 180;
export const DEFAULTS = {
  plantDrop: .016, plantTime: .075,      // metres at a hard landing, seconds to the bottom of the dip
  counter: .42, counterMax: 11, roll: .4, // shoulders against hips: share of the hips' fast turn, degrees at most; share of their roll
  breath: 1, sing: 0, sway: 0,           // breath scale; how much he moves with the phrase; hips metres of weight shift per phrase
  headLead: .075, headMax: 16,           // seconds the head is ahead of the chest in a turn, degrees at most
  headHz: 5.2, headZeta: .58, chestHz: 4.6, chestZeta: .62,
  upperHz: 8.5, upperZeta: .62, upperLead: .022, bodyDrag: .03, bodyDragMax: 14,
  foreHz: 8, foreZeta: .6, foreDrag: .022, foreDragMax: 10,
  handHz: 7, handZeta: .68, handDrag: .028,
};

/** A damped spring chasing a track. It reads `lead` seconds ahead, so at slow speeds it sits on the track `lag - lead` seconds late. */
export function spring(x, hz, zeta, fps, lead = 0) {
  const w = 2 * Math.PI * hz, sub = 4, dt = 1 / fps / sub, n = x.length, out = new Array(n), at = (t) => { const c = Math.min(n - 1, Math.max(0, t)), i = Math.floor(c), k = c - i; return i + 1 < n ? x[i] + (x[i + 1] - x[i]) * k : x[i]; };
  let y = at(lead * fps), u = 0;
  for (let f = 0; f < n; f++) {
    for (let s = 0; s < sub; s++) { const tgt = at(f + lead * fps + s / sub - 1); u += (w * w * (tgt - y) - 2 * zeta * w * u) * dt; y += u * dt; }
    out[f] = y;
  }
  return out;
}
const lagOf = (hz, zeta) => 2 * zeta / (2 * Math.PI * hz);
/** The same for a rotation track: its four numbers, then back on the sphere. Lags are small, so this is close enough to the true thing and has no axis to flip. */
function springQ(t, hz, zeta, fps, lead) {
  const c = [0, 1, 2, 3].map((i) => spring(t.map((a) => a[i]), hz, zeta, fps, lead));
  return continuous(t.map((_, f) => q.norm([c[0][f], c[1][f], c[2][f], c[3][f]])));
}
const shift = (t, d, fps) => { const n = t.length, out = new Array(n); for (let f = 0; f < n; f++) { const c = Math.min(n - 1, Math.max(0, f + d * fps)), i = Math.floor(c); out[f] = i + 1 < n ? q.slerp(t[i], t[i + 1], c - i) : t[i]; } return out; };
const yawOf = (Q, restQ) => { const d = q.rot(Q, q.rot(q.inv(restQ), [0, 0, 1])); return Math.atan2(d[0], d[2]); };
const unwrap = (a) => { const o = [...a]; for (let i = 1; i < o.length; i++) { while (o[i] - o[i - 1] > Math.PI) o[i] -= 2 * Math.PI; while (o[i] - o[i - 1] < -Math.PI) o[i] += 2 * Math.PI; } return o; };
const peak = (t, tau) => (t <= 0 ? 0 : (t / tau) * Math.exp(1 - t / tau));

/** What the song asks of his body at each frame: `breath` 0 to 1 (full lungs), `stress` a kick on a sung word, `side` -1 to 1 swinging from phrase to phrase, `lift` the phrase's rise. Empty song: a steady slow breath. */
export function phrasing(song, t0, nf, fps) {
  const out = { breath: new Float32Array(nf), stress: new Float32Array(nf), side: new Float32Array(nf), lift: new Float32Array(nf) };
  const lines = song?.lines ?? [], env = song?.vocal, ef = song?.fps ?? 60;
  const when = (f) => t0 + f / fps, voc = (t) => { if (!env) return 0; const x = t * ef, i = Math.min(env.length - 2, Math.max(0, Math.floor(x))); return env[i] + (env[i + 1] - env[i]) * (x - i); };
  // Lines close together share a breath: only a gap of over a third of a second gets one.
  const groups = []; for (const l of lines) { const g = groups[groups.length - 1]; if (g && l.t - g.end < .34) { g.end = l.end; g.lines.push(l); } else groups.push({ t: l.t, end: l.end, lines: [l] }); }
  for (let f = 0; f < nf; f++) {
    const t = when(f); let b = .5 + .5 * Math.sin(2 * Math.PI * t / 3.6), side = 0, lift = 0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i], prevEnd = groups[i - 1]?.end ?? -9, intake = Math.min(.42, Math.max(.2, (g.t - prevEnd) * .6));
      const fade = (u) => u * u * (3 - 2 * u), s = i % 2 ? 1 : -1;
      if (t >= g.t - intake - .9 && t < g.t - intake) b = Math.min(b, .25);
      if (t >= g.t - intake && t < g.t) b = fade((t - (g.t - intake)) / intake);             // the intake, quick, just before the line
      else if (t >= g.t && t <= g.end) b = 1 - .85 * ((t - g.t) / (g.end - g.t + .001)) ** .8; // it empties over the line
      else if (t > g.end && t < g.end + .9) b = .15;
      const u = (t - (g.t - .3)) / (g.end - g.t + .6);
      if (u > 0 && u < 1) { const e = Math.sin(Math.PI * Math.min(1, u)); side = s * e ** .7; lift = e; }
    }
    out.breath[f] = b; out.side[f] = side; out.lift[f] = lift;
  }
  // A stressed word: the vocal rises sharply. Its attack, not its level, so a held note doesn't hold his head down.
  let last = -9;
  for (let f = 1; f < nf; f++) {
    const t = when(f), slow = (voc(t - .05) + voc(t - .1) + voc(t - .15)) / 3, a = voc(t) - slow;
    if (a > .1 && voc(t) > .18 && t - last > .2) { last = t; const amp = Math.min(1, a * 3); for (let g = f; g < Math.min(nf, f + fps); g++) out.stress[g] = Math.max(out.stress[g], amp * peak((g - f) / fps, .09)); }
  }
  return out;
}

export class Mechanics {
  constructor(opts = {}, song = null) { this.o = { ...DEFAULTS, ...opts }; this.song = song; this.notes = {}; }

  /** Hips, before clean.mjs solves the legs: a dip where weight lands, a lateral weight shift with the phrase. Both go into the hips and the knees take them, because the feet are held. */
  hips({ d, feet, drop, world, K, fps, nf, H }) {
    const o = this.o, dip = new Float32Array(nf); let plants = 0;
    this.ph = phrasing(this.song, d.head.t0, nf, fps);
    if (o.plantDrop > 0) for (const F of feet) for (const g of F.segs) {
      if (g.a < 2) continue;
      // How hard: the ankle's speed coming in, and how much of a step it was.
      const inSp = Math.max(...Array.from({ length: Math.min(8 * K, g.a) | 0 }, (_, i) => F.sp[g.a - 1 - i] ?? 0));
      const amp = o.plantDrop * Math.min(1, Math.max(0, (inSp - .25) / 1.4)); if (amp <= 0.001) continue;
      plants++;
      for (let f = g.a; f < Math.min(nf, g.a + .6 * fps); f++) dip[f] = Math.max(dip[f], amp * peak((f - g.a) / fps, o.plantTime));
    }
    this.notes.plants = plants;
    const dp = smooth(Array.from(dip), .8 * K), dropped = drop.map((x, f) => x - dp[f]);
    const shift = new Array(nf).fill([0, 0, 0]);
    if (o.sway > 0) {
      const sw = smooth(Array.from(this.ph.side), 7 * K), hr = world.map((w) => { const r = v.sub(w.P[H.RightUpperLeg], w.P[H.LeftUpperLeg]); r[1] = 0; return v.norm(r); });
      for (let f = 0; f < nf; f++) shift[f] = v.mul(hr[f], sw[f] * o.sway);
    }
    return { drop: dropped, shift };
  }

  /** Everything over the waist. `out` is every bone's local rotation, changed in place. */
  body({ d, out, hipsP, tops, K, H, P, rest, nf, fps }) {
    const o = this.o, iHips = H.Hips, ph = this.ph ?? phrasing(this.song, d.head.t0, nf, fps);
    const pose = (f) => fk(d, f, (i) => ({ p: i === iHips ? hipsP[f] : d.lp(0, i), q: out[i][f] }), tops[f]);
    let world = Array.from({ length: nf }, (_, f) => pose(f));
    const ups = rest.Hips, hipYaw = unwrap(world.map((w) => yawOf(w.Q[iHips], ups)));
    const hipFast = hipYaw.map((x, f, a) => x - smooth(a, 26 * K)[f]);
    // Hips' roll against the slow line of their sides.
    const sideOf = (w) => v.norm(v.sub(w.P[H.RightUpperLeg], w.P[H.LeftUpperLeg])), hipRoll = world.map((w) => Math.asin(Math.max(-1, Math.min(1, sideOf(w)[1]))));
    const rollFast = hipRoll.map((x, f, a) => x - smooth(a, 30 * K)[f]);
    const brSm = smooth(Array.from(ph.breath), 3 * K), sideSm = smooth(Array.from(ph.side), 5 * K), liftSm = smooth(Array.from(ph.lift), 5 * K), stressSm = smooth(Array.from(ph.stress), 1 * K);
    const yawAdd = hipFast.map((y) => softLim(-y * o.counter * DEG, -o.counterMax, o.counterMax, 4) * R), rollAdd = rollFast.map((r) => -r * o.roll);
    // Spine and chest take the turn, the roll, the breath and the phrase. The neck and head give it back, so he doesn't lose the lens.
    const Spine = H.Spine, Chest = H.Chest, Neck = H.Neck, Head = H.Head;
    for (let f = 0; f < nf; f++) {
      const W = world[f], up = [0, 1, 0], fw = v.norm(v.cross(sideOf(W), up)), lat = v.norm(v.cross(up, fw));
      const br = (brSm[f] - .5), sing = o.sing * 1.7;
      const pitch = (-1.5 * br * o.breath - 1.8 * liftSm[f] * sing + 1.5 * stressSm[f] * sing) * R;   // + tips him forward
      const roll = rollAdd[f] + sideSm[f] * 2.6 * sing * R, yaw = yawAdd[f] + sideSm[f] * 3.2 * sing * R;
      const a = q.mul(q.axis(up, yaw * .45), q.mul(q.axis(fw, roll * .45), q.axis(lat, pitch * .45))), b = q.mul(q.axis(up, yaw), q.mul(q.axis(fw, roll), q.axis(lat, pitch)));
      const Qs = q.mul(a, W.Q[Spine]), Qc = q.mul(b, W.Q[Chest]), QnOld = W.Q[Neck], Qh = W.Q[Head];
      out[Spine][f] = q.mul(q.inv(W.Q[P[Spine]]), Qs); out[Chest][f] = q.mul(q.inv(Qs), Qc);
      // The neck lags half of it; the head stays where it was looking, and adds a nod on the stress and a little of the side.
      const Qn = q.mul(q.axis(up, yaw * .4), q.mul(q.axis(fw, roll * .3), QnOld)), nod = (2.2 * stressSm[f] + .9 * liftSm[f]) * sing * R, tilt = sideSm[f] * 2.2 * sing * R;
      const Qh2 = q.mul(q.axis(up, -sideSm[f] * 1.4 * sing * R), q.mul(q.axis(fw, -tilt), q.mul(q.axis(lat, nod), Qh)));
      out[Neck][f] = q.mul(q.inv(Qc), Qn); out[Head][f] = q.mul(q.inv(Qn), Qh2);
      // Shoulders lift on a full breath and on the rise of a phrase, one side more than the other.
      for (const [S, s] of [['Left', -1], ['Right', 1]]) {
        const i = H[S + 'Shoulder']; if (i == null) continue;
        const l = q.rot(q.inv(W.Q[P[i]]), fw), g = (2.6 * br * o.breath + (2.2 * liftSm[f] + s * sideSm[f] * 1.6) * sing) * R;
        out[i][f] = q.mul(q.axis(v.norm(l), -s * g), out[i][f]);
      }
    }
    for (const i of [Spine, Chest, Neck, Head]) continuous(out[i]);
    world = Array.from({ length: nf }, (_, f) => pose(f));

    // The chest settles against the hips; the head against the chest, ahead of it through a turn.
    { const lag = lagOf(o.chestHz, o.chestZeta), c = springQ(out[Chest], o.chestHz, o.chestZeta, fps, lag); for (let f = 0; f < nf; f++) out[Chest][f] = c[f]; }
    world = Array.from({ length: nf }, (_, f) => pose(f));
    const chestYaw = unwrap(world.map((w) => yawOf(w.Q[Chest], rest.Chest)));
    const lead = chestYaw.map((_, f) => { const n = chestYaw.length, c = Math.min(n - 1, f + o.headLead * fps), i = Math.floor(c), k = c - i; return (i + 1 < n ? chestYaw[i] * (1 - k) + chestYaw[i + 1] * k : chestYaw[i]) - chestYaw[f]; });
    const leadS = smooth(lead.map((x) => softLim(x * DEG, -o.headMax, o.headMax, 6) * R), 2 * K);
    const hTarget = world.map((w, f) => { const Qh = q.mul(q.axis([0, 1, 0], leadS[f]), w.Q[Head]); return q.mul(q.inv(w.Q[Neck]), Qh); });
    const hs = springQ(continuous(hTarget), o.headHz, o.headZeta, fps, lagOf(o.headHz, o.headZeta));
    for (let f = 0; f < nf; f++) { const w = world[f], full = q.mul(w.Q[Neck], hs[f]), toH = q.log(q.mul(full, q.inv(w.Q[Head]))), Qn = q.mul(q.exp(v.mul(toH, .4)), w.Q[Neck]); out[Neck][f] = q.mul(q.inv(w.Q[P[Neck]]), Qn); out[Head][f] = q.mul(q.inv(Qn), full); }
    continuous(out[Neck]); continuous(out[Head]);
    out[Neck] = despike(out[Neck], .4 * K, 3 * K, 2); out[Head] = despike(out[Head], .4 * K, 3 * K, 2);
    world = Array.from({ length: nf }, (_, f) => pose(f));

    // Arms, as joint angles.
    for (const S of ['Left', 'Right']) {
      const u = H[S + 'UpperArm'], l = H[S + 'LowerArm'], h = H[S + 'Hand'], par = P[u];
      const rl = q.mul(q.inv(rest[S + 'UpperArm']), rest[S + 'LowerArm']), rh = q.mul(q.inv(rest[S + 'LowerArm']), rest[S + 'Hand']);
      const restArm = v.norm(q.rot(rest[S + 'UpperArm'], [0, 1, 0])), au = v.norm(q.rot(q.inv(rest[S + 'UpperArm']), v.cross([0, 0, -1], restArm))), al0 = q.rot(q.inv(rl), au), al = v.norm(v.sub(al0, v.mul([0, 1, 0], al0[1])));
      const curl = v.norm(d.head.curl[S + 'IndexProximal']), across = v.norm(v.cross([0, 1, 0], curl));
      // Upper arm: it leads, and it trails the chest a little, the way an arm hangs off a body.
      const inChest = continuous(world.map((w) => q.mul(q.inv(w.Q[H.Chest]), w.Q[u])));
      const cQ = continuous(world.map((w) => w.Q[H.Chest])), late = shift(cQ, -o.bodyDrag, fps);
      const dragged = continuous(inChest.map((a, f) => { const dl = q.log(q.mul(q.inv(cQ[f]), late[f])), n = v.len(dl) * DEG, s = n > 0 ? softLim(n, -o.bodyDragMax, o.bodyDragMax, 5) / n : 0; return q.mul(q.exp(v.mul(dl, s)), a); }));
      const lagU = lagOf(o.upperHz, o.upperZeta), Uq = springQ(dragged, o.upperHz, o.upperZeta, fps, lagU + o.upperLead);
      // Elbow: the bend and the forearm's twist, apart. The bend trails what the upper arm just did about the hinge.
      const parts = out[l].map((t) => { const { ang, swing } = twistOf(q.mul(q.inv(rl), t), [0, 1, 0]); return { tw: ang, th: v.dot(q.log(swing), al) }; });
      const sign = Math.sign(smooth(parts.map((x) => x.th), 30 * K).reduce((a, b) => a + b, 0)) || 1;
      const uW = continuous(world.map((w, f) => q.mul(w.Q[H.Chest], Uq[f]))), uLate = shift(uW, -o.foreDrag, fps);
      const sideT = smooth(Array.from(ph.side), 6 * K);
      const th0 = parts.map((x, f) => {
        const dl = q.log(q.mul(q.inv(uW[f]), uLate[f])), add = softLim(v.dot(dl, au) * DEG, -o.foreDragMax, o.foreDragMax, 5);
        // The hand on the side he leans to comes up off its rest with the phrase, a talker's hand, a little more on a stressed word.
        const talk = Math.max(0, (S === 'Right' ? 1 : -1) * sideT[f]) * (o.talk ?? 0) * (1 + stressSm[f] * .35);
        return x.th * DEG + add + sign * talk;
      });
      const lagF = lagOf(o.foreHz, o.foreZeta), th1 = spring(th0, o.foreHz, o.foreZeta, fps, lagF);
      const twist = smooth(unwrap(parts.map((x) => x.tw)), 1 * K);
      // Hand: its flex and deviation trail the forearm.
      const hParts = out[h].map((t) => { const { ang, swing } = twistOf(q.mul(q.inv(rh), t), [0, 1, 0]); const r = q.log(swing); return { tw: ang, flex: v.dot(r, curl) * DEG, dev: v.dot(r, across) * DEG }; });
      const newU = [], newL = [];
      for (let f = 0; f < nf; f++) {
        const w = world[f]; newU[f] = q.mul(q.inv(w.Q[par]), q.mul(w.Q[H.Chest], Uq[f]));
        const b = sign * Math.max(6, Math.min(142, sign * th1[f]));
        newL[f] = q.mul(rl, q.mul(q.axis(al, b * R), q.axis([0, 1, 0], twist[f])));
      }
      const faW = continuous(uW.map((Q, f) => q.mul(Q, newL[f]))), faLate = shift(faW, -o.handDrag, fps);
      const fl0 = hParts.map((x, f) => { const dl = q.rot(q.inv(rh), q.log(q.mul(q.inv(faW[f]), faLate[f]))); return x.flex + softLim(v.dot(dl, curl) * DEG, -13, 13, 5); });
      const dv0 = hParts.map((x, f) => { const dl = q.rot(q.inv(rh), q.log(q.mul(q.inv(faW[f]), faLate[f]))); return x.dev + softLim(v.dot(dl, across) * DEG, -7, 7, 3); });
      const lagH = lagOf(o.handHz, o.handZeta), fl = spring(fl0, o.handHz, o.handZeta, fps, lagH), dv = spring(dv0, o.handHz, o.handZeta, fps, lagH), tw = smooth(hParts.map((x) => x.tw), 1 * K);
      for (let f = 0; f < nf; f++) {
        out[u][f] = newU[f]; out[l][f] = newL[f];
        const sw = q.exp(v.add(v.mul(curl, softLim(fl[f], -58, 62, 12) * R), v.mul(across, softLim(dv[f], -24, 24, 8) * R)));
        out[h][f] = q.mul(rh, q.mul(sw, q.axis([0, 1, 0], tw[f])));
      }
      continuous(out[u]); continuous(out[l]); continuous(out[h]);
      // Nothing it added may be a snap. A gentle filter, heavier only around a one-frame step, as in clean.mjs.
      out[u] = despike(out[u], .35 * K, 2.4 * K, 3); out[l] = despike(out[l], .35 * K, 2.4 * K, 3); out[h] = despike(out[h], .6 * K, 3 * K, 3);
    }
  }
}

/** Numbers for with and without: how sharp the stops are and how far the hands travel. A take that went floaty loses peak speed and stopping power and its stops go late. */
export function sharpness(d, Hb = ['LeftHand', 'RightHand'], beats = null) {
  const { H, nf, fps } = d, res = {};
  const world = Array.from({ length: nf }, (_, f) => fk(d, f));
  for (const n of Hb) {
    const i = H[n], ch = H.Chest, p = world.map((w) => q.rot(q.inv(w.Q[ch]), v.sub(w.P[i], w.P[ch])));
    const sp = p.map((x, f) => (f ? v.len(v.sub(x, p[f - 1])) * fps : 0)), s = smooth(sp, 1.5);
    let peakS = 0, travel = 0, stops = [], top = 0;
    for (let f = 1; f < nf; f++) { peakS = Math.max(peakS, s[f]); travel += sp[f] / fps; }
    // A stop: fast within the last 0.12 s, then near still.
    const w = Math.round(.12 * fps);
    for (let f = w; f < nf - 1; f++) { const before = Math.max(...s.slice(f - w, f)); if (s[f] < .35 && s[f - 1] >= .35 && before > 1.1) stops.push({ f, power: before - s[f] }); }
    res[n] = { peak: +peakS.toFixed(2), travel: +travel.toFixed(2), stops: stops.length, power: +(stops.reduce((a, b) => a + b.power, 0) / (stops.length || 1)).toFixed(2), frames: stops.map((x) => x.f) };
    void top;
  }
  return res;
}
