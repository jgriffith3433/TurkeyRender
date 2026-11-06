# Review notes D: 160 to 204 s (bars 59-73, Parts 7 and 8)

Source: `Director/output/TKShock-v9.mp4` (rendered 23:39). `acts/05-inside.json` and `07-cuts-d.json` were edited at 23:52, after that render, so some of this may already be changed. A v10 render was in progress while I worked.

**Times:** all times are from `ffmpeg -ss` on the mp4. The sheet labels run up to about 0.3 s ahead of these in places: the host shot cuts in at 194.62 by scene detection, but the sheets show it at 194.5.

**Limits:** I judged from stills and per-frame tiles, with no sound. "Not seen" means not in the frames I looked at, sampled every 0.25 s unless noted. Cause notes marked "unverified" are guesses from reading the cues.

## A: breaks the shot

**A1. 171.3-171.9, 174.2-174.8, 193.0-194.1, 195.4-196.1: bodies jump between poses from one frame to the next. Worst fault in this range.**
It can't be seen on the 0.25 s sheets, only on 30 fps tiles.
- Workout, 171.3: his legs and arms swap between two stances every frame (20 of 23 frames alternate).
- TV host, 195.4: his waving arm and the bird's whole neck jump around (12 of 23).
- Remote close-up, 193.0-194.1: every 3-4 frames the hand drops to an open, different pose with the remote edge-on, then snaps back, at 192.96, 193.09, 193.26, 193.39, 193.52, 193.82, 193.96, 194.09 (7 of 23).
- Sitcom, 174.2: the man alternates (5 of 23); the bird in the same shot does not (0 of 23).
- Late-night giant bird, 180.4-181.1: its neck looks the same in a tile, not measured.
- Clean controls: 40, 100, 120, 150 and 176.8 s (0 of 23); 155, 163.9, 179.5 and 185.6 are low (1-3 of 23).
- The camera and set stay steady, so only the rigged bodies are affected. I found no cue that explains it.
- Smallest fix: render 171-172 alone and compare it with `mv frame` at the same times. If `mv frame` is clean, the fault is in render capture, not the score, and the fix is one engine change. Add the alternation check to the render QA.

**A2. 190.7-197: the next viewer has his face.**
- The storyboard wants "a different person", smaller, with a cloud of curls. She is the same head on a blue T-shirt. `06-room2.json:191` gives `person2` the `"model":"person"` body.
- Her hair is long stiff spikes standing off the head like wings. At 192.8-193.9 the spikes pass the forearm and stab down over the sofa arm.
- This is the payoff of the whole film, and it reads as the same man in a wig.
- Smallest fix: try the `person2` alias already in `score.json:10` (`N5Human.prefab`; I have not looked at that model). Failing that, stay on hair from behind and on the hand, and cut the two face shots.

**A3. 186.4-188.3: the wall of TVs shows black silhouettes.**
- The storyboard wants "every one of them him". Every screen shows a dark skyline with unlit black figures and a desk, with no face. The room TV keeps the same dark picture until she changes channel.
- The close-up just before it, at 186.0, is lit.
- Smallest fix: find what darkens the late-night feed after `68:1.75` (unverified; `latenight_key` and `_rim` are set up at `68:1`) and keep those lights on through `tvwall2`.

**A4. 185.0, 186.0, 194.6-196: no smile, no feathers.**
- The storyboard wants the "biggest smile in the film" and then "feathered, smiling". At 186.0 "YOUR HOST" has a flat blank face. At 185.0 he looks up. On the TV at 195 he waves with a neutral face.
- `smile:1` is cued at 66:3 and from 66:4.5 to 68:1, so the cue isn't landing or the key is too weak.
- No feathers are visible on him anywhere in Part 7. The only cue I found is `feather` `amount` 0.07 at 63:1.
- This end state is the point of the story. He looks the same as he did in bar 59.
- Smallest fix: check the smile key in `mv frame` at 186, and raise it with `jawOpen`. Add `feather` at about 0.3 from bar 66 on, keeping the face clear.

**A5. 177.6-178.1: he is bald.**
From behind in the grass, his crown is a bare skin dome with no hair at all. At 176.25 the hair is fine from behind, so it is specific to this angle or moment.
Smallest fix: re-angle the shot to shoulder height or cut it. Check `person` hair at that time in `mv frame`.

**A6. 183.5-184.3: head out of frame.**
In the kitchen bleed he stands on the cloche with his head and both hands cut off by the top of frame, during the "host" stretch.
Smallest fix: tilt up about 8 degrees or pull back 1 m.

**A7. 166.5-167.5: he crawls in mid-air on the platter.**
His hips, belly and thighs hover clearly above the plate, with a gap and a shadow under them (close crop at 166.75). His lower legs wave in the air. It is his one attempt to escape, centre frame.
Smallest fix: lower the `walk` y from 1.13 (`05-inside.json:1950`) by the gap. `mv motioncheck 165 168 --on person` will give the height. Plant both hands on the steps.

**A8. 180.3-182.1: the city-sized bird doesn't read.**
- In the wide shot it is a small blown-out pink neck behind the "GOBBLES" sign, about the size of a letter.
- In the close shot, 181.2-181.7, it becomes a white-out patch of sky with dark blobs.
- Bar 66's event is lost, and "Nobody minds" has nothing to play against.
- Smallest fix: take `latenight_kaiju` down until the feathers have form, and scale the bird up 2-3 times so the head clears the sign and the skyline.

## B: noticeable

**B1. Tie bird's tie, whole section: 160.5-161, 171.2, 174, 186, 195.**
The tie is a rigid red plank that stays straight while the neck bends. It floats beside the neck with a gap (174, 186), sticks out like a paddle (161), and stands on the desk like a block at 195.
It is the bird's identity and it looks like a prop near it.
Smallest fix: attach it to the lowest neck bone instead of `neck3`, about 60% size, with its rotation held to hang down.

**B2. 161.5-162.0: bird through him.**
The feather mass cuts across his cheek and chest, and the neck passes through his arm at 162.0.
Smallest fix: send the bird's path 0.3 m upstage, or lean him further back with a `keys` recoil, so contact lands on the shoulder.

**B3. 163.7-165.1 and 166.5-167.5: rain and fire don't show.**
- Weather: no birds seen in the air. There are only small ones on the floor, then the one that lands on him. Cue `wx_rain` at 60:1.4.
- Cooking: no storm through the ceiling and no fire seen. Cues `ck_rain` at 61:2.1, fire at 61:2.5 (`pos` z 3, likely out of shot).
- Smallest fix: bring 2-3 large birds close to the lens in each shot, and move the fire into frame behind him.

**B4. 166.5-167.5: chef hidden.**
The chef bird is directly behind him, so only the hat shows, floating above his head.
Smallest fix: move the bird 0.6 m screen-right.

**B5. 165.5-166.5 and 167.9-168.3: baster rod.**
It is a bare stick with no bulb and nothing holding it, crossing the overhead shot from off-frame. After the cloche lands, it hangs in the air above the knob.
Smallest fix: attach it to the chef's wing or beak, and hide it at the cloche hit.

**B6. 168.3-170.1: no struggle on the wheel.**
His limbs stay in the same spread pose in every sample.
Smallest fix: a head and chest `keys` thrash inside the straps, plus fear on the face.

**B7. 171.2-172.0: misery doesn't read.**
His head is tipped back to the ceiling, so the face is hidden and the head sits on the "3000". The storyboard asks for "stiff, miserable".
Smallest fix: `gaze` at the lens. Re-judge after A1.

**B8. 173.4-173.8: the near miss is lost.**
He is tiny behind the wheel, and the neon sun doesn't visibly break. "Misses him by a hand" doesn't read.
Smallest fix: put the camera on his side of the wheel for the dive.

**B9. 173.9-176.2: the class never arrives.**
Not seen coming through the door in the sitcom ("the class runs in"), so the flats fall with no cause on screen.
Smallest fix: 3 or 4 members through the door at 175.3.

**B10. 176.7-177.5: bird with camera sits directly behind him.**
The tail fan reads as dark wings on his back, and the camera as a pack.
Smallest fix: move it 0.7 m screen-right so it reads as stalking.

**B11. 179.5: shins through the armchair.**
His legs drop inside the chair's arm and front, with the feet showing outside the base. Moderately sure at this size; he is small in frame.
Smallest fix: move him forward about 0.15 m, and confirm with `motioncheck`.

**B12. 181.2-181.7: "starts to enjoy it" doesn't read.**
His head is thrown back away from the lens and the other hand hangs limp.
Smallest fix: keep the fist, turn the head to three-quarter, add the smile.

**B13. 180.0-180.03: arm snap.**
His hand goes from armrest to raised in one frame. It may be part of A1.
Smallest fix: 0.15 s blend.

**B14. 170.25-170.6: contestant's chef hat.**
The hat is a cylinder swallowing the head, with the beak poking out of its side.
Smallest fix: half the scale, and sit it on the crown.

**B15. 199.7-204.1: stinger missing.**
There is no remote click or "Next on WTKS" card, just black. J approved this; it isn't in the acts (searched for "Next on"). It also depends on A2.
Smallest fix: add the cue at bar 73 beat 4, in the black that's already there.

## C: minor

- 160.2-161: the green CH tag sits on the set's big "4" and reads "CH 0".
- 160.5-162: desk and shirt clip to white. Lower the news key.
- 171.6-172.0 and 183.5-184.3: the "CALL 1-800" box covers his feet, and hides the contact with the cloche.
- 172.1-173.9: "SIDE EFFECTS: TURKEYS" overruns its yellow box at both ends.
- 182.3-185.9: "ALL CHANNELS" overruns its red box, and at 182.3-183 it reads "ANNELS", white on the white desk.
- 182.3-183.0: as the new host he is small at the left edge behind a monitor. The bird and wheel take the shot.
- 172.2-172.5: his fingers go into the tie bird's fan, and its neck folds into its own chest.
- 174.0-175: he sits on the sofa cushions with no sink.
- 185.0: his hands are lost in the "3000".
- 194.6: the TV close-up starts dim, then jumps brighter within a few frames.
