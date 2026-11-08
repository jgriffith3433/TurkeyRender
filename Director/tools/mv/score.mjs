// The score as Node sees it: which video, its files, and every cue expanded the way ScoreCompiler.cs expands it,
// with file and line kept. No Unity. Used by mv lint, mv shots and mv shot.
import fs from 'node:fs';
import path from 'node:path';
import { parse, where } from './jsonc.mjs';

export const DIRECTOR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
export const PROJECT = path.dirname(DIRECTOR);
export const DEFAULT_VIDEO = 'tkshock';

/** TK Shock lives at the top of Director/ and in Assets/MusicVideo, where it always has. Every other video has its own folders. */
export function videoInfo(name) {
  const legacy = name === DEFAULT_VIDEO && !fs.existsSync(path.join(DIRECTOR, 'videos', DEFAULT_VIDEO, 'score.json'));
  const dir = legacy ? DIRECTOR : path.join(DIRECTOR, 'videos', name);
  const assets = legacy ? null : `Assets/Videos/${name}`;
  return {
    name, legacy, dir,
    score: path.join(dir, 'score.json'), acts: path.join(dir, 'acts'), song: path.join(dir, 'song.json'), marks: path.join(dir, 'marks.json'),
    captures: path.join(dir, 'captures'), output: path.join(dir, 'output'),
    shots: path.join(DIRECTOR, 'videos', name, 'shots'),
    scene: legacy ? 'Assets/Scenes/MusicVideo.unity' : `${assets}/${name}.unity`,
    gen: legacy ? 'Assets/MusicVideo/Generated' : `${assets}/Generated`,
    assets,
  };
}

/** --video, else Director/current-video, else tkshock. */
export function pickVideo(flag) {
  let name = flag;
  if (!name) { try { name = fs.readFileSync(path.join(DIRECTOR, 'current-video'), 'utf8').trim(); } catch {} }
  name ||= DEFAULT_VIDEO;
  const v = videoInfo(name);
  if (!fs.existsSync(v.score)) throw new Error(`no video called "${name}". Director/videos/ has: ${listVideos().join(', ')}. Make one with mv new <name> --song <file>`);
  return v;
}

export function listVideos() {
  const d = path.join(DIRECTOR, 'videos');
  const named = fs.existsSync(d) ? fs.readdirSync(d).filter((n) => fs.existsSync(path.join(d, n, 'score.json'))) : [];
  return [...new Set([DEFAULT_VIDEO, ...named])];
}

// ---- the song clock: SongMap.cs in Node ----

export class Clock {
  constructor(song, marks, sections) {
    this.song = song; this.beats = song.beats; this.meter = song.meter; this.phase = song.downbeatPhase; this.duration = song.duration;
    this.marks = marks ?? []; this.sections = { ...(sections ?? {}) };
    for (const s of song.sections ?? []) this.sections[s.name] = s.t;
    const b = this.beats; this.ibi = b.length > 1 ? (b[b.length - 1] - b[0]) / (b.length - 1) : 0.5;
  }
  beatAt(t) {
    const b = this.beats, n = b.length;
    if (n < 2) return t / 0.5;
    if (t <= b[0]) return (t - b[0]) / this.ibi;
    if (t >= b[n - 1]) return n - 1 + (t - b[n - 1]) / this.ibi;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
    return lo + (t - b[lo]) / (b[hi] - b[lo]);
  }
  timeOf(beat) {
    const b = this.beats, n = b.length;
    if (n < 2) return beat * 0.5;
    if (beat <= 0) return b[0] + beat * this.ibi;
    if (beat >= n - 1) return b[n - 1] + (beat - (n - 1)) * this.ibi;
    const i = Math.floor(beat);
    return b[i] + (beat - i) * (b[i + 1] - b[i]);
  }
  beatOfBar(bar, beat) { return this.phase + (bar - 1) * this.meter + (beat - 1); }
  label(t) {
    const q = this.beatAt(t) - this.phase, bar = Math.floor(q / this.meter) + 1;
    return `${bar}:${(q - (bar - 1) * this.meter + 1).toFixed(2).replace(/\.?0+$/, '')}`;
  }
  /** "12:3", "12", "41.2s", "m3", a section, any of them + an offset, or "+1b" after prev. Throws the compiler's own words. */
  T(v, prev = 0) {
    if (v === undefined || v === null) return prev;
    if (typeof v === 'number') return v;
    const m = /^([^+\-]*)([+\-].*)?$/.exec(String(v).trim());
    const b = (m?.[1] ?? '').trim(), off = (m?.[2] ?? '').trim();
    let t = prev, x;
    if (b.length) {
      if ((x = /^(\d+):([0-9.]+)$/.exec(b))) t = this.timeOf(this.beatOfBar(+x[1], +x[2]));
      else if (/^\d+$/.test(b)) t = this.timeOf(this.beatOfBar(+b, 1));
      else if (/^[0-9.]+s$/.test(b)) t = parseFloat(b);
      else if (/^m\d+$/.test(b)) { const mk = this.marks.find((k) => k.id == b.slice(1)); if (!mk) throw new Error(`no mark ${b}`); t = mk.t; }
      else if (Object.prototype.hasOwnProperty.call(this.sections, b)) t = this.sections[b];
      else throw new Error(`can't read the time '${v}'`);
    }
    return off ? this.add(t, off) : t;
  }
  add(t, amount) {
    const m = /^([+\-]?[0-9.]+)\s*(bars?|b|beats?|s|ms)?$/.exec(String(amount).trim());
    if (!m) throw new Error(`can't read the length '${amount}'`);
    const n = parseFloat(m[1]), u = m[2] ?? '';
    if (u === 's') return t + n;
    if (u === 'ms') return t + n / 1000;
    return this.timeOf(this.beatAt(t) + (u.startsWith('bar') ? n * this.meter : n));
  }
  dur(v, t, def) { if (v === undefined || v === null) return def; if (typeof v === 'number') return v; return this.add(t, v) - t; }
  beatsOf(v) { if (typeof v === 'number') return v; const m = /^([+\-]?[0-9.]+)\s*(bars?|b|beats?|s|ms)?$/.exec(String(v).trim()); return parseFloat(m[1]) * ((m[2] ?? '').startsWith('bar') ? this.meter : 1); }
}

// ---- reading the score ----

const readJson = (f) => parse(fs.readFileSync(f, 'utf8'), path.relative(PROJECT, f).replace(/\\/g, '/'));

/** The merged score plus provenance. Mirrors ScoreCompiler.Build. Duplicates across acts are recorded, not hidden. */
/** `opts.acts`: {name: text} read in place of acts/<name> (mv final --plan compiles the cards in memory and changes no file). */
export function loadScore(v, opts = {}) {
  const score = readJson(v.score);
  const dupes = []; const origin = { actors: {}, lights: {} };
  const files = [score];
  if (score.sharedModels) {
    const shared = readJson(path.resolve(v.dir, score.sharedModels));
    score.models = { ...(shared.models ?? {}), ...(score.models ?? {}) };
    score.__sharedFrom = where(shared)?.file;
  }
  for (const k of ['actors', 'lights']) for (const [n, d] of Object.entries(k === 'lights' ? score.stage?.lights ?? {} : score.actors ?? {})) origin[k][n] = where(d);
  for (const d of where(score.actors)?.dupes ?? []) dupes.push({ kind: 'actor', name: d.key, at: { file: where(score)?.file, line: d.line }, first: { file: where(score)?.file, line: d.first } });
  for (const f of fs.existsSync(v.acts) ? fs.readdirSync(v.acts).filter((x) => x.endsWith('.json')).sort() : []) {
    const over = opts.acts?.[f];
    const act = over !== undefined ? parse(over, path.relative(PROJECT, path.join(v.acts, f)).replace(/\\/g, '/')) : readJson(path.join(v.acts, f)); files.push(act);
    for (const key of ['models', 'actors', 'macros', 'sections', 'shows']) {
      if (!act[key] || typeof act[key] !== 'object') continue;
      score[key] ??= {};
      for (const [n, d] of Object.entries(act[key])) {
        if (key === 'actors') {
          if (origin.actors[n]) dupes.push({ kind: 'actor', name: n, at: where(d), first: origin.actors[n] });
          origin.actors[n] = where(d);
        }
        score[key][n] = d;
      }
    }
    if (act.lights) { score.stage ??= {}; score.stage.lights ??= {}; for (const [n, d] of Object.entries(act.lights)) { score.stage.lights[n] = d; origin.lights[n] = where(d); } }
    if (Array.isArray(act.cues)) { (score.cues ??= []); if (!where(score.cues)) void 0; for (const c of act.cues) score.cues.push(c); }
    for (const d of where(act.actors)?.dupes ?? []) dupes.push({ kind: 'actor', name: d.key, at: { file: where(act)?.file, line: d.line }, first: { file: where(act)?.file, line: d.first } });
  }
  return { score, files, dupes, origin };
}

export function loadClock(v, score) {
  const song = JSON.parse(fs.readFileSync(v.song, 'utf8'));
  let marks = []; try { marks = JSON.parse(fs.readFileSync(v.marks, 'utf8')); } catch {}
  return new Clock(song, marks, score.sections);
}

/** What the compiler does with a cue. The order is ScoreCompiler.Fire's, and it is why some traps exist. */
export function family(c) {
  if (c.macro !== undefined) return 'macro';
  if (c.shot !== undefined) return 'shot';
  if (c.do !== undefined) return 'do';
  if (c.fx !== undefined) return 'fx';
  if (c.insert !== undefined) return 'insert';
  if (c.steps !== undefined) return 'steps';
  if (c.lightreact !== undefined) return 'lightreact';
  if (c.speed !== undefined && c.gfx === undefined) return 'speed';
  if (c.gfx !== undefined) return 'gfx';
  if (c.flip !== undefined) return 'flip';
  if (['tv', 'tvflash', 'tvchange', 'tvreact', 'tvclip'].some((k) => c[k] !== undefined)) return 'tv';
  if (c.grade !== undefined) return 'grade';
  if (c.pulse !== undefined) return 'pulse';
  if (c.light !== undefined) return 'light';
  if (c.strobe !== undefined) return 'strobe';
  if (c.sky !== undefined) return 'sky';
  if (c.text !== undefined) return 'text';
  if (c.sfx !== undefined) return 'sfx';
  return 'nothing';
}

function substitute(c, subs) {
  const swap = (x) => {
    if (typeof x === 'string' && x.startsWith('$') && Object.prototype.hasOwnProperty.call(subs, x.slice(1))) return subs[x.slice(1)];
    if (Array.isArray(x)) return x.map(swap);
    if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = swap(x[k]); return o; }
    return x;
  };
  return swap(c);
}

/**
 * Every firing of every cue, with its time: repeats, onsets and macros unrolled.
 * fires: [{c, t, len, fam, file, line, via}]. problems: what could not be read.
 */
export function expand(score, clock) {
  const fires = [], problems = [], shots = [];
  let prev = 0;
  const hits = clock.song.onsets ?? {};

  const fire = (c, t, at, via) => {
    const fam = family(c);
    if (fam === 'macro') {
      const def = score.macros?.[c.macro];
      if (!Array.isArray(def)) { problems.push({ code: 'macro', at, msg: `no macro "${c.macro}"`, fix: `Define it under "macros" in an act, or fix the name.` }); return; }
      const subs = {}; for (const k in c) if (k !== 'macro' && k !== 'at') subs[k] = c[k];
      const keep = prev;
      for (const inner of def) { prev = t; cue(inner, subs, `macro ${c.macro}`, at); }
      prev = keep;
      return;
    }
    let len = null;
    const hasLen = c.for !== undefined || c.repeat !== undefined || c.onsets !== undefined;
    try { len = hasLen ? clock.dur(c.for, t, null) : c.until !== undefined ? clock.T(c.until, t) - t : null; } catch (e) { problems.push({ code: 'time', at, msg: e.message, fix: 'Times look like "12:3", "41.2s", "m3", "s5" or "+1b".' }); }
    const f = { c, t, len, fam, at, via };
    fires.push(f);
    if (fam === 'shot') shots.push(f);
  };

  const cue = (raw, subs, via, callAt) => {
    const c = subs ? substitute(raw, subs) : raw;
    const at = where(raw) ?? callAt;
    let t;
    try { t = clock.T(c.at, prev); } catch (e) { problems.push({ code: 'time', at, msg: e.message, fix: 'Times look like "12:3", "41.2s", "m3", "s5" or "+1b".' }); return; }
    prev = t;
    if (c.onsets !== undefined) {
      const src = hits[c.onsets];
      if (!src) { problems.push({ code: 'onsets', at, msg: `no hits called ${c.onsets}`, fix: `Use one of: ${Object.keys(hits).join(', ')}.` }); return; }
      let until = clock.duration; try { until = c.until !== undefined ? clock.T(c.until, clock.duration) : until; } catch {}
      for (const o of src) if (o >= t - 0.01 && o < until) fire(c, o, at, via);
      return;
    }
    if (c.repeat !== undefined) {
      const b0 = clock.beatAt(t), step = clock.beatsOf(c.repeat), times = c.times ?? 1e6;
      let until = Infinity; try { if (c.until !== undefined) until = clock.T(c.until, t); } catch {}
      for (let i = 0; i < times; i++) {
        const ti = clock.timeOf(b0 + i * step);
        if (ti >= until || ti >= clock.duration) break;
        fire(c, ti, at, via);
      }
      return;
    }
    fire(c, t, at, via);
  };

  for (const c of score.cues ?? []) { if (c && typeof c === 'object') cue(c, null, null, null); }
  shots.sort((a, b) => a.t - b.t);
  return { fires, problems, shots };
}

/** The shot list the compiler makes: each runs to its own end, or the next shot, or the end of the song. */
export function shotList(shots, clock) {
  return shots.map((f, i) => {
    const end = f.len !== null && (f.c.for !== undefined || f.c.until !== undefined) ? f.t + f.len : i + 1 < shots.length ? shots[i + 1].t : clock.duration;
    const name = f.c.shot.name ?? `shot_${String(i + 1).padStart(3, '0')}`;
    return { n: i + 1, name, t: f.t, end, len: end - f.t, at: clock.label(f.t), beats: clock.beatAt(end) - clock.beatAt(f.t), file: f.at?.file, line: f.at?.line };
  });
}

export function findShot(list, key) {
  const n = /^\d+$/.test(String(key)) ? +key : null;
  const hit = n !== null ? list.find((s) => s.n === n) : list.find((s) => s.name === key) ?? list.find((s) => s.name.toLowerCase().includes(String(key).toLowerCase()));
  if (!hit) throw new Error(`no shot "${key}". mv shots lists them.`);
  return hit;
}
