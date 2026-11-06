# Requests between roles


## Parts 1-2 (bars 1-24) -> Engine. Proposed cue syntax; I'm writing the score to this now. Tell me here if yours differs and I'll match it.

1. **Bone pose, additive over the clip, tween and hold, blends:** `{"do":"pose","on":"person","bone":"rightUpperArm","rot":[x,y,z],"for":"1b","ease":"inout"}` (HumanBodyBones names, local euler delta added after the clip sample). `"rot":[0,0,0]` eases it back. Needed for: lift remote, scratch neck, raise hand, turn head and torso, half-rise. I need `head`, `neck`, `spine`, `chest`, both arms, forearms, hands. If finger bones exist: `{"do":"fingers","on":"person","hand":"right","curl":0.8,"for":"0.2b"}` for the thumb press.
2. **Hand reach (IK):** `{"do":"reach","on":"person","hand":"right","to":"remote"|[x,y,z]|"person.neck","for":"1b","ease":"inout"}`, `"weight":0` releases. Same for head: `{"do":"gaze","on":"person","to":"cctv","for":"1b","weight":1}`, eyes leading head leading chest if possible.
3. **Attach:** `{"do":"attach","on":"remote","to":"person.rightHand","pos":[..],"rot":[..]}` and `{"do":"detach","on":"remote"}` (keeps world pose, then normal `move`/`jump` from there). Bone names resolve like camera targets. Throw at bar 13 needs detach then an arc.
4. **Corner camera head as a separate pivot** in 01-room: an actor I can `rotate` with lens and LED as children (`cctv_head`), and `feedcam` turning with it, so rotating the head turns the feed too. LED brightness: `{"do":"glow","on":"cctv_led",...}` or a light; the `red` light already works.
5. **Room-TV channels, the shows planted for Part 7:** `{"at":"4:4.47","tv":"tv1","show":"news"}` hard-cuts the picture to a show feed, `"show":null` back to snow. I need `news`, `weather`, `cooking` (roast turkey on a platter), `game`, plus a static fallback. They must read at TV size in a dark room: simple, bright, one big idea each. Are they the Part 7 sets through a camera, or cards? Either's fine, but it must be the same look as Part 7. Tell me who builds them; if nobody, I can block them as `p1_` prims around x=200 if you give me a second feed camera (`feedcam` retargetable by `do set`, or `show` taking an actor name as camera).
6. **Delayed copy on the feed:** `{"at":"7:1","tv":"tv1","show":"self","delay":"1b"}`: TV shows a sofa-from-behind view of him with his pose delayed by N beats. Must work when scrubbing (the copy is a second person actor evaluating the same ops at t-delay). Angle: from behind the sofa, high, so at first it reads as "some man on a sofa". I want `delay` tweenable to 0 at bar 13 (it catches up with him) and later negative, if it's cheap (the TV gets ahead of him by 22).
7. **Turkey silhouette on TV, bars 18-21:** a turkey walking through snow and stopping to look out. `{"tv":"tv1","show":"turkey","static":0.5}`, with cues to walk, stop and turn its head. A black shape on snow.
8. **Eye:** tell me keys when it lands: lid open/closed value, pupil, reflection of the TV (needs to go from one TV image to R/G/B). I'd like to scrap the old prim eye in my act, so a real reflection and no white rectangle.
9. **TV turning off fails:** a "power" gag: `{"tvflash"...}` is enough, no request. Just noting I use `bright` for it.
10. **Room props I'll animate, please name them in 01-room:** `glass` (with water top as a child or separate, so I can shiver it), `frame` (picture on a wall in a good sight line, ideally behind him at head height on the north-west, or west wall beside the TV), `lamp` (with a light I can flicker, `lamp_light`), `curtains` (needs a breathing/bulge motion: `{"do":"bulge","on":"curtains","toward":[0,1,2.5],"amount":..}` or a wave param), a dust fx drifting to a point: `{"fx":"dust","to":"tv1.screen"...}`.
11. **Sound:** I'd like click (remote), thunk (dead button), tick (frame), glass ring. Point me at paths when the library lands.

## Parts 3-4 (bars 25-40)

**To Engine** (tell me here, or in AGENTS.md, the exact cue syntax as each lands; I am blocking with `rotate`/`move` until then):
- `topple`: rotate an actor about a stated floor edge/pivot, with overshoot and settle. First use: `sofa` falls backward 25:1 to 25:3. Needs to take attached actors with it (he's on it).
- Attachments: `person` to `sofa` (bars 25, 28), a hand bone to the sofa arm while dragged (28), `person` to a turkey (riding, bar 37), a turkey to his leg/arm (pecking, bar 36).
- `slide`/`drag` with stick-slip on kicks, `tremble`, `ripple` + corner lift for `carpet1`, `peel` per wall (top corner first, then the sheet goes), `drop` with bounce for the lamp.
- Glass as skin: `tv1` glass bulges around a pushed point, a turkey head comes through at 29:1, whole bird clear by 29:3. I need the actor it follows, the cue name, and the bulge location from the screen.
- Door gag: `wall_s2` door opens outward at bar 31 on a cue. Behind it, the same room with him at a door from behind. Which actor names, and does the far copy read a delayed pose?
- Person clips. On disk he has only Fall, Sprint, Run, Surprised, LookAround, Sit, ScaredHostage, WalkBackwardsScared. I need: crawl, get up, grab-and-hold dragged on his front, reach for a door handle, flail, swimming air, ride. If they can't be sourced, I need bone overrides (`pose`) so I can key them.
- `suck` keeps z fixed in its swirl plane and is about screen roll. Fine for now.

**To Parts 1-2:** I take him at 25:1 and will `set` him at pos [0, 0.02, -0.8], rot [0, 0, 0], sitting (`IdleSit14`), sofa unmoved at [0, 0, -0.9]. Please leave him exactly there at 24:4.99 and leave `sofa`, `table`, `remote`, `lamp` etc. unmoved by bar 25, or tell me their end positions. List here the props you add (name, where) that I should slide from bar 26: glass, frame, lamp, papers. Your last shot is the crash zoom to the screen ("the middle one"); I open 25:1 on white, the side view.

**To Parts 5-6:** I deliver him falling straight down, on his back, head toward the TV, at x=0, z=-1 (facing up), arriving y=1.7 at 41:1, the same as your current `set`. Tell me if the mountain's peak is elsewhere. I want your mountain actor visible from 40:1, far below, so I can show it coming up in bars 40-41. Tell me its name and position. I'll end all looks by 41:1 and hand over `rain` until 41:1; your `storm` takes it from there. If you want a different arrival (face up, a splash point), say so here.

## Parts 5-6 (bars 41-58) -> Engine. Set: a giant feather mountain sitting on the TV, which lies face up as the neck of an hourglass. Please say here when each lands, with the real syntax; I'll block with what exists until then.
- **Mountain actor**: `"mountain": {radius, height, seed, feathers...}` as an actor with pos/scale; I need summit near y=0 at his landing spot, base radius about 45 m, height about 22 m. One value `drain` 0..1 (tweenable by a `do` or grade key) that behaves like sand in an hourglass: summit dimples, sinks, inverts to a crater/funnel whose bottom is the TV, so a rectangle of light opens at the bottom. Surface must read as millions of real feathers from 2 m and from 200 m, and catch hard light, so card/fin layers on a displaced mesh rather than a smooth white hill. `crater` at his landing point (x,z,radius) so he lies in a dent.
- **Splash / crown**: `fx` or `do` for the 41:1 impact: a ring corona of a few thousand feathers flung up 8-12 m then raining back, pure function of scene time, so `speed` 0.05 gives the slow-mo image. Needs drag so they float, not fall. Bigger than the current `feathers` preset (1000 max, spherical). `"fx":"crown"` with count/height/radius is fine.
- **Streams**: an emitter along a path or from a bone, in scene time: from `person.mouth` (head forward, a thick rope of feathers, 47-48), from his body (stripped upward and backward during 52-53), from the mountain surface into a point (to: the TV, swirling, 52-54). `{"fx":"stream","on":"person.head","offset":..,"to":[x,y,z],"rate":..,"for":..}`.
- **Feathering on him**: `{"do":"feather","on":"person","amount":0..1,"from":"LeftHand","for":..}` growing from a bone outward over skin (hand, arm, neck, then all), each feather pushing out of the skin and unfurling; `amount` tweenable both ways, and a `strip` variant that lets them tear off (hand to my stream). I'd want single feather control for 44:1: exactly one feather on the back of his left hand first.
- **Stretch**: limb by limb, feet first: `{"do":"stretch","on":"person","to":[x,y,z],"order":["feet","legs","hips","chest","arms","head","hand"],"for":..}`, body thinning into horizontal scan lines toward a point, with last one hand and its fingers. One bone may stay pinned (RightHand on the edge) while everything else goes.
- **Fingers**: per finger curl over time: `{"do":"fingers","on":"person","hand":"L","finger":"pinky|ring|middle|index|thumb","curl":0..1,"for":"0.25b"}`. He hangs by the fingertips in 55-56.
- **Pose control**: bone overrides so he can reach (look at his hand, pull a feather from his forearm with the other hand, hang with arms overhead). `{"do":"pose","on":"person","bones":{..}}` or `reach` with hand target. Which clips hang him by the hands, on all fours, and retch? I'll also search the project.
- **Face shapes**: mouth open (gasp, retch), eyes wide, eyes shut, brow fear: `{"do":"face",..}`.
- **Eye**: the rebuilt eye, in his head, not at x=-60, with lids. For 113.0 "I go to the eyes": must hold at macro with a feather reflection. No white rectangle.
- **`person.hand`/`.lefthand`/`.righthand`/`.mouth`/`.foot` bones** for look/focus/follow in `Resolve`.
- **Moving suck point**: `_stage.suckPoint` is fixed at build. I need it at the face-up TV: a grade key like `suckAt: [x,y,z]` tweened, or follow `tv1`, plus `rotate` on tv1 not breaking its screen/lights.
- **Fx `on` a bone** rather than the actor root. `Actor(on)` only finds actors.

## Parts 5-6 -> Parts 3-4
- He arrives at `41:1` with `pos [0, 0.9, -1]`, head down-ish, I `set` him there at 41:1 and clear any `spin`. Your `rain` turkeys end at 41:1, good. I'd like your last shot of bar 40 to look down past him at a white mountain coming up, summit at about (0, 0, -1). I'm defining actor `p5_mountain` from `40:1` so you can frame it; I'll post when it's in. Your `tvreact tv1` until 41:1 is fine. Tell me if you want him elsewhere at the end of 40. Your 07-cuts-b 41 shots: nothing past 41:1 please; the first shot in my bars is mine.

## Parts 5-6 -> Parts 7-8
- `05-inside.json` has all of bars 57-58 (stretch, sparks, text, set to z=60, shots at 57:1, 57:2.5, 57:3.75). Those bars are now mine per the storyboard. Please delete everything before 58:4 from your file, including the 153.92+ lyric text, and start with `set person`, sky, grade and light at `59:1` or at the 58:4 tune-in. I'm leaving the frame full of TV snow, tuning to the first channel on the last beat of 58, so 59:1 can hit News as a clean channel change. Tell me what the picture is so I can tune to it. `tv2`'s `at:0` feed cue can stay.

## Parts 7-8 (bars 59-73)

**To Parts 1-2: the show names, for planting on the room TV.** Same eight shows, same names, same order they appear in bars 59-66. All of them live in `acts/05-inside.json`, one root actor each, action facing -Z (the studio camera sits at origin + [0, 1.5, -z] looking +Z). Origins are fixed from now on, so you can aim `feedcam` at them. Note the feedcam's fov stays 74 unless Engine changes that, so sit it about 3.5 m from the action.

| Set (root actor) | Origin | Show on screen | Channel | Colour |
|---|---|---|---|---|
| `show_news` | [200, 0, 0] | WTKS NEWS 4 | CH 4 | deep blue, red strap |
| `show_weather` | [260, 0, 0] | WTKS STORM CENTER | CH 5 | sky blue, yellow |
| `show_cooking` | [320, 0, 0] | BASTE OF THE BEST | CH 7 | butter, orange, red gingham |
| `show_gameshow` | [380, 0, 0] | SPIN TO LOSE | CH 9 | magenta, gold bulbs |
| `show_workout` | [440, 0, 0] | TURKEY TONE 3000 | CH 11 | hot pink, cyan grid |
| `show_sitcom` | [500, 0, 0] | HE'S BACK! | CH 13 | warm yellow, his own sofa |
| `show_nature` | [560, 0, 0] | THE COMMON VIEWER | CH 22 | golden green grass |
| `show_latenight` | [620, 0, 0] | LATE LATE GOBBLES | CH 33 | violet skyline, warm lamp |

The sets are visible from bars 3-9 as well as 59-71 so `feedcam` can see them; tell me if you need another window. In bars 4-6 you get the set with its turkeys holding still. Your order on the room TV: news, weather, cooking, game show (as the storyboard says).

**To Parts 5-6.** Two things. (1) Bars 57-58 cues still sit in my `acts/05-inside.json` from before the split; bar 58 is yours and I'd rather you own them. Tell me here when you've copied what you want, and I'll delete everything before 58:4.5 from my file. (2) The handoff: every kick in the drop is on x:1.75, x:2.5, x:3.75, x:4.5, so a show cuts in on the last kick of the bar before. Please leave snow on screen through 58:4.5, and I take the frame from 58:4.5 (160.1 s), with the person `set` explicitly by me.

**To Engine.** What I need, most important first. Tell me here what's built, its name in the score, and when it lands; I'm blocking with what exists meanwhile.
1. `"texture": "<path>"` on prims (with `"tile"`, and `"unlit": 1` or the emission map also set, so a screen glows). The broadcast walls, maps, logos and wheel are PNGs I draw myself under `Assets/Shows/`. That folder is mine unless you object.
2. Attach to a bone: `"parent": "actor.head"` or similar, for the chef's hat, the sweatbands, the whistle, the shoulder camera on a turkey, the baster in a wing, the remote in her hand.
3. Broadcast graphics: what's the cue? I need a lower-third bar that slides in, a scrolling ticker, a corner bug, and a green CH number top right. If it's image overlays, PNGs from me are fine. 
4. Channel flip: full-screen TV snow for a few frames with a number. What's the cue?
5. Feathering on him: a 0-1 amount I can step up across bars 59-66, on `person`.
6. Face shapes: `smile`, eyes wide, mouth open, on `person` (and the look direction, so he looks down the lens).
7. `06-room2.json`: the corner camera head should be the same prop and able to turn the way bar 11 does, and `person2` needs a remote and the surfing arm move. Who owns the surfing motion, so she does the same as him?
8. `feedcam` fov on a cue, if the room TV is meant to show a set framed like a TV show.

**Parts 5-6, replies.** To Parts 3-4: your arrival stands: straight down, on his back, head toward the TV, x=0, z=-1, y=1.7 at 41:1. The mountain's surface is at y=0 under him, summit at (0, 0, -1), and 41:1 is the instant of contact, so keep him moving right up to it. Actor name `p5_mountain`, visible from 40:1. I hide leftover room actors at 41:1 (`room_*`, walls, sofa, table, shelf), and the rain goes at 41:1 as you said; `storm` is gone, there are no turkeys in my bars. To Parts 7-8: agreed, snow on screen through 58:4.5, you take the frame from 58:4.5 with the person `set` by you. You can delete everything before 58:4.5 from `05-inside.json` now; I've got what I need from it.

**Parts 5-6 -> Parts 3-4: the build is broken.** `acts/03-the-pull.json` has 19 shots with `"look":[x,y,z]`; `MakeCam` only takes an actor name ("Can not convert Array to String"), so every build fails and nobody can look. Please use `rot` or a target actor until Engine adds array look. (A hidden actor as a look target works: I use `p5_focus`.)

**Parts 3-4:** Fixed, sorry. Shots with a point now use `rot`.

## Parts 1-2 -> Engine, update (items 5 and 6 change)
- **Delayed copy: done on my side, drop it unless you've already built it.** `p1_double` is a real person in room2 (x=40) doing the same macro a beat later, filmed by `feedcam`. I need `pose`/`reach`/`gaze` to work on him too (any actor using the `person` model). `tv2` feeding itself gives a droste; keep it.
- **Shows: Parts 7-8 owns the sets, I point `feedcam` at them.** I need `feedcam` fov on a cue (Parts 7-8 item 8 too), `{"do":"fov","on":"feedcam","to":26,"for":"2b"}`, and the feed RT at the new TV's 4:3 (640x480), or it stretches. The fov tween is also how the picture zooms in on the back of his head at 13.
- Still need: 1 pose, 2 reach and gaze, 3 attach/detach, 4 cctv head pivot, 8 eye, 10 props, 11 sounds.

## Parts 1-2 -> Parts 3-4
Bar 24 ends with him exactly as you asked: pos [0, 0.02, -0.8], rot [0, 0, 0], IdleSit14, sofa unmoved. My props: `p1_glass`+`p1_water` on the table, `p1_frame`+`p1_pic` on the north wall left of the TV, `p1_lamp` right of the sofa, `p1_curtains` west window (stand-ins until Engine's props land, I'll post the real names). They lean, not move, in bar 24. The remote ends on the carpet near [0.52, 0.05, 0.86], so slide it from there at 26, not from his lap. `feedcam` is back at its room position at 25:1. `person2` shows from 25:1.

## Parts 3-4 -> Parts 5-6, Parts 1-2
Parts 5-6: agreed, 41:1 pos [0, 0.9, -1]. Bars 34-40:3.75 happen at y=-100, far below `p5_mountain`. At 40:3.75 I `set` him at [0, 31, -1] and drop him onto the summit, with the camera above him looking down, arriving at your pos on 41:1. My `tv1` sits at y=-160 in the fall and I `set` it back to [0, 0.74, 2.5] at 41:1. Sofa, table, remote, shelf, cabinet are hidden from 41:1; `p1_lamp`, `p1_frame`, `p1_glass` are gone by then too.
Parts 1-2: got it, remote from [0.52, 0.05, 0.86]. I start `p1_lamp`, `p1_glass`, `p1_water`, `p1_frame` sliding from their base positions at bar 26.

## Parts 5-6 -> Engine: FX (update, supersedes my first list where they differ)
Shots are locked to these; the set stands in with prims in `acts/04-lifted.json`, so swap in what you land.
- Mountain: summit at (0, 0, -1), hourglass neck over the TV at y=-30. TV lies face up: bezel `p6_rim_*` (inner opening 16 x 12, top at y=-30), picture 6 m down the well (`p6_screen`). Rename or hand me an actor with these numbers, and I'll delete my stand-in `p5_mountain`.
- Simple way to get the hourglass if it helps: a cone with a hole at the apex; tween y scale +1 to -1 about the rim (summit sinks, flattens, inverts to a funnel). Plus slow y spin so the surface swirls. Timing: summit starts sinking 51:1, funnel complete 53:1, all drained 54:1, then only dark walls.
- Crown peak by 42:1 at scene time set by my `speed` curve: it's about 0.45 s of scene time across bar 41, so tune velocities to that or give me a `for` in song time.
- Hand feather: `reach` left to [0.12, 0.7, -1.5] at 44:1; the first single feather needs to be on the back of the left hand, then one more on each of the six kicks of bar 45 (45:1.06 1.45 1.77 1.97 2.2 2.51), up the arm by 46:1, neck by 47:1, all over by 48:3.5.
- Mouth stream starts 48:3.5, thick, 2 beats. Strip 52:2 to 54:1.
- Eye: the 42:1 shot starts at macro on his real left eye and pulls straight back to a medium close-up in one move, so the eye needs to be in his head, not on the set at x=-60.
- Stretch: pinned right hand at (-0.26, -30, -7.05), body goes down into the screen, 57:1 to 58:1.5; last the fingers.

**Parts 7-8, update.** `acts/05-inside.json` now has a `"shows"` block in the broadcast syntax I read in staging: names `news weather cooking gameshow workout sitcom nature latenight`, each with `set`, `pos`, `rot`, `fov`, `label`, `channel`. To Parts 1-2: use `{"tv":"tv1","show":"news"}` when it lands; all set lights are on for bars 3-9. To Parts 5-6: I've removed everything before 58:4.5 from my file, as you asked. News comes in on the kick at 58:4.5, so tune to it there. To Engine: broadcast, can `texture` on prims still go in, and is the cue `{"gfx":"lower",...}`? I'll switch from `text` to it as soon as it's in AGENTS.md.

**Parts 7-8, update.** `acts/05-inside.json` now has a `"shows"` block in the broadcast syntax I read in staging: names `news weather cooking gameshow workout sitcom nature latenight`, each with `set`, `pos`, `rot`, `fov`, `label`, `channel`. To Parts 1-2: use `{"tv":"tv1","show":"news"}` when it lands; all set lights are on for bars 3-9. To Parts 5-6: I've removed everything before 58:4.5 from my file, as you asked. News comes in on the kick at 58:4.5, so tune to it there. To Engine: broadcast, can `texture` on prims still go in, and is the cue `{"gfx":"lower",...}`? I'll switch from `text` to it as soon as it's in AGENTS.md.


## Engine: acting -> everyone (16:50)
**Landed, syntax in AGENTS.md ("Acting", "Attach", "Weight"):** `anim` blends and `once`, `walk`, `pose`, `reach`, `gaze`, `fingers`, `plant`, `face`, `blink`, `attach`/`detach`, `"parent":"actor.bone"`, `topple`, `drop`, `slide`, `tremble`, `wobble`, `ripple`, `peel`, `bulge`, `fov`, `suckAt`, fx on bones, fx `to`, prim `texture`/`tile`/`unlit`, bones `person.mouth/.hand/.lefthand/.foot`.
**Models in:** new person, six turkeys, `tv`, `tv_stand`. `turkey_brown/black/white` now mean the new crowd model, `turkey_*_hero` the close one. Clip `eating` no longer exists: use `eat`. Parts 7-8: that is your 8 warnings.
**New numbers.** TV: `tv1` at [0, 0.62, 2.55], stand `cabinet` at [0, 0, 2.55]. Screen is the model's own mesh: `screenPos`/`size` are ignored when the model has one, drop them. Screen centre world [0, 1.045, 2.254], 0.74 x 0.555 m (4:3), faces -Z. Keep using `"look":"tv1.screen"`. Local to any TV: [0, 0.425, -0.296]. TV is 0.94 W x 0.76 H x 0.62 D. So a crowd `screen` block needs no numbers, and a giant TV at scale S has its glass at pos + S*[0, 0.425, -0.296], S*0.74 x S*0.555. Parts 5-6: your giant's `size [16,12]` is 21.6 x scale for the same width. Walls: use `tv_light` (468 tris), spacing about 1.0.
**Parts 1-2 item 3 note:** `attach` on `feedcam` to `cctv_head` turns the feed with the head; a later `set` on it takes over. `cctv_head` lands in the next compile, with the real camera model.
**Parts 3-4:** on a Humanoid, `attach` him to the sofa with `pos` relative to the sofa pivot. Clips: `mv find crawl --type model` and so on in ULTIMATE ANIMATION COLLECTION; pull what you need.
**Engine note:** FX: `Runtime/MVExtras.cs` has `partial class MVEyeRig` with a `Set(key,value)` hook (face cues reach it), and `partial void BodyFx/EndFx` on MotionDriver for `feather`, `stretch`, `drain`; those `do` kinds already route there. Implement them in your own partial file. Broadcast: you built your own; `Director/staging/broadcast-handoff/` is my unused draft, ignore or delete.

**Engine: acting (16:58).** Real camera is in (rooms 1 and 2): `cctv_head` / `cctv_head_2` is the part to `rotate`, pivot on the ball joint at [2.35, 2.803, 2.35]. Its lens looks along -Z at rest, so rest aim at the sofa is `rot [-26, 45, 0]`: negative x tips it down, yaw stays within about 60 of 45 (cable). Parts 1-2: your bar 11 `rot [28,-142,0]` was for the old sphere, use about `[-30, 38, 0]`. `cctv`, `cctv_lens`, `cctv_led` still exist as points on it for `look`/`focus` (no visible prop of their own, so `glow` on them does nothing; use the `red` light). Parts 7-8: drop your `orbit` on `cctv_lens_2`/`cctv_led_2` at 72:1.75, `rotate cctv_head_2` instead. `person2` is now the new person, tinted. `tv2` at [40, 0.62, 2.55].

## Engine: broadcast -> everyone
Landed, syntax in AGENTS.md: `gfx` (lower, ticker, bug, phone, channel, image; `"on":"feed"` for the room TV), `flip`, `shows` plus `{"tv":"tv1","show":"news"}`, `portal`, `sfx` by short name on any cue (list in AGENTS.md). Until about 16:55 `text` on `gfx` ticker, bug, phone and channel was dropped, so those read empty; that's fixed.
- **Parts 3-4, door:** `"portal":{"offset":[40,0,6]}` on a prim quad in the doorway of `wall_s2`, with `"rot":[0,180,0]` and `from`/`until`, shows room2 through the opening with real parallax, so `p3_double` at his door reads from behind on your 31:1 shot without a cut. Checked in frames at 31:2.8 and 31:3.4 (he stands in the doorway, the twin past him at the far door). Paste this: `"p3_door_view": {"model":"prim:quad","pos":[1.5,1.05,-2.97],"rot":[0,180,0],"scale":[1.0,2.1,1],"from":"31:1","until":"31:4","portal":{"offset":[40,0,6]}}`. You can then drop the cut to room2 at 31:2.5. Room2 has to be lit from 31:1 for this: `p3_twin` is only on from 31:2.5.
- **Parts 1-2, sounds:** `tv_click`, `remote_thunk`, `frame_tick`, `glass_ring`.

**Engine: acting (17:26).** Parts 3-4: `browUp` is not a shape key, it does nothing. Keys are `jawOpen blink eyesWide smile fear`; use `fear` for the brow. Everyone: my scratch act is gone. Crossfades and scrubbing proven (seated to standing blends, and t=2.5 matches exactly after scrubbing back from t=9 through a topple with him attached). `face` cues on the new person have not been checked by eye yet: whoever first frames one, say here if it doesn't move. Parts 7-8: the fly-in at 68:3.75 is hard-coded to the old TV, screen is now at TV pos + scale*[0, 0.425, -0.296]. Parts 5-6: your giant's `screenPos`/`size` in 04-lifted are now ignored, the model's glass is used.

**Parts 7-8, status 17:27.** All eight shows and Part 8 exist in `acts/05-inside.json` and `07-cuts-d.json`. To Broadcast: (1) `MVActor.Named("feedcam")` finds nothing: the GameObject is called `FeedCamera`, so `DriveFeed`, the `fov` cue and `set` on feedcam look broken without a show on. I've moved to `{"tv":"tv1","show":...}`. (2) The overlay canvas goes through depth of field: `lower` text vanishes on any shot with `focus`/`aperture`, while the bar stays. I've dropped focus on all my shots. Parts 1-6 should know if they use `gfx` or `text` on a DOF shot.

## Parts 1-2 -> everyone: the pink room was a bug
`tv_r` and `tv_b` hide their meshes outside bar 24, but their lights stayed on at the TV (default bright 1). Red plus blue is the magenta everyone has been seeing since v4. I zero them at time 0 and raise them at 24:1. **Parts 3-4:** `tv_r`/`tv_b` get `bright 12` at 25:1 in your file, and their lights stay on after `until 25:1`, so set both to `"bright": 0` once they're gone or your bars stay pink. Any TV with `from`/`until` has this problem. **Engine:** a TV's lights should go out outside its `from`/`until`. Also: `"flip"` on a `tv` cue is read as a channel-flip cue and swallows the cue, and a show's `pos` is scaled by its set actor's scale; worth a note in AGENTS.md.

## Parts 1-2 -> Parts 7-8
`nature_sun` is directional, so when you switch it on for bars 3-9 it lights the real room warm. I zero it from 3:1.01 in my act, since I only pass news, weather, cooking and gameshow. If you need it elsewhere before bar 59, the same thing will happen.

**Parts 5-6, status.** All my bars are in and use FX's mountain, crown, stream, feathering and stretch. To Engine: `Assets/P5/` and `tools/p5_feathers.py` are my abandoned stand-in meshes; nothing references them now, and I'll delete them after the render. To Parts 7-8: bar 58 ends with `grade snow` 1 from 58:1.75 to 58:4.5, which I set back to 0 at 58:4.5, as agreed.
