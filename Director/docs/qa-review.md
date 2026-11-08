# Judging a render: motion check, shot checks, QA, review, strips, the critic, cold view

The rule above every tool: **never call motion good from a still.** A contact sheet, a `cards sheet`, a posecheck PNG are staging only.
Motion is judged from consecutive 24 fps strips, the critic's score and a reviewer who didn't animate it; then J at full speed with sound.
Every render praised from sheets was rejected (Greener v1, v3, v5; TK Shock; Hawkes Punch v1). When J reports a fault, believe it and find
it: a one or two frame snap falls between samples. The standard every reviewer reads: `Director/review/STANDARD.md` (contact, clear
pose, weight, hold and move, face and eyes, staging, screen frame; faults A breaks the shot / B noticeable / C minor, with time and the
smallest fix). The Read tool shows a cached image for a path rewritten under the same name: `mv snap <image>` first.

## Motion check (joints, contact, props, floor, pops)

`mv motioncheck <from> <to> [--every 0.1 --on person,p4_grab --budget 60 --checks joint|shot|contact]` (or `call motioncheck`) walks
the timeline without rendering and writes `Director/captures/motioncheck.json` and `motioncheck-report.md`: time ranges per shot, ranked by
what the shot's camera sees (closer and larger first; bodies wholly behind something the camera sees are not reported: rays against the
real meshes). Every humanoid plus hero turkeys. **joint**: elbow or knee past 150 or bent backward, shoulder behind 60 / across 50 / twist
120, wrist 70, ankle 65, spine, neck and head 45 per joint, head turn 80, nod 75, hip forward 135 / back 35 / out 60 / across 30 / twist
70, collarbone 45. **overreach**: a bone longer than it was, or a `reach` target beyond the arm. **prop**: capsules against temporary
MeshColliders on each visible mesh (crowds and other skinned meshes a box at 70% of bounds). **self**, **bodies**: capsules against
capsules. **floor**, **float**. **footslide**, **pop-rot**, **pop-move**, **bodyslide** on all 30 fps frames, not across cuts and not during
`steps`. **hand**: a finished `reach` or an `attach` over 3 cm off. 2 cm is ignored as contact; attached items ignored; `stretch` and `suck`
skip a body. Each piece takes its own queue turn; pieces stop at `--budget`. It changes nothing in the scene (`sceneDirtied` says so).
Ragdoll and hard-falling poses read as contorted by design. `mv motioncheck --shot <n|name>` checks one shot. Runs are kept in
`captures/motioncheck-runs/` with `latest-<range>.json|.md` (`latest-all` is the whole cut; `motioncheck.json` is only the last run) and
compared with the last run of the same range or the pinned one (`--set-baseline`): `new`, `fixed`, `same`. `call motioncheck-selftest`.
`mv motion <from> <to>` is the silhouette sheet with the hips path, pops and foot slide (`Director/captures/motion.png`).

## Shot checks (camera and staging; 2026-11-07)

On the first native Hawkes Punch slice 8 of 11 faults were these, not animation. Six checks inside the motion-check walk, on samples only,
each with a level: **A stops a render**, B is reported. They read the cards through `captures/shotspec.json` (`tools/mv/shotspec.mjs`:
whose shot it is, each cast actor's mark and clip, each clip's measured hips height from `library/clips.json`). A fault "lasts" when it
covers 0.3 s or 35% of its shot.
- **frame**: the subject (the card camera's `on:` actor, else the first human in the cast) with both eyes in frame (A when lasting), the
  face not cut 30% (B) or 40% (A, lasting) at the top or a side, eyes not in the top 7% (B), the body not 35% (B) or 50% (A) out at a side
  when the frame holds at least a metre at the head; a named subject wholly out of frame is A. Other actors facing the camera get the face
  and body edge checks as B. Off for `extreme-close-up`/the `ecu` tag, or a frame under 30 cm at the head; a bone subject or the `insert`
  tag only asks that the bone is in frame.
- **gesture**: a hand or foot peaking above 1.2 m/s mid-shot while outside the frame by up to one frame height with the head or chest in it. B.
- **mark**: a cast human's root more than 30 cm from its card mark (hips 75 cm), A at 60 cm lasting; standing where the card's clip or the
  playing clip sits (hips 15 cm over the clip's measured top), A when lasting. Only actors on camera, not during walk, fly, jump, ragdoll,
  throws, keys or root motion, not attached, not with `offmark`.
- **readable**: one 160x90 render of the shot's camera at its middle; the subject's pixels against a ring around them (the larger of the
  luminance step and 0.6 of the colour distance): under 0.07 B, under 0.035 A. `dark` skips it. `--probes` keeps the frames in
  `captures/shotcheck-probes/`.
- **camin**: the camera's near plane inside any body capsule (the head 2.5 cm wider): always A. A POV and the `pov` tag are allowed.
- **propat**: a prop `attach`ed to a bone other than a hand more than 3 cm from that bone's pose plus `pos` (A at 8 cm lasting); a prop
  parented to a body's root within 30 cm of the head, neck, chest or a hand, drifting more than 3 cm from that bone.

`mv shotcheck [--from --to | --shot n --probes]` runs only these (10-18 s per minute of clinic, about 40 s a minute over Hawkes Punch);
a full `mv motioncheck` includes them. Card tags for deliberate shots: `tags: [ecu]`, `insert` (only on a true insert, never on a person's
single: that shortcut hid every cut-off head in the clinic), `pov`, `dark`, `offmark`. Each run is kept in `captures/shotcheck.json` with
the hash of its inputs. **The shot gate:** `mv shot`, `mv render` and `mv final` check what they render (the kept report when inputs are
unchanged, else fresh) and refuse on an A fault; `--allow-shot` renders anyway. `mv cards` ends with `shot check: 2 A, 5 B (frame 3,
mark 2...)` from a 5 Hz pass (`--no-shotcheck`). Calibration: `videos/_shotcheck_test`. `call camprobe '{"t":1.47}'` compares the
walk's camera with `mv frame`'s.

## Review strips (`tools/review_strips.mjs`, 2026-11-07)

`node Director/tools/review_strips.mjs --video <mp4> --start <song s at file 0> [--check <motioncheck json>] [--cuts]` finds pops inside
shots (a frame-difference spike in any of 48 frame regions, so a snap in one arm isn't diluted) and the motion check's visible problems,
plus with `--cuts` 3 frames either side of each cut, and writes strips of 13 consecutive frames with an `index.md` (file and song times) in
`videos/<v>/review-strips/<name>/`. About 30 s for 70 s of video. Step every strip before calling a render good. The punch impact and
cuts read as pops by design.

## QA (`tools/qa.mjs`)

`node Director/tools/qa.mjs <shot|all>` (a number, a word of its name, a time, or a range `32-34`) reviews the shot's own `mv shot` render
when newer than the last full render, else that part of the full render; no Unity except for motion check. Each shot gets stepped sheets
(12 frames per 3 s) and a 30 fps burst at its busiest moments (`videos/<v>/shots/<id>/sheet.jpg`, `burst.jpg`); measurements at 160x90
(`flipFrames`, `pops`, darkness, white-out, subject size, the cut's distance from the beat grid); `mv motioncheck` for its time if Unity
is free; Claude vision through Hawkes Gen (`llm.json`, project `tkshock`, Sonnet, about $0.025 a shot) with STANDARD.md, the card and the
measurements; `shots/<id>/qa.json` with a score out of 10. An A fault seen for certain, or a score under 7, fails. `--strict` exits 2 if
any fails (the gate); `--notes` sends failing shots' certain A and B faults to the Review Room as notes with source `qa` (the QA tab, not
J's Open list); `shots/qa-report.md|json` rank every shot (`qa.mjs report`); `--render f.mp4 --label x` reviews an old render cut by
detected cuts; `--no-vision`; `--force`. Unchanged shots cost nothing (hash of sheets and prompt). Story faults need a card with an `idea`.
Calibration: `Director/review/qa-calibration.md`, `node Director/tools/qa-calibrate.mjs <label> --truth v9`; `qa.mjs selftest`. A cut
detector fails in the dark.

## The reviewer (`mv review`, `tools/review.mjs`)

`mv review [<video>] [render.mp4] [--label v9 --no-vision --force --plan]` on a render (default the latest): every frame measured at 160x90
(frame difference, a came-back test, block-matching flow with the camera's shift taken out), a strip of 8 consecutive frames at every cut
and every spike cropped on him, and Claude vision through Gen on each shot's strips with STANDARD.md. `videos/<v>/review/<label>/report.md`
lists A/B/C faults with time, frame, shot and fix; `report.json`; strips in `shots/<id>/`. About $1.50 a video from cold.
**`mv final` runs it on the finished file and prints the A faults** (`--no-review` skips); a version with an A fault is not one for J.
`node Director/tools/review.mjs notes <video> <label> [--sevs A,B]` turns certain A faults into Room notes with source `review`.
**Re-reviews are incremental** (`tools/mv/verdicts.mjs`): verdicts are keyed by the final shot hashes the frames cover (its own and the
shot before), the card's idea and feel, STANDARD.md and the model, in `videos/<v>/review/verdicts.json`; a shot with its key kept carries
its verdict (`carried`, $0); only re-rendered shots and the shot after each are asked. `--plan` lists what would be asked and spends
nothing; `review.mjs adopt <video> <label>` keeps an earlier review by hashes; `review.mjs test`. `reviewRender(V, file, { offset })`
reviews a shot render against the cards it overlaps (the note loop uses it).

## The motion critic (`tools/critic.mjs`, `tools/critic/measures.mjs`; design `Director/review/motion-critic.md`)

Judges animation from per-frame bone dumps, no render, the way an animator's eye would, so good motion is told from bad before a frame
renders. Dumps: a clip through `call clipbones` (the clip played by Unity's own Animator on his Avatar, Foot IK off, 30 fps; a keyed sheet
through its derived clip; the clean copy where `import.json` says so, `--raw` otherwise), a cut through `call shotbones` per actor over a
range of the built timeline (20 s a call, each a queue ticket) with the shot boundaries so a step across a cut is never a snap. Cached in
`Director/gen/critic/clips/<clip>.json` and `videos/<v>/critic/<label>/<actor>.bones.json`.

Twelve principles, each 0-10 through the calibration table `CAL`: arcs, slow in and out, timing (holds, dead frames, fast runs), anticipation
and follow-through, overlap and drag (coherence between parts), weight (centre-of-mass spikes, planted-foot slide, zero-g speed changes
with nothing to push on: `--zerog` or a `zg_`/`hp_` clip), snaps and pops, stiffness (core joints frozen under a moving arm), silhouette
(capsules projected on front, side and three-quarter cameras at the key poses), hands and face (fanned or clawed fingers, a bowed head, eye
and jaw bones that never move), contact (a hand inside the torso or head; with a partner's dump a reach into air), and distance from human
motion (a robust z of the motion's signature against the mocap reference: `library/motion/critic/reference.json`, every `mx_*` clip).
The total is a weighted mean (overlap 1.2, stiffness 1.2, reference 1.5, silhouette .6, contact .6, weight .8, hands .8, the rest 1);
8.5+ reads as human, 7-8.5 passable, 5-7 "looks animated, not acted", under 5 wrong to an animator's eye. The worst five moments are
listed. Reports: `library/motion/critic/<clip>.md`, `videos/<v>/critic/<label>/report.md`, `final/critic.json` on every `mv final`.

- `node Director/tools/critic.mjs clip <name...>` / `pose <sheet>` / `cut <video> [from to] --zerog` / `dump <file>` / `reference` /
  `calibrate` (`library/motion/critic/calibration.md`: catalog grades, the `gm_*` clips, the keyed hero poses) / `test`.
- `critic.mjs vision <mp4> [--report r.json --start <s> --top 6 --budget 1]`: 8 consecutive 24 fps frames at each worst moment, priced
  first (about $0.01 a strip), then Claude through Gen on a fixed checklist (weight 0-10, timing 0-10, reads as human, what is wrong, the
  smallest fix) into the report's `vision` block.
- `mv critic [<video>] [from to] [--on person,other --label x --zerog]` runs it on the built scene under one queue turn. `mv make`'s motion
  stage needs the cut at or above `style.json` `make.critic` (default 7).
- It cannot see blendshape faces, props and set contact, the shot camera, or the picture (light, lens, cuts): those are review and QA.

## The cold view

An agent (or `mv coldview`, Gen vision per 20 s chunk, about $0.015 a chunk) that never read the script retells the previs: what
happened, a timeline with clear/unclear/lost/bored, confusions, grammar faults, top 10 (the shape of `videos/hawkespunch/COLD-VIEW.md`,
`COLD-VIEW-2.md`). Every gap between the retelling and the script gets a fix in the board or the cards, not in the next render. `mv make`'s
previs stage requires every "change" beat of the board to be retold. Planned: an ensemble of personas ([roadmap-system.md](roadmap-system.md)).

## What "done" means for a shot

Linter clean; shotcheck 0 A without `--allow-shot`; motioncheck no visible clip, pop, over-reach or slide on the subject; silhouette reads
with one line of action, no twinned limbs; anticipation, hit, settle, holds between moves; face and eyes change (a blink on turns); hands
relaxed or in a tested grip; strips stepped at 24 fps; critic no red moment; `qa.mjs --strict` passes; a reviewer who didn't animate it
passes it. A hero moment: its 5 s test approved by J (`mv approve`). A final: 0 A in review, flash check PASS, join clean, a cold view with
no "lost" rows, and the report to J naming the file and what changed.
