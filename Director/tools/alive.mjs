#!/usr/bin/env node
// The alive layer (roadmap-system.md item 3): what a body does when nobody is acting it, for every human on screen, from the board. Writes
// videos/<v>/acts/62-alive.json (GENERATED, never edit it) and registers it in generated.json, so `mv build` runs this again when an input moves.
//   node Director/tools/alive.mjs <video> [--only c07,s13] [--out acts/62-alive.json] [--report]
// Per body, per shot it is cast in:
//   alive   one cue per steady stretch (MVAlive.cs, after the Animator): breath at a rate from the shot's register (deadpan/calm 13 a minute,
//           epic/strained 19-22), a held breath in the 0.6 s before a hitstop, nothing inside a freeze; upper-body sway and head micro-motion on
//           seated and standing idles; a standing weight shift on standing idles; zero-g bodies (zg_ clips, space sets) breathe and blink but never
//           shift, and keep the head level (yaw only). A hero clip (hp_, mm_, anything not an idle) gets a little breath on a deadpan shot and
//           nothing on an epic one. A `layer` on the head mask turns the head micro-motion off while it plays.
//   blink   every 2-6 s on a seed per body and shot, plus one just after a cut to a close shot on that face and one on each big gaze turn; never on
//           a stressed syllable of that body's own line, never inside a freeze, never within 0.9 s of a blink another act already has.
//   eyes    small saccades (1-3 deg) while listening or idle; a speaker looks away 5-8 deg as a line starts and comes back; 0.3 s before someone
//           else's line a listener's eyes go toward the speaker (when the card's gaze is elsewhere) and come back after. Never in a shot whose
//           card already keys `eyes` for that body.
//   gaze    only for a listener the cards leave with no gaze at all: a soft head turn (weight 0.5, limit 20) toward the speaker, released after.
//   lips    mouthPress on the m, b and p of each spoken line, placed on the dips of the voice file's own envelope near where the text puts them
//           (the jaw stays punch_lines.mjs's); skipped where a card holds mouthPress.
// Everything is a pure function of time (the C# side reads scene time), seeded by actor and shot id, so a change to one shot never reshuffles another.
// Composes with the cards: it reads the compiled acts/50-cards.json for clips, gaze, eyes, layers, freezes, hitstops and face keys and backs off.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { yaml } from './cards.mjs';
import { parse as jsonc } from './mv/jsonc.mjs';
import { videoInfo, loadClock } from './mv/score.mjs';
import { register } from './mv/generated.mjs';
import { warnIfLeased } from './mv/lease.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const [, v] = args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const ONLY = opt('--only', null)?.split(','), OUT = opt('--out', 'acts/62-alive.json'), REPORT = flag('--report');
const V = args[0]; if (!V) { console.error('node Director/tools/alive.mjs <video> [--only c07,s13] [--out acts/62-alive.json]'); process.exit(1); }
const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const vi = videoInfo(V), DIR = vi.dir;
const readJ = (f) => jsonc(fs.readFileSync(path.join(DIR, f), 'utf8'), f);
const score = readJ('score.json'), FPS = score.fps ?? 30, clock = loadClock(vi, score);
const r3 = (x) => +(+x).toFixed(3), r2 = (x) => +(+x).toFixed(2), clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---- seeded randomness: one stream per (actor, shot)
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (key) => { let s = hash(key) % 2147483646 + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// ---- time
function secs(v, prev = 0) {
  if (v == null) return prev;
  if (typeof v === 'number') return v;
  const m = /^([+\-]?[0-9.]+)f$/.exec(String(v).trim()); if (m) return prev + +m[1] / FPS;
  return clock.T(v, prev);
}
const dur = (v, t, def = 0) => { if (v == null) return def; const m = /^([0-9.]+)f$/.exec(String(v).trim()); if (m) return +m[1] / FPS; return clock.dur(v, t, def); };

// ---- inputs: the board, the cut, the cards, the compiled cards, the lines, every other act's blinks
const board = JSON.parse(fs.readFileSync(path.join(DIR, 'storyboard/shots.json'), 'utf8'));
const boardOf = Object.fromEntries(board.shots.map((s) => [s.id, s]));
const map = readJ('cards.map.json');
const cards = Object.fromEntries(fs.readdirSync(path.join(DIR, 'cards')).filter((f) => /\.ya?ml$/.test(f)).flatMap((f) => yaml(fs.readFileSync(path.join(DIR, 'cards', f), 'utf8'), f)).map((c) => [c.id, c]));
const compiled = readJ('acts/50-cards.json');
const cues = compiled.cues.map((c) => ({ ...c, t: secs(c.at) })).sort((a, b) => a.t - b.t);
const ACTORS = Object.fromEntries(['acts/00-cast.json', 'acts/50-cards.json'].filter((f) => fs.existsSync(path.join(DIR, f))).flatMap((f) => Object.entries(readJ(f).actors ?? {})));
const HUMAN = new Set(Object.entries(ACTORS).filter(([, a]) => /^(person|person2)$/.test(a.model)).map(([n]) => n));
const OWN = path.basename(OUT);
const otherBlinks = {};
for (const f of fs.readdirSync(path.join(DIR, 'acts')).filter((f) => f.endsWith('.json') && f !== OWN).sort()) {
  let a; try { a = readJ('acts/' + f); } catch { continue; }
  for (const c of a.cues ?? []) if (c.do === 'blink' || (c.do === 'face' && c.blink > 0)) (otherBlinks[c.on] ??= []).push(secs(c.at));
}
const LINES = (() => { try { return readJ('lines.json').lines; } catch { return []; } })().concat((() => { try { return readJ('lines2.json'); } catch { return []; } })());
const SFX = 'Assets/MusicVideo/Sfx/punch';

// the voice files: a 100 Hz envelope, the length, the stressed peaks, the closures
const HZ = 100, RATE = 8000;
function envelope(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1), N = Math.floor(pcm.length / RATE * HZ), env = new Float64Array(N);
  for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let j = Math.max(0, (i - .5) * RATE / HZ | 0), e = Math.min(pcm.length, (i + 1.5) * RATE / HZ | 0); j < e; j++, c++) s += pcm[j] * pcm[j]; env[i] = Math.sqrt(s / (c || 1)); }
  const top = [...env].sort((a, b) => a - b)[N * .97 | 0] || 1;
  return { env: [...env].map((x) => x / top), len: pcm.length / RATE };
}
const lines = LINES.filter((L) => L.file).map((L) => {
  const file = path.join(ROOT, SFX, L.file); if (!fs.existsSync(file)) return null;
  const { env, len } = envelope(file);
  const voiced = env.map((x) => x > .18);
  const first = voiced.indexOf(true), last = voiced.lastIndexOf(true);
  const peaks = []; for (let i = 2; i < env.length - 2; i++) if (env[i] > .8 && env[i] >= env[i - 1] && env[i] >= env[i + 1] && env[i] >= env[i - 2] && env[i] >= env[i + 2]) peaks.push(L.start + i / HZ);
  const text = Array.isArray(L.text) ? L.text.map((x) => x[1]).join(' ') : L.text ?? '';
  return { ...L, len, env, a: L.start + Math.max(0, first) / HZ, b: L.start + Math.max(first, last) / HZ, peaks, text, who: L.mouth };
}).filter(Boolean);

// ---- the state of the compiled cards at a time, per actor
const before = (t, pred) => { let r = null; for (const c of cues) { if (c.t > t + 1e-6) break; if (pred(c)) r = c; } return r; };
const clipAt = (on, t) => before(t, (c) => c.do === 'anim' && c.on === on);
const setAt = (on, t) => before(t, (c) => c.do === 'set' && c.on === on);
const gazeAt = (on, t) => { const g = before(t, (c) => c.do === 'gaze' && c.on === on); return g && g.weight !== 0 && g.to != null ? g : null; };
const faceKeyAt = (on, key, t) => { const f = before(t, (c) => c.do === 'face' && c.on === on && c[key] !== undefined); return f ? f[key] : 0; };
const inWin = (on, kind, a, b) => cues.filter((c) => c.do === kind && [].concat(c.on).includes(on) && c.t >= a - 1e-6 && c.t < b);
// freezes (an actor held still) and hitstops (the scene held), in seconds
const holds = cues.filter((c) => c.do === 'freeze' || c.do === 'hitstop').map((c) => ({ kind: c.do, on: [].concat(c.on, c.victim ?? [], c.attacker ?? []), a: c.t, b: c.t + (c.frames != null ? c.frames / FPS : dur(c.for, c.t, 12 / FPS)) }));
const headLayers = cues.filter((c) => c.do === 'layer' && /head|upper|spine/.test(String(c.mask))).map((c) => ({ on: c.on, a: c.t - dur(c.blend, c.t, .2), b: c.t + dur(c.for, c.t, 3) + dur(c.blend, c.t, .2) }));

// ---- the bodies
const SEATED = /sit|seated/i, IDLE = /^(IdleBreathe|mx_breathing_idle|hp_p3_deadpan|.*[Ii]dle(?!Sit).*)$/, ZG = /^zg_/;
const SPACE = (shot) => /space/.test(shot.set ?? '') || /space/.test(shot.seq ?? '');
const GAIN = { breath: 2, head: 1.8, sway: 1.5 };
const REG = { deadpan: { rate: 13, breath: 1 }, calm: { rate: 12.5, breath: 1 }, tense: { rate: 17, breath: 1.2 }, strained: { rate: 22, breath: 1.4 }, epic: { rate: 19, breath: 1.3 } };
function bodyClass(clip, shot) {
  const name = clip?.clip ?? '';
  if (ZG.test(name)) return 'zg';
  if (SPACE(shot)) return IDLE.test(name) ? 'zg' : 'zg-action';
  if (SEATED.test(name)) return 'seated';
  if (IDLE.test(name)) return 'stand';
  return 'action';
}
function params(cls, reg, seed) {
  const R = REG[reg] ?? REG.deadpan, epic = reg === 'epic' || reg === 'strained';
  const p = { rate: r2(R.rate + (seed % 7 - 3) * .3), breath: R.breath, sway: 0, head: 0, shift: 0, level: 0, seed: seed % 97 };
  if (cls === 'seated') Object.assign(p, { sway: 1, head: 1 });
  else if (cls === 'stand') Object.assign(p, { sway: .6, head: 1, shift: 1 });
  else if (cls === 'zg') Object.assign(p, { breath: R.breath * .8, head: .7, level: 1 });
  else if (cls === 'zg-action') Object.assign(p, { breath: epic ? 0 : R.breath * .5, level: 1 });
  else Object.assign(p, { breath: epic ? 0 : R.breath * .5 });
  if (epic && (cls === 'seated' || cls === 'stand')) Object.assign(p, { sway: p.sway * .5, head: .5 });   // tension: stiller
  // MVAlive.cs's unit amounts (chest 1.7 deg, shoulders 2 deg, head 1.1 deg) read as nothing at 24 fps in an MCU (proof 2026-11-08: before and after
  // were indistinguishable); these gains put them where a seated, talking person is: shoulders ~1 cm a breath, the head drifting 2 deg.
  p.breath *= GAIN.breath; p.head *= GAIN.head; p.sway *= GAIN.sway;
  return p;
}

// where a body's head is, roughly, from its last `set` (only for eye directions; the eyes clamp to a few degrees anyway)
function headOf(on, t) {
  const s = setAt(on, t); if (!s?.pos) return null;
  const c = clipAt(on, t)?.clip ?? '', up = SEATED.test(c) ? 1.1 : ZG.test(c) ? 1.5 : 1.6;
  return { pos: [s.pos[0], s.pos[1] + up, s.pos[2]], yaw: s.rot?.[1] ?? 0 };
}
function pointOf(target, t) {
  if (Array.isArray(target)) return target;
  const [n, bone] = String(target).split('.');
  if (HUMAN.has(n)) { const h = headOf(n, t); return h ? [h.pos[0], h.pos[1] - (bone && bone !== 'head' ? .45 : 0), h.pos[2]] : null; }
  const a = ACTORS[n]; return Array.isArray(a?.pos) ? a.pos : null;
}
const wrap = (d) => ((d + 540) % 360) - 180;
function dirOf(from, to) { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]; return { yaw: Math.atan2(dx, dz) * 180 / Math.PI, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI }; }
// the eyes' offset (head frame) that points them at `who`, given where the head points now (the card's gaze, else the body's facing)
function eyesToward(on, who, t) {
  const me = headOf(on, t), them = headOf(who, t); if (!me || !them) return null;
  const want = dirOf(me.pos, them.pos), g = gazeAt(on, t), gp = g ? pointOf(g.to, t) : null;
  const head = gp ? dirOf(me.pos, gp) : { yaw: me.yaw, pitch: -8 };
  const lim = g?.limit ?? 60; head.yaw = me.yaw + clamp(wrap(head.yaw - me.yaw), -lim, lim);
  return { yaw: r2(clamp(wrap(want.yaw - head.yaw), -14, 14)), pitch: r2(clamp(want.pitch - head.pitch, -9, 9)) };
}

// ---- write
const out = [];
const stats = { alive: 0, blink: 0, eyes: 0, gaze: 0, lips: 0, bodies: 0 };
const push = (c) => { out.push(c); stats[c.do === 'face' ? 'lips' : c.do]++; };
const shots = map.filter((s) => !ONLY || ONLY.includes(s.id));
const CLOSE = /MCU|CLOSE|^CU|INSERT/, STILL = /frozen|stock[- ]still|motionless|not a muscle/i;

for (const s of shots) {
  const card = cards[s.id], bs = boardOf[s.id] ?? {}, reg = bs.reg ?? 'deadpan';
  if (!card?.cast) continue;
  const cast = Object.keys(card.cast).filter((n) => HUMAN.has(n));
  const camOn = String(typeof card.camera === 'string' ? card.camera.split(/\s+/)[1] : card.camera?.on ?? '');
  for (const on of cast) {
    stats.bodies++;
    const R = rng(`${on}:${s.id}`), seed = hash(on) % 9973;
    const a0 = s.t, b0 = s.tEnd;
    // ---- alive: steady stretches, split at clip changes, head layers, the held breath before a hitstop, freezes
    const marks = new Set([a0, b0]);
    for (const c of inWin(on, 'anim', a0, b0)) marks.add(c.t);
    const myHolds = holds.filter((h) => h.on.includes(on) && h.b > a0 && h.a < b0);
    const hitstops = holds.filter((h) => h.kind === 'hitstop' && h.b > a0 - .1 && h.a < b0 + .7);   // the scene holds for everyone: the breath is held before it
    for (const h of myHolds) { marks.add(clamp(h.a, a0, b0)); marks.add(clamp(h.b, a0, b0)); }
    for (const h of hitstops) { marks.add(clamp(h.a - .6, a0, b0)); marks.add(clamp(h.a, a0, b0)); }
    const myLayers = headLayers.filter((l) => l.on === on && l.b > a0 && l.a < b0);
    for (const l of myLayers) { marks.add(clamp(l.a, a0, b0)); marks.add(clamp(l.b, a0, b0)); }
    const pts = [...marks].sort((x, y) => x - y).filter((x, i, a) => i === 0 || x - a[i - 1] > .02);
    const pieces = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], mid = (a + b) / 2;
      const cls = bodyClass(clipAt(on, mid), s), p = params(cls, reg, seed);
      const frozenHere = myHolds.some((h) => mid >= h.a && mid < h.b && h.kind === 'freeze');
      if (frozenHere) { p.breath = 0; p.sway = 0; p.head = 0; p.shift = 0; }
      if (hitstops.some((h) => mid >= h.a - .6 && mid < h.a)) p.breath = 0;   // held breath before the hit
      if (myLayers.some((l) => mid >= l.a && mid < l.b)) p.head = 0;
      if (STILL.test(card.idea ?? '')) { p.sway = 0; p.head = 0; p.shift = 0; p.breath = Math.min(p.breath, .5); }   // the card says he is frozen: only a shallow breath
      const last = pieces[pieces.length - 1];
      if (last && ['rate', 'breath', 'sway', 'head', 'shift', 'level'].every((k) => last.p[k] === p[k])) { last.b = b; continue; }
      pieces.push({ a, b, p, cls, frozen: frozenHere });
    }
    // a stretch shorter than its own fades goes to its neighbour (the held breath before a hit is kept: it is short on purpose)
    for (let i = 0; i < pieces.length; i++) {
      const pc = pieces[i]; if (pc.b - pc.a >= .35 || pieces.length < 2 || pc.p.breath === 0) continue;
      if (pieces[i + 1]) pieces[i + 1].a = pc.a; else pieces[i - 1].b = pc.b;
      pieces.splice(i--, 1);
    }
    const F = .25;
    for (const [i, pc] of pieces.entries()) {
      const fadeIn = i > 0 ? F : 0, fadeOut = i < pieces.length - 1 ? F : 0;
      // into a freeze or a held breath the fade ends ON the boundary (nothing moves inside the hold); elsewhere the two settings overlap
      const still = (q) => q && (q.p.breath === 0 || q.frozen);
      const a = Math.max(a0, pc.a - (still(pieces[i - 1]) || pc.frozen ? 0 : fadeIn / 2)), b = Math.min(b0, pc.b + (still(pieces[i + 1]) || pc.frozen ? -0 : fadeOut / 2)), p = pc.p;
      if (p.breath === 0 && p.sway === 0 && p.head === 0 && p.shift === 0) continue;
      const c = { at: `${r3(a)}s`, do: 'alive', on, for: `${r3(b - a)}s`, rate: p.rate, breath: r2(p.breath) };
      if (p.sway) c.sway = r2(p.sway); if (p.head) c.head = r2(p.head); if (p.shift) c.shift = r2(p.shift); if (p.level) c.level = p.level;
      c.seed = p.seed; if (fadeIn) c.in = fadeIn; if (fadeOut) c.out = fadeOut; c.note = `${s.id} ${pc.cls} ${reg}`;
      push(c);
    }

    // ---- blinks
    const mine = lines.filter((L) => L.who === on);
    const stressed = (t) => mine.some((L) => L.peaks.some((p) => Math.abs(p - t) < .18));
    const frozen = (t) => myHolds.some((h) => t > h.a - .1 && t < h.b + .05);
    const taken = [...(otherBlinks[on] ?? [])];
    const blinkOk = (t) => t > a0 + .1 && t < b0 - .2 && !stressed(t) && !frozen(t) && !taken.some((x) => Math.abs(x - t) < .9);
    const blink = (t, slow) => { t = r3(t); if (!blinkOk(t)) return false; taken.push(t); push({ at: `${t}s`, do: 'blink', on, for: slow ? '0.2s' : '0.16s' }); return true; };
    const sizeClose = CLOSE.test(bs.size ?? '') && camOn.startsWith(on);
    if (sizeClose) blink(a0 + .2 + R() * .1);
    for (const g of inWin(on, 'gaze', a0 + .05, b0)) {   // a big turn of the head carries a blink
      const prev = gazeAt(on, g.t - .01), pp = prev ? pointOf(prev.to, g.t) : null, np = g.to != null ? pointOf(g.to, g.t) : null, me = headOf(on, g.t);
      if (pp && np && me && Math.abs(wrap(dirOf(me.pos, np).yaw - dirOf(me.pos, pp).yaw)) > 20) blink(g.t + .03);
    }
    const mean = reg === 'epic' ? 3.2 : 3.8;
    for (let t = a0 + .6 + R() * 2; t < b0 - .3; t += 2 + R() * 4 * (mean / 4)) {
      if (!blink(t, reg !== 'epic' && R() < .15)) for (const d of [.25, -.25, .5]) if (blink(t + d)) break;
    }

    // ---- eyes: saccades, a speaker's look-away, the listener's look toward the next speaker
    const cardEyes = inWin(on, 'eyes', a0 - .01, b0).length > 0;
    if (!cardEyes) {
      const ev = [];   // {t, yaw, pitch, hold}
      const speaking = (t) => mine.some((L) => t >= L.a - .05 && t < L.b + .1);
      for (const L of mine) if (L.a > a0 && L.a < b0 - .6) {   // a speaker looks away as a line starts, then back
        const side = R() < .5 ? -1 : 1, dead = reg === 'deadpan';   // deadpan holds the stare more often, and looks off less far
        if (dead && R() < .5) continue;
        ev.push({ t: L.a + .05, yaw: r2(side * (dead ? 3 + R() * 2 : 5 + R() * 3)), pitch: r2(-1.5 + R() * 3), hold: Math.min(.6 + R() * .5, L.b - L.a) });
      }
      for (const L of lines.filter((L) => L.who && L.who !== on && cast.includes(L.who) && L.start > a0 + .35 && L.start < b0 - .4)) {
        const g = gazeAt(on, L.start), already = g && String(g.to).startsWith(L.who + '.');
        const e = already ? null : eyesToward(on, L.who, L.start);
        if (e && (Math.abs(e.yaw) > 2 || Math.abs(e.pitch) > 2)) ev.push({ t: L.start - .3, yaw: e.yaw, pitch: e.pitch, hold: Math.min(1.2, L.b - L.start + .3), toward: L.who });
      }
      // micro-saccades in the gaps: around the fixation point, 1-3 deg, every 0.7-2 s
      for (let t = a0 + .3 + R() * .6; t < b0 - .35; t += .7 + R() * 1.3) {
        if (ev.some((e) => t > e.t - .25 && t < e.t + e.hold + .25) || frozen(t)) continue;
        const big = !speaking(t) && R() < .12;   // now and then a thought: a longer look off
        ev.push({ t, yaw: r2((R() < .5 ? -1 : 1) * (big ? 4 + R() * 3 : 1 + R() * 2)), pitch: r2((R() - .5) * (big ? 4 : 2)), hold: big ? .5 + R() * .4 : .25 + R() * .5, micro: !big });
      }
      ev.sort((x, y) => x.t - y.t);
      let free = a0;
      for (const e of ev) {
        if (e.t < free || frozen(e.t)) continue;
        const back = Math.min(e.t + .045 + e.hold, b0 - .12);
        if (back - e.t < .15) continue;
        push({ at: `${r3(e.t)}s`, do: 'eyes', on, yaw: e.yaw, pitch: e.pitch, for: e.micro ? '0.04s' : '0.06s' });
        push({ at: `${r3(back)}s`, do: 'eyes', on, yaw: 0, pitch: 0, for: '0.05s' });
        free = back + .1;
      }
    }

    // ---- gaze: only a listener the cards leave with no gaze at all, toward whoever speaks
    if (!inWin(on, 'gaze', a0 - .01, b0).length && !gazeAt(on, a0 + .01)) {
      for (const L of lines.filter((L) => L.who && L.who !== on && cast.includes(L.who) && L.start > a0 && L.start < b0 - .5)) {
        if (!['seated', 'stand', 'zg'].includes(bodyClass(clipAt(on, L.start), s))) continue;
        push({ at: `${r3(L.start - .3)}s`, do: 'gaze', on, to: `${L.who}.head`, weight: .5, limit: 20, for: '0.5s' });
        push({ at: `${r3(Math.min(L.b + .6, b0 - .05))}s`, do: 'gaze', on, weight: 0, for: '0.6s' });
      }
    }
  }
}

// ---- lips: m, b and p close on the voice's own dips (the jaw stays punch_lines.mjs's)
for (const L of lines) {
  if (!L.who || ONLY && !shots.some((s) => L.start >= s.t && L.start < s.tEnd)) continue;
  const letters = L.text.toLowerCase().replace(/[^a-z' ]/g, '');
  const B = []; for (let i = 0; i < letters.length; i++) if ('mbp'.includes(letters[i]) && !(letters[i] === 'p' && letters[i + 1] === 'h') && !(letters[i] === 'b' && letters[i - 1] === 'm')) B.push(i / Math.max(1, letters.length - 1));
  if (!B.length) continue;
  const env = L.env, i0 = Math.round((L.a - L.start) * HZ), i1 = Math.round((L.b - L.start) * HZ);
  const dips = [];   // a low run of 3-15 frames between voiced frames
  for (let i = i0 + 1; i < i1; i++) {
    if (env[i] < .22 && env[i - 1] >= .22) { let j = i; while (j < i1 && env[j] < .22) j++; if (j - i >= 3 && j - i <= 15) dips.push([i, j]); i = j; }
  }
  const used = new Set();
  for (const u of B) {
    const want = i0 + u * (i1 - i0);
    let best = -1, bd = 22;   // within 0.22 s of where the text puts the letter
    for (const [k, [p, q]] of dips.entries()) { const d = Math.abs((p + q) / 2 - want); if (!used.has(k) && d < bd) { bd = d; best = k; } }
    if (best < 0) continue;
    used.add(best);
    const [p, q] = dips[best], ta = L.start + p / HZ - .03, tb = L.start + q / HZ;
    if (faceKeyAt(L.who, 'mouthPress', ta) > 0 || cues.some((c) => c.do === 'face' && c.on === L.who && c.mouthPress !== undefined && Math.abs(c.t - ta) < .6)) continue;
    push({ at: `${r3(ta)}s`, do: 'face', on: L.who, mouthPress: .55, for: '0.04s' });
    push({ at: `${r3(tb)}s`, do: 'face', on: L.who, mouthPress: 0, for: '0.06s' });
  }
}

out.sort((a, b) => parseFloat(a.at) - parseFloat(b.at));
const file = path.join(DIR, OUT);
warnIfLeased(file);
const head = `// GENERATED by Director/tools/alive.mjs from the board, the cut, the cards and the voice files: breath, blinks, saccades, idle sway and the m/b/p lips. Never edit it: change the tool and run it again.\n`;
fs.writeFileSync(file, head + '{\n "cues": [\n' + out.map((q) => '  ' + JSON.stringify(q)).join(',\n') + '\n ]\n}\n');
if (!ONLY && OUT === 'acts/62-alive.json') {
  const inputs = ['storyboard/shots.json', 'cards.map.json', 'cards/', 'acts/50-cards.json', 'acts/00-cast.json', 'lines.json', 'lines2.json', 'score.json', 'song.json',
    ...fs.readdirSync(path.join(DIR, 'acts')).filter((f) => f.endsWith('.json') && f !== OWN && !['50-cards.json', '00-cast.json'].includes(f)).map((f) => 'acts/' + f),
    ...new Set(LINES.filter((L) => L.file).map((L) => `${SFX}/${L.file}`))];
  register(DIR, OUT, { tool: `node Director/tools/alive.mjs ${V}`, inputs });
}
console.log(`${path.relative(ROOT, file)}: ${out.length} cues for ${stats.bodies} bodies in ${shots.length} shots (alive ${stats.alive}, blinks ${stats.blink}, eyes ${stats.eyes}, gaze ${stats.gaze}, lips ${stats.lips})`);
if (REPORT) for (const c of out.filter((c) => c.do === 'alive')) console.log(c.at, c.on, c.note, `rate ${c.rate} breath ${c.breath} sway ${c.sway ?? 0} head ${c.head ?? 0} shift ${c.shift ?? 0}${c.level ? ' level' : ''}`);
