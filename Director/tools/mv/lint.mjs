// mv lint: reads the score in Node and fails with file, line and a plain fix. No Unity. Runs before every build.
// Every trap in Director/PIPELINE.md "Known traps" that can be seen in text is here. See AGENTS.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT, DIRECTOR, loadScore, loadClock, expand, shotList } from './score.mjs';
import { where } from './jsonc.mjs';
import { engineKeys, cueKeyProblem, actorKeyProblems, performanceInfo, performanceProblems } from './keyuse.mjs';
import { clipProblems, usesIn } from './clipcat.mjs';
import { refProblems } from './refs.mjs';

export const MAX_SCENE_MB = 50;
const EPS = 0.002; // two cues "on the same time"

// Keys the score may use that no C# reads directly by that spelling.
const EXTRA_KEYS = ['at', 'for', 'until', 'on', 'do', 'repeat', 'times', 'onsets', 'note', 'macro', 'lint', 'ease', 'name', 'who', 'snd', 'lvl', 'a', 'face', 'blink', 'eyesWide', 'fear', 'jawOpen', 'smile', 'eyesNarrow', 'browDown', 'browUp', 'browRaiseL', 'browRaiseR', 'mouthClose', 'mouthPress', 'smirk', 'frown', 'cheekRaise', 'sneer', 'wide', 'squint', 'lookX', 'lookY', 'pupil', 'reflect'];

/** Every key the engine can read, taken from the C# itself so this list can't go stale. Kept in gen/known-keys.json against each file's
 *  size and time (reading the C# took 12-15 s a compile on this laptop while Unity was busy; the stamp check is a few ms). */
let knownMemo = null;
export function knownKeys() {
  if (knownMemo) return new Set(knownMemo);
  const roots = ['Assets/MusicVideo/Runtime', 'Assets/MusicVideo/Editor'], stamp = [];
  for (const r of roots) { const d = path.join(PROJECT, r); for (const f of fs.readdirSync(d)) if (f.endsWith('.cs')) { const st = fs.statSync(path.join(d, f)); stamp.push(`${r}/${f}:${st.size}:${Math.floor(st.mtimeMs)}`); } }
  const cacheFile = path.join(DIRECTOR, 'gen', 'known-keys.json'), sig = crypto.createHash('sha256').update(stamp.join('\n') + EXTRA_KEYS.join(',')).digest('hex').slice(0, 16);
  try { const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); if (c.sig === sig) { knownMemo = c.keys; return new Set(knownMemo); } } catch {}
  const keys = knownKeysNow(roots);
  knownMemo = [...keys];
  try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify({ sig, keys: knownMemo })); } catch {}
  return keys;
}
function knownKeysNow(roots) {
  const keys = new Set(EXTRA_KEYS);
  const res = [/\[\s*"(\w+)"\s*\]/g, /\.(?:F|S|V|C|Has|Num|Str|Vec|Col|Obj|Arr|TryGetValue|ContainsKey|Kf|Fl|Float|Bool|Int)\(\s*"(\w+)"/g, /\bK\(\s*"(\w+)"/g];
  for (const r of roots) {
    const d = path.join(PROJECT, r);
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.cs')) continue;
      const s = fs.readFileSync(path.join(d, f), 'utf8');
      for (const re of res) for (const m of s.matchAll(re)) keys.add(m[1]);
      for (const m of s.matchAll(/new\[\]\s*\{([^}]*)\}/g)) for (const q of m[1].matchAll(/"(\w+)"/g)) keys.add(q[1]); // key lists the compiler loops over
      for (const m of s.matchAll(/static readonly string\[\] \w+ = \{([^}]*)\}/g)) for (const q of m[1].matchAll(/"(\w+)"/g)) keys.add(q[1]);
    }
  }
  return keys;
}

/** Every clip name in the project, without Unity: .anim files, Humanoid@ file names, and clips listed in .fbx.meta. Cached per scan. */
export function clipIndex(refresh) {
  const cache = path.join(DIRECTOR, 'gen', 'clip-index.json');
  if (!refresh && fs.existsSync(cache) && Date.now() - fs.statSync(cache).mtimeMs < 6 * 3600e3) return new Set(JSON.parse(fs.readFileSync(cache, 'utf8')));
  const out = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const low = e.name.toLowerCase();
      if (low.endsWith('.anim')) out.add(e.name.slice(0, -5).toLowerCase());
      else if (low.endsWith('.fbx')) out.add(e.name.slice(0, -4).replace(/^.*@/, '').toLowerCase());
      else if (low.endsWith('.fbx.meta')) {
        const s = fs.readFileSync(p, 'utf8');
        for (const m of s.matchAll(/first:\s*\n\s*74: -?\d+\s*\n\s*second: (.+)/g)) out.add(m[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase());
        for (const m of s.matchAll(/^\s*- serializedVersion: \d+\s*\n\s*name: (.+)$/gm)) out.add(m[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase());
      }
    }
  };
  walk(path.join(PROJECT, 'Assets'));
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, JSON.stringify([...out]));
  return out;
}

const firstKey = (o) => Object.keys(o).find((k) => !k.startsWith('__'));

export function lint(v, opts = {}) {
  const out = [];
  const add = (sev, code, at, msg, fix) => out.push({ sev, code, file: at?.file ?? path.relative(PROJECT, v.score).replace(/\\/g, '/'), line: at?.line ?? 0, msg, fix });

  // Reading it at all: a syntax error stops here, with its line.
  let loaded, clock, ex;
  try { loaded = loadScore(v); clock = loadClock(v, loaded.score); ex = expand(loaded.score, clock); }
  catch (e) { add('error', 'read', { file: e.file, line: e.line }, e.plain ?? e.message, 'Fix the JSON at that line.'); return finish(v, out, opts); }
  const { score, dupes, origin } = loaded, { fires, problems, shots } = ex;
  for (const p of problems) add('error', p.code, p.at, p.msg, p.fix);

  const actors = score.actors ?? {}, models = score.models ?? {}, lights = score.stage?.lights ?? {}, dur = clock.duration;
  const label = (t) => `${t.toFixed(2)}s (bar ${clock.label(t)})`;
  const aliasOf = (m) => models[m] ?? m;
  const isHuman = (name) => {
    const a = actors[name]; if (!a) return false;
    const m = aliasOf(a.model ?? '');
    return /\/Person\d*\/Person\d*\.fbx$/i.test(m) || a.human === true;
  };
  const isPerson2 = (name) => /Person2\.fbx$/i.test(aliasOf(actors[name]?.model ?? ''));
  const actorOf = (s) => String(s).split('.')[0].split('#')[0];
  // As NativeCompile.NativeActor: the actor's own "native", else the score's, else every video made after 2026-11-07.
  const LEGACY = ['tkshock', 'greener', 'hawkespunch', 'touchgrass', 'demo', '_cards_test', 'styletest'];
  const isNative = (name) => actors[name]?.native ?? score.native ?? !LEGACY.includes(v.name);

  // ---- the scene file ----
  const scene = path.join(PROJECT, v.scene);
  if (fs.existsSync(scene)) {
    const mb = fs.statSync(scene).size / 1e6;
    if (mb > MAX_SCENE_MB) add('error', 'scene-size', { file: v.scene, line: 1 }, `the scene is ${mb.toFixed(0)} MB, over the ${MAX_SCENE_MB} MB limit`, 'Run a plain mv build: it removes stale Timeline objects and writes the scene again. If it stays large, something new is being saved into it.');
  }

  // ---- duplicates ----
  for (const d of dupes) add('error', 'duplicate-actor', d.at, `actor "${d.name}" is defined again; the first is at ${d.first?.file}:${d.first?.line}. The last one wins, so the first does nothing`, 'Rename one of them, or delete the one you don\'t want.');

  // ---- actors ----
  const engine = engineKeys();
  const hidden = new Set();
  for (const f of fires) if (f.fam === 'do' && (f.c.do === 'hide')) for (const n of [].concat(f.c.on)) hidden.add(n);
  const chain = (n) => { const o = []; let k = n, g = 0; while (k && actors[k] && g++ < 20) { o.push(k); const p = actors[k].parent; k = p ? actorOf(p) : null; } return o; };
  const windowed = (n) => chain(n).some((k) => actors[k].from !== undefined || actors[k].until !== undefined || hidden.has(k));
  const roots = new Map();
  for (const [n, d] of Object.entries(actors)) {
    const at = origin.actors[n];
    for (const k of ['from', 'until']) if (d[k] !== undefined) {
      try { const t = clock.T(d[k], 0); if (t > dur + EPS) add('error', 'time-outside-song', at, `actor "${n}" ${k} ${d[k]} is ${t.toFixed(1)}s; the song ends at ${dur.toFixed(1)}s`, 'Move it inside the song.'); }
      catch (e) { add('error', 'time', at, `actor "${n}": ${e.message}`, 'Times look like "12:3", "41.2s", "m3".'); }
    }
    if (d.parent && !actors[actorOf(d.parent)]) add('error', 'unknown-actor', at, `actor "${n}" has parent "${d.parent}", which doesn't exist`, 'Fix the name.');
    if (d.model && !d.model.startsWith('prim:') && d.model !== 'none' && !models[d.model] && !fs.existsSync(path.join(PROJECT, d.model))) add('error', 'unknown-model', at, `actor "${n}": no model "${d.model}"`, 'Use an alias from "models", a real Assets/ path, prim:cube or none.');
    for (const k of ['material', 'material2', 'texture', 'skin']) if (typeof d[k] === 'string' && d[k].startsWith('Assets/') && !fs.existsSync(path.join(PROJECT, d[k]))) add('error', 'missing-file', at, `actor "${n}": ${k} "${d[k]}" is not on disk`, 'Fix the path (case counts), or make the file. mv refs <name> shows who else names it.');
    // Set pieces come out of cards.mjs, which checks them against the set's own file and line.
    if (!(at?.file ?? '').endsWith('50-cards.json')) for (const p of actorKeyProblems(d, models, engine)) add('warn', 'unused-key', { file: at?.file, line: where(d)?.keys?.[p.key.split('.')[0]] ?? at?.line }, `actor "${n}": ${p.msg}`, p.fix);
    if (!windowed(n)) { const r = chain(n).at(-1); if (!roots.has(r)) roots.set(r, { n: 0, at: origin.actors[r] }); roots.get(r).n++; }
  }
  // Part of a set: lives under a parent, or has children. A lone prop isn't a set.
  const hasKids = new Set(Object.values(actors).filter((a) => a.parent).map((a) => actorOf(a.parent)));
  for (const [r, { n, at }] of roots) {
    if (!hasKids.has(r)) continue;
    add('error', 'set-always-on', at, `set "${r}" and its ${n - 1} children have no from/until and no hide cue, so they cost every frame of the video`, `Give "${r}" "from" and "until" (children inherit it). If it really is on the whole time, add "lint":"always" to it.`);
  }
  for (const [r] of roots) if (actors[r]?.lint === 'always') out.splice(0, out.length, ...out.filter((x) => !(x.code === 'set-always-on' && x.msg.includes(`"${r}"`))));

  // ---- cues ----
  const keys = knownKeys(), clips = clipIndex(opts.reindex), seenKey = new Set();
  const byActor = new Map();
  for (const f of fires) if (f.fam === 'do') for (const n of [].concat(f.c.on ?? [])) { if (!byActor.has(n)) byActor.set(n, []); byActor.get(n).push(f); }

  const clipMemo = new Map(), clipList = [...clips];
  // As MVActor.FindClip: the exact name, or any clip with it inside the name ("bite" finds 18TurkeyM_bite).
  const clipOk = (name) => { const s = String(name).split('@')[0].trim().toLowerCase(); if (!clipMemo.has(s)) clipMemo.set(s, clips.has(s) || clipList.some((c) => c.includes(s))); return clipMemo.get(s); };
  const noClip = (f, name) => add('error', 'unknown-clip', f.at, `no clip "${String(name).split('@')[0]}"`, 'Find it with mv find <words> --type model and bring it in with mv pull, or fix the name. Clips in the project are in Director/assets/motions.md.');
  const checkTime = (f, what, t) => { if (t < -EPS || t > dur + EPS) add('error', 'time-outside-song', f.at, `${what} is at ${t.toFixed(2)}s, outside the song (0 to ${dur.toFixed(1)}s)`, 'Move it inside the song.'); };

  // Which card a cue in the generated act came from, since its line there means nothing to anyone.
  let cardMap = []; try { cardMap = JSON.parse(fs.readFileSync(path.join(v.dir, 'cards.map.json'), 'utf8')); } catch {}
  const cardAt = (t) => { const m = cardMap.find((x) => t >= x.t - EPS && t < x.tEnd); return m ? ` (card '${m.id}')` : ''; };
  const perfSeen = new Set(), CUE_KEYS = new Set(['do', 'on', 'at', 'name', 'performance', 'for', 'until', 'lead', 'note', 'lint', 'repeat', 'times', 'onsets', 'every', 'sfx', 'sfxAt', 'sfxVolume', 'if']);
  const readPerformance = (name) => {
    const info = performanceInfo(name);
    if (!info || perfSeen.has(name)) return info;
    perfSeen.add(name);
    for (const p of performanceProblems(info, engine)) add(p.sev, p.code, { file: p.file, line: p.line }, p.msg, p.fix);
    for (const q of info.data.cues ?? []) if (q.do === 'perform' && typeof q.name === 'string' && !q.name.includes('$')) readPerformance(q.name);
    return info;
  };
  // Every other key on a perform cue is a parameter, so a wrong one used to vanish.
  const checkPerform = (f) => {
    const { c, t } = f, name = c.name ?? c.performance, info = readPerformance(name);
    if (!info) { add('error', 'unknown-performance', f.at, `no performance "${name}" in Director/library/performances${cardAt(t)}`, 'Fix the name. library/performances/gallery.md lists them.'); return; }
    const fromCards = (f.at?.file ?? '').endsWith('50-cards.json'); // cards.mjs hands every walk its to and dist; only some use them
    for (const k of Object.keys(c)) if (!k.startsWith('__') && !CUE_KEYS.has(k) && !info.used.has(k) && !(fromCards && (k === 'to' || k === 'dist'))) add('warn', 'unused-key', f.at, `"${k}" on perform ${name} is not one of its parameters, so it does nothing${cardAt(t)}`, `It takes: ${[...info.used].filter((x) => x !== 'for' && x !== 'length').join(', ') || 'no parameters'}. See ${info.rel}.`);
  };

  for (const f of fires) {
    const { c, t, fam } = f;
    if (!f.via || !seenKey.has(c)) {
      seenKey.add(c);
      if (c.do !== 'perform') for (const k of Object.keys(c)) if (!k.startsWith('__') && !keys.has(k)) add('error', 'unknown-key', f.at, `"${k}" is not a key anything reads, so it does nothing`, `Check the spelling (AGENTS.md lists every cue). Cue: ${JSON.stringify(c).slice(0, 90)}`);
      if (fam === 'do' && c.do !== 'perform') for (const k of Object.keys(c)) { const p = cueKeyProblem(c.do, k, engine); if (p) add('warn', 'unused-key', f.at, p.msg + cardAt(t), p.fix); }
      if (fam === 'do' && c.do === 'perform') checkPerform(f);
      if (fam === 'grade' || fam === 'pulse') for (const k of Object.keys(c[fam] ?? {})) if (!keys.has(k)) add('error', 'unknown-key', f.at, `${fam} key "${k}" is not read by anything`, 'Check the spelling against the Look keys in AGENTS.md.');
    }
    checkTime(f, firstKey(c) === 'at' ? `this ${fam} cue` : `this ${fam} cue`, t);
    // Reference integrity: a sound file the cue names has to be on disk (a bed or a line whose file was renamed plays nothing, silently).
    if (typeof c.sfx === 'string' && c.sfx.startsWith('Assets/') && !fs.existsSync(path.join(PROJECT, c.sfx))) add('error', 'missing-file', f.at, `sfx "${c.sfx}" is not on disk${cardAt(t)}`, 'Fix the path, or run the tool that makes the file (a GENERATED act names it in its first line).');
    if (f.len !== null && t + f.len > dur + 0.05) checkTime(f, `the end of this ${fam} cue`, t + f.len);

    // Trap: `speed` on a cue that isn't a time cue changes scene time.
    if (fam === 'speed' && Object.keys(c).some((k) => ['flip', 'tv', 'tvflash', 'tvchange', 'tvreact', 'tvclip', 'grade', 'pulse', 'light', 'strobe', 'sky', 'text'].includes(k)))
      add('error', 'trap-speed', f.at, `"speed":${c.speed} on a ${Object.keys(c).find((k) => ['flip', 'tv', 'tvflash', 'tvchange', 'tvreact', 'tvclip', 'grade', 'pulse', 'light', 'strobe', 'sky', 'text'].includes(k))} cue changes scene time and the cue itself never fires`, 'Move "speed" to its own cue, or remove it. Only anim, gfx and fx use speed for themselves.');
    if (fam === 'speed' && (c.speed <= 0 || c.speed > 20)) add('error', 'trap-speed', f.at, `"speed":${c.speed} runs scene time ${c.speed} times as fast`, 'Slow motion is 0.1 to 1. For a ticker, put speed on the gfx cue.');

    // Trap: `flip` on a tv cue fires a full-frame flip.
    if (fam === 'flip' && ['tv', 'tvflash', 'tvchange', 'tvreact', 'tvclip'].some((k) => c[k] !== undefined))
      add('error', 'trap-tv-flip', f.at, '"flip" on a tv cue fires a full-frame flip and the tv cue never runs', `Use {"flip":"CH 4","on":"${c.tv ?? 'tv1'}"} for one TV, as a separate cue.`);

    if (fam === 'shot') {
      const s = c.shot;
      for (const k of ['look', 'focus', 'follow']) if (Array.isArray(s[k])) add('error', 'trap-shot-look', f.at, `shot "${k}" is a list; the build breaks on it`, `Point it at an actor, or use "rot" for a fixed direction.`);
      for (const k of ['look', 'focus', 'follow']) if (typeof s[k] === 'string' && !actors[actorOf(s[k])]) add('error', 'unknown-actor', f.at, `shot ${k} "${s[k]}": no such actor`, 'Fix the name.');
      for (const k of Object.keys(s)) if (!keys.has(k)) add('error', 'unknown-key', f.at, `shot key "${k}" is not read by anything`, 'Check the spelling against the Shot list in AGENTS.md.');
    }

    if (fam === 'do') {
      const kind = c.do, global = ['impactframe', 'speedlines', 'silence', 'shake', 'smear'].includes(kind); // the epic toolkit: `on` is optional, a bone or a subject (MVEpicScore.cs)
      const ons = global ? [].concat(c.on ?? []).filter((o) => typeof o === 'string').map((o) => o.split('.')[0]) : [].concat(c.on ?? []);
      if (!ons.length && !global) add('error', 'do-no-on', f.at, `"do":"${kind}" has no "on"`, 'Say which actor.');
      // `frames` is a count, and on silence it counts BACKWARD: the silence ends on `at` (the hit) and starts `frames` earlier (MVEpicScore.cs).
      if (['silence', 'freeze', 'smear', 'hitstop', 'impactframe'].includes(kind) && c.frames !== undefined && !(typeof c.frames === 'number' && c.frames > 0 && Number.isFinite(c.frames)))
        add('error', 'bad-value', f.at, `"frames":${JSON.stringify(c.frames)} on ${kind} is not a positive count${cardAt(t)}`, kind === 'silence' ? 'Put "at" on the hit and "frames" = how many frames of silence BEFORE it (the silence ends on "at"). Forward from "at" is "for":"4f".' : 'Frames at the score\'s fps, a positive number.');
      if (kind === 'silence' && c.frames !== undefined && (c.for !== undefined || c.until !== undefined)) add('warn', 'unused-key', f.at, `silence has both "frames" and "${c.for !== undefined ? 'for' : 'until'}": "frames" is ignored (for/until runs FORWARD from "at"; frames runs BACKWARD to "at")${cardAt(t)}`, 'Keep one: "frames" ending on the hit, or "for" from "at".');
      for (const on of ons) {
        if (!actors[on] && !/^shot_|^feedcam$|^showcam_/.test(on)) { add('error', 'unknown-actor', f.at, `no actor "${on}"`, 'Fix the name, or add it under "actors".'); continue; }
        const mine = byActor.get(on) ?? [];
        const same = (k, cond) => mine.some((g) => g !== f && g.c.do === k && Math.abs(g.t - t) < EPS && (!cond || cond(g)));

        if (isHuman(on) && (kind === 'move' || kind === 'rotate') && !allowedSlide(c))
          add('error', 'human-slide', f.at, `${kind} on human "${on}" slides him like a mannequin`, `Use walk, keys with root, or anim with root. If it's truly meant (carried, thrown, inside a stretch), add "lint":"slide" to the cue.`);
        if (kind === 'reach' && typeof c.to === 'string' && actorOf(c.to) === on)
          add('error', 'trap-reach-self', f.at, `reach to his own bone "${c.to}" reads a stale position`, 'Use a pose or a layer clip instead, or attach an empty actor to that bone and reach for the actor.');
        if (kind === 'keys' && (c.keys ?? []).some((k) => k.root) && same('set'))
          add('error', 'trap-keys-root-set', f.at, `keys with root on the same time as a set on "${on}" loses the root`, 'Offset the keys by 0.01 s: "at":"<time>+0.01s".');
        if (kind === 'jump' && same('detach'))
          add('error', 'trap-jump-detach', f.at, `jump on the same time as detach pins "${on}"`, 'Offset the jump by 0.01 s.');
        if (kind === 'ragdoll' && same('set'))
          add('error', 'trap-ragdoll-set', f.at, `a ragdoll starting on a set inherits a huge speed from the teleport`, 'Start the ragdoll a frame later: "+0.04s".');

        if ((kind === 'reach' || kind === 'plant') && c.to !== undefined && (c.weight === undefined || c.weight > 0)) {
          const limb = c.hand ? 'hand' : 'foot';
          if (Array.isArray(c.to) && !c.lint?.includes?.('point')) add('error', 'target-no-prop', f.at, `${kind} ${limb} on "${on}" goes to a point in the air, [${c.to}], with no prop there`, 'Point "to" at an actor or bone so it can\'t drift from the thing it touches. If it really is air, add "lint":"point".');
          if (typeof c.to === 'string' && !actors[actorOf(c.to)] && !/^tv\d/.test(c.to)) add('error', 'target-no-prop', f.at, `${kind} ${limb} on "${on}": no actor "${c.to}"`, 'Fix the name.');
          if (typeof c.to === 'string' && actors[actorOf(c.to)]?.model === 'none' && !actors[actorOf(c.to)].parent && !c.to.includes('.') && !c.lint?.includes?.('point')) add('warn', 'target-empty', f.at, `${kind} ${limb} on "${on}" targets "${c.to}", an empty actor with nothing to touch`, 'Fine for a helper. Otherwise parent it to the prop.');
        }
        if (kind === 'anim' || kind === 'walk' || kind === 'layer') {
          // `speed` never reaches a clip: it is the scene's slow-motion key and the compiler strips it from every do cue (fx agent, 2026-11-08). `rate` is the clip's.
          if (c.speed !== undefined) add(isNative(on) ? 'error' : 'warn', 'key-no-effect', f.at, `"speed":${c.speed} on ${kind} "${on}" never reaches the clip: it plays at 1${cardAt(t)}`, isNative(on) ? `Use "rate":${c.speed}.` : `On a native body "rate":${c.speed} is the key; this legacy body has no clip speed, so trim with start/for or make it native.`);
          if (c.clip && !clipOk(c.clip)) noClip(f, c.clip);
          for (const row of c.blendTree ?? []) if (!clipOk(row[0])) noClip(f, row[0]);
          // The clip catalog (library/motion/catalog.md), on native humans: weak for what the card is about, banned, unwatched, or fanning his fingers with no grip.
          if (c.clip && isHuman(on) && isNative(on) && clipOk(c.clip)) {
            const card = cardMap.find((x) => t >= x.t - EPS && t < x.tEnd);
            const uses = usesIn([card?.idea, card?.feel, card?.note, c.note].filter(Boolean).join(' '));
            const fingers = mine.some((g) => g.c.do === 'fingers' && (card ? g.t >= card.t - EPS && g.t < card.tEnd : Math.abs(g.t - t) < 2));
            for (const p of clipProblems(c.clip, { uses, fingers, kind })) add('warn', p.code, f.at, p.msg + cardAt(t), p.fix.replace('<actor>', on));
          }
        }
        if (c.from && typeof c.from === 'string' && (kind === 'pose' || kind === 'ragdoll') && !clipOk(c.from)) noClip(f, c.from);
        if (kind === 'keys') for (const k of c.keys ?? []) if (k.from && !clipOk(k.from)) noClip(f, k.from);

        // Trap: clips sped up to cancel slow motion read as jumpy.
        if ((kind === 'anim' || kind === 'layer') && (c.speed ?? 1) >= 3 && fires.some((g) => g.fam === 'speed' && g.c.speed < 0.6 && t >= g.t - EPS && t < g.t + (g.len ?? 0)))
          add('warn', 'trap-clip-speed', f.at, `clip "${c.clip}" at speed ${c.speed} inside slow motion reads as jumpy`, 'Hold a pose through the slow part instead.');
      }
    }

    if (fam === 'text' && c.pos && c.pos.length !== 3) add('error', 'bad-value', f.at, 'text pos needs [x,y,0]', 'Give three numbers.');
    if (fam === 'nothing' && Object.keys(c).filter((k) => !['at', 'note', 'for', 'until'].includes(k)).length) add('error', 'cue-does-nothing', f.at, `this cue does nothing: ${JSON.stringify(c).slice(0, 90)}`, 'It needs do, shot, fx, grade, pulse, light, text, sfx or similar.');
    if (fam === 'tv') { const n = c.tv ?? c.tvflash ?? c.tvchange ?? c.tvreact ?? c.tvclip; if (!actors[n]) add('error', 'unknown-actor', f.at, `no TV "${n}"`, 'Fix the name.'); }
    if (fam === 'tv' && c.tv !== undefined && c.show && !score.shows?.[c.show]) add('error', 'unknown-show', f.at, `no show called "${c.show}"`, 'Define it under "shows".');
  }

  // Trap: person2 FBX imports with her shape keys at 100. A time-zero face cue holds them at 0.
  for (const n of Object.keys(actors)) {
    if (!isPerson2(n)) continue;
    const from = (() => { try { return clock.T(actors[n].from, 0); } catch { return 0; } })();
    if (!(byActor.get(n) ?? []).some((f) => f.c.do === 'face' && f.t <= from + EPS)) add('error', 'trap-person2-face', origin.actors[n], `"${n}" uses the person2 model, which imports with shape keys at 100, and has no face cue when she appears`, `Add {"at":${from ? JSON.stringify(actors[n].from) : 0},"do":"face","on":"${n}","smile":0,"fear":0,"eyesWide":0,"blink":0}.`);
  }

  // Lights. Trap: a directional in one part lights every other part. Every light needs an end.
  const lightCues = new Map();
  for (const f of fires) if (f.fam === 'light') { if (!lightCues.has(f.c.light)) lightCues.set(f.c.light, []); lightCues.get(f.c.light).push(f); }
  for (const [n, list] of lightCues) {
    const d = lights[n], base = d?.intensity ?? 1;
    if (!d && !String(n).includes('.')) { add('error', 'unknown-light', list[0].at, `no light "${n}"`, 'Fix the name, or add it under "lights".'); continue; }
    list.sort((a, b) => a.t - b.t);
    const last = list.at(-1), level = last.c.intensity ?? base, ends = last.t + (last.len ?? 0);
    if (level > 0 && ends < dur - 1) add('error', d?.type === 'directional' ? 'trap-directional-light' : 'light-no-end', last.at, `light "${n}" is left at ${level} after ${label(ends)} and never goes off`, `Add {"at":"<end of its part>","light":"${n}","intensity":0}.`);
  }
  for (const [n, d] of Object.entries(lights)) if (d.type === 'directional' && !lightCues.has(n) && (d.intensity ?? 1) > 0.05 && d.lint !== 'always')
    add('error', 'trap-directional-light', origin.lights[n], `directional light "${n}" is on for the whole video and lights every part`, `Add a light cue to switch it off, or add "lint":"always" to it.`);

  // ---- references across data files: shot anchors and cut `after` naming shots not in the cut (tools/mv/refs.mjs) ----
  for (const p of refProblems(v)) add(p.sev, p.code, { file: p.file, line: p.line }, p.msg, p.fix);

  // ---- pace: cuts per bar and text per bar against the section's target ----
  const list = shotList(shots, clock), targets = score.targets?.cutsPerBar ?? {}, song = clock.song;
  const defaults = { sparse: 0.75, medium: 1.5, full: 2.5, huge: 4 };
  for (const s of song.sections ?? []) {
    const bars = s.bars ?? Math.max(1, ((clock.beatAt(s.t + 1) - s.beat) / clock.meter)), a = s.t, b = clock.timeOf((s.beat ?? clock.beatAt(a)) + bars * clock.meter);
    const declared = targets[s.name] ?? targets[s.kind];
    const target = declared ?? defaults[s.level] ?? 2.5;
    const cuts = list.filter((x) => x.t >= a && x.t < b).length;
    if (cuts / bars > target) add(declared !== undefined ? 'error' : 'warn', 'pace-cuts', list.find((x) => x.t >= a), `section ${s.name} (${s.kind}, bars ${s.bar}-${s.bar + bars - 1}) has ${(cuts / bars).toFixed(1)} cuts a bar, over the target of ${target}`, `Merge shots, or set a target: "targets":{"cutsPerBar":{"${s.name}":${Math.ceil(cuts / bars)}}} in score.json.`);
    const texts = fires.filter((f) => f.fam === 'text' && f.t >= a && f.t < b);
    if (texts.length / bars > target * 2) add(declared !== undefined ? 'error' : 'warn', 'pace-text', texts[0].at, `section ${s.name} changes text ${(texts.length / bars).toFixed(1)} times a bar, more than twice its cut target; nobody can read that`, 'Fewer, bigger words.');
  }

  return finish(v, out, opts);
}

function allowedSlide(c) {
  const l = c.lint; return l === 'slide' || (Array.isArray(l) && l.includes('slide'));
}

const fingerprint = (x) => crypto.createHash('sha1').update(`${x.code}|${x.file}|${x.msg}`).digest('hex').slice(0, 12);

/** A video that shipped with findings can accept them, so a build only stops on new ones. --all shows them. */
function finish(v, out, opts) {
  const seen = new Set(); const items = [];
  for (const x of out) { const k = `${x.code}|${x.file}|${x.line}|${x.msg}`; if (!seen.has(k)) { seen.add(k); items.push(x); } }
  items.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'error' ? -1 : 1) || a.file.localeCompare(b.file) || a.line - b.line);
  const base = path.join(v.dir, 'lint-baseline.json');
  if (opts.writeBaseline) fs.writeFileSync(base, JSON.stringify(items.map(fingerprint), null, 0));
  let accepted = new Set(); try { accepted = new Set(JSON.parse(fs.readFileSync(base, 'utf8'))); } catch {}
  for (const x of items) x.accepted = accepted.has(fingerprint(x));
  const live = opts.all ? items : items.filter((x) => !x.accepted);
  const failing = live.filter((x) => x.sev === 'error' || opts.strict);
  return { items: live, total: items.length, accepted: items.filter((x) => x.accepted).length, errors: live.filter((x) => x.sev === 'error').length, warnings: live.filter((x) => x.sev === 'warn').length, failed: failing.length > 0 };
}

export function printLint(r, { limit = 60, summary } = {}) {
  const counts = {};
  for (const x of r.items) counts[x.code] = (counts[x.code] ?? 0) + 1;
  if (!summary) for (const x of r.items.slice(0, limit)) console.log(`${x.sev === 'error' ? 'ERROR' : 'warn '} ${x.file}:${x.line}  [${x.code}] ${x.msg}\n      fix: ${x.fix}`);
  if (r.items.length > limit && !summary) console.log(`... and ${r.items.length - limit} more (--limit 0 shows all)`);
  console.log(`lint: ${r.errors} errors, ${r.warnings} warnings${r.accepted ? `, ${r.accepted} accepted in lint-baseline.json` : ''}${Object.keys(counts).length ? `  ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}` : ''}`);
}
