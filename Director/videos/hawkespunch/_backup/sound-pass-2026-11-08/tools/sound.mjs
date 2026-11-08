// The sound of a render, mixed once: the song and every sfx in `sfx-map.json` over a stretch of the video, as Transport.cs does for a single render.
// tools/final.mjs mixes the whole video with it; `mv shot` mixes its own stretch and muxes in Node, without ffmpeg's -shortest, so a shot keeps its last frames.
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT } from './score.mjs';

const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

/** Writes `wav` with the song and sfx from `from` to `to` (video seconds). `ffmpeg(...args)` runs ffmpeg and throws on failure. */
export async function mixSound(V, score, { from = 0, to, wav, ffmpeg }) {
  const seconds = (to - from).toFixed(6), song = path.join(PROJECT, score.song);
  const sfx = read(path.join(V.dir, 'sfx-map.json'), []).filter((x) => x.t >= from && x.t <= to);
  const inputs = ['-ss', from.toFixed(6), '-t', seconds, '-i', song];
  // Ducking: videos/<v>/duck.json is a list of {from, to, gain, fade} in video seconds; the song drops to `gain` under each (a spoken line), easing over `fade`.
  const ducks = read(path.join(V.dir, 'duck.json'), []).filter((d) => d.to >= from && d.from <= to);
  const duckExpr = ducks.length ? ducks.map((d) => { const f = d.fade ?? .3, a = (d.from - from).toFixed(3), b = (d.to - from).toFixed(3), g = (1 - (d.gain ?? .4)).toFixed(3); return `(1-${g}*min(1\\,max(0\\,(t-(${a}-${f}))/${f}))*min(1\\,max(0\\,((${b}+${f})-t)/${f})))`; }).join('*') : null;
  // `"music": 0` in the score (or any level) takes the song out of the mix while song.json still drives every time: the spoken lines and sfx carry the sound.
  const music = score.music ?? 1;
  let filter = `[0:a]aformat=sample_rates=44100:channel_layouts=stereo${music !== 1 ? `,volume=${music}` : ''}${duckExpr ? `,volume='${duckExpr}':eval=frame` : ''}[m];\n`, labels = '[m]', n = 0;
  sfx.forEach((x) => {
    inputs.push('-i', x.path);
    const ms = Math.round((x.t - from) * 1000);
    filter += `[${n + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${x.volume}[s${n}];\n`;
    labels += `[s${n}]`; n++;
  });
  const script = wav + '.filter.txt';
  // Silence before a hit (the epic toolkit's `silence`, written by the compiler to videos/<v>/silence.json): the whole mix, song, lines and sfx, falls to
  // nothing over 8 ms at `from` and is back at `to`, the hit's own frame, so the hit lands in silence. In 64-sample blocks, so the edge is within 1.5 ms.
  const quiet = read(path.join(V.dir, 'silence.json'), []).filter((q) => q.to >= from && q.from <= to);
  const gate = quiet.length ? `,asetnsamples=n=64,volume='${quiet.map((q) => { const a = (q.from - from).toFixed(4), b = (q.to - from).toFixed(4); return `(1-min(1\\,max(0\\,(t-${a})/0.008))*min(1\\,max(0\\,(${b}-t)/0.004)))`; }).join('*')}':eval=frame` : '';
  fs.writeFileSync(script, `${filter}${labels}amix=inputs=${n + 1}:normalize=0:duration=first${gate}[a]`);
  try { await ffmpeg(...inputs, '-filter_complex_script', script, '-map', '[a]', '-c:a', 'pcm_s16le', wav); }
  finally { try { fs.unlinkSync(script); } catch {} }
  return wav;
}

/** Picture and sound into `out`: every frame of the picture, the sound padded or cut to it. No -shortest, which dropped a shot's last frames. */
export async function mux(picture, wav, out, { seconds, ffmpeg }) {
  await ffmpeg('-i', picture, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-af', 'apad', '-t', seconds.toFixed(6), '-movflags', '+faststart', out);
}
