// Nothing silently ignored: which keys are really used where. Three sources, all read when the check runs, so they can't go stale:
//   engineKeys()  reads the C#: which keys each `do` kind can reach (its `case` and `kind == ".."` code, followed through calls), and which actor keys
//                 apply to a prim, to a model file, or to a grass, fence, mountain or eye actor.
//   watch(obj)    a Proxy that records what the card compiler really read, so a camera key the chosen preset never looks at is caught.
//   SHAPES        the keys of the library's files (sets, marks, lighting, moods...). A new key has to be added here, and until it is, compile warns on it.
// A key that does nothing is a warning everywhere, so a build never stops on one: `mv lint --strict` makes them errors.
// Used by mv lint and tools/cards.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT, DIRECTOR } from './score.mjs';
import { parse, where } from './jsonc.mjs';

const SKIP = new Set(['if', 'for', 'foreach', 'while', 'switch', 'catch', 'using', 'lock', 'return', 'new', 'nameof', 'when', 'typeof', 'sizeof', 'default']);
const SIG = /(?:^|\n)[ \t]*(?:\[[^\]\n]*\]\s*)?(?:(?:public|private|internal|protected|static|override|virtual|readonly|async|unsafe|sealed)\s+)*[\w<>[\],.?()]+(?:\s+[\w<>[\],.?]+)?\s+(\w+)\s*\(([^;{}\n]*)\)\s*(\{|=>)/g;
// These read cues to report on them, not to act on them.
const INSPECTORS = new Set(['MotionCheck.cs', 'MotionLab.cs', 'ClipAdmit.cs', 'Peek.cs', 'Transport.cs', 'Bridge.cs', 'Setup.cs', 'MVProfile.cs', 'Models.cs', 'Video.cs']);
const READS = [/\.(?:F|V|S|C|Has|Num|Str|Vec|Col|Obj|Arr)(?:\.TryGetValue|\.ContainsKey)?\(\s*"(\w+)"/g, /\.(?:Num|Str|Vec|Col|Obj|Arr)\[\s*"(\w+)"\s*\]/g, /\b(?:c|a|cue|args)\[\s*"(\w+)"\s*\]/g];

/** The index just past the block that opens at `open`, skipping strings. */
function closeOf(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; i++; } continue; }
    if (c === "'") { i += s[i + 1] === '\\' ? 3 : 2; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return i + 1;
  }
  return s.length;
}
const endOfStatement = (s, i) => {
  const b = s.indexOf('{', i), e = s.indexOf(';', i);
  if (b >= 0 && (e < 0 || b < e)) return closeOf(s, b);
  return e < 0 ? s.length : e + 1;
};

/** Where one `do` kind has code of its own: switch cases, and `kind == "x"` conditions. */
function sectionsOf(body) {
  const out = [];
  const labels = /\bcase\s+"(\w+)"\s*:/g;
  for (let m; (m = labels.exec(body));) {
    const kinds = [m[1]];
    let end = m.index + m[0].length, more;
    const again = /\s*case\s+"(\w+)"\s*:/y;
    for (;;) { again.lastIndex = end; more = again.exec(body); if (!more) break; kinds.push(more[1]); end = again.lastIndex; }
    labels.lastIndex = end;
    let depth = 0, i = end; // to the next label at this depth, or the end of the switch
    for (; i < body.length; i++) {
      const c = body[i];
      if (c === '"') { i++; while (i < body.length && body[i] !== '"') { if (body[i] === '\\') i++; i++; } continue; }
      if (c === '{') depth++;
      if (c === '}') { if (depth === 0) break; depth--; }
      if (depth === 0 && (body.startsWith('case ', i) || body.startsWith('default:', i))) break;
    }
    out.push({ kinds, from: end, to: i });
  }
  const cond = /(?:\bkind|\.kind)\s*==\s*"(\w+)"/g;
  for (let m; (m = cond.exec(body));) {
    const kinds = [m[1]], i = m.index + m[0].length;
    const stop = endOfStatement(body, i), head = body.slice(i, stop);
    const q = /^((?:\s*\|\|\s*(?:\bkind|[\w.]*\.kind)\s*==\s*"\w+")*)/.exec(head);
    for (const x of q[1].matchAll(/"(\w+)"/g)) kinds.push(x[1]);
    if (/^\s*\)/.test(head.slice(q[1].length)) || /^\s*\?/.test(head.slice(q[1].length))) out.push({ kinds, from: i, to: stop });
    cond.lastIndex = i + q[1].length;
  }
  return out;
}

function methodsOf(src) {
  const list = [];
  for (let m; (m = SIG.exec(src));) {
    if (SKIP.has(m[1])) continue;
    const start = m.index + m[0].length - m[3].length;
    const end = m[3] === '{' ? closeOf(src, start) : endOfStatement(src, start);
    list.push({ name: m[1], body: src.slice(start, end) });
    SIG.lastIndex = start + 1; // local functions inside it are found too
  }
  return list;
}

let cache = null;

/** What the C# reads, by context. */
export function engineKeys() {
  if (cache) return cache;
  const roots = ['Assets/MusicVideo/Runtime', 'Assets/MusicVideo/Editor'], all = new Map(), listed = new Set();
  for (const r of roots) for (const f of fs.readdirSync(path.join(PROJECT, r))) if (f.endsWith('.cs')) for (const m of fs.readFileSync(path.join(PROJECT, r, f), 'utf8').matchAll(/static readonly string\[] \w+ = \{([^}]*)\}/g)) for (const q of m[1].matchAll(/"(\w+)"/g)) listed.add(q[1]);
  for (const r of roots) for (const f of fs.readdirSync(path.join(PROJECT, r))) if (f.endsWith('.cs') && !INSPECTORS.has(f)) for (const m of methodsOf(fs.readFileSync(path.join(PROJECT, r, f), 'utf8'))) {
    const e = all.get(m.name) ?? { name: m.name, tokens: [], sections: [] };
    const shift = e.tokens.length ? e.size : 0;
    for (const s of sectionsOf(m.body)) e.sections.push({ ...s, from: s.from + shift, to: s.to + shift });
    for (const re of READS) for (const x of m.body.matchAll(re)) e.tokens.push({ key: x[1], at: x.index + shift });
    e.calls ??= [];
    for (const x of m.body.matchAll(/\b([A-Z_a-z]\w*)\s*\(/g)) e.calls.push({ name: x[1], at: x.index + shift });
    e.size = shift + m.body.length + 1;
    all.set(m.name, e);
  }
  const inKinds = (e, at) => e.sections.filter((s) => at >= s.from && at < s.to).flatMap((s) => s.kinds);
  for (const e of all.values()) {
    e.plainKeys = new Set(e.tokens.filter((t) => !inKinds(e, t.at).length).map((t) => t.key));
    e.plainCalls = new Set(e.calls.filter((t) => !inKinds(e, t.at).length && all.has(t.name) && t.name !== e.name).map((t) => t.name));
    e.kindKeys = new Map(); e.kindCalls = new Map();
    for (const t of e.tokens) for (const k of inKinds(e, t.at)) { if (!e.kindKeys.has(k)) e.kindKeys.set(k, new Set()); e.kindKeys.get(k).add(t.key); }
    for (const t of e.calls) if (all.has(t.name) && t.name !== e.name) for (const k of inKinds(e, t.at)) { if (!e.kindCalls.has(k)) e.kindCalls.set(k, new Set()); e.kindCalls.get(k).add(t.name); }
  }
  // A helper only ever called from a kind's own code is that kind's. Everything else is read for every kind.
  const callers = new Map();
  for (const e of all.values()) for (const c of e.plainCalls) { if (!callers.has(c)) callers.set(c, new Set()); callers.get(c).add(e.name); }
  const inner = new Set();
  for (const e of all.values()) for (const set of e.kindCalls.values()) for (const c of set) inner.add(c);
  const kindOnly = new Set([...inner].filter((n) => !callers.has(n)));
  for (let grew = true; grew;) {
    grew = false;
    for (const e of all.values()) if (!kindOnly.has(e.name) && !inner.has(e.name) && callers.has(e.name) && [...callers.get(e.name)].every((c) => kindOnly.has(c))) { kindOnly.add(e.name); grew = true; }
  }
  const common = new Set();
  for (const e of all.values()) if (!kindOnly.has(e.name)) for (const k of e.plainKeys) common.add(k);
  for (const k of listed) common.add(k); // keys in a name list that a loop reads, like overlap's "head" and "arms"
  const kinds = new Set([...all.values()].flatMap((e) => [...e.kindKeys.keys(), ...e.kindCalls.keys()]));
  const reach = (k) => {
    const keys = new Set(), seen = new Set();
    const go = (e) => { if (seen.has(e.name)) return; seen.add(e.name); for (const x of e.plainKeys) keys.add(x); for (const x of e.kindKeys.get(k) ?? []) keys.add(x); for (const c of [...e.plainCalls, ...(e.kindCalls.get(k) ?? [])]) go(all.get(c)); };
    for (const e of all.values()) { for (const x of e.kindKeys.get(k) ?? []) keys.add(x); for (const c of e.kindCalls.get(k) ?? []) go(all.get(c)); }
    return keys;
  };
  const byKind = new Map([...kinds].map((k) => [k, reach(k)]));
  const owned = new Set([...byKind.values()].flatMap((s) => [...s]).filter((k) => !common.has(k)));

  // Actors: Spawn has a branch for prims and one for model files, and every other actor key is read in MakeActors and ActorOps.
  const sc = fs.readFileSync(path.join(PROJECT, 'Assets/MusicVideo/Editor/ScoreCompiler.cs'), 'utf8');
  const defKeys = (s) => new Set([...s.matchAll(/(?:\bdef|\(JObject\)kv\.Value\))\[\s*"(\w+)"\s*\]/g)].map((x) => x[1]));
  const partials = ['MVBroadcastBuild.cs', 'ScoreLibrary.cs', 'MotionScore.cs'].map((f) => fs.readFileSync(path.join(PROJECT, 'Assets/MusicVideo/Editor', f), 'utf8')).join('\n');
  const spawn = sc.indexOf('GameObject Spawn('), prim = sc.indexOf('model.StartsWith("prim:")', spawn), file = sc.indexOf('LoadAssetAtPath<GameObject>(model)', prim), end = closeOf(sc, sc.indexOf('{', spawn));
  const primKeys = defKeys(sc.slice(prim, file)), modelKeys = defKeys(sc.slice(file, end));
  const actor = defKeys(sc.slice(0, spawn) + sc.slice(end) + partials);
  for (const k of [...primKeys, ...modelKeys]) actor.add(k);
  for (const k of ['lint', 'note', 'human', 'about', 'withHost']) actor.add(k); // read by lint, or plain notes; withHost by tools/cards.mjs
  const elsewhere = defKeys(sc.slice(0, spawn) + sc.slice(end));
  for (const k of elsewhere) { primKeys.delete(k); modelKeys.delete(k); }

  // Actors built by a component from a JSON block.
  const parts = {};
  for (const [key, f] of Object.entries({ grass: 'MVGrass.cs', fence: 'MVFence.cs', mountain: 'MVFeatherMountain.cs', eye: 'MVEyeRig.cs', space: 'MVSpace.cs' })) {
    const s = fs.readFileSync(path.join(PROJECT, 'Assets/MusicVideo/Runtime', f), 'utf8');
    parts[key] = new Set([...s.matchAll(/["](\w+)"/g)].map((x) => x[1]));
  }
  parts.fence.add('texture'); parts.fence.add('color');
  cache = { byKind, owned, common, actor, primKeys, modelKeys, parts };
  return cache;
}

/** A key on a `do` cue that this kind can't reach, though other kinds read it. Null when fine. */
export function cueKeyProblem(kind, key, e = engineKeys()) {
  if (key.startsWith('__') || !e.owned.has(key) || !e.byKind.has(kind) || e.byKind.get(kind).has(key)) return null;
  const others = [...e.byKind].filter(([k, s]) => s.has(key) && k !== kind).map(([k]) => k).slice(0, 4);
  return { msg: `"${key}" on a "${kind}" cue is never read, so it does nothing`, fix: `It belongs on ${others.join(', ')}. Remove it, or use the key that "${kind}" reads (AGENTS.md).` };
}

/** Keys on an actor that nothing uses for its kind of model. Works on score actors and set pieces. */
export function actorKeyProblems(def, aliases = {}, e = engineKeys()) {
  const out = [], model = aliases[def.model] ?? def.model ?? 'prim:cube';
  const kind = model === 'none' ? 'none' : model.startsWith('prim:') ? 'prim' : 'model';
  const named = kind === 'none' ? 'an empty actor ("model":"none")' : kind === 'prim' ? 'a prim' : `a model file (${path.extname(model) || model})`;
  for (const k of Object.keys(def)) {
    if (k.startsWith('__')) continue;
    if (!e.actor.has(k)) out.push({ key: k, msg: `actor key "${k}" is not read by anything, so it does nothing`, fix: 'Check the spelling against Actors in AGENTS.md.' });
    else if (e.primKeys.has(k) && kind !== 'prim' && !def.crowd) {
      const swap = k === 'color' || k === 'emission' ? kind === 'model' ? ` Use "skin":"${def[k]}" to colour every material of the model, or "material" with a .mat.` : ' An empty actor draws nothing.' : '';
      out.push({ key: k, msg: `"${k}" only applies to a prim and this is ${named}, so it does nothing`, fix: `Remove it.${swap}` });
    } else if (e.modelKeys.has(k) && kind !== 'model') out.push({ key: k, msg: `"${k}" only applies to a model file and this is ${named}, so it does nothing`, fix: 'Remove it, or use "color" and "texture", which prims read.' });
  }
  for (const [p, keys] of Object.entries(e.parts)) if (def[p] && typeof def[p] === 'object') for (const k of Object.keys(def[p])) if (!keys.has(k)) out.push({ key: `${p}.${k}`, msg: `"${k}" in "${p}" is not read by anything, so it does nothing`, fix: `Check the spelling against the ${p} keys in AGENTS.md.` });
  return out;
}

/** Records what is read from a plain object. unread() gives the keys nothing looked at. */
export const RAW = Symbol('raw'); // proxy[RAW] is the object itself, for a look that doesn't count as a read
export function watch(o) {
  const seen = new Set();
  const proxy = new Proxy(o, {
    get(t, k, r) { if (k === RAW) return t; if (typeof k === 'string') seen.add(k); return Reflect.get(t, k, r); },
    has(t, k) { if (typeof k === 'string') seen.add(k); return Reflect.has(t, k); },
  });
  return { proxy, unread: () => Object.keys(o).filter((k) => !seen.has(k)) };
}

// ---- the library's files: a key that isn't here is reported, with its file and line ----

const LIGHT = ['type', 'pos', 'rot', 'intensity', 'color', 'range', 'angle', 'inner', 'shadows', 'lint', 'at', 'offset', 'aim', 'note'];
export const SHAPES = {
  set: { keys: ['about', 'note', 'origin', 'bounds', 'ceiling', 'light', 'solids', 'marks', 'actors', 'models', 'sky', 'lens'], each: { marks: 'mark' } },
  mark: { keys: ['pos', 'face', 'kind', 'head', 'note', 'about'] },
  lighting: { keys: ['about', 'note', 'sky', 'lights'], each: { lights: 'light' } },
  light: { keys: LIGHT },
  performance: { keys: ['name', 'about', 'note', 'entry', 'exit', 'length', 'min', 'params', 'cues', 'test'] },
  format: { keys: ['about', 'aspect', 'render', 'fps', 'length', 'pacing', 'beats', 'fovScale'] },
};

/** Keys in a library file that don't belong, with the line. */
export function shapeProblems(data, shape, file) {
  const out = [], S = SHAPES[shape];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  const w = where(data);
  for (const k of Object.keys(data)) if (!S.keys.includes(k)) out.push({ file: w?.file ?? file, line: w?.keys?.[k] ?? 0, key: k, msg: `"${k}" in a ${shape} is not read by anything, so it does nothing`, fix: `Remove it. A ${shape} takes: ${S.keys.join(', ')}.` });
  for (const [k, inner] of Object.entries(S.each ?? {})) for (const x of Object.values(data[k] ?? {})) if (!Array.isArray(x)) out.push(...shapeProblems(x, inner, file));
  return out;
}

const performanceCache = new Map();
/** A performance file, parsed with lines, and the parameters it really uses: declared, or named in its cues as $x or in =arithmetic. */
export function performanceInfo(name) {
  if (performanceCache.has(name)) return performanceCache.get(name);
  const file = path.join(DIRECTOR, 'library', 'performances', name + '.json');
  let info = null;
  if (fs.existsSync(file)) {
    const rel = path.relative(DIRECTOR, file).replace(/\\/g, '/'), text = fs.readFileSync(file, 'utf8'), data = parse(text, rel);
    const body = JSON.stringify(data.cues ?? []), used = new Set(Object.keys(data.params ?? {}));
    for (const m of body.matchAll(/\$([A-Za-z_]\w*)/g)) used.add(m[1]);
    for (const m of body.matchAll(/"=([^"]*)"/g)) for (const w of m[1].matchAll(/\b[a-z_]\w*/g)) used.add(w[0]);
    info = { name, rel, data, used };
  }
  performanceCache.set(name, info);
  return info;
}

const FACE_KINDS = new Set(['face', 'blink', 'eyes', 'shape']), HEAD_BONES = new Set(['head', 'neck', 'leftEye', 'rightEye']);
/** Only the face and head move: it works in any pose, so its states must say "any". */
export function faceOnly(data) {
  const cues = data.cues ?? [];
  return cues.length > 0 && cues.every((c) => FACE_KINDS.has(c.do) || c.do === 'gaze' || (c.do === 'pose' && Object.keys(c.bones ?? (c.bone ? { [c.bone]: 1 } : { chest: 1 })).every((b) => HEAD_BONES.has(b))));
}

/** Everything wrong with one performance file on its own. */
export function performanceProblems(info, e = engineKeys()) {
  const out = shapeProblems(info.data, 'performance', info.rel).map((p) => ({ ...p, sev: 'warn', code: 'unused-key' }));
  const line = (o, k) => where(o)?.keys?.[k] ?? where(o)?.line ?? 0;
  for (const c of info.data.cues ?? []) {
    if (!c.do || c.do === 'perform') continue;
    for (const k of Object.keys(c)) {
      if (k === 'if') continue;
      const p = cueKeyProblem(c.do, k, e);
      if (p) out.push({ file: info.rel, line: line(c, k), sev: 'warn', code: 'unused-key', msg: p.msg, fix: p.fix });
    }
  }
  if (faceOnly(info.data)) for (const k of ['entry', 'exit']) if (info.data[k] !== 'any') out.push({ file: info.rel, line: line(info.data, k), sev: 'warn', code: 'state-any', msg: `${info.name} only moves the face and head, so it works in any pose, but its ${k} says "${info.data[k]}"`, fix: `Set "${k}":"any".` });
  return out;
}
