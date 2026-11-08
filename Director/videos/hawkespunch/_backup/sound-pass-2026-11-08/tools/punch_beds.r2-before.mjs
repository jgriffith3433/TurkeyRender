#!/usr/bin/env node
// Room tone for Hawkes Punch: one continuous bed per place, so the film is never near digital silence (J, 2026-11-08: "without taking all these
// shortcuts"; videos/hawkespunch/CLINIC-AD-AUDIT.md N3, N4, N9). It writes
//   Assets/MusicVideo/Sfx/punch/beds/<video>_<bed>.wav   each bed exactly as long as its stretch, looped with crossfades, set to its loudness
//   videos/<video>/acts/78-beds.json                      one sfx cue per bed (generated: never edit it; tools/mv/sound.mjs ducks every file under
//                                                         a `beds` folder 6 dB under each spoken line when the score has a `mix` block)
//   node Director/tools/punch_beds.mjs <video> [--dry]
// No times live here. A bed's ends are anchors: a shot's start or end (cards.map.json), a spoken line's start or end (lines.json and the mp3's
// length), or the end of the film (song.json). So after `mv cards insert/remove` (which moves the act's times) run this again: the files and the act
// follow the new cut. Levels are integrated LUFS of the bed alone; dialogue sits at -16, so -40 to -46 is room tone you hear only in the gaps.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const name = process.argv[2], dry = process.argv.includes('--dry');
if (!name) { console.error('usage: punch_beds.mjs <video> [--dry]'); process.exit(2); }
const DIR = path.join(ROOT, 'Director', 'videos', name), SFX = 'Assets/MusicVideo/Sfx/punch', OUT = path.join(ROOT, SFX, 'beds');
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const map = json(path.join(DIR, 'cards.map.json')), song = json(path.join(DIR, 'song.json')), lines = json(path.join(DIR, 'lines.json')).lines;
const stderrOf = (args) => String(spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr ?? '');
const seconds = (f) => +String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout).trim();
const lufsOf = (f) => { const m = /I:\s*(-?[\d.]+) LUFS\s*\n\s*Threshold/.exec(stderrOf(['-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'])); return m ? +m[1] : null; };

// ---- the beds (sources are files under Sfx/punch; a layer's lufs is its own level in the bed) ----
const WAIT = [{ src: 'foley/wait_ac_hum.wav', lufs: -43 }, { src: 'foley/wait_clock_tick.wav', lufs: -47 }];
const EXAM = [{ src: 'clinic_hum.mp3', lufs: -41 }];
const STUDIO = [{ src: 'foley/studio_air_loop.wav', lufs: -41 }, { src: 'studio_tone.mp3', lufs: -50 }]; // steady air, the old tone's far crew under it
const VACUUM = [{ src: 'space_epic/space_vacuum_loop.wav', lufs: -42 }];
const BEDS = [
  { id: 'waiting', from: { shot: 's1_wide' }, to: { shot: 's1_gobble', edge: 'end' }, layers: WAIT, note: 'reception: AC hum and the clock' },
  // the room falls away under the build: from l_mouth (his last line) down 8 dB by the wind-up, so the silence before the hit is a choice (N8)
  { id: 'exam', from: { shot: 'sym_ask' }, to: { shot: 'p_face', edge: 'end' }, layers: EXAM, dips: [{ from: { shot: 'l_mouth' }, to: { shot: 'p_hit' }, dB: -8 }], note: 'the exam room: fluorescent hum' },
  // p_glass (the outside shot) was cut in clinic r2, so no outside bed: { id: 'outside', from: { shot: 'p_glass' }, to: { shot: 'p_glass', edge: 'end' }, layers: [{ src: 'sky_wind.mp3', lufs: -36 }], note: 'outside the clinic: wind' },
  // the sound cut on the picture cut is the gag (N9): reception's own tone, not the sky's
  { id: 'reception', from: { shot: 'p_turkey' }, to: { shot: 'p_turkey', edge: 'end' }, layers: WAIT, note: 'back at reception, calm' },
  { id: 'sky', from: { shot: 'p_travel' }, to: { shot: 'p_travel', edge: 'end' }, layers: [{ src: 'bed_sky.mp3', lufs: -33 }], fadeIn: 0.6, note: 'the climb: wind, cut dead into space' },
  // space: a soft low vacuum bed, never silence, except the silence gag: from the instant the scream cuts dead at the ring plane to "She's up here", a faint ring only
  { id: 'space_in', from: { shot: 'p_travel', edge: 'end' }, to: { line: 'lines4/him_scream_ring_cut.mp3', edge: 'end' }, layers: VACUUM, note: 'space: vacuum bed under the scream' },
  { id: 'space_ring', from: { line: 'lines4/him_scream_ring_cut.mp3', edge: 'end' }, to: { line: 'lines3/him_shes_up_here.mp3', off: -0.2 }, layers: [{ src: 'still_tone.mp3', lufs: -46 }], fadeIn: 0.01, fadeOut: 0.5, note: 'the silence gag: a faint ring' },
  { id: 'space', from: { line: 'lines3/him_shes_up_here.mp3', off: -0.2 }, to: { shot: 'tv_fold' }, layers: VACUUM, fadeIn: 0.8, note: 'space: vacuum bed to the fold' },
  { id: 'studio', from: { shot: 'tv_fold' }, to: { shot: 'tv_doc' }, layers: STUDIO, note: 'the TV studio: air, a far crew' },
  { id: 'testimonial', from: { shot: 'tv_doc' }, to: { shot: 'tv_doc', edge: 'end' }, layers: [{ src: 'clinic_hum.mp3', lufs: -43 }, { src: 'foley/studio_air_loop.wav', lufs: -48 }], note: 'her testimonial, in the clinic' },
  { id: 'studio2', from: { shot: 'tv_both' }, to: { shot: 'tv_end', edge: 'end' }, layers: STUDIO, dips: [{ from: { shot: 'tv_card' }, to: { shot: 'tv_card', off: 0.4 }, dB: -4 }], note: 'the studio to the end card; under the safety read 4 dB down' },
  // the next day: reception's tone comes in under THE NEXT DAY card (a pre-lap), so the card isn't dead air
  { id: 'waiting2', from: { shot: 'b_next' }, to: { shot: 'b_turkey', edge: 'end' }, layers: WAIT, note: 'the next day: reception' },
  { id: 'exam2', from: { shot: 'b_room' }, to: { shot: 'b_him', edge: 'end' }, layers: EXAM, note: 'the next day: the exam room' },
  { id: 'space_button', from: { shot: 'b_him', edge: 'end' }, to: { shot: 'b_end' }, layers: VACUUM, note: 'the button in space' },
  { id: 'endcard', from: { shot: 'b_end' }, to: { shot: 'b_end', edge: 'end' }, layers: [{ src: 'foley/studio_air_loop.wav', lufs: -45 }], note: 'the end card: the ad register' },
  { id: 'last', from: { shot: 'b_end', edge: 'end' }, to: { end: true }, layers: [{ src: 'clinic_hum.mp3', lufs: -48 }], fadeOut: 0.6, note: 'the can roll on the clinic floor, into black' },
];

// ---- anchors ----
const shot = (id) => { const s = map.find((x) => x.id === id); if (!s) throw new Error(`no shot ${id} in cards.map.json`); return s; };
const lineLen = {};
function at(a) {
  let t;
  if (a.end) t = song.duration;
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
const head = `// GENERATED by Director/tools/punch_beds.mjs: room-tone beds, one per place, from shot and line anchors. Change the tool, not this; run it again after a clock change.\n`;
const act = head + '{\n "cues": [\n' + cues.map((c) => '  ' + JSON.stringify(c)).join(',\n') + '\n ]\n}\n';
if (!dry) fs.writeFileSync(path.join(DIR, 'acts', '78-beds.json'), act);
console.log(report.join('\n'));
console.log(dry ? '(dry: nothing written)' : `wrote ${cues.length} beds to ${SFX}/beds and acts/78-beds.json`);
