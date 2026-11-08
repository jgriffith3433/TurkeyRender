# Styles, formats, look keys, type

**One line picks each, and no shot changes.** In a video's `style.json`: `{"inherit":"neon-noir","format":"social-15-vertical"}`, or
`"style"` and `"format"` in `score.json` for a video without cards. `mv style <name>` and `mv format <name>` swap that line (no name lists
them; `format` prints the beat sheet with times, `--length 30` scales it), then `mv cards`. The video's own `style.json` is stronger, key by
key: `"grade":{"grain":0.1}`, `"sky"`, `"lens"`, `"steps"`, `"aspect":[4,5]`, `"length":20`, `"fps": 24`, `"type"` (caption defaults),
`"make": {"critic": 7}` (the `mv make` motion threshold).

## Styles

`Director/library/styles/<name>.json`. Have: `filmic-night soft-daylight stop-motion graphic-comic vhs-found-footage neon-noir`. Keys:
`about`, `light` (a lighting preset, the default for every card), `grade` (any look key, on from time 0), `sky`, `steps` (hz, stepped
animation for the whole video), `fps` (`mv render` default; stop motion is 24), `lens` (mm per camera preset `{"close-up":85,"wide":24}`,
`aperture` to fix it, `apertureScale`, `handheld`), `type` (defaults under every `text` cue: `color style size pos in out tilt`, `caps:1`,
and the caption keys `outline outlineColor shadow box`), `cues` (plain cues at the head of the score, like the VHS date stamp), and any
card field (`mood`, `camera`). A card or a sequence still wins. Moods move a style, they don't replace it.

**Style sheets:** `node Director/mv.mjs hold node Director/tools/mv/stylesheets.mjs [--styles a,b --clips]` builds `videos/styletest`
once per style and writes `Director/library/styles/sheets/<style>.png`, `compare.png`, and with `--clips` a short `<style>.mp4` for judging
steps. A new style isn't done until its sheet reads as a look of its own.

## Formats

`Director/library/formats/<name>.json`. Have: `music-video ad-30 social-15-vertical trailer short-film explainer`. Keys: `aspect`,
`render`, `fps`, `length`, `pacing` (`avgSeconds`, `maxSeconds`, `shots`), `beats` (the beat sheet: `part`, `seconds` or `share`, `job`),
`fovScale`. `mv cards check` warns when the cut misses the pacing or length. The aspect reaches `frame`, `sheet`, `shot`, `previs` and
`render`, which all take `--aspect 9:16`; `--w`, `--h`, `--fps`, `--length` beat the file. `render` and `previs` stop at the format's
`length`. A tall frame opens every lens by `fovScale` (1.3), centres the subject instead of a third, and sizes type to its width. After
changing a format build with `--full`.

## Look keys

`{"grade":{...}}` tweens and holds; `{"pulse":{...},"every":"1b","sharp":2}` hits and decays. A `grade` on a cut is a tween, so `for: 0`
means already there.

- Base: `bloom threshold chroma vignette distort exposure contrast saturation hue grain tint focus aperture motionblur shake dutch zoom
  handheld flash flashColor bars`.
- World warp: `suck suckRadius twist wave toon`; `"suckAt":"tv1.screen"` or `[x,y,z]` moves the warp's centre.
- Screen: `pixel poster halftone ink scan rgb swirl pinch radial tear invert kaleido blur duo duoA duoB mirror mask channel neon neonA neonB
  hatch snow`. (`rgb` sets `_MV_Rgb` but the shader reads `_MV_RGB`, so it does nothing; fixing it changes TK Shock if re-rendered.)
- Library looks (0 unless asked): `vhs` tape, `split` with `splitA` shadow and `splitB` highlight colours, `lift` milky blacks, `halation`,
  `paper`, `flicker` and `weave`, `clay` plasticine that boils on each step, `inkWidth` line weight for `ink`, `aspect` a window inside the
  frame (1.333 for 4:3).
- Daylight: `haze` air by depth (cool, warmer toward the sun), `veil` the sun's glare on the lens, `leak` a warm light leak from the sun's
  side, `dust` motes (world-fixed, pure of time), `curve` a film curve over the tonemap, `skin` light wrapped and reddened on warm albedos
  (`MV/Lit`), `sunRim` sun on silhouettes (`MV/Lit`). Lights that follow the camera (`MV/Lit`): `faceFill` a big soft shadowless source at
  the lens on warm albedos so eye sockets never go black; `catch` a small softbox beside the lens seen only in wet surfaces (smoothness over
  .8, the eyes). `haze`, `veil` and `dust` need a sky cue with `sun` and `sunDir`.
- Registers (2026-11-07): `epic` and `plain` 0-1, set by a card's `look:` ([epic-fx.md](epic-fx.md)).
- Eye: `eyePupil`, `eyeTV`.

Type goes through the screen looks: `neon` turns it to outline, `radial` and `swirl` smear it. Keep lyrics and captions on looks that
leave type solid.

## Sky

`sky` takes `top mid bottom fog density ambient`, plus `sun`, `sunDir`, `sunSize`, `haze`, `clouds` (0-1 cover), `cloudColor`,
`cloudShade`, `cloudScale`, `cloudSpeed`, `cloudSoft` (0.2 default, 0.4 painterly), `stars`, `ambientTop` / `ambientBottom`. All drawn from
the view direction and scene time, so they scrub. Leave them out and it is the plain gradient.

## Captions and text

`{"text":"..","style":"pop|slam|type|fade","size":..,"pos":[x,y,0]}`. Legible captions (2026-11-08): `"outline":0.32,
"outlineColor":"#000000f0"` (TMP SDF units), `"shadow":1` with `shadowColor shadowX shadowY shadowSoft shadowDilate`, `"box":0.45` (with
`boxColor`, `boxPad` canvas pixels: the outline alone reads thin on TMP's Mobile SDF shader, the box makes a caption read on white walls),
`"in"`/`"out"` 0.01 to cut on and off. Put them in the style's `type` so every caption gets them (Hawkes Punch's `style.json`). Broadcast
graphics (`gfx`) are in [score-cues.md](score-cues.md).
