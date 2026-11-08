#!/usr/bin/env node
// Claude's remote for the open Unity editor. Works while Unity is in the background.
//   node Director/mv.mjs [--video <name>] <command>      the video: --video, else Director/current-video, else tkshock
//   new <name> --song <file> [--quick --bpm 90 --offset 0] | song <file> [--bpm 90 --offset 0 --quick] | use <name> | videos
//   cards [check|compile|note|sheet ...] [--take s3=b] [--fast]   shot cards: compile, then build | sheet [--only a,b --at 0.1,0.5,0.9]   frames of every card
//   cards insert|remove [<video>] <at> <length> [--dry --drop --accept f,g --no-audio]   make room in the clock or take time out, moving every absolute time after it: tools/mv/clockshift.mjs
//   why <card> <key>   which layer set a value
//   lint [--strict --all --limit N --baseline --reindex]   the score against every known trap, no Unity
//   make [--to <stage>] [--shot <id>] [--force --w --h --fps]   THE way to make a video: board, cards, build, motion, shot, test, previs, final, each a gate that stops it (tools/mv/make.mjs)
//   status [<video>] | approve <shot> [--note "J's words"] | coldview [previs.mp4]   the stage table (pass / fail / stale / waiting), J's yes on a hero test, the cold view alone
//   ping | unity | build [--fast] [--strict] | marks | marks-clear | open | refresh | setup   (unity: the editor's own status, time and playing)
//   shots | shot <n|name> [--handle 1 --cols 6 --final] | previs [--fps 12]      frame, sheet, shot, render and previs refuse a stale scene: --allow-stale overrides
//   frame <time...> [--w 960 --h 540]   exact frames as PNGs
//   sheet <from> <to> [--every 2b] [--cols 4]   contact sheet
//   seek|play <time> / pause
//   render [--from t --to t --w 1920 --h 1080 --fps 30]   holds the queue until it is done
//   final [--w 1920 --h 1080 --fps 30 --to 28 --plan --force --name v3 --allow-bake --no-review]   the whole video, rendering only the shots that changed: tools/final.mjs
//   bake [status | <take...>] [--stale]   bake the takes whose bake is stale (every build does this too) | status: the bake report against library/bake-gate.json
//   review [<video>] [render.mp4] [--label v9 --no-vision --force --plan]   the 30 fps reviewer on a render (default: the latest): tools/review.mjs
//   critic [<video>] [from to] [--on person,other --label x --zerog]   the motion critic on the built scene's bone dumps, no render: tools/critic.mjs (12 principles, 0-10)
//   freeze [--note "..."] | thaw   lock the engine and model hashes; final --plan warns in red when they move
//   find <words> [--type model] / pull "<package>" "<path words>"...
//   motion <from> <to> [--every 2 --on person --view side]   silhouette sheet with hips path, pops, foot slide
//   motioncheck <from> <to> [--every 0.1 --on person,person2 --budget 60 --checks joint|shot|contact] | motioncheck --shot <n|name> [--set-baseline]
//   shotcheck [<video>] [--from t --to t --shot n --probes]   the camera and staging checks only (motioncheck --checks shot): frame, gesture, mark, readable, camin, propat
//   lab <file.json>   try cues on a copy of an actor without building
//   test [--only reverse,size,cost --set-baseline]   the build tests | qa: node Director/tools/qa.mjs <shot|all>
//   style [name] | format [name] [--length 30]   pick a style or format for this video, or list them. format prints the beat sheet
//   clips [<use>]   the best clips for a use from the clip catalog (library/motion/catalog.md), or every use with its top picks
//   queue | hold <any command line>   who is waiting on Unity / keep the turn across several calls
//   csharp apply <staging-dir> | check | lock   the ONLY way C# and shaders reach Assets: lock, snapshot, copy, compile, revert on error (tools/mv/csharp.mjs)
//   generated [check|adopt|regen] | lease take|release|status | refs <name> | snap <image...> | doctor [--fix --all]   see AGENTS.md "Working beside other agents"
//   call <command> '<json>'
// Times: 12:3 (bar:beat), 41.2s, m3 (mark), or plain seconds.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DIRECTOR as ROOT, PROJECT, pickVideo, listVideos, videoInfo, loadScore, loadClock, expand, shotList, findShot } from './tools/mv/score.mjs';
import { lint, printLint } from './tools/mv/lint.mjs';
import { Queue, tickets } from './tools/mv/queue.mjs';
import { parse as parseData } from './tools/mv/jsonc.mjs';
import { runTests, printTests, sizeTest } from './tools/mv/buildtest.mjs';
import { inputs, markBuilt, markFailed, staleReason } from './tools/mv/stamp.mjs';
import { refusal as bakeRefusal, status as bakeStatus, writeReport as writeBakeReport } from './tools/mv/bakegate.mjs';
import { takeUses } from './tools/bake/key.mjs';
import { freeze, thaw, statusText as freezeStatus, buildWarning as freezeBuildWarning } from './tools/mv/freeze.mjs';
import { mixSound, mux } from './tools/mv/sound.mjs';
import { writeShotSpec } from './tools/mv/shotspec.mjs';
import { keep as keepShot, fresh as freshShot, refusal as shotRefusal, line as shotLine } from './tools/mv/shotgate.mjs';
import { run as csharpRun } from './tools/mv/csharp.mjs';
import { run as leaseRun } from './tools/mv/lease.mjs';
import { ensureFresh, run as generatedRun } from './tools/mv/generated.mjs';
import { run as snapRun } from './tools/mv/snap.mjs';
import { run as doctorRun } from './tools/mv/doctor.mjs';
import { printRefs } from './tools/mv/refs.mjs';
import { who as whoAmI } from './tools/mv/who.mjs';

// Commands that never touch the scene, so they don't wait in line.
const FREE = new Set(['make', 'approve', 'coldview', 'unity', 'clips', 'final', 'shotcheck', 'review', 'freeze', 'thaw', 'style', 'format', 'ping', 'status', 'marks', 'render-status', 'render-cancel', 'lint', 'cards', 'why', 'shots', 'new', 'song', 'use', 'videos', 'queue', 'find', 'hold', 'help', 'choreo', 'farm', 'lease', 'snap', 'doctor', 'generated', 'refs', undefined]);
const FRAMES = new Set(['frame', 'sheet', 'shot', 'render', 'previs']); // what can't be trusted on a stale scene
const BOOL = new Set(['allow-stale', 'allow-bake', 'no-review', 'no-critic', 'zerog', 'quiet', 'no-bake', 'stale', 'no-vision', 'final', 'plan', 'force', 'picture-only', 'wait', 'fast', 'strict', 'all', 'quick', 'baseline', 'reindex', 'set-baseline', 'full', 'dry', 'strip', 'static', 'no-song', 'allow-shot', 'probes', 'no-shotcheck', 'drop', 'no-audio', 'no-compile', 'no-regen', 'fix', 'unverified']);

const raw = process.argv.slice(2);
let videoFlag = null;
if (raw[0] === '--video') { videoFlag = raw[1]; raw.splice(0, 2); }
const argv = raw;
const flags = {};
const pos = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--video' && !['find', 'pull', 'hold', 'call'].includes(argv[0])) { videoFlag = argv[++i]; continue; }
  if (a.startsWith('--') && BOOL.has(a.slice(2))) flags[a.slice(2)] = true;
  else if (a.startsWith('--') && !['find', 'pull', 'hold'].includes(argv[0])) flags[a.slice(2)] = argv[++i];
  else pos.push(a);
}
if (['new', 'use', 'videos', 'queue', 'help', 'clips', undefined].includes(argv[0]) && !videoFlag) videoFlag = null;

if (['shotcheck', 'status', 'make', 'approve', 'coldview'].includes(argv[0]) && pos[0] && !videoFlag && listVideos().includes(pos[0])) videoFlag = pos.shift(); // mv shotcheck hawkespunch --from 20 --to 90, mv status hawkespunch
const needsVideo = !['new', 'use', 'videos', 'queue', 'help', 'hold', 'clips', undefined].includes(argv[0]);
const V = needsVideo ? pickVideo(videoFlag) : videoInfo('tkshock');
const queue = new Queue(path.join(ROOT, 'gen'));

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

async function call(cmd, args = {}, timeout = 900000) {
  await waitReady();
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tmp = path.join(ROOT, 'inbox', id + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify({ cmd, video: V.name, ...args }));
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

let clockCache = null;
function clock() {
  if (!clockCache) { const { score } = loadScore(V); clockCache = loadClock(V, score); }
  return clockCache;
}

function seconds(s) {
  const str = String(s).trim();
  return /^-?[0-9.]+$/.test(str) ? parseFloat(str) : clock().T(str, 0);
}

// What this video's style.json and format say about the frame. --aspect 9:16, --w, --h, --fps and --length beat them.
function lookOf() {
  const f = path.join(V.dir, 'style.json'), read = (x) => (fs.existsSync(x) ? parseData(fs.readFileSync(x, 'utf8'), x) : {});
  const own = read(f), { score } = loadScore(V);
  const style = own.inherit ? read(path.join(ROOT, 'library', 'styles', own.inherit + '.json')) : score.style ? read(path.join(ROOT, 'library', 'styles', score.style + '.json')) : {};
  const fname = score.format ?? own.format, fmt = fname ? read(path.join(ROOT, 'library', 'formats', fname + '.json')) : {};
  return { own, style, fmt };
}
function frameSize(w0, h0) {
  const L = lookOf(), even = (x) => 2 * Math.round(x / 2);
  const [a0, a1] = flags.aspect ? flags.aspect.split(':').map(Number) : L.own.aspect ?? L.fmt.aspect ?? [];
  if (flags.w && flags.h) return { w: +flags.w, h: +flags.h };
  if (!a0) return { w: +(flags.w ?? w0), h: +(flags.h ?? h0) };
  const a = a0 / a1, long = Math.max(+(flags.w ?? 0), +(flags.h ?? 0), flags.w || flags.h ? 0 : Math.max(w0, h0));
  return a >= 1 ? { w: even(long), h: even(long / a) } : { w: even(long * a), h: even(long) };
}
/** The frame the renders have, width over height, for the shot checks: the Game view's is whatever its window is. */
const renderAspect = () => { const f = frameSize(1920, 1080); return +(f.w / f.h).toFixed(5); };
const fpsOf = (d) => { const L = lookOf(); return +(flags.fps ?? L.own.fps ?? L.style.fps ?? L.fmt.fps ?? d); };
function endOf() {
  const L = lookOf(), len = +(flags.length ?? L.own.length ?? L.fmt.length ?? 0);
  return len > 0 ? { to: Math.min(clock().duration, (flags.from ? seconds(flags.from) : 0) + len) } : {};
}

function beatAt(t) { const c = clock(); return { song: c.song, beat: c.beatAt(t) }; }

async function compileGate() {
  await call('refresh');
  await waitReady();
  const f = path.join(ROOT, 'compile-errors.txt');
  if (fs.existsSync(f)) throw new Error('Compile errors:\n' + fs.readFileSync(f, 'utf8'));
}

/** A compile for `mv csharp apply`: refresh, see the reload begin, wait for Unity, return the compile errors on disk (file:line message). */
async function compileNow() {
  const errFile = path.join(ROOT, 'compile-errors.txt'), hbFile = path.join(ROOT, 'heartbeat.json');
  try { fs.unlinkSync(errFile); } catch {}
  await call('refresh');
  const end = Date.now() + 20000; let saw = false;
  while (Date.now() < end) {
    let hb = null; try { hb = JSON.parse(fs.readFileSync(hbFile, 'utf8')); } catch {}
    if (!hb || hb.compiling || hb.updating || Date.now() - new Date(hb.utc).getTime() > 3000) { saw = true; break; }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!saw) console.error('note: no compile seen after the refresh (Unity may have compiled these files already); the errors file is read as it is');
  await waitReady();
  await call('ping');
  return fs.existsSync(errFile) ? fs.readFileSync(errFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [];
}

/** Frames of an old scene look fine and are wrong, so these stop and say why. */
function refuseStale() {
  if (flags['allow-stale']) return;
  const r = staleReason(V);
  if (!r) return;
  if (r.unknown) { console.error(`note: ${r.why}. Run mv build once.`); return; }
  throw new Error(`Not rendering: ${r.why}\nRun mv ${fs.existsSync(path.join(V.dir, 'cut.json')) ? 'cards' : 'build'} first (--fast is enough). --allow-stale looks at the old scene anyway.`);
}

/** Bakes every human take the cut uses whose bake is missing, inside the build's own turn (bake.mjs calls mv, which sees MV_TICKET). Returns what it baked. */
function bakeStale() {
  const uses = takeUses(V), stale = uses.filter((u) => !u.baked);
  if (!uses.length) return null;
  if (!stale.length) return [];
  console.error(`baking ${stale.length} stale take use${stale.length > 1 ? 's' : ''} before the build: ${stale.map((u) => `${u.name} ${u.at}`).join(', ')}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'bake.mjs'), '--video', V.name, '--stale'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw new Error('the bake failed, nothing built. --no-bake builds anyway (the takes play from source).');
  return stale.map((u) => `${u.name} ${u.at}`);
}

/** mv final and mv render stop on a failing bake report; --allow-bake goes on. */
function bakeGate() {
  const r = bakeRefusal(V);
  if (!r) return;
  if (r.soft) { console.error(`note: ${r.why}`); return; }
  if (flags['allow-bake']) { console.error(`warning: ${r.why} (--allow-bake)`); return; }
  throw new Error(`Not rendering: ${r.why}.\nmv bake status shows the report; fix the take and mv cards, or --allow-bake to render anyway.`);
}

/** The shot checks over from..to inside a turn already held (no pieces), kept in captures/shotcheck.json. */
async function shotCheckRange(from, to, every = +(flags.every ?? 1 / 15)) {
  let spec = null;
  try { spec = await writeShotSpec(V); } catch (e) { console.error(`note: no shot spec (${e.message.split('\n')[0]}), so mark is off and the subject is person`); }
  const t0 = Date.now();
  await call('motioncheck', { from, to, every, checks: 'shot', budget: 1e9, aspect: renderAspect(), ...(spec ? { spec } : {}), ...(flags.probes ? { probes: true } : {}) });
  const r = keepShot(V, { from, to });
  if (r) r.wall = +((Date.now() - t0) / 1000).toFixed(1);
  return r;
}

/** mv shot and mv render stop on an A shot fault inside what they render; --allow-shot (or --force) goes on. Uses the kept report when it still holds. */
async function shotGate(from, to) {
  if (flags['allow-shot'] || flags.force) return;
  let r = freshShot(V, from, to);
  if (!r) { console.error(`shot check ${from.toFixed(1)}-${to.toFixed(1)} s...`); r = await shotCheckRange(from, to); }
  const why = shotRefusal(r, from, to);
  if (why) throw new Error(`Not rendering: ${why}\ncaptures/motioncheck-report.md has them all; fix the card (or tag it: ecu insert pov dark offmark), or --allow-shot to render anyway.`);
}

/** A render holds its place in the queue until the last frame, so nothing builds under it. */
async function renderAndWait(args, every = 1000) {
  const started = await call('render', args);
  if (started !== 'started') throw new Error('a render is already running: ' + JSON.stringify(started));
  let last = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, every));
    const st = await call('render-status');
    if (!st.running) return st;
    if (Date.now() - last > 30000) { last = Date.now(); console.error(`rendering ${st.frame}/${st.frames}, ${Math.round(st.seconds)} s`); }
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: false, ...opts });
    let out = '', err = '';
    p.stdout?.on('data', (d) => { out += d; }); p.stderr?.on('data', (d) => { err += d; });
    p.on('error', rej);
    p.on('close', (code) => (code ? rej(new Error(`${cmd} ${args[0] ?? ''} failed (${code}): ${err.slice(-800)}`)) : res(out)));
  });
}

function contactSheet(video, sheet, cols, frames) {
  const r0 = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' });
  const dur = parseFloat(r0.stdout) || 1, rows = Math.ceil(frames / cols);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf', `fps=${(frames / dur).toFixed(4)},scale=320:-2,tile=${cols}x${rows}:padding=4`, '-frames:v', '1', '-update', '1', sheet], { encoding: 'utf8' });
  if (r.status) throw new Error(r.stderr);
  return sheet;
}

const print = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 1));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function shots() {
  const { score } = loadScore(V), c = clock(), { shots: s } = expand(score, c);
  return shotList(s, c);
}

async function newVideo(name) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name ?? '')) throw new Error('mv new <name> --song <file>: a lowercase name, letters, digits, - and _');
  if (!flags.song) throw new Error('mv new <name> --song <file>');
  const song = path.resolve(flags.song);
  if (!fs.existsSync(song)) throw new Error('no such song: ' + song);
  const v = videoInfo(name);
  if (listVideos().includes(name)) throw new Error(`there is already a video called ${name}`);
  const ext = path.extname(song).toLowerCase();
  fs.mkdirSync(v.acts, { recursive: true }); fs.mkdirSync(v.shots, { recursive: true }); fs.mkdirSync(v.captures, { recursive: true });
  const audio = path.join(v.dir, 'audio' + ext);
  fs.copyFileSync(song, audio);
  const inUnity = `${v.assets}/Song/audio${ext}`;
  fs.mkdirSync(path.join(PROJECT, path.dirname(inUnity)), { recursive: true });
  fs.copyFileSync(song, path.join(PROJECT, inUnity));
  fs.writeFileSync(v.marks, '[]');
  fs.writeFileSync(v.score, `{
  // ${name}: the whole video as text. acts/*.json are added on top in name order. AGENTS.md has every cue.
  "song": "${inUnity}",
  // The models are shared with every video: this link reads the "models" list of TK Shock's score. Add your own below; yours win.
  "sharedModels": "../../score.json",
  "models": {},
  "stage": { "lights": {
    "key": { "type": "directional", "rot": [50, -30, 0], "intensity": 1.2, "color": "#ffffff", "lint": "always" }
  } },
  // Cuts per bar by section name or kind (DROP, BREAK, section, intro). Going over is a lint error.
  "targets": { "cutsPerBar": {} }
}
`);
  fs.writeFileSync(path.join(v.acts, '01-start.json'), `{
  "actors": {
    "floor": { "model": "prim:plane", "pos": [0, 0, 0], "scale": [4, 1, 4], "color": "#555555", "lint": "always" },
    "person": { "model": "person", "pos": [0, 0, 0] }
  },
  "cues": [
    { "at": 0, "do": "anim", "on": "person", "clip": "IdleBreathe", "blend": 0 },
    { "at": 0, "shot": { "name": "first look", "pos": [0, 1.4, -4], "fov": 35, "look": "person.chest" } }
  ]
}
`);
  console.error(`made ${path.relative(PROJECT, v.dir)}, song in ${inUnity}`);
  await analyzeSong(v, audio);
  const s = JSON.parse(fs.readFileSync(v.song, 'utf8'));
  print({ video: name, dir: v.dir, tempo: s.tempo, duration: s.duration, beats: s.beats.length, sections: s.sections.length, next: `node Director/mv.mjs --video ${name} build` });
}

/** mv song <file>: swaps the song of this video. Cut lengths are in beats and pins in bars, so `mv cards` then reflows every shot; nothing else changes. */
async function swapSong(file) {
  if (!file) throw new Error('mv song <file> [--bpm 90 --offset 0 --quick]');
  const song = path.resolve(file);
  if (!fs.existsSync(song)) throw new Error('no such song: ' + song);
  const v = V, ext = path.extname(song).toLowerCase();
  if (!v.assets || !fs.existsSync(v.score)) throw new Error('mv song works on a video made with mv new');
  const audio = path.join(v.dir, 'audio' + ext), inUnity = `${v.assets}/Song/audio${ext}`;
  fs.copyFileSync(song, audio);
  fs.mkdirSync(path.join(PROJECT, path.dirname(inUnity)), { recursive: true });
  fs.copyFileSync(song, path.join(PROJECT, inUnity));
  const score = fs.readFileSync(v.score, 'utf8');
  fs.writeFileSync(v.score, score.replace(/"song":\s*"[^"]*"/, `"song": "${inUnity}"`));
  await analyzeSong(v, audio);
  const s = JSON.parse(fs.readFileSync(v.song, 'utf8'));
  print({ tempo: s.tempo, duration: s.duration, beats: s.beats.length, next: `node Director/mv.mjs --video ${v.name ?? ''} cards check, then cards` });
}

async function analyzeSong(v, audio) {
  const tools = path.join(ROOT, 'tools');
  const stated = flags.bpm ? ['--bpm', String(flags.bpm), ...(flags.offset !== undefined ? ['--offset', String(flags.offset)] : [])] : [];
  const quick = () => run('uv', ['run', '--python', '3.12', '--with', 'librosa', '--with', 'soundfile', path.join(tools, 'analyze_song.py'), audio, v.song, ...stated]);
  if (flags.quick || stated.length) await quick();
  else {
    try {
      console.error('separating stems with demucs (slow on this laptop, about the song\'s length times 2; --quick skips it)...');
      await run('uv', ['run', '--python', '3.12', '--with', 'demucs', '--with', 'soundfile', '--with', 'torchcodec', '-m', 'demucs', '-n', 'htdemucs', '-o', path.join(v.dir, 'stems'), audio]);
      await run('uv', ['run', '--python', '3.12', '--with', 'librosa', '--with', 'soundfile', '--with', 'matplotlib', path.join(tools, 'analyze_deep.py'), '--dir', v.dir, '--audio', audio]);
    } catch (e) {
      console.error(`deep analysis failed, using the plain pass: ${e.message}`);
      await quick();
    }
  }
}

/** A lab on a person with nothing playing starts in whatever pose the scene left him, and reverse then fails on it, so give him the plain idle and say so. */
function labWithFirstClip(file) {
  let lab; try { lab = parseData(fs.readFileSync(file, 'utf8'), file); } catch { return file; }
  const cues = lab.cues ?? [], time = (c) => { try { return seconds(c.at ?? 0); } catch { return 0; } };
  const first = cues.length ? Math.min(...cues.map(time)) : 0;
  const humans = lab.actors ? Object.entries(lab.actors).filter(([, a]) => /^person/i.test(a.model ?? '')).map(([n]) => n) : /^person/i.test(lab.on ?? 'person') ? [lab.on ?? 'person'] : [];
  const bare = humans.filter((n) => !cues.some((c) => c.on === n && ['anim', 'walk', 'perform'].includes(c.do) && time(c) <= first + 0.001));
  if (!bare.length) return file;
  console.error(`note: no clip at the start for ${bare.join(', ')}: playing IdleBreathe under it. Give a first anim to choose another.`);
  const out = path.join(ROOT, 'gen', `lab_first_${process.pid}.json`);
  fs.writeFileSync(out, JSON.stringify({ ...lab, cues: [...bare.map((n) => ({ at: first, do: 'anim', on: n, clip: 'IdleBreathe', blend: 0 })), ...cues] }));
  process.on('exit', () => { try { fs.unlinkSync(out); } catch {} });
  return out;
}

/** Compares a finished motioncheck with the run before it, or the pinned baseline, and keeps the run. */
function motionRuns(tag) {
  const dir = path.join(V.captures, 'motioncheck-runs'); fs.mkdirSync(dir, { recursive: true });
  const cur = JSON.parse(fs.readFileSync(path.join(V.captures, 'motioncheck.json'), 'utf8'));
  // motioncheck.json and -report.md are always the last run. latest-<tag> keeps each range's own, so one shot can't overwrite the whole cut's reading.
  fs.copyFileSync(path.join(V.captures, 'motioncheck.json'), path.join(dir, `latest-${tag}.json`));
  fs.copyFileSync(path.join(V.captures, 'motioncheck-report.md'), path.join(dir, `latest-${tag}.md`));
  const key = (p) => `${p.check}|${p.actor}|${p.shot}|${p.what}`;
  const pin = path.join(dir, `baseline-${tag}.json`);
  const runs = fs.readdirSync(dir).filter((f) => f.endsWith(`-${tag}.json`) && !f.startsWith('baseline-') && !f.startsWith('latest-')).sort();
  const against = fs.existsSync(pin) ? pin : runs.length ? path.join(dir, runs.at(-1)) : null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slim = { problems: cur.problems, counts: cur.counts, at: stamp };
  fs.writeFileSync(path.join(dir, `${stamp}-${tag}.json`), JSON.stringify(slim));
  if (flags['set-baseline']) fs.writeFileSync(pin, JSON.stringify(slim));
  const res = { problems: cur.problems.length, counts: cur.counts, hidden: cur.hiddenSamples, report: path.join(dir, `latest-${tag}.md`) };
  if (against) {
    const old = JSON.parse(fs.readFileSync(against, 'utf8')).problems;
    const a = new Set(old.map(key)), b = new Set(cur.problems.map(key));
    const fresh = cur.problems.filter((p) => !a.has(key(p)));
    res.comparedWith = path.basename(against); res.fixed = old.filter((p) => !b.has(key(p))).length; res.same = cur.problems.length - fresh.length;
    res.new = fresh.length; res.newWorst = fresh.slice(0, 10).map((p) => `${p.label} ${p.shot}: ${p.actor} ${p.check} ${p.what} ${p.value} ${p.unit}`);
  }
  return res;
}

const cmd = argv[0];
try {
  if (FRAMES.has(cmd)) refuseStale(); // before the queue, so a stale scene doesn't wait in line to be refused
  if (cmd === 'render' || cmd === 'final') bakeGate(); // and the bake gate, for the same reason
  if (cmd === 'csharp' && pos[0] === 'apply') { const h = (await import('./tools/mv/csharp.mjs')).lockHolder(); if (h && !h.stale) throw new Error(`compile.lock is held by ${h.who} since ${h.since}${h.alive ? ' (alive)' : ''}: not waiting in the Unity queue for a lock we can't take. Try again when it is free (mv csharp lock), or mv csharp lock break if it is dead.`); }
  if (!FREE.has(cmd) && !(cmd === 'bake' && pos[0] === 'status') && !(cmd === 'csharp' && pos[0] !== 'apply')) {
    const waited = await queue.enter(`${cmd} ${V.name}`, (place, who) => console.error(`waiting for Unity: ${place} ahead, now "${who}"`));
    if (waited > 3000) console.error(`waited ${Math.round(waited / 1000)} s for Unity`);
    if (FRAMES.has(cmd) && waited > 1000) refuseStale(); // and again: it may have changed while waiting
  }
  switch (cmd) {
    case 'ping': case 'open': case 'pause': case 'marks': case 'marks-clear': case 'refresh': case 'setup':
      print(await call(cmd)); break;
    case 'unity': print(await call('status')); break; // the editor's own status; mv status is the pipeline's stage table
    case 'make': case 'status': case 'approve': case 'coldview': {
      // The one-command pipeline, tools/mv/make.mjs. It calls mv for every Unity step, so each step takes its own turn in the queue.
      const list = [path.join(ROOT, 'tools', 'mv', 'make.mjs'), cmd, '--video', V.name, ...pos];
      for (const [k, v] of Object.entries(flags)) list.push('--' + k, ...(v === true ? [] : [String(v)]));
      const r = spawnSync(process.execPath, list, { stdio: 'inherit', env: process.env });
      process.exitCode = r.status ?? 1;
      break;
    }
    case 'lint': {
      const r = lint(V, { strict: flags.strict, all: flags.all, reindex: flags.reindex, writeBaseline: flags.baseline });
      printLint(r, { limit: flags.limit === '0' ? Infinity : +(flags.limit ?? 60) });
      if (flags.baseline) console.log(`${r.total} findings accepted in ${path.relative(ROOT, path.join(V.dir, 'lint-baseline.json'))}`);
      if (r.failed && !flags.baseline) process.exitCode = 1;
      break;
    }
    case 'cards': case 'why': {
      // Shot cards, tools/cards.mjs. Only plain `mv cards` goes on to build, and it waits for Unity there.
      if (cmd === 'cards' && (pos[0] === 'insert' || pos[0] === 'remove')) {
        // The clock: no Unity. A video name may come before <at>, as in the docs.
        const rest = pos.slice(1), list = [path.join(ROOT, 'tools', 'mv', 'clockshift.mjs'), pos[0], ...(rest.length === 3 ? [rest.shift()] : ['--video', V.name]), ...rest];
        for (const k of ['dry', 'drop', 'no-audio', 'no-compile']) if (flags[k]) list.push('--' + k);
        if (flags.accept) list.push('--accept', flags.accept);
        const r = spawnSync(process.execPath, list, { stdio: 'inherit' });
        if (r.status) process.exitCode = r.status;
        break;
      }
      if (cmd === 'cards' && pos[0] === 'sheet') {
        refuseStale();
        const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'mv', 'cardframes.mjs'), V.name, ...argv.slice(2).filter((a) => a !== '--allow-stale')], { stdio: 'inherit' });
        if (r.status !== 0) process.exitCode = 1;
        break;
      }
      const sub = cmd === 'why' ? 'why' : ['check', 'compile', 'note'].includes(pos[0]) ? pos[0] : null;
      const rest = cmd === 'why' ? pos : sub ? pos.slice(1) : pos;
      const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'cards.mjs'), sub ?? 'compile', V.dir, ...rest, ...(flags.take ? ['--take', flags.take] : [])], { stdio: 'inherit' });
      if (r.status !== 0) { if (!sub || sub === 'compile') markFailed(V, 'the cards did not compile'); process.exitCode = 1; break; }
      if (sub) break;
      await queue.enter(`cards ${V.name}`, (place, who) => console.error(`waiting for Unity: ${place} ahead, now "${who}"`));
    } // falls through to build
    case 'build': {
      const before = inputs(V); // read before the build starts: an edit made during it must still read as stale
      let res;
      try {
        // Generated acts first: stale ones are made again (or the build stops: "stale: run X"), hand edits are shouted about. tools/mv/generated.mjs
        const g = ensureFresh(V.dir, { regenerate: !flags['no-regen'] });
        if (g.regenerated.length) console.error(`regenerated: ${g.regenerated.join(', ')}`);
        const r = lint(V, { strict: flags.strict });
        if (r.items.length) printLint(r, { limit: 40 });
        if (r.failed) throw new Error('lint failed, nothing built. Fix the above. Findings you mean to keep: mv lint --baseline');
        await compileGate();
        const fw = freezeBuildWarning(V); if (fw) console.error(fw);
        var baked = flags['no-bake'] ? null : bakeStale();
        res = await call('build', flags.fast !== undefined ? { fast: true, full: !!flags.full } : {});
      } catch (e) { markFailed(V, e.message ?? e); throw e; }
      markBuilt(V, before);
      print(res);
      if (baked !== null) { const g = writeBakeReport(V, { baked, by: `build${baked.length ? '' : ' (nothing stale)'}` }); console.error(`bake gate: ${g.pass ? 'PASS' : 'FAIL'}${g.failures.length ? ', mv bake status says why' : ''} (${path.relative(ROOT, path.join(V.dir, 'bake-report.json')).replace(/\\/g, '/')})`); }
      if (flags.fast === undefined) { const t = sizeTest(V); if (!t.ok) { console.error('size test: ' + t.problems.join('; ')); process.exitCode = 1; } }
      if (cmd === 'cards' && !flags['no-shotcheck']) { // Unity is ours already: the shot checks over the whole cut, one line
        try { let end = clock().duration; try { end = Math.min(end, Math.max(...JSON.parse(fs.readFileSync(path.join(V.dir, 'cards.map.json'), 'utf8')).map((x) => x.tEnd))); } catch {} const sr = await shotCheckRange(0, end, 0.2); /* 5 Hz here, so a build stays quick: gesture is coarser than mv shotcheck's 15 Hz */ console.error(shotLine(sr) + (sr?.wall ? ` (${sr.wall} s)` : '')); } catch (e) { console.error(`shot check: not run (${String(e.message ?? e).split('\n')[0]})`); }
      }
      break;
    }
    case 'test': {
      const report = await runTests({ call, V, duration: clock().duration, only: flags.only, setBaseline: flags['set-baseline'] });
      printTests(report);
      if (!report.ok) process.exitCode = 1;
      break;
    }
    case 'render-status': case 'render-cancel':
      print(await call(cmd)); break;
    case 'seek': case 'play':
      print(await call(cmd, pos[0] ? { t: seconds(pos[0]) } : {})); break;
    case 'frame': {
      print(await call('capture', { t: pos.map(seconds), ...frameSize(960, 540) })); break;
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
      const files = await call('capture', { t: ts, ...frameSize(480, 270) });
      const list = path.join(V.captures, 'list.txt');
      fs.writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, '/')}'\nduration 1`).join('\n'));
      const out = path.join(V.captures, 'sheet.png');
      const rows = Math.ceil(files.length / cols);
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `tile=${cols}x${rows}:padding=4`, '-frames:v', '1', out], { encoding: 'utf8' });
      if (r.status) throw new Error(r.stderr);
      print({ sheet: out, frames: files.length }); break;
    }
    case 'shots': {
      const list = shots();
      if (flags.json) { print(list); break; }
      console.log(' #   bar:beat  time    len s  beats  name');
      for (const s of list) console.log(`${String(s.n).padStart(3)}  ${s.at.padEnd(8)} ${s.t.toFixed(2).padStart(7)} ${s.len.toFixed(2).padStart(6)} ${s.beats.toFixed(1).padStart(6)}  ${s.name}`);
      break;
    }
    case 'shot': {
      // A rough cut of one shot with its sound: fast, with a handle each side, and a sheet to read.
      const s = findShot(shots(), pos[0]), c = clock(), handle = +(flags.handle ?? 1);
      const from = Math.max(0, s.t - handle), to = Math.min(c.duration, s.end + handle);
      fs.mkdirSync(V.shots, { recursive: true });
      await shotGate(s.t, s.end);
      const base = path.join(V.shots, `${String(s.n).padStart(3, '0')}-${slug(s.name)}`), t0 = Date.now(), fps = fpsOf(30);
      // Picture from Unity, sound and the mux here: Transport.cs muxes with -shortest, which dropped a shot's last 2 frames (PIPELINE-LOG).
      const pic = base + '.pic.mp4', wav = base + '.wav';
      await renderAndWait({ from, to, ...frameSize(640, 360), fps, quality: flags.final ? 'final' : 'draft', out: pic, pictureOnly: true }, 250);
      const ff = async (...a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { encoding: 'utf8' }); if (r.status) throw new Error('ffmpeg: ' + r.stderr.slice(-600)); };
      const frames = +(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', pic], { encoding: 'utf8' }).stdout.trim() || 0);
      await mixSound(V, loadScore(V).score, { from, to, wav, ffmpeg: ff });
      await mux(pic, wav, base + '.mp4', { seconds: frames / fps, ffmpeg: ff });
      for (const f of [pic, wav]) { try { fs.unlinkSync(f); } catch {} }
      const secs = (Date.now() - t0) / 1000, cols = +(flags.cols ?? 6);
      const sheet = contactSheet(base + '.mp4', base + '.png', cols, Math.min(24, Math.max(cols, Math.round(to - from) * 3)));
      const wanted = Math.round((to - from) * fps);
      if (Math.abs(frames - wanted) > 1) console.error(`warning: ${frames} frames in the shot, ${wanted} expected`);
      print({ shot: s.n, name: s.name, bar: s.at, from: +from.toFixed(3), to: +to.toFixed(3), video: base + '.mp4', sheet, frames, renderSeconds: +secs.toFixed(1) });
      break;
    }
    case 'previs': {
      const out = path.join(ROOT, 'videos', V.name, 'previs.mp4'), t0 = Date.now();
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await renderAndWait({ ...frameSize(426, 240), fps: +(flags.fps ?? 12), quality: 'previs', out, ...endOf(), ...(flags.from ? { from: seconds(flags.from) } : {}), ...(flags.to ? { to: seconds(flags.to) } : {}) });
      // Previs plays the baked takes: the build picks a bake by key when it exists (MVBake.cs), whatever the quality. Say so, and name any take that played from source.
      let takes = null;
      try { const uses = takeUses(V); takes = { baked: uses.filter((u) => u.baked).length, source: uses.filter((u) => !u.baked).map((u) => `${u.name} at ${u.at}`) }; } catch {}
      if (takes?.source.length) console.error(`warning: ${takes.source.length} take${takes.source.length > 1 ? 's' : ''} played from source, not baked: ${takes.source.join(', ')}. mv bake, then previs again, before judging the motion.`);
      print({ video: out, minutes: +((Date.now() - t0) / 60000).toFixed(1), takes });
      break;
    }
    case 'motion': {
      // mv motion <from> <to> [--every 2 --on person --view side|front|back|top --cols 8 --file motion.png]
      const m = { from: seconds(pos[0]), to: seconds(pos[1]), every: +(flags.every ?? 2), on: flags.on ?? 'person', view: flags.view ?? 'side' };
      if (flags.cols) m.cols = +flags.cols;
      if (flags.file ?? flags.sheet) m.file = flags.file ?? flags.sheet;
      print(await call('motion', m)); break;
    }
    case 'motioncheck': {
      // Runs in pieces, each with its own turn in the queue, so a long check doesn't stop anyone else.
      let f0 = pos[0], t1 = pos[1], tag = 'all';
      if (flags.shot) { const s = findShot(shots(), flags.shot); f0 = s.t; t1 = s.end; tag = `shot-${s.n}`; console.error(`shot ${s.n} "${s.name}"`); }
      const shotOnly = /^\s*shot\s*$/.test(flags.checks ?? '');
      const to = seconds(t1 ?? clock().duration), budget = +(flags.budget ?? 60), every = +(flags.every ?? (shotOnly ? 1 / 15 : 0.1)), parts = [];
      if (pos[0] && !flags.shot) tag = `${seconds(f0).toFixed(0)}-${to.toFixed(0)}`;
      let from = seconds(f0 ?? 0), i = 0;
      const a = { to, every, budget };
      if (flags.on) { a.on = flags.on; tag += '-' + slug(flags.on); }
      if (flags.checks) { a.checks = flags.checks; tag += '-' + slug(flags.checks); }
      if (flags.probes) a.probes = true;
      a.aspect = renderAspect();
      const shotsToo = !flags.checks || /shot/.test(flags.checks), start = from;
      if (shotsToo) { try { const spec = await writeShotSpec(V); if (spec) a.spec = spec; } catch (e) { console.error(`note: no shot spec (${e.message.split('\n')[0]}), so mark is off and the subject is person`); } }
      while (from >= 0) {
        const r = await call('motioncheck', { ...a, from, part: process.pid + '-' + String(i++).padStart(3, '0') });
        queue.leave();
        parts.push(r.path);
        console.error(`${from.toFixed(1)}s: ${r.frames} frames, ${r.seconds}s (${r.ms}), ${r.ranges} ranges${r.sceneDirtied ? ', SCENE DIRTIED' : ''}`);
        from = r.next;
        if (from >= 0) await queue.enter(`motioncheck ${V.name}`);
      }
      await queue.enter(`motioncheck ${V.name}`);
      const merged = await call('motioncheck', { merge: parts });
      for (const f of parts) fs.unlinkSync(f);
      const runs = motionRuns(tag);
      if (shotsToo) { const sr = keepShot(V, { from: start, to }); runs.shots = shotLine(sr); }
      print(runs);
      break;
    }
    case 'shotcheck': {
      // mv shotcheck [<video>] [--from --to | --shot n]: motioncheck --checks shot, in pieces with their own queue turns.
      const f0 = flags.from ?? pos[0], t1 = flags.to ?? pos[1];
      const args = [path.join(ROOT, 'mv.mjs'), '--video', V.name, 'motioncheck', ...(flags.shot ? ['--shot', flags.shot] : [f0 ?? 0, ...(t1 ? [t1] : [])]), '--checks', 'shot', ...(flags.every ? ['--every', flags.every] : []), ...(flags.probes ? ['--probes'] : []), ...(flags.budget ? ['--budget', flags.budget] : []), ...(flags.on ? ['--on', flags.on] : [])];
      queue.leave();
      const r = spawnSync(process.execPath, args.map(String), { stdio: 'inherit', env: process.env });
      if (r.status) process.exitCode = r.status;
      break;
    }
    case 'lab': {
      // mv lab <file.json>: plays cues on a throwaway copy of an actor, no build needed. See AGENTS.md.
      const m = { path: labWithFirstClip(path.resolve(pos[0])) };
      for (const k of ['every', 'cols', 'from', 'to']) if (flags[k]) m[k] = +flags[k];
      if (flags.view) m.view = flags.view;
      if (flags.sheet ?? flags.file) m.sheet = flags.sheet ?? flags.file;
      print(await call('lab', m)); break;
    }
    case 'render': {
      const a = { ...frameSize(1920, 1080), fps: fpsOf(30), ...endOf() };
      if (flags.from) a.from = seconds(flags.from);
      if (flags.to) a.to = seconds(flags.to);
      await shotGate(a.from ?? 0, a.to ?? clock().duration);
      if (flags.out) a.out = flags.out;
      if (flags['picture-only']) a.pictureOnly = true;
      await renderAndWait(a, +(flags.poll ?? 3000));
      print('rendered');
      break;
    }
    case 'bake': {
      // mv bake status | mv bake [take...] [--stale]: status reads the report; the rest bakes under this turn in the queue.
      if (pos[0] === 'status') { console.log(bakeStatus(V)); break; }
      const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'bake.mjs'), '--video', V.name, ...(pos.length ? pos : ['--stale'])], { stdio: 'inherit', env: process.env });
      if (r.status !== 0) process.exitCode = 1;
      break;
    }
    case 'critic': {
      // mv critic [<video>] [from to] [--on person,other --label x --zerog --fps 30 --force]: the motion critic on the built scene's bone dumps (tools/critic.mjs cut), no render.
      // Under this turn in the queue: critic.mjs's `call shotbones` sees MV_TICKET.
      const rest = [...pos], vid = rest[0] && listVideos().includes(rest[0]) ? rest.shift() : V.name;
      const list = [path.join(ROOT, 'tools', 'critic.mjs'), 'cut', vid, ...rest.slice(0, 2), ...(flags.on ? ['--on', flags.on] : []), ...(flags.label ? ['--label', flags.label] : []), ...(flags.zerog ? ['--zerog'] : []), ...(flags.fps ? ['--fps', flags.fps] : []), ...(flags.force ? ['--force'] : []), ...(flags.quiet ? ['--quiet'] : [])];
      // async, as `hold` does: a spawnSync would stop this ticket's heartbeat and the queue would drop it after 2 minutes, leaving every chunk to queue alone
      await new Promise((res, rej) => { const p = spawn(process.execPath, list.map(String), { stdio: 'inherit', env: process.env }); p.on('error', rej); p.on('close', (c) => { if (c) process.exitCode = c; res(); }); });
      break;
    }
    case 'review': {
      // mv review [<video>] [render.mp4]: tools/review.mjs. A video name first is allowed, as in the docs.
      const rest = [...pos], vid = rest[0] && listVideos().includes(rest[0]) ? rest.shift() : V.name;
      const list = [path.join(ROOT, 'tools', 'review.mjs'), vid, ...rest, ...(flags.label ? ['--label', flags.label] : []), ...(flags.model ? ['--model', flags.model] : []), ...(flags['no-vision'] ? ['--no-vision'] : []), ...(flags.force ? ['--force'] : []), ...(flags.plan ? ['--plan'] : []), ...(flags.jobs ? ['--jobs', flags.jobs] : [])];
      const r = spawnSync(process.execPath, list, { stdio: 'inherit' });
      if (r.status) process.exitCode = r.status;
      break;
    }
    case 'freeze': {
      if (pos[0] === 'status') { console.log(freezeStatus(V)); break; }
      const f = freeze(V, flags.note);
      console.log(`${V.name} frozen: engine ${f.engine}, model ${f.model}, C# ${f.code}. From now on an engine or model change makes mv final --plan warn in red (every shot would re-render) and mv cards warn on a C# change. mv thaw lifts it.`);
      break;
    }
    case 'thaw': {
      const was = thaw(V);
      console.log(was ? `${V.name} thawed (was frozen ${was.at}).` : `${V.name} was not frozen.`);
      break;
    }
    case 'final': {
      // Its own turn in the queue: one ticket from the build to the last frame.
      const size = frameSize(1920, 1080), end = endOf();
      const list = [path.join(ROOT, 'tools', 'final.mjs'), V.name, '--w', size.w, '--h', size.h, '--fps', fpsOf(30), ...(flags.to ? ['--to', flags.to] : end.to ? ['--to', end.to] : []),
        ...(flags.name ? ['--name', flags.name] : []), ...(flags.plan ? ['--plan'] : []), ...(flags.force ? ['--force'] : []), ...(flags['allow-bake'] ? ['--allow-bake'] : []), ...(flags['allow-shot'] ? ['--allow-shot'] : []), ...(flags['no-review'] ? ['--no-review'] : []), ...(flags['no-critic'] ? ['--no-critic'] : [])];
      const r = spawnSync(process.execPath, list.map(String), { stdio: 'inherit' });
      if (r.status) process.exitCode = r.status;
      break;
    }
    case 'find': {
      const r = spawnSync('py', [path.join(ROOT, 'tools', 'assets.py'), 'find', ...argv.slice(1)], { encoding: 'utf8' });
      process.stdout.write(r.stdout + r.stderr); break;
    }
    case 'pull': {
      const out = await run('py', [path.join(ROOT, 'tools', 'assets.py'), 'pull', ...argv.slice(1)], { quiet: true, maxBuffer: 1 << 26 });
      process.stdout.write(out);
      await compileGate();
      const info = JSON.parse(out);
      print(await call('fixmats', { roots: info.roots })); break;
    }
    case 'call':
      print(await call(argv[1], argv[2] ? JSON.parse(argv[2]) : {})); break;
    case 'style': case 'format': {
      // mv style neon-noir swaps the one line in this video's style.json. No shot is touched.
      const kind = cmd === 'style' ? 'styles' : 'formats', key = cmd === 'style' ? 'inherit' : 'format', dir = path.join(ROOT, 'library', kind);
      const names = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
      if (!pos[0]) {
        for (const n of names) console.log(`${n.padEnd(22)} ${parseData(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'), n).about ?? ''}`);
        break;
      }
      if (!names.includes(pos[0])) throw new Error(`no ${cmd} ${pos[0]}. Have: ${names.join(', ')}`);
      const f = path.join(V.dir, 'style.json');
      let t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '{\n}\n';
      const re = new RegExp(`"${key}"\\s*:\\s*"[^"]*"`);
      t = re.test(t) ? t.replace(re, `"${key}": "${pos[0]}"`) : t.replace('{', `{\n  "${key}": "${pos[0]}",`).replace(/,(\s*)}/, '$1}');
      fs.writeFileSync(f, t);
      if (cmd === 'format') {
        const F = parseData(fs.readFileSync(path.join(dir, pos[0] + '.json'), 'utf8'), pos[0]), total = +(flags.length ?? F.length ?? clock().duration);
        console.log(`${pos[0]}: ${F.aspect.join(':')}, ${F.fps} fps, ${total.toFixed(1)} s, average shot ${F.pacing.avgSeconds.join('-')} s, longest ${F.pacing.maxSeconds} s`);
        const sum = F.beats.reduce((a, b) => a + (b.seconds ?? b.share * total), 0);
        let t0 = 0;
        for (const b of F.beats) { const d = (b.seconds ?? b.share * total) * total / sum; console.log(`${t0.toFixed(1).padStart(6)} s ${d.toFixed(1).padStart(5)} s  ${b.part.padEnd(16)} ${b.job}`); t0 += d; }
      } else console.log(`${V.name}: style ${pos[0]}. Next: mv cards, or mv build`);
      break;
    }
    case 'new': await newVideo(pos[0]); break;
    case 'song': await swapSong(pos[0]); break;
    case 'use': {
      if (!listVideos().includes(pos[0])) throw new Error(`no video ${pos[0]}. Have: ${listVideos().join(', ')}`);
      fs.writeFileSync(path.join(ROOT, 'current-video'), pos[0]); print(`current video: ${pos[0]}`); break;
    }
    case 'videos': {
      let cur = 'tkshock'; try { cur = fs.readFileSync(path.join(ROOT, 'current-video'), 'utf8').trim() || cur; } catch {}
      for (const n of listVideos()) console.log(`${n === cur ? '*' : ' '} ${n}  ${path.relative(PROJECT, videoInfo(n).dir).replace(/\\/g, '/')}  ${videoInfo(n).scene}`);
      break;
    }
    case 'clips': {
      // mv clips <use>: the clip catalog's best clips for a use, best first (tools/mv/clipcat.mjs). No Unity.
      const { catalog, bestFor } = await import('./tools/mv/clipcat.mjs');
      const cat = catalog(); if (!cat) throw new Error('no clip catalog yet: node Director/tools/clip_catalog.mjs build');
      if (!pos[0]) { for (const [t, list] of Object.entries(cat.tags).sort()) console.log(`${t.padEnd(11)} ${list.slice(0, 5).join(', ')}`); console.log('mv clips <use> for verdicts. library/motion/catalog.html shows the previews.'); break; }
      const r = bestFor(pos[0]);
      if (!r.rows.length) throw new Error(`no clips tagged "${pos[0]}". Uses: ${r.known.join(' ')}`);
      for (const e of r.rows) console.log(`${e.grade.padEnd(2)} ${e.clip.padEnd(26)} ${e.line}${e.weak?.length ? `  [weak: ${e.weak.join(', ')}]` : ''}${e.needs?.length ? `  [needs: ${e.needs.join(', ')}]` : ''}${e.hitT != null ? `  [hit ${e.hitT} s]` : ''}`);
      console.log(`previews: Director/library/motion/previews/<clip>.mp4, all of them: Director/library/motion/catalog.html`);
      break;
    }
    case 'farm': {
      // The cloud render farm's coordinator (Director/docs/render-farm.md): plan is free; sync, render and previs spend and need FARM_OK=1.
      const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'farm.mjs'), V.name, ...argv.slice(1)], { stdio: 'inherit' });
      if (r.status) process.exitCode = r.status;
      break;
    }
    case 'queue': {
      const q = tickets(path.join(ROOT, 'gen', 'queue'));
      if (!q.length) console.log('Unity is free');
      q.forEach((t, i) => console.log(`${i ? `${i}. waiting` : 'running  '} ${t.label}  (pid ${t.pid}, since ${t.since})`));
      break;
    }
    case 'choreo': {
      // mv choreo build|play|check|segments|test: a dance take as phrases on the beat grid. Director/docs/choreography.md. Unity work goes through mv lab and bake.mjs, which queue themselves.
      await (await import('./tools/mv/choreo.mjs')).run(pos, flags, V); break;
    }
    case 'csharp': {
      // The only way C# and shaders reach Assets: tools/mv/csharp.mjs. `apply` holds the queue (it compiles); check and lock don't.
      const r = await csharpRun(pos, flags, { who: whoAmI(flags.who), dry: flags.dry, compile: compileNow });
      if (r && !r.ok) {
        console.error(`\nNOT APPLIED. Assets is ${r.restoredClean ? 'back on the previous code and compiles' : 'restored but STILL does not compile: someone else broke it, see mv doctor'}. The errors (file:line):`);
        for (const e of r.errors) console.error('  ' + e.replace(/\\/g, '/'));
        console.error(`Fix them in the staging dir and apply again. Snapshot: ${r.snapshot}`);
        process.exitCode = 1;
      } else if (r?.applied?.length) console.log(`applied and compiled: ${r.applied.join(', ')}`);
      break;
    }
    case 'lease': leaseRun(pos, flags); break;
    case 'snap': snapRun(pos); break;
    case 'doctor': doctorRun(pos, flags, V); break;
    case 'generated': generatedRun(pos, flags, V); break;
    case 'refs': { if (!pos[0]) throw new Error('mv refs <name>   who names this card, actor, mark, clip, bed or file'); printRefs(V, pos[0]); break; }
    case 'hold': {
      // mv hold <command line>: runs it holding Unity, so several mv calls inside stay together. They see MV_TICKET and don't queue again.
      if (!argv[1]) throw new Error('mv hold <command...>   e.g. mv hold node Director/tools/reverse_test.mjs');
      await queue.enter(`hold ${argv.slice(1).join(' ').slice(0, 60)}`, (place, who) => console.error(`waiting for Unity: ${place} ahead, now "${who}"`));
      await new Promise((res, rej) => {
        const p = spawn(argv[1], argv.slice(2), { stdio: 'inherit', env: process.env, shell: true });
        p.on('error', rej); p.on('close', (c) => { process.exitCode = c ?? 1; res(); });
      });
      break;
    }
    default:
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).join('\n'));
  }
} catch (e) { console.error(String(e.message ?? e)); process.exitCode = 1; }
finally { queue.leave(); }
