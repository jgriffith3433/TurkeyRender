#!/usr/bin/env node
// The motion critic: judges character animation from per-frame bone dumps the way an animator's eye would, before anyone renders or watches.
// Twelve principles scored 0-10 (arcs, ease, timing, anticipation and follow-through, overlap, weight, snaps, stiffness, silhouette, hands and face,
// contact, distance from real human motion), a total, the worst five moments with times and bones, one line of verdict. Measures: tools/critic/measures.mjs.
//
//   node Director/tools/critic.mjs clip <name...> [--clean --fps 30 --force --zerog]   a humanoid clip by name (Mixamo, Keyed/<sheet>.anim, Clean): dumps it with
//                                                   `call clipbones` (Unity, queued) into gen/critic/clips/, scores it, writes library/motion/critic/<name>.json and .md
//   node Director/tools/critic.mjs pose <sheet>     a keyed pose sheet through its derived clip (same as clip <sheet>; `mv call posederive` first if the .anim is stale)
//   node Director/tools/critic.mjs cut <video> [from to] [--on person,other --fps 30 --zerog --label x --force]
//                                                   the built scene over a range: `call shotbones` per actor (chunks of 20 s), cuts read from the compiled shots,
//                                                   report in videos/<v>/critic/<label>/ (report.json, report.md, one json per actor)
//   node Director/tools/critic.mjs dump <file.json> [--pair other.json --zerog --cuts 1.2,3.4]   score an existing dump
//   node Director/tools/critic.mjs reference [--force]      dumps every Mixamo clip in the catalog (mx_*; Unity, 5-10 s each) and writes library/motion/critic/reference.json:
//                                                   the signature statistics of real human motion, which principle 12 measures against
//   node Director/tools/critic.mjs calibrate        scores every catalog clip against its A/B/C grade: agreement, per-grade means, the fixtures. Writes critic/calibration.md
//   node Director/tools/critic.mjs vision <mp4> [--report critic.json --start <song s at file 0> --budget 1 --top 6 --model claude-sonnet-5-5]
//                                                   24 fps strips at the report's worst moments, a fixed checklist to Claude vision through Hawkes Gen (llm.json, tkshock),
//                                                   priced first, answers merged into the report
//   node Director/tools/critic.mjs twin <file.npz|bvh|fbx...> [--start s --end s --zerog]   headless: tools/critic/twin.py turns the file into a dump, no Unity (agrees with a
//                                                   Unity dump within ~0.3 on mocap; no fingers). Reports in library/motion/critic/twin/
//   node Director/tools/critic.mjs rank <beat> <src...> [--zerog]   ranks a beat's candidates (catalog names via their Unity dump, files via the twin, file@a-b trims)
//                                                   -> library/motion/critic/beats/<beat>.md|json
//   node Director/tools/critic.mjs test             self test on synthetic motion (a real-looking swing against a linear one)
// Unity only through mv's queue (every dump is an `mv call`). No C#, no commits. Thresholds: CAL in measures.mjs; calibration: Director/review/motion-critic.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { measure, referenceStats, signature, prepare, energyOf, movesOf, CAL, WEIGHTS, totalOf, pct, mean } from './critic/measures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE), MV = path.join(ROOT, 'mv.mjs');
const DUMPS = path.join(ROOT, 'gen', 'critic', 'clips'), LIB = path.join(ROOT, 'library', 'motion', 'critic'), REF = path.join(LIB, 'reference.json');
const argv = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), nx = argv[i + 1]; if (nx !== undefined && !nx.startsWith('--') && !['force', 'clean', 'raw', 'zerog', 'quiet', 'json', 'no-vision'].includes(k)) { flags[k] = nx; i++; } else flags[k] = true; } else pos.push(a); }
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const write = (f, x) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof x === 'string' ? x : JSON.stringify(x, null, 1)); };
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : x);
const clockOf = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

/** An mv call, through the queue (or inside the caller's ticket under mv hold). */
function mv(video, cmd, args) {
  const list = [MV, ...(video ? ['--video', video] : []), 'call', cmd, JSON.stringify(args)];
  const r = spawnSync(process.execPath, list, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
  if (r.status) throw new Error(`${cmd}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
  const out = r.stdout; return JSON.parse(out.slice(out.indexOf('{')));
}

const importJson = (() => { let c; return () => (c ??= read(path.join(ROOT, 'library', 'motion', 'import.json')).clips ?? {}); })();
const catalogVerdicts = (() => { let c; return () => (c ??= read(path.join(ROOT, 'library', 'motion', 'verdicts.json')).clips ?? {}); })();
const reference = (() => { let c; return () => { if (c === undefined) c = fs.existsSync(REF) ? read(REF) : null; return c; }; })();
const isZg = (name) => /(^|_)zg_|^hp_[a-z]\d_|^hp_(f|c|a|d|w|r|s)\d/.test(name) && !/hp_doc|hp_him_hit|hp_p3_deadpan/.test(name);

/** The dump of a clip, from the cache or Unity. A native actor plays the clean copy where import.json says it wins, so that is what is judged unless --raw. */
function clipDump(name, { clean, fps = 30, force = false, video } = {}) {
  if (clean === undefined) clean = !flags.raw && !!importJson()[name]?.clean?.use;
  const file = path.join(DUMPS, `${name}${clean ? '__clean' : ''}.json`);
  if (!force && fs.existsSync(file)) { try { const d = read(file); if (d.frames?.length > 1 && d.fps === fps) return d; } catch {} }
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const r = mv(video, 'clipbones', { clip: name, fps, clean, out: rel });
  if (!r.frames) throw new Error(`clipbones gave no frames for ${name}`);
  return read(file);
}

function optsFor(name, extra = {}) {
  const imp = importJson()[name] ?? importJson()[name.replace(/__clean$/, '')];
  return { travelling: !!imp?.travelling, zerog: !!flags.zerog || isZg(name), reference: reference(), ...extra };
}

// ---------- reports ----------
const PRINCIPLES = [['arcs', '1 Arcs'], ['ease', '2 Slow in and out'], ['timing', '3 Timing'], ['anticipation', '4 Anticipation and follow-through'], ['overlap', '5 Overlap and drag'], ['weight', '6 Weight'], ['snaps', '7 Snaps and pops'], ['stiffness', '8 Stiffness'], ['silhouette', '9 Silhouette'], ['hands', '10 Hands and face'], ['contact', '11 Contact'], ['reference', '12 Distance from human motion']];
export function verdictOf(rep) {
  const t = rep.total, worst = Object.entries(rep.principles).filter(([, p]) => Number.isFinite(p.score)).sort((a, b) => a[1].score - b[1].score).slice(0, 2).map(([k]) => k);
  if (!Number.isFinite(t)) return 'nothing to judge';
  if (t >= 8.5) return `reads as human (${t}/10)`;
  if (t >= 7) return `passable, weak on ${worst.join(' and ')} (${t}/10)`;
  if (t >= 5) return `looks animated, not acted: ${worst.join(' and ')} give it away (${t}/10)`;
  return `wrong to an animator's eye: ${worst.join(' and ')} (${t}/10)`;
}
export function markdown(rep, { title, offset = 0 } = {}) {
  const L = [`# Motion critic: ${title ?? rep.name}`, '', `${rep.frames} frames at ${rep.fps} fps (${rep.seconds} s)${rep.zerog ? ', judged as zero-g' : ''}. **Total ${rep.total}/10: ${verdictOf(rep)}.**`, '', '| principle | score | what the numbers say |', '|---|---|---|'];
  for (const [k, label] of PRINCIPLES) { const p = rep.principles[k]; if (!p) continue; L.push(`| ${label} | ${p.na ? 'n/a' : p.score} | ${p.note}${p.partial ? ' (partial)' : ''} |`); }
  L.push('', '## Worst moments', '');
  if (!rep.worst.length) L.push('none found.');
  for (const w of rep.worst) L.push(`- **${clockOf(w.t + offset)}** (${w.t + offset} s, f${w.f}) ${w.part}: ${w.what}${w.also.length ? ` (also ${w.also.join(', ')})` : ''}`);
  if (rep.vision) { L.push('', '## Vision (Claude on 24 fps strips at the worst moments)', ''); for (const s of rep.vision.strips) L.push(`- **${clockOf(s.t + offset)}**: weight ${s.weight}/10, timing ${s.timing}/10, ${s.human ? 'reads human' : 'does not read human'}. ${s.wrong}${s.fix ? ` Fix: ${s.fix}` : ''}`); L.push('', `Vision cost $${rep.vision.cost}.`); }
  return L.join('\n') + '\n';
}

function scoreDump(d, opts, name) { const rep = measure(d, opts); rep.name = name ?? rep.name; rep.verdict = verdictOf(rep); return rep; }

// ---------- commands ----------
async function cmdClip(names) {
  if (!names.length) throw new Error('clip <name...>');
  const out = [];
  for (const name of names) {
    const d = clipDump(name, { clean: flags.clean ? true : flags.raw ? false : undefined, fps: +(flags.fps ?? 30), force: !!flags.force, video: flags.video });
    const rep = scoreDump(d, optsFor(name), name);
    write(path.join(LIB, `${name}${flags.clean ? '__clean' : ''}.json`), rep);
    write(path.join(LIB, `${name}${flags.clean ? '__clean' : ''}.md`), markdown(rep));
    out.push(rep);
    if (!flags.quiet) console.log(`${name.padEnd(28)} ${String(rep.total).padStart(4)}  ${rep.verdict}`);
  }
  if (flags.json) console.log(JSON.stringify(out.map((r) => ({ name: r.name, total: r.total, principles: Object.fromEntries(Object.entries(r.principles).map(([k, p]) => [k, p.score])), worst: r.worst })), null, 1));
  return out;
}

/** Shot boundaries of a video from its compiled shots, as song seconds. No Unity. */
function cutsOf(video) {
  const r = spawnSync(process.execPath, [MV, '--video', video, 'shots'], { encoding: 'utf8' });
  const cuts = []; for (const line of (r.stdout || '').split('\n')) { const m = line.match(/^\s*\d+\s+\S+\s+([\d.]+)\s+[\d.]+\s+[\d.]+\s+\S+/); if (m) cuts.push(+m[1]); }
  return cuts;
}
function durationOf(video) { try { const s = read(path.join(ROOT, 'videos', video, 'song.json')); return s.duration ?? s.length; } catch { return null; } }

async function cmdCut(video, from, to) {
  if (!video) throw new Error('cut <video> [from to]');
  const vdir = video === 'tkshock' ? ROOT : path.join(ROOT, 'videos', video);
  from = from != null ? +from : 0; to = to != null ? +to : durationOf(video) ?? 60;
  const fps = +(flags.fps ?? 30), who = String(flags.on ?? 'person').split(','), label = flags.label ?? `${from.toFixed(0)}-${to.toFixed(0)}`;
  const dir = path.join(vdir, 'critic', label); fs.mkdirSync(dir, { recursive: true });
  const cuts = cutsOf(video).filter((c) => c > from && c < to);
  const dumps = {};
  for (const actor of who) {
    const file = path.join(dir, `${actor}.bones.json`);
    if (!flags.force && fs.existsSync(file)) { dumps[actor] = read(file); continue; }
    const parts = [];
    for (let a = from; a < to - 1e-6; a += 20) {
      const b = Math.min(to, a + 20), rel = path.relative(ROOT, path.join(dir, `_${actor}_${a.toFixed(1)}.json`)).replace(/\\/g, '/');
      if (!flags.quiet) console.error(`shotbones ${actor} ${a.toFixed(1)}-${b.toFixed(1)} s`);
      mv(video, 'shotbones', { from: a, to: b - 1 / fps, on: actor, fps, out: rel });
      parts.push(read(path.join(ROOT, rel))); fs.unlinkSync(path.join(ROOT, rel));
    }
    const d = { ...parts[0], frames: parts.flatMap((p) => p.frames) }; write(file, d); dumps[actor] = d;
  }
  const reps = {}, zerog = !!flags.zerog;
  for (const actor of who) { const others = who.filter((w) => w !== actor); reps[actor] = scoreDump(dumps[actor], { cuts, zerog, reference: reference(), pair: others.length ? dumps[others[0]] : undefined, pairName: others[0] }, `${video} ${actor} ${from}-${to} s`); write(path.join(dir, `${actor}.json`), reps[actor]); }
  const all = Object.values(reps), P = {};
  for (const [k] of PRINCIPLES) { const ps = all.map((r) => r.principles[k]).filter((p) => p && !p.na); if (!ps.length) { P[k] = all[0].principles[k]; continue; } P[k] = { score: Math.round(mean(ps.map((p) => p.score)) * 10) / 10, note: who.length > 1 ? ps.map((p, i) => `${who[i]}: ${p.note}`).join('; ') : ps[0].note, partial: ps.some((p) => p.partial) }; }
  const events = all.flatMap((r, i) => r.events.map((e) => ({ ...e, part: `${who[i]}.${e.part}` }))).sort((a, b) => b.sev - a.sev);
  const { worstOf } = await import('./critic/measures.mjs');
  const rep = { name: `${video} ${from}-${to} s`, video, from, to, actors: who, fps, frames: all[0].frames, seconds: all[0].seconds, zerog, cuts: cuts.length, principles: P, total: totalOf(P), events: events.slice(0, 200), worst: worstOf(events), perActor: Object.fromEntries(all.map((r, i) => [who[i], { total: r.total, verdict: r.verdict }])) };
  rep.verdict = verdictOf(rep);
  write(path.join(dir, 'report.json'), rep); write(path.join(dir, 'report.md'), markdown(rep, { title: rep.name }));
  if (!flags.quiet) { console.log(markdown(rep, { title: rep.name })); console.log(`report: ${path.join(dir, 'report.md')}`); }
  return rep;
}

async function cmdDump(file) {
  const d = read(file), pair = flags.pair ? read(flags.pair) : undefined, cuts = flags.cuts ? String(flags.cuts).split(',').map(Number) : [];
  const rep = scoreDump(d, { cuts, zerog: !!flags.zerog, pair, reference: reference() }, path.basename(file, '.json'));
  const out = file.replace(/\.json$/, '.critic.json'); write(out, rep); write(out.replace(/\.json$/, '.md'), markdown(rep));
  console.log(markdown(rep));
}

/** The headless twin: any motion file (npz, bvh, fbx) to a dump without Unity (tools/critic/twin.py), cached by source mtime. */
function twinDump(src, o = {}) {
  const name = o.name ?? path.basename(src).replace(/^Humanoid@/, '').replace(/\.(npz|bvh|fbx)$/i, '') + (o.start != null ? `@${o.start}-${o.end ?? ''}` : '');
  const out = path.join(ROOT, 'gen', 'critic', 'twin', name.replace(/[^\w@.-]+/g, '_') + '.json');
  const abs = path.isAbsolute(src) ? src : fs.existsSync(path.resolve(src)) ? path.resolve(src) : path.join(ROOT, '..', src);
  if (!fs.existsSync(out) || (fs.existsSync(abs) && fs.statSync(abs).mtimeMs > fs.statSync(out).mtimeMs) || flags.force) {
    const args = ['-I', path.join(ROOT, 'tools', 'critic', 'twin.py'), abs, out, '--name', name, ...(o.start != null ? ['--start', String(o.start)] : []), ...(o.end != null ? ['--end', String(o.end)] : [])];
    const r = spawnSync('py', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status) throw new Error(`twin ${src}: ${(r.stderr || r.stdout).trim().split('\n').slice(-2).join(' ')}`);
  }
  return { name, d: read(out), file: out };
}
async function cmdTwin(srcs) {
  for (const src of srcs) {
    const { name, d } = twinDump(src, { start: flags.start, end: flags.end });
    const rep = scoreDump(d, { zerog: !!flags.zerog, reference: reference() }, name);
    write(path.join(LIB, 'twin', `${name}.json`), rep); write(path.join(LIB, 'twin', `${name}.md`), markdown(rep));
    console.log(flags.quiet ? `${name}\t${rep.total}` : markdown(rep));
  }
}
/** Ranks candidates for a beat: each `src` is a catalog clip name (its Unity dump), a keyed sheet, or a file (twin). `src@a-b` trims a file. */
async function cmdRank(beat, srcs) {
  const rows = [];
  for (const raw of srcs) {
    try {
      const m = raw.match(/^(.*?)@([\d.]*)-([\d.]*)$/), src = m ? m[1] : raw;
      let d, name;
      if (/\.(npz|bvh|fbx)$/i.test(src)) ({ d, name } = twinDump(src, { start: m?.[2] ? +m[2] : undefined, end: m?.[3] ? +m[3] : undefined }));
      else { name = src; d = clipDump(src, { fps: 30 }); }
      const rep = scoreDump(d, { zerog: !!flags.zerog || /^(zg_|hp_)/.test(name), reference: reference() }, name);
      rows.push({ name, src: raw, via: d.twin ? 'twin' : 'unity', seconds: rep.seconds, total: rep.total, verdict: rep.verdict, low: Object.entries(rep.principles).filter(([, p]) => Number.isFinite(p.score)).sort((a, b) => a[1].score - b[1].score).slice(0, 3).map(([k, p]) => `${k} ${p.score}`), principles: Object.fromEntries(Object.entries(rep.principles).map(([k, p]) => [k, p.na ? null : p.score])), worst: (rep.worst ?? []).slice(0, 3).map((w) => `${w.t}s ${w.what}`) });
    } catch (e) { rows.push({ name: raw, error: e.message.split('\n')[0] }); }
  }
  rows.sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  const out = { beat, when: new Date().toISOString(), zerog: !!flags.zerog, rows };
  write(path.join(LIB, 'beats', `${beat}.json`), out);
  const L = [`# Motion candidates: ${beat} (${out.when.slice(0, 16)})`, '', `Ranked by the critic (${flags.zerog ? 'zero-g' : 'grounded'}). Twin = scored headless from the source file; unity = a clipbones dump.`, '', '| # | clip | via | s | total | lowest | worst moment |', '|---|---|---|---|---|---|---|',
    ...rows.map((r, i) => r.error ? `| ${i + 1} | ${r.name} | - | - | error | ${r.error} | |` : `| ${i + 1} | ${r.name} | ${r.via} | ${r2(r.seconds)} | **${r.total}** | ${r.low.join(', ')} | ${r.worst[0] ?? ''} |`), ''];
  write(path.join(LIB, 'beats', `${beat}.md`), L.join('\n'));
  console.log(L.join('\n'));
}

/** Every mocap clip the catalog knows: the human reference. */
function mocapNames() { return Object.keys(catalogVerdicts()).filter((n) => /^mx_/.test(n)).sort(); }
async function cmdReference() {
  const names = mocapNames(), rows = [], failed = [];
  for (const [i, name] of names.entries()) {
    try {
      const d = clipDump(name, { fps: 30, force: !!flags.force });
      const M = prepare(d, optsFor(name, { reference: null })), E = energyOf(M), moves = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head'].filter(M.has).flatMap((p) => movesOf(M, p));
      const rep = measure(d, optsFor(name, { reference: null }));
      rows.push({ name, grade: catalogVerdicts()[name]?.grade, clean: d.clip !== name, ...signature(M, E, moves), arcBend: rep.features.arcBend, flatness: rep.features.flatness, coherence: rep.features.coherence, frozenFrac: rep.features.frozenFrac, deadFrac: rep.features.deadFrac, total: rep.total });
      if (!flags.quiet) console.error(`${i + 1}/${names.length} ${name}`);
    } catch (e) { failed.push(`${name}: ${e.message.split('\n')[0]}`); console.error(`${name}: ${e.message.split('\n')[0]}`); }
  }
  const stats = referenceStats(rows);
  write(REF, { about: 'Signature statistics of real human motion: every Mixamo mocap clip in the clip catalog, played the plain Unity way at 30 fps (call clipbones). Principle 12 measures a motion\'s robust z distance from these. Features on a log10 scale where they are rates (see measures.mjs xf).', when: new Date().toISOString(), count: rows.length, stats, rows, failed });
  console.log(`reference: ${rows.length} mocap clips${failed.length ? `, ${failed.length} failed` : ''} -> ${REF}`);
  for (const [k, s] of Object.entries(stats)) console.log(`  ${k.padEnd(16)} med ${r2(s.med)}  mad ${r2(s.mad)}  p05 ${r2(s.p05)}  p95 ${r2(s.p95)}`);
}

/** Agreement with the catalog grades, and the fixtures. */
async function cmdCalibrate() {
  const ref = reference(); if (!ref) throw new Error('no reference: critic.mjs reference first');
  const V = catalogVerdicts(), names = Object.keys(V).sort(), rows = [];
  for (const name of names) {
    try { const d = clipDump(name, { fps: 30 }); const rep = measure(d, optsFor(name)); rows.push({ name, grade: V[name].grade, total: rep.total, ...Object.fromEntries(Object.entries(rep.principles).map(([k, p]) => [k, p.na ? null : p.score])), features: rep.features }); }
    catch (e) { console.error(`${name}: ${e.message.split('\n')[0]}`); }
  }
  // the keyed hero poses as fixtures
  const keyed = fs.existsSync(path.join(ROOT, '..', 'Assets', 'MusicVideo', 'Motion', 'Keyed')) ? fs.readdirSync(path.join(ROOT, '..', 'Assets', 'MusicVideo', 'Motion', 'Keyed')).filter((f) => f.endsWith('.anim') && !/probe/.test(f)).map((f) => f.replace(/\.anim$/, '')) : [];
  const fixtures = [];
  for (const name of keyed) { try { const d = clipDump(name, { fps: 30 }); const rep = measure(d, optsFor(name)); fixtures.push({ name, total: rep.total, verdict: verdictOf(rep), low: Object.entries(rep.principles).filter(([, p]) => Number.isFinite(p.score)).sort((a, b) => a[1].score - b[1].score).slice(0, 3).map(([k, p]) => `${k} ${p.score}`) }); } catch (e) { console.error(`${name}: ${e.message.split('\n')[0]}`); } }
  const byGrade = {}; for (const r of rows) (byGrade[r.grade] ??= []).push(r.total);
  const order = { A: 3, B: 2, C: 1, ban: 0 }, xs = rows.map((r) => order[r.grade] ?? 1), ys = rows.map((r) => r.total);
  const spearman = rankCorr(xs, ys);
  const auc = (hi, lo) => { const H = rows.filter((r) => hi.includes(r.grade)).map((r) => r.total), Lo = rows.filter((r) => lo.includes(r.grade)).map((r) => r.total); let w = 0; for (const h of H) for (const l of Lo) w += h > l ? 1 : h === l ? 0.5 : 0; return H.length && Lo.length ? w / (H.length * Lo.length) : NaN; };
  const mocap = rows.filter((r) => /^mx_/.test(r.name)), gen = rows.filter((r) => /^gm_/.test(r.name));
  const perPrinciple = {}; for (const [k] of PRINCIPLES) { const a = rows.filter((r) => r.grade === 'A' && r[k] != null).map((r) => r[k]), c = rows.filter((r) => (r.grade === 'C' || r.grade === 'ban') && r[k] != null).map((r) => r[k]); perPrinciple[k] = { A: r2(mean(a)), C: r2(mean(c)), mocap: r2(mean(mocap.filter((r) => r[k] != null).map((r) => r[k]))), gen: r2(mean(gen.filter((r) => r[k] != null).map((r) => r[k]))) }; }
  const keyedHero = fixtures.filter((f) => /^hp_/.test(f.name)), aucMocapVsKeyed = (() => { let w = 0; for (const h of mocap) for (const l of keyedHero) w += h.total > l.total ? 1 : h.total === l.total ? 0.5 : 0; return mocap.length && keyedHero.length ? w / (mocap.length * keyedHero.length) : NaN; })();
  const out = { when: new Date().toISOString(), clips: rows.length, aucMocapVsKeyed: r2(aucMocapVsKeyed), keyedHeroMean: r2(mean(keyedHero.map((f) => f.total))), byGrade: Object.fromEntries(Object.entries(byGrade).map(([g, a]) => [g, { n: a.length, mean: r2(mean(a)), p25: r2(pct(a, 0.25)), median: r2(pct(a, 0.5)), p75: r2(pct(a, 0.75)) }])), spearman: r2(spearman), aucAvsC: r2(auc(['A'], ['C', 'ban'])), aucABvsC: r2(auc(['A', 'B'], ['C', 'ban'])), aucMocapVsGen: r2((() => { let w = 0; for (const h of mocap) for (const l of gen) w += h.total > l.total ? 1 : h.total === l.total ? 0.5 : 0; return mocap.length && gen.length ? w / (mocap.length * gen.length) : NaN; })()), mocap: { n: mocap.length, mean: r2(mean(mocap.map((r) => r.total))), p10: r2(pct(mocap.map((r) => r.total), 0.1)), min: r2(Math.min(...mocap.map((r) => r.total))), under8: mocap.filter((r) => r.total < 8).map((r) => `${r.name} ${r.total}`) }, generated: gen.map((r) => ({ name: r.name, grade: r.grade, total: r.total })), perPrinciple, fixtures, rows: rows.map(({ features, ...r }) => r) };
  write(path.join(LIB, 'calibration.json'), out);
  const L = [`# Motion critic calibration (${out.when.slice(0, 10)})`, '', `${rows.length} catalog clips against their hand-written A/B/C grades (the grades are about usefulness on his rig, so partial agreement is the ceiling), plus the keyed hero poses.`, '',
    '| grade | n | mean | p25 | median | p75 |', '|---|---|---|---|---|---|', ...Object.entries(out.byGrade).map(([g, s]) => `| ${g} | ${s.n} | ${s.mean} | ${s.p25} | ${s.median} | ${s.p75} |`), '',
    `Spearman grade vs total: **${out.spearman}**. AUC A over C/ban: **${out.aucAvsC}**; A+B over C/ban: ${out.aucABvsC}. Mocap over generated (gm_*): **${out.aucMocapVsGen}**. Mocap over the hand-keyed hero clips (hp_*, mean ${out.keyedHeroMean}): **${out.aucMocapVsKeyed}** (the separation that matters: real motion against typed joint numbers).`, '',
    `Mocap (mx_*, n ${out.mocap.n}): mean ${out.mocap.mean}, p10 ${out.mocap.p10}, min ${out.mocap.min}. Under 8: ${out.mocap.under8.join(', ') || 'none'}.`, '',
    '## Generated clips (Gen motion.from-text)', '', '| clip | grade | total |', '|---|---|---|', ...out.generated.map((g) => `| ${g.name} | ${g.grade} | ${g.total} |`), '',
    '## Per principle: mean score by group', '', '| principle | A | C/ban | mocap | generated |', '|---|---|---|---|---|', ...Object.entries(perPrinciple).map(([k, p]) => `| ${k} | ${p.A} | ${p.C} | ${p.mocap} | ${p.gen} |`), '',
    '## Keyed hero poses (fixtures)', '', '| clip | total | verdict | lowest |', '|---|---|---|---|', ...fixtures.map((f) => `| ${f.name} | ${f.total} | ${f.verdict} | ${f.low.join(', ')} |`), ''];
  write(path.join(LIB, 'calibration.md'), L.join('\n'));
  console.log(L.join('\n'));
}
function rankCorr(x, y) { const rank = (a) => { const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rr = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rr; i = j + 1; } return r; }; const rx = rank(x), ry = rank(y), mx = mean(rx), my = mean(ry); let num = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; } return num / Math.sqrt(dx * dy || 1); }

// ---------- vision ----------
const PRICES = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5] };
const VSCHEMA = { type: 'object', additionalProperties: false, required: ['weight', 'timing', 'human', 'wrong', 'fix'], properties: { weight: { type: 'number' }, timing: { type: 'number' }, human: { type: 'boolean' }, wrong: { type: 'string' }, fix: { type: 'string' } } };
async function cmdVision(mp4) {
  if (!mp4) throw new Error('vision <mp4> [--report critic.json --start <song s at file 0>]');
  const repFile = flags.report ?? guessReport(mp4); if (!repFile || !fs.existsSync(repFile)) throw new Error('no critic report: run critic.mjs cut first, or pass --report');
  const rep = read(repFile), start = +(flags.start ?? rep.from ?? 0), top = +(flags.top ?? 6), budget = +(flags.budget ?? 1), model = flags.model ?? 'claude-sonnet-5-5';
  const moments = rep.worst.slice(0, top), dir = path.join(path.dirname(repFile), 'vision'); fs.mkdirSync(dir, { recursive: true });
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-show_entries', 'format=duration', '-of', 'json', mp4]).toString()), dur = +probe.format.duration;
  const strips = [];
  for (const [i, w] of moments.entries()) {
    const fileT = (w.t ?? 0) - start; if (fileT < 0.2 || fileT > dur - 0.2) continue;
    const t0 = Math.max(0, fileT - 3.5 / 24), out = path.join(dir, `${String(i + 1).padStart(2, '0')}_${(w.t ?? 0).toFixed(2)}.jpg`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(t0), '-i', mp4, '-vf', `fps=24,scale=320:-2,drawtext=text='%{pts\\:hms}':fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6:x=4:y=4,tile=4x2`, '-frames:v', '1', '-q:v', '3', out], { stdio: 'ignore' });
    strips.push({ t: w.t, part: w.part, what: w.what, file: out });
  }
  if (!strips.length) throw new Error('no worst moment falls inside this file');
  const [pi, po] = PRICES[model] ?? PRICES['claude-sonnet-5-5'], perStrip = (1800 * pi + 220 * po) / 1e6, est = perStrip * strips.length;
  console.error(`vision: ${strips.length} strips to ${model}, about $${est.toFixed(3)} (budget $${budget})`);
  if (est > budget) throw new Error(`over budget: $${est.toFixed(2)} > $${budget}. --top fewer or --budget more`);
  if (flags['no-vision']) { console.log(JSON.stringify(strips, null, 1)); return; }
  const { HawkesGen } = await import('./mv/hawkesgen.mjs'); const gen = new HawkesGen({ project: 'tkshock' });
  let cost = 0;
  for (const s of strips) {
    const prompt = `You are an animator checking character motion on a stylized 3D music video. The image is 8 CONSECUTIVE frames at 24 fps (one 24th of a second apart), read left to right, top row then bottom, times burned in. A measurement flagged this moment: "${s.what}" (${s.part}).
Answer the fixed checklist from what the frames show, comparing each tile with its neighbours:
1. weight (0-10): does the body read as a real weighted human (mass, momentum, ease in and out, hips leading, follow-through)? 10 real, 0 a puppet or a slide.
2. timing (0-10): is the timing readable (a clear hold, a quick move, a settle) or constant-speed drift / a pose snapping?
3. human: true only if a viewer at speed would accept this as a person moving.
4. wrong: one sentence on what is wrong, or "nothing" if the frames look right.
5. fix: the smallest animation fix (one sentence), or "".`;
    let job; for (let tries = 0; ; tries++) { try { job = await gen.run('llm.json', { params: { prompt, model, effort: 'low', maxTokens: 500, schema: VSCHEMA }, inputs: { images: [s.file] }, labels: { critic: path.basename(repFile) } }); break; } catch (e) { if (tries >= 2) throw e; await new Promise((r) => setTimeout(r, 3000 * (tries + 1))); } }
    const r = job.result ?? {}, u = r.usage ?? {}, tin = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1, c = (tin * pi + (u.output_tokens ?? 0) * po) / 1e6; cost += c;
    Object.assign(s, r.value ?? {}, { model: r.model ?? model, cost: r2(c) });
    console.error(`${clockOf(s.t)} weight ${s.weight} timing ${s.timing} ${s.human ? 'human' : 'NOT human'}: ${s.wrong}`);
  }
  rep.vision = { model, cost: r2(cost), strips: strips.map(({ file, ...s }) => ({ ...s, strip: path.relative(path.dirname(repFile), file).replace(/\\/g, '/') })), weightMean: r2(mean(strips.map((s) => s.weight))), timingMean: r2(mean(strips.map((s) => s.timing))), humanFrac: r2(strips.filter((s) => s.human).length / strips.length) };
  write(repFile, rep); write(repFile.replace(/\.json$/, '.md'), markdown(rep, { title: rep.name }));
  console.log(`vision: weight ${rep.vision.weightMean}/10, timing ${rep.vision.timingMean}/10, ${Math.round(rep.vision.humanFrac * 100)}% read as human, $${rep.vision.cost}. ${repFile.replace(/\.json$/, '.md')}`);
}
function guessReport(mp4) { const d = path.dirname(mp4); for (const c of [path.join(d, 'critic'), path.join(d, '..', 'critic')]) if (fs.existsSync(c)) { const labels = fs.readdirSync(c).map((l) => path.join(c, l, 'report.json')).filter(fs.existsSync).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); if (labels[0]) return labels[0]; } return null; }

// ---------- self test ----------
function synth(kind) {
  const fps = 30, bones =['Hips', 'Spine', 'Chest', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand', 'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot'];
  const base = { Hips: [0, 0.95, 0], Spine: [0, 1.05, 0], Chest: [0, 1.2, 0], Neck: [0, 1.45, 0], Head: [0, 1.55, 0], LeftShoulder: [-0.1, 1.42, 0], RightShoulder: [0.1, 1.42, 0], LeftUpperArm: [-0.18, 1.4, 0], RightUpperArm: [0.18, 1.4, 0], LeftLowerArm: [-0.2, 1.12, 0], RightLowerArm: [0.2, 1.12, 0], LeftHand: [-0.22, 0.86, 0], RightHand: [0.22, 0.86, 0], LeftUpperLeg: [-0.1, 0.9, 0], RightUpperLeg: [0.1, 0.9, 0], LeftLowerLeg: [-0.1, 0.48, 0], RightLowerLeg: [0.1, 0.48, 0], LeftFoot: [-0.1, 0.05, 0], RightFoot: [0.1, 0.05, 0] };
  const ax = (a, deg) => { const s = Math.sin(deg / 2 / 180 * Math.PI); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(deg / 2 / 180 * Math.PI)]; };
  const frames = [];
  const n2 = 150;
  for (let f = 0; f < n2; f++) {
    const t = f / fps;
    // the right arm swings up 90 degrees between 0.8 and 1.4 s and back down between 2.6 and 3.2 s: eased with anticipation and overshoot (real) or linear in lockstep (bad)
    const seg = (a, b, dir) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); const eased = u <= 0 ? (t > a - 0.3 ? -0.08 * Math.sin(Math.PI * (t - (a - 0.3)) / 0.3) : 0) : u * u * (3 - 2 * u) + (u >= 1 ? 0.08 * Math.exp(-(t - b) * 7) * Math.sin((t - b) * 22) : 0); return kind === 'real' ? eased : u; };
    const k = t < 2 ? seg(0.8, 1.4) : 1 - seg(2.6, 3.2);
    const lag = kind === 'real' ? 0.06 : 0, kl = (() => { const tt = t - lag; const u = tt < 2 ? Math.max(0, Math.min(1, (tt - 0.8) / 0.6)) : 1 - Math.max(0, Math.min(1, (tt - 2.6) / 0.6)); return kind === 'real' ? u * u * (3 - 2 * u) : (t < 2 ? Math.max(0, Math.min(1, (t - 0.8) / 0.6)) : 1 - Math.max(0, Math.min(1, (t - 2.6) / 0.6))); })();
    const k2 = kl;
    const breath = kind === 'real' ? 1.5 * Math.sin(t * 2 * Math.PI / 3.6) : 0, sway = kind === 'real' ? 4 * k : 0;
    const q = {}; for (const b of bones) q[b] = [0, 0, 0, 1];
    q.RightUpperArm = ax([0, 0, 1], -90 * k); q.RightLowerArm = ax([0, 0, 1], -20 * k2); q.Chest = ax([1, 0, 0], breath + sway * 0.3); q.Spine = ax([0, 1, 0], sway); q.Head = ax([0, 1, 0], -sway * 0.5 + (kind === 'real' ? 0 : 20 * k));
    if (kind !== 'real') { q.LeftUpperArm = ax([0, 0, 1], 40 * k); }
    // positions: a tiny FK on the arm only, in the actor frame
    const p = {}; for (const b of bones) p[b] = [...base[b]];
    const ang = -90 * k / 180 * Math.PI, c = Math.cos(ang), s = Math.sin(ang), rot = (vec) => [vec[0] * c - vec[1] * s, vec[0] * s + vec[1] * c, vec[2]];
    const sh = base.RightUpperArm; p.RightLowerArm = [sh[0] + rot([0, -0.28, 0])[0], sh[1] + rot([0, -0.28, 0])[1], 0]; const el = p.RightLowerArm, ang2 = ang - 20 * k2 / 180 * Math.PI, c2 = Math.cos(ang2), s2 = Math.sin(ang2); p.RightHand = [el[0] + (-0.26) * -s2 * -1, el[1] + (-0.26) * c2, 0];
    p.RightHand = [el[0] - (-0.26) * s2, el[1] + (-0.26) * c2, 0];
    if (kind === 'real') { const bob = 0.004 * Math.sin(t * 2 * Math.PI / 3.6); for (const b of ['Hips', 'Spine', 'Chest', 'Neck', 'Head']) p[b][1] += bob; p.Head[2] += 0.02 * k; }
    else { const a3 = 40 * k / 180 * Math.PI, sh2 = base.LeftUpperArm; p.LeftLowerArm = [sh2[0] - Math.sin(a3) * 0.28, sh2[1] - Math.cos(a3) * 0.28, 0]; p.LeftHand = [p.LeftLowerArm[0] - Math.sin(a3) * 0.26, p.LeftLowerArm[1] - Math.cos(a3) * 0.26, 0]; p.Head[2] += 0.06 * k; }
    frames.push({ t, q: bones.map((b) => q[b]), p: bones.map((b) => p[b]), feet: [...p.LeftFoot, ...p.RightFoot], root: [0, 0, 0, 0, 0, 0, 1] });
  }
  return { clip: `synth_${kind}`, fps, bones, frames, rest: {}, curl: {} };
}
function cmdTest() {
  const real = measure(synth('real'), {}), bad = measure(synth('linear'), {});
  const line = (r) => `${r.name.padEnd(14)} total ${r.total}  ` + Object.entries(r.principles).filter(([, p]) => !p.na).map(([k, p]) => `${k} ${p.score}`).join('  ');
  console.log(line(real)); console.log(line(bad));
  const checks = [['ease', real.principles.ease.score > bad.principles.ease.score], ['anticipation', (real.principles.anticipation.score ?? 0) > (bad.principles.anticipation.score ?? 0)], ['overlap', (real.principles.overlap.score ?? 10) >= (bad.principles.overlap.score ?? 10)], ['timing (dead hold)', real.principles.timing.score > bad.principles.timing.score], ['stiffness', (real.principles.stiffness.na ? 10 : real.principles.stiffness.score) >= (bad.principles.stiffness.na ? 10 : bad.principles.stiffness.score)], ['total', real.total > bad.total]];
  let ok = true; for (const [k, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${k}`); ok &&= pass; }
  process.exit(ok ? 0 : 1);
}

// ---------- main ----------
const cmd = pos[0];
try {
  if (cmd === 'clip' || cmd === 'pose') await cmdClip(pos.slice(1));
  else if (cmd === 'cut') await cmdCut(pos[1], pos[2], pos[3]);
  else if (cmd === 'dump') await cmdDump(pos[1]);
  else if (cmd === 'twin') await cmdTwin(pos.slice(1));
  else if (cmd === 'rank') await cmdRank(pos[1], pos.slice(2));
  else if (cmd === 'reference') await cmdReference();
  else if (cmd === 'calibrate') await cmdCalibrate();
  else if (cmd === 'vision') await cmdVision(pos[1]);
  else if (cmd === 'test') cmdTest();
  else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).join('\n')); }
} catch (e) { console.error(String(e.message ?? e)); process.exitCode = 1; }
