// The only sanctioned way C# and shaders reach Assets: `mv csharp apply <staging-dir>`. Hand-copying into Assets is forbidden (AGENTS.md).
// Staged files live in Director/staging/<role>/Assets/... (the same path as in the project). apply:
//   1. takes Director/gen/compile.lock (refuses while another holder's process is alive; breaks a lock whose process is dead),
//   2. reads every staged file against its Assets copy, skips the identical ones, and runs a quick text check (an unclosed string, unbalanced braces:
//      the two breaks of 2026-11-08) so a sure failure never reaches Unity,
//   3. snapshots the Assets files it will replace into Director/gen/csharp/<stamp>-<who>/, copies the staged files in,
//   4. compiles through the queue (mv's own refresh + heartbeat wait) and reads Director/compile-errors.txt,
//   5. on any error: puts the snapshot back (new files deleted, with their .meta), compiles again so Assets is clean, and reports file:line,
//   6. writes one line to Director/gen/WORKLOG-epic.md either way (who, files, result).
// `mv csharp check` diffs Assets against every staging dir and flags drift; `mv csharp lock [status|break]` for the lock.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT, DIRECTOR } from './score.mjs';
import { who as whoAmI, alive } from './who.mjs';
import { warnIfLeased } from './lease.mjs';

export const LOCK = process.env.MV_COMPILE_LOCK || path.join(DIRECTOR, 'gen', 'compile.lock'); // the env override is for harden-test.mjs only
const STAGING = path.join(DIRECTOR, 'staging');
const SNAPS = process.env.MV_CSHARP_SNAPS || path.join(DIRECTOR, 'gen', 'csharp'); // env overrides: harden-test.mjs only, so its pretend applies never touch the real Assets, record or WORKLOG
const WORKLOG = process.env.MV_WORKLOG || path.join(DIRECTOR, 'gen', 'WORKLOG-epic.md');
export const ROOT = process.env.MV_CSHARP_ROOT || PROJECT; // the project whose Assets receive the files (a sandbox in harden-test.mjs)
const relA = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const CODE = /\.(cs|shader|hlsl|cginc|compute|asmdef|uss|uxml)$/i;
const LOCK_OLD_MS = 30 * 60e3;
const rel = (f) => path.relative(PROJECT, f).replace(/\\/g, '/');

// ---- the lock ----
export function lockHolder() {
  let s; try { s = fs.readFileSync(LOCK, 'utf8'); } catch { return null; }
  let o; try { o = JSON.parse(s); } catch { o = { who: s.trim() || 'someone (hand-made lock)', pid: 0, since: new Date(fs.statSync(LOCK).mtime).toISOString(), hand: true }; }
  const age = Date.now() - new Date(o.since).getTime();
  return { ...o, alive: alive(o.pid), stale: !alive(o.pid) && (o.hand ? age > LOCK_OLD_MS : true) };
}
export function takeLock(who) {
  const h = lockHolder();
  if (h && !h.stale) throw new Error(`compile.lock is held by ${h.who} since ${h.since} (pid ${h.pid}${h.alive ? ', alive' : ''}). Wait, or if you are sure it is dead: mv csharp lock break`);
  if (h) console.error(`note: compile.lock was left by ${h.who} (${h.pid ? `pid ${h.pid} is gone` : 'a hand-made lock, old'}); taking it`);
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  fs.writeFileSync(LOCK, JSON.stringify({ who, pid: process.pid, since: new Date().toISOString() }));
}
export function releaseLock() { try { const h = lockHolder(); if (h && h.pid === process.pid) fs.unlinkSync(LOCK); } catch {} }

// ---- the quick text check: what a compiler would refuse at once ----
/** Problems a glance finds in C#, HLSL or a shader: a string that runs off its line, braces or parens that don't balance. [{line, msg}] */
export function quickCheck(text, file = '') {
  const out = [], isCs = /\.cs$/i.test(file);
  let depth = 0, paren = 0, line = 1, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { if (text[i] === '\n') line++; i++; } i += 2; continue; }
    if (isCs && c === '\'' ) { // a char literal: 'x', '\n', 'A'
      let j = i + 1; if (text[j] === '\\') { j += 2; while (j < n && /[0-9a-fA-Fx]/.test(text[j]) && text[j - 1] !== '\'') j++; } else j++;
      if (text[j] === '\'') { i = j + 1; continue; }
      out.push({ line, msg: 'a char literal that does not close' }); i++; continue;
    }
    if (c === '"' || (isCs && (c === '$' || c === '@') && (d === '"' || ((d === '$' || d === '@') && text[i + 2] === '"')))) {
      let j = i; while (text[j] !== '"') j++;
      const verbatim = text.slice(i, j).includes('@'), start = line;
      j++;
      for (;;) {
        if (j >= n) { out.push({ line: start, msg: 'a string that never closes' }); break; }
        const e = text[j];
        if (verbatim) { if (e === '"') { if (text[j + 1] === '"') { j += 2; continue; } j++; break; } if (e === '\n') line++; j++; continue; }
        if (e === '\\') { j += 2; continue; }
        if (e === '"') { j++; break; }
        if (e === '\n') { out.push({ line: start, msg: 'a string literal runs off the end of its line (a real newline inside "...": use \\n)' }); line++; j++; break; }
        j++;
      }
      i = j; continue;
    }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth < 0) { out.push({ line, msg: 'a } with no { open' }); depth = 0; } }
    else if (c === '(') paren++; else if (c === ')') { paren--; if (paren < 0) { out.push({ line, msg: 'a ) with no ( open' }); paren = 0; } }
    i++;
  }
  if (depth > 0) out.push({ line, msg: `${depth} { never closed` });
  if (paren > 0) out.push({ line, msg: `${paren} ( never closed` });
  return out;
}

// ---- staged files ----
function assetsRoot(stagingDir) {
  for (const d of [path.resolve(stagingDir), path.resolve(PROJECT, stagingDir), path.join(STAGING, stagingDir)]) {
    if (path.basename(d) === 'Assets' && fs.existsSync(d)) return d;
    if (fs.existsSync(path.join(d, 'Assets'))) return path.join(d, 'Assets');
  }
  throw new Error(`${stagingDir}: no Assets/ folder under it. Staged files mirror the project: Director/staging/<role>/Assets/MusicVideo/Runtime/X.cs`);
}
/** Every staged code file: {staged, target (abs in Assets), rel, same, newFile}. */
export function stagedFiles(stagingDir) {
  const root = assetsRoot(stagingDir), out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(_backup|orig|current)$/i.test(e.name)) walk(p); continue; } if (!CODE.test(e.name) && !e.name.endsWith('.meta')) continue; const target = path.join(ROOT, 'Assets', path.relative(root, p)); const exists = fs.existsSync(target); out.push({ staged: p, target, rel: relA(target), newFile: !exists, same: exists && fs.readFileSync(p).equals(fs.readFileSync(target)), stagedNewer: !exists || fs.statSync(p).mtimeMs > fs.statSync(target).mtimeMs }); } };
  walk(root);
  return out;
}

// What the last sanctioned apply put in Assets, per file: a hash. Assets differing from it is drift (a hand edit after the apply).
const APPLIED = path.join(SNAPS, 'applied.json');
const hashOf = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
export function applied() { try { return JSON.parse(fs.readFileSync(APPLIED, 'utf8')); } catch { return {}; } }
function recordApplied(files, who) { const a = applied(); for (const f of files) { try { a[f.rel] = { hash: hashOf(fs.readFileSync(f.target)), who, at: new Date().toISOString(), from: rel(f.staged) }; } catch {} } fs.mkdirSync(SNAPS, { recursive: true }); fs.writeFileSync(APPLIED, JSON.stringify(a, null, 1)); }

function logLine(text) { try { fs.appendFileSync(WORKLOG, `\n- ${new Date().toISOString().replace('T', ' ').slice(0, 16)}, ${text}\n`); } catch {} }

/**
 * ctx.compile(): async, triggers the compile and returns the error lines (file:line message). ctx.who. ctx.dry: everything but the copy.
 * Returns {ok, applied:[rel], errors:[...], snapshot}.
 */
export async function apply(stagingDir, ctx) {
  const who = ctx.who ?? whoAmI();
  const files = stagedFiles(stagingDir), todo = files.filter((f) => !f.same && CODE.test(f.rel));
  if (!todo.length) {
    // Nothing to copy. Still: a staged file equal to Assets is the sanctioned text now, so the apply record follows it (this is how a DRIFT is cleared
    // once the Assets text is what someone meant: stage it and apply).
    const same = files.filter((f) => f.same && CODE.test(f.rel)), rec = applied(), fixed = same.filter((f) => { try { return rec[f.rel] && rec[f.rel].hash !== hashOf(fs.readFileSync(f.target)); } catch { return false; } });
    if (fixed.length && !ctx.dry) { recordApplied(fixed, who); logLine(`${who}: mv csharp apply ${rel(path.resolve(stagingDir))}: record updated for ${fixed.map((f) => path.basename(f.rel)).join(', ')} (Assets already had the staged text)`); }
    console.log(`nothing to apply: every staged file in ${stagingDir} is already in Assets${fixed.length ? `; the apply record now matches ${fixed.map((f) => path.basename(f.rel)).join(', ')} (drift cleared)` : ''}`);
    return { ok: true, applied: [], errors: [], recorded: fixed.map((f) => f.rel) };
  }
  const bad = [];
  for (const f of todo) for (const p of quickCheck(fs.readFileSync(f.staged, 'utf8'), f.rel)) bad.push(`${rel(f.staged)}:${p.line} ${p.msg}`);
  if (bad.length) { logLine(`${who}: mv csharp apply ${rel(path.resolve(stagingDir))}: REFUSED before Unity (${bad.length} text problems: ${bad[0]})`); throw new Error(`not applied: these would not compile\n  ${bad.join('\n  ')}`); }
  for (const f of todo) warnIfLeased(f.target, who);
  const metas = todo.filter((f) => f.newFile).map((f) => files.find((m) => m.staged === f.staged + '.meta')).filter(Boolean);
  console.error(`applying ${todo.length} file${todo.length === 1 ? '' : 's'} from ${rel(path.resolve(stagingDir))}:\n  ${todo.map((f) => `${f.rel}${f.newFile ? ' (new)' : ''}`).join('\n  ')}`);
  if (ctx.dry) { console.log('(dry: nothing copied)'); return { ok: true, applied: [], errors: [], dry: true }; }

  takeLock(who);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), snap = path.join(SNAPS, `${stamp}-${who}-${process.pid}${Math.random().toString(36).slice(2, 5)}`);
  try {
    fs.mkdirSync(snap, { recursive: true });
    const manifest = { who, at: new Date().toISOString(), staging: rel(path.resolve(stagingDir)), files: todo.map((f) => ({ rel: f.rel, newFile: f.newFile })) };
    for (const f of todo) if (!f.newFile) { const to = path.join(snap, f.rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(f.target, to); if (fs.existsSync(f.target + '.meta')) fs.copyFileSync(f.target + '.meta', to + '.meta'); }
    fs.writeFileSync(path.join(snap, 'manifest.json'), JSON.stringify(manifest, null, 1));
    for (const f of todo) { fs.mkdirSync(path.dirname(f.target), { recursive: true }); fs.copyFileSync(f.staged, f.target); }
    for (const m of metas) fs.copyFileSync(m.staged, m.target);

    let errors = await ctx.compile();
    if (errors.length) {
      console.error(`compile FAILED (${errors.length} error${errors.length === 1 ? '' : 's'}); putting the snapshot back`);
      restore(snap, manifest);
      const again = await ctx.compile();
      const own = errors.filter((e) => todo.some((f) => e.replace(/\\/g, '/').includes(f.rel)));
      logLine(`${who}: mv csharp apply ${manifest.staging}: REVERTED (${errors.length} compile errors; first: ${errors[0].slice(0, 140)}). Assets ${again.length ? 'STILL BROKEN after restore: ' + again[0].slice(0, 100) : 'back to the previous good code'}.`);
      return { ok: false, applied: [], errors, ownErrors: own, snapshot: rel(snap), restoredClean: !again.length };
    }
    recordApplied(todo, who);
    logLine(`${who}: mv csharp apply ${manifest.staging}: OK (${todo.map((f) => path.basename(f.rel)).join(', ')}); snapshot ${rel(snap)}`);
    return { ok: true, applied: todo.map((f) => f.rel), errors: [], snapshot: rel(snap) };
  } finally { releaseLock(); }
}

function restore(snap, manifest) {
  for (const f of manifest.files) {
    const target = path.join(ROOT, f.rel);
    if (f.newFile) { for (const p of [target, target + '.meta']) try { fs.unlinkSync(p); } catch {} continue; }
    const from = path.join(snap, f.rel);
    fs.copyFileSync(from, target);
    if (fs.existsSync(from + '.meta')) fs.copyFileSync(from + '.meta', target + '.meta');
  }
}

/**
 * Assets against every staging dir and the apply record. Per staged file: same | staged-newer (differs, staging is newer: not applied yet) |
 * stale-staging (differs, Assets moved on since: an old copy) | not-in-assets. Per applied file: drift when Assets no longer matches what the
 * last `mv csharp apply` put there (a hand edit into Assets, the forbidden path).
 */
export function check(only) {
  const out = [];
  if (fs.existsSync(STAGING)) for (const role of fs.readdirSync(STAGING)) {
    if (only && role !== only) continue;
    const d = path.join(STAGING, role);
    if (!fs.statSync(d).isDirectory() || !fs.existsSync(path.join(d, 'Assets'))) continue;
    for (const f of stagedFiles(d)) {
      if (f.rel.endsWith('.meta')) continue;
      out.push({ role, rel: f.rel, state: f.same ? 'same' : f.newFile ? 'not-in-assets' : f.stagedNewer ? 'staged-newer' : 'stale-staging', staged: rel(f.staged) });
    }
  }
  if (!only) for (const [r, a] of Object.entries(applied())) {
    const abs = path.join(ROOT, r); let now = null; try { now = hashOf(fs.readFileSync(abs)); } catch {}
    if (now !== a.hash) out.push({ role: 'applied', rel: r, state: 'drift', staged: a.from, who: a.who, at: a.at, gone: now === null });
  }
  return out;
}

export function printCheck(items) {
  const drift = items.filter((x) => x.state === 'drift'), newer = items.filter((x) => x.state === 'staged-newer'), missing = items.filter((x) => x.state === 'not-in-assets'), old = items.filter((x) => x.state === 'stale-staging');
  for (const x of drift) console.log(`DRIFT         ${x.rel.padEnd(52)} ${x.gone ? 'is GONE from Assets' : 'changed in Assets'} since ${x.who} applied it ${x.at} from ${x.staged}: a hand edit into Assets (forbidden). Stage it and mv csharp apply, or put the applied version back.`);
  for (const x of newer) console.log(`staged-newer  ${x.rel.padEnd(52)} ${x.staged} differs and is newer: not applied yet (mv csharp apply ${x.staged.split('/').slice(0, 3).join('/')})`);
  for (const x of missing) console.log(`not-in-assets ${x.rel.padEnd(52)} only in ${x.staged}`);
  console.log(`csharp check: ${items.filter((x) => x.state === 'same').length} same, ${newer.length} staged newer, ${old.length} old staging copies (Assets moved on), ${missing.length} not in Assets, ${drift.length} DRIFT after an apply (${new Set(items.map((x) => x.role)).size} dirs)`);
  return drift.length;
}

export function run(pos, flags, ctx) {
  const [sub, arg] = pos;
  if (sub === 'check') { const n = printCheck(check(arg)); if (n) process.exitCode = 1; return; }
  if (sub === 'lock') {
    if (arg === 'break') { const h = lockHolder(); if (!h) { console.log('no compile.lock'); return; } if (h.alive && !flags.force) throw new Error(`${h.who}'s process (pid ${h.pid}) is alive. --force breaks it anyway.`); fs.unlinkSync(LOCK); console.log(`broke the lock of ${h.who} (since ${h.since})`); return; }
    const h = lockHolder(); console.log(h ? `compile.lock: ${h.who} since ${h.since}, pid ${h.pid} ${h.alive ? 'alive' : 'gone'}${h.stale ? ' (STALE: the next apply takes it)' : ''}` : 'compile.lock: free'); return;
  }
  if (sub === 'apply') { if (!arg) throw new Error('mv csharp apply <staging-dir>   e.g. mv csharp apply Director/staging/space'); return apply(arg, ctx); }
  throw new Error('mv csharp apply <staging-dir> | check [<role>] | lock [status|break]');
}
