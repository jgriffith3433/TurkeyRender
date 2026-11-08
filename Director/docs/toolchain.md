# Toolchain: videos, builds, lint, queue, shot reuse, the clock, working beside other agents

Commands are listed in [commands.md](commands.md); this is how the machinery behaves.

## Videos

`mv --video <name>` picks one; without it, `Director/current-video` (`mv use <name>`), then `tkshock`. `mv videos` lists them.
TK Shock stays where it always was: `Director/score.json`, `Director/acts/`, `Assets/Scenes/MusicVideo.unity`,
`Assets/MusicVideo/Generated/`. Every other video is `Director/videos/<name>/` (`score.json`, `acts/`, `audio.*`, `song.json`,
`marks.json`, `sfx-map.json`, `inserts/`, `captures/`, `shots/`, `cards/`, `cut.json`, `style.json`, `tweaks/`, `notes/`, `review/`,
`final/`, `make/`) plus `Assets/Videos/<name>/` (`<name>.unity`, `Generated/`, `Song/`). `Assets/MusicVideo/` holds what all videos
share: engine, Person, Person2, Turkey, Props, Motion, Sfx. `mv new` names can't start with `_`; the `_`-prefixed videos
(`_cards_test`, `_fx_test`, `_space_epic`, `_shotcheck_test`) are proofs and tests, never for J.

`mv new <name> --song <file>` makes the folders, copies the song, writes a starter score and act, runs demucs and `analyze_deep.py`
(`--quick`: plain `analyze_song.py`, no stems, can read double time). `--bpm 90 --offset 0` states the tempo for a click or a
placeholder: a straight grid, bar 1 on the first beat (the ruler a comedy short is cut on; see [dialogue-clock.md](dialogue-clock.md)).
`mv song <file>` swaps a video's song: lengths are in beats, so `mv cards` reflows every shot and no card changes. In a score,
`"sharedModels":"../../score.json"` links the shared models: that score's `models`, with your own on top.

## Builds

- **A plain `mv build`** makes everything and saves: the scene's `_Generated` and every Timeline track are rebuilt from the score (never
  hand-edit them; hand changes in Unity are lost), dead zones bake, the `size` test runs (scene under 50 MB, timeline under 30, Generated
  under 400). Do a plain build before J plays, a shot render or a final.
- **`mv build --fast`** is for working: the timeline stays in memory (`HideFlags.DontSave`), nothing is saved; it keeps the actors when
  `actors`, `models`, `stage` and `shows` are unchanged and every track whose clips are unchanged. The first `--fast` after a plain build,
  or after any C# change, builds everything once (reuse lives in statics). `--fast --full` forces that. Dead zones come from the last plain
  build when the score is identical; otherwise off until the next plain build. After changing a format, build with `--full`: a reused set
  keeps the old canvas.
- **Camera dead zone:** a plain build gives every shot that looks at a body a baked dead zone, about a fifth of the frame, so the camera
  doesn't twitch with the subject. `"deadzone":false` on a shot turns it off. `--fast` skips it.
- After a C# edit, `build` can report the previous compile errors or run on the old code: `mv refresh`, wait for the reload, then `build`.
  C# reaches Assets only through `mv csharp apply` (below).
- **Stale scenes.** `frame`, `sheet`, `shot`, `render`, `previs` and `cards sheet` refuse when the last build failed or its inputs changed
  since, and name the files (`Director/gen/build-<video>.json`). `--allow-stale` overrides; don't reach for it. C# changes aren't covered.
- **The scene file** holds the camera, the director and little else; everything under `_Generated` is left out at save, and a scene that
  opens without it builds itself from the score. A plain build fails past 50 MB and lint reports it too.
- **Build tests:** `mv test` runs `reverse` (eight moments match going backward, 30 dB after a soft blur so grain doesn't count), `size`,
  `cost` (ms per frame at six moments; 25% plus 15 ms over `<video>/test-baseline.json` fails; `--set-baseline` accepts new numbers).
  `--only cost` picks one. Results: `captures/test-report.json`. `node Director/tools/reverse_test.mjs` after engine changes: bars 58-68
  of TK Shock can fail on grain alone, look at the `_a` and `_b` frames before believing it.

## Lint

`mv lint [--strict --all --limit N --reindex]`, Node, about a second, runs before every `build` and stops it on an error with file,
line and a plain fix. It checks every trap in [../PIPELINE.md](../PIPELINE.md) that shows in text, plus unknown cue keys (read from the
C#, so the list can't go stale), unknown clips (the `.fbx.meta` files), `look` arrays, times outside the song, `move`/`rotate` on humans,
duplicate actors, sets with no `from`/`until`, lights with no end, a hand or foot target with no prop, cuts and text per bar against
`"targets":{"cutsPerBar":{"s5":3,"DROP":4}}` in the score, a scene over 50 MB, `perform` parameters against the performance file, and
on native humans the clip catalog (`clip-banned`, `clip-weak-use`, `clip-needs-grip`, `clip-no-verdict`, `clip-no-preview`,
`clip-uncatalogued`; [native-acting.md](native-acting.md)). **Unused keys:** `mv lint` and `mv cards check` warn, with file, line and a
fix, on a key nothing uses (`tools/mv/keyuse.mjs`); a key read in shared code for every kind of cue still passes. Warnings become errors
with `--strict`. Deliberate exceptions go on the cue or actor: `"lint":"slide"` (move on a human), `"lint":"point"` (a reach into air),
`"lint":"always"` (a set or directional light on all the time). `lint-baseline.json` in the video's folder holds accepted findings
(`mv lint --baseline` writes it, `--all` shows them); keep it empty on a new video.

## Shots, previs, renders

- `mv shots` lists shots with bar, beat, length and name. `mv shot <n|name> [--handle 1 --final]` renders one at 640x360, 30 fps (the
  score's fps), with sound and a 1 s handle each side, the same picture as a final (depth of field and every look key) with only edge
  smoothing off (`--final` keeps it), to `videos/<name>/shots/`, with a contact sheet beside it. The picture comes from Unity and the sound
  is mixed and muxed in Node (`tools/mv/sound.mjs`), so every frame is kept (Transport.cs's `-shortest` mux dropped a shot's last 2
  frames). A shot's preview mixes only sfx that start inside its window: beds that began earlier are missing (a final is right).
- `mv previs [--fps 12]` renders the whole video at 426x240 with no post, AO, shadows or Stylize pass, and the TV feed, eye and doors only
  every 4th frame, to `videos/<name>/previs.mp4`. **Previs plays the baked takes** (`MVBake.cs` picks a bake by key at every quality) and
  prints how many played baked, naming any that played from source (`mv bake` first). It ignores the style's fps: pass `--fps 24` on a
  24 fps video. Measured on greener: 1858 frames at 12 fps in 78 s; a build and a full previs is under two minutes.
- `mv render` is the plain whole-or-range render into `Director/output/`, holding the queue to the last frame; it runs inside Unity a few
  frames per tick and waits while J plays (`mv render --w 1280 --h 720 --fps 30 --wait`, `render-status`, `render-cancel`). Its mux doesn't
  read `silence.json`; `mv shot` and `mv final` do.

## The bake gate (legacy path)

Every `mv cards` and `mv build` first bakes every human take the cut uses whose bake is missing (`tools/bake/key.mjs` computes the
compiler's bake key in Node; `--no-bake` skips and the takes play from source), builds, then writes `videos/<v>/bake-report.json`: each
take use's numbers judged against `Director/library/bake-gate.json` (per video: snaps 5, acceleration spikes 0, elbow and knee flips 0,
hyperextension 0; per take: ankle over range 200 frames, near-floor foot travel 2.5 m; set so Greener v9 passes). `mv final` and
`mv render` refuse on a failing report and name the take and the number; `--allow-bake` renders anyway. `mv bake status` prints the
report; `mv bake` bakes what is stale, `mv bake <take...>` named takes. Native videos play clips, not bakes: see
[native-acting.md](native-acting.md).

## Shot reuse: `mv final`, freeze, `--plan`

`mv final [--w 1280 --h 720 --fps 30 --plan --force --name v3]` renders only the shots that changed and stitches the rest from their
saved renders in `videos/<v>/final/<w>x<h>-<fps>/`, then mixes the sound once over the whole video, runs `mv review`, the critic and
`tools/flashcheck.mjs`, and writes `final/report.md`, `final/renders/<file>.json` (the shot hashes), `final/critic.json`,
`final/flashcheck.json`, `final/progress.json`. The Room has a Final render button and shows the report.

- **A shot's hash** comes from the compiled score (`tools/mv/shotdeps.mjs`): every cue inside the shot, every earlier cue still running
  or holding, the actors on screen and anyone they or the camera name, their model files, the performances they play, the engine's code
  (`shotdeps.engineHash`: Runtime C# and shaders; on a native video also `Editor/Native/NativeCompile.cs`, `MVClipClean.cs`,
  `MVClipImport.cs`), the song and the frame size. Card, take, tweak, note, style, sequence, set, lighting and mood all count; words that
  change no picture don't. **Each clip a shot plays is a part of its own** (`clip <name>`, stamped from the file, its `.meta`, its
  `library/motion/import.json` entry and, for a native actor, its clean copy; `tools/mv/clipfiles.mjs`), and materials and textures an
  actor names outside its model's folder are `files <actor>`. A doubt means a render, never a stale shot. A saved render is used only when
  the hash matches and the file really has that size, frame rate and frame count. `node Director/tools/mv/shotdeps.mjs test`.
- Shots are cut to whole frames, each frame in exactly one shot; picture joins without re-encoding; every final checks frame count, frame
  spacing and clicks at seams.
- **`mv final --plan`** compiles the cards in memory (writes nothing), prints why each shot renders (one line each), the shots and frames
  reused, the reasons grouped, the minutes at the last final's pace, how many review verdicts carry and what the asked ones cost. A real
  `final` prints the expected minutes first, before the queue (`final/progress.json` `expected`).
- **Freeze.** `mv freeze [--note]` records a hash of the engine, every C# file under `Assets/MusicVideo` and his model
  (`Assets/MusicVideo/Person`) in `videos/<v>/freeze.json`; `mv thaw` lifts it; `mv freeze status` compares. While frozen, `final --plan`
  warns in red when the engine or the model moved since (every shot would re-render) and `mv cards` warns on any C# change. The rule: engine
  and model changes before the slice, frozen after, so a fix costs minutes, not a full render.
- **Three gates before a render J sees:** the bake gate, the shot gate (`mv shot`, `mv render` and `mv final` refuse on an A shot fault in
  what they render; `--allow-shot`; [qa-review.md](qa-review.md)), and the review (`mv final` prints the A faults; a version with an A fault
  is not one for J).
- **Measured:** Touch Grass 1280x720 30 fps, 20 shots, full render 8.7 min; one card tweaked: 249 of 2250 frames, 3.8 min, 18 shots reused
  frame-identical. `_cards_test` one-shot fix: `--plan` 1.4 s, the real final 74 s door to door, review asked 2 shots and carried 10 for
  $0.016. Hawkes Punch v1: 73 shots, 6,100 frames, 0.115 s a frame, 15 min door to door. A 1280x720 final is about 0.22 s a frame on this
  laptop.
- Limits: an engine change renders every shot (correct, and a full render). Bakes aren't in the key (a re-bake under the same key needs
  `--force` on its shots). A change to his performance can re-render later shots he is in; the lawn's `push` names him so he counts on
  shots that hide him; a prefab's pack counts as a whole.

## The clock: `mv cards insert|remove` (`tools/mv/clockshift.mjs`)

`mv cards insert [<video>] <at> <length>` makes room in a video's clock and `remove` takes time out; `<at>` is `12`, `12:3`, `41.2s`, a
section, a cut name or `end`, `<length>` `8bars`, `32b` or `20s` (rounded to whole beats of the local spacing). Every absolute time at or
after the point moves by the same amount, bar:beat strings by the same beats: song.json (beats, duration, sections, bars, onsets, phrases,
envelope zeros), cut.json (pins and `beats` names; a shot over the point grows, the first shot after a gap is pinned), score.json and every
act (`at`, `until`, `land`, absolute `sfxAt`, `keys` `t`, actors' `from`/`until`, sections; edited as text so comments stay), lyrics.json,
lyrics-raw.json, duck.json, marks.json, notes.json, sfx-map.json, lines.json, and the audio (silence spliced in or the range cut out). It
stops, writing nothing, on anything it can't place: an unknown file in the video folder, a tool under `Director/tools` that names the
video and may hold its times (times in a tool's code are the trap: `punch_lines.mjs --export` moved its LINES to `lines.json`), a relative
time whose cue before is on the other side of the point, and on remove a cue or shot inside the range unless `--drop`. It warns on a cue
whose `for` runs over the point. Before writing it compiles the cards in a scratch copy and checks every card lands where the map says,
then writes `videos/<v>/_backup/<op>-<bar>-<beats>b-<time>/` (every file before, plus `rebase.json`), the files, and compiles the cards.
`--dry` prints and writes nothing; `--accept <file>` passes a file it would refuse; `--no-audio`. Proven on a copy of Hawkes Punch: insert
2 bars moved 489 of 617 cues exactly 8 beats, remove gave back all 7711 values and a byte-identical `50-cards.json`.

## The Unity queue

Every `mv` call that touches Unity takes a ticket in `Director/gen/queue/` and waits its turn, first come first served. A ticket goes when
its process goes, however it dies, and one that stops beating for 2 minutes is dropped. `mv queue` shows who is running and waiting;
`mv hold <command line>` keeps the turn across several calls. **One Unity on this laptop** ([hardware.md](hardware.md)): a second editor
would page the first out and reach the commit level that crashed Greener twice. The second lane is the cloud farm
([render-farm.md](render-farm.md)). **Never make `Director/gen/unity.lock` by hand**: the queue writes it for old scripts and waits 90 s
for a hand-made one before stopping. Never kill or restart Unity. `--lock` on `motioncheck` is ignored.

## Working beside other agents (2026-11-08 hardening)

- **One agent owns Unity per video** (build, render, motion check, shot check, previs, final) and batches its work into a few long turns.
  Everyone else works off Unity: cards, clips, sound, catalog, review, tools.
- **C# and shaders reach Assets only through `mv csharp apply <staging-dir>`** (`tools/mv/csharp.mjs`). Stage files in
  `Director/staging/<role>/Assets/...` (the same path as in the project). `apply` takes `Director/gen/compile.lock` (refuses while another
  holder's process is alive; breaks a dead one), skips identical files, runs a text check (an unclosed string, unbalanced braces: the two
  breaks of 2026-11-08), snapshots the Assets files into `Director/gen/csharp/<stamp>-<who>/`, copies the staged files in, compiles
  through the queue, and on any error puts the snapshot back, compiles again and reports file:line. It writes one line to
  `Director/gen/WORKLOG-epic.md` either way. `mv csharp check` flags drift between Assets and every staging dir; `mv csharp lock
  [status|break]`. Nobody compiles while a final is rendering. Hand-copying into Assets is forbidden.
- **Generated files are regenerated, never stale** (`tools/mv/generated.mjs`): `videos/<v>/generated.json` maps each generated file
  (`acts/50-cards.json`, `acts/70-lines.json`, `acts/78-beds.json`, `duck.json`...) to the tool that makes it and the inputs it reads,
  hashed. Before every `mv build` and `mv cards`: inputs changed → the tool runs again (or the build refuses: "stale: run <tool>"); the
  file differs from what the tool wrote → EDITED BY HAND, a loud warning (the next run throws the edit away); a GENERATED act not in the
  manifest → a warning asking for `mv generated adopt`. A tool registers itself after writing (`register(videoDir, file, { tool, inputs })`;
  its own source is always an input). `mv generated [check] [<video>]`, `adopt <video> <file> --tool "<cmd>" [--inputs a,b/ --unverified]`,
  `regen`.
- **Leases** (`tools/mv/lease.mjs`, `Director/gen/leases.json`): a visible "I am editing this" on a data file (a card, an act, a set, a
  cut), not a hard lock. `mv lease take <path...> [--who x --note "why"]` refuses a path someone else holds (pid alive, or under 4 h old;
  `--force`); `release [<path...>]`; `status`. Tools that write a file warn on stderr when another agent holds it; the write goes on.
- **`mv snap <image...>`** copies each image to a new timestamped file and prints the path: read THAT path. A file rewritten under the same
  name (`mv frame`, `mv sheet`, a shot's `sheet.jpg`) comes back from the Read tool's cache as the OLD picture. Files go to the scratchpad
  (`CLAUDE_SCRATCHPAD` / `MV_SNAP_DIR`) else `Director/gen/snap/`.
- **`mv doctor [--fix --all]`** first in any session with unknown state; `mv refs <name>` lists what references a thing.
- **The WORKLOG** (`Director/gen/WORKLOG-epic.md`, or `WORKLOG-<video>.md`): write there before touching a shared file (ScoreCompiler,
  MVPunch, MVLook, cards.mjs, sound.mjs, lint) and when you release it. Read it before briefing anyone.
- Long work (full finals, clip previews, batch bakes) goes in long turns when J is away and never blocks a slice he is waiting for.

## Asset Store packages

`mv find`/`mv pull` work on J's downloaded `.unitypackage` files (index in `Director/assets/index.json`, rebuilt with
`py Director/tools/index_assets.py`). `pull` takes only what's needed plus what it references, skips pack scripts, converts materials to
`MV/Lit`. Purchases never downloaded are not on disk; don't scrape the Store (Unity's terms forbid it).
