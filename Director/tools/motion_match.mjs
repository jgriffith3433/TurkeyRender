#!/usr/bin/env node
// Motion matching over the mocap libraries (Director/gen/mocap/index/<source>.json + <clip>.f32, built by motion_index.py): given a beat as
// tags, a query clip (any .bvh/.fbx/.npz or an indexed clip `cmu/02_01`, optionally --start/--end seconds), or a held pose, find the
// segments of the library whose pose and velocity features match best, and return candidates with start and end seconds.
//   node Director/tools/motion_match.mjs --tags punch,hit [--sources cmu,protofactor] [--seconds 1.5] [--top 12]
//   node Director/tools/motion_match.mjs --query Assets/MusicVideo/Motion/Humanoid@mx_cross_punch.fbx --start 0.6 --end 1.4 --tags punch
//   node Director/tools/motion_match.mjs --pose "hipFlex=40 knee=45 shAbd=40 shFlex=40 elbow=75" --seconds 1 --tags idle
//   ... --upper          zero-g: match the upper body only (hands, elbows, head, chest), heights from the hips
//   ... --json           machine output;  --cut <n>  writes candidate n as Director/gen/motion/match/<source>_<clip>_<start>.npz for motion_admit.py
// How it matches: features per frame (tools/motion/features.py: body-frame positions of hands, feet, head, elbows, knees; their velocities; hips
// velocity, yaw rate, height; chest up), z-scored with the library's mean and std and weighted; the query window slides over every clip whose
// tags/description match (or every clip with no tags) at 3-frame steps; the distance is the mean over the window, with a 1 Hz time-warp
// tolerance by trying the query at 0.8x, 1x and 1.25x speed. Non-maximum suppression keeps one hit per clip per second.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE);
const INDEX = path.join(ROOT, 'gen', 'mocap', 'index'), MATCH = path.join(ROOT, 'gen', 'motion', 'match');
const argv = process.argv.slice(2), flag = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
if (!flag.tags && !flag.query && !flag.pose) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(0); }

const sources = (flag.sources ? String(flag.sources).split(',') : fs.readdirSync(INDEX).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
const top = +(flag.top || 12), step = 3;
const tags = flag.tags ? String(flag.tags).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean) : [];

function loadIndex(src) {
  const f = path.join(INDEX, src + '.json');
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function f32(file) { const b = fs.readFileSync(file); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); }

// ---- query features
let Qf = null, qFrames = 0, qLabel = '';
const tmp = path.join(MATCH, '_query.f32'); fs.mkdirSync(MATCH, { recursive: true });
if (flag.query) {
  const args = ['-I', path.join(HERE, 'motion_query.py'), 'features', String(flag.query), tmp];
  if (flag.start) args.push('--start', String(flag.start)); if (flag.end) args.push('--end', String(flag.end));
  const r = spawnSync('py', args, { encoding: 'utf8' });
  if (r.status) { console.error(r.stderr); process.exit(1); }
  Qf = f32(tmp); qLabel = `clip ${flag.query}${flag.start ? ` ${flag.start}-${flag.end ?? ''} s` : ''}`;
} else if (flag.pose) {
  const r = spawnSync('py', ['-I', path.join(HERE, 'motion_query.py'), 'pose', tmp, ...String(flag.pose).split(/\s+/)], { encoding: 'utf8' });
  if (r.status) { console.error(r.stderr); process.exit(1); }
  Qf = f32(tmp); qLabel = `pose ${flag.pose}`;
}
const DIM = 50;
if (Qf) qFrames = Qf.length / DIM;

// ---- search
const hits = [];
for (const src of sources) {
  const idx = loadIndex(src); if (!idx) continue;
  const mean = idx.mean, std = idx.std, w = [...idx.weights];
  // --upper (zero-g beats): hands, elbows, head and chest only, heights from the hips; feet, knees, hips motion and height ignored
  const UP = !!flag.upper, YS = [1, 4, 13, 16, 19];
  if (UP) for (const d of [6, 7, 8, 9, 10, 11, 21, 22, 23, 24, 25, 26, 33, 34, 35, 36, 37, 38, 42, 43, 44, 45, 46]) w[d] = 0;
  const raw = (A, f, d) => UP && YS.includes(d) ? A[f * DIM + d] - A[f * DIM + 46] : A[f * DIM + d];
  // query normalised with this library's statistics
  let qn = null, qVariants = [];
  if (Qf) {
    qn = new Float32Array(Qf.length);
    for (let f = 0; f < qFrames; f++) for (let d = 0; d < DIM; d++) qn[f * DIM + d] = (raw(Qf, f, d) - mean[d]) / std[d] * w[d];
    // time-warp variants: resample the query to 0.8x, 1x, 1.25x length
    for (const k of [0.8, 1, 1.25]) {
      const n = Math.max(4, Math.round(qFrames * k)); const v = new Float32Array(n * DIM);
      for (let f = 0; f < n; f++) { const s = Math.min(qFrames - 1, (f / (n - 1)) * (qFrames - 1)); const a = Math.floor(s), b = Math.min(qFrames - 1, a + 1), t = s - a; for (let d = 0; d < DIM; d++) v[f * DIM + d] = qn[a * DIM + d] * (1 - t) + qn[b * DIM + d] * t; }
      // velocities scale with speed
      for (let f = 0; f < n; f++) for (const d of [...Array(15).keys()].map((i) => 27 + i).concat([42, 43, 44, 45])) v[f * DIM + d] /= k;
      qVariants.push({ k, n, v });
    }
  }
  for (const clip of idx.clips) {
    const text = `${clip.id} ${clip.description ?? ''} ${(clip.tags ?? []).join(' ')} ${clip.animset ?? ''}`.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();   // split camelCase ids (PROTOFACTOR) before lowercasing
    const tagHit = tags.length ? tags.filter((t) => text.includes(t)).length : 0;
    if (tags.length && !tagHit && !Qf) continue;
    if (tags.length && !tagHit && flag.strict) continue;
    if (!Qf) { hits.push({ source: src, clip: clip.id, start: 0, end: clip.seconds, dist: 0, tagHit, description: clip.description, seconds: clip.seconds }); continue; }
    const file = path.join(INDEX, src, clip.id + '.f32'); if (!fs.existsSync(file)) continue;
    const L = f32(file); const F = L.length / DIM;
    const ln = new Float32Array(L.length);
    for (let f = 0; f < F; f++) for (let d = 0; d < DIM; d++) ln[f * DIM + d] = (raw(L, f, d) - mean[d]) / std[d] * w[d];
    const best = [];
    for (const { k, n, v } of qVariants) {
      if (F < n) continue;
      for (let s = 0; s + n <= F; s += step) {
        let acc = 0;
        for (let f = 0; f < n; f++) { const o = (s + f) * DIM, p = f * DIM; for (let d = 0; d < DIM; d++) { const e = ln[o + d] - v[p + d]; acc += e * e; } }
        const dist = Math.sqrt(acc / (n * DIM));
        best.push({ s, n, k, dist });
      }
    }
    best.sort((a, b) => a.dist - b.dist);
    const kept = [];
    for (const b of best) { if (kept.some((x) => Math.abs(x.s - b.s) < 30)) continue; kept.push(b); if (kept.length >= 3) break; }
    for (const b of kept) hits.push({ source: src, clip: clip.id, start: +(b.s / 30).toFixed(2), end: +((b.s + b.n) / 30).toFixed(2), speed: b.k, dist: +b.dist.toFixed(3), tagHit, description: clip.description, seconds: clip.seconds, file: clip.file });
  }
}
// rank: distance first, a tag hit is worth 15% of distance
hits.sort((a, b) => (a.dist * (a.tagHit ? 0.85 : 1)) - (b.dist * (b.tagHit ? 0.85 : 1)));
const out = hits.slice(0, top);
if (flag.cut !== undefined) {
  const h = out[+flag.cut]; if (!h) { console.error('no candidate ' + flag.cut); process.exit(1); }
  const name = `${h.source}_${h.clip}_${String(h.start).replace('.', 'p')}.npz`, dest = path.join(MATCH, name);
  const r = spawnSync('py', ['-I', path.join(HERE, 'motion_query.py'), 'cut', h.source, h.clip, String(h.start), String(h.end), dest], { encoding: 'utf8' });
  if (r.status) { console.error(r.stderr); process.exit(1); }
  console.log(JSON.stringify({ cut: dest, ...h }));
} else if (flag.json) console.log(JSON.stringify({ query: qLabel, tags, sources, candidates: out }, null, 1));
else {
  console.log(`${qLabel || ''}${tags.length ? ` tags ${tags.join(',')}` : ''}: ${hits.length} hits over ${sources.join(', ')}`);
  out.forEach((h, i) => console.log(`${String(i).padStart(2)}  ${h.dist.toFixed(3).padStart(6)}${h.tagHit ? ' *' : '  '} ${h.source}/${h.clip.padEnd(28)} ${h.start}-${h.end} s${h.speed && h.speed !== 1 ? ` (x${h.speed})` : ''}  ${(h.description ?? '').slice(0, 60)}`));
  console.log('--cut <n> cuts one to Director/gen/motion/match/ for motion_admit.py; * = tag hit');
}
