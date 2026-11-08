#!/usr/bin/env node
// mv cards insert / remove: make room in a video's clock, or take time out of it, and move every absolute time after the point with it.
// Hawkes Punch's symptoms scene needed 8 bars in the middle: by hand that was song.json, 91 sfx cues, the spoken lines, lyrics, the cut's
// pins and the cast act (PIPELINE-LOG entry 26). This does it in one step, in Node, with a backup and a rebase map, and stops on any file
// it can't place rather than missing one.
//   node Director/mv.mjs [--video v] cards insert [<video>] <at> <length> [--dry] [--drop] [--accept file,...] [--no-audio] [--no-compile]
//   node Director/mv.mjs [--video v] cards remove [<video>] <at> <length> [...]
//   node Director/tools/mv/clockshift.mjs test
// <at>: 12, 12:3, 41.2s, a section, a name in cut.json "beats", or "end" (insert only: grows the clock past the song's last beat).
// <length>: 8bars, 32b or 20s; seconds round to whole beats of the song's local spacing, so the bar grid after the point stays a grid.
//
// What moves (t -> t + D for every t at or after the point; bar:beat strings by the same number of beats, so they stay on their beat):
//   song.json      new beats at the local spacing (or taken out), duration, sections, bars, onsets, phrases, envelopes (zeros in, or cut)
//   cut.json       pins ("at") and "beats" names after the point; a shot that spans the point grows (or shrinks) by the length; the first
//                  shot after a gap is pinned, so what follows stays with the acts, and the compiler says what holds until it
//   score.json, acts/*.json   every cue's at/until/land/sfxAt and keys' t when they are absolute; actors' from/until; sections. Edited as
//                  text, so comments stay. A relative time ("+1b") that crosses the point is an error: it can't follow by itself.
//   lyrics.json, lyrics-raw.json, duck.json, marks.json, notes.json (Room notes: t, at, bar, beat, frame), sfx-map.json
//   audio          the song file the score names, videos/<v>/audio.*, and stems/*: silence spliced in at the point (or the range cut out)
//   generated      acts/50-cards.json and cards.map.json are compiled again at the end; acts made by a tool whose times live in the tool
//                  (tools/punch_lines.mjs LINES) refuse until the times are data (`node Director/tools/punch_lines.mjs --export`)
// Remove: cues inside the removed range are an error unless --drop (then they go, and shots inside get "drop": true in the cut).
// Everything is worked out in memory first and checked by compiling the cards in a scratch copy: every card after the point must start
// exactly the length later (or earlier), every card before must not move. Nothing is written unless all of that passes.
// Writes: videos/<v>/_backup/<op>-<stamp>/ (every file it changes, before) and rebase.json there (the map, every change, file by file).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DIRECTOR, PROJECT, listVideos } from './score.mjs';

const round = (x, n = 3) => { const f = 10 ** n, r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
class ShiftError extends Error {}
const fail = (m) => { throw new ShiftError(m); };

// ---------- a JSONC reader that keeps where every value is, so edits leave comments and layout alone ----------

export function spans(s, file = '?') {
  let i = 0;
  const lineAt = (k) => { let n = 1; for (let j = 0; j < k; j++) if (s.charCodeAt(j) === 10) n++; return n; };
  const bad = (m) => fail(`${file}:${lineAt(i)}: ${m}`);
  const ws = () => {
    for (;;) {
      const c = s[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '﻿') i++;
      else if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; }
      else if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) bad('a /* comment never ends'); i = e + 2; }
      else return;
    }
  };
  const str = () => { const q = s[i++]; let o = ''; for (;;) { const c = s[i++]; if (c === undefined) bad('a string never ends'); if (c === q) return o; if (c === '\\') { const e = s[i++]; o += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'u' ? (i += 4, String.fromCharCode(parseInt(s.slice(i - 4, i), 16))) : e; } else o += c; } };
  const value = () => {
    ws();
    const start = i, c = s[i];
    if (c === '{') {
      i++; const entries = [];
      for (;;) {
        ws(); if (s[i] === '}') { i++; return { type: 'object', start, end: i, entries }; }
        const ks = i; const key = str(); ws(); if (s[i] !== ':') bad(`expected : after "${key}"`); i++;
        const node = value(); entries.push({ key, keyStart: ks, node }); ws();
        if (s[i] === ',') i++; else if (s[i] !== '}') bad(`expected , or } after "${key}"`);
      }
    }
    if (c === '[') {
      i++; const items = [];
      for (;;) { ws(); if (s[i] === ']') { i++; return { type: 'array', start, end: i, items }; } items.push(value()); ws(); if (s[i] === ',') i++; else if (s[i] !== ']') bad('expected , or ]'); }
    }
    if (c === '"' || c === "'") { const v = str(); return { type: 'string', start, end: i, value: v, quote: c }; }
    const m = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+|true|false|null)/.exec(s.slice(i, i + 40));
    if (!m) bad(`can't read ${JSON.stringify(s.slice(i, i + 12))}`);
    i += m[0].length;
    const t = m[0];
    return { type: t === 'true' || t === 'false' ? 'bool' : t === 'null' ? 'null' : 'number', start, end: i, value: t === 'true' ? true : t === 'false' ? false : t === 'null' ? null : Number(t), text: t };
  };
  const root = value(); ws(); if (i < s.length) bad('extra text after the JSON');
  root.lineAt = lineAt;
  return root;
}
export const get = (node, key) => node?.type === 'object' ? node.entries.find((e) => e.key === key)?.node : undefined;
export const plain = (node) => node.type === 'object' ? Object.fromEntries(node.entries.map((e) => [e.key, plain(e.node)])) : node.type === 'array' ? node.items.map(plain) : node.value;

/** Applies [{start, end, text}] to s (non-overlapping), from the back. */
export function applyEdits(s, edits) {
  const list = [...edits].sort((a, b) => b.start - a.start);
  for (let k = 1; k < list.length; k++) if (list[k].end > list[k - 1].start) fail(`two edits overlap at ${list[k].start}`);
  for (const e of list) s = s.slice(0, e.start) + e.text + s.slice(e.end);
  return s;
}
/** The text span of an array item with its comma and its own line's trailing comment, so removing it leaves a valid list. */
function itemSpan(s, arr, k) {
  const it = arr.items[k];
  let a = it.start, b = it.end;
  const after = /^\s*,[ \t]*(\/\/[^\n]*)?/.exec(s.slice(b));
  if (after) b += after[0].length;
  else if (k > 0) { const prev = arr.items[k - 1]; const between = s.slice(prev.end, a); const m = /,\s*$/.exec(between); if (m) a = prev.end + m.index; }
  const lineStart = s.lastIndexOf('\n', a - 1) + 1;
  if (/^[ \t]*$/.test(s.slice(lineStart, a)) && /^[ \t]*\r?\n/.test(s.slice(b))) { a = lineStart; b += /^[ \t]*\r?\n/.exec(s.slice(b))[0].length; }
  return { start: a, end: b };
}

// ---------- the clock: what happens to a time, a beat, a bar:beat string ----------

/** The plan for one operation on a song: B beat index, L beats, T seconds, D seconds. Pure. */
export function planOp(song, op, atBeat, lenBeats) {
  const b = song.beats, n = b.length;
  if (!Number.isInteger(lenBeats) || lenBeats <= 0) fail(`the length must be a whole number of beats over 0 (got ${lenBeats})`);
  const B = atBeat;
  if (Math.abs(B - Math.round(B)) > 1e-3) fail(`the point must be on a beat (it is beat ${round(B, 3)}); move it to ${Math.floor(B)} or ${Math.ceil(B)}`);
  const Bi = Math.round(B);
  const ibi = n > 1 ? (Bi >= 2 && Bi <= n - 1 ? b[Bi - 1] - b[Bi - 2] : b[n - 1] - b[n - 2]) : 0.5;
  if (op === 'insert') {
    if (Bi < 1 || Bi > n) fail(`can't insert at beat ${Bi}: the song has beats 0-${n - 1} (use "end" to grow it at its end)`);
    const T = Bi < n ? b[Bi] : b[n - 1] + ibi;
    return { op, B: Bi, L: lenBeats, T, D: lenBeats * ibi, ibi };
  }
  if (Bi < 1 || Bi + lenBeats > n - 1) fail(`can't remove beats ${Bi}-${Bi + lenBeats}: the song has beats 0-${n - 1}`);
  return { op, B: Bi, L: lenBeats, T: b[Bi], D: b[Bi + lenBeats] - b[Bi], ibi };
}

/** Where a time goes: a number, or null when remove takes it (inside the removed range). `end`: an end time, which may sit at T and stay. */
export function mapTime(p, t, { end = false } = {}) {
  const eps = 1e-6;
  if (p.op === 'insert') return (end ? t > p.T + eps : t >= p.T - eps) ? t + p.D : t;
  if (t < p.T - eps) return t;
  if (t >= p.T + p.D - eps) return t - p.D;
  return end ? p.T : null;
}
export function mapBeat(p, x, { end = false } = {}) {
  const eps = 1e-6;
  if (p.op === 'insert') return (end ? x > p.B + eps : x >= p.B - eps) ? x + p.L : x;
  if (x < p.B - eps) return x;
  if (x >= p.B + p.L - eps) return x - p.L;
  return end ? p.B : null;
}
export function newSong(song, p) {
  const out = JSON.parse(JSON.stringify(song)), b = song.beats;
  const known = new Set(['duration', 'tempo', 'meter', 'downbeatPhase', 'beats', 'sections', 'onsets', 'phrases', 'bars', 'envelopes']);
  for (const k of Object.keys(song)) if (!known.has(k)) fail(`song.json: '${k}' is a key this tool doesn't know, so it can't say whether it holds times. Add it to newSong in tools/mv/clockshift.mjs.`);
  const r = (x) => round(x, 3);
  if (p.op === 'insert') {
    const add = Array.from({ length: p.L }, (_, k) => r(p.T + k * p.ibi));
    out.beats = [...b.slice(0, p.B), ...add, ...b.slice(p.B).map((t) => r(t + p.D))];
  } else out.beats = [...b.slice(0, p.B), ...b.slice(p.B + p.L).map((t) => r(t - p.D))];
  out.duration = r(song.duration + (p.op === 'insert' ? p.D : -p.D));
  const meter = song.meter ?? 4, dBars = p.L / meter;
  out.sections = (song.sections ?? []).map((s) => {
    const o = { ...s }, t0 = s.t ?? s.start, end = (s.t ?? 0) + 0;
    const nt = mapTime(p, t0);
    if (nt === null) return null;
    if (o.t !== undefined) o.t = r(nt); if (o.start !== undefined) o.start = r(nt);
    if (typeof o.beat === 'number') o.beat = mapBeat(p, o.beat);
    if (typeof o.bar === 'number' && o.beat !== s.beat) o.bar = round(o.bar + (o.beat - s.beat) / meter, 3);
    // a section that spans the point grows or shrinks with it
    if (typeof s.bars === 'number' && typeof s.beat === 'number' && s.beat < p.B && s.beat + s.bars * meter > p.B) o.bars = round(s.bars + (p.op === 'insert' ? dBars : -Math.min(dBars, (s.beat + s.bars * meter - p.B) / meter)), 3);
    void end;
    return o;
  }).filter(Boolean);
  out.onsets = Object.fromEntries(Object.entries(song.onsets ?? {}).map(([k, list]) => [k, list.map((t) => mapTime(p, t)).filter((t) => t !== null).map(r)]));
  out.phrases = (song.phrases ?? []).map(([a, z]) => [mapTime(p, a) ?? p.T, mapTime(p, z, { end: true })].map(r)).filter(([a, z]) => z > a);
  out.bars = (song.bars ?? []).map((x) => { const t = mapTime(p, x.t); if (t === null) return null; return { ...x, t: r(t), bar: t !== x.t ? round(x.bar + (p.op === 'insert' ? dBars : -dBars), 3) : x.bar }; }).filter(Boolean);
  if (song.envelopes) {
    const fps = song.envelopes.fps, at = Math.round(p.T * fps), n = Math.round(p.D * fps);
    out.envelopes = { fps };
    for (const [k, v] of Object.entries(song.envelopes)) {
      if (k === 'fps') continue;
      if (!Array.isArray(v)) fail(`song.json envelopes.${k} is not a list`);
      out.envelopes[k] = p.op === 'insert' ? [...v.slice(0, at), ...new Array(n).fill(0), ...v.slice(at)] : [...v.slice(0, at), ...v.slice(at + n)];
    }
  }
  return out;
}

/** bar:beat label of a beat index, the cards compiler's own spelling. */
const labelOf = (x, meter, phase) => { const k = x - phase, bar = Math.floor(k / meter + 1e-6), beat = round(k - bar * meter + 1, 4); return `${bar + 1}:${beat}`; };

/**
 * A time value as the score writes it, moved. Returns { value, changed, note } or throws for a spelling it can't place.
 * ctx: { p, song (old), names: Set of names that move by themselves (sections, marks, cut beats), prevT: the cue before's time for "+1b",
 *        end: an until-style value, file, where }
 */
export function shiftValue(v, ctx) {
  const { p, song } = ctx, meter = song.meter ?? 4, phase = song.downbeatPhase ?? 0;
  const beats = song.beats, ibi = (beats.at(-1) - beats[0]) / (beats.length - 1);
  const beatAt = (t) => { const n = beats.length; if (t <= beats[0]) return (t - beats[0]) / ibi; if (t >= beats[n - 1]) return n - 1 + (t - beats[n - 1]) / ibi; let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (beats[m] <= t) lo = m; else hi = m; } return lo + (t - beats[lo]) / (beats[hi] - beats[lo]); };
  if (typeof v === 'number') {
    const t = mapTime(p, v, { end: ctx.end });
    if (t === null) return { drop: true };
    return { value: t === v ? v : round(t, 4), changed: t !== v, t: v };
  }
  if (typeof v !== 'string') fail(`${ctx.where}: a time that is neither a number nor a string: ${JSON.stringify(v)}`);
  const m = /^([^+\-]*)([+\-].*)?$/.exec(v.trim()), base = (m?.[1] ?? '').trim(), off = m?.[2] ?? '';
  let x;
  if (!base) return { value: v, changed: false, relative: true };
  if ((x = /^(\d+):([0-9.]+)$/.exec(base)) || (x = /^(\d+)$/.exec(base))) {
    const beat = phase + (+x[1] - 1) * meter + (x[2] !== undefined ? +x[2] - 1 : 0);
    const nb = mapBeat(p, beat, { end: ctx.end });
    if (nb === null) return { drop: true };
    if (nb === beat) return { value: v, changed: false, t: beats[Math.round(beat)] ?? null, beat };
    let text = labelOf(nb, meter, phase);
    if (x[2] === undefined && /:1$/.test(text)) text = text.slice(0, -2);
    return { value: text + off, changed: true, beat };
  }
  if ((x = /^([0-9.]+)s$/.exec(base))) {
    const t = +x[1], nt = mapTime(p, t, { end: ctx.end });
    if (nt === null) return { drop: true };
    if (nt === t) return { value: v, changed: false, t };
    const dec = (x[1].split('.')[1] ?? '').length;
    const s3 = nt.toFixed(dec), txt = Math.abs(+s3 - nt) < 1e-9 ? s3 : nt.toFixed(Math.max(dec, 3));
    return { value: `${txt}s${off}`, changed: true, t };
  }
  if (/^m\d+$/.test(base) || ctx.names?.has(base)) return { value: v, changed: false, named: base };
  fail(`${ctx.where}: can't read the time '${v}', so it can't be moved. Times are 12:3, 12, 41.2s, m3, a section or a cut name.`);
  void beatAt;
}

// ---------- the files of a video, and who knows each ----------

// Files a video folder may hold. Each is handled, or known to hold no absolute time; anything else stops the tool.
const RELATIVE = [/^cards\//, /^sequences\//, /^tweaks\//, /^notes\/.*\.json$/, /^style\.json$/, /^choreo\//, /^face-direction\.json$/, /^test-baseline\.json$/, /^lint-baseline\.json$/];
const GENERATED = [/^cards\.map\.json$/, /^acts\/50-cards\.json$/, /^bake-report\.(json|md)$/];
const IGNORED_DIRS = /^(_backup|captures|shots|output|final|review|phone|before|look|inserts|notes)\//;
const DOCS = /\.(md|txt|log|png|jpg|jpeg|mp4|mov|webm|gif)$/i;
const BACKUP = /(\.before[^/]*|\.bak|\.orig)\.json$|^cut\.before/;
const AUDIO = /\.(mp3|wav|ogg|flac|m4a)$/i;
// Tools under Director/tools that name a video and hold its times in their code. `data` is the file their times move to.
const TOOL_TABLES = {
  'tools/punch_lines.mjs': { act: 'acts/70-lines.json', data: 'lines.json', also: ['duck.json'], fix: 'node Director/tools/punch_lines.mjs --export writes its LINES to videos/<v>/lines.json; it reads that file from then on' },
};
// Tools that name a video only as a default argument or a list of names: no times in them.
const TOOL_NAMES_ONLY = new Set(['tools/align_lyrics.mjs', 'tools/clip_catalog.mjs', 'tools/mv/lint.mjs', 'tools/bake.mjs', 'tools/bake/key.mjs', 'tools/motion_lib.mjs', 'tools/punch_wardrobe.py', 'tools/greener_wardrobe.py']);
const TOOL_NOTES = { 'tools/face_act.mjs': "for greener only: its outro hack keys off 147 s and the 'Oh, darling' line; check those after a shift" };

function listFiles(dir) {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), r = path.relative(dir, p).split(path.sep).join('/'); if (e.isDirectory()) { if (!IGNORED_DIRS.test(r + '/')) walk(p); } else out.push(r); } };
  walk(dir);
  return out.sort();
}

/** What each file is: 'song' 'cut' 'act' 'data:<kind>' 'audio' 'relative' 'generated' 'ignored', or an error. */
export function classify(rel, text) {
  if (DOCS.test(rel) || BACKUP.test(rel)) return 'ignored';
  if (AUDIO.test(rel)) return /^(audio\.|stems\/)/.test(rel) ? 'audio' : 'ignored';
  if (GENERATED.some((r) => r.test(rel))) return 'generated';
  if (RELATIVE.some((r) => r.test(rel))) return 'relative';
  if (rel === 'song.json') return 'song';
  if (rel === 'cut.json') return 'cut';
  if (rel === 'score.json' || /^acts\/[^/]+\.json$/.test(rel)) {
    const gen = /^\s*\/\/\s*GENERATED by (?:Director\/)?(\S+?)[:\s]/.exec(text ?? '');
    return gen ? `generated-act:${gen[1]}` : 'act';
  }
  if (['lyrics.json', 'lyrics-raw.json', 'duck.json', 'marks.json', 'notes.json', 'sfx-map.json', 'lines.json'].includes(rel)) return `data:${rel}`;
  if (/^stems\//.test(rel)) return 'ignored';
  return null;
}

// ---------- the operation ----------

function toolRefs(name) {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(node_modules|__pycache__)$/.test(e.name)) walk(p); continue; } if (!/\.(mjs|js|py)$/.test(e.name)) continue; const t = fs.readFileSync(p, 'utf8'); if (new RegExp(`['"/\\\\]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"/\\\\]`).test(t)) out.push(path.relative(DIRECTOR, p).split(path.sep).join('/')); } };
  walk(path.join(DIRECTOR, 'tools'));
  return out.filter((r) => r !== 'tools/mv/clockshift.mjs');
}

/** Moves every absolute time in one parsed score/act file. Returns { edits, changes, drops, problems, warns }. */
function shiftAct(text, rel, p, song, names, state, opts) {
  const root = spans(text, rel), edits = [], changes = [], problems = [], warns = [], drops = [];
  const where = (node) => `${rel}:${root.lineAt(node.start)}`;
  const put = (node, value, what) => {
    const t = typeof value === 'number' ? String(value) : JSON.stringify(value);
    edits.push({ start: node.start, end: node.end, text: node.type === 'string' && node.quote === "'" ? `'${value}'` : t });
    changes.push({ at: where(node), key: what, old: node.value, new: value });
  };
  const timeNode = (node, what, { end = false, prevT = null } = {}) => {
    if (!node) return null;
    const r = shiftValue(node.value, { p, song, names, end, where: where(node) });
    if (r.drop) return { drop: true };
    if (r.changed) put(node, r.value, what);
    return r;
  };
  const T = (v, prev) => state.clockT(v, prev);
  // actors' spans
  const actors = get(root, 'actors');
  for (const e of actors?.entries ?? []) {
    for (const k of ['from', 'until']) { const n = get(e.node, k); if (n) { const r = timeNode(n, `actor ${e.key}.${k}`, { end: k === 'until' }); if (r?.drop) problems.push(`${where(n)}: actor ${e.key}'s ${k} is inside the removed range`); } }
  }
  // named sections in a score
  const sections = get(root, 'sections');
  for (const e of sections?.entries ?? []) timeNode(e.node, `section ${e.key}`);
  // cues
  const cueList = (arr, inMacro) => {
    if (arr?.type !== 'array') return;
    arr.items.forEach((cue, k) => {
      if (cue.type !== 'object') return;
      const c = plain(cue), at = get(cue, 'at');
      let t0 = null, prevT = state.prev;
      try { t0 = T(c.at, inMacro ? 0 : state.prev); } catch (e) { problems.push(`${where(cue)}: ${e.message}`); return; }
      if (!inMacro) state.prev = t0;
      const rAt = at ? timeNode(at, 'at') : null;
      if (rAt?.relative && !inMacro && prevT !== null) {
        const before = prevT < p.T - 1e-6, after = t0 >= p.T - 1e-6;
        if (before && after) problems.push(`${where(at)}: '${c.at}' is relative to the cue before (at ${round(prevT, 3)} s), which is before the point while this one is after: give it an absolute time`);
      }
      const inside = rAt?.drop || (p.op === 'remove' && !at && t0 >= p.T && t0 < p.T + p.D);
      if (inside) {
        if (opts.drop) { edits.push({ ...itemSpan(text, arr, k), text: '' }); drops.push({ at: where(cue), cue: c }); }
        else problems.push(`${where(cue)}: a cue at ${round(t0, 3)} s is inside the removed range (--drop removes it)`);
        return;
      }
      for (const key of ['until', 'land']) {
        const n = get(cue, key);
        if (!n) continue;
        const r = timeNode(n, key, { end: true });
        if (r?.relative && t0 < p.T && T(c[key], t0) > p.T) warns.push(`${where(n)}: '${key}: ${c[key]}' is relative and runs over the point; its length doesn't change`);
      }
      const f = get(cue, 'for');
      if (f && !inMacro) { let len = null; try { len = state.clockDur(c.for, t0); } catch {} if (len !== null && t0 < p.T - 1e-6 && t0 + len > p.T + 1e-6) warns.push(`${where(f)}: a cue at ${round(t0, 3)} s runs ${round(len, 2)} s over the point (for: ${JSON.stringify(c.for)}); its length doesn't change`); }
      const sa = get(cue, 'sfxAt');
      if (sa && typeof sa.value === 'string' && !/^[+\-]/.test(sa.value.trim())) timeNode(sa, 'sfxAt');
      const keys = get(cue, 'keys');
      for (const kn of keys?.items ?? []) { const tn = get(kn, 't'); if (tn?.type === 'string' && /^\d+(:[0-9.]+)?$/.test(tn.value.trim())) timeNode(tn, 'keys.t'); }
      if (c.sfx && typeof c.sfx === 'string' && t0 < p.T && opts.sfxLength) { const len = opts.sfxLength(c.sfx); if (len && t0 + len > p.T + 0.05) warns.push(`${where(cue)}: the sound ${c.sfx} starts at ${round(t0, 2)} s and plays ${round(len, 1)} s, over the point: it plays on unchanged (splice it, as bed_clinic_long was, if it must follow)`); }
    });
  };
  cueList(get(root, 'cues'), false);
  for (const e of get(root, 'macros')?.entries ?? []) cueList(e.node, true);
  return { text: applyEdits(text, edits), changes, problems, warns, drops };
}

/** cut.json: pins and names, the shot over the point, the first shot after a gap. */
function shiftCut(text, p, song, entries, cutBeatNames, opts) {
  const rel = 'cut.json', root = spans(text, rel), edits = [], changes = [], problems = [], warns = [];
  const where = (node) => `${rel}:${root.lineAt(node.start)}`;
  const set = (node, value, what) => { edits.push({ start: node.start, end: node.end, text: JSON.stringify(value) }); changes.push({ at: where(node), key: what, old: node.value, new: value }); };
  const meter = song.meter ?? 4, names = new Set(Object.keys(cutBeatNames));
  for (const sec of song.sections ?? []) if (sec.name) names.add(sec.name);
  const moveTime = (node, what) => { const r = shiftValue(node.value, { p, song, names, where: where(node) }); if (r.drop) problems.push(`${where(node)}: ${what} '${node.value}' is inside the removed range`); else if (r.changed) set(node, r.value, what); };
  for (const e of get(root, 'beats')?.entries ?? []) moveTime(e.node, `beats.${e.key}`);
  const st = get(root, 'start'); if (st) moveTime(st, 'start');
  const shots = get(root, 'shots') ?? (root.type === 'array' ? root : null);
  if (!shots) fail('cut.json needs "shots": a list');
  const byId = new Map(entries.map((e) => [e.id, e]));
  let gapPinned = false;
  const live = shots.items.filter((n) => !plain(n).drop);
  live.forEach((node, k) => {
    const c = plain(node), e = byId.get(c.id);
    if (!e) return;
    const atN = get(node, 'at'), lenN = get(node, 'len');
    // A shot whose end is the next shot's pin (it holds until it, or is trimmed by it) needs no new len: the pin moves and the hold follows.
    const next = live[k + 1] ? plain(live[k + 1]) : null, nextE = next ? byId.get(next.id) : null;
    const pinBound = !!(next && next.at !== undefined && nextE && Math.abs(nextE.start - e.end) < 1e-6);
    if (atN && !names.has(String(atN.value).replace(/[+\-].*$/, '').trim())) moveTime(atN, `${c.id}.at`);
    const grow = (dBeats) => {
      const v = String(c.len).trim(), m = /^([0-9.]+)\s*(b|beat|beats|bar|bars|s)?$/.exec(v);
      if (!m) fail(`${where(lenN)}: can't read the len '${c.len}'`);
      const n = +m[1], u = m[2] ?? 'b';
      let nv;
      if (u === 's') nv = `${round(n + dBeats * p.ibi, 3)}s`;
      else if (u.startsWith('bar') && Number.isInteger(dBeats / meter)) nv = `${round(n + dBeats / meter, 4)}${u}`;
      else nv = `${round((u.startsWith('bar') ? n * meter : n) + dBeats, 4)}b`;
      set(lenN, typeof c.len === 'number' ? round((u.startsWith('bar') ? n * meter : n) + dBeats, 4) : nv, `${c.id}.len`);
    };
    if (p.op === 'insert') {
      if (e.start < p.B - 1e-6 && e.end > p.B + 1e-6 && pinBound) { warns.push(`'${c.id}' runs over the point up to the pin on '${next.id}': it holds ${p.L} beats longer`); gapPinned = true; }
      else if (e.start < p.B - 1e-6 && e.end > p.B + 1e-6) { grow(p.L); warns.push(`'${c.id}' runs over the point (${labelOf(e.start, meter, song.downbeatPhase ?? 0)} to ${labelOf(e.end, meter, song.downbeatPhase ?? 0)}): it grows by ${p.L} beats`); gapPinned = true; }
      else if (!gapPinned && !atN && e.start >= p.B - 1e-6 && k > 0) {
        // the first shot at or after the point: pin it where it now belongs, so the shot before holds the new time until the new shots fill it
        const label = labelOf(e.start + p.L, meter, song.downbeatPhase ?? 0), idN = get(node, 'id');
        edits.push({ start: idN.end, end: idN.end, text: `, "at": "${label}"` });
        changes.push({ at: where(node), key: `${c.id}.at`, old: null, new: label });
        warns.push(`'${live[k - 1] ? plain(live[k - 1]).id : '?'}' now holds ${p.L} beats until the pin on '${c.id}' (${label}): put the new shots after it`);
        gapPinned = true;
      } else if (atN && e.start >= p.B - 1e-6) gapPinned = true;
    } else {
      const a = e.start, z = e.end, A = p.B, Z = p.B + p.L;
      const cut = Math.max(0, Math.min(z, Z) - Math.max(a, A));
      if (a >= A - 1e-6 && z <= Z + 1e-6) {
        if (opts.drop) { const idN = get(node, 'id'); edits.push({ start: idN.end, end: idN.end, text: ', "drop": true' }); changes.push({ at: where(node), key: `${c.id}.drop`, old: null, new: true }); }
        else problems.push(`${where(node)}: '${c.id}' is wholly inside the removed range (--drop marks it "drop": true)`);
      } else if (cut > 1e-6 && pinBound) warns.push(`'${c.id}' ends on the pin of '${next.id}', which moves back ${p.L} beats: it holds ${round(cut, 3)} beats less`);
      else if (cut > 1e-6) { grow(-cut); warns.push(`'${c.id}' loses ${round(cut, 3)} beats to the removal`); }
      if (atN && a >= A - 1e-6 && a < Z - 1e-6 && z > Z + 1e-6) problems.push(`${where(atN)}: '${c.id}' is pinned inside the removed range`);
    }
  });
  return { text: applyEdits(text, edits), changes, problems, warns };
}

/** A shifted number in the original's own spelling: its decimals when they hold it exactly, else 3 (4 for sfx-map's long floats). */
function numText(old, nv, oldText) {
  const dec = ((oldText ?? String(old)).split('.')[1] ?? '').length;
  for (const d of [dec, 3, 4, 6]) { const s = nv.toFixed(d); if (Math.abs(+s - nv) < 1e-9 || d === 6) return d === 0 && /\.0+$/.test(oldText ?? '') ? nv.toFixed(1) : s; }
  return String(nv);
}

/** Data files (lyrics, duck, marks, Room notes, sfx-map, lines): edited in place like the acts, so their layout stays; each has its known time keys,
 *  and any other number under a time-like key stops the tool. */
function shiftData(kind, text, p, song, newClock) {
  const root = spans(text, kind), edits = [], changes = [], problems = [];
  const allowed = { 'lyrics.json': ['t', 'end'], 'lyrics-raw.json': ['t', 'end', 'start'], 'duck.json': ['from', 'to'], 'marks.json': ['t'], 'notes.json': ['t'], 'sfx-map.json': ['t'], 'lines.json': ['start'] }[kind];
  if (!allowed) fail(`no handler for ${kind}`);
  const TIMEY = /^(t|time|start|end|from|to|at|until|seconds|tEnd|offset)$/;
  const check = (x, trail) => { if (Array.isArray(x)) x.forEach((y, i) => check(y, `${trail}[${i}]`)); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { if (typeof v === 'number' && TIMEY.test(k) && !allowed.includes(k)) problems.push(`${kind} ${trail}.${k}: a number under a time-like key this tool doesn't move`); check(v, `${trail}.${k}`); } };
  check(plain(root), '');
  const setNum = (node, nv, trail) => { if (node?.type !== 'number' || nv === node.value) return; const t = numText(node.value, nv, node.text); edits.push({ start: node.start, end: node.end, text: t }); changes.push({ key: trail, old: node.value, new: +t }); };
  const setStr = (node, v, trail) => { if (node?.type !== 'string' || v === node.value) return; edits.push({ start: node.start, end: node.end, text: JSON.stringify(v) }); changes.push({ key: trail, old: node.value, new: v }); };
  const drop = (arr, k, trail) => { edits.push({ ...itemSpan(text, arr, k), text: '' }); changes.push({ key: trail, old: 'item', new: 'dropped' }); };
  /** start-type key: null when removed; end-type key clamps. */
  const timeOf = (obj, key, end) => { const n = get(obj, key); return n?.type === 'number' ? { n, v: mapTime(p, n.value, { end }) } : null; };
  const listOf = (node) => node?.type === 'array' ? node : null;
  if (kind === 'lyrics.json' || kind === 'lyrics-raw.json') {
    const lines = listOf(get(root, 'lines')) ?? listOf(get(root, 'segments')) ?? listOf(root) ?? fail(`${kind}: no lines`);
    lines.items.forEach((l, i) => {
      const s = timeOf(l, 't') ?? timeOf(l, 'start');
      if (s && s.v === null) { drop(lines, i, `lines[${i}]`); return; }
      for (const k of ['t', 'start']) { const x = timeOf(l, k); if (x) setNum(x.n, x.v, `lines[${i}].${k}`); }
      const e = timeOf(l, 'end', true); if (e) setNum(e.n, e.v, `lines[${i}].end`);
      const words = listOf(get(l, 'words'));
      words?.items.forEach((w, j) => {
        const ws = timeOf(w, 't') ?? timeOf(w, 'start');
        if (ws && ws.v === null) { drop(words, j, `lines[${i}].words[${j}]`); return; }
        for (const k of ['t', 'start']) { const x = timeOf(w, k); if (x) setNum(x.n, x.v, `lines[${i}].words[${j}].${k}`); }
        const we = timeOf(w, 'end', true); if (we) setNum(we.n, we.v, `lines[${i}].words[${j}].end`);
      });
    });
  } else if (kind === 'duck.json') {
    listOf(root)?.items.forEach((d, i) => {
      const a = timeOf(d, 'from'), z = timeOf(d, 'to', true);
      if (p.op === 'remove' && a && z && a.v === null && z.v <= p.T + 1e-9) { drop(root, i, `[${i}]`); return; }
      if (a) setNum(a.n, a.v ?? p.T, `[${i}].from`); if (z) setNum(z.n, z.v, `[${i}].to`);
    });
  } else if (kind === 'marks.json' || kind === 'notes.json') {
    const list = kind === 'notes.json' ? listOf(get(root, 'notes')) : listOf(root);
    list?.items.forEach((n, i) => {
      const t = timeOf(n, 't');
      if (!t) return;
      if (t.v === null) { drop(list, i, `[${i}]`); return; }
      if (t.v === t.n.value) return;
      setNum(t.n, t.v, `[${i}].t`);
      const fr = get(n, 'frame'); if (fr?.type === 'number') setNum(fr, Math.round(t.v * (t.n.value ? Math.round(fr.value / t.n.value) || 30 : 30)), `[${i}].frame`);
      const lbl = newClock.label(t.v), [bar, beat] = lbl.split(':').map(Number);
      setStr(get(n, 'at'), lbl, `[${i}].at`); setNum(get(n, 'bar'), bar, `[${i}].bar`); setNum(get(n, 'beat'), beat, `[${i}].beat`);
    });
  } else if (kind === 'sfx-map.json' || kind === 'lines.json') {
    const key = kind === 'sfx-map.json' ? 't' : 'start', list = listOf(get(root, 'lines')) ?? listOf(root);
    list?.items.forEach((x, i) => { const t = timeOf(x, key); if (!t) return; if (t.v === null) drop(list, i, `[${i}]`); else setNum(t.n, t.v, `[${i}].${key}`); });
  }
  return { text: applyEdits(text, edits), changes, problems };
}

function audioLength(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(r.stdout) || null;
}
/** Splices Δ of silence in at T, or cuts [T, T+Δ) out, writing `out`. */
function spliceAudio(file, out, p) {
  const T = p.T.toFixed(6), D = p.D.toFixed(6), args = ['-y', '-v', 'error', '-i', file];
  let filter;
  if (p.op === 'insert') filter = `[0:a]atrim=0:${T},asetpts=PTS-STARTPTS[a];[0:a]atrim=start=${T},asetpts=PTS-STARTPTS[c];aevalsrc=0:d=${D}:s=44100[s];[s]aformat=sample_rates=44100[b];[a]aformat=sample_rates=44100[a2];[c]aformat=sample_rates=44100[c2];[a2][b][c2]concat=n=3:v=0:a=1[o]`;
  else filter = `[0:a]atrim=0:${T},asetpts=PTS-STARTPTS[a];[0:a]atrim=start=${(p.T + p.D).toFixed(6)},asetpts=PTS-STARTPTS[c];[a][c]concat=n=2:v=0:a=1[o]`;
  const r = spawnSync('ffmpeg', [...args, '-filter_complex', filter, '-map', '[o]', ...(/\.mp3$/i.test(out) ? ['-c:a', 'libmp3lame', '-b:a', '256k'] : []), out], { encoding: 'utf8' });
  if (r.status) fail(`ffmpeg on ${file}: ${r.stderr.slice(-400)}`);
}

/** Works the whole operation out in memory. Throws with every problem at once; returns the files to write and the report. */
export async function prepare(videoDir, op, atText, lenText, opts = {}) {
  const dir = path.resolve(videoDir), name = path.basename(dir);
  const songText = fs.readFileSync(path.join(dir, 'song.json'), 'utf8'), song = JSON.parse(songText);
  const cards = await import(pathToFileURL(path.join(DIRECTOR, 'tools', 'cards.mjs')).href);
  const { Clock: SClock, loadScore } = await import('./score.mjs');
  const hasCut = fs.existsSync(path.join(dir, 'cut.json'));
  const cutData = hasCut ? (await import('./jsonc.mjs')).parse(fs.readFileSync(path.join(dir, 'cut.json'), 'utf8'), 'cut.json') : {};
  const cclock = cards.Clock(song, cutData.beats ?? {});
  const scoreText = fs.readFileSync(path.join(dir, 'score.json'), 'utf8');
  const scoreSections = (await import('./jsonc.mjs')).parse(scoreText, 'score.json').sections ?? {};
  let marks = []; try { marks = JSON.parse(fs.readFileSync(path.join(dir, 'marks.json'), 'utf8')); } catch {}
  const sclock = new SClock(song, marks, scoreSections);
  // where and how much
  const n = song.beats.length;
  const atBeat = atText === 'end' ? (op === 'insert' ? n : fail('"end" is for insert')) : cclock.at(/^\d+(\.\d+)?$/.test(atText) ? +atText : atText);
  const lm = /^([0-9.]+)\s*(b|beat|beats|bar|bars|s)?$/.exec(String(lenText).trim()) ?? fail(`can't read the length '${lenText}': 8bars, 32b or 20s`);
  const ibiHere = (() => { const B = Math.round(atBeat); return B >= 2 && B <= n - 1 ? song.beats[B - 1] - song.beats[B - 2] : song.beats[n - 1] - song.beats[n - 2]; })();
  const meter = song.meter ?? 4;
  const L = lm[2] === 's' ? Math.round(+lm[1] / ibiHere) : (lm[2] ?? 'b').startsWith('bar') ? +lm[1] * meter : +lm[1];
  if (lm[2] === 's' && Math.abs(L * ibiHere - +lm[1]) > 0.01) opts.say?.(`${lenText} is ${round(+lm[1] / ibiHere, 2)} beats here; using ${L} beats = ${round(L * ibiHere, 3)} s, so the grid after the point stays a grid`);
  const p = planOp(song, op, atBeat, L);
  const song2 = newSong(song, p), nclock = new SClock(song2, [], {});
  const files = [], report = { op, video: name, at: atText, length: lenText, beat: p.B, beats: p.L, T: round(p.T, 4), seconds: round(p.D, 4), ibi: round(p.ibi, 4), bar: labelOf(p.B, meter, song.downbeatPhase ?? 0), files: {}, warnings: [], blockers: [] };
  const problems = [];
  const names = new Set([...Object.keys(cutData.beats ?? {}), ...(song.sections ?? []).map((s) => s.name), ...Object.keys(scoreSections)]);
  const sfxLen = new Map(), sfxLength = (s) => { if (!sfxLen.has(s)) { const f = /^Assets\//.test(s) ? path.join(PROJECT, s) : path.join(PROJECT, 'Assets', 'MusicVideo', 'Sfx', s + (path.extname(s) ? '' : '.mp3')); sfxLen.set(s, fs.existsSync(f) ? audioLength(f) : null); } return sfxLen.get(s); };

  // every file in the folder must be known
  const all = listFiles(dir), kinds = {};
  for (const rel of all) {
    const text = /\.(json|ya?ml|mjs|js)$/i.test(rel) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null;
    const k = classify(rel, text);
    if (!k) { if (!(opts.accept ?? []).includes(rel)) problems.push(`${rel}: this tool doesn't know whether it holds absolute times. Teach tools/mv/clockshift.mjs (classify), or --accept ${rel} if it holds none.`); continue; }
    kinds[rel] = k;
  }
  // tools that name the video and keep its times in code
  for (const t of toolRefs(name)) {
    if (TOOL_TABLES[t]) continue;
    if (TOOL_NOTES[t]) { report.warnings.push(`${t}: ${TOOL_NOTES[t]}`); continue; }
    if (TOOL_NAMES_ONLY.has(t) || (opts.accept ?? []).includes(t)) continue;
    problems.push(`${t} names ${name}: it may hold times in its code that this can't move. Read it; if it holds none, add it to TOOL_NAMES_ONLY in tools/mv/clockshift.mjs, or --accept ${t}.`);
  }
  // generated acts
  const generatedBy = {};
  for (const [rel, k] of Object.entries(kinds)) {
    if (!k.startsWith('generated-act:')) continue;
    const tool = k.slice('generated-act:'.length);
    if (tool === 'tools/cards.mjs') { kinds[rel] = 'generated'; continue; }
    const tt = TOOL_TABLES[tool];
    if (tt) {
      if (fs.existsSync(path.join(dir, tt.data))) { kinds[rel] = 'act'; generatedBy[rel] = tool; report.warnings.push(`${rel} is made by ${tool} from ${tt.data}: both are moved, so running the tool again gives the same times`); }
      else if ((opts.accept ?? []).includes(rel)) { kinds[rel] = 'act'; report.warnings.push(`${rel}: moved as accepted, but ${tool} keeps its own table: running it again puts the old times back`); }
      else problems.push(`${rel} is made by ${tool}, whose times live in its code. ${tt.fix}; then run this again. (--accept ${rel} moves the generated file only.)`);
      continue;
    }
    if (tool === 'tools/face_act.mjs') { kinds[rel] = 'act'; report.warnings.push(`${rel} is made by tools/face_act.mjs from lyrics.json: both are moved; running face_act again gives the same times`); continue; }
    problems.push(`${rel} is generated by ${tool}, which this tool doesn't know: it can't tell where that tool keeps its times`);
  }

  // score and acts, in the compiler's order, carrying "prev" across files as the compiler does
  const state = { prev: 0, clockT: (v, prev) => sclock.T(v, prev), clockDur: (v, t) => sclock.dur(v, t, null) };
  const order = ['score.json', ...Object.keys(kinds).filter((r) => r.startsWith('acts/') && r.endsWith('.json')).sort()];
  for (const rel of order) {
    if (kinds[rel] !== 'act') continue;
    const text = fs.readFileSync(path.join(dir, rel), 'utf8');
    const r = shiftAct(text, rel, p, song, names, state, { drop: opts.drop, sfxLength });
    problems.push(...r.problems); report.warnings.push(...r.warns);
    if (r.changes.length || r.drops.length) { files.push({ rel, text: r.text }); report.files[rel] = { moved: r.changes.length, dropped: r.drops.length, changes: r.changes, drops: r.drops.map((d) => d.at) }; }
  }
  // the cut, against the cut as it compiles now
  let entries = [];
  if (hasCut) {
    try { entries = (await cards.compile(cards.loadVideo(dir))).entries.map((e) => ({ id: e.id, start: e.start, end: e.end })); } catch (e) { problems.push(`the cards don't compile now, so the cut can't be placed: ${String(e.message).split('\n')[0]}`); }
    if (entries.length) {
      const r = shiftCut(fs.readFileSync(path.join(dir, 'cut.json'), 'utf8'), p, song, entries, cutData.beats ?? {}, opts);
      problems.push(...r.problems); report.warnings.push(...r.warns);
      if (r.changes.length) { files.push({ rel: 'cut.json', text: r.text }); report.files['cut.json'] = { moved: r.changes.length, changes: r.changes }; }
    }
  }
  // data
  for (const [rel, k] of Object.entries(kinds)) {
    if (!k.startsWith('data:')) continue;
    try {
      const r = shiftData(k.slice(5), fs.readFileSync(path.join(dir, rel), 'utf8'), p, song, nclock);
      problems.push(...r.problems);
      if (r.changes.length) { files.push({ rel, text: r.text }); report.files[rel] = { moved: r.changes.length, changes: r.changes.slice(0, 400) }; }
    } catch (e) { if (e instanceof ShiftError) problems.push(e.message); else throw e; }
  }
  files.push({ rel: 'song.json', text: JSON.stringify(song2) });
  report.files['song.json'] = { beats: `${song.beats.length} -> ${song2.beats.length}`, duration: `${song.duration} -> ${song2.duration}` };
  // audio: the score's song and the video's own copies
  const audio = [];
  if (!opts.noAudio) {
    const sc = (await import('./jsonc.mjs')).parse(scoreText, 'score.json');
    const songFile = sc.song ? (path.isAbsolute(sc.song) ? sc.song : path.join(PROJECT, sc.song)) : null;
    if (songFile && fs.existsSync(songFile)) audio.push(songFile);
    for (const [rel, k] of Object.entries(kinds)) if (k === 'audio') audio.push(path.join(dir, rel));
    for (const f of audio) { const len = audioLength(f); if (len !== null && len + 0.05 < p.T) report.warnings.push(`${path.basename(f)} is ${round(len, 2)} s, shorter than the point: nothing to splice`); }
    report.audio = audio.map((f) => path.relative(PROJECT, f).split(path.sep).join('/'));
  }
  if (problems.length) { const e = new ShiftError(`${op} ${atText} ${lenText} on ${name}: ${problems.length} problem${problems.length > 1 ? 's' : ''}, nothing written:\n  ${[...new Set(problems)].join('\n  ')}`); e.problems = problems; e.report = report; throw e; }

  // proof before writing: compile the cards in a scratch copy with the new files; every card must land where the map says
  if (hasCut && entries.length) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clockshift-'));
    try {
      for (const rel of all) if (/\.(json|ya?ml)$/i.test(rel) && kinds[rel] && kinds[rel] !== 'ignored') { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(dir, rel), path.join(tmp, rel)); }
      for (const f of files) { fs.mkdirSync(path.dirname(path.join(tmp, f.rel)), { recursive: true }); fs.writeFileSync(path.join(tmp, f.rel), f.text); }
      let after;
      try { after = (await cards.compile(cards.loadVideo(tmp))).entries; } catch (e) { fail(`the rebased cards don't compile, nothing written: ${String(e.message).split('\n')[0]}`); }
      const bad = [], byId = new Map(after.map((e) => [e.id, e]));
      for (const e of entries) {
        const a = byId.get(e.id);
        if (!a) { if (!(p.op === 'remove' && opts.drop)) bad.push(`${e.id} is gone`); continue; }
        const want = mapBeat(p, e.start) ?? p.B;
        if (Math.abs(a.start - want) > 1e-3) bad.push(`${e.id} starts at beat ${round(a.start, 3)}, the map says ${round(want, 3)}`);
      }
      report.proof = { cards: entries.length, checked: entries.length - bad.length, bad };
      if (bad.length) fail(`the rebased cut doesn't land where the map says, nothing written:\n  ${bad.join('\n  ')}`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  return { dir, p, files, audio, report, regenerate: hasCut };
}

export async function apply(prep, { say = console.log, compile = true } = {}) {
  const { dir, p, files, audio, report } = prep;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const bdir = path.join(dir, '_backup', `${p.op}-${report.bar.replace(':', '_')}-${p.L}b-${stamp}`);
  fs.mkdirSync(bdir, { recursive: true });
  for (const f of files) { const src = path.join(dir, f.rel); if (fs.existsSync(src)) { const to = path.join(bdir, f.rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(src, to); } }
  for (const a of audio) { const to = path.join(bdir, 'audio', path.relative(PROJECT, a).replace(/^(\.\.[\\/])+/, '').split(/[\\/]/).join('__')); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(a, to); }
  fs.writeFileSync(path.join(bdir, 'rebase.json'), JSON.stringify({ ...report, map: p.op === 'insert' ? `t >= ${round(p.T, 4)} s -> t + ${round(p.D, 4)} s; beat >= ${p.B} -> beat + ${p.L}` : `t in [${round(p.T, 4)}, ${round(p.T + p.D, 4)}) s removed; t >= ${round(p.T + p.D, 4)} s -> t - ${round(p.D, 4)} s; beat >= ${p.B + p.L} -> beat - ${p.L}`, backup: path.relative(DIRECTOR, bdir).split(path.sep).join('/') }, null, 1));
  for (const f of files) fs.writeFileSync(path.join(dir, f.rel), f.text);
  for (const a of audio) { const tmp = a.replace(/(\.\w+)$/, '.clockshift$1'); spliceAudio(a, tmp, p); fs.renameSync(tmp, a); }
  say(`backup and rebase map: ${path.relative(DIRECTOR, bdir).split(path.sep).join('/')}`);
  if (compile && prep.regenerate) {
    const r = spawnSync(process.execPath, [path.join(DIRECTOR, 'tools', 'cards.mjs'), 'compile', dir], { stdio: 'inherit' });
    if (r.status) say('the cards did not compile after the shift: see above (the backup has every file as it was)');
  }
  return bdir;
}

function printReport(r, say) {
  say(`${r.op} at ${r.at} (beat ${r.beat}, bar ${r.bar}, ${r.T} s): ${r.beats} beats = ${r.seconds} s at ${r.ibi} s a beat`);
  for (const [f, x] of Object.entries(r.files)) say(`  ${f.padEnd(22)} ${x.moved !== undefined ? `${x.moved} times moved${x.dropped ? `, ${x.dropped} cues dropped` : ''}` : Object.entries(x).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (r.audio?.length) say(`  audio: ${r.audio.join(', ')} (silence ${r.op === 'insert' ? 'spliced in' : 'cut out'})`);
  if (r.proof) say(`  proof: ${r.proof.checked} of ${r.proof.cards} cards land where the map says`);
  for (const w of [...new Set(r.warnings)]) say(`  note: ${w}`);
}

// ---------- self test ----------

async function selftest() {
  const results = []; const ok = (name, pass) => { results.push(pass); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}`); };
  const song = { duration: 30, tempo: 120, meter: 4, downbeatPhase: 0, beats: Array.from({ length: 60 }, (_, i) => i * 0.5), sections: [{ name: 's1', bar: 1, bars: 8, t: 0, beat: 0 }, { name: 's2', bar: 9, bars: 7, t: 16, beat: 32 }], onsets: { kick: [1, 17] }, phrases: [[1, 20]], bars: [{ bar: 1, t: 0 }, { bar: 9, t: 16 }], envelopes: { fps: 10, kick: new Array(300).fill(1) } };
  const p = planOp(song, 'insert', 16, 8);
  ok('insert: plan', p.T === 8 && p.D === 4 && p.L === 8);
  const s2 = newSong(song, p);
  ok('insert: song grows, beats after move, new beats on the grid', s2.beats.length === 68 && s2.beats[16] === 8 && s2.beats[24] === 12 && s2.beats[23] === 11.5 && s2.duration === 34);
  ok('insert: sections, onsets, phrases, envelopes', s2.sections[1].t === 20 && s2.sections[1].bar === 11 && s2.sections[0].bars === 10 && s2.onsets.kick.join() === '1,21' && s2.phrases[0].join() === '1,24' && s2.envelopes.kick.length === 340 && s2.envelopes.kick[85] === 0);
  const sv = (v, extra = {}) => shiftValue(v, { p, song, names: new Set(['s2', 'drop']), where: 'test', ...extra });
  ok('times: bar:beat after moves by the beats', sv('5:1').value === '7:1' && sv('5').value === '7' && sv('4:4').changed === false && sv('6:2.5+0.5s').value === '8:2.5+0.5s');
  ok('times: seconds after move by the seconds', sv('8.000s').value === '12.000s' && sv(10).value === 14 && sv('7.99s').changed === false);
  ok('times: names and marks stay (they move themselves)', sv('s2').changed === false && sv('m3').changed === false && sv('drop+1b').changed === false);
  ok('times: relative is reported', sv('+1b').relative === true);
  ok('times: an end at the point stays', shiftValue(8, { p, song, end: true, where: 't' }).value === 8);
  let threw = false; try { sv('soon'); } catch { threw = true; }
  ok('times: a spelling it cannot read stops it', threw);
  const q = planOp(song, 'remove', 16, 8);
  ok('remove: plan and song', q.T === 8 && q.D === 4 && newSong(song, q).beats.length === 52 && newSong(song, q).beats[16] === 8);
  ok('remove: inside is dropped, after moves back', shiftValue('5:2', { p: q, song, where: 't' }).drop === true && shiftValue('7:1', { p: q, song, where: 't' }).value === '5:1');
  ok('remove then insert is the identity on times after', mapTime(q, mapTime(p, 15)) === 15 && mapBeat(q, mapBeat(p, 40)) === 40);
  // text edits keep comments
  const act = '// head\n{\n "cues": [\n  {"at":"5:1","sfx":"a"}, // a comment\n  {"at":"9.000s","do":"blink","on":"p","for":"0.2s"},\n  {"at":"+1b","sfx":"b"}\n ]\n}\n';
  const st = { prev: 0, clockT: (v, prev) => { const C = new (await_score().Clock)(song, [], {}); return C.T(v, prev); }, clockDur: (v, t) => new (await_score().Clock)(song, [], {}).dur(v, t, null) };
  const r = shiftAct(act, 'acts/x.json', p, song, new Set(), st, {});
  ok('acts: edits in place, comments kept', r.text.includes('{"at":"7:1","sfx":"a"}, // a comment') && r.text.includes('"at":"13.000s"') && r.text.startsWith('// head') && r.changes.length === 2);
  const act2 = '{"cues":[{"at":"3:1","sfx":"a"},{"at":"+3bars","sfx":"b"}]}';
  const r2 = shiftAct(act2, 'acts/y.json', p, song, new Set(), { ...st, prev: 0 }, {});
  ok('acts: a relative time that crosses the point is an error', r2.problems.length === 1);
  const r3 = shiftAct('{"cues":[\n  {"at":"5:2","sfx":"a"},\n  {"at":"9:1","sfx":"b"}\n]}', 'acts/z.json', q, song, new Set(), { ...st, prev: 0 }, { drop: true });
  ok('remove --drop takes the cue out and keeps the list valid', r3.drops.length === 1 && JSON.parse(r3.text).cues.length === 1 && JSON.parse(r3.text).cues[0].at === '7:1');
  ok('files: an unknown file is refused, known ones are placed', classify('mystery.json', '{}') === null && classify('acts/80-sfx.json', '{}') === 'act' && classify('acts/70-lines.json', '// GENERATED by Director/tools/punch_lines.mjs: x') === 'generated-act:tools/punch_lines.mjs' && classify('cards/a.yaml') === 'relative' && classify('audio.mp3') === 'audio' && classify('cut.before-slow.json') === 'ignored');
  const bad = results.filter((x) => !x).length;
  console.log(`${results.length - bad} of ${results.length} passed`);
  return bad ? 1 : 0;
}
let scoreMod = null;
const await_score = () => scoreMod;

// ---------- command line ----------

export async function main(argv, say = console.log) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (['--dry', '--drop', '--no-audio', '--no-compile', '--json'].includes(a)) flags[a.slice(2)] = true; else if (a === '--accept') flags.accept = (argv[++i] ?? '').split(',').filter(Boolean); else if (a === '--video') flags.video = argv[++i]; else flags._.push(a); }
  const [op, ...rest] = flags._;
  if (op === 'test') { scoreMod = await import('./score.mjs'); return selftest(); }
  if (!['insert', 'remove'].includes(op)) { say(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(4, 9).join('\n')); return 1; }
  let video = flags.video;
  if (rest.length === 3) video = rest.shift();
  if (rest.length !== 2) { say(`usage: ${op} [<video>] <at> <length>`); return 1; }
  if (!video) fail('which video? --video <name> or a name before <at>');
  const dir = fs.existsSync(path.join(DIRECTOR, 'videos', video)) ? path.join(DIRECTOR, 'videos', video) : fs.existsSync(video) ? path.resolve(video) : fail(`no video called "${video}": ${listVideos().join(', ')}`);
  const prep = await prepare(dir, op, rest[0], rest[1], { drop: flags.drop, accept: flags.accept, noAudio: flags['no-audio'], say });
  printReport(prep.report, say);
  if (flags.json) say(JSON.stringify(prep.report, null, 1));
  if (flags.dry) { say('dry run: nothing written'); return 0; }
  await apply(prep, { say, compile: !flags['no-compile'] });
  say(`next: mv cards (the clock is ${prep.report.op === 'insert' ? 'longer' : 'shorter'}: Unity's timeline length comes from song.json, so build before rendering)`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { if (e instanceof ShiftError) { console.error(e.message); if (e.report) printReport(e.report, console.error); process.exitCode = 1; } else throw e; });
}
