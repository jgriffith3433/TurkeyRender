#!/usr/bin/env node
// Motion candidates for the Hawkes Punch hero beats, from real sources, ranked by the critic. One beat at a time or all:
//   node Director/tools/motion_beats.mjs [beat...] [--top 6] [--no-match]
// For each beat (BEATS below): motion matching over the mocap indexes (CMU, the PROTOFACTOR subset) seeded by the approved hp_ pose sheet
// (its Unity dump as the query, a window around the action) and by tags; the top hits are cut to Director/gen/motion/beats/<beat>/*.npz;
// named library clips (PROTOFACTOR by id from the index, catalog clips, the ps_/mm_/vm_ clips already admitted) join them; then
// `critic.mjs rank <beat>` scores every candidate headless (the twin) and writes library/motion/critic/beats/<beat>.md|json.
// Sources only, never typed joint numbers. Nothing here touches Unity.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE), PROJECT = path.dirname(ROOT);
const OUT = path.join(ROOT, 'gen', 'motion', 'beats'), PF = 'gen/mocap/index/protofactor', MO = 'Assets/MusicVideo/Motion';
const argv = process.argv.slice(2), flag = {}, pos = [];
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) flag[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; else pos.push(argv[i]);
const TOP = +(flag.top || 6), FITW = 2;
const dump = (s) => `gen/critic/clips/${s}.json`;
const pf = (...ids) => ids.map((id) => `${PF}/${id}.npz`);
const mo = (...ids) => ids.map((id) => `${MO}/Humanoid@${id}.fbx`);
const hpg = (n) => { const d = path.join(ROOT, 'gen', 'genmotion', 'hp', n); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.bvh')).map((f) => `gen/genmotion/hp/${n}/${f}`) : []; };   // this beat's own Gen text takes (SMPL BVH)
const gm = (re) => fs.readdirSync(path.join(ROOT, 'gen', 'genmotion', 'takes')).filter((f) => re.test(f)).map((f) => `gen/genmotion/takes/${f}`);   // Gen motion.from-text takes (HY-Motion) on his rig

// beat: what it is on the board, the sheet window(s) that seed the search, tags, named sources, zero-g or grounded
export const BEATS = {
  punch_doc: { board: 'p01-p02: the doctor winds up (held, tremble) and lands a straight right / uppercut on his jaw; standing', zerog: false,
    queries: [{ q: dump('hp_doc_punch'), start: 1.0, end: 3.0, tags: 'punch,box,jab,cross,hook,uppercut,power,right hand' }],
    files: [...pf('PowerRightHand', 'OverhandRight', 'RightHand1', 'RightPowerUppercut', 'RightUppercut', 'JabRightHandCombo1', 'RightHook1'), ...mo('mx_cross_punch', 'mx_hook_punch', 'mm_cross_punch_a', 'mm_cross_punch_b', 'vm_box_cross', 'vm_box_hooks'), ...gm(/knuckle_roll/), ...hpg('gm_hp_punch_doc')] },
  punch_him: { board: 'p02-p03: his head snaps on contact, then he is launched straight up through the ceiling', zerog: false,
    queries: [{ q: dump('hp_him_hit'), start: 2.1, end: 3.4, tags: 'hit,knock,fall,thrown,flinch,get hit' }],
    files: [...pf('GetHitFrontHeavyCombat', 'GetHitFrontLightCombat', 'DeathBackCombat', 'Stunned', 'GetHitFrontHostage', 'GetHitFront1', 'GetHitHeavyFront1hMelee'), ...mo('ps_punched_launch_a', 'ps_punched_launch_b', 'mx_hit_reaction', 'mx_flying_back_death', 'mm_flinch_a', 'mm_flinch_b'), ...hpg('gm_hp_punch_him')] },
  s05_ring: { board: 's05: the chase through Saturn\'s ring, flying left to right, fist or both fists forward (F1/F2); zero-g', zerog: true,
    queries: [{ q: dump('hp_f1_superman'), start: 0, end: 1.5, tags: 'dive,swim,fly,jump,leap,superman,fall' }, { q: dump('hp_f2_ram'), start: 0, end: 1.5, tags: 'dive,jump,leap,fall' }, { q: `${MO}/Humanoid@mx_flying_idle.fbx`, start: 0, end: 1.5, tags: 'swim,stroke,butterfly,fly,dive,fall,jump,apex' }, { q: `${MO}/Humanoid@mx_falling_air.fbx`, start: 0.5, end: 2.0, tags: 'swim,stroke,fly,dive,fall,jump,apex' }],
    files: [...pf('Falling', 'JumpToApex', 'JumpToApexUnarmed', 'RunJumpToApexRightFootUnarmed', 'FallingToEnterWall'), ...mo('mx_flying_idle', 'ps_zg_drift_idle_a', 'ps_zg_drift_idle_b', 'vm_zg_float_turn', 'mx_falling_air', 'mx_falling_idle', 'gm_zg_idle'), ...gm(/zg_idle2|zg_tumble/), ...hpg('gm_hp_ring')] },
  s06_boo: { board: 's06: the double pops up BOO; his startle flings his fist straight down into the moon; zero-g', zerog: true,
    queries: [{ q: dump('hp_s3_strike'), start: 0, end: 1.4, tags: 'scared,startle,surprise,punch,smash,flinch' }],
    files: [...pf('Idle1SurprisedA', 'Idle1SurprisedB', 'ScaredHostage', 'SmashingFists', 'CrushingFists', 'Roar1Creature', 'AttackLungeBiteCreature', 'Taunt1'), ...mo('ps_zg_startle_a', 'ps_zg_startle_b', 'gm_zg_startle', 'mm_flinch_a', 'mm_flinch_b', 'mx_terrified'), ...gm(/zg_startle/), ...hpg('gm_hp_boo')] },
  s10_catch: { board: 's10: Jupiter coming at him; he braces arms out, CATCH, absorbs and slides back; zero-g', zerog: true,
    queries: [{ q: dump('hp_c1_catch'), start: 0.2, end: 2.4, tags: 'catch,push,brace,block,absorb' }],
    files: [...pf('PushCube1', 'PushCube2', 'PushCube3', 'PushCubeIdle1', 'BlockedHigh', 'BlockedMedium', 'GetHitFrontHeavyCombat', 'IdleBlockHigh'), ...mo('ps_catch_slide_a', 'ps_catch_slide_b', 'mx_goalie_catch_mid', 'gm_zg_catch_gut', 'gm_zg_hold_ball'), ...gm(/zg_catch_gut|zg_hold_ball/), ...hpg('gm_hp_catch')] },
  s12_atlas: { board: 's12: the double gathers and winds the Earth up overhead, Atlas style, a tremble; zero-g', zerog: true,
    queries: [{ q: dump('hp_a1_atlas'), start: 0.2, end: 1.4, tags: 'lift,overhead,heavy,carry,press,weight' }],
    files: [...pf('Cheer1', 'Cheer5', 'Cheer9', 'IdleBreatheHandsUp', 'GoToKneelHandsUp', 'CrushingFists', 'IdleWallClimb'), ...mo('mm_lift_heavy_a', 'mx_lift_heavy', 'mx_hanging_idle', 'gm_zg_hold_ball', 'gm_zg_throw'), ...fs.readdirSync(path.join(ROOT, 'gen', 'refvideo', 'gen')).filter((d) => /^vm_lift/.test(d)).flatMap((d) => fs.readdirSync(path.join(ROOT, 'gen', 'refvideo', 'gen', d)).filter((f) => /^vm_.*.bvh$/.test(f)).map((f) => `gen/refvideo/gen/${d}/${f}`)), ...hpg('gm_hp_atlas')] },
  s14_setdown: { board: 's14: very carefully he flies the Earth back and sets it into orbit like a full glass; a small pat; zero-g', zerog: true,
    queries: [{ q: dump('hp_a2_setdown'), start: 4.3, end: 5.6, tags: 'put,place,set,lower,down,box,carry' }, { q: dump('hp_a2_setdown'), start: 0.2, end: 1.4, tags: 'carry,lower,down,box' }, { q: `${MO}/Humanoid@mx_putting_down.fbx`, start: 3.0, end: 6.0, tags: 'box,carry,pick,put,lower,lift,push,cube' }, { q: `${MO}/Humanoid@mx_lift_heavy.fbx`, start: 5.0, end: 8.0, tags: 'box,carry,pick,put,lower,lift,cube' }],
    files: [...pf('PushCubeIdle2', 'PutBackWeapon1hMelee', 'Idle1CalmDown', 'CalmDown1Hostage', 'CalmDown2Hostage'), ...mo('mx_goalie_catch_mid', 'gm_zg_hold_ball', 'mx_putting_down', 'mx_lift_heavy', 'mm_lift_heavy_a'), 'gen/motion/beats/s14_setdown/cmu_137_22_2p5-7p2.npz', 'gen/motion/beats/s14_setdown/cmu_137_31_11-21.npz', 'gen/motion/beats/s14_setdown/cmu_137_31_11p5-18.npz', 'gen/motion/beats/s14_setdown/cmu_137_40_11p5-16p9.npz'   /* CMU 137 'Pick Up' set, the holds and lowerings found by hand-height scan (round 2) */, ...gm(/place_gently|zg_hold_ball/), ...hpg('gm_hp_setdown')] },
};

// The beat's key action, measured on the dump's joint positions (Unity space, y up; forward from the hip line each frame). The critic says
// whether motion is human; this says whether the candidate does the thing the board asks for. A candidate without it loses 3 points.
function actionOf(beat, d) {
  const bi = Object.fromEntries(d.bones.map((b, i) => [b, i])), fps = d.fps ?? 30, n = d.frames.length;
  const P = (b, f) => d.frames[f].p[bi[b]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (a) => Math.hypot(...a), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fwd = (f) => { const r = sub(P('RightUpperLeg', f), P('LeftUpperLeg', f)), v = [-r[2], 0, r[0]], l = len(v) || 1; return [v[0] / l, 0, v[2] / l]; };   // cross(r, up)
  const speed = (b, f) => f ? len(sub(P(b, f), P(b, f - 1))) * fps : 0, vy = (b, f) => f ? (P(b, f)[1] - P(b, f - 1)[1]) * fps : 0;
  const ahead = (b, f) => dot(sub(P(b, f), P('Chest', f)), fwd(f));
  const frac = (pred) => { let k = 0; for (let f = 0; f < n; f++) if (pred(f)) k++; return k / n; };
  const longest = (pred) => { let best = 0, run = 0; for (let f = 0; f < n; f++) { run = pred(f) ? run + 1 : 0; best = Math.max(best, run); } return best / fps; };
  const hands = ['LeftHand', 'RightHand'];
  if (beat === 'punch_doc') { let pk = 0, ext = 0; let up = 0; for (const h of hands) for (let f = 1; f < n; f++) { const s = speed(h, f); if (s > pk) { pk = s; ext = ahead(h, f); up = P(h, f)[1] - P('Head', f)[1]; } } const ok = pk >= 3 && (ext >= 0.3 || up >= -0.05); return { ok, note: `fastest hand ${pk.toFixed(1)} m/s, ${Math.round(ext * 100)} cm ahead of the chest${up >= -0.05 ? ', at head height (uppercut)' : ''}${ok ? '' : ' (a strike wants 3 m/s and 30 cm, or an uppercut to head height)'}` }; }
  if (beat === 'punch_him') { let pk = 0, hp = 0; for (let f = 1; f < n; f++) { pk = Math.max(pk, speed('Head', f)); hp = Math.max(hp, speed('Hips', f)); } const ok = pk >= 2 || hp >= 1.5; return { ok, note: `head peak ${pk.toFixed(1)} m/s, hips peak ${hp.toFixed(1)} m/s${ok ? '' : ' (a hit wants the head at 2 m/s or the body thrown)'}` }; }
  if (beat === 's05_ring') { const fr = frac((f) => hands.some((h) => ahead(h, f) >= 0.35 && P(h, f)[1] >= P('Chest', f)[1] - 0.1)); const ok = fr >= 0.4; return { ok, note: `a fist forward at chest height or above ${Math.round(fr * 100)}% of the time${ok ? '' : ' (flight wants 40%)'}` }; }
  if (beat === 's06_boo') { let pk = 0, dn = 0; for (const h of hands) for (let f = 1; f < n; f++) { pk = Math.max(pk, speed(h, f)); if (P(h, f)[1] < P('Hips', f)[1] + 0.1) dn = Math.min(dn, vy(h, f)); } const ok = pk >= 2.5; return { ok, note: `startle: fastest hand ${pk.toFixed(1)} m/s; downward strike ${(-dn).toFixed(1)} m/s${ok ? '' : ' (a startle wants a 2.5 m/s jolt)'}${dn <= -2.5 ? ', has the strike down' : ''}` }; }
  if (beat === 's10_catch') { const s = longest((f) => hands.every((h) => ahead(h, f) >= 0.3 && ahead(h, f) >= Math.max(ahead('LeftLowerLeg', f), ahead('RightLowerLeg', f)) + 0.15 && P(h, f)[1] > P('Chest', f)[1] - 0.15 && P(h, f)[1] < P('Head', f)[1] + 0.25) && len(sub(P('LeftHand', f), P('RightHand', f))) >= 0.35); const ok = s >= 0.3; return { ok, note: `both arms out in front at chest height or above, hands apart, for ${s.toFixed(2)} s${ok ? '' : ' (a catch wants 0.3 s)'}` }; }
  if (beat === 's12_atlas') { const s = longest((f) => hands.every((h) => P(h, f)[1] >= P('Head', f)[1] + 0.08)); const ok = s >= 0.5; return { ok, note: `both hands over the head for ${s.toFixed(2)} s${ok ? '' : ' (an overhead hold wants 0.5 s)'}` }; }
  if (beat === 's14_setdown') { const held = (f) => hands.every((h) => ahead(h, f) >= 0.2 && P(h, f)[1] > P('Hips', f)[1] - 0.1 && P(h, f)[1] < P('Head', f)[1] + 0.3 && speed(h, f) < 1.2) && len(sub(P('LeftHand', f), P('RightHand', f))) >= 0.2; const s = longest(held); let hi = -9, lo = 9; for (let f = 0; f < n; f++) if (held(f)) { const y = (P('LeftHand', f)[1] + P('RightHand', f)[1]) / 2 - P('Hips', f)[1]; hi = Math.max(hi, y); lo = Math.min(lo, y); } const drop = hi - lo; const ok = s >= 0.6 && drop >= 0.12; return { ok, note: `both hands out in front, apart and slow for ${s.toFixed(2)} s, lowering ${Math.round(Math.max(0, drop) * 100)} cm${ok ? '' : ' (a careful set-down wants 0.6 s and a 12 cm lowering)'}` }; }
  return { ok: true, note: '' };
}

function run(cmd, args, o = {}) { const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, ...o }); if (r.status) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')}: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' ')}`); return r.stdout; }

for (const beat of pos.length ? pos : Object.keys(BEATS)) {
  const B = BEATS[beat]; if (!B) { console.error('no beat ' + beat); continue; }
  const dir = path.join(OUT, beat); fs.mkdirSync(dir, { recursive: true });
  const cands = [];
  if (!flag['no-match']) for (const Q of B.queries) {
    const sources = fs.existsSync(path.join(ROOT, 'gen', 'mocap', 'index', 'protofactor.json')) ? 'cmu,protofactor' : 'cmu';
    let res; try { res = JSON.parse(run(process.execPath, [path.join(HERE, 'motion_match.mjs'), '--query', Q.q, '--start', String(Q.start), '--end', String(Q.end), '--tags', Q.tags, '--sources', sources, '--top', String(TOP * 3), '--strict', ...(B.zerog ? ['--upper'] : []), '--json'])); }
    catch (e) { console.error(`${beat}: match failed: ${e.message}`); continue; }
    let kept = 0;
    for (const h of res.candidates) {
      if (kept >= TOP) break;
      if (cands.some((c) => c.clip === h.clip && Math.abs(c.start - h.start) < 1)) continue;
      const file = path.join(dir, `${h.source}_${h.clip}_${String(h.start).replace('.', 'p')}.npz`);
      if (!fs.existsSync(file)) { try { run('py', ['-I', path.join(HERE, 'motion_query.py'), 'cut', h.source, h.clip, String(h.start), String(h.end), file]); } catch (e) { console.error(e.message); continue; } }
      cands.push({ ...h, file: path.relative(ROOT, file).replace(/\\/g, '/') }); kept++;
    }
    console.log(`${beat}: ${kept} matches for ${path.basename(Q.q)} ${Q.start}-${Q.end} s (best ${res.candidates[0]?.source}/${res.candidates[0]?.clip} ${res.candidates[0]?.dist})`);
  }
  const files = B.files.filter((f) => fs.existsSync(path.join(ROOT, f)) || fs.existsSync(path.join(PROJECT, f)));
  const missing = B.files.filter((f) => !files.includes(f)); if (missing.length) console.log(`${beat}: not found: ${missing.map((m) => path.basename(m)).join(', ')}`);
  fs.writeFileSync(path.join(dir, 'candidates.json'), JSON.stringify({ beat, board: B.board, zerog: B.zerog, matches: cands, files }, null, 1));
  const srcs = [...cands.map((c) => c.file), ...files.map((f) => fs.existsSync(path.join(ROOT, f)) ? f : path.join(PROJECT, f))];
  run(process.execPath, [path.join(HERE, 'critic.mjs'), 'rank', beat, ...srcs, ...(B.zerog ? ['--zerog'] : [])]);
  // fit to the beat: each candidate's best motion-matching distance to the approved sheet's window (on the dump the critic scored)
  const RJ = path.join(ROOT, 'library', 'motion', 'critic', 'beats', `${beat}.json`), R = JSON.parse(fs.readFileSync(RJ, 'utf8'));
  const clipsDir = path.join(ROOT, 'gen', 'critic', 'clips');
  const dumpOf = (r) => r.via === 'twin' ? `gen/critic/twin/${r.name.replace(/[^\w@.-]+/g, '_')}.json` : `gen/critic/clips/${fs.readdirSync(clipsDir).find((f) => f.replace(/(__clean)?\.json$/, '') === r.name)}`;
  const Q = B.queries[0], ok = R.rows.filter((r) => !r.error), fits = JSON.parse(run('py', ['-I', path.join(HERE, 'motion_query.py'), 'fit', Q.q, String(Q.start), String(Q.end), ...ok.map(dumpOf), ...(B.zerog ? ['--upper'] : [])]));
  for (const r of ok) {
    r.fit = fits[dumpOf(r)]; const A = actionOf(beat, JSON.parse(fs.readFileSync(path.join(ROOT, dumpOf(r)), 'utf8'))); r.action = A.ok; r.actionNote = A.note;
    r.score = +((r.fit == null ? r.total - 4 : r.total - FITW * r.fit) - (A.ok ? 0 : 3)).toFixed(2);
    const m = cands.find((c) => path.basename(c.file, '.npz') === r.name); r.source = m ? `${m.source}/${m.clip} ${m.start}-${m.end} s ${m.description ?? ''}`.slice(0, 80) : r.via;
  }
  R.rows.sort((a, b) => (b.score ?? -99) - (a.score ?? -99)); R.fitWeight = FITW; R.board = B.board;
  fs.writeFileSync(RJ, JSON.stringify(R, null, 1));
  const L = [`# Motion candidates: ${beat} (${R.when.slice(0, 16)})`, '', `${B.board}. Critic ${B.zerog ? 'zero-g' : 'grounded'}; fit = best motion-matching distance to the approved sheet's window (${path.basename(Q.q, '.json')} ${Q.start}-${Q.end} s; lower is closer); score = critic total - ${FITW} x fit, - 3 without the beat's action.`, '',
    '| # | clip | score | critic | fit | action | s | lowest | source |', '|---|---|---|---|---|---|---|---|---|',
    ...R.rows.map((r, i) => r.error ? `| ${i + 1} | ${r.name} | error | | | | | ${r.error} | |` : `| ${i + 1} | ${r.name} | **${r.score}** | ${r.total} | ${r.fit ?? '-'} | ${r.action ? 'yes' : 'NO'}: ${r.actionNote} | ${r.seconds} | ${r.low.join(', ')} | ${r.source} |`), ''];
  fs.writeFileSync(RJ.replace(/\.json$/, '.md'), L.join('\n'));
  console.log(L.slice(0, 18).join('\n'));

}
