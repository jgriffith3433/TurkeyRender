# A dialogue clock for videos with no song (design, not built)

Written 2026-11-07, after Hawkes Punch lost its music and kept its whole timeline on song.json bars.

## What exists now

- `len` in cut.json takes seconds (`"0.98s"`) as well as beats and bars.
- A pin takes a name or a time plus or minus a length: `"at":"ask_done+0.4s"`, with `"beats":{"ask_done":"22.84s"}`.
- `mv new <name> --bpm 120 --offset 0` makes a straight grid with no song analysis: a ruler.
- `"music": 0` in score.json takes the song out of the Node mix (`tools/mv/sound.mjs`), while song.json keeps the clock.
- `mv cards insert / remove` grows or shrinks the clock and moves every absolute time with it (`tools/mv/clockshift.mjs`). `insert end <length>` grows it past the last beat.

With these, a comedy short is written on a fixed ruler, cut in seconds, and lengthened in one command.

## What a full mode would add

`score.json "clock": {"mode": "dialogue", "bpm": 120}`:

1. **The clock grows with the cut.** `cards compile` would write song.json itself: a straight grid at `bpm`, as long as the cut plus a tail, with no onsets, sections or envelopes. Lengthening a video would then need no insert at all; only absolute times in acts would still need moving, and `clockshift.mjs` does that.
2. **Lines are names.** `videos/<v>/lines.json` (the data `tools/punch_lines.mjs --export` writes) would give every line `line:<id>` and `line:<id>.end` as cut names, so a cut on a joke is `"at":"line:doctor_ask.end+0.4s"`, and moving a line moves its cuts.
3. **Beat-only checks stand down.** QA's "cut's distance from the beat grid", `cutsPerBar` targets, `warpTo` and onset events (`on: kick`) mean nothing on a ruler; the mode would turn them off with a note instead of reporting noise.

## Why it is not built yet

- **Unity reads the song.** The timeline's length is song.json's duration and Transport.cs mixes `score.song` into `mv render`. A clock written by `cards compile` needs a silent audio file of the right length made with it (ffmpeg, in Node), and Transport.cs's mix would still need that file to exist before every build: one more generated asset per compile, and a C# change to drop the song input cleanly.
- **Line ends need audio lengths at compile time** (ffprobe on every line), which makes the compiler depend on audio files. That is fine, but it needs care to keep "same input, same output" and a quick compile.
- **Hawkes Punch, the only video that needs it, is mid-cut.** Its cards and acts belong to another agent today; switching its clock while it renders would cost more than it saves. The pieces above cover it until the next comedy video.

## Order to build it in

1. `clock.mode` in score.json, read by `cards.mjs` and `score.mjs`: synthesize song.json from `bpm` and the cut's length; a silent `audio.wav` beside it.
2. `line:` names from lines.json in the cards Clock (start from lines.json, end from a cached ffprobe length).
3. QA, lint and events skip beat checks in that mode.
4. Transport.cs: a missing or silent song input is skipped (needs `Director/gen/compile.lock`).
