// A failed build can't produce frames. Each good build records a hash of everything the scene was built from, taken before it started. `frame`, `sheet`,
// `shot`, `render` and `previs` compare that with the files now and refuse when they differ, or when the last build failed, and say which files changed.
// What goes in: the video's score, acts, cards, cut, style, sequences, tweaks, notes and song, plus every library file those name, followed through
// performances that name others. C# changes are not covered: the first build after one is yours to run.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DIRECTOR } from './score.mjs';

const OWN_DIRS = ['acts', 'cards', 'sequences', 'tweaks', 'notes'], OWN_FILES = ['score.json', 'cut.json', 'style.json', 'song.json'];
const ALWAYS = ['library/moods.json', 'poses.json', 'library/grips.json'];
const LIB_DIRS = ['sets', 'styles', 'formats', 'lighting', 'performances', 'templates'];
const hashOf = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);
const stampFile = (V) => path.join(DIRECTOR, 'gen', `build-${V.name}.json`);
const rel = (f) => path.relative(DIRECTOR, f).replace(/\\/g, '/');

/** Every file the scene depends on, each with a hash. */
export function inputs(V) {
  const files = {}, texts = [];
  const take = (f) => { try { const t = fs.readFileSync(f); files[rel(f)] = hashOf(t); return t.toString('utf8'); } catch { return null; } };
  for (const n of OWN_FILES) { const t = take(path.join(V.dir, n)); if (t && n !== 'song.json') texts.push(t); }
  for (const d of OWN_DIRS) { const dir = path.join(V.dir, d); if (fs.existsSync(dir)) for (const n of fs.readdirSync(dir)) { const t = take(path.join(dir, n)); if (t) texts.push(t); } }
  for (const n of ALWAYS) take(path.join(DIRECTOR, n));
  const library = new Map();
  for (const d of LIB_DIRS) { const dir = path.join(DIRECTOR, 'library', d); if (fs.existsSync(dir)) for (const n of fs.readdirSync(dir)) if (/\.(json|mjs)$/.test(n)) library.set(n.replace(/\.\w+$/, ''), [...(library.get(n.replace(/\.\w+$/, '')) ?? []), path.join(dir, n)]); }
  const seen = new Set();
  for (let i = 0; i < texts.length; i++) { // a file named in a named file counts too: a performance can call another
    for (const m of texts[i].matchAll(/[A-Za-z][\w-]*/g)) {
      if (seen.has(m[0]) || !library.has(m[0])) continue;
      seen.add(m[0]);
      for (const f of library.get(m[0])) { const t = take(f); if (t) texts.push(t); }
    }
  }
  return { hash: hashOf(JSON.stringify(Object.entries(files).sort())), files };
}

const read = (V) => { try { return JSON.parse(fs.readFileSync(stampFile(V), 'utf8')); } catch { return null; } };
const write = (V, o) => { const f = stampFile(V), t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(o, null, 1)); fs.renameSync(t, f); };

/** before: inputs(V) taken before the build began, so an edit made during it still reads as stale. */
export function markBuilt(V, before) { write(V, { ok: true, at: new Date().toISOString(), hash: before.hash, files: before.files }); }

/** Keeps what the last good build was, so the reason can still say what changed. */
export function markFailed(V, why) { const s = read(V) ?? {}; write(V, { ...s, ok: false, failedAt: new Date().toISOString(), why: String(why).split('\n').slice(0, 3).join(' ').slice(0, 300) }); }

/** Why the scene can't be trusted, in plain words, or null. */
export function staleReason(V) {
  const s = read(V);
  if (!s) return { unknown: true, why: `no build of ${V.name} on record yet, so this can't be checked` };
  if (s.ok === false) return { why: `the last build of ${V.name} failed (${s.failedAt}): ${s.why}. The scene still holds an older build.` };
  const now = inputs(V);
  if (now.hash === s.hash) return null;
  const changed = [...new Set([...Object.keys(now.files), ...Object.keys(s.files ?? {})])].filter((f) => now.files[f] !== s.files?.[f]);
  return { why: `the scene was built ${s.at}, and since then these changed: ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? ` and ${changed.length - 6} more` : ''}.` };
}
