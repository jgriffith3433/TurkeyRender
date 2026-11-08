# Hawkes Punch: lessons from staging the r2 cut (2026-11-08)

What the rebuild from the storyboard must keep. Everything here was measured in frames, not guessed.

## The clock

- 24 fps (`score.json` `"fps": 24`). Video 223.46 s. Space S0 73.390 to S1 173.528; button B0 210.278 to B1 217.978.
- `cut.json` cascades: only `s1_wide` is pinned (at 0). Changing one shot's length moves everything after it, and the
  sound (lines, beds, captions, space sfx) is placed on absolute times. **When swapping a shot, keep its slot length.**
- `acts/56-space-fx.json` and the generator's set cues are absolute times: regenerate after any clock change
  (`mv cards insert/remove` does not know generated acts). `acts/70-lines.json` and `acts/78-beds.json` come from
  `lines.json` and `cards.map.json`: run `tools/punch_lines.mjs` then `tools/punch_beds.mjs hawkespunch` after every
  cut change (punch_beds names shot ids and stops when one is gone).

## Clinic set (`library/sets/clinic.json`, origin x 700)

- `doctor_punch` [0.85, 0.03, 3.0] face -45: her cross lands on his head on the bed. Face -18 aimed past him.
- `bed` [0.6, 0.40, 3.72] head 1.07. The keyed `hp_him_hit` sits his hips 0.74 m too low on it; a sheet `root` does
  nothing. Fix: two short flies to [700.6, 1.14, 3.72] (at 0 for 0.02 s and 0.03 for 0.04 s). That pair is the
  "hold" for any native body that must sit at a height.
- `desk_doc` and `stool` at z 2.35, `rx_pad`/`rx_spot` [1.22, 0.755, 1.86], `pen` [1.45, 0.76, 1.95]. Pen in her hand:
  attach to `doctor.rightHand` pos [0, 0.03, 0.04] rot [0, 0, 90]; detach and `set` it back in `d_can`.
- The ad set is origin x 900: shots there are world pos + rot (a `look` at a mark is refused).

## Lenses and framings that read

- The punch (p_hit): low 3/4 over his shoulder onto her, pos [701.25, 1.25, 4.0], look `doctor.head`, fov 48,
  screen [-0.12, 0.04]. Never straight on. Her cold face at 0.6 s: browDown .6, eyesNarrow .5, mouthPress .4.
- Impact: `impactframe` flip, flash 0, 2 frames, accent #ff3a2a; `hitstop on: person` 7 frames, victimShake .05,
  attacker doctor creep .02; shock size 0.3 width .015 glow .04 fill 0; white debris; shake trauma 1. The clinic
  ring at 5 m looked like a planet effect; 0.3 m is right.
- p_doc after the hit: fov 24 from [700.44, 1.55, 4.23], plain look, `grade catch 0` (glasses go white).
- The exit: a low floor camera on the ceiling ([701.6, 0.95, 3.0] rot [-64, -48, 0] fov 74) only reads when his
  rise through the tiles takes about 0.85 s, and J called that slower launch worse. The fast exit (0.4 s rise, the
  long fly from 0.6 s) needs the outside shot (p_glass: [698.2, 3.2, 11.2] look `person.chest` fov 40, window
  shatter, roof plug) instead. Speed wins over showing the hole.
- Inserts: the pad at fov 36 from [700.75, 1.5, 1.2]; no `insert` tag on a shot that holds her body.
- TV ad: both from [900, 1.35, -1.6] rot [1, 0, 0] fov 34; wide [900, 1.5, -3.0] rot [3.5, 0, 0] fov 40.

## Real-scale space (`library/sets/space_epic.json`, origin z 9000)

- World pos = local + 9000 z. The zero-g marks (`zg_*` clips) put the body's centre at hips height, about 0.5-0.9 m
  over the mark: aim cameras there. Aiming at 1.4-2.0 m gave two empty frames (s6_sheet, w7_brace).
- Lenses: wides fov 30-40 from 4-6 m; a close on a zero-g body fov 20-24 from about 3.5 m. fov 18 from 1.5 m
  distorts the double (huge head, claw hands).
- Moon ground: the camera must stay at y 1.3 m or more and look down, or it clips the terrain patch (the grey wedge
  under him in m7_boo/m7_flinch).
- Focuses that worked as set: `arrival_streak` (Earth, the speck's trail), `arrival_rings` (fov 32, speck over the
  rings), `ring_walk`/`ring_chase`/`ring_edge` (the boulder field; the side-on chase at fov 30 is the best shot of
  the cut), `moon_ground`, `moon_wide`, `crater_wide` (the crater cue for 5.4 s), `jupiter_bg`, `jupiter_catch`,
  `jupiter_low`, `saturn_wide`.
- `sunrise` needs `alt: 5000` on the focus cue; at the set's 800 km the Earth is a blurry green carpet.
- The Atlas hold is unsolved. Surface 2.3 m up: a flat ceiling. 100 km (offset 6471) with the sun behind him: a blue
  sky. 300 km (offset 6671) with the focus tipped `rot [0, 40, -70]`: a curved lit limb behind the figures but a
  dark-blue face with no continents or lights. The night side needs the city lights to read at that range, or the
  shot needs the limb from much farther off.
- The hoop reads: at w7_ring 0.92 s `ring_hoop lift` 60000 km, tilt 18, spin 25, 4.5 s; w7_lasso `lasso` pivot saturn,
  3 turns, 2 s, then `throw` to jupiter 1 s; w7_yank shows Jupiter wearing the ring.
- Far-layer debug: `touch Director/gen/space-debug.flag`, render a frame, read `Director/gen/space-debug.txt`.
- Every space card: `light key intensity 0` at 0, and back to 1.2 at 173.528 and 217.978, off at 223.2 (a
  directional light must end within 1 s of the video end or lint stops the build).
- Set-piece actors (`space_epic_crater`, `space_epic_hoop`, planets) can't be named in acts: those cues go in card raw.

## Traps

- `rate`, not `speed`, on native `anim`/`layer`. `do: hitstop` needs `on`. New keyed clips need `mv lint --reindex`.
- A shown or attached prop persists across cards until hidden: the drawing rode in his hand from s6 through e7 and
  sat on his face in m7_boo. Detach and hide at the hand-off card (s6_boop).
- `show` on a `model: none` parent does not show its children: every ghost part needs its own `show` and `hide`.
- An `fx` with a long `for` runs into the next shot: w7_ring's 4 s ice dust fogged w7_lasso. End fx with the shot.
- The same clip on the same mark runs on across a cut and the next card's `args` are ignored: to restart a clip on
  the next card, change the clip or the mark. p_glass casts p_face's clips so p_doc restarts `hp_doc_after`.
- `do: silence` `frames` counts back from `at`; with the sound agent's own silences the gap doubles. Leave silences
  to the sound pass.
- Keyed poses: a root rotation on a pose built `from` another adds to the parent's (the C4 shove reached 90 deg);
  `from: {clip, t}` keeps the seed's body position unless `keepRoot`. Forward punch on his avatar: Arm Down-Up
  0.1-0.2 with Front-Back -0.36 to -0.5; Front-Back + is the arm out and back; root.rot x+ pitches him forward.
- The Read tool shows a cached image for a file overwritten under the same name: copy sheets to a fresh name.
- Frame grabs refuse while another agent's edit makes the build stale (`--allow-stale`); `render-status` says when
  another render holds Unity, and `render-cancel` is refused to agents: wait.
- Generated cards: one script (scratchpad `space_cards.py`) writes `cards/space_epic.yaml`, `acts/56-space-fx.json`,
  `sequences/space_epic.json` and the cut entries. Keep an r1/r2 copy of the script beside the card backups.

## Pops judged on the strips

- Real snaps, both fixed: her head popping up on the look-up (sym_ghost_her: `blend 0.6` plus a 0.5 s gaze) and the
  hand jerk in the pen insert (sym_pen: `blend 0.6`). Not snaps: the turkey turntable (8.5 s) and every cut.

## Sound sync points (video seconds)

- Clinic punch: contact 63.81 (p_face starts), impact frame 63.81-63.89, hitstop 7 f, launch from 64.01;
  p_glass 64.31-65.31; p_doc 65.31-66.61 (her glance up at 0.75 s).
- The scream is cut dead at 76.89 (the sound agent's cut, at the ring plane).
- Space contacts: m7_impact 113.140 (the sound agent's silence ends there), w7_catch 130.640, s6 boop about 103.39,
  w7_ring lift 122.06.
- Lines start at `lines.json` `start` (space ghost 93.99, hey 141.69, what 142.84, anyone 152.04, everyone 153.84,
  focus 169.19). Every shot start and length is in SPACE-EPIC.md's shot table.
