#!/usr/bin/env node
// Automatic shot QA (ROADMAP-SYSTEM M5). For a rendered shot: a stepped contact sheet and 30 fps bursts, measured pops,
// darkness, subject size and cut timing, `mv motioncheck` when Unity is free, and a strict Claude Vision review against
// review/STANDARD.md and the shot's card. Writes shots/<id>/qa.json with a score out of 10. See AGENTS.md ("QA").
//   node Director/tools/qa.mjs <shot|all> [--strict] [--notes] [--video name] [--render f.mp4] [--shots score|cuts] [--model claude-sonnet-5-5]
//        [--no-vision] [--no-motion] [--force] [--jobs 6] [--limit N]
//   node Director/tools/qa.mjs list | report | selftest
// <shot>: a number (8), an id or a word of its name (remote), a time (32.5, 12:3), or a range (32-34).
// It reviews the shot's own render (mv shot) when that is newer than the last full render, else that part of the full render.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIRECTOR as ROOT, pickVideo, loadScore, loadClock, expand, shotList } from './mv/score.mjs';
import { tickets } from './mv/queue.mjs';

export { ROOT };
const GREY_W = 160, GREY_H = 90, CELLS_X = 8, CELLS_Y = 6;
const FONT = 'C\\:/Windows/Fonts/arial.ttf';
export const LIMITS = {
  // Tuned on v8, v9 and v11 (see review/qa-calibration.md).
  flipShare: 0.4, flipFrames: 3, popRatio: 4, popMin: 16, darkLuma: 16, whiteShare: 0.45, smallSubject: 8,
  cutOffset: 0.06, motionScore: 40, pass: 7,
};
const PRICES = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5], 'claude-fable-5-1': [10, 50], 'claude-opus-5': [5, 25] };

const json = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let V = null, song = null, clockOf = null;
export function useVideo(name) {
  V = pickVideo(name); song = json(V.song);
  const { score } = loadScore(V); clockOf = loadClock(V, score);
  return V;
}
const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const mkdir = (d) => (fs.mkdirSync(d, { recursive: true }), d);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export const barLabel = (t) => clockOf.label(t);
const seconds = (s) => (/^[\d.]+$/.test(String(s)) ? parseFloat(s) : clockOf.T(String(s), 0));

// ---------- shots ----------

/** The score's shots, numbered as mv shots and motioncheck number them. Ids match mv shot's render files. */
export function scoreShots() {
  const { score } = loadScore(V);
  return shotList(expand(score, clockOf).shots, clockOf).filter((s) => s.len > 0).map((s) => {
    const n = String(s.n).padStart(3, '0');
    return { id: `${n}-${slug(s.name)}`, n: s.n, name: s.name, from: s.t, to: s.end };
  });
}

function cutShots(a) {
  const cuts = [0, ...a.cuts.map((f) => f / a.fps), a.frames / a.fps], out = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const n = String(out.length + 1).padStart(3, '0'), c = cuts[i];
    out.push({ id: `${n}-at-${Math.round(c)}s`, n: out.length + 1, name: `cut at ${clock(c)}`, from: c, to: cuts[i + 1] });
  }
  return out;
}

function pick(shots, what) {
  if (what === 'all') return shots;
  let m;
  if ((m = String(what).match(/^([\d.:]+)-([\d.:]+)$/))) { const a = seconds(m[1]), b = seconds(m[2]); return shots.filter((s) => s.to > a && s.from < b); }
  if (/^\d{1,3}$/.test(what) && shots.some((s) => s.n === +what)) return shots.filter((s) => s.n === +what);
  if (/^[\d.:]+$/.test(what)) { const t = seconds(what); return shots.filter((s) => s.from <= t && t < s.to); }
  return shots.filter((s) => s.id === what || s.name.toLowerCase().includes(what.toLowerCase()));
}

let boardLines = null;
function storyboardFor(bar) {
  boardLines ??= (fs.existsSync(path.join(V.dir, 'STORYBOARD.md')) ? fs.readFileSync(path.join(V.dir, 'STORYBOARD.md'), 'utf8') : '').split('\n');
  const hits = [];
  for (const l of boardLines) {
    const m = l.match(/^- \*\*(\d+)(?::[\d.]+)?(?:-(\d+))?(?:[^*]*)\*\*/);
    if (m && bar >= +m[1] && bar <= +(m[2] ?? m[1])) hits.push(l.slice(2));
  }
  return hits;
}

/** The shot's card: a real one from M3 if it exists, else what the song, lyrics and storyboard say about this time. */
export function cardFor(s) {
  const own = (json(path.join(V.dir, 'cards.map.json'), []) ?? []).find((c) => c.t < s.to - 0.01 && c.tEnd > s.from + 0.01);
  const bar = parseInt(barLabel(s.from + 0.01)), endBar = parseInt(barLabel(Math.max(s.from, s.to - 0.01)));
  const sec = [...song.sections].reverse().find((x) => x.t <= s.from + 0.01) ?? song.sections[0];
  const ly = json(path.join(V.dir, 'lyrics.json'), { lines: [] }).lines.filter((l) => l.end > s.from && l.t < s.to).map((l) => l.text);
  const story = []; for (let b = bar; b <= endBar; b++) for (const l of storyboardFor(b)) if (!story.includes(l)) story.push(l);
  return { name: s.name, time: `${clock(s.from)}-${clock(s.to)}`, bars: `${barLabel(s.from)} to ${barLabel(s.to)}`, section: `${sec.name} ${sec.kind}`, lyric: ly, story: story.slice(0, 4), ...(own ? { idea: own.idea, feel: own.feel, note: own.note ?? undefined } : {}) };
}

// ---------- the measuring pass ----------

/** One pass through a video at 160x90 grey. Per frame: luma, dark and white share, flash-free difference, the worst grid
 *  cell, how many cells go somewhere and come back within 3 frames (a body flipping between poses), and an edge box. */
export async function analyse(video) {
  const st = fs.statSync(video);
  const key = crypto.createHash('sha1').update(`${path.resolve(video)}|${st.size}|${st.mtimeMs}|5`).digest('hex').slice(0, 12);
  const cacheFile = path.join(mkdir(path.join(ROOT, 'captures/qa-cache')), key + '.json');
  const cached = json(cacheFile);
  if (cached) return cached;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', video], { encoding: 'utf8' });
  const [fn, fd] = probe.stdout.trim().split('/').map(Number), fps = fn / (fd || 1);
  const size = GREY_W * GREY_H, cw = GREY_W / CELLS_X | 0, ch = GREY_H / CELLS_Y | 0;
  const nCells = CELLS_X * CELLS_Y, cellOf = new Uint8Array(size);
  for (let y = 0; y < GREY_H; y++) for (let x = 0; x < GREY_W; x++) cellOf[y * GREY_W + x] = Math.min(CELLS_Y - 1, y / ch | 0) * CELLS_X + Math.min(CELLS_X - 1, x / cw | 0);
  const ring = [], R = { luma: [], dark: [], white: [], d1: [], cell: [], exc: [], moving: [], box: [] };
  const cells = (a, b) => {
    const out = new Float32Array(nCells);
    for (let i = 0; i < size; i++) out[cellOf[i]] += Math.abs(a[i] - b[i]);
    for (let i = 0; i < nCells; i++) out[i] /= cw * ch;
    return out;
  };
  const frame = (raw) => {
    let sum = 0, dark = 0, white = 0;
    for (let i = 0; i < size; i++) { const v = raw[i]; sum += v; if (v < 20) dark++; if (v > 235) white++; }
    const mean = sum / size, f = new Float32Array(size);
    for (let i = 0; i < size; i++) f[i] = raw[i] - mean;
    R.luma.push(+mean.toFixed(1)); R.dark.push(+(dark / size).toFixed(3)); R.white.push(+(white / size).toFixed(3));
    // Edge box: the middle 80% of the gradient each way, a stand-in for how much of the frame the subject fills.
    const ex = new Float32Array(GREY_W), ey = new Float32Array(GREY_H); let et = 0;
    for (let y = 1; y < GREY_H - 1; y++) for (let x = 1; x < GREY_W - 1; x++) {
      const g = Math.abs(raw[y * GREY_W + x + 1] - raw[y * GREY_W + x - 1]) + Math.abs(raw[(y + 1) * GREY_W + x] - raw[(y - 1) * GREY_W + x]);
      if (g > 24) { ex[x] += g; ey[y] += g; et += g; }
    }
    const span = (e) => { let c = 0, lo = 0, hi = e.length - 1, seen = false; for (let i = 0; i < e.length; i++) { c += e[i]; if (c <= et * 0.1) lo = i; if (!seen && c >= et * 0.9) { hi = i; seen = true; } } return (hi - lo) / e.length; };
    R.box.push(et ? +(span(ex) * span(ey)).toFixed(3) : 0);
    const prev = ring[ring.length - 1];
    if (prev) {
      const c = cells(f, prev); let d = 0, mx = 0;
      for (const v of c) { d += v; if (v > mx) mx = v; }
      R.d1.push(+(d / nCells).toFixed(2)); R.cell.push(+mx.toFixed(1));
      let mv = 0; for (const v of c) if (v > 9) mv++;
      R.moving.push(mv);
    } else { R.d1.push(0); R.cell.push(0); R.moving.push(0); }
    // Went away and came back: the cells where frame i-k matches frame i, but the frames between them do not, as a share of
    // the cells that moved. A body flipping between poses comes back almost whole; a fast pan comes back in chance patches.
    let exc = 0;
    for (let k = 2; k <= 4 && k <= ring.length; k++) {
      const a = ring[ring.length - k], b = cells(f, a), mid = ring[ring.length - k + 1], ca = cells(mid, a), cb = cells(mid, f);
      let hit = 0, moved = 0;
      for (let i = 0; i < nCells; i++) if (ca[i] > 9 && cb[i] > 9) { moved++; if (b[i] < 0.35 * Math.min(ca[i], cb[i])) hit++; }
      const share = moved >= 2 ? hit / moved : 0;
      if (share > exc) exc = share;
    }
    R.exc.push(+exc.toFixed(2));
    ring.push(f); if (ring.length > 4) ring.shift();
  };
  await new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', video, '-vf', `scale=${GREY_W}:${GREY_H}:flags=area,format=gray`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
    let left = Buffer.alloc(0);
    p.stdout.on('data', (b) => {
      left = left.length ? Buffer.concat([left, b]) : b;
      let o = 0;
      while (left.length - o >= size) { frame(left.subarray(o, o + size)); o += size; }
      left = left.subarray(o);
    });
    p.on('close', (c) => (c ? rej(new Error('ffmpeg failed on ' + video)) : res()));
  });
  // Cuts: a jump far above what the frames around it do.
  const cuts = [];
  for (let i = 2; i < R.d1.length - 2; i++) {
    const around = median(R.d1.slice(Math.max(0, i - 6), i).concat(R.d1.slice(i + 1, i + 7)));
    if (R.d1[i] > 9 && R.d1[i] > 4 * Math.max(around, 1) && R.cell[i] > 18 && !cuts.includes(i - 1)) cuts.push(i);
  }
  const out = { video: path.resolve(video), fps, frames: R.d1.length, cuts, ...R };
  fs.writeFileSync(cacheFile, JSON.stringify(out));
  return out;
}

/** What the numbers say about one time window of a video. `offset` is the song time of the video's first frame. */
export function measure(a, s, offset = 0) {
  const f0 = Math.max(0, Math.round((s.from - offset) * a.fps)), f1 = Math.min(a.frames, Math.round((s.to - offset) * a.fps));
  const frame2t = (i) => round(i / a.fps + offset, 3);
  const inside = (i) => i > f0 + 1 && i < f1 - 1;
  const idx = []; for (let i = f0; i < f1; i++) idx.push(i);
  const luma = idx.map((i) => a.luma[i]), n = Math.max(1, idx.length);
  const m = {
    frames: idx.length,
    luma: round(median(luma), 1),
    dark: round(idx.reduce((x, i) => x + a.dark[i], 0) / n),
    white: round(idx.reduce((x, i) => x + a.white[i], 0) / n),
    edgeBox: round(median(idx.map((i) => a.box[i]))),
    motion: round(median(idx.map((i) => a.d1[i]))),
  };
  // Flips: bodies jumping between poses and back. Only 30 fps sees these.
  const flips = idx.filter((i) => inside(i) && a.exc[i] >= LIMITS.flipShare);
  m.flipFrames = flips.length;
  m.flipTimes = flips.slice(0, 12).map(frame2t);
  // Single-frame pops, not cuts: one cell jumps far above its neighbours. Regular ones are `steps`, stop motion by design.
  const pops = [];
  for (const i of idx) {
    if (!inside(i) || i < 6) continue;
    const near = a.cell.slice(i - 5, i).concat(a.cell.slice(i + 1, i + 6));
    if (a.cell[i] > Math.max(LIMITS.popMin, LIMITS.popRatio * median(near))) pops.push(i);
  }
  const gaps = pops.slice(1).map((p, k) => p - pops[k]);
  const periodic = gaps.length >= 3 && gaps.every((g) => Math.abs(g - median(gaps)) <= 1);
  m.stepped = periodic;
  m.pops = periodic ? [] : pops.slice(0, 12).map(frame2t);
  // The moments worth watching frame by frame: pops and flips first, then the most movement.
  const peaks = [...flips, ...pops].slice(0, 2);
  if (peaks.length < 2) {
    const busy = idx.filter(inside).sort((x, y) => a.cell[y] - a.cell[x]);
    for (const b of busy) if (peaks.every((p) => Math.abs(p - b) > 12)) { peaks.push(b); if (peaks.length === 2) break; }
  }
  m.peaks = peaks.map(frame2t);
  return m;
}

/** How far a cut sits from the musical grid: beats, half beats, then kick and snare hits. */
export function cutTiming(t) {
  const b = song.beats, grid = [];
  for (let i = 0; i + 1 < b.length; i++) grid.push(b[i], (b[i] + b[i + 1]) / 2);
  const hits = (x) => (x ?? []).map((o) => (typeof o === 'number' ? o : o.t));
  grid.push(...hits(song.onsets.kick), ...hits(song.onsets.snare));
  let best = Infinity;
  for (const g of grid) { const d = Math.abs(g - t); if (d < best) best = d; }
  return round(best, 3);
}

// ---------- pictures ----------

const labelFilter = (offset, w) => `drawtext=fontfile='${FONT}':text='%{eif\\:floor(t+${offset})\\:d}.%{eif\\:mod((t+${offset})*100,100)\\:d\\:2}':x=4:y=4:fontsize=${Math.round(w / 18)}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=2`;

function tile(video, seek, frames, out, cols, width) {
  const rows = Math.ceil(frames.length / cols);
  const sel = frames.map((f) => `eq(n\\,${f})`).join('+');
  const vf = `select='${sel}',scale=${width}:-2,${labelFilter(round(seek, 3), width)},tile=${cols}x${rows}:padding=4`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(seek), '-i', video, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-frames:v', '1', '-q:v', '3', out], { encoding: 'utf8' });
  if (r.status) throw new Error(r.stderr);
  return out;
}

/** Stepped sheets of 12 large frames, one per 3 seconds of shot, and a burst of consecutive 30 fps frames at each peak. */
function pictures(video, s, m, dir, offset, fps) {
  const out = [], total = s.to - s.from, parts = Math.max(1, Math.ceil(total / 3)), cols = 3, width = 520;
  for (const f of fs.readdirSync(dir)) if (/^(sheet\d*|burst)\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  for (let p = 0; p < parts; p++) {
    const a = s.from + (p / parts) * total - offset + (p ? 0 : 1 / fps), dur = total / parts; // a frame in: a shot render's start is rounded, so its frame on the cut can still be the shot before
    const avail = Math.max(1, Math.floor(dur * fps)), n = Math.min(avail, 12), frames = [];
    for (let i = 0; i < n; i++) frames.push(Math.floor((i / n) * avail));
    out.push(tile(video, round(a, 3), frames, path.join(dir, p ? `sheet${p + 1}.jpg` : 'sheet.jpg'), cols, width));
  }
  const peaks = m.peaks.slice(0, 2).sort((x, y) => x - y), fr = [];
  if (peaks.length && total * fps > 12) {
    const seek = Math.max(s.from, peaks[0] - 0.1) - offset;
    for (const pk of peaks) {
      const c = Math.round((pk - offset - seek) * fps);
      for (let i = -2; i < 4; i++) if (c + i >= 0 && !fr.includes(c + i)) fr.push(c + i);
    }
    out.push(tile(video, round(seek, 3), fr.sort((x, y) => x - y), path.join(dir, 'burst.jpg'), cols, width));
  }
  return out;
}

// ---------- motioncheck ----------

function unityFree() {
  const q = tickets(path.join(ROOT, 'gen/queue'));
  if (q.length) return `Unity is busy: ${q[0].label}`;
  const hb = json(path.join(ROOT, 'heartbeat.json'));
  if (!hb || Date.now() - new Date(hb.utc).getTime() > 10000) return 'Unity is not answering';
  if (hb.compiling || hb.updating) return 'Unity is compiling';
  if (hb.playing) return 'J is playing';
  return null;
}

function runMotioncheck(args, limit) {
  const r = spawnSync('node', [path.join(ROOT, 'mv.mjs'), '--video', V.name, 'motioncheck', ...args, '--every', '0.2', '--budget', '45'], { encoding: 'utf8', timeout: limit * 1000 });
  return r.status === 0 ? null : (r.error?.message ?? r.stderr ?? 'failed').slice(-200);
}

function motionFor(s, mc) {
  if (!mc) return null;
  return (mc.problems ?? []).filter((p) => p.from < s.to && p.to > s.from && p.score >= LIMITS.motionScore)
    .slice(0, 6).map((p) => ({ check: p.check, actor: p.actor, what: p.what, from: p.from, to: p.to, value: p.value, unit: p.unit, score: p.score }));
}

// ---------- the review ----------

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'subjectPct', 'flipsReal', 'faults'],
  properties: {
    summary: { type: 'string' },
    subjectPct: { type: 'number' },
    flipsReal: { type: 'boolean' },
    faults: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['from', 'to', 'rule', 'sev', 'seen', 'what', 'fix'],
      properties: {
        from: { type: 'number' }, to: { type: 'number' },
        rule: { type: 'string', enum: ['contact', 'pose', 'weight', 'hold', 'face', 'staging', 'frame', 'story'] },
        sev: { type: 'string', enum: ['A', 'B', 'C'] },
        seen: { type: 'string', enum: ['certain', 'likely'] },
        what: { type: 'string' }, fix: { type: 'string' },
      },
    } },
  },
};

export function promptFor(card, hints) {
  const standard = fs.readFileSync(path.join(ROOT, 'review/STANDARD.md'), 'utf8');
  return `You are the strict polish reviewer on a stylized real-time 3D music video. An animator already thinks this shot is finished. You have not seen it before.

The images are contact sheets of one shot. Every tile has the video time burned in, top left. Sheets step through the whole shot; the last image, if the shot is long enough, is a burst of consecutive 30 fps frames around its busiest moments, read left to right. Treat the frames as motion: compare neighbours for pops, drifting, sliding and arms that change pose with no reason.

THE STANDARD
${standard}

WHAT THIS SHOT MUST DO
${JSON.stringify(card, null, 1)}

MEASUREMENTS FROM THE RENDER (hints, not verdicts: confirm them in the images)
${JSON.stringify(hints, null, 1)}

HOW TO JUDGE
- Check, in order: hands (does anything held sit in a closed hand, or float, or cut through it? hands that touch nothing they should?), arms (natural shoulders and elbows, or broken, twisted, stuck behind the body, too long, twinned?), body (contorted, deformed mesh, stiff board, floating above what he stands on, legs through furniture, poses snapping?), clothes and skin (skin through the shirt, gaps at the hem or sleeve, tears, holes), face (stuck grin, blank stare, wrong teeth?), other things touching him (a prop or bird inside his body, walls showing through doors), framing (his head or the action cut off by the frame or hidden behind something).
- Story: the "story" lines in WHAT THIS SHOT MUST DO describe whole bars, which often span several shots, so most of it happens in other shots, and the lines may be older than the edit. So use rule "story", not another rule, for anything about an event missing or not reading, and only for what this shot itself seems meant to show. If the card has an "idea", the shot must deliver it.
- A strange pose held for a few frames counts. J cares most about arms, hands and contact: "the arms are all messed up" was his most repeated note.
- In a close shot of hands, anything held that isn't wrapped by the fingers, or a hand that passes through it, is sev A.
- Report only what you can point to in a tile. Give the tile times. sev A breaks the shot, B a viewer would notice, C minor. seen "certain" means plainly visible; "likely" means small, dark or blurred.
- These are NOT faults: darkness, silhouettes, film grain, static, letterbox bars, colour effects, heavy stylization and glow when the shot is meant to look that way; low detail from small tiles; a turkey wearing a tie; TVs showing pictures; on-screen graphics such as lower thirds, tickers and banners over a TV show, even over his feet; a snow or static frame at the very start or end of a shot, which is a channel flip; a pose you can't make out. Motion blur is not a mesh fault. If you can't tell, leave it out.
- Be thorough: go through the frames one body part at a time and list every fault you can see, minor ones too, and let sev say how bad each is. But each must be there in the frames: a good shot gets an empty list.
Also give subjectPct: how much of the frame height the main subject fills, 0 to 100. flipsReal: if flipFrames above is 3 or more, look at the burst: true if a body or prop really jumps between poses and back from one frame to the next, false if it is a lamp flicker, a strobe, a shake, a fast pan or a screen picture; false when flipFrames is low. summary: one plain sentence.`;
}

/** Score out of 10, and the machine faults. Vision faults marked `likely` count for less. */
export function scoreOf(q) {
  const faults = [];
  const m = q.measured ?? {};
  const add = (sev, what, t) => faults.push({ source: 'measure', sev, what, from: t, to: t });
  if (m.flipFrames >= LIMITS.flipFrames && q.vision?.flipsReal !== false) add(m.flipFrames >= 6 ? 'A' : 'B', `bodies flip between poses on ${m.flipFrames} frames (first at ${m.flipTimes[0]} s)`, m.flipTimes[0]);
  if (m.pops?.length >= 2) add('C', `${m.pops.length} single-frame pops, first at ${m.pops[0]} s`, m.pops[0]);
  if (m.luma < LIMITS.darkLuma && m.dark > 0.85) add('C', `very dark: median luma ${m.luma}, ${Math.round(m.dark * 100)}% of the frame near black`, q.from);
  if (m.white > LIMITS.whiteShare) add('B', `blown out: ${Math.round(m.white * 100)}% of the frame is white`, q.from);
  const sub = q.vision?.subjectPct;
  if (sub != null && sub > 0 && sub < LIMITS.smallSubject) add('C', `subject is small, ${Math.round(sub)}% of the frame`, q.from);
  if (q.cutOffset > LIMITS.cutOffset) add('C', `cut is ${Math.round(q.cutOffset * 1000)} ms off the grid`, q.from);
  for (const p of q.motion ?? []) if (p.score >= 150) add('C', `motioncheck: ${p.actor} ${p.check} ${p.what} ${p.value} ${p.unit}`, p.from);
  // A storyboard line isn't a shot's card, so without a real card "story" can't fail a shot.
  const seen = (q.vision?.faults ?? []).map((f) => ({ source: 'vision', ...f, sev: f.rule === 'story' && !q.card?.idea ? 'C' : f.sev }));
  const all = [...faults, ...seen];
  let score = 10;
  for (const f of all) score -= { A: 2.5, B: 1.1, C: 0.3 }[f.sev] * (f.seen === 'likely' ? 0.6 : 1);
  score = round(Math.max(0, score), 1);
  const blockers = all.filter((f) => f.sev === 'A' && f.seen !== 'likely').length;
  return { score, pass: blockers === 0 && score >= LIMITS.pass, faults: all };
}

async function review(gen, s, files, prompt, model) {
  let job;
  for (let tries = 0; ; tries++) {
    try { job = await gen.run('llm.json', { params: { prompt, model, effort: 'medium', maxTokens: 4000, schema: SCHEMA }, inputs: { images: files }, labels: { qa: s.id } }); break; }
    catch (e) { if (tries >= 3) throw e; await new Promise((r) => setTimeout(r, 4000 * (tries + 1))); } // Gen scales to zero and drops the odd call
  }
  const r = job.result ?? {};
  const u = r.usage ?? {};
  const [pi, po] = PRICES[r.model ?? model] ?? PRICES['claude-sonnet-5-5'];
  const tokensIn = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1;
  const cost = (tokensIn * pi + (u.output_tokens ?? 0) * po) / 1e6; // list prices, as Gen's costOf
  return { ...r.value, model: r.model ?? model, tokens: { in: Math.round(tokensIn), out: u.output_tokens ?? 0 }, cost: round(cost, 4) };
}

// ---------- the run ----------

function parseArgs(argv) {
  const f = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--strict', '--force', '--no-vision', '--no-motion', '--notes'].includes(a)) f[a.slice(2)] = true;
    else if (a.startsWith('--')) f[a.slice(2)] = argv[++i];
    else f._.push(a);
  }
  return f;
}

function latestRender() {
  let f = []; try { f = fs.readdirSync(V.output); } catch {}
  return f.filter((x) => /-v\d+\.mp4$/.test(x)).map((x) => path.join(V.output, x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null;
}

/** mv shot's render of this shot, if it is newer than the full render: 1 s handles, so the song time of its first frame is worked out. */
function shotRender(s, full) {
  const f = path.join(V.shots, s.id + '.mp4');
  if (!fs.existsSync(f) || (full && fs.statSync(f).mtimeMs < fs.statSync(full).mtimeMs)) return null;
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const len = parseFloat(r.stdout), tail = Math.max(0, clockOf.duration - s.to);
  // The handle h: from = max(0, t-h), to = min(end+h, duration). h is whatever makes the length fit.
  const h = Math.max(0, Math.min(s.from, (len - (s.to - s.from)) / (tail >= 1 ? 2 : 1)));
  return { file: f, offset: round(Math.max(0, s.from - h), 3) };
}

/** Sends a shot's A and B faults to the Review Room as notes for the shot's agent (source "qa"), once each. Passing closes them. */
async function postNotes(results) {
  const { updateNotes, moment, setStatus, nextId } = await import('../room/lib.mjs');
  return updateNotes(V.name, (notes) => {
    let added = 0, closed = 0;
    for (const q of results) {
      const want = q.faults.filter((f) => f.sev !== 'C' && f.seen !== 'likely');
      const keys = new Set(want.map((f) => `${q.id}|${f.rule ?? f.source}`));
      for (const n of notes) if (n.source === 'qa' && n.qaShot === q.id && ['new', 'in progress'].includes(n.status) && !keys.has(n.qaKey)) { setStatus(n, 'fixed', 'qa', `QA passes this now, score ${q.score}`); closed++; }
      for (const f of want) {
        const qaKey = `${q.id}|${f.rule ?? f.source}`;
        if (notes.some((n) => n.qaKey === qaKey && n.status !== 'fixed' && n.status !== 'approved')) continue;
        const t = f.from ?? q.from, n = { id: nextId(notes), status: 'new', source: 'qa', qaShot: q.id, qaKey, text: `QA ${f.sev}: ${f.what}${f.fix ? ` Fix: ${f.fix}` : ''}`, ...moment(V.name, t), render: null, version: null, frame: null, frameImage: null, images: [], created: new Date().toISOString(), history: [] };
        setStatus(n, 'new', 'qa'); notes.push(n); added++;
      }
    }
    return { added, closed };
  });
}

export function writeReport(dir, list, label) {
  const ranked = [...list].sort((a, b) => a.score - b.score || a.from - b.from);
  const failed = ranked.filter((q) => !q.pass), cost = ranked.reduce((x, q) => x + (q.vision?.cost ?? 0), 0);
  const avg = ranked.length ? ranked.reduce((x, q) => x + q.score, 0) / ranked.length : 0;
  const md = [`# QA report: ${label}`, '', `${ranked.length} shots, ${failed.length} failed, average ${avg.toFixed(1)} of 10. Vision cost $${cost.toFixed(2)} ($${(cost / Math.max(1, ranked.length)).toFixed(3)} a shot). Worst first. Written by \`qa.mjs\`, ${new Date().toISOString().slice(0, 16)}.`, '', '| score | shot | time | bar | worst faults |', '|---|---|---|---|---|'];
  for (const q of ranked) {
    const top = q.faults.filter((f) => f.sev !== 'C').slice(0, 3).map((f) => `${f.sev} ${f.what}`.replace(/\|/g, '/').slice(0, 110)).join('; ') || '-';
    md.push(`| ${q.pass ? '' : '**'}${q.score}${q.pass ? '' : '**'} | ${q.id} | ${clock(q.from)} | ${barLabel(q.from)} | ${top} |`);
  }
  fs.writeFileSync(path.join(dir, 'qa-report.md'), md.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'qa-report.json'), JSON.stringify({ label, written: new Date().toISOString(), shots: ranked.length, failed: failed.length, average: round(avg), cost: round(cost, 3), ranked: ranked.map((q) => ({ id: q.id, from: q.from, to: q.to, score: q.score, pass: q.pass, sheets: q.sheets, faults: q.faults })) }, null, 1));
  return path.join(dir, 'qa-report.md');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2)), what = flags._[0];
  if (!what) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n')); return 0; }
  useVideo(flags.video ?? null);
  const full = flags.render ? path.resolve(flags.render) : latestRender();
  const current = !flags.render || full === latestRender();
  const label = flags.label ?? (current ? 'current' : path.basename(full, '.mp4').replace(/^.*-/, ''));
  const base = current ? mkdir(V.shots) : mkdir(path.join(V.captures, 'qa', label));
  // Only this cut's shots: renumbering leaves the old folders behind, and they must not count.
  const liveIds = () => { try { return new Set(scoreShots().map((x) => x.id)); } catch { return null; } };
  const saved = () => { const live = current ? liveIds() : null; return fs.readdirSync(base).map((d) => json(path.join(base, d, 'qa.json'))).filter((q) => q && (!live || live.has(q.id))); };
  if (what === 'report') { console.log(writeReport(base, saved(), `${V.name} ${label}`)); return 0; }
  const mode = flags.shots ?? (current ? 'score' : 'cuts');
  const a = full ? await analyse(full) : null;
  if (mode === 'cuts' && !a) throw new Error('nothing rendered yet: mv render, or mv shot <n>');
  const end = a ? a.frames / a.fps : clockOf.duration;
  const shots = mode === 'score' ? scoreShots() : cutShots(a);
  if (what === 'list') { for (const s of shots) console.log(`${s.id}  ${clock(s.from)}-${clock(s.to)}  ${barLabel(s.from)}`); return 0; }
  let chosen = pick(shots, what);
  if (flags.limit) chosen = chosen.slice(0, +flags.limit);
  if (!chosen.length) throw new Error('no shot matches ' + what);

  // Motion check speaks for the current build only, so never for an old render.
  // Unity busy: the last whole-cut reading, not whatever one shot's check left in motioncheck.json.
  const mcAll = path.join(V.captures, 'motioncheck-runs', 'latest-all.json'), mcLast = path.join(V.captures, 'motioncheck.json');
  const mcFile = () => (fs.existsSync(mcAll) && (mcState !== 'ran' || !fs.existsSync(mcLast)) ? mcAll : mcLast);
  let mcState = 'skipped', mc = null;
  if (!flags['no-motion'] && current && mode === 'score') {
    const busy = unityFree();
    if (busy) mcState = 'skipped: ' + busy;
    else {
      const args = chosen.length === 1 ? ['--shot', String(chosen[0].n)] : [String(round(chosen[0].from, 2)), String(round(chosen[chosen.length - 1].to, 2))];
      console.error('motioncheck ' + args.join(' '));
      const err = runMotioncheck(args, 900);
      mcState = err ? 'failed: ' + err : 'ran';
    }
    if (fs.existsSync(mcFile()) && (mcState === 'ran' || (full && fs.statSync(mcFile()).mtimeMs >= fs.statSync(full).mtimeMs))) { mc = json(mcFile()); if (mcState !== 'ran') mcState += ', using the last report'; }
  }

  let gen = null;
  const model = flags.model ?? 'claude-sonnet-5-5';
  if (!flags['no-vision']) { const { HawkesGen } = await import('./mv/hawkesgen.mjs'); gen = new HawkesGen({ project: 'tkshock' }); }
  const results = [];
  const one = async (s) => {
    const dir = mkdir(path.join(base, s.id));
    const own = current ? shotRender(s, full) : null;
    if (!own && (!a || s.from >= end - 0.05)) throw new Error('not rendered: mv shot ' + s.n);
    const clip = own ? await analyse(own.file) : a, offset = own?.offset ?? 0, source = own?.file ?? full;
    const m = measure(clip, s, offset), card = cardFor(s), motion = motionFor(s, mc);
    const q = { id: s.id, name: s.name, from: round(s.from, 3), to: round(s.to, 3), render: path.relative(ROOT, source).replace(/\\/g, '/'), offset, measured: m, motion, motioncheck: mcState, cutOffset: s.n > 1 ? cutTiming(s.from) : 0, card };
    const hints = { flipFrames: m.flipFrames, flipTimes: m.flipTimes, pops: m.pops, stepped: m.stepped, medianLuma: m.luma, motioncheck: motion };
    const prompt = promptFor(card, hints);
    const pics = pictures(source, s, m, dir, offset, clip.fps);
    const hash = crypto.createHash('sha1').update(prompt + model); for (const p of pics) hash.update(fs.readFileSync(p));
    q.hash = hash.digest('hex').slice(0, 16);
    const old = json(path.join(dir, 'qa.json'));
    if (gen) q.vision = !flags.force && old?.hash === q.hash && old.vision ? { ...old.vision, reused: true } : await review(gen, s, pics, prompt, model);
    else if (old?.hash === q.hash) q.vision = old.vision;
    q.sheets = pics.map((p) => path.basename(p));
    Object.assign(q, scoreOf(q));
    fs.writeFileSync(path.join(dir, 'qa.json'), JSON.stringify(q, null, 1));
    results.push(q);
    console.error(`${q.pass ? 'pass' : 'FAIL'} ${String(q.score).padStart(4)}  ${s.id}${q.vision?.reused ? ' (reused)' : ''}  ${q.faults.filter((f) => f.sev !== 'C').length} faults`);
  };
  const queue = [...chosen], jobs = +(flags.jobs ?? 6), errors = [];
  await Promise.all(Array.from({ length: jobs }, async () => {
    for (let s; (s = queue.shift()); ) {
      try { await one(s); } catch (e) { errors.push(`${s.id}: ${e.message}`); console.error(`ERROR ${s.id}: ${e.message}`); }
    }
  }));
  const report = writeReport(base, saved(), `${V.name} ${label}`);
  const notes = flags.notes && current ? await postNotes(results.filter((q) => q.vision)) : null;
  const failed = results.filter((q) => !q.pass);
  const cost = results.reduce((x, q) => x + (q.vision?.reused ? 0 : q.vision?.cost ?? 0), 0);
  console.log(JSON.stringify({ shots: results.length, failed: failed.length, worst: [...results].sort((x, y) => x.score - y.score).slice(0, 5).map((q) => `${q.score} ${q.id}`), motioncheck: mcState, cost: round(cost, 3), costPerShot: round(cost / Math.max(1, results.length), 4), report, notes, errors: errors.length }, null, 1));
  if (flags.strict && (failed.length || errors.length)) return 2;
  return 0;
}

/** Proves the measuring on a small made-up clip: a still scene, then a square flipping between two places, then a slide. */
async function selftest() {
  const dir = mkdir(path.join(ROOT, 'captures/qa-selftest')), out = path.join(dir, 'flip.mp4');
  // 3 s still, 2 s of a box jumping left and right every frame, 3 s of the box sliding steadily.
  const f = `[0][1]overlay=x='if(between(t,3,5),if(eq(mod(n,2),0),200,420),if(lt(t,3),200,200+(t-5)*80))':y=120`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x303030:s=640x360:r=30:d=8', '-f', 'lavfi', '-i', 'color=c=white:s=120x120:r=30:d=8', '-filter_complex', f, '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', out], { encoding: 'utf8' });
  if (r.status) throw new Error(r.stderr);
  const a = await analyse(out), still = measure(a, { from: 0.2, to: 2.8 }), flip = measure(a, { from: 3.1, to: 4.9 }), slide = measure(a, { from: 5.2, to: 7.8 });
  const checks = {
    'a still scene has no flips': still.flipFrames === 0,
    'a flipping body is seen': flip.flipFrames > 20,
    'a steady slide is not a flip': slide.flipFrames === 0,
    'an A fault blocks a pass': !scoreOf({ from: 0, measured: {}, vision: { faults: [{ sev: 'A', seen: 'certain', rule: 'contact', what: 'x' }] } }).pass,
    'a likely A does not': scoreOf({ from: 0, measured: {}, vision: { faults: [{ sev: 'A', seen: 'likely', rule: 'contact', what: 'x' }] } }).pass,
    'flips the reviewer rejects do not count': scoreOf({ from: 0, measured: { flipFrames: 9, flipTimes: [1] }, vision: { flipsReal: false, faults: [] } }).score === 10,
    'story needs a real card': scoreOf({ from: 0, measured: {}, vision: { faults: [{ sev: 'A', seen: 'certain', rule: 'story', what: 'x' }] } }).pass,
  };
  let bad = 0;
  for (const [k, v] of Object.entries(checks)) { console.log(`${v ? 'pass' : 'FAIL'}  ${k}`); if (!v) bad++; }
  return bad ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'selftest') selftest().then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
  else main().then((c) => process.exit(c), (e) => { console.error(String(e.message ?? e)); process.exit(1); });
}
