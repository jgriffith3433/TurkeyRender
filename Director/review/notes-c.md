# Review C: 130 s to 160 s (feathers, the drain, the hang, the slip)

From `TKShock-v9.mp4`. Sheets s_130 to s_155, plus about 35 frames at 1280 and a 6 fps strip of 152.9 to 154.9.
Times are seconds. Cue names are from `acts/04b-hang.json`, which is generated: fix in `tools/p6_hang.mjs`.

Overall: this run's strongest images are the 130 to 133 kneel and the gold lift. The hang (149 to 158) is where it falls
apart, and it's the emotional peak of the video. Contact at the rim is never actually shown, and that's the whole beat.

## A: breaks the shot

**A1. 157.75 to 158.5, "his hand, last": the hand holds nothing.**
The shot that should sell his last grip shows two hands in empty air, with no rim in frame. The lower hand is curled
around nothing, bent back about 90 degrees at the wrist, and there's a visible crescent seam between hand and forearm.
The upper hand is the left one, which let go at 154.56, and it's still up beside the right, so "one hand left" doesn't read.
Fix: frame the rim in this shot with the right hand's fingers over its edge, and drop the left arm out of frame. Ease the
right wrist to under 40 degrees (`handRot`), which should also close the seam.

**A2. 152.5 to 154.9, the slip: no finger visibly slips.**
This is bar 56's only event. In the strip the hand is the same closed cone in all 12 frames. Fingers are a mitten shape,
they don't read as four separate fingers, and none lifts on its `frame_tick`. The pale wedge inside the hand reads as a
hollow shell. The hand isn't wrapped over the edge either; it sits on the rim's surface like a detached glove, and at
152.75 no arm is visible to attach it to. It's also far brighter and more orange than the dark set.
Fix: shoot from the other side, close, on the back of the hand with four fingers hooked over the lip. Exaggerate each
release: the finger straightens fully and the whole hand drops 2 to 3 cm on each tick (the current `reach` steps are 4 cm
along z, which reads as nothing). Cut `p6_face` to match the set.

**A3. 150.38 to 152.5, "he sings it up at us": his arms go into the beam, and he's dead still.**
Both forearms stop at the underside of the lip, with no fingers coming round it, so it reads as arms pushed through a
girder. At 152.0 the beam also cuts off the top of his head. The arms are twinned and he doesn't swing, kick or strain
for 2 s, with his "body pulled out straight" (bar 55) nowhere: a man standing with his hands up. The face is a fixed stare.
Fix: raise the camera a little, or move his hands, so fingers show over the near edge and the head clears the beam.
Split the arms: one straight, one bent higher, shoulders uneven. Add a slow pendulum on the body, the head moving
between lines, and a re-grip on "ME".

**A4. 148.75 to 149.42: the catch is skipped and the TV jumps.**
Up to 149.3 he stands on the snow screen as if it were a floor, at deck level (feet flat on it, no sink). At 149.42 the
same screen is far below, at the bottom of a deep shaft, and he's already hanging from a wall. His fall and the grab, the
payoff of the whole drain, happen in the cut. His arms also pop from low to on the rim in about one frame at 8 fps sampling.
Fix: add one shot: he goes over the edge, drops, and one hand then the other slams on the lip, with the jolt through the
shoulders and legs swinging. Don't let him stand on the screen, or make the deck-level screen visibly fall away first.

**A5. 140.0 to 143.0: an unexplained blue panel.**
A flat blue-grey card lies on the mountain from 139.75, turning with the orbit. At 142.5 it's beside him and at 142.75 it
stands up behind him, taller than he is, then it's gone by 143.0. It has no texture or purpose. I couldn't find it by name
in the acts, so someone needs to identify it. It may be a TV meant for the "it's pouring into the TV" reveal. That reveal
isn't delivered otherwise: no TV under the mountain can be read in 138 to 143.
Fix: remove it, or if it's the TV, give it a frame and snow, and make the reveal its own shot.

**A6. 143.0 to 144.0: he isn't carried down the funnel.**
At 143.0 and 143.25 he's in a stiff running pose over the opening black wedge, not touching anything, and doesn't sink or
fall. Then 143.75 is a nearly empty red frame with his head at the bottom edge, and at 144.0 he's on a wooden deck.
Storyboard 52-53 wants him falling back into the funnel, with the mountain moving under him.
Fix: dent him into the surface (`dent`) and ragdoll him backward as the drain opens, tracking with him. Lose the 143.75 frame.

## B: noticeable

**B1. 145.75 to 148.5: he pushes nothing.** `PushCubeIdle1` and `PushCube1` read as mime: at 147.25 and 148.75 his hands are
pressed against air on an open deck. Five seconds of standing around also stalls the biggest sequence.
Fix: lean back against the pull with hands clawing at the deck, or have him grab a real plank or the rim. Shorten it.

**B2. 145.75 to 146.0, and again by 146.75: pose snaps.** Standing, then folded to the floor in under 0.5 s, then upright
again, with no anticipation and no settle. Fix: `keys` with `anticipate`, or lose the fold.

**B3. 138.75 to 139.75: the subject leaves the frame.** Only his legs are visible at the top edge, sometimes less, while
most of the frame is overexposed feathers and a brown patch. Fix: tilt to keep him in the upper third, whole.

**B4. 134.0 to 138.0: frog pose, held and drifting.** Knees wide, feet cocked, one flat and one pointed, arms symmetrical. It
reads as a frozen jump, not "lifted, arms hanging like wings". Fix: let the legs hang limp and together, toes down, and
tip the head back. Vary the arms.

**B5. 135 to 137: feathers on his mouth.** Chest feathers cover his chin and mouth like a beard, which at 135.5 reads as a
fault, and the brief says never the face. Fix: pull the spread limit back from the neck bone.

**B6. 130.0 to 132.75: feathers don't pour from his mouth.** No stream is visible in this range. At 132.5 there's only a dull
grey heap under his chin that reads as a lump. (I didn't review s_125, which may hold the start.) Fix: brighter feathers
and a clear arc out of the mouth, seen in profile.

**B7. 155.0 to 156.3: the left arm goes the wrong way.** After the slip the arm rises across his face and lies along the
top of the beam, as if he's hooking it to climb up, with his head above the beam and his chest below it. A hand that has
just lost its grip should fall. Fix: replace the `ScaredHostage` layer with the arm dropping, then flailing downward.

**B8. 156.32 to 158.5: the stretch doesn't read.** Storyboard 57 wants him thinning into scan lines, limb by limb. Here the
legs are a bit long at most, and no scan lines are visible on him at any frame I opened. Fix: start the visible effect
earlier, and put a shot on the feet going. `amount` 0.74 by 158.2 isn't showing up in the render.

**B9. 152.5 to 154.9: the tie is a plank.** A long rigid red rectangle with no knot, swinging at 45 degrees and standing off
the chest. The story says a small tie. Fix: half the size, add a knot, parent it to the chest so it stays flat.

**B10. 154.3 to 154.9: the bite doesn't connect.** The bird only dips its head, far from the hand (about the hand's own
length several times over). It takes no part in the slip. Fix: walk it up to the fingers, and let it peck the last one.

**B11. 143.0 to 149, 154.9 to 158: skin and soles clip to flat orange-red.** Feet look like orange socks (143.25, 144.0) and
red slippers (146 to 148.75), and the arms go solid red at 155.75 to 157.5. Lighting shape disappears. Fix: lower the red
light's intensity on him, or make it a rim.

**B12. 150 to 158: sleeves.** At 152.0 and 158.0 the cuff flares off the arm with a visible gap and hollow inside. Fix: weight
the cuff to the forearm or tighten it.

**B13. 158.5: the camera starts inside him.** A big black and white blob fills a third of the frame as "down the shaft"
begins at `[-0.3,-30.4,-6.6]`. Fix: start the shot clear of the body.

## C: minor

- **C1, 144 to 146.5:** one "red light" sits on the deck like an orange ball. Across 148 to 155 the hundreds of red lights are
  flat orange dots with no glow or depth, so they read as confetti, not eyes. Give them a lens-like red core and vary the size.
- **C2, 146.75 to 148.25:** foreground feather blobs and quick focus changes hide him. Fewer, and away from his silhouette.
- **C3, 133.5:** the near wing blows out to white. Trim the highlight.
- **C4, 131.5:** the blurred tie bird sits as a tangent on the line of his back. Shift it left or right.
- **C5, 154.25 to 154.75:** the lyric "I ALWAYS FEEL LIKE" runs over the hand and the bird's feet. Move it clear.
- **C6, 133.0:** subject low in frame, under a mostly empty sky. It works for one frame, but it's a beat late against the lift.
