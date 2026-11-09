# HANDOFF: Hawkes Punch and the director system (state at 2026-11-08, evening)

## LATEST (2026-11-08 night, second Claude account; read this block first, it supersedes the rest where they differ)

The first account hit its weekly limit (resets Nov 12, 9am PT) and every agent stopped mid-work. The work was committed and
pushed (TurkeyRender `362a646`; `Motion/Clean` anims, AtmosphericHouse 4K textures, renders, review strips, bone dumps and
backup wavs are gitignored as too big or rebuilt by tools) and picked back up on a second account. J (2026-11-08): "Just do
everything", "Stop asking me to do stuff. You do it": run approved steps yourself, retry a blocked one after his go-ahead.

**Where each piece stands** (details in the files named):
- **Story:** approved, unchanged. Animatic `videos/hawkespunch/animatic.mp4` (204.25 s, `tools/animatic.mjs`, no Unity).
  Cold view `COLD-VIEW-4.md`: 34 of 53 beats missed. Main gaps: the product's name never reads (blank poster/can in
  panels), space cause-and-effect (expected in stills), the double's reveal (s04: stage the turn as a mirror, same face,
  a held "that's me" before "That's a sheet."; no board change, J agreed).
- **No captions** (J, 2026-11-08 night: "remove the subtitles"; `score.json` `"captions": false`). **No music**: `mv previs` now mixes through `tools/remix.mjs` (Unity's own mix played the old song).
- **Sound:** generated from the board (`tools/punch_sound.mjs`, `punch_beds.mjs`, `punch_lines.mjs`, `punch_split.mjs`,
  all registered in `generated.json`). Long takes split per line.
- **Hero tests: 0 of 6 passed.** State, verdicts and exact next steps: `videos/hawkespunch/tests/REVIEW.md` (rounds 1-9).
  - punch: 4 rounds failed on two engine faults, now FIXED (hitstop resume in `MVEpicScore.HoldNative` + `ScoreCompiler
    .BakeWarp`; Person2 layers do work). New strike `mm_doc_rise_b` (off-hand low, fist-overhead hold). Round 9 in flight.
  - s05 ring: 14 rebuilds failed ("a flat tan slab"). Next: a rebuild from 0.5-2 km above the ring plane looking down,
    them punching through it; the wake in the ice-field rock material.
  - s06 boo: bodies sink into a dark hole on `moon_ground` (set/engine fault to fix first).
  - s10, s12, s14: motion picks ready (WORKLOG "motion candidates" rounds 1-3), not built.
  - Board stays approved; the uppercut replaces "fist cocked behind her ear" (head heights make a hook impossible; J told).
- **Motion:** candidates for every hero beat (`library/motion/critic/beats/<beat>.md`), critic calibrated (mocap 8.6 vs
  keyed 5.9), headless twin `tools/critic/twin.py` (within ~0.3 of Unity), `tools/motion_scan.py`, `motion_splice.py`.
- **Engine and tools fixed today:** cuts land exactly on frames (`cards.mjs`, when score.json has `fps`); a `for: 0` cue
  on a cut's frame (`MVCore.cs`); hitstop; `mv coldview` on Windows (drawtext escaping) and judging each beat once;
  `mv hold` without a shell; `mv doctor` closed vs hung Unity; `mv make` gates (11/11 tests); Blender BVH padding.
- **His skin:** hawkespunch-only green tinge on body and head (`tools/punch_wardrobe.py`, `Props/Person_sick*.png`); not
  yet matched under clinic light (sample face and forearm in one frame, solve each separately).
- **In flight when written:** sets/props agent (poster and can legible first; the rest listed in `videos/hawkespunch/
  SETS.md`), alive-layer agent (`tools/alive.mjs`, `review/alive.md`), Unity owner (punch only). Their reports land in
  the WORKLOG and those files.
- **Render farm: PARKED** (J, 2026-11-09: "not really interested in that at the moment and I would like to implement that in a different way anyways"). Don't resume it unasked. Left in place: the farm endpoint at max 0 workers (playtests back to 4), (its volume `rvs68wl5p9` was deleted 2026-11-09 at J's word), Gen beta's `unity.render` tool and `runpod-unity` setting. What it was:
- **Render farm (old notes):** Gen beta has `unity.render` (hawkesgen `v1.25.0-beta.1`) and big uploads straight to the bucket
  (`v1.25.0-beta.3`); RunPod endpoint `hawkes-gen-unity-render` (`1c3f2m7br6gg3f`, max 3, volume `rvs68wl5p9` EU-RO-1,
  template `mewutuftzb`) and Gen beta's settings have `runpod-unity`. Playtest endpoint lowered to max 1 for quota.
  Upload: `HAWKESGEN_URL=<genBetaUrl> HAWKESGEN_KEY=<genBetaKey> FARM_OK=1 node Director/tools/farm.mjs hawkespunch
  sync --gen <genBetaUrl>` (log `Director/gen/farm-sync.log`). Then warm-up, PSNR vs `mv frame`, 1 -> 2 -> 3 workers,
  a timed previs with `--fps 24`. $20 cap approved by J; ~$0 spent on renders so far.
- **Gen:** its Claude runs on J's second account (dashboard AI tab). GPU fallback fixed on beta (a family's own list is
  followed by every endpoint that names the family). The Modal 3D worker needs `ops-modal-deploy.yml kind=3d` from main,
  i.e. after J's `DEPLOY hawkesgen`. RunPod is funded (~$47 at 16:40).

For the next session (Claude Opus). Read `Director/HANDOFF-NOW.md` (the agent roster, the research list, written minutes before the model switch) and `.claude/skills/direct-video/SKILL.md` (the procedure and the rules) first. This file is only what exists, what is in flight, what comes next, and what is broken. No history: `videos/hawkespunch/PIPELINE-LOG.md` and `LESSONS-r2.md` have that.

Nothing in TKShock is committed. Before touching Unity: `mv doctor` (closed vs hung Unity, locks, drift, generated files), `node Director/mv.mjs queue` (a `cards hawkespunch` ticket was live at 19:06: the video agent rebuilding from the board) and `ls Director/gen/compile.lock`.

## The video

**Hawkes Punch** (`Director/videos/hawkespunch/`, `Assets/Videos/hawkespunch/`): a 3:20-3:44 comedy short, no music, 24 fps, native path (`"native": true`, `"fps": 24`, `"music": 0`, `mix` block in `score.json`). A lovesick patient is punched into real-scale space by his boxer doctor, meets his double, stops the double from throwing the Earth, and it was a commercial. **Approved by J:** `SCRIPT.md` (clinic, ad, button, draft 2), `SPACE-EPIC.md` (space: "make the planets actual planet size... think One Punch Man") and the board that joins them, `STORYBOARD.md` + `storyboard/shots.json`, 53 shots, 4902 frames (204 s) at 24 fps ("Look great!"). Panels in `storyboard/` (act images `act1_clinic.jpg`, `act2_space.jpg`, `act3_ad_button.jpg`). Space is 16 shots on the board, down from 42.

**The cut as built** (at 19:06) was still the r2 cut: 91 entries in `cut.json` (32 clinic, 42 space from SPACE-EPIC's table, 8 ad, 9 button), 223.46 s. The video agent is applying the board: `board2cards.mjs` generates the cut and card skeletons from `shots.json`, hand staging goes in `cards/overrides.yaml`. Read `cut.json` and `cards.map.json` fresh before editing anything. Cards at 19:06: `cards/clinic.yaml`, `symptoms.yaml`, `draft2_clinic.yaml`, `space_epic.yaml` (generated by a scratchpad `space_cards.py`; r1/r2 copies beside the card backups in `_backup/`), `commercial.yaml`, `draft2_ad.yaml`. Sequences: `clinic`, `space_epic`, `space` (old), `commercial`. `tweaks/` and `notes/` are empty. `lint-baseline.json`: keep it empty.

**Latest renders:** `previs-clinic-r2-mix.mp4` (the clinic r2: J called it good; the launch is the fast exit through the window with `p_glass`), `previs-space-r2-mix.mp4` (space r2: epic but with faults, being replaced by the 16-shot board version), `quick-full-mix.mp4` (854x480, 24 fps, 223.46 s, the whole r2 cut with the sound pass; what `CLINIC-AD-AUDIT.md` was written against), `output/hawkespunch-v1.mp4` (old draft-1 cut, 30 fps, 203 s: 31 A faults in `review/v1/report.md`; superseded). `final/` holds the v1 final's renders at 1280x720-30: useless for reuse now (24 fps, new cut).

**Audits to work from:** `CLINIC-AD-AUDIT.md` (clinic, punch, ad, ending: A1-A20, P1-P13, W1-W11, C1-C16, S1-S9, N1-N10, T1-T6, E1; the ten that matter most at the top), `COLD-VIEW-2.md` (the cold viewer on draft 2), `LESSONS-r2.md` (what staging the space r2 cut taught, with numbers).

## What exists

### Tools (all in `Director/`, Node unless said; the skill lists the commands)
- `mv.mjs`: cards, build, lint, shot, previs, final, review, freeze, shotcheck, motioncheck, queue/hold, cards insert/remove (clock shift with backup), clips, choreo, call.
- **`mv make <video> [stage] [shot]`** (`tools/mv/make.mjs`): the eight gates, each failure printed with file and field; `mv make <v> status`, `mv make <v> plan` (Unity stages as a dry run), `mv approve <v> <shot> --note "J's words"` (into `tests/approved.json`; refused without his words). Hawkes Punch passes board and cards (53 shots, 6 hero: p02 s05 s06 s10 s12 s14); its hero tests are 1280x720, 24 fps, 5 s centred on the shot. Proof: `node Director/tools/mv/make-test.mjs` (11/11). Not yet run with Unity under `mv make`: shot, test, previs (with its automatic cold view, about $0.17 for Hawkes Punch), final.
- **Working beside other agents** (toolchain.md): `mv csharp apply` (proven on the real editor 2026-11-08 22:02: a type error refused and reverted), `mv doctor [--fix]` (tells a CLOSED Unity, with the command to reopen it, from a hung one), `generated.json` per video (TK Shock's four legacy acts registered hand-maintained), leases, `mv snap`, lint on keys and references. Proof: `node Director/tools/mv/harden-test.mjs` (46/46, in a sandbox: never the real Assets).
- Review: `tools/review.mjs` (24/30 fps reviewer, Claude vision, verdicts carry by shot hash), `tools/review_strips.mjs` (consecutive-frame strips at pops and cuts), `tools/qa.mjs` (per-shot measurements + vision, `--strict` gate), `tools/flashcheck.mjs` (Ofcom rule), `review/STANDARD.md`.
- Motion: `tools/critic.mjs` + `tools/critic/measures.mjs` (the motion critic: twelve principles from bone dumps; `clip`, `pose`, `cut`, `dump`, `reference`, `calibrate`, `vision`, `test`; writes `library/motion/critic/`), the clip catalog (`tools/clip_catalog.mjs`, 181 clips previewed on the native path, `library/motion/catalog.md|html`, `mv clips <use>`), `tools/clip_admit.mjs`, `tools/motion_lib.mjs`, `tools/bake.mjs` (legacy path only), `mv choreo` (dance takes; not used on Hawkes Punch), keyed poses (`mv call posederive|posecheck|posemuscles`, `library/poses/`), `call clipderive`, `call clipimport`, `call cleanclips`, `call fidelity`.
- Mocap on disk (never in Assets): `gen/mocap/cmu/` (CMU BVH, 2,548 clips, manifest.json) and `gen/mocap/protofactor/` (the 2,957-clip Asset Store collection), fetched by `tools/mocap_fetch.py`; `tools/motion_rig.py` writes `library/motion/rig.json` (his 22-joint rig in BVH space). `tools/motion/` has `bvh.py`, `sim.py`, `measure.py`, `blender_bridge.py` for the sim/match pipeline.
- Gen motion: `tools/motion_make.py` (motion.from-text batches), `gen/genmotion/` (14 `gm_`/`zg_` FBX, `GEN-BUGS.md` with the retarget bone map and Gen's open bugs).
- Sound: `tools/mv/sound.mjs` (the finished mix: dialogue LUFS, bed duck, true-peak limiter, `silence.json`), `tools/punch_lines.mjs` (lines.json to `acts/70-lines.json` + `duck.json` + mouths), `tools/punch_beds.mjs` (room tone per scene to `acts/78-beds.json`), `tools/punch_sfx_prep.mjs`, `tools/remix.mjs` (remux a slice render through the Node mix), `tools/face_act.mjs`.
- Story and board: `videos/hawkespunch/storyboard/make_panels.mjs` (Gen sketches), `compose.py`, `write_md.py`, `shots.json`.
- Effects toolkit (`Runtime/MVEpicFx.cs`, `Editor/MVEpicScore.cs`): impactframe, speedlines, smear, shock (near and far-layer), debris, icewake, trauma shake, hitstop holding native bodies (victim/attacker), freeze, hitshake, limbscale, `look: epic|plain`, silence. Proof: `videos/_fx_test`.
- Real-scale space (`Runtime/MVSpace.cs`, shaders `MVSpace*`): set `library/sets/space_epic.json` (origin z 9000; focuses `arrival_streak arrival_rings ring_walk ring_chase ring_edge moon_ground moon_wide jupiter_bg jupiter_catch jupiter_low atlas earth_insert sunrise saturn_wide crater_wide`, a mark per beat), cues `focus planet_move planet_hold planet_release planet_orbit ring_hoop crater`, lighting `space_epic`, textures from `tools/space_tex.py`. Proof: `videos/_space_epic`.
- Review Room: `Director/room/server.mjs` on :8795 (`room` in `.claude/launch.json`), the note loop `room/auto.mjs`, `room/next.mjs`.

### Assets
- **Him** (`Assets/MusicVideo/Person/`): rebuilt 2026-11-07 (sneakers, hands with knuckles, skin pores, hair sheen) plus 12 acting shape keys 2026-11-08 (`eyesNarrow squint browDown browUp browRaiseL browRaiseR mouthPress mouthClose smirk frown cheekRaise sneer`). Backups in `Director/gen/rigged/backup-2026-11-0[78]/`.
- **Her** (`Person2/`): same shape keys; the white lab coat (`Person2/Coat/Coat.fbx`, worn by `wear` in `acts/00-cast.json`, badge and stethoscope on it), glasses `Props/Punch/glasses_lens.fbx` on `doctor.head` with `withHost`, her top blue under the coat. Layers work on her (retested 2026-11-08 in `videos/_layer_test`).
- **Props:** cans (video actors `tv_can_a/b`), the crayon drawing, pad, pen, the Golden Gloves frame (`Assets/Videos/hawkespunch/Props/gloves_frame.png`), cards `next_day.png`, `side_effects_1/2.png`, `end_card.png`. Still bare prims: the second punch's glove (W6), the turkey's cap, screen and keyboard (W9).
- **Sets:** `clinic.json` (origin x 700; marks `doctor_punch` [0.85,0.03,3.0] face -45, `bed` [0.6,0.40,3.72], `desk_doc`, `stool`, `rx_pad`, `pen`), `commercial.json` (origin x 900), `space_epic.json`, `space.json` (the old playground, `pg_*` marks), `fx_void.json`. Moods `hp_space_*` in `library/moods.json`.
- **Pose sheets** (`library/poses/`, derived `.anim` in `Assets/MusicVideo/Motion/Keyed/`, checks in `library/poses/check/<name>.png|mp4|json`): `zg_neutral` (+ `_a`..`_d`, the base float, proven), `hp_f1_superman`, `hp_f2_ram`, `hp_f3_lean` (flight), `hp_h1_hop`, `hp_p1_peer`, `hp_p2_sneak`, `hp_p3_deadpan`, `hp_b1_boop`, `hp_s3_strike`, `hp_r1_pull`, `hp_r2_lasso`, `hp_c1_catch`, `hp_c4_shove`, `hp_a1_atlas`, `hp_a2_setdown`, `hp_d2_letgo`, `hp_doc_punch`, `hp_doc_after`, `hp_him_hit`. J approved the 18 `hp_*` sheets as poses from the check sheets, and `hp_doc_punch` + `hp_him_hit` for the punch. They are approved poses, not yet approved motion: before one goes into a shot, run `critic.mjs pose <sheet>`, watch the check mp4 at 24 fps, and bring a real-source candidate beside it; the 5-second hero tests are where J approves the motion. Missing from SPACE-EPIC's plan: S1 (starfish brake), S2 (scare lunge), C2 (slide), C3 (storm hold), D1 (drawing up), R3 (yank).
- **Lines:** `lines.json` (clinic, ad, button, and 25 space lines from `Sfx/punch/lines4/`), `acts/70-lines.json`, `acts/75-captions.json` (legible captions via `style.json` `type`), `acts/78-beds.json`, `acts/82-foley.json` (clinic, punch, ending), `acts/84-space-sfx.json`, `acts/80-sfx.json` (what is left of the old list), `acts/56-space-fx.json` (generated, absolute times), `acts/55-space-light.json`, `acts/00-cast.json`, `acts/60-face.json`. New sfx in `Assets/MusicVideo/Sfx/punch/space_epic/` and `foley/`.
- **Clip catalog:** 181 humanoid clips with previews and verdicts; the `zg_`/`gm_` generated clips and the `hp_` keyed clips are not graded there (`clip-uncatalogued` from lint is expected until they are).

## In flight (task, owner, where it lands)

The agent ids are in `HANDOFF-NOW.md`; their reports arrive as messages and everything they finish is logged in `Director/gen/WORKLOG-epic.md`. Check the WORKLOG and `mv queue` before assuming any of these finished.

1. **The video agent** (owns Hawkes Punch cards and Unity): `board2cards.mjs` (cut and card skeletons from `storyboard/shots.json`, staging in `cards/overrides.yaml`), the rebuild from the board, then the 5-second hero tests first. Lands in `videos/hawkespunch/cut.json`, `cards/`, `shots/`.
2. **The motion critic** (`tools/critic.mjs`, `tools/critic/measures.mjs`; the reference `library/motion/critic/reference.json` and `calibration.md`).
3. **Motion outside Unity**: physics sim (MuJoCo active ragdoll, `tools/motion/sim.py`), motion matching over CMU and Protofactor (`gen/mocap/`), Gen `motion.from-video` on public-domain footage; candidates land as catalog clips `gm_`/`vm_`/`sim` in `Assets/MusicVideo/Motion/`.
4. **`mv make` and hardening: landed** (see What exists). Next for it: the first Unity run of the shot, test, previs and final gates on Hawkes Punch, by the agent that owns its Unity (`mv make hawkespunch test p02`).
5. **Space set** (last WORKLOG entry 11:10): the close Jupiter cloud wall with a storm vortex, the night-side Earth check for the Atlas hold; proof card `p_atlas_night` in `videos/_space_epic`.
6. **Cloud render farm design** + a free dry run (`Director/docs/render-farm.md`): design only; any cost needs J's OK.
7. **This handoff**: the skill, this file, the memory notes (done).

Done pieces of the clinic and ad audit: the coat, glasses, face shapes (W1, W2, W5), legible captions (T1), the mix and beds (N1 partly, N3, N9), `b_can` back in the cut (E1), hard-cut cards (T4), the gloves frame (T6). The rest of `CLINIC-AD-AUDIT.md` is open.

## What's next, in order

1. **Collect the agents' reports.** `mv doctor`, then fix anything that broke the compile before any other work; read the WORKLOG.
2. **When board2cards lands:** `mv cards check`, `mv lint --strict`, `mv shotcheck` to 0 A, `mv cards sheet` for staging; keep each section's total so the sound stays placed; regenerate `acts/56-space-fx.json`; then `punch_lines.mjs`, `punch_beds.mjs hawkespunch`, captions from lines.json.
3. **Motion for the six hero moments** (the punch, the moon crater, the lasso throw, the Jupiter catch, setting Earth back, the stop): candidates from the motion agent beside the approved sheets, the critic picks, posecheck mp4 at 24 fps; the zero-g checklist on every floating shot.
4. **The 5-second tests** (`mv make hawkespunch test <shot>`, then `mv approve` with J's words), one hero moment at a time, full quality with sound, strips and critic vision clean, then J's yes or no on each clip; record the approvals in `videos/hawkespunch/notes/` or the WORKLOG.
5. **The rest of the clinic and ad audit** ("the ten that matter most"): the punch as a punch (P1-P13: within reach, low 3/4, held wind-up, 2-4 frame strike, front CU on contact, impact frame, hitstop with victim, her reaction hold A11), her coverage (C1 heads in frame, C2 eyelines, A1 writing with the pen, A2 the look up, A4 the line), the plant (A6 drumming and hum, N8), sets and light (S1 waiting room, S2 exam light, S7 studio), the ad in mediums (C10-C12, A15 cans in the drinking hands), the second punch (P13), text (T2, T5).
6. **Previs** of the whole cut at 24 fps, strips, a cold view by an agent that never read the script (`COLD-VIEW-3.md`), fixes in the board or the overrides.
7. **Freeze, `mv final`, review, flash check, cold view of the file, then J:** `output/hawkespunch-vN.mp4` plus a copy under 30 MB.

## Open bugs and traps (current)

Engine and tools:
- The Atlas hold (Earth overhead with the night side and city lights) is unsolved: a ceiling at 2.3 m, a blue sky at 100 km, a dark face at 300 km. Needs city lights readable at range or the limb from much farther off.
- `speed` on a native `anim`/`layer` never reaches the clip (it is the score's slow-motion key); use `rate`. Older cards that use `speed` play at 1.
- A hitstop inside a crossfade or a layer fade is skipped with a build note: give the clip at the hit `blend: 0`.
- (Retired 2026-11-08, engine agent) "Any `layer` on Person2 throws both arms out" does not reproduce on the native path or the legacy path: `videos/_layer_test` 0-12 s runs the same layers (upper, rightArm, spine,head, g_point, and her uppercut with its guard masked off by a leftArm layer) on her and him with the same result. The 2026-11-07 report came from her legacy bakes (PIPELINE-LOG 12/19). She can take `g_*` and masked layers.
- Native roughness: a `walk` plays at the clip's own pace (feet skate), a blend tree plays its heaviest clip, `steps` and `speed` don't reach native bodies, a layer under weight 1 plays at 1.
- `mv previs` ignores the style's fps: pass `--fps 24`.
- `mv shot`'s preview mixes only sfx that start inside its window: beds that began earlier are missing (a final is right).
- Space: a focus glide between two bodies starts from the last focus's target; a patch stays under the near origin while the focus slides (hide with speed lines or a cut); far bodies cast no shadow on the near layer; `sunrise` needs `alt: 5000`; moon-ground cameras must stay at y 1.3 m or more looking down.
- Hawkes Gen (`gen/genmotion/GEN-BUGS.md`): Kimodo never runs (Gen's HF token lacks Llama 3 access, HY-Motion is the fallback, no finger motion); retargeting onto his rig loses the limbs unless the bone map is passed in `blender.character`; a RunPod 429 fails the job instead of retrying; an `asset:` input whose file is gone from Gen's disk fails at submit (download and pass a local path); polling `GET /v1/jobs/:id` every 30 s is rate-limited.
- The clinic cut's lengths are in hundredths of a second, not whole 24 fps frames; quantise when the board is applied.
- `cards.mjs` tiny YAML doesn't unescape `''` inside a single-quoted scalar.
- The Read tool shows a cached image for a file overwritten under the same name: copy to a fresh name first.

Content (from the audits, still open): the punch isn't a punch; her head is cut off in her coverage; she writes with no pen; no reaction from her after the hit; the plant (drumming, hum) is missing; the waiting room, exam room light and the studio read as a test level; the ad's beats are in a tiny wide with cans in the wrong hands; the second punch's fist is a prim; the arm flex and the turkey have no payoff beyond p04; lip sync has no m/b/p closes (shape `mouthPress` now exists; `face_act.mjs` presses the lips on a re-run).
