#!/usr/bin/env node
// The render farm's coordinator (Director/docs/render-farm.md): shots across N cloud Unity workers, the files back into
// videos/<v>/final/<w>x<h>-<fps>/ under the names tools/final.mjs expects, so `mv final` stitches them as reused shots.
//
//   node Director/tools/farm.mjs <video> plan   [--w 1280 --h 720 --fps 30 --workers 5 --force --quality final]   free: the split and the price
//   node Director/tools/farm.mjs <video> sync   [--dry]           the project tree into the farm's snapshot store (only what changed), through Hawkes Gen
//   node Director/tools/farm.mjs <video> render [--workers 5 ...] the shots that would render, on N workers, then `mv final` to stitch
//   node Director/tools/farm.mjs <video> previs [--workers 2]     the whole cut at previs quality (426x240, 12 fps) in parts, joined
//
// How it decides: `final.mjs --plan-json` (the same plan `mv final` makes, cards compiled in memory) gives every shot's
// hash and frames; the shots that would render are split into --workers groups by frame count (longest first, into the
// lightest group), each group one { hawkes_job } on Gen's `unity.render` tool (Director/farm/worker.sh is the script);
// a worker recomputes the hashes on its own tree and renders only matching ones; the files come back with their
// sidecars and `mv final` reuses them. Spending needs J's OK: render/sync refuse until FARM_OK=1 is in the environment
// (the memo's "What J OKs"), and never start a pod themselves: Gen's endpoint scales to zero and bills per second.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, PROJECT, pickVideo } from './mv/score.mjs';

const args = process.argv.slice(2);
const has = (k) => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };
const val = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args.splice(i, 2)[1]; };
const dry = has('dry'), force = has('force'), allowSoftware = has('allow-software');
const V = pickVideo(args[0]); const cmd = args[1] ?? 'plan';
const quality = cmd === 'previs' ? 'previs' : val('quality', 'final');
const w = +val('w', cmd === 'previs' ? 426 : 1280), h = +val('h', cmd === 'previs' ? 240 : 720), fps = +val('fps', cmd === 'previs' ? 12 : 30);
const workers = Math.max(1, +val('workers', cmd === 'previs' ? 2 : 5));
const say = (m) => console.error(m);

// ---------- the price model (Director/docs/render-farm.md "Cost"), overridable by the measured numbers in videos/<v>/final/farm-pace.json
const PACE = Object.assign({
  pricePerHour: 0.58,        // RunPod serverless, RTX A4000 class (AMPERE_16), hawkesgen tools/gpu-providers/runpod-v2.mjs POOL_PRICES
  fixedMinutes: 5,           // per worker: cold start + image, license, snapshot assemble, Library unpack, Unity open, build
  secondsPerFrame: { final: 0.06, draft: 0.04, previs: 0.03 }, // half the laptop's 0.115 at 1280x720 (progress.json perFrame); measured later
}, read(path.join(V.dir, 'final', 'farm-pace.json')) ?? {});

function read(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }

/** The plan `mv final` would make, as JSON (cards compiled in memory, nothing written). */
function planShots() {
  const list = [path.join(DIRECTOR, 'tools', 'final.mjs'), V.name, '--w', w, '--h', h, '--fps', fps, '--plan-json', ...(force ? ['--force'] : [])];
  const r = spawnSync(process.execPath, list.map(String), { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status) throw new Error(r.stderr.slice(-800));
  return JSON.parse(r.stdout);
}

/** Longest shot first into the lightest group: the groups end within one shot of each other. */
export function split(shots, n) {
  const groups = Array.from({ length: Math.min(n, Math.max(1, shots.length)) }, () => ({ frames: 0, shots: [] }));
  for (const s of [...shots].sort((a, b) => (b.f1 - b.f0) - (a.f1 - a.f0))) {
    const g = groups.reduce((m, x) => (x.frames < m.frames ? x : m));
    g.shots.push(s); g.frames += s.f1 - s.f0;
  }
  return groups.filter((g) => g.shots.length);
}

export function price(groups, q = quality) {
  const spf = PACE.secondsPerFrame[q] ?? PACE.secondsPerFrame.final;
  const perWorker = groups.map((g) => PACE.fixedMinutes + (g.frames * spf) / 60);
  const workerMinutes = perWorker.reduce((a, b) => a + b, 0), wall = Math.max(0, ...perWorker);
  return { workerMinutes: +workerMinutes.toFixed(1), wallMinutes: +wall.toFixed(1), dollars: +((workerMinutes / 60) * PACE.pricePerHour).toFixed(2) };
}

// ---------- the project tree: what a worker must have, hashed
/** Every file a render reads: tracked and untracked-not-ignored files of the repo (git's own view), never Library, Temp, captures or shots. */
export function treeFiles() {
  const out = execFileSync('git', ['-C', PROJECT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { maxBuffer: 1 << 28 });
  return out.toString('utf8').split('\0').filter(Boolean).filter((f) => fs.existsSync(path.join(PROJECT, f)));
}
const sha = (file) => { const hsh = crypto.createHash('sha256'); hsh.update(fs.readFileSync(file)); return hsh.digest('hex'); };
export function manifest(files = treeFiles()) {
  const m = {}; let bytes = 0;
  for (const f of files) { const p = path.join(PROJECT, f); m[f] = sha(p); bytes += fs.statSync(p).size; }
  const hash = crypto.createHash('sha256').update(JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]]))).digest('hex').slice(0, 16);
  return { hash, files: m, count: files.length, bytes };
}

async function main() {
  if (cmd === 'plan' || cmd === 'render' || cmd === 'previs') {
    const all = planShots();
    const todo = cmd === 'previs' ? all : all.filter((s) => !s.reuse);
    const groups = split(todo, workers);
    const total = all.reduce((n, s) => n + (s.f1 - s.f0), 0), frames = todo.reduce((n, s) => n + (s.f1 - s.f0), 0);
    const cost = price(groups);
    const local = (frames * (PACE.secondsPerFrame[quality] ?? 0.06) * 2) / 60; // the laptop is about twice as slow per frame
    say(`${V.name} ${w}x${h} ${fps} fps ${quality}: ${todo.length} of ${all.length} shots to render, ${frames} of ${total} frames` + (cmd === 'previs' ? '' : `; ${all.length - todo.length} reused from saved renders`));
    groups.forEach((g, i) => say(`  worker ${i + 1}: ${g.shots.length} shots, ${g.frames} frames (${g.shots.map((s) => s.id).join(', ')})`));
    say(`  about ${cost.wallMinutes} min wall on ${groups.length} worker${groups.length > 1 ? 's' : ''}, ${cost.workerMinutes} worker-minutes, about $${cost.dollars} at $${PACE.pricePerHour}/h (single lane here: about ${local.toFixed(0)} min of Unity)`);
    const tree = cmd === 'plan' && !has('tree') ? null : manifest();
    if (tree) say(`  tree ${tree.hash}: ${tree.count} files, ${(tree.bytes / 1e9).toFixed(2)} GB (tracked + untracked, not ignored)`);
    if (cmd === 'plan') return;
    if (process.env.FARM_OK !== '1') { say('\nNot submitting: the farm spends money. J\'s OK puts FARM_OK=1 in the environment (Director/docs/render-farm.md, "What J OKs").'); process.exitCode = 2; return; }
    if (dry) { say('(--dry: nothing submitted)'); return; }
    // The jobs: one per group, through Hawkes Gen's `unity.render` tool, which runs Director/farm/worker.sh on an endpoint of the
    // unity-render image (hawkesgen docs/3d-animation.md: a { hawkes_job } per script). Not wired yet: the tool lands in hawkesgen with the image.
    throw new Error('the unity.render tool is not in Hawkes Gen yet: this is the step the memo prices and J approves (render-farm.md, "Build order")');
  }
  if (cmd === 'sync') {
    const m = manifest();
    say(`tree ${m.hash}: ${m.count} files, ${(m.bytes / 1e9).toFixed(2)} GB. The sync job sends only blobs the volume's store lacks (by sha256), in jobs of at most 1 GB.`);
    if (dry || process.env.FARM_OK !== '1') { say(dry ? '(--dry)' : 'Not syncing: FARM_OK=1 is J\'s OK to spend.'); return; }
    throw new Error('the unity.render tool (sync mode) is not in Hawkes Gen yet');
  }
  if (cmd === 'test') { // self test: the split is balanced and complete
    const shots = Array.from({ length: 20 }, (_, i) => ({ id: 's' + i, f0: i * 100, f1: i * 100 + 30 + (i % 5) * 40 }));
    const g = split(shots, 5), frames = g.map((x) => x.frames);
    const ok1 = g.flatMap((x) => x.shots).length === 20, ok2 = Math.max(...frames) - Math.min(...frames) <= 190;
    console.log(`${ok1 && ok2 ? 'ok  ' : 'FAIL'} split 20 shots over 5 workers: ${frames.join(', ')} frames`);
    process.exitCode = ok1 && ok2 ? 0 : 1; return;
  }
  throw new Error('farm: plan | sync | render | previs | test');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { say(e.message); process.exitCode = 1; });
