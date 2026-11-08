// Real shaded stepped sheets of a lab run: renders one side view, tiles every Nth frame. The silhouette sheet is broken on the current Person mesh.
// node Director/library/proof/sheets.mjs        inertia against crossfade, same transitions
import { execFileSync as x } from 'node:child_process';
import fs from 'node:fs';
const P = { pos: [500, 0, 500] };
const cases = {
  run_to_hit: { from: 2.8, to: 3.6, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'RunFastForwardUnarmed', blend: 0 },
    { at: 3, do: 'anim', on: 'person', clip: 'GetHitFrontHeavyCombat', once: 1, blend: '0.3s' } ] },
  wave_to_yell: { from: 2.9, to: 3.7, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'Idle1Wave', blend: 0 },
    { at: 3.1, do: 'anim', on: 'person', clip: 'Idle1Yell', blend: '0.4s' } ] },
  keys_in_and_out: { from: 2.9, to: 3.7, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'IdleBreathe', blend: 0 },
    { at: 3, do: 'keys', on: 'person', blend: '0.25s', keys: [{ t: 0, pose: 'cower' }, { t: '2b', pose: 'cower', hold: '1b' }] },
    { at: 4.6, do: 'anim', on: 'person', clip: 'Idle1Wow', blend: '0.3s' } ] },
};
const out = {};
for (const [name, c] of Object.entries(cases)) for (const mode of ['inertia', 'crossfade']) {
  const cues = c.cues.map((q) => (mode === 'crossfade' ? { ...q, crossfade: 1 } : q));
  const f = 'Director/library/proof/_tmp4.json', base = `captures/proof/${name}_${mode}`;
  fs.mkdirSync('Director/captures/proof', { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ on: 'person', from: c.from, to: c.to, every: 1, cols: 8, cell: 60, sheet: '_x.png', actors: { person: { model: 'person', ...P } }, cues, render: { out: base, views: ['three'], w: 300, h: 420, fps: 30 } }));
  const r = JSON.parse(x('node', ['Director/mv.mjs', 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }));
  out[`${name}/${mode}`] = r.render;
  fs.unlinkSync(f);
}
console.log(JSON.stringify(out, null, 1));
