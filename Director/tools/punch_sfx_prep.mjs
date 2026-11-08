#!/usr/bin/env node
// Hawkes Punch's foley, punch and space sounds, made once from the raw Hawkes Gen takes (audio.sfx, ElevenLabs, project tkshock, 2026-11-08) in
// Assets/MusicVideo/Sfx/punch/_gen_raw/<name>/ into named, trimmed, peak-set files:
//   Sfx/punch/foley/<name>.wav       clinic and ad foley, the punch layers and the layered hits
//   Sfx/punch/space_epic/<name>.wav  the space impacts (cue list: videos/hawkespunch/SPACE-EPIC.md "Sound")
//   node Director/tools/punch_sfx_prep.mjs [--list]
// No times live here: where each sound plays is in the acts (acts/82-foley.json) and the bed tool (tools/punch_beds.mjs).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SFX = path.join(ROOT, 'Assets', 'MusicVideo', 'Sfx', 'punch'), RAW = path.join(SFX, '_gen_raw');
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
const rawOf = (n) => { const d = path.join(RAW, n); const f = fs.readdirSync(d).find((x) => /\.(mp3|wav)$/.test(x)); if (!f) throw new Error(`no raw take in ${d}`); return path.join(d, f); };

// name: [raw take, folder, peak dBFS, extra filter, max seconds]. Trim: leading silence under -45 dB off, a 2 ms fade in, a fade out over the last 12%.
const ONE = {
  wait_clock_tick:        ['clock_tick', 'foley', -6, 'highpass=f=180', 10],
  wait_ac_hum:            ['ac_hum', 'foley', -6, 'lowpass=f=6000', 6],
  wait_phone_muffled:     ['phone_muffled', 'foley', -3, 'lowpass=f=2400', 3],
  turkey_keyboard_peck:   ['keyboard_peck', 'foley', -3, '', 3],
  turkey_cluck:           ['turkey_cluck', 'foley', -3, '', 2],
  clinic_footsteps:       ['footsteps', 'foley', -3, 'highpass=f=60', 3],
  doctor_stool_squeak:    ['stool_squeak', 'foley', -3, '', 1.5],
  patient_bed_creak:      ['bed_paper', 'foley', -3, 'highpass=f=60', 2],
  doctor_coat_rustle:     ['cloth_rustle', 'foley', -3, 'highpass=f=120', 1],
  doctor_glasses_fold:    ['glasses_fold', 'foley', -3, '', 1.5],
  can_catch_palm:         ['can_catch', 'foley', -3, '', 1],
  ad_audience_chuckle:    ['audience_chuckle', 'foley', -3, '', 2.5],
  ad_audience_ooh:        ['audience_ooh', 'foley', -3, '', 2],
  punch_charge_breath:    ['punch_charge', 'foley', -2, '', 1.5],
  punch_swish:            ['punch_swish', 'foley', -2, 'highpass=f=150', 0.6],
  punch_thump_low:        ['punch_thump', 'foley', -2, 'lowpass=f=900,equalizer=f=60:t=q:w=1:g=4', 1.2],
  punch_crack_high:       ['punch_crack2', 'foley', -2, 'highpass=f=700', 0.5],
  punch_whoosh_tail:      ['punch_tail', 'foley', -2, '', 1.5],
  punch_ceiling_crash:    ['ceiling_crash', 'foley', -1.5, '', 2.5],
  punch_debris_rain:      ['debris_rain', 'foley', -3, '', 3],
  space_vacuum_loop:      ['space_vacuum', 'space_epic', -6, 'lowpass=f=900', 8],
  studio_air_loop:        ['studio_air', 'foley', -6, 'highpass=f=40', 8],
  space_rumble_low:       ['space_rumble', 'space_epic', -1.5, 'lowpass=f=400', 3],
  space_ice_crash:        ['space_ice_crash', 'space_epic', -1.5, '', 3],
  space_crater_boom:      ['space_crater', 'space_epic', -1.5, '', 4],
  space_jupiter_catch:    ['space_catch', 'space_epic', -1.5, '', 4],
  space_lasso_whirl:      ['space_lasso', 'space_epic', -2, '', 3],
  space_ring_shear:       ['space_ring_shear', 'space_epic', -2, '', 3],
  space_pressure_whoomp:  ['space_whoomp', 'space_epic', -2, 'lowpass=f=1200', 1.5],
  space_pebble_tick:      ['space_pebble', 'space_epic', -6, '', 0.5],
  space_soft_pat:         ['space_pat', 'space_epic', -4, '', 0.5],
};

if (process.argv.includes('--list')) { for (const [k, v] of Object.entries(ONE)) console.log(`${v[1]}/${k}.wav  <- _gen_raw/${v[0]}`); process.exit(0); }

const stderrOf = (cmd, args) => String(spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr ?? '');
function maxVolume(f) { const m = /max_volume:\s*(-?[\d.]+) dB/.exec(stderrOf('ffmpeg', ['-nostats', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'])); return m ? +m[1] : 0; }
const dur = (f) => { const all = [...stderrOf('ffmpeg', ['-i', f, '-f', 'null', '-']).matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop(); return all ? +all[1] * 3600 + +all[2] * 60 + +all[3] : NaN; };

/** One file: trim, filter, fade, then gain so the sample peak sits at `peak` dBFS. 44.1 kHz stereo 16-bit wav. */
function make(name, src, folder, peak, extra, max, { trim = true } = {}) {
  // temp files go to the OS temp folder, never under Assets (Unity would import them)
  const out = path.join(SFX, folder, name + '.wav'), tmp = path.join(os.tmpdir(), 'punch_sfx_' + name + '.wav');
  const pre = -maxVolume(src); // the raw take to a 0 dBFS peak first, so the silence threshold is relative to the sound
  const chain = [`volume=${pre.toFixed(2)}dB`, trim ? 'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.004' : null, extra || null, `atrim=0:${max}`, 'asetpts=PTS-STARTPTS', 'afade=t=in:d=0.002'].filter(Boolean).join(',');
  ff('-i', src, '-af', chain, '-ar', '44100', '-ac', '2', tmp);
  const d = dur(tmp), fo = Math.max(0.02, d * 0.12);
  if (!(d > 0)) throw new Error(`${name}: nothing left after trimming ${src}`);
  const g = peak - maxVolume(tmp);
  ff('-i', tmp, '-af', `afade=t=out:st=${(d - fo).toFixed(3)}:d=${fo.toFixed(3)},volume=${g.toFixed(2)}dB`, '-c:a', 'pcm_s16le', out);
  fs.unlinkSync(tmp);
  return out;
}

for (const [name, [raw, folder, peak, extra, max]] of Object.entries(ONE)) { make(name, rawOf(raw), folder, peak, extra, max); }

// Reused sounds cut to the beat they serve (no spend): short pen bursts so her writing can stop on a word, and a short paper rustle.
const REUSE = {
  pen_scratch_burst:  ['pen_scratch.mp3', 'foley', -4, 'highpass=f=250', 0.45],
  pen_scratch_stroke: ['pen_scratch.mp3', 'foley', -4, 'highpass=f=250', 1.4],
  paper_rustle_short: ['paper_crinkle_2.mp3', 'foley', -4, 'highpass=f=150', 0.8],
  can_roll_floor:     ['can_roll.mp3', 'foley', -3, '', 2.1],
};
for (const [name, [src, folder, peak, extra, max]] of Object.entries(REUSE)) make(name, path.join(SFX, src), folder, peak, extra, max);

// The layered hit (research 3, rule 11): a low body thump (40-80 Hz), a mid-high crack and a whoosh tail, onsets aligned at 0 (each file starts on
// its transient), so the cue's time is the contact frame. True-peak limited at -1.3 dBFS here; the master limiter sits at -1 dBTP on top.
function layered(name, layers, seconds) {
  const out = path.join(SFX, 'foley', name + '.wav'), ins = [], parts = [];
  layers.forEach(([f, dB, delayMs], i) => { ins.push('-i', path.join(SFX, 'foley', f + '.wav')); parts.push(`[${i}:a]adelay=${delayMs}|${delayMs},volume=${dB}dB[l${i}]`); });
  const mixIn = layers.map((_, i) => `[l${i}]`).join('');
  ff(...ins, '-filter_complex', `${parts.join(';')};${mixIn}amix=inputs=${layers.length}:normalize=0:duration=longest,atrim=0:${seconds},aresample=176400,alimiter=limit=${Math.pow(10, -1.6 / 20).toFixed(4)}:attack=0.5:release=40:level=disabled,aresample=44100,afade=t=out:st=${(seconds - 0.25).toFixed(2)}:d=0.25[a]`, '-map', '[a]', '-c:a', 'pcm_s16le', out);
  return out;
}
// clinic: the first hit of the film. thump full, crack 2 dB under, the tail 30 ms after contact and 7 dB under.
layered('punch_hit_layered', [['punch_thump_low', 0, 0], ['punch_crack_high', -2, 0], ['punch_whoosh_tail', -7, 30]], 1.6);
// the next-day button: the same hit, the crack forward (it is a cut on the hit, so the crack carries it), no tail (the cut to space takes over).
layered('punch2_hit_layered', [['punch_thump_low', -1, 0], ['punch_crack_high', 0, 0]], 1.2);

// The launch yelp: his scream's first 1.3 s (lines4/him_scream_long.mp3), pulled away as he rockets up: high-passed and faded to nothing.
{
  const out = path.join(SFX, 'foley', 'punch_launch_yelp.wav');
  ff('-i', path.join(SFX, 'lines4', 'him_scream_long.mp3'), '-af', 'silenceremove=start_periods=1:start_threshold=-40dB,atrim=0:1.3,asetpts=PTS-STARTPTS,highpass=f=300,afade=t=in:d=0.01,afade=t=out:st=0.25:d=1.05,volume=9dB', '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', out);
}
console.log('made', Object.keys(ONE).length + 3, 'files in Sfx/punch/foley and Sfx/punch/space_epic');
