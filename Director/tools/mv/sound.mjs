// The sound of a render, mixed once: the song and every sfx in `sfx-map.json` over a stretch of the video, as Transport.cs does for a single render.
// tools/final.mjs mixes the whole video with it; `mv shot` mixes its own stretch and muxes in Node, without ffmpeg's -shortest, so a shot keeps its last frames.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT } from './score.mjs';

const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// Integrated loudness (LUFS) of a sound file, measured once with ffmpeg's ebur128 and kept by path, size and time in Director/gen/loudness-cache.json.
const CACHE = path.join(PROJECT, 'Director', 'gen', 'loudness-cache.json');
let cache = null;
export function loudnessOf(file) {
  cache ??= read(CACHE, {});
  const st = fs.statSync(file), key = `${st.size}:${Math.round(st.mtimeMs)}`, hit = cache[file];
  if (hit && hit.key === key) return hit.lufs;
  // ffmpeg writes the summary on stderr
  const out = String(spawnSync('ffmpeg', ['-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr ?? '');
  const m = /Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf)\s*LUFS/.exec(out);
  const lufs = m && m[1] !== '-inf' ? +m[1] : null;
  cache[file] = { key, lufs };
  try { fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); } catch {}
  return lufs;
}

/** Writes `wav` with the song and sfx from `from` to `to` (video seconds). `ffmpeg(...args)` runs ffmpeg and throws on failure.
 *  A score's optional `mix` block (Hawkes Punch, 2026-11-08) makes it a finished mix, not a sum:
 *    "mix": { "dialogue": -16, "bedDuck": -6, "bedFade": 0.25, "truePeak": -1, "master": 0 }
 *  - dialogue: every spoken line (an sfx that starts a duck.json range) is set to this integrated loudness (LUFS), whatever its cue volume;
 *  - bedDuck: every bed (a file under a `beds` folder) drops this many dB under every line, easing over bedFade seconds;
 *  - master: dB on the whole mix, then a true-peak limiter (4x oversampled) at truePeak dBTP, so nothing clips.
 *  Without `mix` the mix is the plain sum it always was. */
export async function mixSound(V, score, { from = 0, to, wav, ffmpeg }) {
  const seconds = (to - from).toFixed(6), song = path.join(PROJECT, score.song);
  const sfx = read(path.join(V.dir, 'sfx-map.json'), []).filter((x) => x.t >= from && x.t <= to);
  const inputs = ['-ss', from.toFixed(6), '-t', seconds, '-i', song];
  // Ducking: videos/<v>/duck.json is a list of {from, to, gain, fade} in video seconds; the song drops to `gain` under each (a spoken line), easing over `fade`.
  const allDucks = read(path.join(V.dir, 'duck.json'), []);
  const ducks = allDucks.filter((d) => d.to >= from && d.from <= to);
  const duckWith = (gainOf, fadeOf) => ducks.length ? ducks.map((d) => { const f = fadeOf(d), a = (d.from - from).toFixed(3), b = (d.to - from).toFixed(3), g = (1 - gainOf(d)).toFixed(3); return `(1-${g}*min(1\\,max(0\\,(t-(${a}-${f}))/${f}))*min(1\\,max(0\\,((${b}+${f})-t)/${f})))`; }).join('*') : null;
  const duckExpr = duckWith((d) => d.gain ?? .4, (d) => d.fade ?? .3);
  const mix = score.mix ?? null;
  const bedExpr = mix ? duckWith(() => Math.pow(10, (mix.bedDuck ?? -6) / 20), () => mix.bedFade ?? .25) : null;
  const isBed = (p) => /[\\/]beds[\\/]/i.test(p);
  const isLine = (x) => !isBed(x.path) && allDucks.some((d) => Math.abs(d.from - x.t) < .02);
  // `"music": 0` in the score (or any level) takes the song out of the mix while song.json still drives every time: the spoken lines and sfx carry the sound.
  const music = score.music ?? 1;
  let filter = `[0:a]aformat=sample_rates=44100:channel_layouts=stereo${music !== 1 ? `,volume=${music}` : ''}${duckExpr ? `,volume='${duckExpr}':eval=frame` : ''}[m];\n`, labels = '[m]', n = 0;
  sfx.forEach((x) => {
    inputs.push('-i', x.path);
    const ms = Math.round((x.t - from) * 1000);
    let vol = x.volume, extra = '';
    if (mix && mix.dialogue != null && isLine(x)) {
      const l = loudnessOf(x.path);
      if (l != null) vol = Math.pow(10, Math.max(-12, Math.min(12, mix.dialogue - l)) / 20);
    }
    // after adelay the bed's own clock is the mix's (the delay is padding from 0), so the ducks apply as written
    if (bedExpr && isBed(x.path)) extra = `,volume='${bedExpr}':eval=frame`;
    filter += `[${n + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${vol.toFixed(5)}${extra}[s${n}];\n`;
    labels += `[s${n}]`; n++;
  });
  const script = wav + '.filter.txt';
  // Silence before a hit (the epic toolkit's `silence`, written by the compiler to videos/<v>/silence.json): the whole mix, song, lines and sfx, falls to
  // nothing over 8 ms at `from` and is back at `to`, the hit's own frame, so the hit lands in silence. In 64-sample blocks, so the edge is within 1.5 ms.
  // Overlapping or touching ranges are merged first: two gates meeting at a frame each fade back in for a few ms there, a blip in the silence.
  const quiet = read(path.join(V.dir, 'silence.json'), []).filter((q) => q.to >= from && q.from <= to).sort((a, b) => a.from - b.from)
    .reduce((acc, q) => { const l = acc[acc.length - 1]; if (l && q.from <= l.to + 0.01) l.to = Math.max(l.to, q.to); else acc.push({ from: q.from, to: q.to }); return acc; }, []);
  const gate = quiet.length ? `,asetnsamples=n=64,volume='${quiet.map((q) => { const a = (q.from - from).toFixed(4), b = (q.to - from).toFixed(4); return `(1-min(1\\,max(0\\,(t-${a})/0.008))*min(1\\,max(0\\,(${b}-t)/0.004)))`; }).join('*')}':eval=frame` : '';
  // The master: a gain, then a true-peak limiter. alimiter works on samples, so it runs at 4x the rate, where the sample peaks are the true peaks,
  // 0.3 dB under the ceiling for the resampler and the AAC encode that follow.
  const master = mix ? `,volume=${(mix.master ?? 0).toFixed(2)}dB,aresample=176400,alimiter=limit=${Math.pow(10, ((mix.truePeak ?? -1) - .3) / 20).toFixed(4)}:attack=1:release=60:level=disabled,aresample=44100` : '';
  fs.writeFileSync(script, `${filter}${labels}amix=inputs=${n + 1}:normalize=0:duration=first${gate}${master}[a]`);
  try { await ffmpeg(...inputs, '-filter_complex_script', script, '-map', '[a]', '-c:a', 'pcm_s16le', wav); }
  finally { try { fs.unlinkSync(script); } catch {} }
  return wav;
}

/** Picture and sound into `out`: every frame of the picture, the sound padded or cut to it. No -shortest, which dropped a shot's last frames. */
export async function mux(picture, wav, out, { seconds, ffmpeg }) {
  await ffmpeg('-i', picture, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', 'apad', '-t', seconds.toFixed(6), '-movflags', '+faststart', out);
}
