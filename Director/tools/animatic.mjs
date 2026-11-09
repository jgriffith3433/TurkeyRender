#!/usr/bin/env node
// The animatic (roadmap-system.md backlog item 1): the whole video from the storyboard panels, timed to the board's frames, with the finished
// mix (lines, beds, sfx, the drop-outs) through tools/mv/sound.mjs and the captions burned in. No Unity: minutes on this laptop.
//   node Director/tools/animatic.mjs [<video>] [--width 1280] [--out videos/<v>/animatic.mp4] [--no-labels]
// Picture per shot: storyboard/panels/<id>.png, else storyboard/cards/<id>.jpg, else the act sheet (storyboard/act*.jpg), else black; a slow
// 4% push-in so a held panel still reads as a shot. Shot lengths: storyboard/shots.json `frames` (the approved board), checked against
// cards.map.json. Sound: every sfx cue in acts/70-lines, 78-beds, 80-sfx, 82-foley, 84-space-sfx (and any other act's sfx), the `do: silence`
// cues as drop-outs, duck.json, and the score's `mix` block (dialogue -16 LUFS, beds ducked, true-peak limit). Captions: acts/75-captions.json.
// The shot id sits small in the top-left corner so a note can name the shot (--no-labels for a clean copy).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT, DIRECTOR } from './mv/score.mjs';
import { parse as jsonc } from './mv/jsonc.mjs';
import { mixSound, mux } from './mv/sound.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const name = args.find((a, i) => !a.startsWith('--') && !['--width', '--out'].includes(args[i - 1])) ?? 'hawkespunch';
const V = { name, dir: path.join(DIRECTOR, 'videos', name) };
const W = +flag('--width', 1280), H = Math.round(W * 9 / 16 / 2) * 2, labels = !args.includes('--no-labels');
const OUT = path.resolve(flag('--out', path.join(V.dir, 'animatic.mp4')));
const read = (f) => jsonc(fs.readFileSync(f, 'utf8'), f);
const score = read(path.join(V.dir, 'score.json')), board = read(path.join(V.dir, 'storyboard', 'shots.json'));
const map = read(path.join(V.dir, 'cards.map.json')), FPS = score.fps ?? 24;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `animatic-${name}-`));
const ffmpeg = async (...a) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...a], { cwd: TMP, encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(`ffmpeg ${a.slice(0, 6).join(' ')}...: ${(r.stderr || '').trim().split('\n').slice(-4).join('\n')}`); };
const t0 = Date.now();

// ---- the shots, on the board's frames
const shots = []; let f = 0;
for (const s of board.shots) {
  const m = map.find((x) => x.id === s.id);
  if (m && Math.abs(m.t - f / FPS) > 0.5 / FPS) console.error(`warn  ${s.id}: the board puts it at ${(f / FPS).toFixed(3)} s, cards.map.json at ${m.t.toFixed(3)} s (the cut is behind the board: run board2cards and mv cards)`);
  shots.push({ id: s.id, from: f, frames: s.frames, size: s.size }); f += s.frames;
}
const total = f / FPS;
const sb = path.join(V.dir, 'storyboard');
const panelOf = (s) => [path.join(sb, 'panels', `${s.id}.png`), path.join(sb, 'cards', `${s.id}.jpg`)].find(fs.existsSync)
  ?? fs.readdirSync(sb).filter((x) => /^act\d.*\.(jpg|png)$/.test(x)).map((x) => path.join(sb, x)).find((x) => path.basename(x).startsWith(`act${String(board.shots.find((b) => b.id === s.id)?.act ?? '')}`)) ?? null;

// ---- picture: one exact-length segment per shot, then a stream-copy concat
const list = [];
for (const s of shots) {
  const seg = `seg_${s.id}.mp4`, img = panelOf(s);
  // a slow push-in over the shot (zoompan works in output frames, so the length is exact)
  const fit = `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=decrease,pad=${W * 2}:${H * 2}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1`;
  const push = `zoompan=z='1+0.04*on/${Math.max(1, s.frames - 1)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${s.frames}:s=${W}x${H}:fps=${FPS}`;
  if (img) await ffmpeg('-i', img, '-vf', `${fit},${push},format=yuv420p`, '-frames:v', String(s.frames), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', seg);
  else await ffmpeg('-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}`, '-frames:v', String(s.frames), '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', seg);
  list.push(`file '${seg}'`);
  if (!img) console.error(`warn  ${s.id}: no panel, black`);
}
fs.writeFileSync(path.join(TMP, 'list.txt'), list.join('\n') + '\n');
await ffmpeg('-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'picture.mp4');

// ---- captions and labels, burned in (text files, so no escaping; the font copied beside them)
const fontSrc = ['C:/Windows/Fonts/arialbd.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'].find(fs.existsSync);
fs.copyFileSync(fontSrc, path.join(TMP, 'font.ttf'));
const caps = read(path.join(V.dir, 'acts', '75-captions.json')).cues ?? [];
const sec = (x) => parseFloat(String(x));
const draws = [];
caps.forEach((c, i) => {
  const a = sec(c.at), b = a + sec(c.for ?? '2s'), fsz = Math.round((c.size ?? 52) * H / 1080), y = (c.pos?.[1] ?? 0.1);
  // one drawtext per line (drawtext draws a missing-glyph box for the newline itself), stacked up from the caption's baseline
  const rows = String(c.text).replace(/\r/g, '').split('\n'), step = Math.round(fsz * 1.45);
  rows.forEach((row, k) => {
    fs.writeFileSync(path.join(TMP, `cap_${i}_${k}.txt`), row);
    draws.push(`drawtext=fontfile=font.ttf:textfile=cap_${i}_${k}.txt:fontsize=${fsz}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-${y}*h-${fsz}-${(rows.length - 1 - k) * step}:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'`);
  });
});
if (labels) shots.forEach((s) => {
  fs.writeFileSync(path.join(TMP, `lab_${s.id}.txt`), s.id);
  draws.push(`drawtext=fontfile=font.ttf:textfile=lab_${s.id}.txt:fontsize=${Math.round(H / 40)}:fontcolor=gray@0.8:x=12:y=10:enable='between(t,${(s.from / FPS).toFixed(4)},${((s.from + s.frames) / FPS - 0.001).toFixed(4)})'`);
});
fs.writeFileSync(path.join(TMP, 'text.txt'), `[0:v]${draws.join(',')}[v]`);
await ffmpeg('-i', 'picture.mp4', '-filter_complex_script', 'text.txt', '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS), 'captioned.mp4');

// ---- sound: the acts' sfx and silences into the same files a build writes (sfx-map.json, silence.json), in a scratch video dir, then the mix
const sfx = [], silence = [];
for (const a of fs.readdirSync(path.join(V.dir, 'acts')).filter((x) => x.endsWith('.json')).sort()) {
  let cues; try { cues = read(path.join(V.dir, 'acts', a)).cues ?? []; } catch { continue; }
  for (const c of cues) {
    if (typeof c.at !== 'string' && typeof c.at !== 'number') continue;
    const t = sec(c.at);
    if (c.sfx) { const p = path.join(PROJECT, c.sfx); if (fs.existsSync(p)) sfx.push({ path: p, t, volume: c.volume ?? 1 }); else console.error(`warn  ${a}: missing ${c.sfx}`); }
    if (c.do === 'silence' || c.fx === 'silence') silence.push({ from: t, to: t + sec(c.for ?? '0s') });
  }
}
const SV = { name, dir: path.join(TMP, 'v') }; fs.mkdirSync(SV.dir);
fs.writeFileSync(path.join(SV.dir, 'sfx-map.json'), JSON.stringify(sfx.filter((x) => x.t < total)));
fs.writeFileSync(path.join(SV.dir, 'silence.json'), JSON.stringify(silence));
fs.copyFileSync(path.join(V.dir, 'duck.json'), path.join(SV.dir, 'duck.json'));
const wav = path.join(TMP, 'mix.wav');
await mixSound(SV, score, { from: 0, to: total, wav, ffmpeg });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await mux(path.join(TMP, 'captioned.mp4'), wav, OUT, { seconds: total, ffmpeg });
const dur = +String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT], { encoding: 'utf8' }).stdout).trim();
const frames = String(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', OUT], { encoding: 'utf8' }).stdout).trim();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`${path.relative(PROJECT, OUT)}: ${shots.length} shots, ${frames} frames (board ${f}), ${dur.toFixed(2)} s at ${FPS} fps, ${W}x${H}; ${sfx.length} sounds, ${silence.length} drop-outs, ${caps.length} captions; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
