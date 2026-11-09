#!/usr/bin/env node
// Shot cards: one short card per shot compiles to a normal act. No Unity. Same input, same output.
//   node Director/tools/cards.mjs check   <video>               validate, print the cut
//   node Director/tools/cards.mjs compile <video> [--take s3=b] write <video>/acts/50-cards.json and cards.map.json
//   node Director/tools/cards.mjs why     <video> <card> <key>  which layer set this value
//   node Director/tools/cards.mjs note    <video> <card> <key> <value>   add to J's notes (the strongest layer)
//   node Director/tools/cards.mjs test                          self test: camera math, templates, shifting
// <video> is a folder name under Director/videos, or a path. Format: AGENTS.md, "Shot cards".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as jsonc, where as whereIn, placed } from './mv/jsonc.mjs';
import { watch, RAW, actorKeyProblems, shapeProblems, faceOnly } from './mv/keyuse.mjs';
import { knownKeys } from './mv/lint.mjs';

const DIRECTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(DIRECTOR, 'library');
const OUT_ACT = '50-cards.json', MAP = 'cards.map.json';
export class CardError extends Error {}
const fail = (m) => { throw new CardError(m); };
const isMap = (x) => x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const round = (x, n = 3) => { const f = 10 ** n; const r = Math.round(x * f) / f; return Object.is(r, -0) ? 0 : r; };
const ls = (d, re = /\.(ya?ml|json)$/) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => re.test(f)).sort() : []);
const closest = (name, list) => {
  const dist = (a, b) => { const d = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
  return [...list].sort((a, b) => dist(name, a) - dist(name, b))[0];
};
const known = (what, name, list, where = '') => { const l = [...list]; return `unknown ${what} '${name}'${where}. ${l.length ? `Did you mean '${closest(String(name), l)}'? Known: ${l.slice(0, 24).join(', ')}` : 'None exist yet.'}`; };

// ---- a small YAML: maps, lists, flow [..] {..}, quotes, # comments. Enough for a card; JSON files go through jsonc.

export function yaml(text, file = 'yaml') {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    let s = '', q = null;
    for (let k = 0; k < raw.length; k++) {
      const c = raw[k];
      if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '#' && (k === 0 || /\s/.test(raw[k - 1]))) break;
      s += c;
    }
    s = s.trimEnd();
    if (s.trim() && s.trim() !== '---') lines.push({ n: i + 1, ind: s.length - s.trimStart().length, s: s.trim() });
  });
  const err = (l, m) => fail(`${file}:${l.n}: ${m}`);
  let p = 0;
  const scalar = (s) => {
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    if (s === 'true') return true; if (s === 'false') return false; if (s === 'null' || s === '~') return null;
    if ((s[0] === '"' || s[0] === "'") && s.at(-1) === s[0]) return s.slice(1, -1);
    return s;
  };
  const flow = (s, l) => {
    let i = 0;
    const ws = () => { while (s[i] === ' ') i++; };
    const word = (stop) => {
      ws();
      if (s[i] === '"' || s[i] === "'") { const q = s[i], e = s.indexOf(q, i + 1); if (e < 0) err(l, 'a quote never ends'); const r = s.slice(i + 1, e); i = e + 1; return { r, str: true }; }
      const from = i; while (i < s.length && !stop.includes(s[i])) { if (s[i] === ':' && stop.includes(':') && s[i + 1] !== ' ') { i++; continue; } i++; }
      return { r: s.slice(from, i).trim() };
    };
    const val = (stop) => {
      ws();
      if (s[i] === '[') { i++; const a = []; for (;;) { ws(); if (s[i] === ']') { i++; return a; } a.push(val(',]')); ws(); if (s[i] === ',') i++; else if (s[i] !== ']') err(l, 'a [ list never closes'); } }
      if (s[i] === '{') {
        i++; const o = {}, keys = {}; placed(o, { file, line: l.n, keys });
        for (;;) {
          ws(); if (s[i] === '}') { i++; return o; }
          const k = word(':,}').r; ws();
          if (s[i] !== ':') err(l, `"${k}" in {..} needs a value`);
          keys[k] = l.n; i++; o[k] = val(',}'); ws(); if (s[i] === ',') i++; else if (s[i] !== '}') err(l, 'a { map never closes');
        }
      }
      const w = word(stop);
      return w.str ? w.r : scalar(w.r);
    };
    const r = val(''); ws(); if (i < s.length) err(l, `unexpected text after the value: ${s.slice(i)}`);
    return r;
  };
  const value = (s, l) => (s[0] === '[' || s[0] === '{' ? flow(s, l) : scalar(s));
  const kv = (s) => { const m = s.match(/^("[^"]*"|'[^']*'|[^\s:'"[{][^:]*?)\s*:(?:\s+(.*))?$/); return m ? [m[1].replace(/^["']|["']$/g, ''), m[2]] : null; };
  const block = (ind) => {
    const first = lines[p];
    if (first.s === '-' || first.s.startsWith('- ')) {
      const a = [];
      while (p < lines.length && lines[p].ind === ind && (lines[p].s === '-' || lines[p].s.startsWith('- '))) {
        const l = lines[p], rest = l.s.slice(1).trim();
        if (!rest) { p++; a.push(block(lines[p].ind)); continue; }
        if (kv(rest) && rest[0] !== '{' && rest[0] !== '[') { const inner = ind + l.s.length - rest.length; lines[p] = { ...l, ind: inner, s: rest }; a.push(block(inner)); } else { p++; a.push(value(rest, l)); }
      }
      if (p < lines.length && lines[p].ind > ind) err(lines[p], 'bad indent');
      return a;
    }
    const o = {}, keys = {};
    placed(o, { file, line: first.n, keys });
    while (p < lines.length && lines[p].ind === ind) {
      const l = lines[p], e = kv(l.s);
      if (!e) err(l, `expected "key: value", got: ${l.s}`);
      if (e[0] in o) err(l, `"${e[0]}" appears twice`);
      keys[e[0]] = l.n; p++;
      if (e[1] !== undefined) o[e[0]] = value(e[1], l);
      else if (p < lines.length && (lines[p].ind > ind || (lines[p].ind === ind && lines[p].s.startsWith('- ')))) o[e[0]] = block(lines[p].ind);
      else o[e[0]] = null;
    }
    if (p < lines.length && lines[p].ind > ind) err(lines[p], 'bad indent');
    return o;
  };
  if (!lines.length) return null;
  const r = block(lines[0].ind);
  if (p < lines.length) err(lines[p], 'bad indent');
  return r;
}

function readData(file) {
  const t = fs.readFileSync(file, 'utf8'), name = path.relative(DIRECTOR, file).replace(/\\/g, '/');
  try { return /\.ya?ml$/.test(file) ? yaml(t, name) : jsonc(t, name); } catch (e) { fail(e.message); }
}

// ---- time: everything is in beats from the song's first beat; the output is bar:beat

export function Clock(song, beatNames = {}) {
  const b = song.beats, meter = song.meter ?? 4, phase = song.downbeatPhase ?? 0;
  const timeOf = (x) => { const i = Math.max(0, Math.min(b.length - 2, Math.floor(x))); return b[i] + (x - i) * (b[i + 1] - b[i]); };
  const beatOf = (t) => { let i = 0; while (i < b.length - 2 && b[i + 1] <= t) i++; return i + (t - b[i]) / (b[i + 1] - b[i]); };
  const sections = {};
  for (const s of song.sections ?? []) if (s.name && (s.t ?? s.start) !== undefined) sections[s.name] ??= s.t ?? s.start;
  const c = {
    timeOf, beatOf, meter, last: b.length - 1, names: beatNames,
    // a place on the song: 12, "12:3", "41.2s", or a name from cut.json "beats", any of them + or - a length ("ask_done+0.4s", "30:1-1b")
    at(v) {
      if (typeof v === 'number') return phase + (v - 1) * meter;
      const s = String(v).trim(); let m;
      if (s in beatNames) return c.at(beatNames[s]);
      if ((m = s.match(/^(\d+)$/))) return phase + (+m[1] - 1) * meter;
      if ((m = s.match(/^(\d+):([0-9.]+)$/))) return phase + (+m[1] - 1) * meter + (+m[2] - 1);
      if ((m = s.match(/^([0-9.]+)s$/))) return beatOf(+m[1]);
      if (s in sections) return beatOf(sections[s]);
      // an offset from any of those: a joke lands a beat of silence after a line ends, wherever the line moves
      if ((m = s.match(/^(.+?)\s*([+\-])\s*([0-9.]+\s*(?:b|beat|beats|bar|bars|s))$/))) {
        const base = c.at(m[1].trim()), n = parseFloat(m[3]), u = m[3].replace(/[0-9.\s]/g, '');
        if (u === 's') return beatOf(timeOf(base) + (m[2] === '-' ? -n : n));
        return base + (m[2] === '-' ? -1 : 1) * (u.startsWith('bar') ? n * meter : n);
      }
      fail(`can't read the time '${v}': use 12, 12:3, 41.2s or a name in cut.json "beats", plus or minus a length if you like ("drop+1b", "ask_done+0.4s")`);
    },
    // a length in beats at a place: 4 or "4b", "2bars", "1.5s"
    len(v, from = 0) {
      if (typeof v === 'number') return v;
      const m = String(v).trim().match(/^([0-9.]+)\s*(b|beat|beats|bar|bars|s)?$/);
      if (!m) fail(`can't read the length '${v}': use 4b, 2bars or 1.5s`);
      const n = +m[1], u = m[2] ?? 'b';
      if (u.startsWith('bar')) return n * meter;
      if (u === 's') return beatOf(timeOf(from) + n) - from;
      return n;
    },
    text(x) { const k = x - phase, bar = Math.floor(k / meter + 1e-6), beat = round(k - bar * meter + 1, 4); return `${bar + 1}:${beat}`; },
  };
  return c;
}

// ---- layers: later wins, per key, and we remember who set what

const FIELDS = new Set(['id', 'idea', 'feel', 'set', 'cast', 'camera', 'lens', 'mood', 'light', 'events', 'use', 'note', 'raw', 'extra', 'shot', 'takes', 'sing', 'tags', 'look']); // look: epic | plain, the register (MVEpicFx.cs), switched on the cut // tags: words the shot check reads (tools/mv/shotspec.mjs: ecu pov insert dark offmark)
const NOT_HERE = new Set(['at', 'after', 'len', 'for', 'length', 'order']);

const normCast = (name, v) => {
  if (v === null || isMap(v)) return v;
  // "sofa sit_idle", "door>sofa walk clip:Walking", "clip:IdleSit14"
  const o = {};
  for (const w of String(v).trim().split(/\s+/)) {
    let m;
    if ((m = w.match(/^clip:(.+)$/))) o.clip = m[1];
    else if ((m = w.match(/^(\S+)>(\S+)$/))) { o.at = m[1]; o.to = m[2]; } else if ((m = w.match(/^look:(.+)$/))) o.look = m[1];
    else if (!o.at && !o.perform && !o._first) { o._first = w; } else if (o._first) { o.at = o._first; delete o._first; o.perform = w; } else o.perform = w;
  }
  if (o._first) { o.ambiguous = o._first; delete o._first; }
  return o;
};
const normCamera = (v) => {
  if (v === null || isMap(v)) return v;
  const words = String(v).trim().split(/\s+/), o = { preset: canonPreset(words.shift()) }, on = [];
  for (const w of words) { if (w === 'left' || w === 'right') o.side = w; else on.push(w); }
  if (on.length) o.on = on;
  return o;
};
function normalize(src) {
  const o = clone(src);
  if (isMap(o.cast)) for (const k of Object.keys(o.cast)) o.cast[k] = normCast(k, o.cast[k]);
  if (o.camera !== undefined) o.camera = normCamera(o.camera);
  if (isMap(o.camera) && typeof o.camera.on === 'string') o.camera.on = o.camera.on.split(/\s+/);
  if (o.camera?.preset) o.camera.preset = canonPreset(o.camera.preset);
  if (typeof o.use === 'string') o.use = { [o.use]: {} };
  if (o.extra !== undefined) { o.raw = o.extra; delete o.extra; }
  return o;
}
function layer(into, src, name, prov, prefix = '') {
  for (const [k, v] of Object.entries(src)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isMap(v)) {
      if (!isMap(into[k])) into[k] = {};
      layer(into[k], v, name, prov, p);
    } else {
      if (v === null) delete into[k]; else into[k] = clone(v);
      (prov[p] ??= []).push({ layer: name, value: v });
    }
  }
}

// ---- the camera. Pure math: marks, a heading, a lens. Yaw 0 looks along +z, as the actors stand.

const RAD = Math.PI / 180, THIRD = 1 / 6;
export const lensFov = (mm) => 2 * Math.atan(12 / mm) / RAD;
const PRESETS = {
  'close-up': { lens: 85, frame: 0.5, angle: 25, cam: (s) => s.head - 0.03, aim: 'head', aperture: 4, thirds: [THIRD, THIRD] },
  'extreme-close-up': { lens: 100, frame: 0.22, angle: 15, cam: (s) => s.head - 0.03, aim: 'head', aperture: 2.8, thirds: [0, 0.05] }, // deliberately inside the face: the shot check's frame faults stand down
  medium: { lens: 50, frame: 1.15, angle: 25, cam: (s) => s.head - 0.12, aim: 'head', aperture: 5.6, thirds: [THIRD, THIRD] },
  wide: { lens: 28, frame: 3.2, angle: 30, cam: (s) => Math.max(1.2, s.head - 0.25), aim: 'head', aperture: 16, thirds: [THIRD, 0.12] },
  'two-shot': { lens: 40, frame: 1.5, angle: 0, cam: (s) => s.head - 0.1, aperture: 8 },
  'over-shoulder': { lens: 50, frame: 0.9, aperture: 5.6 },
  'low-hero': { lens: 28, frame: 2.6, angle: 20, cam: (s) => s.y + 0.32, aim: 'head', aperture: 8, thirds: [THIRD, THIRD] },
  'high-lonely': { lens: 35, frame: 4, angle: 15, cam: (s, set) => Math.min((set.ceiling ?? 99) - 0.15, s.head + 1.5), aim: 'head', aperture: 16, thirds: [THIRD, -0.1] },
  tracking: { lens: 35, frame: 1.9, angle: 90, cam: (s) => s.head - 0.15, aim: 'head', aperture: 8, thirds: [THIRD, THIRD] },
  spot: { lens: 35, frame: 2, aim: 'head', aperture: 11, thirds: [0, THIRD] },
};
const ALIASES = { ecu: 'extreme-close-up', xcu: 'extreme-close-up', closeup: 'close-up', cu: 'close-up', mcu: 'medium', ms: 'medium', ws: 'wide', 'two': 'two-shot', twoshot: 'two-shot', ots: 'over-shoulder', 'over-the-shoulder': 'over-shoulder', low: 'low-hero', hero: 'low-hero', 'low-angle': 'low-hero', high: 'high-lonely', lonely: 'high-lonely', 'high-angle': 'high-lonely', track: 'tracking', mark: 'spot' };
function canonPreset(n) { return ALIASES[n] ?? n; }

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dirOf = (yaw) => [Math.sin(yaw * RAD), 0, Math.cos(yaw * RAD)];
const unitFlat = (v) => { const l = Math.hypot(v[0], v[2]) || 1; return [v[0] / l, 0, v[2] / l]; };
const rightOf = (fwd) => unitFlat([fwd[2], 0, -fwd[0]]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rd = (v) => v.map((x) => round(x));
let ASPECT = 16 / 9; // set from the format at each compile
export function lookRot(from, to, screen = [0, 0], fov = 40, aspect = ASPECT) {
  const d = sub(to, from), flat = Math.hypot(d[0], d[2]);
  const t = Math.tan((fov * RAD) / 2);
  const yaw = Math.atan2(d[0], d[2]) / RAD - Math.atan(2 * screen[0] * t * aspect) / RAD;
  const pitch = -Math.atan2(d[1], flat) / RAD + Math.atan(2 * screen[1] * t) / RAD;
  return [round(pitch), round(yaw), 0];
}
const inBounds = (p, b) => !b || (p[0] >= b[0] && p[0] <= b[2] && p[2] >= b[1] && p[2] <= b[3]);

// Where a subject is: an actor on its mark, or a mark, or an actor's bone ("person.chest").
function subjectOf(name, card, stage, ctx) {
  const [who, bone] = name.split('.');
  const c = card.cast?.[who];
  if (c) {
    const st = ctx.place?.(who) ?? null;
    const mark = stage.marks[c.to && ctx.useTo ? c.to : c.at ?? st?.mark];
    if (!mark) fail(`card '${card.id}': camera subject '${who}' has no mark in this card`);
    const y = mark.world[1], head = y + (mark.head ?? (mark.kind === 'seat' ? 1.2 : 1.62));
    const from = stage.marks[c.at ?? st?.mark], at = bone ? { head: 1, neck: 0.92, chest: 0.78, hips: 0.55, hand: 0.62, righthand: 0.62, lefthand: 0.62, foot: 0.05 }[bone.toLowerCase()] ?? 0.6 : 1;
    return { name: who, actor: who, bone: bone ?? 'head', pos: mark.world, y, head, aimY: y + (head - y) * at, face: c.face ?? mark.face ?? 0, from: from?.world, to: c.to ? stage.marks[c.to]?.world : null };
  }
  const m = stage.marks[who];
  if (!m) fail(`card '${card.id}': ${known('camera subject', who, [...Object.keys(card.cast ?? {}), ...Object.keys(stage.marks)], ` (cast or mark of set '${stage.name}')`)}`);
  return { name: who, pos: m.world, y: m.world[1], head: m.world[1], aimY: m.world[1], face: m.face ?? 0, prop: stage.pieces.has(who) ? stage.piece(who) : null };
}

export function camera(card, stage, ctx = {}) {
  const cam = card.camera ?? fail(`card '${card.id}' has no camera`);
  const P = PRESETS[cam.preset] ?? fail(`card '${card.id}': ${known('camera preset', cam.preset, Object.keys(PRESETS))}`);
  const names = cam.on ?? Object.keys(card.cast ?? {}).slice(0, cam.preset === 'two-shot' || cam.preset === 'over-shoulder' ? 2 : 1);
  if (!names.length) fail(`card '${card.id}': camera ${cam.preset} needs a subject: "camera: ${cam.preset} person"`);
  const lens = card.lens ?? cam.lens ?? stage.lensSet?.[cam.preset] ?? P.lens;
  let fov = lensFov(lens);
  const frame = cam.frame ?? P.frame, sideS = cam.side === 'left' ? -1 : cam.side === 'right' ? 1 : (cam.side ?? 1);
  const warn = [], s = {};
  const finish = (pos, S, look) => {
    s.name = card.id; s.pos = rd(pos); s.fov = round(fov, 2);
    if (look) Object.assign(s, look);
    if (S?.actor) s.focus = `${S.actor}.${S.bone}`; else if (S?.prop) s.focus = S.prop;
    if (s.focus) s.aperture = cam.aperture ?? P.aperture;
    if (cam.push) { const f = unitFlat(sub(S.pos, pos)); s.move = rd(add(pos, f, cam.push)); s.ease = 'linear'; }
    if (cam.shake) s.handheld = cam.shake;
    if (cam.dutch) s.dutch = cam.dutch;
    for (const [k, box] of Object.entries(stage.solids ?? {})) { // does anything stand between the lens and the face?
      const to = [S?.pos?.[0], S?.aimY ?? S?.head, S?.pos?.[2]], o = stage.origin ?? [0, 0, 0];
      if (to[0] === undefined || to[1] === undefined) continue;
      for (let i = 1; i < 24; i++) {
        const t = i / 24, x = pos[0] + (to[0] - pos[0]) * t - o[0], y = pos[1] + (to[1] - pos[1]) * t, z = pos[2] + (to[2] - pos[2]) * t - o[2];
        if (x > box[0] && x < box[2] && z > box[1] && z < box[3] && y < box[4]) { warn.push(`the ${k} blocks the view of ${S.actor ?? S.name}`); break; }
      }
    }
    if (s.pos[1] > (stage.ceiling ?? 99) || !inBounds(s.pos, stage.bounds)) warn.push(`camera at [${s.pos}] is outside set '${stage.name}'`);
    return { shot: s, warn };
  };
  const thirds = (S, pos, t, flip) => {
    const fwd = unitFlat(sub(S.pos, pos)), side = dot(dirOf(S.face), rightOf(fwd));
    const x = cam.screen?.[0] ?? (flip ?? (side >= 0 ? -1 : 1)) * t[0] * (ASPECT < 1 ? 0.35 : 1), y = cam.screen?.[1] ?? t[1]; // a tall frame has no thirds to put him on
    return [round(x, 3), round(y, 3)];
  };
  const aimAt = (S, pos, scr) => {
    const composer = [scr[0], round(-scr[1], 3)]; // Cinemachine: +y is down the frame
    if (S.actor) return { look: `${S.actor}.${S.bone}`, ...(S.bone === 'head' ? { lookOffset: [0, 0.09, 0] } : {}), screen: composer }; // the head bone is the skull's base: aim at the eyes
    if (S.prop) return { look: S.prop, screen: composer };
    return { rot: lookRot(pos, [S.pos[0], S.aimY, S.pos[2]], scr, fov) };
  };

  if (cam.preset === 'two-shot') {
    if (names.length < 2) fail(`card '${card.id}': two-shot needs two subjects: "camera: two-shot person her"`);
    const A = subjectOf(names[0], card, stage, ctx), B = subjectOf(names[1], card, stage, ctx);
    const mid = [(A.pos[0] + B.pos[0]) / 2, 0, (A.pos[2] + B.pos[2]) / 2], axis = unitFlat(sub(B.pos, A.pos));
    let n = rightOf(axis); // pick the side both of them face
    if (dot(n, add(dirOf(A.face), dirOf(B.face))) < 0) n = [-n[0], 0, -n[2]];
    const gap = Math.hypot(B.pos[0] - A.pos[0], B.pos[2] - A.pos[2]), h = Math.max(frame, (gap + 1) / (16 / 9));
    const head = Math.max(A.head, B.head), f0 = (fov * RAD) / 2;
    let d = h / 2 / Math.tan(f0), pos = [mid[0] + n[0] * d, P.cam({ head, y: 0 }, stage), mid[2] + n[2] * d];
    if (!inBounds(pos, stage.bounds)) { const k = clampDist(mid, n, d, stage.bounds); pos = [mid[0] + n[0] * k, pos[1], mid[2] + n[2] * k]; fov = 2 * Math.atan(h / 2 / k) / RAD; }
    return finish(pos, { actor: A.actor, bone: 'head', pos: mid }, { rot: lookRot(pos, [mid[0], head - h * 0.2, mid[2]], [0, 0], fov) });
  }
  if (cam.preset === 'over-shoulder') {
    if (names.length < 2) fail(`card '${card.id}': over-shoulder needs two subjects, shoulder first: "camera: over-shoulder person her"`);
    const A = subjectOf(names[0], card, stage, ctx), B = subjectOf(names[1], card, stage, ctx);
    const dir = unitFlat(sub(B.pos, A.pos)), r = rightOf(dir);
    const pos = [A.pos[0] - dir[0] * 0.7 + r[0] * 0.33 * sideS, A.head + 0.02, A.pos[2] - dir[2] * 0.7 + r[2] * 0.33 * sideS];
    return finish(pos, B, aimAt(B, pos, [round(-sideS * THIRD, 3), round(THIRD, 3)]));
  }
  const S = subjectOf(names[0], card, stage, ctx);
  if (cam.preset === 'spot') {
    const m = stage.marks[cam.from ?? cam.mark] ?? fail(`card '${card.id}': spot camera needs "from", ${known('mark', cam.from ?? cam.mark, Object.keys(stage.marks), ` in set '${stage.name}'`)}`);
    return finish(m.world, S, aimAt(S, m.world, thirds(S, m.world, P.thirds)));
  }
  if (cam.preset === 'tracking') {
    const c = S.from ?? S.pos, to = S.to ?? add(c, dirOf(S.face), 0), moving = !!S.to;
    const heading = moving ? unitFlat(sub(to, c)) : dirOf(S.face), n = rightOf(heading);
    const y = P.cam(S, stage);
    let d = frame / 2 / Math.tan((fov * RAD) / 2), sgn = sideS;
    if (stage.bounds) { // ride inside the room: take the side with more space, then come closer and open the lens
      const room = (k) => Math.min(clampDist(c, [n[0] * k, 0, n[2] * k], d, stage.bounds), clampDist(to, [n[0] * k, 0, n[2] * k], d, stage.bounds));
      if (cam.side === undefined && room(-sideS) > room(sideS)) sgn = -sideS;
      const r = room(sgn);
      if (r < d) {
        const wider = 2 * Math.atan(frame / 2 / r) / RAD;
        if (wider > 70) { // no room to ride along: stand off the middle of the walk and pan with her
          const mid = [(c[0] + to[0]) / 2, 0, (c[2] + to[2]) / 2], k = clampDist(mid, [n[0] * sgn, 0, n[2] * sgn], 99, stage.bounds);
          const fixed = [mid[0] + n[0] * sgn * k, y, mid[2] + n[2] * sgn * k];
          return finish(fixed, S, aimAt(S, fixed, thirds({ ...S, pos: mid }, fixed, P.thirds)));
        }
        d = r; fov = wider;
      }
    }
    const off = sgn * d;
    const a = [c[0] + n[0] * off, y, c[2] + n[2] * off];
    if (moving) { const r = finish(a, S, aimAt(S, a, thirds({ ...S, pos: c, face: Math.atan2(heading[0], heading[2]) / RAD }, a, P.thirds))); s.move = rd([to[0] + n[0] * off, y, to[2] + n[2] * off]); s.ease = 'linear'; return r; }
    // No walk in the card: ride along with whatever carries him.
    const r = finish(a, S, aimAt(S, a, thirds(S, a, P.thirds)));
    delete s.pos; delete s.move; s.follow = S.actor ?? fail(`card '${card.id}': tracking needs an actor`); s.offset = [round(off), round(y - S.y), 0]; s.followDamping = [1, 1, 1];
    return r;
  }
  // close-up, medium, wide, low hero, high lonely: stand off along his heading, turned by the angle
  const angle = cam.angle ?? P.angle, y = cam.height ?? P.cam(S, stage);
  const out = (sgn) => dirOf((cam.behind ? 180 : 0) + S.face + sgn * angle);
  const d0 = cam.dist ?? frame / 2 / Math.tan((fov * RAD) / 2);
  const posAt = (dir, d) => [S.pos[0] + dir[0] * d, y, S.pos[2] + dir[2] * d];
  let dir = out(sideS), d = d0, pos = posAt(dir, d);
  if (!inBounds(pos, stage.bounds) && cam.side === undefined && inBounds(posAt(out(-sideS), d0), stage.bounds)) { dir = out(-sideS); pos = posAt(dir, d0); }
  if (!inBounds(pos, stage.bounds)) { d = clampDist(S.pos, dir, d0, stage.bounds); pos = posAt(dir, d); fov = 2 * Math.atan(frame / 2 / d) / RAD; if (fov > 75) warn.push(`set '${stage.name}' is too small for ${cam.preset} here: the lens opened to ${round(fov, 1)} degrees`); }
  return finish(pos, S, aimAt(S, pos, thirds(S, pos, P.thirds)));
}
function clampDist(o, dir, d, b) {
  let k = d;
  for (let i = 0; i < 3; i += 2) {
    const n = i === 0 ? 0 : 2, lo = b[i === 0 ? 0 : 1], hi = b[i === 0 ? 2 : 3];
    if (dir[n] > 1e-6) k = Math.min(k, (hi - o[n]) / dir[n]); else if (dir[n] < -1e-6) k = Math.min(k, (lo - o[n]) / dir[n]);
  }
  return Math.max(0.3, k * 0.98);
}

// ---- the library

function loadSet(name) {
  const file = path.join(LIB, 'sets', name + '.json');
  if (!fs.existsSync(file)) fail(known('set', name, ls(path.join(LIB, 'sets')).map((f) => f.replace(/\.json$/, ''))));
  const s = readData(file), o = s.origin ?? [0, 0, 0];
  if (s.bounds) s.bounds = [s.bounds[0] + o[0], s.bounds[1] + o[2], s.bounds[2] + o[0], s.bounds[3] + o[2]]; // written from the set's own origin
  const marks = {};
  for (const [k, m0] of Object.entries(s.marks ?? {})) { const m = Array.isArray(m0) ? { pos: m0.slice(0, 3), face: m0[3] } : { ...m0 }; m.world = add(o, m.pos ?? [0, 0, 0]); marks[k] = m; }
  const piece = (n) => `${name}_${n}`;
  return { name, ...s, raw: s, file: path.relative(DIRECTOR, file).replace(/\\/g, '/'), origin: o, marks, pieces: new Set(Object.keys(s.actors ?? {})), piece };
}
// A light keyed to a set: "at" a mark plus "offset", or "pos" from the set's center when the set has no such mark. "aim" a mark or a point.
function keyedLight(l, set, anchor) {
  const { at, offset, aim, ...o } = clone(l);
  const subject = add(set.marks.subject?.world ?? set.marks.center?.world ?? set.origin, [0, 1.3, 0]);
  const where = (n) => (n === 'subject' ? subject : set.marks[n] ? add(set.marks[n].world, [0, set.marks[n].kind === 'prop' ? 0 : 1.2, 0]) : null);
  const mark = at ? where(at) : null;
  if (mark) o.pos = rd(add(mark, offset ?? [0, 0, 0])); else if (l.pos) o.pos = rd(add(anchor, l.pos));
  const target = typeof aim === 'string' ? where(aim) ?? subject : Array.isArray(aim) ? add(anchor, aim) : null;
  if (target && o.pos) {
    const d = [target[0] - o.pos[0], target[1] - o.pos[1], target[2] - o.pos[2]];
    o.rot = [round(-Math.atan2(d[1], Math.hypot(d[0], d[2])) / RAD), round(Math.atan2(d[0], d[2]) / RAD), 0];
  }
  return o;
}
function loadMoods() { const f = path.join(LIB, 'moods.json'); return fs.existsSync(f) ? readData(f) : {}; }
function loadLighting(name) {
  const file = path.join(LIB, 'lighting', name + '.json');
  if (!fs.existsSync(file)) fail(known('lighting preset', name, ls(path.join(LIB, 'lighting')).map((f) => f.replace(/\.json$/, ''))));
  return readData(file);
}
const performances = () => {
  const d = path.join(LIB, 'performances');
  return new Set(fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.(json|ya?ml)$/.test(f) && !f.startsWith('_')).map((f) => f.replace(/\.\w+$/, '')) : []);
};
const perfParam = (name, key) => { try { return readData(path.join(LIB, 'performances', name + '.json')).params?.[key]; } catch { return undefined; } };
export async function loadTemplates() {
  const d = path.join(LIB, 'templates'), out = {};
  for (const f of ls(d, /\.mjs$/)) { const m = await import(pathToFileURL(path.join(d, f)).href); out[f.replace(/\.mjs$/, '')] = m.default; }
  return out;
}

// ---- load a video

export function videoDir(v) {
  if (!v) fail('which video? cards.mjs <command> <video>');
  const dirs = [path.join(DIRECTOR, 'videos', v), path.resolve(v)];
  return dirs.find((d) => fs.existsSync(d)) ?? fail(known('video', v, fs.existsSync(path.join(DIRECTOR, 'videos')) ? fs.readdirSync(path.join(DIRECTOR, 'videos')) : []));
}
const stackFile = (dir, sub) => ls(path.join(dir, sub)).map((f) => ({ file: `${sub}/${f}`, data: readData(path.join(dir, sub, f)) }));

function loadCards(dir) {
  const cards = {}, files = {};
  for (const { file, data } of stackFile(dir, 'cards')) {
    const list = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : isMap(data) ? Object.entries(data).map(([id, c]) => ({ id, ...c })) : [];
    for (const c of list) {
      if (!c?.id) fail(`${file}: a card without an id`);
      if (cards[c.id]) fail(`card '${c.id}' is in both ${files[c.id]} and ${file}`);
      for (const k of Object.keys(c)) {
        if (NOT_HERE.has(k)) fail(`${file}, card '${c.id}': '${k}' lives in cut.json. Order and length are held only there.`);
        if (!FIELDS.has(k)) fail(`${file}, card '${c.id}': ${known('field', k, FIELDS)}`);
      }
      for (const [t, take] of Object.entries(c.takes ?? {})) for (const k of Object.keys(take ?? {})) if (!FIELDS.has(k) || k === 'takes' || k === 'id') fail(`${file}, card '${c.id}', take ${t}: ${known('field', k, FIELDS)}`);
      cards[c.id] = c; files[c.id] = file;
    }
  }
  return { cards, files };
}

export function loadVideo(dir) {
  const cutFile = path.join(dir, 'cut.json');
  if (!fs.existsSync(cutFile)) fail(`${path.basename(dir)}: no cut.json. It holds shot order and length.`);
  const cut = readData(cutFile);
  const songFile = [path.join(dir, 'song.json'), path.join(DIRECTOR, 'song.json')].find(fs.existsSync);
  const song = JSON.parse(fs.readFileSync(songFile, 'utf8'));
  const { cards, files } = loadCards(dir);
  const style = [];
  const st = fs.existsSync(path.join(dir, 'style.json')) ? readData(path.join(dir, 'style.json')) : {};
  if (st.inherit) {
    const f = path.join(LIB, 'styles', st.inherit + '.json');
    if (!fs.existsSync(f)) fail(known('style', st.inherit, ls(path.join(LIB, 'styles')).map((x) => x.replace(/\.json$/, ''))));
    style.push({ layer: `style:${st.inherit}`, data: readData(f) });
  }
  style.push({ layer: 'style', data: st });
  const rawStyles = style.map((x) => ({ layer: x.layer, data: x.data }));
  // A style file holds card fields plus the look, which ScoreCompiler.cs and the moods read. Only the card fields go on the layer stack.
  const look = { grade: {}, sky: {}, lens: {} };
  for (const s of style) {
    const { grade, sky, lens, steps, fps, type, cues, about, format, aspect, length, fovScale, make, ...cardy } = s.data; // make: mv make's settings (tools/mv/make.mjs), not a card field
    Object.assign(look.grade, grade); Object.assign(look.sky, sky);
    if (lens && typeof lens === 'object') Object.assign(look.lens, lens); else if (lens !== undefined) cardy.lens = lens;
    if (format) look.format = format;
    if (aspect) look.aspect = aspect;
    if (length) look.length = length;
    s.data = cardy;
  }
  const fmtFile = look.format ? path.join(LIB, 'formats', look.format + '.json') : null;
  if (fmtFile && !fs.existsSync(fmtFile)) fail(known('format', look.format, ls(path.join(LIB, 'formats')).map((x) => x.replace(/\.json$/, ''))));
  look.fmt = fmtFile ? readData(fmtFile) : null;
  const sequences = Object.fromEntries(stackFile(dir, 'sequences').map(({ file, data }) => [path.basename(file).replace(/\.\w+$/, ''), data]));
  const tweaks = stackFile(dir, 'tweaks'), notes = stackFile(dir, 'notes');
  const declared = { actors: {}, models: {} };
  const score = [path.join(dir, 'score.json'), ...ls(path.join(dir, 'acts')).filter((f) => f !== OUT_ACT).map((f) => path.join(dir, 'acts', f))];
  for (const f of score) if (fs.existsSync(f)) { const a = readData(f); Object.assign(declared.actors, a.actors); Object.assign(declared.models, a.models); }
  return { dir, cut, song, cards, files, style, rawStyles, look, sequences, tweaks, notes, declared };
}

const FORBID_LAYER = (src, where) => { for (const k of Object.keys(src ?? {})) if (NOT_HERE.has(k)) fail(`${where}: '${k}' lives in cut.json. Order and length are held only there.`); };

function resolveCard(v, entry, take) {
  const id = entry.id, prov = {}, out = {};
  const put = (data, name) => {
    if (!data) return;
    FORBID_LAYER(data, name);
    for (const k of Object.keys(data)) if (!FIELDS.has(k) || k === 'takes') fail(`${name}, card '${id}': ${known('field', k, FIELDS)}`);
    layer(out, normalize(data), name, prov);
  };
  for (const s of v.style) { const { inherit, ...d } = s.data; put(d, s.layer); }
  if (entry.seq) { if (!v.sequences[entry.seq]) fail(`cut.json, '${id}': ${known('sequence', entry.seq, Object.keys(v.sequences))}`); put(v.sequences[entry.seq], `sequence:${entry.seq}`); }
  const { takes, ...card } = v.cards[id];
  put(card, `card:${v.files[id]}`);
  if (take) {
    if (!takes?.[take]) fail(`card '${id}': ${known('take', take, Object.keys(takes ?? {}))}`);
    put(takes[take], `take:${take}`);
  }
  for (const t of v.tweaks) if (t.data[id]) put(t.data[id], `tweak:${t.file}`);
  for (const t of v.notes) if (t.data[id]) put(t.data[id], `note:${t.file}`);
  out.id = id;
  return { card: out, prov, takes: Object.keys(takes ?? {}) };
}

// ---- nothing silently ignored: see tools/mv/keyuse.mjs

/** file:line of the layer that set a key on a card, like "cards/yard.yaml:14". */
function placeOf(v, r, id, key) {
  const layer = r.prov[key]?.at(-1)?.layer ?? r.prov[key.split('.').slice(0, 2).join('.')]?.at(-1)?.layer ?? `card:${v.files[id]}`;
  const [kind, name] = layer.split(':');
  if (kind === 'sequence') return `sequences/${name}.json`;
  if (kind === 'take' || kind === 'card') {
    let o = v.cards[id], line = whereIn(o)?.line;
    for (const p of key.split('.')) { line = whereIn(o)?.keys?.[p] ?? line; o = o?.[p]; }
    return `${v.files[id]}${line ? `:${line}` : ''}`;
  }
  return name ? name : kind === 'style' ? 'style.json' : layer;
}
const CAST_HINT = {
  args: 'the same performance runs on from the shot before, so its args apply and these are never seen. Put them on the first card of the run',
  then: 'it only applies after a walk to a mark when the next card gives him nothing to do',
  blend: 'it only applies to a clip that starts on this card',
  clip: 'perform wins over clip. Keep one',
};
const STYLE_LENS = ['aperture', 'apertureScale', 'handheld'];
function styleProblems(v) {
  const out = [], keys = knownKeys();
  for (const s of v.rawStyles ?? []) {
    const file = s.layer === 'style' ? 'style.json' : `library/styles/${s.layer.replace('style:', '')}.json`, data = s.data;
    const check = (block, ok, what) => { for (const k of Object.keys(data[block] ?? {})) if (!ok(k)) out.push(`${whereIn(data[block])?.file ?? file}:${whereIn(data[block])?.keys?.[k] ?? 0}: ${block} key '${k}' is not read by anything, so it does nothing. ${what}`); };
    check('grade', (k) => keys.has(k), 'Check it against the Look keys in AGENTS.md.');
    check('sky', (k) => keys.has(k), 'Check it against Sky in AGENTS.md.');
    if (isMap(data.lens)) check('lens', (k) => PRESETS[k] || STYLE_LENS.includes(k), `A style's lens takes camera presets and ${STYLE_LENS.join(', ')}.`);
    check('type', (k) => k === 'caps' || keys.has(k), 'It takes the keys of a text cue, and caps.');
  }
  return out;
}

// ---- compile

function timeline(v, clock) {
  const cut = v.cut, list = (Array.isArray(cut) ? cut : cut.shots ?? fail('cut.json needs "shots": a list')).filter((e) => !e.drop);
  const out = [], byId = {}, warn = [];
  let cursor = clock.at(cut.start ?? 1);
  for (const e of list) {
    if (!e.id) fail('cut.json: a shot without an id');
    if (byId[e.id]) fail(`cut.json: '${e.id}' is in the cut twice`);
    if (!v.cards[e.id]) fail(`cut.json: ${known('card', e.id, Object.keys(v.cards))}`);
    if (e.len === undefined) fail(`cut.json: '${e.id}' needs a len: 4b, 2bars or 1.5s`);
    if (e.at !== undefined && e.after !== undefined) fail(`cut.json: '${e.id}' has both at and after`);
    let start = cursor;
    if (e.after !== undefined) start = byId[e.after]?.end ?? fail(`cut.json: '${e.id}' is after ${known('card', e.after, Object.keys(byId))} (it has to come earlier in the list)`);
    if (e.at !== undefined) {
      start = clock.at(e.at);
      const prev = out.at(-1);
      if (prev && start < prev.end - 1e-6) { warn.push(`'${prev.id}' runs ${round(prev.end - start, 2)} beats past the pin on '${e.id}' (${e.at}): trimmed`); prev.end = start; }
      if (prev && start > prev.end + 1e-6) { warn.push(`'${prev.id}' holds ${round(start - prev.end, 2)} beats until the pin on '${e.id}' (${e.at})`); prev.end = start; }
    }
    const r = { ...e, start, end: start + clock.len(e.len, start) };
    if (r.end > clock.last + 1) fail(`cut.json: '${e.id}' ends at ${clock.text(r.end)}, past the end of the song`);
    out.push(r); byId[e.id] = r; cursor = r.end;
  }
  return { list: out, warn };
}

function relative(cue, entry, clock, who) {
  const c = clone(cue), place = (v) => {
    if (v === undefined || v === 0 || v === '0') return entry.start;
    if (typeof v === 'number') return clock.beatOf(clock.timeOf(entry.start) + v);
    const s = String(v).trim(), m = s.match(/^end(?:-(.+))?$/);
    if (m) return m[1] ? entry.start + entryLen(entry) - clock.len(m[1], entry.start) : entry.end;
    return entry.start + clock.len(s.replace(/^\+/, ''), entry.start);
  };
  c.at = clock.text(place(cue.at));
  if (c.until !== undefined) c.until = clock.text(place(cue.until));
  if (c.who) { c.on = c.who; delete c.who; }
  return c;
}
const entryLen = (e) => e.end - e.start;

// on: kick|snare|hat|all, beat, bar, start, end, or an offset like 2b
// Cues in a card's raw or events that carry an actor off its mark and leave it there (a fly holds its end; a fold swings it): a later card that
// names the same mark puts it back.
const MOVERS = new Set(['fly', 'fold']); // a throw or a catch ends attached to a hand, and a hit's keys or root motion is meant to carry into the next card, so only these
function movesActor(entry, name, clock) { // the beat the last such move ends, or -1; a move whose length can't be read never ends
  let end = -1;
  for (const q of [].concat(entry.card.raw ?? [], entry.card.events ?? [])) {
    if (!q || typeof q !== 'object' || !MOVERS.has(q.do)) continue;
    const on = [].concat(q.on ?? q.who ?? []);
    if (!on.includes(name)) continue;
    try {
      const at = clock.at(relative({ at: q.at ?? 0 }, entry, clock).at), dur = q.for !== undefined ? clock.len(q.for, at) : Infinity;
      const stagger = q.stagger !== undefined ? clock.len(q.stagger, at) * Math.max(0, on.indexOf(name)) : 0;
      end = Math.max(end, at + dur + stagger);
    } catch { end = Infinity; }
  }
  return end;
}

function eventCue(ev, entry, clock, id) {
  const { on, ...rest } = ev, base = { ...rest };
  if (on === undefined) fail(`card '${id}': an event needs "on" (kick, snare, hat, all, beat, bar, or a time like 2b)`);
  if (['kick', 'snare', 'hat', 'all'].includes(on)) return relative({ ...base, onsets: on, until: 'end' }, entry, clock);
  if (on === 'beat' || on === 'bar') return relative({ ...base, repeat: on === 'beat' ? '1b' : '1bar', until: 'end' }, entry, clock);
  if (on === 'start') return relative(base, entry, clock);
  return relative({ ...base, at: on }, entry, clock);
}

export async function compile(v, opts = {}) {
  const clock = Clock(v.song, v.cut.beats ?? {}), { list, warn } = timeline(v, clock);
  v.look ??= { grade: {}, sky: {}, lens: {} };
  const asp = v.look.aspect ?? v.look.fmt?.aspect;
  ASPECT = asp ? asp[0] / asp[1] : 16 / 9;
  const lengthGoal = v.look.length ?? v.look.fmt?.length;
  const templates = await loadTemplates(), perf = performances(), moods = loadMoods(), sets = {};
  const known_actors = v.declared.actors, errors = [], resolved = {}, watched = [];
  const tryy = (f) => { try { return f(); } catch (e) { if (e instanceof CardError) errors.push(e.message); else throw e; } };
  for (const f of v.tweaks.concat(v.notes)) for (const id of Object.keys(f.data)) if (!v.cards[id]) errors.push(`${f.file}: ${known('card', id, Object.keys(v.cards))}`);
  for (const id of Object.keys(v.cards)) if (!list.find((e) => e.id === id)) warn.push(`card '${id}' is not in the cut`);

  const entries = [];
  for (const e of list) {
    const take = opts.takes?.[e.id] ?? e.take;
    const r = tryy(() => resolveCard(v, e, take));
    if (!r) continue;
    resolved[e.id] = r;
    const c = r.card;
    for (const k of ['idea', 'feel']) if (!c[k]) errors.push(`card '${e.id}' has no ${k}: say what the shot is for`);
    if (!c.set) { errors.push(`card '${e.id}' has no set`); continue; }
    const set = (sets[c.set] ??= opts.setOverride?.name === c.set ? opts.setOverride : tryy(() => loadSet(c.set)));
    if (!set) continue;
    set.lensSet = v.look.lens;
    if (isMap(c.camera)) { const w = watch(c.camera); c.camera = w.proxy; watched.push({ id: e.id, r, key: 'camera', w, what: (k) => `camera key '${k}' does nothing on a ${c.camera.preset} camera` }); }
    for (const [n, entry] of Object.entries(c.cast ?? {})) if (isMap(entry)) { const w = watch(entry); c.cast[n] = w.proxy; watched.push({ id: e.id, r, key: `cast.${n}`, w, what: (k) => `${n}'s '${k}' is never used on this card${CAST_HINT[k] ? `: ${CAST_HINT[k]}` : ''}` }); }
    entries.push({ ...e, take, card: c, set });
  }
  // A key that does nothing warns: the shot still builds as it did. Only a real break (below: a parent that can't exist) stops the compile.
  warn.push(...styleProblems(v));
  for (const s of Object.values(sets)) if (s?.raw) for (const p of shapeProblems(s.raw, 'set', s.file)) warn.push(`${p.file}:${p.line}: ${p.msg}. ${p.fix}`);
  for (const [name, m] of Object.entries(moods)) for (const k of Object.keys(m)) if (!knownKeys().has(k)) warn.push(`library/moods.json:${whereIn(m)?.keys?.[k] ?? 0}: mood ${name}: '${k}' is not a look key, so it does nothing. Check it against the Look keys in AGENTS.md.`);

  const cues = [], actors = {}, lights = {}, models = {}, map = [], clear = new Set();
  const push = (c) => cues.push(c);

  // cast: visibility, placing, performing. Nobody ever writes hide or show.
  const names = [...new Set(entries.flatMap((e) => Object.keys(e.card.cast ?? {})))];
  for (const n of names) if (!known_actors[n]) errors.push(`${known('actor', n, Object.keys(known_actors), ` (declare it in ${path.basename(v.dir)}/acts or score.json)`)}: used in ${entries.filter((e) => e.card.cast?.[n]).map((e) => e.id).join(', ')}`);
  const where = {}; // actor -> mark name at each entry
  for (const name of names) {
    let shown = null, cur = null, act = null, gaze = null, heading = null, actArgs = null, movedUntil = -1;
    entries.forEach((e, i) => {
      const c = e.card.cast?.[name];
      const at = clock.text(e.start);
      if (!c) { if (shown !== false) { push({ at, do: 'hide', on: name, each: 0 }); shown = false; act = null; } return; }
      if (c.ambiguous) { const w = c.ambiguous; delete c.ambiguous; if (e.set.marks[w] || c.clip || c.look) c.at = w; else c.perform = w; }
      const mark = c.at ?? (cur?.set === e.set.name ? cur.mark : null);
      if (!mark) { errors.push(`card '${e.id}': ${name} needs a mark in set '${e.set.name}'`); return; }
      (where[e.id] ??= {})[name] = mark;
      const m = e.set.marks[mark];
      if (!m) { errors.push(`card '${e.id}': ${known('mark', mark, Object.keys(e.set.marks), ` in set '${e.set.name}'`)}`); cur = { set: e.set.name, mark }; return; }
      if (c.to && !e.set.marks[c.to]) { errors.push(`card '${e.id}': ${known('mark', c.to, Object.keys(e.set.marks), ` in set '${e.set.name}'`)}`); return; }
      if (shown !== true) { push({ at, do: 'show', on: name, each: 0 }); shown = true; }
      const face = typeof c.face === 'string' ? (e.set.marks[c.face] ? Math.atan2(e.set.marks[c.face].world[0] - m.world[0], e.set.marks[c.face].world[2] - m.world[2]) / RAD : (errors.push(`card '${e.id}': ${known('mark', c.face, Object.keys(e.set.marks))}`), 0)) : c.face ?? m.face ?? 0;
      if (!cur || cur.set !== e.set.name || cur.mark !== mark) { push({ at, do: 'set', on: name, pos: rd(m.world), rot: [0, round(face), 0], ...(known_actors[name]?.crowd ? { each: 0 } : {}) }); act = null; heading = face; } // a crowd moves as one: without each:0, set stacks every member on the mark
      else if (movedUntil >= 0 && c.at && e.start >= movedUntil - 1e-6) { push({ at, do: 'set', on: name, pos: rd(m.world), rot: [0, round(heading ?? face), 0], ...(known_actors[name]?.crowd ? { each: 0 } : {}) }); } // the same mark named again after a fly or a throw moved him off it: put him back (Hawkes Punch w_out, 51 m off throw_r). The performance runs on
      else if (c.face !== undefined && !c.to && heading !== null && Math.abs(((face - heading + 540) % 360) - 180) > 1) warn.push(`${placeOf(v, resolved[e.id], e.id, `cast.${name}.face`)}: card '${e.id}': ${name}'s face ${round(face, 1)} is ignored: he stays on '${mark}' facing ${round(heading, 1)}, and only a move to a mark turns him. The camera still reads it, so it frames him wrongly. Put a mark on the same spot with this heading and cast him on it`);
      if (cur?.mark !== mark || cur?.set !== e.set.name || (c.at && e.start >= movedUntil - 1e-6)) movedUntil = -1;
      cur = { set: e.set.name, mark };
      const what = c.perform ? `p:${c.perform}` : c.clip ? `c:${c.clip}` : null;
      if (c.perform && !perf.has(c.perform)) errors.push(`card '${e.id}': ${known('performance', c.perform, perf, ' in Director/library/performances')}`);
      if (c.to) {
        const goal = e.set.marks[c.to].world, dist = round(Math.hypot(goal[0] - m.world[0], goal[2] - m.world[2]));
        if (c.perform) push({ at, do: 'perform', on: name, name: c.perform, for: `${round(entryLen(e), 3)}b`, dist, to: rd(goal), ...(c.args ?? {}) });
        else if (c.clip) push({ at, do: 'walk', on: name, clip: c.clip, to: rd(goal), for: `${round(entryLen(e), 3)}b` });
        else errors.push(`card '${e.id}': ${name} goes ${mark}>${c.to}: say how, with a performance or clip:<Name>`);
        const stride = c.perform && (c.args?.stride ?? perfParam(c.perform, 'stride'));
        if (stride && e.set.marks[c.to] && entries[i + 1]?.card.cast?.[name]) { // the walk rounds to whole strides and the cut snaps him to the mark: inside a blend that throws his whole body
          const land = stride * (Math.round(dist / stride - 0.95) + 0.95);
          if (Math.abs(land - dist) > 0.06) warn.push(`card '${e.id}': ${name} lands ${round(land, 3)} m along a ${dist} m walk and snaps ${round(Math.abs(land - dist), 2)} m on the cut, in view. Make the marks ${round(stride * (Math.round(dist / stride - 0.95) + 0.95), 3)} m apart`);
        }
        cur = { set: e.set.name, mark: c.to }; act = null;
        const endFace = typeof c.face === 'number' ? c.face : e.set.marks[c.to].face;
        if (endFace !== undefined && (!entries[i + 1]?.card.cast?.[name] || entries[i + 1].set.name === e.set.name)) { push({ at: clock.text(e.end), do: 'set', on: name, pos: rd(goal), rot: [0, round(endFace), 0] }); heading = endFace; } // on the cut, so nobody sees the turn
        const next = entries[i + 1]?.card.cast?.[name];
        if (!next?.perform && !next?.clip) push({ at: clock.text(e.end), do: 'anim', on: name, clip: c.then ?? 'IdleBreathe', blend: '0.3s' });
      } else if (what && what !== act) {
        let end = e.end; // a take runs on over a cut: the same performance on the same mark doesn't restart
        for (let k = i + 1; k < entries.length; k++) {
          const n = entries[k].card.cast?.[name];
          if (!n || entries[k].set.name !== e.set.name || (n.at ?? mark) !== mark || n.to) break;
          if ((n.perform ?? n.clip) !== (c.perform ?? c.clip)) break;
          end = entries[k].end;
        }
        const span = `${round(end - e.start, 3)}b`;
        if (c.perform) push({ at, do: 'perform', on: name, name: c.perform, for: span, ...(c.args ?? {}) });
        else push({ at, do: 'anim', on: name, clip: c.clip, for: span, ...(c.blend !== undefined ? { blend: c.blend } : {}), ...(c.args ?? {}) });
        act = what; actArgs = JSON.stringify(c.args ?? null);
      } else if (what && JSON.stringify((c[RAW] ?? c).args ?? null) === actArgs) void c.args; // the same args repeated on a take that runs on say nothing new
      movedUntil = Math.max(movedUntil, movesActor(e, name, clock));
      const look = c.look ?? null;
      if (look !== gaze) {
        if (look) { const to = known_actors[look] && e.card.cast?.[look] ? `${look}.head` : e.set.marks[look] ? rd(add(e.set.marks[look].world, [0, e.set.marks[look].head ?? 0, 0])) : look.includes('.') ? look : (errors.push(`card '${e.id}': ${known('look target', look, [...Object.keys(e.card.cast ?? {}), ...Object.keys(e.set.marks)])}`), null); if (to) push({ at, do: 'gaze', on: name, to, for: 0 }); } else push({ at, do: 'gaze', on: name, weight: 0, for: 0 });   // a card starts on a cut: a tween here is a body turning through the shot's first frames
        gaze = look;
      }
    });
    if (entries[0] && !entries[0].card.cast?.[name]) cues.unshift({ at: 0, do: 'hide', on: name, each: 0 });
  }

  // A prop that rides a cast actor's bone with "withHost": true ("parent": "doctor.head": her glasses) shows and hides with that actor, so it
  // never hangs in the air where she stands hidden. Only props no card casts themselves.
  for (const [rn, rdef] of Object.entries(known_actors)) {
    const host = rdef?.withHost && typeof rdef?.parent === 'string' && rdef.parent.includes('.') ? rdef.parent.split('.')[0] : null;
    if (!host || !names.includes(host) || names.includes(rn)) continue;
    for (const q of cues.filter((q) => (q.do === 'hide' || q.do === 'show') && q.on === host)) push({ ...q, on: rn });
  }

  // sets: their pieces exist only while a card stands on them
  for (const [name, s] of Object.entries(sets)) {
    if (!s) continue;
    const runs = [];
    for (const e of entries) { if (e.set.name !== name) continue; const r = runs.at(-1); if (r && Math.abs(r.end - e.start) < 1e-6) r.end = e.end; else runs.push({ start: e.start, end: e.end }); }
    if (!runs.length) continue;
    Object.assign(models, s.models);
    const pieces = [];
    for (const [k, a] of Object.entries(s.actors ?? {})) {
      const id = s.piece(k), o = clone(a), lineOf = (key) => `${s.file}:${whereIn(s.raw.actors[k])?.keys?.[key] ?? whereIn(s.raw.actors)?.keys?.[k] ?? 0}`;
      for (const key of ['from', 'until']) if (a[key] !== undefined) warn.push(`${lineOf(key)}: piece '${k}': '${key}' does nothing: a piece exists exactly while a card stands on the set. Remove it`);
      for (const p of actorKeyProblems(a, { ...v.declared.models, ...s.models })) warn.push(`${lineOf(p.key.split('.')[0])}: piece '${k}': ${p.msg}. ${p.fix}`);
      if (a.parent !== undefined) { // under a parent, pos is an offset from it, and the parent is a piece of the same set unless it names another actor
        const bare = String(a.parent).split('.')[0], order = Object.keys(s.actors);
        if (s.actors[bare]) {
          o.parent = s.piece(a.parent);
          if (order.indexOf(bare) > order.indexOf(k)) errors.push(`${lineOf('parent')}: piece '${k}': its parent '${bare}' comes later in the set, so it wouldn't exist yet and this piece would sit at the world origin. Move '${bare}' above it`);
        } else if (!known_actors[bare]) errors.push(`${lineOf('parent')}: piece '${k}': ${known('parent', a.parent, Object.keys(s.actors))}`);
        o.pos = rd(a.pos ?? [0, 0, 0]);
      } else o.pos = rd(add(s.origin, a.pos ?? [0, 0, 0]));
      o.from = clock.text(runs[0].start); o.until = clock.text(runs.at(-1).end);
      actors[id] = o; pieces.push(id);
    }
    for (let i = 1; i < runs.length && pieces.length; i++) { push({ at: clock.text(runs[i - 1].end), do: 'hide', on: pieces, each: 0 }); push({ at: clock.text(runs[i].start), do: 'show', on: pieces, each: 0 }); }
  }

  // light blocks and moods change only when they change. A style's `light` is the default for a card with no set of its own: a set's own rig beats it,
  // and a light written on the card, a sequence, a take, a tweak or a note beats the set (2026-11-07: the clinic style's rig was lighting space).
  const lightOf = (e) => { const w = resolved[e.id]?.prov?.light?.at(-1)?.layer ?? ''; return w.startsWith('style') ? (e.set.light ?? e.card.light) : (e.card.light ?? e.set.light); };
  let lastBlock = null, lastMood = null, lastLook = null;
  const moodKeys = [...new Set(Object.values(moods).flatMap((m) => Object.keys(m)))].sort();
  entries.forEach((e, i) => {
    const c = e.card, lightName = lightOf(e), at = clock.text(e.start);
    const blockKey = `${e.set.name}/${lightName}`;
    if (lightName && blockKey !== lastBlock) {
      const lp = tryy(() => loadLighting(lightName));
      if (lp) {
        for (const p of shapeProblems(lp, 'lighting', `library/lighting/${lightName}.json`)) warn.push(`${p.file}:${p.line}: ${p.msg}. ${p.fix}`);
        if (lp.sky) push({ at, sky: { ...lp.sky, ...e.set.sky, ...v.look.sky }, for: 0 });
        const anchor = e.set.marks.center?.world ?? e.set.origin;
        let end = e.end; for (let k = i + 1; k < entries.length && `${entries[k].set.name}/${lightOf(entries[k])}` === blockKey; k++) end = entries[k].end;
        for (const [k, l] of Object.entries(lp.lights ?? {})) {
          const id = `${e.set.name}_${lightName}_${k}`;
          if (!lights[id]) lights[id] = { ...keyedLight(l, e.set, anchor), intensity: 0 };
          push({ at, light: id, intensity: l.intensity ?? 1, for: 0 });
          push({ at: clock.text(end), light: id, intensity: 0, for: 0 });
        }
      }
    }
    lastBlock = blockKey;
    if (c.mood && c.mood !== lastMood) {
      if (!moods[c.mood] || c.mood === 'base') errors.push(`card '${e.id}': ${known('mood', c.mood, Object.keys(moods).filter((k) => k !== 'base'))}`);
      else { const g = {}; for (const k of moodKeys) { let val = moods[c.mood][k] ?? moods.base?.[k]; if (val !== undefined) { const s = v.look.grade[k]; if (typeof s === 'number') val = round(s + val - (moods.base?.[k] ?? 0), 3); g[k] = val; } } push({ at, grade: g, for: 0 }); } // a mood moves the style's grade, it does not replace it
      lastMood = c.mood;
    }
    // the register: `look: epic | plain` on a card, on its first frame and never blended; a card without one goes back to neither
    const reg = c.look ?? 'none';
    if (reg !== lastLook) {
      if (!['epic', 'plain', 'none'].includes(reg)) errors.push(`card '${e.id}': look '${reg}' is not a register. Use epic or plain.`);
      else if (!(lastLook === null && reg === 'none')) push({ at, grade: { epic: reg === 'epic' ? 1 : 0, plain: reg === 'plain' ? 1 : 0 }, for: 0 });
      lastLook = reg;
    }
  });

  // does the cut fit its format
  const P = v.look.fmt?.pacing;
  if (P && entries.length) {
    const secs = entries.map((e) => clock.timeOf(e.end) - clock.timeOf(e.start)), total = secs.reduce((a, b) => a + b, 0), avg = total / secs.length;
    if (P.avgSeconds && (avg < P.avgSeconds[0] || avg > P.avgSeconds[1])) warn.push(`format ${v.look.format}: shots average ${avg.toFixed(1)} s, the target is ${P.avgSeconds.join('-')} s`);
    const long = secs.findIndex((s) => s > (P.maxSeconds ?? 1e9));
    if (long >= 0) warn.push(`format ${v.look.format}: '${entries[long].id}' runs ${secs[long].toFixed(1)} s, the longest allowed is ${P.maxSeconds} s`);
    if (P.shots && (secs.length < P.shots[0] || secs.length > P.shots[1])) warn.push(`format ${v.look.format}: ${secs.length} shots, the target is ${P.shots.join('-')}`);
    if (lengthGoal && Math.abs(total - lengthGoal) > 0.5) warn.push(`format ${v.look.format}: the cut runs ${total.toFixed(1)} s, the target is ${lengthGoal} s`);
  }

  let singing = null;
  // the shot, templates, events, raw
  for (const e of entries) {
    const c = e.card, r = resolved[e.id], at = clock.text(e.start);
    const known_who = (w, what) => { for (const n of [].concat(w)) if (typeof n === 'string' && !known_actors[n.split('.')[0].split('#')[0]] && !e.set.pieces.has(n.split('.')[0]) && !actors[n]) errors.push(`card '${e.id}': ${what}: ${known('actor', n, [...Object.keys(known_actors), ...[...e.set.pieces].map(e.set.piece)])}`); };
    let cam = null;
    const entryCtx = { useTo: false, place: (who) => ({ mark: where[e.id]?.[who] }) };
    cam = tryy(() => camera(c, e.set, entryCtx));
    if (cam) warn.push(...cam.warn.map((w) => `card '${e.id}': ${w}`));
    const shot = cam?.shot ?? { name: e.id };
    const tcues = [];
    for (const [tname, params] of Object.entries(c.use ?? {})) {
      const t = templates[tname];
      if (!t) { errors.push(`card '${e.id}': ${known('template', tname, Object.keys(templates))}`); continue; }
      for (const k of Object.keys(params ?? {})) if (!(k in (t.params ?? {}))) errors.push(`card '${e.id}', template ${tname}: ${known('parameter', k, Object.keys(t.params ?? {}))}`);
      const distance = (n) => { const S = subjectOf(n, c, e.set, entryCtx), d = sub([S.pos[0], S.aimY, S.pos[2]], shot.pos ?? S.pos); return round(Math.hypot(d[0], d[1], d[2])); };
      const made = t.make({ ...(params ?? {}) }, { shot: clone(shot), card: c, beats: entryLen(e), subject: shot.focus ?? c.camera?.on?.[0], distance });
      if (made.shot) { for (const [k, val] of Object.entries(made.shot)) { if (val === null) delete shot[k]; else shot[k] = val; (r.prov[`shot.${k}`] ??= []).push({ layer: `template:${tname}`, value: val }); } }
      tcues.push(...(made.cues ?? []));
    }
    for (const [k, val] of Object.entries(c.shot ?? {})) { if (val === null) delete shot[k]; else shot[k] = val; }
    e.shot = shot;
    const shotCue = { at, shot };
    push(shotCue);
    if (c.sing && shot.pos) { push({ at, do: 'gaze', on: c.sing, to: shot.pos, for: 0, lead: 2.6, limit: 62 }); singing = c.sing; } else if (singing) { push({ at, do: 'gaze', on: singing, weight: 0, for: 0 }); singing = null; }
    const camPath = shot.dolly ?? (shot.move ? [shot.pos, shot.move] : null); // a moving camera keeps his eyes: the gaze tweens along its path, segment by segment
    if (c.sing && camPath && camPath.length > 1) { const span = entryLen(e), seg = span / (camPath.length - 1); camPath.slice(1).forEach((p, i) => { const off = i === 0 ? Math.min(0.5, seg / 2) : 0, st = e.start + seg * i + off; push({ at: clock.text(st), do: 'gaze', on: c.sing, to: p, for: `${round(seg - off, 3)}b`, ease: 'linear', lead: 2.6, limit: 62 }); }); }
    for (const q of tcues) { if (q.who) known_who(q.who, 'template'); push(relative(q, e, clock)); }
    for (const ev of [].concat(c.events ?? [])) { if (ev.who) known_who(ev.who, 'event'); tryyPush(() => eventCue(ev, e, clock, e.id)); }
    for (const q of [].concat(c.raw ?? [])) tryyPush(() => relative(q, e, clock));
    map.push({ id: e.id, idea: c.idea, feel: c.feel, take: e.take ?? null, at, end: clock.text(e.end), t: round(clock.timeOf(e.start)), tEnd: round(clock.timeOf(e.end)), set: e.set.name, seq: e.seq ?? null, note: c.note ?? null });
  }
  function tryyPush(f) { const q = tryy(f); if (q) push(q); }

  if (!errors.length) for (const x of watched) for (const k of x.w.unread()) if (k !== 'preset' && k !== 'ambiguous') warn.push(`${placeOf(v, x.r, x.id, `${x.key}.${k}`)}: card '${x.id}': ${x.what(k)}`);
  if (errors.length) { const list = [...new Set(errors)], err = new CardError(list.join('\n')); err.list = list; throw err; }

  // stable: by time, and within a time keep the order above (place before perform)
  const beatKey = (q) => (typeof q.at === 'number' ? q.at : clock.at(q.at));
  const sorted = cues.map((q, i) => [q, i]).sort((a, b) => beatKey(a[0]) - beatKey(b[0]) || a[1] - b[1]).map((x) => x[0]);
  return { act: { models, actors, lights, cues: sorted }, map, warn, entries, resolved, where };
}

export function writeAct(act) {
  const head = '// GENERATED by Director/tools/cards.mjs from cut.json, cards/, style, sequences/, tweaks/ and notes/. Never edit it: it is rewritten on every compile.\n';
  const block = (o) => Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  return `${head}{\n  "models": {\n${block(act.models)}\n  },\n  "actors": {\n${block(act.actors)}\n  },\n  "lights": {\n${block(act.lights)}\n  },\n  "cues": [\n${act.cues.map((c) => '    ' + JSON.stringify(c)).join(',\n')}\n  ]\n}\n`;
}

// ---- why

export function why(result, v, id, key) {
  const r = result.resolved[id] ?? fail(known('card in the cut', id, Object.keys(result.resolved)));
  const e = result.entries.find((x) => x.id === id), lines = [];
  if (['len', 'at', 'after', 'order', 'start', 'end'].includes(key)) return [`${id} ${key}: cut.json (at ${result.map.find((m) => m.id === id).at}, ends ${result.map.find((m) => m.id === id).end})`];
  const tries = [key, `cast.${key}`, `shot.${key}`, `camera.${key}`];
  const show = (p) => { lines.push(`${p}:`); r.prov[p].forEach((w, i, a) => lines.push(`  ${i === a.length - 1 ? 'wins ' : '     '}${w.layer} = ${JSON.stringify(w.value)}`)); };
  for (const p of tries) if (r.prov[p]) { show(p); return lines; }
  for (const p of tries) { const kids = Object.keys(r.prov).filter((k) => k.startsWith(p + '.')); if (kids.length) { kids.forEach(show); return lines; } }
  const k = key.replace(/^shot\./, '');
  if (e.shot && e.shot[k] !== undefined) {
    const cam = r.card.camera ?? {}, from = (f) => r.prov[`camera.${f}`]?.at(-1)?.layer ?? r.prov[f]?.at(-1)?.layer;
    lines.push(`shot.${k} = ${JSON.stringify(e.shot[k])}`, `  computed by the camera preset '${cam.preset}' (set by ${from('preset')}) from the marks of set '${e.set.name}' (set by ${from('set')})`);
    if (r.prov.lens) lines.push(`  lens set by ${from('lens')}`);
    return lines;
  }
  return [`${id}: nothing set '${key}'. Set keys: ${Object.keys(r.prov).join(', ')}`];
}

// ---- commands

function takesFlag(args) {
  const i = args.indexOf('--take'), takes = {};
  if (i >= 0) { for (const t of String(args[i + 1] ?? '').split(',')) { const [id, name] = t.split('='); if (!id || !name) fail('--take wants card=take, like --take s3=b'); takes[id] = name; } args.splice(i, 2); }
  return takes;
}

async function selftest() {
  const results = [];
  const ok = (name, c) => { results.push([name, !!c]); if (!c) console.error('FAIL', name); };
  const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;
  ok('lens 50mm', near(lensFov(50), 27, 0.05));
  ok('look straight on', lookRot([0, 1, -3], [0, 1, 0])[1] === 0 && lookRot([0, 1, -3], [0, 1, 0])[0] === 0);
  ok('look down is +x', lookRot([0, 2, -3], [0, 1, 0])[0] > 0);
  ok('look to +x is +y', near(lookRot([0, 1, 0], [1, 1, 0])[1], 90));
  const y = yaml('- id: a\n  cast: {person: sofa sit, her: "x y"}\n  use: [1, 2]\n  events:\n    - {on: kick, pulse: {zoom: 0.1}}\n# note\n- id: b # c\n  at: 12:3\n');
  ok('yaml', y[0].cast.her === 'x y' && y[0].events[0].pulse.zoom === 0.1 && y[1].at === '12:3' && y[0].use[1] === 2);
  const stage = { name: 't', marks: { s: { world: [0, 0, 0], face: 0 }, b: { world: [2, 0, 0], face: -90 } }, pieces: new Set(), bounds: [-9, -9, 9, 9] };
  const card = { id: 'c', cast: { p: { at: 's' }, q: { at: 'b' } }, camera: { preset: 'close-up', on: ['p'] } };
  const a = camera(card, stage).shot;
  ok('close-up is in front of him at eye height', a.pos[2] > 0.5 && near(a.pos[1], 1.59));
  ok('close-up frames half a metre', near(Math.hypot(a.pos[0], a.pos[2]), 0.25 / Math.tan((a.fov * RAD) / 2), 0.03));
  ok('he looks into the frame', a.screen[0] !== 0);
  const small = { ...stage, bounds: [-1, -1, 1, 1] };
  const w = camera({ ...card, camera: { preset: 'wide', on: ['p'] } }, small).shot;
  ok('a wall pulls the camera in and opens the lens', inBounds(w.pos, small.bounds) && w.fov > lensFov(28));
  ok('two-shot sees both', camera({ ...card, camera: { preset: 'two-shot', on: ['p', 'q'] } }, stage).shot.rot !== undefined);
  ok('no shake by default', a.handheld === undefined);
  ok('a solid in the way is reported', camera(card, { ...stage, origin: [0, 0, 0], solids: { post: [a.pos[0] / 2 - 0.2, a.pos[2] / 2 - 0.2, a.pos[0] / 2 + 0.2, a.pos[2] / 2 + 0.2, 4] } }).warn.length === 1);
  const song = { beats: [...Array(100).keys()].map((i) => i * 0.5), meter: 4, sections: [] }, c = Clock(song);
  ok('clock', c.at('2:3') === 6 && c.len('2bars') === 8 && c.text(6) === '2:3' && near(c.len('1s', 0), 2));
  { const n = Clock(song, { ask_done: '4.4s' }); ok('clock: a pin can be a name or a time plus or minus a length', near(n.at('ask_done+0.4s'), 9.6) && n.at('2:3+1b') === 7 && n.at('3-1bar') === 4 && near(n.at('10s-0.5s'), 19)); }
  const templates = await loadTemplates();
  for (const [n, t] of Object.entries(templates)) {
    const m = t.make({ ...(t.test ?? {}) }, { shot: { name: 'x', pos: [0, 1, 0], fov: 40, focus: 'person.head' }, card: {}, beats: 8, subject: 'person.head', distance: () => 2 });
    ok(`template ${n}`, m && (m.shot || m.cues?.length) && t.about);
  }
  // the whole path on a small video in memory
  const mk = (id, cast, extra = {}) => ({ id, idea: 'i', feel: 'f', set: 'living_room', cast, camera: 'medium person', ...extra });
  const video = (shots, more = {}) => ({
    dir: 'x', look: { grade: {}, sky: {}, lens: {} }, cut: { shots }, song, files: { a: 't', b: 't', c: 't', d: 't' }, style: [{ layer: 'style', data: { mood: 'calm' } }], sequences: {}, tweaks: [], notes: [],
    declared: { actors: { person: {}, her: {} }, models: {} },
    cards: { a: mk('a', { person: 'sofa clip:Idle1' }), b: mk('b', { person: 'clip:Idle1', her: 'door clip:Idle1' }), c: mk('c', { person: 'clip:Idle1' }, { takes: { x: { mood: 'warm' } } }), d: mk('d', { person: 'clip:Idle1' }) }, ...more,
  });
  const shots = [{ id: 'a', len: '4b' }, { id: 'b', len: '2b' }, { id: 'c', len: '2b' }, { id: 'd', at: 5, len: '4b' }];
  const one = await compile(video(shots)), two = await compile(video(shots));
  ok('same input, same output', writeAct(one.act) === writeAct(two.act));
  const times = (r) => Object.fromEntries(r.map.map((m) => [m.id, m.at]));
  const cutB = times(await compile(video(shots.filter((x) => x.id !== 'b'))));
  ok('removing a card shifts what follows', times(one).c === '2:3' && cutB.c === '2:1');
  ok('a pinned card stays', cutB.d === '5:1' && times(one).d === '5:1');
  const longer = times(await compile(video(shots.map((x) => (x.id === 'a' ? { ...x, len: '6b' } : x)))));
  ok('lengthening shifts what follows', longer.b === '2:3' && longer.d === '5:1');
  ok('cast drives visibility', one.act.cues.some((q) => q.do === 'hide' && q.on === 'her' && q.at === '2:3') && one.act.cues.some((q) => q.do === 'show' && q.on === 'her' && q.at === '2:1'));
  ok('a take runs on over a cut', one.act.cues.filter((q) => q.do === 'anim' && q.on === 'person').length === 1);
  const tweaked = await compile(video(shots, { tweaks: [{ file: 'tweaks/t.json', data: { c: { shot: { fov: 30 }, mood: 'warm' } } }], notes: [{ file: 'notes/n.json', data: { c: { shot: { fov: 22 } } } }] }));
  const shotC = tweaked.act.cues.find((q) => q.shot?.name === 'c').shot;
  ok('notes beat tweaks beat the card', shotC.fov === 22 && tweaked.resolved.c.card.mood === 'warm');
  ok('why names the layers', why(tweaked, null, 'c', 'shot.fov').join(' ').includes('wins note:notes/n.json') && why(tweaked, null, 'c', 'mood').join(' ').includes('wins tweak:'));
  const taken = await compile(video(shots), { takes: { c: 'x' } });
  ok('a take is one flag', taken.resolved.c.card.mood === 'warm' && one.resolved.c.card.mood === 'calm');
  const refuses = async (v, re) => { try { await compile(v); return false; } catch (e) { return e instanceof CardError && re.test(e.message); } };
  ok('an unknown mark is refused', await refuses(video(shots, { cards: { ...video(shots).cards, b: mk('b', { person: 'nowhere clip:Idle1' }) } }), /unknown mark 'nowhere'/));
  ok('a mood lands on its first frame', one.act.cues.some((q) => q.grade && q.for === 0));
  ok('a tweak for no card is refused', await refuses(video(shots, { tweaks: [{ file: 'tweaks/t.json', data: { zzz: {} } }] }), /unknown card 'zzz'/));
  ok('an unknown performance is refused', await refuses(video(shots, { cards: { ...video(shots).cards, a: mk('a', { person: 'sofa nobody_knows' }) } }), /unknown performance/));
  const warned = async (x, re) => (await x).warn.some((w) => re.test(w));
  ok('a camera key the preset never reads warns', await warned(compile(video(shots, { cards: { ...video(shots).cards, a: mk('a', { person: 'sofa clip:Idle1' }, { camera: { preset: 'spot', from: 'sofa', on: 'person', dist: 2 } }) } })), /camera key 'dist' does nothing on a spot camera/));
  ok('args on a take that runs on warn', await warned(compile(video(shots, { cards: { ...video(shots).cards, b: mk('b', { person: { clip: 'Idle1', args: { speed: 2 } } }) } })), /'args' is never used/));
  const turned = await compile(video(shots, { cards: { ...video(shots).cards, b: mk('b', { person: { clip: 'Idle1', face: 90 } }) } }));
  ok('face with no change of mark warns', turned.warn.some((w) => /face 90 is ignored/.test(w)));
  const piece = (a) => { const r = loadSet('living_room'); r.raw = { ...r.raw, actors: { ...r.raw.actors, ...a } }; r.actors = r.raw.actors; r.pieces = new Set(Object.keys(r.actors)); return r; };
  const withPieces = (a) => compile(video(shots), { setOverride: piece(a) });
  ok('a set piece under a parent keeps its offset', (await withPieces({ hinge: { model: 'none', pos: [1, 0, 0] }, leaf: { model: 'none', parent: 'hinge', pos: [0.5, 0, 0] } })).act.actors.living_room_leaf.pos[0] === 0.5);
  const says = async (a, re) => { try { await withPieces(a); return false; } catch (e) { return re.test(e.message); } };
  ok('color on an .obj warns', await warned(withPieces({ tile: { model: 'Assets/x.obj', color: '#fff' } }), /only applies to a prim[^]*skin/));
  ok('from on a piece warns', await warned(withPieces({ tile: { model: 'none', from: '2:1' } }), /does nothing: a piece exists/));
  ok('a parent later in the set is refused', await says({ a1: { model: 'none', parent: 'b1' }, b1: { model: 'none' } }, /comes later in the set/));
  const yl = yaml('- id: a\n  cast: {person: x}\n  camera:\n    preset: wide\n', 'c.yaml');
  ok('yaml keeps lines', whereIn(yl[0]).keys.camera === 3 && whereIn(yl[0].camera).keys.preset === 4);
  ok('an unknown key in a set is refused', shapeProblems({ marks: { a: { pos: [0, 0, 0], hed: 1 } }, cieling: 3 }, 'set', 's.json').length === 2);
  ok('a face-only performance must say any', faceOnly({ cues: [{ do: 'face' }, { do: 'pose', bones: { head: [0, 0, 0] } }] }) && !faceOnly({ cues: [{ do: 'face' }, { do: 'anim' }] }));
  const bad = results.filter((r) => !r[1]).length;
  console.log(`${results.length - bad} of ${results.length} passed`);
  return bad ? 1 : 0;
}

async function main(argv) {
  const args = argv.slice();
  const takes = takesFlag(args);
  const [cmd, name, ...rest] = args;
  if (cmd === 'test') return selftest();
  if (!['check', 'compile', 'why', 'note'].includes(cmd)) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 7).join('\n')); return cmd ? 1 : 0; }
  const dir = videoDir(name);
  if (cmd === 'note') {
    const [id, key, ...val] = rest; if (!id || !key || !val.length) fail('note <video> <card> <key> <value>');
    const file = path.join(dir, 'notes', 'notes.json');
    const cur = fs.existsSync(file) ? readData(file) : {};
    let o = (cur[id] ??= {}); const ks = key.split('.');
    for (const k of ks.slice(0, -1)) o = (o[k] ??= {});
    const text = val.join(' '); let value = text; try { value = JSON.parse(text); } catch {}
    o[ks.at(-1)] = value;
    (await import('./mv/lease.mjs')).warnIfLeased(file);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n');
    console.log(`noted: ${id} ${key} = ${JSON.stringify(value)}`); return 0;
  }
  const v = loadVideo(dir), r = await compile(v, { takes });
  if (cmd === 'why') { if (!rest[1]) fail('why <video> <card> <key>'); console.log(why(r, v, rest[0], rest[1]).join('\n')); return 0; }
  for (const w of r.warn) console.error('warning: ' + w);
  if (cmd === 'compile') {
    fs.mkdirSync(path.join(dir, 'acts'), { recursive: true });
    const { warnIfLeased } = await import('./mv/lease.mjs'), { register, CARD_INPUTS } = await import('./mv/generated.mjs');
    warnIfLeased(path.join(dir, 'acts', OUT_ACT)); warnIfLeased(path.join(dir, MAP));
    fs.writeFileSync(path.join(dir, 'acts', OUT_ACT), writeAct(r.act));
    fs.writeFileSync(path.join(dir, MAP), JSON.stringify(r.map, null, 1) + '\n');
    // generated.json: this act is made from these inputs by this command; mv build regenerates it when they change (tools/mv/generated.mjs)
    register(dir, `acts/${OUT_ACT}`, { tool: `node Director/mv.mjs --video ${path.basename(dir)} cards compile`, inputs: CARD_INPUTS });
    register(dir, MAP, { tool: `node Director/mv.mjs --video ${path.basename(dir)} cards compile`, inputs: CARD_INPUTS });
    console.log(`${r.map.length} cards, ${r.act.cues.length} cues -> ${path.relative(DIRECTOR, path.join(dir, 'acts', OUT_ACT)).replace(/\\/g, '/')}`);
  } else {
    for (const m of r.map) console.log(`${m.at.padEnd(9)}${m.end.padEnd(9)}${m.id.padEnd(16)}${(m.take ? `[${m.take}] ` : '') + m.idea}`);
    console.log(`ok: ${r.map.length} cards, ${r.act.cues.length} cues`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => {
    if (e instanceof CardError) { console.error(e.list ? e.list.map((m) => 'error: ' + m).join('\n') : 'error: ' + e.message); process.exitCode = 1; } else throw e;
  });
}
