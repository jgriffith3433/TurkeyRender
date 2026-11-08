# Greener: pipeline log

Every place the pipeline got in the way, was slow or lacked something, and the fix. Status: FIXED (done in the tool), WORKAROUND (done for this video, the tool still lacks it), OPEN.

Song: "Gateway Drug", 140 BPM, 89 bars, 2:35, arrived mid-build. It replaced the stand-in, the brief's share-based beat sheet and the acting direction (the invisible dress). Cards were held back until LYRIC-MAP.md arrived, so nothing was thrown away.

## Faults, in the order they were met

1. **A bash heredoc with apostrophes dies in the shell tool.** WORKAROUND. Scripts with quotes go through a file, not a heredoc.
2. **`color` on a model is ignored and a model needs a `.mat`.** WORKAROUND, the Touch Grass log's fault 14 again. A set of 40 pieces would mean 40 materials, so the kit uses one palette: `Props/Estate/estate_palette.png`, one material, every face a palette cell, metal and smoothness in a second map. A colour change is one line in `tools/estate_make.py`. Worth keeping for any new kit.
3. **`material` turns off `receiveShadows`.** OPEN. `Spawn` does it for every actor with a `material`, for the person's sake. Every estate piece loses received shadows, so the Look gate needs a way to keep them (a `"shadows": true` key on the actor).
4. **`mv find` says a prefab exists when it is only in a package.** The chandelier was in the index, not in `Assets/`. The build stops with `no model at`. `mv pull` fixed it. `cards check` could say so before the build.
5. **`lint` reads clip names from a cached index.** `mv lint --reindex` after new takes, or it reports `unknown-clip` on clips that are there.
6. **`perform` has to exist even for a bird.** `perf_lab` only knows the person. FIXED below.
7. **`reach` to his own mouth is a lint error,** correctly (stale position). Finger to lips and tasting the blade use a world point for now. A `reach` that takes `toRel` would be right.
8. **The last beat of the song is past the end of the audio.** 91:1 rounds to 154.82 s and the song ends at 154.76 s. Every set piece then fails `time-outside-song`. The last shot is 1.8 beats. `cut` could clamp to the song.
9. **`set` on a crowd stacks every member on the mark.** FIXED, worst one of the run. Cast marks use `set`, and a cue on a crowd runs per member, so every row, balloon cloud and gift line collapsed to one spot with no warning. A second cast `hide` did nothing either, for the same reason, so rows stayed visible in shots they were not cast in. `cards.mjs` now writes `each: 0` on cast `set`, `show` and `hide`.
10. **A walk's end `set` beats the next card's `set` on the same frame.** FIXED. A walk that ended on a cut to another set held him in the last room, so the whole dip had no person in it. `cards.mjs` drops the walk's end `set` when the next card is on another set. Same-time `set`s should be an error in lint.
11. **Actors never cast are visible at the world origin,** which is the living room. A gold frame sat in the sofa close-ups. Cast them or leave them out. `check` could warn.
12. **`material2` depends on which submesh is higher.** OPEN. Spawn swaps the two by bounds, so a re-export of the butlers turned the whole flock black until the materials were swapped in the cast. A named slot would be safer.
13. **No gaze at the lens.** FIXED. New card key `sing: <actor>`: he looks at this shot's camera position, released on the next card without it.
14. **No dance mocap on disk.** Only Cheer and Taunt clips. The dance agent brought Mixamo clips. `mx_hh_side_to_side` shows as rejected in `clips.json` and is in use, so its warning on each build is expected until someone looks at why.
15. **Shooting method changed mid-run.** 80 separate shots each carried their own acting and never got good enough. One take on one mark, many cameras: `chorus_take` and `chorus_butlers` in `sequences/chorus.json`. The card holds only the camera. This is the way to shoot anything with a performance in it.

## Sets and props pass (2026-11-06)

- **Black faces in the kit.** FIXED. `bmesh.ops.bevel` frees faces and the next primitive reused those slots ahead of `K.done`, so it stayed on the empty palette corner: every "dark window" in the first cut. `K._paint` now scans after a bevel.
- **`material` turned off received shadows** (fault 3). FIXED. `"shadows": true` on an actor keeps them.
- **A polished floor.** NEW. `"portal":{"mirror":true,"res":[960,540],"min":0.07,"max":0.42}` on a prim quad: `MVDoor.mirror` and `MV/FloorMirror`, a mirrored camera, drawn only while the main camera is over the quad.
- **`call peek` shows nothing in a video with sets.** OPEN. Only clear colour after a `frame`: free angles need real cards, so a look check costs a card's time.
- **Python here has no numpy.** WORKAROUND. `tools/estate_tex.py` runs under `C:\Projects\doseofdestructionwebsite\.venv\Scripts\python.exe`.
16. **`--fast` keeps a material that was missing when the actors were built.** OPEN. New files, a refresh and a `--fast` still drew magenta until `--fast --full`, and a render with no material gives no error. The script that made the material had also failed (no numpy on `py`) and I piped its error away. Spawn should stop on a `material` path that doesn't load, as it does for a model.
17. **Checks before a render.** One `mv frame` first would have saved two magenta renders. A slice render is 90 s, so it's cheap, but a look at one frame is cheaper.
18. **A prim quad's visible side.** The chart became a one-sided `prim:quad`, so it vanished at the heading a cube had worked at. No warning.
19. **`final` reuses shots by hash,** so a fix costs only the changed shots. That makes the note loop cheap: QA, fix, `final`.
20. **QA at v1:** 78 shots, 28 failed, average 7.6, $1.93. Its A faults were real and mostly story: gags that never read. That is what it's best at. Most of its B faults on dance shots are about mirrored arms in the mocap.

## Energy pass (2026-11-06)

21. **A mark is not a look target.** A camera `on:` a prop mark compiles to a fixed `rot`, so a dolly with it swings off the subject and he leaves frame. WORKAROUND: an empty actor (`aim_stage` in `acts/70-energy.json`) and `shot: {look: aim_stage, rot: null}`.
22. **`sing` aimed at the shot's first position only,** so a moving camera lost his eyes. FIXED: `cards.mjs` tweens the gaze along `dolly`/`move`, segment by segment.
23. **`face_act` skipped any spot camera not `on: person`.** FIXED for `stage_*` marks.
24. **Unity's commit charge reached 41 GB after a few fast builds and renders.** The whole machine ran out of commit (fork failures, PowerShell out of memory) until a `refresh` dropped it to under 6 GB. OPEN: `mv refresh` between batches is the workaround.
25. **`speed` shifts scene time for good,** so slow motion would pull every later take off the beat. Freeze hits use the world `steps` cue at the beat rate instead (`{"steps":2.3333,"for":"3b"}`): it holds on each beat and loses no sync, and confetti hangs in the air.
## Dance integration pass (2026-11-07)

26. **Chorus 1's take started two beats late.** FIXED. `dance_chorus` is built from 47.63 s ("I'm your"), but a card can only start it on its first shot, 29:1 (48.49 s, "gateway"), so every hit of the take landed 0.86 s after its word. New perform key `"lead":"2b"` (`MotionScore.cs`, lint knows it): join a take that far in, clips start further on, nothing before it plays. It's in `sequences/chorus.json`. `args` on the sequence, so a baked take still gets it as long as it stays cues. The take is 2 beats short of the run now, so `ch_high_2` holds the end of the hip pop with a raw `anim`.
27. **Walks and cameras.** FIXED for this cut. He stands at z 2.85 from 56.4 to 64.7 s and from 123.2 to 131.2 s, not on the stage mark. `tweaks/walk.json` moves those shots and aims them at new actors `aim_fwd` and `aim_mid`. Everything aimed at `stage_*` on those times is wrong by 1.75 m.
28. **The hall's front wall is at about z 0.9** except in the door bay. `z < 1` away from x 400 puts a camera in the wall, with no warning. `check` could use the hall's solids.
29. **`mv lint` needs `--reindex` after new takes** (fault 5 again), and a shell `cat > /dev/null` of mine hung a build for 3 minutes.
30. **`shuffledFreshWorstMetres` is 6 mm on chorus 1, with ground on or off.** OPEN. Not the ground pass. Probably an inertia transition not measured when a time is first reached out of order.
31. **`dress_sit` on the sofa sinks his shins through the seat** (`darling`). OPEN, and v4 has it too. Moving the mark didn't fix it in two tries.

## Bake pass (2026-11-07)

32. **The broken joints had causes, and most were not the mocap.** Measured at 60 Hz with parts of the stack off: `MVGround`'s per-frame leg IK made most knee, hip and ankle snaps (knee snaps 120 to 29 with it off, knee flips 128 to 15). `overlap` made the wrist snaps and elbow flips (63 to 14, 49 to 15). The 0.07 s `Idle1PointOut` layer blend moved the arm 18-25 degrees in a frame. Retargeted clips bend knees backward on many frames. FIXED for baked takes by `tools/bake.mjs`; live cues are unchanged. Numbers: `bake-report.md`.
33. **The singing gaze was the neck snap.** `sing` aims his head at each shot's camera over the take, chest .2, neck .4 and head 1.0 of the same turn, so up to 1.6 of its `limit`, on a body that may be turned away. FIXED while a bake plays: shares add to 1, 32 degrees at most, fades out behind him. Not changed on live takes.
34. **`lead` and world `steps` both broke a first bake.** A lead applied in the dump and again by the clip's `start` shifted him 52 frames; a stepped section dumped its holds. The dump now takes the take from its true start with steps off.
35. **The ankle 5 cm low after the spin:** the root really does keep -0.05 m after the spin's `root:1`. Bakes use a fixed floor, so baked takes are clean of it. `MVGround` itself is unchanged, so an unbaked take that follows `root` motion with a `move` can still inherit it. OPEN for those.
36. **Sofa (31):** FIXED. The sofa is 0.9 m deep, so at the mark his shins hung inside the seat, and `MVGround` half-applied in a sit and lifted him 15 cm. The three sofa cards turn ground off and sit him on the front of the cushion.
37. **`mv test --only reverse` fails at 29.02 s, in `what_you_like`, 25.5 dB.** OPEN. Same with the walk bakes taken out, and that take isn't baked. Not checked against the code before this pass, so not shown to be older than it.
38. **The point on "you" in chorus 1 is a `reach` now** (`build_ch1.mjs`), with world coordinates for his place at z 2.82, like the stair plants. If the mark moves, move it.
