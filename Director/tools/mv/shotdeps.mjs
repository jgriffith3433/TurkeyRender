// What a shot's picture depends on, as a hash, so a final render can reuse the shots that didn't change. No Unity.
// It reads the compiled score, not the cards: card, take, tweak, note, style, sequence, set, lighting and mood all end up there,
// so a change in any of them shows as a changed cue or actor, and text that changes no picture (idea, feel, note) changes nothing.
// A frame is a pure function of time and the score, so a shot depends on:
//   - every cue that fires inside it, and every cue from earlier that is still running or whose result still holds (the overlap)
//   - the actors on screen in it, and any actor those or the camera name (their definition, their model files, their cues)
//   - things outside the score: the engine's code, the song, poses and grips, the performances it plays, and the frame size
// Anything this file can't place stays in the chain, so a doubt means a render, never a stale shot.
//   node Director/tools/mv/shotdeps.mjs test
//   node Director/tools/mv/shotdeps.mjs <video> [--fps 30]       prints the shots and their hashes
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, PROJECT, expand, loadClock, loadScore, shotList, videoInfo } from './score.mjs';
import { parse as parseData } from './jsonc.mjs';
import { clipNamesIn, clipStamp, reset as resetClips } from './clipfiles.mjs';

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
export const hashOf = (x) => sha(JSON.stringify(x)).slice(0, 16);
const EPS = 1e-4, SETTLE = 1.2; // the longest a clip handover goes on after its cue (blend x 2, with a default blend)

// Moves that exist only while the cue runs, and how long their tail can be seen after it ends.
const BRIEF = new Set(['hop', 'bob', 'sway', 'shake', 'pulse', 'squash', 'react', 'blink']);
const ROOTY = new Set(['move', 'rotate', 'jump', 'pop', 'shrink', 'spin', 'orbit', 'suck', 'fall', 'scatter', 'topple', 'drop', 'slide', 'scale', 'tremble', 'wobble']);
const AUDIO_ONLY = ['sfx', 'sfxAt', 'sfxVolume', 'volume', 'note', 'lint', 'idea', 'feel'];

const secondsOf = (x, d = SETTLE) => {
  if (typeof x === 'number') return x;
  const m = /^([\d.]+)s$/.exec(String(x ?? ''));
  return m ? +m[1] : d;
};

/** The cue without what only reaches the ears or a reader. */
function pictureCue(c) {
  const o = { ...c };
  for (const k of AUDIO_ONLY) delete o[k];
  if (c.sfx !== undefined && Object.keys(o).filter((k) => !['at', 'for', 'until'].includes(k)).length === 0) return null;
  return o;
}

// ---------- performances ----------

const perfCache = new Map();
function perfFile(name, dir) {
  const key = `${dir}|${name}`;
  if (!perfCache.has(key)) {
    let text = null, data = null;
    try { text = fs.readFileSync(path.join(dir, name + '.json'), 'utf8'); data = parseData(text, name); } catch {}
    perfCache.set(key, { text, data });
  }
  return perfCache.get(key);
}

/** A performance leaves nothing behind when every held thing it starts is let go by its last cue. Then what follows doesn't depend on it. */
export function cleanExit(name, dir) {
  const { data } = perfFile(name, dir);
  if (!data?.exit || !Array.isArray(data.cues)) return false;
  const off = (v) => v === 0;
  const face = new Map(), held = new Map();
  for (const q of data.cues) {
    if (q.do === 'face') { for (const [k, v] of Object.entries(q)) if (!['at', 'do', 'for', 'ease', 'on', 'if'].includes(k)) face.set(k, v); continue; }
    if (q.do === 'perform') { if (!cleanExit(q.name, dir)) return false; continue; }
    if (['anim', 'blink', 'walk', 'stance'].includes(q.do)) continue;
    if (q.do === 'layer') { if (q.for === undefined && q.until === undefined) return false; continue; }
    if (q.do === 'keys') { if (q.release === undefined) return false; continue; }
    if (['gaze', 'plant', 'reach', 'overlap', 'fingers', 'pose'].includes(q.do)) {
      const key = q.do + (q.hand ?? q.foot ?? q.finger ?? q.bone ?? '');
      const zero = q.do === 'overlap' ? off(q.amount) : q.do === 'fingers' ? off(q.curl) : q.do === 'pose' ? (Array.isArray(q.rot) && q.rot.every(off)) : off(q.weight);
      held.set(key, zero);
      continue;
    }
    return false;
  }
  for (const v of face.values()) if (!off(v)) return false;
  for (const v of held.values()) if (!v) return false;
  return true;
}

/** A performance's data and everything it nests, for the clips it names. */
function perfData(name, dir, seen = new Set()) {
  if (!name || seen.has(name)) return [];
  seen.add(name);
  const { data } = perfFile(name, dir), out = data ? [data] : [];
  for (const q of data?.cues ?? []) if (q.do === 'perform' && q.name) out.push(...perfData(q.name, dir, seen));
  return out;
}

function perfTexts(name, dir, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const { text, data } = perfFile(name, dir), out = [`${name}:${text === null ? 'missing' : sha(text).slice(0, 12)}`];
  for (const q of data?.cues ?? []) if (q.do === 'perform' && q.name) out.push(...perfTexts(q.name, dir, seen));
  return out;
}

// ---------- channels: which cues replace which ----------

/** Where a cue writes. `reset` says that once `settle` seconds have passed, nothing before it in that channel matters. `tail` marks a cue that exists only while it runs. */
export function channels(f, perfDir) {
  const { c, fam, len } = f;
  const held = (ch, reset = false, settle = len ?? 0) => ({ ch, reset, settle });
  const brief = (ch, tail) => ({ ch, tail });
  const each = (fn) => [].concat(c.on ?? []).flatMap(fn);
  switch (fam) {
    case 'shot': return [held('camera', !c.shot?.blend, 0)];
    case 'grade': return Object.keys(c.grade ?? {}).map((k) => held(`grade.${k}`, true));
    case 'pulse': return [brief('pulse', 2)];
    case 'sky': return typeof c.sky === 'object' && c.sky ? Object.keys(c.sky).map((k) => held(`sky.${k}`, true)) : [held('sky')];
    case 'light': case 'strobe': case 'lightreact': return [held(`light.${c.light ?? c.strobe ?? c.lightreact}`)];
    case 'tv': return [held(`tv.${c.tv ?? c.tvflash ?? c.tvchange ?? c.tvreact ?? c.tvclip}`)];
    case 'fx': return [brief('fx', 12)];
    case 'text': case 'gfx': case 'flip': case 'insert': return [brief(fam, 8)];
    case 'speed': case 'steps': return [held('time')]; // scene time adds up, so it reaches everything after it
    case 'sfx': return [];
    case 'nothing': return [];
    case 'do': break;
    default: return [held(`other.${fam}`)];
  }
  const kind = c.do;
  return each((a) => {
    if (kind === 'show' || kind === 'hide') return [held(`${a}|vis`, true, 0)];
    if (kind === 'set') return [held(`${a}|root`, !!(c.pos && c.rot), 0)];
    if (ROOTY.has(kind)) return [held(`${a}|root`)];
    if (BRIEF.has(kind)) return [brief(`${a}|brief`, 0.3)];
    if (kind === 'attach') return [held(`${a}|attach`, true, secondsOf(c.blend, 0.2) * 2)];
    if (kind === 'detach') return [held(`${a}|attach`), held(`${a}|root`)];
    if (kind === 'anim') {
      const once = !c.return && !c.blendOut && !c.layer;
      const out = [held(`${a}|clip`, once, secondsOf(c.blend) * 2)];
      if (c.root !== undefined) out.push(held(`${a}|root`));
      return out;
    }
    if (kind === 'walk') return [held(`${a}|clip`), held(`${a}|root`)];
    if (kind === 'perform') {
      const out = [held(`${a}|clip`, cleanExit(c.name ?? c.performance, perfDir), len ?? 0)];
      if (c.to !== undefined || c.dist !== undefined) out.push(held(`${a}|root`));
      return out;
    }
    return [held(`${a}|${kind}`, c.weight === 0 || c.amount === 0)];
  });
}

/** The cues of one channel that reach a stretch of time. */
function reach(list, first, last) {
  const out = [];
  let i = list.length - 1;
  for (; i >= 0 && list[i].f.t > last + EPS; i--); // not yet
  for (; i >= 0; i--) {
    const x = list[i], t = x.f.t;
    if (x.tail !== undefined) {
      const end = t + (x.f.len ?? 0) + x.tail;
      if (end >= first - EPS) out.unshift(x.f);
      continue;
    }
    out.unshift(x.f);
    if (t <= first + EPS && x.reset && t + x.settle <= first + EPS) break;
  }
  return out;
}

// ---------- the shots as frames ----------

const safeId = (s) => s.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 48);

/** Shots as whole frames at this frame rate. Every frame belongs to exactly one, so they join with nothing lost or doubled. */
export function segments(shots, to, fps) {
  const total = Math.ceil(to * fps - 1e-6), first = (t) => Math.ceil(t * fps - 1e-6), out = [], names = new Map();
  const live = shots.filter((s) => first(s.t) < total);
  if (!live.length || first(live[0].t) > 0) out.push({ n: 0, name: 'head', t: 0 });
  out.push(...live);
  const seg = [];
  out.forEach((s, i) => {
    const f0 = first(s.t), f1 = i + 1 < out.length ? first(out[i + 1].t) : total;
    if (f1 <= f0) return; // shorter than a frame: nothing of it is ever seen
    const used = names.get(s.name) ?? 0; names.set(s.name, used + 1);
    seg.push({ id: safeId(s.name) + (used ? `-${used + 1}` : ''), n: s.n, name: s.name, t: s.t, f0, f1 });
  });
  return { list: seg, total };
}

// ---------- files outside the score ----------

const statCache = new Map();
function statsUnder(dir) {
  if (statCache.has(dir)) return statCache.get(dir);
  const out = [], walk = (d) => {
    let names = [];
    try { names = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of names.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { try { const s = fs.statSync(p); out.push(`${path.relative(dir, p)}:${s.size}:${Math.floor(s.mtimeMs)}`); } catch {} }
    }
  };
  walk(dir);
  const h = sha(out.join('\n')).slice(0, 16);
  statCache.set(dir, h);
  return h;
}

/** A model's files. An FBX brings its textures from beside it. A prefab's materials could be anywhere in its pack, so the whole pack counts. */
export function modelStamp(rel) {
  if (!rel || !/^Assets\//.test(rel)) return null;
  const parts = rel.split('/'), ext = path.extname(rel).toLowerCase();
  const inShared = parts[1] === 'MusicVideo' || parts[1] === 'Videos';
  const dir = inShared || ext !== '.prefab' ? parts.slice(0, -1).join('/') : parts.slice(0, 2).join('/');
  return `${dir}:${statsUnder(path.join(PROJECT, dir))}`;
}

const ENGINE_EDITOR = ['ScoreCompiler', 'ScoreLibrary', 'MotionScore', 'MotionWarp', 'MVRagdollBake', 'Models', 'Quality', 'Transport'];

// The native path's compile side (2026-11-07): the Timeline tracks, clean clips and import choices a native actor plays.
// Runtime/MVNativeActing.cs is under Runtime, so it is in the engine for every video already. These count only for a native video,
// so the old videos' engine hash (and their saved shot renders) stay as they were.
export const NATIVE_EDITOR = ['Native/NativeCompile', 'Native/MVClipClean', 'Native/MVClipImport'];

/** NativeCompile.cs's LegacyVideos, read from the C# so it can't go stale. */
export function legacyVideos() {
  try { const m = /LegacyVideos\s*=\s*\{([^}]*)\}/.exec(fs.readFileSync(path.join(PROJECT, 'Assets', 'MusicVideo', 'Editor', 'Native', 'NativeCompile.cs'), 'utf8')); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : []; } catch { return []; }
}
const isHumanDef = (def, models) => { const m = typeof def?.model === 'string' ? def.model : ''; return /^person/i.test(m) || /\/Person\d*\//.test(models?.[m] ?? m); };
/** The actors that play on the native path: NativeCompile.NativeActor (actor flag, then score flag, then not a legacy video), humans only. */
export function nativeActors(videoName, score) {
  const legacy = legacyVideos().includes(videoName), out = new Set();
  for (const [n, def] of Object.entries(score.actors ?? {})) {
    if (!isHumanDef(def, score.models)) continue;
    const on = def.native !== undefined ? !!def.native : score.native !== undefined ? !!score.native : !legacy;
    if (on) out.add(n);
  }
  return out;
}

/** The code and shaders that draw a frame. Tools like the Bridge don't count. `native`: the video plays humans natively, so its compile files count too. */
export function engineHash({ native = false } = {}) {
  const run = path.join(PROJECT, 'Assets', 'MusicVideo', 'Runtime'), hash = crypto.createHash('sha256');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(cs|shader|hlsl|compute|cginc)$/.test(e.name)) hash.update(e.name).update(fs.readFileSync(p));
    }
  };
  walk(run);
  for (const n of ENGINE_EDITOR) { try { hash.update(fs.readFileSync(path.join(PROJECT, 'Assets', 'MusicVideo', 'Editor', n + '.cs'))); } catch {} }
  if (native) for (const n of NATIVE_EDITOR) { try { hash.update('native:' + n).update(fs.readFileSync(path.join(PROJECT, 'Assets', 'MusicVideo', 'Editor', n + '.cs'))); } catch { hash.update('native:' + n + ':missing'); } }
  return hash.digest('hex').slice(0, 16);
}

/** Every "Assets/....ext" string in a value. */
function assetPaths(x, out = []) {
  if (typeof x === 'string') { if (/^Assets\/.+\.\w+$/.test(x)) out.push(x); }
  else if (Array.isArray(x)) x.forEach((v) => assetPaths(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => assetPaths(v, out));
  return out;
}
const fileStamps = new Map();
const fileStamp = (rel) => fileStamps.get(rel) ?? (fileStamps.set(rel, fileStampNow(rel)), fileStamps.get(rel));
const fileStampNow = (rel) => { try { const st = fs.statSync(path.join(PROJECT, rel)); return `${st.size}:${Math.floor(st.mtimeMs)}`; } catch { return 'none'; } };

function fileHash(p) { try { return sha(fs.readFileSync(p)).slice(0, 16); } catch { return 'none'; } }
function statHash(p) { try { const s = fs.statSync(p); return `${s.size}:${Math.floor(s.mtimeMs)}`; } catch { return 'none'; } }

function globals(V, score, native) {
  const song = score.song ? path.join(PROJECT, score.song) : null;
  const own = V.assets ? path.join(PROJECT, V.assets) : null;
  let videoFiles = 'none';
  if (own) {
    // Textures and such that belong to this video. What a build writes doesn't count.
    const skip = new Set(['Generated', 'Song']), bits = [];
    try { for (const e of fs.readdirSync(own, { withFileTypes: true })) if (e.isDirectory() && !skip.has(e.name)) bits.push(`${e.name}:${statsUnder(path.join(own, e.name))}`); } catch {}
    videoFiles = bits.sort().join(',');
  }
  return {
    engine: engineHash({ native }), songData: fileHash(V.song), songAudio: song ? statHash(song) : 'none',
    poses: fileHash(path.join(DIRECTOR, 'poses.json')), grips: fileHash(path.join(DIRECTOR, 'library', 'grips.json')),
    stage: hashOf(score.stage ?? null), shows: hashOf(score.shows ?? null), videoFiles,
  };
}

// ---------- the hash ----------

const clean = (f) => ({ t: Math.round(f.t * 1e4) / 1e4, c: pictureCue(f.c) });

/** Every name of an actor in a value: `person.head`, `flock#3.head`, `person.rightHand:0.1,person.leftHand:0.1`. */
function namesIn(x, known, out = new Set()) {
  if (typeof x === 'string') { for (const w of x.split(/[\s,]+/)) { const n = w.split(/[.#:]/)[0]; if (known.has(n)) out.add(n); } }
  else if (Array.isArray(x)) x.forEach((v) => namesIn(v, known, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => namesIn(v, known, out));
  return out;
}

/**
 * The parts of each segment. Pure: takes the expanded cues, so it can be tested without any files.
 * o: { fires, actors, models, segs, fps, timeOf, perfDir, stampOf, clipStampOf, native }
 *   clipStampOf(name, { native, sure }) -> a stamp of the clip's files, import settings and clean copy, or null for a name that is no clip
 *   native: the set of actors on the native path (their clips count with the clean copy)
 */
export function partsOf(o) {
  const { fires, actors, segs, fps, perfDir } = o;
  const clipStampOf = o.clipStampOf ?? (() => null), native = o.native ?? new Set();
  const models = o.models ?? {}, timeOf = o.timeOf ?? ((x) => (typeof x === 'number' ? x : null)), stampOf = o.stampOf ?? (() => null);
  const chans = new Map();
  for (const f of [...fires].sort((a, b) => a.t - b.t)) {
    if (f.fam === 'do' && pictureCue(f.c) === null) continue;
    for (const x of channels(f, perfDir)) {
      if (!chans.has(x.ch)) chans.set(x.ch, []);
      chans.get(x.ch).push({ ...x, f });
    }
  }
  const known = new Set(Object.keys(actors));
  const actorChans = new Map();
  for (const ch of chans.keys()) {
    const i = ch.indexOf('|');
    if (i < 0) continue;
    const a = ch.slice(0, i);
    if (!actorChans.has(a)) actorChans.set(a, []);
    actorChans.get(a).push(ch);
  }

  return segs.map((s) => {
    const first = s.f0 / fps, last = (s.f1 - 1) / fps, parts = { frames: `${s.f0}-${s.f1}` };
    // Whole-picture channels.
    for (const [ch, list] of chans) {
      if (ch.includes('|')) continue;
      const hit = reach(list, first, last);
      if (!hit.length) continue;
      const group = ch.split('.')[0], key = ['grade', 'sky', 'light', 'tv'].includes(group) ? ch : group;
      parts[key] = hashOf(hit.map(clean));
    }
    // Who is on screen: the actor's own span, and its last show or hide.
    const seen = new Set();
    for (const [a, def] of Object.entries(actors)) {
      const from = def.from !== undefined ? timeOf(def.from) : null, until = def.until !== undefined ? timeOf(def.until) : null;
      if (from !== null && from > last + EPS) continue;
      if (until !== null && until < first - EPS) continue;
      const vis = chans.get(`${a}|vis`) ?? [];
      let on = true, shown = false;
      for (const x of vis) { if (x.f.t <= first + EPS) on = x.f.c.do === 'show'; else if (x.f.t <= last + EPS && x.f.c.do === 'show') shown = true; }
      if (on || shown) seen.add(a);
    }
    // Whoever those, or the camera, or anything on screen names, counts too: a look at a bone, a parent, a grass push.
    const need = new Set(seen), todo = [...seen];
    for (const ch of ['camera', 'fx', 'text', 'gfx']) for (const f of reach(chans.get(ch) ?? [], first, last)) for (const n of namesIn(f.c, known)) if (!need.has(n)) { need.add(n); todo.push(n); }
    const slices = new Map();
    while (todo.length) {
      const a = todo.pop(), hits = [];
      for (const ch of actorChans.get(a) ?? []) hits.push(...reach(chans.get(ch), first, last).map((f) => ({ ch: ch.split('|')[1], f })));
      slices.set(a, hits);
      for (const n of namesIn([actors[a], hits.map((h) => h.f.c)], known)) if (!need.has(n)) { need.add(n); todo.push(n); }
    }
    const clips = new Map(); // clip name -> { sure, native }
    for (const a of [...need].sort()) {
      const def = actors[a];
      if (!def) continue;
      const hits = slices.get(a) ?? [], perf = new Set();
      for (const h of hits) if (h.f.c.do === 'perform') for (const p of perfTexts(h.f.c.name ?? h.f.c.performance, perfDir)) perf.add(p);
      const alias = typeof def.model === 'string' ? def.model : null, file = alias ? models[alias] ?? alias : null;
      parts[`actor ${a}`] = hashOf({ def, model: file, stamp: stampOf(file), perf: [...perf].sort(), cues: hits.map((h) => ({ ch: h.ch, ...clean(h.f) })) });
      // The clips it plays (its cues and the performances they run), each with its own stamp, so a reimport, a new clean copy or an import choice re-renders only the shots that play it.
      const named = new Map();
      for (const h of hits) clipNamesIn(h.f.c, named);
      for (const h of hits) if (h.f.c.do === 'perform') for (const d of perfData(h.f.c.name ?? h.f.c.performance, perfDir)) clipNamesIn(d, named);
      for (const [n, sure] of named) { const x = clips.get(n) ?? { sure: false, native: false }; x.sure ||= sure; x.native ||= native.has(a); clips.set(n, x); }
      // Asset files the definition names beyond its model (a material or texture in another folder).
      const extra = [...new Set(assetPaths(def))].filter((p) => p !== file).sort();
      if (extra.length) parts[`files ${a}`] = hashOf(extra.map((p) => `${p}:${fileStamp(p)}`));
    }
    for (const n of [...clips.keys()].sort()) { const x = clips.get(n), st = clipStampOf(n, x); if (st) parts[`clip ${n}`] = st; }
    return parts;
  });
}

/** Everything final.mjs needs: each segment with its hash and parts. */
export function planShots(V, { fps, w, h, quality = 'final', to, acts }) {
  statCache.clear(); perfCache.clear(); fileStamps.clear(); resetClips();
  const { score } = loadScore(V, { acts }), clock = loadClock(V, score), { fires, shots } = expand(score, clock);
  const end = to ?? clock.duration;
  const { list, total } = segments(shotList(shots, clock).filter((s) => s.len > 0), end, fps);
  const perfDir = path.join(DIRECTOR, 'library', 'performances');
  const timeOf = (x) => { try { return clock.T(x, 0); } catch { return null; } };
  const models = score.models ?? {};
  const native = nativeActors(V.name, score);
  const parts = partsOf({ fires, actors: score.actors ?? {}, models, segs: list, fps, timeOf, perfDir, stampOf: modelStamp, clipStampOf: clipStamp, native });
  const shared = { ...globals(V, score, native.size > 0), frame: `${w}x${h}@${fps} ${quality}` };
  const out = list.map((s, i) => {
    const all = { ...shared, ...parts[i] };
    const hash = hashOf(Object.keys(all).sort().map((k) => [k, all[k]]));
    return { ...s, hash, parts: all };
  });
  return { shots: out, total, end, fires, score, clock, native: [...native] };
}

// ---------- self test ----------

function selftest() {
  const results = [], ok = (name, pass) => { results.push(pass); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}`); };
  const fire = (t, c, fam, len = null) => ({ c: { at: t, ...c }, t, len, fam });
  const shot = (t, name, extra = {}) => fire(t, { shot: { name, pos: [0, 1, 0], ...extra } }, 'shot');
  const segs = [{ id: 'a', f0: 0, f1: 30 }, { id: 'b', f0: 30, f1: 60 }, { id: 'c', f0: 60, f1: 90 }];
  const base = () => [
    shot(0, 'a'), shot(1, 'b'), shot(2, 'c'),
    fire(0, { do: 'show', on: 'p' }, 'do'), fire(0, { do: 'set', on: 'p', pos: [0, 0, 0], rot: [0, 0, 0] }, 'do'),
    fire(1, { do: 'set', on: 'p', pos: [1, 0, 0], rot: [0, 0, 0] }, 'do'),
    fire(1, { do: 'hide', on: 'q' }, 'do'),
    fire(0.2, { grade: { exposure: 0.5 } }, 'grade'),
  ];
  const actors = { p: { model: 'x' }, q: { model: 'y' } };
  const perfDir = path.join(DIRECTOR, 'library', 'performances');
  const run = (f) => partsOf({ fires: f, actors, segs, fps: 30, perfDir });
  const diff = (x, y) => x.map((p, i) => JSON.stringify(p) !== JSON.stringify(y[i]));
  const same = (x, y, want) => JSON.stringify(diff(x, y)) === JSON.stringify(want);
  const a = run(base());
  ok('same input, same parts', same(a, run(base()), [false, false, false]));
  { const f = base(); f[1] = shot(1, 'b', { fov: 20 }); ok('a camera change is that shot alone', same(a, run(f), [false, true, false])); }
  { const f = base(); f.push(fire(1.2, { grade: { exposure: 0.9 } }, 'grade', 0.2)); const r = run(f);
    ok('a grade that holds reaches the shots after it', same(a, r, [false, true, true])); }
  { const f = base(); f.push(fire(1.2, { grade: { exposure: 0.9 } }, 'grade', 0.2), fire(2, { grade: { exposure: 0.1 } }, 'grade'));
    const g = base(); g.push(fire(1.2, { grade: { exposure: 0.7 } }, 'grade', 0.2), fire(2, { grade: { exposure: 0.1 } }, 'grade'));
    ok('a grade replaced at the cut stops there', same(run(f), run(g), [false, true, false])); }
  { const f = base(); f.push(fire(1.8, { grade: { exposure: 0.9 } }, 'grade', 1)); const g = base(); g.push(fire(1.8, { grade: { exposure: 0.7 } }, 'grade', 1));
    ok('a tween running over a cut overlaps the next shot', same(run(f), run(g), [false, true, true])); }
  { const f = base(); f.push(fire(1.5, { speed: 0.5 }, 'speed', 0.1)); ok('slow motion moves every shot after it', same(a, run(f), [false, true, true])); }
  { const f = base(); f.push(fire(0.5, { do: 'rotate', on: 'q', rot: [0, 90, 0] }, 'do')); const r = run(f);
    ok('a hidden actor moving reaches nobody later', same(a, r, [true, false, false])); }
  { const f = base(); f.push(fire(0.5, { do: 'gaze', on: 'p', to: 'q', for: '1s' }, 'do')); ok('a cue that holds on an actor reaches his later shots', same(a, run(f), [true, true, true])); }
  { const f = base(); f.push(fire(0.5, { do: 'move', on: 'p', pos: [2, 0, 0] }, 'do')); ok('a place reset by the next set stops at the cut', same(a, run(f), [true, false, false])); }
  { const f = base(); f.push(fire(2.5, { sfx: 'boom' }, 'sfx')); ok('a sound changes no picture', same(a, run(f), [false, false, false])); }
  { const f = base(); f.splice(2, 1, shot(2, 'c', { look: 'q.head' })); const g = base(); g.splice(2, 1, shot(2, 'c', { look: 'q.head' })); g.push(fire(0.5, { do: 'rotate', on: 'q', rot: [0, 90, 0] }, 'do'));
    ok('the camera naming a hidden actor brings it back in', diff(run(f), run(g))[2]); }
  { const f = base(); f[0] = shot(0, 'a'); f.push(fire(0.9, { do: 'hop', on: 'p', for: '0.2s' }, 'do', 0.2)); ok('a hop is gone after its tail', same(a, run(f), [true, true, false])); }
  // Clips: a shot depends on the clips its actors play, with the clean copy only for a native actor.
  {
    const withClips = () => { const f = base(); f.push(fire(0, { do: 'anim', on: 'p', clip: 'WalkA' }, 'do'), fire(2, { do: 'anim', on: 'p', clip: 'SitB', blend: 0 }, 'do')); return f; };
    const stamps = { WalkA: 'w1', SitB: 's1' }, clean = { WalkA: 'cw1', SitB: 'cs1' };
    const runC = (st, cl, nat) => partsOf({ fires: withClips(), actors, segs, fps: 30, perfDir, native: new Set(nat), clipStampOf: (n, o) => (st[n] ? st[n] + (o.native ? '|' + cl[n] : '') : null) });
    const a0 = runC(stamps, clean, []);
    ok('a shot names the clips it plays', a0[0]['clip WalkA'] === 'w1' && !a0[0]['clip SitB'] && a0[2]['clip SitB'] === 's1');
    ok('a reimported clip re-renders only the shots that play it', same(a0, runC({ ...stamps, SitB: 's2' }, clean, []), [false, false, true]));
    ok('a new clean copy changes nothing on the old path', same(a0, runC(stamps, { ...clean, WalkA: 'cw2' }, []), [false, false, false]));
    const n0 = runC(stamps, clean, ['p']);
    ok('a new clean copy re-renders the native shots that play it', same(n0, runC(stamps, { ...clean, WalkA: 'cw2' }, ['p']), [true, true, false]));
  }
  ok('frames: nothing lost, nothing doubled', (() => {
    const { list, total } = segments([{ n: 1, name: 'a', t: 0 }, { n: 2, name: 'b', t: 1.01 }, { n: 3, name: 'b', t: 1.015 }, { n: 4, name: 'c', t: 2.004 }], 3, 30);
    return total === 90 && list[0].f0 === 0 && list.every((s, i) => i === 0 || s.f0 === list[i - 1].f1) && list.at(-1).f1 === 90;
  })());
  ok('a video that starts late gets a head', segments([{ n: 1, name: 'a', t: 1 }], 2, 30).list[0].id === 'head');
  ok('a performance that lets go is clean', cleanExit('squint_at_sun', perfDir));
  ok('an unknown performance is not', !cleanExit('nobody_knows', perfDir));
  const bad = results.filter((r) => !r).length;
  console.log(`${results.length - bad} of ${results.length} passed`);
  return bad ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd] = process.argv.slice(2);
  if (cmd === 'test') process.exitCode = selftest();
  else if (cmd) {
    const V = videoInfo(cmd), r = planShots(V, { fps: 30, w: 1280, h: 720 });
    for (const s of r.shots) console.log(`${s.id.padEnd(18)} ${String(s.f0).padStart(5)}-${String(s.f1).padEnd(5)} ${s.hash}  ${Object.keys(s.parts).filter((k) => k.startsWith('actor ')).map((k) => k.slice(6)).join(' ')}`);
  } else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n'));
}
