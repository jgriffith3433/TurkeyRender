#!/usr/bin/env node
// The proof for the hardening (AGENTS.md "Working beside other agents"): every guard is broken on purpose and seen to catch it. No Unity:
// the compile is a stand-in here (`mv csharp apply` against the real editor is proven once by hand: harden-test.mjs unity).
// Works on a scratch copy of videos/_cards_test (videos/_harden_tmp, removed after), so other agents' baseline frames of _cards_test are untouched.
//   node Director/tools/mv/harden-test.mjs            all the checks
//   node Director/tools/mv/harden-test.mjs unity      stage a C# file with a type error and apply it for real: Unity must refuse it and Assets come back clean
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT, DIRECTOR, videoInfo } from './score.mjs';
import { quickCheck, apply, stagedFiles, takeLock, releaseLock, lockHolder, LOCK, ROOT, check as csharpCheck } from './csharp.mjs';
import { register, check as genCheck, ensureFresh, CARD_INPUTS } from './generated.mjs';
import { take, release, heldByOther, status as leaseStatus, sweep } from './lease.mjs';
import { snap } from './snap.mjs';
import { diagnose, fix, unityEditor } from './doctor.mjs';
import { refProblems } from './refs.mjs';
import { lint } from './lint.mjs';

const results = [];
const ok = (name, c, detail = '') => { results.push([name, !!c]); console.log(`${c ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`); };
const TMP = path.join(DIRECTOR, 'videos', '_harden_tmp'), SRC = path.join(DIRECTOR, 'videos', '_cards_test');
// The unit run applies into a sandbox project (MV_CSHARP_ROOT, set below), never the real Assets: Unity may refresh at any moment and compile a pretend file.
const STAGE = process.argv[2] === 'unity' ? path.join(DIRECTOR, 'staging', '_harden_unity') : path.join(ROOT, 'staging', '_harden_test');
const node = (args) => spawnSync(process.execPath, args, { cwd: PROJECT, encoding: 'utf8' });
const mv = (...a) => node([path.join(DIRECTOR, 'mv.mjs'), '--video', '_harden_tmp', ...a]);

function scratchVideo() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  for (const n of ['cut.json', 'score.json', 'style.json', 'song.json', 'cards', 'sequences', 'acts']) if (fs.existsSync(path.join(SRC, n))) fs.cpSync(path.join(SRC, n), path.join(TMP, n), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'tweaks'), { recursive: true });
}

async function main() {
  // ---- 1. the text check that stops a sure compile failure before Unity ----
  ok('quickCheck: a newline inside $"..." is caught with its line', quickCheck('class A { void F() { var s = $"a\nb"; } }', 'X.cs').some((p) => p.line === 1 && /runs off/.test(p.msg)));
  ok('quickCheck: an unclosed brace is caught', quickCheck('class A { void F() { }', 'X.cs').some((p) => /never closed/.test(p.msg)));
  ok('quickCheck: a stray ) is caught', quickCheck('class A { void F() { G()); } }', 'X.cs').some((p) => /\) with no/.test(p.msg)));
  ok('quickCheck: char literals, verbatim and escaped strings pass', quickCheck('class A { char c = \'"\'; char d = \'\\\'\'; string v = @"a\nb""c"; string e = "x\\"y"; string i = $"{c}\\n"; }', 'X.cs').length === 0);
  let clean = 0, dirty = [];
  for (const d of ['Runtime', 'Editor', 'Editor/Native']) for (const f of fs.readdirSync(path.join(PROJECT, 'Assets/MusicVideo', d))) if (f.endsWith('.cs')) { const p = quickCheck(fs.readFileSync(path.join(PROJECT, 'Assets/MusicVideo', d, f), 'utf8'), f); p.length ? dirty.push(`${f}:${p[0].line} ${p[0].msg}`) : clean++; }
  ok(`quickCheck: every C# file that compiles today passes (${clean} files)`, dirty.length === 0, dirty.slice(0, 3).join('; '));

  // ---- 2. the apply wrapper: snapshot, copy, compile, revert ----
  fs.rmSync(STAGE, { recursive: true, force: true });
  if (ROOT === PROJECT) throw new Error('the unit run must apply into a sandbox (MV_CSHARP_ROOT); run it as node Director/tools/mv/harden-test.mjs');
  const probeRel = 'Assets/MusicVideo/Runtime/MVHardenProbe.cs', probe = path.join(ROOT, probeRel);
  fs.mkdirSync(path.join(STAGE, path.dirname(probeRel)), { recursive: true });
  fs.writeFileSync(path.join(STAGE, probeRel), 'namespace TKShock.MV { static class MVHardenProbe { } }\n');
  const worklog = process.env.MV_WORKLOG, logBefore = fs.readFileSync(worklog, 'utf8').length;
  let r = await apply(STAGE, { who: 'harden-test', compile: async () => [`${probeRel}:1 CS0000: a pretend error`] });
  ok('apply: a failing compile reverts the new file and reports the error', !r.ok && !fs.existsSync(probe) && !fs.existsSync(probe + '.meta') && r.errors[0].includes('pretend'));
  ok('apply: the compile lock is released after the revert', !lockHolder());
  ok('apply: a WORKLOG line was written', fs.readFileSync(worklog, 'utf8').length > logBefore && /harden-test: mv csharp apply .*REVERTED/.test(fs.readFileSync(worklog, 'utf8').slice(logBefore)));
  // an existing file: snapshot and restore of the old text
  const victimRel = 'Assets/MusicVideo/Runtime/MVLimbScale.cs', victim = path.join(ROOT, victimRel), old = fs.readFileSync(victim);
  fs.mkdirSync(path.join(STAGE, path.dirname(victimRel)), { recursive: true });
  fs.writeFileSync(path.join(STAGE, victimRel), old.toString('utf8') + '\n// harden-test touched this\n');
  fs.rmSync(path.join(STAGE, probeRel));
  let during = null;
  r = await apply(STAGE, { who: 'harden-test', compile: async () => { during ??= fs.readFileSync(victim, 'utf8'); return ['X.cs:1 boom']; } }); // the second compile is the one after the restore
  ok('apply: an edited file is in Assets during the compile and back to the old text after a failure', during?.includes('harden-test touched') && fs.readFileSync(victim).equals(old), `during=${during?.includes('harden-test touched')} restored=${fs.readFileSync(victim).equals(old)} ok=${r.ok} applied=${r.applied}`);
  r = await apply(STAGE, { who: 'harden-test', compile: async () => [] });
  ok('apply: a clean compile keeps the staged text', r.ok && fs.readFileSync(victim, 'utf8').includes('harden-test touched'));
  fs.writeFileSync(victim, old); // put it back by hand: that is exactly the drift the check must see
  const drift = csharpCheck().filter((x) => x.state === 'drift' && x.rel === victimRel);
  ok('check: a hand edit into Assets after an apply is reported as DRIFT', drift.length === 1);
  fs.writeFileSync(path.join(STAGE, victimRel), old); // re-stage the original and apply it, so the record matches Assets again
  r = await apply(STAGE, { who: 'harden-test', compile: async () => [] });
  ok('check: applying the original again clears the drift', r.ok && !csharpCheck().some((x) => x.state === 'drift' && x.rel === victimRel) && fs.readFileSync(victim).equals(old));
  // the lock
  fs.writeFileSync(LOCK, JSON.stringify({ who: 'ghost', pid: 999999, since: new Date(Date.now() - 3600e3).toISOString() }));
  let took = false; try { takeLock('harden-test'); took = true; } catch {} releaseLock();
  ok('lock: a lock whose process is dead is broken', took);
  fs.writeFileSync(LOCK, JSON.stringify({ who: 'me-too', pid: process.pid, since: new Date().toISOString() }));
  let refused = false; try { takeLock('harden-test'); } catch (e) { refused = /held by me-too/.test(e.message); }
  fs.unlinkSync(LOCK);
  ok('lock: a lock whose process is alive is refused with the holder', refused);
  fs.rmSync(STAGE, { recursive: true, force: true });

  // ---- 3. generated files on the scratch video ----
  scratchVideo();
  let c = mv('cards', 'compile');
  ok('scratch video compiles', c.status === 0, c.stderr.split('\n').find((l) => /error/.test(l)));
  let g = genCheck(TMP);
  ok('generated: cards compile registers 50-cards.json and cards.map.json as fresh', g.filter((x) => x.state === 'ok').length === 2 && g.length === 2);
  fs.appendFileSync(path.join(TMP, 'acts', '50-cards.json'), '// a hand edit\n');
  ok('generated: a hand edit on the act is seen as edited', genCheck(TMP).some((x) => x.file === 'acts/50-cards.json' && x.state === 'edited'));
  let shouted = ''; ensureFresh(TMP, { log: (s) => { shouted += s; } });
  ok('generated: ensureFresh shouts EDITED BY HAND and names the tool', /EDITED BY HAND/.test(shouted) && /cards compile/.test(shouted));
  mv('cards', 'compile');
  fs.appendFileSync(path.join(TMP, 'cards', 'shots.yaml'), '\n# a card edit\n');
  ok('generated: a card edit makes the act stale', genCheck(TMP).some((x) => x.file === 'acts/50-cards.json' && x.state === 'stale' && x.changed.includes('cards/shots.yaml')));
  let fresh = ensureFresh(TMP, { log: () => {} });
  ok('generated: ensureFresh regenerates it and it is fresh again', fresh.regenerated.includes('acts/50-cards.json') && genCheck(TMP).every((x) => x.state === 'ok'));
  register(TMP, 'acts/50-cards.json', { tool: 'node Director/tools/no_such_tool.mjs', inputs: CARD_INPUTS, unverified: true });
  let stopped = ''; try { ensureFresh(TMP, { log: () => {} }); } catch (e) { stopped = e.message; }
  ok('generated: a tool that cannot run stops the build with "stale: run X"', /^stale: acts\/50-cards\.json/.test(stopped) && /no_such_tool/.test(stopped));
  fs.writeFileSync(path.join(TMP, 'acts', '77-handmade.json'), '// GENERATED by a lost script\n{ "cues": [] }\n');
  ok('generated: an act that says GENERATED with no registration is flagged unregistered', genCheck(TMP).some((x) => x.file === 'acts/77-handmade.json' && x.state === 'unregistered'));
  fs.rmSync(path.join(TMP, 'acts', '77-handmade.json'));
  mv('cards', 'compile');

  // ---- 4. leases ----
  const cardFile = path.join(TMP, 'cards', 'shots.yaml');
  take([cardFile], { who: 'agent-a', note: 'testing' });
  const h = heldByOther(cardFile, 'agent-b');
  ok('lease: another agent sees who holds the file', h?.who === 'agent-a' && h.note === 'testing');
  ok('lease: the holder is not warned about itself', heldByOther(cardFile, 'agent-a') === null);
  ok('lease: a lease on a folder covers the files under it', (take([path.join(TMP, 'acts')], { who: 'agent-a' }), heldByOther(path.join(TMP, 'acts', '50-cards.json'), 'agent-b')?.who === 'agent-a'));
  let refusedLease = false; try { take([cardFile], { who: 'agent-b' }); } catch (e) { refusedLease = /held by agent-a/.test(e.message); }
  ok('lease: taking a held file is refused with the holder', refusedLease);
  const out = mv('cards', 'compile'); // writes acts/50-cards.json, which agent-a holds
  ok('lease: a tool writing a leased file warns loudly and still writes', /!! LEASED: .*50-cards\.json is held by agent-a/.test(out.stderr) && out.status === 0);
  release([], { who: 'agent-a' });
  ok('lease: release drops them', !leaseStatus().some((l) => l.who === 'agent-a'));
  // a dead lease: a pid that is gone and a date 5 h back
  const leasesFile = path.join(DIRECTOR, 'gen', 'leases.json'), all = JSON.parse(fs.readFileSync(leasesFile, 'utf8'));
  all['Director/videos/_harden_tmp/cut.json'] = { who: 'ghost', pid: 999999, since: new Date(Date.now() - 5 * 3600e3).toISOString() };
  fs.writeFileSync(leasesFile, JSON.stringify(all));
  ok('lease: a dead lease is swept', sweep().some((s) => s.includes('ghost')) && !leaseStatus().some((l) => l.who === 'ghost'));

  // ---- 5. reference integrity and key validation, through lint ----
  const V = videoInfo('_harden_tmp');
  const tweak = (o) => fs.writeFileSync(path.join(TMP, 'tweaks', 'zz-harden.json'), JSON.stringify(o));
  const lintFor = (o) => { tweak(o); const r = mv('cards', 'compile'); if (r.status !== 0) return { compileError: r.stderr }; return lint(V, {}); };
  let L = lintFor({ alone: { raw: [{ at: 0, sfx: 'Assets/MusicVideo/Sfx/no_such_sound.wav' }] } });
  ok('refs: a cue naming a sound file that is not on disk is an error with the card', L.items?.some((x) => x.code === 'missing-file' && /no_such_sound/.test(x.msg) && /card 'alone'/.test(x.msg)), L.compileError?.slice(0, 200));
  fs.writeFileSync(path.join(TMP, 'beds.json'), JSON.stringify({ beds: [{ id: 'outside', from: { shot: 'p_glass' } }] }));
  const rp = refProblems(V);
  ok('refs: a data file anchoring on a shot not in the cut is reported with file and line', rp.some((x) => x.code === 'unknown-shot' && /p_glass/.test(x.msg) && /beds\.json/.test(x.file) && x.line === 1));
  fs.rmSync(path.join(TMP, 'beds.json'));
  const cut = JSON.parse(fs.readFileSync(path.join(TMP, 'cut.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  cut.shots[1].after = 'nowhere'; fs.writeFileSync(path.join(TMP, 'cut.json'), JSON.stringify(cut));
  ok('refs: a cut entry "after" a shot that is not there is reported', refProblems(V).some((x) => x.code === 'unknown-shot' && /nowhere/.test(x.msg)));
  delete cut.shots[1].after; fs.writeFileSync(path.join(TMP, 'cut.json'), JSON.stringify(cut));
  const score = JSON.parse(fs.readFileSync(path.join(TMP, 'score.json'), 'utf8').replace(/^\s*\/\/.*$/gm, '')); score.native = false; fs.writeFileSync(path.join(TMP, 'score.json'), JSON.stringify(score));
  L = lintFor({ alone: { raw: [{ at: 0, do: 'anim', on: 'person', clip: 'Idle1', speed: 2 }] } });
  ok('keys: speed on an anim cue warns on a legacy body and says it never reaches the clip', L.items?.some((x) => x.code === 'key-no-effect' && x.sev === 'warn' && /never reaches the clip/.test(x.msg)), L.compileError?.slice(0, 200));
  score.native = true; fs.writeFileSync(path.join(TMP, 'score.json'), JSON.stringify(score));
  L = lintFor({ alone: { raw: [{ at: 0, do: 'anim', on: 'person', clip: 'Idle1', speed: 2 }] } });
  ok('keys: speed on a native body is an ERROR with the fix "rate"', L.items?.some((x) => x.code === 'key-no-effect' && x.sev === 'error' && /"rate":2/.test(x.fix)) && L.failed);
  L = lintFor({ alone: { raw: [{ at: '1b', do: 'silence', frames: -4 }] } });
  ok('keys: negative frames on silence is an error that explains the direction', L.items?.some((x) => x.code === 'bad-value' && /frames/.test(x.msg) && /BEFORE/.test(x.fix)));
  L = lintFor({ alone: { raw: [{ at: '1b', do: 'silence', frames: 4, for: '4f' }] } });
  ok('keys: frames and for together on silence warns that frames is ignored', L.items?.some((x) => x.code === 'unused-key' && /frames.*ignored/.test(x.msg)));
  L = lintFor({ alone: { nonsense_key: 1 } });
  ok('keys: an unknown card field is refused by the compiler', !!L.compileError && /unknown field 'nonsense_key'/.test(L.compileError));
  L = lintFor({ alone: { raw: [{ at: 0, do: 'anim', on: 'person', clip: 'Idle1', wibble: 1 }] } });
  ok('keys: an unknown cue key in an act is an error', L.items?.some((x) => x.code === 'unknown-key' && /wibble/.test(x.msg)));

  // ---- 6. snap ----
  const img = path.join(TMP, 'pic.png'); fs.writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
  const s1 = snap([img])[0]; fs.writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9, 9])); const s2 = snap([img])[0];
  ok('snap: a rewritten image gets a new path each time, with its bytes', s1.to !== s2.to && fs.readFileSync(s1.to)[4] === 1 && fs.readFileSync(s2.to)[4] === 9);
  fs.rmSync(s1.to); fs.rmSync(s2.to);

  // ---- 7. doctor ----
  fs.writeFileSync(LOCK, JSON.stringify({ who: 'ghost', pid: 999999, since: new Date(Date.now() - 3600e3).toISOString() }));
  let d = diagnose(V);
  ok('doctor: a dead compile.lock is reported', d.some((x) => x.what === 'compile.lock' && x.sev === 'warn' && /ghost/.test(x.msg)));
  const fixed = fix(d);
  ok('doctor: --fix removes it', !fs.existsSync(LOCK) && fixed.some((f) => /compile.lock/.test(f)));
  fs.appendFileSync(path.join(TMP, 'acts', '50-cards.json'), '// edit\n');
  d = diagnose(V);
  ok('doctor: a hand-edited generated file is a failing item', d.some((x) => /generated/.test(x.what) && x.sev === 'error' && /edited/.test(x.msg)));
  ok('doctor: unity, compile, queue, staging, leases, disk and memory are all reported', ['unity', 'compile', 'queue', 'staging', 'leases', 'disk', 'memory'].every((w) => d.some((x) => x.what === w)));

  // closed vs hung: Unity Hub's "unity.exe serve" helper and the import workers are not the editor (2026-11-08: the editor had closed, only the helper ran)
  const hub = { pid: 1, cmd: String.raw`"C:\Program Files\Unity Hub\resources\unity.exe" serve` };
  const worker = { pid: 2, cmd: String.raw`"C:\U\Editor\Unity.exe" "-adb2" "-batchMode" "-name" "AssetImportWorker0" "-projectPath" "C:/Projects/TKShock"` };
  const editor = { pid: 3, cmd: `"C:\U\Editor\Unity.exe" -projectPath "${PROJECT}" `, responding: false, cpu: 12 };
  ok('doctor: only the Hub helper and a worker running is CLOSED (no editor)', unityEditor([hub, worker]).known && !unityEditor([hub, worker]).editor);
  ok('doctor: the editor of this project is found, with its responding flag', unityEditor([hub, editor]).editor?.pid === 3 && unityEditor([hub, editor]).editor.responding === false);
  ok('doctor: an editor on another project is not ours', !unityEditor([{ pid: 4, cmd: '"C:\U\Unity.exe" -projectPath C:\Projects\Other' }]).editor);
  fs.rmSync(TMP, { recursive: true, force: true });
  try { fs.unlinkSync(path.join(DIRECTOR, 'gen', 'build-_harden_tmp.json')); } catch {} // the scratch video's build stamp
  const bad = results.filter((r) => !r[1]).length;
  console.log(`\nharden-test: ${results.length - bad} of ${results.length} passed${bad ? `, ${bad} FAILED` : ''}`);
  return bad ? 1 : 0;
}

/** The real thing, once: a staged C# file with a type error through the real Unity. Costs two compiles (about a minute each here). */
async function unity() {
  fs.rmSync(STAGE, { recursive: true, force: true });
  const rel = 'Assets/MusicVideo/Runtime/MVHardenProbe.cs';
  fs.mkdirSync(path.join(STAGE, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(STAGE, rel), 'namespace TKShock.MV { static class MVHardenProbe { static int X = "not an int"; } }\n'); // passes the text check, fails the compiler
  const r = spawnSync(process.execPath, [path.join(DIRECTOR, 'mv.mjs'), 'csharp', 'apply', 'Director/staging/_harden_unity', '--who', 'harden-test'], { cwd: PROJECT, encoding: 'utf8' });
  console.log(r.stdout); console.error(r.stderr);
  const gone = !fs.existsSync(path.join(PROJECT, rel)), clean = !fs.existsSync(path.join(DIRECTOR, 'compile-errors.txt'));
  ok('unity: the apply was refused (exit 1)', r.status === 1);
  ok('unity: the compiler named the file and line', /MVHardenProbe\.cs:1/.test(r.stderr + r.stdout));
  ok('unity: the probe is gone from Assets and Assets compiles again', gone && clean);
  fs.rmSync(STAGE, { recursive: true, force: true });
  return results.some((x) => !x[1]) ? 1 : 0;
}

// The unit run uses its own compile lock file, so a real agent's compile window is neither disturbed nor waited for; `unity` uses the real one.
if (process.argv[2] !== 'unity' && !process.env.MV_COMPILE_LOCK) {
  const lock = path.join(DIRECTOR, 'gen', 'compile.lock.harden-test');
  // A sandbox project: a copy of Assets/MusicVideo/Runtime (the files the test applies over), its own WORKLOG and apply record.
  const box = path.join(DIRECTOR, 'gen', `harden-sandbox-${process.pid}`);
  fs.mkdirSync(path.join(box, 'Assets', 'MusicVideo'), { recursive: true });
  fs.cpSync(path.join(PROJECT, 'Assets', 'MusicVideo', 'Runtime'), path.join(box, 'Assets', 'MusicVideo', 'Runtime'), { recursive: true, filter: (f) => !/\.meta$/.test(f) });
  fs.writeFileSync(path.join(box, 'WORKLOG.md'), '');
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, MV_COMPILE_LOCK: lock, MV_CSHARP_ROOT: box, MV_WORKLOG: path.join(box, 'WORKLOG.md'), MV_CSHARP_SNAPS: path.join(box, 'csharp') } });
  try { fs.unlinkSync(lock); } catch {}
  fs.rmSync(box, { recursive: true, force: true });
  process.exit(r.status ?? 1);
}
(process.argv[2] === 'unity' ? unity() : main()).then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
