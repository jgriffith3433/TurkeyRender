#!/usr/bin/env node
// Puts the Node mix (tools/mv/sound.mjs: the score's `music` level, duck.json, every sfx in sfx-map.json) under a render that Unity mixed itself.
// `mv render` mixes through Transport.cs, which doesn't know `"music": 0`; `mv shot` and `mv final` already mix in Node. For a slice:
//   node Director/tools/remix.mjs <video> <render.mp4> --from 42.93 [--to 63.08] [--out file.mp4]
// --from is the render's first second in the video; --to defaults to from + the render's length. Every frame is kept (no -shortest).
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pickVideo, loadScore } from './mv/score.mjs';
import { mixSound, mux } from './mv/sound.mjs';

const args = process.argv.slice(2), val = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args.splice(i, 2)[1]; };
const from = +val('from', NaN), toArg = val('to'), outArg = val('out');
const V = pickVideo(args[0]), file = path.resolve(args[1] ?? '');
if (!fs.existsSync(file) || Number.isNaN(from)) { console.error('usage: remix.mjs <video> <render.mp4> --from <seconds> [--to] [--out]'); process.exit(2); }
const ffmpeg = (...a) => new Promise((res, rej) => execFile('ffmpeg', ['-y', '-v', 'error', ...a], (e, so, se) => (e ? rej(new Error(se || e.message)) : res())));
const probe = (f) => new Promise((res, rej) => execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], (e, so) => (e ? rej(e) : res(parseFloat(so)))));
const seconds = await probe(file), to = toArg ? +toArg : from + seconds;
const { score } = loadScore(V);
const wav = file.replace(/\.mp4$/i, '.remix.wav'), out = outArg ? path.resolve(outArg) : file.replace(/\.mp4$/i, '.nomusic.mp4');
await mixSound(V, score, { from, to, wav, ffmpeg });
await mux(file, wav, out, { seconds, ffmpeg });
try { fs.unlinkSync(wav); } catch {}
console.log(`${out}  (${seconds.toFixed(2)} s from ${from} s, music ${score.music ?? 1})`);
