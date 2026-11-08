// The clip catalog in code: library/clips.json `catalog` (written by tools/clip_catalog.mjs from library/motion/verdicts.json and the measures).
// Used by mv lint (a native human playing a clip the catalog calls weak for what its card is about, a banned clip, or a clip with no preview or
// verdict) and by `mv clips <tag>` (the best clips for a use). No Unity.
import fs from 'node:fs';
import path from 'node:path';
import { DIRECTOR } from './score.mjs';

const FILE = path.join(DIRECTOR, 'library', 'clips.json');
let cache = null, cacheAt = 0;

/** The catalog section, or null when it hasn't been built. */
export function catalog() {
  try {
    const st = fs.statSync(FILE);
    if (!cache || st.mtimeMs !== cacheAt) { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')).catalog ?? null; cacheAt = st.mtimeMs; }
  } catch { cache = null; }
  return cache;
}

/** Words in a card's idea, feel or note, and the use they mean. The tags are the catalog's (`catalog.tags`). */
export const USE_WORDS = [
  [/\bpunch|\bhook\b|\bjab\b|uppercut|haymaker|sucker.?punch|\bdecks?\b|\bslug/i, 'punch'],
  [/\bkick/i, 'kick'],
  [/\bthrow|\bhurl|\btoss|\bpitch(?!ed tent)|\blob\b|\bfling|wound up|wind.?up/i, 'throw'],
  [/\bcatch|\bcaught/i, 'catch'],
  [/\bdrink|\bsip\b|\bsips\b|\bswig|\bgulp/i, 'drink'],
  [/\bwrit(e|es|ing)\b|\bscribbl|\bsigns?\b the|\bnotes? (down|on)|clipboard/i, 'write'],
  [/\btalk|\bsays?\b|\btells?\b|\bexplain|\bargu|\bchat|\bpitch(es|ing) (the|a|his)|\bconsult|\bspeech|\blectur|\bsalesman|\bpresent/i, 'talk'],
  [/\blisten|\bnods? along/i, 'listen'],
  [/\blaugh|\bgiggl|\bcackl|\bchuckl/i, 'laugh'],
  [/\bfl(y|ies|ying|ew)\b|\bsoar|\bstreak|\bzoom|\bswoop|\bslingshot/i, 'fly'],
  [/\bfloat|\bdrift|\bhover|\btumbl|\bweightless|\bin space\b/i, 'float'],
  [/\bsits?\b|\bseated|\bsitting|\bin (a|the|his) chair|\bon the sofa|\bexam table/i, 'sit'],
  [/\bwav(e|es|ing)\b/i, 'wave'],
  [/\bpoint/i, 'point'],
  [/\bthumbs?.?up/i, 'thumbs-up'],
  [/\bclap/i, 'clap'],
  [/\bdanc|\bgroov|\bboogie/i, 'dance'],
  [/\bhit\b|\bstruck|\bknocked|\breels?\b|\bdoubles over|\bwinded|\bgets? (it|one) in the/i, 'hit-react'],
  [/\bdodg|\bducks?\b|\bweav|\bslips? (the|a) punch/i, 'dodge'],
  [/\bscared|\bterrif|\bafraid|\bcower|\bpanic|\bhorror/i, 'scared'],
  [/\btaunt|\bflex|\bshow(s|ing)? off|\bbrag/i, 'taunt'],
  [/\bwalk|\bstroll|\bstrid|\bstrut/i, 'walk'],
  [/\bsneak|\btiptoe|\bcreep/i, 'sneak'],
  [/\blift|\bheav(e|es)\b|\bhoist|\bpicks? up/i, 'lift'],
  [/\bputs? (it |him |her )?down|\bsets? (it )?down|\bput.?back|\bplaces? (it|the)/i, 'put-down'],
  [/\brope|\blasso|\bhaul|\bpulls?\b|\btug/i, 'pull'],
  [/\blooks? (back|over)|\bglances? back|\bturns to look|\bover (his|her) shoulder/i, 'look-back'],
  [/\bsigh|\brelie(f|ved)/i, 'sigh'],
  [/\bfall|\btopple|\bflies back|\bknocked (back|away|out)|\bflung/i, 'fall'],
  [/\bidle|\bwaits?\b|\bstands? (there|still|around)|\bbreath/i, 'stand-idle'],
  [/\bthink|\bponder|\bwonder/i, 'think'],
  [/\bshrug/i, 'shrug'],
  [/\bbow(s|ing)?\b/i, 'bow'],
  [/\bkneel/i, 'kneel'],
];

/** The uses a card's words point at. */
export function usesIn(text) {
  const out = new Set();
  for (const [re, tag] of USE_WORDS) if (re.test(text ?? '')) out.add(tag);
  return out;
}

/** What the catalog says against one use of a clip: [{code, msg, fix}]. `uses` from the card, `fingers` true when that actor has a fingers cue in the card. */
export function clipProblems(clip, { uses = new Set(), fingers = false, kind = 'anim' } = {}) {
  const cat = catalog(); if (!cat) return [];
  const name = String(clip).split('@')[0].trim();
  const e = cat.clips?.[name] ?? Object.entries(cat.clips ?? {}).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
  if (!e) {
    if (cat.scope && !cat.scope.includes(name)) return [{ code: 'clip-uncatalogued', msg: `clip "${name}" is not in the clip catalog (no native preview, no verdict)`, fix: 'Pick a catalogued clip: mv clips <use> (library/motion/catalog.md). Or add it to Assets/MusicVideo/Motion and run tools/clip_catalog.mjs.' }];
    return [];
  }
  const out = [];
  if (!e.preview) out.push({ code: 'clip-no-preview', msg: `clip "${name}" has no preview in library/motion/previews`, fix: 'mv hold node Director/tools/clip_catalog.mjs previews ' + name });
  if (!e.grade || e.grade === '?') out.push({ code: 'clip-no-verdict', msg: `clip "${name}" has no verdict in the clip catalog`, fix: 'Watch library/motion/previews/' + name + '.mp4 and add it to library/motion/verdicts.json, then node Director/tools/clip_catalog.mjs build.' });
  if (e.grade === 'ban') out.push({ code: 'clip-banned', msg: `clip "${name}" is banned in the clip catalog: ${e.line}`, fix: `Use ${alternatives(e, uses)}.` });
  const weak = [...uses].filter((u) => (e.weak ?? []).includes(u));
  if (weak.length && e.grade !== 'ban') out.push({ code: 'clip-weak-use', msg: `clip "${name}" is weak for ${weak.join(', ')}, which this card is about: ${e.line}`, fix: `Try ${alternatives(e, new Set(weak))}, or mask what is weak with a layer.` });
  if ((e.needs ?? []).includes('relaxed grip') && !fingers && kind !== 'walk') out.push({ code: 'clip-needs-grip', msg: `clip "${name}" holds his fingers stiff, flat or splayed (${e.handNote ?? 'open hands'}) and this card sets no grip`, fix: `Add {"do":"fingers","on":"<actor>","set":0.35,"for":0} at the start of the card (a relaxed half curl), or a fist for a punch.` });
  return out;
}

function alternatives(e, uses) {
  const cat = catalog(), picks = [];
  for (const u of uses.size ? uses : new Set(e.uses ?? [])) for (const c of cat.tags?.[u] ?? []) if (c !== e.clip && !picks.includes(c)) picks.push(c);
  return picks.length ? picks.slice(0, 4).join(', ') : 'mv clips <use>';
}

/** The best clips for a use, best first, with their one-line verdicts. */
export function bestFor(tag) {
  const cat = catalog(); if (!cat) return null;
  const names = cat.tags?.[tag];
  if (!names) return { tag, known: Object.keys(cat.tags ?? {}).sort(), rows: [] };
  return { tag, rows: names.map((n) => ({ clip: n, ...cat.clips[n] })) };
}
