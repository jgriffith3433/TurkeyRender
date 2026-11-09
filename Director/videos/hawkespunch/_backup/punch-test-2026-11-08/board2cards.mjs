#!/usr/bin/env node
// board2cards.mjs: the approved storyboard is the source of truth for Hawkes Punch.
//   node Director/tools/board2cards.mjs [--dry]
// Reads videos/hawkespunch/storyboard/shots.json (53 shots: id, size, lens, move, frames at 24 fps, line, register) and writes
//   cut.json                      the shot order with the board's exact frame lengths (frames / 24 s), nothing pinned but the first
//   cards/board.yaml              one card per shot: the staging that already worked (LESSONS-r2.md: marks, focuses, lenses), the
//                                 register (`look`), the actors on their marks, the effects that are settled, and the line times
//   lines.json                    every spoken line's `start` moved onto its board shot (tools/punch_lines.mjs then rebuilds acts/70-lines.json)
//   storyboard/CHECKLIST.md       what each shot still needs by hand (poses and motion, effects, props, a camera move the compiler can't do)
// Hand edits never go in board.yaml: they go in storyboard/overrides.yaml, keyed by shot id, and are merged over the skeleton on every run
// (maps merge, lists replace, `null` removes a key, `raw_add` appends cues). The file is outside cards/ so the cards compiler never reads
// it as a card. Deterministic: the same inputs give the same files byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { yaml } from './cards.mjs';

const DIRECTOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = path.join(DIRECTOR, 'videos', 'hawkespunch');
const FPS = 24;
const DRY = process.argv.includes('--dry');

const board = JSON.parse(fs.readFileSync(path.join(V, 'storyboard', 'shots.json'), 'utf8'));
const linesFile = path.join(V, 'lines.json');
const linesDoc = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
const overridesFile = path.join(V, 'storyboard', 'overrides.yaml');
const overrides = fs.existsSync(overridesFile) ? (yaml(fs.readFileSync(overridesFile, 'utf8'), 'overrides.yaml') ?? {}) : {};

// ---------------------------------------------------------------- helpers
const r3 = (x) => Math.round(x * 1000) / 1000;
const SPACE_Z = 9000;                                        // library/sets/space_epic.json origin: world = local + 9000 z
const W = (p) => [r3(p[0]), r3(p[1]), r3(p[2] + SPACE_Z)];  // a space mark or point, local to world
const RAD = Math.PI / 180;
function aim(c, t) {  // camera rot (pitch, yaw, 0) from a world position to a world target, as the space generator did
  const dx = t[0] - c[0], dy = t[1] - c[1], dz = t[2] - c[2];
  const yaw = Math.atan2(dx, dz) / RAD, pitch = -Math.atan2(dy, Math.hypot(dx, dz)) / RAD;
  return [Math.round(pitch * 100) / 100, Math.round(yaw * 100) / 100, 0];
}
const look = (pos, on, fov, screen) => ({ pos, look: on, rot: null, fov, screen: screen ?? null, deadzone: false });
const aimed = (pos, target, fov) => ({ pos, look: null, rot: aim(pos, target), fov, screen: null, deadzone: false });
const dolly = (a, b, on, fov, ease = 'inout') => ({ dolly: [a, b], look: on, rot: null, fov, deadzone: false, ease });
const cast = (at, clip, o = {}) => { const e = { at, clip, blend: o.blend ?? 0 }; if (o.look) e.look = o.look; if (o.face !== undefined) e.face = o.face; const a = {}; if (o.start !== undefined) a.start = o.start; if (o.once) a.once = 1; if (Object.keys(a).length) e.args = a; return e; };
const fly = (who, to, at = 0, dur = 0.02, ease = 'linear', face = 0, extra = {}) => ({ at: `${at}s`, do: 'fly', on: who, fromHere: 1, to, arc: 0, for: `${dur}s`, ease, face, ...extra });
const hold = (who, p) => [fly(who, p, 0, 0.02), fly(who, p, 0.03, 0.04)];   // a placement that holds on a native body (LESSONS-r2 "Clinic set")
const gaze = (who, to, at = 0, limit = 40, dur = 0) => ({ at: `${at}s`, do: 'gaze', on: who, to, limit, for: `${dur}s` });
const face = (who, at, k, dur = 0.3) => ({ at: `${at}s`, do: 'face', on: who, ...k, for: `${dur}s` });
const grip = (...who) => who.flatMap((w) => ['left', 'right'].map((h) => ({ at: 0, do: 'fingers', on: w, hand: h, curl: 0.4, for: 0 })));
const KEY_OFF = { at: 0, light: 'key', intensity: 0, for: 0 };     // the stage key light lights space from nowhere: 0 on every space card
const KEY_ON = { at: 0, light: 'key', intensity: 1.2, for: 0 };
const focus = (name, extra = {}) => ({ at: 0, do: 'focus', on: 'space_epic_space', name, for: 0, ...extra });
const EARTH_HOLD = (weight, at = 0, dur = 0) => ({ at: `${at}s`, do: 'planet_hold', on: 'space_epic_earth', offset: [0, 6671, 0], face: [48, 12, 0], weight, for: `${dur}s` }); // surface 300 km over him (LESSONS-r2); `face` from the space agent
const SHOW = (...w) => w.map((x) => ({ at: 0, do: 'show', on: x }));
const HIDE_END = (...w) => w.map((x) => ({ at: 'end', do: 'hide', on: x }));
const GHOST = ['space_ghost', 'ghost_body', 'ghost_arm', 'ghost_arm_l', 'ghost_hem_1', 'ghost_hem_2', 'ghost_hem_3', 'ghost_hem_4'];
const DRAW_IN_HAND = [{ at: 0, do: 'show', on: 'drawing' }, { at: 0, do: 'attach', on: 'drawing', to: 'person.rightHand', pos: [0, 0.12, 0.08], rot: [0, 180, 0], blend: 0 }];
const DRAW_AWAY = [{ at: 'end', do: 'detach', on: 'drawing' }, { at: 'end', do: 'hide', on: 'drawing' }];

// The board's size words to the compiler's presets (tools/cards.mjs PRESETS). `frame` is the metres the frame holds at the subject.
function sizeCamera(size, lens, on) {
  const s = size.toUpperCase();
  if (s.startsWith('EXTREME WIDE')) return { preset: 'spot', from: 'catch_cam', on: 'ahead', lens };
  if (s.includes('OVER')) return { preset: 'over-shoulder', on, lens };
  if (s.startsWith('TWO')) return { preset: 'two-shot', on, lens };
  if (s.includes('LOW')) return { preset: 'low-hero', on: on[0], lens };
  if (s.startsWith('MCU')) return { preset: 'close-up', on: on[0], lens, frame: 0.8 };
  if (s.startsWith('CLOSE')) return { preset: 'close-up', on: on[0], lens };
  if (s.startsWith('MEDIUM')) return { preset: 'medium', on: on[0], lens };
  if (s.startsWith('WIDE')) return { preset: 'wide', on: on[0], lens };
  return { preset: 'spot', from: 'subject', on: on[0], lens };
}

// ---------------------------------------------------------------- the lines: file -> [shot, seconds into the shot]
// Lines with no offset are placed in order: the first 0.3 s in, each next 0.35 s after the one before ends.
const LINES = {
  c06: [['symptoms/doctor_ask.mp3', 0.3]],
  // the 18.8 s overshare, cut at its own pauses into one piece per shot (tools/punch_split.mjs, sound agent 2026-11-08). The speech is 2 s longer than
  // c07+c08 give it, so p1 and p2 spill past their cuts as o.s. lines and "In space." lands 1.05 s into c10, running 0.48 s into c11's hold.
  c07: [['symptoms/him_symptoms_v3_p1.mp3', 0.25]],       // after "So. Tell me about your symptoms." ends (c07 +0.10)
  c08: [['symptoms/him_symptoms_v3_p2.mp3', 0.77]],       // o.s. over her nod; "...more music." lands on c09 (him), mouth on
  c09: [['symptoms/him_symptoms_v3_p3.mp3', 2.35]],
  c10: [['symptoms/him_symptoms_v3_p4.mp3', 1.05]],       // her pen stops on "In space."
  c12: [['symptoms/him_symptoms_v3_p5.mp3', 0.2]],
  c13: [['symptoms/doctor_space_ghost.mp3', 0.4]],
  c14: [['symptoms/him_space_ghost.mp3', 0.3]],
  c16: [['doctor_rx_a.mp3', 0.2]],                        // 4.53 s: runs 1.7 s into the can insert c17 (silent), fine
  c18: [['lines3/him_drink_it.mp3', 0.2]],
  c19: [['lines3/doctor_no.mp3', 0.5]],
  c20: [['lines3/him_oh_no.mp3', 0.2]],
  // her line, cut at its pauses (tools/punch_split.mjs) and set closer: the 9.79 s take started 1.0 s early over "Oh no" and ended 0.29 s before the hit.
  // Now: "Don't worry." 0.38 s after "Oh no" ends, the last word 0.56 s before contact (p02), so the held wind-up (p01) ends in her breath and the drop-out.
  c21: [['doctor_line_a_p1.mp3', -0.2], ['doctor_line_a_p2.mp3', 0.8], ['doctor_line_a_p3.mp3', 3.9], ['doctor_line_a_p4.mp3', 5.4]],
  p05: [['lines4/him_scream_ring_cut.mp3', 0.0]],         // 6.0 s: ends at s01 + 3.0, the ring plane; the arrival stops there
  s02: [['lines2/him_silence.mp3', 0.5], ['lines2/him_more_music.mp3', 2.2], ['lines3/him_shes_up_here.mp3', 4.3]],
  s03: [['lines2/him_space_ghost_q.mp3', 1.5]],
  s04: [['lines4/other_sheet.mp3', 1.0], ['lines4/him_vibe.mp3', 2.8]],
  s05: [['lines4/him_are_you_her2.mp3', 0.3], ['lines4/other_no.mp3', 1.5]],
  s06: [['lines2/dbl_boo.mp3', 0.25], ['lines2/him_shriek.mp3', 0.7]],   // the shriek ends 0.03 s before the 4-frame drop-out (contact +1.5); at 1.0 the drop-out cut it
  s08: [['lines4/him_there_before.mp3', 1.5], ['lines4/other_sure.mp3', 3.5]],
  s11: [['lines4/him_okay.mp3', 1.5]],
  s12: [['lines4/him_hey.mp3', 1.0], ['lines4/other_what.mp3', 2.3]],
  s13: [['lines4/him_people.mp3', 0.6]],
  s14: [['lines4/him_anyone.mp3', 4.0], ['lines4/other_everyone.mp3', 5.0]],
  s15: [['lines2/him_are_you_ghost.mp3', 0.8], ['lines2/dbl_im_you.mp3', 4.0], ['lines2/him_you_have_face.mp3', 6.2]],
  s16: [['lines3/other_focus.mp3', 2.2], ['lines2/dbl_two_of_you.mp3', 4.5]],
  a02: [['lines2/him_right_for_me.mp3', 0.4], ['lines2/dbl_everyone_like_you.mp3', 1.9], ['lines2/him_thats_me.mp3', 4.0]],
  a03: [['lines2/doc_testimonial.mp3', 0.3]],
  a04: [['lines2/him_tv_fist.mp3', 0.3], ['lines2/dbl_good_fist.mp3', 2.6]],
  a05: [['lines2/ann_side_effects.mp3', 0.2]],
  b01: [['lines2/doc_any_symptoms.mp3', 1.6]],
  b02: [['lines2/him_button_cut.mp3', 0.3]],
  b04: [['lines3/other_same_time.mp3', 0.3]],
};
const LINE_LEN = {};  // seconds, measured once with ffprobe (2026-11-08); only used to warn when a line runs past its shot
Object.assign(LINE_LEN, { 'symptoms/doctor_ask.mp3': 2.3, 'symptoms/him_symptoms_v3.mp3': 18.81, 'symptoms/doctor_space_ghost.mp3': 1.33, 'symptoms/him_space_ghost.mp3': 1.49, 'doctor_rx_a.mp3': 4.53, 'lines3/him_drink_it.mp3': 2.59, 'lines3/doctor_no.mp3': 0.71, 'lines3/him_oh_no.mp3': 1.72, 'doctor_line_a.mp3': 9.79, 'lines4/him_scream_ring_cut.mp3': 6.0, 'lines2/him_silence.mp3': 0.69, 'lines2/him_more_music.mp3': 1.48, 'lines3/him_shes_up_here.mp3': 3.72, 'lines2/him_space_ghost_q.mp3': 1.84, 'lines4/other_sheet.mp3': 1.27, 'lines4/him_vibe.mp3': 1.07, 'lines4/him_are_you_her2.mp3': 0.62, 'lines4/other_no.mp3': 0.41, 'lines4/him_sure.mp3': 0.71, 'lines2/dbl_boo.mp3': 0.61, 'lines2/him_shriek.mp3': 0.63, 'lines4/him_there_before.mp3': 1.63, 'lines4/other_sure.mp3': 0.68, 'lines4/him_okay.mp3': 1.47, 'lines4/him_hey.mp3': 0.59, 'lines4/other_what.mp3': 0.42, 'lines4/him_people.mp3': 1.14, 'lines4/him_anyone.mp3': 1.36, 'lines4/other_everyone.mp3': 0.99, 'lines2/him_are_you_ghost.mp3': 2.64, 'lines2/dbl_im_you.mp3': 1.59, 'lines2/him_you_have_face.mp3': 1.71, 'lines3/other_focus.mp3': 1.21, 'lines2/dbl_two_of_you.mp3': 2.15, 'lines2/him_right_for_me.mp3': 1.26, 'lines2/dbl_everyone_like_you.mp3': 1.86, 'lines2/him_thats_me.mp3': 0.72, 'lines2/doc_testimonial.mp3': 2.72, 'lines2/him_tv_fist.mp3': 2.22, 'lines2/dbl_good_fist.mp3': 1.6, 'lines2/ann_side_effects.mp3': 9.67, 'lines2/doc_any_symptoms.mp3': 0.93, 'lines2/him_button_cut.mp3': 2.15, 'lines3/other_same_time.mp3': 1.27,
  'symptoms/him_symptoms_v3_p1.mp3': 5.403, 'symptoms/him_symptoms_v3_p2.mp3': 4.43, 'symptoms/him_symptoms_v3_p3.mp3': 2.539, 'symptoms/him_symptoms_v3_p4.mp3': 0.925, 'symptoms/him_symptoms_v3_p5.mp3': 4.3,
  'doctor_line_a_p1.mp3': 0.76, 'doctor_line_a_p2.mp3': 2.868, 'doctor_line_a_p3.mp3': 1.174, 'doctor_line_a_p4.mp3': 3.039 });
const UNUSED_LINES = ['lines4/him_sure.mp3', 'symptoms/him_symptoms_v3.mp3', 'doctor_line_a.mp3'];   // the two long takes are played as their pieces (_p1..)   // "Sure." after "No!" was cut by the board (s05 has only the two shouts)

// ---------------------------------------------------------------- the staging per shot (what already worked, from LESSONS-r2.md and the r2 cards)
// Each entry: seq (sequence file), cast, camera (the compiler's), shot (explicit override, wins), mood, tags, raw, needs (the checklist).
const CLINIC_SIT = { person: cast('bed', 'mx_sit_still', { look: 'doctor' }), doctor: cast('desk_doc', 'mx_writing_seated', { look: 'rx_spot' }) };
const DOC_MCU = look([700.6, 1.32, 1.35], 'doctor.head', 26, [0, -0.05]);       // her at the desk, 85 mm (sym_ghost_her)
const HIM_MCU = look([700.62, 1.45, 2.85], 'person.head', 28, [0, 0.02]);      // him on the bed, 85 mm (sym_vibe)
const HIM_CLOSE = look([700.62, 1.45, 2.85], 'person.head', 22, [0, 0.03]);
const HIM_MED = look([701.3, 1.45, 3.05], 'person.head', 34, [0, 0]);          // him from her side, 50 mm (s3_ohno)
const DOC_STAND_MED = look([701.15, 1.58, 3.62], 'doctor.head', 34, [0, 0]);   // her standing, 50 mm (s3_no)
const PEN = [{ at: 0, do: 'attach', on: 'clinic_pen', to: 'doctor.rightHand', pos: [0, 0.03, 0.04], rot: [0, 0, 90], blend: 0 }, { at: 0, do: 'fingers', on: 'doctor', hand: 'right', set: 0.6, for: 0 }];
const DOC_STANDS = { person: cast('bed', 'mx_sit_still'), doctor: cast('doctor_stand', 'IdleBreathe', { look: 'person' }), can: { at: 'can_desk' } };
const PUNCH_CAST = (start) => ({ person: cast('bed', 'hp_him_hit', { start, once: true }), doctor: cast('doctor_punch', 'hp_doc_punch', { start, once: true }), can: { at: 'can_desk' } });
const HIT_LIFT = hold('person', [700.6, 1.14, 3.72]);   // the keyed hit clip sits his hips 0.74 m low on the bed
const COLD_FACE = (who, at) => face(who, at, { browDown: 0.6, eyesNarrow: 0.5, mouthPress: 0.4 });
const TV_SIT = { person: cast('stool_l', 'IdleSit13Explain', { look: 'lens_a' }), other: cast('stool_r', 'IdleSit13Explain', { look: 'lens_a', start: 1.4 }) };
const TV_TWO = { pos: [900, 1.35, -1.6], look: null, rot: [1, 0, 0], fov: 34, screen: null, deadzone: false };
const CANS_IN_HANDS = [{ at: 0.02, do: 'attach', on: 'tv_can_a', to: 'person.rightHand', pos: [-0.004, 0.072, -0.05], rot: [0, 0, -90] }, { at: 0.02, do: 'attach', on: 'tv_can_b', to: 'other.rightHand', pos: [-0.004, 0.072, -0.05], rot: [0, 0, -90] }, ...SHOW('tv_can_a', 'tv_can_b')];
const STOP_TWO = { person: cast('stop_him', 'zg_neutral_b'), other: cast('stop_dbl', 'zg_neutral_a') };
const SUNRISE = focus('sunrise', { alt: 5000 });   // at the set's 800 km the Earth is a green carpet (LESSONS-r2)

const STAGE = {
  // ---- 1 the waiting room
  c01: { seq: 'clinic', cast: { nurse: 'reception_counter clip:idle', person: cast('waiting_seat', 'mx_sitting_hands_thighs') }, camera: { preset: 'spot', from: 'cam_reception', on: 'cam_reception_aim', lens: 24 },
    raw: [face('person', 0, { fear: 0.08, smile: 0.1 }, 0)], needs: ['the turkey typing (its idle has no typing: a wing layer or a new clip)', 'the poster reads at this size (set piece `poster`)'] },
  c02: { seq: 'clinic', cast: { person: cast('waiting_seat', 'mx_sitting_hands_thighs'), nurse: 'reception_counter clip:idle' }, camera: { preset: 'spot', from: 'cam_waiting', on: 'person', lens: 50 },
    shot: { look: null, lookOffset: null, screen: null, rot: [1.2, 75.6, 0], fov: 30, deadzone: false },
    raw: [face('person', 0, { fear: 0.08, smile: 0.15 }, 0), { at: '0.2s', do: 'layer', on: 'person', clip: 'mx_nod', mask: 'head', start: 0.4, weight: 1, for: '3.3s', blend: '0.2s' }, ...grip('person')],
    needs: ['the finger drum on his knees (r2 s1_him had 40 finger cues; a drum clip from the matching agent is better)', 'the hum: sound agent'] },
  c03: { seq: 'clinic', cast: {}, camera: { preset: 'spot', from: 'cam_poster', on: 'poster', lens: 85 }, shot: { pos: [699.2, 1.8, 2.4], fov: 26, screen: [0, 0.3], deadzone: false }, tags: ['insert'], needs: ['the poster texture must read HAWKES PUNCH. Ask your doctor at this crop'] },
  c04: { seq: 'clinic', cast: { nurse: 'reception_counter clip:idle', person: cast('waiting_seat', 'mx_sit_to_stand_2', { start: 0.4, once: true }) }, camera: { preset: 'spot', from: 'cam_waiting', on: 'person', lens: 50 },
    shot: { look: null, lookOffset: null, screen: null, rot: [1.2, 75.6, 0], fov: 30, deadzone: false },
    raw: [{ at: '0.1s', do: 'pose', on: 'nurse', bone: 'head', rot: [0, 55, 0], for: '0.35s', ease: 'out' }, gaze('person', 'nurse.head', 0.5, 40, 0.3)],
    needs: ['he stands late in the shot (mx_sit_to_stand_2 starts at 0: delay it 0.9 s or pick a candidate), then walks toward the door: a walk cue the camera cuts on', 'the gobble line is the sound agent\'s'] },
  // ---- 2 the exam room
  c05: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_room_wide', on: 'cam_room_aim', lens: 24 }, raw: [...PEN, face('doctor', 0, { smile: 0.35 }, 0)], needs: ['gloves_frame and the plaque read behind her at 24 mm (check the probe)'] },
  c06: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor.head', lens: 85 }, shot: DOC_MCU, raw: [...PEN, face('doctor', 0, { smile: 0.4 }, 0), gaze('doctor', 'person.head', 0, 35, 0)] },
  c07: { seq: 'clinic', cast: { person: cast('bed', 'IdleSit13Explain', { look: 'doctor' }), doctor: CLINIC_SIT.doctor }, camera: { preset: 'spot', from: 'cam_bed_front', on: 'person.head', lens: 85 }, shot: HIM_MCU,
    raw: [...grip('person')], needs: ['his fingers drum the bed edge (as c02)', 'the 18.8 s symptoms take runs c07 to c12: cut it per line (sound agent) or accept where it lands'] },
  c08: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor.head', lens: 85 }, shot: DOC_MCU, raw: [...PEN, { at: '0.3s', do: 'layer', on: 'doctor', clip: 'mx_nod', mask: 'head', start: 0.4, once: 1, weight: 1, for: '1.2s', blend: '0.2s' }] },
  c09: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_bed_front', on: 'person.head', lens: 85 }, shot: dolly([700.62, 1.38, 2.45], [700.62, 1.42, 2.85], 'person.head', 28, 'linear'),
    raw: [face('person', 0.2, { fear: 0.12, smile: 0.1 })], needs: ['lower, shy: a head-down layer (catalog `think` or `shrug`)'] },
  c10: { seq: 'clinic', cast: { person: cast('bed', 'mx_sitting_hands_thighs'), doctor: CLINIC_SIT.doctor }, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor.rightHand', lens: 100 }, shot: look([701.55, 1.3, 1.95], 'clinic_rx_pad', 20), tags: ['insert'],
    raw: [...PEN, { at: '0.5s', do: 'freeze', on: 'doctor', frames: 24, tremble: 0 }], needs: ['the pen stops mid-word: the freeze must land while the hand is on the paper (check 2 frames)'] },
  c11: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor.head', lens: 85 }, shot: DOC_MCU, raw: [...PEN, { at: '0.1s', do: 'anim', on: 'doctor', clip: 'mx_sit_still', blend: 0.6 }, gaze('doctor', 'person.head', 0.2, 40, 0.5), face('doctor', 0, { smile: 0, eyesWide: 0 }, 0)] },
  c12: { seq: 'clinic', cast: { person: cast('bed', 'mx_sitting_hands_thighs'), doctor: cast('desk_doc', 'mx_sit_still', { look: 'person' }) }, camera: { preset: 'spot', from: 'cam_bed_front', on: 'person.head', lens: 85 }, shot: HIM_CLOSE,
    raw: [...grip('person'), face('person', 0, { smile: 0.3, fear: 0.1 }, 0), { at: '1.6s', do: 'show', on: 'drawing' }, { at: '1.6s', do: 'attach', on: 'drawing', to: 'person.rightHand', pos: [0, 0.12, 0.08], rot: [0, 180, 0], blend: 0.1 }, { at: '1.6s', do: 'reach', on: 'person', hand: 'right', to: [700.62, 1.35, 3.3], for: '0.5s', ease: 'hand', lint: 'point' }, { at: 'end', do: 'reach', on: 'person', hand: 'right', weight: 0, for: 0 }, ...DRAW_AWAY],
    needs: ['the pocket pull (hand to hip, then up to chest): a candidate clip, not the reach', 'the drawing texture faces the lens (rot)'] },
  c13: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor.head', lens: 85 }, shot: DOC_MCU, raw: [...PEN, face('doctor', 0, { smile: 0 }, 0)] },
  c14: { seq: 'clinic', cast: CLINIC_SIT, camera: { preset: 'spot', from: 'cam_bed_front', on: 'person.head', lens: 85 }, shot: HIM_CLOSE, raw: [face('person', 0.3, { browUp: 0.3, smile: 0.2 })] },
  c15: { seq: 'clinic', cast: {}, camera: { preset: 'spot', from: 'cam_bed_front', on: 'desk', lens: 85 }, shot: look([701.95, 1.7, 3.55], 'gloves_frame', 26), tags: ['insert'], needs: ['the plaque text GOLDEN GLOVES CHAMPION must read at 85 mm'] },
  // ---- 3 the prescription
  c16: { seq: 'clinic', cast: { ...CLINIC_SIT, can: { at: 'can_desk' } }, camera: { preset: 'spot', from: 'cam_bed_cu', on: 'doctor.head', lens: 50 }, shot: look([700.05, 1.5, 4.35], 'doctor.head', 34, [0.1, 0]),
    raw: [...PEN, face('doctor', 0, { smile: 0.45 }, 0), { at: '1.2s', do: 'slide', on: 'can', to: [701.05, 0.755, 1.3], for: '0.9s' }], needs: ['over his shoulder: his shoulder must be in the left of frame (move the camera behind the bed or widen)', 'her hand pushes the can (reach to the can, then release)'] },
  c17: { seq: 'clinic', cast: { ...CLINIC_SIT, can: { at: 'can_slide_to' } }, camera: { preset: 'spot', from: 'cam_bed_cu', on: 'person.rightHand', lens: 85 }, shot: look([700.85, 1.15, 2.85], 'can', 22), tags: ['insert'],
    raw: [{ at: 0, do: 'attach', on: 'can', to: 'person.rightHand', pos: [0, 0.05, 0.08], blend: 0 }, { at: 0, do: 'fingers', on: 'person', hand: 'right', set: 0.7, for: 0 }], needs: ['the can label reads HAWKES PUNCH. One a day until it stops (texture)', 'the hand pose round the can'] },
  c18: { seq: 'clinic', cast: { ...CLINIC_SIT, can: { at: 'can_slide_to' } }, camera: { preset: 'spot', from: 'cam_bed_cu', on: 'person.head', lens: 50 }, shot: HIM_MED, raw: [face('person', 0.2, { smile: 0.4 })], needs: ['he turns the can over in his hands (attach stays from c17; a wrist roll on the right hand)'] },
  c19: { seq: 'clinic', cast: DOC_STANDS, camera: { preset: 'spot', from: 'cam_bed_cu', on: 'doctor.head', lens: 50 }, shot: DOC_STAND_MED,
    raw: [face('doctor', 0, { smile: 0 }, 0), { at: '1.6s', do: 'hide', on: 'doctor_glasses' }, gaze('doctor', 'gloves_frame', 2.6, 45, 0.5)], needs: ['she stands from the desk (desk_doc to doctor_stand): a sit-to-stand candidate; the skeleton has her already standing', 'glasses off: a hand to the face, then the hide (doctor_glasses is `withHost`: check the hide takes)'] },
  c20: { seq: 'clinic', cast: DOC_STANDS, camera: { preset: 'spot', from: 'cam_bed_cu', on: 'person.head', lens: 50 }, shot: HIM_MED, raw: [gaze('person', 'gloves_frame', 0.3, 50, 0.4), gaze('person', 'doctor.head', 1.7, 40, 0.3), face('person', 1.8, { eyesWide: 0.4, fear: 0.3 })] },
  c21: { seq: 'clinic', cast: DOC_STANDS, camera: { preset: 'spot', from: 'cam_punch', on: 'doctor.head', lens: 35 }, shot: look([701.3, 0.8, 2.05], 'doctor.head', 46, [0, 0.1]), mood: 'clinic_still',   // low, from past the desk's corner: a camera behind her was inside his legs on the bed
    raw: [COLD_FACE('doctor', 0.2), gaze('doctor', 'person.head', 0, 30, 0)], needs: ['the shoulder roll (catalog `taunt` or a layer on the arms), a chin-down hold', 'hard rim light: a rim on her from behind (light cue) while the register is epic'] },
  // ---- 4 the punch
  p01: { seq: 'clinic', cast: PUNCH_CAST(0.79), camera: { preset: 'spot', from: 'cam_punch', on: 'doctor.head', lens: 24 }, shot: look([701.25, 1.25, 4.0], 'doctor.head', 48, [-0.12, 0.04]), mood: 'clinic_still',
    raw: [...HIT_LIFT, { at: 0, grade: { catch: 0 }, for: 0 }, COLD_FACE('doctor', 0), { at: '1.91s', do: 'limbscale', on: 'doctor', bones: { rightHand: 1.3 }, for: '0.3s', in: 0.04, out: 0.12 }, { at: '1.94s', do: 'smear', on: 'doctor.rightHand', frames: 1, style: 'both', length: 0.4, copies: 3 }],
    needs: ['the wind-up held with a tremble for the whole 2 s: hp_doc_punch starts 0.79 s in so contact lands on p02 frame 0; a freeze with tremble on the cocked pose', 'he is frozen within reach: hp_him_hit holds until the hit'] },
  p02: { seq: 'clinic', cast: PUNCH_CAST(0.79), camera: { preset: 'spot', from: 'cam_bed_cu', on: 'person.head', lens: 35 }, shot: look([700.2, 1.6, 2.75], 'person.head', 40, [0, 0.1]), mood: 'punch_whoa',
    raw: [...HIT_LIFT, { at: 0, do: 'impactframe', on: 'person.head', style: 'flip', flash: 0, frames: 2, accent: '#ff3a2a', lines: 1 }, { at: 0, do: 'hitstop', on: 'person', frames: 7, victim: 'person', victimShake: 0.05, attacker: 'doctor', creep: 0.02 },
      { at: 0, do: 'speedlines', style: 'radial', on: 'person.head', amount: 0.8, for: '0.4s', hz: 12 }, { at: 0, fx: 'shock', on: 'person.head', size: 0.3, for: '0.4s', width: 0.015, glow: 0.04, fill: 0, color: '#ffffff' },
      { at: 0, fx: 'debris', on: 'person.head', size: 0.05, count: 40, speed: 3, normal: [0, 1, 0], spread: 70, gravity: 1, color: '#ffffff', color2: '#e8e8e8', for: '0.8s' }, { at: 0, do: 'shake', trauma: 1, punch: 0.06, for: '0.6s' },
      fly('person', [700.6, 3.6, 3.9], 0.5, 0.65, 'in', 0, { points: [[700.6, 1.6, 3.8], [700.6, 2.6, 3.88], [700.6, 3.6, 3.9]], to: undefined }),
      { at: '1.15s', do: 'fly', on: 'person', fromHere: 1, points: [[700.6, 3.2, 6.9], [700.6, 7.5, 12], [700.6, 17, 25], [700.6, 33, 45], [700.6, 58, 74], [700.6, 95, 115], [700.6, 140, 165]], for: '8.0s', ease: 'linear', face: 0, trail: { lines: 16, width: 0.35 } },
      { at: '0.5s', do: 'jump', on: 'clinic_roof_plug', pos: [702.4, 3.0, 6.2], height: 5, for: '1.5s' }, { at: '0.5s', do: 'rotate', on: 'clinic_roof_plug', rot: [110, 30, 50], for: '1.5s', ease: 'linear' },
      { at: '0.5s', do: 'jump', on: 'clinic_ceiling_plug', pos: [701.4, 2.7, 5.4], height: 3.2, for: '1.3s' }, { at: '0.5s', do: 'rotate', on: 'clinic_ceiling_plug', rot: [120, 0, 20], for: '1.3s', ease: 'linear' }],
    needs: ['the launch itself should come from the active-ragdoll candidate when it lands (the fly is the placeholder path)', 'silence 4 f before contact: sound agent (the sound agent owns every silence)'] },
  p03: { seq: 'clinic', cast: PUNCH_CAST(0.79), camera: { preset: 'spot', from: 'cam_punch', on: 'cam_punch_aim', lens: 24 }, shot: aimed([698.3, 1.0, 2.6], [700.6, 2.1, 3.5], 62), mood: 'punch_whoa',
    raw: [COLD_FACE('doctor', 0), { at: 0, grade: { catch: 0 }, for: 0 }, { at: 0, fx: 'debris', pos: [700.6, 2.7, 3.9], size: 0.16, count: 70, speed: 3, normal: [0, -1, 0], spread: 60, gravity: 1, color: '#e9e6df', color2: '#cfcac0', smooth: 0.1, dust: 50, dustColor: '#ddd8cf', for: '1.6s' }, { at: 0, do: 'shake', trauma: 0.5, for: '0.6s' }],
    needs: ['he is through the ceiling by 0.4 s (the fly from p02): check the hole reads from this wide', 'her arm stays extended: hp_doc_punch holds its last frame (once); if it drops, freeze her at the hit frame'] },
  p04: { seq: 'clinic', cast: { nurse: 'reception_counter clip:idle' }, camera: { preset: 'spot', from: 'cam_nurse_cu', on: 'nurse', lens: 50 },
    raw: [{ at: 0, pulse: { shake: 0.25 }, for: '0.4s' }, { at: '0.3s', do: 'pose', on: 'nurse', bone: 'head', rot: [-40, 0, 0], for: '0.3s', ease: 'out' }, { at: '1.8s', do: 'pose', on: 'nurse', bone: 'head', rot: [0, 0, 0], for: '0.35s', ease: 'inout' }, { at: '0.1s', fx: 'dust', pos: [696.6, 2.6, -2.5], count: 60, color: '#ddd8cf', for: '1.5s' }],
    needs: ['the typing (as c01)', 'the ceiling rattle and keyboard taps: sound agent'] },
  p05: { seq: 'clinic', cast: { person: { at: 'bed' } }, camera: { preset: 'spot', from: 'cam_sky', on: 'person', lens: 24 }, shot: { dolly: [[703.2, 41.0, 46.0], [703.2, 79.0, 80.0]], ease: 'linear', look: 'person.head', rot: null, fov: 60, deadzone: false }, mood: 'punch_whoa', tags: ['offmark'],
    raw: [{ at: 0, sky: { top: '#9fc3e4', mid: '#d6e8f6', bottom: '#eaf0ea', clouds: 0.55, cloudColor: '#ffffff', cloudShade: '#b9c6d2', cloudScale: 1.4, cloudSoft: 0.3, stars: 0, density: 0 }, for: 0 },
      { at: '0.6s', sky: { top: '#071233', mid: '#0f2156', bottom: '#1d3a86', clouds: 0.0, stars: 1, ambient: '#26346a', density: 0 }, for: '2.3s', ease: 'in' }, { at: '0.4s', fx: 'dust', on: 'person.chest', count: 300, color: '#ffffff', for: '2.4s' },
      { at: 0, do: 'anim', on: 'person', clip: 'mx_falling_air', blend: 0.2 }, face('person', 0, { jawOpen: 0.8, eyesWide: 0.9 }, 0)],
    needs: ['the tilt up is the dolly plus the look at his head as the p02 fly outruns the camera: check he stays in frame to 3 s', 'the scream (6.0 s) starts here and ends at s01 + 3.0, the ring plane'] },
  // ---- 5 arrival (space: key light off on every card)
  s01: { seq: 'space_epic', cast: { person: cast('arr_him', 'hp_f1_superman') }, camera: { preset: 'spot', from: 'arr_cam_speck', on: 'ahead', lens: 35 }, shot: aimed(W([25, 26, -130]), W([0, 30, 0]), 32), tags: ['offmark'],
    raw: [focus('arrival_rings'), ...hold('person', W([0, 30, -400])), fly('person', W([0, 30, 0]), 0.05, 2.95, 'out', 'yaw', { trail: { lines: 16, width: 0.35 } }), { at: '3.0s', do: 'anim', on: 'person', clip: 'hp_s3_strike', start: 0.4, once: 1, blend: 0.15 }, { at: '3.6s', do: 'anim', on: 'person', clip: 'zg_neutral_b', blend: 0.6 }, { at: '3.0s', do: 'rotate', on: 'person', rot: [0, 200, 0], for: '1.2s', ease: 'out', lint: 'slide' },
      { at: 0, do: 'speedlines', style: 'parallel', angle: 0, amount: 0.8, for: '2.9s', fadeOut: '0.1s', hz: 12 }],
    needs: ['the board\'s Moon pass and Saturn growing from a dot: a planet_move on Saturn from far (or a focus glide) over 0-2.8 s; the skeleton starts on the rings', 'he stops at 3.0 s on the ring plane where the scream cuts: hold the tiny lit figure 2 s'] },
  s02: { seq: 'space_epic', cast: { person: cast('arr_him', 'zg_neutral_b') }, camera: { preset: 'spot', from: 'arr_cam_mcu', on: 'person.head', lens: 85 }, shot: dolly(W([0.35, 31.55, -1.6]), W([0.3, 31.55, -1.3]), 'person.head', 24), tags: ['offmark'],
    raw: [focus('arrival_rings'), ...grip('person'), face('person', 0, { smile: 0 }, 0), face('person', 4.0, { browUp: 0.3 }), { at: '6.0s', do: 'show', on: 'drawing' }, { at: '6.0s', do: 'attach', on: 'drawing', to: 'person.rightHand', pos: [0, 0.12, 0.08], rot: [0, 180, 0], blend: 0.1 }, { at: '6.0s', do: 'reach', on: 'person', hand: 'right', to: W([0.1, 31.6, -0.9]), for: '0.6s', ease: 'hand', lint: 'point' }],
    needs: ['the push should start late (at 4 s, "a thought lands"): the dolly is linear over the shot; a two-point dolly with a hold needs the raw shot', 'ring light on him: the set\'s bounce; check his face is lit, not black'] },
  // ---- 6 the search
  s03: { seq: 'space_epic', cast: { person: cast('peer', 'hp_p1_peer') }, camera: { preset: 'spot', from: 'catch_cam', on: 'person.chest', lens: 50 }, shot: look(W([57.6, 3.4, 30.8]), 'person.chest', 32, [-0.1, 0.05]), tags: ['offmark'],
    raw: [focus('ring_walk'), ...grip('person'), ...DRAW_IN_HAND, ...SHOW(...GHOST), { at: 0, do: 'set', on: 'space_ghost', pos: W([59.0, 0.2, 36.5]), rot: [0, 200, 0] },
      { at: '1.0s', do: 'move', on: 'space_ghost', pos: W([59.0, 3.0, 36.5]), for: '0.8s', ease: 'out' }, { at: '2.4s', do: 'move', on: 'space_ghost', pos: W([59.0, 0.2, 36.5]), for: '0.5s', ease: 'in' },
      { at: '3.6s', do: 'move', on: 'space_ghost', pos: W([59.0, 3.0, 36.5]), for: '0.8s', ease: 'out' }, { at: '5.0s', do: 'move', on: 'space_ghost', pos: W([59.0, 0.2, 36.5]), for: '0.5s', ease: 'in' },
      gaze('person', W([40, 3, 20]), 0, 45, 0), gaze('person', W([59, 3, 36]), 2.6, 60, 0.4), gaze('person', W([40, 3, 20]), 3.5, 45, 0.4), { at: '6.4s', do: 'show', on: 'other' }, ...HIDE_END(...GHOST)],
    needs: ['the ghost rises from behind a boulder screen right: a hero boulder in the field at about local [59, 0, 37] (set `hero`)', 'he turns twice and she sinks each time: the gazes are placeholders for a turn clip', 'the tap at 6.5 s: the double enters from off (tap_dbl mark) and taps his shoulder (reach)'] },
  s04: { seq: 'space_epic', cast: { person: cast('two_him', 'zg_neutral_b'), other: cast('two_dbl', 'zg_neutral_a') }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 50 }, shot: aimed(W([57.1, 4.0, 31.8]), W([54.7, 2.75, 33.6]), 30), tags: ['offmark'],
    raw: [focus('ring_walk'), ...grip('person', 'other'), ...DRAW_IN_HAND, gaze('person', 'other.head'), gaze('other', 'drawing', 0.4, 40, 0.3), gaze('other', 'person.head', 1.6, 40, 0.3), face('other', 0, { smile: 0 }, 0), face('person', 0, { smile: 0 }, 0),
      { at: '6.0s', do: 'anim', on: 'other', clip: 'hp_b1_boop', once: 1, blend: 0.2 }, { at: '6.42s', do: 'reach', on: 'other', hand: 'right', to: 'person.head', offset: [0, 0, 0.1], for: '0.08s', ease: 'hand', lint: 'point' }, { at: '6.6s', do: 'reach', on: 'other', hand: 'right', weight: 0, for: '0.3s' },
      face('other', 6.5, { smile: 0.85 }), face('person', 6.6, { browUp: 0.5 }), fly('other', W([52.5, 3.2, 31.5]), 6.8, 0.6, 'out', 0), { at: '7.4s', do: 'fly', on: 'other', fromHere: 1, to: W([-40, 30, -20]), arc: 0, for: '0.6s', ease: 'in', face: 1, trail: { lines: 14, width: 0.3 } }, { at: '7.4s', do: 'speedlines', style: 'parallel', angle: 30, amount: 0.7, for: '0.6s', hz: 12 },
      ...DRAW_AWAY],
    needs: ['he turns to the double at the top of the shot (the r2 card rotated him 60 deg/s over 1 s)', 'the long deadpan hold 1.6-6.0 s must be still: zg_neutral drifts are fine, no gaze pops (blend 0.6)'] },
  // ---- 7a the chase
  s05: { seq: 'space_epic', cast: { person: cast('chase_him', 'hp_f2_ram'), other: cast('chase_dbl', 'hp_f2_ram') }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 35 }, shot: aimed(W([0, 0.4, -17]), W([0, 0.2, 0]), 50), tags: ['offmark'],
    raw: [focus('ring_edge', { rot: [0, 0, 90] }), ...hold('other', W([-9, 0.6, 0])), ...hold('person', W([-13, -0.4, 0])), fly('other', W([7.5, 0.6, 0]), 0.05, 1.1, 'linear', 'yaw', { trail: { lines: 16, width: 0.35 } }), fly('person', W([7.0, -0.4, 0]), 1.4, 1.0, 'linear', 'yaw', { trail: { lines: 20, width: 0.5 } }),
      { at: '0.3s', fx: 'icewake', on: 'other', for: '2.7s', emitFor: '0.7s', count: 400, size: 2.0, spread: 9 }, { at: '1.75s', fx: 'icewake', on: 'person', for: '1.25s', emitFor: '0.6s', count: 800, size: 4.0, spread: 18 }, { at: '0.5s', do: 'shake', trauma: 0.6, for: '0.7s' }, { at: '1.9s', do: 'shake', trauma: 0.9, for: '0.8s' }],
    needs: ['the ring as a wall across the middle of frame: the focus is tipped 90 deg about z so the plane is x = 0; check with a frame and move the camera back if the wall is off centre', 'the shouts land as they pass (0.3 and 1.5 s)'] },
  // ---- 7b the moon
  s06: { seq: 'space_epic', cast: { person: cast('sneak', 'hp_p2_sneak', { face: 90 }), other: cast('boo_dbl', 'hp_s3_strike', { start: 0.58, face: 200, once: true }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'other.head', lens: 24 }, shot: aimed(W([1.9, 1.7, -1.7]), W([0.4, 1.35, 0.8]), 60), tags: ['offmark'],
    raw: [focus('moon_ground'), ...grip('person', 'other'), ...hold('person', W([0, 1.4, 0])), ...hold('other', W([0.7, -1.4, 1.6])), fly('other', W([0.7, 0.9, 1.6]), 0.1, 0.14, 'out', 0), gaze('other', 'person.head'), face('other', 0.1, { jawOpen: 0.6, eyesWide: 0.9 }),
      { at: '0.15s', do: 'speedlines', style: 'radial', on: 'other.head', amount: 0.8, for: '0.3s', hz: 12 }, { at: '0.9s', do: 'anim', on: 'person', clip: 'hp_s3_strike', start: 0, once: 1, blend: 0 }, face('person', 0.9, { fear: 0.6, eyesWide: 1, jawOpen: 0.4 }),
      { at: '1.45s', do: 'smear', on: 'person.rightHand', frames: 1, style: 'both', length: 0.4, copies: 3 }, { at: '1.45s', do: 'limbscale', on: 'person', bones: { rightHand: 1.3 }, for: '0.4s', in: 0.04, out: 0.12 },
      { at: '1.5s', do: 'impactframe', on: 'person.rightHand', style: 'flip', flash: 1, frames: 2, lines: 1 }, { at: '1.5s', do: 'hitstop', on: 'person', frames: 8, victim: 'person', victimShake: 0.03 },
      { at: '1.5s', fx: 'shock', on: 'person.rightHand', size: 3, for: '0.5s', normal: [0, 1, 0], width: 0.05, distort: 0.5, glow: 0.12, fill: 0.05, color: '#e8e4dc' }, { at: '1.5s', fx: 'debris', pos: W([0.4, 0, 1.1]), size: 0.5, count: 120, speed: 6, normal: [0, 1, 0], spread: 70, color: '#8a8780', color2: '#6e6b66', smooth: 0.1, gravity: 0, dust: 40, dustColor: '#9a968e', for: '1.0s' }, { at: '1.5s', do: 'shake', trauma: 1, punch: 0.06, for: '0.7s' }],
    needs: ['the flinch that throws the fist straight down: hp_s3_strike is a forward strike; the sim agent\'s startle candidate replaces it', 'the horizon pop-up: the double rises from below the ground patch (check the patch does not clip him)'] },
  s07: { seq: 'space_epic', cast: {}, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 300 }, shot: aimed(W([0, 0, 0]), W([0, 0, 1000]), 34),
    raw: [focus('crater_wide'), { at: 0, do: 'crater', on: 'space_epic_crater', for: '3.0s' }], needs: ['two lit specks above the moon (the set has one speck, space_epic_him_speck: a second for the double)', '300 mm: the crater_wide focus was framed at fov 34; a longer lens needs the focus farther out'] },
  s08: { seq: 'space_epic', cast: { person: cast('hover_him', 'hp_p3_deadpan', { face: 180 }), other: cast('hover_dbl', 'hp_p3_deadpan', { face: 180 }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 50 }, shot: aimed(W([0, 41.3, -4.6]), W([0, 40.9, 0]), 32), tags: ['offmark'],
    raw: [focus('moon_wide'), ...grip('person', 'other'), gaze('person', W([0, 30, 4]), 0, 35, 0), gaze('other', W([0, 30, 4]), 0, 35, 0), face('person', 0, { smile: 0 }, 0), face('other', 0, { smile: 0 }, 0)],
    needs: ['the fresh crater fills the bottom of frame: moon_wide at the crater\'s lon/lat, dust settling (a slow debris with gravity 0)'] },
  // ---- 7c the worlds
  s09: { seq: 'space_epic', cast: { other: cast('grab_dbl', 'hp_r1_pull', { once: true }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 200 }, shot: aimed(W([-2.2, -0.6, -2.6]), W([0, 0.9, 0.6]), 54), tags: ['offmark'],
    raw: [focus('ring_edge'), ...grip('other'), gaze('other', W([0, -1, 3]), 0, 35, 0), { at: '0.9s', do: 'ring_hoop', on: 'space_epic_hoop', stage: 'lift', lift: 60000, tilt: 18, spin: 25, for: '2.0s', ease: 'inout' }, { at: '0.9s', fx: 'debris', kind: 'ice', on: 'other', size: 1.2, count: 150, speed: 4, normal: [0, 1, 0.3], spread: 90, gravity: 0, dust: 30, for: '1.4s' }, { at: '0.9s', do: 'shake', trauma: 0.6, for: '0.7s' },
      { at: '2.3s', do: 'focus', on: 'space_epic_space', name: 'saturn_wide', for: 0 }, { at: '2.3s', do: 'ring_hoop', on: 'space_epic_hoop', stage: 'lasso', pivot: 'saturn', turns: 3, for: '1.6s', ease: 'in' }, { at: '3.9s', do: 'ring_hoop', on: 'space_epic_hoop', stage: 'throw', to: 'jupiter', for: '0.9s', ease: 'in' },
      { at: '4.8s', do: 'focus', on: 'space_epic_space', name: 'jupiter_bg', for: 0 }, { at: '4.8s', do: 'anim', on: 'other', clip: 'hp_r2_lasso', start: 4.15, once: 1, blend: 0 }],
    needs: ['the board is ONE extreme wide at 200 mm; the skeleton cuts focus inside the shot (ring edge 0-2.3, Saturn wide 2.3-4.8, Jupiter 4.8-6): a true single shot needs the double as a speck on the far layer', 'the yank moves Jupiter: a planet_move toward the s10 catch position starting at 5.2 s'] },
  s10: { seq: 'space_epic', cast: { person: cast('low_him', 'zg_neutral_b') }, camera: { preset: 'spot', from: 'catch_cam', on: 'person.chest', lens: 18 }, shot: aimed(W([0.1, -0.6, -1.6]), W([0, 0.5, 0]), 70), tags: ['offmark'],
    raw: [focus('jupiter_low'), ...grip('person'), { at: '0.4s', do: 'anim', on: 'person', clip: 'hp_c1_catch', start: 0, once: 1, blend: 0.1 }, { at: '1.4s', do: 'shake', heavy: 0.5, for: '0.8s' },
      { at: '2.2s', do: 'impactframe', on: 'person', style: 'flip', flash: 1, frames: 2, lines: 1 }, { at: '2.2s', do: 'hitstop', on: 'person', frames: 18, victim: 'person', victimShake: 0.04 }, { at: '2.2s', fx: 'shock', far: 'jupiter', normal: [0, 0, -1], size: 20000, for: '2.0s', width: 0.06, glow: 0.3, color: '#fff2e0' }, { at: '2.2s', do: 'shake', trauma: 1, punch: 0.08, for: '1.0s' },
      { at: '2.95s', do: 'focus', on: 'space_epic_space', name: 'jupiter_catch', for: 0 }, { at: '2.95s', do: 'anim', on: 'person', clip: 'hp_c1_catch', start: 4.42, once: 1, blend: 0 }, { at: '3.0s', do: 'speedlines', style: 'parallel', angle: 90, amount: 0.8, for: '1.5s', fadeOut: '0.4s', hz: 12 }, { at: '3.0s', do: 'shake', heavy: 0.4, for: '1.5s' }],
    needs: ['Jupiter coming at him 0-2.2 s: a planet_move on space_epic_jupiter ending where jupiter_catch puts the cloud wall (geometry to measure with space-debug.flag)', 'the slide: his heels carve speed lines; the focus cut at 2.95 s to the cloud wall is where the camera should stay low and wide', 'silence 6 f before the catch: sound agent'] },
  s11: { seq: 'space_epic', cast: { person: cast('catch_him', 'hp_c1_catch', { start: 4.42, once: true }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'person.head', lens: 85 }, shot: look(W([-2.4, 0.9, -2.3]), 'person.head', 24, [0.12, 0]), tags: ['offmark'],
    raw: [focus('jupiter_catch'), ...grip('person'), face('person', 0, { smile: 0 }, 0), { at: '1.4s', do: 'blink', on: 'person', for: '0.12s' }, { at: '3.0s', do: 'anim', on: 'person', clip: 'hp_c4_shove', once: 1, blend: 0.15 }, { at: '3.3s', do: 'planet_orbit', on: 'space_epic_jupiter', for: '1.2s' }],
    needs: ['the hurricane beside his head: the cloud deck\'s storm (set `storm*`) at the focus', 'the shove sends Jupiter back where it was: planet_orbit (check it reads as a slow drift, 1.2 s)'] },
  // ---- 7d the break
  s12: { seq: 'space_epic', cast: { other: cast('atlas_dbl', 'hp_a1_atlas', { once: true }), person: cast('atlas_him', 'zg_neutral_b', { face: 30 }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 24 }, shot: aimed(W([0, -3, -9]), W([0, 3, 0]), 70), tags: ['offmark'],
    raw: [focus('atlas', { rot: [0, 40, -70] }), ...grip('person', 'other'), EARTH_HOLD(0, 0, 0), EARTH_HOLD(1, 0.5, 0.8), ...hold('person', W([-3.6, 0.3, -1.5])), gaze('other', 'person.head', 0, 30, 0), gaze('person', 'other.head', 0, 40, 0),
      { at: '1.1s', do: 'shake', heavy: 0.6, for: '1s' }, { at: '0.5s', do: 'speedlines', style: 'radial', on: 'other.chest', amount: 0.5, for: '0.6s', hz: 12 }],
    needs: ['the Atlas hold is unsolved (LESSONS-r2): 300 km up with the focus tipped gives a lit limb but a dark face; the continents and night-side city lights must read above a tiny figure', 'the lift 12 f to the overhead hold with a tremble: hp_a1_atlas'] },
  s13: { seq: 'space_epic', cast: { person: cast('atlas_him', 'zg_neutral_b', { face: 30 }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'person.head', lens: 85 }, shot: look(W([7.1, 1.65, -8.1]), 'person.head', 22, [0.08, -0.05]), tags: ['offmark'],
    raw: [focus('atlas', { rot: [0, 40, -70] }), EARTH_HOLD(1), ...grip('person'), gaze('person', W([0, 1.6, 0]), 0, 35, 0), face('person', 0, { smile: 0 }, 0), { at: 0, grade: { faceFill: 0.6 }, for: 0 }], needs: ['the Earth\'s limb behind his head, not a flat wash (goes with s12)'] },
  s14: { seq: 'space_epic', cast: { other: cast('atlas_dbl', 'hp_a2_setdown', { once: true }) }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 85 }, shot: aimed(W([-14, -2, -14]), W([0, 2, 0]), 24), tags: ['offmark'],
    raw: [focus('atlas', { rot: [0, 40, -70] }), ...grip('other'), EARTH_HOLD(1), gaze('other', W([0, 8, 0]), 0.3, 50, 0.5), { at: '2.5s', do: 'planet_orbit', on: 'space_epic_earth', for: '2.5s' }, { at: 0, grade: { faceFill: 0.7, exposure: 0.35 }, for: 0 }],
    needs: ['the careful carry (48 f) then set 6 f and a pat: hp_a2_setdown timed to the planet_orbit (2.5-5.0 s)', 'the Earth keeps turning after the set-down (the body\'s `day`)'] },
  // ---- 8 the stop
  s15: { seq: 'space_epic', cast: STOP_TWO, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 85 }, shot: dolly(W([0, 0.9, -2.9]), W([0, 0.95, -2.55]), null, 30), tags: ['offmark'],
    raw: [SUNRISE, ...grip('person', 'other'), ...DRAW_IN_HAND, gaze('person', 'other.head', 0, 30, 0), gaze('other', 'person.head', 0, 30, 0), face('person', 0, { jawOpen: 0.2, eyesWide: 0.2 }, 0), face('other', 0, { jawOpen: 0.15 }, 0), face('other', 4.0, { smile: 0.35 }),
      face('person', 6.0, { smile: 0, eyesWide: 0.25 }), { at: '7.4s', do: 'anim', on: 'person', clip: 'hp_d2_letgo', once: 1, blend: 0.3 }, gaze('person', 'drawing', 7.2, 40, 0.3), { at: '8.2s', do: 'detach', on: 'drawing' }, { at: '8.21s', do: 'move', on: 'drawing', pos: W([2.5, 2.4, 3.0]), for: '6s', ease: 'linear' }, face('person', 8.3, { smile: 0.25 })],
    needs: ['the dolly needs `rot` or a look: with two subjects the shot aims at the midpoint (set look to a point between the heads)', 'out of breath: a breathing layer on both (additive IdleBreathe)', 'the push should start late (after "I\'m you")'] },
  s16: { seq: 'space_epic', cast: STOP_TWO, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 35 }, shot: aimed(W([0, 0.9, -5.2]), W([0, 1.25, 2]), 40), tags: ['offmark'],
    raw: [SUNRISE, ...grip('person', 'other'), ...SHOW('drawing', ...GHOST), { at: 0, do: 'set', on: 'drawing', pos: W([1.5, 2.0, 2]) }, { at: 0, do: 'move', on: 'drawing', pos: W([0.4, 2.3, 4]), for: '1.6s', ease: 'linear' },
      { at: 0, do: 'set', on: 'space_ghost', pos: W([-2.6, 2.3, 4.5]), rot: [0, 180, 0] }, { at: '0.1s', do: 'move', on: 'space_ghost', pos: W([0.4, 2.3, 4.4]), for: '1.6s', ease: 'out' }, { at: '1.6s', do: 'attach', on: 'drawing', to: 'space_ghost', pos: [0, 0.2, -0.4], blend: 0.1 }, { at: '2.4s', do: 'move', on: 'space_ghost', pos: W([2.6, 2.6, 4.6]), for: '1.6s', ease: 'in' },
      gaze('other', 'person.head'), gaze('person', 'other.head'), gaze('person', 'space_ghost', 1.9, 40, 0.4), { at: '2.3s', do: 'reach', on: 'other', hand: 'right', to: 'person.head', offset: [0.06, -0.12, 0], for: '0.25s', ease: 'hand' }, gaze('person', 'other.head', 2.5, 30, 0.3), { at: '3.3s', do: 'reach', on: 'other', hand: 'right', weight: 0, for: '0.4s', ease: 'inout' },
      { at: '4.3s', do: 'gaze', on: 'person', to: W([0, 0.9, -5.2]), limit: 45, for: '0.75s', ease: 'inout' }, { at: '4.35s', do: 'gaze', on: 'other', to: W([0, 0.9, -5.2]), limit: 45, for: '0.75s', ease: 'inout' },
      { at: '4.3s', do: 'rotate', on: 'person', rot: [0, 150, 0], for: '0.75s', ease: 'inout', lint: 'slide' }, { at: '4.35s', do: 'rotate', on: 'other', rot: [0, 210, 0], for: '0.75s', ease: 'inout', lint: 'slide' }, face('person', 4.6, { smile: 0.85 }), face('other', 4.65, { smile: 0.85 }),
      ...HIDE_END(...GHOST), ...DRAW_AWAY],
    needs: ['the ghost reads: 1.5 m sheet, lit, 15-25% of frame height (she is 8 prims on `space_ghost`; the mesh and a sheet shape are the character agent\'s)', 'the chin turn-back at 2.3 s is a reach: a hand-to-chin clip is better', 'TV smiles to lens at 4.3 s: the turns are rotates (lint slide)'] },
  // ---- 9 the commercial
  a01: { seq: 'commercial', cast: TV_SIT, camera: { preset: 'spot', from: 'fold_cam', on: 'fold_aim', lens: 24 }, mood: 'tv_cheese',
    raw: [KEY_ON, { at: 0, sky: { top: '#03040a', mid: '#04050c', bottom: '#020309', stars: 1, ambient: '#1a1424', density: 0 }, for: 0 }, { at: '0.75s', sky: { top: '#ffd9ec', mid: '#fff2f7', bottom: '#e9d6ff', stars: 0, ambient: '#b9a7b6', density: 0 }, for: '0.4s' },
      ...CANS_IN_HANDS.map((c) => ({ ...c, at: '0.02s' })), { at: 0, do: 'hide', on: 'commercial_can_a' }, { at: 0, do: 'hide', on: 'commercial_can_b' }, { at: 0, do: 'pop', on: 'commercial_floor', for: '0.3s' }, { at: 0, do: 'pop', on: 'commercial_floor_edge', for: '0.3s' },
      { at: '0.05s', do: 'fold', on: ['commercial_backdrop_c', 'commercial_backdrop_l', 'commercial_backdrop_r', 'commercial_flat_pink', 'commercial_flat_blue', 'commercial_flat_yellow', 'commercial_sign', 'commercial_stool_l', 'commercial_stool_r', 'commercial_can_big'], from: [900, 0.5, 70], pivot: [0, -2, 0], axis: [1, 0, 0], angle: 90, for: '0.5s', stagger: '0.18s', ease: 'back' }],
    needs: ['the pull back (board `pull`): a dolly from fold_cam toward the wide (lens_wide) over the shot', 'the r2 tv_fold listed every set piece in its fold: check the list against library/sets/commercial.json actors (lights, boom)'] },
  a02: { seq: 'commercial', cast: { person: cast('stool_l', 'mx_sit_still', { look: 'lens_a' }), other: cast('stool_r', 'mx_sit_still', { look: 'lens_a' }) }, camera: { preset: 'spot', from: 'lens_a', on: 'set_aim', lens: 50 }, shot: TV_TWO,
    raw: [...CANS_IN_HANDS, face('person', 0.1, { smile: 0.8 }), face('other', 0.1, { smile: 0.8 }), { at: '0.1s', gfx: 'lower', title: 'IS IT RIGHT FOR YOU', sub: 'Ask your doctor', color: '#ffd000', for: '4.6s' }],
    needs: ['TV presenter life: small nods on the lines (mx_nod head layers at each line start)'] },
  a03: { seq: 'clinic', cast: { doctor: cast('desk_doc', 'mx_writing_seated', { look: 'rx_spot' }) }, camera: { preset: 'spot', from: 'cam_desk_top', on: 'doctor', lens: 65 }, shot: look([700.75, 1.5, 1.2], 'doctor.chest', 30, [0, -0.06]), mood: 'tv_hot',
    raw: [...PEN, { at: 0, do: 'show', on: 'doctor_glasses' }, face('doctor', 0, { blink: 0, eyesWide: 0.05, smile: 0 }, 0), { at: '0.3s', gfx: 'lower', title: 'A REAL DOCTOR', sub: 'Not looking up', color: '#ff2a6a', for: '3.0s' }], needs: ['the pen scratch sfx: sound agent'] },
  a04: { seq: 'commercial', cast: { person: cast('stool_l', 'mx_sitting_hands_thighs', { look: 'lens_a' }), other: cast('stool_r', 'mx_sitting_hands_thighs', { look: 'lens_a', start: 0.6 }) }, camera: { preset: 'spot', from: 'lens_a', on: 'set_aim', lens: 50 }, shot: TV_TWO,
    raw: [...CANS_IN_HANDS, ...grip('person', 'other'), { at: '0.1s', do: 'layer', on: 'person', clip: 'Cheer2', mask: 'rightArm', start: 2.75, once: 1, weight: 1, for: '1.6s', blend: '0.2s' }, { at: '0.3s', do: 'fingers', on: 'person', hand: 'right', set: 1, for: '0.12s' }, { at: '1.75s', do: 'fingers', on: 'person', hand: 'right', release: 1, for: '0.2s' },
      { at: '2.4s', do: 'layer', on: 'other', clip: 'Cheer2', mask: 'rightArm', start: 2.75, once: 1, weight: 1, for: '1.4s', blend: '0.2s' }, { at: '2.7s', do: 'layer', on: 'other', clip: 'mx_nod', mask: 'head', start: 0.4, once: 1, weight: 1, for: '1.2s', blend: '0.2s' }, face('person', 0.5, { smile: 0.9 }), face('other', 0.6, { smile: 0.9 })],
    needs: ['they drink first (0-1 s): a drink clip (`mv clips drink`; mx_sitting_drinking was rejected for foot slide), then the beam and the fist pump', 'the cans are in the right hands while the Cheer2 arm punches: hide the can during the fist or move the can to the left hand'] },
  a05: { seq: 'commercial', cast: TV_SIT, camera: { preset: 'spot', from: 'lens_crane', on: 'sign', lens: 30 }, tags: ['dark'],
    raw: [...grip('person', 'other'), { at: 0, gfx: 'image', path: 'Assets/Videos/hawkespunch/Props/side_effects_1.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], in: 0.001, out: 0.001, for: '5.02s' }, { at: '5.0s', gfx: 'image', path: 'Assets/Videos/hawkespunch/Props/side_effects_2.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], in: 0.001, out: 0.001, for: '5.0s' }],
    needs: ['the two card pages split the 10 s at 5 s: match the page turn to the announcer\'s list (sound agent has the times)'] },
  a06: { seq: 'commercial', cast: TV_SIT, camera: { preset: 'spot', from: 'lens_crane', on: 'sign', lens: 30 }, tags: ['dark'], raw: [...grip('person', 'other'), { at: 0, gfx: 'image', path: 'Assets/Videos/hawkespunch/Props/end_card.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], in: 0.001, out: 0.001, for: '2.0s' }] },
  // ---- 10 the next day
  b01: { seq: 'clinic', cast: { person: cast('bed', 'mx_sitting_hands_thighs', { look: 'doctor' }), doctor: CLINIC_SIT.doctor }, camera: { preset: 'spot', from: 'cam_room_wide', on: 'cam_room_aim', lens: 24 },
    raw: [...PEN, { at: 0, do: 'show', on: 'window_boards' }, { at: 0, do: 'show', on: 'doctor_glasses' }, { at: 0, gfx: 'image', path: 'Assets/Videos/hawkespunch/Props/next_day.png', pos: [0.5, 0.5, 0], size: [1920, 1080, 0], in: 0.001, out: 0.001, for: '1.4s' }],
    needs: ['the same framing as c05 (it is: cam_room_wide); the ceiling hole should be patched or boarded like the window (set piece)'] },
  b02: { seq: 'clinic', cast: { person: cast('bed', 'hp_him_hit', { start: 0.29, once: true }), doctor: cast('doctor_punch', 'hp_doc_punch', { start: 0.29, once: true }) }, camera: { preset: 'spot', from: 'cam_bed_front', on: 'person.head', lens: 85 }, shot: look([700.95, 1.42, 2.7], 'person.head', 24, [0.12, 0]), mood: 'clinic_still',
    raw: [...HIT_LIFT, face('person', 0, { smile: 0.3, fear: 0.1 }, 0), { at: '2.5s', do: 'hitstop', on: 'person', frames: 4, victim: 'person', victimShake: 0.05 }, { at: '2.5s', do: 'shake', trauma: 0.8, for: '0.5s' }, { at: '2.5s', do: 'smear', on: 'doctor.rightHand', frames: 1, style: 'both', length: 0.4, copies: 3 }],
    needs: ['her fist enters from off frame right at 2.4 s: hp_doc_punch starts 0.29 s in so contact is at 2.5 s; she must stand off frame (doctor_punch mark is in frame at 85 mm: check, else move her mark right)', 'HARD CUT at 3.0 s, no impact frame (board)'] },
  b03: { seq: 'space_epic', cast: {}, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 400 }, shot: aimed(W([0, 0, 0]), W([0, -600, 1000]), 34),
    raw: [KEY_OFF, focus('arrival_streak'), { at: 0, do: 'planet_move', on: 'space_epic_him_speck', to: 'moon', trail: 1.2, for: '2.5s', ease: 'in' }, { at: 0, do: 'speedlines', style: 'parallel', angle: 20, amount: 0.6, for: '2.2s', fadeIn: '0.1s', fadeOut: '0.3s', hz: 12 }],
    needs: ['a streak LEAVES the Earth and he coasts in above it: the speck\'s path from the Earth\'s limb toward the camera (planet_move from `earth`)', '400 mm: the far layer\'s fov for this focus'] },
  b04: { seq: 'space_epic', cast: { other: cast('stop_dbl', 'zg_neutral_a'), person: cast('stop_him', 'hp_f3_lean') }, camera: { preset: 'spot', from: 'catch_cam', on: 'ahead', lens: 50 }, shot: { pos: W([0, 0.8, -4.0]), look: null, rot: aim(W([0, 0.8, -4.0]), W([0, 0.9, 0])), fov: 30, screen: null, deadzone: false, aperture: 2 }, tags: ['offmark'],
    raw: [KEY_OFF, SUNRISE, ...grip('person', 'other'), ...SHOW('tv_can_a', 'tv_can_b', 'drawing', ...GHOST), { at: 0, do: 'attach', on: 'tv_can_a', to: 'other.leftHand', pos: [-0.004, 0.072, -0.05], rot: [0, 0, -90], blend: 0 }, { at: 0, do: 'attach', on: 'tv_can_b', to: 'other.rightHand', pos: [-0.004, 0.072, -0.05], rot: [0, 0, -90], blend: 0 },
      ...hold('person', W([-7, 1.2, -1.5])), fly('person', W([-0.8, 0.4, 0]), 0.05, 1.3, 'out', 'yaw'), { at: '1.4s', do: 'anim', on: 'person', clip: 'zg_neutral_b', blend: 0.5 }, { at: '1.9s', do: 'reach', on: 'person', hand: 'right', to: 'tv_can_a', for: '0.4s', ease: 'hand' }, { at: '2.3s', do: 'detach', on: 'tv_can_a' }, { at: '2.3s', do: 'attach', on: 'tv_can_a', to: 'person.rightHand', pos: [-0.004, 0.072, -0.05], rot: [0, 0, -90], blend: 0 }, { at: '2.4s', do: 'reach', on: 'person', hand: 'right', weight: 0, for: '0.3s' },
      { at: 0, do: 'set', on: 'space_ghost', pos: W([1.6, 1.7, 5.5]), rot: [0, 180, 0] }, { at: 0, do: 'attach', on: 'drawing', to: 'space_ghost', pos: [0, 0.2, -0.4], blend: 0 }, { at: '1.0s', do: 'rotate', on: 'ghost_arm', rot: [0, 0, 20], for: '0.3s', ease: 'inout' }, { at: '1.3s', do: 'rotate', on: 'ghost_arm', rot: [0, 0, 70], for: '0.3s', ease: 'inout' }, { at: '1.6s', do: 'rotate', on: 'ghost_arm', rot: [0, 0, 20], for: '0.3s', ease: 'inout' }, { at: '1.9s', do: 'rotate', on: 'ghost_arm', rot: [0, 0, 50], for: '0.3s', ease: 'inout' },
      gaze('other', 'person.head', 0, 35, 0), gaze('person', 'other.head', 1.4, 35, 0.3), face('other', 0, { smile: 0.4 }, 0), face('person', 1.6, { smile: 0.35 }), ...HIDE_END(...GHOST, 'tv_can_a', 'tv_can_b'), ...DRAW_AWAY],
    needs: ['the clink (2.5 s) and the drink (3-4.5 s): a drink clip on both, the cans in the right hands', 'the ghost out of focus behind them holds the drawing and waves at us: aperture 2 on the shot; the wave is a rotate on ghost_arm (its pivot is the capsule centre: the wave may read as a wobble)'] },
  b05: { seq: 'clinic', cast: { can_roll: { at: 'door_out' } }, camera: { preset: 'spot', from: 'cam_door', on: 'can_roll', lens: 50 }, shot: { pos: [700.2, 0.16, -1.9], look: 'can_roll', rot: null, fov: 30, aperture: 2 }, mood: 'button_dark', tags: ['dark'],
    raw: [KEY_ON, { at: 0, grade: { exposure: -0.35 }, for: 0 }, { at: 0, do: 'set', on: 'can_roll', pos: [701.6, 0.034, -0.8], rot: [0, 0, 90] }, { at: '0.05s', do: 'move', on: 'can_roll', pos: [701.6, 0.034, -2.3], for: '1.7s', ease: 'out' }, { at: '0.05s', do: 'rotate', on: 'can_roll', rot: [2520, 0, 90], for: '1.7s', ease: 'out' },
      { at: '2.7s', light: 'key', intensity: 0, for: 0 }],
    needs: ['black, then the can rolls in: the board has no title here (the r2 card slammed HAWKES PUNCH over it); the key light goes off at 2.7 s so lint\'s directional-light rule holds'] },
};

// ---------------------------------------------------------------- build
const shots = board.shots;
let t = 0; const starts = {};
for (const s of shots) { starts[s.id] = t; t += s.frames / FPS; }
const total = t;

// cut.json: the board's exact frame lengths; only the first shot is pinned, so a length change cascades as the board does.
const cutLines = shots.map((s, i) => {
  const st = STAGE[s.id] ?? {};
  const len = `${(s.frames / FPS).toFixed(4)}s`;
  return `    {"id": "${s.id}"${i === 0 ? ', "at": "0.000s"' : ''}, "len": "${len}", "seq": "${st.seq ?? 'clinic'}"}${i < shots.length - 1 ? ',' : ''}   // ${s.frames}f ${starts[s.id].toFixed(3)}s ${s.size} ${s.lens}mm ${s.reg}`;
});
const cutText = `{\n  // GENERATED by Director/tools/board2cards.mjs from storyboard/shots.json: ${shots.length} shots, ${shots.reduce((a, s) => a + s.frames, 0)} frames = ${total.toFixed(3)} s at ${FPS} fps.\n  // The board is the source of truth. Change the board (or storyboard/overrides.yaml), then run the tool. Hand edits here are lost.\n  "beats": {},\n  "shots": [\n${cutLines.join('\n')}\n  ]\n}\n`;

// the cards
function deepMerge(base, over) {
  if (over === undefined) return base;
  if (over === null) return undefined;
  if (Array.isArray(over) || typeof over !== 'object' || typeof base !== 'object' || base === null || Array.isArray(base)) return over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (k === 'raw_add') { out.raw = [...(out.raw ?? []), ...v]; continue; }
    const m = deepMerge(base[k], v);
    if (m === undefined) delete out[k]; else out[k] = m;
  }
  return out;
}
const cards = [], checklist = [], warnings = [];
for (const s of shots) {
  const st = STAGE[s.id];
  if (!st) { warnings.push(`${s.id}: no staging in STAGE: a bare card`); }
  const actors = Object.keys(st?.cast ?? {}).filter((a) => ['person', 'doctor', 'other', 'nurse'].includes(a));
  const camera = st?.camera ?? sizeCamera(s.size, s.lens, actors.length ? actors : ['person']);
  const card = {
    id: s.id,
    idea: `${s.scene}. ${s.action}`,
    feel: s.change,
    look: s.reg === 'epic' ? 'epic' : 'plain',
    cast: st?.cast ?? {},
    camera,
  };
  if (st?.shot) card.shot = st.shot;
  if (st?.mood) card.mood = st.mood;
  if (st?.tags) card.tags = st.tags;
  const raw = [...(st?.raw ?? [])];
  if ((st?.seq) === 'space_epic' && !raw.some((c) => c.light === 'key')) raw.unshift(KEY_OFF);
  // a relaxed grip on every human with no finger cue of its own (lint clip-needs-grip: mx_sit_still and the keyed clips hold the fingers flat)
  for (const who of actors) if (who !== 'nurse' && !raw.some((c) => c.do === 'fingers' && c.on === who)) raw.push(...['left', 'right'].map((h) => ({ at: 0, do: 'fingers', on: who, hand: h, set: 0.35, for: 0 })));
  if (raw.length) card.raw = raw;
  // the lines on this shot: times checked against the board's length
  const needs = [...(st?.needs ?? [])];
  const placed = LINES[s.id] ?? [];
  let cursor = 0.3;
  for (const [file, off] of placed) {
    const at = off ?? cursor;
    const end = at + (LINE_LEN[file] ?? 1);
    cursor = end + 0.35;
    if (end > s.frames / FPS + 0.05 && !['c07', 'c16', 'p05'].includes(s.id)) warnings.push(`${s.id}: line ${file} ends ${(end - s.frames / FPS).toFixed(2)} s after the shot`);
  }
  if (s.move !== 'none' && !card.shot?.dolly && !camera.push) needs.unshift(`camera move '${s.move}' is not staged (the compiler has push; a dolly needs an explicit shot)`);
  const lineText = s.line ? s.line : '(no line)';
  checklist.push({ id: s.id, start: starts[s.id], frames: s.frames, size: s.size, lens: s.lens, reg: s.reg, lines: placed.map(([f, o]) => `${f} @ +${(o ?? 0).toFixed(2)} s`), lineText, needs });
  cards.push(deepMerge(card, overrides[s.id]));
}
for (const id of Object.keys(overrides)) if (!shots.some((s) => s.id === id)) warnings.push(`overrides.yaml: '${id}' is not a board shot`);

// YAML out (flow style, the dialect tools/cards.mjs reads)
const BARE = /^[A-Za-z_][A-Za-z0-9_.+\-]*$|^-?\d+(\.\d+)?(s|b|bar|bars|f)?$/;
function flow(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(flow).join(', ')}]`;
  if (typeof v === 'object') return `{${Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${k}: ${flow(x)}`).join(', ')}}`;
  if (typeof v === 'string') return BARE.test(v) && !['null', 'true', 'false', 'end'].includes(v) ? v : (v === 'end' ? 'end' : JSON.stringify(v));
  return String(v);
}
const lines = [`# GENERATED by Director/tools/board2cards.mjs from storyboard/shots.json (the approved board, J 2026-11-08) and the staging that`,
  `# already worked (LESSONS-r2.md). Never edit this file: put a change in storyboard/overrides.yaml under the shot's id and run the tool.`,
  `# Every shot's length is in cut.json (the board's frames / 24). Checklist of what each shot still needs: storyboard/CHECKLIST.md.`, ''];
for (const c of cards) {
  lines.push(`- id: ${c.id}`);
  for (const k of ['idea', 'feel', 'look', 'mood', 'tags', 'cast', 'camera', 'shot']) {
    if (c[k] === undefined) continue;
    lines.push(`  ${k}: ${typeof c[k] === 'string' && (k === 'idea' || k === 'feel') ? JSON.stringify(c[k]) : flow(c[k])}`);
  }
  if (c.raw?.length) { lines.push('  raw:'); for (const q of c.raw) lines.push(`    - ${flow(q)}`); }
  for (const k of Object.keys(c)) if (!['id', 'idea', 'feel', 'look', 'mood', 'tags', 'cast', 'camera', 'shot', 'raw'].includes(k)) lines.push(`  ${k}: ${flow(c[k])}`);
  lines.push('');
}
const cardsText = lines.join('\n');

// lines.json: every line's start on its board shot
const byFile = {};
for (const [sid, arr] of Object.entries(LINES)) { let cursor = 0.3; for (const [file, off] of arr) { const at = off ?? cursor; byFile[file] = r3(starts[sid] + at); cursor = at + (LINE_LEN[file] ?? 1) + 0.35; } }
const newLines = [];
for (const l of linesDoc.lines) {
  if (byFile[l.file] === undefined) { if (!UNUSED_LINES.includes(l.file)) warnings.push(`lines.json: ${l.file} has no board shot (kept out)`); continue; }
  newLines.push({ ...l, start: byFile[l.file] });
}
for (const f of Object.keys(byFile)) if (!linesDoc.lines.some((l) => l.file === f)) warnings.push(`LINES names ${f}, which is not in lines.json`);
newLines.sort((a, b) => a.start - b.start);
const linesOut = { ...linesDoc, about: (linesDoc.about ?? '').replace(/ Starts are placed by board2cards\.mjs.*$/, '') + ' Starts are placed by board2cards.mjs on the storyboard\'s shots; change LINES there, not here.', lines: newLines };

// the checklist
const md = [`# Hawkes Punch: what each board shot still needs`, '', `Generated by \`Director/tools/board2cards.mjs\` from \`storyboard/shots.json\` (${shots.length} shots, ${total.toFixed(2)} s). The skeleton card for every shot is in`,
  '`cards/board.yaml`; a hand change goes in `storyboard/overrides.yaml` under the shot id (maps merge, lists replace, `null` removes, `raw_add` appends).',
  'Lines are placed in `lines.json` (then `node Director/tools/punch_lines.mjs`). The sound acts (75-captions, 78-beds, 82-foley, 84-space-sfx) are the',
  'sound agent\'s and still carry the r2 clock: they need re-placing on these times.', '', '| shot | start | frames | size, lens | reg | lines (file @ seconds into the shot) | still needs |', '|---|---|---|---|---|---|---|'];
for (const c of checklist) md.push(`| ${c.id} | ${c.start.toFixed(2)} | ${c.frames} | ${c.size}, ${c.lens} mm | ${c.reg} | ${c.lines.join('<br>') || '-'} | ${c.needs.map((n) => `- ${n}`).join('<br>') || 'nothing'} |`);
md.push('', '## Warnings from the last run', '', ...(warnings.length ? warnings.map((w) => `- ${w}`) : ['- none']), '');

// ---------------------------------------------------------------- write
const out = [[path.join(V, 'cut.json'), cutText], [path.join(V, 'cards', 'board.yaml'), cardsText], [linesFile, JSON.stringify(linesOut, null, 1) + '\n'], [path.join(V, 'storyboard', 'CHECKLIST.md'), md.join('\n')]];
if (!DRY) {
  const bk = path.join(V, '_backup', 'pre-board');
  fs.mkdirSync(bk, { recursive: true });
  for (const f of ['cut.json', 'lines.json']) { const src = path.join(V, f), dst = path.join(bk, f); if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst); }
  for (const [f, text] of out) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); }
}
console.log(`${shots.length} shots, ${total.toFixed(3)} s; ${cards.length} cards; ${newLines.length} lines placed; ${Object.keys(overrides).length} overrides; ${checklist.reduce((a, c) => a + c.needs.length, 0)} checklist items${DRY ? ' (dry: nothing written)' : ''}`);
for (const w of warnings) console.log('warn  ' + w);
