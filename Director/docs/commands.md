# Commands: `mv` and `call`

`mv` means `node Director/mv.mjs [--video <name>] <command>`. The video is `--video`, else `Director/current-video`
(`mv use <name>`), else `tkshock`. Times anywhere: `12:3` (bar:beat), `12` (bar), `41.2s`, `41.2` (seconds), `m3` (a mark),
`s5` (a section), with offsets `m3+2b`, `+1bar`. Lengths: `2b`, `1bar`, `0.5s`, `"6f"` (frames at the score's fps).

Commands marked **free** never touch Unity. Every other command takes a ticket in the Unity queue
([toolchain.md](toolchain.md) "Unity queue"). Unity only needs to be open; it may be in the background.

## The pipeline (free unless a stage needs Unity)

| Command | What it does |
|---|---|
| `mv make <video> [<stage>] [--shot <id>] [--force --w --h --fps]` | THE way to make a video: stages board, cards, build, motion, shot, test, previs, final, each a gate; runs up to `<stage>` (same as `--to`), stops at the first failed gate and prints each problem with `where:` (file) and `field:`. Passed stages are cached by a hash of their inputs. Exit 0 pass, 2 a gate failed, 3 waiting for J (hero tests), 1 error. State in `videos/<v>/make/state.json`. `tools/mv/make.mjs` |
| `mv make <video> plan` (or `--plan`) | the dry run: board and cards run for real (Node only), every Unity stage says what it would run, what is cached, the cold view's price, each hero test's window and approval. Touches no Unity, queue or Gen |
| `mv make <video> status` (or `mv status <video>`) | the stage table: pass / fail / STALE / waiting, and the next command |
| `mv approve <video> <shot> --note "J's own words"` | record J's yes on a hero test in `tests/approved.json` with his words. Refused without `--note`, without a rendered test, for a shot that is not a hero, or when the test is older than the shot. Keyed by the hash of every shot in the 5 s window: a change to any of them needs a new yes |
| `node Director/tools/mv/make-test.mjs [<video>]` | the proof of the Node gates: each broken on purpose on a copy (`videos/_make_tmp`, removed after) and seen to stop with its file and field |
| `mv coldview [previs.mp4]` | the cold view alone (Gen vision, about $0.015 a 20 s chunk) |
| `mv doctor [--fix --all]` | the shared machine in one screen: Unity CLOSED (no editor process: prints the command to reopen it) vs open-but-not-answering (hung, a modal dialog: never kill it, tell J), compile errors, stale `compile.lock`, hand-made `unity.lock`, dead tickets, Assets vs staging drift, stale or hand-edited generated files, dead leases, disk, memory. `--fix` does only the safe fixes; never touches Assets, cards or acts |

## Videos, cards, score (free)

| Command | What it does |
|---|---|
| `mv new <name> --song <file> [--quick --bpm 90 --offset 0]` | folders, song copy, starter score and act, demucs + `analyze_deep.py` (`--quick`: `analyze_song.py`, no stems). `--bpm/--offset` make a straight grid (a ruler for a video with no song) |
| `mv song <file> [--bpm --offset --quick]` | swap a video's song; lengths are in beats, so `mv cards` reflows every shot |
| `mv use <name>` / `mv videos` | pick the current video / list them |
| `mv cards [--take s3=b] [--fast]` | compile the cards to `acts/50-cards.json`, bake stale takes, build, end with the 5 Hz shot check line |
| `mv cards check` / `compile` / `sheet [--only a,b --at 0.1,0.5,0.9]` / `note <card> <key> <value>` | validate and print the cut / write the act only / three labelled frames per card (staging only, ~30 s, needs Unity) / add to J's notes |
| `mv cards insert\|remove [<video>] <at> <length> [--dry --drop --accept f,g --no-audio]` | grow or shrink the clock, moving every absolute time after the point ([toolchain.md](toolchain.md) "The clock") |
| `mv why <card> <key>` | which layer set a value |
| `mv lint [--strict --all --limit N --baseline --reindex]` | every known trap, no Unity, about a second; runs before every build |
| `mv style [name]` / `mv format [name] [--length 30]` | pick or list styles and formats ([styles-formats.md](styles-formats.md)) |
| `mv clips [<use>]` | the best clips for a use from the clip catalog, or every use with its top picks |
| `mv shots` | the shots with bar, beat, length and name |
| `mv freeze [--note "..."]` / `mv thaw` / `mv freeze status` | lock the engine and model hashes before polish |
| `mv final [--w --h --fps --to --plan --force --name v3 --allow-bake --allow-shot --no-review --no-critic]` | the whole video, rendering only changed shots (`tools/final.mjs`); `--plan` prints the plan and changes nothing |
| `mv review [<video>] [render.mp4] [--label v9 --no-vision --force --plan]` | the 24/30 fps reviewer on a render (`tools/review.mjs`) |
| `mv farm plan\|sync\|render\|previs\|test [--workers N]` | the cloud render farm ([render-farm.md](render-farm.md)); `render`, `sync`, `previs` refuse without `FARM_OK=1` |
| `mv queue` / `mv hold <command line>` | who is waiting on Unity / keep the turn across several calls |
| `mv csharp apply <staging-dir>` / `check` / `lock [status\|break]` | the ONLY way C# and shaders reach Assets (apply holds the queue and compiles) |
| `mv generated [check\|adopt\|regen]` / `mv lease take\|release\|status` / `mv refs <name>` / `mv snap <image...>` | the generated-file manifest, data-file leases, references, fresh-named image copies ([toolchain.md](toolchain.md) "Working beside other agents") |
| `mv test [--only reverse,size,cost --set-baseline]` | the build tests (needs Unity) |

## Unity (take a queue ticket)

| Command | What it does |
|---|---|
| `mv ping` / `mv unity` / `mv status` | is Unity up / the editor's own status, time, playing |
| `mv build [--fast] [--strict] [--full]` | plain build saves and bakes dead zones; `--fast` keeps the timeline in memory and reuses unchanged tracks |
| `mv refresh` / `mv open` / `mv setup` | reload scripts (after a C# change, then build) / open the scene / first-time setup |
| `mv marks` / `mv marks-clear` | J's marks from the desk: time, bar:beat, section, note, screenshot |
| `mv frame <time...> [--w 960 --h 540]` / `mv sheet <from> <to> [--every 2b --cols 4]` | exact frames as PNG / a contact sheet (staging only) |
| `mv seek\|play <time>` / `mv pause` | transport |
| `mv shot <n\|name> [--handle 1 --cols 6 --final --allow-shot]` | one shot at 640x360 with sound and a 1 s handle, same picture as a final but edge smoothing (`--final` keeps it), to `videos/<v>/shots/` with a contact sheet |
| `mv previs [--fps 12] [--aspect 9:16]` | the whole cut at 426x240, no post, baked takes; **pass `--fps 24` on a 24 fps video** |
| `mv render [--from t --to t --w --h --fps --wait]` / `mv render-status` / `mv render-cancel` | a plain render to `Director/output/` (holds the queue to the last frame) |
| `mv bake [status \| <take...>] [--stale]` | bake stale takes (every build does this too) / the bake report against `library/bake-gate.json` |
| `mv critic [<video>] [from to] [--on person,other --label x --zerog]` | the motion critic on bone dumps of the built scene, no render ([qa-review.md](qa-review.md)) |
| `mv motion <from> <to> [--every 2 --on person --view side\|front\|back\|top --cols 8 --file f.png]` | silhouette sheet with the hips path, pops, foot slide |
| `mv motioncheck <from> <to> [--every 0.1 --on a,b --budget 60 --checks joint\|shot\|contact]` / `mv motioncheck --shot <n\|name> [--set-baseline]` | joints, contact, props, pops, floor, plus the shot checks |
| `mv shotcheck [<video>] [--from --to \| --shot n --probes]` | camera and staging checks only (frame, gesture, mark, readable, camin, propat) |
| `mv lab <file.json>` | try cues on a throwaway copy of an actor, no build ([score-cues.md](score-cues.md) "Try it without building") |
| `mv choreo build\|play\|check\|segments\|phrases\|test` | dance takes ([choreography.md](choreography.md)) |
| `mv find <words> [--type model\|prefab\|audio\|texture\|animation\|material\|vfx]` / `mv pull "<package>" "<path words>"...` | search J's downloaded `.unitypackage` index / bring in an asset with what it references, materials converted to `MV/Lit` |
| `mv call <command> '<json>'` | a `[BridgeCommand]` in the editor (below) |

Frame tools (`frame`, `sheet`, `shot`, `render`, `previs`, `cards sheet`) refuse a stale scene (last build failed or inputs changed since; `Director/gen/build-<video>.json`); `--allow-stale` overrides. C# changes are not covered: build after one.

## `mv call` commands (the editor bridge)

| Call | What it does |
|---|---|
| `peek '{"pos":[x,y,z],"look":[x,y,z]}'` | a free camera on the set |
| `look '{"t":100}'` | every look value at a moment |
| `feedrt` | what the corner camera sends the screens, plus each TV's block |
| `inspect '{"path":"Assets/...","bones":["Head"]}'` | size, rig, parts; a bone's rest offset for attach `pos`/`rot` |
| `clips '{"path":"..."}'` / `clipprobe '{"clips":["Name"]}'` | a file's clips / what a clip's root and hips do |
| `bench '{"t":[100]}'` | frame cost |
| `bones '{"t":70}'` | where his body is at a moment, for framing |
| `nativeorder`, `attachprobe`, `camprobe '{"t":1.47}'`, `gfxprobe '{"t":170}'`, `gfxvariants`, `evalorder` | engine probes: track order vs the Animator, attach lag, the walk's camera vs `mv frame`, visible text meshes, TMP variants, evaluation order |
| `posederive '{"sheet":"zg_neutral"}'` / `posecheck '{"sheet":"..."}'` / `posemuscles` | keyed poses ([keyed-poses.md](keyed-poses.md)) |
| `clipderive '{"src":"IdleSit13","out":"sit_knee_kick_r","len":3,"add":{...}}'` | a clip plus keyed muscle offsets |
| `clipimport '{"apply":true,"prefix":"mx_","only":[...]}'` / `cleanclips` | import settings per clip / clean copies in muscle space ([native-acting.md](native-acting.md)) |
| `clippreview` / `clipbones` / `shotbones` / `bakedump` / `bakewrite` / `admit` | the catalog preview, critic dumps, bake I/O, clip admission (driven by their tools) |
| `fidelity`, `shotbones` + `node Director/tools/fidelity_shot.mjs old.json new.json` | engine fidelity tests (`Director/review/engine-fidelity.md`) |
| `motioncheck '{"from":0,"to":204,"every":0.1}'` / `motioncheck-selftest` | the motion check / its collider proof |
| `buildnative '{"native":true,"fast":true}'` | build a video with every human native once, without changing the score |
| `importturkeys` / `importprops` | copy turkeys and props from `Director/gen` with the right settings |

## Other tools (Node, Python, bash; no Unity unless said)

| Tool | What it does |
|---|---|
| `node Director/tools/qa.mjs <shot\|all> [--strict --notes --force --no-vision --render f.mp4 --label x]` / `qa.mjs report` / `selftest` | per-shot QA ([qa-review.md](qa-review.md)) |
| `node Director/tools/review_strips.mjs --video <mp4> --start <s> [--check <motioncheck json>] [--cuts]` | 13-frame strips at pops and cuts |
| `node Director/tools/critic.mjs clip\|pose\|cut\|dump\|reference\|calibrate\|vision\|test` | the motion critic |
| `node Director/tools/flashcheck.mjs <video.mp4> [--json f --quiet]` | the Ofcom flash rule (`mv final` runs it) |
| `node Director/tools/reverse_test.mjs` | frames match forward and backward (after engine changes) |
| `node Director/tools/clip_catalog.mjs previews\|strips\|build\|todo`, `clip_admit.mjs`, `motion_lib.mjs render\|strips\|gallery\|todo` | the clip catalog, admission, the motion library (previews under `mv hold`) |
| `node Director/tools/bake.mjs [<take...>] [--video v --clips --report --compare]` | bake takes (legacy path) |
| `node Director/tools/perf_lab.mjs <name>`, `perf_gallery.mjs` | performances |
| `node Director/tools/board2cards.mjs`, `tools/board_tests.sh` | the board to cut and cards; the 5 s hero tests |
| `node Director/tools/punch_lines.mjs [--export]`, `punch_beds.mjs <video>`, `punch_sfx_prep.mjs`, `remix.mjs`, `face_act.mjs` | Hawkes Punch sound ([sound.md](sound.md)) |
| `node Director/tools/farm.mjs`, `node Director/tools/final.mjs --plan-json` | the farm coordinator, the final plan as JSON |
| `node Director/room/next.mjs [take\|done\|ask\|list]` | the Review Room's notes ([room.md](room.md)) |
| `node Director/mv.mjs hold node Director/tools/mv/stylesheets.mjs [--styles a,b --clips]` | style sheets |
| `py Director/tools/index_assets.py` | rebuild the `.unitypackage` index |
| `py Director/tools/sfx_make.py "<name>" "<description>" [seconds]` | a sound effect into the library |
| `py Director/tools/mocap_fetch.py status`, `motion_rig.py`, `motion_match.mjs`, `motion_sim.py`, `motion_make.py` | mocap on disk, his BVH rig, matching, physics, Gen motion batches |
| `bash Director/tools/person.sh [--no-blender]`, `person2.sh`, `py tools/face_shapes.py`, `blender_coat.py`, `coat_assets.py`, `glasses_lens.py`, `space_tex.py` | him, her, face shapes, the coat, glasses, space textures |
| `bash Director/tools/side_by_side.sh a.mp4 "A" b.mp4 "B" out.mp4` | a side-by-side video |
