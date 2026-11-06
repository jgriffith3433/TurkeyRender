// Proves scrubbing is timeline driven: reach the same moments going forward, then backward, and compare the pictures.
// A real mismatch (something depending on play order) shows up as a big difference. Film grain alone is a small one.
import { execFileSync as x } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const times = process.argv.slice(2).map(Number);
if (!times.length) times.push(30, 66.9, 80, 100, 127, 160, 175, 195);
const frame = (t) => JSON.parse(x('node', ['Director/mv.mjs', 'frame', `${t}s`, '--w', '480', '--h', '270'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString())[0];
const keep = (p, tag) => { const q = p.replace('.png', `_${tag}.png`); fs.copyFileSync(p, q); return q; };
const a = times.map((t) => keep(frame(t), 'a'));
const b = [...times].reverse().map((t) => keep(frame(t), 'b')).reverse();
let bad = 0;
times.forEach((t, i) => {
  const r = x('ffmpeg', ['-v', 'error', '-i', a[i], '-i', b[i], '-lavfi', 'psnr=stats_file=-', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const m = r.match(/psnr_avg:([0-9.]+|inf)/);
  const psnr = m ? (m[1] === 'inf' ? 99 : +m[1]) : 0;
  const ok = psnr > 30;
  if (!ok) bad++;
  console.log(`${String(t).padStart(6)}s  ${psnr.toFixed(1)} dB  ${ok ? 'same' : 'DIFFERENT'}`);
});
console.log(bad ? `${bad} moments depend on play order` : 'Every moment matches forward and backward');
