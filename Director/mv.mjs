#!/usr/bin/env node
// Claude's remote for the open Unity editor. Works while Unity is in the background.
//   node Director/mv.mjs ping | status | build | marks | open | refresh | setup
//   node Director/mv.mjs frame <time...> [--w 960 --h 540]   exact frames as PNGs
//   node Director/mv.mjs sheet <from> <to> [--every 2b] [--cols 4]   contact sheet
//   node Director/mv.mjs seek|play <time> / pause
//   node Director/mv.mjs render [--from t --to t --w 1920 --h 1080 --fps 30]
//   node Director/mv.mjs find <words> [--type model] / pull "<package>" "<path words>"...
//   node Director/mv.mjs motion <from> <to> [--every 2 --on person --view side]   silhouette sheet with hips path, pops, foot slide
//   node Director/mv.mjs motioncheck <from> <to> [--every 0.1 --on person,person2 --budget 60 --lock name --checks joint]   animation QA, see AGENTS.md
//   node Director/mv.mjs lab <file.json>   try cues on a copy of an actor without building
//   node Director/mv.mjs call <command> '<json>'
// Times: 12:3 (bar:beat), 41.2s, m3 (mark), or plain seconds.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--wait') flags.wait = true;
  else if (argv[i] === '--fast') flags.fast = true;
  else if (argv[i].startsWith('--') && !['find', 'pull'].includes(argv[0])) flags[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}

async function waitReady(ms = 300000) {
  const end = Date.now() + ms;
  for (;;) {
    let hb = null;
    try { hb = JSON.parse(fs.readFileSync(path.join(ROOT, 'heartbeat.json'), 'utf8')); } catch {}
    if (hb && !hb.compiling && !hb.updating && Date.now() - new Date(hb.utc).getTime() < 8000) return;
    if (Date.now() > end) throw new Error('Unity is not answering (heartbeat stale)');
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function call(cmd, args = {}, timeout = 600000) {
  await waitReady();
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tmp = path.join(ROOT, 'inbox', id + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify({ cmd, ...args }));
  fs.renameSync(tmp, path.join(ROOT, 'inbox', id + '.json'));
  const out = path.join(ROOT, 'outbox', id + '.json');
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (fs.existsSync(out)) {
      const r = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.unlinkSync(out);
      if (r.log?.length) console.error(r.log.join('\n'));
      if (!r.ok) throw new Error(r.error);
      return r.result;
    }
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error('timed out waiting for Unity: ' + cmd);
}

function seconds(s) {
  const str = String(s).trim();
  const song = JSON.parse(fs.readFileSync(path.join(ROOT, 'song.json'), 'utf8'));
  const beatTime = (b) => {
    const i = Math.max(0, Math.min(song.beats.length - 2, Math.floor(b)));
    return song.beats[i] + (b - i) * (song.beats[i + 1] - song.beats[i]);
  };
  let m;
  if ((m = str.match(/^(\d+):([0-9.]+)$/))) return beatTime(song.downbeatPhase + (m[1] - 1) * song.meter + (m[2] - 1));
  if ((m = str.match(/^m(\d+)$/))) {
    const mk = JSON.parse(fs.readFileSync(path.join(ROOT, 'marks.json'), 'utf8')).find((x) => x.id == m[1]);
    if (!mk) throw new Error('no mark ' + str);
    return mk.t;
  }
  return parseFloat(str);
}

function beatAt(t) {
  const song = JSON.parse(fs.readFileSync(path.join(ROOT, 'song.json'), 'utf8'));
  const b = song.beats;
  let i = 0; while (i < b.length - 2 && b[i + 1] <= t) i++;
  return { song, beat: i + (t - b[i]) / (b[i + 1] - b[i]) };
}

async function compileGate() {
  await call('refresh');
  await waitReady();
  const f = path.join(ROOT, 'compile-errors.txt');
  if (fs.existsSync(f)) throw new Error('Compile errors:\n' + fs.readFileSync(f, 'utf8'));
}

const print = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 1));
const cmd = argv[0];
try {
  switch (cmd) {
    case 'ping': case 'status': case 'open': case 'pause': case 'marks': case 'marks-clear': case 'refresh': case 'setup':
      print(await call(cmd)); break;
    case 'build':
      await compileGate(); print(await call('build', flags.fast !== undefined ? { fast: true } : {})); break;
    case 'render-status': case 'render-cancel':
      print(await call(cmd)); break;
    case 'seek': case 'play':
      print(await call(cmd, pos[0] ? { t: seconds(pos[0]) } : {})); break;
    case 'frame': {
      print(await call('capture', { t: pos.map(seconds), w: +(flags.w ?? 960), h: +(flags.h ?? 540) })); break;
    }
    case 'sheet': {
      const from = seconds(pos[0]), to = seconds(pos[1]), every = parseFloat(flags.every ?? '2'), cols = +(flags.cols ?? 4);
      const { song, beat } = beatAt(from);
      const ts = [];
      for (let b = beat; ; b += every) {
        const i = Math.min(song.beats.length - 2, Math.floor(b));
        const t = song.beats[i] + (b - i) * (song.beats[i + 1] - song.beats[i]);
        if (t > to) break;
        ts.push(t);
      }
      const files = await call('capture', { t: ts, w: 480, h: 270 });
      const list = path.join(ROOT, 'captures', 'list.txt');
      fs.writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, '/')}'\nduration 1`).join('\n'));
      const out = path.join(ROOT, 'captures', 'sheet.png');
      const rows = Math.ceil(files.length / cols);
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `tile=${cols}x${rows}:padding=4`, '-frames:v', '1', out], { encoding: 'utf8' });
      if (r.status) throw new Error(r.stderr);
      print({ sheet: out, frames: files.length }); break;
    }
    case 'motion': {
      // mv motion <from> <to> [--every 2 --on person --view side|front|back|top --cols 8 --file motion.png]
      const m = { from: seconds(pos[0]), to: seconds(pos[1]), every: +(flags.every ?? 2), on: flags.on ?? 'person', view: flags.view ?? 'side' };
      if (flags.cols) m.cols = +flags.cols;
      if (flags.file) m.file = flags.file;
      print(await call('motion', m)); break;
    }
    case 'motioncheck': {
      // Runs in pieces so Unity stays free between them. With --lock <name> it takes Director/gen/unity.lock only while a piece runs.
      const lockFile = path.join(ROOT, 'gen', 'unity.lock'), name = flags.lock;
      const lock = async () => {
        if (!name) return;
        for (;;) {
          try { fs.writeFileSync(lockFile, name + ' motioncheck', { flag: 'wx' }); return; } catch {}
          await new Promise((r) => setTimeout(r, 3000));
        }
      };
      const unlock = () => { if (name && fs.readFileSync(lockFile, 'utf8').startsWith(name + ' ')) fs.unlinkSync(lockFile); };
      const to = seconds(pos[1] ?? 204), budget = +(flags.budget ?? 60), every = +(flags.every ?? 0.1), parts = [];
      let from = seconds(pos[0] ?? 0), i = 0;
      const a = { to, every, budget };
      if (flags.on) a.on = flags.on;
      if (flags.checks) a.checks = flags.checks;
      while (from >= 0) {
        await lock();
        let r;
        try { r = await call('motioncheck', { ...a, from, part: process.pid + '-' + String(i++).padStart(3, '0') }); } finally { unlock(); }
        parts.push(r.path);
        console.error(`${from.toFixed(1)}s: ${r.frames} frames, ${r.seconds}s (${r.ms}), ${r.ranges} ranges${r.sceneDirtied ? ', SCENE DIRTIED' : ''}`);
        from = r.next;
      }
      print(await call('motioncheck', { merge: parts }));
      for (const f of parts) fs.unlinkSync(f);
      break;
    }
    case 'lab': {
      // mv lab <file.json>: plays cues on a throwaway copy of an actor, no build needed. See AGENTS.md.
      const m = { path: path.resolve(pos[0]) };
      for (const k of ['every', 'cols', 'from', 'to']) if (flags[k]) m[k] = +flags[k];
      if (flags.view) m.view = flags.view;
      if (flags.sheet) m.sheet = flags.sheet;
      print(await call('lab', m)); break;
    }
    case 'render': {
      const a = {};
      for (const k of ['w', 'h', 'fps']) if (flags[k]) a[k] = +flags[k];
      if (flags.from) a.from = seconds(flags.from);
      if (flags.to) a.to = seconds(flags.to);
      if (flags.out) a.out = flags.out;
      print(await call('render', a));
      if (flags.wait !== undefined) {
        for (;;) {
          await new Promise((r) => setTimeout(r, 5000));
          const st = await call('render-status');
          if (!st.running) break;
        }
        print('rendered');
      }
      break;
    }
    case 'find': {
      const r = spawnSync('py', [path.join(ROOT, 'tools', 'assets.py'), 'find', ...argv.slice(1)], { encoding: 'utf8' });
      process.stdout.write(r.stdout + r.stderr); break;
    }
    case 'pull': {
      const r = spawnSync('py', [path.join(ROOT, 'tools', 'assets.py'), 'pull', ...argv.slice(1)], { encoding: 'utf8', maxBuffer: 1 << 26 });
      if (r.status) throw new Error(r.stderr || r.stdout);
      process.stdout.write(r.stdout);
      await compileGate();
      const info = JSON.parse(r.stdout);
      print(await call('fixmats', { roots: info.roots })); break;
    }
    case 'call':
      print(await call(argv[1], argv[2] ? JSON.parse(argv[2]) : {})); break;
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
  }
} catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
