#!/usr/bin/env node
// The motion library: watch clips at real speed and keep what a choreographer needs about each one.
//   node Director/mv.mjs hold node Director/tools/motion_lib.mjs render <clip...> [--max 14] [--w 480 --h 640]
//       plays each clip bare on a throwaway copy of him in `mv lab` (root motion on) and writes real 30 fps mp4s, front and three-quarter,
//       to Director/library/motion/renders/<clip>_<view>.mp4, plus the lab's numbers in lab/<clip>.json. 10-15 clips a run, `mv refresh` between runs.
//   node Director/tools/motion_lib.mjs strips <clip...>      ffmpeg only: strips/<clip>.jpg, every frame of the front view at 15 fps in rows
//       (1 s a row, time burned in) over the three-quarter view at 7.5 fps, for stepping through; gallery/<clip>.jpg, 8 frames across, for the gallery.
//   node Director/tools/motion_lib.mjs gallery               writes gallery.md from clips.json (the notes are written by hand into clips.json).
//   node Director/tools/motion_lib.mjs todo                  mx_ clips in the project with no notes yet.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE), PROJECT = path.dirname(ROOT);
const LIB = path.join(ROOT, 'library', 'motion'), CAT = path.join(ROOT, 'library', 'clips.json');
const argv = process.argv.slice(2), flag = {}, names = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; else names.push(argv[i]); }
const cmd = names.shift();
for (const d of ['renders', 'strips', 'gallery', 'lab']) fs.mkdirSync(path.join(LIB, d), { recursive: true });
const cat = fs.existsSync(CAT) ? JSON.parse(fs.readFileSync(CAT, 'utf8')).clips : {};
const notesFile = path.join(LIB, 'clips.json');
const notes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : { about: '', clips: {} };
const run = (c, a, o = {}) => spawnSync(c, a, { encoding: 'utf8', maxBuffer: 1 << 26, ...o });

if (cmd === 'render') {
  const max = +(flag.max || 14), w = +(flag.w || 480), h = +(flag.h || 640);
  for (const clip of names) {
    const len = Math.min(max, (cat[clip]?.length ?? 6) + 0.1);
    // every:1 so the render gets all 30 fps frames (the sheet samples at `every` too, so keep its cells tiny).
    const job = { on: 'person', actors: { person: { model: 'person', pos: [500, 0, 500] } }, from: 0, to: len, every: 1, cols: 30, cell: 24, panel: 24,
      cues: [{ at: 0, do: 'anim', on: 'person', clip, blend: 0, root: 1 }],
      render: { out: `library/motion/renders/${clip}`, views: ['front', 'three'], w, h } };
    const tmp = path.join(ROOT, 'gen', `motionlab_${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify(job));
    const t0 = Date.now();
    const r = run('node', [path.join(ROOT, 'mv.mjs'), '--video', flag.video || 'greener', 'lab', tmp]);
    let res = null; try { res = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); } catch { }
    if (!res) { console.log(`${clip}: FAILED ${(r.stderr || r.stdout).slice(-400)}`); continue; }
    const keep = { clip, seconds: len, popCount: res.popCount, pops: (res.pops || []).slice(0, 6), feet: res.feet, hipsTop: res.hipsTop, hipsLow: res.hipsLow, hipsTravel: res.hipsTravel, limits: res.limitsMovedDegrees, reverse: res.reverseWorstMetres, warnings: res.warnings, render: res.render };
    fs.writeFileSync(path.join(LIB, 'lab', `${clip}.json`), JSON.stringify(keep, null, 1));
    console.log(`${clip}: ${len.toFixed(1)} s, pops ${res.popCount}, feet ${res.feet}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    fs.unlinkSync(tmp);
  }
} else if (cmd === 'strips') {
  const cell = +(flag.cell || 180);
  for (const clip of names) {
    const front = path.join(LIB, 'renders', `${clip}_front.mp4`), three = path.join(LIB, 'renders', `${clip}_three.mp4`);
    if (!fs.existsSync(front)) { console.log(`${clip}: no render`); continue; }
    const out = path.join(LIB, 'strips', `${clip}.jpg`), gal = path.join(LIB, 'gallery', `${clip}.jpg`);
    const probe = run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', front]);
    const frames = +probe.stdout.trim() || 30, secs = frames / 30;
    const rows = Math.ceil(secs), ch = Math.round(cell * 9 / 4);
    // The lab frames him in the middle 60% of the picture, so crop to that and he fills a tall cell.
    // front: every 2nd frame (15 fps), 15 a row = 1 s a row; three: every 4th frame (7.5 fps), 15 a row = 2 s a row.
    const stamp = `drawtext=text='%{eif\\:t\\:d}.%{eif\\:(t-trunc(t))*10\\:d}':fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:x=2:y=2`;
    const crop = `crop=iw*0.6:ih*0.9:iw*0.2:ih*0.04`;
    const fc = `[0:v]${crop},${stamp},scale=${cell}:${ch},select='not(mod(n\\,2))',tile=15x${rows}:padding=1:color=0x303030[a];` +
      `[1:v]${crop},${stamp},scale=${cell}:${ch},select='not(mod(n\\,4))',tile=15x${Math.ceil(rows / 2)}:padding=1:color=0x303030[b];` +
      `[a][b]vstack=inputs=2,drawtext=text='${clip}  front 15fps (1 s a row) / three-quarter 7.5fps (2 s a row)':fontsize=18:fontcolor=yellow:x=4:y=h-24`;
    const r = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', front, '-i', three, '-filter_complex', fc, '-frames:v', '1', '-q:v', '4', out]);
    if (r.status !== 0) console.log(`${clip}: strips failed ${r.stderr.slice(-300)}`);
    const step = Math.max(1, Math.floor(frames / 8));
    const g = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', front, '-vf', `${crop},${stamp},select='not(mod(n\\,${step}))',scale=120:270,tile=8x1:padding=1:color=0x303030`, '-frames:v', '1', '-q:v', '5', gal]);
    if (g.status !== 0) console.log(`${clip}: gallery strip failed ${g.stderr.slice(-300)}`);
    console.log(`${clip}: ${frames} frames, ${out}`);
  }
} else if (cmd === 'todo') {
  const have = fs.readdirSync(path.join(PROJECT, 'Assets', 'MusicVideo', 'Motion')).filter((f) => /^Humanoid@mx_.*\.fbx$/.test(f)).map((f) => f.slice(9, -4));
  console.log(have.filter((c) => !notes.clips[c]).join(' '));
} else if (cmd === 'gallery') {
  const by = {};
  for (const [clip, n] of Object.entries(notes.clips)) (by[n.category || 'other'] ??= []).push([clip, n]);
  const order = ['groove', 'step', 'turn', 'pose', 'walk', 'sit', 'gesture', 'reaction', 'transition', 'other'];
  const lines = ['# Motion library', '', notes.about, '', '**For staging acting, start from the clip catalog** (`catalog.md`, `catalog.html`, `mv clips <use>`): every clip in `Assets/MusicVideo/Motion` previewed on the native path and graded by use (2026-11-07). The notes below were watched on the old path; where they disagree with the catalog (mx_shrug is no longer a T-pose, mx_sit_point is a shade-the-eyes look, not a point), the catalog is newer.', '', `${Object.keys(notes.clips).length} clips watched. Verdicts: **A** build on it, **B** usable for a moment or with a mask, **C** don't use. Times are seconds of clip time at speed 1. Speeds are the clip \`speed\` that puts its own beat on the song's beat, for 140 and for 100 BPM. Masks are the \`layer\` masks worth taking from it. Strips: \`strips/<clip>.jpg\` every frame at 15 fps, \`renders/<clip>_front.mp4\` and \`_three.mp4\` the real thing.`, ''];
  for (const c of order) {
    if (!by[c]) continue;
    lines.push(`## ${notes.categories?.[c] ?? c}`, '');
    for (const [clip, n] of by[c].sort((a, b) => (a[1].verdict || 'Z').localeCompare(b[1].verdict || 'Z') || a[0].localeCompare(b[0]))) {
      const adm = cat[clip] ? `${cat[clip].status}${cat[clip].issues?.length ? ' (' + cat[clip].issues.join('; ') + ')' : ''}, ${cat[clip].length} s` : 'not catalogued';
      lines.push(`### \`${clip}\` — ${n.verdict || '?'}`, '', `![${clip}](gallery/${clip}.jpg)`, '', `**${n.style || ''}**  `, `Admission: ${adm}.  `);
      if (n.segments?.length) { lines.push('', '| start | stop | bars | what | use |', '|---|---|---|---|---|'); for (const s of n.segments) lines.push(`| ${s.start} | ${s.stop} | ${s.bars ?? ''} | ${s.what ?? ''} | ${s.use ?? ''} |`); }
      lines.push('', `Good parts: ${n.good || ''}. Masks: ${(n.masks || []).map((m) => '`' + m + '`').join(', ') || 'whole body'}. Speed at 140: ${n.speed140 ?? '?'}, at 100: ${n.speed100 ?? '?'}.  `);
      if (n.avoid) lines.push(`Avoid: ${n.avoid}.  `);
      if (n.tags?.length) lines.push(`Tags: ${n.tags.join(', ')}.`);
      lines.push('');
    }
  }
  fs.writeFileSync(path.join(LIB, 'gallery.md'), lines.join('\n'));
  console.log(`gallery.md: ${Object.keys(notes.clips).length} clips`);
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n'));
}
