// Leases: a visible "I am editing this" on a data file (a card file, an act, a set, a cut), not a hard lock. Director/gen/leases.json.
//   mv lease take <path...> [--who x --note "why"]     refuses a path someone else holds (their pid alive, or the lease under 4 h old); --force takes it anyway
//   mv lease release [<path...>]                        yours; no path releases every lease you hold
//   mv lease status                                     who holds what, and whether they are alive
// Tools that write a file call warnIfLeased(file, who) first: a loud line on stderr when another agent holds it, and the write goes on.
// A lease held by a dead pid is "dead" in status and `mv doctor --fix` releases it.
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT, DIRECTOR } from './score.mjs';
import { who as whoAmI, alive } from './who.mjs';

const FILE = path.join(DIRECTOR, 'gen', 'leases.json');
const OLD_MS = 4 * 3600e3;

export const rel = (f) => path.relative(PROJECT, path.resolve(PROJECT, f)).replace(/\\/g, '/').replace(/\/$/, '');
function read() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
function write(o) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); const t = `${FILE}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(o, null, 1) + '\n'); fs.renameSync(t, FILE); }
const isDead = (l) => !alive(l.pid) && Date.now() - new Date(l.since).getTime() > OLD_MS; // a dead pid alone isn't enough: agents run one process per command
const covers = (lease, file) => file === lease || file.startsWith(lease + '/');

/** Every lease, each with its state. */
export function status() {
  const all = read();
  return Object.entries(all).map(([p, l]) => ({ path: p, ...l, alive: alive(l.pid), dead: isDead(l) })).sort((a, b) => a.path.localeCompare(b.path));
}

/** The lease another agent holds on this file (or a folder above it), or null. */
export function heldByOther(file, who = whoAmI()) {
  const f = rel(file);
  for (const [p, l] of Object.entries(read())) if (covers(p, f) && l.who !== who && !isDead(l)) return { path: p, ...l, alive: alive(l.pid) };
  return null;
}

/** Prints one loud line when someone else holds the file. Returns the holder or null. Never stops the write: a lease is visible, not hard. */
export function warnIfLeased(file, who = whoAmI()) {
  const h = heldByOther(file, who);
  if (h) console.error(`!! LEASED: ${rel(file)} is held by ${h.who} since ${h.since}${h.note ? ` (${h.note})` : ''}${h.alive ? '' : ' (their process is gone)'}. Writing anyway: tell them, or mv lease status.`);
  return h;
}

export function take(files, { who = whoAmI(), note, force } = {}) {
  const all = read(), out = [];
  for (const file of files) {
    const f = rel(file);
    if (!fs.existsSync(path.join(PROJECT, f))) throw new Error(`mv lease take: ${f} does not exist (paths are relative to the project, like Director/videos/x/cards/a.yaml)`);
    const h = heldByOther(f, who);
    if (h && !force) throw new Error(`${f} is held by ${h.who} since ${h.since}${h.note ? ` (${h.note})` : ''}${h.alive ? '' : ' (their process is gone)'}. Ask them, or --force to take it anyway.`);
    all[f] = { who, pid: process.ppid || process.pid, since: new Date().toISOString(), ...(note ? { note } : {}), ...(h ? { tookFrom: h.who } : {}) };
    out.push(f);
  }
  write(all);
  return out;
}

export function release(files, { who = whoAmI(), all: everyone } = {}) {
  const all = read(), out = [];
  for (const [p, l] of Object.entries(all)) {
    const mine = l.who === who || everyone;
    if (!files.length ? mine : files.some((f) => rel(f) === p) && (mine || isDead(l))) { delete all[p]; out.push(p); }
  }
  write(all);
  return out;
}

/** Drops every dead lease. Returns what went. */
export function sweep() {
  const all = read(), out = [];
  for (const [p, l] of Object.entries(all)) if (isDead(l)) { delete all[p]; out.push(`${p} (${l.who})`); }
  if (out.length) write(all);
  return out;
}

export function run(pos, flags) {
  const [sub, ...paths] = pos, who = whoAmI(flags.who);
  if (sub === 'take') { if (!paths.length) throw new Error('mv lease take <path...> [--who x --note "..."]'); const t = take(paths, { who, note: flags.note, force: flags.force }); console.log(`${who} holds: ${t.join(', ')}`); return; }
  if (sub === 'release') { const r = release(paths, { who }); console.log(r.length ? `released: ${r.join(', ')}` : `nothing held by ${who}${paths.length ? ' on those paths' : ''}`); return; }
  if (sub === 'status' || !sub) {
    const s = status();
    if (!s.length) { console.log('no leases'); return; }
    for (const l of s) console.log(`${l.path.padEnd(56)} ${l.who.padEnd(14)} since ${l.since}${l.note ? `  "${l.note}"` : ''}${l.dead ? '  DEAD (mv doctor --fix releases it)' : l.alive ? '' : '  (process gone; lease still fresh)'}`);
    return;
  }
  throw new Error('mv lease take|release|status');
}
