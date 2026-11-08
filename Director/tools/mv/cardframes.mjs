#!/usr/bin/env node
// A contact sheet of a whole cut, no render: a frame near the start, the middle and the end of every card, labelled by card id. A staging pass in about a minute.
//   node Director/tools/mv/cardframes.mjs <video> [--only id,id] [--w 480] [--at 0.1,0.5,0.9] [--out file.jpg]
// Writes <video>/captures/cards.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2), video = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const dir = path.join(ROOT, 'videos', video), map = JSON.parse(fs.readFileSync(path.join(dir, 'cards.map.json'), 'utf8'));
const shots = (map.shots ?? map).filter((s) => !opt('only') || opt('only').split(',').includes(s.id));
const w = +opt('w', 480), h = Math.round(w * 9 / 16), at = opt('at', '0.08,0.5,0.92').split(',').map(Number);
const times = shots.flatMap((s) => at.map((a) => +(s.t + (s.tEnd - s.t) * a).toFixed(3)));
const r = spawnSync('node', [path.join(ROOT, 'mv.mjs'), '--video', video, 'frame', ...times.map(String), '--w', String(w), '--h', String(h)], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
const files = [...r.stdout.matchAll(/"([^"]+\.png)"/g)].map((m) => m[1].replace(/\\\\/g, '/'));
if (files.length < times.length) { console.error('frames missing', r.stdout.slice(0, 800)); process.exit(1); }
const list = path.join(ROOT, 'gen', `cardframes_${process.pid}.json`);
fs.writeFileSync(list, JSON.stringify({ cols: at.length, w, h, out: path.join(dir, 'captures', opt('out', 'cards.jpg')), rows: shots.map((s, i) => ({ id: s.id, files: files.slice(i * at.length, (i + 1) * at.length), times: times.slice(i * at.length, (i + 1) * at.length) })) }));
const py = spawnSync('py', ['-c', `
import json,sys
from PIL import Image,ImageDraw
d=json.load(open(sys.argv[1]));w,h=d['w'],d['h'];n=len(d['rows'])
pg=[];per=int(sys.argv[2]) if len(sys.argv)>2 else 6
for k in range(0,n,per):
    rows=d['rows'][k:k+per];o=Image.new('RGB',(w*d['cols'],h*len(rows)),'black')
    for y,r in enumerate(rows):
        for x,f in enumerate(r['files']):
            im=Image.open(f).convert('RGB').resize((w,h));dr=ImageDraw.Draw(im);t=f"{r['id']} {r['times'][x]:.2f}s";dr.rectangle((0,0,8+6*len(t),13),fill='black');dr.text((3,1),t,fill='white');o.paste(im,(x*w,y*h))
    p=d['out'] if n<=per else d['out'].replace('.jpg',f'_{k//per+1}.jpg');o.save(p,quality=85);print(p)
`, list], { encoding: 'utf8' });
fs.unlinkSync(list);
process.stdout.write(py.stdout); if (py.status !== 0) { console.error(py.stderr); process.exit(1); }
