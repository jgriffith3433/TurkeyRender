// The shot gate: the camera and staging checks of MotionCheck.cs (`--checks shot`: frame, gesture, mark, readable, camin, propat) kept per video in
// videos/<v>/captures/shotcheck.json with the hash of the inputs they were run on, so a render can tell whether they still hold. `mv shot`, `mv render`
// and `mv final` refuse on an A fault inside what they render (`--allow-shot`, or `--force` on shot and render); `mv cards` prints one line.
import fs from 'node:fs';
import path from 'node:path';
import { inputs } from './stamp.mjs';

export const SHOT_CHECKS = new Set(['frame', 'gesture', 'mark', 'readable', 'camin', 'propat']);
export const reportFile = (V) => path.join(V.captures, 'shotcheck.json');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

/** Keeps the shot checks of a finished motion check (captures/motioncheck.json) with the inputs' hash and the range it covered. */
export function keep(V, { from, to }) {
  const mc = read(path.join(V.captures, 'motioncheck.json'));
  if (!mc) return null;
  const problems = (mc.problems ?? []).filter((p) => SHOT_CHECKS.has(p.check));
  const counts = {}; for (const p of problems) counts[p.check] = (counts[p.check] ?? 0) + 1;
  const run = (mc.runs ?? [])[0] ?? {};
  const r = { at: new Date().toISOString(), inputs: inputs(V).hash, from: +(+from).toFixed(3), to: +(+to).toFixed(3), A: problems.filter((p) => p.level === 'A').length, B: problems.filter((p) => p.level === 'B').length, counts, contrast: Object.assign({}, ...(mc.runs ?? []).map((x) => x.contrast ?? {})), seconds: (mc.runs ?? []).reduce((a, x) => a + (x.seconds ?? 0), 0), every: run.every, problems };
  fs.writeFileSync(reportFile(V), JSON.stringify(r, null, 1));
  return r;
}

/** The kept report when it was run on these inputs and covers from..to, else null. */
export function fresh(V, from, to) {
  const r = read(reportFile(V));
  if (!r || r.inputs !== inputs(V).hash) return null;
  if (r.from > from + 0.05 || r.to < to - 0.05) return null;
  return r;
}

export const faults = (r, from = -1e9, to = 1e9, level = 'A') => (r?.problems ?? []).filter((p) => p.level === level && p.to > from + 1e-3 && p.from < to - 1e-3); // a fault on the neighbour's first frame isn't this range's

const say = (p) => `${p.label} ${p.shot}: ${p.actor} ${p.check} ${p.what} (${p.value} ${p.unit}, ${p.seconds ?? '?'} s of ${p.shotLen ?? '?'})`;

/** One line for mv cards. */
export function line(r) {
  if (!r) return 'shot check: not run';
  const by = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  const a = faults(r);
  return `shot check: ${r.A} A, ${r.B} B${by ? ` (${by})` : ''}${a.length ? `. Worst: ${say(a[0])}` : ''}. ${path.basename(reportFile({ captures: '' }))} in captures`;
}

/** Why a render of from..to must not start, or null. */
export function refusal(r, from, to) {
  const a = faults(r, from, to);
  if (!a.length) return null;
  return `${a.length} A shot fault${a.length > 1 ? 's' : ''} in ${from.toFixed(1)}-${to.toFixed(1)} s:\n  ${a.slice(0, 8).map(say).join('\n  ')}${a.length > 8 ? `\n  and ${a.length - 8} more` : ''}`;
}
