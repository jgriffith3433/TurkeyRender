// Generated files are regenerated, never stale. Director/videos/<v>/generated.json maps each generated file (acts/50-cards.json, acts/70-lines.json,
// acts/78-beds.json, duck.json...) to the tool that makes it and the inputs it reads, with a hash of each. Before every `mv build` and `mv cards`:
//   - inputs changed since the tool last ran  -> stale: the tool is run again (or the build refuses: "stale: run <tool>")
//   - the file itself differs from what the tool wrote -> EDITED BY HAND: a loud warning (the next run of the tool throws the edit away)
//   - an act whose first line says GENERATED but isn't in the manifest -> unregistered: a warning asking for `mv generated adopt`
// A tool registers itself after writing: register(videoDir, 'acts/70-lines.json', { tool: 'node Director/tools/punch_lines.mjs', inputs: [...] }).
// Inputs are paths relative to the video folder, or to the project when they start with Assets/ or Director/; a path ending in / is a folder, every
// file under it. The tool's own source is always an input (a table in the code is direction too).
//   mv generated [check] [<video>]        the state of each generated file
//   mv generated adopt <video> <file> --tool "<command>" [--inputs a,b/ --unverified --gate warn]   register a file that exists already (--unverified: regenerate before the next build; --gate warn: only warn while the tool can't run clean)
//   mv generated regen [<video>]           run the tool of every stale file
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PROJECT, DIRECTOR } from './score.mjs';
import { warnIfLeased } from './lease.mjs';

const NAME = 'generated.json';
const h = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
const file = (dir) => path.join(dir, NAME);

export function readManifest(dir) { try { return JSON.parse(fs.readFileSync(file(dir), 'utf8')); } catch { return { about: 'Generated files of this video: the tool that makes each and the inputs it read (tools/mv/generated.mjs). mv build and mv cards regenerate what is stale.', files: {} }; } }
function writeManifest(dir, m) { const f = file(dir), t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(m, null, 1) + '\n'); fs.renameSync(t, f); }

function resolveInput(dir, p) { return path.resolve(/^(Assets|Director)\//.test(p) ? PROJECT : dir, p); }
const toolSource = (tool) => { const m = /(?:node|py|python)\s+(\S+\.(?:mjs|js|py))/.exec(tool ?? ''); return m ? [m[1]] : []; };

/** {relpath: hash} for every input, folders walked. A missing file hashes as "missing". */
export function inputHashes(dir, inputs) {
  const out = {};
  const one = (abs, rel) => { try { out[rel] = h(fs.readFileSync(abs)); } catch { out[rel] = 'missing'; } };
  for (const p of inputs) {
    const abs = resolveInput(dir, p);
    if (p.endsWith('/') || (fs.existsSync(abs) && fs.statSync(abs).isDirectory())) {
      const walk = (d, r) => { if (!fs.existsSync(d)) { out[r + '/'] = 'missing'; return; } for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { if (e.name.endsWith('.tmp') || e.name.startsWith('.')) continue; const q = path.join(d, e.name); e.isDirectory() ? walk(q, `${r}/${e.name}`) : one(q, `${r}/${e.name}`); } };
      walk(abs, p.replace(/\/$/, ''));
    } else one(abs, p);
  }
  return out;
}
const outputHash = (dir, out) => { try { return h(fs.readFileSync(path.join(dir, out))); } catch { return null; } };

/** A tool calls this right after writing `output`. `tool` is the command line that remakes it, from the project folder. */
/** gate: 'stop' (default: a stale file is regenerated or the build stops) or 'warn' (reported only: for a tool that can't run clean yet; fix it, then drop the gate). */
export function register(dir, output, { tool, inputs = [], by, note, unverified, gate } = {}) {
  const m = readManifest(dir), all = [...new Set([...inputs, ...toolSource(tool)])], prev = m.files[output];
  m.files[output] = { tool: tool ?? null, inputs: all, inputHashes: unverified ? null : inputHashes(dir, all), outputHash: outputHash(dir, output), at: new Date().toISOString(), ...(by ? { by } : {}), ...(note ? { note } : {}), ...((gate ?? prev?.gate) === 'warn' ? { gate: 'warn' } : {}) };
  writeManifest(dir, m);
  return m.files[output];
}

/** Every generated file's state: ok | stale | edited | missing | unverified | unregistered, with what changed. */
export function check(dir) {
  const m = readManifest(dir), out = [];
  for (const [f, e] of Object.entries(m.files)) {
    const now = outputHash(dir, f), gate = e.gate ?? 'stop';
    if (now === null) { out.push({ file: f, state: 'missing', tool: e.tool, gate }); continue; }
    if (e.outputHash && now !== e.outputHash) { out.push({ file: f, state: 'edited', tool: e.tool, gate }); continue; }
    if (!e.tool) { out.push({ file: f, state: 'ok', tool: null, note: 'no tool: hand-maintained', gate }); continue; }
    if (!e.inputHashes) { out.push({ file: f, state: 'unverified', tool: e.tool, gate }); continue; }
    const cur = inputHashes(dir, e.inputs ?? []), changed = [...new Set([...Object.keys(cur), ...Object.keys(e.inputHashes)])].filter((k) => cur[k] !== e.inputHashes[k]);
    out.push(changed.length ? { file: f, state: 'stale', tool: e.tool, changed, gate } : { file: f, state: 'ok', tool: e.tool, gate });
  }
  const acts = path.join(dir, 'acts');
  if (fs.existsSync(acts)) for (const a of fs.readdirSync(acts)) {
    const r = `acts/${a}`; if (m.files[r] || !a.endsWith('.json')) continue;
    let head = ''; try { head = fs.readFileSync(path.join(acts, a), 'utf8').slice(0, 400); } catch {}
    if (/generated/i.test(head)) out.push({ file: r, state: 'unregistered', tool: null });
  }
  return out;
}

/** Runs the tool of each stale or unverified file. Returns {ran:[], failed:[]}. */
export function regen(dir, items, { log = console.error } = {}) {
  const ran = [], failed = [];
  const tools = new Map();
  for (const it of items) if ((it.state === 'stale' || it.state === 'unverified') && it.tool) tools.set(it.tool, [...(tools.get(it.tool) ?? []), it.file]);
  for (const [tool, files] of tools) {
    log(`regenerating ${files.join(', ')}: ${tool}`);
    const r = spawnSync(tool, { cwd: PROJECT, shell: true, encoding: 'utf8', env: { ...process.env, MV_GENERATED_REGEN: '1' } });
    if (r.stdout?.trim()) log(r.stdout.trim().split('\n').slice(-3).join('\n'));
    if (r.status !== 0) { failed.push({ tool, files, out: (r.stderr || r.stdout || '').trim().split('\n').slice(-6).join('\n') }); continue; }
    ran.push(...files);
  }
  return { ran, failed };
}

/** Before a build: stale files regenerated, hand edits shouted about, a failure stops the build with "stale: run X". */
export function ensureFresh(dir, { regenerate = true, log = console.error } = {}) {
  let items = check(dir);
  const edited = items.filter((x) => x.state === 'edited');
  for (const e of edited) log(`!! ${e.file} is GENERATED by ${e.tool ?? 'a tool'} and was EDITED BY HAND. The next run of the tool throws that edit away. Put the change in the tool or its inputs${e.tool ? `, then run: ${e.tool}` : ''}.`);
  for (const u of items.filter((x) => x.state === 'unregistered')) log(`note: ${u.file} says it is generated but no tool is registered for it. mv generated adopt <video> ${u.file} --tool "<command>" (or --tool none if it is hand-maintained now).`);
  for (const w of items.filter((x) => (x.state === 'stale' || x.state === 'unverified') && x.tool && x.gate === 'warn')) log(`!! ${w.file} is ${w.state}${w.changed ? ` (${w.changed.slice(0, 3).join(', ')} changed)` : ''} and its tool is not run by the build (gate: warn). Old content plays. Run and fix: ${w.tool}`);
  const todo = items.filter((x) => (x.state === 'stale' || x.state === 'unverified') && x.tool && x.gate !== 'warn');
  if (todo.length && regenerate) {
    const r = regen(dir, todo, { log });
    if (r.failed.length) throw new Error(r.failed.map((f) => `stale: ${f.files.join(', ')} could not be regenerated. Run it yourself and fix what it says:\n  ${f.tool}\n${f.out}`).join('\n'));
    items = check(dir);
  }
  const still = items.filter((x) => (x.state === 'stale' || x.state === 'unverified') && x.tool && x.gate !== 'warn');
  if (still.length) throw new Error(still.map((s) => `stale: ${s.file} (${s.state}${s.changed ? `: ${s.changed.slice(0, 4).join(', ')} changed` : ''}). Run: ${s.tool}`).join('\n'));
  return { items, edited, regenerated: todo.length && regenerate ? todo.map((t) => t.file) : [] };
}

/** Inputs of the cards compiler's own output, acts/50-cards.json, for register(). */
export const CARD_INPUTS = ['cut.json', 'cards/', 'style.json', 'sequences/', 'tweaks/', 'notes/', 'song.json', 'score.json', 'Director/library/sets/', 'Director/library/styles/', 'Director/library/formats/', 'Director/library/lighting/', 'Director/library/performances/', 'Director/library/templates/', 'Director/library/moods.json', 'Director/tools/cards.mjs'];

export function print(items) {
  if (!items.length) { console.log('no generated files registered (generated.json)'); return; }
  for (const it of items) console.log(`${it.state.padEnd(13)} ${it.file.padEnd(28)} ${it.tool ?? (it.note ?? '')}${it.gate === 'warn' ? '  [gate: warn]' : ''}${it.changed ? `   changed: ${it.changed.slice(0, 5).join(', ')}${it.changed.length > 5 ? ` +${it.changed.length - 5}` : ''}` : ''}`);
}

export function run(pos, flags, V) {
  const [sub, ...rest] = pos, dir = V.dir;
  if (!sub || sub === 'check') { print(check(dir)); return; }
  if (sub === 'adopt') {
    const f = rest.find((x) => x !== V.name) ?? rest[0];
    if (!f || !flags.tool) throw new Error('mv generated adopt <video> <file> --tool "<command>" [--inputs a,b/ --unverified]');
    if (!fs.existsSync(path.join(dir, f))) throw new Error(`${f} is not in ${path.relative(PROJECT, dir)}`);
    const tool = flags.tool === 'none' ? null : flags.tool, inputs = flags.inputs ? String(flags.inputs).split(',') : [];
    warnIfLeased(file(dir));
    register(dir, f, { tool, inputs, unverified: !!flags.unverified || (!!tool && !inputs.length), by: 'adopt', gate: flags.gate, note: flags.note ?? (!tool ? 'hand-maintained: the tool that made it is gone' : undefined) });
    console.log(`${f}: ${tool ? `tool "${tool}"${inputs.length ? `, inputs ${inputs.join(', ')}` : ''}${flags.unverified || !inputs.length ? (flags.gate === 'warn' ? ' (unverified; gate warn: builds only warn until the tool runs clean)' : ' (unverified: the next mv build or mv cards runs it)') : ''}` : 'hand-maintained, no tool'}`);
    return;
  }
  if (sub === 'regen') { const r = regen(dir, check(dir)); console.log(r.ran.length ? `regenerated: ${r.ran.join(', ')}` : 'nothing stale'); for (const f of r.failed) console.error(`FAILED ${f.tool}\n${f.out}`); if (r.failed.length) process.exitCode = 1; return; }
  throw new Error('mv generated [check|adopt|regen]');
}
