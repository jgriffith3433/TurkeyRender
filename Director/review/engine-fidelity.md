# Engine fidelity: is our animation engine distorting motion?

2026-11-07. J: broken-looking animation is "a CONSTANT problem" across three videos; "Maybe we are using the blending wrong or something?" Tested with numbers, then acted on.

## The answer in four lines

1. **Our clip sampling and blending core is exact.** A clip through our stack with every stage off matches Unity's own Animator (PlayableGraph on the Humanoid Avatar, Foot IK off) to **0.000 degrees on every bone** of five clips, on Person and Person2. `SampleAnimation` (what `MotionDriver.Sample` calls) equals Unity's graph to 0.00. No Euler storage, no q/-q slerp bug (Unity's `Slerp` takes the short way), no Generic-sampled humanoid.
2. **What breaks joints is the stages that run on every human by default, after the clip:** ground (up to 91 degrees on feet, 40-61 on knees, jitter 2-3x the clip's, +14 to +37 snaps per 3 s, knees off their hinge plane by up to 41), joint limits (up to 40 degrees, elbows and knees pushed 14 degrees off their hinge plane), the finger rest curl (+36 degrees on every finger joint, every frame), and inertial transitions (24-33 degrees from Unity's crossfade, limbs off their hinge plane by 34-40 degrees during a change). Our additive layer differs from Unity's additive by up to 62 degrees.
3. **The raw Mixamo clips carry their own faults** (mx_hh_step has one-frame 180-degree flips; dance clips slide 25-55 cm/s), so playing them "the Unity way" alone is not better: on Greener's chorus native-on-raw-clips measured *worse* than the baked old path. The bake was fixing content.
4. **So we built the hybrid:** Unity's Animator plays the clips (Timeline, muscle-space crossfades, AvatarMask override tracks), each clip is cleaned once offline in muscle space and reused by every video, and contact and looks are a thin post-Animator pass. New videos get it by default; old videos are unchanged.

## How it was measured

`Assets/MusicVideo/Editor/Tests/EngineFidelity.cs`, `mv call fidelity '{"clips":[...],"model":"person","secs":3,"pair":[A,B]}'`. Truth: a copy of the model with its Animator in a PlayableGraph (`AnimationClipPlayable`, Foot IK off unless stated), evaluated at 60 Hz. Ours: the lab's copy of the actor (`MotionLab.Spawn`, the real `MotionDriver`) with the same cue and switches for each stage. Per bone and frame: **error** = angle between the two local rotations (hips in the model's frame; fingers reported apart), **end pos** = worst hand/foot/head position difference, **jitter** = second difference of each bone's rotation (deg/frame^2, fingers excluded), **snaps** = one-frame steps over 8 degrees (all bones), **hinge off** = angle between the elbow/knee bend planes of the two (only when bent over 15 degrees). The number in brackets is the source clip's own value. 3 s per clip from 0.5 s.

`call evalorder` proved the evaluation order: in one `Evaluate`, Unity writes the Animator pose **before** our script tracks' `ProcessFrame`, whichever output comes first. So anything of ours that reads or edits a native body in `ProcessFrame` sees this frame's pose: deterministic.

## Step 1-3: ground truth, everything off, then one stage at a time (person)


**mx_hh_step** (person, clip 7.8 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0.03 / 0.06 | - |
| Unity with Foot IK on | 179.46 | 5.212 | 39.96 | 0 | 27.83 | 3.424 (3.599) | 179.81 (179.99) | 99 (88) | 6.82 / 9.81 | RightLowerLeg 179.5, RightFoot 177.5, LeftFoot 44.7, LeftLowerLeg 43.8 |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0 / 0 | - |
| ours: + limits (default on) | 40.43 | 1.419 | 33.47 | 0 | 6.09 | 3.56 (3.599) | 154.78 (179.99) | 86 (88) | 9.1 / 13.76 | RightFoot 40.4, RightLowerLeg 26.7, Head 14.8, LeftFoot 2.9 |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0 / 0 | - |
| ours: + ground (default on) | 83.81 | 7.098 | 73.62 | 0 | 13.74 | 7.279 (3.599) | 179.99 (179.99) | 102 (88) | 30.93 / 33.72 | LeftFoot 83.8, RightFoot 79.4, LeftLowerLeg 54.6, RightLowerLeg 39.5 |
| ours: defaults (a plain anim cue as a card plays it) | 83.81 | 7.479 | 74.4 | 36.1 | 13.74 | 7.279 (3.599) | 149.42 (179.99) | 100 (88) | 40.52 / 44.07 | LeftFoot 83.8, RightFoot 80.7, LeftLowerLeg 54.7, RightLowerLeg 42.0 |

**mx_house_2** (person, clip 26.17 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 2.485 (2.485) | 5.22 (5.22) | 20 (20) | 0.02 / 0.05 | - |
| Unity with Foot IK on | 38.11 | 4.116 | 32.32 | 0 | 27.41 | 2.549 (2.485) | 5.22 (5.22) | 35 (20) | 8.3 / 12.61 | RightLowerLeg 38.1, LeftFoot 36.4, RightFoot 35.5, LeftLowerLeg 26.4 |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 2.485 (2.485) | 5.22 (5.22) | 20 (20) | 0 / 0 | - |
| ours: + limits (default on) | 20.11 | 0.287 | 8.3 | 0 | 6.21 | 2.485 (2.485) | 5.22 (5.22) | 20 (20) | 4.05 / 10.26 | LeftLowerArm 20.1, Head 8.7, RightLowerArm 7.1, RightShoulder 2.6 |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 2.485 (2.485) | 5.22 (5.22) | 20 (20) | 0 / 0 | - |
| ours: + ground (default on) | 91.11 | 6.656 | 64.39 | 0 | 18.96 | 7.501 (2.485) | 37.61 (5.22) | 50 (20) | 17.67 / 41.51 | RightFoot 91.1, LeftToes 61.7, RightLowerLeg 61.3, LeftFoot 57.1 |
| ours: defaults (a plain anim cue as a card plays it) | 91.11 | 6.943 | 64.39 | 36.1 | 18.96 | 7.501 (2.485) | 37.61 (5.22) | 50 (20) | 17.67 / 41.51 | RightFoot 91.1, LeftToes 61.7, RightLowerLeg 61.3, LeftFoot 57.1 |

**Walk4** (person, clip 1.33 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.04 | 0.948 (0.94) | 2.33 (2.33) | 0 (0) | 0.04 / 0.05 | - |
| Unity with Foot IK on | 23.14 | 2.559 | 22.83 | 0 | 5.7 | 1.002 (0.94) | 2.53 (2.33) | 0 (0) | 4.45 / 6.65 | RightLowerLeg 23.1, LeftLowerLeg 19.8, RightFoot 12.8, RightUpperLeg 12.3 |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + limits (default on) | 0 | 0 | 0 | 0 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + ground (default on) | 41.8 | 5.414 | 39.64 | 0 | 4.06 | 3.6 (0.94) | 13.61 (2.33) | 2 (0) | 9.22 / 18.16 | RightLowerLeg 41.8, LeftLowerLeg 41.6, RightFoot 32.8, RightToes 30.8 |
| ours: defaults (a plain anim cue as a card plays it) | 41.8 | 5.414 | 39.64 | 36.1 | 4.06 | 3.6 (0.94) | 13.61 (2.33) | 2 (0) | 9.22 / 18.16 | RightLowerLeg 41.8, LeftLowerLeg 41.6, RightFoot 32.8, RightToes 30.8 |

**IdleBreathe** (person, clip 4 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 0 (0) | 0 (0) | 0 (0) | 0.03 / 0.04 | - |
| Unity with Foot IK on | 16.22 | 2.292 | 16.18 | 0 | 4.34 | 0 (0) | 0.9 (0) | 0 (0) | 0 / 0 | RightLowerLeg 16.2, LeftLowerLeg 10.7, RightFoot 9.3, RightUpperLeg 6.4 |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 (0) | 0 (0) | 0 / 0 | - |
| ours: + limits (default on) | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 (0) | 0 (0) | 0 / 0 | - |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0 | 0 (0) | 0 (0) | 0 (0) | 0 / 0 | - |
| ours: + ground (default on) | 35.2 | 4.698 | 35.07 | 0 | 4.11 | 0 (0) | 0 (0) | 0 (0) | 0 / 0 | RightLowerLeg 35.2, LeftLowerLeg 20.5, RightUpperLeg 16.2, RightFoot 15.2 |
| ours: defaults (a plain anim cue as a card plays it) | 35.2 | 4.698 | 35.07 | 36.1 | 4.11 | 0 (0) | 0 (0) | 0 (0) | 0 / 0 | RightLowerLeg 35.2, LeftLowerLeg 20.5, RightUpperLeg 16.2, RightFoot 15.2 |

**PowerRightHandCombat** (person, clip 2.07 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0.02 / 0.03 | - |
| Unity with Foot IK on | 15.28 | 1.576 | 10.31 | 0 | 10.98 | 4.93 (4.72) | 22.97 (22.97) | 100 (79) | 6.81 / 10.56 | RightLowerLeg 15.3, LeftFoot 11.5, RightFoot 10.5, LeftUpperLeg 9.8 |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0 / 0 | - |
| ours: + limits (default on) | 0.59 | 0.003 | 0 | 0 | 0.51 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0.05 / 0.38 | LeftLowerArm 0.6, Chest 0.4 |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0 / 0 | - |
| ours: + ground (default on) | 46.22 | 2.721 | 29.55 | 0 | 10.63 | 7.863 (4.72) | 22.97 (22.97) | 116 (79) | 13.47 / 19.99 | RightFoot 46.2, RightToes 35.7, LeftLowerLeg 32.2, RightLowerLeg 31.9 |
| ours: defaults (a plain anim cue as a card plays it) | 46.22 | 2.724 | 29.55 | 36.1 | 10.63 | 7.863 (4.72) | 22.97 (22.97) | 116 (79) | 13.47 / 19.99 | RightFoot 46.2, RightToes 35.7, LeftLowerLeg 32.2, RightLowerLeg 31.9 |

**LandingHeavy** (person, clip 1.47 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 13.961 (13.962) | 64 (64) | 108 (108) | 0.03 / 0.05 | - |
| Unity with Foot IK on | 16.18 | 2.291 | 14.49 | 0 | 16.15 | 13.58 (13.962) | 64 (64) | 110 (108) | 6.83 / 7.77 | RightLowerLeg 16.2, LeftFoot 14.7, LeftUpperLeg 14.3, RightUpperLeg 13.9 |
| ours: anim only, all stages off | 62.72 | 0.212 | 0 | 0 | 59.11 | 14.895 (13.962) | 65.36 (64) | 110 (108) | 0 / 90.53 | RightUpperArm 62.7, LeftUpperArm 60.6, RightLowerArm 57.6, LeftLowerArm 56.1 |
| ours: + limits (default on) | 62.72 | 0.295 | 7.97 | 0 | 59.11 | 14.895 (13.962) | 65.36 (64) | 110 (108) | 1.98 / 90.53 | RightUpperArm 62.7, LeftUpperArm 60.6, RightLowerArm 57.6, LeftLowerArm 56.1 |
| ours: + fingers (default rest curl) | 62.72 | 0.212 | 0 | 36.1 | 59.11 | 14.895 (13.962) | 65.36 (64) | 110 (108) | 0 / 90.53 | RightUpperArm 62.7, LeftUpperArm 60.6, RightLowerArm 57.6, LeftLowerArm 56.1 |
| ours: + ground (default on) | 62.72 | 0.552 | 4.16 | 0 | 59.11 | 14.895 (13.962) | 65.36 (64) | 110 (108) | 7.77 / 90.53 | RightUpperArm 62.7, LeftUpperArm 60.6, RightLowerArm 57.6, LeftLowerArm 56.1 |
| ours: defaults (a plain anim cue as a card plays it) | 62.72 | 0.589 | 4.16 | 36.1 | 59.11 | 14.895 (13.962) | 65.36 (64) | 110 (108) | 7.77 / 90.53 | RightUpperArm 62.7, LeftUpperArm 60.6, RightLowerArm 57.6, LeftLowerArm 56.1 |

LandingHeavy (above): every row of ours reads 62 degrees max but p99 0 and mean 0.2: one frame at the loop seam (our clock and the test's wrap a 1.47 s one-shot one frame apart). Not an engine fault.

## Two clips at once, against Unity's mixers (Foot IK off on both sides)


**mx_house_2 + PowerRightHandCombat** (person)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| layer upper w=0.5: ours vs Unity layer mixer + AvatarMask | 12.53 | 0.919 | 8.87 | 1.68 | 5.38 | 3.072 (3.048) | 11.7 (10.87) | 39 (38) | 8.21 / 11.6 | LeftUpperArm 12.5, RightLowerArm 12.3, RightUpperArm 10.5, LeftLowerArm 6.2 |
| layer upper w=1: ours vs Unity layer mixer + AvatarMask | 0 | 0 | 0 | 0 | 0.01 | 3.771 (3.771) | 22.97 (22.97) | 78 (78) | 0 / 0.02 | - |
| layer upper additive: ours (ref frame 0) vs Unity additive layer (clip's first frame) | 61.77 | 4.222 | 45.65 | 0 | 29.97 | 3.911 (4.008) | 22.75 (22.61) | 98 (91) | 54.6 / 86.94 | RightUpperArm 61.8, RightLowerArm 51.2, LeftUpperArm 31.0, LeftLowerArm 20.4 |
| change of clip, blend 0.2s: ours inertial vs Unity mixer crossfade | 23.84 | 0.476 | 10.84 | 17.33 | 14.25 | 3.956 (3.711) | 14.55 (14.55) | 102 (182) | 4.94 / 33.74 | RightUpperArm 23.8, LeftFoot 21.7, RightHand 20.7, RightFoot 15.2 |
| change of clip, blend 0.2s: ours crossfade:1 (local slerp) vs Unity mixer crossfade | 5.41 | 0.047 | 1.8 | 1.62 | 3.1 | 3.711 (3.711) | 14.55 (14.55) | 178 (182) | 0.36 / 4.14 | LeftLowerArm 5.4, Head 4.2, RightUpperArm 3.5, LeftFoot 3.3 |
| change of clip, blend 0.5s: ours inertial vs Unity mixer crossfade | 32.95 | 1.801 | 21.91 | 17.34 | 18.71 | 3.752 (3.68) | 14.53 (14.55) | 38 (46) | 14.65 / 39.55 | RightUpperArm 33.0, LeftFoot 28.9, LeftLowerLeg 27.5, LeftUpperArm 26.3 |
| change of clip, blend 0.5s: ours crossfade:1 (local slerp) vs Unity mixer crossfade | 5.57 | 0.145 | 3.89 | 1.76 | 4.21 | 3.68 (3.68) | 14.55 (14.55) | 47 (46) | 3.06 / 4.58 | RightUpperArm 5.6, LeftLowerArm 5.2, Head 4.6, LeftFoot 4.6 |

**Layers at full weight are exact.** Half weight differs from Unity's muscle-space blend by 12.5 max / 0.9 mean (bone-local slerp vs muscles), small. **Our plain crossfade (`crossfade:1`) is within 5.6 degrees** of Unity's. The **default inertial transition** is what departs (24-33 degrees, hinge planes 34-40 off during the change), and **additive** is a different operation from Unity's (62 degrees).

## Person2

The `person2` model (her, the doctor) has the same skeleton proportions and gives the same numbers to 0.01 cm: nothing in the engine assumes the person rig's bone frames beyond what it measures from each rig's rest pose (`humanRest`, `curlAxis`). Full table:


**mx_hh_step** (person2, clip 7.8 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0.03 / 0.06 | - |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0 / 0.07 | - |
| ours: + limits (default on) | 40.43 | 1.419 | 33.47 | 0 | 6.09 | 3.56 (3.599) | 154.78 (179.99) | 86 (88) | 9.1 / 13.76 | RightFoot 40.4, RightLowerLeg 26.7, Head 14.8, LeftFoot 2.9 |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 3.599 (3.599) | 179.99 (179.99) | 88 (88) | 0 / 0.07 | - |
| ours: + ground (default on) | 83.81 | 7.098 | 73.62 | 0 | 13.75 | 7.279 (3.599) | 179.99 (179.99) | 102 (88) | 30.93 / 33.72 | LeftFoot 83.8, RightFoot 79.4, LeftLowerLeg 54.6, RightLowerLeg 39.5 |
| ours: defaults (a plain anim cue as a card plays it) | 83.81 | 7.479 | 74.4 | 36.1 | 13.75 | 7.279 (3.599) | 149.42 (179.99) | 100 (88) | 40.52 / 44.07 | LeftFoot 83.8, RightFoot 80.7, LeftLowerLeg 54.7, RightLowerLeg 42.0 |

**Walk4** (person2, clip 1.33 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.04 | 0.949 (0.94) | 2.33 (2.33) | 0 (0) | 0.04 / 0.05 | - |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + limits (default on) | 0 | 0 | 0 | 0 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 0.94 (0.94) | 2.33 (2.33) | 0 (0) | 0 / 0 | - |
| ours: + ground (default on) | 41.8 | 5.414 | 39.64 | 0 | 4.06 | 3.6 (0.94) | 13.61 (2.33) | 2 (0) | 9.22 / 18.16 | RightLowerLeg 41.8, LeftLowerLeg 41.6, RightFoot 32.8, RightToes 30.8 |
| ours: defaults (a plain anim cue as a card plays it) | 41.8 | 5.414 | 39.64 | 36.1 | 4.06 | 3.6 (0.94) | 13.61 (2.33) | 2 (0) | 9.22 / 18.16 | RightLowerLeg 41.8, LeftLowerLeg 41.6, RightFoot 32.8, RightToes 30.8 |

**IdleBreathe** (person2, clip 4 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 0 (0) | 0 (0) | 0 (0) | 0.03 / 0.05 | - |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 0 (0) | 0 (0) | 0 (0) | 0 / 0.03 | - |
| ours: + limits (default on) | 0 | 0 | 0 | 0 | 0.01 | 0 (0) | 0 (0) | 0 (0) | 0 / 0.03 | - |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 0 (0) | 0 (0) | 0 (0) | 0 / 0.03 | - |
| ours: + ground (default on) | 35.2 | 4.698 | 35.07 | 0 | 4.11 | 0 (0) | 0 (0) | 0 (0) | 0 / 0.03 | RightLowerLeg 35.2, LeftLowerLeg 20.5, RightUpperLeg 16.2, RightFoot 15.2 |
| ours: defaults (a plain anim cue as a card plays it) | 35.2 | 4.698 | 35.07 | 36.1 | 4.11 | 0 (0) | 0 (0) | 0 (0) | 0 / 0.03 | RightLowerLeg 35.2, LeftLowerLeg 20.5, RightUpperLeg 16.2, RightFoot 15.2 |

**PowerRightHandCombat** (person2, clip 2.07 s)

| stage | err max | err mean | err p99 | finger max | end pos cm | jitter p99 (clip) | jitter max (clip) | snaps (clip) | hinge off p95 / max | worst bones |
|---|---|---|---|---|---|---|---|---|---|---|
| SampleAnimation (what our Sample calls) | 0 | 0 | 0 | 0 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0.02 / 0.03 | - |
| ours: anim only, all stages off | 0 | 0 | 0 | 0 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0 / 0.02 | - |
| ours: + limits (default on) | 0.59 | 0.003 | 0 | 0 | 0.51 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0.05 / 0.38 | LeftLowerArm 0.6, Chest 0.4 |
| ours: + fingers (default rest curl) | 0 | 0 | 0 | 36.1 | 0.01 | 4.72 (4.72) | 22.97 (22.97) | 79 (79) | 0 / 0.02 | - |
| ours: + ground (default on) | 46.22 | 2.721 | 29.55 | 0 | 10.63 | 7.863 (4.72) | 22.97 (22.97) | 116 (79) | 13.47 / 19.99 | RightFoot 46.2, RightToes 35.7, LeftLowerLeg 32.2, RightLowerLeg 31.9 |
| ours: defaults (a plain anim cue as a card plays it) | 46.22 | 2.724 | 29.55 | 36.1 | 10.63 | 7.863 (4.72) | 22.97 (22.97) | 116 (79) | 13.47 / 19.99 | RightFoot 46.2, RightToes 35.7, LeftLowerLeg 32.2, RightLowerLeg 31.9 |

## Defects, with file:line, reproduction and fix

Reproduce any row: `node Director/mv.mjs call fidelity '{"clips":["mx_house_2"],"secs":3,"stages":"raw,ground"}'` (stages: `sample footik raw limits fingers ground default`; `"pair":["mx_house_2","PowerRightHandCombat"]` for layers and transitions; `"model":"person2"`).

| # | Defect | Where | Measured | Fix (done for native actors; old videos unchanged) |
|---|---|---|---|---|
| 1 | Ground re-solves both legs with our own two-bone IK every frame, sinks the hips 4.5 cm, flattens any foot within 3 cm of the floor | `Runtime/MVGround.cs:17` (`GroundSink`), `:107` (hips), `GroundLeg` | feet to 91 deg, knees 40-61 (IdleBreathe, a standing idle: 35), jitter p99 2.5 -> 7.5, +14..37 snaps / 3 s, knee plane 34-41 off | Off on native actors. Floor contact comes from clip import (Y Based Upon Feet) and cleaned clips with feet held in the world through contacts |
| 2 | Joint limits on for every human, always; a soft zone bends any joint within 12 deg of a limit, on swing/twist axes picked by a cross product, not the anatomical hinge | `Runtime/MVLimits.cs:17` (`_lim = 1`), `:50` (axes), `Soft` | to 40 deg (mx_hh_step foot, knee 27, head 15), mx_house_2 elbow 20, hinge planes 14 off | Off on native actors. Ranges are kept in the clip cleaner instead, in muscle space, where -1..1 is the Avatar's own joint range |
| 3 | Finger rest curl added on top of whatever the clip's fingers do, every frame | `Runtime/MVActing.cs:475` | +36.1 deg on finger joints, every clip | Off on native actors; fingers come from the clip, and a `fingers` cue curls or sets only the fingers it names (`MVNativeActing.cs GripsNative`) |
| 4 | Inertial transitions: the cut's offset decays per bone as a rotation vector in local space, so mid-transition limbs leave their hinge plane | `Runtime/MVInertia.cs:142` | 24-33 deg from Unity's crossfade, hinge planes 34-40 off | Native: Timeline clip overlaps, a muscle-space crossfade with ease |
| 5 | Additive layer as a bone-local delta from frame `ref` | `Runtime/MVLayers.cs:229` | 62 deg from Unity's additive | Native: dropped with a build note (Timeline has no additive track); breathing comes from clips |
| 6 | Half-weight layer as bone-local slerp | `Runtime/MVLayers.cs:231`, `MVActing.cs:115` | 12.5 max / 0.9 mean from muscle space | Native: AvatarMask override tracks (full weight, eased in and out); a weight under 1 is noted in the build |
| 7 | Source clips: one- and two-frame flips and buzz, foot slide | the Mixamo data (e.g. mx_hh_step jitter max 180) | see the cleaner table | `call cleanclips`: once per clip, reused by every video |
| 8 | Clip import: Loop Time off, no Bake Into Pose, root height from the original root on every mx_ clip; `MVMotionImport.cs` reset those on every reimport | `Editor/MVMotionImport.cs` (before) | - | `call clipimport` measured each clip (loop, travel, Foot IK) and set them; MVMotionImport now keeps what the .meta has |

Not defects: per-bone `Quaternion.Slerp` has no hemisphere bug (Unity's is shortest-path; our `Log` flips `w<0`); no Euler blending (Euler appears only in authored offsets: `pose`, `stance`); hips handled as Unity does (our `Sample` keeps the model root still, Unity with `applyRootMotion` off does the same: 0.01 cm); no Generic-sampled humanoid clip; evaluation order inside our stack is fixed per frame (`EndBody`); no per-frame state (every memo is a pure function of the score).

## Unity's Foot IK on our rig, per clip

`call clipimport` plays every clip with Foot IK on and off: for the 137 mx_ clips Foot IK cuts foot slide from 39.4 to 23.1 cm/s on average but moves knees by 54.7 degrees (max change, average over clips) and flips a knee on 26 clips. The verdict is per clip and **off by default**: on only when it cuts slide by a third without moving a knee past 25 degrees (27 clips). Stored in `Director/library/motion/import.json` (`footIKTest`, `choice.footIK`) and in `Director/library/clips.json` (`import`).

## Clip import (applied)

All 172 humanoid clips in `Assets/MusicVideo/Motion` (137 mx_ plus the 35 new ones from `gen/mixamo`): Loop Time and Bake Into Pose (rotation, Y, and XZ unless it travels) only on loops (whose last frame meets the first: 107 of 137 mx_, 27 of the 35 new); Root Transform Position Y **Based Upon Feet** on every clip; travelling clips (38 + 10) keep XZ as root motion. Choices and the settings each clip had before are in `import.json` (`before`), so it can be put back. **This also reaches the old path** (it samples the same clips), which is why the old-path renders below were made before it was applied.


## The hybrid (built 2026-11-07)

**Playback** (`Editor/Native/NativeCompile.cs`): on a native actor every `anim`/`walk` becomes a clip on a Timeline AnimationTrack bound to its Animator (Humanoid Avatar, `applyRootMotion` off, culling off): consecutive clips overlap by `blend`, which Timeline turns into a muscle-space crossfade with an ease curve; `layer` becomes an Override track with an AvatarMask; Foot IK per clip from the measured verdict. No inertia, no additive, no half-weight slerps, no ground, limits or rest curl, no `keys`/`pose`/`plant`/`stance`, no bakes: each is listed in the build's warnings per actor, never dropped silently. Our MotionTrack still moves the actor (marks, `walk` paths, `root` motion) and the face.

**After the Animator, same frame** (`Runtime/MVNativeActing.cs`): `reach` (two-bone, blended by joint rotation, the pole taken from where the clip has the elbow so it stays in the clip's hinge plane), `gaze` (neck and head only, clamped, eased, letting go when the target is behind), `eyes`, grips (`fingers`, only the fingers named). Safe because Unity writes the pose first (`call evalorder`).

**Clean clips, once per clip** (`Editor/Native/MVClipClean.cs`, `mv call cleanclips`): read the clip's own humanoid curves (muscles, root, IK goals) at 60 Hz; IK and root quaternions made continuous; one- and two-frame excursions that come back replaced by the line between their neighbours (the 180-degree flips); a 7-tap Savitzky-Golay pass on muscles only (it keeps peaks); muscles inside -1..1, which is the Avatar's own joint range; foot goals carried into the world through the body root, held still through each contact (low and slow for 4+ frames, eased in and out over 3), carried back, and played with Foot IK, on clips where Foot IK doesn't flip a knee. If holding the feet makes a clip worse it is cleaned again without; a clean clip is used only when it is no worse than its source on every measure, otherwise the source plays. Written to `Assets/MusicVideo/Motion/Clean/<name>__clean.anim` (the suffix keeps the old path's lookups by name on the source). Measured on the person rig at 60 Hz against the source, both as the native path plays them:

| clips | n | jitter p99 source -> clean | snaps source -> clean | foot slide cm/s source -> clean | peak hand/foot speed kept |
|---|---|---|---|---|---|
| all cleaned | 172 | 2.09 -> 1.69 | 78.97 -> 62.11 | 24.67 -> 23.19 | 1.156 |
| used (better on every measure) | 105 | 2.19 -> 1.65 | 97.04 -> 75.14 | 21.55 -> 18.64 | 0.993 |
| used, feet held | 40 | 1.73 -> 1.48 | 63.40 -> 50.98 | 15.11 -> 8.92 | 0.991 |

Examples:

| clip | used | feet held | why | source jitter p99 / max / snaps / slide | clean | peak kept |
|---|---|---|---|---|---|---|
| mx_hh_step | true | 0 | Foot IK flips a knee: feet not held | 3.435 / 180 / 218 / 27.9 | 2.715 / 9.32 / 184 / 27.6 | 1.01 |
| mx_house_2 | true | 0 | held feet made it worse; cleaned without them | 2.36 / 9.87 / 315 / 5.7 | 2.208 / 8.8 / 305 / 6.6 | 0.981 |
| mx_rib_pops | true | 6 | feet held in the world through contacts, played with Foot IK | 4.927 / 9.74 / 259 / 17.3 | 4.183 / 9.6 / 238 / 15.9 | 0.94 |
| mx_stomach_hit | true | 2 | feet held in the world through contacts, played with Foot IK | 1.795 / 3.93 / 3 / 28.4 | 1.711 / 3.1 / 3 / 2.9 | 0.984 |
| mx_sitting_talking | true | 2 | feet held in the world through contacts, played with Foot IK | 0.363 / 8.66 / 3 / 2.8 | 0.336 / 6.92 / 2 / 1.2 | 0.878 |
| mx_putting_down | true | 2 | feet held in the world through contacts, played with Foot IK | 0 / 1.68 / 0 / 6.6 | 0 / 1.68 / 0 / 6.1 | 0.896 |
| mx_hit_reaction | true | 2 | feet held in the world through contacts, played with Foot IK | 3.252 / 5.69 / 1 / 30.6 | 2.507 / 5.82 / 0 / 5.3 | 0.852 |
| mx_standing_arguing | true | 2 | feet held in the world through contacts, played with Foot IK | 1.731 / 11.41 / 174 / 2.8 | 1.726 / 12 / 164 / 1.1 | 1.004 |

`call clipderive` writes a new humanoid clip from a clip and keyed muscle offsets, for acting no clip has: `sit_knee_kick_r` is `IdleSit13` with `Right Lower Leg Stretch` and `Right Foot Up-Down` keyed into a kick with overshoot.

## Proof on the two shots (same frames, same cameras, 1280x720 30 fps, side by side)

Files in `Director/captures/native-proof/`: `*_side_by_side.mp4` (old vs native on raw clips), `*_side_by_side_hybrid.mp4` (old vs hybrid), contact sheets `*_sheet*.jpg`, per-frame bone dumps `*_bones.json`, numbers `*_numbers*.json` (`node Director/tools/fidelity_shot.mjs old.json new.json`). The old-path renders were made before the clip import was applied, so they are what J has been seeing. Every number is over every frame of the shot on `person`. "Old vs source" is the old path against Unity playing the take's source clips (native has 0 error to its source by construction). Jitter here is per frame at 30 fps, so larger than the 60 Hz numbers above.

| shot | path | jitter p99 | jitter max | snaps > 8 deg | foot slide cm/s | old vs source clips (mean / p99 / max deg) |
|---|---|---|---|---|---|---|
| Greener ch_orbit_a (25, 53.63-55.34 s) | old (baked take) | 9.92 | 13.1 | 163 | 29.7 | 20.3 / 105 / 116 |
| | native, raw clips | 24.71 | 44.5 | 208 | 38.5 | |
| | **hybrid, clean clips** | 25.45 | 163.4 | 201 | **28.3** | |
| | hybrid, after the first 5 frames (old: 9.45, 126 snaps, 24.2 cm/s) | 16.66 | 40.9 | 150 | **17.1** | |
| Hawkes Punch c_knee (8, 17.77-20.29 s) | old | 6.11 | 21.7 | 13 | 7.6 | 9.6 / 34 / 53 |
| | native, raw clips (acting lost) | 0.64 | 0.7 | 0 | 0.7 | |
| | **hybrid, clip acting + post-Animator reach** | 1.36 | 19.2 | 7 | 20.4 | |

**What this says, plainly.** On Greener's chorus the hybrid does **not** yet beat the old path on jitter or snaps. It is better on foot slide (28.3 vs 29.7 over the shot, 17.1 vs 24.2 once the cut-in is past) and worse on jitter p99 (25.5 vs 9.9) and snaps (201 vs 163). The worst of it is the first four frames (53.66-53.76 s: a 168-degree left-leg flip as the take's clip changes on the cut); after them the jitter is still about 1.8x the old path's. The old path plays a take baked as a whole (cleaned across the take's own clip changes, its hits sprung and settled by `bake/mechanics.mjs`); the hybrid plays the take's clips one by one, so every phrase change in `dance_chorus` is a crossfade between raw-ish poses, and `warpTo` plays at an average rate, not on the beat. The clip cleaner improves clips; it can't clean the joins between them.

On c_knee the hybrid is steadier than the old path (jitter p99 1.4 vs 6.1, 7 snaps vs 13), and the acting is back as clips (`sit_knee_kick_r`, `mx_putting_down`, two gazes), but the frame doesn't sell it yet: the kick happens below the frame edge, and the doctor's post-Animator `reach` to his right knee sends her right arm out behind her (she has her back to the camera, his right knee is on her left), so the gesture reads wrong. The 20 cm/s "slide" is the kicking foot sweeping near the floor, which the measure counts as slide.

**Determinism.** A native shot evaluated, then evaluated again after a seek to 140 s, gives the same bones to 0.0 on every quaternion component. `mv test --only reverse` on a plain native build of Greener: 7 of 8 moments pass; 29.02 s reads 27.9 dB, and the difference image is the tree's leaves only, with the body and everything else identical (the same test on the old path gave 32.7 dB at its worst). `node Director/tools/reverse_test.mjs` was not rerun on TK Shock: its path is unchanged (native is off for it) apart from the clip import, which changes clip data, not play order. Bake purity is untouched: bakes don't run on native actors and the bake code is unchanged.

## Migration plan: what the cues compile to

| cue | native form | status |
|---|---|---|
| `anim` | clip on the actor's AnimationTrack; overlap = `blend`; clip-in = `start` + `offset`; time scale = `speed` or `beats`; `once` = loop off, hold | done |
| `anim` `return` | a second copy of the previous clip resuming in phase, overlapping by `return` | done |
| `anim` `warpTo` | average rate | rough: Timeline has no time-warp; resample the warp into a derived clip |
| `walk` | clip at its own pace, path from MotionTrack | rough: rate should follow distance and stride; derive a clip at the walk's speed |
| `layer` mask | Override track + AvatarMask | done; a weight under 1 plays at 1 |
| `layer` additive | none | dropped; use clips with breathing |
| blend tree | heaviest clip | rough |
| `perform` / takes | expand as now; bakes skipped | needs takes rebuilt from clips: this is where the chorus loses |
| `keys`, `pose` | none; build note | acting from clips (`library/motion`, `gen/mixamo`, `clipderive`) |
| `reach` | post-Animator two-bone, hinge-plane pole | done; side and aim need care (c_knee) |
| `gaze`, `eyes` | post-Animator, neck and head | done |
| `fingers` | post-Animator, named fingers only | done |
| `plant`, `stance`, ground, limits, overlap | none | off; floor from Root Y Based Upon Feet and the clean clips' held feet |
| `attach`, props, camera `look` | unchanged (they read bones after Unity wrote them) | done |
| `ragdoll` | none (a Generic clip) | the clip before plays on; needs a humanoid ragdoll bake |
| `steps`, `speed` | none on native bodies | todo: time scale per segment |

## What's open

1. **Joins, not clips, are what's left on the chorus.** Next: build each dance take as one humanoid clip (sample the take through Unity's mixer, then clean that, the bake's job done in muscle space on the native path) and re-measure ch_orbit_a. Until it beats 9.9 jitter p99, Greener stays on the old path (it does: it's a legacy video).
2. c_knee: reach with her left hand (the near side) or turn her, and frame the kick (or cut to it). Cards are the cut agent's; this proof used a temporary act file, removed after.
3. Clean clips: 67 of 172 fall back to their source (mostly Foot IK knee flips). Holding those feet needs a leg solve in the cleaner, not Unity's Foot IK.
4. The clip import also changed the old path's clips (Loop Time, Bake Into Pose, Y from feet), so every old-path video looks a little different on its next render. `import.json` `before` holds each clip's previous settings if that needs undoing.
