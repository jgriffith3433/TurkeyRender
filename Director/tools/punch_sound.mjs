#!/usr/bin/env node
// Hawkes Punch's sound acts on the board clock (sound agent, 2026-11-08). No absolute times live here: every cue is a shot id from the cut
// (cards.map.json) plus seconds (or frames, "6f") into it, or a spoken line (lines.json) plus seconds from its start or end. So when the board
// moves a shot, or board2cards.mjs moves a line, run this again (mv build does it: the acts are in generated.json) and the sound follows.
// It writes
//   acts/75-captions.json   a caption for every line with `text` in lines.json (a string, or [[seconds into the take, phrase], ...])
//   acts/80-sfx.json        the clinic, ad and button sfx (door, gobble, rattle, whooshes, cans)
//   acts/82-foley.json      foley: the clinic, the two punches (with their drop-outs), the ad's reactions, the can at the end
//   acts/84-space-sfx.json  space: arrival, the search, the ring, the moon, the worlds, the break, the stop (SPACE-EPIC.md "Sound")
// The beds are acts/78-beds.json (tools/punch_beds.mjs), the lines acts/70-lines.json (tools/punch_lines.mjs). No music anywhere.
//   node Director/tools/punch_sound.mjs [hawkespunch] [--dry] [--lines <scratch lines.json> --out <dir>]   (--lines/--out: a check that writes elsewhere and registers nothing)
// Contacts (the picture's impact frame and hitstop are keyed to them in cards/board.yaml): p02 +0 (the punch), s06 +1.5 (the moon), s10 +2.2 (Jupiter),
// b02 +2.5 (the second punch). Every one gets its drop-out (`do: silence`) just before it: the sound agent owns every silence.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const args = process.argv.slice(2), flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const name = args.find((a, i) => !a.startsWith('--') && !['--lines', '--out'].includes(args[i - 1])) ?? 'hawkespunch';
const DIR = path.join(ROOT, 'Director', 'videos', name), SFX = 'Assets/MusicVideo/Sfx/punch';
const LINES_FILE = flag('--lines') ? path.resolve(flag('--lines')) : path.join(DIR, 'lines.json');
const OUT = flag('--out') ? path.resolve(flag('--out')) : path.join(DIR, 'acts'), scratch = !!(flag('--lines') || flag('--out'));
const dry = args.includes('--dry'), FPS = 24;
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const map = json(path.join(DIR, 'cards.map.json')), lines = json(LINES_FILE).lines;
const lenCache = {};
const seconds = (rel) => (lenCache[rel] ??= +String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, rel)], { encoding: 'utf8' }).stdout).trim());

// ---------------------------------------------------------------- anchors
const off = (x) => (typeof x === 'string' && /f$/.test(x) ? parseFloat(x) / FPS : +x);
const missing = [];
function shotT(id, edge) { const s = map.find((x) => x.id === id); if (!s) { missing.push(`shot ${id}`); return NaN; } return edge === 'end' ? s.tEnd : s.t; }
function lineT(file, edge) { const l = lines.find((x) => x.file === file); if (!l) { missing.push(`line ${file}`); return NaN; } return edge === 'end' ? l.start + seconds(`${SFX}/${file}`) : l.start; }
/** a cue's time: [shot, offset] | [shot, offset, 'end'] | { line, at, edge } */
const when = (a) => (Array.isArray(a) ? shotT(a[0], a[2]) + off(a[1]) : lineT(a.line, a.edge) + off(a.at ?? 0));
const where = (a) => (Array.isArray(a) ? `${a[0]}${a[2] === 'end' ? ' end' : ''} ${off(a[1]) >= 0 ? '+' : ''}${typeof a[1] === 'string' ? a[1] : off(a[1]).toFixed(2)}` : `line ${path.basename(a.line, '.mp3')}${a.edge === 'end' ? ' end' : ''} +${off(a.at ?? 0).toFixed(2)}`);

// ---------------------------------------------------------------- the cue tables
// s(anchor, file under Sfx/punch, volume, why) · quiet(anchor of the contact, frames): the whole mix drops out for those frames, back on the contact
const s = (a, file, volume, why) => ({ a, file, volume, why });
const quiet = (a, frames, why) => ({ a, silence: frames, why });

const SFX_CUES = [
  s(['c01', 0.25], 'door_a.mp3', 0.3, 'a door somewhere in the clinic'),
  s(['c02', 0.6], 'chair_creak_a.mp3', 0.3, 'him in the waiting chair'),
  s(['c04', 0.3], 'nurse_gobble_a.mp3', 0.5, '"Gobble." the turkey turns to him'),
  s(['c04', 1.0], 'chair_creak_a.mp3', 0.25, 'he stands (mx_sit_to_stand from 0.4 s)'),
  s(['c13', 1.8], 'pen_scratch_a.mp3', 0.3, 'she writes it down after "A space ghost."'),
  s(['p04', 0.05], 'roof_crash.mp3', 0.18, 'far above: the roof going'),
  s(['p04', 0.35], 'panel_clack.mp3', 0.3, 'the ceiling tiles rattle'),
  s(['p04', 0.6], 'panel_clack_2.mp3', 0.3, ''),
  s(['p04', 0.85], 'panel_clack.mp3', 0.25, ''),
  s(['p05', 0.3], 'fly_whoosh.mp3', 0.35, 'up through the clouds'),
  s(['a01', 1.0], 'applause.mp3', 0.1, 'the studio revealed: a small, far audience'),
  s(['a04', 0.0], 'gulp_a.mp3', 0.4, 'they drink on the cut, "Mmm!" right after'),
  s(['b03', 0.05], 'fly_whoosh.mp3', 0.4, 'the streak leaves the Earth again'),
  s(['b04', 2.6], 'can_clink.mp3', 0.6, 'he takes a can: clink'),
  s(['b04', 2.8], 'can_psst_a.mp3', 0.4, ''),
  s(['b04', 3.4], 'gulp_a.mp3', 0.45, 'they drink'),
  s(['b04', 3.7], 'gulp_b.mp3', 0.4, ''),
];

const FOLEY_CUES = [
  // ---- reception: the turkey types, a phone two rooms away, and him (the plant: he hears music no one else can)
  s(['c01', 0.8], 'foley/turkey_keyboard_peck.wav', 0.22, 'the turkey typing at the counter'),
  s(['c02', 0.3], 'knee_tap.mp3', 0.22, 'his fingers drum his knees (A6, N8)'),
  s(['c02', 0.5], 'foley/him_hum_c02.wav', 0.6, 'he hums a few notes only he hears (Gen audio.sfx 2026-11-08; a plant, not music)'),
  s(['c03', 0.4], 'foley/wait_phone_muffled.wav', 0.25, 'a phone two rooms away, under the poster'),
  s(['c04', 0.0], 'foley/turkey_keyboard_peck.wav', 0.35, 'pecking, then the gobble'),
  s(['c04', 1.3], 'foley/turkey_cluck.wav', 0.25, 'a cluck after it'),
  s(['c04', 1.6], 'foley/clinic_footsteps.wav', 0.25, 'he goes in'),
  // ---- the exam room
  s(['c05', 0.6], 'foley/patient_bed_creak.wav', 0.3, 'he shifts on the exam paper'),
  s(['c05', 1.5], 'foley/pen_scratch_stroke.wav', 0.25, 'she writes'),
  s(['c08', 0.4], 'foley/pen_scratch_stroke.wav', 0.3, 'she nods and writes, his line o.s.'),
  s(['c10', 0.55], 'foley/pen_scratch_burst.wav', 0.35, 'the pen moves... and stops on "In space."'),
  s(['c12', 0.1], 'foley/patient_bed_creak.wav', 0.2, 'he leans in'),
  s(['c12', 1.5], 'foley/paper_rustle_short.wav', 0.35, 'the drawing out of his pocket and up'),
  s(['c16', 1.4], 'can_slide_a.mp3', 0.4, 'she slides the can across the desk'),
  s(['c17', 0.15], 'foley/can_catch_palm.wav', 0.35, 'the can in his hand'),
  s(['c18', 1.2], 'foley/patient_bed_creak.wav', 0.18, 'he turns the can over'),
  s(['c19', 1.1], 'foley/doctor_stool_squeak.wav', 0.3, 'she stands after "No."'),
  s(['c19', 1.2], 'foley/doctor_coat_rustle.wav', 0.3, ''),
  s(['c19', 2.3], 'foley/doctor_glasses_fold.wav', 0.35, 'the glasses come off'),
  s(['c20', 1.8], 'foley/patient_bed_creak.wav', 0.3, 'he shrinks back on the bed'),
  // ---- THE PUNCH: contact is the cut into p02 (the impact frame and the 7-frame hitstop start there). Order (research 3, rule 11):
  // she rolls her shoulders under her line (c21), up into the guard (p01), the charge and her breath under the held wind-up ending in the gap,
  // 4 frames of nothing with the strike inside them, the layered hit, his yelp as he launches, the ceiling on the cut to p03, then one crumb.
  s(['c21', 1.0], 'foley/doctor_coat_rustle.wav', 0.35, 'the shoulder roll'),
  s(['p01', 0.1], 'foley/doctor_coat_rustle.wav', 0.45, 'up into her guard'),
  s(['p02', -1.642], 'foley/punch_charge_breath.wav', 0.55, 'the charge and her breath (1.48 s), ends in the gap'),
  quiet(['p02', 0], 4, 'frames -4..-1 before contact: the strike happens in silence'),
  s(['p02', 0], 'foley/punch_hit_layered.wav', 0.85, 'CONTACT: the loudest sound in the film'),
  s(['p02', '5f'], 'foley/punch_launch_yelp.wav', 0.45, 'launched, his yelp going up'),
  s(['p03', 0.1], 'foley/punch_ceiling_crash.wav', 0.6, 'through the tiles: he reaches the ceiling 0.1 s into p03 (the plugs jump there); about 3 dB under the hit, which stays the loudest (at 1.0 it peaked -1.4 dB over the hit -2.0: reviewer, round 3)'),
  s(['p03', 0.18], 'foley/punch_debris_rain.wav', 0.6, 'tiles and plaster rain down'),
  s(['p03', 0.46], 'roof_crash.mp3', 0.22, 'the roof, far above'),
  s(['p03', 1.2], 'foley/doctor_coat_rustle.wav', 0.3, 'she shakes out her hand'),
  s(['p03', 1.75], 'space_epic/space_pebble_tick.wav', 0.25, 'one crumb of plaster lands: the small sound after the boom'),
  s(['p04', 2.0], 'foley/turkey_keyboard_peck.wav', 0.35, 'back to typing, as if nothing happened'),
  // ---- the ad: small placed reactions (never blanket applause), the end card's ding (no jingle: no music)
  s({ line: 'lines2/him_thats_me.mp3', edge: 'end', at: 0.03 }, 'foley/ad_audience_chuckle.wav', 0.3, 'after "That\'s me!"'),
  s({ line: 'lines2/him_tv_fist.mp3', edge: 'end', at: 0.0 }, 'foley/ad_audience_chuckle.wav', 0.22, 'after "Tastes like a fist!", under "A good fist."'),
  s(['a06', 0.05], 'ding_a.mp3', 0.4, 'the end card'),
  // ---- the next day, and the second punch (contact b02 +2.5, HARD CUT at 3.0)
  s(['b01', 0.5], 'foley/pen_scratch_stroke.wav', 0.25, 'she writes, doesn\'t look up'),
  s(['b01', 0.9], 'foley/patient_bed_creak.wav', 0.22, 'he settles on the bed'),
  s(['b02', 2.292], 'foley/punch_swish.wav', 0.6, 'the fist comes in from off screen'),
  { ...quiet(['b02', 2.5], 3, '3 frames of nothing; it cuts the end of "and he-": the interruption is the gag'), cutsLine: true },
  s(['b02', 2.5], 'foley/punch2_hit_layered.wav', 1.0, 'CONTACT, then the hard cut to space'),
  // ---- the end: the can rolls in on the dark floor and stops (board2cards b05: move 1.7 s from 0.05, ease out)
  s(['b05', 0.05], 'foley/can_roll_floor.wav', 0.55, 'the roll'),
  s(['b05', 1.77], 'tiny_clink_a.mp3', 0.35, 'it stops: one small tick'),
];

const SPACE_CUES = [
  // ---- arrival: the scream cuts dead at the ring plane (s01 +3.0, the line's end); nothing may ring past it: the silence gag is the bed's
  s(['s01', 0.05], 'comet_fizz.mp3', 0.35, 'the streak past the Moon (1.87 s, done before the ring plane)'),
  s({ line: 'lines3/him_shes_up_here.mp3', at: 2.3 }, 'foley/paper_rustle_short.wav', 0.3, 'the drawing out of his pocket and up, as "She\'s up here" lands'),
  // ---- the search
  s(['s03', 0.1], 'space_epic/space_soft_pat.wav', 0.2, 'his hand on the boulder'),
  s(['s03', 0.2], 'space_epic/space_pebble_tick.wav', 0.15, 'ice dust'),
  s(['s03', 3.4], 'foley/doctor_coat_rustle.wav', 0.15, 'his first turn (the ghost is silent)'),
  s(['s03', 5.0], 'foley/doctor_coat_rustle.wav', 0.15, 'his second turn'),
  s(['s03', 6.4], 'shoulder_tap_a.mp3', 0.6, 'the tap from off frame right; he freezes'),
  s(['s04', 0.05], 'space_epic/space_soft_pat.wav', 0.2, 'he pushes off to turn; then silence for the deadpan'),
  s(['s04', 5.6], 'nose_boing_a.mp3', 0.5, 'the boop'),
  s(['s04', 6.6], 'fly_zip.mp3', 0.45, 'he leaves in a streak'),
  // ---- 7a the chase: the ring-ice blast, then his wake twice as big
  s(['s05', 0.0], 'fly_whoosh_2.mp3', 0.4, 'the double into the ring'),
  s(['s05', '6f'], 'space_epic/space_ice_crash.wav', 0.6, 'the ice explodes behind him'),
  s(['s05', 1.5], 'fly_whoosh.mp3', 0.5, 'him through the same hole'),
  s(['s05', 2.0], 'space_epic/space_ice_crash.wav', 0.9, 'the wake twice as big'),
  s(['s05', 2.0], 'space_epic/space_rumble_low.wav', 0.6, 'and felt low'),
  // ---- 7b the moon: contact s06 +1.5
  s(['s06', 0.05], 'space_epic/space_soft_pat.wav', 0.15, 'he sneaks along the surface'),
  s({ line: 'lines2/dbl_boo.mp3', at: 0 }, 'jump_scare_a.mp3', 0.4, 'the pop with "BOO!"'),
  s(['s06', 0.92], 'foley/punch_swish.wav', 0.7, 'the startled fist'),
  quiet(['s06', 1.5], 4, 'the drop-out before contact'),
  s(['s06', 1.5], 'space_epic/space_crater_boom.wav', 1.0, 'CONTACT'),
  s(['s06', 1.5], 'foley/punch_thump_low.wav', 0.8, 'the fist\'s own thump'),
  s(['s07', 0.0], 'space_epic/space_rumble_low.wav', 0.7, 'the crater blooms: rumble tail'),
  s(['s07', 0.1], 'space_epic/space_pressure_whoomp.wav', 0.5, 'the pressure wave; then near silence'),
  s({ line: 'lines4/him_there_before.mp3', at: -0.6 }, 'space_epic/space_pebble_tick.wav', 0.3, 'the one small sound before "...That was there before."'),
  // ---- 7c the worlds: the ring lift (s09 +0.9), the lasso (2.3), the throw (3.9), the yank (5.2); the catch, contact s10 +2.2
  s(['s09', 0.82], 'space_epic/space_ring_shear.wav', 0.8, 'the pull; the ring lifts off at +0.9'),
  s(['s09', 0.9], 'space_epic/space_rumble_low.wav', 0.5, 'the hoop coming free'),
  s(['s09', 2.3], 'space_epic/space_lasso_whirl.wav', 0.7, 'three turns'),
  s(['s09', 3.9], 'fly_whoosh.mp3', 0.5, 'the throw toward Jupiter'),
  s(['s09', 5.2], 'rope_snap_a.mp3', 0.6, 'the ring cracks tight on Jupiter'),
  s(['s09', 5.33], 'space_epic/space_rumble_low.wav', 0.6, 'Jupiter starts to move'),
  s(['s10', 0.2], 'space_epic/space_rumble_low.wav', 0.4, 'the rumble rising as it comes (no strain: minimal hero)'),
  s(['s10', 1.2], 'space_epic/space_rumble_low.wav', 0.55, 'still coming'),
  quiet(['s10', 2.2], 6, 'the drop-out before the finisher'),
  s(['s10', 2.2], 'space_epic/space_jupiter_catch.wav', 1.0, 'CONTACT: the catch'),
  s(['s10', 2.2], 'foley/punch_thump_low.wav', 0.7, 'his palms'),
  s(['s10', 3.2], 'space_epic/space_rumble_low.wav', 0.6, 'carried back thousands of km'),
  s(['s10', 3.2], 'space_epic/space_pressure_whoomp.wav', 0.4, 'the pressure wave'),
  s(['s11', 3.12], 'foley/punch_thump_low.wav', 0.3, 'the shove: a soft thump'),
  s(['s11', 3.45], 'space_epic/space_rumble_low.wav', 0.3, 'Jupiter drifts back'),
  // ---- 7d the break
  s(['s12', 0.1], 'space_epic/space_rumble_low.wav', 0.5, 'the Atlas lift'),
  s(['s14', 5.0], 'space_epic/space_soft_pat.wav', 0.4, 'the set-down ends in one small pat'),
  // ---- 8 the stop
  s(['s15', 0.05], 'heavy_breathing.mp3', 0.25, 'out of breath'),
  s({ line: 'lines2/him_you_have_face.mp3', edge: 'end', at: 0.3 }, 'foley/paper_rustle_short.wav', 0.2, 'he lets the drawing go'),
  s({ line: 'lines3/other_focus.mp3', at: -0.2 }, 'foley/doctor_coat_rustle.wav', 0.15, 'the double turns his chin back'),
];

// ---------------------------------------------------------------- captions
const CAPTION_Y = { a03: 0.37, a04: 0.37 };   // the ad's lower thirds: these captions sit above them
const shotAt = (t) => map.find((x) => t >= x.t - 1e-6 && t < x.tEnd - 1e-6)?.id;
function captions() {
  // `"captions": false` in the video's score.json: no burned-in captions (J, 2026-11-08: "remove the subtitles").
  if (json(path.join(DIR, 'score.json')).captions === false) return [];
  const caps = [];
  for (const l of lines) {
    if (!l.text) continue;
    const phrases = Array.isArray(l.text) ? l.text : [[0, l.text]], len = seconds(`${SFX}/${l.file}`);
    phrases.forEach(([o, text], i) => {
      const at = l.start + o, end = i + 1 < phrases.length ? l.start + phrases[i + 1][0] - 0.03 : l.start + len + 0.25;
      caps.push({ at, end, text, line: l.file });
    });
  }
  caps.sort((a, b) => a.at - b.at);
  // a caption stays up at least 0.9 s (readable), but never under the next one
  for (let i = 0; i < caps.length; i++) { const c = caps[i], next = caps[i + 1]; c.end = Math.max(c.end, c.at + 0.9); if (next && c.end > next.at - 0.03) c.end = next.at - 0.03; }
  return caps.map((c) => ({ cue: { at: `${c.at.toFixed(3)}s`, text: c.text, style: 'fade', size: 52, pos: [0.5, CAPTION_Y[shotAt(c.at)] ?? 0.10, 0], color: '#ffffff', for: `${(c.end - c.at).toFixed(3)}s` }, note: `${shotAt(c.at)} ${path.basename(c.line, '.mp3')}` }));
}

// ---------------------------------------------------------------- write
function cueOf(c) {
  const t = when(c.a);
  if (c.silence) { const d = c.silence / FPS; return { t: t - d, cue: { at: `${(t - d).toFixed(4)}s`, do: 'silence', for: `${d.toFixed(4)}s` }, note: `${where(c.a)} -${c.silence}f: ${c.why}` }; }
  if (!fs.existsSync(path.join(ROOT, SFX, c.file))) missing.push(`file ${SFX}/${c.file}`);
  return { t, cue: { at: `${t.toFixed(3)}s`, sfx: `${SFX}/${c.file}`, volume: c.volume }, note: `${where(c.a)}: ${c.why}` };
}
const HEAD = (what) => `// GENERATED by Director/tools/punch_sound.mjs from the board's shot ids (cards.map.json) and lines.json: ${what}\n// Every time is a shot or a line plus an offset in the tool's tables. Change the tool (or lines.json, or the board), then run it; hand edits here are lost.\n`;
const render = (head, rows) => head + '{\n "cues": [\n' + rows.map((r, i) => `  ${JSON.stringify(r.cue)}${i < rows.length - 1 ? ',' : ''} // ${r.note}`).join('\n') + '\n ]\n}\n';
const acts = {
  '75-captions.json': render(HEAD('burned-in captions, one per phrase, at the line\'s own time; the look is style.json `type`. None over the scream.'), captions()),
  '80-sfx.json': render(HEAD('the clinic, ad and button sfx.'), SFX_CUES.map(cueOf).sort((a, b) => a.t - b.t)),
  '82-foley.json': render(HEAD('foley: the clinic, the two punches (with their drop-outs), the ad\'s reactions, the can at the end.'), FOLEY_CUES.map(cueOf).sort((a, b) => a.t - b.t)),
  '84-space-sfx.json': render(HEAD('space (SPACE-EPIC.md "Sound"): impacts dry and close, each after its drop-out, then near silence and one small sound.'), SPACE_CUES.map(cueOf).sort((a, b) => a.t - b.t)),
};
if (missing.length) { console.error(`punch_sound: ${missing.length} dangling:\n  ${[...new Set(missing)].join('\n  ')}\nFix the tables in this tool (or lines.json / the board). mv refs <id> shows who else names it.`); process.exit(2); }
// silences may not swallow a spoken line (a drop-out over a word is a cut word)
const spoken = lines.map((l) => [l.start, l.start + seconds(`${SFX}/${l.file}`), l.file]);
for (const c of [...FOLEY_CUES, ...SPACE_CUES].filter((x) => x.silence && !x.cutsLine)) { const b = when(c.a), a = b - c.silence / FPS; for (const [s0, s1, f] of spoken) if (s0 < b && s1 > a + 0.01) console.error(`warn  the drop-out ${where(c.a)} (${a.toFixed(3)}-${b.toFixed(3)}) cuts into ${f} (${s0.toFixed(3)}-${s1.toFixed(3)})`); }
if (!dry) {
  fs.mkdirSync(OUT, { recursive: true });
  const { warnIfLeased } = await import('./mv/lease.mjs');
  for (const [f, text] of Object.entries(acts)) { if (!scratch) warnIfLeased(path.join(OUT, f)); fs.writeFileSync(path.join(OUT, f), text); }
  if (!scratch) {
    const { register } = await import('./mv/generated.mjs');
    const files = [...new Set([...SFX_CUES, ...FOLEY_CUES, ...SPACE_CUES].filter((c) => c.file).map((c) => `${SFX}/${c.file}`))];
    const anchoredLines = [...new Set([...SFX_CUES, ...FOLEY_CUES, ...SPACE_CUES].filter((c) => !Array.isArray(c.a)).map((c) => `${SFX}/${c.a.line}`))];
    const tool = `node Director/tools/punch_sound.mjs ${name}`;
    register(DIR, 'acts/75-captions.json', { tool, inputs: ['cards.map.json', 'lines.json', ...new Set(lines.filter((l) => l.text).map((l) => `${SFX}/${l.file}`))], gate: 'stop' });
    for (const f of ['80-sfx.json', '82-foley.json', '84-space-sfx.json']) register(DIR, `acts/${f}`, { tool, inputs: ['cards.map.json', 'lines.json', ...anchoredLines, ...files], gate: 'stop' });
  }
}
const count = (t) => (t.match(/^\s+\{/gm) ?? []).length;
console.log(Object.entries(acts).map(([f, t]) => `${f} ${count(t)} cues`).join(', ') + (dry ? ' (dry: nothing written)' : scratch ? ` (scratch: ${OUT}, nothing registered)` : ''));
