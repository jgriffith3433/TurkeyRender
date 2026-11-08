# HANDOFF (written 2026-11-08, minutes before a model switch to Opus)

Read this first, then `Director/HANDOFF.md` and `.claude/skills/direct-video/SKILL.md` if they exist (an agent was writing them).

## What J wants (his words)
- "The goal is to make YOU the interface." J directs in chat only. Never ask him to film, pose, or open a tool.
- "Make it an epic animation.. think One Punch Man." Real-size planets. "Don't use jokes like Right in the… Mars."
- "You took almost every possible shortcut... Don't do that." No shortcuts; no final render until every part meets the bar.
- Comedy short, NO music anywhere. Captions on. 24 fps.
- He approved: `videos/hawkespunch/SCRIPT.md` (clinic, ad, button), `SPACE-EPIC.md` (space story), and the STORYBOARD (`videos/hawkespunch/STORYBOARD.md`, `storyboard/shots.json`, 53 shots). "Look great!"

## The method now (do not go back to the old one)
1. Board is the source of truth. `board2cards.mjs` (video agent writing it) generates cut and card skeletons from shots.json; hand staging goes in `cards/overrides.yaml`.
2. Motion comes from real sources, never typed joint numbers: physics sim (MuJoCo active ragdoll), motion matching over big mocap, Gen `motion.from-video` on public-domain footage, approved keyed pose sheets in `library/poses/` (all 18 approved; see check/ PNGs). Candidates are scored by `Director/tools/critic.mjs` (being built).
3. Judge motion only from 24 fps strips (`tools/review_strips.mjs`) + critic score + a cold-viewer pass. NEVER from contact sheets. Copy an image to a fresh name before Read (cache bug).
4. Hero shots get 5-second tests J approves (yes/no) before any full render. Then previs → cold view → `mv final`.
5. `mv make <video>` (being built) runs the gated pipeline; `mv doctor` checks the environment.

## Agents in flight (background; their reports arrive as messages)
- a42e11f175613608a: owns Hawkes Punch cards and Unity. Rebuilding from the board; renders 5 s hero tests first.
- a84a5f66becb7d2a6: motion critic (`tools/critic.mjs`).
- acf312207c1d518d3: motion outside Unity (physics, mocap matching, Gen video-to-motion) → catalog clips gm_/vm_/sim.
- a69f187dcd0d72cf5: cloud render farm design + free dry run (`Director/docs/render-farm.md`); needs J's OK on cost.
- a274cc28a745ca09d: space set (close Jupiter cloud wall, night-side Earth check).
- a66b5466bdf1aeda3: `mv make` pipeline with gates.
- aa067624a4f2417e7: director skill + `Director/HANDOFF.md` + memory notes.
- ae410efa484cf1d3f: hardening (`mv csharp apply`, generated-file manifest, leases, lint integrity, `mv snap`).
Everything they finish is logged in `Director/gen/WORKLOG-epic.md`.

## Rules that must not break
- One Unity: use the `mv` queue; never kill or restart Unity. C# into Assets only under `Director/gen/compile.lock` (or `mv csharp apply` once it exists); compile errors block everyone.
- No commits, no pushes. GPU spend on Gen priced first (`hawkesgen_estimate`), small caps ($2-4), never without saying so.
- Downloads never to J's Downloads folder. Mixamo via API + curl only.
- Never approve from stills. Never patch a fix on a fix: rebuild the beat.
- Space bodies: NASA float base (`zg_neutral` a-d), head level, no seated or straight-legged poses; screen sides fixed (him left, double right); one planet size per shot; physics drives movement.

## Current state of the cut
- Clinic r2 rendered (`previs-clinic-r2-mix.mp4`): good; launch reverted to fast exit with p_glass. Punch poses `hp_doc_punch` + `hp_him_hit` approved.
- Space r2 rendered (`previs-space-r2-mix.mp4`): epic but with faults; being replaced by the 16-shot board version.
- Sound/captions/ending done (sound agent); re-sync after the board rebuild (punch_lines, punch_beds, captions from lines.json).
- Character assets done: coat, face shapes, glasses (lenses clear), stethoscope, badge.
- Effects toolkit done (`AGENTS.md` "Epic toolkit"); set done (`"Real-scale space"`).
- Open: Gen bugs filed with Studio (change c_35f341814905); J requested Llama access for Kimodo (pending).

## Next steps, in order
1. Collect agent reports; fix anything that broke the compile first (`mv doctor`).
2. When board2cards and the hero tests land: review strips + critic, send J the 5 s tests, record approvals.
3. Full previs → cold view → fix → `mv final` → flashcheck → send J `output/hawkespunch-vN.mp4` plus a <30 MB copy.

## RESEARCH: what would make this system top-of-the-line (2026-11-08, J asked for the best modern 3D AI animation)
Verified by web search just before the switch; details and licences need checking against each repo before use. Ranked by payoff for us.

1. **Kimodo + physics tracking = the real answer for motion.** NVIDIA's Kimodo (March 2026) is controllable text-to-motion: text PLUS sparse kinematic constraints (a hand must be here at this frame, the root must travel this path). Its variants plug into **ProtoMotions + MuJoCo** to turn generated motion into physically-tracked references. Gen already runs Kimodo (`motion.from-text`); it only needs J's Llama-3 access (requested). Once live: write each beat as text + our constraints (contact points from the cards), get motion that is physically valid, not keyed. Sources: https://arxiv.org/pdf/2603.15546 , https://rits.shanghai.nyu.edu/ai/nvidia-releases-kimodo-controllable-text-to-motion-for-characters-and-humanoid-robots/
2. **MaskedMimic / ProtoMotions (NVIDIA): physics-based control as motion inpainting.** Give it partial constraints (a few key poses, a hand target, a root path) and it produces a full, physically simulated performance that hits them; it also retargets any motion onto a simulated humanoid and fixes it. This is the proper version of our "physics agent": our approved pose sheets become constraints, not final motion. Runs on a GPU (RunPod/Modal through Gen's 3D worker). https://github.com/DanielTruong99/MaskedMimic , ProtoMotions3 (open-source humanoid sim framework). Related 2026: UniPhys (diffusion planner+controller), InterPrior (human-OBJECT interaction control: holding, catching, throwing planets): https://arxiv.org/pdf/2602.06035
3. **AI video as the mocap source ("virtual actor").** Gen can generate a video of an actor performing a beat (video.t2v / i2v, Wan/LTX), then **GVHMR / video-to-motion** extracts the 3D motion (Gen `motion.from-video` = GEM-X). J's rule "no AI video" is about the final picture; using it as motion reference is fine. This gives any performance we can describe, with real human timing, with nobody acting. ComfyUI already has nodes for this path: **ComfyUI-Video2MotionCapture** (GVHMR → SMPL → retarget to Mixamo via bundled Blender): https://github.com/AKASubaz/ComfyUI-Video2MotionCapture . HY-Motion's own training data was built this way from millions of video clips.
4. **Faces from audio, automatically: NVIDIA Audio2Face-3D is open source (Sept 2025, MIT SDK + open weights).** Audio → ARKit blendshape weights with emotion. Our voice lines → full facial performance (lips, jaw, brows, blinks) with no hand keying. Needs ARKit-named blendshapes on our heads (we have a partial set; add the ARKit 52 via the face_shapes tool). Run it on Gen's GPU worker as a new tool `face.from-audio`. https://github.com/NVIDIA/Audio2Face-3D-Samples , paper https://arxiv.org/pdf/2508.16401
5. **ComfyUI HY-Motion nodes for Gen's workflow path:** text → rigged FBX with retarget to a custom FBX, no code: https://github.com/jtydhr88/ComfyUI-HY-Motion1 , https://github.com/Aero-Ex/ComfyUI-HyMotion . Import as a Gen workflow tool (Gen's "workflows become tools with no code"). Index of all ComfyUI 3D nodes: https://pozzettiandrea.github.io/ComfyUI-3D_nodes_index/
6. **A learned judge instead of hand-written measures.** HY-Motion's evaluation uses a Video-VLM to score text↔motion alignment (SSAE). Our critic should include the same: render a candidate at 24 fps, ask a vision model "does this read as a man catching a planet, with weight?" alongside the curve measures. https://www.i-scoop.eu/hunyuan-motion-1-0-a-text-to-human-motion-model/
7. **Neural in-betweening and motion editing:** Cascadeur's inbetweener (installed; free tier exports only .casc, paid ~$25-33/mo exports FBX) and 2026 research (MotionBricks real-time modular motion https://arxiv.org/pdf/2604.24833 ; unified flow for motion generation/editing/retargeting https://arxiv.org/pdf/2604.13427 ). Use for the transitions between held poses, which is where our stepped look breaks.
8. **Markerless mocap services as a fallback:** DeepMotion Animate 3D, Move AI (phone video → mocap; Move is highest fidelity), Autodesk Flow Studio. Paid, need footage; lowest priority given "J never films".

**Suggested build order for Opus:** (a) wire Audio2Face-3D into Gen (faces solved for every video), (b) the virtual-actor pipeline (Gen video → motion.from-video → catalog), (c) MaskedMimic on Gen's 3D worker for physics-valid motion from our pose constraints, (d) Kimodo once Llama access lands, (e) VLM scoring inside the critic. Each is a Gen tool, so every future video gets it.

## A STEP FURTHER: redesigning the system, not adding tools (2026-11-08, J: "really look at our system")
Looked at the whole system end to end: cards → compiler → Unity → render → my eyes. The seven structural changes below are ranked by how much they raise quality AND speed at once. Each says what it replaces.

### 1. The board is the single source of truth, and an ANIMATIC comes before any 3D
Today lines, captions, sfx, beds, cut and cards are separate files that drift (the stale-acts bug, three times today). Make `shots.json` (the storyboard data) the only hand-edited story file; every act is generated from it (cut, cards skeleton, lines placement, captions, beds, sfx slots). Then build the standard step we skipped: an **animatic**, the board panels timed to the voice lines and sfx as a video (ffmpeg, no Unity, minutes). Run the cold-viewer test on the animatic. Story problems get caught before a single 3D shot exists; that alone would have saved most of today.

### 2. A headless kinematic twin so motion search is free
Engine fidelity proved our clip sampling equals Unity's to 0.000°. So evaluation does not need Unity: build a Node/Python twin that samples clips, pose sheets and physics outputs onto the humanoid and runs the critic, thousands of candidates a minute, no queue. Unity becomes a pure renderer. Then motion is found by SEARCH: for every beat, generate 20-50 candidates (Kimodo/HY-Motion, physics seeds, mocap matches, video-to-motion), score them in the twin, hand the top 3 to the render. Craft by optimisation, not by an agent typing numbers.

### 3. An automatic "alive" layer so no body is ever dead
Most of what read as "weird" was absence: no breathing, no blinks, no eye saccades, no weight shift, no head micro-motion, flat faces, no cloth/hair follow-through. Make these automatic from the board and the lines: an autoperformance pass that adds breath (rate from the register: calm/strained), blinks and saccades, idle sway, head lead on gaze, anticipatory looks before lines, lip sync and emotion from the voice files (Audio2Face-3D), and secondary motion (spring bones on hair, the coat, the stethoscope). Zero per-shot work, a permanent floor under quality.

### 4. Preference learning on J's yes/no
Every 5-second test J approves or rejects is a label. Record them (`tests/approved.json` with his words) with the critic's features and the vision model's answers, and fit a lightweight ranker that re-weights the critic toward J's taste. Also a "J-model" reviewer: a Claude pass primed with every J quote in this project ("broken arms", "sitting weird", "too many fast cuts", "puns", "shortcuts") that predicts what he'd flag before he sees it. The system learns the director instead of the director re-teaching the system.

### 5. Hand the loop to Hawkes Studio and the Review Room on the phone
I've been the message bus between eight agents and J. Studio already is that bus for the games: builds, Claude-vision reviews, a backlog, agents on branches, a morning report, Talk as PM. Register TKShock as a Studio project: `mv make` is its build, the critic + cold view + shot check are its review, failures become backlog items agents fix, and J directs through Talk. Publish the board, animatic, 5-second tests and previs to a Studio-hosted review page (the beta-sites R2 path with a pass) so J approves from his phone, asynchronously, instead of through a local Room. The director agent then only surfaces real decisions.

### 6. Parallel render and the sub-minute note loop
The farm (docs/render-farm.md) plus shot reuse means a one-shot fix renders in under a minute. Combine with the existing note loop (84 s on Greener) and the headless twin: J says "his head is down at 1:12", the system edits, re-scores, re-renders one shot and posts it, with no human in between. That's the real "you are the interface": his notes go straight to pixels.

### 7. A compounding performance library
Every approved motion, pose sheet, gag staging, lighting rig and camera recipe is stored with its critic score and J's verdict, tagged by use (startle, catch, deadpan hold, punch, float). The next video assembles from approved, scored pieces and only searches for what's new. Today's 18 approved pose sheets, 6 generated clips, the epic toolkit and the space set are the first entries; make the storing automatic in `mv make`'s final stage.

### Looking again: second-order moves
- **An ensemble of cold viewers** (personas: a kid, an animator, a comedy writer, a stranger) on every animatic and previs, aggregated into a confusion-over-time map. Cheap through Gen llm.json.
- **Constraint-first motion:** write beats as contacts and paths (hand on moon at frame 21, root travels 4 m right) rather than poses; Kimodo/MaskedMimic turn constraints into physically valid motion. Poses become outputs, not inputs.
- **Candidate generation on Gen's GPU workers, not the laptop**, batched per step (J's "batch all at once" rule), so a 50-candidate search costs cents and minutes.
- **The twin as a unit-test harness:** every engine change runs the fidelity test and the critic on a fixed set of shots; a regression fails before anyone renders (the attach lag and hitstop clock bugs would have been caught).
- **Style transfer at the end, not the start:** render clean, then apply the anime grammar (impact frames, speed lines, two looks) as a deterministic post pass driven by the board's register tags, so the same shots can be re-styled without re-animating.
- **Measure the loop itself:** time from note to delivered fix, candidates per beat, critic/J agreement, cold-view confusion count. Put them in the morning report; the system's job is to make those numbers fall.

### Order for Opus (highest leverage first)
1. Board-as-truth generators + animatic + cold view on the animatic.  2. Headless twin + candidate search in the critic.  3. The alive layer (Audio2Face, breath, blinks, spring bones).  4. Studio integration and the phone review page.  5. Preference learning from J's approvals.  6. Farm.  7. Library automation and loop metrics.

### Render farm: designed, priced, dry-run done, nothing spent (agent a69f187dcd0d72cf5, 2026-11-08)
Memo `Director/docs/render-farm.md`. Headless Unity WITH a display works (39 s probe, byte-repeatable frames); `-nographics` crashes, so workers need Xorg/Xvfb+Vulkan (Gen's play-native recipe). Price: ~$0.35 per 720p final on 5 RunPod A4000-class workers (~6 min vs 18-25 today), $0.10 per previs, one-time Library warm-up ~$0.50, 50 GB volume $3.50/mo. Project goes up as a manifest snapshot through Gen (working tree is 10.4 GB, 4 files >100 MB, GitHub is at v11), not a git fetch. Code: `mv farm plan|sync|render|previs|test` (free; render/sync refuse without `FARM_OK=1`), `final.mjs --plan-json`, `Director/farm/{Dockerfile,worker.sh,unity/Farm.cs,probe/*}`. **Needs J's words: a $20 pilot budget.** Then: hawkesgen `unity.render` tool + image (`farm-image-*` tag), `runpod.mjs --kind unity-render --apply`, warm-up on 1 worker, one-shot PSNR comparison D3D11 vs Vulkan, then a timed 5-worker final.

### board2cards landed (agent a42e11f175613608a, 2026-11-08)
`tools/board2cards.mjs`: 53 cards in `cards/board.yaml`, cut.json on the board's frames (204.25 s), lines.json starts, `storyboard/CHECKLIST.md` (85 items). Hand edits go in `storyboard/overrides.yaml` (merged every run). r2 cards + 56-space-fx backed up in `_backup/pre-board/`; space fx now in each card's `raw`. 70-lines.json is on the board clock. Build queued; next it frames heroes, gets shot check to 0 A, then `tools/board_tests.sh` (5 s tests: punch, s05_ring, s06_boo, s10_catch, s12_atlas, s14_setback → `tests/<name>/`).
**Sound is stale on the new clock and nobody owns it yet:** 75-captions, 78-beds (punch_beds.mjs anchors on old shot ids, so it stops), 80-sfx, 82-foley, 84-space-sfx. Re-place them from CHECKLIST.md (update punch_beds.mjs to board ids). Line fits: doctor_line_a (9.79 s) starts 1.0 s early in c21 and ends 0.29 s before the hit; him_symptoms_v3 (18.8 s) spans c07-c12 and needs splitting per line to land on cuts; scream 72.25-78.25.
