// mv doctor [--fix] [--all]: the state of the shared machine in one screen, and the safe fixes. Checks: Unity alive (heartbeat), compile errors on
// disk, a stale compile.lock, a hand-made unity.lock, dead queue tickets, Assets vs staging drift, stale or hand-edited generated files (the
// current video; --all every video), leases held by dead agents, disk and memory. --fix: breaks a dead compile.lock, drops dead leases, dead
// tickets and old snaps, regenerates stale generated files. It never touches Assets, cards or acts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PROJECT, DIRECTOR, listVideos, videoInfo } from './score.mjs';
import { tickets } from './queue.mjs';
import { lockHolder, LOCK, check as csharpCheck } from './csharp.mjs';
import { check as genCheck, regen } from './generated.mjs';
import { status as leaseStatus, sweep as leaseSweep } from './lease.mjs';
import { sweep as snapSweep } from './snap.mjs';
import { alive } from './who.mjs';
import { spawnSync } from 'node:child_process';
import { drift as freezeDrift } from './freeze.mjs';

const GB = (b) => (b / 1e9).toFixed(1) + ' GB';
export const UNITY_EXE = 'C:\\Program Files\\Unity\\Hub\\Editor\\6000.3.7f1\\Editor\\Unity.exe';

/** The Unity editor for this project from the process list: { known, editor: { pid, responding, cpu } | null, others: [..], exe }.
 *  known false when the list can't be read (not Windows, PowerShell missing): then the heartbeat alone decides. Exported for the self test. */
export function unityEditor(list = null) {
  if (!list) {
    if (process.platform !== 'win32') return { known: false, editor: null, others: [] };
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='Unity.exe'\" | ForEach-Object { $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; [pscustomobject]@{ pid = $_.ProcessId; cmd = $_.CommandLine; responding = $(if ($p) { $p.Responding } else { $null }); cpu = $(if ($p) { $p.CPU } else { $null }) } } | ConvertTo-Json -Compress";
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
    if (r.status !== 0) return { known: false, editor: null, others: [] };
    try { const j = r.stdout.trim() ? JSON.parse(r.stdout) : []; list = Array.isArray(j) ? j : [j]; } catch { return { known: false, editor: null, others: [] }; }
  }
  const norm = (s) => String(s ?? '').replace(/\\/g, '/').toLowerCase(), proj = norm(PROJECT);
  let editor = null; const others = [];
  for (const p of list) {
    const c = norm(p.cmd);
    if (/-batchmode/.test(c)) continue; // import workers and batch builds
    if (/\sserve\b/.test(c) || /unity hub/.test(c)) { others.push(`Unity Hub helper (pid ${p.pid})`); continue; }
    const m = /-projectpath\s+"?([^"]+?)"?(\s+-|\s*$)/.exec(c);
    if (m && m[1].replace(/\/+$/, '') === proj) editor = { pid: p.pid, responding: p.responding, cpu: p.cpu, exe: (/^"([^"]+)"/.exec(p.cmd ?? '') ?? [])[1] };
    else others.push(m ? `an editor on another project (${m[1]}, pid ${p.pid})` : `Unity.exe pid ${p.pid}`);
  }
  return { known: true, editor, others, exe: editor?.exe ?? null };
}

export function diagnose(V, { all = false } = {}) {
  const items = [], add = (sev, what, msg, fix, fixable, video) => items.push({ sev, what, msg, fix, fixable, video });

  // Unity
  let hb = null; try { hb = JSON.parse(fs.readFileSync(path.join(DIRECTOR, 'heartbeat.json'), 'utf8')); } catch {}
  const age = hb ? (Date.now() - new Date(hb.utc).getTime()) / 1000 : Infinity;
  const running = tickets(path.join(DIRECTOR, 'gen', 'queue'))[0];
  // Closed or hung? A stale heartbeat alone can't tell. The process list can: the editor is Unity.exe with -projectPath <this project> and no
  // -batchMode (the AssetImportWorkers are batch children, and Unity Hub's own "unity.exe serve" helper is not an editor at all).
  const ed = unityEditor(), openCmd = `"${ed.exe ?? UNITY_EXE}" -projectPath ${PROJECT}`;
  const ageText = !hb ? 'none' : age < 3600 ? `${age.toFixed(0)} s` : `${(age / 3600).toFixed(1)} h`;
  if (ed.known && !ed.editor) add('error', 'unity', `Unity is CLOSED: no editor process for this project (heartbeat ${ageText} old${ed.others.length ? `; running: ${ed.others.join('; ')}` : ''})`, `Nothing is hung, so nothing to kill. Reopen it (detached, it takes 2-4 min to import): start "" ${openCmd}   then mv doctor again until the heartbeat is fresh. Queued tickets wait meanwhile.`);
  else if (!hb) add('error', 'unity', 'no heartbeat.json: Unity has never run the bridge here', `Open the project in Unity: ${openCmd}`);
  else if (age > 8 && age < 600 && running) add('ok', 'unity', `Unity busy in "${running.label}" (heartbeat ${age.toFixed(0)} s ago; a long call or render holds the editor)`);
  else if (age > 8) add('error', 'unity', `Unity is open but not answering: heartbeat ${ageText} old${hb.compiling ? ' (it was compiling)' : ''}${ed.editor ? ` (editor pid ${ed.editor.pid}${ed.editor.responding === false ? ', Windows says NOT RESPONDING' : ''}${ed.editor.cpu != null ? `, ${ed.editor.cpu.toFixed(0)} s CPU so far` : ''})` : ''}`, 'Hung, in a modal dialog (a Safe Mode or "script changed" prompt), or a domain reload that never ended. Look at it (bring it to the front); never kill it from an agent: tell J, who restarts it.');
  else add('ok', 'unity', `Unity alive (heartbeat ${age.toFixed(1)} s ago${hb.compiling ? ', compiling' : ''}${hb.playing ? ', PLAYING' : ''}${ed.editor ? `, pid ${ed.editor.pid}` : ''})`);
  const errFile = path.join(DIRECTOR, 'compile-errors.txt');
  if (fs.existsSync(errFile)) { const e = fs.readFileSync(errFile, 'utf8').trim().split('\n'); add('error', 'compile', `Assets does not compile: ${e.length} error${e.length === 1 ? '' : 's'}; first: ${e[0].slice(0, 160)}`, 'Whoever applied last fixes it or reverts (mv csharp apply reverts by itself). Every build fails until then.'); }
  else add('ok', 'compile', 'no compile errors on disk');

  // locks and the queue
  const lh = lockHolder();
  if (lh && lh.stale) add('warn', 'compile.lock', `compile.lock left by ${lh.who} since ${lh.since} (process gone)`, 'mv doctor --fix removes it (or mv csharp lock break).', 'lock');
  else if (lh) add('ok', 'compile.lock', `compile.lock held by ${lh.who} since ${lh.since} (alive)`);
  else add('ok', 'compile.lock', 'compile.lock free');
  const ul = path.join(DIRECTOR, 'gen', 'unity.lock');
  if (fs.existsSync(ul)) { const s = fs.readFileSync(ul, 'utf8').trim(); if (!s.startsWith('queue ')) add('warn', 'unity.lock', `a hand-made unity.lock ("${s.slice(0, 40)}", ${((Date.now() - fs.statSync(ul).mtimeMs) / 60e3).toFixed(0)} min old)`, 'Never make it by hand: the queue writes it. Delete it if it is yours; the queue drops it after 10 min.'); }
  const q = tickets(path.join(DIRECTOR, 'gen', 'queue')); // tickets() already drops dead and silent ones
  add('ok', 'queue', q.length ? `Unity queue: ${q.map((t, i) => `${i ? 'waiting' : 'running'} ${t.label} (pid ${t.pid}, ${(t.age / 1000).toFixed(0)} s since its last beat)`).join('; ')}` : 'Unity queue empty');

  // Assets vs staging
  const cs = csharpCheck(), drift = cs.filter((x) => x.state === 'drift'), newer = cs.filter((x) => x.state === 'staged-newer'), old = cs.filter((x) => x.state === 'stale-staging');
  if (drift.length) add('error', 'staging', `${drift.length} applied file${drift.length === 1 ? '' : 's'} changed in Assets by hand since mv csharp apply: ${drift.slice(0, 4).map((x) => `${x.rel} (applied by ${x.who})`).join(', ')}`, 'Hand edits into Assets are forbidden: stage the change and mv csharp apply it, or restore the applied version. mv csharp check lists them.');
  else add('ok', 'staging', `no drift after applies (${cs.length} staged files: ${newer.length} not yet applied, ${old.length} old staging copies)`);
  if (newer.length) add('note', 'staging', `staged and not applied: ${newer.slice(0, 5).map((x) => `${x.rel} (${x.role})`).join(', ')}`, 'mv csharp apply Director/staging/<role> when it is ready.');

  // generated files
  const videos = all ? listVideos().map(videoInfo) : [V];
  for (const v of videos) {
    const g = genCheck(v.dir), bad = g.filter((x) => x.state !== 'ok');
    if (!g.length) continue;
    if (!bad.length) add('ok', `generated ${v.name}`, `${g.length} generated file${g.length === 1 ? '' : 's'} fresh`);
    for (const x of bad) add(x.state === 'edited' ? 'error' : x.state === 'unregistered' ? 'note' : 'warn', `generated ${v.name}`, `${x.file} is ${x.state}${x.changed ? ` (${x.changed.slice(0, 3).join(', ')} changed)` : ''}`, x.state === 'edited' ? `A hand edit on a generated file: ${x.tool ?? 'its tool'} will throw it away. Move the change into the tool or its inputs.` : x.tool ? `mv doctor --fix runs: ${x.tool}` : 'mv generated adopt <video> <file> --tool "<command>"', (x.state === 'stale' || x.state === 'unverified') && x.tool ? 'regen' : undefined, v);
  }

  // leases
  const ls = leaseStatus(), dead = ls.filter((l) => l.dead);
  if (dead.length) add('warn', 'leases', `${dead.length} lease${dead.length === 1 ? '' : 's'} held by agents whose process is gone for over 4 h: ${dead.map((l) => `${l.path} (${l.who})`).join(', ')}`, 'mv doctor --fix releases them.', 'leases');
  else add('ok', 'leases', ls.length ? `${ls.length} lease${ls.length === 1 ? '' : 's'} held, all fresh (mv lease status)` : 'no leases');

  // the machine
  try { const st = fs.statfsSync(PROJECT); const free = st.bavail * st.bsize; if (free < 10e9) add(free < 3e9 ? 'error' : 'warn', 'disk', `${GB(free)} free on the project drive`, 'Renders and snapshots fill it: clear Director/videos/*/captures, old finals, Director/gen/csharp snapshots.'); else add('ok', 'disk', `${GB(free)} free on the project drive`); } catch {}
  const freeMem = os.freemem(), total = os.totalmem();
  if (freeMem < 1.5e9) add('warn', 'memory', `${GB(freeMem)} of ${GB(total)} free: Unity is 6-10 GB here, a second heavy process pages it out`, 'Close what you can; never start a second Unity (AGENTS.md "One Unity on this laptop").');
  else add('ok', 'memory', `${GB(freeMem)} of ${GB(total)} free`);

  // what mv make needs (tools/mv/make.mjs): ffmpeg, no failed build on record, frozen videos whose engine moved, no half renders or mailbox leftovers
  for (const t of ['ffmpeg', 'ffprobe']) { const r = spawnSync(t, ['-version'], { encoding: 'utf8' }); if (r.status !== 0) add('error', t, `${t} is not on PATH`, 'Every render, strip and check needs it: C:\\ffmpeg\\bin on this machine; add it to PATH.'); }
  for (const v of videos) {
    let b = null; try { b = JSON.parse(fs.readFileSync(path.join(DIRECTOR, 'gen', `build-${v.name}.json`), 'utf8')); } catch {}
    if (b && b.ok === false) add('warn', `build ${v.name}`, `the last build failed (${String(b.failedAt ?? '').slice(0, 16)}): ${b.why}`, 'mv cards (or mv build) before any frame or render; frame, shot, render and previs refuse a stale scene.');
    try { const d = freezeDrift(v); if (d && (d.engine || d.model)) add('warn', `freeze ${v.name}`, `frozen ${d.frozen.at.slice(0, 16)} and the ${d.engine ? 'engine' : 'model'} changed since: a final re-renders every shot`, 'Put the change back, or mv thaw and accept a full render.'); } catch {}
    let parts = 0; const fd = path.join(v.dir, 'final');
    try { for (const d of fs.readdirSync(fd)) { const dd = path.join(fd, d); if (!fs.statSync(dd).isDirectory()) continue; for (const f of fs.readdirSync(dd)) if (/\.part\.mp4$/.test(f) && Date.now() - fs.statSync(path.join(dd, f)).mtimeMs > 3600e3) parts++; } } catch {}
    if (parts) add('warn', `final ${v.name}`, `${parts} half-rendered .part.mp4 over an hour old in its final cache`, 'A render that died: mv doctor --fix removes them.', 'parts', v);
  }
  let mail = 0; for (const box of ['inbox', 'outbox']) { try { for (const f of fs.readdirSync(path.join(DIRECTOR, box))) if (Date.now() - fs.statSync(path.join(DIRECTOR, box, f)).mtimeMs > 3600e3) mail++; } catch {} }
  if (mail) add('warn', 'mailbox', `${mail} file${mail === 1 ? '' : 's'} over an hour old in Director/inbox or outbox (a call nobody collected)`, 'mv doctor --fix removes them.', 'mailbox');
  return items;
}

export function fix(items) {
  const done = [], regened = new Set();
  for (const it of items) {
    if (it.fixable === 'regen' && it.video && regened.has(it.video.name)) continue;
    if (it.fixable === 'regen' && it.video) regened.add(it.video.name);
    if (it.fixable === 'lock') { try { fs.unlinkSync(LOCK); done.push('removed the dead compile.lock'); } catch {} }
    if (it.fixable === 'leases') { const r = leaseSweep(); if (r.length) done.push(`released dead leases: ${r.join(', ')}`); }
    if (it.fixable === 'parts' && it.video) { let n = 0; const fd = path.join(it.video.dir, 'final'); try { for (const d of fs.readdirSync(fd)) { const dd = path.join(fd, d); if (!fs.statSync(dd).isDirectory()) continue; for (const f of fs.readdirSync(dd)) if (/\.part\.mp4$/.test(f) && Date.now() - fs.statSync(path.join(dd, f)).mtimeMs > 3600e3) { fs.unlinkSync(path.join(dd, f)); n++; } } } catch {} if (n) done.push(`removed ${n} half renders of ${it.video.name}`); }
    if (it.fixable === 'mailbox') { let n = 0; for (const box of ['inbox', 'outbox']) { try { for (const f of fs.readdirSync(path.join(DIRECTOR, box))) if (Date.now() - fs.statSync(path.join(DIRECTOR, box, f)).mtimeMs > 3600e3) { fs.unlinkSync(path.join(DIRECTOR, box, f)); n++; } } catch {} } if (n) done.push(`removed ${n} old mailbox files`); }
    if (it.fixable === 'regen' && it.video) { const r = regen(it.video.dir, genCheck(it.video.dir)); if (r.ran.length) done.push(`regenerated ${it.video.name}: ${r.ran.join(', ')}`); for (const f of r.failed) done.push(`FAILED to regenerate ${f.files.join(', ')}: ${f.out.split('\n').at(-1)}`); }
  }
  const s = snapSweep(); if (s.length) done.push(`removed ${s.length} old snaps`);
  return done;
}

export function run(pos, flags, V) {
  const items = diagnose(V, { all: !!flags.all });
  const mark = { ok: '  ok ', warn: 'WARN ', error: 'FAIL ', note: 'note ' };
  for (const it of items) console.log(`${mark[it.sev]} ${it.what.padEnd(22)} ${it.msg}${it.fix && it.sev !== 'ok' ? `\n       fix: ${it.fix}` : ''}`);
  if (flags.fix) { const d = fix(items); console.log(d.length ? `fixed: ${d.join('; ')}` : 'nothing to fix'); }
  const bad = items.filter((x) => x.sev === 'error').length;
  console.log(`doctor: ${bad} failing, ${items.filter((x) => x.sev === 'warn').length} warnings${flags.all ? '' : ` (video ${V.name}; --all for every video)`}`);
  if (bad) process.exitCode = 1;
}
