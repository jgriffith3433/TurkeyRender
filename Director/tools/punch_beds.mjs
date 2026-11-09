#!/usr/bin/env node
// Room tone for Hawkes Punch: one continuous bed per place, so the film is never near digital silence (J, 2026-11-08: "without taking all these
// shortcuts"; videos/hawkespunch/CLINIC-AD-AUDIT.md N3, N4, N9). It writes
//   Assets/MusicVideo/Sfx/punch/beds/<video>_<bed>.wav   each bed exactly as long as its stretch, looped with crossfades, set to its loudness
//   videos/<video>/acts/78-beds.json                      one sfx cue per bed (generated: never edit it; tools/mv/sound.mjs ducks every file under
//                                                         a `beds` folder 6 dB under each spoken line when the score has a `mix` block)
//   node Director/tools/punch_beds.mjs <video> [--dry] [--lines <scratch lines.json>]   (--lines is for checks: use it with --dry)
// No times live here. A bed's ends are anchors: a shot's start or end (cards.map.json), a spoken line's start or end (lines.json and the mp3's
// length), or the end of the film (song.json). So after `mv cards insert/remove` (which moves the act's times) run this again: the files and the act
// follow the new cut. Levels are integrated LUFS of the bed alone; dialogue sits at -16, so -40 to -46 is room tone you hear only in the gaps.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const name = process.argv[2], dry = process.argv.includes('--dry') || process.argv.includes('--lines');
if (!name) { console.error('usage: punch_beds.mjs <video> [--dry]'); process.exit(2); }
const DIR = path.join(ROOT, 'Director', 'videos', name), LINES_FILE = process.argv.includes('--lines') ? path.resolve(process.argv[process.argv.indexOf('--lines') + 1]) : path.join(DIR, 'lines.json'), SFX = 'Assets/MusicVideo/Sfx/punch', OUT = path.join(ROOT, SFX, 'beds');
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const map = json(path.join(DIR, 'cards.map.json')), song = json(path.join(DIR, 'song.json')), lines = json(LINES_FILE).lines;
const stderrOf = (args) => String(spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr ?? '');
const seconds = (f) => +String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout).trim();
const lufsOf = (f) => { const m = /I:\s*(-?[\d.]+) LUFS\s*\n\s*Threshold/.exec(stderrOf(['-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'])); return m ? +m[1] : null; };

// ---- the beds (sources are files under Sfx/punch; a layer's lufs is its own level in the bed) ----
const WAIT = [{ src: 'foley/wait_ac_hum.wav', lufs: -43 }, { src: 'foley/wait_clock_tick.wav', lufs: -47 }];
const EXAM = [{ src: 'clinic_hum.mp3', lufs: -41 }];
const STUDIO = [{ src: 'foley/studio_air_loop.wav', lufs: -41 }, { src: 'studio_tone.mp3', lufs: -50 }]; // steady air, the old tone's far crew under it
const VACUUM = [{ src: 'space_epic/space_vacuum_loop.wav', lufs: -42 }];
// Anchored on the approved board's shot ids (storyboard/shots.json, 53 shots, c01..b05; sound agent 2026-11-08). The r2 ids (s1_wide, p_glass,
// tv_fold, b_end...) are gone; mv refs <id> lists who else names a shot.
const BEDS = [
  { id: 'waiting', from: { shot: 'c01' }, to: { shot: 'c04', edge: 'end' }, layers: WAIT, note: 'reception: AC hum and the clock' },
  // the room falls away under her line and the held wind-up: from c21 down 8 dB by the hit (p02), so the silence before it is a choice (N8)
  { id: 'exam', from: { shot: 'c05' }, to: { shot: 'p03', edge: 'end' }, layers: EXAM, dips: [{ from: { shot: 'c21' }, to: { shot: 'p02' }, dB: -8 }], note: 'the exam room: fluorescent hum' },
  // the sound cut on the picture cut is the gag (N9): reception's own tone under the rattling ceiling
  { id: 'reception', from: { shot: 'p04' }, to: { shot: 'p04', edge: 'end' }, layers: WAIT, note: 'back at reception, calm' },
  { id: 'sky', from: { shot: 'p05' }, to: { shot: 'p05', edge: 'end' }, layers: [{ src: 'bed_sky.mp3', lufs: -33 }], fadeIn: 0.6, note: 'the climb through the clouds: wind, cut dead into space' },
  // space: a soft low vacuum bed, never silence, except the silence gag: from the instant the scream cuts dead at the ring plane (s01 +3.0) to "She's up here", a faint ring only
  { id: 'space_in', from: { shot: 'p05', edge: 'end' }, to: { line: 'lines4/him_scream_ring_cut.mp3', edge: 'end' }, layers: VACUUM, note: 'space: vacuum bed under the scream' },
  { id: 'space_ring', from: { line: 'lines4/him_scream_ring_cut.mp3', edge: 'end' }, to: { line: 'lines3/him_shes_up_here.mp3', off: -0.2 }, layers: [{ src: 'still_tone.mp3', lufs: -46 }], fadeIn: 0.01, fadeOut: 0.5, note: 'the silence gag: a faint ring' },
  { id: 'space', from: { line: 'lines3/him_shes_up_here.mp3', off: -0.2 }, to: { shot: 'a01' }, layers: VACUUM, fadeIn: 0.8, note: 'space: vacuum bed to the fold' },
  { id: 'studio', from: { shot: 'a01' }, to: { shot: 'a03' }, layers: STUDIO, note: 'the TV studio: air, a far crew' },
  { id: 'testimonial', from: { shot: 'a03' }, to: { shot: 'a03', edge: 'end' }, layers: [{ src: 'clinic_hum.mp3', lufs: -43 }, { src: 'foley/studio_air_loop.wav', lufs: -48 }], note: 'her testimonial, in the clinic' },
  { id: 'studio2', from: { shot: 'a04' }, to: { shot: 'a06', edge: 'end' }, layers: STUDIO, dips: [{ from: { shot: 'a05' }, to: { shot: 'a05', off: 0.4 }, dB: -4 }], note: 'the studio to the end card; under the safety read 4 dB down' },
  // the next day: the exam room again (the card THE NEXT DAY is over b01), hard cut to space on the second punch
  { id: 'exam2', from: { shot: 'b01' }, to: { shot: 'b02', edge: 'end' }, layers: EXAM, note: 'the next day: the exam room' },
  { id: 'space_button', from: { shot: 'b03' }, to: { shot: 'b04', edge: 'end' }, layers: VACUUM, note: 'the button in space' },
  { id: 'last', from: { shot: 'b05' }, to: { end: true }, layers: [{ src: 'clinic_hum.mp3', lufs: -48 }], fadeOut: 0.6, note: 'the can roll on the clinic floor, into black' },
];

// ---- anchors ----
// Every shot and line the beds name, checked up front with who names it, so a card taken out of the cut (p_glass, 2026-11-08) says so in one line.
{
  const missing = [];
  for (const b of BEDS) {
    const gone = [];
    for (const a of [b.from, b.to, ...(b.dips ?? []).flatMap((d) => [d.from, d.to])]) {
      if (a.shot && !map.some((x) => x.id === a.shot)) gone.push(`bed '${b.id}' anchors on shot '${a.shot}', which is not in the cut`);
      if (a.line && !lines.some((x) => x.file === a.line)) gone.push(`bed '${b.id}' anchors on line '${a.line}', which is not in lines.json`);
    }
    if (gone.length && b.optional) { console.error(`${b.id}: skipped (optional; ${gone[0].replace(/^bed '\w+' /, '')})`); b.skip = true; } else missing.push(...gone);
  }
  if (missing.length) { console.error(`punch_beds: ${missing.length} dangling anchor${missing.length === 1 ? '' : 's'}:\n  ${[...new Set(missing)].join('\n  ')}\nFix the BEDS table in this tool (an optional bed can be dropped), then run it again. mv refs <id> shows who else names it.`); process.exit(2); }
}
const shot = (id) => { const s = map.find((x) => x.id === id); if (!s) throw new Error(`no shot ${id} in cards.map.json`); return s; };
const lineLen = {};
function at(a) {
  let t;
  if (a.end) t = Math.max(...map.map((x) => x.tEnd)); // the cut's end (song.json kept the r2 length, 223.46 s)
  else if (a.shot) t = a.edge === 'end' ? shot(a.shot).tEnd : shot(a.shot).t;
  else if (a.line) {
    const l = lines.find((x) => x.file === a.line); if (!l) throw new Error(`no line ${a.line} in lines.json`);
    const f = path.join(ROOT, SFX, a.line); lineLen[a.line] ??= seconds(f);
    t = a.edge === 'end' ? l.start + lineLen[a.line] : l.start;
  } else throw new Error('an anchor needs shot, line or end: ' + JSON.stringify(a));
  return t + (a.off ?? 0);
}

// ---- making a bed ----
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
const xfade = 0.5;
/** A source looped to `len` seconds with 0.5 s crossfades at the seams, 44.1 kHz stereo, in a temp file. */
function looped(src, len) {
  const file = path.join(ROOT, SFX, src), d = seconds(file), n = Math.max(1, Math.ceil((len + xfade) / Math.max(0.1, d - xfade)) + 1);
  const out = path.join(os.tmpdir(), `bed_${path.basename(src)}_${len.toFixed(2)}.wav`);
  const ins = [], f = [];
  for (let i = 0; i < n; i++) ins.push('-i', file);
  let last = '[0:a]';
  for (let i = 1; i < n; i++) { f.push(`${last}[${i}:a]acrossfade=d=${Math.min(xfade, d / 3).toFixed(3)}:c1=qsin:c2=qsin[x${i}]`); last = `[x${i}]`; }
  f.push(`${last}aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${len.toFixed(4)},asetpts=PTS-STARTPTS[o]`);
  ff(...ins, '-filter_complex', f.join(';'), '-map', '[o]', '-c:a', 'pcm_s16le', out);
  return out;
}

if (!dry) fs.mkdirSync(OUT, { recursive: true });
const cues = [], report = [];
for (const b of BEDS) {
  if (b.skip) continue;
  const t0 = at(b.from), t1 = at(b.to), len = t1 - t0;
  if (!(len > 0.05)) { report.push(`${b.id}: skipped, ${t0.toFixed(3)}-${t1.toFixed(3)} is empty`); continue; }
  const file = `${name}_${b.id}.wav`, rel = `${SFX}/beds/${file}`;
  report.push(`${b.id.padEnd(13)} ${t0.toFixed(3).padStart(8)}-${t1.toFixed(3).padStart(8)} ${len.toFixed(2).padStart(6)} s  ${b.layers.map((l) => `${l.src}@${l.lufs}`).join(' + ')}  ${b.note ?? ''}`);
  cues.push({ at: `${t0.toFixed(3)}s`, sfx: rel, volume: 1, note: `bed ${b.id}: ${b.note ?? ''}` });
  if (dry) continue;
  const parts = b.layers.map((l) => { const f = looped(l.src, len), L = lufsOf(f) ?? -30; return { f, g: l.lufs - L }; });
  const ins = parts.flatMap((p) => ['-i', p.f]), fi = b.fadeIn ?? 0.03, fo = b.fadeOut ?? 0.03;
  // dips: a gain ramp that reaches dB at the dip's `to`, eased in from its `from`, and holds to the bed's end
  const dipExpr = (b.dips ?? []).map((d) => { const a = (at(d.from) - t0).toFixed(3), z = (at(d.to) - t0).toFixed(3), g = Math.pow(10, d.dB / 20).toFixed(4); return `(1-(1-${g})*min(1\\,max(0\\,(t-${a})/max(0.01\\,${z}-${a}))))`; }).join('*');
  const graph = parts.map((p, i) => `[${i}:a]volume=${p.g.toFixed(2)}dB[p${i}]`).join(';') + ';' + parts.map((_, i) => `[p${i}]`).join('') +
    `amix=inputs=${parts.length}:normalize=0:duration=first${dipExpr ? `,volume='${dipExpr}':eval=frame` : ''},afade=t=in:d=${fi},afade=t=out:st=${Math.max(0, len - fo).toFixed(4)}:d=${fo}[o]`;
  ff(...ins, '-filter_complex', graph, '-map', '[o]', '-c:a', 'pcm_s16le', path.join(OUT, file));
  for (const p of parts) try { fs.unlinkSync(p.f); } catch {}
}
// never digital silence: every second of the cut under some bed (overlaps are fine)
{
  const spans = cues.map((c) => { const b = BEDS.find((x) => c.note.startsWith(`bed ${x.id}:`)); return [at(b.from), at(b.to), b.id]; }).sort((p, q) => p[0] - q[0]);
  let reach = 0, prev = 'the start';
  for (const [a, z, id] of spans) { if (a > reach + 0.02) report.push(`!! GAP ${reach.toFixed(3)}-${a.toFixed(3)} (${(a - reach).toFixed(2)} s) between ${prev} and ${id}: no bed`); if (z > reach) { reach = z; prev = id; } }
  const end = Math.max(...map.map((x) => x.tEnd)); if (reach < end - 0.02) report.push(`!! GAP ${reach.toFixed(3)}-${end.toFixed(3)} at the end: no bed`);
}
const head = `// GENERATED by Director/tools/punch_beds.mjs: room-tone beds, one per place, from shot and line anchors. Change the tool, not this; run it again after a clock change.\n`;
const act = head + '{\n "cues": [\n' + cues.map((c) => '  ' + JSON.stringify(c)).join(',\n') + '\n ]\n}\n';
if (!dry) {
  const { warnIfLeased } = await import('./mv/lease.mjs'), { register } = await import('./mv/generated.mjs');
  warnIfLeased(path.join(DIR, 'acts', '78-beds.json'));
  fs.writeFileSync(path.join(DIR, 'acts', '78-beds.json'), act);
  // generated.json: the beds follow the cut (cards.map.json), the lines and their mp3s, and the sources (tools/mv/generated.mjs)
  const srcs = [...new Set(BEDS.flatMap((b) => b.layers.map((l) => `${SFX}/${l.src}`)))], lineFiles = [...new Set(BEDS.flatMap((b) => [b.from, b.to]).filter((a) => a.line).map((a) => `${SFX}/${a.line}`))];
  register(DIR, 'acts/78-beds.json', { tool: `node Director/tools/punch_beds.mjs ${name}`, inputs: ['cards.map.json', 'lines.json', ...lineFiles, ...srcs], gate: 'stop' });
}
console.log(report.join('\n'));
console.log(dry ? '(dry: nothing written)' : `wrote ${cues.length} beds to ${SFX}/beds and acts/78-beds.json`);
