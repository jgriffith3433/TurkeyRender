// `mv test`: the build tests (ROADMAP-SYSTEM M5). Each proves one thing that went wrong on TK Shock can't creep back.
//   reverse  every moment looks the same reached going backward: nothing depends on play order
//   size     the scene and the timeline stay small, so reloads stay fast
//   cost     frames don't get slower: ms per frame at spread-out moments, against the last accepted numbers
// A plain `mv build` runs `size`. `mv test --set-baseline` accepts today's frame cost. Baselines: <video>/test-baseline.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT } from './score.mjs';

const SCENE_MB = 50, TIMELINE_MB = 30, GENERATED_MB = 400, REVERSE_DB = 30, COST_GROWTH = 1.25, COST_SLACK_MS = 15;

const mb = (n) => Math.round((n / 1e6) * 10) / 10;
const sizeOf = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };
function dirSize(d) {
  let total = 0;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) total += e.isDirectory() ? dirSize(path.join(d, e.name)) : sizeOf(path.join(d, e.name));
  return total;
}

export function sizeTest(V) {
  const scene = sizeOf(path.join(PROJECT, V.scene)), gen = path.join(PROJECT, V.gen);
  const timeline = fs.existsSync(gen) ? fs.readdirSync(gen).filter((f) => f.endsWith('.playable')).reduce((n, f) => n + sizeOf(path.join(gen, f)), 0) : 0;
  const generated = fs.existsSync(gen) ? dirSize(gen) : 0;
  const problems = [];
  if (!scene) problems.push(`no scene at ${V.scene}`);
  if (scene > SCENE_MB * 1e6) problems.push(`scene is ${mb(scene)} MB, limit ${SCENE_MB}`);
  if (timeline > TIMELINE_MB * 1e6) problems.push(`timeline is ${mb(timeline)} MB, limit ${TIMELINE_MB}`);
  if (generated > GENERATED_MB * 1e6) problems.push(`Generated is ${mb(generated)} MB, limit ${GENERATED_MB}`);
  return { test: 'size', ok: !problems.length, sceneMB: mb(scene), timelineMB: mb(timeline), generatedMB: mb(generated), problems };
}

/** Spread-out moments, away from the very start and end. */
export const moments = (duration, n) => Array.from({ length: n }, (_, i) => Math.round((duration * (i + 0.5) / n) * 100) / 100);

/** How alike two frames are, in dB. A soft blur first, so film grain doesn't read as a difference. */
export function psnr(a, b) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', '[0]gblur=1.5[x];[1]gblur=1.5[y];[x][y]psnr', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = (r.stderr ?? '').match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? 99 : +m[1]) : 0;
}

export async function reverseTest(call, V, duration, count = 8) {
  const times = moments(duration, count), dir = path.join(V.captures, 'test-reverse');
  fs.mkdirSync(dir, { recursive: true });
  const shots = async (list, tag) => {
    const out = {};
    for (const t of list) {
      const [p] = await call('capture', { t: [t], w: 480, h: 270 });
      out[t] = path.join(dir, `${t}_${tag}.png`);
      fs.copyFileSync(p, out[t]);
    }
    return out;
  };
  const a = await shots(times, 'a'), b = await shots([...times].reverse(), 'b');
  const rows = times.map((t) => ({ t, db: Math.round(psnr(a[t], b[t]) * 10) / 10 }));
  const bad = rows.filter((r) => r.db < REVERSE_DB);
  return { test: 'reverse', ok: !bad.length, rows, problems: bad.map((r) => `${r.t} s differs going backward, ${r.db} dB (compare ${r.t}_a.png and ${r.t}_b.png in ${dir})`) };
}

export function compareCost(now, base) {
  const problems = [];
  for (const [t, ms] of Object.entries(now)) {
    const was = base?.[t];
    if (was != null && ms > was * COST_GROWTH + COST_SLACK_MS) problems.push(`frame at ${t} s costs ${ms} ms, was ${was}`);
  }
  return problems;
}

export async function costTest(call, V, duration, setBaseline) {
  const file = path.join(V.dir, 'test-baseline.json');
  let saved = {}; try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const t = moments(duration, 6);
  // It sets its own quality, and warms up at the size it measures: after a reload the first pass over each moment pays for shaders, meshes and the jump.
  const take = () => call('bench', { t, w: 1280, h: 720, n: 4, final: true });
  await take();
  let now = await take();
  for (let i = 0; i < 3; i++) { // until two passes agree, so a cold start can't fail the test
    const next = await take(), settled = Object.keys(now).every((k) => next[k] <= now[k] * 1.1 + 2 && now[k] <= next[k] * 1.1 + 2);
    for (const k of Object.keys(now)) now[k] = Math.min(now[k], next[k]);
    if (settled) break;
  }
  const problems = compareCost(now, saved.frameMs);
  if (setBaseline || !saved.frameMs) fs.writeFileSync(file, JSON.stringify({ ...saved, frameMs: now, accepted: new Date().toISOString() }, null, 1));
  const worst = Math.max(...Object.values(now));
  return { test: 'cost', ok: setBaseline || !problems.length, frameMs: now, worstMs: worst, baseline: saved.frameMs ? 'compared' : 'first run, saved as the baseline', problems: setBaseline ? [] : problems };
}

export async function runTests({ call, V, duration, only, setBaseline }) {
  const want = (n) => !only || only.split(',').includes(n), out = [];
  if (want('size')) out.push(sizeTest(V));
  if (want('reverse')) out.push(await reverseTest(call, V, duration));
  if (want('cost')) out.push(await costTest(call, V, duration, setBaseline));
  const report = { video: V.name, at: new Date().toISOString(), ok: out.every((r) => r.ok), tests: out };
  fs.mkdirSync(V.captures, { recursive: true });
  fs.writeFileSync(path.join(V.captures, 'test-report.json'), JSON.stringify(report, null, 1));
  return report;
}

export function printTests(report) {
  for (const r of report.tests) {
    const line = r.test === 'size' ? `scene ${r.sceneMB} MB, timeline ${r.timelineMB} MB, generated ${r.generatedMB} MB`
      : r.test === 'reverse' ? `${r.rows.length} moments, worst ${Math.min(...r.rows.map((x) => x.db))} dB`
        : `worst ${r.worstMs} ms a frame, ${r.baseline}`;
    console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.test.padEnd(8)} ${line}`);
    for (const p of r.problems) console.log(`      ${p}`);
  }
}
