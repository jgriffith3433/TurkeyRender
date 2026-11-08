// Review verdicts kept by what the picture is, so a re-review asks Claude only about shots that re-rendered.
// A shot's picture is a pure function of its final shot hash (shotdeps.mjs), and its frame range is in that hash. The 30 fps reviewer
// (tools/review.mjs) reads a shot's frames plus the last 2 of the shot before (the cut strip), so a review shot's key is:
//   the hashes of every final segment its frames overlap, 2 frames before its first to 2 before its last (a cut seen a frame or two late
//   spills into the next shot; that spill is not counted), + the card's idea and feel (they are in the prompt) + STANDARD.md + the model.
// Same key, same strips, same answer: the verdict is carried, with its label of origin. Store: videos/<v>/review/verdicts.json.
// mv final writes the segments of every render it makes to videos/<v>/final/renders/<file>.json, so `mv review` of that file can do this too.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DIRECTOR } from './score.mjs';

export const VERSION = 1; // bump when the strips or the prompt change shape: every verdict is asked again
const MAX_ENTRIES = 4000;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 16);
const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

export const storeFile = (V) => path.join(V.dir, 'review', 'verdicts.json');
export const rendersFile = (V, render) => path.join(V.dir, 'final', 'renders', path.basename(render).replace(/\.mp4$/i, '') + '.json');

/** What mv final made: [{id, f0, f1, hash}] for this file, or null when it wasn't a final (a slice, an old render). */
export function segmentsOf(V, render) {
  const r = read(rendersFile(V, render));
  if (r?.segments?.length) return r.segments;
  // A final from before renders/ existed: its report, when it is the report of this very file.
  const rep = read(path.join(V.dir, 'final', 'report.json'));
  if (rep?.file && path.basename(rep.file) === path.basename(render) && rep.list?.every((x) => x.hash)) {
    const fps = rep.fps ?? 30;
    return rep.list.map((x) => { const f0 = Math.round(x.from * fps); return { id: x.id, f0, f1: f0 + x.frames, hash: x.hash }; });
  }
  return null;
}
export function writeSegments(V, render, segments, fps) {
  const f = rendersFile(V, render);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ file: path.relative(DIRECTOR, render).split(path.sep).join('/'), fps, when: new Date().toISOString(), segments: segments.map((s) => ({ id: s.id, f0: s.f0, f1: s.f1, hash: s.hash })) }, null, 1));
}

export function standardHash() { try { return sha(fs.readFileSync(path.join(DIRECTOR, 'review', 'STANDARD.md'))); } catch { return 'none'; } }

/** The key of a review shot [f0, f1) over these segments, or null when the segments don't cover it (then it is reviewed). */
export function keyOf(segments, s, { model, standard }) {
  const a = Math.max(0, s.f0 - 2), b = Math.max(a + 1, s.f1 - 2);
  const hit = segments.filter((g) => g.f0 < b && g.f1 > a);
  if (!hit.length || hit[0].f0 > a || hit.at(-1).f1 < b) return null;
  return sha(JSON.stringify({ v: VERSION, segs: hit.map((g) => g.hash), f: [s.f0, s.f1], idea: s.idea ?? null, feel: s.feel ?? null, model, standard }));
}

export function loadStore(V) { const s = read(storeFile(V)); return s?.version === VERSION ? s : { version: VERSION, entries: {} }; }
export function saveStore(V, store) {
  const keys = Object.keys(store.entries);
  if (keys.length > MAX_ENTRIES) for (const k of keys.sort((x, y) => (store.entries[x].when ?? '').localeCompare(store.entries[y].when ?? '')).slice(0, keys.length - MAX_ENTRIES)) delete store.entries[k];
  fs.mkdirSync(path.dirname(storeFile(V)), { recursive: true });
  const t = storeFile(V) + `.${process.pid}.tmp`;
  fs.writeFileSync(t, JSON.stringify(store, null, 1));
  fs.renameSync(t, storeFile(V));
}

/** Which review shots keep a verdict and which are asked: pure, for tests and for `mv review --plan`. */
export function carryPlan(shots, segments, store, opts) {
  return shots.map((s) => {
    const key = segments ? keyOf(segments, s, opts) : null, old = key ? store.entries[key] : null;
    return { id: s.id, f0: s.f0, f1: s.f1, key, carry: old ?? null };
  });
}

/** For `mv final --plan`, before anything is rendered: the shots whose verdict can't carry are the ones re-rendered and the one after each (its cut strip). */
export function forecast(planShots) {
  const ask = new Set();
  planShots.forEach((s, i) => { if (!s.reuse) { ask.add(s.id); if (planShots[i + 1]) ask.add(planShots[i + 1].id); } });
  return { ask: ask.size, carry: planShots.length - ask.size };
}

export function selftest(ok) {
  const segs = [{ id: 'a', f0: 0, f1: 30, hash: 'A' }, { id: 'b', f0: 30, f1: 60, hash: 'B' }, { id: 'c', f0: 60, f1: 90, hash: 'C' }];
  const shots = [{ id: 'a', f0: 0, f1: 31 }, { id: 'b', f0: 31, f1: 61 }, { id: 'c', f0: 61, f1: 90 }]; // the cut seen one frame late
  const o = { model: 'm', standard: 's' }, keys = (sg) => shots.map((s) => keyOf(sg, s, o));
  const k0 = keys(segs), k1 = keys(segs.map((g) => (g.id === 'b' ? { ...g, hash: 'B2' } : g)));
  ok('verdicts: same hashes, same keys', JSON.stringify(k0) === JSON.stringify(keys(segs)));
  ok('verdicts: a re-rendered shot is asked again, with the shot after it (its cut strip), not the one before', k0[0] === k1[0] && k0[1] !== k1[1] && k0[2] !== k1[2]);
  ok('verdicts: the card text is in the key', keyOf(segs, { ...shots[0], idea: 'x' }, o) !== k0[0]);
  ok('verdicts: the model is in the key', keyOf(segs, shots[0], { ...o, model: 'n' }) !== k0[0]);
  ok('verdicts: frames the segments do not cover are asked', keyOf(segs, { id: 'z', f0: 80, f1: 120 }, o) === null);
  const store = { version: VERSION, entries: { [k0[0]]: { faults: [], label: 'v1' } } };
  const p = carryPlan(shots, segs, store, o);
  ok('verdicts: the plan carries what the store has', p[0].carry?.label === 'v1' && !p[1].carry);
  const f = forecast([{ id: 'a', reuse: true }, { id: 'b', reuse: false }, { id: 'c', reuse: true }, { id: 'd', reuse: true }]);
  ok('verdicts: the forecast asks the re-rendered shot and the next', f.ask === 2 && f.carry === 2);
}
