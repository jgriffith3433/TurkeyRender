# How we make a video

**Start here: `.claude/skills/direct-video/SKILL.md`** is the entry point for directing a video with this system: the procedure stage by stage (`mv make`: board, cards, build, motion, shot, test, previs, final) with the gate at each step, J's standing rules, the judgement rules, the agent choreography and the failure playbook. `Director/HANDOFF.md` is the current state of Hawkes Punch and the system. This file is the reasoning behind the gates and the lessons they came from.

Written after TK Shock (TurkeyRender): 11 full renders, 40 agents, about 4,000 hand-written cues, and about 100 messages from J, many of them reporting the same problem. The aim for the next video is high quality from the first render and far fewer rounds.

## What went wrong

| Pain | Why it happened | The fix |
|---|---|---|
| Arms, hands and poses were bad for 10 rounds | Bodies were built from hand targets and poses over a clip, one cue at a time | A tested library of performances. Shots pick from it. Raw `reach` and `pose` are for contact only |
| Faults were seen by J first | Agents checked stills. Nobody watched motion. Scans came last | Each shot gets checked in motion, by tools then a reviewer, before J sees it |
| One bug cost days | Ticker `speed` ran scene time 300 times too fast. Nothing checked the score | A linter runs before every build, and known traps become errors |
| Remote, door, ceiling and hang were fixed many times | Contact was tuned per shot, and props were placed by guesswork | Tested grips per prop. Sets are built with their contacts marked |
| Whole renders took an hour, then told us little | The render was the only way to see the video | Previs first, then one shot at a time. Full renders are rare |
| Waiting on Unity | Up to ten agents shared one Unity, with full rebuilds | One queue, one build, smaller builds |
| Story moments missed | Effects and colour replaced events. Agents worked from a storyboard, not a performance | Each shot states its one idea and what the viewer must feel, and is approved in previs |
| Late model problems | Models were remade while animation was underway | The character is finished and tested before any shot is animated |
| Late design changes | The double, the kaiju and the chorus were built before anyone saw them work | Risky gags are tested in previs and cut early |

## The gates

**`mv make` runs them** (2026-11-08, AGENTS.md "Making a video"): board, cards, build, motion, shot, test (J's yes per hero shot), previs with the
cold view, final with the report. It stops at the first failed gate and says what to fix, file and field. Nothing below is left to memory.

J looks at each gate once. Nothing moves on until it passes.

1. **Brief.** Song, story in five sentences, tone, the character's arc.
2. **Song map.** Bars, sections, hits, lyrics.
3. **Beat sheet.** One line per shot: time, what happens, what we feel.
4. **Previs.** Grey sets and the real character, real performances and cameras, cut to the song, under 15 minutes to render. This is where story, pace and staging get approved. J's first watch.
5. **Animation.** Each shot polished one at a time, then passes the checks below.
6. **Look.** Sets, light, colour, effects.
7. **Sound.**
8. **Final.** Full render, full scan, independent review. Then J.

**Review in motion, every render.** `node Director/tools/review_strips.mjs --video <mp4> --start <song s at file 0> [--check <motioncheck json>] [--cuts]`:
- **What it finds:** pops inside shots (a frame-difference spike in any of 48 frame regions, so a snap in one arm is not diluted by the whole frame) and the motion check's visible problems, plus, with `--cuts`, 3 frames either side of each cut.
- **What it writes:** strips of 13 consecutive frames around each one, with an `index.md` (file and song times), in `videos/<v>/review-strips/<name>/`.
- **How long:** about 30 s for 70 s of video.

Look at every strip before calling a render good. A strip is 13 neighbouring frames, so a snap, a flip, splayed fingers or a flail shows as motion, not as a single still. The punch impact and cuts read as pops by design. Since 2026-11-07.

## A shot is done when

- The linter is clean.
- `motioncheck` shows no visible clip, pop, over-reach or slide on the subject.
- `mv shotcheck` has no A fault on it: the subject's eyes in frame, the face not cut, nobody off his mark or standing where he sits, the subject readable against its background, no camera inside a body, props on their bones (AGENTS.md "Shot checks"). A deliberate exception is a card tag (`ecu insert pov dark offmark`), not `--allow-shot`.
- Silhouette reads, one clear line of action, no twinned limbs.
- Weight: anticipation, hit, settle. Holds between moves.
- Face and eyes change: a blink on turns, no stuck expression.
- Hands: relaxed curl, or a tested grip on the prop.
- Motion was watched at 30 fps, not judged from stills.
- `qa.mjs <shot> --strict` passes.
- A reviewer who didn't animate it passes it.

## Speed

**Reuse finished shots.** `mv final [--w 1280 --h 720 --fps 30 --plan --force --name v3]` renders only the shots that changed and stitches the rest from their saved renders, in `videos/<v>/final/<w>x<h>-<fps>/`. `--plan` says what it would do and changes nothing. The Room has a Final render button and shows the report; it is also in `final/report.md`.

- A shot's hash comes from the compiled score (`tools/mv/shotdeps.mjs`), so card, take, tweak, note, style, sequence, set, lighting and mood all count, and words that change no picture don't. It takes every cue inside the shot, every earlier cue still running or still holding, the actors on screen and anyone they or the camera name, plus their model files, the performances they play, the engine's code, the song, and the frame size. A doubt means a render, never a stale shot.
- A saved render is used only when the hash matches and the file really has that size, frame rate and frame count.
- Shots are cut to whole frames, each frame in exactly one shot. Picture joins without re-encoding. Sound isn't joined: song and sfx are mixed once over the whole video, so a seam has no sound of its own. Every final checks frame count, frame spacing and clicks at seams.
- Tested on Touch Grass at 1280x720, 30 fps: 20 shots, full render 8.7 min. One card tweaked: that shot plus one another agent had changed rendered, 249 of 2250 frames, 3.8 min, 18 shots reused and frame-identical to the render before, join clean. Taking the tweak out planned 0 renders.
- `--plan` prints why each shot renders, one line each, and a summary: shots and frames reused, the reasons grouped, and the minutes at the last final's pace. A real `final` prints the expected minutes first, before the queue, and keeps them in `final/progress.json`.
- **The Review Room note loop is the fast iteration** (`room/auto.mjs`, AGENTS.md "The note loop"): a note J saves becomes a card tweak, a build, one shot's render, before and after clips, QA and the 30 fps review of that shot, with the status on the note. Proven on greener v9, 2026-11-07: a timing note went from saved to fixed in 84 s (build 26 s, render 14 s, QA 11 s, review 11 s); a framing note was rendered and left open in 87 s because QA scored it 5.9; a vague note was left open with a question in 7 s. Nine full renders on Greener cost about 17 minutes each; a note costs a minute and a half.
- **Previs plays the baked takes.** The build picks a bake by key when it exists, at every quality, so the first rough cut already shows the cleaned motion; `mv previs` prints how many takes played baked and names any that played from source. Measured on greener (2026-11-07, 27 of 27 takes baked): the whole cut, 1858 frames at 12 fps, 426x240, in 78 s (24 fps of render); a 20 s range (36-56 s) in 8.9 s baked against 11.6 s from source, so the bakes make previs about a quarter faster as well, because the runtime stack (ground, limits, overlap, gaze) stands down while a bake plays. The plain build was 28.5 s with the bakes and 32.9 s without. Previs is no longer where the time goes: a build and a full previs is under two minutes.
- **`mv shot` keeps every frame**: picture from Unity, sound mixed and muxed in Node (`tools/mv/sound.mjs`). Transport.cs's `-shortest` mux dropped the last 2 frames of a shot (hook_3: 112 frames now, 110 before).
- **A second render lane is not worth it on this laptop.** Measured 2026-11-07 while the loop ran: the editor alone is 5.9 GB working set and 9.7 GB commit, the machine has 15.8 GB with 1.0 GB free and 29 GB of 65 GB commit in use, one Intel iGPU with 2 GB shared VRAM and no second GPU. A second editor needs its own copy of the project (Assets 2.4 GB plus Library 3.8 GB on disk) and about the same memory again, so it would page the first one out, and the two out-of-memory crashes on Greener came at about 40 GB of commit, which a second editor would reach. `-batchmode -nographics` cannot render. A second editor was not started: the only Unity here was in use by the motion library work and the loss would be hours. Single-lane pace for reference: a 20 s range at previs quality in 8.9 s, a 3.7 s shot at 640x360 draft in 7.8 s, a 1280x720 final at about 0.22 s a frame. The second lane belongs on a second machine, as RETRO.md says, or on a box with 32 GB and a discrete GPU; the mv queue already shares one Unity fairly.
- **Freeze the engine before polish.** `mv freeze` locks the engine's and his model's hashes in `videos/<v>/freeze.json`. From then on `mv final --plan` warns in red when either moved (every shot would re-render) and `mv cards` warns on any C# change. Engine and model changes happen before the slice; after it they wait for the next video, or are a deliberate `mv thaw`. On Greener every version from v3 to v8 changed the engine or the model, so shot reuse paid once in nine renders.
- **Three gates before a render J sees.** The bake gate: every build bakes the stale takes and writes `videos/<v>/bake-report.json`; `mv final` and `mv render` refuse when it fails `library/bake-gate.json` (`mv bake status`, `--allow-bake`). The shot gate: `mv shot`, `mv render` and `mv final` refuse on an A shot fault in what they render (`mv shotcheck`: the subject's eyes out of frame, the face cut 40% at an edge, the camera inside a body, an actor standing where his clip sits or 60 cm off his mark, a subject that can't be read against its surroundings, a prop 8 cm off its bone; `--allow-shot`). The review: `mv final` ends by running `mv review` on the file and printing the A faults; no version with an A fault goes to J.
- **The key covers the native path** (2026-11-07). On a native video the engine hash adds `Editor/Native/NativeCompile.cs`, `MVClipClean.cs` and `MVClipImport.cs` (old videos keep their hash, so their saved renders stay good). Every clip a shot plays is its own part, stamped from the file, its import settings (`.meta`), its `import.json` choices and, for a native actor, its clean copy; materials and textures an actor names are `files <actor>`. Unit checks in `node Director/tools/mv/shotdeps.mjs test`: a reimported clip re-renders only the shots that play it, a new clean copy changes nothing on the old path and re-renders the native shots that play it.
- **Reviews carry.** The review after a final asks Claude only about shots whose picture changed (and the shot after each, whose cut strip shows its last frames); the rest keep their verdicts by shot hash (`videos/<v>/review/verdicts.json`). A one-shot fix costs about two shots of vision, not the whole video's $1.50. `mv final --plan` prints the count and the price.
- **A one-shot fix, end to end** (measured 2026-11-07 on `_cards_test` at 320x180, 13 shots, 204 s): the first final rendered everything and reviewed 12 shots for $0.16. One card tweaked (`cold_top` lens): `final --plan` in 1.4 s said 1 of 13 shots, 82 of 6126 frames, and 2 shots to review; the real `final` took 74 s door to door (25 s of it waiting in the queue: build, one shot, stitch with a clean join, review), and the review asked only `cold_top` and the shot after it, carried 10 verdicts and cost $0.016. Taking the tweak out planned 0 renders and 0 reviews. Before: the plan took 10-15 s (a card compile re-read all the C# for the key list), a new label re-asked every shot, and a re-cleaned or reimported clip was invisible to the key. At full size the render part scales with the shot's frames (about 0.22 s a frame at 1280x720), so a 4 s shot is about 30 s of render on top of the build and stitch.
- Limits: an engine change renders every shot, which is correct and costs a full render. Bakes are not in the key yet: a re-bake under the same key (MVBake code changed) needs `--force` on the shots that play it, or an engine edit. A change to his performance can re-render later shots he is in. The lawn's `push` names him, so he counts on shots that hide him too. A prefab's pack counts as a whole, so a change anywhere in that pack re-renders the shots that show it. Not yet compared frame by frame with a `--force` render.

**Note loop.** `room/auto.mjs`: the Room's server starts it when a note is saved. It finds the shot, has Claude (through Gen's `llm.json`, no GPU) turn the note into a tweak in `tweaks/zz-room.json`, proves it compiles and changes something, builds, renders the shot, cuts before and after, and runs QA. A note too big or unclear, or one that fails, stays open with a one-line reason J can answer. `--dry` stops once the change is chosen.

- Tested without Unity only: finding the shot, choosing a tweak, leaving a big note and a vague note open with a reason, and the Room showing it. The build, render, before and after, QA and Take the change out steps have not run end to end yet.

- **Keep the one Unity busy, and keep everything else off it** (2026-11-07). The rules for agents:
  - **Unity work:** one agent per video owns its Unity work (build, render, motion check, shot check). It takes queue turns and batches its work into a few long turns.
  - **Work that never touches Unity:** other agents run in parallel on cards, clips, sound, the catalog, review and tools.
  - **C# changes:** only through `mv csharp apply <staging-dir>` (it takes `Director/gen/compile.lock`, snapshots, compiles and reverts on error; AGENTS.md "Working beside other agents"). Never copy into Assets by hand. Keep compile windows few. Nobody compiles while a final is rendering.
  - **Long work:** full finals, clip previews and batch bakes go in long turns when J is away (overnight) and never block a slice he is waiting for.

## Rules that came from J

Fully real-time 3D, no AI video. AI motion data and textures are allowed. J directs and never works in Unity. Music videos hit the beat; a non-music short (Hawkes Punch, J 2026-11-07: "not a music video but rather the fun video") has no song in any output, no singing or lyric faces, and is paced for comedy: jokes breathe, dead air goes. Mostly cuts, calm camera with a dead zone, no shake without a reason. Stillness beats flailing for emotional moments. Events, not camera changes. Effects punctuate and never hide weak content. No Hawkes branding on these videos unless J asks.

## Lessons from Greener (2026-11-06)

Full retrospective, with numbers: `videos/greener/RETRO.md`. The order for the next video: brief, song map, motion library, choreography takes baked and judged at speed, a 20 s slice at full quality, cameras and cut, gags, look, 30 fps review gate, final. Freeze the engine before polish so `final` reuses shots.


- **Shoot it like a real video.** One continuous dance take per section, several cameras on that take, gags cut in on top. Don't animate 80 shots one by one.
- **Slice first.** Make 20 seconds great at full quality before rolling out to the whole song.
- **Judge motion, never stills.** Any frame of a bad performance can look fine. Step strips at 15 fps. Greener v1 and v2 looked good in sheets and moved badly. `mv review` does this by rule now: consecutive 30 fps frames at every cut and spike, read by Claude against the standard, on every final.
- **Measure dance against the song.** Accents per bar, worst gap between accents, longest hold. A fast song needs a body hit at least every 2 beats.
- **Check the source clip first.** The scarecrow arms and lack of motion were in the clip. Overlays only deadened it. The local collection has no dance mocap; Mixamo is the dance source.
- **Unity is the limit.** More agents queue longer. Keep two on Unity at most. Extra agents should work on data, review or story.
- **Agents that don't build are the most useful.** The blunt reviewer found more than the builders, and the story editor found the real story faults. Use both on every video.
- **Set a deadline.** Polish fills any time. Time-box, render, then fix what a viewer would notice.
- **Measure the rig before believing a floor number.** The rig's Toes bone is the tip of a stiff foot, ankle 12.5 cm up, and Unity's mesh bounds run 17 cm below the sole. Lifting takes by hand hid pointed feet, which read as hovering on tiptoe. The ground pass replaces those lifts.
- **Nothing tweens on a cut.** A `gaze` of 0.2 s from the cut turned his chest and head through the first frames of 63 of 77 shots, and any camera on a bone went with him. That was the jump 2-3 frames in. A take that starts on a cut also needs its `stance` and `gaze` at `for: 0`, or the bake keeps the tween: `settle: 0.01, blend: 0` in `args` (`tweaks/zz-cuts.json`).
- **Bake every human take.** `node Director/tools/bake.mjs` takes the finished motion to one clean clip: snaps went from 1954 to 2 on Greener. Most snaps came from our own fixes stacked on clips: per-frame leg IK, overlap, quick layer blends. Measure joints at 60 Hz; don't look for snaps by eye at low rates.
- **Trust J at full speed over any sheet.** A one or two frame snap falls between samples. When J reports a fault, believe it and find it.
- **Blades, cups and small props:** a world-fixed prop with a hand reach is steadier than parenting to the hand. Pinch small things from the index fingertip bone. Don't swap between two copies of a prop in view.
- **Start a hand already in place on a cut.** A `reach` that begins just after a cut reads as a snap.
- **Traps:** a `reach` with no release keeps pulling, even from another set. A `keys` cue holds its last pose without `release`. A performance isn't cut at `for`, so a take must be exactly as long as it plays. An uncast prop stays visible at the world origin. A character material or person change re-renders every shot he's in, so `final` reuse helps only for changes that touch few shots.

## Lessons from Hawkes Punch (2026-11-07)

- **The breakage was our engine, not Unity.** Clip sampling was exact. The stages we added on top bent joints by tens of degrees, up to 91° on the feet: ground, limits, finger curl, inertial transitions and additive layers. New videos run on the native hybrid: Unity's Animator, cleaned clips, and acting from clips. Reach, gaze and grips come after the Animator. See `review/engine-fidelity.md`.
- **Mixamo clips carry their own faults.** Clean them once (`call cleanclips`) and pick by the catalog (`library/motion/catalog.md`), not by name.
- **Most of what is left is cameras and staging.** In the first native slice, 8 of 11 faults were framing, marks, readability, a prop and continuity. The shot checks in `mv motioncheck --checks shot` catch these before a render.
- **No body contact between two actors without a paired clip.** Sell it with the cut: wind-up, hard cut on the hit, reaction.
- **Lengthening a video is one command.** Adding the symptoms scene meant hand-rebasing song.json, 91 sfx cues, the lines tool, lyrics, cut pins and the cast act (PIPELINE-LOG entry 26). `mv cards insert <at> <length>` (and `remove`) does all of it, with a backup and a rebase map, refuses on anything it can't place, and proves the cut before writing. On a copy of Hawkes Punch: insert 2 bars at 26:1 moved 489 of 617 compiled cues exactly 8 beats and left 128 alone, the song and its copies grew by exactly 5.032 s with silence in the gap and the music after it level-matched, and removing the 2 bars again gave back every one of 7711 values in the acts, lyrics, duck and sfx map, the song's beats, sections and envelopes, and a byte-identical `50-cards.json`. Against entry 26's hand rebase the map agrees within 3 ms. Times in a tool's code are the trap: put them in data (`punch_lines.mjs --export`).
- **A comedy short is timed by its lines.** `len` takes seconds; a pin takes a name plus an offset (`"at":"ask_done+0.4s"`). The full dialogue clock (a fixed tempo used only as a ruler, a clock that grows with the cut) is designed, not built: `docs/dialogue-clock.md`.

## Known traps

- `speed` on a cue that isn't a time cue changes scene time, unless it's `gfx`. Check any new cue with a `speed` key.
- Array `look` on a shot breaks the build. Use an actor, or `rot`.
- `flip` on a `tv` cue fires a full-frame flip.
- `reach` to his own bones reads a stale position.
- `keys` with `root` on the same time as `set` loses the root. Offset by 0.01 s.
- `jump` on the same time as `detach` pins the object. Offset by 0.01 s.
- A ragdoll that starts on a `set` inherits a huge speed. Start it a frame later.
- Clips at high speed to cancel slow motion read as jumpy. Hold poses instead.
- `person2` FBX imports with her shape keys at 100. A time-zero `face` cue holds them at 0.
- Directional lights in one part light every other part. Switch them off at the end of their part.
- Sets left on all the time slow every frame. Give each `from` and `until`.
- The `rgb` look key sets `_MV_Rgb` but the shader reads `_MV_RGB`, so `rgb` cues do nothing. Fixing it changes TK Shock if re-rendered.
- A cut detector fails in the dark. Don't trust cut counts in dark shots.
- A key the compiler doesn't use does nothing, and nothing used to say so. `mv lint` and `mv cards check` now warn with file, line and a fix (`--strict` makes them errors). What they can't see: a key read in shared code for every kind of cue (`clip` on a `reach`) still passes.
- `color`, `emission`, `smooth`, `metal` and `texture` only work on prims. On a model file they do nothing: use `skin` or `material`.
- Under a `parent`, a set piece's `pos` is an offset from the parent, not from the set's origin. The parent must come first in the set.
- `face` on a card only turns him when his mark changes. On the same mark it is ignored, while the camera still reads it. Add a mark on the same spot.
- `args` on a card only count on the card that starts the performance. A take that runs on over a cut keeps the first card's.
- Every other key on a `perform` cue is a parameter, so a wrong name vanishes. Lint now checks them against the performance file.
- Frames from a failed build look fine. `frame`, `sheet`, `shot`, `render` and `previs` refuse a stale scene; don't reach for `--allow-stale` to get past it. C# changes aren't covered: build after one.
- A `grade`, `sky` or `light` cue on a cut is a tween, so at 0 on its own first frame. `for: 0` means already there. Cards do this for moods and lighting; a raw cue on a cut needs it too.
- `motioncheck.json` is the last run, whatever its range. The whole cut's reading is `motioncheck-runs/latest-all.json`.
- Camera and staging faults outnumber animation faults once the motion is clean (Hawkes Punch slice: 8 of 11). Frames and the motion check couldn't see them; `mv shotcheck` can, in seconds, before a render.
- Anything that touches a native body inside our tracks sees the Animator's last pose: since 2026-11-08 it runs after the Animator (`Runtime/MVLate.cs`). New code that reads or writes a native body's bones in a track must go through it, or it is a frame late, or overwritten.
- Broadcast text on a long lens: the graphics plane follows the lens now (`MVGfx.FitCanvases`); at a fixed 0.12 m TMP text vanished on anything over about 50 mm while its bars still drew.
- A card that names the same mark after a `fly` or `fold` in an earlier card has finished now puts the actor back on it (cards.mjs, 2026-11-08; Hawkes Punch w_out was 51 m off `throw_r`). A card with no mark still leaves him where he is, and a fly still running over the cut is left alone.
