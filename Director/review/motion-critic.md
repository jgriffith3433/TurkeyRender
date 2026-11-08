# The motion critic: judging animation from the bones, before anyone watches

2026-11-08. J rated the Hawkes Punch animation 1/10 and said "I'm not sure you really understand the amount of animation and work that goes into this". The coordinator's diagnosis: we judged motion from sampled stills, and stiff or odd motion looks fine in a still. The critic is the fix: it reads per-frame bone dumps (no render) and scores them the way an animator's eye would, so the director can tell good motion from bad before a frame is rendered.

Tool: `Director/tools/critic.mjs` (CLI, dumps, reports, vision stage) and `Director/tools/critic/measures.mjs` (the measures and the calibration table `CAL`). Reports: `Director/library/motion/critic/<clip>.md` for clips, `videos/<v>/critic/<label>/report.md` for a cut, `final/critic.json` on every `mv final`.

## What it reads

A dump is every human bone's local rotation and actor-frame position at every frame, plus world feet and the actor's root:
- a clip: `call clipbones` (new, `Editor/Tests/EngineFidelity.cs`): the clip played by Unity's own Animator on his Avatar, Foot IK off, 30 fps, with each bone's rest rotation and the fingers' curl axes. A keyed pose sheet is judged through its derived clip (`Keyed/<sheet>.anim`). A clip is judged as the native path plays it: its clean copy where `import.json` says `clean.use`, the raw FBX otherwise (`--raw` for the raw one always).
- a cut: `call shotbones` per actor over a range of the built timeline (20 s a call, each its own queue ticket), with the shot boundaries from the compiled cut so a step across a cut is never a snap.

Cached in `Director/gen/critic/clips/<clip>.json` (about 0.8 MB a clip) and `videos/<v>/critic/<label>/<actor>.bones.json`.

## The measures, by principle

Every measure is in seconds, metres and degrees per second, so 30 and 60 fps dumps compare. A "move" is a run of frames where an end effector (hands, feet, head) is faster than 0.12 m/s and 20% of its own p95, at least 3 frames, gaps of 2 bridged.

| # | principle | measure | what gives it away |
|---|---|---|---|
| 1 | Arcs | per move: max deviation from the chord / chord (`bend`); median over moves, share under 0.04 | a hand that travels in a straight line |
| 2 | Slow in and out | per move: mean speed / peak speed (`flat`: a bell is 0.5-0.65, linear interpolation 0.9-1.0); share of moves that start or stop at over half their peak in one frame | muscle lerp between keys, a pose that stops dead |
| 3 | Timing | body energy (mean angular speed of the body bones): holds (under 12 deg/s for 0.25 s), dead frames (under 1.2 deg/s: no breath, no tremble), fast runs (over 2.5x the median) and their median length, p95/p50 | a frozen hold; action that is all mush with no quick part |
| 4 | Anticipation and follow-through | per big move (15 cm hands and feet, 8 cm head): a counter-move against the chord first (inside the move or 0.4 s before, 5% of the travel or 2 cm); a path past the end that comes 40% of the way back within 0.35 s | a move that starts cold and stops on its mark |
| 5 | Overlap and drag | correlation between the parts' speed profiles (hands, feet, head, chest) at lag 0 (`coherence`: 1 = everything moves as one), the median best lag between pairs, energy peaks where every part peaks on the same frame | every muscle interpolated between the same two keys |
| 6 | Weight | centre of mass (hips .5, chest .3, head .1, feet .05) acceleration spikes over 40 m/s^2; planted-foot slide cm/s (skipped on travelling clips, which play in place); in zero-g (`--zerog`, or a zg_/hp_ hero clip), speed changes over 0.25 m/s with nothing to push on | a body that jerks; feet that skate; a floater that brakes in a vacuum |
| 7 | Snaps and pops | the bake's measure: a one-frame step over 8 deg on a body bone that stands 1.9x above its neighbours; an end effector moving 18 cm in a frame; never across a cut | a flip, a pose jump |
| 8 | Stiffness | while the body moves (energy over 20 deg/s), the share of core joints (hips, spine, chest, neck, head, shoulders, upper arms and legs) under 1 deg/s; joints that never move 2 deg; the longest stretch of limbs moving with a frozen spine and neck | the dead body under a moving arm |
| 9 | Silhouette | at the key poses (hold centres, else every 0.5 s): the skeleton as capsules projected on a front, side and three-quarter camera, rasterized; limb pixels clear of the torso, open space in the bounding box, arms mirroring each other (twinned); the best camera counts | a pose that reads from nowhere |
| 10 | Hands and face | finger curl against the rest pose about the curl axes and the spread between index and little (fanned: curl under 12 with spread over 28; clawed: over 85); fingers that never move; head pitch against its rest (bowed over 25 deg); eye and jaw bones that never move in a cut | splayed mannequin hands, a hanging head |
| 11 | Contact | a hand inside the torso axis (7 cm) or the head (9 cm); with a partner's dump, an arm straight (elbow over 155 deg) and still for 0.3 s with the partner 12-45 cm away (a reach into air). Partial: hit and catch targets that are props are not read yet | hands through bodies, a punch that lands on nothing |
| 12 | Distance from human motion | the robust z (median/MAD, log scale for rates) of the motion's signature against the mocap reference: arm/leg/spine/head angular speed p50 and p95, angular acceleration p95, hand speed, spine-to-arm ratio, energy variation, move rate, arc bend, flatness, coherence, frozen share, dead share; RMS of the clipped z over the features | anything that is statistically not a person |

Each principle maps to 0-10 through `CAL` (good .. bad, straight line). The total is a weighted mean (overlap 1.2, stiffness 1.2, reference 1.5, silhouette .6, contact .6, weight .8, hands .8, the rest 1); principles with nothing to judge are left out (`n/a`). The worst five moments are the events with the highest severity, merged within a quarter second. The verdict line: 8.5+ reads as human; 7-8.5 passable; 5-7 "looks animated, not acted"; under 5 wrong to an animator's eye.

## The reference

`critic.mjs reference` dumps every `mx_*` clip in the clip catalog (the real human motion we have: 189 Mixamo mocap clips on his rig) and writes `library/motion/critic/reference.json`: median, MAD, p05 and p95 of every signature feature. The 2,700-clip local collection the retro mentions is not on this disk (it lived with Gen's motion family on the fleet, which went with AWS; no .bvh anywhere on C:), so Mixamo is the human population for now; when the collection is back, add its clips to the dump list and rerun.

## Calibration

See `library/motion/critic/calibration.md` (`critic.mjs calibrate`): every catalog clip scored against its hand-written grade, the generated `gm_*` clips, the keyed hero poses. Results and the thresholds they set are summarised below after each calibration pass.

CALIBRATION-RESULTS

## Vision, the second stage

`critic.mjs vision <mp4> [--report r.json --start <song s at file 0> --top 6 --budget 1]`: cuts 8 consecutive 24 fps frames at each of the report's worst moments (ffmpeg, time burned in, 4x2), prices the strips first (about $0.01 a strip on Sonnet) and refuses over the budget, then asks Claude through Hawkes Gen (`llm.json`, project `tkshock`, low effort) a fixed checklist per strip: weight 0-10, timing 0-10, reads as human, what is wrong, the smallest fix. The answers go into the report (`vision` block, means and the human share).

## Wired

- `mv critic [<video>] [from to] [--on person,other --label x --zerog]` runs it on the built scene (bone dumps, no render) under one queue turn.
- `mv final` runs it on the finished build after the review and records `final/critic.json` and `final/renders/<file>.critic.json` (total, verdict, the principles, the worst moments); `--no-critic` skips.
- `node Director/tools/critic.mjs clip <name...>` for clips and keyed pose sheets (`pose <sheet>` is the same), `dump <file>` for any dump, `test` is the self test (a real-looking swing against a linear one).

## What it cannot see

Blendshape faces (only eye and jaw bones), props and set contact (a hand on a can, feet on a floor that is a prop), the shot camera (the silhouette uses three fixed cameras), and anything about the picture (light, lens, cuts). Those are the review's and QA's job; this is the body.
