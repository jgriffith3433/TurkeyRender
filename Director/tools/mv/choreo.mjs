// mv choreo: a dance take composed as phrases on the song's beat grid, compiled to a performance, baked, played with the song and checked, before any camera exists.
//   mv choreo build <take> [--dry]                 compiles videos/<v>/choreo/<take>.yaml to library/performances/<take>.json (and every hook it uses), bakes it, writes the report line
//   mv choreo play <take> [--views front,three --song --strip --tail 0.3]   a 480p mp4 at normal speed, the song mixed in: videos/<v>/choreo/out/<take>.mp4 (and <take>_strip.png)
//   mv choreo check <take> [--static]              accents per bar, worst gap, longest hold, beat landing, travel, bake numbers; exit 1 when a gate fails
//   mv choreo segments <clip> [--bars 1-4]         a clip's motion beats and 1-4 bar segments that land on the grid
//   mv choreo test                                  compiles greener's dance_chorus and proves it is byte for byte the take in the library
// Format: Director/docs/choreography.md. Phrases: Director/library/choreo/phrases/*.yaml.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { DIRECTOR, loadClock, loadScore } from './score.mjs';
import { yaml } from '../cards.mjs';

const PHRASES = path.join(DIRECTOR, 'library', 'choreo', 'phrases');
const PERF = path.join(DIRECTOR, 'library', 'performances');
const MV = path.join(DIRECTOR, 'mv.mjs');
const fail = (m) => { throw new Error(m); };

// ---- reading ----

const readYaml = (f) => { if (!fs.existsSync(f)) fail(`no file ${path.relative(DIRECTOR, f)}`); return yaml(fs.readFileSync(f, 'utf8'), path.relative(DIRECTOR, f).replace(/\\/g, '/')); };
export const takeFile = (V, name) => path.join(V.dir, 'choreo', name + '.yaml');
export const listPhrases = () => fs.existsSync(PHRASES) ? fs.readdirSync(PHRASES).filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -5)) : [];
export function loadPhrase(name) {
  const f = path.join(PHRASES, name + '.yaml');
  if (!fs.existsSync(f)) fail(`no phrase "${name}" in library/choreo/phrases. Have: ${listPhrases().join(', ')}`);
  return readYaml(f);
}

/** The song's clock for a take: a constant grid from `tempo`, as the Greener takes were built (B seconds a beat, 3 decimals). */
export function grid(V) {
  const song = JSON.parse(fs.readFileSync(V.song, 'utf8'));
  const B = 60 / song.tempo, r = (x) => Math.round(x * 1000) / 1000, b = (n) => r(n * B);
  return { song, B, r, b, meter: song.meter ?? 4 };
}

/** "3:2" bar:beat inside the take (bar 1 beat 1 is 0), "10b", "2bars", a number of beats, or "word:baby" (a lyric; see lyricBeat). */
export function beatsOf(v, ctx) {
  if (typeof v === 'number') return v;
  const s = String(v).trim(), m = ctx.meter;
  let x;
  if ((x = /^(\d+):([0-9.]+)$/.exec(s))) return (+x[1] - 1) * m + (+x[2] - 1);
  if ((x = /^([0-9.]+)\s*bars?$/.exec(s))) return +x[1] * m;
  if ((x = /^([0-9.]+)\s*(b|beats?)?$/.exec(s))) return +x[1];
  if ((x = /^word:(.+?)(?:#(\d+))?$/.exec(s))) return ctx.lyricBeat(x[1], +(x[2] ?? 1));
  fail(`can't read the beat "${v}" (use 3:2, 10b, 2bars or word:baby)`);
}

// ---- the compiler ----

const fingers = (at, hand, set, extra = {}) => ({ at, do: 'fingers', hand, set, for: 0.08, ...extra });
/** Left arm to the lens, index out, from `at` to `off` (seconds in the take). x, y aim the upper arm. */
const pointOn = (r, at, off, x = 28, y = 22) => [
  { at: r(at - 0.12), do: 'layer', clip: 'Idle1PointOut', mask: 'leftArm', start: 0.38, speed: 1.3, once: 1, weight: 1, for: r(off - at), blend: 0.07 },
  { at: r(at - 0.11), do: 'pose', bones: { leftUpperArm: [x, y, 0], chest: [7, 0, 0], spine: [0, 0, 0], head: [-3, 0, 0] }, for: 0.16, ease: 'out', overshoot: 0.1, settle: '0.3s' },
  { at: r(off), do: 'pose', bones: { leftUpperArm: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0] }, for: 0.2, ease: 'inout' },
  fingers(r(at - 0.04), 'left', 0.8), fingers(r(at - 0.04), 'left', 0.03, { finger: 'index' }), fingers(r(at - 0.04), 'left', 0.7, { finger: 'thumb' }),
  fingers(r(off), 'left', 0.3, { for: 0.15 }), fingers(r(off), 'left', 0.3, { finger: 'index', for: 0.15 }), fingers(r(off), 'left', 0.3, { finger: 'thumb', for: 0.15 }),
];
/** A backbeat accent: hip out, chest against it, head level, a fast stop that settles. `anticipate` adds the small move the other way first. */
const pop = (g, beat, side, chin = 0, amp = 1, w = {}) => [
  { at: g.r(g.b(beat) - 0.07), do: 'pose', bones: { hips: [0, 0, 7 * side * amp], chest: [0, -7 * side * amp, -8 * side * amp], head: [chin, 0, 2 * side] }, for: 0.09, ease: 'out', ...(w.anticipate ? { anticipate: w.anticipate } : {}), overshoot: w.overshoot ?? 0.15, settle: w.settle ?? '0.22s' },
  { at: g.r(g.b(beat) + 0.2), do: 'pose', bones: { hips: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0] }, for: 0.16, ease: 'inout' },
];

/** Replaces "$x" (whole value, or inside a string) with params[x]; unknown names stay, they are the performance's own parameters. */
function substitute(x, params) {
  if (typeof x === 'string') {
    if (x.startsWith('$') && Object.prototype.hasOwnProperty.call(params, x.slice(1))) return params[x.slice(1)];
    return x.replace(/\$(\w+)/g, (m, k) => (Object.prototype.hasOwnProperty.call(params, k) && typeof params[k] !== 'object' ? String(params[k]) : m));
  }
  if (Array.isArray(x)) return x.map((y) => substitute(y, params));
  if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = substitute(x[k], params); return o; }
  return x;
}

/** A time in a phrase cue: "1.2b", "4b-0.07s", "-0.12s" (from the phrase start), or seconds as a number. `start` is the phrase's beat in the take. */
function timeAt(g, v, start) {
  if (typeof v === 'number') return v === 0 && start === 0 ? 0 : g.r(g.b(start) + v);
  const m = /^([+-]?[0-9.]+)?\s*b(?:eats?)?\s*(?:([+-][0-9.]+)\s*s)?$/.exec(String(v).trim()) ?? /^()([+-][0-9.]+)\s*s$/.exec(String(v).trim());
  if (!m) fail(`can't read the phrase time "${v}" (use 1.2b, 4b-0.07s or -0.12s)`);
  const beats = start + (m[1] ? +m[1] : 0);
  return m[2] ? g.r(g.b(beats) + +m[2]) : g.b(beats);
}
/** A length in a phrase cue: "4b" beats, "0.3s" or a number of seconds. */
function lengthOf(g, v) {
  if (typeof v === 'number') return v;
  const m = /^([0-9.]+)\s*(b|beats?|s|bars?)$/.exec(String(v).trim());
  if (!m) fail(`can't read the length "${v}" (use 4b, 1bar or 0.3s)`);
  return m[2] === 's' ? +m[1] : m[2].startsWith('bar') ? g.b(+m[1] * g.meter) : g.b(+m[1]);
}

/** Accents inside a phrase use or on the take: {pop: 3:2, side: 1, chin: -7, amp: 1, anticipate, overshoot, settle} or {point: 8:4, off: 9:1, x, y, aim: [x,y,z]}. */
function accents(g, list, ctx) {
  const out = [];
  for (const a of list ?? []) {
    if (a.pop !== undefined) out.push(...pop(g, beatsOf(a.pop, ctx), a.side ?? 1, a.chin ?? 0, a.amp ?? 1, a));
    else if (a.point !== undefined) {
      const at = g.b(beatsOf(a.point, ctx)), off = g.b(beatsOf(a.off ?? beatsOf(a.point, ctx) + 1, ctx));
      out.push(...pointOn(g.r, at, off, a.x ?? 28, a.y ?? 22));
      if (a.aim) out.push({ at: g.r(at - 0.14), do: 'reach', hand: a.hand ?? 'left', to: a.aim, for: 0.17, ease: 'out', lint: 'point' }, { at: g.r(off - 0.03), do: 'reach', hand: a.hand ?? 'left', weight: 0, for: 0.22, ease: 'inout' });
    } else fail(`an accent is {pop: <beat>, side: 1} or {point: <beat>, off: <beat>}; got ${JSON.stringify(a)}`);
  }
  return out;
}

/** One phrase's cues placed at `start` beats, with its parameters, its own accents, then the use's accents. */
function placePhrase(g, phrase, use, start, ctx, names) {
  const len = use.len !== undefined ? beatsOf(use.len, ctx) : phrase.len !== undefined ? beatsOf(phrase.len, ctx) : fail(`phrase "${use.phrase}" needs a len`);
  const params = { ...(phrase.params ?? {}), ...use, len: `${len}b` };
  if (use.root !== undefined) params.root = use.root;
  const out = [];
  const seg = use.segment ?? phrase.segment;   // {clip, start, stop, speed} or "clip@start-stop x speed": a bare segment is one anim
  if (seg) {
    const s = typeof seg === 'string' ? parseSegment(seg) : seg;
    out.push({ at: g.b(start), do: 'anim', clip: s.clip, ...(s.start !== undefined ? { start: s.start } : {}), ...(s.stop !== undefined ? { stop: s.stop } : {}), ...(s.speed !== undefined ? { speed: s.speed } : {}), ...(use.warpTo ? { warpTo: use.warpTo, maxRate: use.maxRate ?? 1.25 } : {}), ...(s.once ? { once: 1 } : {}), blend: use.blend ?? 0.15, for: g.b(len) });
  }
  for (const raw of phrase.cues ?? []) {
    const c = substitute(raw, params), o = {};
    for (const k in c) o[k] = k === 'at' ? timeAt(g, c[k], start) : k === 'for' || k === 'blend' && typeof c[k] === 'string' ? lengthOf(g, c[k]) : c[k];
    if (o.do === 'perform' && names) names.add(o.name);
    out.push(o);
  }
  for (const m of use.masks ?? []) out.push({ at: g.b(start), do: 'layer', clip: m.clip, mask: m.mask ?? 'upper', ...(m.start !== undefined ? { start: m.start } : {}), ...(m.speed !== undefined ? { speed: m.speed } : {}), ...(m.additive ? { additive: 1 } : {}), weight: m.weight ?? 1, for: g.b(m.len !== undefined ? beatsOf(m.len, ctx) : len), blend: m.blend ?? 0.15 });
  if (use.root !== undefined && !phrase.cues?.some((c) => c.do === 'move')) out.push({ at: g.b(start + (use.rootFrom ?? 0)), do: 'move', pos: use.root, rel: 1, for: g.b(use.rootFor !== undefined ? beatsOf(use.rootFor, ctx) : len), ease: 'inout', lint: 'slide' });
  out.push(...accents(g, phrase.accents?.map((a) => shiftAccent(a, start, ctx)), ctx));
  out.push(...accents(g, use.accents, ctx));
  return { cues: out, len };
}
const shiftAccent = (a, start, ctx) => { const o = { ...a }; for (const k of ['pop', 'point', 'off']) if (o[k] !== undefined) o[k] = start + beatsOf(o[k], ctx); return o; };
export function parseSegment(s) {
  const m = /^([\w-]+)(?:@([0-9.]+)(?:-([0-9.]+))?)?(?:\s*x\s*([0-9.]+))?(\s+once)?$/.exec(String(s).trim());
  if (!m) fail(`a segment is "clip@start-stop x speed", got "${s}"`);
  return { clip: m[1], ...(m[2] ? { start: +m[2] } : {}), ...(m[3] ? { stop: +m[3] } : {}), ...(m[4] ? { speed: +m[4] } : {}), ...(m[5] ? { once: 1 } : {}) };
}

/** The lyric words of the take's window, for word:<w> times. */
function lyricsFor(V, t0, len) {
  let words = [];
  try { for (const l of JSON.parse(fs.readFileSync(path.join(V.dir, 'lyrics.json'), 'utf8')).lines) for (const w of l.words ?? []) if (w.t >= t0 - 0.5 && w.t <= t0 + len + 0.5) words.push(w); } catch {}
  return words;
}

/** The compiled performance for a take or a hook phrase: the object the library file holds, plus the hooks it calls. */
export function compileTake(V, take, name, g = grid(V)) {
  const meter = g.meter, hooks = new Map();
  const lenBeats = take.length !== undefined ? beatsOf(take.length, { meter }) : fail(`${name}: needs length (beats)`);
  const t0 = songStart(V, take, name, g);
  const words = lyricsFor(V, t0, lenBeats * g.B);
  const ctx = { meter, lyricBeat: (w, n) => { const hits = words.filter((x) => x.w.toLowerCase().replace(/[^a-z']/g, '') === w.toLowerCase()); if (hits.length < n) fail(`${name}: no lyric word "${w}" (#${n}) between ${t0.toFixed(2)} s and ${(t0 + lenBeats * g.B).toFixed(2)} s`); return (hits[n - 1].t - t0) / g.B; } };
  const cues = [];
  if (take.head !== false) cues.push({ at: 0, do: 'stance', arms: 0, legs: 0, for: 0.3, ease: 'inout' }, { at: 0, do: 'gaze', toRel: [0, 1.55, 6], for: 0.3 }, fingers(0, 'left', 0.3, { for: 0.2 }), fingers(0, 'right', 0.3, { for: 0.2 }));
  if (take.overlap) { const o = take.overlap; cues.push({ at: 0, do: 'overlap', amount: o.amount ?? 0.5, head: o.head ?? 0.4, arms: o.arms ?? 0.7, hands: o.hands ?? 1, for: 0.2 }); }
  const names = new Set();
  let cursor = 0;
  for (const use of take.phrases ?? []) {
    const start = use.at !== undefined ? beatsOf(use.at, ctx) : cursor;
    if (use.hook !== undefined) {
      const ph = loadPhrase(use.hook);
      if (!ph.performance) fail(`phrase "${use.hook}" is used as a hook but has no "performance" name`);
      hooks.set(ph.performance, ph);
      cues.push({ at: g.b(start), do: 'perform', name: ph.performance });
      cues.push(...accents(g, use.accents, ctx));
      cursor = start + beatsOf(use.len ?? ph.len ?? 8, ctx);
    } else if (use.phrase !== undefined || use.segment !== undefined) {
      const ph = use.phrase !== undefined ? loadPhrase(use.phrase) : { len: use.len };
      const { cues: c, len } = placePhrase(g, ph, use, start, ctx, names);
      cues.push(...c); cursor = start + len;
    } else if (use.accents) { cues.push(...accents(g, use.accents, ctx)); }
    else fail(`${name}: a phrase line needs phrase:, segment: or hook:; got ${JSON.stringify(use)}`);
  }
  cues.push(...accents(g, take.accents, ctx));
  const perf = { name, about: take.about ?? '', entry: take.entry ?? 'stand', exit: take.exit ?? 'stand', length: g.b(lenBeats) + 's', min: g.b(take.min !== undefined ? beatsOf(take.min, ctx) : lenBeats) + 's', params: take.params ?? {}, cues, test: take.test ?? { tail: 0.3 } };
  return { perf, hooks, lenBeats, t0 };
}

/** A hook phrase as its own performance: the file `perform` names, so it repeats. */
export function compileHook(V, ph, g = grid(V)) {
  const ctx = { meter: g.meter, lyricBeat: () => fail('a hook phrase has no song position: use beats') };
  const { cues, len } = placePhrase(g, ph, { phrase: ph.performance }, 0, ctx);
  return { name: ph.performance, about: ph.about ?? '', entry: ph.entry ?? 'stand', exit: ph.exit ?? 'stand', length: g.b(len) + 's', min: g.b(len) + 's', params: ph.params ?? {}, cues, test: ph.test ?? { tail: 0.3 } };
}

export const text = (perf) => JSON.stringify(perf, null, 1);

// ---- where the take sits in the song ----

/** The card's perform cue for this take, with the actor's mark: `acts/50-cards.json`, as bake.mjs reads it. */
export function cardUse(V, name) {
  const f = path.join(V.acts, '50-cards.json');
  if (!fs.existsSync(f)) return null;
  const cues = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '')).cues;
  let pos = null, rot = null;
  for (const c of cues) {
    if (c.on !== 'person') continue;
    if (c.do === 'set') { pos = c.pos ?? pos; rot = c.rot ?? rot; }
    if (c.do === 'perform' && c.name === name) { const { on: _o, ...cue } = c; return { cue, pos: pos ?? [500, 0, 500], rot: rot ?? [0, 0, 0], cut: cues.some((x) => x.shot && x.at === c.at) }; }
  }
  return null;
}
/** Seconds in the song where the take's time 0 falls: the card's perform minus its lead, else the take's own `at`. */
export function songStart(V, take, name, g = grid(V)) {
  const clock = loadClock(V, loadScore(V).score);
  const use = cardUse(V, name);
  if (use) return clock.T(use.cue.at) - (use.cue.lead ? clock.beatsOf(use.cue.lead) * g.B : 0);
  if (take.at !== undefined) return clock.T(take.at);
  return 0;
}

// ---- the commands ----

function writeIfChanged(file, body) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (old === body) return 'unchanged';
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); return old === null ? 'new' : 'changed';
}

export function build(V, name, flags = {}) {
  const take = readYaml(takeFile(V, name)), g = grid(V);
  const { perf, hooks, lenBeats, t0 } = compileTake(V, take, name, g);
  const results = [];
  for (const [hname, ph] of hooks) { const h = compileHook(V, ph, g); results.push({ file: hname, state: flags.dry ? (fs.existsSync(path.join(PERF, hname + '.json')) && fs.readFileSync(path.join(PERF, hname + '.json'), 'utf8') === text(h) ? 'unchanged' : 'would change') : writeIfChanged(path.join(PERF, hname + '.json'), text(h)), cues: h.cues.length }); }
  const body = text(perf);
  results.push({ file: name, state: flags.dry ? (fs.existsSync(path.join(PERF, name + '.json')) && fs.readFileSync(path.join(PERF, name + '.json'), 'utf8') === body ? 'unchanged' : 'would change') : writeIfChanged(path.join(PERF, name + '.json'), body), cues: perf.cues.length });
  const out = { take: name, length: `${lenBeats}b = ${perf.length}`, songStart: +t0.toFixed(3), lines: fs.readFileSync(takeFile(V, name), 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).length, files: results };
  if (flags.dry) return out;
  const stale = results.some((r) => r.state !== 'unchanged');
  const use = cardUse(V, name);
  if (!use) { out.bake = 'skipped: no card performs this take yet, so there is no place in the song to bake it at (bake.mjs bakes uses)'; }
  else if (!stale && !flags.force && bakeEntry(V, name, use)) { out.bake = 'kept: the text is unchanged, so the bake key is the same and the bake stands'; }
  else {
    const r = spawnSync('node', [path.join(DIRECTOR, 'tools', 'bake.mjs'), name, '--video', V.name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
    if (r.status !== 0) fail(`bake failed:\n${(r.stderr || r.stdout).slice(-2000)}`);
    out.bake = r.stdout.trim().split('\n').pop();
  }
  const e = bakeEntry(V, name, use);
  if (e) out.report = reportLine(V, name, e);
  return out;
}

/** gen/bake/report.json's entry for this take at its card time. */
export function bakeEntry(V, name, use = cardUse(V, name)) {
  const f = path.join(DIRECTOR, 'gen', 'bake', 'report.json');
  if (!fs.existsSync(f) || !use) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'))[`b_${name}_${String(use.cue.at).replace(/\W/g, '_')}`] ?? null;
}
/** One line per build in videos/<v>/choreo/report.md. */
function reportLine(V, name, e) {
  const f = path.join(V.dir, 'choreo', 'report.md'), A = e.after, bk = e.key;
  const line = `| ${new Date().toISOString().slice(0, 16).replace('T', ' ')} | ${name} | ${e.at} | ${bk} | ${A.snaps} | ${A.jerk} | ${A.elbowFlip + A.kneeFlip} | ${A.ankleOver} | ${A.max.plantedTravelM.toFixed(2)} | ${JSON.stringify(e.sharp ? Object.fromEntries(Object.entries(e.sharp).map(([k, v]) => [k, v.stops])) : {}).replace(/"/g, '')} |`;
  if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, `# ${V.name}: choreo builds\n\nOne line per \`mv choreo build\`, from the bake's after numbers (gen/bake/report.json). Hand stops are hard stops per hand from the sharpness pass.\n\n| when | take | at | bake key | snaps | accel spikes | flips | ankle over | foot travel m | hand stops |\n|---|---|---|---|---|---|---|---|---|---|\n`); }
  fs.appendFileSync(f, line + '\n');
  return line;
}

/** The lab job that plays the take where its card plays it (or far off, if no card does). */
function labJob(V, name, take, extra = {}) {
  const g = grid(V), use = cardUse(V, name), lenBeats = beatsOf(take.length, { meter: g.meter });
  // The take's time 0 is songStart; a card's `lead` joins it late, so the lab (and the song slice) start where the card's perform fires.
  const start0 = songStart(V, take, name, g), tail = +(extra.tail ?? take.test?.tail ?? 0.3);
  const clock = loadClock(V, loadScore(V).score);
  const t0 = use ? clock.T(use.cue.at) : start0, len = lenBeats * g.B - (t0 - start0);
  const cue = use ? { ...use.cue, on: 'person' } : { at: t0, do: 'perform', on: 'person', name, for: g.b(lenBeats) };
  const pos = use ? use.pos : [500, 0, 500], rot = use ? use.rot : [0, 0, 0];
  return { job: { on: 'person', actors: { person: { model: 'person', pos, rot } }, cues: [cue], from: t0, to: t0 + len + tail, every: 1, cols: 40, cell: 30, panel: 30, sheet: `choreo_${name}.png`, ...extra.job }, t0, len, pos };
}
function lab(V, job) {
  const f = path.join(DIRECTOR, 'gen', `choreo_lab_${process.pid}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(job));
  try {
    const r = spawnSync('node', [MV, '--video', V.name, 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
    if (r.status !== 0) fail(`mv lab failed:\n${(r.stderr || r.stdout).slice(-2000)}`);
    return JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  } finally { try { fs.unlinkSync(f); } catch {} }
}

export function play(V, name, flags = {}) {
  const take = readYaml(takeFile(V, name));
  const views = (flags.views ?? 'front,three').split(','), h = +(flags.h ?? 480), w = +(flags.w ?? Math.round(h * 0.75));
  const outDir = path.join(V.dir, 'choreo', 'out'); fs.mkdirSync(outDir, { recursive: true });
  const base = `videos/${V.name}/choreo/out/${name}`;
  const { job, t0, len } = labJob(V, name, take, { tail: flags.tail, job: { render: { out: base, views, w, h, dist: +(flags.dist ?? 4.6), lookY: +(flags.lookY ?? 0.95) } } });
  const res = lab(V, job);
  const parts = views.map((v) => path.join(DIRECTOR, `${base}_${v}.mp4`)).filter((f) => fs.existsSync(f));
  if (!parts.length) fail(`the lab wrote no video: ${JSON.stringify(res.render ?? res).slice(0, 500)}`);
  const mp4 = path.join(outDir, `${name}.mp4`), song = ['mp3', 'wav', 'm4a', 'ogg'].map((e) => path.join(V.dir, 'audio.' + e)).find((f) => fs.existsSync(f));
  const args = ['-y', '-v', 'error', ...parts.flatMap((p) => ['-i', p])];
  const withSong = flags.song !== false && song;
  if (withSong) args.push('-ss', t0.toFixed(3), '-t', (len + +(flags.tail ?? 0.3)).toFixed(3), '-i', song);
  const fc = parts.length > 1 ? `hstack=inputs=${parts.length}[v]` : '[0:v]copy[v]';
  args.push('-filter_complex', fc, '-map', '[v]', ...(withSong ? ['-map', `${parts.length}:a`, '-c:a', 'aac', '-b:a', '160k', '-shortest'] : []), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', mp4);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const out = { mp4, seconds: +(len).toFixed(2), song: withSong ? `${t0.toFixed(2)}-${(t0 + len).toFixed(2)} s of ${path.basename(song)}` : 'none', views, pops: res.popCount, feet: res.feet, hipsTravel: res.hipsTravel, reverse: res.reverseWorstMetres, warnings: res.warnings };
  if (flags.strip) {
    // every frame of the first view at 30 fps, one second a row, so a two-frame snap shows as a jump between neighbours.
    const rows = Math.ceil((len + 0.3) * 30 / 30), strip = path.join(outDir, `${name}_strip.png`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', parts[0], '-vf', `scale=-2:120,tile=30x${rows}:padding=1:color=black`, '-frames:v', '1', strip], { stdio: ['ignore', 'ignore', 'pipe'] });
    out.strip = strip;
  }
  return out;
}

const GATES = { snaps: 5, spikes: 0, flips: 0, footTravel: 2.0, worstGapBeats: 4.5, landMs: 70, landShare: 0.6 };

export function check(V, name, flags = {}) {
  const take = readYaml(takeFile(V, name)), g = grid(V);
  const { perf, lenBeats, t0 } = compileTake(V, take, name, g);
  const gates = { ...GATES, ...(take.gates ?? {}) }, fails = [], notes = [];
  const beatOf = (t) => t / g.B;
  // Accents per bar: the hip pops and points, from the compiled cues (a pose with overshoot is an accent).
  const accentTimes = perf.cues.filter((c) => c.do === 'pose' && c.overshoot !== undefined).map((c) => c.at);
  const bars = Math.ceil(lenBeats / g.meter), perBar = Array.from({ length: bars }, () => 0);
  for (const t of accentTimes) { const i = Math.min(bars - 1, Math.floor(beatOf(t) / g.meter)); perBar[i]++; }
  // Hooks count as accents on their point: read their file.
  for (const c of perf.cues.filter((c) => c.do === 'perform')) { try { const h = JSON.parse(fs.readFileSync(path.join(PERF, c.name + '.json'), 'utf8')); for (const x of h.cues.filter((x) => x.do === 'pose' && x.overshoot !== undefined)) { const i = Math.min(bars - 1, Math.floor(beatOf(c.at + x.at) / g.meter)); perBar[i]++; } } catch {} }
  const quiet = perBar.map((n, i) => (n === 0 ? i + 1 : null)).filter((x) => x !== null);
  // Worst gap: the longest stretch with nothing new starting (anim, layer, move, pose), hooks unrolled.
  const flat = []; for (const c of perf.cues) { if (c.do === 'perform') { try { for (const x of JSON.parse(fs.readFileSync(path.join(PERF, c.name + '.json'), 'utf8')).cues) flat.push({ ...x, at: c.at + x.at, via: c.name }); } catch { flat.push(c); } } else flat.push(c); }
  const starts = [...new Set(flat.filter((c) => ['anim', 'layer', 'move', 'pose'].includes(c.do)).map((c) => c.at))].sort((a, b) => a - b);
  let worstGap = 0, gapAt = 0; for (let i = 1; i < starts.length; i++) if (starts[i] - starts[i - 1] > worstGap) { worstGap = starts[i] - starts[i - 1]; gapAt = starts[i - 1]; }
  const end = g.b(lenBeats); if (starts.length && end - starts.at(-1) > worstGap) { worstGap = end - starts.at(-1); gapAt = starts.at(-1); }
  // Longest hold: a once clip's length, or the longest span a single anim plays.
  const anims = flat.filter((c) => c.do === 'anim').sort((a, b) => a.at - b.at);
  let hold = 0, holdClip = ''; for (let i = 0; i < anims.length; i++) { const next = anims[i + 1]?.at ?? end, span = Math.min(anims[i].for ?? Infinity, next - anims[i].at); if (span > hold) { hold = span; holdClip = `${anims[i].clip}${anims[i].via ? ` (${anims[i].via})` : ''}${anims[i].once ? ' once' : ''}`; } }
  // Travel from the move cues, with the take's parameters.
  const params = perf.params ?? {}, num = (x) => (typeof x === 'string' && x.startsWith('$') ? +params[x.slice(1)] || 0 : +x || 0);
  let travel = 0; const endPos = [0, 0, 0];
  for (const c of perf.cues.filter((c) => c.do === 'move' && c.rel)) { const p = c.pos.map(num); travel += Math.hypot(p[0], p[2]); for (let i = 0; i < 3; i++) endPos[i] += p[i]; }
  const res = { take: name, bars, length: `${lenBeats}b = ${end}s`, songStart: +t0.toFixed(3), accentsPerBar: perBar, quietBars: quiet, worstGap: { beats: +beatOf(worstGap).toFixed(2), atBeat: +beatOf(gapAt).toFixed(2) }, longestHold: { beats: +beatOf(hold).toFixed(2), clip: holdClip }, travel: { moveMetres: +travel.toFixed(2), moveEndRel: endPos.map((x) => +x.toFixed(2)), note: 'from the move cues only; root-motion clips add their own travel, so the lab hipsStart/hipsEnd below is the truth' } };
  if (beatOf(worstGap) > gates.worstGapBeats) fails.push(`worst gap ${beatOf(worstGap).toFixed(1)} beats at beat ${beatOf(gapAt).toFixed(1)} (gate ${gates.worstGapBeats})`);
  if (quiet.length > Math.ceil(bars / 3)) notes.push(`${quiet.length} of ${bars} bars have no accent: ${quiet.join(', ')}`);
  // The bake's numbers, from the last bake of this take at its card time.
  const e = bakeEntry(V, name);
  if (e) {
    const A = e.after; res.bake = { key: e.key, snaps: A.snaps, spikes: A.jerk, flips: A.elbowFlip + A.kneeFlip, ankleOver: A.ankleOver, footTravel: +A.max.plantedTravelM.toFixed(2), handStops: e.sharp ? Object.fromEntries(Object.entries(e.sharp).map(([k, v]) => [k, v.stops])) : undefined };
    if (A.snaps > gates.snaps) fails.push(`bake snaps ${A.snaps} > ${gates.snaps}`);
    if (A.jerk > gates.spikes) fails.push(`bake accel spikes ${A.jerk} > ${gates.spikes}`);
    if (A.elbowFlip + A.kneeFlip > gates.flips) fails.push(`bake flips ${A.elbowFlip + A.kneeFlip} > ${gates.flips}`);
    if (A.max.plantedTravelM > gates.footTravel) fails.push(`bake foot travel ${A.max.plantedTravelM.toFixed(2)} m > ${gates.footTravel}`);
    const cur = fs.existsSync(path.join(PERF, name + '.json')) ? fs.readFileSync(path.join(PERF, name + '.json'), 'utf8') : null;
    if (cur !== text(perf)) notes.push('the choreo file differs from the performance in the library: the bake numbers are for the library one. mv choreo build first');
  } else notes.push('no bake yet for this take at its card time: mv choreo build');
  // Beat landing, from the body as it really moves in the lab: motion beats against the song's beats.
  if (!flags.static) {
    const clock = loadClock(V, loadScore(V).score);
    // The body's positions at 60 Hz (the lab's probe), and the motion beats read off them here: the lab's own motionBeats normalises over the whole run, so a 20 s take with one big travel gives none.
    const HZ = 60, lj = labJob(V, name, take, { job: { probeBones: POINTS } }), { len } = lj, t0 = lj.t0;
    const n = Math.floor(len * HZ); lj.job.probe = Array.from({ length: n + 1 }, (_, i) => +(t0 + i / HZ).toFixed(4));
    const r = lab(V, lj.job);
    const rows = (r.probe ?? []).map((row) => POINTS.map((k) => vec(row[k])));
    const mbs = motionBeats(rows, HZ, g.B * g.meter * 2).map((x) => ({ t: +(t0 + x.i / HZ).toFixed(3), s: +x.s.toFixed(2) }));
    if (flags.raw) res.labRaw = Object.fromEntries(Object.entries(r).filter(([k]) => !['sheet', 'pops', 'probe'].includes(k)));
    const mb = mbs.map((x) => x.t);
    const dist = mb.map((t) => { const b = clock.beatAt(t), d = Math.abs(b - Math.round(b)) * g.B; return d; });
    const within = dist.filter((d) => d <= gates.landMs / 1000).length, half = mb.map((t) => { const b = clock.beatAt(t) * 2; return Math.abs(b - Math.round(b)) * g.B / 2; });
    res.landing = { motionBeats: mb.length, beats: mbs.map((x) => `${clock.label(x.t)} ${x.s}`).join(' '), meanOffMs: dist.length ? Math.round(dist.reduce((a, b) => a + b, 0) / dist.length * 1000) : null, within: `${within}/${mb.length} within ${gates.landMs} ms of a beat`, within8ths: `${half.filter((d) => d <= gates.landMs / 1000).length}/${mb.length} within ${gates.landMs} ms of an eighth`, perBeat: +(mb.length / lenBeats).toFixed(2), pops: r.popCount, feet: r.feet, hipsTravel: r.hipsTravel, reverse: r.reverseWorstMetres, fresh: r.shuffledFreshWorstMetres, warnings: r.warnings };
    if (rows.length > 1) { const p = [rows[0][2], rows.at(-1)[2]]; res.landing.hipsStart = p[0]; res.landing.hipsEnd = p[1]; res.landing.endOffMarkM = +Math.hypot(p[1][0] - p[0][0], p[1][2] - p[0][2]).toFixed(2); }
    if (mb.length && within / mb.length < gates.landShare) fails.push(`beat landing ${within}/${mb.length} within ${gates.landMs} ms (gate ${Math.round(gates.landShare * 100)}%)`);
  } else notes.push('static: no lab run, so no beat landing (drop --static for it)');
  res.gates = gates; res.notes = notes; res.fails = fails; res.pass = fails.length === 0;
  return res;
}
const len0 = (beats, g) => beats * g.B;
const POINTS = ['leftHand', 'rightHand', 'hips', 'leftFoot', 'rightFoot', 'head'], WEIGHTS = [1, 1, 1, .7, .7, .6];
const vec = (s) => String(s ?? '').replace(/[()\s]/g, '').split(',').map(Number);
/** MotionBeats.Detect (MotionWarp.cs) in Node, on the lab's probe: a beat is a dip in body speed (hands, feet, head about the hips) with a real rise on both sides within 0.28 s; the dip is measured against the range of speeds in a window of `win` seconds around it, not the whole take. */
export function motionBeats(rows, hz, win = 3.5) {
  const n = rows.length - 1; if (n < 5) return [];
  const raw = new Array(n);
  for (let i = 0; i < n; i++) { let sp = 0; for (let k = 0; k < POINTS.length; k++) { if (k === 2) continue; const a = rows[i][k].map((x, j) => x - rows[i][2][j]), b = rows[i + 1][k].map((x, j) => x - rows[i + 1][2][j]); sp += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * WEIGHTS[k]; } const h = rows[i + 1][2].map((x, j) => x - rows[i][2][j]); sp += Math.hypot(...h) * WEIGHTS[2]; raw[i] = sp * hz; }
  const v = raw.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 1); j <= Math.min(n - 1, i + 1); j++) { s += raw[j]; c++; } return s / c; });
  const reach = Math.round(.28 * hz), half = Math.round(win * hz / 2), all = [];
  for (let i = 2; i + 2 < n; i++) {
    if (v[i] > v[i - 1] || v[i] > v[i + 1]) continue;
    let lo = Infinity, hi = -Infinity; for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) { lo = Math.min(lo, v[j]); hi = Math.max(hi, v[j]); }
    const span = Math.max(hi - lo, 1e-3);
    let l = v[i], r = v[i];
    for (let j = Math.max(0, i - reach); j < i; j++) l = Math.max(l, v[j]);
    for (let j = i + 1; j <= Math.min(n - 1, i + reach); j++) r = Math.max(r, v[j]);
    const s = (Math.min(l, r) - v[i]) / span;
    if (s >= .22) all.push({ i, s });
  }
  const gap = Math.round(.16 * hz), keep = [];
  for (const x of all.sort((a, b) => b.s - a.s)) if (keep.every((k) => Math.abs(k.i - x.i) >= gap)) keep.push(x);
  return keep.sort((a, b) => a.i - b.i);
}

/** A clip's motion beats and the 1-4 bar segments that land on the grid, from library/motion/clips.json when it exists, else library/clips.json. */
export function segments(V, clip, flags = {}) {
  const g = grid(V);
  const motionLib = path.join(DIRECTOR, 'library', 'motion', 'clips.json'), lib = path.join(DIRECTOR, 'library', 'clips.json');
  const src = fs.existsSync(motionLib) ? motionLib : lib;
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  const clips = data.clips ?? data;
  const e = Array.isArray(clips) ? clips.find((c) => c.name === clip || c.clip === clip) : clips[clip];
  if (!e) fail(`no clip "${clip}" in ${path.relative(DIRECTOR, src)}. Close: ${Object.keys(Array.isArray(clips) ? {} : clips).filter((k) => k.includes(clip.split('_')[0] ?? clip)).slice(0, 12).join(', ')}`);
  const beats = e.motionBeats ?? e.beats ?? [], strength = e.beatStrength ?? [], length = e.length, tempo = e.tempoBeat;
  const out = { clip, from: path.relative(DIRECTOR, src).replace(/\\/g, '/'), status: e.status, tags: e.tags, length, loop: e.loop, tempoBeat: tempo, motionBeats: beats.map((t, i) => `${t.toFixed(2)}${strength[i] ? ` (${strength[i]})` : ''}`), notes: e.notes, segments: [] };
  if (e.segments) out.librarySegments = e.segments;   // a motion library that already names them
  if (!beats.length || !length) { out.segments = 'no motion beats measured for this clip'; return out; }
  // Speeds that put the clip's own pulse on the song's beat: the pulse as a beat, as two beats, as half a beat.
  const speeds = new Set(flags.speed ? [+flags.speed] : []);
  if (tempo) for (const k of [1, 2, 0.5]) { const s = tempo * k / g.B; if (s >= 0.6 && s <= 1.6) speeds.add(+s.toFixed(2)); }
  if (!speeds.size) speeds.add(1);
  const [b0, b1] = (flags.bars ?? '1-4').split('-').map(Number);
  const cands = [];
  for (const speed of speeds) for (let bars = b0; bars <= (b1 || b0); bars++) {
    const span = bars * g.meter * g.B * speed;   // clip seconds a segment of that many bars takes at this speed
    const starts = [0, ...beats].filter((s) => s + span <= length + 0.05);
    for (const start of starts) {
      const stop = Math.min(length, start + span), inside = beats.filter((t) => t >= start - 0.02 && t < stop);
      let land = 0; for (const t of inside) { const q = (t - start) / (g.B * speed); if (Math.abs(q - Math.round(q)) <= 0.15) land++; }
      const n = bars * g.meter;
      cands.push({ start: +start.toFixed(2), stop: +stop.toFixed(2), speed, bars, beatsInside: inside.length, landOnGrid: land, density: +(inside.length / n).toFixed(2), score: +(land / n + inside.length / n * 0.25).toFixed(2), segment: `${clip}@${start.toFixed(2)}-${stop.toFixed(2)} x ${speed}` });
    }
  }
  cands.sort((a, b) => b.score - a.score || a.start - b.start);
  const seen = new Set(); out.segments = cands.filter((c) => { const k = `${c.bars}:${Math.round(c.start * 2)}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, +(flags.top ?? 8));
  out.how = 'segment: "clip@start-stop x speed" on a phrase line. landOnGrid is how many of the clip\'s motion beats fall on a song beat at that speed. The library grades (moves.md) beat these numbers: watch it.';
  return out;
}

/** The proof: greener's dance_chorus and dance_hook from choreo files are byte for byte the library takes. */
export function test(V) {
  const g = grid(V), name = 'dance_chorus';
  const take = readYaml(takeFile(V, name));
  const { perf, hooks } = compileTake(V, take, name, g);
  const same = (f, body) => { const cur = fs.readFileSync(path.join(PERF, f + '.json'), 'utf8'); if (cur === body) return { file: f, identical: true, bytes: body.length }; let i = 0; while (i < cur.length && cur[i] === body[i]) i++; return { file: f, identical: false, firstDifferenceAt: i, library: cur.slice(i, i + 160), choreo: body.slice(i, i + 160) }; };
  const r = [same(name, text(perf))];
  for (const [hname, ph] of hooks) r.push(same(hname, text(compileHook(V, ph, g))));
  const key = bakeKey(name, 0, 0);
  const bakes = fs.existsSync(path.join(PERF, 'baked')) ? fs.readdirSync(path.join(PERF, 'baked')).filter((f) => new RegExp('^' + name + '_[0-9a-f]{10}.json$').test(f)) : [];
  return { results: r, pass: r.every((x) => x.identical), bakesInLibrary: bakes, note: 'The bake key hashes the performance text (MVBake.cs BakeKey), so identical text keeps the bake and its numbers.', textHashPrefix: key };
}
/** The text part of MVBake.cs's key, for the record (the real key adds parameters, time and length). */
function bakeKey(file, t, len) {
  const perfText = (f, seen) => { if (seen.has(f)) return ''; seen.add(f); const p = path.join(PERF, f + '.json'); if (!fs.existsSync(p)) return ''; let s = fs.readFileSync(p, 'utf8').replace(/\r/g, ''); for (const m of s.matchAll(/"do"\s*:\s*"perform"[^{}]*?"name"\s*:\s*"([\w-]+)"/g)) s += perfText(m[1], seen); return s; };
  const s = perfText(file, new Set()); let h = 14695981039346656037n;
  for (const ch of s) { h ^= BigInt(ch.charCodeAt(0)); h = (h * 1099511628211n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0').slice(0, 10);
}

export async function run(pos, flags, V) {
  const [sub, arg] = pos;
  const print = (o) => console.log(JSON.stringify(o, null, 1));
  switch (sub) {
    case 'build': if (!arg) fail('mv choreo build <take>'); print(build(V, arg, flags)); break;
    case 'play': if (!arg) fail('mv choreo play <take> [--views front,three --strip]'); print(play(V, arg, flags)); break;
    case 'check': { if (!arg) fail('mv choreo check <take> [--static]'); const r = check(V, arg, flags); print(r); if (!r.pass) process.exitCode = 1; break; }
    case 'segments': if (!arg) fail('mv choreo segments <clip> [--bars 1-4 --speed 1.2 --top 8]'); print(segments(V, arg, flags)); break;
    case 'test': { const r = test(V); print(r); if (!r.pass) process.exitCode = 1; break; }
    case 'phrases': print(listPhrases().map((n) => { const p = loadPhrase(n); return { name: n, kind: p.kind, len: p.len, performance: p.performance, about: p.about }; })); break;
    default: console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 7).join('\n'));
  }
}
