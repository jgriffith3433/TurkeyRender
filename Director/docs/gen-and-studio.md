# Hawkes Gen and Hawkes Studio in this project

Every generative step goes through **Hawkes Gen** (https://hawkesgen.ai; `C:\Projects\hawkesgen`, read its `AGENTS.md` before changing
it; the clients on this PC use `~/.hawkes/client.json`, never print its values). Project name `tkshock`. GPU work is priced first
(`hawkesgen_estimate`, `POST /v1/estimate`) and capped: under a few dollars (voices, sfx, motion candidates, vision) go; more, or any cloud
render, ask J with the number (memory: motion and voices reopened 2026-11-08, priced). Batch every GPU job of a step in one `submitMany`
so Gen batches by model family. The MCP server `hawkesgen` is in `.mcp.json` (`hawkesgen_run`, `hawkesgen_estimate`, `hawkesgen_library`,
`voice_line`, `sound_effect`, `animate_character`, `rig_character`, `upload_file`, `get_task`...); `tools/mv/hawkesgen.mjs` is the
Node client the tools use.

| Need | Gen tool | Where it is wired here |
|---|---|---|
| Voice lines | `audio.voice-open` (qwen3-tts; seeds him 1101, double 2202, doctor 3303, announcer 4404), `audio.voice`, `audio.voice-design` + `voice-save` | the lines in `Assets/MusicVideo/Sfx/punch/*`, `tools/punch_lines.mjs` places them ([sound.md](sound.md)) |
| Sound effects | `audio.sfx` | `tools/punch_sfx_prep.mjs`, `py tools/sfx_make.py` |
| Body motion from text | `motion.from-text` (HY-Motion 1.0 fallback; Kimodo once Llama access lands) | `tools/motion_make.py`, clips in `Director/gen/genmotion/` ([native-acting.md](native-acting.md)) |
| Retarget BVH onto his rig | `blender.character` with `from: smpl` and the 11-bone map below | `GEN-BUGS.md`, `tools/motion/blender_bridge.py` |
| Motion from video | `motion.from-video` (GEM-X / GVHMR) on public-domain footage, or on a Gen-made reference video (`video.t2v`/`i2v`; AI video as mocap source only, never on screen) | the motion-outside-Unity agent (acf312207c1d518d3), candidates `vm_` |
| Motion check | `motion.check` (reads the BVH only: a retarget fault shows only in the preview) | |
| Rig / animate a character | `rig_character`, `animate_character` | |
| Vision and text (reviews, QA, the note loop, cold view, critic vision, panels) | `llm.json`, `llm.text` (Sonnet at medium/low effort; about $0.025 a QA shot, $0.01 a critic strip, $0.015 a cold-view chunk, $0.05 a note) | `tools/qa.mjs`, `review.mjs`, `critic.mjs vision`, `room/auto.mjs`, `mv coldview` |
| Storyboard panels | `image.generate` (Z-Image Turbo, greyscale with one red accent, cents each) | `videos/hawkespunch/storyboard/make_panels.mjs` |
| Textures | `image.*`, `texture.maps` | `tools/space_tex.py` draws space by hand, no Gen spend |
| Unity renders in the cloud | `unity.render` (not built yet) | [render-farm.md](render-farm.md), `tools/farm.mjs` |

**The retarget bone map** (his rig and Person2 name the limbs the Unity way and the fingers the Mixamo way; without it the import picks
`mixamo` by majority and loses arms and legs, `"humanoid": false`):
```json
{ "op": "import", "file": 0, "names": "mixamo", "map": {
  "LeftUpperLeg": "LeftUpLeg", "LeftLowerLeg": "LeftLeg", "RightUpperLeg": "RightUpLeg", "RightLowerLeg": "RightLeg",
  "LeftUpperArm": "LeftArm", "LeftLowerArm": "LeftForeArm", "RightUpperArm": "RightArm", "RightLowerArm": "RightForeArm",
  "Chest": "Spine2", "LeftToes": "LeftToeBase", "RightToes": "RightToeBase" } }
```
Generate BVH only (no `character`, about $0.02 a job), then one `blender.character` job with this map (test job `j_3af6226cd13e`).

**Open Gen bugs** (`Director/gen/genmotion/GEN-BUGS.md`, filed with Studio as change `c_35f341814905`): 1. Kimodo never runs (Gen's
HF token lacks `meta-llama/Meta-Llama-3-8B-Instruct`; J requested access 2026-11-08, pending; HY-Motion is the fallback, no finger
motion). 2. Retargeting onto his rig loses the limbs without the map; `motion.from-text` has no `map` param. 3. A RunPod 429 fails the
job instead of retrying (and still charges). 4. An `asset:` input whose file is gone from Gen's disk fails at submit (download and pass a
local path). 5. Polling `GET /v1/jobs/:id` every 30 s is rate-limited. 6. The estimator runs low on 3D jobs.

**Hawkes Studio** (`C:\Projects\hawkesstudio`, https://studio.hawkesgen.ai; MCP `hawkesstudio` in `.mcp.json`): the shared memory
(`memory_search` before planning, `memory_write` when something durable is learned, a decision only in J's words), `studio_task` to file
work on Gen or Studio (how the Gen bugs went in), the backlog, playtests and the daily loop for the games. TKShock is not a Studio project
yet; registering it (build = `mv make`, review = critic + cold view + shot check, J directing through Talk, review pages on his phone) is
item 4 of [roadmap-system.md](roadmap-system.md).
