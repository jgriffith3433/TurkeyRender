#!/usr/bin/env node
// Motion review strips: find where the animation may be wrong in a rendered mp4 and cut consecutive 30 fps frames around each
// place, so a reviewer (me, or the 30 fps reviewer) judges motion from neighbouring frames, never from one still.
//   node Director/tools/review_strips.mjs --video slice.mp4 --start 20.29 [--check captures/motioncheck-runs/latest-....json]
//        [--out dir] [--top 40] [--cuts] [--pad 6]
// Finds:
//   pop     a frame-difference spike inside a shot (not at a cut): a snap, a flip, a one-frame pose jump
//   check   motion-check problems inside the file's window (hidden ones skipped), highest score first
//   cut     with --cuts, 3 frames either side of every cut, for continuity (who is where, which hand holds what)
// Writes <out>/NN_<kind>_<file time>.jpg (2 rows of consecutive frames, each labelled) and <out>/index.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
if (!A.video) { console.error('usage: --video file.mp4 --start <song s at file 0> [--check mc.json] [--out dir] [--top 40] [--cuts] [--pad 6]'); process.exit(1); }
const video = path.resolve(A.video), start = +(A.start || 0), top = +(A.top || 40), pad = +(A.pad || 6);
const out = path.resolve(A.out || path.join(path.dirname(video), 'review-strips', path.basename(video, '.mp4')));
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (/\.(jpg|md)$/.test(f)) fs.unlinkSync(path.join(out, f));

const ff = (args, opts = {}) => execFileSync('ffmpeg', ['-hide_banner', ...args], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames,width,height', '-show_entries', 'format=duration', '-of', 'json', video]).toString());
const [rn, rd] = probe.streams[0].r_frame_rate.split('/').map(Number), fps = rn / rd, dur = +probe.format.duration;

// 1. per-frame difference and scene score in one pass over a small grey copy
const W = 160, H = 90;
const raw = ff(['-v', 'error', '-i', video, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-']);
// whole-frame diff finds cuts; a per-tile diff (8x6 tiles) finds a snap in one arm that the whole frame dilutes
const N = Math.floor(raw.length / (W * H)), diff = new Float64Array(N), TX = 8, TY = 6, TW = W / TX, TH = H / TY;
const tile = Array.from({ length: TX * TY }, () => new Float64Array(N));
for (let i = 1; i < N; i++) {
  let s = 0; const a = (i - 1) * W * H, b = i * W * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.abs(raw[b + y * W + x] - raw[a + y * W + x]); s += d;
    tile[((y / TH) | 0) * TX + ((x / TW) | 0)][i] += d / (TW * TH);
  }
  diff[i] = s / (W * H);
}
// a cut: a big jump whose neighbours are calm and whose histogram changes (cheap: mean luma jump or big diff with calm both sides)
const med = (arr) => { const s = [...arr].sort((x, y) => x - y); return s[s.length >> 1] || 0; };
const isCut = new Uint8Array(N);
for (let i = 1; i < N; i++) {
  const nb = med([diff[i - 2] || 0, diff[i - 1] || 0, diff[i + 1] || 0, diff[i + 2] || 0]);
  if (diff[i] > 18 && diff[i] > 4 * (nb + 1)) isCut[i] = 1;
}
const cuts = [...isCut.keys()].filter((i) => isCut[i]);
// pops: a spike over a local baseline inside a shot, away from cuts (2 frames)
const events = [];
const nearCut = (i) => cuts.some((c) => Math.abs(c - i) <= 2);
for (let i = 3; i < N - 3; i++) {
  if (nearCut(i)) continue;
  let best = null;
  for (let t = 0; t < TX * TY; t++) {
    const d = tile[t];
    const win = []; for (let k = -8; k <= 8; k++) if (Math.abs(k) > 1 && d[i + k] !== undefined && !nearCut(i + k)) win.push(d[i + k]);
    const base = med(win), spike = d[i] / (base + 1.0);
    // a pop: this tile jumps far above its own neighbourhood for 1-2 frames and is the local peak
    if (spike > 3.5 && d[i] > 6 && d[i] >= d[i - 1] && d[i] >= d[i + 1] && (!best || spike > best.spike)) best = { spike, t, v: d[i], base };
  }
  if (best) events.push({ kind: 'pop', frame: i, score: best.spike, note: `tile ${best.t % TX},${(best.t / TX) | 0} diff ${best.v.toFixed(1)} vs ${best.base.toFixed(1)} around` });
}
// keep one event per 10 frames (the strongest)
events.sort((a, b) => b.score - a.score);
for (let k = 0; k < events.length; k++) for (let m = events.length - 1; m > k; m--) if (Math.abs(events[m].frame - events[k].frame) < 10) events.splice(m, 1);
events.sort((a, b) => b.score - a.score);
let picked = events.slice(0, Math.ceil(top / 2));

// 2. motion-check problems in the window
if (A.check) {
  const mc = JSON.parse(fs.readFileSync(path.resolve(A.check), 'utf8'));
  const probs = (mc.problems || []).filter((p) => !p.hidden && p.peak >= start && p.peak <= start + dur).sort((a, b) => (b.score || 0) - (a.score || 0));
  for (const p of probs.slice(0, top - picked.length)) picked.push({ kind: 'check', frame: Math.round((p.peak - start) * fps), score: p.score || 0, note: `${p.check} ${p.actor} ${p.what || ''} ${p.how || ''} (${p.value ?? ''} ${p.unit || ''}) shot ${p.shot}` });
}
// merge events within a strip of each other
picked.sort((a, b) => a.frame - b.frame);
const merged = [];
for (const e of picked) { const last = merged[merged.length - 1]; if (last && e.frame - last.frame <= pad) { last.note += ' | ' + e.note; last.kind = last.kind === e.kind ? last.kind : 'pop+check'; } else merged.push({ ...e }); }
if (A.cuts) for (const c of cuts) merged.push({ kind: 'cut', frame: c, score: 0, note: 'cut', span: 3 });
merged.sort((a, b) => a.frame - b.frame);

// 3. strips: consecutive frames, labelled with file time and song time
const lines = [`# Review strips: ${path.basename(video)}`, '', `${N} frames at ${fps.toFixed(2)} fps, file 0 = song ${start}s. ${cuts.length} cuts, ${events.length} pops found, ${merged.length} strips. Each strip is consecutive frames; judge the motion across them.`, '', '| # | kind | file s | song s | note | strip |', '|---|---|---|---|---|---|'];
merged.forEach((e, n) => {
  const span = e.span || pad, f0 = Math.max(0, e.frame - span), f1 = Math.min(N - 1, e.frame + span), cnt = f1 - f0 + 1;
  const t = (e.frame / fps), name = `${String(n + 1).padStart(2, '0')}_${e.kind}_${t.toFixed(2)}.jpg`;
  const cols = Math.ceil(cnt / 2);
  const vf = `select='between(n\\,${f0}\\,${f1})',scale=400:-2,drawbox=x=0:y=0:w=400:h=18:color=black@0.6:t=fill,` +
    `drawtext=fontfile='C\\:/Windows/Fonts/consola.ttf':text='%{n}':x=4:y=2:fontsize=13:fontcolor=yellow,tile=${cols}x2`;
  try { ff(['-v', 'error', '-y', '-i', video, '-vf', vf, '-frames:v', '1', path.join(out, name)]); }
  catch { ff(['-v', 'error', '-y', '-i', video, '-vf', `select='between(n\\,${f0}\\,${f1})',scale=400:-2,tile=${cols}x2`, '-frames:v', '1', path.join(out, name)]); }
  lines.push(`| ${n + 1} | ${e.kind} | ${t.toFixed(2)} | ${(start + t).toFixed(2)} | ${e.note.replace(/\|/g, '/')} | ${name} (frames ${f0}-${f1}) |`);
});
fs.writeFileSync(path.join(out, 'index.md'), lines.join('\n') + '\n');
console.log(`${merged.length} strips (${merged.filter((e) => e.kind !== 'cut').length} faults to look at, ${cuts.length} cuts) -> ${out}`);
