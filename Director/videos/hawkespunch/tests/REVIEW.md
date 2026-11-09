# Review of the six 5-second hero tests (rendered 2026-11-08 12:08-12:13 by `tools/board_tests.sh`)

Reviewed 2026-11-08 13:55-14:20 by the Unity owner (fresh session). Every one of the 120 frames of each test was stepped as
24-frame sheets (one sheet per second, frame number and song time on each tile), plus the pop/cut strips in each `strips/`.
Critic on the built scene: `critic/t-punch/report.md` (64.25-69.25) and `critic/t-space/report.md` (103.25-144.25, `--zerog`).
These renders are 854x480 drafts, made before any motion candidate existed. **Verdict: all six FAIL.** None goes to J.

| test | critic | verdict |
|---|---|---|
| punch (64.25-69.25) | 3.3/10, 240 snaps, arcs 0, anticipation 0 | FAIL |
| s05_ring (103.25-108.25) | space range 6.5/10, 201 snaps | FAIL |
| s06_boo (106.25-111.25) | (same range) worst moments 107.17 hips 29 deg, 107.67 leg 32 deg | FAIL |
| s10_catch (122.75-127.75) | (same range) arm snaps 123.50, 125.71 | FAIL |
| s12_atlas (131.75-136.75) | (same range) | FAIL |
| s14_setback (139.25-144.25) | (same range) | FAIL |

## punch (p01 wind-up, p02 hit, p03 through the ceiling)
- **64.500 (file f6): a one-frame shot** between c21 and p01 (a third camera on her, arms down), then p01 at f7. A flash cut. A fault.
- **p01 64.54-66.46: no wind-up.** She stands with her hand at her glasses, then the arm swings across the body; there is no coiled
  fist behind the ear, no twist, no held tremble. The pose sheet (`hp_doc_punch`, critic 6.3/10, 67 snaps) started at 0.79 s plays as a
  gesture, not a coil. His back fills screen right, so the "both in one frame" geography is there but he is not "frozen within reach".
- **The strike 66.33-66.46 (strip 05 f0-f4): the fist is an open fanned hand**, made huge by `limbscale rightHand 1.3`; the
  board2cards default `fingers set 0.35` on every hand at 0 kills the fist. A fault (a hand in a fan).
- **Impact frame 66.50-66.54:** 2 frames, salmon/black inversion; reads, but the board asks black on white with the red accent only.
- **p02 66.54-67.21: his body is under the mattress; only his head pokes up out of the bed.** A fault. Her hand at frame right is open.
- **67.25-67.38: a second close-up of him (window, gloves frame) whose arms snap up with fanned yellow-skinned hands in one frame
  (67.38).** Critic: hips 36 deg/frame at 67.13, neck 21 deg at 66.79, left hand 111 cm in one frame at 68.00.
- **p03 67.5-69.25: he travels diagonally, horizontal and straight-legged, toward the hole, not "straight up"; no tiles rain on
  screen to read; she is a small figure; her arm is not "still extended".**
- Rebuild: real punch source (`mx_hook_punch` A 8.3, `mx_cross_punch` A 8.4, `vm_box_hooks`/`mm_cross_punch_*` video-mocap), her
  right hand left out of the blanket finger cue, a hit-react source for him (`mx_stomach_hit`/`stumble_backwards` head snap at 0.55 s),
  the p02 camera and his root fixed so his body is on the bed, the launch rebuilt as one straight-up flight, the 1-frame cut removed.

## s05_ring (the ring blast)
- **No Saturn ring in frame at any point** (103.29-106.21): black space, two 2-5 px specks at 103.29-103.62, then a debris cloud that
  grows until it fills the frame (105.6-106.1): the camera ends up inside the debris. "A man is never a 2-pixel body" is broken.
- Both wakes do not read as two (his "twice as big" is not visible). Caption "Are you her?" lands on 106.21, one frame before the cut,
  and runs on into s06. FAIL: needs the ring as terrain (ring_edge focus) in frame and figure-size bodies.

## s06_boo (BOO, the flinch, the crater from orbit)
- **He is sunk to the waist in the moon surface the whole shot** (106.42-108.75), right arm straight up, still; no sneak, no BOO pop-up
  that reads (the double is a dark blob by the boulder), **no downward strike** before the impact frame.
- **107.792: a full white frame**, then 2 inverted impact frames (107.83-107.88). The white plus 2 inversions is a flash-check risk.
- **Captions are the wrong lines:** "Are you her?", "No.", "Are you sure?" play over s06; the board's lines are BOO! / Aah!.
- s07 (108.79-): the crater ring blooms on the moon, readable, but the s05 ring-ice debris cloud sits beside the moon at orbit scale
  (108.79-109.1). Critic: hips 29 deg/frame 107.17, leg 32 deg 107.67, upper leg 25 deg 108.13. FAIL.

## s10_catch (brace, the Jupiter catch, the slide)
- **Jupiter is not in frame** (122.79-125.67): he is a dark silhouette on black with a sun flare and a horizon line; the board's
  "Jupiter filling the whole sky behind and coming at him" is absent. Only at 125.71 does a Jupiter edge enter the bottom.
- No brace, no arms-out catch, no slide: he stands with one hand to his face, the other arm drifting (arm snaps 123.50, 125.71).
- 124.958: a full white frame, then 2 impact frames. FAIL.

## s12_atlas (the Atlas wind-up, "People live there")
- 131.79-133.00: speed lines over black with two specks, then black. 133.04-135.21: the double is a 10 px figure standing on the Earth's
  limb with the Earth BEHIND him, not held overhead; day side, no night side or city lights (the known open set problem). FAIL.

## s14_setback (the careful set-down)
- 139.25-144.25: one locked wide; the Earth is a band at the top, the double a 10 px figure upside-down below it; no carry, no set-down,
  no pat. The caption is "Hey." (the s12 line) over s14 at 141.71-142.21; "Did anyone see? / Everyone saw." are missing. FAIL.

## Cross-cutting faults (fix once, not per test)
1. **Lines and captions are on the wrong shots in space** (s06, s14): `acts/75-captions.json` is hand-maintained on the r2 clock. Sound agent.
2. **Blanket `fingers set 0.35` on every hand of every card** (board2cards default): kills fists and grips. A shortcut by the rule.
3. **White full frames before impact frames** (107.792, 124.958): check `flashcheck.mjs` on each test.
4. **Bodies as specks** in s05, s12, s14: board says figure-size or a lit speck with a trail, never a 2-pixel body.
5. **Floating bodies standing upright** (s10, s12, s14): not the zg_neutral float base.

---

## punch, rebuilt (2026-11-08 14:30-16:30, Unity owner): IMPROVED, STILL FAIL (not for J yet)

Files: `tests/punch/punch-720.mp4` + `punch-720-mix.mp4` (1280x720, 24 fps, 16:25), `strips720/`, draft `punch.mp4` (854x480).
Staging in `storyboard/overrides.yaml` (p01-p03, every change commented), one new mark `doctor_uppercut` in `library/sets/clinic.json`.
Sources, all real: her Protofactor `LeftPowerUppercut` (mocap, critic 7.8; pulled + admitted this session with `RightPowerUppercut`
8.0, `RightUppercut` 8.4, `GetHitFrontHeavyCombat` 9.4, `GetHitFrontLightCombat` 8.5); him `mx_sit_still`, `GetHitFrontHeavyCombat`
as an upper layer, `mx_flying_back_death` for the launch. `hp_doc_punch` / `hp_him_hit` and the hip lift are gone from the punch.
Why an uppercut: he sits on a high bed (head 1.58 m, hers 1.46 m, from the bone dump), so a hook or cross (rendered 14:40 with
`mx_hook_punch`) crosses his chest; and only an upward blow sends a man straight up through a ceiling. **This changes one board phrase
("fist cocked behind her ear" becomes a low coil, fist at the hip): J should know when he sees it.**

Stepped all 120 frames (24-frame sheets) of 10 renders; the last one:
- 64.50-66.40 p01: low two-shot from behind her left shoulder (c05's side of the line): she drops from guard into the coil by 64.88
  and holds 36 frames with a tremble, back to us, him beyond facing the lens. The 1-frame flash cut at 64.500 is gone (it was the
  board's hip-lift fly at 0 s).
- 66.417-66.458 the strike (2 frames), 66.500-66.542 impact frame (his silhouette, her fist under the jaw), 66.58-66.79 front CU: her
  fist at his chin, held, his head goes back, her arm rises past his face; 67.08-67.21 he lifts off and flips; 67.25-67.38 p03: his legs
  vanish into the hole, she stands under it with the fist overhead to 67.9, then back to guard.
- Critic (him): 3.3 -> 5.8/10 (arcs 0 -> 7.5, distance from human 1.2 -> 8.9); her: 6.3/10. Flash check PASS (2 flashes/s max).
  Shot check 0 A.

Still wrong (why it is not in READY.md):
1. Critic still red: 250 snaps, ease 0, anticipation 0; 67.17 hips 23 deg/frame at the launch (was 44 before the 3-frame blend);
   67.83 a 427 m/s^2 jerk where the rise fly hands over to the sky fly (off screen, but physics says one impulse, one speed).
2. p02 CU is crowded: her white sleeve covers half the frame from 66.83 and his own hit-react hand (the layer) covers his cheek.
3. p03: her back is to the lens, so "cold face" never reads; the tiles do not visibly rain (a few chunks in the hole); 67.9-69.25
   is a long hold on a small figure seen from behind.
4. Both bodies' forearms and hands render khaki/yellow against pink faces in every shot (character asset, not staging).
5. The c21 line "So shut up, and swallow the damn Hawkes Punch." runs under the whole wind-up (sound agent: line placement).
Next: a p03 camera in front of her (her face, fist up, the hole above) from a measured position (not a guess: two of my guessed
cameras put the bed or a wall in frame), a cleaner CU angle, one fly from bed to sky (a single impulse), then a fresh reviewer.

---

## Round 2 (2026-11-08 14:35-15:10 PST, real clock; the round-1 stamps "14:30-16:30" above were wrong, the work ran 13:52-14:30)

### Yellow forearms: FIXED at the source
Cause: `tools/punch_wardrobe.py` tinted only his BODY texture's skin "sick" green-yellow (skin mean 178/162/119) while his head
(`Person/Head.mat`) stayed pink (168/130/112). The FBX re-export and the material remaps were not involved (`Person.fbx.meta`
imports no materials; the cast sets `Person_sick.mat` + `Head.mat`). Fix: the script no longer tints skin (only the tee changes);
regenerated -> only `Assets/Videos/hawkespunch/Props/Person_sick.png` changed (Person_red, Person2_doctor and every .mat/.meta byte-identical).
Backup `_backup/wardrobe-skin-2026-11-08/`. Before/after: `tests/punch/skin_before_after.jpg` (64.25+1.0 s and +2.4 s). Builds after:
hawkespunch (cards, shot check 0 A) and greener (plain build, exit 0; greener never used these files). `_fx_test`, `_space_epic` and
`_shotcheck_test` also cast Person_sick and now get the untinted skin. The fresh reviewer saw no yellow (f53, f69-72).

### Punch round 2: STILL FAIL (fresh reviewer agrees: FAIL)
Rebuilt (all in `storyboard/overrides.yaml`, commented): the coil is the clip played slowly (clip 0.30-0.40 over 1.6 s) with a held
tremor, her brows tighten, his eyes drop to her fist and back (no freeze); his hit is GetHitFrontHeavyCombat on mask `spine,head` over
the seated body (with `upper`, its boxing guard put both hands over his face; DeathBackCombat, the motion agent's #1, is a slow 1 m/s
fall, not a snap); ONE flight path from the bed to the sky at constant speed starting on the p02/p03 cut (no hand-over, no
mid-shot clip switch, no bed penetration); her swing resumes from the contact pose when the hitstop ends (the hold resumed her at song
time: upper arm 74 deg in one frame); p03 camera from the bone dump (her head at 700.83/1.46/3.17), wide, so the hole and her face share
the frame. Pulled + admitted DeathBackCombat (twin 9.1, Unity 9.2; not used).
Numbers: critic him 5.8 -> 6.4-6.5 (no hip snap; worst now 67.5 the launch's corner, off screen), her 6.3 -> 7.1 (worst 19 deg/frame);
shot check 0 A; motioncheck: p01 her coil fist 5-7 cm into his knee (64.9-65.3), a can attach 188 cm off his hand (left from c17/c18);
p02 her forearm 8 cm into his chest at contact; p03 his breakthrough contacts with the roof (intended) and her 48 deg/frame arm at 68.03.
Flash check PASS. `qa.mjs --strict` not run (vision is down; its non-vision measures need a `mv shot` render first: next turn).
Fresh reviewer (a subagent that never saw the staging, stepped all 120 frames): **FAIL**. Its points, which I accept:
1. The fist never visibly meets his jaw: at 66.58-66.75 her hand sits at his collarbone; 66.79 her arm drops out for one frame,
   66.83 it is straight up past his face with an open hand (a whiff); his head only drifts; the ceiling hole is visible 66.92-67.21
   while he still sits (spoils the payoff).
2. p01 from behind her: her face never shows, the coil arm is hidden behind her torso, her near arm sticks out stiffly; her coat back
   has a lumpy bulge; 1.8 s with nothing building. c21's tail is mostly ceiling with her back (that is c21's own staging, not this test).
3. p03: he is on screen 2 frames, diagonal not straight up; she is in guard with hands at her face until 68.1, the fist goes up only
   68.1-68.5 (reversed order), then she fidgets; the tile rain is sparse; no crash accent at 67.25 in the sound.
Next (not done): p01 from her front-left 3/4 at hip height so the low coil and her face read; p02 a camera set from the contact
frame's bone dump so fist and jaw meet in frame, hide the hole (start the plugs' jump on the cut), a stronger head snap source;
p03 start her clip at the held-overhead pose on the cut, him visible 6-8 frames (start the flight lower in frame or slower first
metre), a bigger tile burst, sound agent for a crash at the p03 cut.

### Vision checks pending (Gen's Claude is rate-limited until 2026-11-12 17:00 UTC)
critic vision, `qa.mjs` vision, `mv review` vision and `mv coldview` on every test. The fresh-reviewer subagent stood in for them.

### Space tests: not started this round
Captions: lines.json now places every space line on its board shot (s05 him_are_you_her2 +0.3 / other_no +1.5, s06 BOO +0.25 /
Aah +0.7, s12 Hey +1.0 / What +2.3, s14 anyone +4.0 / everyone +5.0); `tools/punch_sound.mjs` regenerates 75-captions on every build,
so the wrong-shot captions seen in the 12:08 renders should be gone on re-render (not yet verified by a render).
- s05/s14 picks noted for the next Unity-owner round: mm_ring_glide_a (zg_neutral base + glide as upper layer), mm_set_lower_a rate 0.5 then mm_set_pat.

---

## Round 3 (2026-11-08 15:20-16:20 PST)

### Skin: a matched, subtle tinge, hawkespunch-only
`tools/punch_wardrobe.py` blends his skin 22% toward a pale grey-green (170/194/168) on BOTH the body texture and a new
hawkespunch-only copy of his head (`Assets/Videos/hawkespunch/Props/Person_sick_head.png/.mat`, cast as his `material2` in
`acts/00-cast.json`). Measured skin means: body 196/154/131 -> 190/163/139, head 168/130/112 -> 169/144/123 (the same transform).
TK Shock, Greener and every other video keep `Person/Head.mat`. Decided deliberately: `_fx_test`, `_space_epic` and `_shotcheck_test`
cast Person_sick too, so they now also get Person_sick_head (one line each, backups in each `_backup/00-cast-pre-skin-2026-11-08.json`);
otherwise their faces would mismatch. The double (Person_red) keeps healthy skin. Evidence: `tests/punch/skin_r3_pair.jpg` (65.5: his face
and forearm in one frame in clinic light; 66.67: his face beside her normal hand), 24 fps sheet `skin_r3_strip_65.25-66.21.jpg`.
The fresh reviewer: face and forearms match, but at this strength he reads tan-beige, not green, in the wides (grey-pale in the CU).
Raising the blend is one number (`k` in `sicken`); left subtle as asked, for the coordinator/J to call.

### Punch round 3: FAIL (fresh reviewer #2, who never saw any earlier version)
Changes (overrides.yaml, every one commented): RightPowerUppercut from a new mark `doctor_uppercut_r` (fist on his chin from the
clip dump; moved 7 cm back after a 6.6 cm head penetration); p01 camera front-left 3/4 (her face visible); p02 camera from the
contact-frame bone dump; his hit layer at 1.6x; the ceiling plugs and tiles start on the p03 cut (no hole in p02); 300 tiles; one
upright flight (yaw + tilt; the path's start nudged so the yaw never flips) visible 4-6 frames; her fist overhead on p03's first frame;
the c17 can stays in his hand (cast `can: null` c19-p03, hidden when he is through the roof); the pen detached from her punching hand.
Sound (`tools/punch_sound.mjs`): ceiling crash moved to p03 +0.1 s, now at 0.6 (at 1.0 it peaked -1.4 dB, over the hit's -2.0).
Numbers: critic him 6.7, her 7.4; shot check 0 A; flash PASS; motioncheck: pen and can and bed faults gone; left: her left elbow at
155 deg through the coil (the clip's guard, slowed), her fist 2.9-6.8 cm into his chest/head on the contact frame only, his shin
4 cm in the roof at 67.40 and one hips flip at 67.47 while he is inside the hole.
Reviewer's FAIL, which I accept:
1. p01: from frame 9 her guard arm crosses her brow and eyes (the slowed RightPowerUppercut guard), so her face is hidden 64.67-65.71
   and it reads as wiping her forehead, not a coil; at 66.46 her sleeve passes through his thigh with an open hand; he looks at his lap.
2. p02: an open fanned hand at his cheek 66.58-66.71, then the forearm through his jaw at 66.75-66.79; no real head snap. (The fingers
   cue at p02 +0.3 s comes too late for the contact frames.) The coat sleeve reads blobby at this size.
3. p03 works best: his launch reads, her cold face and fist up 67.42-68.46 then lowered; but the tile rain is thin and passes
   through her body at 68.58-68.79.
What it needs next, as rebuilds: a strike source whose guard stays low (mm_doc_uppercut "dips then rises", or a Protofactor
uppercut started after its guard), her right fist closed from the coil through contact (a grip cue from the coil, not after),
contact staged so the fist stops at the chin (mark from the dump, 3-5 cm short), a stronger head snap (mm_him_snapback 8.6 as the
spine,head layer), denser tiles kept off her (spawn behind her, from the hole's far side).

Vision checks still pending (Gen's Claude rate-limited until 2026-11-12 17:00 UTC). Space tests: not started.

---

## Round 4 (2026-11-08 16:25-17:05 PST): punch FAIL again (fresh reviewer #3); moving on to s05 as directed

Skin: blend raised to k=0.31 on body and head (`skin_r4_pair.jpg`). Reviewer #3: his face reads grey-green but his forearms read warm
tan in p01/p03, so they do not match under light (the head texture starts darker and greyer than the body's skin, so the same blend
lands differently). Left: match the RESULT, not the blend (sample both rendered skins in one clinic frame and solve the head and
body blends so the lit colours agree), one more script number each.
Punch changes: mm_doc_uppercut (guard at the chin) from mark `doctor_uppercut_m` [1.01,0.03,3.32] face -45 (beside his left knee; in
front of him her hips were 12 cm into his thigh); fist set 1 from the coil; p02 camera front-right at jaw height (from the profile and
from the front her fist covered his face); mm_him_snapback (spine,head, 1.8x); tiles from the hole's window side; crash at 0.6.
Measured: hit peak -2.0 dB, crash -3.9 dB (the hit is the loudest); critic him 6.1, her 7.0; flash PASS; shot check 0 A.
Reviewer #3, accepted: p01 her hand at her mouth the whole hold (mm_doc_uppercut's guard), the slowed dip is a 1.6 s near-freeze,
the cut comes before the fist reaches him; p02 the fist lands on his eye/nose, the hold does not read (her fist keeps rising), no
head snap read, her hands open and claw after 66.83; p03 he shows 3 frames, the hole opens before he reaches it, tiles arrive a
second late as grey gravel, she never holds the fist up (hands at her face). Motioncheck still: her thigh 11 cm into his shin in p01.

### What is left on the punch (for whoever takes round 5)
1. The source. Neither Protofactor uppercut nor mm_doc_uppercut gives a low coil with a clear face and a closed fist on Person2: both
   carry a boxing guard at the face, and Person2 cannot take layers (both arms fly out), so the guard can't be masked off. Needs a
   candidate with the off hand LOW (a "haymaker uppercut from the hip"), or a fix to the Person2 layer fault (engine) so the strike
   arm can be layered over a calm base.
2. Contact. Stage from a bone dump at contact AND check the frame: the fist must sit under the jaw and the camera must see the gap
   between fist and face close; a 7-frame hitstop on both bodies that visibly holds (today the attacker resumes at song time and
   I restart her clip inside the hold, which reads as no hold).
3. The launch. He must be on screen ~6 frames: the flight is ~11 m/s; the p03 lens is too close to the bed. A wider p03 (or the
   first 0.3 s of flight slower) and the plugs jumping when his head reaches them (~0.15 s), tiles as flat light-grey squares
   falling at once.
4. Her p03: open on the clip at its fist-overhead frame and hold it (mm_doc_uppercut has no overhead hold: it dips back to guard).
5. Skin: match the lit result (above).

## s05 ring blast: first pass (2026-11-08 17:10-17:25 PST), not yet a test render
Staging in `storyboard/overrides.yaml` s05 (commented): focus `ring_chase` (the dense main ring) stood up as a wall with
`rot [0,0,90]` (the old `ring_edge` is the A ring's outer edge, open space behind it: why the 12:08 test showed no ring), the camera
9 m off the flight line (was 17), the ice wake cut to 160/320 pieces of 0.7/1.4 m (was 400/800 of 2/4 m, which filled the frame),
both bodies on zg_neutral (b for him, a for the double) with mm_ring_glide_a as an upper-body layer. Build clean, shot check 0 A.
Frames (stills, staging only): `tests/s05_ring/r4/frames_103.3-106.1.jpg`. What they show: the ring now in frame, but edge-on it is a
thin tan vertical band, not a wall of ice; the double is a figure (red, ~40 px at 854) crossing it; captions are on the right shot
("Are you her?!" 104.0, "No!" 104.8); him not clearly visible by 105.5; the wake still fills the right half by 105.5-106.1.
Next: turn the ring plane ~40 deg to the lens (focus `heading`, or the camera off-axis) so its face reads as a field of ice while
they pierce it; follow them with a 2-frame lead; check him at 105.4-106.2; a 24 fps render, strips, critic --zerog, motioncheck,
and a fresh reviewer.

## s05, round 5 render (2026-11-08 17:40 PST): FAIL on my own stepping (no reviewer spent on it)
`tests/s05_ring/s05-720.mp4` (1280x720, 24 fps, 103.25-108.25). Camera turned 40 deg off the flight's side line. Stepped all frames as
24-frame sheets (`r4/sheet_104.25-105.21.jpg`, `r4/sheet_105.25-106.21.jpg`):
- The ring is gone from frame at this angle: no wall, no band, only the scattered ice-wake boulders on black. Edge-on (square to the
  flight) it was a thin tan stripe. So the near ring is a thin plane in this set; neither angle gives "a wall of ice". Needs the set
  agent's answer: what the near layer draws at `ring_chase` (a particle field of house-size boulders at the ring plane, as `ring_walk`
  has for s03?) and a focus whose near field puts boulders round the crossing point.
- The double (red, ~25 px at 1280) reads crossing to frame right by 104.3 and then hangs there, still, to 106.2: the fly ends at
  x 7.5 at 1.15 s (104.4) and nothing carries him on. The flight must continue out of frame (constant speed, no stop in mid-air).
- Him: only flecks at the left edge 105.04-105.13, then hidden inside his own wake 105.25-106.0. Not readable as a figure.
- Captions right: "Are you her?!" 104.25-104.6, "No!" 104.75-105.6.
What is left: the ring field (set agent), flights that never stop in frame, his wake behind him (`along`/`radius` so it trails, not
surrounds), a camera that leads him by 2 frames; then the 24 fps render, critic --zerog, motioncheck, fresh reviewer.

Skin lit-match and s06 not started this round.

## s05 round 6 (2026-11-08 18:00-18:25 PST): FAIL (fresh reviewer #4)
Staging (overrides.yaml s05, commented): focus `ring_chase` with `alt: 0` (inside `ring_field`), camera 20 m off, 2 m above the
plane; both fly at constant speed from frame 0 (single flies placed on the cut; the 0.02 s hop flies had been visible at 103.33 as a
50,000 m/s^2 jerk) right out of frame; s02's never-released point (`reach` on his right hand to [0.1,31.6,8999.1]) released at s05 0 so
his arm no longer points 34 m off. Render `tests/s05_ring/s05-720-mix.mp4`; flash PASS; critic --zerog 5.2 (its worst items are the
constant-speed flights, which zero-g physics wants linear, and the old hop); motioncheck left: the double's head bent 60 deg in the
glide 103.80-104.37 (mm_ring_glide_a's ram pose: breaks "head level").
Reviewer #4, accepted: one huge hero boulder (the set's [0,-1,0] r8) fills ~70% of the frame, so no ring plane, no Saturn, no scale;
the double slides across its face instead of through ice; the icewake is beige low-poly confetti spawned in place, not a white/blue
trailing wake, and his is not visibly bigger; HIM (dark tee) is a black speck on the dark-blue rock; "Are you her?!" plays from 103.58
before he is in frame (~104.8) and the caption lacks "Hey!"; frame 0 (103.25) still shows s04 (check the s04/s05 cut's frame
rounding); s06's head shows a white frame at ~107.83 and matte frames after it (s06's own fault, next test).
Next: camera well back (100-200 m, longer lens) so the field reads as a band with Saturn behind, the flight line moved off the hero
boulder (a clear-zone patch), icewake colours to the ring's ice (#dfe3ea/#a9a39a) trailing (`along`), a rim on him, his line moved
to when he enters (lines.json/board2cards LINES s05 offset, sound agent) and "Hey!" added to the caption text.
Skin lit-match and s06: not started.

## s05 round 7 (2026-11-08 18:35-18:55 PST): FAIL on my own stepping (no reviewer spent)
Done: lines retimed at the generator (`tools/board2cards.mjs` LINES s05: "Are you her?!" 0.3 -> 1.3 s, "No!" 1.5 -> 2.3 s; lines.json
now 104.55 / 105.55), then punch_lines, punch_sound, punch_beds regenerated; `mv generated check` clean after the build (50-cards and
cards.map are rebuilt by `mv cards`). "Hey!" is NOT in the take (`lines4/him_are_you_her2.mp3` is 0.62 s, "Are you her?!" only), so the
caption is right for the audio; the board's "Hey!" needs a new shouted take (Gen voice, cents: sound agent). The glide layer is on
`arms,spine` (head stays on zg_neutral). Wakes set to the ring's ice white-blue. Mood hp_space_huge (rim, face fill).
Render `tests/s05_ring/s05-720.mp4` (18:52), sheet `r7/sheet_104.25-105.21.jpg`: camera 150 m off at y 8 is INSIDE the 50 m-thick
field, so big white boulders sit between the lens and the flight; the far ring is a tan band across the frame (good); neither body is
visible (too small at 150 m, fov 22, or behind the boulders); the wakes still render beige under the warm sun (the colour key reaches
the material but the sun tints it).
Next: camera ABOVE the field (y 40-60, pitched down ~15 deg) so the ice is a floor/wall under the flight and nothing sits in front of
the lens; 40-60 m off with fov 30-35 so they are ~60-80 px; the wake's colour cooler still (#cfe0ff) or its own emission; then render,
critic --zerog, motioncheck, a fresh reviewer.
Frame 0 showing s04 (reviewer #4): `cards.map.json` puts s05 at "41:4.911" (beats, 4 decimals) for t = 103.25, so the compiled cut can
land a hair after 103.25 and the frame sampled at exactly 103.25 is still s04. The rounding is in tools/cards.mjs (seconds -> beats),
not board2cards; it touches every cut. Not changed (shared file; needs a WORKLOG claim and a check that all cuts land on frames).
Skin lit-match and s06: not started.

## Round 8 (2026-11-08, new Unity owner): cut fix, two engine fixes, s05 rebuilt 14 times; s05 still FAIL (fresh reviewers #5, #6)

### Fixed for every shot
- **Cuts on frames** (`tools/cards.mjs`): with score.json `fps`, cut and card boundaries are quantised to frames and every compiled time is
  written in seconds (exact n/fps). Before: 53/53 hawkespunch cuts off-frame (worst 8.2e-4 frames, many AFTER the frame: s05 f0 showed s04).
  After: 53/53 on frames (error 0). Videos without fps (greener, touchgrass, _space_epic, _cards_test, _shotcheck_test, styletest) compile
  byte-identical; tkshock has no cards. make-test 11/11.
- **Instant cues complete on their own frame** (`Runtime/MVCore.cs` Op.instant + `Editor/ScoreCompiler.cs` Op()): a `for: 0` cue was at
  k=0 on the exact frame of its cut (clip floor 1/60 s), so a shot's first frame kept the last shot's focus/lights/grade (s05 f0 showed
  s04's Saturn limb). Verified f0 == f1 at 103.25.
- `MVEpicFx.cs`: debris/icewake `emit`/`emitColor` (self-lit share) and `fadeFrom` (1 = whole to the end of life, then gone).
  Trap: fx args in seconds must be plain numbers (`emitFor: 3`); `"3s"` is not read and falls back to half the life.
- `tools/critic.mjs vision`: ffmpeg `-frames:v 8` after tile wrote 8 images to one name; now `-frames:v 1`. ffmpeg drawtext here needs
  `FONTCONFIG_FILE` pointing at a fonts.conf with `C:/Windows/Fonts` (no default config on this PC).

### s05 (overrides.yaml s05, all commented)
Above the field's top (y 43), camera 14 m off, tracking at 40.65 m/s, focus `ring_chase` heading 40 (Saturn's disc and limb screen left),
Superman-flat bodies (fly tilt 80 for her + mm_ring_glide_a held at its glide window; him on `mx_falling_air`), constant speeds from frame 0
past the cut, wakes offset behind each flyer, ending on the cut. Set: ring_field count 6000 -> 16000 + a clear corridor row.
Renders `tests/s05_ring/r8/s05-only-r8n-720-mix.mp4` (latest), earlier r8 a..m. Checks on r8m/r8n: shotcheck 0 A 0 B, flash PASS,
mv review (vision) 0 A 0 B, motioncheck only the flights' deliberate 1.4 m/frame hips, critic --zerog 5.8 (arcs/ease 0 on linear flight:
zero-g wants linear; "head bowed" is the critic reading a horizontal body), qa --strict vision 5.6-8.6 run to run (pass at 8.6 on r8k).
Fresh reviewers (never saw the staging), both FAIL, accepted:
1. A: the far ring past its 400 m nearFade reads as a flat opaque tan slab with a ruler edge cutting Saturn; they fly in front of it, not
   through it. This is the far-layer ring at a grazing angle from 44 m above the plane; the near field can't hide it.
2. A (#6): the double looks like she lies on boulders (f0, f12, f66-71): boulders behind her overlap her silhouette.
3. B: the wakes are flat untextured white low-poly shards next to textured field boulders (MV/Lit, faceted); the double's wake reads thin.
4. B: him (mx_falling_air) clutches his arms at his chest; he loses ground to her (by design he never overtakes; reads as losing).
Next (as rebuilds, not fixes on fixes): a different camera and scale for "through the ring": from 0.5-2 km ABOVE the ring plane looking
down (the ring as a banded floor, as `arrival_rings` does at 600 km), the two of them lit specks/figures with trails punching DOWN through
the plane with ice spray; or the set agent gives the far ring a particle look at grazing angles. The icewake needs the field's rock
material (MVSpace.RockMat) instead of flat MV/Lit (engine). A flight source with life (motion agent: skydive/wind-tunnel video).

### s06 (not rebuilt)
Done: camera `on: ahead` (the old `on: other.head` aimed at the ground for 4 frames: the black frames after the cut), impact frame
`flash: 0` (no full white frame). Found: on `moon_ground` the bodies sink into a round dark hole at the marks, and raising a body's fly y
moves it DOWN into the hole (probes at 106.25-108.1, overrides history in `_backup/overrides-pre-s06r8-2026-11-08.yaml`): the near world or
surface under moon_ground is not where the cards assume. Needs the set/space agent before any s06 staging. Not started: the recoil and
mm_boo_smash beat.

### Not started this round: skin lit-match, the punch (engine agent has reported both fixes in the WORKLOG).
Nothing in READY.md.

## Round 9 (2026-11-08, Unity owner): punch first; moon hole fixed in the engine

### Engine: the s06 moon "hole" (FIXED)
`Runtime/MVSpace.cs` BuildSurface: the rock surface was built at its own fractal height (~10.3 m at the near origin on moon_ground)
with the patch's centre vertex at y 0, so every moon_ground mark sat ~10 m under the surface inside a cone to that vertex (the
"sunk to the waist in a hole"; raising a body's y moved it further into the cone). Now the floor is shifted so the ground at the near
origin is y 0 (space.md "ground is y = 0"); rocks follow. Before/after: `tests/s06_boo/r9/before_106.500_probe.png` (both sunk in the
pit) and `after_106.500.png`, `after_107.500.png` (both standing on the ground, the horizon, the rock, the double above it).

### Punch (see the verdict line below)
- r9a: mm_doc_rise_b square in front of him: its coil is a 45-degree lunge with her head 0.8 m forward, so her head was in his lap in
  the coil and 0.33 m from his face at contact (a "kiss" read in the CU). Measured: `critic/66-67/doctor.bones.json`. Also: a cast clip
  that runs on from the previous card is NOT restarted by new cast args (p03 must restart it with an explicit `anim` cue).
- r9b: an upright calm layer over rise_b (`lower,spine,head,leftArm`): the arm, posed for a bent torso, then pointed straight at him.
  Verdict: rise_b fits only a standing target, or a shot where she is beside him with her head clear; not this seated close-up.
- r9c: round 4's measured geometry (mm_doc_uppercut from doctor_uppercut_m) + a leftArm calm layer (guard down) + the engine hitstop
  + contact on the cut + p03 on rise_b's overhead hold. Requested from the set agent: mark doctor_rise (WORKLOG), now unused.

### Next steps (for whoever continues; no re-deriving needed)
**s06 BOO** (`storyboard/overrides.yaml` s06, round 9 block, staged but not yet stepped at 24 fps): the old hop flies are gone, both
stand on marks now that the ground is real. Rock to hide the double: centre (-0.38, 0.34, 2.07), 1.3 m (MVSpace rock, computed). Seen in
the after stills: (1) him in near-profile; turn him to face the lens more (cast face ~140) so the flinch reads; (2) the double stands
~4 m back and is already fully up at frame 2; place him just behind the rock's far side (-0.4, 0, 3.4) and start the pop at 0.08 s;
(3) Idle1Yell's claws read; keep. Then render 106.25-108.75, step, check the mm_boo_smash hit lands on 1.5 s (its hammer stops at clip
0.6), the shock ring on the ground under his fists, then critic --zerog off (he is on a moon), qa vision, fresh reviewer.
**s05**: the rebuild plan: a focus 0.5-2 km above the ring plane looking down (like `arrival_rings` at 600 km, but lower), the ring as
a banded floor; the two as lit figures with trails punching DOWN through the plane (fly points crossing y 0) with ice spray; the
icewake should use the field's rock material (MVSpace.RockMat, textured ice) instead of flat MV/Lit (engine change in MVEpicFx
BuildWake's material); give him a flight source with life (motion agent: wind-tunnel or skydive video via Gen motion.from-video when
RunPod has funds). Keep: cuts on frames, wakes `fadeFrom: 1`, `emitFor` as plain seconds.
**Skin lit-match** (one pass): render one clinic frame where his face and forearm are both lit (c02 at ~4.5 s, waiting room); sample a
10x10 patch on his cheek and one on his forearm; in `tools/punch_wardrobe.py` give the head its own blend `sicken(hrgb, hskin, k=KH)`
and solve KH so the cheek's chromaticity (r/g, b/g) matches the forearm's at the body's k=0.31 (the head texture is darker and greyer,
so KH will be higher); regenerate (only Person_sick_head.png changes), rebuild, show the frame pair before/after.

### Punch verdict, round 9: FAIL on my own 24 fps stepping after 4 rebuilds (no reviewer spent)
Latest `tests/punch/r9/punch-r9d-720-mix.mp4` (and r9a-c beside it); flash PASS on all; shotcheck 0 A.
Stepped every frame (sheets in the session scratch; re-make with `ffmpeg -ss <s> -t 1 -i <mp4> -vf scale=427:240,tile=6x4`):
- p01 64.5-66.5: still nothing building. mm_doc_uppercut's "dip" (clip 0-0.25) held over 1.86 s is her standing with both arms down;
  the guard is gone (leftArm layer works) but there is no visible cocked fist, so the push-in adds nothing.
- p02 66.5-67.25: GOOD part: the impact frame (2 frames) then her closed fist at his jaw line, held ~7 frames by the new hitstop, his
  head going back (contact clip 0.35; at 0.37 in r9c it sat on his mouth with the forearm across his face). BAD: after the hold the clip
  resumes, the fist rises across his face, then her hand lands on his shoulder (f60-62: reads as a touch), then a loose fist at his chest.
- p03 67.25-69.25: GOOD: the low camera looking up, him flying straight up through the hole, her fist held overhead (rise_b 1.75 at
  0.2x), the cold face. The tiles are visible but small.
Next for the punch (in order):
1. p01 needs a coil source that reads as a cocked fist with her body clear of his: candidates the motion agent already admitted:
   RightPowerUppercut (coil 0.15-0.27, fist low, chest turned to her left: round 2), or mm_doc_rise_b layered on `rightArm` ONLY over an
   upright base IF its coil arm is first re-posed: r9b showed it points straight at him (the arm's rotations assume a 45-degree torso
   lean). Better: ask the motion agent for a standing coil with the fist drawn back at the hip and an upright torso (scan
   `motion_scan.py` with "hand behind the hip, head over the hips").
2. p02 after the hold: cut it at 66.5 + 7 frames + ~5 frames (the head snap), or end her clip there by a `layer` of a calm clip on
   `rightArm` from +0.35 s, so the fist never travels across his face or lands on his shoulder.
3. Keep p03 as it is. Then the fresh reviewer on the 5 s test.
