# Touch Grass: pipeline log

Every place the pipeline got in the way, was slow or lacked something, and the fix. The first real video through the new system. Status: FIXED (done in the tool), WORKAROUND (done for this video, the tool still lacks it), OPEN.

## Timings

| Step | Time |
|---|---|
| Brief to first previs | 21 minutes (14:08 to 14:29), including the tool fix |
| Brief to final state | 65 minutes, 4 full QA passes of the cut |
| `mv cards check` | under 1 s |
| Plain build | 25 s first, then 7 to 13 s |
| `mv previs`, 900 frames at 12 fps, 426x240 | 22 to 33 s |
| Staging sheet, 3 frames of each card | about 30 s |
| All 20 shots, 640x360 at 30 fps | 180 to 230 s |
| Final quality, 4 s at 640x360 | 15 s |
| `qa.mjs all` with vision and motion check | about 65 s, $0.56 |

Total Hawkes Gen spend on QA: about $2.40. No GPU, no generation, no AI video.

## Faults, in the order they were met

### Song

1. **The analyzer can't be told the tempo.** FIXED. A click-straight 90 BPM track came back as 89.10 BPM, first beat at 1.37 s, with a wobbling grid: the plain tracker scored higher than the true grid and won. `analyze_song.py --bpm 90 --offset 0` now states it, and `mv new` takes the same flags. Anything with a known tempo should state it.
2. **Plain analysis had no `hat` onsets.** FIXED. Cards allow `on: hat`, but only the deep analysis wrote them. The plain pass now does.
3. **No way to swap a song.** FIXED. `mv song <file> [--bpm --offset]` replaces the audio, updates the score and re-analyses. Tested on a copy against a 72 BPM, 96 s song: cards and cut untouched, the compiled act differed only in times (0 of 147 lines otherwise), last shot moved from 69.3 s to 86.9 s.
   Still true: a faster song can push a shot below a performance's `min`. That warns at build, it doesn't stop.

### Library

4. **No flinch.** FIXED. The story needs one twice and nothing startled exists. Added `flinch_small` (side param), through perf_lab and the gallery: 0 pops, reverse 0, feet within 2.5 cm.
5. **`touch_grass` had a fixed length.** FIXED. The hand lifted at 2.5 s whatever `for` said, and it smiled on its own, stealing the hero shot. New params `hold` and `smile`, defaults unchanged.
6. **`lie_back` can't start on a cut.** FIXED. Its 0.6 s blend showed him kneeling up out of the previous pose. New param `blend`.
7. **No move from kneeling to sitting on the grass.** WORKAROUND. The cut hides it. A `kneel_to_sit` would let one take run.
8. **No stacking of a face performance over a body performance.** WORKAROUND. A cast entry holds one performance, so `smile_small` and `breathe_deep` go in as `events`. Works, but they were the most common reason to leave the cast. Proposal: `cast: {person: {perform: touch_grass, also: smile_small}}`.
9. **`smile_small` says entry `stand` but works anywhere.** FIXED. `mv lint` warns when a performance moves only the face and head and its entry or exit is not `any`. `smile_small`, `squint_at_sun` and `look_at_clouds` now say `any`. It only moves the head and face. The state check doesn't stop it, but entry should be `any`. Same for other face-only performances.

### Sets and props

10. **Marks only know a standing head.** WORKAROUND. A kneeling, sitting or lying man is framed at 1.62 m. Cameras read `head` from the mark, so `kneel`, `sit` and `lie` are extra marks on one spot. It works, but each new height means a set edit, and bones can't be aimed at by height. Proposal: a `pose` per mark or per performance exit (`kneel` 1.14, `sit_ground` 0.72, `lie` 0.22), since performances already declare their exit state.
11. **The back door doesn't open.** WORKAROUND. `WallOut_3x_door` has the door built in, and the door prefab's pivot is its middle. Built a hinge piece, a leaf attached to it, and a black quad over the fixed door. He steps out through the quad, so for about half a second the front of his body is a slice in the dark. A wall without a door, and a real dark hallway behind it, is the right fix before the Look gate.
12. **A set's piece `pos` is always world**, so `parent` can't hold an offset. FIXED. Under a `parent`, a piece's `pos` is an offset from the parent, and a parent named in the same set becomes that set's piece. A parent later in the file stops the compile. The door still uses its card `attach`, which works. A card `attach` does it.
13. **A sprinkler, a small bird and a water spray don't exist.** WORKAROUND. No model in the downloads (`mv find` for sparrow, pigeon, songbird, parrot, sprinkler: nothing). The sparrow and sprinkler are .obj files written by a short script (`Assets/Videos/touchgrass/Props/`). The sparrow looks like a wooden toy. The water is `fx stream`, made for feathers: nine short pulses, shaded as flecks. All three are previs quality only.
14. **`color` on an .obj model is ignored.** FIXED. `color`, `emission`, `smooth`, `metal` and `texture` on a model file are now a warning from lint (set pieces: from `cards check`) with the fix, `skin` or `material`. The lists come from the C#. It came out white, no warning. Needed a `.mat`. Lint should flag it.
15. **A walk rounds to whole strides, and the cut snaps him to the mark.** FIXED, worst one of the run. 21 cm of snap inside an inertial blend threw his whole body 30 degrees sideways for half a second, on camera, with lint and `cards check` clean. `cards check` now warns with the exact spacing to use.
16. **A walk goes straight ahead of where he faces and ignores `to`.** WORKAROUND. `to` only decides the distance, so a walk to a mark off his heading misses. All marks are on one line. Heading should come from `to`.
17. **`face` on a card is ignored when the mark doesn't change.** FIXED. `check` warns with file and line when a card's `face` differs from where he stands and his mark doesn't change. It only applies with a `set`, silently. `check` should warn.
18. **Wide lawn shots need camera marks.** WORKAROUND. The `wide` preset stood inside the porch posts. Added `door_cam`, `corner_cam`, `field_cam` and others to the set. Normal for a location, but `spot` needs a subject in the set, so each one also needs an aim mark: seven marks for three cameras. `spot` should take a point.
19. **`spot` on a mark can't take a card-level subject height.** See 18.

### Tools

20. **No contact sheet of a whole cut.** FIXED, and now `mv cards sheet`. `tools/mv/cardframes.mjs <video>`: three frames of each card, labelled, in about 30 s. It found almost every staging fault in this log before any render. Should become `mv cards sheet`.
21. **`perf_lab` writes `sheet`, `mv motion` wants `file`.** FIXED. `mv motion` and `mv lab` take either `--sheet` or `--file`. Same job, two names.
22. **`mv lab` with no first clip starts him in the scene's own pose.** FIXED. `mv lab` plays `IdleBreathe` under a person with no clip at the start, and says so. He began sitting, and reverse failed by 0.49 m, which reads as an engine fault. It should default to `IdleBreathe` or warn.
23. **`call humanoid` with no arguments throws a null reference.** FIXED. It lists its arguments. Harmless, it stops before changing anything, but it should list its arguments.
24. **One stale depth-of-field frame on cuts.** FIXED, a real engine fault that I first misjudged. The first frame after a jump came out blurred. I called it a capture quirk, because consecutive frames were sharp and the shot render was sharp, but shot renders are preview quality with depth of field off, so they couldn't show it. `mv test reverse` caught it at 23.2 dB. The outgoing camera is still live on the first brain update and writes its focus, and a shot with no focus target never overwrites it. So any final render would blur one frame on those cuts. `Capture.At` now goes round once more when the camera changes (`Transport.cs`, under the lock). Reverse went to 38 dB. It runs for every video.
25. **`rack_focus` crashed the build.** FIXED. It writes `aperture: null`, and a style with `apertureScale` reads that value and throws deep in C#. `cards check`, lint and the template's own test all passed. Cards now treat a template's null as "remove", as they already do for a card's. No template had ever run on a style with `apertureScale`, so the template test should run against every style.
26. **A failed build still leaves the old scene to look at.** FIXED. A good build records a hash of its inputs, taken before it starts. `frame`, `sheet`, `shot`, `render`, `previs` and `cards sheet` refuse when those files changed or the last build failed, and name the files. `mv cards` exits non-zero. `--allow-stale` overrides. C# changes are not covered. `mv cards` printed a stack trace and `cardframes` then happily captured the previous build. I only caught it because the timing looked wrong. `mv cards` should exit non-zero, and frames should refuse a score newer than the last build.
27. **QA counted shots from the old cut.** FIXED. Adding one shot renumbered all the folders, and the report said "38 shots, 13 failed" with 20 shots in the cut. It now counts only live shots. The old folders are in `captures/qa-old-cut/`, not deleted.
28. **QA's first sheet tile was the previous shot.** FIXED. `mv shot` rounds its start, so the frame on the cut can still be the shot before, and vision reported "the shot opens on the wrong thing" on three shots. Sheets now start a frame in.
29. **QA is noisy on unchanged shots.** OPEN, the main caveat of the gate. Shots I didn't touch moved by up to 2 points between passes: `flinch_bird` 8.9 to 6.8, `sun_blink` 7.4 to 6.5. New sheets mean a new hash, so everything is asked again, and the pass line is 7. Treat under 7 as a prompt to look, not a verdict. Certain A faults are far more reliable: the only one on the last pass was real.
30. **QA and stillness disagree.** OPEN. The biggest fault class by count is "frozen for N seconds". J's rule says stillness beats flailing, and this video's feel is stillness. `review/STANDARD.md` wants holds with life in them, so an additive `IdleBreathe` layer on holds helps, but a held shot will always draw these. The card's `feel` could tell the reviewer the hold is the point.
31. **Curl can't open a hand, as documented.** FIXED, see Performance pass. `fingers` adds to whatever the clip does, so `curl: 0` and `-1` leave a mocap fist shut. Below -1 it opens past the clip: -2.8 gave a real open hand for the close-up, -1.3 relaxed the claws for the whole film. AGENTS.md says -1 is the limit. Should be an absolute `open` value.
32. **Default stand is claw hands and wide arms.** FIXED, see Performance pass. Vision called it out on nearly every shot. `IdleBreathe` is the default under the cast, not the `stand` performance with the arms eased in. Cast defaults should use `stand`.
33. **The hero smile needed four tries.** The lean into the grass puts his head down, so a smile on that take is the top of his head. Head-up gaze hid the mouth. The fix is timing, not pose: he rises at the head of the shot and smiles while rising. This is the pipeline working: 10 seconds a try.
34. **`mv test cost` depends on what Unity did last.** FIXED. The test sets final quality itself and warms up at the size it measures, until two passes agree. It read 2.5 times the baseline right after a `refresh`, then passed at 119 ms after one `mv shot`. I nearly blamed my own fix. A 4 s final render showed the fix was fine: it went from 27 s to 15 s once narrowed. The test should set its own quality and warm up after a reload.
35. **Motion check's report holds only the last run.** FIXED. Each range keeps `motioncheck-runs/latest-<tag>.json` and `.md`, and QA with Unity busy reads `latest-all`. `motioncheck.json` is still the last run. QA on one shot overwrote the full-cut report, so a whole-cut reading has to be rerun by hand.
36. **Shot renders don't show depth of field.** BUILT, cost not settled. `mv shot` now renders as a final with only SMAA off, and `--final` keeps SMAA. One shot was run to prove it works: `the_yard`, 33.5 s. The planned A/B against the old path was stopped to free Unity, so there is no before and after on one shot. `watching` took 68.8 s the old way, under load, about 344 ms a frame. `rack_focus`, the shot's whole point in `watching`, isn't visible in `mv shot`, so QA can't see the reveal it reviews. Needs a `--final` on `mv shot`.
37. **A tween is at 0 on its own first frame.** FIXED. `for: 0` on `grade`, `sky` and `light` starts a tick early, so it is done on its own first frame. Moods, lighting and `rack_focus` use it. Compiled, not yet looked at on `watching`. `watching` shows one frame with the wrong depth of field after the cut, because the rack's opening `grade` lands exactly on the cut and has no effect until the next frame. A negative time isn't allowed (`-0.02b` stops `check`), which is what I'd have used. An instant `grade` at `for: 0` should mean "already there".
38. **New hands mid-run.** No fault: the rebuilt model came in with a `refresh` and a plain build, no card changed. Humanoid import confirmed, 53 bones mapped, fingers and eyes included. See "Hands" below.

44. **Keys nothing read.** FIXED. New: `tools/mv/keyuse.mjs`. Cards use a read tracker, so a camera key the preset never looks at or `args` on a take that runs on warn. Cues use per-kind tables read from the C#, sets, marks and lighting a key list, perform cues their parameters. All of it warns, so no build stops on a key that does nothing; `mv lint --strict` makes them errors. The first run found dead `args` differences none, but 5 dead actor keys on TK Shock (accepted in its baseline). Gap: a key read in shared code for every kind (`clip` on a `reach`) still passes.

## The silhouette bug

Fixed what reproduced, and could not reproduce the spike as described. Tried `mv motion` and `mv lab` on TK Shock and on a video scene, side, front, back and top, a plain and a fast build, right after a domain reload, on a scaled bird and a full-size turkey. The person never drew as a spike. The current code already bakes into a 32-bit index mesh, which is the usual cause of that picture, so it may have been the 13:47 edit to `MotionLab.cs`. I can't prove that: no older version is kept, and no spike image is on disk.

What did reproduce, both fixed in `MotionLab.cs` under `compile.lock`:
- **Huge triangles:** the big panel's ghosts were alpha blended per triangle with no depth test, so the mesh's overlaps stacked into dark shards. Ghosts are now opaque, light to dark over time, which also shows direction.
- **Clipped heads:** the frame was fit to hips, hands and feet only. It now fits every bone.

If J sees the spike again, the command line and the sheet will settle it.

## Hands

Person.fbx and Person2.fbx arrived at 14:25, during the run. Checked in a 1280x720 close-up on the hand-on-grass shot. Textures are clean, no scrambling. Humanoid import fine. Body and clips unchanged.

Worth a look before final: the back of the hand is very smooth, with no knuckle or tendon detail, and there is a hard crease ring at the wrist where the hand meets the forearm. At 85 mm the crease shows. Person2 was not seen in this video.

## What QA said at the end

20 shots, 15 pass, 5 fail, average 7.5. Motion check on the whole cut has no joint faults and no pops. Left: his left hand resting on his body while lying, about 5 cm deep (mocap, C), and in `in_doorway` small foot faults at the deck: a slide of about 4 cm a frame and light contact with the threshold, seen at 15% of the frame behind the rail. The last deck-height change came after the QA pass: the previs has it, the 640x360 renders of `in_doorway` and `sun_blink` don't.

| Shot | Score | Why it fails | Is it real |
|---|---|---|---|
| sparrow | 4.2 | Certain A: it doesn't sing, a plain ball with no beak or eye | Yes. The stand-in model. Needs a real bird |
| sun_blink | 5.3 | The squint doesn't read | Noise for the most part: 8.9 on the pass before, with nothing changed but the deck height. The squint is mild, though |
| hand | 5.9 | Long hold, grass doesn't wrap the fingers, about 1 s of empty grass first | Part real. The grass response is real. The hold is the shot |
| check_behind | 6.7 | Stiff stand, blank face | Part real: the rig's default stand. Has also scored 7.2 |
| flinch_water | 6.7 | Head clips the frame top, weak laugh beat | Part real. Has also scored 8.8 |

Passing, 7.0 to 10: everything else, including the hero smile at 7.6.

## What the system proved

- Cards work. 20 shots, 127 compiled cues, no hand edits to generated acts. The video needed one C# fix, the depth of field; everything else was cards, set marks, library params and the Node tools. No `tweaks/` or `notes/` were needed, since the cards were mine to edit. Against 4,000 hand-written cues on TK Shock.
- The library carried it: 10 performances from the gallery plus 1 new, 2 of them extended by params.
- The loop is fast enough to direct by. A card change to a frame on screen is under a minute.
- Staging faults were cheap: nearly all were found by the contact sheet before any render.
- The worst bugs were silent. Three passed lint and check: the walk snap, the rack crash, the stale focus. Each is now caught or gone.

## Performance pass (J's notes on the previs)

J's verdict: the story reads, but he looks like a video game character. Five notes, all from cards, the library and three engine cues. No acts edited by hand, no GPU, no generation.

**Stand.** Every admitted idle has the same wide bow with the elbows out: 12 clips compared front on, it comes with the rig, so a better clip does not exist. New engine cue `stance` (`MVActing.cs`): arm offsets and a weight shift that hold under every clip and performance, with leg IK keeping the feet where the clip has them. `stand` sets it, and the cast starts with `stand`, so nothing has to remember it. Walks turn off the legs and keep the arms (with a wider offset, since `Walk4` carries wider), kneeling, sitting and lying turn it off, rising turns it on. Sign trap: `x` on a hanging forearm tips the top forward, so the hand goes back, and -x raises it. It took four rounds of variants in one lab run: put each variant at its own second and read one sheet.

**Hands.** `fingers` `set` is absolute, from the rig's rest pose: 0 flat, 0.35 relaxed, 1 a fist. The rest pose holds the thumb out from the palm, so it is brought in by 38 degrees. Replaces every `curl` below -1. `touch_grass` lost `curl` and has `open`; `flinch_small` uses `set`. Fixes a bug nobody had seen: `touch_grass` ended with `curl: 0`, which threw away the film's relaxed hands.

**Smile.** Toothy because `smile_small` ran at 0.85 and `smile` parts the lips above about 0.4. New `smile_relief`: three slow steps to 0.36, head level, two slow blinks, a breath let go. The card also lifts chest and neck, because the kneel's mocap hunches.

**Lying.** `IdleLayDownCampfire` is the knees-up pose. `DeadBack` is a good flat one, not in the catalogue until now (admitted). `lie_back` crossfades to it and holds a bone key: arms in, head level, feet rolled out, one soft knee. `keys` with a `pose` would have blocked the additive breath, because layers sit under keys, so it is a real `anim` plus a bones-only key. His head landed 0.46 m from the old spot, so `lie_head` and `face_cam` moved.

**Face.** New engine cue `eyes`: degrees on top of the gaze, no target, never moves the head. A `gaze` with `"head":0` was the first try, and it eases a head gaze back, so a dart in a held look would have turned his head. New `micro_life`: darts, slow blinks, soft lids and brow. Brow softening has no shape key: `fear` at 0.1 does it. Negative shape weights work but look stern. On `sun_blink`, `flinch_water`, `smile`, `clouds_face`.

39. **A tweak's `events` replaces the card's events.** OPEN. Lists replace, as documented, but `tweaks/look.json` silently dropped an event I added to the `sun_blink` card. `raw` survives. `mv why` shows it if you ask, `check` says nothing. Another pass working on the same video will hit this.
40. **Files are CRLF, and a string replace misses silently.** WORKAROUND. Two of my card and cast edits did nothing and the build looked fine. I saw it only because the arms were still wide. An edit script should fail when nothing changes.
41. **`perf_lab` started every test on the bare clip,** so a performance was not tested on the stand it inherits. FIXED, it starts with `stand`.
42. **`cards --fast` and a render from two passes share one scene.** OPEN. The queue keeps them apart, but a render can pick up the other pass's build, and a final render blocks every lab test behind it. The queue says who, not why or how long.
43. **Close-ups show the lighting's dapple.** OPEN, for the look pass: leaf shadow falls across his eyes through the smile and on `stop_breathe`'s shirt.
