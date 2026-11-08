#!/usr/bin/env node
// The note loop: a note saved in the Review Room runs by itself. The Room's server starts this; nobody needs to.
//   node Director/room/auto.mjs <video>        works every queued note, one at a time, then exits
//   node Director/room/auto.mjs <video> <id>   queues that note first
//   add --dry to stop once the change is chosen: it prints the tweak, writes nothing and needs no Unity
// For each note: find its shot, have Claude turn J's words into a tweak for that card (videos/<v>/tweaks/zz-room.json, never a card or an act),
// compile, build, render the shot, cut before and after, run QA. A note Claude won't change, or one that fails, stays open as "needs J" with a one-line reason.
// Claude goes through Hawkes Gen's llm.json, which is the Claude API and no GPU. Unity goes through the mv queue, one ticket from the build to the last frame.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIRECTOR, addClips, autoLock, autoRunning, info, loadShots, readNotes, relToDirector, setStatus, shotAt, updateNotes, videoDir } from './lib.mjs';
import { Queue } from '../tools/mv/queue.mjs';
import { compile, loadVideo, writeAct } from '../tools/cards.mjs';

const TWEAK_FILE = 'zz-room.json'; // sorts last, so it is the top tweak
const MODEL = 'claude-sonnet-5-5';
const MAX_TRIES = 3;
const DRY = process.argv.includes('--dry'); // stops once the change is chosen: no tweak written, no Unity
const [video, oneId] = process.argv.slice(2).filter((x) => x !== '--dry');
if (!video) { console.error('Use: auto.mjs <video> [note id]'); process.exit(1); }
const V = info(video), MV = path.join(DIRECTOR, 'mv.mjs'), QA = path.join(DIRECTOR, 'tools', 'qa.mjs');
const tweakPath = path.join(V.dir, 'tweaks', TWEAK_FILE);
const log = (m) => console.log(`${new Date().toISOString()} ${m}`);
const line = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, n = 160) => { const t = line(s); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const readText = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// Never spawnSync while holding the queue: it would stop the ticket's heartbeat, and a silent ticket is dropped after 2 minutes.
function run(cmd, list) {
  return new Promise((res) => {
    const p = spawn(cmd, list, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => res({ ok: false, out, err: String(e), status: -1 }));
    p.on('close', (code) => res({ ok: code === 0, out, err, status: code }));
  });
}
const mv = (...a) => run(process.execPath, [MV, '--video', video, ...a.map(String)]);
const cardsTool = (cmd) => run(process.execPath, [path.join(DIRECTOR, 'tools', 'cards.mjs'), cmd, V.dir]);

const note = (id) => readNotes(video).find((n) => n.id === id);
const change = (id, fn) => updateNotes(video, (notes) => { const n = notes.find((x) => x.id === id); return n ? fn(n) : null; });

/** What J sees on the note while it works. */
function step(id, text) {
  log(`${id}: ${text}`);
  change(id, (n) => { (n.auto ??= {}).state = 'working'; n.auto.step = text; n.auto.updated = new Date().toISOString(); });
}

/** Stays open, in J's list, with the reason in one line. J can answer it, and the answer runs the loop again. */
function leaveOpen(id, reason) {
  log(`${id}: left open: ${reason}`);
  change(id, (n) => {
    n.question = clip(reason, 200);
    n.auto = { ...(n.auto ?? {}), state: 'left', step: null, updated: new Date().toISOString() };
    setStatus(n, 'needs J', 'claude', n.question);
  });
}

// ---------- the tweak file ----------

const tweaks = () => readJson(tweakPath, {});
function writeTweaks(all) {
  fs.mkdirSync(path.dirname(tweakPath), { recursive: true });
  if (Object.keys(all).length) fs.writeFileSync(tweakPath, JSON.stringify(all, null, 1) + '\n');
  else fs.rmSync(tweakPath, { force: true }); // an empty layer is no layer
}
function setTweak(card, value) {
  const all = tweaks();
  if (value === undefined) delete all[card]; else all[card] = value;
  writeTweaks(all);
}
const merge = (a, b) => {
  if (!a || typeof a !== 'object' || Array.isArray(a) || !b || typeof b !== 'object' || Array.isArray(b)) return b;
  const o = { ...a };
  for (const [k, v] of Object.entries(b)) o[k] = merge(a[k], v);
  return o;
};

// ---------- which card ----------

function cardFor(n) {
  const map = readJson(path.join(V.dir, 'cards.map.json'), []);
  const byName = n.shot?.name && map.find((m) => m.id === n.shot.name);
  if (byName) return byName;
  const live = shotAt(loadShots(video).shots, n.t);
  return map.find((m) => m.id === live?.name) ?? map.find((m) => n.t >= m.t && n.t < m.tEnd) ?? null;
}

// ---------- J's words to a tweak ----------

const names = (dir) => { try { return fs.readdirSync(path.join(DIRECTOR, 'library', dir)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')); } catch { return []; } };
const passing = () => [...readText(path.join(DIRECTOR, 'library', 'performances', 'gallery.md')).matchAll(/^### (\w+): PASS/gm)].map((m) => m[1]);
function marksOf(set) {
  try { return Object.keys(loadedSet(set).marks ?? {}); } catch { return []; }
}
function loadedSet(set) {
  const text = readText(path.join(DIRECTOR, 'library', 'sets', set + '.json')).replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(text);
}

function promptFor(n, map, resolved, own, tries) {
  const said = (n.history ?? []).filter((h) => h.by === 'J' && h.text).map((h) => h.text);
  const before = (n.auto?.past ?? []).map((p) => p.what);
  const shots = loadShots(video).shots, s = shots.find((x) => x.name === map.id);
  return `You work for the director of a stylized real-time 3D music video. The video is written as short shot cards that compile to a score. The director watched a render, stopped at a frame and wrote a note. Turn the note into the smallest change to that one shot's card, as a tweak. A tweak is any set of card fields, merged over the card: maps merge key by key, a list replaces the whole list, null removes a key.

THE NOTE (frame attached, then anything the director pasted):
"${n.text}"
${said.length ? `The director also said: ${said.map((x) => `"${x}"`).join(', ')}\n` : ''}${before.length ? `Already tried on this note, which did not satisfy: ${before.join('; ')}\n` : ''}
At ${n.t.toFixed(2)} s in the video, bar ${n.at}. The shot runs ${s ? `${s.t.toFixed(2)} to ${s.end.toFixed(2)} s` : `${map.t} to ${map.tEnd} s`}.

THE SHOT: ${map.id}
Its card with every layer applied:
${JSON.stringify(resolved, null, 1)}
${own ? `Tweak this loop already made on it (yours merges over this):\n${JSON.stringify(own, null, 1)}\n` : ''}
CARD FIELDS YOU MAY CHANGE
- camera: "<preset> <subject>", or a map with preset on side angle dist height frame lens screen push shake dutch behind aperture. Presets: close-up medium wide two-shot over-shoulder low-hero high-lonely tracking spot. A subject is an actor, a bone like person.chest, or a mark. No shake, dutch or move unless the note asks.
- lens: mm. mood: one of ${'base calm warm cold lonely dread joy dream'}. light: one of ${names('lighting').join(' ')}.
- shot: overrides the compiled shot key by key, {"fov":30}, null removes a key.
- cast: {actor: {at, to, perform, clip, look, face, then, args}}. Marks on this set: ${marksOf(map.set).join(' ')}. Performances tested and allowed: ${passing().join(' ')}.
- events: a list of {on, ...cue}. on is kick snare hat all beat bar start, or a time in the shot like "2b" or "end-1b". For the look of the frame: {"on":"0.01b","grade":{"exposure":0.3,"saturation":0.1,"contrast":0.1,"bloom":0.8,"vignette":0.2},"for":"2b","ease":"out"}. A short flash uses "pulse" in place of "grade". The events list REPLACES the card's list, so repeat every event you want to keep.
- raw: a list of plain cues with "at" measured in the shot. Use it only if nothing above can do it.

RULES
- Change as little as you can. One idea. Keep the shot's idea and feel. Never change idea, feel, id, set or length.
- Time and shot length are not yours: they live elsewhere.
- Say "leave" and give a one-line reason in plain words, addressed to the director, when any of these is true: the note covers more than this shot; it asks for a new model, prop, texture or set piece; it needs code; it changes the story or the cut; the words could mean two different changes and picking one is a guess; or it is praise or a question with nothing to change.
- In "what", say in one short plain line what changed, as you would to the director. No field names.
${tries.length ? `\nYour last answer failed. Fix this and answer again:\n${tries.map((t) => `- ${t}`).join('\n')}\n` : ''}
Answer as JSON: {"action":"change" or "leave","tweakJson":"<the tweak as a JSON string, or empty>","what":"<one line>","reason":"<one line if leaving, or empty>"}`;
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['action', 'tweakJson', 'what', 'reason'],
  properties: { action: { type: 'string', enum: ['change', 'leave'] }, tweakJson: { type: 'string' }, what: { type: 'string' }, reason: { type: 'string' } },
};

let gen = null;
async function ask(prompt, images) {
  if (!gen) { const { HawkesGen } = await import('../tools/mv/hawkesgen.mjs'); gen = new HawkesGen({ project: 'tkshock' }); }
  for (let i = 0; ; i++) {
    try {
      const job = await gen.run('llm.json', { params: { prompt, model: MODEL, effort: 'medium', maxTokens: 2500, schema: SCHEMA }, inputs: { images }, labels: { room: 'note-loop' } });
      return job.result?.value ?? {};
    } catch (e) { if (i >= 3) throw e; await new Promise((r) => setTimeout(r, 4000 * (i + 1))); } // Gen scales to zero and drops the odd call
  }
}

const FORBIDDEN = new Set(['id', 'idea', 'feel', 'set', 'len', 'at', 'take', 'takes', 'note', 'seq', 'after']);

/** Compiles in memory with the tweak on. Says why it is no good, or returns null. The file only changes if it passes. */
async function tryTweak(map, candidate, baseAct) {
  const bad = Object.keys(candidate).filter((k) => FORBIDDEN.has(k));
  if (bad.length) return `the tweak touches ${bad.join(', ')}, which you may not change`;
  const had = readText(tweakPath), own = tweaks()[map.id];
  setTweak(map.id, merge(own ?? {}, candidate));
  try {
    const r = await compile(loadVideo(V.dir));
    if (writeAct(r.act) === baseAct) return 'that compiles to exactly what the shot already does, so it changes nothing. A stronger layer may be setting the same key';
    return null;
  } catch (e) {
    return `it did not compile: ${clip(e.message, 400)}`;
  } finally {
    // Back as it was until the change is chosen.
    if (had) fs.writeFileSync(tweakPath, had); else fs.rmSync(tweakPath, { force: true });
  }
}

// ---------- one note ----------

async function work(id) {
  let n = note(id);
  if (!n || n.removed) return;
  if (!n.text.trim()) { change(id, (x) => { delete x.auto; }); return; } // no words yet: nothing to run. Editing the note queues it.
  change(id, (x) => { if (x.status !== 'in progress') setStatus(x, 'in progress', 'claude'); delete x.question; });
  step(id, 'Finding the shot');
  const map = cardFor(n);
  if (!map) return leaveOpen(id, 'This moment is not in any shot card, so there is nothing to change by itself.');

  let v, base, resolved;
  try {
    v = loadVideo(V.dir);
    const r = await compile(v);
    base = writeAct(r.act);
    resolved = r.resolved[map.id]?.card ?? v.cards[map.id];
  } catch (e) { return leaveOpen(id, `The cards don't compile right now, so nothing can run: ${clip(e.message, 120)}`); }

  step(id, `Reading the note against ${map.id}`);
  const dir = videoDir(video), images = [n.frameImage, ...(n.images ?? [])].filter(Boolean).map((r) => path.join(dir, r)).filter((f) => fs.existsSync(f));
  const own = tweaks()[map.id];
  const tries = [];
  let answer = null, tweak = null;
  for (let i = 0; i < MAX_TRIES; i++) {
    n = note(id);
    let a;
    try { a = await ask(promptFor(n, map, resolved, own, tries), images); }
    catch (e) { return leaveOpen(id, `Claude could not be reached: ${clip(e.message, 120)}`); }
    if (a.action === 'leave') return leaveOpen(id, a.reason || 'Too big or too unclear to change by itself.');
    let candidate = null;
    try { candidate = JSON.parse(a.tweakJson); } catch { tries.push('tweakJson was not valid JSON'); continue; }
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !Object.keys(candidate).length) { tries.push('the tweak was empty'); continue; }
    const why = await tryTweak(map, candidate, base);
    if (why) { tries.push(why); log(`${id}: try ${i + 1}: ${why}`); continue; }
    answer = a; tweak = candidate;
    break;
  }
  if (!answer) return leaveOpen(id, `Couldn't turn this into a working change: ${clip(tries.at(-1), 130)}`);

  if (DRY) { log(`${id}: dry run: ${answer.what}: ${JSON.stringify(tweak)}`); change(id, (x) => { x.auto = { state: 'left', dry: tweak, what: answer.what }; }); return; }

  // The change goes in. From here a failure takes it out again.
  const before = own, after = merge(own ?? {}, tweak);
  setTweak(map.id, after);
  const what = clip(answer.what, 200);
  change(id, (x) => { x.auto = { ...(x.auto ?? {}), change: { card: map.id, tweak, before: before ?? null, after, what } }; });
  const undo = async (reason) => {
    setTweak(map.id, before);
    change(id, (x) => { if (x.auto) delete x.auto.change; });
    await cardsTool('compile');
    leaveOpen(id, reason);
  };

  step(id, `Waiting for Unity to change ${map.id}`);
  const queue = new Queue(path.join(DIRECTOR, 'gen'));
  await queue.enter(`note ${id} ${video}`, (place, who) => step(id, `Waiting for Unity, ${place} ahead, now ${who}`));
  let shotOut = null;
  try {
    step(id, `Rebuilding: ${what}`);
    const c = await cardsTool('compile');
    if (!c.ok) { queue.leave(); return await undo(`The change didn't compile: ${clip(c.err, 130)}`); }
    const t0 = Date.now(), b = await mv('build');
    if (!b.ok) { queue.leave(); return await undo(`The build failed, so the change was taken out: ${clip(b.err || b.out, 130)}`); }
    step(id, `Rendering ${map.id} (build took ${Math.round((Date.now() - t0) / 1000)} s)`);
    const s = await mv('shot', map.id, '--allow-stale'); // the turn is held: the scene is this build, whatever was edited since
    if (!s.ok) { queue.leave(); return await undo(`The shot would not render: ${clip(s.err || s.out, 130)}`); }
    try { shotOut = JSON.parse(s.out); } catch { queue.leave(); return await undo('The shot render gave no result.'); }
  } finally { queue.leave(); }

  step(id, 'Cutting before and after');
  const attempt = (note(id).history ?? []).filter((h) => h.status === 'fixed').length + (note(id).auto?.past?.length ?? 0) + 1;
  let clips;
  try { clips = addClips(video, id, shotOut.video, { start: shotOut.from, attempt }); }
  catch (e) { return leaveOpen(id, `The change is in, but the clips failed: ${clip(e.message, 120)}`); }
  change(id, (x) => { x.clip = clips; });

  step(id, `Checking ${map.id} with QA`);
  const q = await run(process.execPath, [QA, String(shotOut.shot), '--strict', '--video', video]);
  const qaFile = path.join(V.shots, shotFolder(shotOut), 'qa.json'), qa = readJson(qaFile, null);
  const worst = qa?.faults?.find((f) => f.sev !== 'C');
  const verdict = { score: qa?.score ?? null, pass: q.ok, worst: worst ? clip(worst.what, 140) : null };
  change(id, (x) => { x.auto = { ...x.auto, qa: verdict, past: [...(x.auto?.past ?? []), { what, when: new Date().toISOString() }] }; });
  if (q.status === 2 || !qa) {
    return leaveOpen(id, qa ? `Fix is in and rendered, but it fails QA (${qa.score} of 10): ${verdict.worst ?? 'score too low'}` : `Fix is in and rendered, but QA didn't finish: ${clip(q.err, 120)}`);
  }
  if (!q.ok) return leaveOpen(id, `Fix is in and rendered, but QA stopped: ${clip(q.err, 120)}`);

  // The 30 fps review of the shot render (tools/review.mjs): strips at its cut and spikes, read against the standard. An A fault on this shot keeps the note open.
  step(id, `Reviewing ${map.id} at 30 fps`);
  let rev;
  try {
    const { reviewRender } = await import('../tools/review.mjs');
    const rep = await reviewRender(V, shotOut.video, { label: `note-${id}`, quiet: true, offset: shotOut.from });
    const mine = rep.a.filter((f) => f.shot === map.id), worst = mine[0] ?? null;
    rev = { a: mine.length, aNearby: rep.a.length - mine.length, b: rep.b.filter((f) => f.shot === map.id).length, c: rep.c.filter((f) => f.shot === map.id).length, worst: worst ? clip(`${worst.t.toFixed(2)} s: ${worst.what}`, 160) : null, report: relToDirector(path.join(rep.dir, 'report.md')), cost: rep.cost ?? 0 };
  } catch (e) { rev = { error: clip(e.message, 120) }; }
  change(id, (x) => { x.auto = { ...x.auto, review: rev }; });
  if (rev.error) return leaveOpen(id, `Fix is in and rendered, but the 30 fps review didn't finish: ${rev.error}`);
  if (rev.a) return leaveOpen(id, `Fix is in and rendered, but the 30 fps review finds ${rev.a} A fault${rev.a > 1 ? 's' : ''} on ${map.id}: ${rev.worst}`);
  change(id, (x) => {
    x.auto = { ...x.auto, state: 'done', step: null, updated: new Date().toISOString() };
    delete x.question;
    setStatus(x, 'fixed', 'claude', what);
  });
  log(`${id}: fixed: ${what}`);
}

const shotFolder = (o) => path.basename(o.video).replace(/\.mp4$/, '');

// ---------- the worker ----------

function queuedNext() {
  return readNotes(video).filter((n) => n.auto?.state === 'queued' && !n.removed).sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''))[0] ?? null;
}

async function main() {
  if (autoRunning(video)) { log('a worker is already running'); return; }
  const lock = autoLock(video);
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, since: new Date().toISOString() }));
  const free = () => { try { if (readJson(lock, {}).pid === process.pid) fs.unlinkSync(lock); } catch {} };
  process.on('exit', free);
  if (oneId) change(oneId, (n) => { n.auto = { ...(n.auto ?? {}), state: 'queued' }; });
  // One pass over the queue, then a last look, so a note saved as this finishes isn't left waiting.
  for (let n; (n = queuedNext()); ) {
    try { await work(n.id); }
    catch (e) { log(`${n.id}: crashed: ${e.stack ?? e}`); leaveOpen(n.id, `The loop stopped on an error: ${clip(e.message, 130)}`); }
  }
  free();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
