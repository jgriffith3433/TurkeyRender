// The motion critic's measures: an animator's eye as numbers, from per-frame bone dumps (`call clipbones`, `call shotbones`), no render.
// Each measure maps to one of the twelve principles where it applies. Thresholds live in CAL and are set from the mocap reference (critic.mjs reference).
// Input: a dump {fps, bones[], frames[{t,q,p,feet,root}], rest{}, curl{}} and options {cuts:[frame...], zerog, travelling, pair}.
// Output: {features, principles:{name:{score, note, na}}, events:[{t, f, kind, part, sev, what}], total}.

const DEG = 180 / Math.PI;
export const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
export const q = {
  mul: (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  inv: (a) => [-a[0], -a[1], -a[2], a[3]],
  rot: (a, p) => { const t = v.mul(v.cross(a, p), 2); return v.add(v.add(p, v.mul(t, a[3])), v.cross(a, t)); },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3],
  angle: (a, b) => 2 * Math.acos(Math.min(1, Math.abs(q.dot(a, b)))) * DEG,
  log: (a) => { const w = a[3] < 0 ? -1 : 1, x = a[0] * w, y = a[1] * w, z = a[2] * w, s = Math.hypot(x, y, z); if (s < 1e-9) return [2 * x, 2 * y, 2 * z]; const k = 2 * Math.atan2(s, a[3] * w) / s; return [x * k, y * k, z * k]; },
};

export const pct = (arr, p) => { const s = arr.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return NaN; return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
export const median = (a) => pct(a, 0.5);
export const mean = (a) => { const s = a.filter((x) => Number.isFinite(x)); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : NaN; };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
/** 10 at `good`, 0 at `bad`, straight between (either way round). */
export const lin = (x, good, bad) => (Number.isFinite(x) ? 10 * clamp01((x - bad) / (good - bad)) : NaN);

export const CORE = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpperArm', 'RightUpperArm', 'LeftUpperLeg', 'RightUpperLeg'];
export const BODY = [...CORE, 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand', 'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot', 'LeftToes', 'RightToes'];
const ENDS = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head'];
const isFinger = (n) => /Thumb|Index|Middle|Ring|Little/.test(n);

// Calibration. Set from the Mixamo mocap reference (critic.mjs reference prints the percentiles) and the labelled fixtures; see Director/review/motion-critic.md.
export const CAL = {
  moveSpeed: 0.12,        // m/s: an end effector is moving above this (and above 20% of its own p95)
  minMoveFrames: 3,       // at 30 fps
  bigChord: { hand: 0.15, foot: 0.15, head: 0.08 },   // m: a move from rest big enough to want anticipation and follow-through
  arc: { good: 0.14, bad: 0.03 },        // median bend (max deviation / chord): mocap p25 .. a straight line
  flat: { good: 0.62, bad: 0.9 },        // mean/peak speed inside a move: a bell .. a constant speed (linear interpolation)
  abrupt: { good: 0.15, bad: 0.7 },      // share of moves that start or stop at over half their peak speed in one frame
  holdSpeed: 12,          // deg/s mean body angular speed: below it the body is holding
  deadSpeed: 1.2,         // deg/s: below it the body is dead still (no breath, no tremble)
  dead: { good: 0.0, bad: 0.3 },         // share of frames dead still
  fastRun: { good: 0.3, bad: 1.1 },      // s: median length of a fast run (above 2.5x the median energy) when the clip has real speed
  anticip: { good: 0.45, bad: 0.0 },     // share of big moves with a counter-move first
  overshoot: { good: 0.4, bad: 0.0 },    // share of big moves that go past and settle back
  coherence: { good: 0.3, bad: 0.85 },   // mean correlation between the parts' speed profiles: each on its own timing .. everything moving as one
  lag: { good: 1.5, bad: 0.0 },          // frames (30 fps): median |best lag| between parts' speed profiles
  snaps: { good: 0.0, bad: 8 },
  snapRatio: 2.2,         // a snap's step over the larger of its two neighbouring frames' steps          // per 10 s, body bones, one-frame steps over 8 deg that stand out
  comSpikes: { good: 0, bad: 4 },        // per 10 s, |COM acceleration| over 40 m/s^2
  slide: { good: 3, bad: 30 },           // cm/s of planted-foot travel (skipped on travelling clips, which play in place)
  frozen: { good: 0.12, bad: 0.6 },      // share of core joints under 1 deg/s while the body moves
  deadJointPenalty: 1.5,  // per core joint that never moves 2 deg in a dump over 2 s
  readability: { good: 0.5, bad: 0.2 },  // best-camera silhouette readability of the key poses
  refDist: { good: 1.2, bad: 3.2 },      // robust z distance from the mocap reference
};

/** Reads a dump into typed arrays. */
export function prepare(d, opts = {}) {
  const fps = d.fps ?? (d.frames.length > 1 ? 1 / (d.frames[1].t - d.frames[0].t) : 30), n = d.frames.length, bones = d.bones, idx = Object.fromEntries(bones.map((b, i) => [b, i]));
  const Q = d.frames.map((f) => f.q), P = d.frames.map((f) => f.p);
  const root = d.frames.map((f) => f.root ?? [0, 0, 0, 0, 0, 0, 1]);
  // world positions: the actor's root carried in
  const W = P.map((row, f) => { const rp = root[f].slice(0, 3), rq = root[f].slice(3); return rq[3] === 1 && !rq[0] && !rq[1] && !rq[2] && !rp[0] && !rp[1] && !rp[2] ? row : row.map((p) => v.add(rp, q.rot(rq, p))); });
  const t = d.frames.map((f) => f.t);
  const cut = new Uint8Array(n); for (const c of opts.cuts ?? []) { const f = typeof c === 'number' && Number.isInteger(c) ? c : Math.round((c - t[0]) * fps); for (let k = -1; k <= 1; k++) if (f + k >= 0 && f + k < n) cut[f + k] = 1; }
  // one-frame angular step of every bone, deg; NaN across a cut
  const step = bones.map((_, i) => { const s = new Float64Array(n); s[0] = NaN; for (let f = 1; f < n; f++) s[f] = cut[f] || cut[f - 1] ? NaN : q.angle(Q[f][i], Q[f - 1][i]); return s; });
  const omega = step.map((s) => s.map((x) => x * fps));
  const has = (b) => idx[b] != null;
  const rest = d.rest ?? {}, curl = d.curl ?? {};
  const parentOf = { Spine: 'Hips', Chest: 'Spine', UpperChest: 'Chest', Neck: has('UpperChest') ? 'UpperChest' : 'Chest', Head: 'Neck', LeftShoulder: has('UpperChest') ? 'UpperChest' : 'Chest', RightShoulder: has('UpperChest') ? 'UpperChest' : 'Chest', LeftUpperArm: has('LeftShoulder') ? 'LeftShoulder' : 'Chest', RightUpperArm: has('RightShoulder') ? 'RightShoulder' : 'Chest', LeftLowerArm: 'LeftUpperArm', RightLowerArm: 'RightUpperArm', LeftHand: 'LeftLowerArm', RightHand: 'RightLowerArm', LeftUpperLeg: 'Hips', RightUpperLeg: 'Hips', LeftLowerLeg: 'LeftUpperLeg', RightLowerLeg: 'RightUpperLeg', LeftFoot: 'LeftLowerLeg', RightFoot: 'RightLowerLeg', LeftToes: 'LeftFoot', RightToes: 'RightFoot', LeftEye: 'Head', RightEye: 'Head', Jaw: 'Head' };
  for (const b of bones) if (isFinger(b)) { const m = b.match(/^(Left|Right)(Thumb|Index|Middle|Ring|Little)(Proximal|Intermediate|Distal)$/); if (m) parentOf[b] = m[3] === 'Proximal' ? m[1] + 'Hand' : m[1] + m[2] + (m[3] === 'Distal' ? 'Intermediate' : 'Proximal'); }
  return { fps, n, bones, idx, Q, P, W, t, cut, step, omega, has, rest, curl, parentOf, zerog: !!opts.zerog, travelling: !!opts.travelling, native: d.native, name: d.clip ?? d.on ?? 'motion' };
}

const posOf = (M, b) => M.W.map((row) => row[M.idx[b]]);
const speedOf = (M, pos) => { const s = new Float64Array(M.n); s[0] = NaN; for (let f = 1; f < M.n; f++) s[f] = M.cut[f] || M.cut[f - 1] ? NaN : v.len(v.sub(pos[f], pos[f - 1])) * M.fps; return s; };
/** Runs where pred(f) holds for at least `min` frames; gaps of up to `gap` frames are bridged. */
function runs(n, pred, min, gap = 0) {
  const out = []; let a = -1, lastTrue = -1;
  for (let f = 0; f <= n; f++) {
    const on = f < n && pred(f);
    if (on) { if (a < 0) a = f; lastTrue = f; }
    else if (a >= 0 && (f - lastTrue > gap || f === n)) { if (lastTrue - a + 1 >= min) out.push([a, lastTrue]); a = -1; }
  }
  return out;
}

/** Moves of an end effector: speed segments, each with its chord, path, bend and velocity shape. */
export function movesOf(M, part) {
  const pos = posOf(M, part), sp = speedOf(M, pos), p95 = pct(Array.from(sp), 0.95);
  const thr = Math.max(CAL.moveSpeed, 0.2 * (p95 || 0)), minF = Math.max(2, Math.round(CAL.minMoveFrames * M.fps / 30));
  const segs = runs(M.n, (f) => sp[f] > thr, minF, Math.round(2 * M.fps / 30));
  return segs.map(([f0, f1]) => {
    const A = pos[f0 - 1] ?? pos[f0], B = pos[f1], chord = v.len(v.sub(B, A)), u = chord > 1e-6 ? v.norm(v.sub(B, A)) : [0, 1, 0];
    let path = 0, dmax = 0, peak = 0, sum = 0, cnt = 0;
    for (let f = f0; f <= f1; f++) {
      path += v.len(v.sub(pos[f], pos[f - 1]));
      const r = v.sub(pos[f], A), along = v.dot(r, u), perp = v.len(v.sub(r, v.mul(u, along))); if (perp > dmax) dmax = perp;
      if (sp[f] > peak) peak = sp[f]; sum += sp[f]; cnt++;
    }
    const onset = sp[f0] / peak, offset = sp[f1] / peak;
    return { part, f0, f1, t0: M.t[f0], t1: M.t[f1], chord, path, bend: chord > 0.03 ? dmax / chord : NaN, peak, flat: cnt ? sum / cnt / peak : NaN, onset, offset, u, A, B, pos, sp };
  });
}

/** Body energy: mean angular speed of the body bones, deg/s. */
export function energyOf(M) {
  const ids = BODY.filter(M.has).map((b) => M.idx[b]), E = new Float64Array(M.n);
  for (let f = 0; f < M.n; f++) { let s = 0, c = 0; for (const i of ids) { const x = M.omega[i][f]; if (Number.isFinite(x)) { s += x; c++; } } E[f] = c ? s / c : NaN; }
  return E;
}

/** Everything, in one pass. */
export function measure(d, opts = {}) {
  const M = prepare(d, opts), fps = M.fps, n = M.n, dur = (n - 1) / fps, per10 = (x) => (dur > 0 ? x * 10 / dur : 0);
  const F = {}, P = {}, events = [];
  const ev = (f, kind, part, sev, what) => events.push({ t: r2(M.t[Math.max(0, Math.min(n - 1, f))]), f, kind, part, sev: r2(sev), what });
  const E = energyOf(M);
  const moves = ENDS.filter(M.has).flatMap((p) => movesOf(M, p)), handMoves = moves.filter((m) => /Hand/.test(m.part));
  const kindOf = (p) => (/Hand/.test(p) ? 'hand' : /Foot/.test(p) ? 'foot' : 'head');

  // 1. ARCS
  { const bends = moves.filter((m) => m.chord >= 0.08 && Number.isFinite(m.bend)).map((m) => m.bend);
    F.arcBend = median(bends); F.straightFrac = bends.length ? bends.filter((b) => b < 0.04).length / bends.length : NaN; F.moves = moves.length;
    for (const m of moves) if (m.chord >= 0.15 && m.bend < 0.03) ev(m.f0, 'straight', m.part, 0.5 + Math.min(0.4, m.chord), `${m.part} travels ${Math.round(m.chord * 100)} cm in a straight line (bend ${r2(m.bend)})`);
    P.arcs = bends.length >= 1 ? { score: lin(F.arcBend, CAL.arc.good, CAL.arc.bad), note: `median bend ${r2(F.arcBend)} over ${bends.length} moves, ${Math.round((F.straightFrac || 0) * 100)}% straight lines` } : { score: NaN, na: true, note: 'too few moves to judge arcs' }; }

  // 2. EASE
  { const long = moves.filter((m) => m.f1 - m.f0 + 1 >= Math.round(5 * fps / 30));
    F.flatness = median(long.map((m) => m.flat)); F.abruptFrac = long.length ? long.filter((m) => m.onset > 0.5 || m.offset > 0.5).length / long.length : NaN;
    for (const m of long) { if (m.onset > 0.6) ev(m.f0, 'abrupt-start', m.part, 0.4 + 0.3 * Math.min(1, m.peak / 2), `${m.part} starts at ${Math.round(m.onset * 100)}% of its peak speed in one frame`); if (m.offset > 0.6) ev(m.f1, 'abrupt-stop', m.part, 0.4 + 0.3 * Math.min(1, m.peak / 2), `${m.part} stops dead from ${Math.round(m.offset * 100)}% of its peak`); if (m.flat > 0.88 && m.chord > 0.1) ev(m.f0, 'linear', m.part, 0.6, `${m.part} moves at one speed for ${r2(m.t1 - m.t0)} s (flat ${r2(m.flat)}): interpolation, not a move`); }
    P.ease = long.length >= 1 ? { score: 0.5 * lin(F.flatness, CAL.flat.good, CAL.flat.bad) + 0.5 * lin(F.abruptFrac, CAL.abrupt.good, CAL.abrupt.bad), note: `speed shape ${r2(F.flatness)} (bell 0.6, constant 1.0), ${Math.round((F.abruptFrac || 0) * 100)}% of moves start or stop in one frame` } : { score: NaN, na: true, note: 'too few moves to judge ease' }; }

  // 3. TIMING
  { const fin = Array.from(E).filter(Number.isFinite), med = median(fin) || 1;
    F.deadFrac = fin.length ? fin.filter((x) => x < CAL.deadSpeed).length / fin.length : NaN;
    const holds = runs(n, (f) => E[f] < CAL.holdSpeed, Math.round(0.25 * fps)), dead = runs(n, (f) => E[f] < CAL.deadSpeed, Math.round(0.33 * fps));
    const fast = runs(n, (f) => E[f] > 2.5 * med, 1), fastLen = fast.map(([a, b]) => (b - a + 1) / fps);
    F.holds = holds.length; F.holdMedianS = median(holds.map(([a, b]) => (b - a + 1) / fps)); F.fastRunMedianS = median(fastLen); F.dynRange = pct(fin, 0.95) / med;
    F.handPeak = pct(handMoves.map((m) => m.peak), 0.95);
    for (const [a, b] of dead) ev(a, 'dead-hold', 'body', 0.5 + Math.min(0.4, (b - a) / fps / 2), `the whole body is dead still for ${r2((b - a + 1) / fps)} s (no breath, no tremble)`);
    const action = (F.handPeak || 0) > 1.0;
    const deadScore = lin(F.deadFrac, CAL.dead.good, CAL.dead.bad), runScore = action && fastLen.length ? lin(F.fastRunMedianS, CAL.fastRun.good, CAL.fastRun.bad) : 10;
    P.timing = { score: 0.6 * deadScore + 0.4 * runScore, note: `${holds.length} holds (median ${r2(F.holdMedianS) ?? 0} s), ${Math.round((F.deadFrac || 0) * 100)}% of frames dead still${action ? `, fast parts median ${r2(F.fastRunMedianS)} s` : ', no fast action to time'}` }; }

  // 4. ANTICIPATION and FOLLOW-THROUGH: on every big move, does the part first go the other way (inside the move, or in the 0.4 s before), and does it go past the end and come back?
  { const big = moves.filter((m) => m.chord >= CAL.bigChord[kindOf(m.part)]);
    let ant = 0, over = 0; const pre = Math.round(0.4 * fps), post = Math.round(0.35 * fps);
    for (const m of big) {
      const proj = (f) => v.dot(v.sub(m.pos[f], m.A), m.u);
      let minProj = 0; for (let f = m.f0; f <= m.f1; f++) minProj = Math.min(minProj, proj(f));
      for (let f = m.f0 - 1; f >= Math.max(0, m.f0 - pre); f--) { if (M.cut[f]) break; minProj = Math.min(minProj, proj(f)); }
      m.anticip = minProj <= -Math.max(0.02, 0.05 * m.chord); if (m.anticip) ant++;
      let maxProj = m.chord, back = false, fmax = m.f1;
      for (let f = m.f0; f < Math.min(n, m.f1 + post); f++) { if (f > m.f1 && M.cut[f]) break; const p = proj(f); if (p > maxProj) { maxProj = p; fmax = f; } }
      const excess = maxProj - m.chord;
      if (excess > Math.max(0.01, 0.02 * m.chord)) { for (let f = fmax + 1; f < Math.min(n, m.f1 + post + 3); f++) { if (f > m.f1 && M.cut[f]) break; if (proj(f) < maxProj - 0.4 * excess) { back = true; break; } } }
      m.overshoot = back; if (back) over++;
      if (!m.anticip && !back && m.chord > 0.3) ev(m.f0, 'no-prep', m.part, 0.45 + Math.min(0.3, m.chord / 2), `${m.part} travels ${Math.round(m.chord * 100)} cm with no anticipation and no overshoot or settle`);
    }
    F.bigMoves = big.length; F.anticipFrac = big.length ? ant / big.length : NaN; F.overshootFrac = big.length ? over / big.length : NaN;
    P.anticipation = big.length >= 1 ? { score: 0.4 * lin(F.anticipFrac, CAL.anticip.good, CAL.anticip.bad) + 0.6 * lin(F.overshootFrac, CAL.overshoot.good, CAL.overshoot.bad), note: `${big.length} big moves: ${ant} with anticipation, ${over} with overshoot and settle` } : { score: NaN, na: true, note: `only ${big.length} big move${big.length === 1 ? '' : 's'}: nothing to prepare or follow through` }; }

  // 5. OVERLAP / DRAG: do the parts move as one (every speed profile the same shape, peaking on the same frame) or does each have its own timing?
  { const parts = ENDS.filter(M.has), prof = {}, z = (a) => { const m = mean(a), s = Math.sqrt(mean(a.map((x) => (x - m) ** 2))) || 1; return a.map((x) => (x - m) / s); };
    const smooth3 = (a) => a.map((_, f) => mean([a[f - 1], a[f], a[f + 1]].filter(Number.isFinite)));
    for (const p of parts) prof[p] = z(smooth3(Array.from(speedOf(M, posOf(M, p))).map((x) => (Number.isFinite(x) ? x : 0))));
    if (M.has('Chest')) prof.Chest = z(smooth3(Array.from(M.omega[M.idx.Chest]).map((x) => (Number.isFinite(x) ? x : 0))));
    const names = Object.keys(prof), L = Math.round(6 * fps / 30), cors = [], lags = [];
    const xcorr = (a, b, l) => { let s = 0, k = 0; for (let f = Math.max(1, -l); f < n && f + l < n; f++) { s += a[f] * b[f + l]; k++; } return k ? s / k : 0; };
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = prof[names[i]], b = prof[names[j]]; let bestL = 0, bestR = -Infinity;
      for (let l = -L; l <= L; l++) { const r = xcorr(a, b, l); if (r > bestR) { bestR = r; bestL = l; } }
      cors.push(xcorr(a, b, 0)); if (bestR > 0.3) lags.push(Math.abs(bestL) * 30 / fps);
    }
    F.coherence = mean(cors); F.lagMedianFrames = lags.length ? median(lags) : NaN;
    // moments where everything peaks together: the body's energy spikes and every part's speed peaks on the same frame
    let together = 0, peaks = 0; const fin = Array.from(E);
    for (let f = 2; f < n - 2; f++) { if (!(fin[f] > 2 * (median(fin.filter(Number.isFinite)) || 1)) || fin[f] < fin[f - 1] || fin[f] < fin[f + 1]) continue; peaks++; const same = parts.filter((p) => prof[p][f] >= prof[p][f - 1] && prof[p][f] >= prof[p][f + 1] && prof[p][f] > 0.5).length; if (same >= Math.max(3, parts.length - 1)) { together++; ev(f, 'lockstep', 'body', 0.5 + 0.1 * same, `${same} of ${parts.length} parts peak on the same frame (everything moves as one)`); } }
    F.lockstepFrac = peaks ? together / peaks : NaN;
    P.overlap = cors.length && Number.isFinite(F.coherence) && (F.handPeak > 0.4 || F.moves >= 3) ? { score: 0.6 * lin(F.coherence, CAL.coherence.good, CAL.coherence.bad) + 0.4 * lin(Math.min(F.lagMedianFrames ?? 0, 3), CAL.lag.good, CAL.lag.bad), note: `parts' speed profiles agree ${r2(F.coherence)} (1 = everything moves as one); typical lag between parts ${r2(F.lagMedianFrames) ?? 0} frames${Number.isFinite(F.lockstepFrac) ? `; ${Math.round(F.lockstepFrac * 100)}% of energy peaks have every part peaking together` : ''}` } : { score: NaN, na: true, note: 'too little motion to see overlap' }; }

  // 6. WEIGHT
  { const w = { Hips: 0.5, Chest: 0.3, Head: 0.1, LeftFoot: 0.05, RightFoot: 0.05 }, parts = Object.keys(w).filter(M.has), tot = parts.reduce((s, b) => s + w[b], 0);
    const com = M.W.map((row) => { let c = [0, 0, 0]; for (const b of parts) c = v.add(c, v.mul(row[M.idx[b]], w[b] / tot)); return c; });
    let spikes = 0; const vel = com.map((c, f) => (f ? v.mul(v.sub(c, com[f - 1]), fps) : [0, 0, 0]));
    for (let f = 2; f < n; f++) { if (M.cut[f] || M.cut[f - 1] || M.cut[f - 2]) continue; const a = v.len(v.mul(v.sub(vel[f], vel[f - 1]), fps)); if (a > 40) { spikes++; ev(f, 'com-spike', 'body', 0.6 + Math.min(0.3, a / 300), `the body's centre of mass jerks at ${Math.round(a)} m/s^2`); } }
    F.comSpikesPer10 = per10(spikes);
    // foot slide while planted, as fidelity_shot.mjs: cm per second over the frames a foot is at its lowest
    let slide = 0, planted = 0; const floorY = Math.min(...M.W.map((row) => Math.min(row[M.idx.LeftFoot]?.[1] ?? 9, row[M.idx.RightFoot]?.[1] ?? 9)));
    for (const b of ['LeftFoot', 'RightFoot'].filter(M.has)) { const p = posOf(M, b); for (let f = 1; f < n; f++) { if (M.cut[f] || M.cut[f - 1]) continue; if (p[f][1] < floorY + 0.03 && p[f - 1][1] < floorY + 0.03) { slide += Math.hypot(p[f][0] - p[f - 1][0], p[f][2] - p[f - 1][2]); planted++; } } }
    F.slideCmPerS = planted ? slide * 100 / (planted / fps) : 0; F.plantedFrac = planted / (2 * n);
    // zero-g: the body changes speed with nothing to push on
    let pushes = 0;
    if (M.zerog) { const k = Math.round(0.1 * fps); for (let f = k; f < n - k; f += k) { if (M.cut[f]) continue; const dv = v.len(v.sub(vel[f + k], vel[f - k])); if (dv > 0.25) { pushes++; ev(f, 'speed-change', 'body', 0.5 + Math.min(0.4, dv), `in zero-g the body changes speed by ${r2(dv)} m/s with nothing to push on`); } } }
    F.zgSpeedChanges = M.zerog ? per10(pushes) : null;
    const slideScore = M.travelling || M.zerog || F.plantedFrac < 0.05 ? 10 : lin(F.slideCmPerS, CAL.slide.good, CAL.slide.bad);
    const zg = M.zerog ? lin(F.zgSpeedChanges, 0, 6) : 10;
    P.weight = { score: 0.5 * lin(F.comSpikesPer10, CAL.comSpikes.good, CAL.comSpikes.bad) + 0.25 * slideScore + 0.25 * zg, note: `${spikes} centre-of-mass jerks${M.zerog ? `, ${pushes} speed changes with no push (zero-g)` : M.travelling ? ', foot slide not judged (travelling clip plays in place)' : `, planted feet slide ${Math.round(F.slideCmPerS)} cm/s`}` }; }

  // 7. SNAPS / POPS
  { let snaps = 0, fsnaps = 0; const thr = 8 * 30 / fps;
    for (let i = 0; i < M.bones.length; i++) {
      const s = M.step[i], fing = isFinger(M.bones[i]);
      for (let f = 2; f < n - 1; f++) {
        if (!(s[f] > thr) || s[f] < s[f - 1] || s[f] < s[f + 1]) continue;
        // a snap is a spike in the bone's own speed: the frame steps far more than BOTH its neighbours (a fast mocap swing is a bell 4-6 frames wide,
        // its peak about 1.2-1.5x the frames beside it; a pose jump or a flip is one frame standing alone). Calibrated 2026-11-08 on 174 mocap clips.
        const nb = Math.max(Number.isFinite(s[f - 1]) ? s[f - 1] : 0, Number.isFinite(s[f + 1]) ? s[f + 1] : 0);
        if (s[f] > Math.max(CAL.snapRatio * nb, thr)) { if (fing) fsnaps++; else { snaps++; ev(f, 'snap', M.bones[i], 0.7 + Math.min(0.3, s[f] / 60), `${M.bones[i]} jumps ${Math.round(s[f])} deg in one frame`); } }
      }
    }
    for (const p of ENDS.filter(M.has)) { const pos = posOf(M, p), stepAt = (f) => f >= 1 && f < n && !M.cut[f] && !M.cut[f - 1] ? v.len(v.sub(pos[f], pos[f - 1])) : 0; for (let f = 1; f < n; f++) { if (M.cut[f] || M.cut[f - 1]) continue; const dd = stepAt(f); if (dd > 0.18 && dd > CAL.snapRatio * Math.max(stepAt(f - 1), stepAt(f + 1))) { /* a real punch moves 15-20 cm a frame for several frames; a pop is one frame alone */ snaps++; ev(f, 'pop', p, 0.8, `${p} moves ${Math.round(dd * 100)} cm in one frame`); } } }
    F.snapsPer10 = per10(snaps); F.fingerSnapsPer10 = per10(fsnaps);
    P.snaps = { score: lin(F.snapsPer10, CAL.snaps.good, CAL.snaps.bad), note: `${snaps} body snaps or pops${fsnaps ? `, ${fsnaps} finger snaps` : ''} in ${r2(dur)} s` }; }

  // 8. STIFFNESS
  { const core = CORE.filter(M.has), moving = []; let frozenSum = 0;
    for (let f = 1; f < n; f++) { if (!(E[f] > 20)) continue; let fr = 0; for (const b of core) if (M.omega[M.idx[b]][f] < 1) fr++; moving.push(f); frozenSum += fr / core.length; }
    F.frozenFrac = moving.length ? frozenSum / moving.length : NaN;
    const deadJoints = dur >= 2 ? core.filter((b) => { const Q0 = M.Q[0][M.idx[b]]; let mx = 0; for (let f = 1; f < n; f++) mx = Math.max(mx, q.angle(Q0, M.Q[f][M.idx[b]])); return mx < 2; }) : [];
    F.deadJoints = deadJoints.length; F.deadJointNames = deadJoints;
    // the longest stretch where the limbs move and the spine (Spine, Chest, Neck) does not
    const spine = ['Spine', 'Chest', 'Neck'].filter(M.has); const stiff = runs(n, (f) => E[f] > 20 && spine.every((b) => M.omega[M.idx[b]][f] < 1.5), Math.round(0.3 * fps));
    for (const [a, b] of stiff) ev(a, 'dead-spine', 'Spine', 0.5 + Math.min(0.4, (b - a) / fps), `limbs move for ${r2((b - a + 1) / fps)} s while the spine and neck stay frozen`);
    P.stiffness = moving.length >= Math.round(0.3 * fps) ? { score: Math.max(0, lin(F.frozenFrac, CAL.frozen.good, CAL.frozen.bad) - CAL.deadJointPenalty * deadJoints.length), note: `${Math.round((F.frozenFrac || 0) * 100)}% of core joints frozen while the body moves${deadJoints.length ? `; never moves: ${deadJoints.join(', ')}` : ''}` } : { score: NaN, na: true, note: 'the body hardly moves: stiffness not judged' }; }

  // 9. SILHOUETTE at the key poses
  { const holds = runs(n, (f) => E[f] < CAL.holdSpeed, Math.round(0.25 * fps)); let keys = holds.map(([a, b]) => (a + b) >> 1);
    if (keys.length < 3) { const every = Math.max(1, Math.round(0.5 * fps)); keys = []; for (let f = Math.min(n - 1, every >> 1); f < n; f += every) keys.push(f); }
    keys = keys.slice(0, 16);
    const reads = keys.map((f) => silhouette(M, f));
    F.readability = mean(reads.map((r) => r.best)); F.twinnedFrac = reads.length ? reads.filter((r) => r.twinned).length / reads.length : NaN;
    for (const r of reads) if (r.best < 0.22) ev(r.f, 'weak-silhouette', 'pose', 0.35 + (0.22 - r.best), `the pose reads badly from every camera (readability ${r2(r.best)}${r.twinned ? ', arms twinned' : ''})`);
    P.silhouette = reads.length ? { score: Math.max(0, lin(F.readability, CAL.readability.good, CAL.readability.bad) - 1.5 * (F.twinnedFrac || 0)), note: `${reads.length} key poses, readability ${r2(F.readability)} (best of front, side, three-quarter), ${Math.round((F.twinnedFrac || 0) * 100)}% twinned` } : { score: NaN, na: true, note: 'no poses' }; }

  // 10. HANDS and FACE
  { const hands = handsOf(M); Object.assign(F, hands.features);
    let pen = 0; const notes = [];
    if (hands.fannedFrac > 0.3) { pen += 3; notes.push(`fingers flat and splayed ${Math.round(hands.fannedFrac * 100)}% of the time`); }
    if (hands.clawedFrac > 0.5) { pen += 3; notes.push(`hands clawed ${Math.round(hands.clawedFrac * 100)}%`); }
    if (hands.frozenHands && dur > 1.5) { pen += 2; notes.push('fingers never move (mannequin hands)'); }
    if (hands.bowedFrac > 0.5) { pen += 2; notes.push(`head bowed ${Math.round(hands.bowedFrac * 100)}% of the time`); ev(hands.bowedAt, 'bowed-head', 'Head', 0.5, `the head hangs ${Math.round(hands.bowMedian)} deg forward of the chest`); }
    if (hands.faceFrozen && M.native === false) { pen += 1; notes.push('eyes and jaw bones never move (blendshape face not seen here)'); }   // a clip has no eyes of its own; a rendered cut should (gaze, eyes cues)
    P.hands = { score: Math.max(0, 10 - pen), note: notes.length ? notes.join('; ') : `fingers curl ${Math.round(hands.curlMedian)} deg, spread ${Math.round(hands.spreadMedian)} deg, head level` }; }

  // 11. CONTACT: hands through the body or the face; with a partner dump, reaches into the air
  { let selfPen = 0, air = 0; const hip = M.idx.Hips, neck = M.idx.Neck ?? M.idx.Head, head = M.idx.Head;
    for (const h of ['LeftHand', 'RightHand'].filter(M.has)) {
      const hi = M.idx[h];
      for (let f = 0; f < n; f++) {
        const row = M.W[f], a = row[hip], b = row[neck], p = row[hi], ab = v.sub(b, a), tt = Math.max(0, Math.min(1, v.dot(v.sub(p, a), ab) / (v.dot(ab, ab) || 1))), near = v.len(v.sub(p, v.add(a, v.mul(ab, tt))));
        if (near < 0.07 || (head != null && v.len(v.sub(p, row[head])) < 0.09)) { selfPen++; if (selfPen % Math.round(fps / 3) === 1) ev(f, 'self-penetration', h, 0.6, `${h} is inside the ${near < 0.07 ? 'torso' : 'head'}`); }
      }
    }
    if (opts.pair) { const B = prepare(opts.pair, { cuts: opts.cuts }), m = Math.min(n, B.n); for (const h of ['LeftHand', 'RightHand'].filter(M.has)) { const hi = M.idx[h], u = M.idx[h.replace('Hand', 'UpperArm')], l = M.idx[h.replace('Hand', 'LowerArm')]; const reach = runs(m, (f) => { const row = M.W[f], e = Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(v.sub(row[u], row[l])), v.norm(v.sub(row[hi], row[l])))))) * DEG; if (e < 155) return false; const brow = B.W[f]; let d = Infinity; for (const bb of BODY.filter(B.has)) d = Math.min(d, v.len(v.sub(row[hi], brow[B.idx[bb]]))); return d > 0.12 && d < 0.45; }, Math.round(0.3 * fps)); for (const [a, b] of reach) { air++; ev(a, 'air-reach', h, 0.6, `${h} reaches straight out for ${r2((b - a + 1) / fps)} s and touches nothing (${opts.pairName ?? 'the partner'} is 12-45 cm away)`); } } }
    F.selfPenFrac = selfPen / (2 * n); F.airReaches = air;
    P.contact = { score: Math.max(0, 10 - 20 * F.selfPenFrac - air), note: `${selfPen ? `hands inside the body ${Math.round(F.selfPenFrac * 100)}% of the time` : 'hands clear of the body'}${opts.pair ? `, ${air} reaches into air` : ' (no partner dump: hit and catch targets not judged)'}`, partial: !opts.pair }; }

  // 12. REFERENCE DISTANCE: the statistical signature against the mocap reference
  { const sig = signature(M, E, moves); Object.assign(F, sig);
    if (opts.reference?.stats) { const { d, worst } = refDistance(sig, opts.reference.stats); F.refDistance = d; F.refWorst = worst; P.reference = { score: lin(d, CAL.refDist.good, CAL.refDist.bad), note: `${r2(d)} robust z from ${opts.reference.count} mocap clips; furthest: ${worst.map((w) => `${w.k} ${w.z > 0 ? 'high' : 'low'} (${r2(Math.abs(w.z))})`).join(', ')}` }; }
    else P.reference = { score: NaN, na: true, note: 'no reference yet: node Director/tools/critic.mjs reference' }; }

  for (const k of Object.keys(F)) if (typeof F[k] === 'number') F[k] = r2(F[k]);
  for (const k of Object.keys(P)) if (Number.isFinite(P[k].score)) P[k].score = Math.round(P[k].score * 10) / 10;
  const total = totalOf(P);
  events.sort((a, b) => b.sev - a.sev);
  return { name: M.name, fps, frames: n, seconds: r2(dur), zerog: M.zerog, features: F, principles: P, events, worst: worstOf(events), total };
}

export const WEIGHTS = { arcs: 1, ease: 1, timing: 1, anticipation: 1, overlap: 1.2, weight: 0.8, snaps: 1, stiffness: 1.2, silhouette: 0.6, hands: 0.8, contact: 0.6, reference: 1.5 };
export function totalOf(P) { let s = 0, w = 0; for (const [k, p] of Object.entries(P)) if (Number.isFinite(p.score)) { s += p.score * (WEIGHTS[k] ?? 1); w += WEIGHTS[k] ?? 1; } return w ? Math.round(s / w * 10) / 10 : NaN; }
/** The worst moments: events merged within a quarter second, top 5 by severity. */
export function worstOf(events, k = 5) {
  const out = [];
  for (const e of events) { const near = out.find((o) => Math.abs(o.t - e.t) < 0.25); if (near) { if (!near.also.includes(e.kind)) near.also.push(e.kind); continue; } out.push({ ...e, also: [] }); if (out.length >= k) break; }
  return out;
}

/** Finger curl and spread, head bow, face bones. */
function handsOf(M) {
  const n = M.n, curls = [], spreads = [], fanned = new Uint8Array(n), clawed = new Uint8Array(n); let fingerMoves = 0;
  const localRest = (b) => { const r = M.rest[b], rp = M.rest[M.parentOf[b]]; return r && rp ? q.mul(q.inv(rp), r) : null; };
  for (const S of ['Left', 'Right']) {
    const prox = ['Index', 'Middle', 'Ring', 'Little'].map((f) => `${S}${f}Proximal`).filter(M.has), mids = ['Index', 'Middle', 'Ring', 'Little'].map((f) => `${S}${f}Intermediate`).filter(M.has);
    if (!prox.length) continue;
    const rests = Object.fromEntries([...prox, ...mids].map((b) => [b, localRest(b)]));
    for (const b of [...prox, ...mids]) { const i = M.idx[b]; for (let f = 1; f < n; f++) if (M.step[i][f] > 0.3) { fingerMoves++; break; } }
    for (let f = 0; f < n; f++) {
      let c = 0, k = 0;
      for (const b of [...prox, ...mids]) { const R = rests[b]; if (!R) continue; const dq = q.mul(q.inv(R), M.Q[f][M.idx[b]]), ax = M.curl[b]; const rv = q.log(dq); c += ax ? Math.abs(v.dot(rv, v.norm(ax))) * DEG : v.len(rv) * DEG; k++; }
      const curl = k ? c / k : NaN; curls.push(curl);
      const ip = M.idx[`${S}IndexProximal`], ii = M.idx[`${S}IndexIntermediate`], lp = M.idx[`${S}LittleProximal`], li = M.idx[`${S}LittleIntermediate`];
      let spread = NaN; if (ip != null && ii != null && lp != null && li != null) { const a = v.norm(v.sub(M.W[f][ii], M.W[f][ip])), b = v.norm(v.sub(M.W[f][li], M.W[f][lp])); spread = Math.acos(Math.max(-1, Math.min(1, v.dot(a, b)))) * DEG; }
      spreads.push(spread);
      if (curl < 12 && spread > 28) fanned[f] = 1; if (curl > 85) clawed[f] = 1;
    }
  }
  // head pitch from its rotation against the rest pose: how far the top of the head tips forward (actor frame; the hips carry the actor's own frame)
  const bows = []; let bowedAt = 0; const bowed = new Uint8Array(n);
  if (M.has('Head') && M.rest.Head) { const W = worldRot(M); for (let f = 0; f < n; f++) { const d = q.mul(W[f][M.idx.Head], q.inv(M.rest.Head)), top = q.rot(d, [0, 1, 0]), ang = Math.asin(Math.max(-1, Math.min(1, top[2]))) * DEG; bows.push(ang); if (ang > 25) { bowed[f] = 1; if (!bowedAt) bowedAt = f; } } }
  const faceBones = ['LeftEye', 'RightEye', 'Jaw'].filter(M.has); let faceMoved = false; for (const b of faceBones) { const i = M.idx[b]; for (let f = 1; f < n; f++) if (M.step[i][f] > 0.2) { faceMoved = true; break; } }
  const sum = (a) => Array.from(a).reduce((x, y) => x + y, 0);
  return { curlMedian: median(curls), spreadMedian: median(spreads), fannedFrac: n ? sum(fanned) / n : 0, clawedFrac: n ? sum(clawed) / n : 0, frozenHands: curls.length > 0 && fingerMoves === 0, bowedFrac: bows.length ? sum(bowed) / n : 0, bowMedian: median(bows), bowedAt, faceFrozen: faceBones.length > 0 && !faceMoved && n / M.fps > 2,
    features: { curlMedian: median(curls), spreadMedian: median(spreads), fannedFrac: n ? sum(fanned) / n : 0, bowMedian: median(bows) } };
}

/** Every bone's rotation in the actor's frame at each frame (the hips' local rotation is already in that frame). */
export function worldRot(M) {
  const order = M.bones.map((b, i) => i).sort((a, b) => depth(M, M.bones[a]) - depth(M, M.bones[b]));
  return M.Q.map((row) => { const W = new Array(row.length); for (const i of order) { const par = M.parentOf[M.bones[i]], pi = par != null ? M.idx[par] : undefined; W[i] = pi != null && W[pi] ? q.mul(W[pi], row[i]) : row[i]; } return W; });
}
function depth(M, b) { let d = 0; while (M.parentOf[b] && M.idx[M.parentOf[b]] != null && d < 20) { b = M.parentOf[b]; d++; } return d; }

// Silhouette: the skeleton as capsules, projected on three fixed cameras, rasterized, read for limb separation and open space.
const SEG = [['Hips', 'Chest', 0.13, 'torso'], ['Chest', 'Neck', 0.11, 'torso'], ['Neck', 'Head', 0.06, 'torso'], ['Head', 'Head', 0.1, 'torso'],
  ['LeftUpperArm', 'LeftLowerArm', 0.045, 'la'], ['LeftLowerArm', 'LeftHand', 0.04, 'la'], ['LeftHand', 'LeftHand', 0.05, 'la'],
  ['RightUpperArm', 'RightLowerArm', 0.045, 'ra'], ['RightLowerArm', 'RightHand', 0.04, 'ra'], ['RightHand', 'RightHand', 0.05, 'ra'],
  ['LeftUpperLeg', 'LeftLowerLeg', 0.07, 'll'], ['LeftLowerLeg', 'LeftFoot', 0.05, 'll'], ['LeftFoot', 'LeftFoot', 0.06, 'll'],
  ['RightUpperLeg', 'RightLowerLeg', 0.07, 'rl'], ['RightLowerLeg', 'RightFoot', 0.05, 'rl'], ['RightFoot', 'RightFoot', 0.06, 'rl']];
const CAMS = { front: (p) => [p[0], p[1]], side: (p) => [p[2], p[1]], three: (p) => [(p[0] + p[2]) * Math.SQRT1_2, p[1]] };
export function silhouette(M, f) {
  const row = M.W[f], hipsW = row[M.idx.Hips], out = { f, by: {}, best: 0, twinned: false };
  // twinning: left and right arm vectors mirror each other
  const arm = (S) => (M.has(`${S}UpperArm`) && M.has(`${S}Hand`) ? v.norm(v.sub(row[M.idx[`${S}Hand`]], row[M.idx[`${S}UpperArm`]])) : null);
  const la = arm('Left'), ra = arm('Right'); if (la && ra) { const mir = [-la[0], la[1], la[2]], hanging = Math.acos(Math.max(-1, Math.min(1, -la[1]))) * DEG < 25 && Math.acos(Math.max(-1, Math.min(1, -ra[1]))) * DEG < 25; out.twinned = !hanging && Math.acos(Math.max(-1, Math.min(1, v.dot(mir, ra)))) * DEG < 12; }
  for (const [cam, proj] of Object.entries(CAMS)) {
    const N = 96, pts = SEG.filter(([a, b]) => M.has(a) && M.has(b)).map(([a, b, r, g]) => ({ a: proj(v.sub(row[M.idx[a]], hipsW)), b: proj(v.sub(row[M.idx[b]], hipsW)), r, g }));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; for (const s of pts) for (const p of [s.a, s.b]) { minX = Math.min(minX, p[0] - s.r); maxX = Math.max(maxX, p[0] + s.r); minY = Math.min(minY, p[1] - s.r); maxY = Math.max(maxY, p[1] + s.r); }
    const span = Math.max(maxX - minX, maxY - minY) || 1, sc = (N - 2) / span, ox = (N - (maxX - minX) * sc) / 2, oy = (N - (maxY - minY) * sc) / 2;
    const torso = new Uint8Array(N * N), limbs = { la: new Uint8Array(N * N), ra: new Uint8Array(N * N), ll: new Uint8Array(N * N), rl: new Uint8Array(N * N) };
    for (const s of pts) { const mask = s.g === 'torso' ? torso : limbs[s.g]; const ax = ox + (s.a[0] - minX) * sc, ay = oy + (s.a[1] - minY) * sc, bx = ox + (s.b[0] - minX) * sc, by = oy + (s.b[1] - minY) * sc, rr = s.r * sc;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rr)), x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx) + rr)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - rr)), y1 = Math.min(N - 1, Math.ceil(Math.max(ay, by) + rr));
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const tt = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), px = ax + dx * tt, py = ay + dy * tt; if ((x - px) ** 2 + (y - py) ** 2 <= rr * rr) mask[y * N + x] = 1; } }
    let filled = 0, limbPx = 0, limbFree = 0; const seps = [];
    for (const g of Object.keys(limbs)) { let px = 0, free = 0; const m = limbs[g]; for (let i = 0; i < N * N; i++) if (m[i]) { px++; if (!torso[i]) free++; } limbPx += px; limbFree += free; if (px) seps.push(free / px); }
    const all = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) all[i] = torso[i] | limbs.la[i] | limbs.ra[i] | limbs.ll[i] | limbs.rl[i]; for (let i = 0; i < N * N; i++) filled += all[i];
    let bx0 = N, bx1 = 0, by0 = N, by1 = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (all[y * N + x]) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    const box = Math.max(1, (bx1 - bx0 + 1) * (by1 - by0 + 1)), fill = filled / box, sep = seps.length ? mean(seps) : 0;
    const read = Math.max(0, 0.6 * sep + 0.4 * (1 - fill) - (out.twinned ? 0.15 : 0));
    out.by[cam] = { sep: r2(sep), fill: r2(fill), read: r2(read) }; if (read > out.best) { out.best = read; out.bestCam = cam; }
  }
  return out;
}

/** The statistical signature of a motion: what the reference distance compares. */
export function signature(M, E, moves) {
  const grp = (names) => { const a = []; for (const b of names.filter(M.has)) for (const x of M.omega[M.idx[b]]) if (Number.isFinite(x)) a.push(x); return a; };
  const acc = (names) => { const a = []; for (const b of names.filter(M.has)) { const o = M.omega[M.idx[b]]; for (let f = 2; f < M.n; f++) if (Number.isFinite(o[f]) && Number.isFinite(o[f - 1])) a.push(Math.abs(o[f] - o[f - 1]) * M.fps); } return a; };
  const arms = ['LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm'], legs = ['LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg'], spine = ['Spine', 'Chest', 'Neck'];
  const A = grp(arms), L = grp(legs), S = grp(spine), H = grp(['Head']), hands = moves.filter((m) => /Hand/.test(m.part));
  const hs = []; for (const p of ['LeftHand', 'RightHand'].filter(M.has)) for (const x of speedOf(M, posOf(M, p))) if (Number.isFinite(x)) hs.push(x);
  const fin = Array.from(E).filter(Number.isFinite);
  return {
    armOmegaP50: pct(A, 0.5), armOmegaP95: pct(A, 0.95), legOmegaP95: pct(L, 0.95), spineOmegaP50: pct(S, 0.5), spineOmegaP95: pct(S, 0.95), headOmegaP50: pct(H, 0.5), headOmegaP95: pct(H, 0.95),
    armAccP95: pct(acc(arms), 0.95), spineAccP95: pct(acc(spine), 0.95), handSpeedP50: pct(hs, 0.5), handSpeedP95: pct(hs, 0.95),
    spineToArm: pct(S, 0.5) / (pct(A, 0.5) || 1), energyCV: fin.length ? Math.sqrt(mean(fin.map((x) => (x - mean(fin)) ** 2))) / (mean(fin) || 1) : NaN,
    moveRate: hands.length / Math.max(0.5, (M.n - 1) / M.fps),
  };
}
export const SIG_KEYS = ['armOmegaP50', 'armOmegaP95', 'legOmegaP95', 'spineOmegaP50', 'spineOmegaP95', 'headOmegaP50', 'headOmegaP95', 'armAccP95', 'spineAccP95', 'handSpeedP50', 'handSpeedP95', 'spineToArm', 'energyCV', 'moveRate', 'arcBend', 'flatness', 'coherence', 'frozenFrac', 'deadFrac'];
/** Robust z against the reference stats {k:{med, mad}}; features are compared on a log scale where they are rates. */
export function refDistance(sig, stats) {
  const zs = [];
  for (const k of SIG_KEYS) { const s = stats[k], x = sig[k]; if (!s || !Number.isFinite(x) || !(s.mad > 0)) continue; const z = (xf(k, x) - s.med) / (1.4826 * s.mad); zs.push({ k, z: Math.max(-5, Math.min(5, z)) }); }
  const d = zs.length ? Math.sqrt(mean(zs.map((e) => Math.min(4, Math.abs(e.z)) ** 2))) : NaN;
  return { d, worst: [...zs].sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3) };
}
export const xf = (k, x) => (/Omega|Acc|Speed|Rate/.test(k) ? Math.log10(Math.max(1e-3, x)) : x);
export function referenceStats(rows) {
  const stats = {};
  for (const k of SIG_KEYS) { const xs = rows.map((r) => r[k]).filter(Number.isFinite).map((x) => xf(k, x)); if (xs.length < 5) continue; const med = median(xs), mad = median(xs.map((x) => Math.abs(x - med))); stats[k] = { med, mad: mad || 1e-6, p05: pct(xs, 0.05), p95: pct(xs, 0.95), n: xs.length }; }
  return stats;
}
