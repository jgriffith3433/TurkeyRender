# Greener: clip picks

For the pop-star rebuild. 140 BPM: 1 beat = 0.4286 s, 1 bar = 1.714 s. `start` and `stop` are seconds of clip time, before `speed`. Speed = clip's period / target period.

**How each pick was checked:**
- **Seen:** played in `mv lab` and stepped through at 15 fps (strips of `captures/picks/lab_*.mp4`, `spinroot_front.mp4`).
- **Measured:** hand, hip, head and turn positions read from the FBX in headless Blender (213 clips: names that looked useful, plus the mx_ set). Not looked at. The pose it implies could be wrong, as Idle6 shows below.

## What changed the picture

- **There is no dance mocap in the Ultimate collection.** No clip name has Dance, Bow, Spin, Stairs or Pose. The real dance material is the mx_ set.
- **Cheers are not grooves.** They are tagged `rhythmic` because arms pump. Hip sway is 0.01-0.07 m against 0.24 for `mx_hh_step`, and hands are above the head in up to 78% of frames. Don't use Cheer15, which I suggested earlier.
- **`mx_spin_in_place` only turns with `"root":1`.** Without it he stays facing front. `dance_chorus` plays it without `root` set.
- **Wizard clips are named one higher than their files.** Use the clip name:

| File | Clip name |
|---|---|
| `Humanoid@CastSpell14Wizard.fbx` | `CastSpell15Wizard` |
| `Humanoid@CastSpell12Wizard.fbx` | `CastSpell13Wizard` |
| `Humanoid@CastSpell11Wizard.fbx` | `CastSpell12Wizard` |
| `Humanoid@CastSpell9Wizard.fbx` | `CastSpell10Wizard` |

## Picks by need

### Rhythmic groove, hips and shoulders

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| **`mx_hh_step`** (best) | 1.48, one cycle per bar | 0.33-2.87, loop | Rejected, **Seen** | Elbows stay at the waist (hand spread 0.22-0.28 m), hips swing 0.24 m, shoulders twist about 40 degrees, feet stay close. The opposite of the wide-arm look. Cycle repeats every 2.53 s. Add `warpTo:"beat"`. Stay under 2.9: the head throws back from 2.9 to 4.2, and there is a toe pop at 5.03. |
| `mx_body_wave` | 0.93, a move every 2 beats | 0-7.0 | Admitted, Measured | Body roll, hand spread 0.34-0.53 m, limits 10.8 degrees. Use on half-time bars. |
| `mx_hh_side_to_side` | 1.167, on the beat | 6.35-8.3 | Rejected, Measured | Most regular window. Hand spread reaches 0.64 m, so it is the likely source of the wide arms. Use it only with arms held in, or not at all. |

Rejections for the three mx_hh clips come from foot limits and foot slide, so watch the feet. In the strips `mx_hh_step` showed no skating I could see at this low resolution.

### Strut and confident walk

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| **`mx_catwalk_seq01`** (best) | 1.37, one step per beat | 0.2-5.0, 11.3-14.2 | Rejected, **Seen** | Feet cross the centre line, hips roll (0.09 m), arms hang close (spread 0.29). Reads as a real runway walk. About 0.95 m per two steps. Half-time is speed 0.68. |
| `mx_strut` | 0.84, one step per 2 beats | whole clip, loop | Admitted, Measured | Biggest hip sway of the admitted walks, 0.13 m. 1.37 m per cycle (`stride`). Use for slow swagger. |
| `Walk14B` (`Walk14A` is shorter, and not catalogued) | 0.73, one step per 2 beats | whole clip, loop | Admitted, Measured | Hands sit together at the belly (spread 0.12) with hip sway 0.07. Candidate for the skirt hold without extra arm keys. Note: foot slide 4.97 cm/frame, so drive it with `walk`. |

### Spin

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| **`mx_spin_in_place`** (only real one) | 0.75 | 0.15-1.0, with `"root":1` | Not catalogued, **Seen** | Three fast turns with a knee lift and arms tucked, about 3 beats long. Ends facing front. Reads as a spin at 30 fps. Speed 1.0 fits 2 beats. |

`mx_belly_dance` also turns near 13-15 s, but its arms are up (spread to 0.76 m) and it is rejected. `mx_spin_in_place` warns on every build until admitted. I did not admit it because it was outside my 12: `node Director/tools/clip_admit.mjs mx_spin_in_place`.

### Strong poses

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| **`mx_spin_in_place`, the ending** | 0.75 | 1.7-2.5 | Not catalogued, **Seen** | Hands rise to frame the face, elbows down. The best pop pose found, and it follows the spin with no cut. |
| `mx_catwalk_seq01`, the stop | 1.37 | 6.2-7.0 (settles in from 5.0) | Rejected, **Seen** | Stops with feet wide, arms slightly out. An end-of-runway stance. Good for a hit. |
| `CastSpell15Wizard`, arm up | 1 | 1.0-1.47 | Admitted, **Seen** | Right fist high. Use `"from":"CastSpell15Wizard@1.2"` in `keys`. The left arm is held out, as if on a staff: mask it. |

### Point

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `mx_point_aj` | 1.07, 4 beats | 0-1.83 | Admitted, Measured | Knees dip (hips 0.93 m) and the body leans in, so it has more life than an arm alone. |
| `Idle1PointOut` | 1 | as `point_at_you` | Admitted | Slow, held point. Already in use. Better for a deadpan line. |

### Shrug ("call me what you like")

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `Idle1HaveNoClue` | 0.93, 3 beats | 0.3-1.5 | Admitted, Measured | Largest of the three: hands open wide and return. |
| `Idle1NoIdea` | 0.93, 2 beats | 0.2-1.0 | Admitted, Measured | Small and dry. Suits the deadpan. |
| `Idle1NotMyFaultA` | 0.93, 2 beats | 0.2-1.0 | Admitted, Measured | Same size, a small turn away. |

### Hair flick

No flick exists. These are hand-to-head moves. Run them faster and they should read closer to a flick.

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `Idle1TouchCheek`, mask `rightArm` | 1.2 | 0.4-1.9 | Admitted, Measured | Right hand reaches the side of the head at 1.0 s and leaves. |
| `IdleSit9TouchHair` | 1.2 | 0.2-1.0 | Admitted, Measured | Seated. Same base as `IdleSit9`, so it joins it cleanly. |

### Hand to heart ("weakness")

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `Idle1WhatMe`, mask `rightArm` | 0.82, 4 beats | 0.35-1.75 | Admitted, Measured | Right hand comes to the chest and holds for a second. |
| `Idle1SurprisedA` | 1 | 0.4-2.7 | Admitted, Measured | Both hands up near the face. A diva gasp. Check it isn't too shocked. |

### Bow or curtsy

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| **`CastSpell15Wizard`** (best) | 1.05, 6 beats, or 0.79, 8 beats | 0.5-3.2 | Admitted, **Seen** | Right arm sweeps high (0.5-1.47), drops into a deep bow on 1.53-1.67, holds to 2.67, rises by 3.07. A grand stage bow. Put the drop on a hit. Finger pop at 1.52, and hands are shaped for a staff, so use `fingers` and mask or key the left arm. |
| `CastSpell12Wizard` | 1 | 0.9-3.5 | Admitted, Measured | Deeper lean (0.57 m), but hands travel out. Not looked at. |
| `dress_curtsy` | | | Keep | No clip has a real curtsy. Hips stay above 0.9 m in every bow. The keyed one stays. |

### Sad still hold for the dip

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `IdleBreatheHostage` | 1 | whole clip, loop | Admitted, Measured | Arms down, energy 0.08, nothing moves but breath. Add the head drop with `gaze` or `pose`. |
| `Idle5` | 1 | 0-7.6, loop | Admitted, Measured | Stillest clip (energy 0.04). One arm across the body, the other hand at the chin: pensive. |
| **`Idle6B`** against a flat | 1 | 0.1-5.67, loop | Admitted, **Seen** | Stands on one leg with the other foot up behind him. It only works leaning on something, so stand him against the plywood flat. |

Keep these off the beat. Nothing here should land on a hit.

### Walking down stairs

No clip exists. Keep the current way: `dress_lift_stairs` with `Walk4` through `walk`, with stride 0.66. One step per 2 beats is speed 0.78, one per beat 1.56. Nothing I checked plants feet on stair treads, so check foot contact in the shot. `Walk14B` is worth trying for the legs and arms together.

### Sitting and singing

| Clip | speed | start-stop | Status | Why |
|---|---|---|---|---|
| `IdleSit13Explain` | 0.92, a gesture a beat | 0.5-2.9, loop | Admitted, Measured | Both hands move as he talks, the most singer-like seated clip. |
| `IdleSit9` | 0.95, a shift every 4 beats | whole clip, loop | Admitted, Measured | Quiet hold with small shifts. Pairs with `IdleSit9TouchHair`. |

Check `dress_sit`: its clip `IdleSit14` measures feet 0.75 m apart, and the IdleSit13 family too. `IdleSit9` is 0.35 m. For "knees together", `IdleSit9` looks closer. Not looked at.

### Hand on hip

**No clip has it,** across all 213 measured. `Idle6A` and `Idle6B` looked like it in the numbers, and turned out to be the foot-up pose above. Build it with `reach` or `keys`: the hand to the hip with the elbow out, over a stand or `mx_catwalk_seq01`.

## Rejected

| Clip | Why |
|---|---|
| `Walk19` | **Seen:** both hands on his head for the whole walk. Wrong for a pop star. Could work as despair in the dip. |
| Cheer1-15 | No hips, arms overhead, and some crouch and lean. |
| `Taunt1-5`, `Taunt*DualSwords` | Wide arms, hand spread 0.5-0.9 m. |
| `TauntA2HandMelee`, `TauntB2HandMelee` | Hands together on a weapon that isn't there. |
| `CastSpell7Wizard` | Lunges down to the floor. |
| `IdleSit3` | Reclined, hands far from the body. Not sitting up. |
| Hostage kneels, Injured, Zombie, combat | Excluded by the brief. |

## What was added

- **Clips pulled and admitted (12 files):** `CastSpell15Wizard`, `CastSpell13Wizard`, `CastSpell12Wizard`, `CastSpell10Wizard`, `CastSpell2Wizard`, `IdleSit9TouchHair`, `IdleSit3`, `IdleSit8B`, `IdleSit6`, `Walk19`, `Walk14B`, `Walk13`.
- **Lab clips (6):** `mx_hh_step`, `mx_catwalk_seq01`, `mx_spin_in_place`, `CastSpell15Wizard`, `Idle6B`, `Walk19`.
- **Not rendered at 15 fps with `warpTo`.** Speeds above are from clip timing. None was played against the song.

## Mixamo batch 2: ranked by style (2026-11-07)

20 more clips fetched, in `Assets/MusicVideo/Motion/` as `Humanoid@mx_*.fbx`, all through `clip_admit`.

**How they were watched:** 15 of the 20, played bare on our rig, front view only, 5.4 s of each, 15 fps render read at every 3rd frame (5 fps) in `library/performances/renders/mxreview_front.mp4`. Not at the suggested speeds, not warped, no root motion, no three-quarter view, faces and fingers too small to judge. `speed` below is worked out from `tempoBeat` and has not been played.

**Not watched:** `mx_slide_step`, `mx_sexy_walk`, `mx_catwalk_seq04`, `mx_pivot`, `mx_jazz_arm_push`.

| Rank | Clip | Status | Window (clip s) | speed | Why, and how to use it |
|---|---|---|---|---|---|
| 1 | **`mx_house_2`** | Rejected: foot slide, hand into belly at 3.46 s | 1-6.4 | 1.4 | Best real dancing here. Hip-led, side-stepping, arms close, body angled. Verse groove. He turns away from front, so give him a mark that faces the lens. |
| 2 | **`mx_catwalk_seq03`** | Rejected: foot slide | 4-9.4 | 1.4 | Most attitude. Hand on hip, narrow, weight on one side. Use for "look at you" and any held star pose, or walking in with `"root":1`. |
| 3 | **`mx_snake`** | Admitted | 1-6.4 | 1.24 | Signature candidate. Drops low, rises, sweeps one arm up, both hands frame his head from about 4.6 to 5.6 s. Hits hard. Hook, once a chorus; arms go up, not out. |
| 4 | **`mx_hh_booty_step`** | Admitted | 0-4.9 | not measured | Arm flourish, then hand on hip and a hip-led step forward. Chorus travel with `"root":1`: 1.4 m over the clip. |
| 5 | **`mx_hh_listening`** | Rejected: foot slide | 1-6.4 | 1.167 | Small and cool: hands low, shoulders and head on the beat. Close-ups and mediums while he sings. |
| 6 | **`mx_boogaloo`** | Admitted | 1-6.4 | 1.24 | Loose one-sided groove, arms near the body. Safest filler between big moves. Reads quieter than the others. |

**Runners-up:** `mx_shuffling` (admitted, kicks with arms near the body, energetic, feet read better than the body), `mx_rib_pops` (hands high, jittery at this size).

**Rejected by eye:** `mx_house_3` (wide horse stance), `mx_jazz_square` and `mx_hh_twirl` (wide arms), `mx_rumba` (stiff held arms), `mx_northern_soul` (small, wide legs), `mx_locking` (flashy, kicks and a lunge that nearly falls), `mx_swagger_walk` (needs root motion to judge, in place it shows little).

Searches for "snap" and "hair" found no finger-snap or hair-flick clip. These were name searches only.
