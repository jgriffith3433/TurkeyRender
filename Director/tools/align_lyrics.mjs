#!/usr/bin/env node
// J's lyrics, timed by whisper's words: lyrics.txt (sections as "# Name" lines) plus lyrics-raw.json (tools/transcribe.py on the vocal stem)
// become lyrics.json in the shape face_act.mjs, qa.mjs and bake.mjs read: {source, lines:[{section, text, words:[{w,t,end}], t, end}]}.
//   node Director/tools/align_lyrics.mjs <video> [--bars "9:1,10:1,11:1,12:1" --lines "1-4"]
// Whisper's words are matched to the text's words in order (an edit-distance alignment on normalised words, a near miss still matches), so a
// misheard word keeps its time and J's spelling. A word whisper never heard has t null (face_act fills it from its neighbours). --bars places whole
// lines whisper missed on bar lines (one line a bar, words spread), for a passage it skipped; --lines says which lines (1-based, in text order).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); if (i < 0) return null; return args.splice(i, 2)[1]; };
const bars = opt('--bars'), lineSel = opt('--lines'), V = args[0] ?? 'hawkespunch';
const DIR = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'videos', V);
const norm = (w) => w.toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, '');
const dist = (a, b) => { const d = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; };
const sim = (a, b) => (a === b ? 1 : 1 - dist(a, b) / Math.max(a.length, b.length));

// the text
const text = fs.readFileSync(path.join(DIR, 'lyrics.txt'), 'utf8').split(/\r?\n/);
const lines = []; let section = '';
for (const raw of text) { const s = raw.trim(); if (!s) continue; if (s.startsWith('#')) { section = s.replace(/^#+\s*/, ''); continue; } lines.push({ section, text: s, words: s.split(/\s+/).map((w) => ({ w, t: null, end: null })) }); }
const T = lines.flatMap((l) => l.words);
// whisper
const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'lyrics-raw.json'), 'utf8'));
const W = raw.lines.flatMap((l) => l.words).filter((w) => w.t != null && norm(w.w));
// align: Needleman-Wunsch on words, match score from similarity, gaps cheap so a whole missing passage just skips
const n = T.length, m = W.length, GAP = -0.35;
const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), B = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
for (let i = 1; i <= n; i++) { S[i][0] = i * GAP; B[i][0] = 1; }
for (let j = 1; j <= m; j++) { S[0][j] = j * GAP; B[0][j] = 2; }
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
  const s = sim(norm(T[i - 1].w), norm(W[j - 1].w)), match = S[i - 1][j - 1] + (s >= 0.6 ? s : -1), up = S[i - 1][j] + GAP, left = S[i][j - 1] + GAP;
  if (match >= up && match >= left) { S[i][j] = match; B[i][j] = 0; } else if (up >= left) { S[i][j] = up; B[i][j] = 1; } else { S[i][j] = left; B[i][j] = 2; }
}
let i = n, j = m, matched = 0;
while (i > 0 || j > 0) {
  const b = i === 0 ? 2 : j === 0 ? 1 : B[i][j];
  if (b === 0) { const s = sim(norm(T[i - 1].w), norm(W[j - 1].w)); if (s >= 0.6) { T[i - 1].t = W[j - 1].t; T[i - 1].end = W[j - 1].end; T[i - 1].heard = W[j - 1].w; matched++; } i--; j--; }
  else if (b === 1) i--; else j--;
}
// lines whisper skipped: on bar lines, if asked
if (bars) {
  const song = JSON.parse(fs.readFileSync(path.join(DIR, 'song.json'), 'utf8')), beats = song.beats, beatLen = (beats.at(-1) - beats[0]) / (beats.length - 1);
  const at = (s) => { const [b, k] = s.split(':').map(Number); return beats[0] + ((b - 1) * 4 + ((k ?? 1) - 1)) * beatLen; };
  const times = bars.split(',').map((s) => at(s.trim()));
  const sel = lineSel ? (() => { const [a, b] = lineSel.split('-').map(Number); return lines.slice(a - 1, b ?? a); })() : lines.filter((l) => l.words.every((w) => w.t == null)).slice(0, times.length);
  sel.forEach((l, k) => { const t0 = times[k], span = Math.min(beatLen * 3.6, (times[k + 1] ?? t0 + beatLen * 4) - t0 - 0.2), per = span / l.words.length; l.words.forEach((w, q) => { w.t = +(t0 + per * q).toFixed(2); w.end = +(t0 + per * (q + 1)).toFixed(2); w.placed = 'bar'; }); });
}
for (const l of lines) { const timed = l.words.filter((w) => w.t != null); l.t = timed[0]?.t ?? null; l.end = timed.at(-1)?.end ?? null; }
// a line still untimed: between its neighbours
lines.forEach((l, k) => { if (l.t != null) return; const p = lines.slice(0, k).reverse().find((x) => x.end != null), q = lines.slice(k + 1).find((x) => x.t != null); if (p && q) { l.t = +(p.end + 0.2).toFixed(2); l.end = +(q.t - 0.2).toFixed(2); } });
const out = { source: 'lyrics.txt timed by whisper on the vocal stem (tools/align_lyrics.mjs)', lines: lines.map((l) => ({ section: l.section, text: l.text, words: l.words.map((w) => ({ w: w.w, t: w.t, end: w.end })), t: l.t, end: l.end })) };
fs.writeFileSync(path.join(DIR, 'lyrics.json'), JSON.stringify(out, null, 1));
console.log(`${matched}/${n} words timed from ${m} heard; ${lines.filter((l) => l.words.some((w) => w.placed)).length} lines placed on bars; untimed words: ${T.filter((w) => w.t == null).length}`);
for (const l of lines) console.log(`${l.t == null ? '  --- ' : l.t.toFixed(2).padStart(7)} ${l.end == null ? '' : l.end.toFixed(2)}  ${l.text}  ${l.words.filter((w) => w.heard && norm(w.heard) !== norm(w.w)).map((w) => `[${w.w}<${w.heard}]`).join(' ')}`);
