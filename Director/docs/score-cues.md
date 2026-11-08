# The score: cues, actors, shots, acting, props, effects, TV, text, sound

`Director/score.json` plus `Director/acts/*.json` in name order (a card video: `videos/<v>/score.json`, `acts/`). Comments allowed. The
score is the source of truth: the scene's `_Generated` and every Timeline track are rebuilt from it on each build. Cards
([cards.md](cards.md)) compile to cues like these; a card's `events` and `raw` take any cue here.

**Times:** `"12:3"` bar:beat, `"12"` bar, `"41.2s"`, `41.2` seconds, `"m3"` a mark, `"s5"` a section, plus an offset `"m3+2b"`,
`"+1bar"`. Inside a macro, `"+1b"` is measured from the macro's start. **Lengths:** `"2b"`, `"1bar"`, `"0.5s"`, `"6f"` (frames at the
score's `"fps"`; 30 when it has none; Hawkes Punch is 24). Any cue: `at`, `for`, `until`. Repeat with `"repeat":"1b"` + `times`/`until`,
or on hits with `"onsets":"kick|snare|hat|all"` + `until`. `"macro":"name"` expands `macros`, `$key` substitutes.

**How it works:** everything is a pure function of timeline position: `MVTrack`s fold over all their clips by absolute time, so any frame
can be computed on its own; that is why scrubbing and reverse work. Never add state that depends on the previous frame, never use
`Time.timeScale`. Scene time comes from `SongMap.Warp` (`WarpRaw` skips `steps`, for cameras). A `ScriptableObject` type needs its own
file named after it. `Runtime/`: tracks and drivers, `Shaders/MVWarp.hlsl` injected into `MVLit.shader` (URP Lit), `MVStylize` the
full-screen pass, `MVTvScreen`. `Editor/`: `ScoreCompiler`, `Bridge` (file mailbox, `[BridgeCommand]`), `Transport` (the desk, capture,
render), `Quality`, `Setup`. The TK Shock song is 87 BPM, 73 bars, a 3-3-2 kick pattern. Envelopes for `band`: `kick snare hat drums bass
vocal other mid high rms bright`.

## Actors

`actors.<name>`: `model` (an alias from `models`, a path, `prim:cube`, or `"none"` for an empty actor used for grouping), `pos rot scale
color emission`, `from`/`until`, `crowd {count shape:grid|circle|line|scatter spacing radius seed modelScale scaleVar face}`, `models` to
mix, `tv {...}`, `tvworld` (a surface that is a giant TV), `"parent":"turkey_chef.head"` (attached from the start, `pos`/`rot` the offset,
`"scaled":1`, `"withHost":true` shows and hides with the host in a card video), `"native":true|false`
([native-acting.md](native-acting.md)), `"shell"` ([cards.md](cards.md) "Sets"), `"shadows":false`.

- `color`, `emission`, `smooth`, `metal` and `texture` only work on prims; on a model file use `skin` or `material`. `"texture":"Assets/
  Shows/wall.png","tile":[2,1],"unlit":1.5` on a prim: `unlit` is the glow, `color` tints it. `boxUV` on any actor: tiles per metre, new
  UVs thrown along the mesh's faces at true size whatever the scale (`{"model":"crate","boxUV":1.6,"texture":"...","color":"#ffffff",
  "smooth":0.18}`, `tile` for a non-square map).
- **Wardrobe** `"wear":[{"model":"Assets/MusicVideo/Person2/Coat/Coat.fbx","materials":{"Coat_Cloth":"...mat"}}]` on a rigged actor binds
  a garment skinned to the same rest skeleton to that body's bones by name (import the garment as Generic): it plays with the body's
  Animator, hides with it and counts as the body in the motion check (`ScoreCompiler.Wear`). Her white lab coat is made by
  `tools/blender_coat.py` (built on her in an A pose and carried back to rest by inverse skinning), proved by `blender_coat_proof.py`,
  installed by `coat_assets.py`. `call inspect '{"path":..,"bones":["Head"]}'` gives a bone's rest offset for attach `pos`/`rot`.
- **Grass** `{"model":"none","grass":{"size":[17,12],"hero":[[x,z,r]],"push":"person.rightHand:0.1,person.rightFoot:0.1"}}`: real blades
  (`MVGrass.cs`), thickest in the `hero` circles; `height width seed quality heroDensity midDensity farDensity midRadius`, colours `dark
  mid tip dry soil`, `flowers` per m² with `flowerA flowerB`, `exclude` boxes, `wind windAngle windScale lean` (vertex shader on scene time:
  scrubs, reverses, steps). `push` names up to 8 bones or actors that part the blades. **Fence** `{"model":"none","fence":{"length":18,
  "height":1.75,"texture":"...","color":"#c89a6c"},"pos":..,"rot":..}`.
- **Mountain** `"p5_mountain":{"model":"none","mountain":{"radius":45,"height":22,"seed":5,"cards":240000,"holeW":5.4,"holeH":4},...}`
  with `drain` and `dent` cues; **Eye** `"eyeball":{"model":"none","eye":{"from":"person.head","to":"tv1.screen","skin":"#b27a60",
  "iris":"#2b5566"}}` (a macro set facing +Z; the reflection is a small camera at `from` looking at `to`; `eyesee`, `face` with `wide pupil
  squint lookX lookY reflect`, `blink`). `"cards"` above 80000 can crash the GPU; keep one mountain on screen.

## Shots (cameras)

`{"at":..,"shot":{name pos rot fov move rotate look follow offset focus aperture handheld dutch dolly:[points] orbit:{around radius y rate
angle} frame:[actors] noise blend fovTo fovFor fovEase deadzone}}`. `fovTo` is a crash zoom, or a dolly zoom with `move`. Runs until the
next shot. Mostly cuts; `blend` only when creative. `look`/`focus` take bones: `person.head`, `.chest`, `.hips`; `look` must be an actor or
`rot`, never an array. **Space camera:** `{"follow":"person","offset":[2.5,1.2,-6],"lag":0.12,"lead":0.25,"look":"person.chest"}` rides
the subject's path `lag` seconds back and aims `lead` seconds ahead (a `<shot>_lead` helper actor); `"space":"target"` turns `offset`
with his heading, `"full"` with his whole rotation; `orbit.around` follows a moving actor. `{"do":"fov","on":"feedcam","to":26,
"for":"2b"}` on a camera actor.

## Motion on things

`{"do":kind,"on":actor}`; holds after it ends: `set move rotate scale jump pop shrink spin orbit suck fall scatter tint glow show hide`.
Only inside the clip: `hop bob sway shake pulse squash react`. `anim` plays `clip` (`beats` locks a cycle to the beat, `offset`, `speed`).
On crowds it acts per member: `stagger`, `jitter`. `every` is beats. Never `move`/`rotate` a human (lint; `"lint":"slide"` for a deliberate
slide).

- **Attach:** `{"do":"attach","on":"remote","to":"person.rightHand","pos":[..],"rot":[..],"blend":"0.2s"}` follows a bone or actor until
  `{"do":"detach","on":"remote"}`, which keeps the world pose. `to` takes `actor`, `actor.bone`, `flock#3.head`; camera `look`/`focus`/
  `follow` and `fx` `on` take the same, plus `person.mouth`, `.hand`, `.lefthand`, `.foot`. A person on a sofa: attach him to `sofa` and
  `topple` the sofa. On a native body the attach runs after the Animator (`MVLate.cs`), so props stay in the hands.
- **Weight:** `topple` `{"pivot":[0,0,-0.45],"axis":[1,0,0],"angle":-85,"bounce":0.25,"land":"25:3","for":"1bar"}` (about an edge,
  falling under gravity, landing on `land`); `drop` `{"floor":0,"bounce":0.35,"height":1.2,"tumble":[80,0,20]}`; `slide` `{"to":[..],
  "hits":"kick","yaw":4}` stick-slip (jerks on hits inside `for`; `dir`+`step`, `jerk`); `tremble` `{"amount":0.006,"band":"kick"}`;
  `wobble` `{"amount":6,"decay":3}`. Soft props (the compiler subdivides them): `ripple` `{"amount":0.1,"wave":0.8,"speed":1.5,"angle":0,
  "fade":"0.3s"}` (`"pulse":1` one hump), `peel` `{"corner":[1,1,0],"to":1,"curl":0.3}` (`side:-1`; flat sheets only), `bulge`
  `{"toward":[0,1,2.5],"amount":0.2,"radius":1.2}`.
- **Time:** `{"speed":0.1,"for":"1bar"}` slow motion (song time never changes; motion, animation and effects read scene time).
  `{"steps":12,"for":"8bars"}` animates the world on steps; the camera stays smooth. `speed` on a cue that isn't a time cue changes scene
  time (unless `gfx`): on a native `anim`/`layer` use `rate` ([native-acting.md](native-acting.md)).
- **Hawkes Punch mechanics** (`fly`, `throwobj`/`catch`, `lasso`/`swing`, `impact`, `shatter`, `fold`, `hitstop`) and the epic toolkit
  are in [epic-fx.md](epic-fx.md). Real-scale space cues (`focus`, `planet_*`, `ring_hoop`, `crater`) in [space.md](space.md).

## Acting (actors with a Humanoid rig)

All tween with `for`/`ease` and hold; only the bones you name are touched, over whatever clip plays. On a **native** actor only `anim`,
`walk`, `layer`, `reach`, `gaze`, `eyes`, `fingers`, `face`, `blink` apply; `keys`, `pose`, `plant`, `stance`, additive layers, ground,
limits, overlap, inertial transitions and bakes are legacy-path only ([native-acting.md](native-acting.md)).

- `anim`: `{"do":"anim","on":"person","clip":"IdleSit14","blend":"0.3s"}` hands over from the last clip (default 0.2 s; 0 cuts).
  `"once":1` plays once and holds the last frame; `"return":"0.4s"` blends back after `for`; `start`, `stop` (seconds into the clip),
  `speed` (legacy) / `rate` (native), `beats`, `offset`. Any clip in the project by name (`mv find`, `mv pull "ULTIMATE ANIMATION
  COLLECTION" "Humanoid@<Name>.fbx"`). Turkey clips: `bite death eat getHit1 getHit2 idle jump prancing roll run runAngry sleep squart swim
  walk`. **Root motion:** `"root":1` plays the clip's real travel from where he is (`_RM` clips, jumps, falls); `"root":0.5` scales,
  `"root":"y"` only height, `"root":"xz"` no height; the clip's height comes with it (`LandingHeavy` starts 0.53 m up). `call clipprobe`.
  **Blend tree:** `"blendTree":[["WalkBackwardsScared",0.6],["ScaredHostage",0.4]]`, every clip at the same fraction of itself; `cycle`,
  `beats`, `"mix":[["0b",[1,0]],["2b",[0.3,0.7]]]`, `root`. **Beat-warp:** `"warpTo":"kick|snare|hat|all|beat|bar"` (also on `layer`) lands
  the clip's motion beats on song hits, chosen by dynamic programming at build and baked into a curve; `maxRate` 1.5, `warpStiff` 1.2.
- `walk`: `{"do":"walk","on":"person","clip":"Sprint","to":[x,y,z],"for":"2bars","stride":3.0}` moves, turns to face the way, ties the clip
  to the distance (`stride` metres per cycle: Walk6 0.335, Walk4 0.66); `turn`, `face:0`, `rel:1` (from where he is), `rel:2` (his own
  frame), `"soft":0.5,"softOut":0.9`. Cue the next `anim` when it arrives. Works on turkeys.
- `pose`: `{"do":"pose","on":"person","bone":"rightUpperArm","rot":[x,y,z],"for":"1b","ease":"inout"}` or `"bones":{...}`: degrees on top
  of the clip in the actor's frame (x tips to his front, y turns to his right, z rolls to his left); `[0,0,0]` eases back; `"space":"local"`.
  Bones: HumanBodyBones names. Arms: gestures are mocap clips on `layer`s first; `pose` and `reach` for real contact only.
- `reach`: `{"do":"reach","on":"person","hand":"right","to":"remote","for":"1b"}` two-bone IK to an actor, bone or `[x,y,z]`; `offset`,
  `hint`, `handRot`, `"weight":0` releases, `"foot":"left"`. The hand follows the forearm by default, swings round the shoulder, the
  forearm trails a frame; `"ease":"hand"` smooth off the mark, past it and back; `"freeWrist":0`, `handRot`. Past arm's length the torso
  leans up to 30° (`"lean":0`). Stacked `reach` targets lock elbows and bend wrists; a reach with no release keeps pulling; a reach to his own
  bones reads a stale position; a reach that begins just after a cut reads as a snap (start it in place, `for: 0`).
- `gaze`: `{"do":"gaze","on":"person","to":"tv1.screen","for":"1b"}` chest, neck and head share the turn, eyes first (`lead` 2.6x);
  `"weight":0`, `limit`, `"head":0` eyes only, `"toRel":[x,y,z]`. On native: neck and head only, limit 60, fades behind him.
- `eyes`: `{"do":"eyes","on":"person","yaw":6,"pitch":-2,"for":"0.07s"}` a dart on top of the gaze, never moves the head.
- `fingers`: `{"do":"fingers","on":"person","hand":"right","curl":0.8,"for":"0.2b"}` adds to the clip; `"finger":"thumb|index|middle|ring|
  pinky"`; `"set"` sets the hand outright (0 flat, 0.1 open, 0.35 relaxed, 0.65 half shut, 1 fist) and holds until `"release":1`. Grips:
  `Director/library/grips.json`.
- `face`: `{"do":"face","on":"person","smile":1,"eyesWide":0.6,"for":"2b"}` shapes `blink eyesWide smile fear jawOpen` plus the acting
  shapes (both him and Person2, `tools/face_shapes.py`): `eyesNarrow squint browDown browUp browRaiseL browRaiseR mouthPress mouthClose
  smirk frown cheekRaise sneer`, 0-1, all import at 0, readable at 0.5-1 in a medium close-up (`browDown:0.6,eyesNarrow:0.5,
  mouthPress:0.4` is cold anger; `mouthClose` always with `jawOpen` at the same value). `fear` 0.1 reads soft; `smile` over 0.4 parts the
  lips. `{"do":"blink","on":"person","for":"0.2s"}`. Sheets: `Director/captures/wardrobe/face_*.jpg`. `person2` imports with her shape
  keys at 100: a time-zero `face` cue holds them at 0.
- `plant` (legacy): `{"do":"plant","on":"person","foot":"both","for":"2b"}` pins the feet where they were, or at `pos`; hands too:
  `{"hand":"right","to":"sofa","blend":"0.1s","for":"4b","release":"0.3s"}` locks the hand on the spot it was on and follows the thing
  (`"lockRot":0`, `offset`, `follow` 0.5 / 0 for how far the body is dragged, `hint`).
- `stance` (legacy): `{"do":"stance","on":"person","arms":1,"legs":1,"shift":-0.025,"narrow":0.05,"drop":0.012,"tilt":2,"sway":0.008,
  "period":5.2,"bones":{..},"for":"0.5s"}` how he carries himself under every clip; a walk cues `"legs":0`.
- **Perform:** `{"do":"perform","on":"person","name":"walk_tired","for":"2bars"}` plays a tested, named action from
  `Director/library/performances/<name>.json`, expanded at compile time; other keys are parameters (a wrong name vanishes; lint checks
  them). Only what `library/performances/gallery.md` lists as PASS is proven; `library/performances/README.md`, `node Director/tools/
  perf_lab.mjs <name>`. A performance isn't cut at `for`: a take must be exactly as long as it plays. Lyric gestures `g_point g_shrug
  g_hand_heart g_hand_cheek g_finger_lips g_wave g_bow g_hair_flick g_hands_up g_head_no g_nod` are layers over `dress_stand`.
- **Keys** (legacy): `{"do":"keys","on":"person","at":"25:1","keys":[{"t":"1b","pose":"crouch"},{"t":"2b","from":"Idle1Wow@0.8",
  "hold":"0.5b","root":{"pos":[0,0,0.6]}},{"t":"3b","bones":{"chest":[25,0,0]}},{"t":"4b","pose":"kneel","ease":"out"}],
  "release":"0.5s"}`: whole-body pose to pose on a spline. A key: `t`, `pose` (from `Director/poses.json`: `stand crouch kneel kneel_slump
  kneel_hands_up sit sit_floor lay dead_back hands_up cower stunned hit_front yell surprised wow land_low crawl fall_air recoil lean_in
  slump`), `from` `"Clip@0.4"` (or `@40%`), `bones`, `hips` [m], `root` `{pos, rot}` (relative to where he stood; stays after), `hold`,
  `ease` (`in out inout linear back elastic bounce`), `flat`. Holds until `release` or the next `anim`/`walk`. Weight on keys and bone pose:
  `"anticipate":0.15`, `"overshoot":0.12`, `"settle":"0.4s"`, `"successive":true` (hips lead, then chest, neck, head, arms, hands,
  fingers). `keys` with `root` on the same time as `set` loses the root: offset by 0.01 s. Works by bone name on turkeys.
- **Layers:** `{"do":"layer","on":"person","at":"25:1","clip":"Cheer3","mask":"upper","weight":0.7,"for":"2b","blend":"0.3s"}` a clip over
  part of the body: `mask` `upper lower arms leftArm rightArm head spine` or several; `weight` 0-1 or keyed `[["0b",0],["1b",0.8]]`;
  without `for` holds until the next layer on the same mask. `"additive":1` (legacy) adds the clip's motion measured from `ref`. Clip
  options as `anim`. Any `layer` on Person2 throws both arms straight out (open fault): give her none.
- **Overlap** (legacy): `{"do":"overlap","on":"person","amount":1,"for":"0.1s"}` head, arms and hands lag and swing from how the body
  moved (a spring driven by motion sampled back in time); `head arms hands torso freq damp`; on a turkey `"chains":"neck,tail"`. About
  1.5 ms a frame. No hair bones.
- **Joint limits**, **ground** and **IK** (legacy; all off on native): limits ease every joint back inside human range as the last step
  (`"limits":0` on a cue, `{"do":"limits","amount":0}`, `stretch` turns them off; `mv lab` prints `limitsMovedDegrees`); ground
  (`Runtime/MVGround.cs`) sets the hips from the lower foot, sinks them `sink` (.045), puts near-floor feet flat by leg IK (`{"do":"ground",
  "on":"person","floor":0.77,"for":0}`, `"amount":0`; off in ragdoll, stretch, attached, sits, kneels); elbows point back and out, knees
  forward, `hint` overrides. These stages bent native joints by tens of degrees, which is why native videos skip them.
- **Ragdoll:** `{"do":"ragdoll","on":"person","at":"25:1","for":"3b","impulse":[0,1,-2.2],"blendIn":"0.08s","seed":3}` physics baked at
  build time into a clip in `Assets/MusicVideo/Generated/Ragdoll/`; `"hit":"chest"`, `spin`, `floor`, `"collide":["sofa","wall_n1"]`,
  `gravity`, `drag`, `stiff` 1.6, `drive` 0-1 toward his pose or `"pose"`/`"from"`, `"thrash":40` (`thrashRate` 3.5). Holds the last frame
  until the next `anim`, which picks up where he fell; `"blendOut"`. A ragdoll that starts on a `set` inherits a huge speed: start a frame
  later.
- **Transitions** (legacy) are inertialized (`Runtime/MVInertia.cs`): the new source is a hard cut and the jump dies on a critically damped
  curve; `blend` keeps its timing (half gone at half of `blend`, 85% at `blend`); `"crossfade":1` asks for the old blend. Native actors use
  a muscle-space crossfade.
- **Steps per actor:** `{"do":"steps","on":"person","rate":12,"for":"4bars"}` shows the whole actor at a quantized time; `"mask":"arms"`,
  `"bones":{"arms":8,"head":6}`. At 30 fps `15` is twos, `10` threes. Use where poses are strong and held and moves are fast; a slow drift on
  ones. Does not reach native bodies (use a keyed sheet's `step`, [keyed-poses.md](keyed-poses.md)).
- **Try it without building:** `mv lab file.json` plays cues on a throwaway copy of an actor and writes a sheet: `{"on":"person","from":0,
  "to":4,"every":3,"cols":8,"cues":[...]}`, `"actors":{...}` for several (clones of the open scene, or `prim:sphere`, a path, an alias),
  `"probe":[times],"probeBones":[...]`, `"render":{"out":"library/x/name","views":["side","front","three"],"w":480,"h":640,"close":1,
  "focus":"rightHand","dist":0.8}` for shaded 30 fps mp4s on a plain lawn, `"probeFace":t`, `"motionBeats":1`. It proves purity:
  `reverseWorstMetres` and `shuffledFreshWorstMetres` must be 0 (0.00003 at `[500,0,500]` is float rounding).
- **Baked takes** (legacy): `node Director/tools/bake.mjs <take...> [--video greener] [--clips --report --compare]` plays a finished take
  at 60 Hz (`call bakedump`), cleans it in Node (`tools/bake/clean.mjs`, `hands.mjs`, `mechanics.mjs`: spikes out, chest and head in a
  cone, feet built not filtered, hinges true hinges, wrist path kept, no fingertip in the face, relaxed hand life; then the upper arm leads
  and the forearm and hand trail on springs, heel-toe roll) and writes `Assets/MusicVideo/Generated/Baked/bk_<key>.anim` +
  `library/performances/baked/<key>.json`. The compiler finds the bake by key and plays it in place of the take's body; editing the take
  makes it stale; while a bake plays, ground, limits, overlap, stance and fingers stand down. `TAKE` at the top of `bake.mjs`: `planted`,
  `sing`, `sway`, `talk`. Snaps went from 1954 to 2 on Greener.
- **Clip admission** `node Director/tools/clip_admit.mjs <clip>... [--list Director/library/admit-list.json --pull --mixamo --report
  --verdicts]` writes `Director/library/clips.json` (`status admitted|rejected`, `issues`, `tags`, `length`, `loop`, `rootTravel`,
  `motionBeats`...); `anim`, `walk`, `layer` warn on a clip not admitted. Advisory for dance (stance foot slide the bake removes).

## Props and effects

- **Fx:** `fx`: `explosion shockwave sparks feathers confetti fireworks smoke dust fire rain snow embers` or `prefab:Assets/...`, with
  `on`/`pos`; `"fx":"dust","to":"tv1.screen","pull":0.3`; `stream` `{"fx":"stream","on":"person.mouth","rate":500,"life":1.2,
  "spread":0.1}` (`to`, `pos`, `dir`, `push`, `swirl`, `"water":1.4`); `crown` (a ring of feathers thrown up); `feather` on him
  (`amount`, `from` bones, `"strip":1,"to":..`); `stretch` (limb by limb drawn to a point into scan lines; `order`, `span`, `thin`, `lines`,
  `glow`); `glass` on a TV (`push` bones with radii, `open`). Keep one mountain on screen at a time.
- **Lights:** `light`, `strobe`, `lightreact` (band, floor, amount). Directional lights in one part light every other part: switch them
  off at the end of their part; sets left on all the time slow every frame (`from`/`until`).
- **TV:** `tv` (bright static feed tint mask), `tvflash`, `tvchange` (`"keep":1` level only), `tvreact`; `{"at":"4:4.47","tv":"tv1",
  "show":"news"}` cuts the picture to a show (`"flip":"0.1b"`), `"show":null` snow; `feedcam` is the corner camera as an actor. **Shows**
  at the top level of any act: `"shows":{"news":{"set":"show_news","pos":..,"rot":..,"fov":40,"channel":4,"lights":{"key":{...}}}}`
  (`"cam":"<actor>"`); a show's camera is `showcam_<name>`.
- **Broadcast graphics:** `{"gfx":"lower","title":"..","sub":"..","color":"#c01020","for":"4b"}`, `ticker` (`text label speed`), `bug`,
  `phone`, `channel`, `image` (`path pos size`); `"on":"feed"` draws it on the room TV. One of each kind per canvas at a time. The graphics
  plane follows the lens (`MVGfx.FitCanvases`: 0.08 / tan(fov/2), never under 0.12 m), so anything nearer the lens covers the graphics as
  on a real lens; at a fixed 0.12 m TMP text vanished over about 50 mm. `call gfxprobe`.
- **Channel flip:** `{"flip":"CH 7","for":"0.5b","hold":"2b"}` snow over the frame, `"on":"tv1"` only that TV; a full-frame `flip` on a
  `tv` cue is a trap. Key `snow` also in `grade`/`pulse`.
- **Door:** `"portal":{"offset":[40,0,6]}` on a prim quad: a second camera draws through it with real parallax (`turn`, `res`, `gain`,
  `shadows`); the quad's +z points the way you look; give it `from`/`until`. Doors don't recurse.
- **Text** and captions: [styles-formats.md](styles-formats.md). **Inserts:** `{"insert":"folder","for":..,"fps":16,"push":0.1,
  "loop":1}` frames in `Assets/MusicVideo/Inserts/<folder>/`.
- **Sounds:** `{"sfx":"tv_click","volume":0.8}`, or `"sfx"` on any cue (fires with every repeat and onset), `"sfxAt":"+0.5b"`,
  `"sfxVolume"`; a list picks a variant by time. A bare name is from `Assets/MusicVideo/Sfx/`. Library: `tv_click remote_thunk
  tv_power_thump channel_flip static_burst camera_servo frame_tick glass_ring glass_stretch couch_slam wood_scrape impact_big
  turkey_gobble_1/2/3 turkey_flock feather_whoosh`; `py Director/tools/sfx_make.py`. The finished mix: [sound.md](sound.md).

## The character

Fully real-time 3D; no AI video on screen (AI for textures and body motion data only; the rejected AI shots are in `Director/acts_ai` and
`Director/ai_footage`, never bring them back). He is a real rigged character: about 220k tris, 1.8 m, 53 bones with fingers and
`LeftEye`/`RightEye`, shape keys `jawOpen blink eyesWide smile fear` plus the acting shapes. Since 2026-11-07: low dark canvas sneakers,
hands with knuckles, tendons and a soft wrist (`tools/person_hands.py`), skin pores, hair sheen (`Person_Head_Gloss_hair.png`).
`bash Director/tools/person.sh` rebuilds him (`--no-blender` installs from `Director/gen/rigged/`); backups in
`Director/gen/rigged/backup-2026-11-0[78]/`. Her (`Person2/`): the same 53 bones and shape keys, the coat, glasses on `doctor.head`
(`pos [0,0.089,0.141]`, lens smoothness 0, `withHost`), badge and stethoscope on the coat. Turkeys `call importturkeys` (aliases
`turkey_<brown|black|white>`, `_hero`), props `call importprops` (`tv`, `tv_light`, `tv_stand`, `camera`). `call bones '{"t":70}'` gives
where his body is at a moment.
