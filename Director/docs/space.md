# Real-scale space (`space_epic`)

Hawkes Punch's space at true size (J: "make the planets actual planet size... think One Punch Man"; story
`videos/hawkespunch/SPACE-EPIC.md`, zero-g body rules `Director/research/zero-g-acting.md`). Set `library/sets/space_epic.json` (origin
z 9000), engine `Runtime/MVSpace.cs`, shaders `Runtime/Shaders/MVSpace*.shader` and `MVSpaceLib.hlsl`, lighting preset `space_epic`,
maps `Assets/MusicVideo/Props/Space/` from `Director/tools/space_tex.py` (the Earth is drawn from hand-written continent outlines and
about 230 cities; no downloads). Proof video `videos/_space_epic` (cards `proof.yaml`; not for J).

## Two layers

An actor with `"space":{"kind":...}` is one of:
- `root`: the far layer, the sun, the stars, the near lights, named `focuses`.
- `body`: a planet or moon: `look` earth|moon|jupiter|saturn|greymoon|rock, `radius` km, `atmo` km, `atmoColor`, `atmoStrength`, `tint`,
  `bright`, `albedo` and `bounce` colour (the light it throws on him), `day` seconds a turn, `haze` [r,g,b,km] and `hazeBelow` km inside its
  air; Jupiter also `stormLat stormLon stormW stormH stormSpin wind`.
- `ring`: `body` that shades it, `inner outer` km, `profileFrom profileTo`, `opacity`, `nearFade` km, `clumps`, `spin` deg/s.
- `crater`: `body lat lon radius` km, `grow` (share of the cue spent growing), `glow`.
- `speck`: a body too small to see, drawn as its light (`color glow size` px; a `planet_move` with `trail` s draws its streak).
- `field`: ring ice boulders: `ring radius count seed thickness sizeMin sizeMax hero:[[x,y,z,r]] clear:[[x,y,z,r]] color color2 ice smooth
  detail fadeFrom fadeTo`.
- `surface`: `body`, `look` rock|cloud, `size` m, `planetRadius` m. Rock: `craters craterMax rocks rockRadius rockMax clear`. Cloud: `amp
  scale boil bands vortex`: cumulus domes on a swirled swell, coloured by the far layer's own Jupiter with its bands magnified `bands`
  times, white ammonia on the tops, rust in the folds, haze filling the valleys first; `vortex: [x, z, radius, spin]` (patch metres, x east
  and z north; rad/s at the core) is a storm at his scale (`jupiter_catch` sits on the Great Red Spot's north collar); within 400 m the puffs
  carry filaments and drifting rust streaks, shadowed creases, a lower exposure.

Bodies, rings, specks: their actor position minus the root's is **kilometres** (so `move`, `rotate`, `spin`, `jump` work on them in km).
The far layer (`MV/SpaceFar`) ray-traces them per pixel along the near camera's own rays: the far camera has the near camera's rotation
and lens exactly and its position divided by 1000, carried by the focus; centres reach the shader relative to the camera in double, so a
metre above Jupiter's clouds and a million km off both hold. It draws after the near opaque layer only where nothing near was drawn and
before transparents, so bodies, boulders and effects sit on top with their own depth. Near Earth (100-1000 km up) it adds a fractal coast,
ground texture, shelves, wave-broken sun glint, finer cloud, aerial haze thickening toward the limb and lights broken into towns; a body
the camera is inside is not drawn. Fields and surfaces are real meshes in **metres** around the root (`MV/SpaceRock`, `MV/SpaceCloud`),
shown only while the focus is on their body.

## The focus

Says where the near world (the marks) is in the far one. Every card starts with one: `{at: 0, do: focus, on: space_epic_space, name:
<focus>}`, a preset of the root's `focuses`, any key overridden on the cue: `body lat lon alt` (km; ground is y = 0), `ring r lon alt`
(the ring plane is y = 0, +z outward), or `pos [km] rot`; `heading` turns the near world about its up, `rot [x,y,z]` tips it (`[90,0,0]`
makes the planet a wall ahead). With `for`, a focus glides: over the surface when both are on one body, else straight. Focuses:
`arrival_streak arrival_rings ring_walk ring_chase ring_edge moon_ground moon_wide jupiter_bg jupiter_catch jupiter_low atlas earth_insert
sunrise saturn_wide crater_wide`; marks for every beat of SPACE-EPIC.md are in the set with a note each. `sunrise` needs `alt: 5000`;
moon-ground cameras stay at y 1.3 m or more looking down.

## Cues (`MVSpace.cs SpaceStep`)

- `planet_move` on a body or speck: `to` [km from the root] or a body's name (+`offset`), `arc` km along `arcDir`, `ease`, `trail` s.
- `planet_hold`: the body follows the near origin at `offset` [km, near axes] with `weight` (tweened by `for`), and `face: [lat, lon, 0]`
  turns it so that place is over his head (the Atlas hold: `{do: planet_hold, on: space_epic_earth, offset: [0, 6371.0023, 0], face: [48,
  12, 0]}`, its surface 2.3 m over his head). `planet_release`: weight back to 0 over `for`. `planet_orbit`: back to where the set put it
  (`offset`, `arc`) on a smootherstep, "like setting down a full glass" (`planet_orbit for 2s` fixed w7_shove parking Jupiter on Earth).
- `ring_hoop` on `space_epic_hoop` (the A ring): `stage: lift` (`lift` km along its normal, `tilt`, `drift`), `stage: lasso` (round `pivot`
  or a body, `axis`, `turns`), `stage: throw` (`to` a body or [km], `arc`, `rot`; inner radius 122,170 km against Jupiter's 69,911); `spin`
  deg/s from that cue on.
- `crater` on `space_epic_crater`: blooms over `for` (a white flash, a molten floor and glowing rim cooling to orange, the shock ring
  running out, then a dark bowl with bright rays).
- The far-layer shockwave: `{"fx":"shock","far":"jupiter","normal":[...]}` ([epic-fx.md](epic-fx.md)).

## Light

One hard sun from the root's `sun` direction (`sunColor sunIntensity sunSize sunDisc glare farSun`): MVSpace aims a directional with
shadows at the near world per camera (`RenderSettings.sun`), adds the **bounce** of the brightest planet in view (albedo x solid angle x
lit fraction x `bounce`, capped by `bounceMax`) and a **rim** from behind him on the side away from the sun (`rim rimColor rimUp rimSide`).
Stars are fixed in the far frame, never sparkle, dimmed by `starsLit` when a lit planet fills the frame. The sun's glare (`MV/SpaceGlare`)
is drawn over everything and hidden by far bodies in front of the sun. The lighting preset is black sky and almost no ambient. **Hawkes
Punch's stage `key` light is on all the time: turn it to 0 at 0 over space cards** or it lights space from nowhere. Moods `hp_space_*`.

## Scale rules (research/epic-anime-action.md 2 and 6)

A man and a disc read together only at very different distances (him 50-200 m from the lens, the planet 10^5 km behind); contact shots
are near-scale with the planet as terrain (a focus on the surface, a patch under him); a man too far to see is a `speck`; one scale per
shot; scale reads through the cut (face, extreme wide, face). km vs m is the trap: bodies and specks km from the root, fields and surfaces
metres; aim cameras at hips height on zero-g marks.

## Checking and rough edges

`touch Director/gen/space-debug.flag`: every far render appends what it resolved (camera, focus, each body's position from the camera and
where it falls in the lens) to `Director/gen/space-debug.txt`; delete the flag after. A shot of the far layer alone needs `shot: {pos, rot,
look: null}` or the `ahead` mark. Rough: a focus glide between two bodies (or one started inside an unfinished glide) starts from the last
focus's target; a patch stays under the near origin while the focus slides (hide with speed lines or a cut); far bodies cast no shadow on
the near layer; the near deck's billows are vertex-displaced so the motion check sees a flat disc; the crater's near-scale dust is
`fx: impact`. **Open:** the Atlas hold (Earth overhead with the night side and city lights) is unsolved: a ceiling at 2.3 m, a blue sky at
100 km, a dark face at 300 km; the space agent (a274cc28a745ca09d) was on the close Jupiter wall and the night-side Earth check
(`p_atlas_night` in `videos/_space_epic`).
