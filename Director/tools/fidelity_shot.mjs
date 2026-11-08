// Compares two `call shotbones` dumps of the same actor over the same frames (old path against native) and prints the fidelity numbers.
// node Director/tools/fidelity_shot.mjs old.json native.json [--label name]
// Error: angle between the two at each body bone (fingers apart), old against native (native is Unity playing the source clips).
// Jitter: second difference of each bone's rotation per frame, p99 over body bones. Snaps: one-frame steps over 8 degrees, all bones.
// Foot slide: a foot within 3 cm of its lowest point in the shot, both frames: flat world travel, cm per second.
import fs from 'fs';

const [a, b] = process.argv.slice(2, 4).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const label = process.argv.includes('--label') ? process.argv[process.argv.indexOf('--label') + 1] : '';

const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
const ang = (p, q) => (2 * Math.acos(Math.min(1, Math.abs(dot(p, q))))) * 180 / Math.PI;
const inv = (q) => [-q[0], -q[1], -q[2], q[3]];
const mul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const finger = (n) => /Thumb|Index|Middle|Ring|Little/.test(n);
const pct = (v, p) => { if (!v.length) return 0; const s = [...v].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const r2 = (x) => Math.round(x * 100) / 100;

function own(d) {
  const F = d.frames, n = F.length, jit = [], fps = n > 1 ? 1 / (F[1].t - F[0].t) : 30; let snaps = 0;
  d.bones.forEach((name, i) => {
    for (let f = 1; f < n; f++) {
      if (ang(F[f].q[i], F[f - 1].q[i]) > 8) snaps++;
      if (f < n - 1 && !finger(name)) jit.push(ang(mul(F[f + 1].q[i], inv(F[f].q[i])), mul(F[f].q[i], inv(F[f - 1].q[i]))));
    }
  });
  let slide = 0;
  for (const s of [0, 3]) {
    const low = Math.min(...F.map((x) => x.feet[s + 1]));
    for (let f = 1; f < n; f++) if (F[f].feet[s + 1] < low + 0.03 && F[f - 1].feet[s + 1] < low + 0.03) slide += Math.hypot(F[f].feet[s] - F[f - 1].feet[s], F[f].feet[s + 2] - F[f - 1].feet[s + 2]);
  }
  return { jitterP99: r2(pct(jit, 0.99)), jitterMax: r2(Math.max(0, ...jit)), snaps, footSlideCmPerS: r2(slide * 100 / (n / fps)) };
}

const n = Math.min(a.frames.length, b.frames.length), errB = [], errF = [], worst = {};
a.bones.forEach((name, i) => {
  const j = b.bones.indexOf(name); if (j < 0) return;
  for (let f = 0; f < n; f++) {
    const e = ang(a.frames[f].q[i], b.frames[f].q[j]);
    (finger(name) ? errF : errB).push(e);
    if (!finger(name) && e > (worst[name] ?? 0)) worst[name] = e;
  }
});
const out = {
  label, frames: n, oldNative: a.native, newNative: b.native,
  errVsNative: { maxDeg: r2(Math.max(0, ...errB)), meanDeg: r2(errB.reduce((s, x) => s + x, 0) / Math.max(1, errB.length)), p99Deg: r2(pct(errB, 0.99)), fingerMeanDeg: r2(errF.reduce((s, x) => s + x, 0) / Math.max(1, errF.length)), worst: Object.entries(worst).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ') },
  old: own(a), native: own(b),
};
console.log(JSON.stringify(out, null, 1));
