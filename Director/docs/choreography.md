# Choreography: `mv choreo`

A dance take is composed, heard and judged before any camera exists (RETRO "Choreograph first"). The take is a short
file of phrases on the song's beat grid; the tool compiles it to the performance JSON the cards already use, bakes it,
plays it at normal speed with the song, and measures it. Code: `Director/tools/mv/choreo.mjs`. No Unity for the
compile; `play` and `check` go through `mv lab`, `build` through `tools/bake.mjs`, both on the queue.

```
mv choreo build <take> [--dry --force]           compile to library/performances/<take>.json (+ its hooks), bake, report line
mv choreo play <take> [--views front,three --strip --dist 4.6 --no-song]   videos/<v>/choreo/out/<take>.mp4, 720x480, the song mixed in
mv choreo check <take> [--static]                accents per bar, worst gap, longest hold, beat landing, travel, bake gates
mv choreo segments <clip> [--bars 1-4 --speed]   a clip's motion beats and the 1-4 bar segments that land on the grid
mv choreo phrases                                 the library
mv choreo test                                    the proof below
```

## The take: `videos/<v>/choreo/<take>.yaml`

Times inside a take are `bar:beat` from the take's own start (`1:1` is beat 0; `7:4.5` is beat 27.5), or `10b`,
`2bars`, or `word:baby` (the lyric's time from `lyrics.json`, inside the take's window in the song, `word:baby#2` the
second one). Lengths are beats. The grid is the song's `tempo` as a constant beat (`60/tempo`, 3 decimals), exactly
as the Greener takes were built by hand, so a take is the same file whatever compiles it.

```yaml
about: one line                      # the performance's about
length: 48b                          # beats; min defaults to it
params: {back: 1.7}                  # performance parameters; "$back" in a phrase stays a parameter
overlap: {amount: 0.5, head: 0.4, arms: 0.7, hands: 1}   # optional; `head: false` drops the stance/gaze/fingers head
phrases:
  - {at: 1:1, hook: hook_gateway}                                   # a phrase with `performance`: one perform cue, repeats
  - {at: 3:1, phrase: snake_frame, accents: [{pop: 3:2, side: 1, chin: -7}]}
  - {at: 5:1, phrase: slide_hip, root: [-0.9, 0, 0]}                # root: travel, metres in the world, rel to where he is
  - {at: 7:4.5, phrase: house_point, accents: [{pop: 8:2, side: -1}, {point: 8:4, off: 9:1, x: 0, y: 0, aim: [400.24, 1.22, 2.22]}]}
  - {at: 11:1, segment: mx_rumba@0-2.37 x 1.38, len: 4b, warpTo: beat, masks: [{clip: mx_rib_pops, mask: arms, start: 0.2, speed: 1.1}]}
gates: {landShare: 0.6}              # optional: check's thresholds
```

A phrase line is one of:
- `phrase: <name>` from the library, with `len` (beats; the phrase's own by default), `root` (travel, where the phrase
  has a `move` with `$root`, else the compiler adds one over the phrase), `masks` (clips over parts of the body:
  `{clip, mask, start, speed, weight, len, additive}`), `accents`, and any `$param` the phrase reads.
- `segment: "clip@start-stop x speed"` (also `once`) with `len`, `warpTo`/`maxRate`, `blend`, `masks`, `root`, `accents`:
  a plain clip segment, no library entry.
- `hook: <phrase with performance>`: a `perform` cue, so the hook is the same frames every time and bakes once.
- `at` is optional: without it the phrase follows the one before.

Accents are the compiler's own, exact to the Greener build (`build_ch1.mjs`):
- `{pop: <beat>, side: 1|-1, chin: 0, amp: 1, anticipate, overshoot: 0.15, settle: 0.22s}`: a backbeat hip pop, the chest
  against it, head level, a fast stop that settles. `anticipate` adds the small move the other way first.
- `{point: <beat>, off: <beat>, x: 28, y: 22, aim: [x,y,z], hand: left}`: the left-hand point at the lens on a layer,
  index out, with `aim` a `reach` so the arm goes straight down the lens (a `lint: point` reach).
- An additive hip layer is a phrase cue or a mask with `additive: 1` on `mask: lower` (`jazz_square_ribs` has one).

## Phrases: `library/choreo/phrases/<name>.yaml`

```yaml
about: Slides across, hand on hip, shoulders leading.
kind: slide                          # hook groove slide turn pose walk gesture
len: 4b
params: {hips: 0.6}                  # defaults a use may override
cues:                                # raw cues; at is from the phrase start: 1.2b, 4b-0.07s, -0.12s; for and blend take 4b or 0.3s
  - {at: 0b, do: anim, clip: mx_slide_step, start: 0.25, speed: 1.3, warpTo: beat, maxRate: 1.25, blend: 0.14, for: $len}
  - {at: 0.2b, do: move, pos: $root, rel: 1, for: 3.6b, ease: inout, lint: slide}
accents: [{point: 2:2, off: 2:3.8}]  # the phrase's own, in its own beats
performance: dance_hook              # only on a hook: compiles to library/performances/dance_hook.json
```

`$len` is the use's length as beats, `$root` its travel, any other `$x` a param of the phrase or the use; an unknown
`$x` stays, so performance parameters pass through. Cue keys are written in the order the engine's docs show them and
kept, so the output is the hand-written file.

The first entries are Greener's chorus: `hook_gateway` (the signature move, `dance_hook`), `snake_frame`,
`jazz_square_ribs`, `house_drop`, `slide_hip`, `walk_down_lens`, `arm_push`, `house_point`, `spin_hold`. Their grades
and watch-outs are in `videos/greener/moves.md`.

## Worked example: Greener's chorus

`videos/greener/choreo/dance_chorus.yaml`, 15 lines for 12 bars:

```yaml
about: Chorus 1 on the stage mark (...), 48 beats from "I'm your": hook, groove, travel, attitude and the point on "you", hook, spin into a held pose on "know".
length: 48b
params: {back: 1.7}
overlap: {amount: 0.5, head: 0.4, arms: 0.7, hands: 1}
phrases:
  - {at: 1:1, hook: hook_gateway}                                                        # "I'm your gateway drug, baby"
  - {at: 3:1, phrase: snake_frame, accents: [{pop: 3:2, side: 1, chin: -7}]}             # hands frame the head
  - {at: 3:3, phrase: jazz_square_ribs, accents: [{pop: 3:4, side: -1}, {pop: 4:2, side: 1}]}   # "a little taste"
  - {at: 4:3, phrase: house_drop}                                                        # drops on "new"
  - {at: 5:1, phrase: slide_hip, root: [-0.9, 0, 0]}                                     # "you say you're only"
  - {at: 6:1, phrase: walk_down_lens, root: [0.9, 0, 0], accents: [{pop: 6:2, side: 1}, {pop: 6:4, side: -1}]}   # "passing through"
  - {at: 7:1, phrase: arm_push}                                                          # "But darling"
  - {at: 7:4.5, phrase: house_point, accents: [{pop: 8:2, side: -1}, {point: 8:4, off: 9:1, x: 0, y: 0, aim: [400.24, 1.22, 2.22]}]}   # point on "you"
  - {at: 9:1, hook: hook_gateway}
  - {at: 11:1, phrase: spin_hold, root: [0, 0, $back]}                                   # "don't pretend you didn't know"
```

`mv choreo build dance_chorus` writes `dance_hook.json` (11 cues) and `dance_chorus.json` (51 cues).

**The proof** (`mv choreo test`, 2026-11-07): both files are byte for byte the takes `captures/dance/build_ch1.mjs`
wrote by hand (9016 and 2081 bytes, `identical: true`). The bake key is a hash of the performance text
(`MVBake.cs BakeKey`), so the bake `dance_chorus_1a4990148f` is unchanged and its numbers stand: snaps 0, accel spikes
0, flips 0, ankle over 167, near-floor foot travel 1.49 m, hand stops L1 R2 (`videos/greener/choreo/report.md`).
`build` saw the text unchanged and kept the bake rather than running it again. The same take plays the same clip, so
beat landing is the same by construction; the measurement is below.

`mv choreo check dance_chorus` (lab at 60 Hz, 2 s): accents per bar `0 1 2 1 0 2 0 2 0 1 0 0`, worst gap 3.8 beats
at beat 16.2, longest hold 8 beats (the hook's `mx_snake`), hips end 0.22 m off the start, reverse 0. **Beat landing:
20 motion beats in 48 beats, 10 of 20 within 70 ms of a beat, 14 of 20 within 70 ms of an eighth, mean 85 ms off.**
That fails the default gate (60% on the beat): the number to beat, not a reason to loosen it. The first bar and the
last bar read no stop at all. The motion beats are read in Node from the lab's probe (hands, feet and head about the
hips, the dip-with-a-rise rule of `MotionWarp.cs`, measured against a two-bar window so one big travel doesn't hide
the rest; the lab's own `motionBeats` normalises over the whole run and found none).

`mv choreo play dance_chorus --strip` (22 s): `videos/greener/choreo/out/dance_chorus.mp4`, front and three-quarter
side by side, 720x480, 30 fps, the song from 48.49 s mixed in, plus `dance_chorus_strip.png`, every frame, a second a
row. The camera is the lab's: a plain lawn, 4.6 m off (`--dist`), hips travel kept in frame. Judge it at normal speed
with sound before building anything around it; sheets are for staging.

## Check gates

`gates` in the take, defaults: `snaps 5`, `spikes 0`, `flips 0`, `footTravel 2.0` m (RETRO asks for 1 m; the chorus
is at 1.49), `worstGapBeats 4.5`, `landMs 70`, `landShare 0.6`. `check` exits 1 on any. The bake numbers come from
`gen/bake/report.json` for the take at its card time (`acts/50-cards.json`); a take no card performs yet has no place
in the song, so `build` compiles it and skips the bake, and `play`/`check` stand it far off the set.

## Segments

`mv choreo segments mx_snake`: the clip's motion beats with strength, and segments of 1-4 bars starting on a motion
beat at the speeds that put the clip's own pulse (`tempoBeat`) on the song's beat, as one beat, two or half, scored by
how many motion beats land on the grid. It reads `library/motion/clips.json` when that library exists (and prints its
`segments` if it names them), else `library/clips.json`. A heuristic: `moves.md`'s grades come from watching, and
`mx_hh_step`, `mx_house_2` and `mx_catwalk_seq03` failed admission and still carried the dance.

## Rough for now

- Chorus 2, the verses and the stairs hook are still from `build_ch1.mjs`; the phrases cover chorus 1. Moving them is
  a take file each (the same phrases, `len: 5b` on the jazz square, `masks` for the booty-step arms).
- `word:` times land where the lyric starts, rounded to the grid's 3 decimals, not on a beat: use them for gestures,
  beats for the body.
- `play` is the lab's picture, not the set or the look. It is for motion and timing only.
