# How the team works

Read first: `AGENTS.md`, `Director/STORYBOARD.md`, `Director/POLISH.md`, `Director/ART_BIBLE.md`, `Director/ROADMAP.md`, the notes at the end of `Director/TREATMENT.md`, `Director/SONG.md`, `Director/lyrics.json`, and `Director/REVIEW.md`.

J's rule: this is a full animation that tells a story, not camera cuts. No AI video on screen. J never does work in Unity.

## Who owns what

| Role | Owns |
|---|---|
| Engine | `Assets/MusicVideo/**`, `Director/mv.mjs`, `Director/acts/01-room.json`, `Director/acts/06-room2.json`, the sound library |
| Parts 1-2, bars 1-24 | `Director/acts/02-watching.json`, `Director/acts/07-cuts-a.json` |
| Parts 3-4, bars 25-40 | `Director/acts/03-the-pull.json`, `Director/acts/07-cuts-b.json` |
| Parts 5-6, bars 41-58 | `Director/acts/04-lifted.json`, `Director/acts/07-cuts-c.json` |
| Parts 7-8, bars 59-73 | `Director/acts/05-inside.json`, `Director/acts/07-cuts-d.json` |

Only edit what you own. Need something in the engine or someone else's file? Ask the lead, or add a line to `Director/REQUESTS.md` with your role. `make_cuts.py` is retired: its shots now live in the `07-cuts-*.json` files, and each owner may rewrite them freely. Most of those shots should go, since the old cuts were the problem. New shared props go in your own act file under names prefixed with your part, like `p3_lamp`.

Actor handoffs at part boundaries: at the start of your bars, state his position, pose and rotation explicitly with `set`, and leave him where the storyboard says the next part picks up. Agree details through `Director/REQUESTS.md`.

## Taking turns in Unity

There is one Unity editor. Hold `Director/gen/unity.lock` for any `mv.mjs` command that builds, captures or renders. Create it with your role, remove it when done, and hold it for at most 5 minutes at a time. If it's there and under 10 minutes old, wait. If it's older, take it. Do your thinking and editing outside the lock.

Keep your JSON valid at all times, since everyone's files build together. If a build fails on someone else's file, wait and retry; if it's still broken, tell the lead.

For motion, render only your own bars: `mv render --from <time> --to <time> --w 960 --h 540 --fps 30 --wait`, into `Director/output/parts/`, holding `Director/gen/heavy.lock` as well. Full renders are the lead's.

## Done means

Every storyboard event in your bars exists and reads clearly, and you've watched your bars at frame level and in sequence against `POLISH.md`, comparing pace and timing with professional music videos and fixing the gaps. If you can't achieve something, say so plainly rather than settling for less. Don't commit. Never print secrets.

## Speed rules (from 16:30)

Three engine agents now share `Assets/MusicVideo/`, each on its own files:

| Role | Owns |
|---|---|
| Engine: acting | `Runtime/MVActing.cs` and new acting, attachment and prop motion files, `Director/acts/01-room.json`, `Director/acts/06-room2.json`, importing models |
| Engine: FX | New files prefixed `MVFeather`, `MVStretch`, `MVGlass`, `MVEye`, and `Shaders/MVEye.shader`, `Shaders/MVFeather*` |
| Engine: broadcast | New files prefixed `MVShow`, `MVBroadcast`, `MVDoor`, the sound library in `Assets/MusicVideo/Sfx/` |

Shared files (`ScoreCompiler.cs`, `MVActor.cs`, `MVLook.cs`, `MVCore.cs`, `MVWarp.hlsl`, `MVStylize.shader`, `AGENTS.md`): hold `Director/gen/compile.lock`, make the smallest edit you can, and release it.

**Compile windows.** A reload stalls everybody, so write C# and shaders in `Director/staging/<your role>/` first, mirroring the Assets path. Unity compiles whatever is in Assets on the next build, so half-finished code must never sit there. Copy into Assets only under `compile.lock`, at most once every 10 minutes across the team: copy, refresh, check `Director/compile-errors.txt`, fix or revert at once, release. Batch everything ready.

**Nobody waits.** Story agents block every action now with what exists, and swap in the real feature when its syntax appears in AGENTS.md. Don't stop because something is missing.

**Check cheaply.** Use single frames at low resolution first. Render a few bars only when judging motion.

## Colour and pace

`Director/COLOR_SCRIPT.md` sets the palette and shot-length targets for each part. Follow it. Measure your bars with `py Director/tools/measure.py <video>`. Baseline: v6 averaged 1.5 beats a shot, with 3 to 4 times too many cuts in Parts 1-6, and 2 to 4 times too many in Part 8. Bring energy from action inside the frame, not from cuts.

## Deadline (from J: speed it up)

**First complete assembly at 17:45.** The lead renders the whole video then, whatever state it's in.

- Breadth first. Every storyboard event in your bars must exist by 17:30, even roughly. Don't perfect one shot while another is missing.
- Engine: ship the simplest version of each feature that reads on screen by 17:15, and refine after the assembly. Say in AGENTS.md what's rough.
- If a feature isn't there by 17:15, fake it with props, particles or staging, and swap it later.
- Hold the Unity lock for at most 2 minutes. Prepare a batch of edits and a list of frames first, do one build, grab them all, and release. Use 480x270 frames. Don't render your own bars before 17:30.
- Models: person jaw and eye first; everything else can come after the assembly.
- Polish comes after the assembly, where the full video shows it's needed.
