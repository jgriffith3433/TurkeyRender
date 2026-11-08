// Beat-warp on a rhythmic clip: the same clip with and without warpTo, and how far the body's real stops are from the kicks.
// No dance clip exists on disk, so this uses Cheer4 (arms punching the air) and mx_jumping_jacks.
// node Director/library/proof/warp.mjs
import { execFileSync as x } from 'node:child_process';
import fs from 'node:fs';
const song = JSON.parse(fs.readFileSync('Director/song.json', 'utf8'));
const from = 66.657, to = 77.7; // bars 25 to 29
const out = {};
function hitsOf(name) {
  const s = song.onsets[name];
  return (s ?? []).filter((t) => t >= from && t < to);
}
for (const [clip, spec] of [['Cheer4', 'kick'], ['mx_jumping_jacks', 'kick'], ['mx_jumping_jacks', 'beat']]) for (const warped of [false, true]) {
  const f = 'Director/library/proof/_tmp3.json';
  const cue = { at: from, do: 'anim', on: 'person', clip, blend: 0, for: to - from + 0.2 };
  if (warped) cue.warpTo = spec;
  fs.writeFileSync(f, JSON.stringify({ on: 'person', from, to, every: 1, cols: 16, cell: 110, sheet: `proof_warp_${clip}_${spec}_${warped ? 'on' : 'off'}.png`, motionBeats: 1, cues: [cue] }));
  const r = JSON.parse(x('node', ['Director/mv.mjs', 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }));
  const hits = spec === 'beat' ? null : hitsOf(spec);
  const near = (t, H) => Math.min(...H.map((h) => Math.abs(h - t)));
  const beats = r.motionBeats ?? [];
  const grid = hits ?? song.beats;
  const errs = beats.map((b) => near(b, grid)).sort((a, b) => a - b);
  const mean = errs.reduce((a, b) => a + b, 0) / Math.max(1, errs.length);
  out[`${clip} to ${spec} ${warped ? 'WARPED' : 'plain'}`] = { bodyBeats: beats.length, hits: grid.filter((h) => h >= from && h < to).length, meanMsToNearestHit: +(mean * 1000).toFixed(0), medianMs: +((errs[errs.length >> 1] ?? 0) * 1000).toFixed(0), within35ms: errs.filter((e) => e < 0.035).length, warp: r.warp, pure: [r.reverseWorstMetres, r.shuffledFreshWorstMetres], warnings: r.warnings, sheet: r.sheet };
}
fs.unlinkSync('Director/library/proof/_tmp3.json');
console.log(JSON.stringify(out, null, 1));
