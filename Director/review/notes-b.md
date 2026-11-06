# Review B: TK Shock v9, 90.0 to 129.75 s (sheets s_090 to s_125)

Method: all 8 sheets read, plus a 10 fps strip of 116-127.5, an 8 fps strip of 127.3-130, and full-size frames for hands and contact. Times are seconds. Causes come from reading the cues in `acts/`, not from a test in Unity. Where I'm guessing, it says "likely".

## The flagged section in one paragraph (117-122)

It feels wrong because for about 5 seconds nothing is driving him. From 117.1 to 118.9 the whole actor is lifted by `move` and `rotate` while the legs loop a kneel clip, so he rises like a lift instead of climbing out. From 118.6 to 119.3 three unrelated things land on the upper body: `IdleLookAroundHostage`, then `IdleSit13CheckTime` (a seated clip), plus two gazes and a head pose. From 119.1 to 121.8, the moment he should find the feather on his hand, his head does a slow lap: straight up at the sky, over onto his shoulder facing away from the hand, then back up. The hand sits at his hip at the bottom edge of the frame. Faults A1 to A3 below cover this.

## A: breaks the shot

**A1. 119.1-121.8: he never looks at his hand, and we never see the feather.** This is the story beat of bars 43-46.
- 119.3-119.9: head thrown straight back, staring up (frame 119.75).
- 120.0-120.6: head rolled onto the screen-left shoulder, facing away from the hand (frame 120.25). The neck reads as limp or broken.
- 120.7-121.8: back up, then down again, with no reason.
- The forearm only comes up to hip height, so `CheckTime` reads as a hand on the hip. The hand is cut by the letterbox at 119.75 and 120.25, and the other arm hangs dead. No feather is visible on it. The first one I can see is at 124.5, dark and tiny.
- Focus is on `p5_focus`, not the hand. No visible expression change: mouth shut, eyes on nothing.
- **Smallest fix:** drop the `IdleSit13CheckTime` layer. Key one pose from 119.2: the feathered hand rises to chest or chin height in frame, palm turned to him, and holds about 1.5 s with a small tremble. Gaze at that hand with the eyes wide, and hold. Set `p5_focus` to the hand. Likely part of the head lap is `overlap` springing slowly under the 0.2-0.4 time scale, so set `"head":0` on overlap from 118.9 to 122 and see what's left.

**A2. 117.1-118.9: hauling out has no weight.** The rise is four `move`/`rotate` lurches on the actor (`42:2+4.2b` onward).
- The kneeling legs come up out of the feathers with nothing pushing: no foot drive, hips don't lead.
- The hands do no work. At 118.25 one dangles beside his thigh and the other hangs over the pit. At 118.75 one rests on his knee with no load.
- The feathers don't respond after the last puff at about 117.
- **Smallest fix:** keep the moves but give them a cause. Before the 117.9 lurch, tip the chest forward and plant one hand on the surface (`reach` then `plant`), push, and put a small feather puff at the hand. On the final rise, plant the other hand on the raised thigh and press, chest over the knee, with the hips leading by 0.1 s. Add a short hold at the top so he arrives before the cut.

**A3. 118.55-119.4: the head and arms twitch through the join into the next shot.** `IdleLookAroundHostage` (118.6), `gaze` (118.55), head and neck `pose` (118.9), `CheckTime` (118.95) and a second `gaze` (119.15) all land inside 0.6 s, across the 119.1 cut. On screen he glances, nods, is cut to rolled sideways, then flings his head up by 119.4.
- **Smallest fix:** delete the Hostage layer and the 118.55 gaze. One move only: head down and breathing to the cut at 119.1, then the look to the hand from A1.

**A4. 122.5: the tie bird pops into a continuous shot.** No bird at 122.5, full bird at 122.6, mid-dolly. Cause: `{"at":"45:2","do":"set","on":"p5_tiebird",...}`.
- **Smallest fix:** move that `set` to `44:1` (the 119.1 cut), so the dolly carries it into frame. Check it isn't in frame too early at the start of the shot.

**A5. 122.0-126.8: panic is arm-waving and the story beat is missing.** "He tries pulling them out" never happens: no hand touches an arm. Instead, mocap fragments change every 1 to 1.5 beats (`Idle1Yell`, `mx_injured_stumble`, `mx_stumble_backwards`, `Idle1SurprisedA`) on kneeling legs, so a stumble-backward with no stumble reads as flailing or dancing. Arms hit a wide Y at 122.5-123.5 and again at 126.0-126.5. The hands-to-face at 124.7-125.1 is the only legible idea.
- **Smallest fix:** replace the bar 46 layers from `46:2.2` on with one action. Right hand grabs left forearm (real `plant` on `person.leftLowerArm`), yanks twice on the beat, a feather tears free with a small fx, and more show. Eyes on the arm throughout. Keep bar 45 as the hand-to-face rise if needed, but cut the two Y poses.

**A6. 107.3-108.1: legs through the sofa.** One shin enters the seat from above and comes out below the front rail, foot under the sofa (frames at 107.5 and the 107.3-108.0 strip). The hips also sit inside the seat. Cause: the `ragdoll` at 107.274 has no `collide`, and it follows `pose: sit` with only `drive: 0.3`.
- **Smallest fix:** add `"collide":["sofa"]` to that ragdoll. Failing that, use `drive` 0.6 and lift the `attach` pos at 107.194 until the hips sit on the cushion, knees over the front edge.

**A7. 95.5-97.3: the tie bird sits inside his chest, and the pose is frozen.** At 96.25 the bird fills the space where his chest and shoulders should be, with his head sticking out below it. The hand-to-neck contact is fine at 95.3. From 96 to 97.3 the man-and-bird group just rotates, with no struggle or change of pose, so it reads as a stuck prop.
- **Smallest fix:** raise the attach offset at 96 (`pos` z 0.62 to about 0.85, then check). Add a keyed shove and recoil on the arm and head on each bite, 2-3 beats, so the group changes pose.

**A8. 111.0-112.75: the biggest hit of Part 5 has no contact.** At 111.25-112.0 he floats with hands behind his head, feet up, over an undisturbed surface. No dent or displaced feathers around him, and the dark cross-shaped shadows sit well away from him and don't meet him, so he reads as hovering above it. Then "the crown" (112.25-112.75) is a dark ring of feathers with no readable subject, only a small dark shape at the centre. This is meant to be the slow-mo image.
- **Smallest fix:** set the ragdoll's `floor` to the real surface height so he lands inside this shot, and bring the `fx crown` to him. In the crown shot, frame him as a clear silhouette in the ring, closer or with a rim light (`p5_bounce`).

**A9. 128.5-129.3: skin through the shirt.** A clean-edged skin-coloured hole opens above the collar (crop at 129.0, also 128.55, 128.9), bright against the shirt. Same family: B1.
- **Smallest fix:** ease `chest` and `spine` flexion on the `47:2.6` keys. If it stays, push the shirt weights or hide body skin under the shirt in `person.sh`.

## B: noticeable

**B1. 117.0-117.7: gap at the waist.** A bright white strip between shirt hem and jeans (crop at 117.25). Fix: less `hips` rotation in the `42:1` pose (-22), or the same body-under-shirt hide as A9.

**B2. 127.4-129.75: head hidden and bobbing.** The head is under the shoulders, between the arms, showing only hair for most of the shot, so the retch has no face to build on. It pops up and straight back down around 128.05 and again around 128.7, about 0.25 s each way, too quick to read as a heave. Fix: raise the camera-side head key so the face stays visible from three-quarters, and make each heave chest first, head last, slower down than up.

**B3. 127.4-130: the raised foot reads as a fist.** The lower leg sticks up behind him with the foot hanging in the air (frame 128). Comes from the `FeastZombieB@1.4` pose. Fix: `plant` both feet, or bend the knee so the shin lies on the slope.

**B4. 126-129.75: feather colour and shape.** Feathers on him are straw-coloured and stiff, like a grass skirt or thatch, against a blue-white mountain and white bird. They hang as cuffs on the forearms and a spiky ruff on the back. Fix: pass `color` and `color2` from the mountain (`#cfd6ea`, `#ffffff`) on the `feather` cues. Try a lower `lay` so they sit along the arm.

**B5. Tie, every appearance (100.0-101.5, 102.75, 122.6-127).** It's a rigid red block, not a "small red tie". At 100.5 it stands up above the bird and hides the head. At 126 it tilts off the neck like a stick of dynamite. Fix: thinner and shorter (about 0.05 x 0.16), hang it from the neck base with a small knot prim, and let it swing with `wobble`.

**B6. 100.0-101.75: twinned arms, held too long.** Back view, both arms up in a mirrored pose, almost unchanged for 1.75 s. He is doing nothing but holding the shelf. Fix: offset the hands in height, pull up on one, and let him slip on "somebody's".

**B7. 97.5-99.0: the grab doesn't read.** 97.5-97.75: torso fills the frame and the hands and the bird are off the top. 98.25-99.0: arms are twinned, with the back hinged at the waist like a plank. The hands look pressed on the bird's breast rather than gripping the tie, which sticks out to one side. Fix: frame hands and tie in the first shot, one hand wrapped round the tie, the other on the neck.

**B8. 102.5-102.75: the bite on "ME" hides the fingers.** The tie and beak cover the hand, so the bite doesn't read. Fix: rotate the bird or camera so the fingers are in clear, and add a finger flinch and a hand snatch after.

**B9. 94.6-95.25: locked arm to an off-screen target.** The arm is dead straight to the top edge, grabbing a bird we can't see yet. Fix: show the bird first, bend the elbow into the reach (`hint`), and add a `layer` before contact so `reach` is only the last few frames.

**B10. 94.25-94.5 and 99.25-99.75: foreground turkeys bury him.** At 94.25-94.5 a big foreground bird covers his lower half. At 99.25 the frame is all blur, and at 99.5-99.75 a blurred leg crosses him, with "I" and "ALWAYS" sitting on that mess. Fix: move those birds aside or cut 0.25 s later.

**B11. 103.25-105.75: riding with no ride.** He sits on the turkey like a chair: neither hand holds it, and the bird doesn't buck under him. Fix: one hand on the neck (`plant` to `.neck2`), `hop` or `pulse` the bird on the kick, and overlap on him so he's thrown by it.

## C: minor

- **C1. 127.2-127.35:** he drops out of frame just before the cut, leaving a couple of empty frames. Cut at about 127.15.
- **C2. 125.5-126.7:** a black knee lump rises at the bottom of frame with no read on what it is. Tilt up slightly or frame it out.
- **C3. 126.4-127.2:** blurred grey rectangles at the frame edges in empty sky, with no cause. I couldn't tell what they are. Remove them, or let them cross clearly.
- **C4. 120.7-121.1:** a big falling feather crosses his face and chest. Move that emitter, or use the moment deliberately.
- **C5. 113.25-114.0:** the sclera is almost black, and the reflection becomes a speckled arch that doesn't read as a TV. Add a little `eye_key` light, and keep the white TV shape longer.
- **C6. 110.0-110.5:** the mountain from above is a clean disc on black and reads as a dish. Fog or cloud at the rim would help.
- **C7. 127.4-130:** the tie bird is cropped at the top edge, tail and tie only. Either put it in frame or take it out.

## Pattern to check

Most upper-body clips in Part 5 run at `speed` 5 or 2.5 to cancel the slow motion, so he moves at real speed in a floating world, and each fragment starts mid-clip. That's why the acting feels like spliced mocap and not one thought. For the rest of the part, fewer clips with held poses in between would help more than tuning each blend.
