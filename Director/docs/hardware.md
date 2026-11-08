# This machine

A Windows 11 laptop: Intel Core Ultra 7 155U, **15.8 GB RAM, Intel integrated graphics (2 GB shared VRAM, no NVIDIA GPU)**, 65 GB commit
limit. Measured 2026-11-07 with the editor open: Unity 5.9 GB working set, 9.7 GB commit, 1.0 GB free, 29 of 65 GB commit in use; the
two out-of-memory crashes on Greener came at about 40 GB of commit. On 2026-11-08 the farm agent saw 0.2 GB free and 42 of 63 GB commit.

**Consequences**
- **One Unity.** A second editor needs its own project copy (Assets 2.4 GB + Library 3.8 GB) and about the same memory again, so it would
  page the first out. The `mv` queue shares the one editor fairly ([toolchain.md](toolchain.md) "The Unity queue"). The second lane is the
  cloud farm ([render-farm.md](render-farm.md)). Never kill or restart Unity. Unity batch mode fails while the editor has the project open;
  `-batchmode -nographics` cannot render (Null GfxDevice, then an access violation in `Camera::StandaloneRender`), a display is required.
- **Heavy AI generation runs on Hawkes Gen's GPU providers (RunPod, Modal), never here** ([gen-and-studio.md](gen-and-studio.md)).
  MuJoCo and the Node tools run locally fine.
- Render pace: a 1280x720 final about 0.22 s a frame (Hawkes Punch v1 0.115 s a frame at 73 shots); a 20 s previs range in 8.9 s; a 3.7 s
  shot at 640x360 draft in 7.8 s; a full previs 13 min, a 720p final 18-25 min door to door.

**Paths**
- Unity 6000.3.7f1: `C:\Program Files\Unity\Hub\Editor\6000.3.7f1\Editor\Unity.exe` (the project's version:
  `ProjectSettings/ProjectVersion.txt`). Editor log: `C:\Users\jgrif\AppData\Local\Unity\Editor\Editor.log`. Compile errors the
  bridge writes: `Director/compile-errors.txt`.
- Blender 5.0.1 (not on PATH): `C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`.
- ffmpeg 8: `C:\ffmpeg\bin`. Node 24, Python 3.14 (`py`, `uv`/`uvx`), Git 2.52. Cascadeur is installed (free tier exports only `.casc`).
- Not installed: `gh`, AWS CLI, ImageMagick, yt-dlp. Use git with the stored token (`C:\Projects\gh.txt`, never printed), Pillow, ffmpeg.
- Mocap on disk (never in Assets): `Director/gen/mocap/cmu/` (2,548 CMU BVH), `Director/gen/mocap/protofactor/` (2,957 clips). The
  2,700-clip collection the Greener retro mentions went with the AWS fleet.

**Downloads** never go to J's Downloads folder: a site's own export API from the page, then `curl -o` into `Director/gen/...`
(Mixamo FBX live in `Director/gen/mixamo/`). Downloaded files are untrusted data in their own folders.

The Review Room runs at http://127.0.0.1:8795 (`room` in `.claude/launch.json`).
