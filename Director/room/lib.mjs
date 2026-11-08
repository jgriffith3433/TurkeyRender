// Shared by the Review Room server and next.mjs: which video, its renders, its shots, its notes.
// Notes live in Director/videos/<name>/notes.json. Both programs change them through updateNotes, so neither loses a write.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse as parseJsonc } from '../tools/mv/jsonc.mjs';
import { expand, listVideos as scoreVideos, loadClock, loadScore, pickVideo, shotList, videoInfo } from '../tools/mv/score.mjs';

export const ROOM = path.dirname(fileURLToPath(import.meta.url));
export const DIRECTOR = path.dirname(ROOM);
export const STATUSES = ['new', 'in progress', 'fixed', 'needs J', 'approved'];
export const OPEN = ['in progress', 'new']; // what next.mjs hands out, in this order

const RENDER = /^(.+)-v(\d+)\.mp4$/;
const readJson = (p, fallback) => { try { return parseJsonc(fs.readFileSync(p, 'utf8'), p); } catch { return fallback; } };

// ---------- videos and renders ----------

// Notes always sit in videos/<name>/, also for tkshock, whose score still lives at the top of Director/.
export const videoDir = (name) => path.join(DIRECTOR, 'videos', name);
export const info = videoInfo;
export const currentVideo = () => pickVideo(null).name;
export const listVideos = () => scoreVideos().filter((n) => !n.startsWith('_'));

export function listRenders(name) {
  const dir = videoInfo(name).output;
  let files = [];
  try { files = fs.readdirSync(dir); } catch {}
  const out = [];
  for (const file of files) {
    const m = RENDER.exec(file);
    if (!m) continue;
    const st = fs.statSync(path.join(dir, file));
    out.push({ file, version: +m[2], label: `v${m[2]}`, path: path.join(dir, file), size: st.size, mtime: st.mtimeMs });
  }
  out.sort((a, b) => b.version - a.version);
  // A video's previs counts as a version, so a new video can be watched and noted before its first full render.
  const previs = path.join(videoDir(name), 'previs.mp4');
  if (fs.existsSync(previs)) {
    const st = fs.statSync(previs);
    out.push({ file: 'previs.mp4', version: 0, label: 'previs', path: previs, size: st.size, mtime: st.mtimeMs });
  }
  return out;
}

export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width,height', '-show_entries', 'format=duration', '-of', 'json', file], { encoding: 'utf8' });
  try {
    const j = JSON.parse(r.stdout), s = j.streams[0], [a, b] = s.r_frame_rate.split('/').map(Number);
    return { fps: a / (b || 1), width: s.width, height: s.height, duration: +j.format.duration };
  } catch { return { fps: 30, width: 0, height: 0, duration: 0 }; }
}

// ---------- the song and the shots ----------

export function loadSong(name) {
  const j = JSON.parse(fs.readFileSync(videoInfo(name).song, 'utf8'));
  // `mv song` writes beats and sections only; TK Shock's hand-tuned map also has bars. The bars follow from the beats.
  const phase = j.downbeatPhase ?? 0, meter = j.meter || 4;
  const barOf = (beat) => Math.floor((beat - phase) / meter) + 1;
  const bars = j.bars ?? j.beats.flatMap((t, i) => (i >= phase && (i - phase) % meter === 0 ? [{ bar: barOf(i), t }] : []));
  return {
    duration: j.duration, tempo: j.tempo, meter: j.meter, phase: j.downbeatPhase, beats: j.beats,
    bars: bars.map((b) => ({ bar: b.bar, t: b.t })),
    sections: (j.sections ?? []).map((s) => ({ name: s.name, kind: s.kind ?? s.feel, bar: s.bar ?? barOf(s.beat ?? 0), t: s.t })),
  };
}

export function beatAt(song, t) {
  const b = song.beats;
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0]);
  let lo = 0, hi = b.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (b[mid] <= t) lo = mid; else hi = mid; }
  return lo + (t - b[lo]) / (b[lo + 1] - b[lo]);
}

export function barBeat(song, t) {
  const b = beatAt(song, t) - song.phase;
  const bar = Math.floor(b / song.meter) + 1;
  const beat = b - (bar - 1) * song.meter + 1;
  return { bar, beat: Math.round(beat * 100) / 100, label: `${bar}:${+beat.toFixed(2)}` };
}

export const sectionAt = (song, t) => song.sections.filter((s) => s.t <= t + 0.01).pop()?.name ?? '';

/** The newest change to the score, so the page and the cache below know when to read it again. */
export function scoreRev(name) {
  const v = videoInfo(name);
  let rev = 0;
  const see = (p) => { try { rev = Math.max(rev, fs.statSync(p).mtimeMs); } catch {} };
  see(v.score); see(v.song);
  try { for (const f of fs.readdirSync(v.acts)) see(path.join(v.acts, f)); } catch {}
  return rev;
}

const shotCache = new Map();

/** The shots as mv shots lists them. While an act is half edited and won't parse, the last good list stands. */
export function loadShots(name) {
  const rev = scoreRev(name), had = shotCache.get(name);
  if (had?.rev === rev) return had;
  try {
    const v = videoInfo(name), { score } = loadScore(v), clock = loadClock(v, score);
    const shots = shotList(expand(score, clock).shots, clock).filter((s) => s.len > 0).map((s) => ({
      index: s.n, name: s.name, t: Math.round(s.t * 1000) / 1000, end: Math.round(s.end * 1000) / 1000, at: s.at, act: s.file ? path.basename(s.file) : '', line: s.line,
    }));
    const got = { rev, shots, error: null };
    shotCache.set(name, got);
    return got;
  } catch (e) {
    return { rev, shots: had?.shots ?? [], error: String(e.message ?? e) };
  }
}

export const shotAt = (shots, t) => shots.filter((s) => s.t <= t + 0.001).pop() ?? shots[0] ?? null;

// ---------- notes ----------

const notesFile = (name) => path.join(videoDir(name), 'notes.json');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function readNotes(name) {
  return readJson(notesFile(name), null)?.notes ?? [];
}

function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  for (let i = 0; ; i++) {
    try { fs.renameSync(tmp, file); return; }
    catch (e) { if (i > 40) throw e; sleep(25); } // Windows refuses while another program is reading it
  }
}

export function updateNotes(name, change) {
  const file = notesFile(name), lock = file + '.lock';
  fs.mkdirSync(path.join(videoDir(name), 'notes'), { recursive: true });
  for (let i = 0; ; i++) {
    try { fs.closeSync(fs.openSync(lock, 'wx')); break; }
    catch {
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 10000) fs.unlinkSync(lock); } catch {}
      if (i > 300) throw new Error('notes.json is locked');
      sleep(10);
    }
  }
  try {
    const notes = readNotes(name);
    const result = change(notes);
    writeAtomic(file, JSON.stringify({ video: name, notes }, null, 1));
    return result;
  } finally { try { fs.unlinkSync(lock); } catch {} }
}

export const nextId = (notes) => 'n' + (notes.reduce((m, n) => Math.max(m, +n.id.slice(1) || 0), 0) + 1);

// ---------- before and after ----------

export const relToDirector = (p) => path.relative(DIRECTOR, p).split(path.sep).join('/');

// The stretch of the video a note is about: its shot, or 4 s each side when the shot is long.
export function windowOf(n) {
  const short = n.shot && n.shot.end - n.shot.t <= 8;
  const from = short ? n.shot.t : Math.max(0, n.t - 4), to = short ? n.shot.end : n.t + 4;
  return { from, to: Math.max(to, from + 1) };
}

export function cutClip(src, out, { from, to }) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', src,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-g', '15', '-c:a', 'aac', '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (r.status) throw new Error('Could not cut a clip: ' + r.stderr);
}

/**
 * The note's before and after, the same stretch of time side by side, kept with the note so a later render can't change them.
 * Before is the moment as J saw it. Notes from Unity have no render, so the render before this fix stands in.
 * `start` is where in the video `src` begins: 0 for a whole render, the first second of `mv shot`'s file for a shot. null uses `src` as it is.
 */
export function addClips(name, id, src, { start = 0, attempt = 1 } = {}) {
  const note = readNotes(name).find((x) => x.id === id), win = windowOf(note), dir = path.join(videoDir(name), 'notes');
  fs.mkdirSync(dir, { recursive: true });
  const renders = listRenders(name);
  const beforeSrc = renders.find((r) => r.file === note.render) ?? renders.find((r) => path.resolve(r.path) !== path.resolve(src));
  const beforeFile = path.join(dir, `${id}-before.mp4`);
  if (beforeSrc && !fs.existsSync(beforeFile)) cutClip(beforeSrc.path, beforeFile, win);
  let after = path.join(dir, `${id}-after${attempt}${path.extname(src)}`);
  if (start !== null) cutClip(src, after, { from: Math.max(0, win.from - start), to: win.to - start });
  else if (path.resolve(src).startsWith(DIRECTOR + path.sep)) after = src; // outside Director the page can't serve it, so that one is copied
  else fs.copyFileSync(src, after);
  return { after: relToDirector(after), before: fs.existsSync(beforeFile) ? relToDirector(beforeFile) : null, from: win.from, to: win.to };
}

export function setStatus(note, status, by, text) {
  note.status = status;
  note.updated = new Date().toISOString();
  (note.history ??= []).push({ when: note.updated, status, by, ...(text ? { text } : {}) });
}

// What a moment on the timeline is: filled in the same way for the page and for Unity marks.
export function moment(name, t) {
  const song = loadSong(name);
  const shot = shotAt(loadShots(name).shots, t), bb = barBeat(song, t);
  return {
    t: Math.round(t * 1000) / 1000, at: bb.label, bar: bb.bar, beat: bb.beat, section: sectionAt(song, t),
    shot,
  };
}

// ---------- Unity marks become notes ----------

function readMarks(name) {
  const a = readJson(videoInfo(name).marks, []);
  return Array.isArray(a) ? a : [];
}

export function syncMarks(name) {
  const marks = readMarks(name);
  if (!marks.length) return 0;
  const key = (m) => `${m.id}@${m.t}`; // ids restart after marks-clear
  const known = new Map(readNotes(name).filter((n) => n.markKey).map((n) => [n.markKey, n]));
  const stale = (m) => {
    const n = known.get(key(m));
    return !n || (n.status === 'new' && n.text !== (m.note ?? ''));
  };
  const pending = marks.filter(stale);
  if (!pending.length) return 0;
  return updateNotes(name, (notes) => {
    let added = 0;
    for (const m of pending) {
      const already = notes.find((n) => n.markKey === key(m));
      if (already) { already.text = m.note ?? ''; continue; } // J typed the note after marking
      const id = nextId(notes);
      const note = {
        id, status: 'new', source: 'unity', markKey: key(m), text: m.note ?? '', ...moment(name, m.t),
        render: null, version: null, frame: null, frameImage: null, images: [], created: new Date().toISOString(), history: [],
      };
      if (m.image && fs.existsSync(m.image)) {
        // Mark screenshots get reused after marks-clear, so keep a copy.
        const rel = `notes/${id}.png`;
        try { fs.copyFileSync(m.image, path.join(videoDir(name), rel)); note.frameImage = rel; } catch {}
      }
      setStatus(note, 'new', 'unity mark');
      notes.push(note);
      added++;
    }
    return added;
  });
}

// ---------- the note loop (auto.mjs) ----------

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
export const autoLock = (name) => path.join(videoDir(name), 'auto.lock');
export const autoRunning = (name) => { const j = readJson(autoLock(name), null); return !!j?.pid && alive(j.pid); };
/** Only a video made of cards can change by itself. */
export const autoCapable = (name) => fs.existsSync(path.join(videoInfo(name).dir, 'cut.json'));

/** The last QA run: shot number to score, for the timeline. Director/tools/qa.mjs writes it. */
export function readQa(name) {
  const r = readJson(path.join(videoInfo(name).shots, 'qa-report.json'), null), out = {};
  for (const q of r?.ranked ?? []) out[parseInt(q.id)] = { score: q.score, pass: q.pass, worst: q.faults.filter((f) => f.sev !== 'C')[0]?.what ?? '' };
  return out;
}

export const byNextUp = (a, b) => OPEN.indexOf(a.status) - OPEN.indexOf(b.status) || a.t - b.t;

// A note as Claude needs it: every file as a full path that can be opened.
export function noteForClaude(name, n) {
  const abs = (rel) => (rel ? path.join(videoDir(name), rel) : null);
  return {
    ...n, video: name, frameFile: abs(n.frameImage), imageFiles: (n.images ?? []).map(abs),
    renderFile: n.render ? listRenders(name).find((r) => r.file === n.render)?.path ?? null : null,
  };
}
