// The bake gate: which takes are stale, the per-build bake report, and whether it passes library/bake-gate.json.
// `mv cards` and `mv build` bake what is stale and write videos/<v>/bake-report.json; `mv final` and `mv render` refuse on a failing one.
import fs from 'node:fs';
import path from 'node:path';
import { DIRECTOR } from './score.mjs';
import { takeUses } from '../bake/key.mjs';

const GATE = path.join(DIRECTOR, 'library', 'bake-gate.json');
const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
export const reportFile = (V) => path.join(V.dir, 'bake-report.json');
export const loadGate = () => read(GATE, { video: {}, take: {}, names: {} });

/** Judges the baked ('after') numbers of each take use against the gate. */
export function judge(takes, gate = loadGate()) {
  const failures = [], name = (k) => gate.names?.[k] ?? k;
  const after = (t, k) => (k === 'plantedTravelM' ? t.after?.max?.plantedTravelM : t.after?.[k]) ?? 0;
  const counted = takes.filter((t) => !(gate.ragdoll ?? []).includes(t.take));   // a ragdoll take is contorted by design: its snaps and spikes are the fall, not a fault
  for (const [k, lim] of Object.entries(gate.video ?? {})) {
    const total = counted.reduce((a, t) => a + after(t, k), 0);
    if (total > lim) failures.push({ scope: 'video', metric: k, what: name(k), value: +total.toFixed(2), limit: lim, takes: counted.filter((t) => after(t, k) > 0).map((t) => `${t.take} ${t.at} (${+after(t, k).toFixed(2)})`) });
  }
  for (const [k, lim] of Object.entries(gate.take ?? {})) for (const t of takes) {
    const v = after(t, k);
    if (v > lim) failures.push({ scope: 'take', metric: k, what: name(k), value: +v.toFixed(2), limit: lim, take: t.take, at: t.at, key: t.key });
  }
  return { pass: failures.length === 0, failures };
}

/**
 * Writes videos/<v>/bake-report.json from gen/bake/report.json: only the entries whose key is a take the cut uses now, judged against the gate.
 * `baked` is what this build baked. Returns the report.
 */
export function writeReport(V, { baked = [], by = 'build' } = {}) {
  const all = read(path.join(DIRECTOR, 'gen', 'bake', 'report.json'), {});
  const uses = takeUses(V), byKey = new Map(Object.values(all).map((r) => [r.key, r]));
  const takes = [], missing = [];
  for (const u of uses) {
    const r = byKey.get(u.key);
    if (!r) { missing.push({ take: u.name, at: u.at, key: u.key, baked: u.baked }); continue; }
    takes.push({ take: r.take, at: r.at, key: r.key, actor: u.actor, before: slim(r.before), after: slim(r.after), warnings: r.warnings ?? [] });
  }
  const verdict = judge(takes);
  const rep = { video: V.name, when: new Date().toISOString(), by, gate: path.relative(DIRECTOR, GATE).replace(/\\/g, '/'), pass: verdict.pass && !missing.some((m) => !m.baked), failures: verdict.failures, baked, unmeasured: missing, takes };
  const tmp = `${reportFile(V)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rep, null, 1)); fs.renameSync(tmp, reportFile(V));
  return rep;
}
const slim = (r) => r ? { snaps: r.snaps, jerk: r.jerk, elbowFlip: r.elbowFlip, kneeFlip: r.kneeFlip, hyperKnee: r.hyperKnee, hyperElbow: r.hyperElbow, wristOver: r.wristOver, ankleOver: r.ankleOver, toesUnder: r.toesUnder, max: { plantedTravelM: r.max?.plantedTravelM ?? 0 } } : null;

/** Why a render must not run, in one line, or null. No report at all is a note, not a stop: a video with no takes has none. */
export function refusal(V) {
  const r = read(reportFile(V));
  if (!r) return takeUses(V).length ? { soft: true, why: `no bake report for ${V.name} yet: run mv cards (it bakes and writes one)` } : null;
  if (r.pass) return null;
  const f = r.failures[0], un = r.unmeasured.filter((m) => !m.baked)[0];
  if (f) return { why: f.scope === 'take' ? `the bake gate fails: ${f.take} at ${f.at} has ${f.what} ${f.value}, the limit is ${f.limit}` : `the bake gate fails: ${f.what} ${f.value} over the video, the limit is ${f.limit} (${f.takes.slice(0, 4).join(', ')})` };
  if (un) return { why: `the bake gate fails: ${un.take} at ${un.at} is not baked` };
  return { why: 'the bake gate fails' };
}

/** `mv bake status`: the report in words. */
export function status(V) {
  const r = read(reportFile(V)), uses = takeUses(V), stale = uses.filter((u) => !u.baked);
  const lines = [`${V.name}: ${uses.length} take uses in the cut, ${stale.length} stale${stale.length ? ` (${stale.map((u) => `${u.name} ${u.at}`).join(', ')})` : ''}`];
  if (!r) { lines.push('no bake report yet: mv cards bakes and writes one, or mv bake'); return lines.join('\n'); }
  lines.push(`report ${r.when} by ${r.by}: ${r.pass ? 'PASS' : 'FAIL'} against ${r.gate}`);
  for (const f of r.failures) lines.push(f.scope === 'take' ? `  FAIL ${f.take} ${f.at}: ${f.what} ${f.value} > ${f.limit}` : `  FAIL video: ${f.what} ${f.value} > ${f.limit}: ${f.takes.join(', ')}`);
  for (const m of r.unmeasured) lines.push(`  ${m.baked ? 'no numbers for' : 'NOT BAKED'} ${m.take} ${m.at} (${m.key})`);
  const g = loadGate(), sum = (k) => r.takes.reduce((a, t) => a + (t.after?.[k] ?? 0), 0);
  lines.push(`  video totals: ${Object.keys(g.video ?? {}).map((k) => `${k} ${sum(k)}/${g.video[k]}`).join(', ')}`);
  const worst = (k, f) => r.takes.slice().sort((a, b) => f(b) - f(a))[0];
  const wa = worst('ankleOver', (t) => t.after?.ankleOver ?? 0), wt = worst('trav', (t) => t.after?.max?.plantedTravelM ?? 0);
  if (wa) lines.push(`  worst ankle over: ${wa.take} ${wa.at} ${wa.after.ankleOver}/${g.take?.ankleOver}; worst near-floor travel: ${wt.take} ${wt.at} ${wt.after.max.plantedTravelM} m/${g.take?.plantedTravelM}`);
  return lines.join('\n');
}
