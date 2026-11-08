// One real performance, bars 25-27 of the pull: on ones, on 15, on 12, and arms on 8 over legs on ones. Writes sheets and side renders.
// node Director/library/proof/steps.mjs
import { execFileSync as x } from 'node:child_process';
import fs from 'node:fs';
import { parse } from '../../tools/mv/jsonc.mjs';
const src = fs.readFileSync('Director/acts/03-the-pull.json', 'utf8');
let act; try { act = parse(src); } catch { act = JSON.parse(src.replace(/^\s*\/\/.*$/gm, '')); }
const list = act.cues;
const bar = (s) => { const m = /^(\d+)(?::([\d.]+))?/.exec(String(s)); return m ? +m[1] + ((+m[2] || 1) - 1) / 8 : NaN; };
const cues = list.filter((c) => c.do && (c.on === 'person') && ['anim', 'keys', 'pose', 'face', 'fingers'].includes(c.do) && typeof c.at === 'string' && bar(c.at) >= 24.5 && bar(c.at) < 27);
console.error(cues.length, 'cues', cues.map((c) => c.do + ' ' + c.at).join(', '));
const base = { on: 'person', from: 66.657, to: 69.4, every: 1, cols: 14, cell: 60, actors: { person: { model: 'person', pos: [500, 0, 500] } } };
const variants = {
  ones: [],
  on15: [{ at: '25:1', do: 'steps', on: 'person', rate: 15, for: '2bars' }],
  on12: [{ at: '25:1', do: 'steps', on: 'person', rate: 12, for: '2bars' }],
  arms8: [{ at: '25:1', do: 'steps', on: 'person', rate: 8, mask: 'arms', for: '2bars' }],
};
const out = {};
for (const [k, add] of Object.entries(variants)) {
  const f = 'Director/library/proof/_tmp2.json';
  fs.writeFileSync(f, JSON.stringify({ ...base, cues: [...cues, ...add], sheet: `proof_steps_${k}.png`, render: { out: `captures/proof_steps_${k}`, views: ['three'], w: 360, h: 480, fps: 30 } }));
  const r = JSON.parse(x('node', ['Director/mv.mjs', 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }));
  out[k] = { popCount: r.popCount, hipsMaxSpeed: r.hipsMaxSpeed, feet: r.feet, pure: [r.reverseWorstMetres, r.shuffledFreshWorstMetres], ms: r.msPerFrame, sheet: r.sheet, render: r.render, warnings: r.warnings };
}
fs.unlinkSync('Director/library/proof/_tmp2.json');
console.log(JSON.stringify(out, null, 1));
