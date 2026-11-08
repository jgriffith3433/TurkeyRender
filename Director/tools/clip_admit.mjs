// Clip admission: a clip enters the library only after it has played on our rig.
//   node Director/tools/clip_admit.mjs <clip> [<clip> ...]        admit these (they must be in the project)
//   node Director/tools/clip_admit.mjs --list Director/library/admit-list.json [--pull] [--redo]
//   node Director/tools/clip_admit.mjs --mixamo                   every clip in Assets/MusicVideo/Motion
//   node Director/tools/clip_admit.mjs --verdicts                 judge the stored measurements again, no Unity (after changing the limits below)
//   node Director/tools/clip_admit.mjs --report                   counts and every rejected clip
// Each clip plays once through the lab's body stack (call admit, MotionLab) with root motion on and joint limits measuring. The measurements and a
// verdict go in Director/library/clips.json, which `build` and `mv lab` read: a human playing a clip that isn't admitted is a warning on every build.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.dirname(DIRECTOR);
const CAT = path.join(DIRECTOR, 'library', 'clips.json');
const PACKAGE = 'ULTIMATE ANIMATION COLLECTION';
const BATCH = 80, PULL_BATCH = 30, BUDGET = 120;

// What a clip may do and still be admitted. warn keeps it in with a note; fail keeps it out.
export const LIMITS = {
  jointDegrees: { warn: 18, fail: 40 },     // how far the joint limits had to pull it back
  popMetres: { warn: 0.14, fail: 0.28 },    // a bone's path kinks by this much in one 30 fps frame
  popOverMedian: 8,                         // and stands this far above the clip's own hardest ordinary motion
  slideCmPerFrame: { warn: 1.6, fail: 3.5 },// a stance foot, against its treadmill speed if it walks in place
  selfCm: { warn: 4.5, fail: 8 },           // capsules of arms and legs into the body
  floorMetres: { fail: -0.1 },              // feet this far under where he started
};

const args = process.argv.slice(2);
const has = (f) => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const value = (f) => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };

function load() {
  if (fs.existsSync(CAT)) return JSON.parse(fs.readFileSync(CAT, 'utf8'));
  return { about: 'Clip catalogue. Written by Director/tools/clip_admit.mjs. status "admitted" or "rejected".', limits: LIMITS, clips: {} };
}
function save(cat) {
  cat.limits = LIMITS;
  cat.clips = Object.fromEntries(Object.entries(cat.clips).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(path.dirname(CAT), { recursive: true });
  fs.writeFileSync(CAT + '.tmp', JSON.stringify(cat, null, 1));
  fs.renameSync(CAT + '.tmp', CAT);
}

const WORDS = [
  [/^Idle1|^Idle[2-7]|^IdleBreathe|Breathe|LookAround/i, 'idle'], [/Sit|Chair/i, 'sit'], [/Kneel/i, 'kneel'], [/Lay|Sleep|Rest/i, 'lay'], [/Crouch/i, 'crouch'],
  [/Walk/i, 'walk'], [/Run|Sprint/i, 'run'], [/Turn|UTurn/i, 'turn'], [/Crawl/i, 'crawl'], [/Climb|Ladder|Wall/i, 'climb'],
  [/Agree|Argue|Explain|Greet|Wave|PointOut|ShakeHand|Apologize|CalmDown|Reject|NoThanks|NoIdea|HaveNoClue|WhatMe|AllRight|NotMyFault/i, 'gesture'],
  [/Laugh|Surprised|Wow|Yell|Scared|Stunned|Cheer|Taunt|FootTap|Yawn|ScratchHead|TouchCheek|TouchHair|CheckTime|Stretch/i, 'reaction'],
  [/Phone|TextMessage/i, 'phone'], [/TakeASip|Eat[A-Z]|Skewer|Feast/, 'eat-drink'], [/Hostage|HandsUp|HandsOnHead/i, 'hostage'], [/Injured|Stumble/i, 'injured'],
  [/GetHit|Hit|Blocked/i, 'hit'], [/Death|Dead|Executed/i, 'death'], [/Fall|Land|Jump/i, 'air'], [/GetBackUp|GoTo|ToIdle|ToStand|ToKneel|ToSit|ToRest|ToSleep|ToLay|Stand/i, 'transition'],
  [/Push|Pull/i, 'push'], [/Zombie/i, 'zombie'], [/Cheer|jumping_jacks|Dance/i, 'rhythmic'],
];

/** Pure judgement from the measurements, so limits can change without touching Unity. */
function judge(name, m) {
  if (m.error) return { name, status: 'rejected', issues: [m.error], notes: [], tags: [], measured: m };
  const issues = [], notes = [], tags = [];
  for (const [re, t] of WORDS) if (re.test(name) && !tags.includes(t)) tags.push(t);
  const travel = Math.hypot(m.rootTravel[0], m.rootTravel[2]);
  const moving = travel > 0.25 || m.hipsTravel > 0.25;
  const treadmill = !moving && m.beltMs > 0.25;
  tags.push(moving ? 'travelling' : treadmill ? 'treadmill' : 'in-place');
  if (m.hipsTop < 0.4) tags.push('on-floor'); else if (m.hipsTop < 0.72) tags.push('low');
  const loops = m.loopGap < 0.07;
  tags.push(loops ? 'loop' : 'one-shot');
  if (m.energy > 9) tags.push('high-energy'); else if (m.energy < 1.5) tags.push('quiet');
  const air = /Fall|Land|Jump|hanging/i.test(name);
  const lim = (v, l, say) => { if (l.fail !== undefined && v > l.fail) issues.push(say); else if (l.warn !== undefined && v > l.warn) notes.push(say); };
  lim(m.limitsWorst, LIMITS.jointDegrees, `joint limits moved ${m.limitsBone} ${m.limitsWorst} deg`);
  const popReal = m.popKink > LIMITS.popOverMedian * Math.max(m.popMedian, 0.005);
  if (popReal) lim(m.popKink, LIMITS.popMetres, `pop: ${m.popBone} kinks ${m.popKink} m at ${m.popAt}s`);
  if (!air) lim(treadmill ? m.slideWorstCm / 2 : m.slideWorstCm, LIMITS.slideCmPerFrame, `foot slide ${m.slideWorstCm} cm/frame`); // a stance foot on a treadmill clip varies in speed: judged on half
  lim(m.selfCm, LIMITS.selfCm, `self-clip ${m.selfCm} cm ${m.selfPair} at ${m.selfAt}s`);
  if (!air && m.feetLow < LIMITS.floorMetres.fail) issues.push(`feet ${-m.feetLow} m under the floor`);
  const beats = m.beats ?? [];
  const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
  const card = {
    status: issues.length ? 'rejected' : 'admitted', tags, length: m.length, loop: loops, loopGap: m.loopGap, rootTravel: m.rootTravel, rootYaw: m.rootYaw, hipsTravel: m.hipsTravel,
    hips: [m.hipsLow, m.hipsTop], energy: m.energy, motionBeats: beats, beatStrength: m.beatStrength, tempoBeat: gaps.length >= 2 ? +gaps[gaps.length >> 1].toFixed(3) : null,
    issues, notes, path: m.path, measured: m,
  };
  return card;
}

function clipsInMotion() {
  return fs.readdirSync(path.join(PROJECT, 'Assets/MusicVideo/Motion')).filter((f) => f.endsWith('.fbx')).map((f) => f.replace(/^Humanoid@/, '').replace(/\.fbx$/, ''));
}

function mv(...a) { return execFileSync('node', ['Director/mv.mjs', ...a], { cwd: PROJECT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }); }

function pullMissing(names) {
  const have = new Set();
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else { const m = /^Humanoid@(.+)\.fbx$/.exec(e.name); if (m) have.add(m[1].toLowerCase()); } } };
  walk(path.join(PROJECT, 'Assets'));
  const want = names.filter((n) => !have.has(n.toLowerCase()));
  console.error(`${want.length} clips to pull of ${names.length}`);
  for (let i = 0; i < want.length; i += PULL_BATCH) {
    const part = want.slice(i, i + PULL_BATCH);
    const t0 = Date.now();
    mv('pull', PACKAGE, ...part.map((n) => `/Humanoid@${n}.fbx`));
    console.error(`pulled ${Math.min(i + PULL_BATCH, want.length)}/${want.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}

function admit(names, cat) {
  let left = names.slice();
  while (left.length) {
    const part = left.slice(0, BATCH); left = left.slice(BATCH);
    const r = JSON.parse(mv('call', 'admit', JSON.stringify({ clips: part, budget: BUDGET })));
    for (const [n, m] of Object.entries(r.done)) cat.clips[n] = judge(n, m);
    left = [...r.left, ...left];
    save(cat);
    console.error(`${Object.keys(r.done).length} measured in ${r.seconds} s, ${left.length} to go`);
  }
}

function report(cat) {
  const all = Object.entries(cat.clips), ok = all.filter(([, c]) => c.status === 'admitted'), no = all.filter(([, c]) => c.status !== 'admitted');
  const tags = {}; for (const [, c] of ok) for (const t of c.tags) tags[t] = (tags[t] ?? 0) + 1;
  console.log(JSON.stringify({ clips: all.length, admitted: ok.length, rejected: no.length, withNotes: ok.filter(([, c]) => c.notes.length).length, tags, rejectedClips: Object.fromEntries(no.map(([n, c]) => [n, c.issues])) }, null, 1));
}

const cat = load();
if (has('--report')) { report(cat); process.exit(0); }
if (has('--verdicts')) { for (const [n, c] of Object.entries(cat.clips)) cat.clips[n] = judge(n, c.measured ?? { error: c.issues?.[0] ?? 'no measurements' }); save(cat); report(cat); process.exit(0); }
const pull = has('--pull'), redo = has('--redo'), mixamo = has('--mixamo'), listFile = value('--list');
let names = [...args];
if (mixamo) names.push(...clipsInMotion());
if (listFile) names.push(...JSON.parse(fs.readFileSync(listFile, 'utf8')).clips);
names = [...new Set(names)];
if (!names.length) { console.error(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 7).join('\n')); process.exit(1); }
if (pull) pullMissing(names);
const todo = redo || args.length ? names : names.filter((n) => !cat.clips[n] || cat.clips[n].issues?.[0]?.startsWith?.('no such clip'));
admit(todo, cat);
if (args.length) for (const n of args) console.log(JSON.stringify({ [n]: cat.clips[n] }, null, 1));
else report(cat);
