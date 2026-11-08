// Same transitions, inertia against the old crossfade: writes both stepped sheets and prints how hard each one kinks.
// node Director/library/proof/inertia.mjs
import { execFileSync as x } from 'node:child_process';
import fs from 'node:fs';
const cases = {
  run_to_hit: { from: 2.4, to: 4.0, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'RunFastForwardUnarmed', blend: 0 },
    { at: 3, do: 'anim', on: 'person', clip: 'GetHitFrontHeavyCombat', once: 1, blend: '0.3s' } ] },
  wave_to_yell: { from: 2.6, to: 4.2, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'Idle1Wave', blend: 0 },
    { at: 3.1, do: 'anim', on: 'person', clip: 'Idle1Yell', blend: '0.4s' } ] },
  keys_in_and_out: { from: 2.6, to: 5.0, cues: [
    { at: 2, do: 'anim', on: 'person', clip: 'IdleBreathe', blend: 0 },
    { at: 3, do: 'keys', on: 'person', blend: '0.25s', keys: [{ t: 0, pose: 'cower' }, { t: '2b', pose: 'cower', hold: '1b' }] },
    { at: 4.6, do: 'anim', on: 'person', clip: 'Idle1Wow', blend: '0.3s' } ] },
};
const out = {};
for (const [name, c] of Object.entries(cases)) for (const mode of ['inertia', 'crossfade']) {
  const cues = c.cues.map((q) => (mode === 'crossfade' ? { ...q, crossfade: 1 } : q));
  const lab = { on: 'person', from: c.from, to: c.to, every: 2, cols: 12, cell: 150, sheet: `proof_${name}_${mode}.png`, cues, fps: 30 };
  const f = `Director/library/proof/_tmp.json`;
  fs.writeFileSync(f, JSON.stringify(lab));
  const r = JSON.parse(x('node', ['Director/mv.mjs', 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const probe = []; for (let t = c.from; t <= c.to; t += 1 / 60) probe.push(+t.toFixed(4));
  fs.writeFileSync(f, JSON.stringify({ ...lab, every: 30, sheet: '_x.png', probe, probeBones: ['hips', 'head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'] }));
  const p = JSON.parse(x('node', ['Director/mv.mjs', 'lab', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }));
  const bones = ['hips', 'head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
  const P = (row, b) => row[b].replace(/[()]/g, '').split(',').map(Number);
  let kink = 0, who = '', when = 0, speedDrop = 1e9;
  const rows = p.probe;
  for (let i = 1; i + 1 < rows.length; i++) for (const b of bones) {
    const a = P(rows[i - 1], b), m = P(rows[i], b), z = P(rows[i + 1], b);
    const k = Math.hypot(z[0] - 2 * m[0] + a[0], z[1] - 2 * m[1] + a[1], z[2] - 2 * m[2] + a[2]) * 3600; // m/s2
    if (k > kink) { kink = k; who = b; when = rows[i].t; }
  }
  out[`${name}/${mode}`] = { worstAccel: +kink.toFixed(1), bone: who, at: when, popCount: r.popCount, feet: r.feet, pure: [r.reverseWorstMetres, r.shuffledFreshWorstMetres], sheet: r.sheet, ms: +r.msPerFrame.toFixed(2) };
}
fs.unlinkSync('Director/library/proof/_tmp.json');
console.log(JSON.stringify(out, null, 1));
