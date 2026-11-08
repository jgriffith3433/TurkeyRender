# Sound: the mix, voices, beds, foley, captions, silence

Music videos play the song; a comedy short (Hawkes Punch, J 2026-11-07: "not a music video but rather the fun video") has **no song in any
output**: voices, sfx, room tone. `"music": 0` in `score.json` takes the song out of the Node mix while `song.json` keeps the clock
([dialogue-clock.md](dialogue-clock.md)). Never digital silence: a bed under every second; the one true silence is a gag (the ring plane).

## The finished mix (`tools/mv/sound.mjs`; used by `mv shot`, `mv final`, `tools/remix.mjs`)

A score's `"mix":{"dialogue":-16,"bedDuck":-6,"bedFade":0.25,"truePeak":-1,"master":1}` sets every spoken line (an sfx starting a
`duck.json` range) to `dialogue` LUFS, ducks every bed (a file under a `beds` folder) `bedDuck` dB under each line, and puts the master
through a 4x-oversampled true-peak limiter at `truePeak` dBTP after `master` dB. Without `mix` the sum is as before. Loudness is cached in
`Director/gen/loudness-cache.json`. `silence.json` (written by the build from `do: silence` and `fx` `silence`) gates the whole mix for
those frames; overlapping silences are merged. `mv shot`'s preview mixes only sfx that start inside its window (beds that began earlier are
missing; a final is right). `tools/remix.mjs` remuxes a slice render through the Node mix. `mv render`'s own mux (Transport.cs) reads
none of this.

Sound design rules (research, Hawkes Punch): every impact gets a 4-8 frame drop-out, the layered hit at -1 dBTP, a rumble tail, then near
silence, then one small sound. Dialogue -16 LUFS, beds ducked 6 dB. Check by ear on the ring gag, the booms against the lines, and the bed.

## Voices (Hawkes Gen)

Lines come from Gen `audio.voice-open` (qwen3-tts; seeds: him 1101, the double 2202, the doctor 3303, the announcer 4404), priced in cents
([gen-and-studio.md](gen-and-studio.md)). Hawkes Punch's takes: `Assets/MusicVideo/Sfx/punch/symptoms/`, `lines2/` (42 takes), `lines3/`,
`lines4/` (the space lines), `foley/`, `beds/`, `space_epic/`. Lip sync: `tools/face_act.mjs` presses the lips on m b p (`mouthPress`) and
takes `face:{...}` per line; `tools/lipsync.py` is the older waveform check.

## Lines, beds, foley (Hawkes Punch's tools; the pattern for the next comedy video)

- `node Director/tools/punch_lines.mjs [--export]`: `videos/hawkespunch/lines.json` (every line with its file, start and speaker; `--export`
  moved the LINES table out of the code into data so `mv cards insert/remove` can move them) to `acts/70-lines.json`, `duck.json` and the
  mouths. Lines that don't fit their board shots are placed by hand in lines.json (doctor_line_a 9.79 s starts 1.0 s early in c21; the
  18.8 s symptoms take spans c07-c12 and needs splitting per line to land on cuts).
- `node Director/tools/punch_beds.mjs <video>`: one room-tone bed per place, ends anchored on shots and lines, writes `acts/78-beds.json`.
  Run it again after any clock change. **It anchors on shot ids:** after board2cards the ids changed, so it stops until updated to the
  board's ids (2026-11-08, open).
- `node Director/tools/punch_sfx_prep.mjs`: Gen takes in `Sfx/punch/_gen_raw` to `Sfx/punch/foley` and `space_epic`, placed in
  `acts/82-foley.json` (clinic, ad, the punches, the ending) and `acts/84-space-sfx.json` (space); `acts/80-sfx.json` holds what is left
  of the old list.
- Captions: `acts/75-captions.json`, generated from `lines.json` with the legible `type` defaults in `style.json`
  ([styles-formats.md](styles-formats.md)); regenerate after a clock change (stale captions were a repeated bug).
- Every generated act should be in `videos/<v>/generated.json` so `mv build` regenerates it when its inputs change
  ([toolchain.md](toolchain.md) "Working beside other agents").
- `py Director/tools/sfx_make.py "<name>" "<description>" [seconds]` adds a sound to the shared library (`Assets/MusicVideo/Sfx/`); the
  list of library sounds is in [score-cues.md](score-cues.md).

## Music videos

`mv new` runs demucs into `Director/stems` and `tools/analyze_deep.py` (bars, sections, hits, lyrics; `song.json`); `tools/align_lyrics.mjs`
aligns lyrics; `duck.json` ducks under lines; `warpTo` and `onsets` cues land motion on hits ([score-cues.md](score-cues.md));
`mv choreo` composes dance to the beat grid ([choreography.md](choreography.md)).
