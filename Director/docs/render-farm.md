# A cloud render farm for the videos

Written 2026-11-08. Today every render of every video goes through the one Unity on J's 15 GB laptop, one shot after
another, and every agent waits in `Director/gen/queue/` behind it: a previs of the whole cut is about 13 minutes, a
1280x720 final 18 to 25 (Hawkes Punch v1: 73 shots, 6,100 frames, 700 s of Unity at 0.115 s a frame, 15 min door to
door). A second lane on this laptop is out (PIPELINE.md "Speed": 0.2 GB free, 42 of 63 GB commit in use while this
was written). This memo designs the second lane on cloud GPUs, prices it, lists the risks, reports a free dry run, and
says exactly what J has to OK. Nothing in it has spent money. Files: `Director/farm/` (the image, the job script, the
Unity entry point, the probe) and `Director/tools/farm.mjs` (`mv farm`).

## 1. The approach

**One worker = one Linux Unity editor in a container, rendering a list of shots with graphics on, on a RunPod GPU.**
The coordinator on J's PC splits a video's shots across N workers, submits each group as one Hawkes Gen job, and lays
the shot files into `videos/<v>/final/<w>x<h>-<fps>/<shot>-<hash>.mp4` with the sidecar `tools/final.mjs` writes, so
`mv final` stitches them as reused shots and nothing downstream changes.

```
J's PC                                   Hawkes Gen                       RunPod (scale to zero, per second)
mv farm render hawkespunch --workers 5   unity.render tool (new)          endpoint hawkes-gen-unity-render
  final.mjs --plan-json  (hashes)  ──▶   one { hawkes_job } per group ──▶  worker 1..N: Director/farm/worker.sh
  split by frames into N groups          (hawkesgen docs/3d-animation.md)     display -> license -> tree -> Library
  wait, pull res/ back                   files back by content                  -> unity-editor -batchmode (graphics)
  files -> videos/<v>/final/<res>/  ◀──  as the job's outputs            ◀──     Farm.Run: build, prove hashes, render
mv final                                                                     network volume: snapshot store, Library cache
```

**The image** (`Director/farm/Dockerfile`): Gen's own Unity cloud-build base, `unityci/editor:ubuntu-6000.3.7f1-webgl-3.2.2`
by the digest Gen pins (the project is 6000.3.7f1, `ProjectSettings/ProjectVersion.txt`; the worker checks it), plus
what a render needs and a build doesn't: an X display (Xorg on the NVIDIA driver, or Xvfb), the GL and Vulkan loaders,
ffmpeg (Transport.cs pipes raw frames into it), Node 24 (the Director tools), and Gen's `worker.py` so the container
speaks the same `{ hawkes_job }` protocol as the 3D worker image. The display recipe is the one
`hawkesgen/server/play-native/display.mjs` proved on RunPod: RunPod mounts the driver's compute half only, so the
worker fetches the graphics half of the exact driver version once per volume (libGLX_nvidia, nvidia_drv.so) and runs a
monitor-less Xorg; failing that, Xvfb without GLX and Unity on Vulkan (`-force-vulkan`, the NVIDIA ICD renders
offscreen); failing that, software, which the coordinator refuses to pay for unless told (`--allow-software`).
**`-batchmode` without `-nographics`**: the Null device cannot render (the dry run below shows the crash).

**The job** (`Director/farm/worker.sh`, the script in the request; `in/job.json` beside it):
1. `display`: as above; `res/worker.json` records which kind and which GPU.
2. `license`: Gen's flow (hawkesgen docs/unity-cloudrun.md "License"): `Unity.Licensing.Client --activate-ulf
   --include-personal` with the build account's email and password from the endpoint's env, returned in the exit trap.
   A seat limit fails here in under a minute, before any GPU minute is spent on a render.
3. `snapshot`: the project tree, exactly. Two sources, both ending in a tree whose hash the coordinator computed at
   home: a git commit fetched from GitHub (`GITHUB_TOKEN` as a one-shot `http.extraheader`, never on disk or printed),
   or a **manifest snapshot** assembled from the volume's content store (below). `Director/farm/unity/Farm.cs` is copied
   into `Assets/MusicVideo/Editor/Farm/` on the worker (it lives outside `Assets` here, so J's editor never compiles it).
4. `library`: the Library cache (`tar.zst` on the network volume) unpacked to the container's **local disk**. Unity's
   ArtifactDB is LMDB and needs real locks, so it never runs on NFS (Gen's build docs say the same). A worker with no
   cache imports everything once and saves it back; a worker that imported (Unity touched the Library) saves it under
   a lock, so the cache follows the assets.
5. `unity`: `unity-editor -batchmode [-force-vulkan] -projectPath ... -executeMethod TKShock.MV.EditorTools.Farm.Run`.
   `Farm.Run` does what `mv build` then `mv render` do, in-process and without the file mailbox: `Video.Use`, the plain
   `ScoreCompiler.BuildCommand` (the scene and `_Generated` are never in the snapshot, they are rebuilt from the score as
   on J's PC), then **the determinism gate**: it runs `node Director/tools/final.mjs <video> --plan-json` on the worker's
   own tree (a small addition to final.mjs made today: the plan's ids and hashes as JSON, nothing else) and renders a
   shot only when the hash it computed equals the one the coordinator sent. A shot whose inputs differ is skipped and
   named, never rendered under the wrong name. Each shot is rendered with `Capture.At((double)i / fps, w, h)` for
   `i in [f0, f1)` into `ffmpeg -f rawvideo -pix_fmt rgb24 ... -vf vflip -c:v libx264 -preset medium -crf 17`, the
   exact frames, times, encoder and settings of Transport.cs `Render`/`Step`, under `Quality.Set(false)` (final) or
   `Quality.Previs(true)` with `ExtrasEvery = 4` (previs), as `StartQuality` does. The sidecar adds `where`
   (`farm Vulkan/NVIDIA RTX A4000`) and `seconds` to the fields final.mjs writes.
6. `collect`: `res/` comes back as the job's outputs: `<id>-<hash>.mp4`, `.json`, `worker.json`, `unity.log`, `stages.txt`.

**The snapshot store** (why not just a commit). The GitHub repo `jgriffith3433/TurkeyRender` is at `985f39e TK Shock
music video, v11` and holds 1.31 GB; the working tree has **73 modified and 1,018 untracked (not ignored) files**,
10,208 files and **10.40 GB** in all: every video since TK Shock (greener, hawkespunch, touchgrass), the motion library,
the clean clips, the Person. Four files are over GitHub's 100 MB limit (`Motion/Clean/*.anim` up to 155 MB, two
textures), so a commit route needs LFS for them, and LFS bandwidth for ten workers fetching a few GB a month costs
money and J's attention. So the farm's default is the **manifest snapshot**: `mv farm sync` hashes the tree (what
`git ls-files --cached --others --exclude-standard` lists: tracked plus untracked-not-ignored, never Library, Temp,
captures, shots or outputs; 10,208 files in 39 s on J's PC), sends only the blobs the volume's store lacks (jobs of at
most 1 GB through Gen's broker), and writes `manifests/<hash>.json`. A render names a manifest hash; the worker assembles
it; the same hash is the same bytes. Both routes are in worker.sh; the git one stays for the day the work is committed
(then a commit is the hash). The first sync is the whole 10.4 GB once (at 100 Mbps about 15 minutes of J's upload);
after that a card edit is kilobytes.

**The coordinator** (`Director/tools/farm.mjs`, `mv farm <plan|sync|render|previs>`): `plan` is free and runs today;
it calls `final.mjs --plan-json` (the plan `mv final` makes, cards compiled in memory), keeps the shots that would
render (`--force` for all), splits them **longest shot first into the lightest group** (`split`, self-tested: 20 shots
over 5 workers land within one shot of each other), prints each worker's shots and frames, the minutes, the dollars,
and with `--tree` the manifest hash. `render` submits one `unity.render` job per group and lays the results into
`final/<w>x<h>-<fps>/`; `previs` renders the whole cut in parts and joins them (picture concat without re-encoding,
sound mixed once with `tools/mv/sound.mjs`, as final.mjs stitches). `render`, `previs` and `sync` refuse unless
`FARM_OK=1` is in the environment, which is J's OK in a form a script can check; and the Gen tool they call does not
exist yet (section 6), so today they stop there and say so.

**Determinism.** Same tree hash and same shot hash give the same frames: the worker proves the hash on its own tree
before rendering, the frame times and encoder are Transport.cs's, bakes and the clip catalog ride in the snapshot
(`Director/library/performances/baked`, `Motion/Clean`), and the scene is rebuilt from the score the way every build
does it. What can differ is the machine, not the run: Vulkan on an NVIDIA card against Direct3D 11 on Intel (section
3). The first paid test measures that difference on one shot; if it is invisible (PSNR over 40 dB after the same soft
blur `reverse_test` uses), farm and laptop renders share one cache; if not, the farm gets its own cache folder
(`final/<res>@farm`) and a final is all-farm or all-laptop, never mixed.

## 2. Cost

**What is measured.** Hawkes Punch v1 final, 1280x720 30 fps: 6,100 frames in 700 s of Unity on this laptop
(`final/progress.json` `perFrame` 0.115) plus 3.3 min of build, stitch and review; the cut now plans 92 shots and 6,704
frames. Previs on greener: 1,858 frames at 426x240 in 78 s (0.042 s a frame). The project tree is 10.4 GB; the Library
is 5.2 GB on disk here (about 3 GB as zstd without BuildCache, Search and TempArtifacts).

**Prices** (RunPod serverless, billed per second while a worker runs, zero when idle; `hawkesgen
tools/gpu-providers/runpod-v2.mjs POOL_PRICES`, 2026-10-28): RTX A4000 class 16 GB **$0.58/h**; L4 / A5000 / 3090 24 GB
$0.69/h; RTX 4090 24 GB $1.10/h. The A4000 class is also the list the playtest endpoint runs on with proven graphics
(A4000, A4500, RTX 4000 Ada, RTX 2000 Ada); the farm's endpoint names those exact models, never a pool alone (a pool
gave MIG slices with CUDA and no graphics, docs/playtest-runpod.md). On-demand pods are cheaper per hour (A4000 about
$0.20-0.35/h) but would need new provider code and pod lifecycle; serverless reuses what Gen has.

**The model** (`farm.mjs price`, `videos/<v>/final/farm-pace.json` overrides it with measured numbers): per worker a
fixed **5 min** (image already on the host, license, snapshot assembled from the volume, Library unpacked, Unity open,
build) plus **0.06 s a frame** at 1280x720 final (half the laptop's 0.115: the Intel iGPU is the slow half of a frame;
the timeline evaluation, Cinemachine and the ReadPixels stall stay on the CPU), 0.03 at previs. These are estimates
until the first run; the honest range is 0.04-0.115 s a frame and 4-8 fixed minutes.

| Run | Workers | Wall (today) | Worker-minutes | Dollars at $0.58/h | If the GPU gives no speed-up (0.115 s/frame) |
|---|---|---|---|---|---|
| Final 1280x720, 92 shots, 6,704 frames | 1 | 11.7 min (18-25) | 11.7 | **$0.11** | 17.8 min, $0.17 |
| | 5 | 6.3 min | 31.7 | **$0.31** | 7.6 min, $0.37 |
| | 10 | 5.7 min | 56.7 | **$0.55** | 6.3 min, $0.61 |
| Previs 426x240 12 fps, 2,682 frames | 1 | 6.3 min (13) | 6.3 | $0.06 | |
| | 2 | 5.7 min | 11.3 | **$0.11** | |
| | 5 | 5.3 min | 26 | $0.25 | |
| A one-shot fix (100 frames) | 1 | 5.1 min | 5.1 | $0.05 | (84 s on the laptop: keep those here) |

So: **a full final is about $0.30-0.55 and 6 minutes** with 5-10 workers against 18-25 minutes here; past 5 workers
the fixed minutes dominate and the wall barely moves. **A previs is about $0.10 and 5-6 minutes** with 2 workers
against 13: the win is small in minutes and large in the laptop being free. One-shot fixes and the Room's note loop
stay on the laptop (84 s there, 5 min of fixed cost on the farm). At 4090 prices multiply by 1.9.

**One-time and standing costs.** Library warm-up: the first worker imports 7.1 GB of assets and compiles every shader
for Vulkan, 30-60 minutes on one worker, **$0.30-0.60 once**, then incremental (a new asset re-warms only itself).
The first snapshot sync is J's upload bandwidth, not money. A network volume of 50 GB (the snapshot store 10.4 GB, the
Library cache 3 GB, the driver, room to grow) is **$3.50 a month** at $0.07/GB/month. The image lives in the public
`ghcr.io/jgriffith3433/hawkes-gen-gpu` package beside Gen's other workers (free; it holds no secrets, GameCI's editor
image is public too). The first paid test (one shot on one worker, compared with the laptop's frame) is about $0.10-0.20.

**The number for J:** about **$0.35 per full final and $0.10 per previs** at 5 and 2 workers, **$0.50 once** for the
Library, **$3.50 a month** for the volume. A pilot budget of **$20** covers the warm-up, the comparison test, and about
twenty finals and previs runs; at twenty finals and twenty previs a month the farm runs at about **$12 a month** plus
the volume.

## 3. Risks

- **Unity Personal seats in parallel.** Every worker activates a Personal seat on Gen's build account through the
  Licensing Client and returns it after. Unity documents no concurrent-activation count for Personal, and the same
  account also serves the Cloud Run builds (concurrency 2) and must not be J's own editor's. GameCI's Personal path does
  the same on ephemeral runners and has not been refused, but ten activations at once has not been tried by anyone we
  can cite. Mitigation: the license step is first and fails in under a minute with the exact reason ("seat limit"), so
  a refused worker costs a cent; the pilot climbs 1 -> 2 -> 5 -> 10 workers and the coordinator caps `--workers` at the
  largest count that activated. If Personal stops at 2 or 3, the fallback is a Unity Pro seat ($2,200 a year, 2 machines
  per seat as well) or Unity Build Server licenses, which exist for exactly this; the entrypoint already has the
  `-serial` path. Unity's terms: Personal on CI boxes is what GameCI does and Unity has never blessed it; Hawkes is far
  under the Personal revenue threshold; a Build Server seat is the clean answer if Unity ever objects.
- **DirectX 11 on Windows, Vulkan on Linux.** `ProjectSettings` sets D3D11 for the Windows editor only; the Linux
  editor picks Vulkan (or OpenGL core). Vulkan shares D3D's conventions (reversed Z, UV origin at the top:
  `MVStylize.shader` guards `UNITY_UV_STARTS_AT_TOP`, URP's Blit.hlsl handles the rest), so Vulkan is forced and OpenGL
  avoided. Shaders are compiled again for Vulkan during the warm-up: expect sub-LSB differences in blending and
  derivatives, not visible ones; anything larger shows in the first shot comparison. The Stylize pass runs through URP
  (`renderScale` 1, SMAA, SSAO on), the same `Quality.Set(false)` as a laptop final.
- **The 64-frame mesh cap.** Not found as a cap in the engine's code or the tools (`Editor/MeshTools.cs`, `MVBake.cs`,
  `Runtime/*`, `tools/bake*`); if it is a limit inside a clip's baked mesh or blendshape pass, it is per-shot data in the
  snapshot and platform-neutral, so the farm renders it as the laptop does. The frame comparison on a shot that plays a
  baked take settles it.
- **Fonts.** The videos' text is TextMesh Pro from SDF atlases in `Assets/TextMesh Pro` (tracked); nothing uses OS fonts
  (`Font.CreateDynamicFontFromOSFont`, legacy `Text`: none). The image still carries DejaVu for Unity's own UI.
- **Windows paths and tools.** The render path is Node (`mv.mjs`, `tools/final.mjs`, `tools/mv/*`: `node:` built-ins
  only, `ffmpeg`/`ffprobe` from PATH) and C# that builds paths from `Application.dataPath`; no `C:\` in the C#, and the
  only ones in the Node tools are messages (`tools/mv/hawkesgen.mjs`). The Python tools (`py` launcher) are not on the
  render path. Linux file names are case-sensitive: a reference whose case differs from the file works on Windows and
  fails here; the first Unity open on the worker lists any as missing-asset errors (Gen's build docs met the same).
- **`EditorApplication.update` and the Bridge.** The worker does not use the file mailbox; `Farm.Run` is synchronous
  (`-executeMethod`), so nothing depends on the editor's update loop ticking in batch mode.
- **Memory on a worker.** Unity on this project is 2.5 GB working set and 13 GB commit here while importing; a RunPod
  A4000 worker has 16-50 GB RAM depending on the host. The endpoint asks for at least 32 GB; the first run records
  the peak in `worker.json`.
- **The first fetch and the image pull.** The image is about 8 GB; RunPod caches it per host after the first pull, so
  a cold host adds 2-5 minutes once. The snapshot assembles from the volume at NFS speed (10.4 GB, 1-2 minutes). Both
  are inside the 5 fixed minutes only on a warm host; the model's range says 4-8.
- **Mixing farm and laptop renders.** `mv final` reuses any saved render whose hash and size fit; after the farm, a
  final could stitch a laptop shot next to a farm shot. The sidecar's `where` makes that visible; whether it is allowed
  is decided by the comparison test (section 1, "Determinism").
- **A worker that dies mid-shot** leaves `.part.mp4` and no sidecar: the coordinator sees the missing shot and
  resubmits it (the same hash, so nothing else changes). Gen's job resume and heartbeats cover the request itself.

## 4. The dry run (free, 2026-11-08)

**Headless rendering works with `-batchmode`, and `-nographics` cannot render.** A second Unity on the TKShock project
itself was not possible (J's editor had it open, and a copy of the project would need the memory the laptop does not
have, PIPELINE.md "Speed"), so the probe ran the exact mechanism on a throwaway project, with a guard that refuses to
start when the commit headroom is under 8 GB (`Director/farm/probe/run.ps1`; it was 21.5 GB with 0.2 GB of physical
memory free, so the editor paged for a minute and nothing crashed).

`Director/farm/probe/HeadlessProbe.cs` builds a lit cube on a floor under a shadow-casting light, renders the camera into a
640x360 RenderTexture, reads the pixels back, encodes two PNGs, and pipes 30 raw rgb24 frames down ffmpeg's stdin with
Transport.cs's exact arguments, then checks the frame is not black and that rendering the same time twice gives the
same bytes.

| Run | Result |
|---|---|
| `Unity.exe -batchmode -projectPath <probe> -executeMethod HeadlessProbe.Run -quit` | **exit 0 in 39 s.** `Direct3D11` on `Intel(R) Graphics`, frame mean 175.9 (not black), the same frame twice byte-identical, `probe.mp4` 30 frames written by the ffmpeg pipe. `result-graphics.json`, `frame-15-graphics.png` (the cube, its shadow, the floor). |
| the same with `-nographics` | **crash** (exit -1073741819 in 33 s): `Forcing GfxDevice: Null`, then an access violation inside `Camera::StandaloneRender` on the first `Camera.Render()`. `result-nographics.txt`. This is why the farm never passes `-nographics`, and why the display step comes first. |

What the probe does not prove: URP, the Stylize pass, Cinemachine and this project's shaders on Vulkan on Linux, and
the frame-to-frame match with a laptop render of a real shot. Those are the first paid test (one shot, one worker, about
$0.10-0.20, compared with `mv frame` here at PSNR). The Docker image was not built here: Docker Desktop's daemon was
not running and starting it needs about 2 GB on a machine with 0.2 GB free; the Dockerfile uses the same base digest and
the same apt list as Gen's images and builds on GitHub by tag like them.

**The coordinator ran for real, free** (`mv farm plan`): on Hawkes Punch today, 92 shots and 6,704 frames would all
render (none of v1's 73 saved renders match the current hashes; `mv final --plan` says the same, 16.2 min here), split over 5 workers into groups of 1,340 to 1,348 frames; the tree hashed to
`aca4059912180831` (10,208 files, 10.40 GB) in 39 s; `farm test` passed. The numbers in section 2 are its output.

## 5. What J OKs (and nothing else to do by hand)

1. **The spend: a $20 pilot budget** on RunPod through Hawkes Gen (the existing `RUNPOD_API_KEY`), covering the Library
   warm-up (about $0.50), the one-shot comparison (about $0.20), and about twenty renders at $0.10-0.55 each; plus
   **$3.50 a month** for a 50 GB network volume. In a sentence: "OK, $20 for the render farm pilot." Then `FARM_OK=1`
   goes in the environment of the sessions that render.
2. That the farm uses what Gen already holds: the Unity build account (`unity-email`, `unity-password` in Secret
   Manager, through the endpoint's env the setup script writes), `RUNPOD_API_KEY`, the GPU worker token, and the
   GitHub token in `C:\Projects\gh.txt` only in its stored-token form for pushes, never printed. No new account, no
   console clicks: `tools/gpu-providers/runpod.mjs --kind unity-render --apply` makes the template, the endpoint and the
   volume as it does for the 3D endpoint, and prints Gen's settings entry.

Nothing else. The build order below is agents' work.

## 6. Build order (after the OK)

1. **hawkesgen:** the `unity.render` tool (`src/tools/unityrender.ts`, family `unity-render`, `image: 'unity-render'`;
   `Tool.image` widens from `'3d'` and `route.ts` keeps a 3D or render tool off ComfyUI endpoints as it does today),
   running `Director/farm/worker.sh` through `src/providers/workspace.ts` like `blender.render`; a `sync` mode that
   writes blobs into the volume's store; `server/unity-render/` with this Dockerfile and a `farm-image-*` tag workflow
   that copies `worker.py`, `entrypoint.sh`, `worker.sh` and `Farm.cs` into the build context (TurkeyRender is private:
   the workflow checks it out with the CI token). Priced per worker-second like every GPU job.
2. **The endpoint:** `runpod.mjs --kind unity-render --apply`: load-balancer endpoint `hawkes-gen-unity-render`, exact
   GPU models RTX A4000 / A4500 / RTX 4000 Ada, max workers 10, idle 300 s, container disk 40 GB, a 50 GB network
   volume, env `UNITY_EMAIL`, `UNITY_PASSWORD`, `WORKER_TOKEN`; Gen settings `{ id: 'runpod-unity', families:
   ['unity-render'], pricePerHour: 0.58, maxConcurrent: 10 }`.
3. **TKShock:** `mv farm sync` (the first 10.4 GB), then the warm-up (one worker, `--workers 1`, one short shot), then
   **the comparison**: that shot's frames against `mv frame` here; the result decides shared or separate caches
   (section 1). `farm.mjs` gets `render`/`previs` wired to the tool, the resubmit of missing shots, and
   `final/farm-pace.json` written from each run's `worker.json` so the price model learns.
4. Then a 5-worker final of Hawkes Punch, timed, and the numbers in section 2 replaced with measured ones.

## 7. Status of the pilot (2026-11-08, farm agent)

**Built (no money spent: $0.00 of the $20).**
- hawkesgen branch `farm/unity-render` (commits `fd8f516`, `eedb16e`, from `dev`; not merged): the `unity.render` tool
  (`src/tools/unityrender.ts`: `render`, `sync`, `check`), `image: 'unity-render'` routing (never the fleet, never a
  ComfyUI endpoint), `server/unity-render/` (this Dockerfile, `worker.sh`, `Farm.cs`, Gen's `worker.py`),
  `.github/workflows/farm-image.yml` (tag `farm-image-*`), `tools/gpu-providers/runpod.mjs --kind unity-render`,
  `docs/unity-render.md`, `test/unityrender.test.ts`. Typecheck clean; the suite's 8 failures are flaky under load or
  already failing on `dev` (`phone-touch`), and pass alone.
- The image: tag `farm-image-2026-11-08a` builds `ghcr.io/jgriffith3433/hawkes-gen-gpu:unity-render-*` on GitHub.
- The RunPod endpoint `hawkes-gen-unity-render` (`1c3f2m7br6gg3f`, template `mewutuftzb`): exact RTX A4000 / A4500 /
  4000 Ada, idle 300 s, 50 GB disk, the Unity build account and worker token in its env. **Max workers 0** (below).
- `tools/farm.mjs`: `sync` (blobs the volume lacks in 1 GB tars, then the manifest), `render`/`previs` (one job per
  group at once, files into `final/<w>x<h>-<fps>[@previs]/`, missing shots resubmitted once, `farm-pace.json` from each
  run's `worker.json`). The tree now adds the gitignored render inputs (Motion/Clean clips, AtmosphericHouse textures,
  the video scenes): **9,628 files, 7.97 GB** (`1e9f6b40b06d2841` today). Note Hawkes Punch is 24 fps: pass `--fps 24`.

**Blocked, needs J (in this order):**
1. **RunPod balance $4.29** (spend $5.25/h from other endpoints when read): RunPod refuses a network volume under $5,
   so the $20 has to be added to the RunPod account first.
2. **RunPod's worker quota is 10 and all 10 are taken** (gen-3d 1, play-native 2, playtest-gfx 4, gen-gpu 3): the farm
   endpoint is at max 0. Either RunPod raises the quota or another endpoint gives some up.
3. **Gen**: a RunPod worker reaches files through Gen's broker (`HAWKESGEN_PUBLIC_URL`), so a Gen on this PC can't
   drive it. The tool must be on beta Gen: J's lane push of `farm/unity-render` (into `dev`, then `beta`), plus beta
   Gen's settings entry `runpod-unity` (`familyOrder: { "unity-render": ["runpod-unity"] }`).
Then: `node tools/gpu-providers/runpod.mjs --kind unity-render --apply --dc EU-RO-1 --max 5` (volume in EU-RO-1,
where the A4500 workers land), `FARM_GEN_URL=https://beta.hawkesgen.ai FARM_OK=1 mv farm sync`, the one-shot warm-up
and the comparison. Section 2's numbers are still estimates.
