# The alive layer (roadmap-system.md item 3): state on 2026-11-08

Written by the alive agent. The scope was cut to one clinic shot when account usage ran low: zero-g, the blind reviewer and the critic
numbers are listed under "Left".

## What exists

- **`Director/tools/alive.mjs <video>`** writes the GENERATED act `videos/<v>/acts/62-alive.json` and registers it in `generated.json`.
  Its inputs are the board, `cards.map.json`, `cards/`, the compiled `acts/50-cards.json`, `lines.json` with the voice mp3s, and every other
  act's blinks, so `mv build` runs it again when any of them change. Flags: `--only c07,s13` and `--out <path>` (both skip registration),
  `--report`. The header of the tool documents every rule. On Hawkes Punch it writes 576 cues for 81 bodies across 53 shots.
- **`Assets/MusicVideo/Runtime/MVAlive.cs`** (new) adds the `alive` cue, called first in `NativeActing` (`MVNativeActing.cs`, one line). It
  went in through `mv csharp apply Director/staging/alive` and compiled OK; the snapshot is `Director/gen/csharp/2026-11-09T00-57-44-alive-*`.
  It adds small rotations on top of what the Animator wrote:
  - breath: chest/spine extension, shoulder rise, the upper arms giving most of the rise back;
  - sway: upper-body roll and yaw, with the neck and head countering 70%;
  - head micro-motion (`level: 1` keeps yaw only);
  - standing weight shift, with the feet held by two-bone IK.

  Overlapping cues add with their own `in`/`out` fades. It reads the warped scene time, so a hitstop holds it and scrub and reverse work. A
  driver with no `alive` cue pays one null test.
- **What the act holds, per body per shot:**
  - **Breath:** rate from the register (deadpan 13/min, epic 19), held for 0.6 s before every hitstop, off inside a freeze.
  - **Sway and head:** on seated and standing idles. Standing idles also get a weight shift. Epic shots are stiller. When the card idea
    says "frozen", only a shallow breath plays.
  - **Zero-g** (`zg_` clips, space sets): breath at 0.8 and head yaw only. Never a shift.
  - **Hero clips** (`hp_`/`mm_`/non-idle): half breath on deadpan shots, nothing on epic ones. A head-mask `layer` turns the head off.
  - **Blinks:** seeded 2-6 s apart, plus one after a cut to a close shot and one on any gaze turn over 20°. Never on a stressed syllable
    (from the voice envelope), never in a freeze, never within 0.9 s of another act's blink.
  - **Eyes:** saccades of 1-3° (sometimes a 4-7° look off). A speaker looks away 3-8° as a line starts; on deadpan shots only half the
    time. A listener whose gaze is elsewhere gets an eye dart toward the next speaker 0.3 s before the line. Directions come from the
    actors' `set` positions. Skipped where a card keys `eyes`.
  - **Gaze:** only for a listener the cards leave with no gaze at all.
  - **Lips:** `mouthPress` 0.55 on each m/b/p, placed on the dips in the voice envelope near where the text puts the letter. Skipped where
    a card holds mouthPress. The jaw stays with `punch_lines.mjs`, which already shuts it between lines.
- **Gains:** at unit amounts, before and after were indistinguishable. A ×8 diagnostic (`proof/diag_x8.mp4`) proved the C# runs, so the
  generator now uses breath ×2, head ×1.8 and sway ×1.5 (`GAIN` in alive.mjs). That works out to about 1 cm of shoulder per breath and 2°
  of head drift.

## The proof (clinic c07, him talking, then c08, her listening)

- Proof video: `Director/videos/_alive_test`, a copy of hawkespunch. Hawkespunch's own acts were not touched.
- Renders: `Director/videos/_alive_test/proof/c07c08_before.mp4` and `c07c08_after.mp4`, 1280x720 at 24 fps, song 16.5-24.5 s. Both were
  rendered back to back on the same set state (the Unity owner was editing clinic.json in between earlier attempts).
- Stepped: `strip_c07_before.jpg` and `strip_c07_after.jpg`, frames 60-107 (2 s) one after another, cropped to his head. Also
  `ab_c07_1s.jpg` (6 fps side by side).
- What the after shows:
  - a seeded blink at frames 61-63, which isn't in the before;
  - eye darts at about frames 64-75;
  - the head sitting a few pixels lower and turned differently, drifting smoothly. Before minus after in the head crop is a smooth 3-10
    grey-level curve over each shot: slow body motion, not noise or pops.
- No pops or snaps in the 48 stepped frames.
- **Honest verdict:** c07's clip (`IdleSit13Explain`) already gestures, so on this shot the layer is a subtle addition, not dead versus
  alive. The real test is a long still hold: c09/c14 on `mx_sit_still`, or s13 zero-g.
  `s13_before.mp4` and `s13_after.mp4` are rendered but **not stepped**.
- **Found, not mine:** on his head the `blink` shape reads as a one-eyed wink in three-quarter view. It happens on the old 60-face blinks
  too (f90-93). Check `face_shapes.py` for the far eye.

## How the Unity owner adopts it

1. `node Director/tools/alive.mjs hawkespunch`. This writes and registers `acts/62-alive.json`.
2. Retire the hand-written blinks in `acts/60-face.json`, or leave them: alive.mjs avoids doubling them either way. Run alive.mjs again
   after any change to them.
3. `mv build`, then render a still-hold shot (c14, s02, s13) and step it before trusting it.
4. Amounts live in `GAIN`, `REG` and `params()` in alive.mjs. Never edit the act itself.

## Left

- **Zero-g proof:** step `s13_before/after.mp4` (rendered, unjudged).
- **Blind reviewer:** not run.
- **Critic:** `call shotbones` evaluates without `MVLate.Flush()`, so `critic.mjs cut` never sees gaze, eyes, reach or alive. The fix is
  `if (late) MVLate.Flush();` after `dir.Evaluate()` in `Editor/Tests/EngineFidelity.cs` behind a `"late": true` flag, then pass it from
  critic.mjs. It was drafted but not applied.
- **Lip sync:** the m/b/p heuristic is a stopgap. The target is NVIDIA Audio2Face-3D as a Gen tool, `face.from-audio`, which needs the
  ARKit 52 shapes on both heads. Not built.
- **Secondary motion** (hair, coat hem, stethoscope): there is no spring bone on native bodies, and those meshes have no bones of their
  own. The design is in roadmap item 3: chains in the Blender scripts plus MVOverlap's pure-in-time spring run in MVLate.
