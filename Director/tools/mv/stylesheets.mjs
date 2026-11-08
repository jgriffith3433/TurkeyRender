#!/usr/bin/env node
// The same shots in every style, one sheet per style and one comparison, plus a short clip of each so stepped motion can be judged.
//   node Director/mv.mjs hold node Director/tools/mv/stylesheets.mjs [--video styletest] [--styles a,b] [--clips] [--w 960]
// Writes Director/library/styles/sheets/<style>.png, compare.png, <style>.mp4. Swaps style.json's one line and puts it back.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DIRECTOR } from './score.mjs';

const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const video = flag('video', 'styletest'), W = +flag('w', 960), H = Math.round(W * 9 / 16), clips = args.includes('--clips');
const dir = path.join(DIRECTOR, 'videos', video), out = path.join(DIRECTOR, 'library', 'styles', 'sheets');
fs.mkdirSync(out, { recursive: true });
const all = fs.readdirSync(path.join(DIRECTOR, 'library', 'styles')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const styles = flag('styles', all.join(',')).split(',');
const mv = (...a) => {
  const r = spawnSync(process.execPath, [path.join(DIRECTOR, 'mv.mjs'), '--video', video, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status) throw new Error(`mv ${a.join(' ')}: ${r.stderr}${r.stdout}`.slice(-1500));
  return r.stdout;
};
const keep = fs.readFileSync(path.join(dir, 'style.json'), 'utf8');
const rows = [];
try {
  for (const s of styles) {
    const t0 = Date.now();
    mv('style', s);
    const built = mv('cards', '--fast');
    const warns = /"warnings": \[\s*([^\]]*)\]/.exec(built)?.[1]?.trim();
    if (warns) console.error(s, 'warnings:', warns.slice(0, 400));
    const map = JSON.parse(fs.readFileSync(path.join(dir, 'cards.map.json'), 'utf8'));
    const shots = (map.shots ?? map).map((x) => ({ id: x.id, t: x.t + (x.tEnd - x.t) * 0.7 }));
    const files = JSON.parse(mv('frame', ...shots.map((x) => x.t.toFixed(3)), '--w', String(W), '--h', String(H)));
    const fixed = files.map((f, i) => { const p = path.join(out, `_${s}_${shots[i].id}.png`); fs.copyFileSync(f, p); return p; });
    const style = spawnSync('py', [path.join(DIRECTOR, 'tools', 'mv', 'stylesheet.py'), 'one', path.join(out, s + '.png'), s, path.join(DIRECTOR, 'library', 'styles', s + '.json'), ...fixed], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (style.status) throw new Error(style.stderr);
    rows.push(path.join(out, s + '.png'));
    if (clips) {
      const m = (map.shots ?? map).at(-1);
      mv('render', '--from', String(m.t), '--to', String(Math.min(m.tEnd, m.t + 2.5)), '--w', '640', '--h', '360', '--out', path.join(out, s + '.mp4'));
    }
    console.error(`${s}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally { fs.writeFileSync(path.join(dir, 'style.json'), keep); }
if (styles.length === all.length) {
  const r = spawnSync('py', [path.join(DIRECTOR, 'tools', 'mv', 'stylesheet.py'), 'compare', path.join(out, 'compare.png'), out, ...styles], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status) throw new Error(r.stderr);
}
console.log(JSON.stringify({ sheets: rows, compare: path.join(out, 'compare.png') }, null, 1));
