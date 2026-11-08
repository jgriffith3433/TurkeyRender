---
name: direct-video
description: Direct a video with the TKShock system (Hawkes Punch and the videos after it). The procedure from brief to final with the gate at each step, J's standing rules, the judgement rules a model must not break, how to run the agents, and the failure playbook. Read this before touching Director/, before briefing any agent, and before telling J anything is done.
---

# Directing a video with this system

You are the interface. J directs in chat and watches renders. He never opens Unity, Blender or Cascadeur, never films reference, never runs a command, never poses a character. If a step needs his hands, the step is wrong: build what does it. Every plan that leaned on J's hands has been rejected (J, 2026-11-08: "The goal like I said it to make YOU the interface.").

Read first, every session: `Director/HANDOFF-NOW.md` (the agent roster and the research list, written at the model switch), `Director/HANDOFF.md` (current state), then this file, then `Director/PIPELINE.md` and `AGENTS.md` for any command you are about to run. For Hawkes Punch also `Director/videos/hawkespunch/STORYBOARD.md`, `SPACE-EPIC.md`, `LESSONS-r2.md`, `CLINIC-AD-AUDIT.md`. The craft is in `Director/research/` (`story-and-script-craft.md`, `epic-anime-action.md`, `zero-g-acting.md`).

`mv` below means `node Director/mv.mjs --video <video>`. Set the video once with `mv use <video>` and drop the flag.

## 1. J's standing rules (never break these)

| Rule | J's words or the source |
|---|---|
| **No AI video, no AI footage on screen.** Real-time 3D only. AI is allowed for textures and body motion data on our rigs. | AGENTS.md "Rule from J"; the rejected AI shots stay in `Director/acts_ai`, never bring them back |
| **No music unless it is a music video.** Hawkes Punch has no song in any output: voices, sfx, room tone. Never digital silence: a vacuum bed under everything, the one true silence is the ring-plane gag. | J, 2026-11-07: "not a music video but rather the fun video" |
| **No puns.** Situation and character carry the comedy. | J, 2026-11-08: "don't use jokes like Right in the... Mars. Try something a little better" |
| **Deadpan against epic.** Two registers (`look: plain`, `look: epic`), switched on the cut, never blended. The bigger the feat, the smaller the reaction. | SPACE-EPIC.md; research epic-anime-action 1 |
| **No Hawkes logo or branding** on these videos unless J asks. | PIPELINE.md "Rules that came from J" |
| **No shortcuts.** An `insert` tag to silence a frame check, a blanket `fingers curl`, a prim for a fist, a void for an exterior: each one cost a round. | J, 2026-11-08: "You took almost every possible shortcut you could making this. Don't do that. Make it an epic animation." |
| **Real planet scale.** Planets are planet-sized; a man is a speck beside a moon. Scale reads through the cut (face, then extreme wide, then face). | J: "make the planets actual planet size... think One Punch Man" |
| **GPU spend is priced and capped.** `hawkesgen_estimate` first. Under a few dollars (voices, sfx, motion candidates, vision at about $0.025 a shot): go. More, or any cloud render: ask J with the number. | memory feedback-no-rented-gpus-tkshock |
| **Never commit or push.** Nothing in TKShock is committed by an agent. | AGENTS.md Safety |
| **Never kill Unity.** One editor on this laptop (5.9 GB working set, 15.8 GB machine). Killing it costs every agent its queue turn and a long reload. Wait on `mv queue`, use `mv hold` for several calls, `mv refresh` only when you own the turn. | PIPELINE.md "Speed", AGENTS.md "Unity queue" |
| **Never make `Director/gen/unity.lock` by hand.** The queue writes it. A hand-made lock stalls everyone for 90 s and then stops them. | AGENTS.md "Unity queue" |
| **C# only under `Director/gen/compile.lock`:** your name and the time in it, delete it after, few windows, never during a final render. Stage C# in `Director/staging/<you>/` and compile there first. | PIPELINE.md "Keep the one Unity busy" |
| **Downloads never go to J's Downloads folder.** Mixamo and any site: the export through the site's own API from the page, poll the signed URL, `curl -o` into `Director/gen/...`. Never the browser's Download button. | J, twice; memory feedback-mixamo-downloads |
| **Don't ask J to approve steps.** Decide, run, report. Stop only for money past the cap, a creative choice only he can make, his sign-in, or going live. | J, 2026-11-06: "You need to stop asking me. You do it and continue to make this." |
| **Tell J where to look.** Every report names the file, the time and what changed. He judges at full speed with sound. | AGENTS.md "The loop" |

## 2. The procedure

`mv make` is the one-command pipeline (built 2026-11-08 by the pipeline agent; if `mv make` is missing or a stage is not there yet, run that stage's commands by hand as listed). Its stages, in order: **board, cards, build, motion, shot, test, previs, final**. Each stage has a gate. Nothing moves on until its gate passes, and J looks at each gate once.

### Stage 0: script and storyboard (`mv make board`)

1. **Script** in screenplay form (`videos/<v>/SCRIPT.md`): scene heading, desire, obstacle, turn; dialogue; a setup/payoff ledger; where the audience knows more than the character (suspense, not surprise); the rule of three with a break. Rules: `research/story-and-script-craft.md`.
2. **Storyboard** (`videos/<v>/STORYBOARD.md` + `storyboard/`): one row per shot with id, size and lens, frames at 24 fps, action, line, register, and **what changes** (if nothing turns, cut the shot). Panels are Hawkes Gen sketches (Z-Image Turbo, greyscale with one red accent, cents each), composed into one image per act. The hero moments get their own table: anticipation, strike, impact/hitstop, follow-through, hold, in frames.
3. **Gate:** J approves the board in chat (stills, synopsis a stranger can follow). Nothing is animated before this. Hawkes Punch's board (53 shots, 204 s) passed it on 2026-11-08 ("Look great!"); a change to the board goes back to J, a change to staging does not.

Counting rules for the board (research epic-anime-action 5, story craft): average shot 2.5-4 s; no shot under 18 frames except a strike insert or the impact frame; a burst is at most 3-6 shots and lands on a hold of 2 s or more; roughly a third of screen time is calm and locked off; deadpan holds of 1.5-3 s with no cut; one establishing wide per place; sizes tighten as a scene builds; the camera moves only when motivated (a push-in on a realisation); the 180 line holds (him screen left, the double screen right). J: too many fast cuts are bad. Fewer, longer shots with holds beat many fast ones.

### Stage 1: cards (`mv make cards`)

Cards are the shots (`videos/<v>/cards/*.yaml`, under 10 lines each, `idea` and `feel` required), `cut.json` holds order and length and nothing else, `style.json` the look (`"fps": 24` for Hawkes Punch), sequences per part, sets in `Director/library/sets/`. **The board is the source of truth:** `board2cards.mjs` (the video agent's tool) generates the cut and card skeletons from `storyboard/shots.json`, and hand staging goes in `cards/overrides.yaml`, so a regenerate never loses it. Never hand-edit a generated card or act; edit the board, the overrides or the script that made it.

```
mv cards check            # validates, prints the cut, warns on pacing and length; a wrong name stops it
mv cards sheet            # three labelled frames per card, ~30 s, no render: STAGING only, never motion
mv lint --strict          # every known trap as an error, with file, line and fix
```
Gate: `check` clean, `lint --strict` clean, `cards sheet` read for staging (who is where, sizes, eyelines, the 180 line). When the clock changes use `mv cards insert|remove <at> <len>` (it moves everything, with a backup); on Hawkes Punch then run `node Director/tools/punch_lines.mjs` and `node Director/tools/punch_beds.mjs hawkespunch`, and regenerate `acts/56-space-fx.json` from the card script. **Keep a swapped shot's slot length** so the sound after it stays in place.

### Stage 2: build (`mv make build`)

```
mv build --fast           # working builds (in memory); after any C# change the first --fast rebuilds everything
mv build                  # plain build before J plays, a shot render or a final: dead zones, saved scene, size test
mv shotcheck              # camera and staging faults in seconds, no render (frame, mark, readable, camin, propat, gesture)
```
Gate: build clean (compile errors, native notes and lint read, not skipped), `mv shotcheck` 0 A faults without `--allow-shot`. A deliberate exception is a card tag (`ecu insert pov dark offmark`), and `insert` only on a true insert (the pad, the pen), never on a person's single: that shortcut hid every cut-off head in the clinic from the gate.

### Stage 3: motion (`mv make motion`)

Motion comes from real sources, as candidates, picked by the critic. Never from typed numbers.

1. **Base**: every floating body plays `zg_neutral` (or a variant `_a`..`_d` so two copies never mirror); ground scenes play catalog clips (`mv clips <use>` prints the best clips for a use; a B clip's "needs" line is a to-do, not optional).
2. **Candidates** for a hero beat, 3-6 of them: a clip segment from the catalog (`library/motion/catalog.md`), a CMU or Protofactor mocap clip (`py Director/tools/mocap_fetch.py status`; `Director/gen/mocap/`), a Gen motion job (`motion.from-text` BVH only, retargeted with the bone map in `Director/gen/genmotion/GEN-BUGS.md`; `motion.from-video` on public-domain footage), physics (ragdoll, `fly`, `throwobj`), or a pose sheet **seeded from a real frame** (`"from": {"clip": "mx_cross_punch", "t": 0.42}`) with small `add` offsets. A pose sheet built from 95 raw muscle numbers is how we got "1/10": don't.
3. **Critic**: `node Director/tools/critic.mjs clip <name...>` or `pose <sheet>` scores each candidate on the twelve principles against real mocap (`library/motion/critic/<name>.md`). Pick by score and by the mp4, then confirm with `mv call posecheck '{"sheet":"<name>"}'` (`library/poses/check/<name>.mp4`, front | three-quarter | side at 24 fps) and `node Director/tools/clip_catalog.mjs strips <clip>` (every frame at 15 fps in rows). Judge the mp4 and the strips at speed. Never the png alone.
4. **Clean and import** new clips once: `mv call clipimport '{"apply":true}'`, `mv call cleanclips`, previews and verdicts into the catalog, `mv lint --reindex`.
5. Gate: for every hero beat a named clip or sheet with a critic score, a posecheck mp4 watched, and the zero-g checklist (section 4) ticked. For the whole cut, `node Director/tools/critic.mjs cut <video> [from to] --zerog` on the space range and no red moment left unexplained.

### Stage 4: shot (`mv make shot <id>`)

```
mv shot <id>                                   # 640x360 draft with sound and a 1 s handle, contact sheet beside it
node Director/tools/review_strips.mjs --video videos/<v>/shots/<id>.mp4 --start <song s at file 0> --cuts
node Director/tools/qa.mjs <id> --strict       # measurements + vision against review/STANDARD.md, score /10, A faults fail
mv motioncheck --shot <id>                     # joints, contact, props, pops, with the shot checks
```
The shot gate refuses an A shot fault; the bake gate refuses a failing bake report. Gate: strips stepped frame by frame (every strip, not the first three), qa 7 or more with no A, motioncheck clean on the subject, and the "done" list in section 6.

### Stage 5: test (`mv make test <moment>`): the 5-second hero tests

For each hero moment in the board's table (Hawkes Punch: the punch, the moon crater, the lasso throw, the Jupiter catch, setting Earth back, the stop), render its shots as one 3-6 s clip at full quality with sound (`mv shot` of each, or `mv render --from --to` on the range, remuxed through `tools/remix.mjs`), run strips and the critic's vision pass (`node Director/tools/critic.mjs vision <mp4> --start <s>`), fix, repeat until clean, then **show J the 5 s clip and ask yes or no**. One moment at a time, with what to look for. J approves hero moments before any full render; never show him "a 100-second chunk with ten unreviewed changes" (memory feedback-you-are-the-interface).

### Stage 6: previs (`mv make previs`)

```
mv previs --fps 24        # whole cut at 426x240, baked takes, no post; pass --fps 24, it defaults to 12
node Director/tools/review_strips.mjs --video videos/<v>/previs.mp4 --start 0 --cuts
```
Gate: a **cold-viewer pass** by an agent that never read the script (the shape of `COLD-VIEW.md`: what happened, timeline with clear/unclear/lost/bored, confusions, grammar faults, top 10). Every gap between the retelling and the script gets a fix in the cards, not in the next render. Then J watches the previs.

### Stage 7: final (`mv make final`)

```
mv freeze --note "<why>"  # engine and model hashes locked: from here a C# or model change re-renders every shot
mv final --plan           # what renders and why, carried review verdicts, minutes and price; changes nothing
mv final                  # renders only changed shots, stitches, mixes, reviews at 24 fps, flash-checks
```
`mv final` ends by running `mv review` and `tools/flashcheck.mjs`; a version with an A fault or a flash failure is not one for J. Gate: 0 A in `videos/<v>/final/report.md` and `review/<label>/report.md`, flash check PASS, then a cold view of the finished file, then J. Report the exact file, length, size and what changed since the last one he saw.

### The note loop (after J watches)

J leaves notes in the Review Room (http://127.0.0.1:8795, `videos/<v>/notes.json`) or in chat. `node Director/room/next.mjs` hands them out; a timed note on a card video runs by itself (tweak, build, one shot, before and after, QA, review). Work the list yourself, in order of what a viewer would notice; when J reports a fault, believe it and find it, even when your sheets look fine (a one or two frame snap falls between samples).

## 3. Judgement rules a model must not break

1. **Never approve motion from stills.** A contact sheet, a `cards sheet`, a posecheck png: staging only. Motion is judged from consecutive 24 fps strips (`review_strips.mjs`, the catalog strips, the posecheck mp4 stepped) plus the critic score plus `qa.mjs`. Say exactly what you stepped. Every version I praised from sheets, J rejected: v1, v3, v5 on Greener; the whole of TK Shock; Hawkes Punch v1.
2. **Never add a fix on top of a fix. Rebuild the beat.** Ground IK on top of overlap on top of a reach on top of a clip gave 1,954 snaps on Greener. A beat that is wrong after one fix gets a new clip, a new seed or a new staging, not a second cue to cancel the first.
3. **Never key poses from raw numbers.** Seed from real mocap, physics or video-to-motion, pick by the critic, adjust with small offsets, check the mp4. "Hand-keying joint numbers produced 1/10 animation."
4. **Every shot must change something.** The board's "what changes" column is not decoration. A shot where nothing turns is cut, however pretty.
5. **Hero moments get 5-second tests J approves before any full render.** Six on Hawkes Punch. One at a time.
6. **Cutting:** average 2.5-4 s, no shot under 18 frames except strike inserts, bursts of at most 3-6 shots landing on a 2 s hold, a third of screen time calm, cut on contact or action and never on anticipation, the 180 line held, one establishing shot per place, sizes tighten as a scene builds, moves only when motivated. Fewer, longer shots with holds.
7. **The comedy rule:** the bigger the feat, the smaller the reaction. The hold after the boom is the laugh: 1.5-3 s on the plain face, no cut, near silence, then one small sound. No puns. Deadpan on 3s for him, the excitable double on 2s, 1s only inside strikes; the camera always on 1s.
8. **Space must make sense.** One scale per shot. Contact at human scale with the planet as terrain; the disc only from far away, him as a lit figure or a speck with a trail, never a 2-pixel body. One hard sun from screen left, planet bounce, rim always. A scene up and a horizon held per scene. Drift and spin match across cuts. Big things start slow.
9. **Sound is design, not garnish.** Every impact: a 4-8 frame drop-out, the layered hit at -1 dBTP, a rumble tail, then near silence, then one small sound. Dialogue -16 LUFS, beds ducked 6 dB. No digital silence anywhere; the mix is `tools/mv/sound.mjs` with the score's `mix` block.
10. **Trust J at full speed over any sheet or score.**

## 4. The body rules for zero-g (every floating shot)

From `research/zero-g-acting.md` (NASA's Neutral Body Posture) and J's complaints ("the feet are all messed up, the characters are facing the wrong way and they are sitting all weird"):

- Base float is `zg_neutral`: hip 25-50°, knee 35-55°, ankles relaxed and pointed, **toes 0**, head level to a little down (a 10-15° neck tip at most; never thrown back to the sky as the generated clips did, never bowed to the chest: the eyes do the looking), arms floating up and forward, elbows about 75°, fingers relaxed (0.35-0.4). Breath every 4 s, each limb drifting on its own phase.
- **Never a seated pose in space:** hip 70° and knee 70° together, held, reads as a chair. A deliberate tuck lasts under 1.5 s.
- **Arms and hands:** gestures from clips on layers; `reach` only for real contact and started already in place on a cut (`for: 0`); `fingers` only the fingers named, a tested grip per prop, no blanket curl where a hand is posed; never two stacked reach targets (they lock elbows and bend wrists). An arm bent the wrong way or a hand in a fan is an A fault, always.
- Every change of speed or spin has a visible contact that caused it, and the contact moves both bodies equally (same man, same mass). Constant speed between contacts: no ease-to-stop in mid-air. A floating man cannot simply turn to face someone: gaze (neck and head, limit 60) for looks, a contact or a cut for a turn.
- Torsos in a dialogue face each other within 45°; him screen left at about 120°, the double screen right at about 240°; singles look 15-25° off the lens toward the partner.
- Legs in frame for every physics gag; close-ups for the face beat after the physics has read.
- Superhuman beats: long wind-up (or none, for the deadpan hero), 2-4 frame release on 1s with one smear frame, impact frame 2 frames, hitstop 6-8 (18 for the finisher), held follow-through, the giant object starting slow. The hero ignores recoil on planets; ordinary zero-g rules apply to cans and to each other.

## 5. Agent choreography

J wants the work run through parallel subagents, watched, with conflicts cleaned up promptly (memory feedback-tkshock-plan-and-subagents). The split that works:

- **One agent owns Unity per video**: cards compile, build, shot renders, motion check, shot check, previs, final. It takes queue turns and batches work into a few long turns. Everyone else stays off Unity.
- **In parallel, off Unity:** the **motion agent** (candidates, critic, posecheck, clip import windows under the Unity owner's turn), the **sound agent** (lines, beds, sfx through Gen, the mix, captions), the **set agent** (sets json, props, lighting, textures via Blender and `space_tex.py`), the **character agent** (Blender rigs, wardrobe, face shapes, `person.sh`), and the **reviewers**: a blunt 24 fps reviewer and a cold viewer who never read the script. The reviewers found more than the builders on every video; run both early.
- **Brief like a peer**, in the brief itself (it is all the agent has): the goal and the gate it must pass; the files it owns and the files it must not touch; the rules in section 1 (quote them: no AI video, no music, no commits, no Unity unless named, compile.lock, downloads, J never does anything); what to read (this skill, the video's LESSONS and AUDIT, the research file for its craft); how to judge (24 fps strips and the critic, never stills); the price cap; and what to report.
- **What every agent reports:** the files written (absolute paths), the renders made and their times, the strips or mp4s it stepped and what it saw, the critic and qa numbers before and after, what it could not do and why, and traps it found. Not "done": evidence.
- **The WORKLOG** (`Director/gen/WORKLOG-epic.md`, or `WORKLOG-<video>.md`): every agent writes there before touching a shared file (ScoreCompiler, MVPunch, MVLook, cards.mjs, sound.mjs, lint) and says when it releases. Read it before briefing, so two agents never edit one file.
- **Reviewing their work:** step their mp4s yourself; the Read tool shows a cached image for a path overwritten under the same name, so copy a sheet or frame to a fresh file name before Read. Re-run `mv lint --strict` and `mv cards check` after any card-writing agent. Check the queue (`mv queue`) and `Director/gen/compile.lock` before starting Unity work.
- For a short fix list from J, do it yourself in the session: agents take 45-100 minutes and J is waiting.

## 6. What "done" looks like

- **Script and board:** a synopsis a stranger can follow; every plant paid and every payoff planted; every shot changes something; counts within the cutting rules; J's yes in chat.
- **A shot:** linter clean; shotcheck 0 A; motioncheck no visible clip, pop, over-reach or slide on the subject; silhouette reads with one line of action, no twinned limbs; anticipation, hit, settle; face and eyes change (a blink on turns); hands relaxed or in a tested grip; strips stepped at 24 fps; `qa.mjs --strict` passes; a reviewer who did not animate it passes it.
- **A hero moment:** its 5 s test approved by J.
- **Animation (a section):** critic cut report with no red moment, every hero beat from a real source, zero-g checklist ticked, the 24 fps reviewer's A list empty.
- **Look:** two registers readable in one frame each; subject readable against its background (`readable` check); no blown walls, faces with shape, `faceFill` and `catch` so eyes live; one hard sun in space with bounce and rim; the key light at 0 over space cards.
- **Sound:** a bed under every second; every impact with its drop-out, hit and tail; lines at -16 LUFS; the limiter at -1 dBTP; checked by ear on the ring gag, the booms against the lines, and the bed.
- **Text:** captions with outline, shadow and box, cut on and off, clear of lower thirds; a lower third's sub line at 60-70% of the title, held 2.5 s; full-frame cards as hard cuts, no set leaking between pages.
- **Final:** 0 A faults in review, flash check PASS, join clean, a cold view with no "lost" rows, and the report to J naming the file and what changed.

## 7. Failure playbook

| Symptom | What it is | What to do |
|---|---|---|
| Anything odd at the start of a session | Unknown environment state after a model switch or agents overnight. | `mv doctor` first (the hardening agent's environment check: Unity, queue, locks, compile, generated files), then `mv queue`, then `Director/gen/WORKLOG-epic.md`. |
| `build` reports compile errors in `Assets/` | Someone's C# (often a `//` that swallowed a line, or a real newline inside a `$"..."` string). | Read the error's file and line. If it's yours, fix under `compile.lock` from staging (`mv csharp apply` once it exists: it compiles in staging and puts the last good files back on an error); if it's another agent's, give them 10 minutes in the WORKLOG then fix the smallest thing. After a C# edit: `mv refresh`, wait for the reload, then `build` (the first build after a C# change can report the old errors). |
| "waiting for a hand-made unity.lock", 90 s, then stop | A stale `Director/gen/unity.lock` someone wrote by hand, or a dead process's lock. | Never write it yourself. Check `mv queue`; a ticket that stops beating for 2 minutes drops on its own. Do not delete another agent's live lock. |
| Unity out of memory, editor gone or crawling | Two editors, a mesh leak in the lab, a huge scene, or about 40 GB of commit. | One Unity, always. `mv test --only size` (scene under 50 MB). Never start a second editor on this laptop. Do not kill the editor to "fix" it: ask J if it is truly dead. |
| A render looks wrong (bodies in last shot's place, props a frame behind) | Stale scene, or a native body read before the Animator wrote it. | Frame tools refuse a stale scene for a reason: do a plain `build`, never `--allow-stale`. The attach lag was fixed 2026-11-08 (`Runtime/MVLate.cs`): if a prop still trails a hand, `mv call attachprobe` and report; don't tweak offsets to hide it. |
| A prop in the wrong place or sitting on a face in a later card | A shown or attached prop persists across cards until hidden; `show` on a `model: none` parent shows no children. | Detach and hide at the hand-off card. Every ghost part gets its own show and hide. Glasses and the stethoscope ride the head bone with `withHost`, never the root. |
| Bodies through each other, a hand through a face | No paired clip for body contact. | Don't reach to a face or chest. Sell contact with the cut: wind-up in a two-shot, hard cut on the hit, reaction. Stage the can as a throw or a slide, not a hand-to-hand pass. |
| Dark shots, a black tee on black space | Fill or ambient at zero, the stage `key` light on in space, or the subject against black. | `readable` check in `mv shotcheck`; Hawkes Punch moods `hp_space_*` (sunRim 1.3, faceFill 0.45); silhouette him over the lit disc; `light: key intensity 0` at 0 on every space card and back after. |
| Captions unreadable | White text on a white wall, fade style half-transparent. | `type` defaults in `style.json`: `outline 0.32`, `shadow 1`, `box 0.45`, `in`/`out` 0.01. Check on the brightest frame of each shot. |
| A hitstop is 20% short, or bodies don't hold | Frames counted at 30 (old) or the hold falls inside a crossfade. | `"fps": 24` in the score (done on Hawkes Punch); give the clip at the hit `blend: 0`; read the build note that names each skipped hold. `rate`, not `speed`, on a native `anim`/`layer` (`speed` never reaches the clip). |
| Every cast change lands a frame early after a hitstop | The old hitstop paused scene time while song time ran. | Fixed 2026-11-08 (a hold in the warp). If you see it again, report it as an engine fault; don't move cuts to compensate. |
| Planet scale reads wrong, an empty frame, a blurry green carpet | km and m mixed, the camera aimed at 1.4-2 m where the zero-g body's centre is 0.5-0.9 m over its mark, the sunrise focus at 800 km. | Bodies and specks are km from the root, fields and surfaces are metres. Aim at hips height on zero-g marks. `sunrise` needs `alt: 5000`. Moon ground: camera y 1.3 m or more, looking down. `touch Director/gen/space-debug.flag`, render a frame, read `space-debug.txt`, delete the flag. The Atlas hold is unsolved: don't claim it. |
| A layer on Person2 throws both arms out | Open engine fault. | Give her no `g_*` layers; sell her beats with his reaction, a keyed sheet seeded from a real clip, gaze and face. |
| A walk skates on a native body, a blend tree plays one clip | Native roughness (walk at the clip's own pace, heaviest clip). | Derive a clip at the walk's speed, or cut around the walk; one clip per beat. |
| `mv shot` preview has no bed under it | `sound.mjs` mixes only sfx that start inside the window. | The final is right; judge beds on `mv final`, or a `remix.mjs` of a range. |
| A note from J you can't see in your sheets | A one or two frame snap between samples. | Step 24 fps strips around his time; `mv motioncheck` at `--every 0.05`; believe him. |

## 8. What J said he wants (his words)

- "The goal like I said it to make YOU the interface." (2026-11-08)
- "You took almost every possible shortcut you could making this. Don't do that. Make it an epic animation." (2026-11-08)
- "make the planets actual planet size. This should be epic in space... think One Punch Man" (2026-11-08)
- "don't use jokes like Right in the... Mars. Try something a little better" (2026-11-08)
- "Don't you understand the flow of a video? There's a way to tell stories with timing, subjects, props, zoom, pauses, and dialogue and suspense etc." (2026-11-08)
- "Are you not understanding how to make animations? Real talk here." (2026-11-08) He rated the animation 1/10.
- "the feet are all messed up, the characters are facing the wrong way and they are sitting all weird. They aren't interacting like they are in space at all and their interactions are awkward." (on the space pass)
- "make the entire video how we wanted it without taking all these shortcuts" (2026-11-08)
- "not a music video but rather the fun video" (2026-11-07: no music)
- "You need to stop asking me. You do it and continue to make this. Add these as subagents and watch over them and keep adding more to it making it better." (2026-11-06)
- "make this an amazing music video production software" (2026-11-07)
- "the animation needs a LOT of work" (Greener, said three times), "much much better" (TK Shock v7)
- "Let's leave the rented GPUs alone for now." (2026-11-06; motion and voices reopened 2026-11-08, priced)
- Nothing may land in his Downloads folder (said twice).
