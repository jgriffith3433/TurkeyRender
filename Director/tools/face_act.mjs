#!/usr/bin/env node
// Writes a video's whole face performance from its vocal stem, lyrics.json and cards: acts/60-face.json, generated, never edit it.
//   node Director/tools/face_act.mjs [video=greener] [--lead 0]
// Run it again after the cut or the cards change: it only keys shots where his face can be seen, read from cards.map.json and cards/.
// Lip sync: every word becomes phonemes by hand-written dictionary, timed onto the stem's voiced run inside the word's window (whisper stretches
// word starts over rests), scaled by the stem's level, and arriving LEAD seconds ahead of the sound. The mouth keys are jawOpen, smile and mouthPress:
// m b p shut the jaw and press the lips (mouthPress, face_shapes.py), ee widens with smile, oo and w drop the smile to read as narrow. Acting comes from DIRECTION below, line by line.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { yaml } from './cards.mjs';
import { parse as jsonc } from './mv/jsonc.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const [, v] = args.splice(i, 2); return v; };
const LIPS = !(args.includes('--no-lips') && args.splice(args.indexOf('--no-lips'), 1));   // --no-lips: no sung mouth at all (J, Hawkes Punch: no music); expressions, blinks and darts stay
const LEAD = +opt('--lead', 0), V = args[0] ?? 'greener', ACTOR = 'person';
const DIR = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'videos', V);
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const PRESS_M = 0.5;   // how hard m b p press the lips (the mouthPress key)
const MAX_JAW = 0.5, MAX_SMILE = 0.42, RATE = 8000, HZ = 100;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), r3 = (x) => +x.toFixed(3), r2 = (x) => +x.toFixed(2);

// ---- mouth shapes: jaw, and how much smile each adds to the expression (negative narrows the lips)
const SHAPE = { A: [.5, 0], O: [.4, -.12], E: [.34, .04], I: [.24, .08], Y: [.15, .14], U: [.13, -.2], H: [.27, 0],   // vowels; H is the schwa
  M: [0, 0], F: [.05, 0], L: [.09, 0], W: [.08, -.16], G: [.14, 0], S: [.1, .05] };                                    // m b p, f v, tongue, w r, back, sh ch j
const VOWEL = new Set('AOEIYUH');
const WORDS = `a:H am:AM and:AL as:AL at:AL awfully:OFHLY baby:MEYMY bad:MAL be:MY been:MIL better:MELHW big:MIG but:MHL call:GOL can:GAL change:SEYLS clever:GLEFHW
curiosity:GYUWYOSILY darling:LOWLIG deal:LYL didn't:LILHL difficult:LIFIGHLL don't:LOUL drug:LWHG everybody:EFWYMOLY everybody's:EFWYMOLYL few:FYU funny:FHLY gateway:GEYLWEY get:GEL
go:GOU got:GOL habits:GAMIL happens:GAMHLL hard:GAL how:GAU i'm:AYM i've:AYF irresponsible:IWISMOLSIMHL isn't:ILHL it:IL it's:IL just:SHLL keep:GYM know:LOU least:LYL let:LEL like:LAYG
little:LILHL look:LUG manners:MALHL me:MY mind:MAYL mine:MAYL my:MAY new:LU nobody's:LOUMOLYL not:LOL nothing:LHLIG of:HF oh:OU only:OULLY passing:MALIG perfectly:MHFIGLY plan:MLAL
pretend:MWILELL quite:GWAYL really:WYLY respectable:WILMEGLHMHL say:LEY says:LEL secret:LYGWIL should:SUL sleep:LLYM so:LOU some:LHM something:LHMLIG taste:LEYLL that's:LALL their:LEW
theory:LYWY they:LEY they're:LEW think:LIGG through:LWU to:LU told:LOULL tonight:LULAYL until:HLLIL weakness:WYGLIL what:WHL you:YU you're:YOW your:YOW`;
const DICT = Object.fromEntries(WORDS.split(/\s+/).map((x) => x.split(':')));
// A word the dictionary lacks is spelt out by rule (letters to the shapes above), so a new song never stops the tool. Add the real spelling to WORDS when a close-up shows it wrong.
function g2p(word) {
  let w = word.replace(/'s$|'$/, 'S').replace(/n't$/, 'L').toLowerCase().replace(/[^a-z]/g, '');
  const out = []; let i = 0;
  const two = { ch: 'S', sh: 'S', th: 'L', ph: 'F', wh: 'W', ng: 'G', ck: 'G', qu: 'GW', oo: 'U', ee: 'Y', ea: 'Y', ai: 'EY', ay: 'EY', ey: 'EY', ow: 'OU', ou: 'AU', oa: 'OU', ie: 'Y', ei: 'EY', au: 'O', aw: 'O', oi: 'OY', oy: 'OY', ue: 'U', ui: 'U' };
  const one = { a: 'A', e: 'E', i: 'I', o: 'O', u: 'H', y: 'Y', m: 'M', b: 'M', p: 'M', f: 'F', v: 'F', w: 'W', r: 'W', l: 'L', t: 'L', d: 'L', n: 'L', s: 'S', z: 'S', j: 'S', c: 'G', k: 'G', g: 'G', q: 'G', x: 'GS', h: '' };
  while (i < w.length) {
    const d = w.slice(i, i + 2);
    if (two[d]) { out.push(two[d]); i += 2; continue; }
    if (w[i] === 'e' && i === w.length - 1 && out.length > 1 && /[AEIOUHY]/.test(out.join('').slice(-3))) { i++; continue; }   // a silent final e
    if (i && w[i] === w[i - 1]) { i++; continue; }
    out.push(one[w[i]] ?? ''); i++;
  }
  let p = out.join('').replace(/([A-Z])+/g, '$1');
  if (!/[AOEIYUH]/.test(p)) p += 'H';
  return p;
}
const phonesOf = (key) => DICT[key] ?? g2p(key);

// ---- line-by-line acting, in lyrics.json order. smile: the expression under the line (a list goes first to last). fear: brow. wide: {word: eyesWide}. brow: {word: fear}.
// face: any of face_shapes.py's keys held under the whole line ({browDown: .4, eyesNarrow: .3, mouthPress: .2}), back to 0 after it.
// gain scales the mouth. Hold it all under the smile cap; the dip is quiet.
const CHORUS = [
  { smile: [.26, .38], brow: { gateway: .13 }, wide: { baby: .22 } },
  { smile: [.3, .34], brow: { something: .1 } },
  { smile: [.24, .32], fear: .05 },
  { smile: [.34, .4], brow: { darling: .14 }, wide: { look: .32, you: .2 } },
  { smile: [.3, .4], brow: { gateway: .13 }, wide: { baby: .22 } },
  { smile: [.32, .18], brow: { pretend: .1 } },
  { smile: [.18, .28], wide: { funny: .34 }, brow: { curiosity: .1 } },
];
const GREENER = [
  { smile: [.14, .34], wide: { funny: .6 }, brow: { funny: .12 }, gain: .85 },        // Oh, isn't it funny?
  { smile: [.26, .34], brow: { secret: .12 } },                                       // little secret
  { smile: [.32, .24] },
  { smile: [.14, .1], fear: .08, brow: { weakness: .13 } },                           // weakness: soft
  { smile: [.14, .22] },
  { smile: [.26, .34], brow: { irresponsible: .12 } },
  { smile: [.32, .38], brow: { like: .1 } },
  { smile: [.2, .26], wide: { respectable: .2 } },                                    // prim
  { smile: [.12, .05], fear: 0 },                                                     // until tonight: flat look
  { smile: .14, gain: .85 }, { smile: .2, gain: .85 },                                // not a big deal
  { smile: [.2, .3], brow: { everybody: .08 } },
  { smile: [.28, .38], brow: { change: .12 } },
  ...CHORUS,
  { smile: [.24, .08], brow: { difficult: .08 } },                                    // so difficult to let go
  { smile: [.18, .24], wide: { manners: .18 } },                                      // verse 2: prim
  { smile: [.16, .1], fear: .05 },
  { smile: [.28, .38], brow: { bad: .12 } },
  { smile: [.32, .26] },
  { smile: [.2, .28] }, { smile: [.26, .3], brow: { plan: .1 } },
  { smile: [.3, .38], brow: { clever: .14 } },
  { smile: [.32, .16], fear: .05 },                                                   // the first thing goes wrong
  { smile: [.08, 0], fear: .06, gain: .5 }, { smile: 0, fear: .09, gain: .42 },       // the dip: quiet, small mouth, a face changing
  { smile: 0, fear: .12, gain: .42 }, { smile: [0, .2], fear: [.12, .02], gain: .5 }, // until they change their mind: it turns on mind
  ...CHORUS,
  { smile: [.08, .05, .3], fear: 0, gain: .85 },                                      // deadpan, more knowing than before, and he won't let go
  { smile: [.16, .24], fear: .05, gain: .7 },                                         // Oh, darling
  { smile: [.05, .05, .16], fear: 0, gain: .75 },                                     // You really should know better
];
// Another video keeps its direction beside its lyrics: videos/<v>/face-direction.json, a list in lyrics.json line order with the same keys.
const DIRECTION = fs.existsSync(path.join(DIR, 'face-direction.json')) ? jsonc(fs.readFileSync(path.join(DIR, 'face-direction.json'), 'utf8'), 'face-direction') : V === 'greener' ? GREENER : [];
const SONG_END = (() => { try { return read('song.json').duration - .3; } catch { return 154.7; } })();

// ---- the stem
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(DIR, 'stems/htdemucs/audio/vocals.wav'), '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1), N = Math.floor(pcm.length / RATE * HZ), env = new Float64Array(N);
for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let j = Math.max(0, (i - 1.5) * RATE / HZ | 0), e = Math.min(pcm.length, (i + 1.5) * RATE / HZ | 0); j < e; j++, c++) s += pcm[j] * pcm[j]; env[i] = Math.sqrt(s / (c || 1)); }
const at = (t) => env[clamp(Math.round(t * HZ), 0, N - 1)];
const TOP = [...env].sort((a, b) => a - b)[N * .95 | 0] || 1;

// ---- words: fill the untimed ones, then snap each to the voiced run in its window
const lines = read('lyrics.json').lines.map((l) => ({ ...l, words: l.words.map((w) => ({ ...w })) }));
const flat = lines.flatMap((l) => l.words);
for (const [i, w] of flat.entries()) {
  if (w.t != null) continue;
  const prev = flat[i - 1], next = flat.slice(i + 1).find((x) => x.t != null);
  if (V === 'greener' && lines.find((l) => l.words.includes(w)).t >= 147) continue;   // greener's outro: its untimed line is placed from the stem below
  const first = lines.some((l) => l.words[0] === w);
  w.t = !first && prev?.end != null && next && next.t - prev.end > .1 ? prev.end : next.t - .22;
  w.end = next && next.t - w.t < .7 ? next.t : w.t + .45;
}
const oh = V === 'greener' ? lines.find((l) => l.text.startsWith('Oh, darling')) : null;
if (oh && oh.words[0].t == null) {   // the stem has one voiced run at 148.0-148.9
  let a = 147.5; while (a < 150 && at(a) < TOP * .25) a += .01;
  let b = a + .2; while (b < 150 && at(b) > TOP * .08) b += .01;
  oh.words[0].t = a; oh.words[0].end = a + (b - a) * .32; oh.words[1].t = oh.words[0].end; oh.words[1].end = b;
}
function snap(w, next) {
  const a = Math.round(w.t * HZ), b = Math.round(w.end * HZ); let peak = 0;
  for (let i = a; i <= b; i++) peak = Math.max(peak, env[i] ?? 0);
  if (peak < TOP * .05) { w.on = w.t; w.off = w.end; w.peak = peak; return; }
  const runs = []; let s = -1;
  for (let i = a; i <= b + 1; i++) { const v = (env[i] ?? 0) > peak * .3 && i <= b; if (v && s < 0) s = i; if (!v && s >= 0) { runs.push([s, i]); s = -1; } }
  const near = []; for (const r of runs) { const l = near[near.length - 1]; if (l && r[0] - l[1] < 25) l[1] = r[1]; else near.push([...r]); }   // a stop or a t is under 0.25 s; longer is a rest
  const best = near.reduce((p, r) => (r[1] - r[0] >= 8 ? r : p), near[near.length - 1]);
  w.on = best[0] / HZ; w.peak = peak;
  let e = best[1]; const limit = Math.round((next?.t ?? w.end + .6) * HZ); while (e < limit && (env[e] ?? 0) > peak * .22) e++;   // whisper ends holds early
  w.off = e / HZ;
}
flat.forEach((w, i) => { if (w.t != null) snap(w, flat[i + 1]); });
flat.forEach((w, i) => { const n = flat[i + 1]; if (n?.on != null && w.off > n.on - .01) w.off = n.on - .01; });

// ---- where his face shows: in the cast, and the camera is on him
const map = read('cards.map.json');
const cards = Object.fromEntries(fs.readdirSync(path.join(DIR, 'cards')).flatMap((f) => yaml(fs.readFileSync(path.join(DIR, 'cards', f), 'utf8'), f)).map((c) => [c.id, c]));
const cardsAct = jsonc(fs.readFileSync(path.join(DIR, 'acts/50-cards.json'), 'utf8'), '50-cards');
const shotOf = Object.fromEntries(cardsAct.cues.filter((q) => q.shot?.name).map((q) => [q.shot.name, q.shot]));
function faceShows(c) {
  if (!c?.cast?.person) return false;
  const [preset, on, lens] = typeof c.camera === 'string' ? c.camera.split(/\s+/) : [c.camera?.preset, c.camera?.on, c.camera?.lens];
  if (preset === 'wide') return false;
  if (preset === 'spot' && !/^(person|stage_)/.test(String(on))) return false;   // pointed at a set or a prop: he is small or not in it
  return true;
}
const shots = map.map((s) => ({ ...s, card: cards[s.id], show: faceShows(cards[s.id]), sing: !!cards[s.id]?.sing }));
const shown = (t) => shots.find((s) => s.show && t >= s.t - .12 && t < s.tEnd + .12);
const anyWhere = (t) => shots.find((s) => t >= s.t && t < s.tEnd);
const busyEyes = (s) => /"do":"(eyes|gaze)"/.test(JSON.stringify([s.card?.raw ?? [], s.card?.events ?? []])) || /look/.test(JSON.stringify(s.card?.cast?.person ?? ''));

// ---- phonemes on the clock
const phones = [];
for (const [li, l] of lines.entries()) {
  const d = DIRECTION[li] ?? {}, words = l.words.filter((w) => w.on != null), gain = d.gain ?? 1;
  const loud = Math.max(...words.map((w) => w.peak), TOP * .2);
  for (const [wi, w] of words.entries()) {
    const key = w.w.toLowerCase().replace(/[^a-z']/g, ''), p = phonesOf(key);
    if (!p) throw new Error('no phonemes for ' + key);
    const span = Math.max(.08, w.off - w.on), list = [...p], cons = list.filter((c) => !VOWEL.has(c)).length;
    const tails = list.filter((c, i) => VOWEL.has(c) && i && VOWEL.has(list[i - 1])).length, mains = list.length - cons - tails;
    let cd = .06, td = .11;
    const fixed = cons * cd + tails * td; if (fixed > span * .6) { const k = span * .6 / fixed; cd *= k; td *= k; }
    const vd = (span - cons * cd - tails * td) / Math.max(1, mains);
    let t = w.on;
    if (!VOWEL.has(list[0])) t -= cd * .7;   // the consonant shapes up just before its sound
    for (const [i, c] of list.entries()) {
      const tail = VOWEL.has(c) && i && VOWEL.has(list[i - 1]), dur = !VOWEL.has(c) ? cd : tail ? td : vd;
      phones.push({ t, dur, c, line: li, word: w, gain, loud, last: wi === words.length - 1 && i === list.length - 1 });
      t += dur;
    }
  }
}
// Whisper's word edges are loose by a syllable on held lines, and the stem shows every syllable as a hump. So each line's syllables are matched, in order, to the humps.
function humps(a, b, peak) {
  const out = []; let s = -1;
  for (let i = Math.round(a * HZ); i <= Math.round(b * HZ) + 1; i++) { const v = (env[i] ?? 0) > peak * .16 && i / HZ <= b; if (v && s < 0) s = i; if (!v && s >= 0) { if (i - s >= 5) out.push([s, i]); s = -1; } }
  for (let k = 0; k < out.length; k++) {   // a dip between two peaks inside a run is a syllable edge
    const [p, q] = out[k]; let best = -1, depth = 1;
    for (let i = p + 7; i < q - 7; i++) {
      let l = 0, r = 0; for (let j = p; j < i; j++) l = Math.max(l, env[j]); for (let j = i; j < q; j++) r = Math.max(r, env[j]);
      const d = env[i] / Math.min(l, r); if (d < .55 && d < depth) { depth = d; best = i; }
    }
    if (best > 0) { out.splice(k, 1, [p, best], [best, q]); k--; }
  }
  return out.map(([p, q]) => [p / HZ, q / HZ]);
}
function align(li) {
  const ph = phones.filter((p) => p.line === li); if (!ph.length) return;
  const syl = []; let onset = [];
  for (const [i, p] of ph.entries()) {
    const vowel = VOWEL.has(p.c), prev = ph[i - 1], cur = syl[syl.length - 1];
    if (vowel && prev && VOWEL.has(prev.c) && prev.word === p.word && cur) { cur.tail = p; continue; }
    if (vowel) { syl.push({ onset, v: p, tail: null, coda: [] }); onset = []; continue; }
    const more = ph.slice(i + 1).some((x) => x.word === p.word && VOWEL.has(x.c));
    if (!more && cur && cur.v.word === p.word) cur.coda.push(p); else onset.push(p);
  }
  const [a, b] = bounds(lines[li]), peak = Math.max(...ph.map((p) => p.word.peak ?? 0), TOP * .2), segs = humps(a - .12, b + .15, peak);
  if (!segs.length) return;
  const n = syl.length, m = segs.length, INF = 1e9, cost = syl.map(() => Array(m).fill(INF)), from = syl.map(() => Array(m).fill(-1));
  for (let j = 0; j < m; j++) cost[0][j] = Math.abs(segs[j][0] - syl[0].v.t) + j * .08;
  for (let i = 1; i < n; i++) for (let j = 0; j < m; j++) for (let k = 0; k <= j; k++) {
    const c = cost[i - 1][k] + Math.abs(segs[j][0] - syl[i].v.t) + (k === j ? .14 : (j - k - 1) * .2);
    if (c < cost[i][j]) { cost[i][j] = c; from[i][j] = k; }
  }
  let j = cost[n - 1].indexOf(Math.min(...cost[n - 1])); const pick = Array(n);
  for (let i = n - 1; i >= 0; i--) { pick[i] = j; j = from[i][j]; }
  let last = a - .2;
  for (let i = 0; i < n; i++) {
    const same = pick.filter((x) => x === pick[i]).length, q = pick.slice(0, i).filter((x) => x === pick[i]).length, [s, e] = segs[pick[i]];
    const gapAfter = pick[i + 1] !== pick[i], fill = gapAfter ? segs[(pick[i + 1] ?? pick[i] + 1) - 1][1] : e;   // a hump no syllable took is the note before it, held
    const st = s + (e - s) * q / same, en = gapAfter ? fill : s + (e - s) * (q + 1) / same, y = syl[i];
    const cd = Math.min(.05, Math.max(.02, (st - last) / Math.max(1, y.onset.length)));
    y.onset.forEach((p, k) => { p.t = st - cd * (y.onset.length - k); p.dur = cd; });
    const coda = Math.min(.05, (en - st) * .25), tail = y.tail ? Math.min(.11, (en - st) * .3) : 0, vend = en - tail - coda * y.coda.length;
    y.v.t = st; y.v.dur = Math.max(.03, vend - st);
    if (y.tail) { y.tail.t = vend; y.tail.dur = Math.max(.02, tail); }
    y.coda.forEach((p, k) => { p.t = vend + tail + coda * k; p.dur = Math.max(.02, coda); });
    last = en; if (!gapAfter && !y.coda.length) last = en - .02;
  }
}
const bounds = (l) => [l.words.find((w) => w.on != null)?.on ?? l.t, [...l.words].reverse().find((w) => w.off != null)?.off ?? l.end];
lines.forEach((_, li) => align(li));
phones.sort((a, b) => a.t - b.t);

const u = (l, t) => { const [a, b] = bounds(l); return clamp((t - a) / Math.max(.2, b - a), 0, 1); };
const along = (v, x, d) => { if (v == null) return d; if (!Array.isArray(v)) return v; const p = x * (v.length - 1), i = Math.min(v.length - 2, p | 0); return v[i] + (v[i + 1] - v[i]) * (p - i); };
const smileAt = (li, t) => along(DIRECTION[li]?.smile, u(lines[li], t), .15), fearAt = (li, t) => along(DIRECTION[li]?.fear, u(lines[li], t), .03);

// ---- mouth keys
const cues = [];
const face = (t, dur, keys, ease) => cues.push({ at: `${r3(Math.max(0, t))}s`, do: 'face', on: ACTOR, ...keys, for: `${r3(dur)}s`, ...(ease ? { ease } : {}) });
const mouth = [];   // {arrive, jaw, smile, tau, hold}
for (const [i, p] of phones.entries()) {
  const [j, sm] = SHAPE[p.c], arrive = p.t - LEAD;
  if (!shown(arrive)) { const m = mouth[mouth.length - 1]; if (m && m.jaw > 0) mouth.push({ arrive: m.arrive + .12, jaw: 0, smile: m.smile, tau: .12 }); continue; }
  const level = VOWEL.has(p.c) ? clamp(Math.pow(at(p.t + p.dur * .4) / p.loud, .5), .6, 1.05) : 1;
  const jaw = LIPS ? clamp(j * level * p.gain, 0, MAX_JAW) : 0, smile = clamp(smileAt(p.line, p.t) + (LIPS ? sm * (p.gain < .6 ? .5 : 1) : 0), 0, MAX_SMILE);
  mouth.push({ arrive, jaw, smile, press: LIPS && p.c === 'M' ? PRESS_M : 0, tau: p.c === 'M' ? .07 : .09, hold: p.c === 'M' ? .036 : 0 });
  if (VOWEL.has(p.c) && p.dur > .4) for (let t = p.t + .24; t < p.t + p.dur - .12; t += .24) {   // a held note: stays open, follows the level, never a still photo
    const lv = clamp(Math.pow(at(t) / p.loud, .5), .6, 1.05);
    mouth.push({ arrive: t, jaw: LIPS ? clamp(j * lv * p.gain * (.94 + .06 * Math.sin(t * 9)), 0, MAX_JAW) : 0, smile: clamp(smileAt(p.line, t) + (LIPS ? sm : 0), 0, MAX_SMILE), tau: .2 });
  }
  const n = phones[i + 1], gap = n ? n.t - (p.t + p.dur) : 9;
  if (p.last || gap > .16) {   // ease shut at the phrase end; a short breath only rests
    const end = p.t + p.dur;
    mouth.push({ arrive: end + (gap > .3 ? .16 : .08) - LEAD, jaw: !LIPS || gap > .3 ? 0 : .04, smile: clamp(smileAt(p.line, end), 0, MAX_SMILE), tau: gap > .3 ? .18 : .1, ease: gap > .3 ? 'out' : undefined });
  }
}
if (process.env.FACE_DEBUG) { const [x, y] = process.env.FACE_DEBUG.split(',').map(Number); console.log(phones.filter((p) => p.t > x && p.t < y).map((p) => `${p.word.w}:${p.c}@${p.t.toFixed(2)}+${p.dur.toFixed(2)}`).join(' ')); }
mouth.sort((a, b) => a.arrive - b.arrive);
let prev = 0, lastSmile = -1, lastJaw = -1, lastPress = 0;
for (const m of mouth) {
  const start = Math.max(prev, m.arrive - m.tau), dur = Math.max(.02, m.arrive - start), keys = {};
  const j = r3(m.jaw), s = r2(m.smile);
  if (j !== lastJaw && LIPS) keys.jawOpen = j;   // --no-lips leaves the jaw alone, so spoken-line mouths (punch_lines.mjs) own it
  if (s !== lastSmile) keys.smile = s;
  const pr = r2(m.press ?? 0); if (pr !== lastPress) keys.mouthPress = pr;
  if (Object.keys(keys).length) face(start, dur, keys, m.ease);
  lastJaw = j; lastSmile = s; lastPress = pr; prev = start + dur + (m.hold ?? 0);
}

// ---- brows, wide eyes, blinks, darts, rests. A small seeded random: same input, same act.
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const [li, l] of lines.entries()) {
  const d = DIRECTION[li] ?? {}, [a, b] = bounds(l);
  if (shown(a) || shown(b)) {
    face(a - .3, .3, { fear: r2(fearAt(li, a)) });
    if (d.face) { face(a - .3, .3, d.face); face(b + .1, .4, Object.fromEntries(Object.keys(d.face).map((k) => [k, 0]))); }   // any acting shape under the line: {browDown: .4, eyesNarrow: .3}
    if (Array.isArray(d.fear)) face(b - .5, .5, { fear: r2(fearAt(li, b)) });
  }
  for (const w of l.words) {
    if (w.on == null || !shown(w.on)) continue;
    const key = w.w.toLowerCase().replace(/[^a-z']/g, '');
    if (d.brow?.[key] != null) { face(w.on - .12, .12, { fear: d.brow[key] }); face(w.off, .32, { fear: r2(fearAt(li, w.off)) }); }
    if (d.wide?.[key] != null) { face(w.on - .1, .1, { eyesWide: d.wide[key] }); face(Math.max(w.off, w.on + .22), .3, { eyesWide: 0 }); }
  }
}
const blinks = [], addBlink = (t) => {
  const s = anyWhere(t);
  if (!s?.show || t - s.t < .15 || s.tEnd - t < .1 || /roll/.test(s.id)) return;
  if (blinks.length && t - blinks[blinks.length - 1] < 1.1) return;
  blinks.push(t); cues.push({ at: `${r3(t)}s`, do: 'blink', on: ACTOR, for: '0.16s' });
};
const sung = lines.map((l, i) => { const [a, b] = bounds(l); return { i, a, b }; }).sort((x, y) => x.a - y.a);
const rests = [[0.5, sung[0].a, -1]];
for (const [k, s] of sung.entries()) { const nx = sung[k + 1]?.a ?? SONG_END; if (nx - s.b > .35) rests.push([s.b, nx, s.i]); }
let lastDart = 0;
for (const [a, b, li] of rests) {
  if (li >= 0) addBlink(a + .05);
  const len = b - a;
  // the rest keeps moving: the smirk settles or grows toward the next line, the brow breathes
  const nx = Math.min(li + 1, lines.length - 1), sA = li >= 0 ? smileAt(li, a) : .1, sB = smileAt(nx, bounds(lines[nx])[0]);
  if (len > .6 && shown(a + .3)) face(a + .2, Math.max(.3, len - .4), { smile: r2(clamp((sA + sB) / 2 + .04, 0, MAX_SMILE)) });
  if (len > 1.2) for (let t = a + .7 + rnd() * .4; t < b - .4; t += 1.1 + rnd() * 1.4) {
    const s = anyWhere(t); if (!s?.show || s.tEnd - t < .3) continue;
    if (rnd() < .5) addBlink(t); else face(t, .4, { fear: r2(.02 + rnd() * .07) });
    if (!s.sing || busyEyes(s) || t - lastDart < .9) continue;
    lastDart = t;   // a dart away from the lens and straight back
    const y = (rnd() < .5 ? -1 : 1) * (4 + rnd() * 3), p = (rnd() - .5) * 4;
    cues.push({ at: `${r3(t + .1)}s`, do: 'eyes', on: ACTOR, yaw: r2(y), pitch: r2(p), for: '0.07s' }, { at: `${r3(t + .1 + .28 + rnd() * .2)}s`, do: 'eyes', on: ACTOR, yaw: 0, pitch: 0, for: '0.08s' });
  }
}
// a long sung stretch with no rest still blinks now and then, on a word's end
blinks.sort((p, q) => p - q);
for (const w of flat) if (w.off != null && !blinks.some((b) => Math.abs(b - w.off) < 2.4)) { const n = blinks.length; addBlinkFree(w.off); if (blinks.length > n) blinks.sort((p, q) => p - q); }
function addBlinkFree(t) { const s = anyWhere(t); if (!s?.show || t - s.t < .15 || s.tEnd - t < .1 || /roll/.test(s.id)) return; blinks.push(t); cues.push({ at: `${r3(t)}s`, do: 'blink', on: ACTOR, for: '0.16s' }); }

// "Oh, darling": chin down, eyes up. The head stays down and the gaze moves only the eyes, so they roll up to the lens.
const dar = V === 'greener' ? shotOf.darling : null, dmap = map.find((s) => s.id === 'darling');
if (dar?.pos && dmap) {
  cues.push({ at: `${r3(dmap.t + .05)}s`, do: 'pose', on: ACTOR, bones: { head: [13, 0, -3], neck: [6, 0, 0] }, for: '0.55s', ease: 'inout' });
  cues.push({ at: `${r3(dmap.t + .05)}s`, do: 'gaze', on: ACTOR, to: dar.pos, head: 0, for: '0.4s', lead: 2.6, limit: 62 });
  cues.push({ at: `${r3(dmap.tEnd - .02)}s`, do: 'pose', on: ACTOR, bones: { head: [0, 0, 0], neck: [0, 0, 0] }, for: '0.05s' });
}

cues.sort((a, b) => parseFloat(a.at) - parseFloat(b.at));
const head = `// GENERATED by Director/tools/face_act.mjs from the vocal stem, lyrics.json and the cards. Never edit it: change DIRECTION there and run it again.\n`;
fs.writeFileSync(path.join(DIR, 'acts/60-face.json'), head + '{\n "cues": [\n' + cues.map((q) => '  ' + JSON.stringify(q)).join(',\n') + '\n ]\n}\n');
const old = path.join(DIR, 'acts/08-lipsync.json');
if (fs.existsSync(old)) fs.writeFileSync(old, '// Replaced by acts/60-face.json (tools/face_act.mjs).\n{ "cues": [] }\n');
const on = shots.filter((s) => s.show);
console.log(`${cues.length} cues, ${on.length}/${shots.length} shots show his face, ${blinks.length} blinks, lead ${LEAD}s${LIPS ? '' : ', no lips'}`);
console.log('person cast, no face:', shots.filter((s) => !s.show && s.card?.cast?.person).map((s) => s.id).join(' '));
const lost = lines.filter((l) => !l.words.some((w) => w.on != null && shown(w.on))).map((l) => `${l.t}: ${l.text}`);
console.log('lines with his face off screen:', lost.join(' | ') || 'none');
