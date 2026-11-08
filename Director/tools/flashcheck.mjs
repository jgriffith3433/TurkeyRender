#!/usr/bin/env node
// Flash check: photosensitive-epilepsy safety on a rendered mp4, after Ofcom's broadcast guidance (the Harding test's rules).
//   node Director/tools/flashcheck.mjs <video.mp4> [--json out.json] [--max 3] [--quiet]
// A transition is a change between two frames of 20 cd/m2 or more, where the darker frame is under 160 cd/m2, over more than a quarter of the
// screen (luminance from sRGB on a 200 cd/m2 display). Steps the same way in a row are one transition (a fade). A flash is a pair of opposite
// transitions; more than 3 flashes in any one second fails, and so does any saturated red flash (red over 80% of the light, on a quarter of the
// screen). A cut is a transition too, as Harding counts it. Exit code 2 on a fail. mv final runs it on every finished file (tools/final.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const W = 160, H = 90;
const lin = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });

/** Checks `file`; returns { ok, fps, frames, flashes: [{t, n}], worst: {t, flashes}, red: [t], transitions: [{t, sign, area}] }. */
export function flashCheck(file, { max = 3 } = {}) {
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'json', file]).toString());
  const [a, b] = probe.streams[0].r_frame_rate.split('/').map(Number), fps = a / (b || 1);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area,format=rgb24`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  const P = W * H, N = Math.floor(raw.length / (P * 3));
  const L = new Float32Array(N * P), red = new Uint8Array(N * P);
  for (let i = 0; i < N * P; i++) {
    const r = raw[i * 3], g = raw[i * 3 + 1], bl = raw[i * 3 + 2];
    const R = lin[r], G = lin[g], B = lin[bl];
    L[i] = 200 * (.2126 * R + .7152 * G + .0722 * B);
    red[i] = R / (R + G + B + 1e-6) >= .8 && R > .05 ? 1 : 0;
  }
  // transitions between frame i-1 and i
  const steps = [];
  for (let i = 1; i < N; i++) {
    let up = 0, down = 0, redUp = 0, redDown = 0; const o = i * P, q = (i - 1) * P;
    for (let k = 0; k < P; k++) {
      const x = L[q + k], y = L[o + k], d = y - x;
      if (Math.abs(d) < 20 || Math.min(x, y) >= 160) continue;
      if (d > 0) { up++; if (red[o + k] || red[q + k]) redUp++; } else { down++; if (red[o + k] || red[q + k]) redDown++; }
    }
    const s = up > P / 4 ? 1 : down > P / 4 ? -1 : 0;
    if (s) steps.push({ frame: i, t: +(i / fps).toFixed(3), sign: s, area: +((s > 0 ? up : down) / P).toFixed(2), red: (s > 0 ? redUp : redDown) > P / 4 });
  }
  // a run of steps the same way (a fade over several frames) is one transition
  const tr = [];
  for (const s of steps) { const l = tr[tr.length - 1]; if (l && l.sign === s.sign && s.frame - l.last <= 2) { l.last = s.frame; l.red ||= s.red; continue; } tr.push({ ...s, last: s.frame }); }
  // flashes in every one-second window: pairs of opposite transitions
  let worst = { t: 0, flashes: 0 }; const over = [];
  for (let i = 0; i < tr.length; i++) {
    let n = 0; for (let j = i; j < tr.length && tr[j].frame - tr[i].frame < fps; j++) n++;
    const f = Math.floor(n / 2);
    if (f > worst.flashes) worst = { t: tr[i].t, flashes: f };
    if (f > max && !over.some((o) => Math.abs(o.t - tr[i].t) < 1)) over.push({ t: tr[i].t, flashes: f });
  }
  const redFlashes = [];
  for (let i = 1; i < tr.length; i++) if (tr[i].red && tr[i - 1].red && tr[i].sign !== tr[i - 1].sign && tr[i].frame - tr[i - 1].frame < fps) redFlashes.push(tr[i - 1].t);
  return { file, ok: over.length === 0 && redFlashes.length === 0, fps, frames: N, max, transitions: tr.map(({ t, sign, area, red }) => ({ t, sign, area, red })), worst, over, red: redFlashes };
}

export function describe(r) {
  const lines = [`flash check: ${path.basename(r.file)}, ${r.frames} frames at ${r.fps.toFixed(2)} fps, ${r.transitions.length} big luminance transitions, worst ${r.worst.flashes} flash${r.worst.flashes === 1 ? '' : 'es'} in a second at ${r.worst.t.toFixed(2)} s: ${r.ok ? 'PASS' : 'FAIL'} (limit ${r.max} a second, no saturated red flash)`];
  for (const o of r.over) lines.push(`  ${o.flashes} flashes in the second from ${o.t.toFixed(2)} s`);
  for (const t of r.red) lines.push(`  saturated red flash at ${t.toFixed(2)} s`);
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), file = args.find((x) => !x.startsWith('--') && args[args.indexOf(x) - 1] !== '--json' && args[args.indexOf(x) - 1] !== '--max');
  if (!file) { console.error('usage: node Director/tools/flashcheck.mjs <video.mp4> [--json out.json] [--max 3] [--quiet]'); process.exit(1); }
  const val = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
  const r = flashCheck(path.resolve(file), { max: +(val('max') ?? 3) });
  if (val('json')) fs.writeFileSync(val('json'), JSON.stringify(r, null, 1));
  console.log(describe(r));
  if (!args.includes('--quiet')) for (const t of r.transitions) console.log(`  ${t.t.toFixed(3)} s ${t.sign > 0 ? 'up  ' : 'down'} ${Math.round(t.area * 100)}%${t.red ? ' red' : ''}`);
  process.exit(r.ok ? 0 : 2);
}
