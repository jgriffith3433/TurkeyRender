#!/usr/bin/env node
// Writes Director/library/performances/gallery.md from the performances, their test numbers (tests/<name>.json), their renders and the
// verdicts a person or agent gave after watching them stepped at 30 fps (verdicts.json). One image per performance: six moments from the
// side above six from the front, taken out of the 30 fps renders.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))), LIB = path.join(ROOT, 'library', 'performances');
const R = path.join(LIB, 'renders'), G = path.join(LIB, 'gallery'), T = path.join(LIB, 'tests');
fs.mkdirSync(G, { recursive: true });
const verdicts = JSON.parse(fs.readFileSync(path.join(LIB, 'verdicts.json'), 'utf8'));
const frames = (f) => +spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim();

function strip(name) {
  const out = path.join(G, name + '.jpg'), inputs = [];
  for (const v of ['side', 'front']) {
    const f = path.join(R, `${name}_${v}.mp4`); if (!fs.existsSync(f)) continue;
    const n = frames(f), step = Math.max(1, Math.floor(n / 6));
    inputs.push('-i', f);
  }
  if (!inputs.length) return null;
  const parts = []; let i = 0;
  for (const v of ['side', 'front']) {
    const f = path.join(R, `${name}_${v}.mp4`); if (!fs.existsSync(f)) continue;
    const step = Math.max(1, Math.floor(frames(f) / 6));
    parts.push(`[${i}:v]select='not(mod(n\\,${step}))',scale=170:-1,tile=6x1[t${i}]`); i++;
  }
  const fc = parts.join(';') + (i > 1 ? `;[t0][t1]vstack[o]` : '');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', i > 1 ? '[o]' : '[t0]', '-frames:v', '1', '-q:v', '4', out], { encoding: 'utf8' });
  if (r.status !== 0) console.error(name, r.stderr.slice(0, 300));
  return fs.existsSync(out) ? `gallery/${name}.jpg` : null;
}

const names = fs.readdirSync(LIB).filter((f) => f.endsWith('.json') && f !== 'verdicts.json' && !f.startsWith('_')).map((f) => f.slice(0, -5)).sort();
const pass = [], fail = [];
for (const name of names) {
  const p = JSON.parse(fs.readFileSync(path.join(LIB, name + '.json'), 'utf8'));
  const t = fs.existsSync(path.join(T, name + '.json')) ? JSON.parse(fs.readFileSync(path.join(T, name + '.json'), 'utf8')) : null;
  const v = verdicts[name] || { verdict: 'FAIL', notes: 'not watched yet' };
  const img = strip(name);
  const nums = t ? `pops ${t.popCount}, ${(t.feet || []).map((x) => x.replace(/ foot on floor moved /, ' ').replace(/, worst step.*/, '')).join(', ')}, reverse ${t.reverse}` : 'no test yet';
  const row = `### ${name}: ${v.verdict}\n\n${img ? `![${name}](${img})\n\n` : ''}${p.about}\n\n\`${p.entry}\` to \`${p.exit}\`, ${p.length}${p.min ? `, at least ${p.min}` : ''}.${p.params ? ' Params: ' + Object.entries(p.params).map(([k, x]) => `\`${k}\` ${JSON.stringify(x)}`).join(', ') + '.' : ''}\n\nStandard: ${v.notes}\n\nTools: ${nums}.\n`;
  (v.verdict === 'PASS' ? pass : fail).push(row);
}
const head = `# Performance gallery\n\nJudged against \`Director/review/STANDARD.md\` by reading every frame at 30 fps on the sheets in \`sheets/\` (silhouettes, side or front), plus the shaded renders in \`renders/\` (faces in \`*_close_front.mp4\`, only for the ones the notes say). Only PASS entries are usable. Written by \`node Director/tools/perf_gallery.mjs\` from \`verdicts.json\`; edit that, not this.\n\nPASS: ${pass.length}. FAIL: ${fail.length}.\n\n`;
fs.writeFileSync(path.join(LIB, 'gallery.md'), head + '## Usable\n\n' + pass.join('\n') + (fail.length ? '\n## Not usable\n\n' + fail.join('\n') : ''));
console.log(`gallery: ${pass.length} pass, ${fail.length} fail`);
