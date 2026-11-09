#!/usr/bin/env node
// Splits a long voice take into per-shot pieces so each line can land on its own cut (sound agent, 2026-11-08, board clock).
// The take itself is never changed: each piece is a new file beside it, <take>_p<n>.mp3, cut at the take's own pauses
// (ffmpeg silencedetect at -40 dB, 60 ms: the times below), with 8 ms fades so a cut never clicks.
// Each piece also carries the caption phrases inside it (seconds from the piece's start): tools/punch_sound.mjs reads them from lines.json `text`.
//   node Director/tools/punch_split.mjs [--dry]
// After a run: add the pieces to videos/hawkespunch/lines.json and place them in tools/board2cards.mjs LINES.
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SFX = path.join(ROOT, 'Assets', 'MusicVideo', 'Sfx', 'punch');
const dry = process.argv.includes('--dry');

// [from, to] in the take's seconds: 30 ms before the first word, about 80 ms after the last.
export const SPLITS = {
  'symptoms/him_symptoms_v3.mp3': [   // 18.81 s, the overshare (board c07-c12)
    [0.067, 5.47],    // p1 c07: Okay. So. I can't stop listening to music. Like, ever. In the shower. In my sleep.
    [5.54, 9.97],     // p2 c08: I tried silence once, and it was just... more music.
    [10.221, 12.76],  // p3 c09: And, um. I'm in love. With a ghost.
    [12.825, 13.75],  // p4 c10: In space.
    [14.45, 18.75],   // p5 c12: She doesn't have a face. But she has, like... a vibe.
  ],
  'doctor_line_a.mp3': [               // 9.79 s, her line before the punch (board c21)
    [0.0, 0.76],      // p1: Don't worry.
    [1.332, 4.2],     // p2: It's only just a healthy amount of people in the world.
    [4.886, 6.06],    // p3: You are just one of them.
    [6.751, 9.79],    // p4: So shut up, and swallow the damn Hawkes Punch.
  ],
};

const seconds = (f) => +String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout).trim();
for (const [take, cuts] of Object.entries(SPLITS)) {
  const src = path.join(SFX, take);
  cuts.forEach(([a, b], i) => {
    const out = src.replace(/\.mp3$/, `_p${i + 1}.mp3`), len = b - a;
    if (!dry) execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-ss', a.toFixed(3), '-t', len.toFixed(3), '-af', `afade=t=in:d=0.008,afade=t=out:st=${(len - 0.008).toFixed(3)}:d=0.008`, '-c:a', 'libmp3lame', '-q:a', '2', out]);
    console.log(`${path.relative(SFX, out).replace(/\\/g, '/')}  ${a.toFixed(3)}-${b.toFixed(3)}  ${dry ? len.toFixed(3) : seconds(out).toFixed(3)} s`);
  });
}
