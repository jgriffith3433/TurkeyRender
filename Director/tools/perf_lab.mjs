#!/usr/bin/env node
// Tests a performance from Director/library/performances: plays it on a throwaway actor, in the same flow a shot would (its `test.first`
// performances, it, its `test.then`), then writes the sheets, the mp4s and the numbers.
//   node Director/tools/perf_lab.mjs <name> [--args '{"dist":3}'] [--every 1] [--cols 12] [--no-render] [--clip Clip1,Clip2] [--view side,front] [--close] [--file out] [--video greener: warp to that video's beats]
// --clip plays bare clips one after another, to review candidates: the sheet is the comparison.
// Output: library/performances/sheets/<name>_<view>.png, renders/<name>_<view>.mp4, tests/<name>.json (the numbers the gallery quotes).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE), LIB = path.join(ROOT, 'library', 'performances');
const argv = process.argv.slice(2), flag = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (['--no-render', '--close', '--strip'].includes(argv[i])) flag[argv[i].slice(2)] = true;
  else if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const name = pos[0];
const POS = [500, 0, 500];
const lab = { on: 'person', actors: { person: { model: 'person', pos: POS } }, every: +(flag.every || 1), cols: +(flag.cols || 12), cell: +(flag.cell || 150) };
const anim = (at, clip, extra = {}) => ({ at, do: 'anim', on: 'person', clip, blend: 0, ...extra });
const tmp = path.join(ROOT, 'gen', `perf_lab_${process.pid}.json`);
const sheets = path.join(LIB, 'sheets'), renders = path.join(LIB, 'renders'), tests = path.join(LIB, 'tests');
for (const d of [sheets, renders, tests]) fs.mkdirSync(d, { recursive: true });

const secs = (v) => (v == null ? 0 : typeof v === 'number' ? v : v.endsWith('s') ? parseFloat(v) : v.endsWith('b') ? parseFloat(v) * 60 / 87 : v.endsWith('bar') || v.endsWith('bars') ? parseFloat(v) * 4 * 60 / 87 : parseFloat(v));
const load = (n) => JSON.parse(fs.readFileSync(path.join(LIB, n + '.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));

function flow() {
  // test.model: a bird or a prop instead of the person, with no stand to start from: a turkey butler, a gift.
  const subject = !flag.clip && load(name).test?.model;
  if (subject) lab.actors.person.model = subject;
  const cues = subject ? [] : [{ at: 0, do: 'perform', on: 'person', name: 'stand', blend: 0, settle: 0.01 }]; let t = 0.5, from = 0, to;
  if (flag.clip) {
    cues.length = 0; t = 0;
    const list = flag.clip.split(','), marks = [];
    for (const c of list) {
      const [clip, s] = c.split('@'), len = +(s || 2);
      cues.push(anim(t, clip, { once: 1 })); marks.push(`${t.toFixed(2)} ${clip}`); t += len;
    }
    console.log(marks.join('\n'));
    return { cues, from: 0, to: t - 1 / 30 };
  }
  const perf = load(name), test = perf.test || {};
  const args = flag.args ? JSON.parse(flag.args) : test.args || {};
  if (perf.entry && perf.entry !== 'stand' && perf.entry !== 'any' && !test.first) console.log(`note: entry is ${perf.entry} and test.first is empty`);
  for (const f of [].concat(test.first || [])) {
    const fn = typeof f === 'string' ? { name: f } : f, p = load(fn.name), len = fn.for ? secs(fn.for) : secs(p.length);
    cues.push({ at: t, do: 'perform', on: 'person', ...fn }); t += len;
  }
  from = Math.max(0, t - .4);
  const len = args.for ? secs(args.for) : secs(perf.length);
  cues.push({ at: t, do: 'perform', on: 'person', name, ...args }); t += len;
  for (const f of [].concat(test.then || [])) {
    const fn = typeof f === 'string' ? { name: f } : f, p = load(fn.name), l2 = fn.for ? secs(fn.for) : secs(p.length);
    cues.push({ at: t, do: 'perform', on: 'person', ...fn }); t += l2;
  }
  to = t + (test.tail ?? .4);
  return { cues, from, to };
}

const { cues, from, to } = flow();
if (flag.from) lab.from = +flag.from; else lab.from = from;
lab.to = flag.to ? +flag.to : to;
lab.cues = cues;
const views = (flag.view || 'side,front').split(','), out = {};
let i = 0;
for (const view of views) {
  const job = { ...lab, view, sheet: `perf_${name}_${view}.png` };
  if (i === 0 && !flag['no-render']) job.render = { out: `library/performances/renders/${flag.file || name}`, views: flag.close ? ['front'] : views, close: flag.close ? 1 : 0, w: +(flag.w || 400), h: +(flag.h || 540) };
  fs.writeFileSync(tmp, JSON.stringify(job));
  const r = spawnSync('node', [path.join(ROOT, 'mv.mjs'), ...(flag.video ? ['--video', flag.video] : []), 'lab', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error((r.stderr || r.stdout).slice(-1500)); process.exit(1); }
  let res; try { res = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))); } catch { console.log(r.stdout.slice(0, 1500)); process.exit(1); }
  if (i === 0) Object.assign(out, res);
  const src = res.sheet, dst = path.join(sheets, `${flag.file || name}_${view}.png`);
  if (src && fs.existsSync(src)) fs.copyFileSync(src, dst);
  console.log('sheet', dst);
  i++;
}
fs.unlinkSync(tmp);
const keep = { popCount: out.popCount, pops: (out.pops || []).slice(0, 6), feet: out.feet, hipsTop: out.hipsTop, hipsLow: out.hipsLow, hipsMaxSpeed: out.hipsMaxSpeed, hipsTravel: out.hipsTravel, limits: out.limitsMovedDegrees, reverse: out.reverseWorstMetres, fresh: out.shuffledFreshWorstMetres, frames: out.frames, warnings: out.warnings, from: lab.from, to: lab.to };
if (!flag.clip) fs.writeFileSync(path.join(tests, `${flag.file || name}.json`), JSON.stringify(keep, null, 1));
console.log(JSON.stringify(keep));
