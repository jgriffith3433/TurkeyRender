// The bake key in Node, the same as ScoreCompiler.BakeKey (Editor/MVBake.cs): the take's text and what it nests, the parameters it reads,
// its start and length in the song. So `mv cards` can tell which bakes are stale before the build, with no Unity.
//   node Director/tools/bake/key.mjs <video>     lists every human take use, its key and whether its bake exists
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, loadClock, loadScore, videoInfo } from '../mv/score.mjs';

const PERF = path.join(DIRECTOR, 'library', 'performances'), BAKED = path.join(PERF, 'baked');
const parse = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const readPerf = (file) => { try { return fs.readFileSync(path.join(PERF, file + '.json'), 'utf8'); } catch { return null; } };

/** The take's text with every performance it names, as the compiler reads it. */
export function perfText(file, seen = new Set()) {
  if (seen.has(file)) return '';
  seen.add(file);
  const s = readPerf(file);
  if (s === null) return '';
  let out = s.replace(/\r/g, '');
  for (const m of out.matchAll(/"do"\s*:\s*"perform"[^{}]*?"name"\s*:\s*"([\w-]+)"/g)) out += perfText(m[1], seen);
  return out;
}

/** Newtonsoft's compact JSON of a value, which is what the key hashes. */
function compact(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  return JSON.stringify(v);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** FNV-1a over the UTF-16 chars, 64 bits, as the C# does it. */
function fnv(text) {
  let h = 0xcbf29ce484222325n;
  const P = 0x100000001b3n, M = (1n << 64n) - 1n;
  for (let i = 0; i < text.length; i++) { h ^= BigInt(text.charCodeAt(i)); h = (h * P) & M; }
  return h.toString(16).padStart(16, '0').slice(0, 10);
}

/** file: the performance; cue: the perform cue; t, len: seconds. */
export function bakeKey(file, cue, t, len) {
  const text = perfText(file);
  let perf = {}; try { perf = JSON.parse(readPerf(file) ?? '{}'); } catch {}
  const vars = { ...(perf.params ?? {}) };
  const skip = new Set(['do', 'on', 'at', 'name', 'performance', 'for', 'until', 'lead']);
  for (const [k, v] of Object.entries(cue)) if (!k.startsWith('__') && !skip.has(k)) vars[k] = v;
  let b = text;
  for (const k of Object.keys(vars).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))) {
    if (k === 'for' || k === 'length') continue;
    if (new RegExp(`\\$${esc(k)}\\b|"=[^"]*\\b${esc(k)}\\b`).test(text)) b += `|${k}=${compact(vars[k])}`;
  }
  b += `|${t.toFixed(3)}|${len.toFixed(3)}`;
  return `${file}_${fnv(b)}`;
}

/** A take is a performance that has ever been baked, or says "bake": true. The same rule MVBake uses to call a missing bake stale. */
export function isTake(file) {
  try { if (JSON.parse(readPerf(file) ?? '{}').bake === true) return true; } catch {}
  try { return fs.readdirSync(BAKED).some((n) => n.startsWith(file + '_') && n.endsWith('.json')); } catch { return false; }
}

/** Every use of a take by a human in the compiled act: { actor, name, cue, at, t, len, key, baked }. Clones on the same take at the same time share one. */
export function takeUses(V) {
  const act = path.join(V.acts, '50-cards.json');
  if (!fs.existsSync(act)) return [];
  const { score } = loadScore(V), clock = loadClock(V, score);
  const humans = new Set(Object.entries(score.actors ?? {}).filter(([, a]) => /^person\d*$/.test(String(a.model ?? ''))).map(([n]) => n));
  const out = [], seen = new Set();
  for (const c of parse(act).cues ?? []) {
    if (c.do !== 'perform' || !humans.has(c.on)) continue;
    const name = c.name ?? c.performance;
    if (!name || !isTake(name)) continue;
    let t, len, natural;
    try {
      t = clock.T(c.at, 0);
      let perf = {}; try { perf = JSON.parse(readPerf(name) ?? '{}'); } catch {}
      natural = clock.dur(perf.length, t, 1);
      len = c.for !== undefined ? clock.dur(c.for, t, natural) : c.until !== undefined ? clock.T(c.until, t) - t : natural;
    } catch { continue; }
    const key = bakeKey(name, c, t, len);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ actor: c.on, name, cue: c, at: c.at, t: +t.toFixed(3), len: +len.toFixed(3), key, baked: fs.existsSync(path.join(BAKED, key + '.json')) });
  }
  return out;
}

export const staleUses = (V) => takeUses(V).filter((u) => !u.baked);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const V = videoInfo(process.argv[2] ?? 'greener');
  for (const u of takeUses(V)) console.log(`${u.baked ? 'baked' : 'STALE'} ${u.key.padEnd(32)} ${u.actor.padEnd(10)} ${String(u.at).padEnd(6)} ${u.len.toFixed(3)} s`);
}
