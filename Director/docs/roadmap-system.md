# The path forward: good videos, fast, with top-tier AI animation

Written 2026-11-08 for the next model to act on. This replaces `ROADMAP-SYSTEM.md` (its milestone history is at the end) and holds the
durable content of `Director/HANDOFF-NOW.md`. The live state of the current video is `Director/HANDOFF.md`; the rules are `AGENTS.md`.

## 1. Where we are

The system makes real-time 3D videos in Unity from chat: a storyboard becomes cards, cards compile to a score, one Unity builds and
renders, Node tools lint, check shots, review at 24 fps and stitch finals from unchanged shots. What works: the native Animator path
(clip sampling exact to 0.000°), the clip catalog, keyed pose sheets, the real-scale space set, the epic effects toolkit, shot checks that
catch camera and staging faults before a render, incremental finals and reviews, the note loop (note to fixed in 84 s), the Review Room,
Gen voices and sfx, and an approved 53-shot board for Hawkes Punch. What hurts, in J's words: hand-keyed motion ("1/10 animation",
"Are you not understanding how to make animations?"), motion judged from stills (every render praised from sheets was rejected), the
single Unity lane (a 720p final is 18-25 minutes and every agent waits), acts that drift from the board (captions, beds and sfx went stale
three times in one day), agents colliding on C# and generated files, and bodies that read as dead (no breath, blinks, weight shift,
secondary motion). The animation is "slightly getting better each iteration"; the system has to make the next iteration cheap.

## 2. Principles

1. **The board is the truth.** `storyboard/shots.json` is the one hand-edited story file; cut, cards, lines, captions, beds, sfx slots are
   generated from it and regenerated when it changes. Story is tested on an animatic before any 3D.
2. **Motion by search, not typing.** Every beat gets candidates from real sources (mocap, physics, Kimodo/HY-Motion, video-to-motion,
   sheets seeded from real frames), scored by the critic, the top few rendered. Nobody types joint numbers.
3. **Judge motion at 24 fps.** Consecutive strips, the critic, a cold viewer, then J at speed. Never a still.
4. **J directs through chat.** He never films, poses, opens a tool or runs a command; hero moments are 5 s tests he answers yes or no to;
   he is asked only about money past the cap, a creative choice only he can make, his sign-in, or going live.
5. **Costs are priced first** (`hawkesgen_estimate`), capped, and said out loud; GPU candidate generation is batched on Gen's workers.
6. **No fix on a fix.** A wrong beat is rebuilt from a new source or staging.

## 3. The backlog, in build order

Status words: **done**, **in flight** (agent id), **not started**, **needs J**. "Verify" is the test that proves it.

### 1. Board as truth: generators + animatic + cold view on the animatic
- **What:** every act is generated from `shots.json` and `lines.json` (cut, cards skeleton, lines placement, captions, beds, sfx slots),
  registered in `generated.json` so `mv build` regenerates stale ones; then an **animatic**: the board panels timed to the voice lines and
  sfx as an mp4 (ffmpeg, no Unity, minutes), with the cold view run on it.
- **Why:** the stale-acts bug three times on 2026-11-08; story problems found after 3D cost a day each. J: "Don't you understand the flow
  of a video? There's a way to tell stories with timing, subjects, props, zoom, pauses, and dialogue and suspense."
- **How:** extend `tools/board2cards.mjs` to write `acts/75-captions.json`, `78-beds.json` (replace `punch_beds.mjs`'s shot-id anchors
  with board ids), sfx slot acts; `tools/animatic.mjs` (panels from `storyboard/panels/`, `lines.json`, `acts/8*-*.json` → `videos/<v>/
  animatic.mp4` through `sound.mjs`); `mv coldview animatic.mp4`; `mv make board` runs both.
- **Cost:** hours of Node work; cold view about $0.15 a video.
- **Status:** board2cards done (a42e11f175613608a); the sound generators and the animatic **not started**. Sound acts are stale on the
  board clock now.
- **Verify:** change a line's start in `lines.json`, run `mv build`: captions, beds and the cut move with it and `mv generated check` is
  clean; the animatic's cold view retells every "change" beat.

### 2. The headless kinematic twin + candidate search
- **What:** a Node/Python twin that samples clips, pose sheets and physics outputs onto the humanoid (the same muscle-space math Unity
  uses; fidelity proved sampling is exact) and runs the critic, thousands of candidates a minute, no queue. Unity becomes a pure renderer.
  Then for every beat: generate 20-50 candidates, score them in the twin, render the top 3.
- **Why:** the critic waits on Unity for every dump; motion quality comes from how many candidates we can afford to judge.
- **How:** `tools/twin/` reading `.anim`/FBX/BVH through the muscle definitions `call posemuscles` exports and `library/motion/rig.json`;
  `critic.mjs` gains `--twin`; `mv make motion` gets a `candidates` step (`tools/motion_match.mjs`, `motion_sim.py`, `motion_make.py`,
  `motion.from-video`) and writes `videos/<v>/motion/<beat>/candidates.json` with scores.
- **Cost:** days of work; candidates on Gen's 3D worker about $0.02 a BVH, so a 50-candidate beat is about $1.
- **Status:** critic **in flight** (a84a5f66becb7d2a6); motion outside Unity (MuJoCo active ragdoll, CMU/Protofactor matching, video-to-
  motion) **in flight** (acf312207c1d518d3); the twin **not started**.
- **Verify:** `critic.mjs clip X --twin` matches `critic.mjs clip X` (Unity dump) within 0.1 on every principle; a hero beat's top
  candidate beats the hand-keyed sheet in the critic and in J's 5 s test.

### 3. The alive layer
- **What:** an automatic pass that adds what dead bodies lack: breath (rate from the register), blinks and saccades, idle sway and weight
  shift, head lead on gaze, anticipatory looks before lines, lip sync and emotion from the voice files, secondary motion (spring bones on
  hair, the coat, the stethoscope). Zero per-shot work.
- **Why:** most of "weird" was absence. J: "they are sitting all weird... They aren't interacting like they are in space at all."
- **How:** faces: **NVIDIA Audio2Face-3D** (open source, MIT SDK + weights, Sept 2025) as a Gen tool `face.from-audio` → ARKit blendshape
  curves; add the ARKit 52 to both heads with `tools/face_shapes.py`; the compiler writes the curves as a face track per line (`face_act.mjs`
  becomes the fallback). Body: an `alive` performance layer in `NativeCompile.cs` under `MVLate` (breath cycles from the pose-sheet
  `cycles` machinery, blink/saccade schedules seeded by song time, gaze lead), and Unity spring bones on `Coat.fbx`, hair and the
  stethoscope (set up in `blender_coat.py`).
- **Cost:** Audio2Face on Gen's GPU worker, cents a line; two or three days of work.
- **Status:** not started.
- **Verify:** `critic.mjs cut` stiffness and timing principles rise on an unchanged cut; a 10 s hold of the deadpan face reads alive in
  24 fps strips; Audio2Face lip closes land on m/b/p within a frame on the symptoms take.
- 2026-11-08, alive agent: **body and eyes landed, faces from audio and secondary motion not.** `tools/alive.mjs <video>` writes the GENERATED
  `acts/62-alive.json` (registered in `generated.json`) from the board, the cut, the compiled cards and the voice files: an `alive` cue per
  steady stretch (new `Runtime/MVAlive.cs`, first in the MVLate pass: breath at the register's rate, held 0.6 s before a hitstop, off in a
  freeze; seated/standing sway, head micro-motion, standing weight shift with the feet held by IK; zero-g: breath and head yaw only), seeded
  blinks (2-6 s, after a cut to a close shot, on big gaze turns, never on a stressed syllable), saccades, a speaker's look-away, listeners'
  eyes to the next speaker 0.3 s early, and mouthPress on m/b/p placed on the voice envelope's dips. It backs off where the cards hold the
  channel (eyes, gaze, head layers, mouthPress, "frozen" in the idea). Proof: `Director/review/alive.md`. Left: (a) **Audio2Face-3D** as
  Gen `face.from-audio` (ARKit 52 on both heads) replaces the m/b/p heuristic; (b) **secondary motion**: the engine has no spring bone on a
  native body and the coat, hair and stethoscope have no bones of their own (the coat is skinned to the body's bones; `MVOverlap.cs` is a
  closed-form, pure-in-time spring but legacy-only and on body chains). Design: add 3-bone chains in `blender_coat.py` (hem front/back,
  each lapel), `blender_head.py` (two hair clumps) and the stethoscope; run MVOverlap's convolution on those chains in the MVLate pass,
  driven by the parent bone's world motion sampled at earlier scene times through MVLate stand-ins (pure in time, so scrub and reverse hold);
  budget it at 1.5 ms a body. Not started: it is Blender rig work plus C#, not "a small addition".

### 4. Hand the loop to Hawkes Studio and the phone
- **What:** TKShock as a Studio project: `mv make` is its build, critic + cold view + shot check its review, failures become backlog items
  agents fix, J directs through Talk, and the board, animatic, 5 s tests and previs are published to a Studio review page (the beta-sites
  R2 path with a pass) so J approves from his phone.
- **Why:** the director session was the message bus between eight agents and J; Studio already is that bus for the games.
- **How:** `hawkesstudio` project entry (build command, review tools, artifact paths); `mv approve` reads approvals back from the review
  page; the Room's pages (`room/public`) as the review page.
- **Cost:** Studio and Cloud Run work, a day or two; review hosting is the existing R2 Worker.
- **Status:** not started. `mv make`/`approve`/`coldview`/`status` **in flight** (a66b5466bdf1aeda3; `tools/mv/make.mjs` exists).
- **Verify:** J answers a 5 s test from his phone and `mv status` shows it approved without a chat message.

### 5. Preference learning on J's yes/no
- **What:** every approved or rejected 5 s test is a label (`videos/<v>/tests/approved.json`, his words) stored with the critic's features
  and the vision answers; a lightweight ranker re-weights the critic toward J's taste; a "J-model" reviewer pass primed with every J quote
  predicts what he'd flag.
- **Why:** the system should learn the director instead of the director re-teaching it (his recurring complaints: arms, heads, seated
  floats, fast cuts, puns, shortcuts, stills, space).
- **How:** `mv approve` already keys a yes by shot hash; add the feature snapshot; `critic.mjs calibrate --j` fits `CAL` weights;
  `review.mjs --persona j` with the quotes in `AGENTS.md` and the memory file `feedback-video-recurring-complaints.md`.
- **Cost:** hours; vision cents.
- **Status:** not started.
- **Verify:** critic/J agreement on held-out tests above 80%.

### 6. The cloud render farm
- **What:** Linux Unity editors in containers on RunPod GPUs rendering shot groups as Gen `unity.render` jobs; `mv final` stitches them
  as reused shots. About **$0.35 per 720p final on 5 workers in ~6 min** (vs 18-25), $0.10 a previs, warm-up ~$0.50 once, 50 GB volume
  $3.50/month.
- **Why:** one Unity on a 15 GB laptop is the bottleneck for every agent; the note loop plus the farm makes a one-shot fix under a minute.
- **How:** memo [render-farm.md](render-farm.md); code `Director/farm/{Dockerfile,worker.sh,unity/Farm.cs,probe/*}`, `tools/farm.mjs`,
  `final.mjs --plan-json`. Build order: hawkesgen `unity.render` tool + `server/unity-render` image (`farm-image-*` tag); `runpod.mjs --kind
  unity-render --apply` endpoint (exact GPU models A4000/A4500/4000 Ada, never a pool) + network volume; `mv farm sync` (manifest snapshot
  through Gen: the tree is 10.4 GB with 4 files over GitHub's limit); warm-up on 1 worker; a one-shot PSNR comparison D3D11 vs Vulkan;
  a timed 5-worker final; replace the price model with measured numbers (`final/farm-pace.json`).
- **Cost:** **needs J: a $20 pilot budget**, then `FARM_OK=1`. Risks: Unity Personal concurrent seats undocumented (fallback a Pro seat via
  `-serial`), shader differences, worker RAM (Unity commits 13 GB here).
- **Status:** designed, dry-run done (headless with a display works; `-nographics` crashes), nothing spent (a69f187dcd0d72cf5). Waiting on J.
- **Verify:** the comparison shot matches the laptop render at PSNR > 40 dB; a 5-worker final lands in under 8 minutes and `mv final`
  reuses its shots.

### 7. The compounding performance library + loop metrics
- **What:** every approved motion, pose sheet, gag staging, lighting rig and camera recipe stored with its critic score and J's verdict,
  tagged by use (startle, catch, deadpan hold, punch, float); `mv make final` stores automatically. And measure the loop: note-to-fix time,
  candidates per beat, critic/J agreement, cold-view confusion count, in a morning report.
- **Why:** the next video should assemble from scored pieces and search only for what's new. Today's entries: 18 approved pose sheets,
  6 generated clips, the epic toolkit, the space set.
- **How:** `library/approved/<use>/*.json` with the hash, score and verdict; `mv clips` reads it first; `tools/mv/metrics.mjs` appends to
  `Director/reports/<date>.md`.
- **Cost:** hours.
- **Status:** not started.
- **Verify:** `mv clips catch` lists the approved Jupiter-catch motion first on the next video.

### 8. Hardening for many agents
- **What:** `mv doctor`, `mv csharp apply` (C# into Assets from staging with snapshot and rollback), the generated-file manifest,
  leases, `mv snap`, lint integrity.
- **Why:** two compile breaks and the stale-acts bug in one day; the Read tool's cached images.
- **How/Status:** **in flight** (ae410efa484cf1d3f); `tools/mv/{doctor,csharp,lease,generated,snap}.mjs` exist. See
  [toolchain.md](toolchain.md) "Working beside other agents".
- **Verify:** `node Director/tools/mv/harden-test.mjs` passes; a staged file with an unclosed string never reaches Assets.

### 9. Kimodo on Gen (constraint-driven text-to-motion)
- **What:** Gen's `motion.from-text` already runs Kimodo (NVIDIA, March 2026: text plus sparse kinematic constraints, a hand here at this
  frame, the root along this path) but falls back to HY-Motion because Gen's HF token can't download Llama 3 8B.
- **Why:** beats written as contacts and paths become physically plausible motion instead of keyed poses.
- **How:** **needs J:** access to `meta-llama/Meta-Llama-3-8B-Instruct` on Hugging Face for the account behind Gen's `HF_TOKEN`
  (requested 2026-11-08, awaiting review). Then write beats as text + constraints from the cards' contact points.
- **Cost:** about $0.02-0.05 a job. **Status:** needs J (external).
- **Verify:** a `motion.from-text` job log says Kimodo wrote its takes; the catch beat's candidate hits the hand constraint within 5 cm.

### 10. Physics-valid motion from constraints: MaskedMimic / ProtoMotions
- **What:** NVIDIA's physics-based control as motion inpainting: partial constraints (a few key poses, a hand target, a root path) → a
  full, physically simulated performance that hits them; it also retargets any motion onto a simulated humanoid and fixes it.
- **Why:** our approved pose sheets become constraints, not final motion; the MuJoCo active ragdoll (item 2) is the small version.
- **How:** a Gen tool on the 3D worker (`motion.track` taking BVH or sheet keys + constraints), ProtoMotions3 + MuJoCo; the twin scores
  the output. Related: UniPhys (diffusion planner + controller), InterPrior (human-object interaction: holding, catching, throwing planets).
- **Cost:** GPU minutes a job; a week to integrate. **Status:** not started.
- **Verify:** the Jupiter catch with weight: the critic's weight and overlap principles over 8, J's yes on the 5 s test.

### 11. The virtual actor: AI video as the mocap source
- **What:** Gen generates a video of an actor performing a beat (`video.t2v`/`i2v`, Wan/LTX), then video-to-motion (GEM-X/GVHMR in
  `motion.from-video`) extracts the 3D motion. Nobody acts; real human timing. J's "no AI video" rule is about the final picture only.
- **How:** a recipe in `motion_make.py`: prompt → video → `motion.from-video` → retarget with the bone map → catalog `vm_` clip →
  critic. ComfyUI has the path as nodes (ComfyUI-Video2MotionCapture: GVHMR → SMPL → Mixamo retarget).
- **Cost:** about $0.10-0.30 a candidate. **Status:** in flight as part of acf312207c1d518d3 (public-domain footage first).
- **Verify:** a `vm_` startle clip scores above the `gm_` one and reads human in strips.

### 12. A learned judge inside the critic
- **What:** HY-Motion's evaluation scores text↔motion alignment with a Video-VLM (SSAE). Render each top candidate at 24 fps and ask a
  vision model "does this read as a man catching a planet, with weight?" beside the curve measures.
- **How:** `critic.mjs vision` exists for worst moments; extend it to candidates (`--candidates`), on Gen `llm.json`.
- **Cost:** about $0.01 a strip. **Status:** vision stage done; candidate scoring not started.
- **Verify:** the VLM's ranking agrees with J's yes/no on the hero tests.

### 13. In-betweening and motion editing
- **What:** neural in-betweening for the transitions between held poses, where the stepped look breaks: Cascadeur's inbetweener (installed;
  the free tier exports only `.casc`, paid about $25-33/month exports FBX), MotionBricks (real-time modular motion), unified flow for
  generation/editing/retargeting.
- **Status:** not started; needs J for a Cascadeur seat if we go that way.
- **Verify:** a sheet with `interp: ease` vs the in-betweened clip: the critic's arcs and slow-in/out principles rise.

### 14. ComfyUI HY-Motion nodes as Gen workflow tools
- **What:** text → rigged FBX with retarget to a custom FBX, no code (ComfyUI-HY-Motion1, ComfyUI-HyMotion), imported as a Gen workflow
  tool. **Status:** not started; useful once Gen's own path stalls. **Verify:** the imported workflow yields a clip that passes the catalog.

### 15. Second-order moves
An ensemble of cold viewers (personas: a kid, an animator, a comedy writer, a stranger) aggregated into a confusion-over-time map (Gen
`llm.json`, cheap); constraint-first motion authoring in the cards (contacts and paths, not poses); the twin as a unit-test harness (every
engine change runs the fidelity test and the critic on fixed shots: the attach lag and hitstop clock bugs would have failed before anyone
rendered); style transfer at the end (render clean, apply the anime grammar as a deterministic post pass from the board's register tags);
the dialogue clock ([dialogue-clock.md](dialogue-clock.md)).

### Also open on the current video
The Atlas hold (Earth overhead with night side and city lights) is unsolved ([space.md](space.md)); the space look agent
(a274cc28a745ca09d) was on the Jupiter cloud wall and night-side Earth; the Gen bugs list is filed (`c_35f341814905`); sound acts are
stale on the board clock ([sound.md](sound.md)).

## 4. Technique watchlist

| Technique | What it gives us | What it needs | When |
|---|---|---|---|
| **Kimodo** (NVIDIA, 2026) https://arxiv.org/pdf/2603.15546 | text + sparse constraints → motion | Llama 3 access on Gen's HF token | as soon as J's access lands (item 9) |
| **MaskedMimic / ProtoMotions3** https://github.com/DanielTruong99/MaskedMimic | physics-valid motion from partial constraints; retarget-and-fix | a GPU worker on Gen, MuJoCo/Isaac | after the twin (item 10) |
| **UniPhys / InterPrior** https://arxiv.org/pdf/2602.06035 | planner + physics controller; human-object interaction (catch, throw) | same stack | with item 10 |
| **GVHMR / WHAM / TRAM** video-to-motion; **ComfyUI-Video2MotionCapture** https://github.com/AKASubaz/ComfyUI-Video2MotionCapture | 3D motion from any video, incl. Gen-made reference | footage or a Gen video job; the bone map | now (item 11) |
| **Audio2Face-3D** (NVIDIA, open source) https://github.com/NVIDIA/Audio2Face-3D-Samples, https://arxiv.org/pdf/2508.16401 | audio → ARKit blendshapes with emotion | ARKit 52 on our heads; a Gen tool | first (item 3) |
| **HY-Motion 1.0** + ComfyUI nodes https://github.com/jtydhr88/ComfyUI-HY-Motion1, https://github.com/Aero-Ex/ComfyUI-HyMotion | text → FBX, retarget to custom FBX | ComfyUI on Gen | as fallback (item 14) |
| **MotionBricks** https://arxiv.org/pdf/2604.24833, **unified flow** https://arxiv.org/pdf/2604.13427 | in-betweening, editing, retargeting | research code, GPU | item 13 |
| **VLM judging (SSAE)** https://www.i-scoop.eu/hunyuan-motion-1-0-a-text-to-human-motion-model/ | learned motion↔text alignment score | Gen `llm.json` with video strips | item 12 |
| **Cascadeur** inbetweener | physics-aware in-betweens | a paid seat for FBX export | item 13, needs J |
| **DeepMotion Animate 3D, Move AI, Autodesk Flow Studio** | markerless mocap from phone video (Move highest fidelity) | footage, paid | lowest: J never films |
| **Unity Muse Animate / AI Generators** | text-to-animation inside Unity 6 | Unity AI subscription; quality unproven for us | watch only |
| ComfyUI 3D node index https://pozzettiandrea.github.io/ComfyUI-3D_nodes_index/ | the catalogue of 3D nodes | | reference |

Licences and GPU needs must be checked against each repo before use.

## 5. Keeping this document alive

- Every agent run that touches an item appends one line under it: date, agent, what landed, what's left (and a line in
  `Director/gen/WORKLOG-epic.md`). A finished item changes its status word; nothing is deleted.
- `mv make` and `mv doctor` print the item number when a gate they enforce comes from here.
- The morning report (item 7's `tools/mv/metrics.mjs`, later Studio's) reads the loop metrics: note-to-fix time, candidates per beat,
  critic/J agreement, cold-view confusion count. The system's job is to make those numbers fall; a week with no movement on a number is a
  backlog item.
- J's words go in verbatim with the date, in "Why" lines and in `AGENTS.md`; a decision is only his words.

## Appendix: the earlier roadmap (M1-M9, 2026-11-05 to 07)

Done: shot cards with layers and takes; camera presets; the Review Room with notes, before/after, marks, the note loop proven on greener v9,
finals reusing unchanged shots; motioncheck + vision review on every rendered shot, failures back to the shot's agent; reverse, size and
cost tests; formats and styles that swap without touching shots; previs in hours (Greener: 21 min to a rough cut, 65 to a full one); the
bake gate, `mv review`, `mv freeze`; previs on baked takes; the second render lane measured and ruled out on this laptop. Not met: the
first full render judged good by J (Greener v9 accepted with weak animation; `videos/greener/RETRO.md`); J's notes under 20 (about 26: met
on paper). Still open from the research list: editorial-first `cut.json` (done in cards), `cast` replacing show/hide (done), whole-body
takes best-of-N (this document's item 2), clip admission (done, advisory), inertialized transitions (legacy path), per-actor twos (legacy;
native via sheet `step`), beat-warp (done), a motion library watched at speed before a video (done for Mixamo), choreography takes baked
before cameras (`mv choreo`), a pro dance mocap pack (needs J), lip sync checked against the waveform (item 3 supersedes).
