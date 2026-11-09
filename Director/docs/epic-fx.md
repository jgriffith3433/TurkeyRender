# Epic toolkit and Hawkes Punch mechanics

Every cue here is a pure function of time and off unless cued, so older videos render as before. Frames count at the score's `"fps"`
(`"frames":3`, or `"4f"` anywhere a length goes). The craft: `Director/research/epic-anime-action.md` (impact order, hitstop lengths,
cutting rules, two looks, the flash limit, stepped animation). Proof: `videos/_fx_test` (10 s, 24 fps, `library/sets/fx_void.json`).

## Epic toolkit (`Runtime/MVEpicFx.cs`, `Editor/MVEpicScore.cs`, the end of `Shaders/MVStylize.shader`)

- **Impact frame** `{"do":"impactframe","on":"boulder","style":"flip","flash":1,"frames":2,"accent":"#ff3a2a","lines":1,"silence":4}`:
  `flash` frames of white (`flashColor`, `flashAlpha`), then `frames` (1-4) two-tone frames: `style` `black` (subject black on white),
  `white`, or `flip` (one then the other). The subject is everything nearer than `on`'s depth times `cut` (1.35), its highlights left white,
  silhouettes inked, radial lines from it (`lines` 0 to drop), a rough edge; `"threshold":0.4` cuts on luminance. Over 4 frames is refused.
  Plain look turns it off.
- **Speed lines** `{"do":"speedlines","style":"radial","on":"person.rightHand","amount":0.8,"for":"0.5s","fadeIn":"0.1s",
  "fadeOut":"0.2s","clear":0.22,"density":0.55,"width":0.14,"count":150,"ink":0,"hz":12}`: screen-space, redrawn every `1/hz` s (12: on
  2s at 24 fps). `radial` converges on `on` or `"center":[x,y,0]`; `"style":"parallel","angle":20` streaks across, clear round `on`.
  Song time, so they run through a hitstop.
- **Smear** `{"do":"smear","on":"person.rightHand","frames":1,"style":"both","length":0.45,"copies":3,"fan":12,"fat":1.3,"dir":[0,0,1]}`:
  on the strike's fastest frame the limb chain is drawn again from the posed mesh with his own materials, stretched `length` m along `dir`
  (default down the forearm) and `fat` times wider, and/or `copies` multiples fanned back round the shoulder `fan` degrees (`style`
  `stretch`, `multi`, `both`). A straight punch seen end-on hides its stretch: the multiples read.
- **Shockwave** `{"fx":"shock","on":"boulder","size":5,"for":"0.55s","width":0.07,"distort":0.6,"glow":0.25,"fill":0.12,
  "color":"#fff7ea"}`: a ring that tears out fast (70% of `size` in the first third), thin bright edge and a faint pressure disc, facing the
  camera or `"normal"`, plus a screen distortion and a glow. On a sphere: `"sphere":"moon","angle":60` hugs the surface from the hit point
  over `angle` degrees (`for` 1-3 s reads as huge). On the far layer: `"far":"jupiter","normal":[...]` ([space.md](space.md)).
- **Debris** `{"fx":"debris","on":"boulder","kind":"ice","size":3,"count":170,"speed":5,"normal":[0,0,1],"spread":80,"drag":0.35,
  "gravity":0,"spin":220,"dust":36,"for":"8s"}`: faceted chunks flung from where `on` was at the cue's start, a few big slow and many
  small fast (`min`, `max`), each spinning at its own rate; `kind` `ice` or rock (`color`, `color2`, `smooth`, `shadows:1`); `dust` puffs
  bloom, hang and fade only at the end.
- **Ice wake** `{"fx":"icewake","on":"other","for":"6s","emitFor":"1.5s","count":500,"size":2.2,"spread":9,"along":0.12,"radius":0.6,
  "drag":0.35,"dust":60}`: ice boulders blown out of a flyer's path as he punches through a ring (the path over `emitFor` sampled at 24
  points).
- **Camera shake** `{"do":"shake","trauma":1,"punch":0.06,"for":"0.75s"}` (no `on`; with `on` it is the actor oscillator): Eiserloh's
  trauma falling over `for`, squared: roll up to 2.5°, pitch and yaw 1.5% of the frame, noise at 16 Hz seeded by song time (repeats
  exactly, runs through a hitstop). `punch` narrows the lens for `punchFor` (0.18 s). `"heavy":0.8,"for":"2s"` is the slow 3 Hz sway of
  holding a planet. Light 0.3, heavy 0.6, finisher 1.
- **Hitstop that holds native bodies** (`do: hitstop`, `fx: impact`'s `hitstop`; frames at the score's fps or `"0.25s"`): a hold in the
  warp (2026-11-08: not a speed of 0, so nothing after it moves against the cuts; before, every hitstop frame put every later cast change a
  frame early). A native body holds its pose through the hold: every native clip running across a hold is cut in three (to the hold; the
  hold at time scale 0.001; after it, on from the contact pose: song time minus the hold, until the next cut, where it rejoins song time; a clip starting on the hold's first frame holds too). The world does the same: after a hold, scene time runs on from the held value and pays the hold back at the next cut, so nothing pops when a hold ends (2026-11-08; proof `videos/_layer_test` 13.5 s). A hold inside a crossfade or a layer fade is left alone with
  a build note: give the clip at the hit `blend: 0` (Hawkes Punch's clinic punch lands on a card cut). The toolkit's effects count only
  scene time that passed; older particle fx starting at a hold's end are pre-aged by the hold. `"victim":"boulder"` shakes it across the
  hit (`axis`, `victimShake` 0.05, `victimHz` 20); `"attacker":"person","creep":0.03`. `{"do":"hitshake","on":"x","amount":0.04,"hz":20,
  "for":"6f"}` is the shake alone. Hitstop lengths: 6-8 frames, 18 for the finisher.
- **Freeze** `{"do":"freeze","on":"person","frames":14,"tremble":0.006}`: the anticipation hold; a native clip stands still then goes on
  from where it stopped; `tremble` m of root shake keeps it alive. Then a 2-4 frame strike: `{"do":"anim","clip":"mx_cross_punch",
  "start":0.733,"rate":3,"blend":0}`. **`rate`, not `speed`.** A freeze inside a crossfade restarts it: put it on a clip playing alone.
- **Two registers** on a card: `look: epic` (harder contrast, saturation, rim and sun rim up, a touch of chroma and halation, vignette) or
  `look: plain` (flat, soft, `faceFill` up, rim down; no speed lines, no impact frames). Look keys `epic` and `plain` (0-1), set with a
  0-length grade on the card's first frame so they switch on the cut and never blend; a card without `look` goes back to neither. Deadpan
  against epic: the bigger the feat, the smaller the reaction.
- **Silence before a hit** `{"do":"silence","frames":4}` at the hit (or `for` from `at`): the whole mix gated to nothing for those frames,
  back on the hit's own frame (`videos/<v>/silence.json`, written by the build; `tools/mv/sound.mjs` mixes it; `mv render`'s own mux
  doesn't). `"silence":4` on `impactframe` or any `fx` does the same. Frames count backwards from `at`, so don't double a silence on both
  the fx and a `do: silence` (sound.mjs merges overlapping silences).
- **Flash check** `node Director/tools/flashcheck.mjs <video.mp4> [--json f] [--quiet]`: Ofcom's rule (a transition is 20 cd/m² over a
  quarter of the screen with the darker side under 160; a flash is a pair of opposite ones): over 3 flashes in any second, or any saturated
  red flash, fails (exit 2) with times. `mv final` runs it (`final/flashcheck.json`). An impact frame is one or two flashes; keep impacts a
  second apart.

## Hawkes Punch mechanics (`Runtime/MVPunch.cs`, `MVPunchFx.cs`, `Editor/MVPunchScore.cs`)

Proven forward and backward at 8 moments. Any of these on a human turns his ground pass off while it runs.
- **Fly** `{"do":"fly","on":"person","points":[[600,1,0],[603,8,20],[600,30,60]],"fromHere":1,"for":"4s","ease":"in","face":1,
  "roll":180,"trail":{"lines":16}}`: a Catmull-Rom through `points` (`fromHere` prepends where he is) or `"to":[x,y,z]` with `"arc":6`;
  length `for` or `"speed":22` m/s. `face:1` turns the body along the path, pitch included (`"face":"yaw"` level), blending in over `turn`
  (0.3 s); bank atan(v²κ/g) capped at `bank` (40°); `roll` a barrel roll; `tilt` a fixed offset. The body is yours: a sheet, clip or
  performance plays underneath. `trail` adds a streak (`width` .35, `length` .22 of the path, `lines` 14 in a `spread` 1.1 m, `color`,
  `alpha`, `fadeOut` 0.4 s); also `{"fx":"trail","on":"person",...}`.
- **Throw and catch** `{"do":"throwobj","on":"can","from":"doctor.rightHand","to":"person.rightHand","for":"1.2s","arc":6,"spin":900,
  "catch":{"pos":[0,0.05,0.08],"squash":0.3}}`: leaves where `from` is at the cue's start (`"from":"swing"`), lands where `to` will be at
  the cue's end (a moving catcher still catches), on a parabola of `arc` (default 0.18 of the distance; `"straight":1`), `spin` about
  `axis`, `ease`. `fromOffset`/`toOffset` world or in the bone's frame with `"rel":1`. `catch` attaches on arrival (same sample, no pop) with
  `pos`/`rot`/`blend`/`scaled` and a `squash` (0.25) decaying over `squashFor`. `{"do":"catch",...}` alone. `detach` first if attached. The
  catch `pos` must match the throw's `toOffset` or the object steps on the catch.
- **Lasso, swing, throw** `{"do":"lasso","on":"person","to":"saturn","for":"1b","hold":"12s","hand":"right"}`: a rope fx (`thick` .035,
  `color`) whose loop flies out spinning open, tightens over `tight` (0.25 s) round the target (`radius` overrides), stays `hold`; `sag` .1 in
  flight, `sagTight` .025. Then `{"do":"swing","on":"saturn","around":"person","turns":2,"for":"3s","lift":3,"ease":"in","radius":1,
  "axis":[0,1,0]}` orbits the roped thing round the mover, then `{"do":"throwobj","on":"saturn","from":"swing","to":"other.chest",
  "toOffset":[0,0,-4],"for":"1.2s"}`. Direct: `{"fx":"rope","from":"person.rightHand","to":"saturn","fly":1,"for":"12s"}`. A rope on a
  planet with rings needs `radius` by hand.
- **Impact** `{"at":"25:1","fx":"impact","on":"other.chest","size":5,"shake":0.4,"hitstop":3,"gravity":0,"color":"#ffcc70"}`: a flash
  held `flashFor` (0.07 s) at `flash` (0.5), a shockwave ring and a second ring, `count` (90) debris chunks (`debris` colour), sparks, dust
  and a point light, scaled by `size`; `gravity` 0 in space; `shake` a camera pulse for `shakeFor` (0.2 s); `hitstop` as above;
  `"normal"` faces the ring.
- **Set break** `{"do":"shatter","on":"window","dir":[0,0.2,1],"count":180,"push":6}`: the prim hides and bursts into glass shards
  (`size`, `speed`, `gravity` 1 unless told 0, `life` 2.5, `color`), with a glint and a flash. Roof pieces: a crowd of cubes and `scatter`
  (`power`, `lift`, `gravity`, `floor`), or `shatter` on each.
- **Fold-out** `{"do":"fold","on":["backdrop","stool_l","stool_r","can"],"from":[0,0.5,70],"pivot":[0,-2,0],"axis":[1,0,0],"angle":90,
  "for":"0.6s","stagger":"0.25s","ease":"back"}`: each piece hidden until its turn (`"appear":0` keeps it), then swings open on a hinge
  from `angle` about `axis` to its rest, growing from nothing at `from`; several `on` in order, `stagger` apart.
- **Space camera:** the `follow`/`lag`/`lead` shot ([score-cues.md](score-cues.md) "Shots").
- Rough: trail speed lines are straight along the path, not motion-blurred.

## The impact order (the research, in frames at 24)

Long wind-up (or none, for the deadpan hero) with a `freeze`; a 2-4 frame release on 1s with one `smear` frame; `impactframe` 2 frames;
`hitstop` 6-8 (18 for the finisher) with the victim shaking; held follow-through; the giant object starting slow; then the hold after the
boom is the laugh: 1.5-3 s on the plain face, no cut, near silence, then one small sound. Cut on contact, never on anticipation. The hero
ignores recoil on planets; ordinary zero-g rules apply to cans and to each other.
