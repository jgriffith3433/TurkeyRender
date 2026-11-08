#!/usr/bin/env node
// The Review Room: a local page for watching a render, clicking a moment and leaving a note.
// node Director/room/server.mjs, then http://127.0.0.1:8795. Started for J by the app's browser pane (`room` in .claude/launch.json).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  DIRECTOR, ROOM, STATUSES, autoCapable, autoRunning, currentVideo, info, listRenders, listVideos, loadShots, loadSong, moment, nextId, probe, readNotes, readQa, scoreRev, setStatus, syncMarks, updateNotes, videoDir,
} from './lib.mjs';
import { tickets } from '../tools/mv/queue.mjs';

const PORT = 8795, HOST = '127.0.0.1';
const PUBLIC = path.join(ROOM, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
};
const MEDIA = new Set(['.mp4', '.webm', '.mov', '.png', '.jpg', '.jpeg', '.webp', '.gif']);

// ---------- files, with ranges so seeking in big renders is instant ----------

function sendFile(req, res, file) {
  let st;
  try { st = fs.statSync(file); } catch { return send(res, 404, { error: 'not found' }); }
  if (!st.isFile()) return send(res, 404, { error: 'not found' });
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const tag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', ETag: tag, 'Cache-Control': 'no-cache' };
  if (req.headers['if-none-match'] === tag && !req.headers.range) { res.writeHead(304, head); return res.end(); }

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  let from = 0, to = st.size - 1, code = 200;
  if (range && (range[1] || range[2])) {
    if (range[1]) { from = +range[1]; if (range[2]) to = Math.min(+range[2], to); }
    else from = Math.max(0, st.size - +range[2]);
    if (from > to || from >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    code = 206;
    head['Content-Range'] = `bytes ${from}-${to}/${st.size}`;
  }
  head['Content-Length'] = to - from + 1;
  res.writeHead(code, head);
  if (req.method === 'HEAD' || st.size === 0) return res.end();
  const stream = fs.createReadStream(file, { start: from, end: to, highWaterMark: 1 << 18 });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

function send(res, code, body) {
  const text = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

function readBody(req, limit = 80 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad JSON')); } });
    req.on('error', reject);
  });
}

// ---------- what the page reads ----------

const probes = new Map();
function rendersOf(name) {
  return listRenders(name).map((r) => {
    const key = `${r.path}|${r.mtime}`;
    if (!probes.has(key)) probes.set(key, probe(r.path));
    const { path: full, ...rest } = r;
    return { ...rest, ...probes.get(key), url: '/d/' + encodeURI(path.relative(DIRECTOR, full).split(path.sep).join('/')) + `?m=${Math.round(r.mtime)}` };
  });
}

function scoreOf(name) {
  const { shots, error } = loadShots(name);
  return { song: loadSong(name), shots, error };
}

// ---------- the live strip ----------

// Unity writes nothing about render progress to disk, so the room asks with the read-only render-status command,
// and only while a render's temporary file exists. Otherwise it reads files and leaves the mailbox alone.
const renderState = { pending: null, sent: 0, last: null, seen: 0 };

function findRenderTemp() {
  const hits = [];
  const look = (dir, depth) => {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of names) {
      const p = path.join(dir, e.name);
      if (e.isFile() && e.name.endsWith('.video.mp4')) hits.push({ path: p, mtime: fs.statSync(p).mtimeMs });
      else if (e.isDirectory() && depth > 0) look(p, depth - 1);
    }
  };
  look(path.join(DIRECTOR, 'output'), 2);
  look(path.join(DIRECTOR, 'videos'), 3);
  return hits.filter((h) => Date.now() - h.mtime < 120000).sort((a, b) => b.mtime - a.mtime)[0] ?? null;
}

function pollRender() {
  const out = path.join(DIRECTOR, 'outbox');
  if (renderState.pending) {
    const reply = path.join(out, renderState.pending + '.json');
    if (fs.existsSync(reply)) {
      try {
        const r = JSON.parse(fs.readFileSync(reply, 'utf8'));
        if (r.ok) { renderState.last = r.result; renderState.seen = Date.now(); }
      } catch {}
      try { fs.unlinkSync(reply); } catch {}
      renderState.pending = null;
    } else if (Date.now() - renderState.sent > 30000) renderState.pending = null; // Unity is busy; its reply can stay
    return;
  }
  const id = `${Date.now()}-room${randomUUID().slice(0, 4)}`;
  const inbox = path.join(DIRECTOR, 'inbox');
  try {
    fs.writeFileSync(path.join(inbox, id + '.tmp'), JSON.stringify({ cmd: 'render-status' }));
    fs.renameSync(path.join(inbox, id + '.tmp'), path.join(inbox, id + '.json'));
    renderState.pending = id; renderState.sent = Date.now();
  } catch {}
}

function liveStatus(name) {
  const read = (f) => { try { return fs.readFileSync(path.join(DIRECTOR, f), 'utf8'); } catch { return null; } };
  // The first ticket in the queue is what Unity is doing now; the rest wait.
  const line = tickets(path.join(DIRECTOR, 'gen', 'queue')).map((x) => ({ what: x.label, seconds: Math.round((Date.now() - new Date(x.since).getTime()) / 1000) }));

  let heart = null;
  try { heart = JSON.parse(read('heartbeat.json')); } catch {}
  const beatAge = heart ? (Date.now() - new Date(heart.utc).getTime()) / 1000 : Infinity;
  const unity = beatAge > 15 ? 'not answering' : heart.compiling ? 'compiling' : heart.updating ? 'importing' : 'ready';

  const temp = findRenderTemp();
  let render = null;
  if (temp) {
    if (unity === 'ready') pollRender();
    const s = renderState.last;
    render = { file: path.basename(temp.path).replace(/\.video\.mp4$/, '.mp4') };
    if (s?.running && s.frames) {
      render.frame = s.frame; render.frames = s.frames;
      render.eta = s.frame > 0 ? Math.round((s.seconds / s.frame) * (s.frames - s.frame)) : null;
    }
  } else renderState.last = null;

  const notes = readNotes(name).filter((n) => !n.removed);
  return {
    unity, building: line[0] ?? null, waiting: line.slice(1).map((x) => x.what), render,
    working: notes.filter((n) => n.status === 'in progress').map((n) => (n.auto?.step ? `${n.id}: ${n.auto.step}` : n.id)),
    openNotes: notes.filter((n) => n.status === 'new').length,
  };
}

// ---------- the note loop and the final render: both run on their own, this only starts them ----------

function startJob(script, args, logName, name) {
  const log = fs.openSync(path.join(videoDir(name), logName), 'a');
  const p = spawn(process.execPath, [script, ...args], { detached: true, stdio: ['ignore', log, log], windowsHide: true, cwd: DIRECTOR });
  p.unref();
  fs.closeSync(log);
}

const started = new Map();
/** A worker when there is work and none is running. Also picks up after a restart: a note left half done goes round again. */
function kickAuto(name) {
  if (!autoCapable(name) || autoRunning(name) || Date.now() - (started.get(name) ?? 0) < 5000) return;
  const notes = readNotes(name), stuck = notes.filter((n) => n.auto?.state === 'working');
  if (stuck.length) updateNotes(name, (all) => { for (const n of all) if (n.auto?.state === 'working') n.auto = { ...n.auto, state: 'queued', step: 'Waiting to start again' }; });
  // Unity marks arrive by themselves. One with words runs like a note from the page.
  const marks = notes.filter((n) => n.source === 'unity' && n.status === 'new' && n.text.trim() && !n.auto);
  if (marks.length) updateNotes(name, (all) => { for (const n of all) if (marks.some((m) => m.id === n.id)) n.auto = { state: 'queued', step: 'Queued' }; });
  if (stuck.length || marks.length || notes.some((n) => n.auto?.state === 'queued' && !n.removed)) {
    started.set(name, Date.now());
    startJob(path.join(ROOM, 'auto.mjs'), [name], 'auto.log', name);
  }
}

const finalDir = (name) => path.join(videoDir(name), 'final');
const readQuiet = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const processAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** What the page shows about final renders: one going now, and the report of the last one. */
function finalState(name) {
  const dir = finalDir(name);
  let live = readQuiet(path.join(dir, 'progress.json'));
  if (live && !processAlive(live.pid)) live = null;
  const r = readQuiet(path.join(dir, 'report.json')), failed = readQuiet(path.join(dir, 'failed.json'));
  return { live, report: r, failed: failed && (!r || failed.when > r.when) ? failed : null, capable: fs.existsSync(info(name).score) };
}

let finalAsked = 0;
function startFinal(name) {
  if (finalState(name).live || Date.now() - finalAsked < 8000) return { started: false, why: 'A final render is already going.' };
  finalAsked = Date.now();
  fs.mkdirSync(finalDir(name), { recursive: true });
  startJob(path.join(DIRECTOR, 'mv.mjs'), ['--video', name, 'final', '--w', '1280', '--h', '720'], path.join('final', 'run.log'), name);
  return { started: true };
}

/** Takes out the change the loop made for a note, if nothing has been stacked on it since. Needs no Unity: the next build picks it up. */
function undoChange(name, n) {
  const c = n.auto?.change;
  if (!c) throw new Error('this note has no automatic change to undo');
  const file = path.join(info(name).dir, 'tweaks', 'zz-room.json');
  const all = readQuiet(file) ?? {};
  if (JSON.stringify(all[c.card] ?? null) !== JSON.stringify(c.after)) throw new Error('a later note changed this shot too, so this one can no longer be taken out alone');
  if (c.before) all[c.card] = c.before; else delete all[c.card];
  if (Object.keys(all).length) fs.writeFileSync(file, JSON.stringify(all, null, 1) + '\n'); else fs.rmSync(file, { force: true });
  spawn(process.execPath, [path.join(DIRECTOR, 'tools', 'cards.mjs'), 'compile', info(name).dir], { stdio: 'ignore', windowsHide: true });
  delete n.auto.change;
}

// ---------- notes from the page ----------

function saveImage(name, rel, dataUrl) {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/s.exec(dataUrl ?? '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = `${rel}.${ext}`;
  fs.mkdirSync(path.join(videoDir(name), 'notes'), { recursive: true });
  fs.writeFileSync(path.join(videoDir(name), file), Buffer.from(m[2], 'base64'));
  return file;
}

function addNote(name, b) {
  if (!Number.isFinite(b.t)) throw new Error('a note needs a time');
  const at = moment(name, b.t);
  return updateNotes(name, (notes) => {
    const id = nextId(notes);
    const images = (b.images ?? []).map((d, i) => saveImage(name, `notes/${id}-pasted-${i + 1}`, d)).filter(Boolean);
    const note = {
      id, status: 'new', source: 'room', text: String(b.text ?? ''), ...at, frame: b.frame ?? null, render: b.render ?? null,
      version: b.version ?? null, frameImage: saveImage(name, `notes/${id}`, b.frameImage), images, created: new Date().toISOString(), history: [],
    };
    setStatus(note, 'new', 'J');
    if (note.text.trim() && autoCapable(name)) note.auto = { state: 'queued', step: 'Queued' };
    notes.push(note);
    return note;
  });
}

function changeNote(name, id, b) {
  return updateNotes(name, (notes) => {
    const n = notes.find((x) => x.id === id);
    if (!n) throw new Error('no note ' + id);
    if (b.undo) { undoChange(name, n); n.question = 'The change is out. Say what you want instead.'; setStatus(n, 'needs J', 'J', 'Change taken out'); n.auto.state = 'left'; }
    if (b.text !== undefined) {
      n.text = String(b.text); n.updated = new Date().toISOString();
      if (n.status === 'new' && n.text.trim() && autoCapable(name)) n.auto = { ...(n.auto ?? {}), state: 'queued', step: 'Queued' };
    }
    if (b.removed !== undefined) { n.removed = !!b.removed; n.updated = new Date().toISOString(); }
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) throw new Error('unknown status ' + b.status);
      setStatus(n, b.status, 'J', b.reply);
      if (b.status === 'new') {
        delete n.question;
        if (n.text.trim() && autoCapable(name)) n.auto = { ...(n.auto ?? {}), state: 'queued', step: 'Queued' };
      }
    }
    return n;
  });
}

// ---------- routes ----------

const routeDirector = (rel) => {
  const file = path.resolve(DIRECTOR, rel);
  const inside = file.startsWith(DIRECTOR + path.sep);
  return inside && MEDIA.has(path.extname(file).toLowerCase()) ? file : null;
};

async function handle(req, res) {
  // Only this page may talk to it: refuse anything arriving under another host name.
  if (![`${HOST}:${PORT}`, `localhost:${PORT}`].includes(req.headers.host)) return send(res, 403, { error: 'wrong host' });
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  const name = url.searchParams.get('video') || currentVideo();

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (p === '/') return sendFile(req, res, path.join(PUBLIC, 'index.html'));
    if (p === '/room.js' || p === '/room.css') return sendFile(req, res, path.join(PUBLIC, p.slice(1)));
    if (p.startsWith('/d/')) {
      const file = routeDirector(p.slice(3));
      return file ? sendFile(req, res, file) : send(res, 404, { error: 'not found' });
    }
    if (p === '/api/score') return name ? send(res, 200, scoreOf(name)) : send(res, 200, { song: null, shots: [] });
    if (p === '/api/state') {
      if (!name) return send(res, 200, { video: null, videos: [], renders: [], notes: [] });
      syncMarks(name);
      kickAuto(name);
      return send(res, 200, {
        video: name, videos: listVideos(), renders: rendersOf(name), scoreRev: scoreRev(name), status: liveStatus(name), qa: readQa(name), final: finalState(name),
        notes: readNotes(name).filter((n) => !n.removed), base: path.relative(DIRECTOR, videoDir(name)).split(path.sep).join('/'),
      });
    }
    return send(res, 404, { error: 'not found' });
  }

  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(res, 415, { error: 'send JSON' });
  const body = await readBody(req);
  if (req.method === 'POST' && p === '/api/notes') { const n = addNote(name, body); kickAuto(name); return send(res, 200, n); }
  if (req.method === 'POST' && p === '/api/final') return send(res, 200, startFinal(name));
  const m = /^\/api\/notes\/(n\d+)$/.exec(p);
  if (req.method === 'PATCH' && m) { const n = changeNote(name, m[1], body); kickAuto(name); return send(res, 200, n); }
  return send(res, 404, { error: 'not found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => { try { send(res, 500, { error: String(e.message ?? e) }); } catch {} });
});
server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.log(`The Review Room is already running at http://${HOST}:${PORT}`);
  // Stay up so the browser pane keeps its server entry; the running one serves the page.
  setInterval(() => {}, 1 << 30);
});
server.listen(PORT, HOST, () => console.log(`Review Room: http://${HOST}:${PORT}`));
