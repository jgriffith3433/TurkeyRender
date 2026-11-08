// Where a clip lives, and a stamp of everything about it that reaches a frame: the file, its import settings (.meta), the choices in
// library/motion/import.json (loop, root motion, Foot IK, whether the clean copy is used), and the clean copy in Motion/Clean that a
// native actor plays (Editor/Native/MVClipClean.cs CleanOf). No Unity. shotdeps.mjs puts a stamp per clip a shot plays into its hash.
//   node Director/tools/mv/clipfiles.mjs <clip...>     prints where each clip is and its stamp
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, PROJECT } from './score.mjs';

const CACHE = path.join(DIRECTOR, 'gen', 'clip-files.json');
const IMPORT = path.join(DIRECTOR, 'library', 'motion', 'import.json');
export const CLEAN_DIR = 'Assets/MusicVideo/Motion/Clean', CLEAN_SUFFIX = '__clean';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 16);
const rel = (p) => path.relative(PROJECT, p).split(path.sep).join('/');

let index = null, builtAt = 0, choices = null;

/** name (lower case) -> project-relative files that hold a clip of that name: Humanoid@name.fbx, name.anim, and clips named inside an .fbx.meta. */
function build() {
  const out = {};
  const add = (name, file) => { const k = name.toLowerCase(); (out[k] ??= []).includes(file) || out[k].push(file); };
  const walk = (d) => {
    let names = [];
    try { names = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of names) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'Generated') walk(p); continue; }
      const low = e.name.toLowerCase();
      if (low.endsWith('.anim')) add(e.name.slice(0, -5), rel(p));
      else if (low.endsWith('.fbx')) add(e.name.slice(0, -4).replace(/^.*@/, ''), rel(p));
      else if (low.endsWith('.fbx.meta')) {
        let s = ''; try { s = fs.readFileSync(p, 'utf8'); } catch {}
        const fbx = rel(p).slice(0, -5);
        for (const m of s.matchAll(/^\s*- serializedVersion: \d+\s*\n\s*name: (.+)$/gm)) add(m[1].trim().replace(/^['"]|['"]$/g, ''), fbx);
      }
    }
  };
  walk(path.join(PROJECT, 'Assets'));
  // Clean copies are found by the clean rule, never by name.
  for (const k of Object.keys(out)) { out[k] = out[k].filter((f) => !f.startsWith(CLEAN_DIR + '/')); if (!out[k].length) delete out[k]; }
  index = out; builtAt = Date.now();
  try { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(out)); } catch {}
  return out;
}

function load() {
  if (index) return index;
  try { index = JSON.parse(fs.readFileSync(CACHE, 'utf8')); builtAt = 0; } catch { build(); }
  return index;
}

/** Files that hold this clip. `sure` says the name came from a clip key, so a miss in a cached index means a rescan, once per run. */
const lookCache = new Map();
export function filesOf(name, sure = false) {
  if (typeof name !== 'string' || !name) return [];
  const k = name.toLowerCase(), memo = lookCache.get(k);
  if (memo && (memo.length || !sure || builtAt)) return memo;
  let hit = load()[k];
  const gone = hit?.some((f) => !fs.existsSync(path.join(PROJECT, f)));
  if ((gone || (!hit && sure)) && !builtAt) { lookCache.clear(); hit = build()[k]; }
  lookCache.set(k, hit ?? []);
  return hit ?? [];
}

export function importChoices() {
  if (choices) return choices;
  try { choices = JSON.parse(fs.readFileSync(IMPORT, 'utf8')).clips ?? {}; } catch { choices = {}; }
  return choices;
}

const statOf = (p) => { try { const s = fs.statSync(path.join(PROJECT, p)); return `${s.size}:${Math.floor(s.mtimeMs)}`; } catch { return 'none'; } };
const textOf = (p) => { try { return sha(fs.readFileSync(path.join(PROJECT, p))); } catch { return 'none'; } };
const stampCache = new Map();
/** A file that holds motion: an .anim, a Humanoid@ FBX, or anything in a Motion or Animations folder (not a prop model that shares a name). */
const motionFile = (f) => /\.anim$/i.test(f) || /\/Humanoid@/i.test(f) || /\/(Motion|Animations?)\//i.test(f);

/** The clean copy a native actor plays instead of the clip, or null: MVClipClean.CleanOf (not used when import.json says clean.use false). */
export function cleanOf(name) {
  const c = importChoices()[name];
  if (c?.clean?.use === false) return null;
  const f = `${CLEAN_DIR}/${name}${CLEAN_SUFFIX}.anim`;
  return fs.existsSync(path.join(PROJECT, f)) ? f : null;
}

/** Everything about a clip that changes a frame, as one hash; null when the name is no clip. `native`: a native actor plays it, so the clean copy counts. */
export function clipStamp(name, { native = false, sure = false } = {}) {
  const key = `${name}|${native}|${sure}`;
  if (stampCache.has(key)) return stampCache.get(key);
  const v = clipStampNow(name, native, sure);
  stampCache.set(key, v);
  return v;
}
function clipStampNow(name, native, sure) {
  const files = filesOf(name, sure).filter((f) => sure || motionFile(f));
  if (!files.length) return null;
  const choice = importChoices()[name] ?? importChoices()[Object.keys(importChoices()).find((k) => k.toLowerCase() === name.toLowerCase())] ?? null;
  const bits = files.map((f) => `${f}:${statOf(f)}:${textOf(f + '.meta')}`);
  bits.push(`import:${choice ? sha(JSON.stringify({ choice: choice.choice ?? null, use: choice.clean?.use ?? null })) : 'none'}`);
  if (native) { const c = cleanOf(name); bits.push(`clean:${c ? `${statOf(c)}:${textOf(c + '.meta')}` : 'none'}`); }
  return sha(bits.join('|'));
}

/** Clip names a cue (or a performance file's data) names: `clip`, `from: "clip@1.2s"`, `blendTree` rows, and any string that is a clip's name (a performance's `base` arg). */
export function clipNamesIn(x, out = new Map()) {
  // A loose string (a performance's `base` arg) counts only when a motion file holds a clip of that name: "can" or "person" are models.
  const note = (s, sure) => { if (typeof s !== 'string' || !s || s.length > 80) return; const n = s.replace(/@[^@]*$/, '').trim(); if (!n) return; if (sure || filesOf(n).some(motionFile)) out.set(n, out.get(n) || sure); };
  const walk = (v, key) => {
    if (typeof v === 'string') note(v, key === 'clip');
    else if (Array.isArray(v)) { if (key === 'blendTree') v.forEach((row) => Array.isArray(row) && note(row[0], true)); else v.forEach((y) => walk(y, key)); }
    else if (v && typeof v === 'object') for (const [k, y] of Object.entries(v)) { if (k === 'from' && typeof y === 'string' && y.includes('@')) note(y, true); else walk(y, k); }
  };
  walk(x);
  return out;
}

export function reset() { index = null; builtAt = 0; choices = null; stampCache.clear(); lookCache.clear(); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const n of process.argv.slice(2)) console.log(`${n.padEnd(28)} ${(clipStamp(n, { native: true, sure: true }) ?? 'NOT A CLIP').padEnd(18)} ${filesOf(n).join(', ')}${cleanOf(n) ? `  clean: ${cleanOf(n)}` : ''}`);
}
