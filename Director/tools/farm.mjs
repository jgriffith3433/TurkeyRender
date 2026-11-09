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
import { HawkesGen } from './mv/hawkesgen.mjs';

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
  const list = new Set(out.toString('utf8').split('\0').filter(Boolean));
  // .gitignore keeps these out of GitHub (too big, or rebuilt), but a render reads them: the clean clips the takes play,
  // the house's textures, and each video's scene (camera and director; the set is rebuilt from the score).
  for (const f of farmExtras()) list.add(f);
  return [...list].filter((f) => { try { return fs.statSync(path.join(PROJECT, f)).isFile(); } catch { return false; } }).sort();
}
export const FARM_EXTRAS = [/^Assets\/MusicVideo\/Motion\/Clean\/[^/]+__clean\.anim(\.meta)?$/, /^Assets\/AtmosphericHouse\/Textures(\.meta|\/.+)$/, /^Assets\/Videos\/[^/]+\/[^/]+\.unity(\.meta)?$/];
function farmExtras() {
  const out = execFileSync('git', ['-C', PROJECT, 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'Assets/MusicVideo/Motion/Clean', 'Assets/AtmosphericHouse', 'Assets/Videos'], { maxBuffer: 1 << 28 });
  return out.toString('utf8').split('\0').filter((f) => f && FARM_EXTRAS.some((re) => re.test(f)));
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
    await renderOnFarm(groups, tree);
    return;
  }
  if (cmd === 'sync') {
    const m = manifest();
    say(`tree ${m.hash}: ${m.count} files, ${(m.bytes / 1e9).toFixed(2)} GB. The sync job sends only blobs the volume's store lacks (by sha256), in jobs of at most 1 GB.`);
    if (dry || process.env.FARM_OK !== '1') { say(dry ? '(--dry)' : 'Not syncing: FARM_OK=1 is J\'s OK to spend.'); return; }
    await syncToFarm(m);
    return;
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

// ---------- the farm, through Hawkes Gen's unity.render (hawkesgen docs/unity-render.md)
const STATE = path.join(DIRECTOR, 'gen', 'farm');
const SYNCED = path.join(STATE, 'synced.json'); // the blobs and manifests the volume's store holds (from the last sync/check job)
const genUrl = val('gen', process.env.FARM_GEN_URL);
const gen = () => new HawkesGen({ url: genUrl, project: 'tkshock' });
const PACK_BYTES = 1e9;
const noRetry = has('no-retry'), timeoutMin = +val('timeout', 80);

function remember(job, outDir) {
  const blobs = path.join(outDir, 'blobs.txt'), mans = path.join(outDir, 'manifests.txt');
  if (!fs.existsSync(blobs)) return;
  fs.mkdirSync(STATE, { recursive: true });
  const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean) : []);
  fs.writeFileSync(SYNCED, JSON.stringify({ when: new Date().toISOString(), job, blobs: lines(blobs), manifests: lines(mans).map((x) => x.replace(/\.json$/, '')) }));
}

async function runJob(g, params, inputs, label) {
  const job = await g.submit('unity.render', { params, inputs, labels: { farm: label } });
  say(`  ${label}: job ${job.id}`);
  // A dropped connection while waiting (Cloud Run instance roll, "fetch failed") is not the job failing: wait again,
  // up to 20 times a minute apart (2026-11-08: sync 1/9 finished on the farm while the wait above it had died).
  let done;
  for (let tries = 0; ; tries++) {
    try { done = await g.wait(job.id, { throwOnFail: false, timeoutMs: 3 * 3600_000 }); break; }
    catch (e) { if (tries >= 20 || !/fetch failed|reach|ECONN|socket|network|timeout|50[234]/i.test(String(e?.message ?? e))) throw e; say(`  ${label}: lost Gen while waiting (${String(e?.message ?? e).slice(0, 80)}); waiting again`); await new Promise((r) => setTimeout(r, 60_000)); }
  }
  const out = path.join(STATE, 'jobs', job.id); fs.mkdirSync(out, { recursive: true });
  for (const o of done.outputs ?? []) await g.download(o.asset, path.join(out, path.basename(String(o.title ?? o.asset))));
  say(`  ${label}: ${done.state}${done.error ? ` (${done.error})` : ''}, ${(done.outputs ?? []).length} files in ${path.relative(DIRECTOR, out)}`);
  return { done, out };
}

/** Sends the blobs the store lacks in tars of at most 1 GB, then the manifest (the worker saves it once every blob is there). */
async function syncToFarm(m) {
  const g = gen();
  if (!fs.existsSync(SYNCED)) { const r = await runJob(g, { mode: 'check' }, {}, 'check'); remember(r.done.id, r.out); }
  const have = new Set((read(SYNCED) ?? {}).blobs ?? []);
  const byHash = new Map();
  for (const [f, hsh] of Object.entries(m.files)) if (!have.has(hsh) && !byHash.has(hsh)) byHash.set(hsh, f);
  const packs = []; let cur = [], size = 0;
  for (const [hsh, f] of byHash) {
    const b = fs.statSync(path.join(PROJECT, f)).size;
    if (cur.length && size + b > PACK_BYTES) { packs.push(cur); cur = []; size = 0; }
    cur.push([hsh, f]); size += b;
  }
  if (cur.length) packs.push(cur);
  say(`${byHash.size} blobs to send in ${packs.length} pack${packs.length === 1 ? '' : 's'} (${have.size} already on the volume)`);
  fs.mkdirSync(STATE, { recursive: true });
  const man = path.join(STATE, `manifest-${m.hash}.json`);
  fs.writeFileSync(man, JSON.stringify({ hash: m.hash, files: m.files }));
  for (const [i, pack] of packs.entries()) {
    const dir = path.join(STATE, 'pack'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    for (const [hsh, f] of pack) fs.copyFileSync(path.join(PROJECT, f), path.join(dir, hsh));
    const tar = path.join(STATE, `pack-${i}.tar`);
    // Windows: Git Bash's GNU tar reads "C:\..." as a remote host ("Cannot connect to C: resolve failed"); Windows' own
    // bsdtar doesn't, so use it by full path there. Elsewhere, plain tar.
    const tarBin = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tarBin, ['-cf', tar, '-C', dir, '.']); fs.rmSync(dir, { recursive: true, force: true });
    const last = i === packs.length - 1;
    const r = await runJob(g, { mode: 'sync' }, { pack: tar, ...(last ? { manifest: man } : {}) }, `sync ${i + 1}/${packs.length}`);
    remember(r.done.id, r.out); fs.rmSync(tar, { force: true });
    if (r.done.state !== 'done') throw new Error(`sync pack ${i + 1} failed: ${r.done.error ?? r.done.state}`);
  }
  if (!packs.length) { const r = await runJob(g, { mode: 'sync' }, { manifest: man }, 'manifest'); remember(r.done.id, r.out); }
  const ok = ((read(SYNCED) ?? {}).manifests ?? []).includes(m.hash);
  say(ok ? `manifest ${m.hash} is on the volume: renders can name it` : `manifest ${m.hash} not saved yet (blobs missing): run sync again`);
}

/** One unity.render job per group, all at once; files into final/<w>x<h>-<fps>[@previs]/; missing shots resubmitted once; the pace learned. */
async function renderOnFarm(groups, tree) {
  if (!((read(SYNCED) ?? {}).manifests ?? []).includes(tree.hash)) throw new Error(`tree ${tree.hash} is not on the farm's volume: run 'mv farm sync' first`);
  const g = gen();
  // Previs files are named by the final hash but rendered at previs quality: their own folder, never mixed into a final.
  const dest = path.join(V.dir, 'final', `${w}x${h}-${fps}${quality === 'final' ? '' : '@' + quality}`); fs.mkdirSync(dest, { recursive: true });
  const t0 = Date.now(), seen = [];
  const jobOf = (shots) => ({ video: V.name, w, h, fps, quality, snapshot: { kind: 'manifest', manifestHash: tree.hash }, shots: shots.map(({ id, hash, f0, f1, parts }) => ({ id, hash, f0, f1, parts })), timeoutMin, allowSoftware });
  const take = (out, shots) => {
    const got = [];
    for (const s of shots) {
      const base = `${s.id}-${s.hash}`;
      if (!fs.existsSync(path.join(out, base + '.mp4'))) continue;
      for (const ext of ['.mp4', '.json']) if (fs.existsSync(path.join(out, base + ext))) fs.copyFileSync(path.join(out, base + ext), path.join(dest, base + ext));
      got.push(s.id);
    }
    const wj = read(path.join(out, 'worker.json'));
    if (wj) seen.push({ ...wj, frames: shots.reduce((n, s) => n + s.f1 - s.f0, 0), stages: fs.existsSync(path.join(out, 'stages.txt')) ? fs.readFileSync(path.join(out, 'stages.txt'), 'utf8').trim().split(/\s+/).join(' ') : null });
    return got;
  };
  const wave = async (grps, tag) => {
    const res = await Promise.all(grps.map((grp, i) => runJob(g, { mode: 'render', job: jobOf(grp.shots) }, {}, `${tag} ${i + 1}`).then((r) => ({ r, grp }))));
    return res.flatMap(({ r, grp }) => { const got = new Set(take(r.out, grp.shots)); return grp.shots.filter((s) => !got.has(s.id)); });
  };
  let missing = await wave(groups, 'worker');
  if (missing.length && !noRetry) {
    say(`${missing.length} shots came back missing (${missing.map((s) => s.id).join(', ')}): resubmitting once (same hashes)`);
    missing = await wave(split(missing, Math.min(groups.length, missing.length)), 'retry');
  }
  const wall = (Date.now() - t0) / 60_000;
  const ran = seen.filter((x) => x.seconds);
  if (ran.length) {
    const workerMin = ran.reduce((n, x) => n + x.seconds / 60, 0);
    const pace = read(path.join(V.dir, 'final', 'farm-pace.json')) ?? {};
    pace.measured = [...(pace.measured ?? []), {
      when: new Date().toISOString(), quality, w, h, fps, workers: groups.length, wallMinutes: +wall.toFixed(1), workerMinutes: +workerMin.toFixed(1),
      dollars: +((workerMin / 60) * PACE.pricePerHour).toFixed(3), missing: missing.map((s) => s.id),
      perWorker: ran.map((x) => ({ ok: x.ok, gpu: x.gpu, display: x.display, seconds: x.seconds, frames: x.frames, stages: x.stages, error: x.error })),
    }].slice(-20);
    fs.writeFileSync(path.join(V.dir, 'final', 'farm-pace.json'), JSON.stringify(pace, null, 1));
    say(`measured: ${wall.toFixed(1)} min wall, ${workerMin.toFixed(1)} worker-minutes, about $${((workerMin / 60) * PACE.pricePerHour).toFixed(2)} (final/farm-pace.json)`);
  }
  say(missing.length ? `still missing ${missing.length} shots: ${missing.map((s) => s.id).join(', ')}` : `all shots are in ${path.relative(DIRECTOR, dest)}`);
  if (quality === 'final') say(`then: mv final --w ${w} --h ${h} --fps ${fps} stitches them as reused shots`);
  process.exitCode = missing.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { say(e.message); process.exitCode = 1; });
