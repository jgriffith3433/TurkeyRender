# TKShock: a real-time 3D video director system, driven from chat

**J directs in chat and watches renders. Claude is the interface.** J never opens Unity, Blender or Cascadeur, never films reference,
never runs a command, never poses a character. If a step would need his hands, the step is wrong: build what does it. Videos are **cards**
(one shot in a few lines) compiled to a score that one Unity builds and renders; everything is a pure function of time, so any frame
can be computed on its own and scrubbing and reverse work. First video: TK Shock (a music video). Current: **Hawkes Punch**, a 3:20
comedy short at 24 fps with no music (`Director/HANDOFF.md` is its live state). The path forward for the system:
`Director/docs/roadmap-system.md`.

**Read in this order:** this file; `Director/HANDOFF.md` (what exists, what is in flight, what is next); `.claude/skills/direct-video/
SKILL.md` (the procedure stage by stage and the failure playbook); then the one topic doc you need from the table below. Before any Unity
work: `mv doctor`, `mv queue`, `ls Director/gen/compile.lock`, `Director/gen/WORKLOG-epic.md`. `mv` means `node Director/mv.mjs
[--video <name>]` (`mv use <name>` once).

## J's standing rules (never break these)

| Rule | J's words or the source |
|---|---|
| **No shortcuts.** An `insert` tag to silence a check, a blanket `fingers curl`, a prim for a fist, a void for an exterior: each cost a round. | "You took almost every possible shortcut you could making this. Don't do that. Make it an epic animation." (2026-11-08) |
| **Never judge motion from stills.** Contact sheets, `cards sheet` and posecheck PNGs are staging only. Motion is judged from consecutive 24 fps strips, the critic score and a reviewer who didn't animate it; say what you stepped. Every render praised from sheets was rejected. | "Are you not understanding how to make animations? Real talk here." (2026-11-08, rated 1/10) |
| **No fix on a fix.** A wrong beat is rebuilt from a new source or staging; never a second cue to cancel the first (1,954 snaps on Greener came from stacked fixes). | Greener and Hawkes Punch lessons |
| **Motion comes from real sources as candidates, picked by the critic:** the clip catalog, CMU/Protofactor mocap, Gen motion, physics, video-to-motion, pose sheets seeded from real frames. Never typed muscle numbers. | hand-keyed numbers produced the 1/10 |
| **Hero moments get 5-second tests J approves (yes/no) before any full render.** One at a time. Never "a 100-second chunk with ten unreviewed changes". | memory feedback-you-are-the-interface |
| **Comedy:** the bigger the feat, the smaller the reaction; the hold after the boom is the laugh; **no puns**; fewer, longer shots with holds; cut on contact, never on anticipation. | "don't use jokes like Right in the... Mars. Try something a little better" (2026-11-08) |
| **No music unless it is a music video.** Hawkes Punch has no song in any output; never digital silence (a bed under everything). | "not a music video but rather the fun video" (2026-11-07) |
| **No AI video or AI footage on screen.** Real-time 3D only; AI is allowed for textures and body motion data on our rigs (and as a mocap source off screen). | the rejected AI shots stay in `Director/acts_ai` |
| **Real planet scale**; space bodies on the NASA float base, head level, never seated; him screen left, the double screen right; physics drives every change of speed. | "make the planets actual planet size... think One Punch Man" |
| **No Hawkes Biomedical logo, branding or "we own the category" line** unless J asks. | J |
| **One Unity, through the `mv` queue.** Never kill or restart it, never make `Director/gen/unity.lock` by hand, `mv hold` for several calls. | `Director/docs/toolchain.md` |
| **C# and shaders reach Assets only through `mv csharp apply <staging-dir>`** (it takes `Director/gen/compile.lock`, compiles, reverts on error). Never during a final render. | two compile breaks on 2026-11-08 |
| **Never commit or push.** Nothing in TKShock is committed by an agent. | J |
| **GPU and vision spend is priced first** (`hawkesgen_estimate`) and capped: cents to a few dollars go (voices, sfx, motion candidates, vision); more, or any cloud render, ask J with the number. | memory feedback-no-rented-gpus-tkshock |
| **Nothing lands in J's Downloads folder.** A site's own export API + `curl -o` into `Director/gen/...`; never the browser's Download button. | said twice |
| **Don't ask J to approve steps.** Decide, run, report; stop only for money past the cap, a creative choice only he can make, his sign-in, or going live. Every report names the file, the time and what changed. | "You need to stop asking me. You do it and continue to make this." (2026-11-06) |
| Never delete `.meta` files unasked; never hand-edit `_Generated`, Timeline tracks, `acts/50-cards.json` or any generated act; make a `_backup/` before destructive batch work; never print, copy or commit secrets. | project safety |

## The method (every gate stops the pipeline: `mv make`)

1. **Board.** Script (`videos/<v>/SCRIPT.md`) and storyboard (`STORYBOARD.md`, `storyboard/shots.json`: one row per shot with size,
   lens, frames at 24 fps, action, line, register, what changes). J approves the board in chat. Nothing is animated before this.
2. **Cards.** `board2cards.mjs` generates `cut.json` and the cards from the board; hand staging goes in `storyboard/overrides.yaml`.
   `mv cards check`, `mv lint --strict`, `mv cards sheet` for staging.
3. **Build.** `mv cards` (plain build), `mv shotcheck` to 0 A faults without `--allow-shot`.
4. **Motion.** Candidates for every hero beat from real sources, scored by `critic.mjs`, watched at 24 fps; `zg_neutral` under every
   floating body; `mv critic` on the cut, `mv motioncheck` clean.
5. **Shot.** `mv shot`, `review_strips.mjs`, `qa.mjs --strict`, `mv motioncheck --shot`.
6. **Test.** Each hero moment as a 5 s clip at full quality with sound, strips and critic vision clean, then J's yes or no (`mv approve`).
7. **Previs.** `mv previs --fps 24`, strips, a cold view by an agent that never read the script; fixes go in the board or the overrides.
8. **Final.** `mv freeze`, `mv final --plan`, `mv final` (review, critic, flash check), a cold view of the file, then J:
   `output/<v>-vN.mp4` plus a copy under 30 MB. Then the note loop (`Director/docs/room.md`).

## Commands at a glance (`Director/docs/commands.md` has every one)

`mv make | status | approve | coldview | doctor` the pipeline and the machine · `mv new | song | use | videos` videos · `mv cards [check|
compile|sheet|note|insert|remove] | why | lint` cards and the score · `mv build [--fast] | refresh | shotcheck | motioncheck | critic |
motion | lab | test` building and checking · `mv shots | shot | frame | sheet | previs | render | final [--plan] | freeze | thaw | review`
rendering · `mv bake | clips | choreo | style | format | find | pull` libraries · `mv queue | hold | csharp | generated | lease | snap |
refs | farm` sharing one Unity and the cloud · `mv call <command> '<json>'` the editor bridge. QA, strips, the critic, flashcheck,
board2cards, the sound tools and the Room are Node tools under `Director/tools/` and `Director/room/`.

## Where things are

```
AGENTS.md, CLAUDE.md             this file (rules, method, map)
.claude/skills/direct-video/     the director's procedure, agent choreography, failure playbook
Director/HANDOFF.md              live state of the current video and the system
Director/PIPELINE.md             the lessons and traps behind every gate (lint reads them)
Director/docs/                   topic docs (table below); README.md indexes them
Director/research/               the craft: story, epic action, zero-g acting, Unity animation, how others do it
Director/review/                 STANDARD.md (the reviewer's bar), motion-critic.md, engine-fidelity.md, qa-calibration.md
Director/library/                sets, lighting, moods, styles, formats, templates, performances, poses, motion catalog, grips, bake gate
Director/videos/<v>/             a video: score, acts, cards, cut, style, storyboard, shots, review, final, make, notes, tweaks, _backup
Director/mv.mjs, tools/, room/   the CLI, every tool, the Review Room;  Director/gen/  scratch: queue, locks, WORKLOG, snaps, mocap, genmotion
Director/tkshock-docs/           TK Shock's own treatment, storyboard, song, team, roadmap, review, polish, art bible, colour script
Assets/MusicVideo/               shared engine (Runtime, Editor, Shaders), Person, Person2, Props, Motion (+Clean, Keyed), Sfx
Assets/Videos/<v>/               a video's scene, Generated, Song;  Assets/Scenes/MusicVideo.unity + Director/score.json are TK Shock
```

## Docs

| Topic | File |
|---|---|
| **The path forward** (where we are, principles, numbered backlog with status and cost, technique watchlist) | `Director/docs/roadmap-system.md` |
| Every command | `Director/docs/commands.md` |
| Builds, lint, previs, bake gate, shot reuse, freeze, the clock, the Unity queue, working beside other agents | `Director/docs/toolchain.md` |
| Cut, cards, layers, cameras, sets, lighting, moods, templates | `Director/docs/cards.md` |
| The score and every cue (actors, shots, acting, props, fx, TV, text, sound, the character) | `Director/docs/score-cues.md` |
| Native acting, MVLate, `rate`, clip import and cleaning, the clip catalog, generated clips | `Director/docs/native-acting.md` |
| Keyed pose sheets, posecheck, zg_neutral, the hp_ sheets, limbscale | `Director/docs/keyed-poses.md` |
| Real-scale space | `Director/docs/space.md` |
| Epic toolkit and punch mechanics | `Director/docs/epic-fx.md` |
| Judging a render: motion check, shot checks, strips, QA, review, the critic, cold view, "done" | `Director/docs/qa-review.md` |
| Sound: the mix, voices, lines, beds, captions, silence | `Director/docs/sound.md` |
| Styles, formats, look keys, captions | `Director/docs/styles-formats.md` |
| The Review Room and the note loop | `Director/docs/room.md` |
| Hawkes Gen and Studio in this project, the retarget bone map, open Gen bugs | `Director/docs/gen-and-studio.md` |
| The cloud render farm (needs J's $20 pilot) | `Director/docs/render-farm.md` |
| The dialogue clock (design), choreography, this laptop, TK Shock legacy | `Director/docs/dialogue-clock.md`, `choreography.md`, `hardware.md`, `tkshock-legacy.md` |
