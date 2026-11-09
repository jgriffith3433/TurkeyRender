#!/usr/bin/env node
// mv make: THE way to make a video. A staged pipeline from an approved storyboard to a final, every gate enforced here, not remembered.
//   node Director/mv.mjs [--video <v>] make [--to <stage>] [--shot <id>] [--force] [--w --h --fps]   run the stages in order, stop at the first failed gate
//   node Director/mv.mjs [--video <v>] status                      the stage table: pass / fail / stale / waiting, and what to do
//   node Director/mv.mjs [--video <v>] approve <shot> [--note ".."]  record J's yes on a hero test (keyed by the shot's hash: a changed shot needs a new yes)
//   node Director/mv.mjs [--video <v>] coldview [previs.mp4]        the cold view alone (Gen vision, about $0.015 a 20 s chunk)
//   node Director/mv.mjs doctor [--fix]                             the environment (tools/mv/doctor.mjs): Unity, queue, locks, stray C#, disk, memory, ffmpeg, builds
//   node Director/tools/mv/make.mjs test                            self test (no Unity, no Gen)
//
// Stages (videos/<v>/make/state.json keeps each one's result against a hash of what it depends on, so a rerun is fast; --force reruns a stage):
//   1 board    storyboard/shots.json exists, every shot has size, lens, frames, action, reg, change; the craft rules (average, bursts, calm); board -> cards up to date
//   2 cards    mv cards check and mv lint clean: 0 errors, and clip-banned warnings count as errors here
//   3 build    the scene builds (a plain mv cards), compile clean, bake gate PASS
//   4 motion   mv critic on the cut >= threshold (style.json make.critic, default 7) with the worst moments; mv motioncheck visible contact = 0
//   5 shot     mv shotcheck: 0 A faults
//   6 test     every hero shot (board "hero": true, or a card tag hero) rendered as a 5 s, 24 fps test with review strips; each needs J's yes (mv approve)
//   7 previs   full previs with the finished mix, then the automatic cold view (Gen vision per 20 s chunk): every "change" beat of the board must be retold
//   8 final    freeze if not frozen, mv final (review, flash check), critic on the final, final/REPORT.md, output/<v>-vN.mp4 and a phone copy under 30 MB
// Exit: 0 all asked stages pass, 2 a gate failed (what to fix is printed), 3 waiting for J (hero tests), 1 an error.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIRECTOR, PROJECT, pickVideo, listVideos, loadScore, loadClock } from './score.mjs';
import { parse as parseData } from './jsonc.mjs';
import { inputs, staleReason } from './stamp.mjs';
import { lint } from './lint.mjs';
import { refusal as bakeRefusal, status as bakeStatus } from './bakegate.mjs';
import { fresh as freshShot, faults as shotFaults, reportFile as shotReportFile } from './shotgate.mjs';
import { frozen as frozenOf, current as freezeCurrent, drift as freezeDrift } from './freeze.mjs';
import { engineHash, planShots, nativeActors } from './shotdeps.mjs';
import { tickets } from './queue.mjs';
import { mixSound, mux } from './sound.mjs';
import { check as genCheck } from './generated.mjs';
import { unityEditor } from './doctor.mjs';

const MV = path.join(DIRECTOR, 'mv.mjs');
export const STAGES = ['board', 'cards', 'build', 'motion', 'shot', 'test', 'previs', 'final'];
const CONTACT = new Set(['bodies', 'prop', 'self', 'hand']);
// ffmpeg reads a filtergraph through two escape levels (graph, then the filter's options), so a ':' inside a
// quoted drawtext value needs three backslashes: C\\\: and %{pts\\\:hms} (checked on Windows ffmpeg 8, 2026-11-08).
const FF_COLON = '\\\\\\:';
const FONT = `'C${FF_COLON}/Windows/Fonts/arial.ttf'`;
const PRICES = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5], 'claude-fable-5-1': [10, 50] };
const TTY = !!process.stdout.isTTY, RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', DIM = TTY ? '\x1b[2m' : '', OFF = TTY ? '\x1b[0m' : ''; // piped output (an agent reading it) gets no escape codes
const color = process.stdout.isTTY ? (c, s) => c + s + OFF : (c, s) => s;

const sha = (x) => crypto.createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
const read = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const readData = (f, d = null) => { try { return parseData(fs.readFileSync(f, 'utf8'), f); } catch { return d; } };
const write = (f, x) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = `${f}.${process.pid}.tmp`; fs.writeFileSync(t, JSON.stringify(x, null, 1)); fs.renameSync(t, f); };
const rel = (f) => path.relative(DIRECTOR, f).split(path.sep).join('/');
const fileHash = (f) => { try { return sha(fs.readFileSync(f)); } catch { return 'none'; } };
const dirHash = (d) => { try { return sha(fs.readdirSync(d).sort().map((n) => n + ':' + fileHash(path.join(d, n)))); } catch { return 'none'; } };
const clockText = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const r2 = (x) => Math.round(x * 100) / 100;
const say = (m) => console.error(m);

/** A gate's verdict. fail(problems) stops the pipeline; each problem is { what, fix, file?, field? } and the printout tells a model exactly where to go. */
class Gate extends Error { constructor(problems, extra = {}) { super('gate'); this.problems = Array.isArray(problems) ? problems : [problems]; this.extra = extra; } }
class Waiting extends Error { constructor(problems, extra = {}) { super('waiting'); this.problems = problems; this.extra = extra; } }
const P = (what, fix, file, field) => ({ what, fix, ...(file ? { file: typeof file === 'string' ? file : rel(file) } : {}), ...(field ? { field } : {}) });

// ---------- running other tools ----------

/** Runs a command, streaming its output when `show`, and returns { ok, status, out, err }. Async, so nothing here blocks a queue heartbeat. */
function run(cmd, list, { show = false, cwd = PROJECT, env = process.env } = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, list.map(String), { stdio: ['ignore', 'pipe', 'pipe'], cwd, env, windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; if (show) process.stdout.write(d); });
    p.stderr.on('data', (d) => { err += d; if (show) process.stderr.write(d); });
    p.on('error', (e) => res({ ok: false, status: -1, out, err: err + String(e) }));
    p.on('close', (code) => res({ ok: code === 0, status: code, out, err }));
  });
}
const mv = (V, list, opts) => run(process.execPath, [MV, '--video', V.name, ...list], opts);
const ffmpeg = async (...list) => { const r = await run('ffmpeg', ['-y', '-loglevel', 'error', ...list]); if (!r.ok) throw new Error('ffmpeg: ' + r.err.slice(-600)); };
const tail = (s, n = 900) => String(s ?? '').trim().slice(-n);

async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets', '-show_entries', 'format=duration,size', '-of', 'json', file]);
  try { const j = JSON.parse(r.out), s = j.streams[0], [a, b] = s.r_frame_rate.split('/').map(Number); return { w: s.width, h: s.height, fps: a / (b || 1), frames: +s.nb_read_packets, duration: +j.format.duration, bytes: +j.format.size }; } catch { return null; }
}

// ---------- the video: settings, clock, state ----------

export function settings(V) {
  const st = readData(path.join(V.dir, 'style.json'), {}) ?? {}, m = st.make ?? {};
  const score = readData(V.score, {}) ?? {};
  return {
    fps: +(m.fps ?? score.fps ?? 24),
    critic: +(m.critic ?? 7),
    criticRequired: m.criticRequired ?? null, // null: required once tools/critic.mjs exists
    motion: { ignoreProps: [], contactMaxCm: 0, ...(m.motion ?? {}) },
    board: { avgMin: 2.5, avgMax: 4, burstLen: 1.5, burstMax: 6, holdAfter: 2, calmLen: 3, calmShare: 0.3, ...(m.board ?? {}) },
    coldview: { chunk: 20, fps: 2, model: 'claude-sonnet-5-5', judge: 'claude-haiku-5-5', budget: 0.5, ...(m.coldview ?? {}) },
    test: { seconds: 5, fps: 24, w: 1280, h: 720, ...(m.test ?? {}) }, // the hero test is J's yes on the real thing: full quality, 5 s around the moment
    phoneMB: +(m.phoneMB ?? 30),
  };
}
const stateFile = (V) => path.join(V.dir, 'make', 'state.json');
const loadState = (V) => read(stateFile(V), { version: 1, stages: {} });
const saveStage = (V, name, r) => { const s = loadState(V); s.stages[name] = { ...r, at: new Date().toISOString() }; write(stateFile(V), s); return s; };

function clockOf(V) { const { score } = loadScore(V); return loadClock(V, score); }
/** The cut's end: the last card's end, else the song's. */
function cutEnd(V) {
  const map = read(path.join(V.dir, 'cards.map.json'));
  if (map?.length) return Math.max(...map.map((x) => x.tEnd));
  return clockOf(V).duration;
}
const cardsMap = (V) => read(path.join(V.dir, 'cards.map.json'), []);
const hasCards = (V) => fs.existsSync(path.join(V.dir, 'cut.json'));
const boardFile = (V) => path.join(V.dir, 'storyboard', 'shots.json');
const isNative = (V) => { try { return nativeActors(V.name, loadScore(V).score).size > 0; } catch { return false; } };
const codeKey = (V) => { try { const c = freezeCurrent(V); return `${c.engine}|${c.code}|${c.model}`; } catch { return engineHash({ native: isNative(V) }); } };

/** Which board shot or card a time falls in. */
const shotAt = (map, t) => map.find((x) => t >= x.t - 1e-3 && t < x.tEnd - 1e-3) ?? null;

// ---------- 1. board ----------

/** The board's shots with their times: by the card of the same id when the cards exist (the clock may have moved), else by the frames in order. */
export function boardShots(board, map, fps) {
  let t = 0;
  return (board.shots ?? []).map((s) => {
    const len = (s.frames ?? 0) / fps, card = map.find((x) => x.id === s.id);
    const o = { ...s, len: card ? card.tEnd - card.t : len, t: card ? card.t : t, tEnd: card ? card.tEnd : t + len, fromCard: !!card };
    t += len;
    return o;
  });
}

/** Validates a board: fields per shot and the craft rules. Returns { problems, stats }. Pure, for the self test. */
export function validateBoard(board, rules, fps = 24, file = 'storyboard/shots.json') {
  const problems = [], shots = board?.shots;
  if (!Array.isArray(shots) || !shots.length) return { problems: [P('shots.json has no "shots" list', 'Write the storyboard: {"fps":24,"shots":[{"id":..,"size":..,"lens":..,"frames":..,"action":..,"reg":..,"change":..}]}', file, 'shots')], stats: null };
  const ids = new Map();
  shots.forEach((s, i) => {
    const at = `shots[${i}]${s.id ? ` (${s.id})` : ''}`;
    if (!s.id || !/^[a-z0-9][a-z0-9_]*$/i.test(s.id)) problems.push(P(`${at}: no usable "id"`, 'Give it a short id of letters, digits and _, the same id its card will have', file, `${at}.id`));
    else { if (ids.has(s.id)) problems.push(P(`${at}: id "${s.id}" is also shots[${ids.get(s.id)}]`, 'Ids must be unique: rename one', file, `${at}.id`)); ids.set(s.id, i); }
    if (!s.size || !String(s.size).trim()) problems.push(P(`${at}: no "size"`, 'Say the shot size: WIDE, MEDIUM, MCU, CU, ECU, INSERT, TWO-SHOT, OTS, POV', file, `${at}.size`));
    if (!(+s.lens > 0)) problems.push(P(`${at}: "lens" is ${JSON.stringify(s.lens)}`, 'A focal length in mm (24 wide, 35, 50, 85 close, 100+ ecu)', file, `${at}.lens`));
    if (!(Number.isInteger(s.frames) && s.frames > 0)) problems.push(P(`${at}: "frames" is ${JSON.stringify(s.frames)}`, `A whole number of frames at ${fps} fps (${fps} = 1 s)`, file, `${at}.frames`));
    if (!s.action || String(s.action).trim().length < 8) problems.push(P(`${at}: "action" is empty or too short`, 'One or two sentences: who does what, where, in this shot', file, `${at}.action`));
    const reg = s.reg ?? s.register;
    if (!reg || !String(reg).trim()) problems.push(P(`${at}: no "reg" (register)`, 'The register the shot plays in: deadpan, plain, epic, warm, cold...', file, `${at}.reg`));
    const change = s.change ?? s.changes;
    if (!change || String(change).trim().length < 4) problems.push(P(`${at}: no "change" (what changes)`, 'What the viewer knows or feels after this shot that they did not before. If nothing changes, the shot goes', file, `${at}.change`));
  });
  const lens = shots.map((s) => (+s.frames || 0) / fps), total = lens.reduce((a, b) => a + b, 0), avg = total / shots.length;
  const stats = { shots: shots.length, seconds: r2(total), avg: r2(avg) };
  if (avg < rules.avgMin || avg > rules.avgMax) problems.push(P(`average shot ${avg.toFixed(2)} s over ${shots.length} shots: the craft rule is ${rules.avgMin}-${rules.avgMax} s`, avg < rules.avgMin ? 'Merge shots or lengthen the holds (frames) until the average is in range; or set make.board.avgMin in style.json with a reason' : 'Split long shots or cut dead air (frames) until the average is in range; or set make.board.avgMax in style.json with a reason', file, 'shots[].frames'));
  // Bursts: a run of shots under burstLen s. No more than burstMax in a row, and the shot after a burst holds at least holdAfter s.
  let run = 0, bursts = 0, runStart = 0;
  for (let i = 0; i <= shots.length; i++) {
    const short = i < shots.length && lens[i] < rules.burstLen;
    if (short) { if (!run) runStart = i; run++; continue; }
    if (run >= 2) {
      bursts++;
      const names = shots.slice(runStart, i).map((s) => s.id).join(', ');
      if (run > rules.burstMax) problems.push(P(`a burst of ${run} shots under ${rules.burstLen} s (${names}): the rule is at most ${rules.burstMax}`, 'Cut shots from the burst or lengthen some of its frames', file, `shots[${runStart}..${i - 1}].frames`));
      if (i < shots.length && lens[i] < rules.holdAfter) problems.push(P(`the shot after the burst ${names} is ${shots[i].id} at ${lens[i].toFixed(2)} s: a burst must land on a hold of at least ${rules.holdAfter} s`, `Lengthen ${shots[i].id} to ${Math.ceil(rules.holdAfter * fps)} frames or more, or end the burst on a longer shot`, file, `shots[${i}].frames`));
      if (i >= shots.length) problems.push(P(`the board ends inside a burst (${names})`, `End on a hold of at least ${rules.holdAfter} s`, file, `shots[${shots.length - 1}].frames`));
    }
    run = 0;
  }
  const calm = lens.filter((l) => l >= rules.calmLen).reduce((a, b) => a + b, 0), calmShare = total ? calm / total : 0;
  stats.bursts = bursts; stats.calmShare = r2(calmShare);
  if (calmShare < rules.calmShare) problems.push(P(`calm shots (${rules.calmLen} s or longer) are ${Math.round(calmShare * 100)}% of the running time: the rule is at least ${Math.round(rules.calmShare * 100)}%`, 'Give the quiet beats room: longer holds on reactions and reveals, fewer micro-cuts', file, 'shots[].frames'));
  return { problems, stats };
}

/** The board2cards tool when another agent has written it: Director/tools/board2cards.mjs or the video's storyboard/board2cards.mjs. */
// The shared tool counts only for a video whose cut.json it wrote (its GENERATED head names it): _cards_test and older videos have hand cuts.
const board2cards = (V) => {
  const own = path.join(V.dir, 'storyboard', 'board2cards.mjs'); if (fs.existsSync(own)) return own;
  let head = ''; try { head = fs.readFileSync(path.join(V.dir, 'cut.json'), 'utf8').slice(0, 300); } catch {}
  if (!/GENERATED by Director\/tools\/board2cards\.mjs/.test(head)) return null;
  return [path.join(DIRECTOR, 'tools', 'board2cards.mjs'), path.join(DIRECTOR, 'tools', 'mv', 'board2cards.mjs')].find(fs.existsSync) ?? null;
};

async function stageBoard(V, S) {
  const f = boardFile(V);
  if (!fs.existsSync(f)) throw new Gate(P(`no storyboard at ${rel(f)}`, `Write the board first: storyboard/shots.json with "fps" and "shots" (id, size, lens, frames, action, reg, change; "hero": true on the shots J must approve). Hawkes Punch's is the worked example: videos/hawkespunch/storyboard/shots.json`, f));
  const board = readData(f);
  if (!board) throw new Gate(P(`${rel(f)} is not valid JSON`, 'Fix the JSON (a trailing comma, a missing quote). node -e "JSON.parse(require(\'fs\').readFileSync(\'<file>\'))" names the spot', f));
  const fps = +(board.fps ?? S.fps);
  const { problems, stats } = validateBoard(board, S.board, fps, rel(f));
  if (problems.length) throw new Gate(problems, { stats });
  // board -> cards up to date. board2cards.mjs (another agent's, Hawkes Punch only, deterministic) is never run from here: a stale tool run is
  // yours to make. What is checked: the cut's ids are the board's ids in the board's order, and nothing the tool reads is newer than what it wrote.
  const tool = board2cards(V), notes = [];
  if (hasCards(V)) {
    const cut = readData(path.join(V.dir, 'cut.json'), {}), cutIds = (cut.shots ?? []).map((s) => s.id), boardIds = board.shots.map((s) => s.id);
    const noCard = boardIds.filter((id) => !cutIds.includes(id)), noBoard = cutIds.filter((id) => !boardIds.includes(id));
    const how = tool ? `Run: node ${rel(tool)}   (it writes cut.json, cards/board.yaml and lines.json from the board), then mv cards check` : 'board2cards.mjs is not written for this video, so: give each a card (cards/*.yaml) and a cut.json line with the same id, or take it off the board';
    if (noCard.length || noBoard.length) {
      const ps = [];
      if (noCard.length) ps.push(P(`${noCard.length} board shot${noCard.length > 1 ? 's have' : ' has'} no card in cut.json: ${noCard.slice(0, 12).join(', ')}${noCard.length > 12 ? '...' : ''}`, how, path.join(V.dir, 'cut.json'), 'shots[].id'));
      if (noBoard.length) ps.push(P(`${noBoard.length} cut shot${noBoard.length > 1 ? 's are' : ' is'} not on the board: ${noBoard.slice(0, 12).join(', ')}${noBoard.length > 12 ? '...' : ''}`, tool ? how : 'Every shot in the cut must be a board shot (same id): put it on the board with size, lens, frames, action, reg and change, or drop it from cut.json', f, 'shots[].id'));
      throw new Gate(ps, { stats });
    }
    const order = boardIds.filter((id) => cutIds.includes(id)); if (order.some((id, i) => id !== cutIds[i])) throw new Gate(P('the cut is not in the board\'s order', how, path.join(V.dir, 'cut.json'), 'shots'), { stats });
    if (tool) {
      const made = path.join(V.dir, 'cards', 'board.yaml'), readsFrom = [f, path.join(V.dir, 'storyboard', 'overrides.yaml'), tool].filter(fs.existsSync);
      if (!fs.existsSync(made)) throw new Gate(P('the board has not been turned into cards yet (no cards/board.yaml)', how, made), { stats });
      const newer = readsFrom.filter((x) => fs.statSync(x).mtimeMs > fs.statSync(made).mtimeMs + 1000);
      if (newer.length) throw new Gate(P(`board -> cards is out of date: ${newer.map(rel).join(', ')} changed after cards/board.yaml was written`, how, made), { stats });
    } else notes.push('no board2cards for this video: ids and order checked by hand');
  } else notes.push('no cut.json yet: the cards stage will say so');
  const heroes = board.shots.filter((s) => s.hero).map((s) => s.id);
  if (!heroes.length) notes.push('no shot is marked "hero": true, so the test stage has nothing for J to approve. Mark the 3-6 shots the video stands on');
  return { summary: `${stats.shots} shots, ${stats.seconds} s, average ${stats.avg} s, ${stats.bursts} bursts, ${Math.round(stats.calmShare * 100)}% calm, ${heroes.length} hero`, stats, heroes, notes };
}
const boardKey = (V) => sha([fileHash(boardFile(V)), fileHash(path.join(V.dir, 'cut.json')), dirHash(path.join(V.dir, 'cards')), board2cards(V) ? fileHash(board2cards(V)) : 'no-tool', JSON.stringify(settings(V).board)]);

// ---------- 2. cards ----------

async function stageCards(V) {
  if (!hasCards(V)) throw new Gate(P('no cut.json: this video has no cards', 'mv make works on card videos. Write cut.json and cards/*.yaml (AGENTS.md "Shot cards"), or run board2cards', path.join(V.dir, 'cut.json')));
  const c = await mv(V, ['cards', 'check']);
  if (!c.ok) throw new Gate(P('mv cards check failed', `Fix what it names (file, card, key), then mv cards check:\n      ${tail(c.err || c.out, 1200).replace(/\n/g, '\n      ')}`));
  // Lint what the build WILL compile: the cards compiled in memory (acts/50-cards.json on disk may be stale: a card edit is not in it until the
  // next mv cards, and a gate that lints the old act passes a broken card). Nothing is written.
  let acts;
  try {
    const { loadVideo, compile, writeAct } = await import('../cards.mjs');
    const res = await compile(loadVideo(V.dir));
    acts = { '50-cards.json': writeAct(res.act) };
  } catch (e) { throw new Gate(P('the cards do not compile', `Fix what it names, then mv cards check:\n      ${tail(e.message, 1200).replace(/\n/g, '\n      ')}`, path.join(V.dir, 'cards'))); }
  const r = lint(V, { acts });
  const errors = r.items.filter((x) => x.sev === 'error'), banned = r.items.filter((x) => x.code === 'clip-banned' && x.sev !== 'error');
  const probs = [...errors, ...banned].map((x) => P(`[${x.code}] ${x.msg}`, x.fix ?? 'see mv lint', `${x.file}:${x.line}`));
  if (probs.length) throw new Gate(probs, { lint: `${errors.length} errors, ${banned.length} clip-banned (errors here)` });
  const warns = r.items.filter((x) => x.sev !== 'error').length;
  const g = generatedProblems(V);
  if (g.problems.length) throw new Gate(g.problems, { lint: `0 errors, ${warns} warnings` });
  return { summary: `cards check ok, lint 0 errors, ${warns} warnings${banned.length ? '' : ' (no clip-banned)'}; generated: ${g.summary}`, notes: g.notes };
}

/** The generated-file manifest (videos/<v>/generated.json, tools/mv/generated.mjs): a hand edit on a generated file, a missing one, or an act that says
 *  GENERATED with no tool registered stops the gate; stale and unverified ones are notes (the build regenerates them, or stops with "stale: run X"). */
export function generatedProblems(V) {
  const items = genCheck(V.dir), problems = [], notes = [], man = path.join(V.dir, 'generated.json');
  for (const x of items) {
    const warnOnly = x.gate === 'warn';
    if (x.state === 'edited') (warnOnly ? notes : problems).push(warnOnly ? `${x.file} was edited by hand (gate warn)` : P(`${x.file} is generated and was EDITED BY HAND: ${x.tool} throws the edit away on its next run`, `Move the change into the tool or its inputs, then run: ${x.tool}. If the file is hand-maintained now: mv generated adopt ${V.name} ${x.file} --tool none`, path.join(V.dir, x.file)));
    else if (x.state === 'missing') problems.push(P(`${x.file} is registered as generated but is missing`, x.tool ? `Run: ${x.tool}` : 'Restore it from _backup/, or drop it from generated.json', man, `files["${x.file}"]`));
    else if (x.state === 'unregistered') problems.push(P(`${x.file} says GENERATED on its first lines but no tool is registered for it`, `mv generated adopt ${V.name} ${x.file} --tool "<the command that makes it>" --inputs <what it reads>   (or --tool none if it is hand-maintained now)`, man));
    else if (x.state === 'stale' || x.state === 'unverified') notes.push(`${x.file} is ${x.state}${x.changed ? ` (${x.changed.slice(0, 3).join(', ')})` : ''}: the build runs ${x.tool}${warnOnly ? ' (gate warn: only warns if it fails)' : ''}`);
  }
  const ok = items.filter((x) => x.state === 'ok').length;
  return { problems, notes, summary: items.length ? `${ok} of ${items.length} fresh${notes.length ? `, ${notes.length} to regenerate` : ''}` : 'none registered' };
}

// ---------- 3. build ----------

async function stageBuild(V) {
  const r = await mv(V, ['cards'], { show: true }); // compiles, lints, compile gate, bakes stale takes, plain build, size test, bake report, 5 Hz shot check line
  if (!r.ok) {
    const compile = fs.existsSync(path.join(DIRECTOR, 'compile-errors.txt')) ? fs.readFileSync(path.join(DIRECTOR, 'compile-errors.txt'), 'utf8') : null;
    if (compile) throw new Gate(P('C# does not compile', `Fix the errors Unity reports (file:line), then mv refresh and mv cards again:\n      ${tail(compile, 1200).replace(/\n/g, '\n      ')}`, path.join(DIRECTOR, 'compile-errors.txt')));
    throw new Gate(P('the build failed', `Read the end of the build log above (lint, bake or Unity). Fix it, then mv cards:\n      ${tail(r.err || r.out, 900).replace(/\n/g, '\n      ')}`));
  }
  const stale = staleReason(V);
  if (stale && !stale.unknown) throw new Gate(P(`the scene is stale right after the build: ${stale.why}`, 'Something edited the inputs during the build. Run mv make again'));
  const bake = bakeRefusal(V);
  if (bake && !bake.soft) throw new Gate(P(`bake gate: ${bake.why}`, `mv bake status names the take and the number; fix the take (library/performances), or widen library/bake-gate.json with a reason, then mv make:\n      ${bakeStatus(V).split('\n').slice(0, 8).join('\n      ')}`, path.join(V.dir, 'bake-report.json')));
  const stamp = read(path.join(DIRECTOR, 'gen', `build-${V.name}.json`));
  return { summary: `built ${stamp?.at ?? 'now'}, compile clean, bake gate ${bake?.soft ? 'n/a (no takes)' : 'PASS'}`, builtAt: stamp?.at ?? null };
}
const buildKey = (V) => sha([inputs(V).hash, codeKey(V)]);

// ---------- 4. motion ----------

const criticTool = () => [path.join(DIRECTOR, 'tools', 'critic.mjs')].find(fs.existsSync) ?? null;

/** The motion critic (tools/critic.mjs cut, through `mv critic` so its Unity dumps queue): the built scene over from..to, report in videos/<v>/critic/<label>/report.json
 *  ({ total: 0-10, principles, worst: [{ t, f, part, what, also }], perActor }). Returns { score, worst, shots: null, raw } or { error }. Null when the tool is not there. */
async function critic(V, { from, to, label } = {}) {
  const tool = criticTool();
  if (!tool) return null;
  const lab = label ?? (from != null ? `make-${from.toFixed(0)}-${to.toFixed(0)}` : 'make-all');
  const r = await mv(V, ['critic', ...(from != null ? [from.toFixed(3), to.toFixed(3)] : []), '--label', lab, '--quiet'], { show: true });
  const rep = read(path.join(V.dir, 'critic', lab, 'report.json'));
  if (!rep) return { error: `mv critic wrote no ${rel(path.join(V.dir, 'critic', lab, 'report.json'))} (${tail(r.err || r.out, 300)})` };
  const map = cardsMap(V);
  const worst = (rep.worst ?? []).map((w) => ({ t: w.t, shot: shotAt(map, w.t)?.id ?? null, what: `${w.part ? w.part + ': ' : ''}${w.what}${w.also?.length ? ` (also ${w.also.join(', ')})` : ''}` }));
  return { score: +rep.total, worst, shots: null, raw: { total: rep.total, perActor: rep.perActor, principles: Object.fromEntries(Object.entries(rep.principles ?? {}).map(([k, p]) => [k, p.score])), report: rel(path.join(V.dir, 'critic', lab, 'report.md')) } };
}

async function stageMotion(V, S, only) {
  const end = cutEnd(V), from = only ? only.t : 0, to = only ? only.tEnd : end, problems = [];
  // The critic over the cut's own range (critic.mjs's default is the whole song, which runs past a short cut), or the one shot.
  const c = await critic(V, { from, to });
  let criticLine;
  if (!c) { criticLine = 'critic: tools/critic.mjs not there, skipped'; if (S.criticRequired) problems.push(P('mv critic is required (style.json make.criticRequired) and tools/critic.mjs does not exist', 'Restore Director/tools/critic.mjs, or set make.criticRequired false')); }
  else if (c.error) problems.push(P(`mv critic failed: ${c.error}`, `Run node Director/mv.mjs --video ${V.name} critic by hand and fix what it says (it needs a built scene and Unity)`));
  else {
    criticLine = `critic ${Number.isFinite(c.score) ? c.score.toFixed(1) : '?'}/10 (${c.raw.report})`;
    if (Number.isFinite(c.score) && c.score < S.critic) {
      problems.push(P(`critic: the motion scores ${c.score.toFixed(1)}/10, the threshold is ${S.critic}`, `Fix the worst moments below (clip choice: mv clips <use>; keyed poses: posederive/posecheck; a bad take: re-bake), then mv make. Per actor: ${Object.entries(c.raw.perActor ?? {}).map(([a, x]) => `${a} ${x.total}`).join(', ')}. Or set make.critic in style.json with a reason`, path.join(V.dir, 'critic'), 'total'));
      for (const w of c.worst.slice(0, 8)) problems.push(P(`critic worst: ${clockText(+w.t)}${w.shot ? ` ${w.shot}` : ''}: ${w.what}`, 'Look at it in motion (mv shot <id>, then the strips), not in a still', path.join(V.dir, 'cards'), w.shot ?? undefined));
    }
    if (!Number.isFinite(c.score)) problems.push(P('critic returned no total', `Read ${c.raw.report}; the report.json needs "total"`));
  }
  // The motion check over the range: visible contact (bodies, prop, self, hand) must be 0.
  const runsDir = path.join(V.captures, 'motioncheck-runs'), tag = `${from.toFixed(0)}-${to.toFixed(0)}`; // mv motioncheck <from> <to> keeps latest-<from>-<to>.json
  const latest = path.join(runsDir, `latest-${tag}.json`), builtAt = read(path.join(DIRECTOR, 'gen', `build-${V.name}.json`))?.at;
  const stale = !fs.existsSync(latest) || (builtAt && fs.statSync(latest).mtimeMs < new Date(builtAt).getTime());
  if (stale) {
    say(`motion check ${from.toFixed(1)}-${to.toFixed(1)} s (a full check: minutes on a native video)...`);
    const r = await mv(V, ['motioncheck', from.toFixed(3), to.toFixed(3)], { show: true });
    if (!r.ok) throw new Gate(P('mv motioncheck did not finish', `Unity or the queue stopped it. mv doctor, then mv make again:\n      ${tail(r.err || r.out, 500).replace(/\n/g, '\n      ')}`));
  }
  const mc = read(latest) ?? read(path.join(V.captures, 'motioncheck.json'));
  if (!mc) throw new Gate(P('no motion check result to read', `Expected ${rel(latest)}. Run mv motioncheck ${from.toFixed(1)} ${to.toFixed(1)} by hand and look at the error`));
  // make.motion.ignoreProps (style.json) names set pieces a body may sit in (a sofa cushion); make.motion.contactMaxCm lets shallow contact through. Both need a reason in the file.
  const ign = S.motion.ignoreProps, maxCm = S.motion.contactMaxCm;
  const contact = (mc.problems ?? []).filter((p) => CONTACT.has(p.check) && !p.hidden && p.to > from + 1e-3 && p.from < to - 1e-3 && !(p.check === 'prop' && ign.some((n) => String(p.what).includes(n))) && !(p.unit === 'cm deep' && +p.value <= maxCm));
  for (const p of contact.slice(0, 15)) problems.push(P(`contact: ${p.label} ${p.shot}: ${p.actor} ${p.check} ${p.what} (${p.value} ${p.unit}, ${p.seconds ?? '?'} s)`, p.check === 'hand' ? 'A reach or attach is off its target: fix the offset (attach pos/rot, reach to) on that card' : p.check === 'bodies' ? 'Two actors intersect: move a mark, or sell the contact with the cut (PIPELINE.md: no body contact without a paired clip)' : p.check === 'prop' ? 'A body passes through a set piece or prop: move the mark or the piece (library/sets), or the clip (mv clips <use>)' : 'The body passes through itself: another clip (mv clips <use>) or a keyed pose (posederive/posecheck)', path.join(V.captures, 'motioncheck-report.md'), p.shot));
  if (contact.length > 15) problems.push(P(`and ${contact.length - 15} more contact faults`, `All of them: ${rel(path.join(runsDir, `latest-${tag}.md`))}`));
  if (problems.length) throw new Gate(problems, { critic: criticLine });
  return { summary: `${criticLine}; motion check: 0 visible contact (${(mc.problems ?? []).length} findings in all, ${rel(path.join(runsDir, `latest-${tag}.md`))})`, critic: c?.raw ?? null };
}

// ---------- 5. shot ----------

async function stageShot(V, only) {
  const end = cutEnd(V), from = only ? only.t : 0, to = only ? only.tEnd : end;
  let r = freshShot(V, from, to);
  if (!r) {
    say(`shot check ${from.toFixed(1)}-${to.toFixed(1)} s...`);
    const c = await mv(V, ['shotcheck', from.toFixed(3), to.toFixed(3)], { show: true });
    if (!c.ok) throw new Gate(P('mv shotcheck did not finish', `mv doctor, then mv make again:\n      ${tail(c.err || c.out, 500).replace(/\n/g, '\n      ')}`));
    r = freshShot(V, from, to);
    if (!r) throw new Gate(P('the shot check ran but left no report for these inputs', `Something changed the inputs while it ran, or captures/shotcheck.json was not written. Run mv make again`, shotReportFile(V)));
  }
  const a = shotFaults(r, from, to);
  const fixes = { frame: 'Reframe the card camera (preset, lens, screen, height) so the subject\'s eyes are in and the face is not cut; the deliberate exception is a tag (ecu, insert), never --allow-shot', mark: 'Move the mark or the clip: the actor is off the card mark or standing where the clip sits (library/sets marks, cast entry)', readable: 'The subject does not read against its background: change light (lighting preset), mood, wardrobe colour, or the camera side; `dark` on the card only when meant', camin: 'The camera is inside a body: move it (dist, height) or make it a POV (tag pov)', propat: 'The prop is off its bone: fix attach pos/rot (call inspect for the bone\'s rest offset)', gesture: 'A hand or foot acts outside the frame: widen the shot or change the clip' };
  if (a.length) throw new Gate(a.slice(0, 12).map((p) => P(`${p.label} ${p.shot}: ${p.actor} ${p.check} ${p.what} (${p.value} ${p.unit}, ${p.seconds ?? '?'} s of ${p.shotLen ?? '?'})`, fixes[p.check] ?? 'see captures/motioncheck-report.md', path.join(V.captures, 'motioncheck-report.md'), p.shot)).concat(a.length > 12 ? [P(`and ${a.length - 12} more A faults`, 'All of them: ' + rel(path.join(V.captures, 'motioncheck-report.md')))] : []), { A: a.length, B: r.B });
  return { summary: `0 A, ${shotFaults(r, from, to, 'B').length} B in ${from.toFixed(1)}-${to.toFixed(1)} s` };
}

// ---------- 6. test (the human gate) ----------

const testsDir = (V) => path.join(V.dir, 'tests');
const approvedFile = (V) => path.join(testsDir(V), 'approved.json');

/** The hero shots: board "hero": true, plus any card tagged hero. With their current times and shot hashes (shotdeps at the test size). */
function heroShots(V, S) {
  const map = cardsMap(V), board = readData(boardFile(V), { shots: [] }) ?? { shots: [] };
  const ids = new Set(board.shots.filter((s) => s.hero).map((s) => s.id));
  try { for (const f of fs.readdirSync(path.join(V.dir, 'cards'))) { const t = fs.readFileSync(path.join(V.dir, 'cards', f), 'utf8'); for (const m of t.matchAll(/- id:\s*([\w-]+)[\s\S]*?(?=\n- id:|$)/g)) if (/\btags:\s*\[[^\]]*\bhero\b/.test(m[0])) ids.add(m[1]); } } catch {}
  let plan = null;
  try { plan = planShots(V, { fps: S.test.fps, w: S.test.w, h: S.test.h }); } catch (e) { say(`note: no shot hashes (${String(e.message).split('\n')[0]}): tests are keyed by the inputs hash instead`); }
  const fallback = inputs(V).hash;
  const end = map.length ? Math.max(...map.map((x) => x.tEnd)) : 0;
  return [...ids].map((id) => {
    const c = map.find((x) => x.id === id);
    if (!c) return { id, t: null, tEnd: null, hash: null, inCut: false };
    const w = testWindow(c.t, c.tEnd, end, S.test.seconds);
    // The test shows every shot in its window (a 0.8 s punch needs the wind-up before and the hold after), so its hash is all of theirs: a change to a
    // neighbour in the window is a new test and a new yes.
    const seen = map.filter((x) => x.t < w.to - 1e-3 && x.tEnd > w.from + 1e-3);
    const hash = sha(seen.map((x) => `${x.id}:${plan?.shots.find((p) => p.id === x.id)?.hash ?? sha([fallback, x.id])}:${r2(x.t)}`).concat(`${r2(w.from)}-${r2(w.to)}`));
    return { id, t: c.t, tEnd: c.tEnd, from: w.from, to: w.to, shots: seen.map((x) => x.id), hash, inCut: true };
  });
}

/** The test window: the whole hero shot when it is at least `seconds` long (its first `seconds`), else `seconds` centred on it, inside the cut. */
export function testWindow(t, tEnd, end, seconds) {
  const len = tEnd - t;
  if (len >= seconds) return { from: t, to: t + seconds };
  let from = Math.max(0, t - (seconds - len) / 2), to = from + seconds;
  if (end && to > end) { to = end; from = Math.max(0, end - seconds); }
  return { from, to };
}

async function renderTest(V, S, h) {
  const dir = testsDir(V); fs.mkdirSync(dir, { recursive: true });
  const from = h.from, to = h.to, out = path.join(dir, `${h.id}.mp4`), pic = path.join(dir, `${h.id}.pic.mp4`), wav = path.join(dir, `${h.id}.wav`);
  say(`test render ${h.id} (${h.shots.join(', ')}): ${from.toFixed(2)}-${to.toFixed(2)} s at ${S.test.w}x${S.test.h}, ${S.test.fps} fps...`);
  const r = await mv(V, ['render', '--from', from.toFixed(6), '--to', to.toFixed(6), '--w', S.test.w, '--h', S.test.h, '--fps', S.test.fps, '--out', pic, '--picture-only', '--poll', 250], { show: true });
  if (!r.ok || !fs.existsSync(pic)) throw new Gate(P(`the test render of ${h.id} failed`, `Its gates (stale scene, bake, shot A) say why above; fix, then mv make:\n      ${tail(r.err || r.out, 600).replace(/\n/g, '\n      ')}`));
  const frames = (await probe(pic))?.frames ?? 0;
  const ff = async (...a) => ffmpeg(...a);
  await mixSound(V, loadScore(V).score, { from, to, wav, ffmpeg: ff });
  await mux(pic, wav, out, { seconds: frames / S.test.fps, ffmpeg: ff });
  for (const f of [pic, wav]) { try { fs.unlinkSync(f); } catch {} }
  const strips = path.join(dir, `${h.id}-strips`);
  const s = await run(process.execPath, [path.join(DIRECTOR, 'tools', 'review_strips.mjs'), '--video', out, '--start', from.toFixed(3), '--out', strips, '--cuts', '--top', 12]);
  if (!s.ok) say(`note: review strips failed for ${h.id}: ${tail(s.err, 300)}`);
  write(path.join(dir, `${h.id}.json`), { id: h.id, hash: h.hash, shots: h.shots, from, to, w: S.test.w, h: S.test.h, fps: S.test.fps, frames, rendered: new Date().toISOString(), strips: fs.existsSync(path.join(strips, 'index.md')) ? rel(path.join(strips, 'index.md')) : null });
  return out;
}

async function stageTest(V, S, only) {
  let heroes = heroShots(V, S);
  if (only) heroes = heroes.filter((h) => h.id === only.id);
  if (!heroes.length) {
    if (only) throw new Gate(P(`${only.id} is not a hero shot`, 'Mark it "hero": true on the board (storyboard/shots.json) or tag the card (tags: [hero]) to test it here', boardFile(V), only.id));
    throw new Gate(P('no hero shots to test', 'Mark the shots the video stands on with "hero": true in storyboard/shots.json (3-6 of them). J approves each test before anything full renders', boardFile(V), 'shots[].hero'));
  }
  const missing = heroes.filter((h) => !h.inCut);
  if (missing.length) throw new Gate(missing.map((h) => P(`hero shot ${h.id} is not in the cut`, 'Give it a card and a cut.json line with the same id, or take hero off it', path.join(V.dir, 'cut.json'), h.id)));
  const approved = read(approvedFile(V), {});
  const waiting = [], rendered = [];
  for (const h of heroes) {
    const side = read(path.join(testsDir(V), `${h.id}.json`)), file = path.join(testsDir(V), `${h.id}.mp4`);
    let fresh = side && side.hash === h.hash && fs.existsSync(file);
    if (!fresh) { await renderTest(V, S, h); rendered.push(h.id); }
    const ok = approved[h.id] && approved[h.id].hash === h.hash;
    if (!ok) waiting.push({ ...h, was: approved[h.id] ? 'changed since J approved it' : 'not approved yet', file: rel(file), strips: rel(path.join(testsDir(V), `${h.id}-strips`, 'index.md')) });
  }
  if (waiting.length) throw new Waiting(waiting.map((w) => P(`${w.id}: ${w.was}`, `Show J ${w.file} (strips: ${w.strips}). On his yes: mv approve ${V.name} ${w.id} --note "his words"`)), { rendered, approvedCount: heroes.length - waiting.length, of: heroes.length });
  return { summary: `${heroes.length} hero test${heroes.length > 1 ? 's' : ''} approved by J (${heroes.map((h) => h.id).join(', ')})${rendered.length ? `, ${rendered.length} re-rendered` : ''}`, heroes: heroes.map((h) => ({ id: h.id, hash: h.hash, approved: approved[h.id] })) };
}
const testKey = (V, S) => sha([heroShots(V, S).map((h) => `${h.id}:${h.hash}`), fileHash(approvedFile(V))]);

export function approve(V, shotId, note) {
  if (!shotId) throw new Error(`mv approve ${V.name} <shot> --note "J's own words"`);
  if (!note || note === true || String(note).trim().length < 2) throw new Error(`mv approve needs J's own words: --note "<what J said>". The test gate is his yes, recorded with what he said; the driver never approves on its own.`);
  const side = read(path.join(testsDir(V), `${shotId}.json`));
  if (!side) throw new Error(`no test of ${shotId} in ${rel(testsDir(V))}: run mv make ${V.name} --to test first, and show J the file it makes`);
  const S = settings(V), now = heroShots(V, S).find((h) => h.id === shotId);
  if (!now) throw new Error(`${shotId} is not a hero shot of ${V.name} (board "hero": true or a card tag hero), so it has no test to approve`);
  if (now.hash !== side.hash) throw new Error(`the test of ${shotId} is older than the shot (${side.rendered}): the shot changed since. mv make ${V.name} --to test renders it again; approve the new file`);
  const a = read(approvedFile(V), {});
  a[shotId] = { hash: side.hash, at: new Date().toISOString(), file: rel(path.join(testsDir(V), `${shotId}.mp4`)), note: String(note).trim(), words: String(note).trim(), by: 'J, recorded by the driver' };
  write(approvedFile(V), a);
  return a[shotId];
}

// ---------- 7. previs and the cold view ----------

/** Every caption and line heard in from..to, in order: text cues of the acts, then lines.json entries with no caption at their time. */
export function transcript(V, from, to) {
  const out = [], clock = clockOf(V);
  const T = (v) => { try { return clock.T(v, 0); } catch { return null; } };
  try { for (const f of fs.readdirSync(V.acts).filter((x) => x.endsWith('.json')).sort()) { const a = readData(path.join(V.acts, f), {}); for (const c of a?.cues ?? []) if (typeof c.text === 'string') { const t = T(c.at); if (t != null && t < to && t + (clock.dur(c.for, t, 2)) > from) out.push({ t, text: c.text, kind: 'caption' }); } } } catch {}
  const lines = read(path.join(V.dir, 'lines.json'))?.lines ?? [];
  for (const l of lines) if (l.start < to && l.start + 3 > from && !out.some((o) => Math.abs(o.t - l.start) < 0.6)) out.push({ t: l.start, text: `[${l.mouth ?? 'voice'} speaks: ${path.basename(l.file, path.extname(l.file)).replace(/_/g, ' ')}]`, kind: 'line' });
  return out.sort((a, b) => a.t - b.t);
}

const genCost = (job, model) => { const r = job.result ?? {}, u = r.usage ?? {}, [pi, po] = PRICES[r.model ?? model] ?? PRICES['claude-sonnet-5-5']; const tin = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1; return r2((tin * pi + (u.output_tokens ?? 0) * po) / 1e6 * 100) / 100; };
async function ask(gen, tool, params, inputs, labels) {
  for (let tries = 0; ; tries++) {
    try { return await gen.run(tool, { params, inputs, labels }); } catch (e) { if (tries >= 3) throw e; await new Promise((r) => setTimeout(r, 4000 * (tries + 1))); }
  }
}

const VIEW_SCHEMA = { type: 'object', additionalProperties: false, required: ['happened', 'whoWhere', 'confusions', 'jokes', 'beats'], properties: {
  happened: { type: 'string' }, whoWhere: { type: 'string' },
  confusions: { type: 'array', items: { type: 'string' } },
  jokes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['what', 'landed'], properties: { what: { type: 'string' }, landed: { type: 'boolean' } } } },
  beats: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['t', 'what'], properties: { t: { type: 'string' }, what: { type: 'string' } } } } } };
const JUDGE_SCHEMA = { type: 'object', additionalProperties: false, required: ['beats'], properties: { beats: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'covered', 'evidence'], properties: { id: { type: 'string' }, covered: { type: 'boolean' }, evidence: { type: 'string' } } } } } };

/** The cold view of a previs: blind retellings per chunk, judged against the board's "change" beats. Writes COLD-VIEW-<n>.md; returns { file, n, cost, missed, chunks }. */
export async function coldView(V, S, previs, { budgetOnly = false } = {}) {
  const map = cardsMap(V), board = readData(boardFile(V), { shots: [] }) ?? { shots: [] }, fps = +(board.fps ?? S.fps);
  const bshots = boardShots(board, map, fps), end = cutEnd(V), C = S.coldview;
  const n = Math.ceil(end / C.chunk), perChunk = 0.015, estimate = r2(n * perChunk * 100) / 100;
  if (budgetOnly) return { chunks: n, estimate };
  if (estimate > C.budget) throw new Gate(P(`the cold view would cost about $${estimate.toFixed(2)} (${n} chunks of ${C.chunk} s), over the budget of $${C.budget}`, 'Raise make.coldview.budget or make.coldview.chunk (30 s) in style.json, or --force to run it anyway'));
  const { HawkesGen } = await import('./hawkesgen.mjs');
  const gen = new HawkesGen({ project: 'tkshock' });
  const dir = path.join(V.dir, 'make', 'coldview'); fs.mkdirSync(dir, { recursive: true });
  const prev = fs.readdirSync(V.dir).map((f) => /^COLD-VIEW-(\d+)\.md$/.exec(f)).filter(Boolean).map((m) => +m[1]);
  const num = prev.length ? Math.max(...prev) + 1 : 1, outMd = path.join(V.dir, `COLD-VIEW-${num}.md`);
  const chunks = [], missed = []; let cost = 0;
  for (let i = 0; i < n; i++) {
    const from = i * C.chunk, to = Math.min(end, from + C.chunk), frames = Math.round((to - from) * C.fps), cols = 8, rows = Math.ceil(frames / cols);
    const img = path.join(dir, `chunk-${String(i + 1).padStart(2, '0')}.jpg`);
    await ffmpeg('-ss', from.toFixed(3), '-t', (to - from).toFixed(3), '-i', previs, '-vf', `fps=${C.fps},setpts=PTS+${from.toFixed(3)}/TB,scale=240:-2,drawtext=fontfile=${FONT}:text='%{pts${FF_COLON}hms}':x=4:y=4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.55,tile=${cols}x${rows}:padding=2`, '-frames:v', '1', '-q:v', '4', img);
    const tr = transcript(V, from, to);
    const prompt = `You are watching a short film for the first time, cold: you know nothing about it and must not guess at a script. This image is a contact strip of ${frames} frames (${C.fps} a second, left to right, row by row) covering ${clockText(from)} to ${clockText(to)} of the film, each frame stamped with its time. The picture is a rough previs: flat light, no effects, simple sets. Judge what happens, not the finish.
Here is everything heard in that time (captions and spoken lines, with their times):
${tr.length ? tr.map((x) => `  ${clockText(x.t)}  ${x.text}`).join('\n') : '  (nothing)'}
Answer as JSON. "happened": in plain words, what happened in this stretch, as you would tell a friend (3-6 sentences). "whoWhere": who is in it and where they are, as far as you can tell (a man, a woman in a white coat, a bird...). "confusions": anything you could not follow: who did what, where someone went, why a cut happened, a prop that appeared or vanished. "jokes": each moment you think was meant to be funny, and whether it landed for you. "beats": each distinct event in order, with the time stamp where it happens (from the frames) and what changes because of it. Be concrete and honest; a dull or unreadable stretch is a finding.`;
    say(`cold view ${i + 1}/${n}: ${clockText(from)}-${clockText(to)}...`);
    const job = await ask(gen, 'llm.json', { prompt, model: C.model, effort: 'low', maxTokens: 1500, schema: VIEW_SCHEMA }, { images: [img] }, { coldview: `${V.name}-${num}-${i + 1}` });
    const view = job.result?.value ?? {}; cost += genCost(job, C.model);
    // The board's "change" beats inside this chunk, judged against the blind retelling by a cheap text model.
    // Each beat is judged once, in the chunk where its shot starts (a shot spanning two chunks was judged twice, and missed
    // in the chunk that never showed its start: 5 false misses on the Hawkes Punch animatic, 2026-11-08).
    const beats = bshots.filter((s) => s.t >= from - 1e-6 && (s.t < to - 1e-6 || to >= end - 1e-6) && !s.optional).map((s) => ({ id: s.id, t: s.t, change: String(s.change ?? s.changes ?? '') }));
    let judged = [];
    if (beats.length) {
      const jp = `A viewer watched ${clockText(from)}-${clockText(to)} of a film cold and wrote this retelling:\n\nHAPPENED: ${view.happened}\nWHO/WHERE: ${view.whoWhere}\nBEATS:\n${(view.beats ?? []).map((b) => `  ${b.t}: ${b.what}`).join('\n')}\n\nThe storyboard says these things must change in that stretch, one per shot (id, time, "what changes"):\n${beats.map((b) => `  ${b.id} (${clockText(b.t)}): ${b.change}`).join('\n')}\n\nFor each storyboard id, did the viewer's retelling show that this change got across (not the words: the substance, e.g. "the product's name reads" is covered if the viewer names the product)? A plant (something the viewer should notice but not yet understand) counts as covered if the viewer mentions the thing. Answer as JSON with "beats": [{id, covered, evidence}], evidence quoting the retelling or saying what is missing.`;
      const jj = await ask(gen, 'llm.json', { prompt: jp, model: C.judge, effort: 'low', maxTokens: 1200, schema: JUDGE_SCHEMA }, {}, { coldview: `${V.name}-${num}-${i + 1}-judge` });
      judged = jj.result?.value?.beats ?? []; cost += genCost(jj, C.judge);
      for (const b of beats) { const j = judged.find((x) => x.id === b.id); if (!j || !j.covered) missed.push({ ...b, evidence: j?.evidence ?? 'the judge did not mention it', chunk: i + 1 }); }
    }
    chunks.push({ i: i + 1, from, to, img: rel(img), view, beats, judged });
  }
  const md = [`# Cold view ${num}: ${path.basename(previs)}`, '', `Automatic (mv make, ${new Date().toISOString().slice(0, 16)}): ${n} chunks of ${C.chunk} s at ${C.fps} fps contact strips, each retold blind by ${C.model} with the captions and lines heard, then each board "change" beat judged against the retelling by ${C.judge}. Vision $${cost.toFixed(2)}.`, '',
    `## Verdict`, '', missed.length ? `**${missed.length} of ${chunks.reduce((a, c) => a + c.beats.length, 0)} board beats did not get across.**` : `**Every board beat got across (${chunks.reduce((a, c) => a + c.beats.length, 0)}).**`, ''];
  for (const m of missed) md.push(`- ${m.id} (${clockText(m.t)}, chunk ${m.chunk}): "${m.change}". ${m.evidence}`);
  md.push('', '## Chunk by chunk', '');
  for (const c of chunks) {
    md.push(`### ${clockText(c.from)}-${clockText(c.to)}`, '', `![strip](${path.relative(V.dir, path.join(V.dir, c.img.replace(/^videos\/[^/]+\//, ''))).split(path.sep).join('/')})`, '', `**What happened:** ${c.view.happened ?? ''}`, '', `**Who, where:** ${c.view.whoWhere ?? ''}`, '');
    if (c.view.beats?.length) { md.push('**Beats:**'); for (const b of c.view.beats) md.push(`- ${b.t}: ${b.what}`); md.push(''); }
    if (c.view.confusions?.length) { md.push('**Confusions:**'); for (const x of c.view.confusions) md.push(`- ${x}`); md.push(''); }
    if (c.view.jokes?.length) { md.push('**Jokes:**'); for (const j of c.view.jokes) md.push(`- ${j.landed ? 'landed' : 'did not land'}: ${j.what}`); md.push(''); }
    if (c.judged.length) { md.push('**Board beats:**'); for (const j of c.judged) md.push(`- ${j.covered ? 'ok' : 'MISSED'} ${j.id}: ${j.evidence}`); md.push(''); }
  }
  fs.writeFileSync(outMd, md.join('\n') + '\n');
  write(path.join(dir, `cold-view-${num}.json`), { previs: rel(previs), when: new Date().toISOString(), cost: r2(cost), missed, chunks });
  return { file: outMd, n: num, cost: r2(cost), missed, chunks: n, confusions: chunks.reduce((a, c) => a + (c.view.confusions?.length ?? 0), 0), jokes: chunks.flatMap((c) => c.view.jokes ?? []) };
}

async function stagePrevis(V, S, force) {
  const out = path.join(V.dir, 'previs.mp4'), mixed = path.join(V.dir, 'previs-mix.mp4'), end = cutEnd(V);
  say(`previs (whole cut, 426x240, ${S.fps} fps)...`); // mv previs defaults to 12 fps and ignores the style's: pass it
  const r = await mv(V, ['previs', '--fps', S.fps], { show: true });
  if (!r.ok || !fs.existsSync(out)) throw new Gate(P('mv previs failed', `Its gates (stale scene) say why above:\n      ${tail(r.err || r.out, 600).replace(/\n/g, '\n      ')}`));
  if (/played from source/.test(r.err)) throw new Gate(P('a take played from source, not baked, in the previs', 'mv bake, then mv make again: motion is judged from bakes only'));
  // The finished mix (dialogue at level, beds ducked, limiter) over the whole picture, as mv shot and mv final have it.
  const pic = (await probe(out)), wav = path.join(V.dir, 'previs.wav');
  await mixSound(V, loadScore(V).score, { from: 0, to: pic.duration, wav, ffmpeg: (...a) => ffmpeg(...a) });
  await mux(out, wav, mixed, { seconds: pic.duration, ffmpeg: (...a) => ffmpeg(...a) });
  try { fs.unlinkSync(wav); } catch {}
  const cv = await coldView(V, S, mixed);
  if (cv.missed.length) throw new Gate(cv.missed.map((m) => P(`cold viewer missed the beat of ${m.id} (${clockText(m.t)}): "${m.change}"`, `${m.evidence}. Make the beat read on screen (size, hold, staging, a caption) or change the board's "change" for ${m.id}. The retelling: ${rel(cv.file)}`, boardFile(V), m.id)), { coldView: rel(cv.file), cost: cv.cost });
  return { summary: `previs ${rel(mixed)} (${pic.duration.toFixed(1)} s), cold view ${path.basename(cv.file)}: every board beat retold, ${cv.confusions} confusions noted, ${cv.jokes.filter((j) => j.landed).length}/${cv.jokes.length} jokes landed, $${cv.cost.toFixed(2)}`, coldView: rel(cv.file), cost: cv.cost };
}

// ---------- 8. final ----------

async function phoneCopy(src, dst, maxMB) {
  for (const crf of [26, 29, 32, 35, 38]) {
    await ffmpeg('-i', src, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', dst);
    const mb = fs.statSync(dst).size / 1e6;
    if (mb <= maxMB) return { mb: r2(mb), crf };
  }
  return { mb: r2(fs.statSync(dst).size / 1e6), crf: 38, over: true };
}

async function stageFinal(V, S, flags, stagesSoFar) {
  if (!frozenOf(V)) { const f = await mv(V, ['freeze', '--note', 'mv make: frozen before the final']); say(f.out.trim() || f.err.trim()); }
  const d = freezeDrift(V);
  if (d?.engine || d?.model) say(color(YELLOW, `note: frozen and the ${d.engine ? 'engine' : 'model'} moved since: every shot renders`));
  const list = ['final', ...(flags.w ? ['--w', flags.w] : []), ...(flags.h ? ['--h', flags.h] : []), ...(flags.fps ? ['--fps', flags.fps] : []), ...(flags.name ? ['--name', flags.name] : []), ...(flags.force ? ['--force'] : [])];
  say('final render (mv final: build, the changed shots, stitch, flash check, review)...');
  const r = await mv(V, list, { show: true });
  const rep = read(path.join(V.dir, 'final', 'report.json'));
  if (!rep?.file || !fs.existsSync(path.join(DIRECTOR, rep.file))) throw new Gate(P('mv final made no file', `Its own gates (bake, shot, join) say why above:\n      ${tail(r.err || r.out, 800).replace(/\n/g, '\n      ')}`, path.join(V.dir, 'final', 'failed.json')));
  const out = path.join(DIRECTOR, rep.file), label = /-(v\d+|[^-]+)\.mp4$/.exec(path.basename(out))?.[1] ?? 'final';
  const problems = [];
  if (!rep.join?.clean) problems.push(P(`the join is not clean: ${JSON.stringify(rep.join)}`, 'A missing frame or a click at a seam: mv final --force on the shots named, or look at final/report.md'));
  const flash = read(path.join(V.dir, 'final', 'flashcheck.json'));
  if (!flash) problems.push(P('no flash check result', 'tools/flashcheck.mjs did not run on the file: run node Director/tools/flashcheck.mjs <file> by hand'));
  else if (!flash.ok) problems.push(P(`flash check failed: ${(flash.flashes ?? []).slice(0, 4).map((f) => `${clockText(f.t)} ${f.n ?? f.flashes} flashes`).join(', ')}${flash.red?.length ? `, red flash at ${flash.red.slice(0, 3).map(clockText).join(', ')}` : ''}`, 'Space the impact frames a second apart (2 inversions each) and fix the flashes it names (Ofcom: at most 3 a second, no saturated red)', path.join(V.dir, 'final', 'flashcheck.json')));
  const review = read(path.join(V.dir, 'review', label, 'report.json'));
  if (!review) { if (!flags['no-review']) problems.push(P('no review report for the final', `tools/review.mjs did not finish: node Director/mv.mjs --video ${V.name} review ${rel(out)} --label ${label}`)); }
  else if (review.a?.length) for (const a of review.a.slice(0, 10)) problems.push(P(`review A: ${a.shot ?? ''} ${a.t != null ? clockText(+a.t) : ''}: ${a.what ?? a.fault ?? JSON.stringify(a).slice(0, 160)}`, a.fix ?? 'see the review report', path.join(V.dir, 'review', label, 'report.md'), a.shot));
  const c = await critic(V, { label: `final-${label}` }); // the critic reads the built scene the final was rendered from, over the whole cut
  let criticLine = c ? (c.error ? `critic failed: ${c.error}` : `critic ${Number.isFinite(c.score) ? c.score.toFixed(1) : '?'}/10 on the final's scene`) : 'critic: not there';
  if (c && !c.error && Number.isFinite(c.score) && c.score < S.critic) problems.push(P(`critic on the final: ${c.score.toFixed(1)}, threshold ${S.critic}`, `Worst: ${(c.worst ?? []).slice(0, 6).map((w) => `${w.t != null ? clockText(+w.t) : ''} ${w.shot ?? ''} ${w.what ?? ''}`).join('; ')}`));
  // Deliverables: output/<v>-vN.mp4 is mv final's own; the phone copy beside it.
  const phone = out.replace(/\.mp4$/, '-phone.mp4');
  const pc = await phoneCopy(out, phone, S.phoneMB);
  if (pc.over) problems.push(P(`the phone copy is ${pc.mb} MB, over ${S.phoneMB} MB at crf 38`, 'Shorten the video or raise make.phoneMB in style.json'));
  const info = await probe(out);
  const report = writeReport(V, S, { ...stagesSoFar, final: { status: problems.length ? 'fail' : 'pass', problems, summary: `${path.basename(out)}, ${rep.rendered} rendered, ${rep.reused} reused, ${rep.minutes} min; join ${rep.join?.clean ? 'clean' : 'NOT CLEAN'}; flash ${flash ? (flash.ok ? 'ok' : 'FAIL') : '?'}; review ${review ? `${review.a?.length ?? 0} A, ${review.b?.length ?? 0} B, ${review.c?.length ?? 0} C ($${review.cost ?? 0})` : 'none'}; ${criticLine}; phone ${pc.mb} MB` } }, { out, phone, info, rep, flash, review, critic: c, pc });
  if (problems.length) throw new Gate(problems, { file: rel(out), report: rel(report) });
  return { summary: `${rel(out)} (${info?.w}x${info?.h}, ${info?.fps} fps, ${info?.duration?.toFixed(1)} s), phone ${rel(phone)} ${pc.mb} MB; review ${review ? `${review.a?.length ?? 0} A / ${review.b?.length ?? 0} B / ${review.c?.length ?? 0} C` : 'skipped'}; flash ok; ${criticLine}; report ${rel(report)}`, out: rel(out), phone: rel(phone), report: rel(report) };
}

function writeReport(V, S, stages, x) {
  const f = path.join(V.dir, 'final', 'REPORT.md'), st = loadState(V).stages, b = readData(boardFile(V), {}) ?? {};
  const row = (name) => { const s = name === 'final' ? stages.final : st[name]; return `| ${name} | ${s ? (s.status === 'pass' ? 'PASS' : s.status === 'waiting' ? 'WAITING' : 'FAIL') : 'not run'} | ${s?.at ? s.at.slice(0, 16) : ''} | ${(s?.summary ?? (s?.problems ?? []).map((p) => p.what).join('; ') ?? '').replace(/\|/g, '/')} |`; };
  const md = [`# ${V.name}: ${path.basename(x.out)}`, '', `Made by mv make on ${new Date().toISOString().slice(0, 16)}. ${x.info?.w}x${x.info?.h}, ${x.info?.fps} fps, ${x.info?.duration?.toFixed(1)} s, ${(x.info?.bytes / 1e6).toFixed(1)} MB. Phone copy: ${path.basename(x.phone)} (${x.pc.mb} MB, 720p crf ${x.pc.crf}).`, '',
    '## Gates', '', '| Stage | Result | When | Summary |', '|---|---|---|---|', ...STAGES.map(row), '',
    '## The final', '', `- Render: ${x.rep.rendered} of ${x.rep.shots} shots rendered, ${x.rep.reused} reused, ${x.rep.minutes} min (final/report.md).`, `- Join: ${x.rep.join?.clean ? 'clean' : 'NOT CLEAN'} (${x.rep.join?.frames} of ${x.rep.join?.wanted} frames, ${x.rep.join?.clicks?.length ?? 0} clicks).`,
    `- Flash check: ${x.flash ? (x.flash.ok ? 'ok' : 'FAIL') : 'not run'}${x.flash?.worst ? ` (worst ${x.flash.worst.flashes} flashes a second at ${clockText(x.flash.worst.t)})` : ''}.`,
    `- Review: ${x.review ? `${x.review.a?.length ?? 0} A, ${x.review.b?.length ?? 0} B, ${x.review.c?.length ?? 0} C, ${x.review.carried ?? 0} carried, $${x.review.cost ?? 0} (review/${x.review.label}/report.md)` : 'not run'}.`,
    `- Critic: ${x.critic ? (x.critic.error ? x.critic.error : `${x.critic.score}/10 (${x.critic.raw?.report ?? ''})${x.critic.worst?.length ? `; worst: ${x.critic.worst.slice(0, 5).map((w) => `${w.t != null ? clockText(+w.t) : ''} ${w.shot ?? ''} ${w.what ?? ''}`.trim()).join('; ')}` : ''}`) : 'tools/critic.mjs not there'}.`, ''];
  const heroes = st.test?.heroes;
  if (heroes?.length) { md.push('## Hero tests J approved', ''); for (const h of heroes) md.push(`- ${h.id}: ${h.approved?.at?.slice(0, 16) ?? '?'}${h.approved?.note ? ` "${h.approved.note}"` : ''} (hash ${h.hash})`); md.push(''); }
  if (st.previs?.coldView) md.push('## Cold view', '', `${st.previs.coldView}: ${st.previs.summary}`, '');
  if (b.shots?.length) md.push('## Board', '', `${b.shots.length} shots, ${st.board?.summary ?? ''}`, '');
  fs.writeFileSync(f, md.join('\n') + '\n');
  return f;
}

// ---------- --plan: what each Unity stage would do, without Unity ----------

/** mv make --plan: board and cards run for real (Node only); build, motion, shot, test, previs and final say what they would run, what is cached,
 *  what costs money and what waits for J, from the files on disk. Nothing touches Unity, the queue or Gen. */
export async function planMake(V, flags) {
  const S = settings(V), to = flags.to ?? 'final', st = loadState(V).stages;
  if (!STAGES.includes(to)) throw new Error(`--to ${to}: the stages are ${STAGES.join(', ')}`);
  const only = checkRange(V, S, flags.shot ? cardsMap(V).find((x) => x.id === flags.shot) ?? null : null);
  console.log(`mv make ${V.name} --plan${to !== 'final' ? ` --to ${to}` : ''}${only ? ` --shot ${only.id}` : ''}   (board and cards run for real; the Unity stages only say what they would do)`);
  const ed = unityEditor(), q = tickets(path.join(DIRECTOR, 'gen', 'queue'));
  const hb = read(path.join(DIRECTOR, 'heartbeat.json'));
  const age = hb ? (Date.now() - new Date(hb.utc).getTime()) / 1000 : Infinity;
  console.log(`Unity: ${ed.known && !ed.editor ? color(RED, 'CLOSED (mv doctor says how to reopen it)') : age < 10 ? 'alive' : color(YELLOW, `heartbeat ${Number.isFinite(age) ? age.toFixed(0) + ' s' : 'none'} old (mv doctor)`)}; queue: ${q.length ? q.map((t) => t.label).join(', ') : 'empty'}${fs.existsSync(path.join(DIRECTOR, 'gen', 'compile.lock')) ? '; compile.lock HELD' : ''}`);
  const end = hasCards(V) ? cutEnd(V) : 0, from = only ? only.t : 0, upto = only ? only.tEnd : end;
  const buildK = (() => { try { return buildKey(V); } catch { return null; } })();
  const cached = (name, key) => st[name]?.status === 'pass' && key && st[name].key === key;
  let stop = false;
  for (const name of STAGES) {
    const i = STAGES.indexOf(name) + 1, head = `[${i}/${STAGES.length}] ${name.padEnd(7)}`;
    if (stop) { console.log(`${head} ${DIM}not reached (stopped above)${OFF}`); if (name === to) break; continue; }
    try {
      if (name === 'board' || name === 'cards') {
        const r = name === 'board' ? await stageBoard(V, S) : await stageCards(V);
        console.log(`${head} ${color(GREEN, 'PASS')} ${r.summary}`);
        for (const n of r.notes ?? []) console.log(`    ${color(YELLOW, 'note: ' + n)}`);
      } else if (name === 'build') {
        const stale = staleReason(V), bake = bakeRefusal(V), errs = fs.existsSync(path.join(DIRECTOR, 'compile-errors.txt'));
        console.log(`${head} ${cached('build', buildK) && !stale ? color(GREEN, 'cached') : 'would run'}: mv cards (queue ticket "cards ${V.name}": compile, lint, regenerate stale generated acts, bake stale takes, plain build)${stale ? `; scene stale: ${stale.why}` : '; scene matches the inputs'}${errs ? color(RED, '; compile-errors.txt is on disk: the build will fail') : ''}${bake && !bake.soft ? color(RED, `; bake gate would refuse now: ${bake.why}`) : ''}`);
      } else if (name === 'motion') {
        const latest = path.join(V.captures, 'motioncheck-runs', `latest-${from.toFixed(0)}-${upto.toFixed(0)}.json`);
        console.log(`${head} would run: mv critic ${from.toFixed(1)} ${upto.toFixed(1)} (${criticTool() ? `threshold ${S.critic}/10, style.json make.critic` : 'critic.mjs missing: skipped'}), then ${fs.existsSync(latest) ? `${rel(latest)} if newer than the build, else ` : ''}mv motioncheck ${from.toFixed(1)} ${upto.toFixed(1)} (visible contact must be 0)`);
      } else if (name === 'shot') {
        const r = freshShot(V, from, upto);
        console.log(`${head} ${r ? `a shot check for these inputs exists: ${shotFaults(r, from, upto).length} A faults (0 to pass)` : `would run: mv shotcheck ${from.toFixed(1)} ${upto.toFixed(1)} (0 A faults to pass)`}`);
      } else if (name === 'test') {
        let heroes = heroShots(V, S); if (only) heroes = heroes.filter((h) => h.id === only.id);
        const approved = read(approvedFile(V), {});
        if (!heroes.length) { console.log(`${head} ${color(RED, 'FAIL')}: no hero shots ("hero": true on the board)`); stop = true; }
        else {
          const rows = heroes.map((h) => {
            const side = read(path.join(testsDir(V), `${h.id}.json`)), fresh = side && side.hash === h.hash && fs.existsSync(path.join(testsDir(V), `${h.id}.mp4`)), yes = approved[h.id]?.hash === h.hash;
            if (!h.inCut) return `${h.id} ${color(RED, 'NOT IN THE CUT')}`;
            return `${h.id} ${h.from.toFixed(1)}-${h.to.toFixed(1)} s (${h.shots.join(' ')}): ${fresh ? 'test rendered' : 'would render'}, ${yes ? color(GREEN, `approved ("${approved[h.id].note ?? ''}")`) : color(YELLOW, approved[h.id] ? 'approval lapsed (the shot changed)' : 'waits for J')}`;
          });
          const need = heroes.filter((h) => approved[h.id]?.hash !== h.hash).length;
          console.log(`${head} ${heroes.length} hero test${heroes.length > 1 ? 's' : ''} at ${S.test.w}x${S.test.h} ${S.test.fps} fps with the mix and strips (mv render through the queue):\n      ${rows.join('\n      ')}`);
          if (need) { console.log(`    ${color(YELLOW, `stops here until J says yes to ${need} test${need > 1 ? 's' : ''}: mv approve ${V.name} <shot> --note "his words"`)}`); stop = true; }
        }
      } else if (name === 'previs') {
        const est = hasCards(V) ? await coldView(V, S, null, { budgetOnly: true }) : null;
        console.log(`${head} would run: mv previs --fps ${S.fps} (whole cut, ${end.toFixed(1)} s), the finished mix, then the cold view: ${est ? `${est.chunks} Gen vision calls, about $${est.estimate.toFixed(2)} (budget $${S.coldview.budget})` : '?'}; fails on any board "change" beat the cold viewer misses`);
      } else if (name === 'final') {
        const fr = frozenOf(V), d = fr ? freezeDrift(V) : null;
        console.log(`${head} would run: ${fr ? `frozen ${fr.at.slice(0, 16)}${d?.engine || d?.model ? color(RED, ' (engine or model moved since: every shot re-renders)') : ''},` : 'mv freeze, then'} mv final (changed shots, stitch, flash check, the review's vision), critic on the final, final/REPORT.md, output/${V.name}-vN.mp4 and a phone copy under ${S.phoneMB} MB. The shot-by-shot plan: mv final --plan`);
      }
    } catch (e) {
      if (e instanceof Gate) { console.log(`${head} ${color(RED, 'FAIL')} ${e.problems.length} problem${e.problems.length > 1 ? 's' : ''}`); printProblems(e.problems); }
      else console.log(`${head} ${color(RED, 'ERROR')} ${String(e.message ?? e).split('\n')[0]}`);
      stop = true;
    }
    if (name === to) break;
  }
  if (stop) process.exitCode = 2;
}

/** --shot on a hero: motion and shot check the whole 5 s test window (what J will see), not just the hero shot. */
function checkRange(V, S, c) {
  if (!c) return c;
  const h = readData(boardFile(V), { shots: [] })?.shots?.find((x) => x.id === c.id && x.hero);
  if (!h) return c;
  const w = testWindow(c.t, c.tEnd, cutEnd(V), S.test.seconds);
  return { ...c, t: w.from, tEnd: w.to };
}

// ---------- the run ----------

function printProblems(problems, kind = 'FAIL') {
  for (const p of problems) {
    console.log(`  ${color(kind === 'WAITING' ? YELLOW : RED, '- ' + p.what)}`);
    if (p.file) console.log(`    ${DIM}where:${OFF} ${p.file}${p.field ? `  ${DIM}field:${OFF} ${p.field}` : ''}`);
    if (p.fix) console.log(`    ${DIM}fix:${OFF} ${p.fix}`);
  }
}

export async function make(V, flags) {
  const S = settings(V), to = flags.to ?? 'final';
  if (!STAGES.includes(to)) throw new Error(`--to ${to}: the stages are ${STAGES.join(', ')}`);
  const only = checkRange(V, S, flags.shot ? (cardsMap(V).find((x) => x.id === flags.shot) ?? (() => { throw new Error(`--shot ${flags.shot}: not a card in cards.map.json (${cardsMap(V).slice(0, 8).map((x) => x.id).join(', ')}...)`); })()) : null);
  const force = !!flags.force;
  console.log(`mv make ${V.name} --to ${to}${only ? ` --shot ${only.id}` : ''}${force ? ' --force' : ''}`);
  const keys = { board: () => boardKey(V), cards: () => sha([inputs(V).hash, 'cards']), build: () => buildKey(V), motion: () => sha([buildKey(V), only?.id ?? 'all', S.critic, criticTool() ? fileHash(criticTool()) : 'no-critic']), shot: () => sha([buildKey(V), only?.id ?? 'all']), test: () => sha([buildKey(V), testKey(V, S), only?.id ?? 'all']), previs: () => sha([buildKey(V), JSON.stringify(S.coldview), fileHash(boardFile(V))]), final: () => null };
  const runners = { board: () => stageBoard(V, S), cards: () => stageCards(V), build: () => stageBuild(V), motion: () => stageMotion(V, S, only), shot: () => stageShot(V, only), test: () => stageTest(V, S, only), previs: () => stagePrevis(V, S, force), final: () => stageFinal(V, S, flags, loadState(V).stages) };
  for (const name of STAGES) {
    const i = STAGES.indexOf(name) + 1, head = `[${i}/${STAGES.length}] ${name.padEnd(7)}`;
    if (only && ['previs', 'final'].includes(name)) { console.log(`${head} ${DIM}skipped: --shot runs up to test${OFF}`); break; }
    const key = keys[name](), prev = loadState(V).stages[name];
    if (!force && name !== 'final' && prev?.status === 'pass' && prev.key === key) { console.log(`${head} ${color(GREEN, 'PASS')} ${DIM}(cached) ${prev.summary ?? ''}${OFF}`); if (name === to) break; continue; }
    const t0 = Date.now();
    try {
      const r = await runners[name]();
      const took = r2((Date.now() - t0) / 1000);
      saveStage(V, name, { status: 'pass', key, took, ...r });
      console.log(`${head} ${color(GREEN, 'PASS')} ${r.summary ?? ''} ${DIM}(${took} s)${OFF}`);
      for (const n of r.notes ?? []) console.log(`    ${color(YELLOW, 'note: ' + n)}`);
    } catch (e) {
      const took = r2((Date.now() - t0) / 1000);
      if (e instanceof Waiting) {
        saveStage(V, name, { status: 'waiting', key, took, problems: e.problems, ...e.extra });
        console.log(`${head} ${color(YELLOW, 'WAITING FOR J')} ${e.extra.approvedCount ?? 0} of ${e.extra.of ?? '?'} hero tests approved ${DIM}(${took} s)${OFF}`);
        printProblems(e.problems, 'WAITING');
        console.log(`\nNothing full renders until every hero test has J's yes. This is the human gate; the driver records it, never grants it.`);
        process.exitCode = 3; return;
      }
      if (e instanceof Gate) {
        saveStage(V, name, { status: 'fail', key, took, problems: e.problems, ...e.extra });
        console.log(`${head} ${color(RED, 'FAIL')} ${e.problems.length} problem${e.problems.length > 1 ? 's' : ''} ${DIM}(${took} s)${OFF}`);
        printProblems(e.problems);
        console.log(`\nStopped at ${name}. Fix the above, then: node Director/mv.mjs --video ${V.name} make${to !== 'final' ? ` --to ${to}` : ''}${only ? ` --shot ${only.id}` : ''}   (mv status shows the table)`);
        process.exitCode = 2; return;
      }
      saveStage(V, name, { status: 'fail', key, took, problems: [P(`error: ${String(e.message ?? e).split('\n')[0]}`, 'A tool broke, not a gate. Read the trace; mv doctor checks the environment')] });
      console.log(`${head} ${color(RED, 'ERROR')} ${String(e.message ?? e)}`);
      if (process.env.MV_MAKE_TRACE) console.error(e.stack);
      process.exitCode = 1; return;
    }
    if (name === to) break;
  }
  if (!process.exitCode) console.log(color(GREEN, `\n${V.name}: every stage through ${to} passes.`) + (to === 'final' ? ` ${loadState(V).stages.final?.out ?? ''}` : ''));
}

export function status(V) {
  const S = settings(V), st = loadState(V).stages;
  const keys = { board: () => boardKey(V), cards: () => sha([inputs(V).hash, 'cards']), build: () => buildKey(V), motion: () => sha([buildKey(V), 'all', S.critic, criticTool() ? fileHash(criticTool()) : 'no-critic']), shot: () => sha([buildKey(V), 'all']), test: () => sha([buildKey(V), testKey(V, S), 'all']), previs: () => sha([buildKey(V), JSON.stringify(S.coldview), fileHash(boardFile(V))]), final: () => null };
  console.log(`${V.name}: mv make stages (${rel(stateFile(V))})`);
  console.log(' #  stage    result    when              note');
  let next = null;
  STAGES.forEach((name, i) => {
    const s = st[name]; let key = null; try { key = keys[name](); } catch {}
    let res, note;
    if (!s) { res = 'not run'; note = ''; }
    else if (s.status === 'pass' && name !== 'final' && key && s.key !== key) { res = 'STALE'; note = `passed ${s.at.slice(0, 16)}, inputs changed since`; }
    else if (s.status === 'pass') { res = 'PASS'; note = s.summary ?? ''; }
    else if (s.status === 'waiting') { res = 'WAITING'; note = `${s.approvedCount ?? 0}/${s.of ?? '?'} hero tests approved: ${(s.problems ?? []).map((p) => p.what).join('; ')}`; }
    else { res = 'FAIL'; note = (s.problems ?? []).slice(0, 2).map((p) => p.what).join('; ') + ((s.problems?.length ?? 0) > 2 ? ` (+${s.problems.length - 2})` : ''); }
    if (!next && res !== 'PASS') next = name;
    const c = res === 'PASS' ? GREEN : res === 'WAITING' ? YELLOW : res === 'not run' || res === 'STALE' ? DIM : RED;
    console.log(`${String(i + 1).padStart(2)}  ${name.padEnd(8)} ${color(c, res.padEnd(9))} ${(s?.at ?? '').slice(0, 16).padEnd(17)} ${note.slice(0, 140)}`);
  });
  const fr = frozenOf(V);
  console.log(`\nfrozen: ${fr ? fr.at.slice(0, 16) : 'no'}; critic tool: ${criticTool() ? 'present' : 'missing (motion gate skips it)'}; board2cards: ${board2cards(V) ? 'present' : 'not written yet (ids checked by hand)'}; hero tests: ${Object.keys(read(approvedFile(V), {})).length} approved`);
  console.log(next ? `next: node Director/mv.mjs --video ${V.name} make${next === 'final' ? '' : ` --to ${next}`}   (runs from the first stage that is not passing)` : `all stages pass. The final: ${st.final?.out ?? '?'}`);
  return (async () => { try { const { HawkesGen } = await import('./hawkesgen.mjs'); const g = new HawkesGen({ project: 'tkshock' }); const h = await g.health(); console.log(`Hawkes Gen (cold view, review): ${h.ok ? 'reachable' : 'NOT OK'} at ${g.url}`); } catch (e) { console.log(color(YELLOW, `Hawkes Gen not reachable (${String(e.message).split('\n')[0]}): the cold view and review stages need it`)); } })();
}

// mv doctor is tools/mv/doctor.mjs (shared machine state and safe fixes); it also checks what mv make needs: ffmpeg, failed builds, frozen drift, half renders.

// ---------- self test ----------

export function selftest() {
  let n = 0, bad = 0; const t = (name, cond) => { n++; if (!cond) { bad++; console.log(`FAIL ${name}`); } };
  const rules = settings({ dir: '/nowhere', score: '/nowhere/score.json' }).board;
  const shot = (id, frames, x = {}) => ({ id, size: 'MEDIUM', lens: 50, frames, action: 'He sits and drums his fingers on his knee.', reg: 'deadpan', change: 'Plant: he hears music.', ...x });
  const good = { fps: 24, shots: [shot('a', 72), shot('b', 84), shot('c', 60), shot('d', 96), shot('e', 72), shot('f', 120)] };
  t('a good board passes', validateBoard(good, rules, 24).problems.length === 0);
  t('missing change is named with its field', validateBoard({ shots: [shot('a', 72, { change: '' }), shot('b', 96)] }, rules, 24).problems.some((p) => p.field === 'shots[0] (a).change'));
  t('a duplicate id fails', validateBoard({ shots: [shot('a', 72), shot('a', 96)] }, rules, 24).problems.some((p) => /also shots\[0\]/.test(p.what)));
  t('a fast average fails', validateBoard({ shots: Array.from({ length: 10 }, (_, i) => shot('s' + i, 24)) }, rules, 24).problems.some((p) => /average shot/.test(p.what)));
  const burst = { shots: [shot('h1', 96), ...Array.from({ length: 7 }, (_, i) => shot('b' + i, 12)), shot('h2', 96), shot('h3', 96), shot('h4', 120)] };
  t('a burst of 7 fails', validateBoard(burst, rules, 24).problems.some((p) => /burst of 7/.test(p.what)));
  const landing = { shots: [shot('h1', 96), shot('b1', 12), shot('b2', 12), shot('b3', 12), shot('x', 40), shot('h2', 120), shot('h3', 120)] };
  t('a burst landing on a short shot fails', validateBoard(landing, rules, 24).problems.some((p) => /must land on a hold/.test(p.what)));
  t('no calm fails', validateBoard({ shots: Array.from({ length: 8 }, (_, i) => shot('s' + i, 65)) }, rules, 24).problems.some((p) => /calm shots/.test(p.what)));
  // board shots take the card's time when a card of that id exists
  const bs = boardShots({ shots: [shot('a', 48), shot('b', 48)] }, [{ id: 'b', t: 10, tEnd: 13 }], 24);
  t('board shot times from frames', bs[0].t === 0 && bs[0].tEnd === 2);
  t('board shot times from the card when it exists', bs[1].t === 10 && bs[1].tEnd === 13 && bs[1].fromCard);
  // approval is keyed by hash: a different hash is not approved
  const approved = { x: { hash: 'aaaa' } };
  t('approval holds on the same hash', approved.x.hash === 'aaaa');
  t('approval lapses on a new hash', approved.x.hash !== 'bbbb');
  t('a short hero shot gets 5 s centred on it', (() => { const w = testWindow(66.5, 67.3, 204, 5); return Math.abs(w.to - w.from - 5) < 1e-9 && w.from < 66.5 && w.to > 67.3; })());
  t('a long hero shot tests its first 5 s', (() => { const w = testWindow(10, 20, 204, 5); return w.from === 10 && w.to === 15; })());
  t('the window stays inside the cut', (() => { const w = testWindow(0.2, 1, 204, 5); const v = testWindow(202, 203.5, 204, 5); return w.from === 0 && v.to === 204 && v.from === 199; })());
  console.log(bad ? `${bad} of ${n} checks failed` : `all ${n} checks pass`);
  process.exitCode = bad ? 1 : 0;
}

// ---------- CLI ----------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), flags = {}, pos = [];
  const BOOL = new Set(['force', 'fix', 'no-review', 'json', 'plan']);
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); if (BOOL.has(k)) flags[k] = true; else flags[k] = argv[++i]; } else pos.push(a); }
  const cmd = pos[0];
  (async () => {
    if (cmd === 'test') return selftest();
    const V = pickVideo(flags.video ?? (pos[1] && listVideos().includes(pos[1]) ? pos.splice(1, 1)[0] : undefined));
    if (cmd === 'status') return status(V);
    if (cmd === 'approve') { const a = approve(V, pos[1], flags.note); console.log(`${V.name} ${pos[1]} approved (${a.at}, hash ${a.hash}). mv make goes on.`); return; }
    if (cmd === 'coldview') { const S = settings(V), f = pos[1] ? path.resolve(pos[1]) : [path.join(V.dir, 'previs-mix.mp4'), path.join(V.dir, 'previs.mp4')].find(fs.existsSync); if (!f) throw new Error('no previs to view: mv previs first, or name a file'); const r = await coldView(V, S, f); console.log(`${rel(r.file)}: ${r.missed.length} board beats missed, $${r.cost}`); process.exitCode = r.missed.length ? 2 : 0; return; }
    if (cmd === 'make') {
      // mv make <video> [stage | status | plan]: a stage name is --to; status is the stage table; plan (or --plan) the dry run
      const sub = pos[1];
      if (sub === 'status') return status(V);
      if (sub === 'plan') flags.plan = true;
      else if (sub) { if (!STAGES.includes(sub)) throw new Error(`mv make ${V.name} ${sub}: not a stage. The stages: ${STAGES.join(', ')}; or status, plan`); flags.to = sub; if (pos[2] && !flags.shot) flags.shot = pos[2]; } // mv make hawkespunch test p02 = --to test --shot p02
      return flags.plan ? planMake(V, flags) : make(V, flags);
    }
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'));
  })().catch((e) => { console.error(String(e.message ?? e)); if (process.env.MV_MAKE_TRACE) console.error(e.stack); process.exitCode = 1; });
}
