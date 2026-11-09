# Native acting: the Animator path, clip import and cleaning, the clip catalog, generated clips

New videos (made after 2026-11-07) play humans on the **native path**: Unity's own Animator with its Humanoid Avatar, from Timeline
AnimationTracks the compiler writes (`Editor/Native/NativeCompile.cs`). Why: engine fidelity (`Director/review/engine-fidelity.md`)
proved clip sampling is exact to 0.000°, and the stages our legacy path added on top (ground, limits, finger curl, inertial transitions,
additive layers) bent joints by tens of degrees, up to 91° on the feet. `"native":true|false` in a score or on an actor decides; on by default for
videos made after 2026-11-07, and `tkshock greener touchgrass demo _cards_test styletest` keep the old path (Hawkes Punch's score says
`"native": true`); `mv call buildnative '{"native":true,"fast":true}'` builds a video with every human native once, for a test.

## What plays

- Each `anim`/`walk` is a clip overlapping the last by its `blend` (a muscle-space crossfade with ease); `start`/`offset`/`rate`/`beats`/
  `once` map to clip-in, time scale and loop (`warpTo` plays at its average rate). A `layer` is an Override track with an AvatarMask for its
  mask (`upper lower arms leftArm rightArm head spine`; assets in `Assets/MusicVideo/Generated/Native/`).
- **`rate`, not `speed`:** `speed` on a `do: anim`/`layer` cue never reaches the clip (it is the score's slow-motion key, stripped from cue
  args), so `speed` in older cards plays at 1; `rate` sets a native clip's playback rate.
- Our MotionTrack still moves the actor (marks, walks, root motion) and the face. **After the Animator, in the same frame** (`Runtime/
  MVLate.cs`, 2026-11-08), it adds `reach` (joint-rotation blend, elbow kept in the clip's own bend plane), `gaze` (neck and head only,
  `limit` 60, fades out behind him; eyes lead), `eyes`, `fingers` (only the fingers a cue names; `set` for a grip), `limbscale`, and every
  driver that reads a native bone (`attach`, `catch`): inside a director Evaluate our tracks ran before the Animator wrote the pose
  (`call nativeorder`), so an attach trailed the hand by a frame and sat where the hand was in the shot before on a cut (0.42 m on
  d_can). Now they are queued and run on the finished pose; a native body read at another time while they run (a gaze reading ahead, a
  lead camera) is read into a stand-in and put back, and a last pass puts back anything left at another time before every render and after
  the Evaluates whose result is read without one (`mv frame`, renders, seek, the motion check, the dead-zone bake). `call attachprobe`
  reads 0 cm (was 10, 94, 42). Between samples a native body is evaluated with the whole timeline, so a full motion check costs more on
  native videos. New code that reads or writes a native body's bones in a track must go through MVLate or it is a frame late.
- **Ignored on native actors, with a build note:** `keys`, `pose`, `plant`, `stance`, additive layers, ground, joint limits, the finger
  rest curl, overlap, inertial transitions, bakes (a take plays from source), `steps`, `speed`. Acting comes from clips: the catalog,
  `call clipderive`, a keyed pose sheet ([keyed-poses.md](keyed-poses.md)), or a generated clip.
- **Rough:** a `walk` plays its clip at the clip's own pace, not tied to the distance (feet skate: derive a clip at the walk's speed or cut
  around it); a blend tree plays its heaviest clip; a layer at weight under 1 plays at full weight. (Layers on Person2 work: `videos/_layer_test`, 2026-11-08.) A hitstop or freeze inside a crossfade is skipped with a build note: give the clip at the hit `blend: 0`
  ([epic-fx.md](epic-fx.md)).
- `call clipderive '{"src":"IdleSit13","out":"sit_knee_kick_r","len":3,"add":{"Right Lower Leg Stretch":[[0,0],[0.17,0.75],
  [0.32,-0.12],[0.75,0]]}}'`: a clip plus keyed muscle offsets (muscle names as Unity's `HumanTrait.MuscleName`).

## Clip import and clean clips (every humanoid clip, both paths)

- New Mixamo FBX go in `Assets/MusicVideo/Motion/Humanoid@<name>.fbx` (or `<name>.fbx`), "Without Skin"; they import as Humanoid with
  the root kept in the clip and the clip named after the file, so `"clip":"<name>"`, `"from":"<name>@0.4"` and `"root":1` just work.
  Mixamo downloads: the site's export API from the page and `curl -o` into `Director/gen/mixamo/`, never the browser's Download button.
- `mv call clipimport '{"apply":true}'` (`"prefix":"mx_"`, `"only":[..]`) measures each clip on his rig and sets Loop Time and Bake Into
  Pose on loops only, Root Y Based Upon Feet on all, XZ as root motion for travelling clips, and a per-clip Foot IK verdict (off unless it
  cuts slide by a third with no knee moved past 25°); `Director/library/motion/import.json` holds the choices and the settings before. New
  FBX get defaults once; `MVMotionImport` keeps what the `.meta` has after that.
- `mv call cleanclips` cleans each clip once in muscle space into `Assets/MusicVideo/Motion/Clean/<name>__clean.anim` (quaternion
  continuity, 1-2 frame flips out, a peak-keeping Savitzky-Golay pass, muscles inside the Avatar's ranges, feet held through contacts where
  Foot IK doesn't flip a knee) and measures it against the source; a native actor plays the clean clip only where it beats the source on
  jitter, snaps and slide with peak speed kept within 15% (`clean.use` in `import.json`). Run both after adding clips, then previews and
  verdicts into the catalog, then `mv lint --reindex`.
- Fidelity tools: `call fidelity`, `call shotbones` + `node Director/tools/fidelity_shot.mjs old.json new.json`, `call evalorder`;
  `bash Director/tools/side_by_side.sh a.mp4 "A" b.mp4 "B" out.mp4`.

## The clip catalog (stage from it)

`Director/library/motion/catalog.md`, `catalog.html` (2026-11-07): every humanoid clip in `Assets/MusicVideo/Motion` (180) plus the pack
clips Hawkes Punch uses (9) has a preview on his rig through the native path (`previews/<clip>.mp4`, 640x360 30 fps, a front three-quarter
full body and a medium on the upper body and hands; clean clip where used; up to 8 s), measures over the whole clip (`previews/<clip>.json`:
hand curl and spread, hands near the face or in the body, head yaw, forward lean, knee bent backward (advisory), drift, peak hand and foot
time), and a verdict watched at 15 fps with 30 fps bursts (`verdicts.json`, brief `verdicts/BRIEF.md`): `grade` A/B/C/ban, `uses` and
`weak` by tag (`talk listen react laugh think shrug sigh gesture point wave thumbs-up clap bow write drink punch kick throw catch dodge
hit-react fall taunt scared lift put-down pull look-back fly float sit kneel stand-idle walk sneak run turn stairs crawl injured dance pose
jump transition`), `needs` (`relaxed grip`, a seat height, a start or stop time), and one line "good for; weak at; needs". Machine form:
`catalog` in `Director/library/clips.json`.

- **`mv clips <use>`** prints the best clips for a use with their lines; **`mv lint`** warns on a native human: `clip-banned`,
  `clip-weak-use` (the card's idea, feel or note is about a use the clip is weak at), `clip-needs-grip` (a clip that holds the fingers flat
  or splayed with no `fingers` cue), `clip-no-verdict`, `clip-no-preview`, `clip-uncatalogued` (expected on the `zg_`/`gm_`/`hp_` clips
  until graded).
- Tools: `node Director/mv.mjs hold node Director/tools/clip_catalog.mjs previews [clip...] [--force]` (Unity, `call clippreview` in
  `Editor/Native/MVClipPreview.cs`, about 5 s a clip), `clip_catalog.mjs strips [clip...]` (ffmpeg, `previews/strips/`, every frame at 15
  fps in rows of a second; a clip over 8 s needs `--cell 240`), `build`, `todo`.
- Found while grading: the `mx_turn_*` clips and `mx_walk_turn_180` import as loops with the turn baked into the pose (play them `once`
  with `root:1`); every walk previews in place (judge walks with `walk`); `mx_hh_listening_2` is the same FBX as `mx_hh_listening`; the six
  non-`mx_` clips are copies of their `mx_` twins; `mx_shrug` plays as a real shrug now (it imported as a T-pose before the clip import).
- **The motion library** (`Director/library/motion/`, the older grading for dance): `gallery.md` with a contact strip and notes per clip by
  category; `clips.json` per clip `verdict` A/B/C, `style`, `segments` (`start`/`stop`, `bars`, `what`, `use`), `masks`, `speed140`/
  `speed100`, `avoid`, `tags`, `performance`. `node Director/tools/motion_lib.mjs render|strips|gallery|todo`. Mixamo has no hair flick,
  curtsy or finger-to-lips by name; the local collection has no dance mocap.

## Generated clips (`gm_`, `zg_`, `vm_`, `sim`)

`motion.from-text` runs through Hawkes Gen on its RunPod 3D worker (HY-Motion 1.0 while Kimodo waits on Llama access; no finger motion,
so every `gm_` clip needs a `fingers` grip). Ask for BVH only (no `character`, about $0.02 a job), then retarget in one `blender.character`
job onto `Person/Person.fbx` with the 11-bone map (`Director/gen/genmotion/GEN-BUGS.md`; [gen-and-studio.md](gen-and-studio.md)) and
`from: smpl`; files and takes in `Director/gen/genmotion/` (14 FBX so far). Prompting: "float" alone gives a kneel with the head thrown
back; write "upright, knees slightly bent, legs hanging loosely below, head level looking straight ahead" into the prompt and every key
pose (zg_idle went from C to B). Big-body moves work; precise hand targets (face, shoulder, palms meeting) mostly fail. Candidates from
physics (`tools/motion_sim.py`, MuJoCo), mocap matching over CMU and Protofactor (`tools/motion_match.mjs`, `gen/mocap/`) and Gen
`motion.from-video` land as catalog clips too; every candidate is scored by the critic before a shot plays it
([qa-review.md](qa-review.md)).
