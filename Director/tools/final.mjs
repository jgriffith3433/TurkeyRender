#!/usr/bin/env node
// The final render, shot by shot. A shot whose hash hasn't changed comes from its saved render, and only the rest go through Unity.
// What a shot depends on is in tools/mv/shotdeps.mjs. Run it through `mv final`; the Room's Final render button does the same.
//   node Director/mv.mjs --video <name> final [--w 1280 --h 720 --fps 30] [--force] [--plan] [--name v3]
//     --plan     says what it would reuse and render, and why, and how many review verdicts carry; compiles the cards in memory and changes nothing
//     --force    renders every shot again, for a truth to compare with
//     --allow-bake   renders although the bake report fails library/bake-gate.json (mv bake status)
//     --allow-shot   renders although the shot checks (mv shotcheck: frame, mark, readable, camin, propat, gesture) find an A fault in the cut
//     --no-review    skips the 30 fps review (tools/review.mjs) that runs on the finished file and prints its A faults
// Saved renders: videos/<v>/final/<w>x<h>-<fps>/<shot>-<hash>.mp4 with a .json beside each. Report: final/report.md and report.json.
// Picture joins without re-encoding. Sound isn't joined at all: the song and every sfx are mixed once over the whole video, so a seam has no sound of its own.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, pickVideo } from './mv/score.mjs';
import { Queue } from './mv/queue.mjs';
import { engineHash, hashOf, planShots } from './mv/shotdeps.mjs';
import { refusal as bakeRefusal } from './mv/bakegate.mjs';
import { fresh as freshShot, refusal as shotRefusal } from './mv/shotgate.mjs';
import { finalWarning } from './mv/freeze.mjs';
import { mixSound as mixSoundRange } from './mv/sound.mjs';
import { forecast as reviewForecast, writeSegments } from './mv/verdicts.mjs';

const KEEP_PER_SHOT = 6;
const args = process.argv.slice(2);
const has = (k) => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };
const val = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args.splice(i, 2)[1]; };
const planJson = has('plan-json'); // the plan as JSON on stdout and nothing else: tools/farm.mjs and the farm worker (Director/farm/unity/Farm.cs) read it
const force = has('force'), planOnly = has('plan') || planJson, allowBake = has('allow-bake'), allowShot = has('allow-shot'), noReview = has('no-review'), noCritic = has('no-critic');
const w = +val('w', 1920), h = +val('h', 1080), fps = +val('fps', 30), toArg = val('to'), nameArg = val('name');
const V = pickVideo(args[0]);
const MV = path.join(DIRECTOR, 'mv.mjs'), FINAL = path.join(DIRECTOR, 'videos', V.name, 'final');
const CACHE = path.join(FINAL, `${w}x${h}-${fps}`);
const quality = 'final';
const mkdir = (d) => (fs.mkdirSync(d, { recursive: true }), d);
const say = (m) => console.error(m);
const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const write = (f, x) => { const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 1)); fs.renameSync(t, f); };
const clockText = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// Never spawnSync: it would stop the queue ticket's heartbeat, and a ticket silent for 2 minutes is dropped.
function run(cmd, list) {
  return new Promise((res) => {
    const p = spawn(cmd, list, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => res({ ok: false, out, err: String(e), status: -1 }));
    p.on('close', (code) => res({ ok: code === 0, out, err, status: code }));
  });
}
const mv = (...list) => run(process.execPath, [MV, '--video', V.name, ...list.map(String)]);
const ffmpeg = async (...list) => { const r = await run('ffmpeg', ['-y', '-loglevel', 'error', ...list]); if (!r.ok) throw new Error('ffmpeg: ' + r.err.slice(-600)); };

/** What the file really holds. */
async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-of', 'json', file]);
  try {
    const s = JSON.parse(r.out).streams[0], [a, b] = s.r_frame_rate.split('/').map(Number);
    return { w: s.width, h: s.height, fps: a / (b || 1), frames: +s.nb_read_packets };
  } catch { return null; }
}
const fits = async (file, s) => {
  const p = fs.existsSync(file) ? await probe(file) : null;
  return !!p && p.w === w && p.h === h && Math.abs(p.fps - fps) < 0.001 && p.frames === s.f1 - s.f0;
};

const fileOf = (s) => path.join(CACHE, `${s.id}-${s.hash}.mp4`);
const sidecar = (f) => f.replace(/\.mp4$/, '.json');

/** The saved renders of a shot, newest first. */
function savedOf(id) {
  let names = [];
  try { names = fs.readdirSync(CACHE); } catch {}
  const re = new RegExp(`^${id}-[0-9a-f]{16}\\.json$`);
  return names.filter((n) => re.test(n)).map((n) => ({ file: path.join(CACHE, n), side: read(path.join(CACHE, n)) })).filter((x) => x.side).sort((a, b) => (b.side.rendered ?? '').localeCompare(a.side.rendered ?? ''));
}

function whyChanged(s) {
  const last = savedOf(s.id)[0]?.side;
  if (!last) return 'no saved render';
  const keys = [...new Set([...Object.keys(last.parts), ...Object.keys(s.parts)])].filter((k) => last.parts[k] !== s.parts[k]);
  if (!keys.length) return 'saved render was damaged or missing';
  if (keys.includes('engine')) return 'the engine changed';
  if (keys.includes('frames')) return `its frames moved (${last.parts.frames} to ${s.parts.frames})`;
  // A render saved before the key covered clips and asset files (2026-11-07): every such shot renders once, then reuse goes on as before.
  const widened = (k) => /^(clip|files) /.test(k) && !(k in last.parts);
  if (!Object.keys(last.parts).some((k) => /^(clip|files) /.test(k)) && keys.every((k) => widened(k) || k === 'engine')) return 'saved before the shot key covered clips and asset files: renders once';
  const named = keys.map((k) => k.replace(/^actor /, '').replace(/^grade\./, 'grade ').replace(/^files (.*)$/, '$1 (its files)')).slice(0, 5);
  return `changed: ${named.join(', ')}${keys.length > 5 ? ` and ${keys.length - 5} more` : ''}`;
}

async function plan({ acts } = {}) {
  const p = planShots(V, { fps, w, h, quality, to: toArg ? +toArg : undefined, acts });
  for (const s of p.shots) {
    s.reuse = !force && await fits(fileOf(s), s);
    s.why = s.reuse ? 'unchanged' : force ? 'forced' : whyChanged(s);
  }
  return p;
}

const scoreStamp = (p) => hashOf([p.score.cues, p.score.actors, p.score.models]);

const started = new Date().toISOString();
const progress = (x) => { try { write(path.join(FINAL, 'progress.json'), { ...x, started, pid: process.pid, updated: new Date().toISOString() }); } catch {} };


// ---------- render one shot ----------

async function waitForUnity() {
  for (let i = 0; i < 90; i++) {
    if ((await mv('ping')).ok) return true;
    await new Promise((r) => setTimeout(r, 10000));
  }
  return false;
}

async function renderShot(s) {
  const out = fileOf(s), tmp = path.join(CACHE, `${s.id}.part.mp4`);
  const from = s.f0 / fps, to = (s.f1 - 0.25) / fps; // Unity takes the frames from `from` up to `to`, rounded up: exactly these
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await mv('render', '--from', from.toFixed(6), '--to', to.toFixed(6), '--w', w, '--h', h, '--fps', fps, '--out', tmp, '--poll', 250, '--picture-only', '--allow-stale', '--allow-shot');
    if (await fits(tmp, s)) {
      fs.renameSync(tmp, out);
      write(sidecar(out), { id: s.id, hash: s.hash, w, h, fps, f0: s.f0, f1: s.f1, parts: s.parts, rendered: new Date().toISOString() });
      return;
    }
    say(`  ${s.id}: try ${attempt} didn't give ${s.f1 - s.f0} frames (${JSON.stringify(fs.existsSync(tmp) ? await probe(tmp) : null)}). ${(r.err || r.out).slice(-200)}`);
    if (!(await waitForUnity())) throw new Error('Unity did not come back');
  }
  throw new Error(`shot ${s.id} failed 3 times`);
}

function prune() {
  const byShot = new Map();
  for (const n of fs.readdirSync(CACHE).filter((x) => x.endsWith('.json'))) {
    const side = read(path.join(CACHE, n));
    if (!side?.id) continue;
    if (!byShot.has(side.id)) byShot.set(side.id, []);
    byShot.get(side.id).push({ n, at: side.rendered ?? '' });
  }
  for (const list of byShot.values()) {
    list.sort((a, b) => b.at.localeCompare(a.at));
    for (const x of list.slice(KEEP_PER_SHOT)) {
      for (const f of [x.n, x.n.replace(/\.json$/, '.mp4')]) { try { fs.unlinkSync(path.join(CACHE, f)); } catch {} }
    }
  }
}

// ---------- stitch ----------

/** Song and sfx, one pass over the whole video, the mix Transport.cs makes for a single render. */
const mixSound = (p, wav) => mixSoundRange(V, p.score, { from: 0, to: p.total / fps, wav, ffmpeg });

/** The join, checked: every frame there, evenly spaced, and no sample jumping at a seam. */
async function checkJoin(file, p) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]);
  const pts = r.out.trim().split(/\r?\n/).map((x) => parseFloat(x)).filter(Number.isFinite).sort((a, b) => a - b);
  const step = 1 / fps;
  let worst = 0, bad = 0;
  for (let i = 1; i < pts.length; i++) { const e = Math.abs(pts[i] - pts[i - 1] - step); worst = Math.max(worst, e); if (e > step * 0.25) bad++; }
  const pcm = path.join(FINAL, 'join-check.pcm');
  await ffmpeg('-i', file, '-map', '0:a', '-f', 's16le', '-ac', '1', '-ar', '44100', pcm);
  const buf = fs.readFileSync(pcm), S = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
  fs.unlinkSync(pcm);
  // A click is one sample-to-sample jump far bigger than anything the sound around it does.
  const clicks = [], jump = (a, b) => { let m = 0; for (let i = Math.max(1, a); i < Math.min(S.length, b); i++) m = Math.max(m, Math.abs(S[i] - S[i - 1])); return m; };
  for (const s of p.shots.slice(1)) {
    const at = Math.round((s.f0 / fps) * 44100), near = jump(at - 220, at + 220), around = Math.max(jump(at - 22050, at - 220), jump(at + 220, at + 22050), 200);
    if (near > around * 1.5) clicks.push({ shot: s.id, near, around });
  }
  const audioSeconds = S.length / 44100, seconds = p.total / fps;
  return { frames: pts.length, wanted: p.total, unevenFrames: bad, worstFrameError: +worst.toFixed(5), audioSeconds: +audioSeconds.toFixed(3), seconds: +seconds.toFixed(3), clicks,
    clean: pts.length === p.total && !bad && !clicks.length && Math.abs(audioSeconds - seconds) < 0.05 };
}

async function stitch(p, outFile) {
  const list = path.join(FINAL, 'concat.txt'), pic = path.join(FINAL, 'picture.mp4'), wav = path.join(FINAL, 'sound.wav');
  fs.writeFileSync(list, p.shots.map((s) => `file '${fileOf(s).replace(/\\/g, '/')}'\n`).join(''));
  await ffmpeg('-f', 'concat', '-safe', '0', '-i', list, '-map', '0:v', '-c:v', 'copy', pic);
  await mixSound(p, wav);
  await ffmpeg('-i', pic, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', (p.total / fps).toFixed(6), '-movflags', '+faststart', outFile);
  for (const f of [list, pic, wav]) { try { fs.unlinkSync(f); } catch {} }
  return await checkJoin(outFile, p);
}

function nextName() {
  let top = 0;
  try { for (const f of fs.readdirSync(V.output)) { const m = /-v(\d+)\.mp4$/.exec(f); if (m) top = Math.max(top, +m[1]); } } catch {}
  return `v${top + 1}`;
}

// ---------- report ----------

function report(p, join, out, times, extra) {
  const rendered = p.shots.filter((s) => !s.reuse), reused = p.shots.filter((s) => s.reuse);
  const frames = (l) => l.reduce((a, s) => a + s.f1 - s.f0, 0);
  const r = {
    video: V.name, file: out ? path.relative(DIRECTOR, out).split(path.sep).join('/') : null, when: new Date().toISOString(), size: `${w}x${h}`, fps,
    shots: p.shots.length, reused: reused.length, rendered: rendered.length, framesReused: frames(reused), framesRendered: frames(rendered), minutes: +((Date.now() - new Date(started).getTime()) / 60000).toFixed(1), join, ...extra,
    list: p.shots.map((s) => ({ id: s.id, from: s.f0 / fps, frames: s.f1 - s.f0, hash: s.hash, action: s.reuse ? 'reused' : 'rendered', why: s.why, seconds: times.get(s.id) ?? 0 })),
  };
  write(path.join(FINAL, 'report.json'), r);
  const md = [`# ${V.name} final${r.file ? `: ${path.basename(r.file)}` : ''}`, '', `${r.rendered} of ${r.shots} shots rendered, ${r.reused} reused from saved renders (${r.framesRendered} of ${p.total} frames), ${r.minutes} min. ${r.size}, ${fps} fps.`];
  if (join) md.push(`Join: ${join.clean ? 'clean' : 'NOT CLEAN'}, ${join.frames} of ${join.wanted} frames, ${join.unevenFrames} uneven, ${join.clicks.length} clicks at seams.`);
  if (extra?.warning) md.push(`Warning: ${extra.warning}`);
  md.push('', '| Shot | Time | Frames | Action | Why |', '|---|---|---|---|---|');
  for (const x of r.list) md.push(`| ${x.id} | ${clockText(x.from)} | ${x.frames} | ${x.action === 'rendered' ? '**rendered**' : 'reused'} | ${x.why} |`);
  fs.writeFileSync(path.join(FINAL, 'report.md'), md.join('\n') + '\n');
  return r;
}

/** What this final should take, from the plan and the last final's pace: seconds a frame from its rendered shots, and its build, stitch and review time on top. */
function estimate(p) {
  const n = p.shots.filter((s) => !s.reuse), frames = n.reduce((a, s) => a + s.f1 - s.f0, 0);
  const last = read(path.join(FINAL, 'report.json')), rendered = (last?.list ?? []).filter((x) => x.action === 'rendered' && x.seconds > 0);
  const perFrame = rendered.length ? rendered.reduce((a, x) => a + x.seconds, 0) / rendered.reduce((a, x) => a + x.frames, 0) : null;
  // The last final's own work beyond rendering (build, stitch, review), without the time it spent waiting in the queue for Unity.
  const overhead = last?.minutes != null && rendered.length ? Math.max(0, last.minutes - (last.waitedMinutes ?? 0) - rendered.reduce((a, x) => a + x.seconds, 0) / 60) : null;
  const minutes = perFrame == null ? null : +((frames * perFrame) / 60 + (overhead ?? 0)).toFixed(1);
  return { shots: n.length, of: p.shots.length, frames, total: p.total, perFrame: perFrame && +perFrame.toFixed(3), overhead: overhead && +overhead.toFixed(1), minutes, lastFinal: last?.when ?? null };
}
function sayEstimate(e) {
  const pace = e.minutes == null ? 'no earlier final to take a pace from' : `about ${e.minutes} min (${e.perFrame} s a frame at the last final's pace${e.overhead ? `, plus ${e.overhead} min to build, stitch and review` : ''})`;
  say(`final: ${e.shots} of ${e.of} shots to render, ${e.frames} of ${e.total} frames: ${pace}`);
}

/** The newest whole-video review report: its cost and how many shots it asked, for the price of the next. */
function latestReview() {
  let best = null;
  try { for (const d of fs.readdirSync(path.join(V.dir, 'review'))) { const r = read(path.join(V.dir, 'review', d, 'report.json')); if (r?.when && !r.offset && (!best || r.when > best.when)) best = r; } } catch {}
  if (!best) return null;
  const asked = (best.shots ?? []).filter((q) => !q.carried && !q.reused).length;
  return { cost: best.cost, asked };
}

/** One line per shot saying why it renders, then the reuse in numbers: by reason, frames, and the minutes the last report says those frames take. */
function printPlan(p) {
  for (const s of p.shots) console.log(`${s.reuse ? 'reuse ' : 'RENDER'} ${s.id.padEnd(18)} ${String(s.f1 - s.f0).padStart(5)} frames  ${s.why}`);
  const n = p.shots.filter((s) => !s.reuse), frames = (l) => l.reduce((a, s) => a + s.f1 - s.f0, 0), fr = frames(n);
  const last = read(path.join(FINAL, 'report.json')), rendered = (last?.list ?? []).filter((x) => x.action === 'rendered' && x.seconds > 0);
  const perFrame = rendered.length ? rendered.reduce((a, x) => a + x.seconds, 0) / rendered.reduce((a, x) => a + x.frames, 0) : null;
  const reasons = new Map();
  for (const s of n) { const k = s.why.replace(/\(.*$/, '').replace(/:.*$/, '').trim(); reasons.set(k, (reasons.get(k) ?? 0) + 1); }
  const e = estimate(p);
  console.log(`${n.length} of ${p.shots.length} shots to render, ${fr} of ${p.total} frames (${Math.round((1 - fr / Math.max(1, p.total)) * 100)}% reused)${perFrame ? `, about ${(fr * perFrame / 60).toFixed(1)} min of rendering at the last final's pace${e.overhead != null ? `, ${e.minutes} min with its build, stitch and review` : ''}` : ''}`);
  if (n.length) console.log(`  why: ${[...reasons].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ')}`);
  if (!noReview) {
    // The review after it asks Claude only where the picture changed (tools/mv/verdicts.mjs): a re-rendered shot and the one after it (its cut strip).
    const f = reviewForecast(p.shots), lastRev = latestReview(), each = lastRev?.cost && lastRev.asked ? lastRev.cost / lastRev.asked : 0.02;
    console.log(`  review: about ${f.ask} of ${p.shots.length} shots asked again (about $${(f.ask * each).toFixed(2)}), ${f.carry} keep their verdicts`);
  }
  const warn = finalWarning(V, p.shots.length);
  if (warn) console.log(warn);
}

// ---------- the run ----------

async function main() {
  const hasCards = fs.existsSync(path.join(V.dir, 'cut.json'));
  const compile = async () => {
    if (!hasCards) return;
    const r = await run(process.execPath, [path.join(DIRECTOR, 'tools', 'cards.mjs'), 'compile', V.dir]);
    if (!r.ok) throw new Error('cards would not compile:\n' + r.err.slice(-800));
  };
  if (planOnly) {
    // The cards as they are now, compiled in memory: what a final would render after its own compile, with no file written.
    let acts;
    if (hasCards) {
      const { loadVideo, compile: compileCards, writeAct } = await import('./cards.mjs');
      try { acts = { '50-cards.json': writeAct((await compileCards(loadVideo(V.dir))).act) }; } catch (e) { say(`cards would not compile, planning on the act on disk: ${String(e.message).split('\n')[0]}`); }
    }
    const p = await plan({ acts });
    if (planJson) { process.stdout.write(JSON.stringify(p.shots.map((s) => ({ id: s.id, hash: s.hash, f0: s.f0, f1: s.f1, reuse: s.reuse, why: s.why, parts: s.parts }))) + '\n'); return; }
    printPlan(p);
    return;
  }
  mkdir(CACHE);

  const queue = new Queue(path.join(DIRECTOR, 'gen'));
  // Up front, before the queue: how long this should take, so nobody waits to find out. The Room shows it from progress.json.
  let expected = null;
  try { await compile(); expected = estimate(await plan()); sayEstimate(expected); } catch (e) { say(`could not estimate: ${e.message}`); }
  progress({ state: 'waiting for Unity', expected });
  // One turn from the build to the last frame: nobody can build under a shot that's rendering.
  const queued = Date.now();
  await queue.enter(`final ${V.name}`, (place, who) => { say(`waiting for Unity: ${place} ahead, now "${who}"`); progress({ state: `waiting for Unity, ${place} ahead` }); });
  const waitedMinutes = +((Date.now() - queued) / 60000).toFixed(1);
  const stampFile = path.join(FINAL, 'built.json');
  let p;
  try {
    await compile();
    p = await plan();
    printPlan(p);
    const todo = () => p.shots.filter((s) => !s.reuse);
    // Without a build Unity holds someone else's latest score. With nothing to render it only matters for the sfx list.
    if (todo().length || read(stampFile)?.stamp !== scoreStamp(p)) {
      for (let i = 0; ; i++) {
        progress({ state: 'building', expected });
        say('building...');
        const b = await mv('build');
        if (!b.ok) throw new Error('the build failed:\n' + (b.err || b.out).slice(-1200));
        const stamp = scoreStamp(p);
        await compile();
        const again = await plan();
        const same = scoreStamp(again) === stamp;
        p = again;
        if (same) { write(stampFile, { stamp, built: new Date().toISOString() }); break; }
        if (i >= 2) throw new Error('the score keeps changing under the build');
        say('the score changed during the build, building again');
      }
    }
    // The build may have baked a take and written a new report: the gate again, on what will really render.
    const gate = bakeRefusal(V);
    if (gate && !gate.soft) { if (!allowBake) throw new Error(`Not rendering: ${gate.why}. mv bake status says why; --allow-bake renders anyway.`); say(`warning: ${gate.why} (--allow-bake)`); }
    // The shot gate: the camera and staging checks over the whole cut (the kept report when it still holds), and no render on an A fault.
    if (!allowShot && todo().length) {
      const end = p.shots.length ? p.shots[p.shots.length - 1].f1 / fps : 0;
      let sr = freshShot(V, 0, end);
      if (!sr) { progress({ state: 'shot check', expected }); say('shot check over the cut...'); const c = await mv('shotcheck', 0, end.toFixed(3)); if (!c.ok) say(`  the shot check did not finish: ${(c.err || c.out).slice(-300)}`); sr = freshShot(V, 0, end); }
      const why = sr ? shotRefusal(sr, 0, end) : null;
      if (why) throw new Error(`Not rendering: ${why}\nvideos/${V.name}/captures/motioncheck-report.md has them all; fix the cards, or --allow-shot renders anyway.`);
      if (sr) say(`shot check: ${sr.A} A, ${sr.B} B`);
    }
    const engine = engineHash(), times = new Map(), list = todo();
    let done = 0;
    for (const s of p.shots) {
      if (s.reuse) continue;
      done++;
      progress({ state: 'rendering', shot: s.id, done: done - 1, of: list.length, reused: p.shots.length - list.length, expected });
      say(`render ${done}/${list.length}: ${s.id}, ${s.f1 - s.f0} frames (${s.why})`);
      const t0 = Date.now();
      await renderShot(s);
      times.set(s.id, Math.round((Date.now() - t0) / 1000));
    }
    const name = nameArg ?? nextName(), out = path.join(mkdir(V.output), `${V.name}-${name}.mp4`);
    progress({ state: 'stitching' });
    const join = await stitch(p, out);
    writeSegments(V, out, p.shots, fps); // the shot hashes of this file, so mv review of it carries unchanged verdicts
    const warning = engineHash() !== engine ? 'the engine changed while this was rendering, so some shots may be from the old code' : undefined;
    const r = report(p, join, out, times, { warning, waitedMinutes });
    prune();
    console.log(`${out}\n${r.rendered} rendered, ${r.reused} reused, ${r.framesRendered} of ${p.total} frames, ${r.minutes} min (${waitedMinutes} of it waiting for Unity)`);
    console.log(`join: ${join.clean ? 'clean' : 'NOT CLEAN'} ${JSON.stringify(join)}`);
    if (!join.clean) process.exitCode = 1;
    {
      // Photosensitive safety on the finished file: no more than 3 flashes a second, no saturated red flash (tools/flashcheck.mjs, Ofcom's rule).
      try {
        const { flashCheck, describe } = await import('./flashcheck.mjs');
        const fr = flashCheck(out); write(path.join(FINAL, 'flashcheck.json'), fr);
        say(describe(fr));
        if (!fr.ok) { say('flash check failed: not a version for J or broadcast. Space the impact frames (1 s apart, 2 inversions each) and fix the flashes it names.'); process.exitCode = 1; }
      } catch (e) { say(`flash check failed to run: ${e.message}`); }
    }
    if (!noReview) {
      // The 30 fps review on the file J would watch: strips at every cut and spike, Claude on each, the A faults printed here.
      progress({ state: 'reviewing' });
      try {
        const { reviewRender, printA } = await import('./review.mjs');
        const rep = await reviewRender(V, out, { label: name, quiet: true, segments: p.shots });
        if (rep.carried) say(`review: ${rep.carried} shots kept their verdicts (unchanged since an earlier review), the rest asked: $${rep.cost}`);
        printA(rep);
        if (rep.a.length) say(`${rep.a.length} A fault${rep.a.length > 1 ? 's' : ''}: not a version for J. --no-review skips this.`);
      } catch (e) { say(`review failed: ${e.message}`); }
    }
    if (!noCritic) {
      // The motion critic on this exact build: bone dumps of every human actor over the whole file (no render), scored on the twelve principles. tools/critic.mjs.
      progress({ state: 'critic' });
      try {
        const humans = Object.entries(p.score.actors ?? {}).filter(([, a]) => /^person\d*$/.test(String(a?.model ?? ''))).map(([n]) => n);
        if (humans.length) {
          // async: a spawnSync would stop this queue ticket's heartbeat and the queue would drop it after 2 minutes
          const r = await new Promise((res) => { let err = ''; const c = spawn(process.execPath, [path.join(DIRECTOR, 'tools', 'critic.mjs'), 'cut', V.name, '0', String(p.total / fps), '--on', humans.join(','), '--label', `final-${name}`, '--quiet'], { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] }); c.stderr.on('data', (d) => { err += d; }); c.on('error', (e) => res({ stderr: String(e) })); c.on('close', () => res({ stderr: err })); });
          const cr = read(path.join(V.dir, 'critic', `final-${name}`, 'report.json'));
          if (cr) { write(path.join(FINAL, 'critic.json'), { ...cr, render: out, when: new Date().toISOString() }); write(path.join(FINAL, 'renders', path.basename(out) + '.critic.json'), { total: cr.total, verdict: cr.verdict, principles: Object.fromEntries(Object.entries(cr.principles).map(([k, q]) => [k, q.score])), perActor: cr.perActor, worst: cr.worst, report: path.join(V.dir, 'critic', `final-${name}`, 'report.md') }); say(`motion critic: ${cr.total}/10, ${cr.verdict}. Worst: ${cr.worst.slice(0, 3).map((w) => `${w.t} s ${w.part} ${w.kind}`).join('; ')}. ${path.join(V.dir, 'critic', `final-${name}`, 'report.md')}`); }
          else say(`motion critic gave no report${r.stderr ? `: ${r.stderr.trim().split('\n').slice(-2).join(' ')}` : ''}`);
        }
      } catch (e) { say(`motion critic failed: ${e.message}`); }
    }
  } finally {
    queue.leave();
    try { fs.unlinkSync(path.join(FINAL, 'progress.json')); } catch {}
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(String(e.message ?? e));
    try { write(path.join(FINAL, 'failed.json'), { when: new Date().toISOString(), error: String(e.message ?? e).slice(0, 800) }); } catch {}
    process.exitCode = 1;
  });
}
