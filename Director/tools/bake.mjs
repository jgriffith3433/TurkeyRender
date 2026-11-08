#!/usr/bin/env node
// Bakes a take: the finished performance through the whole stack at 60 Hz, cleaned, written as one clip the engine plays from the same `perform`.
//   node Director/tools/bake.mjs <take...> [--video greener] [--stale] [--no-write] [--clips] [--report]   (--stale: only the uses whose bake is missing, which `mv cards` runs before every build)   (no take: every take in TAKES; --clips renders source and baked side by side to captures/dance/bake/; --compare [--only-at 5:1 --range from,to --dist m --look-y m --far] renders with and without the mechanics; --raw bakes without them)
// Each use of a take in the compiled act gets its own bake, because a walk's length and a warp's beats belong to the place it sits in the song.
// Sources stay as they are in library/performances; delete library/performances/baked/<key>.json to play one from source. Editing a take makes its bake stale:
// the build warns and it plays from source until it is baked again. Numbers go to gen/bake/report.json and Director/videos/<v>/bake-report.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIR, load, measure } from './bake/body.mjs';
import { clean } from './bake/clean.mjs';
import { hands } from './bake/hands.mjs';
import { Mechanics, sharpness } from './bake/mechanics.mjs';
import { takeUses } from './bake/key.mjs';
import { writeReport as writeGateReport } from './mv/bakegate.mjs';
import { videoInfo } from './mv/score.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE), MV = path.join(ROOT, 'mv.mjs');
const argv = process.argv.slice(2), flag = {}, names = [];
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--video') flag.video = argv[++i]; else if (argv[i] === '--only-at') flag.onlyAt = argv[++i]; else if (argv[i] === '--range') flag.range = argv[++i]; else if (argv[i] === '--dist') flag.dist = +argv[++i]; else if (argv[i] === '--look-y') flag.lookY = +argv[++i]; else if (argv[i] === '--args') flag.args = argv[++i]; else if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = true; else names.push(argv[i]); }
const video = flag.video ?? 'greener';
const TAKES = ['dance_chorus', 'dance_hook', 'dance_chorus_2', 'verse_take', 'verse_take_2', 'dance_hook_stairs', 'dress_walk', 'dress_lift_stairs', 'dress_sit', 'sit_lawn_chair_sing', 'dress_stand', 'dress_groove', 'dress_curtsy', 'dress_twirl', 'walk_plain', 'stand'];
// How each take is cleaned. `planted`: no one floor, or seated: the feet hold where the take has them and the hips are left alone. `mech`: the body mechanics, see bake/mechanics.mjs. `sing` is how much he moves with the phrase, `sway` metres of weight shift.
const SEATED = { planted: true, mech: { sing: 1, breath: 1.25, plantDrop: 0, counter: .2, talk: 14 } }, STOOD = { mech: { sing: 1, sway: .03, breath: 1.2, talk: 12 } };
const PUNCH_SEATED = { planted: true, mech: { sing: 0, breath: 1.1, plantDrop: 0, counter: .2 } }, PUNCH_FLY = { planted: true, mech: { sing: 0, breath: 0.8, plantDrop: 0, counter: .15 } };   // Hawkes Punch: seats and the paper bed, and the flight (no floor at all)
const TAKE = { ...Object.fromEntries(['sit_bed_sick', 'take_can', 'knee_tap_react', 'tongue_out', 'mouth_open_about_to_speak', 'sit_stool_pitch', 'drink_can', 'thumbs_up', 'point_at_lens', 'ride_satellite', 'hide_peek'].map((n) => [n, PUNCH_SEATED])), ...Object.fromEntries(['punched_away', 'drift_space', 'shoulder_tap_react', 'nose_flick', 'nose_flicked', 'bolt_away', 'fly_fast', 'slingshot', 'lasso_swing_hammer', 'catch_planet', 'float_close', 'grab_earth_careful', 'spin_top', 'lasso_throw', 'bowl_planet', 'jump_scare'].map((n) => [n, PUNCH_FLY])), dress_sit: SEATED, sit_lawn_chair_sing: SEATED, dress_stand: STOOD, stand: STOOD, dress_groove: { mech: { sing: .6 } }, verse_take: { mech: { sing: .3 } }, verse_take_2: { mech: { sing: .3 } }, dance_chorus: { mech: { sing: .15 } }, dance_chorus_2: { mech: { sing: .15 } }, dress_walk: { mech: { sing: .25 } }, walk_plain: { mech: { sing: .25 } }, dress_lift_stairs: { planted: true, mech: { sing: .2 } } };
const songData = () => { const s = parse(path.join(ROOT, 'videos', video, 'song.json')); let lines = []; try { lines = parse(path.join(ROOT, 'videos', video, 'lyrics.json')).lines; } catch {} return { lines, vocal: s.envelopes?.vocal ?? [], fps: s.envelopes?.fps ?? 30 }; };   // a video with no lyrics yet (a click track) has no phrase to move with
const parse = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));

function uses() {
  const act = path.join(ROOT, 'videos', video, 'acts', '50-cards.json');
  if (!fs.existsSync(act)) return [];   // no cards yet: named takes bake standing alone (below)
  const cues = parse(act).cues, out = [];
  // every human actor bakes, each with its own model (the doctor is person2): the video's acts and the shared score say who is human
  const humans = { person: 'person' };
  try {
    const dir = path.join(ROOT, 'videos', video, 'acts');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) for (const [n, a] of Object.entries(parse(path.join(dir, f)).actors ?? {})) if (/^person\d*$/.test(String(a.model ?? ''))) humans[n] = a.model;
  } catch {}
  const where = {}, seen = new Set();
  for (const c of cues) {
    if (!humans[c.on]) continue;
    const w = (where[c.on] ??= { pos: null, rot: null });
    if (c.do === 'set') { w.pos = c.pos ?? w.pos; w.rot = c.rot ?? w.rot; }
    if (c.do !== 'perform') continue;
    const { do: _d, on: _o, ...cue } = c, id = humans[c.on] + JSON.stringify(cue);
    if (seen.has(id)) continue; seen.add(id);
    out.push({ cue: { do: 'perform', ...cue }, model: humans[c.on], pos: w.pos ?? [500, 0, 500], rot: w.rot ?? [0, 0, 0], cut: cues.some((x) => x.shot && x.at === c.at) });   // a clone on the same take at the same time shares this bake: its key has no actor in it
    if (cue.to && !cue.keepAt) { w.pos = cue.to; }
  }
  return out;
}

function unity(cmd, args) {
  const r = execFileSync('node', [MV, '--video', video, 'call', cmd, JSON.stringify(args)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 24 });
  return JSON.parse(r.slice(r.indexOf('{')));
}
function dump(job, out, extra = {}) {
  const f = path.join(DIR, 'job.json');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ cues: [job.cue], model: job.model ?? 'person', pos: job.pos, rot: job.rot, out, fps: 60, ...extra }));
  return unity('bakedump', { path: f.replace(/\\/g, '/') });
}

/** The take's own first hand-over, which the bake keeps as its blend in from whatever came before it. */
function firstBlend(name) {
  const p = parse(path.join(ROOT, 'library', 'performances', name + '.json'));
  for (const c of p.cues) {
    if (c.do === 'perform') return firstBlend(c.name);
    if ((c.do === 'anim' || c.do === 'walk') && !c.if) return typeof c.blend === 'string' ? parseFloat(c.blend) : c.blend ?? .2;
  }
  return .2;
}

const row = (m) => ({ snaps: m.snaps, jerk: m.jerk, snapsBy: Object.fromEntries(Object.entries(m.byKind).map(([k, b]) => [k, b.snaps])), peak: Object.fromEntries(Object.entries(m.byKind).map(([k, b]) => [k, b.peakSpeed])), ...m.counts, max: m.maxes });
const report = fs.existsSync(path.join(DIR, 'report.json')) ? parse(path.join(DIR, 'report.json')) : {};
const V = videoInfo(video);
let list;
if (flag.stale) {
  // Only what the compiled cut uses and has no bake for (tools/bake/key.mjs computes the same key as the compiler).
  const stale = new Set(takeUses(V).filter((u) => !u.baked).map((u) => `${u.name}|${u.at}`));
  list = uses().filter((u) => stale.has(`${u.cue.name}|${u.cue.at}`));
  if (!list.length) { console.log('every take the cut uses is baked'); writeGateReport(V, { baked: [], by: 'bake --stale' }); process.exit(0); }
  console.error(`baking ${list.length} stale take use${list.length > 1 ? 's' : ''}: ${list.map((u) => `${u.cue.name} ${u.cue.at}`).join(', ')}`);
} else {
  list = uses().filter((u) => (names.length ? names : TAKES).includes(u.cue.name) && (!flag.onlyAt || u.cue.at === flag.onlyAt));
  // A take no card uses on its own (the hook lives inside the choruses) still gets its numbers, at the top of chorus 1.
  for (const n of names.length ? names : TAKES) if (!flag.onlyAt && !list.some((u) => u.cue.name === n) && !uses().some((u) => u.cue.name === n)) { const c = uses().find((u) => u.cue.name === 'dance_chorus'); if (c) list.push({ cue: { do: 'perform', at: c.cue.at, name: n }, pos: c.pos, rot: c.rot }); else if (names.includes(n)) list.push({ cue: { do: 'perform', at: 0, name: n, ...(flag.args ? JSON.parse(flag.args) : {}) }, pos: [500, 0, 500], rot: [0, 0, 0], alone: true }); }   // a take no card uses yet (a video before its cut): its numbers at the song's start, far off the set; the real bake comes with `mv cards`
}

/** Real renders of a take, source then baked, side by side at normal speed: front and three-quarter, source on the left of each pair. */
function clips(job, tag) {
  const out = path.join(ROOT, 'videos', video, 'captures', 'dance', 'bake'), BK = path.join(ROOT, 'library', 'performances', 'baked'), HOLD = path.join(DIR, 'held'), TMP = path.join(DIR, 'cmp');
  for (const d of [out, HOLD, TMP]) fs.mkdirSync(d, { recursive: true });
  const b = load(tag + '_before'), from = b.head.t0, to = from + b.head.len;
  const run = (which) => { const f = path.join(DIR, 'job_lab.json'); fs.writeFileSync(f, JSON.stringify({ on: 'person', actors: { person: { model: 'person', pos: job.pos, rot: job.rot } }, cues: [{ ...job.cue, on: 'person' }], from, to, every: 1, cols: 40, cell: 30, panel: 30, sheet: 'clip.png',
    render: { out: `gen/bake/cmp/${tag}_${which}`, views: ['front', 'three'], w: 480, h: 640 } })); execFileSync('node', [MV, '--video', video, 'lab', f], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); };
  const keys = fs.readdirSync(BK).filter((k) => k.startsWith(job.cue.name + '_'));
  for (const k of keys) fs.renameSync(path.join(BK, k), path.join(HOLD, k));
  try { run('src'); } finally { for (const k of keys) fs.renameSync(path.join(HOLD, k), path.join(BK, k)); }
  run('bake');
  const v = (x) => path.join(TMP, `${tag}_${x}.mp4`), mp4 = path.join(out, `${job.cue.name}_${String(job.cue.at).replace(/\W/g, '_')}.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', v('src_front'), '-i', v('bake_front'), '-i', v('src_three'), '-i', v('bake_three'), '-filter_complex', 'hstack=inputs=4', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', mp4], { stdio: 'ignore' });
  console.log(mp4);
}

/** With and without the body mechanics, the same take at normal speed: front and three-quarter, the cleaned bake on the left of each pair, mechanics on the right. --range from,to in song seconds, a few seconds at a time, because Unity holds every frame of a lab render. */
function compare(job, tag) {
  const out = path.join(ROOT, 'videos', video, 'captures', 'dance', 'bake'), TMP = path.join(DIR, 'cmp'); for (const d of [out, TMP]) fs.mkdirSync(d, { recursive: true });
  const self = fileURLToPath(import.meta.url), bake = (...x) => execFileSync('node', [self, job.cue.name, '--video', video, '--only-at', String(job.cue.at), ...x], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
  bake('--raw');
  const b = load(tag + '_before'), r = (flag.range ?? '').split(',').map(Number), from = r[0] || b.head.t0, to = r[1] || Math.min(from + 8, b.head.t0 + b.head.len);
  const run = (which) => { const f = path.join(DIR, 'job_lab.json'); fs.writeFileSync(f, JSON.stringify({ on: 'person', actors: { person: { model: 'person', pos: flag.far ? [500, job.pos[1], 500] : job.pos, rot: job.rot } }, cues: [{ ...job.cue, on: 'person' }], from, to, every: 1, cols: 40, cell: 30, panel: 30, sheet: 'clip.png',
    render: { out: `gen/bake/cmp/${tag}_${which}`, views: ['front', 'three'], w: 480, h: 640, ...(flag.dist ? { dist: flag.dist } : {}), ...(flag.lookY ? { lookY: flag.lookY } : {}) } })); execFileSync('node', [MV, '--video', video, 'lab', f], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); };
  run('raw'); bake(); run('mech');
  const v = (x) => path.join(TMP, `${tag}_${x}.mp4`), mp4 = path.join(out, `compare_${job.cue.name}_${String(job.cue.at).replace(/\W/g, '_')}.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', v('raw_front'), '-i', v('mech_front'), '-i', v('raw_three'), '-i', v('mech_three'), '-filter_complex', 'hstack=inputs=4', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', mp4], { stdio: 'ignore' });
  console.log(mp4);
}

function writeReport(quiet) {
  const r = parse(path.join(DIR, 'report.json')), rows = Object.values(r);
  const H = ['take', 'at', 'snaps', 'accel spikes', 'elbow flips', 'knee flips', 'hyper knee', 'hyper elbow', 'wrist over', 'ankle over', 'toes under', 'head over 38', 'chest over 42', 'near-floor foot travel, m'];
  const K = ['snaps', 'jerk', 'elbowFlip', 'kneeFlip', 'hyperKnee', 'hyperElbow', 'wristOver', 'ankleOver', 'toesUnder', 'headOver', 'chestOver'];
  let o = `# ${video}: bake report\n\nWritten by \`Director/tools/bake.mjs --report\`. 60 Hz. Before is the whole live stack, after is the baked clip played through the engine, both with world \`steps\` off. A snap is a one-frame step over 5 degrees and far above its neighbours; an accel spike is over 45000 deg/s2. Toes are not measured on the stair take, which has no one floor. Frames counted per joint, so a take can pass 100%.\n\n|${H.join('|')}|\n|${H.map(() => '---').join('|')}|\n`;
  for (const x of rows) o += `|${x.take}|${x.at}|${K.map((k) => `${x.before[k]} > ${x.after[k]}`).join('|')}|${x.before.max.plantedTravelM.toFixed(1)} > ${x.after.max.plantedTravelM.toFixed(1)}|\n`;
  const sum = (p, k) => rows.reduce((a, x) => a + x[p][k], 0), trav = (p) => rows.reduce((a, x) => a + x[p].max.plantedTravelM, 0).toFixed(1);
  o += `|**all**||${K.map((k) => `${sum('before', k)} > ${sum('after', k)}`).join('|')}|${trav('before')} > ${trav('after')}|\n`;
  const peak = (p) => Object.fromEntries(['shoulder', 'elbow', 'wrist', 'knee', 'hip'].map((k) => [k, Math.max(...rows.map((x) => x[p].peak[k] ?? 0))]));
  o += `\nPeak speed in deg/s, worst of all takes. Before: ${JSON.stringify(peak('before'))}. After: ${JSON.stringify(peak('after'))}.\n`;
  fs.writeFileSync(path.join(ROOT, 'videos', video, 'bake-report.md'), o); if (!quiet) console.log(o);
}
if (flag.report) { writeReport(); process.exit(0); }

if (flag.compare) { for (const job of list) compare(job, `b_${job.cue.name}_${String(job.cue.at).replace(/\W/g, '_')}`); process.exit(0); }
if (flag.clips) { for (const job of list) { const tag = `b_${job.cue.name}_${String(job.cue.at).replace(/\W/g, '_')}`; clips(job, tag); } process.exit(0); }

for (const job of list) {
  const name = job.cue.name, tag = `b_${name}_${String(job.cue.at).replace(/\W/g, '_')}`;
  const before = dump(job, tag + '_before');                               // what plays today: the whole stack
  // A `lead` joins the take late, so the bake is made from the take's true start and the clip's `start` does the joining. Warp and every hit stay where they were built.
  const lead = job.cue.lead ? parseFloat(job.cue.lead) * (String(job.cue.lead).endsWith('b') ? 60 / 139.97 : 1) : 0;
  const whole = lead ? { ...job, cue: (({ lead: _l, ...c }) => ({ ...c, at: before.t0 - lead, for: before.len + lead }))(job.cue) } : job;
  const src = dump(whole, tag + '_src', { off: ['ground'] });              // the same, with no leg IK: the cleaner does the feet
  const cfg = TAKE[name] ?? {}, b = load(tag + '_before'), s = load(tag + '_src'), planted = !!cfg.planted, floor = planted ? -100 : job.pos[1];   // a stair or a seat has no one floor
  const mech = flag.raw ? null : new Mechanics(cfg.mech ?? {}, songData());
  const c = clean(s, { floor, planted, hands, seed: name.length, mech, heelToe: !flag.raw });
  const cleanName = tag + '_src.clean';
  fs.writeFileSync(path.join(DIR, cleanName + '.bin'), Buffer.from(c.data.buffer));
  const line = { key: before.key, at: job.cue.at, floor, stats: { ...c.stats, ...(mech?.notes ?? {}) }, before: row(measure(b, { floor })) };
  if (!flag['no-write']) {
    const w = unity('bakewrite', { in: cleanName, head: tag + '_src', key: before.key, blend: job.cut ? 0 : firstBlend(name) });      // on a cut there is nothing on screen to hand over from
    line.clip = w;
    const after = dump(job, tag + '_after', { baked: 1 });
    if (after.warnings?.length) line.warnings = after.warnings.filter((x) => /bake/.test(x));
    line.after = row(measure(load(tag + '_after'), { floor }));
    line.sharp = sharpness(load(tag + '_after'));
  } else line.after = row(measure(load(tag + '_src', cleanName), { floor }));
  report[tag] = { take: name, ...line };
  const A = line.before, Z = line.after;
  console.log(`${tag.padEnd(36)} snaps ${A.snaps}>${Z.snaps} jerk ${A.jerk}>${Z.jerk} elbowFlip ${A.elbowFlip}>${Z.elbowFlip} kneeFlip ${A.kneeFlip}>${Z.kneeFlip} hyperK ${A.hyperKnee}>${Z.hyperKnee} hyperE ${A.hyperElbow}>${Z.hyperElbow} wrist ${A.wristOver}>${Z.wristOver} ankle ${A.ankleOver}>${Z.ankleOver} toes ${A.toesUnder}>${Z.toesUnder}`);
  fs.writeFileSync(path.join(DIR, 'report.json'), JSON.stringify(report, null, 1));
}
if (!flag['no-write']) {
  // The per-video report and the gate: videos/<v>/bake-report.json (and the .md table), from the takes the cut uses now.
  const rep = writeGateReport(V, { baked: list.map((u) => `${u.cue.name} ${u.cue.at}`), by: flag.stale ? 'bake --stale' : 'bake' });
  try { writeReport(true); } catch {}
  console.error(`bake gate: ${rep.pass ? 'PASS' : 'FAIL'}${rep.failures.length ? ': ' + rep.failures.map((f) => f.scope === 'take' ? `${f.take} ${f.at} ${f.what} ${f.value} > ${f.limit}` : `${f.what} ${f.value} > ${f.limit}`).join('; ') : ''}`);
}
