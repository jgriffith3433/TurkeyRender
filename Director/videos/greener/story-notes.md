# Greener: story notes

Story editor's pass, 2026-11-06. Watched `output/greener-v2.mp4` (sampled every 2 beats, stepped at the turn, chorus 1, the dip and the ending). Also read the newest `shots/` renders, because the cut has moved on since v2: `gift_pop`, `takes_it` and `darling` already improved. Times below are the current `cut.json`. Stuck arm ignored, as it is a known fault.

## The diagnosis

The world's arc reads: yard, pastel, peak, grey, pastel, TV. **His arc doesn't.** He has the same face and energy from 48 s to 105 s, then we never see his face in the dip, then chorus 2 looks like chorus 1. Three moments carry the story, and all three fail:

1. **He looks at the butler.** We get the back of his head.
2. **He chooses to go back.** There is no turn: he takes the blade, then we cut to the stairs.
3. **The click.** The TV goes bright white, and we are behind the sofa looking at his back.

Fix those three and the video has a story. The rest is support.

**Cut rate is about right.** 78 shots, average 4.6 beats, which is 2 s. The fault is where the cuts fall: the dip cuts every 2 beats, as fast as the chorus, in the one place that has to be still. Inserts in verse 2 also leave him off screen too long.

Owners are by file, since the agents weren't named to me: **cut agent** `cut.json`, **card agent** `cards/shots.yaml` and `sequences/`, **performance agent** `library/performances/`, `acts/00-cast.json`, **look agent** moods and fx.

## The changes, ranked

### 1. 109.4 s, `he_looks`: the butler payoff is the back of his head
**Wrong:** the camera sits behind his shoulder (frames 109.4-110.2). The whole video builds to this look and `face_act.mjs` already has the dip's face (smile 0, fear .09), but nobody sees it. He is also on the shot for 2 beats.
**Change:** shoot from the butler's eyes. He has looked down the lens for 100 s, so here the lens is the butler, and the same gaze suddenly means something else. Card (card agent):
```yaml
- id: he_looks
  idea: for the first time he looks straight at a butler. We are the butler
  sing: person
  cast: {person: {at: verge_side, perform: stand}}
  camera: {preset: spot, from: break_cam, on: person.head, lens: 55}
  shot: {pos: [501.2, 0.98, 2.6]}
```
Cut agent: `len` 2b to 4b (see the combined cut below). Check his eyes actually land; it is the most important close-up in the video.

### 2. 105.9-113.6 s: the dip is too short and too busy
**Wrong:** grey lasts 6 s (4% of the song, the brief asked for 15%), cuts every 2 beats, and starts after the first "It's not a big deal". LYRIC-MAP wants that line sung in the grey.
**Change (cut agent):** take 4 beats from verse 2 so grey starts on the vocal at 105.9, and slow it down. `grey_wide` 4b to 6b, `he_looks` 2b to 4b, `on_break` 2b, `holds_out` 2b, `takes_it` 4b. With change 3, grey runs 105.9-115.4, 9.4 s, more than half as long again.
**Card agent:** `grey_wide`: the bottom third of the frame is a black road and he is tiny. Use lens 32, and have him come out rather than stand: `cast: {person: {at: threshold, to: verge, clip: Walk4}}`. A plain man's walk, the first without the hips, is the "no skirt in his hands" beat.

### 3. 113.6 s, new `goes_back`: he never chooses
**Wrong:** this is the point of the video, "knowingly going back", and it isn't on screen.
**Change:** stay in the grey past the drop. The song comes back while he is still out there, so it feels like the song is calling and he answers. He turns his back on the street, takes up the skirt for the first time since the door, and glides to the door, hips first. Cut into the hall on bar 68. Replaces `stair_top`, same 4 beats.
```yaml
- id: goes_back
  idea: he turns his back on the street, takes up his skirt and glides to the door, by choice
  feel: he knows exactly what he is doing
  set: flats
  light: dip_overcast
  mood: drained
  cast: {butler_b: {at: crate_spot, clip: butler_idle}, person: {at: verge_back, to: threshold, perform: dress_walk, face: 0}}
  camera: {preset: spot, from: street_wide, on: door_aim, lens: 40}
```
Move `stair_top`'s two pink smoke cues onto `hook_3`, so the door he left by opens onto the top of the stairs. Run `mv cards check` on the walk's length.

### 4. 146-154.8 s: the ending doesn't land
**Wrong:** at the click we are behind the sofa, the TV turns blank white, not dark, because `tv_picture` just drops out of the cast. His head is a dark lump in front of it. We never see the brief's image: sofa, knees together, remote in hand. `pot` is framed so the grass is cut off and it reads as a black tub. The "tap at the window" can't fit in the 0.8 s left.
**Change:** put the camera where the TV is, so the last person he sings to is us, and **we are what he turns off**. The hook has ended on a point at the lens four times. The fifth is the remote.
- `darling`: `perform: dress_sit`, `camera: {preset: spot, from: tv_close, on: person.chest, lens: 32}`. Show the whole of him, knees together, `remote_hand` shown.
- `pot`: aim higher so the blades are in frame: `on: table_pot`, raise `head` to about 0.2, or tilt with `shot`.
- `better`: `camera: {preset: spot, from: tv_close, on: person.head, lens: 60}`, `perform: dress_sit`, `sing: person`, `show remote_hand`. Add `{at: 5b, do: perform, on: person, name: point_at_you, for: 1s}`, which is a right-arm mocap layer so it works seated, landing on the end of the shot.
- `click_off`: **same camera, same `dress_sit`, no visible cut, no bright screen.** `raw: [{at: 0, sfx: tv_click, volume: 0.9}, {at: 0, grade: {exposure: -3.5, saturation: -100}, for: 0.06s}, {at: 0, do: show, on: remote_hand}]`. He stays as a ghost in dark glass, arm out, which gives us the reflection in the last 0.8 s. Drop the sparrow tap.
- `acts/00-cast.json`, `remote_hand` (performance agent): parent it to `person.rightHand` and mirror the offset, so the point carries the remote.
- Setup for all this, `dark_tv` at 19.3 s: at present it's four black panes and reads as nothing. Stand the `tv` model in the window at `window_aim`, or drop the shot and let `weakness` run 2 beats longer. One TV seen early makes the ending "all over again".

### 5. 111.1 s, `holds_out`: the offer can't be seen
**Wrong:** the blade is a couple of grey pixels and `holds_out` looks the same as `on_break` (frames 110.4-111.4). It is the reason he goes back, and the audience gets it only afterwards. The butler also has no sign of being on a break.
**Change (card agent):** he is a butler, so he offers it **on the silver tray**, the one from the cloche gag. That makes him the dealer, which is the whole joke unsaid.
- `on_break`: add `tray: {at: break_blade}` leaning at the crate, so he's off duty.
- `holds_out`: `cast` adds the tray under `blade_free`; `camera: {preset: spot, from: break_cam, on: break_blade, lens: 85}`. Tint and glow the blade so it's the only near-colour in the grey: `{at: 0, do: tint, on: blade_free, color: "#7dff3a"}`, `{at: 0, do: glow, on: blade_free}`. `drained` will take some of that back, so check the frame.
- `takes_it`: keep the new two-shot, it works. Keep the warm lift on the last beats (seen at 113.4 in v2): colour comes back to him as he holds the blade.

### 6. 121-136 s: chorus 2 looks the same as chorus 1
**Wrong:** frames at 55 s and 122 s are interchangeable. `hollow` is saturation -6, which nobody can see, so "hollow joy" doesn't read. Going back has to cost something.
**Change, cheap:**
- Look agent: `hollow` to about saturation -22, contrast 10, bloom .15, exposure -.03. Only Greener uses it. Pink should look slightly stale.
- Card agent, `sequences/chorus2.json` cast: add `butler_a: {at: rank_solo, clip: butler_idle}`. In the middle of the hopping ranks, over his shoulder, **one butler stands stock still and watches him.** The dip butler came back too. It needs no new models, and it pays in every wide.
- He keeps the blade in hand throughout, as he does now.

### 7. 3.9 s, `hem`: there's no clear first gag
**Wrong:** the first joke is the invisible dress and it doesn't read. Knees are apart (`yard_wide`, 0.9-3.4 s), and the hem smooth is a small move in a wide frame (frames 3.9-6.9). The first thing that reads as funny is the sparrow at 16 s, so for 16 s he's a man in a chair.
**Change:** make it the first laugh.
- Performance agent: `dress_sit`: actually close the knees, feet together. It's the base of the gag and is also needed in change 4.
- Card agent: `camera: {preset: medium, on: person.hips, frame: 0.8}`, framed tight on lap and hands, face out of shot. `hem_smooth` twice: `on: 1b`, `on: 5b`. Then `funny`, his face, gets the laugh: he knows we saw.
- `curtsy`, 32.2 s: it reads as a crouch from far away. `frame` 2.6 to 1.8, cast square to the lens: he curtsies to us, not the fence.

### 8. 88-106 s: he never goes hollow before the door
**Wrong:** he dances on the table right up to it, so nothing leads to the dip. Verse 2 has too many gags, in a row, away from him, and the `bed` shot is broken (latest render: camera inside the bed, a brown frame). `champagne` is a blue glass with no visible grass.
**Change (cut agent):** the dancing stops.
- `bed` out, `dv_wide_2` in its slot, 4b, `seq: din`. Then he's on screen for "get some sleep".
- Replace `dv_wide_2` and `champagne` at 99.1 s with `din_wide`, 4b, no `seq`. On "But nobody's", for the first time since 48 s, **he's still**: sitting alone at the far end of the longest table. The card is already written.
- Remove `dv_cu_4`. `clever`, `vase_slides`, `push` run straight on, so the wall goes wrong and he goes to it. The vase now lands on "they think"; that's fine.

### 9. 45-48.5 s: delight is missing, and the turn hits early
**Wrong:** arc says bored to delighted, but through the turn we see his back. The cut to the hall lands at 47.6 s, 2 beats before the drop, so the drop lands in the middle of a shot. `taste` and `sparrow_pastel` also cut on an odd beat.
**Change:**
- New card `delight`, 2b, after `fence_two`: `cast: {lawn_chair: {at: chair}, person: {at: chair, perform: dress_sit}}`, `camera: {preset: close-up, on: person, frame: 0.62}`, `mood: yard_face`, `events: [{on: 0b, who: person, do: face, smile: 0.6, eyesWide: 0.5, for: 1b, ease: out}]`. There are no vocals here (46.2-47.8), so face_act won't fight it. It's the first full smile of the video, and the last.
- Cut agent: `ch_wide` 6b to 4b, so it lands on bar 29 on "gateway" (48.44 s). Everything after it stays put. `taste` 5b to 4b, `sparrow_pastel` 5b to 6b.
- Card agent: `taste` move `hide` to 3.8b; `sparrow_pastel` move the tint and scale cues 2 beats later, so the colour lands on "says".
- Leave `burst` out. `gift_pop` now shows the estate well, and it's a clear gag at the right time.

### 10. Three smaller beats that make the arc pay
- **Setting up the look, 73.3 s, `side_eye`.** J's joke needs a rule before it's broken, and one 2-beat shot doesn't set one. Card agent: put `butler_a` close over his shoulder, sharp, staring at him. His eyes stay on the lens, flick most of the way toward the butler (`{do: eyes, yaw: 14, for: 0.07s}`), and snap back before they arrive. Second near miss at 51.9 s: 4b of `ch_med` becomes `tray_new` with `butler_a` holding the tray at his elbow, and he doesn't look.
- **135.9 s, `alone_fog`.** No fog, and two near-identical medium shots in a row, 16 beats in all. Make the first a wide: `{preset: spot, from: hall_wide, on: person.chest, lens: 28}`, smoke at `[396, 0, 6]` and `[404, 0, 6]`. The butlers are already gone, so a tiny man in an empty hall is "everything stops". Fog is promised in the brief and is free.
- **139.4 s, `hand_opens`.** The last story beat before the ribbon, and the hand is too small to see it open. `camera: {preset: spot, from: cam_cu, on: person.rightHand, lens: 70}`, face soft behind. Word timing is right: `let` 141.7, open at 5.4b.

## Combined cut

Total length unchanged. Everything else stays.

| Time | Was | Becomes |
|---|---|---|
| 38.2 | `taste` 5b, `sparrow_pastel` 5b | `taste` 4b, `sparrow_pastel` 6b |
| 46.8 | `fence_two` 2b, `ch_wide` 6b | `fence_two` 2b, `delight` 2b, `ch_wide` 4b |
| 83.6 | `bed` 4b | `dv_wide_2` 4b, `seq: din` |
| 99.1 | `dv_wide_2` 2b, `champagne` 2b | `din_wide` 4b |
| 100.8 | `clever` 4b, `dv_cu_4` 4b, `vase_slides` 4b, `push` 4b | `clever` 4b, `vase_slides` 4b, `push` 4b |
| 105.9 | `grey_wide` starts 107.6 | `grey_wide` 6b, `he_looks` 4b, `on_break` 2b, `holds_out` 2b, `takes_it` 4b |
| 113.6 | `stair_top` 4b | `goes_back` 4b |

`dv_cu_4`, `bed`, `champagne` and `stair_top` stay in the cards, unused. Change 10's `tray_new` split of `ch_med` is optional and adds no length.

## Left alone, on purpose

- `gift_pop`, `balloon_butler`, charts, `clever` and `vase_slides`: they read, and they're on their words.
- `rise` and `ribbon_far`: the pull back reads as a gift, and it's the best reveal in the video.
- The dance and the look to the lens. They are what makes the dip mean something.
- Grass is never named. The tray and the blade say it.

Not verified: the card edits are unbuilt, so `he_looks`'s camera height, the `goes_back` walk speed and the tint through `drained` all need a frame check.
