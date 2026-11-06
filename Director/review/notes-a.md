# TK Shock v9 review, 0:00 to 1:30 (sheets s_000 to s_085)

Reviewed against `STANDARD.md` and `STORYBOARD.md`. All 18 sheets read, plus about 80 frames at 960 px from `TKShock-v9.mp4`.
Times are seconds in the video, accurate to about 0.1 s. Bar n starts at 0.45 + (n-1) x 2.7586 s.

Fix suggestions are based on reading the score, not on trying them. Cue references are to `Director/acts/`.

Overall: the room, lighting and event order hold up well. The weak spots are the man's contact and body deformation once he is lit (72 s onward), and the tie bird, which looks like a placeholder at the moments it should be a character.

## A: breaks the shot

**A1. 32.25-32.75, "dead remote" (bar 12). The hand does not hold the remote.**
This is a full-frame insert. The fingers close into a fist above the remote, the thumb hangs straight down behind it, and the remote sits against the outside of the hand with nothing wrapped around it. At 32.5 it cuts into the wrist and palm. The skin is also blown out to flat white, so the hand looks like a mitten.
Fix: re-attach the remote to `person.rightHand` so it lies along the palm, with the thumb on top pressing the button (`fingers` curl about 0.7, `finger:"thumb"` about 0.3). Pull down the exposure or key light on this one shot so the knuckles show.

**A2. 75.75-77.5, dragged by the couch (bar 28). He pops between two poses, and his hands aren't gripping.**
Each 0.25 s sample jumps between a flat Superman plank with both feet off the floor (75.75, 77.0) and a kneel with hips high (76.25-76.75, 77.25). It reads as push-ups, not as being dragged. His hands rest flat on the couch's face with fingers open, and at 77.25 his face is jammed against the couch arm. Nothing touches the floor during the plank.
Likely cause: the hand `plant`s on `sofa` (03-the-pull.json line 184) use the default `follow` of 1, so every stick-slip step yanks his hips.
Fix: set `"follow":0.3` on both plants. Hold one strong pose with `keys`: chest low, arms straight, hips dropped, toes trailing on the floor. Reach both hands to the couch's top edge with `offset` and curl the fingers over it. Keep his head clear of the arm.

**A3. 83.25-83.7, door (bar 31). The bird wall shows through the closed door.**
At 83.1 the door is shut. At 83.25 birds are already drawn through it, because `p3_dw*` starts at `31:1` (83.2) and the door doesn't move until 83.72. His hands aren't on it either: right hand on his hip, left arm against a bird, no knob on the door. The `plant` on `p3_door` (line 254) ends about when the door starts to move. The wall itself is a flat grid of identical frontal birds stacked on each other's heads, so it reads as wallpaper, not a crush of bodies.
Fix: set `from` on the bird wall to 83.72. Add a small knob prim. `reach` then `plant` the hand on it from about 83.5 to 83.9, so the door swings under his hand. Break up the grid with scatter, `jitter`, and a little scale and yaw variation.

**A4. 72.75-74.25, crawl-out close-up (bars 26-27). His body deforms badly, in good light and close to camera.**
The waist pinches to a thin tube and the hips balloon behind it. At 72.85 the armhole opens into a dark void at the shoulder, and the sleeve hem is torn looking. At 73.25 the neck stretches and the collar sags into a deep V, so he looks like a different garment and proportion from the close-ups. His forearm also passes in front of his mouth at 72.75.
Fix: the `CrawlZombie` clip is pushing the spine and shoulder past what the skinning can hold. Either frame this shot wider and from the front, or swap to a lower-amplitude crawl and add a `pose` to bring the shoulder down and the spine straighter.
**A5. 58.0-59.7, "the push" (bar 22). A stuck toothy grin, and the push slides off the eye.**
This should be dread, but his face holds a wide-eyed smile with bared teeth, and his eyes diverge slightly. The camera is meant to push to his eye and cut into the macro. Instead the eyes leave the top of frame: at 59.25 they are in the top tenth, at 59.6 they are gone, and the frame is only nose and grin. The cut to the eye therefore matches nothing.
Fix: on `"the push"` (02-watching.json line 265), raise the end of the move and the `lookOffset` y so the near eye finishes centred. Add `face` with `smile:0`, `fear:0.6`, and a slightly parted jaw without teeth.

**A6. 77.75-78.6, the first bird comes out (bar 29). The key event is hidden and the glass doesn't read as skin.**
The storyboard's biggest funny-scary beat is a head stretching the glass. From this shot we see a white oval on the snow with a tiny red speck (77.85), then his head and shoulders rise in front of it (78.1, 78.4), then a black blob with a red tick (78.6). No stretch reads at any sample. The body is crushed black while the fan is blown white, so it doesn't read as a bird until the cut.
Fix: keep him low and out of the screen's line for this shot, or move the camera right so he sits beside the TV. Better, add a close shot on the glass for the push, then cut wide. Add a fill light on the bird so its body isn't black.

**A7. 31.5-32.25, the cameraman's stare (bar 12). It never lands.**
Payoff of the triple fourth wall break: "looks straight at us. Beat." The head only gets to profile, beak pointing screen right (31.75, 32.0), and the shot cuts at 32.25 with no hold. The bird looks at something off-screen, not at us.
Fix: finish the head turn on lens, both eyes visible, by about 31.75, and hold it for at least 0.5 s (extend the shot or start the turn earlier). This is the same stare bars 72-73 pay off.

**A8. 31.75 and 78.75-85.25, the tie. It's a flat plank, not a tie.**
It's a red `prim:cube` hanging clear of the body with no knot, collar or taper. On the hero at 79.0-80.25 it floats in front of the chest, and its lower end gets a jagged notch where it cuts into the feathers. At 31.75 it stands off the neck edge-on. It's also the only unshaded flat colour on a detailed bird, and this is the identity prop of the whole video.
Fix: one small model used everywhere: knot, collar loop at neck base, tapered blade, shaded red. Attach it lower on the neck, and offset it so it lies on the feathers without cutting into them. It affects `p1_tktie`, `p1b_tie`, `p3_tie`, `p3_dwtiet` and `p4_grabtie`.

## B: noticeable

**B1. 82.35-83.2, "he runs for the door" (bar 30).** The run lasts 0.86 s, shot directly from behind with his legs in the dark. Every sample shows him upright with hands on hips, and at 83.1 he is simply standing at the door. Nothing sells panic.
Fix: extend the run by a beat and shoot it from the side or front, with knees and arms visible.

**B2. 85.5-88.7, swept off his feet (bar 32).** His legs go straight into the birds' bodies and fans with nothing displaced (86.25, 86.75, 87.75). He tilts as one stiff board over them. The energy covers some of it, but it lasts three seconds.
Fix: raise him 0.3 m so he rides on top, and add a `ragdoll` or some bird `hop`/`shake` under him, so the crowd reacts where he touches it.

**B3. 82.5-85.25, the door reaction.** His back is to camera for the whole beat. The storyboard says "He turns. Turkeys." We never see the face at the reveal. At 84.5-85.0 he hunches with his hands behind his head and his neck vanishes, so from behind he looks briefly headless. His shirt also blows out to white under `p3_dwl`.
Fix: give him a three-quarter turn to camera at about 84.3, one held face beat. Lower the spot.

**B4. 23.25-26.5, scratch and raise (bars 9-10).** The neck scratch reads as a wave: his hand is up beside the TV, about an arm's length from his neck (23.5), and never touches. The bar 10 raise (26.0) is the same pose again, and it is up and down in about 0.75 s, not slow. He doesn't freeze between them. The copy on TV does work.
Fix: bar 9 is real contact, so use `reach` to `person.neck`, with a small `fingers` scratch. Make bar 10 slower and hold the hand up until the TV has copied it.

**B5. 33.0-35.0, throw (bar 13).** His arms are in a different position on nearly every sample, with no clear line of action: nape at 33.0, remote up at 33.25, low at 33.5, elbow high at 33.75, limp hand at 34.25. No remote is seen leaving his hand or flying in any sample (a fast throw could fall between samples).
Fix: one wind-up, one throw, one hold. Add a remote flight the camera can follow, or hit the wall with it.

**B6. 36.25-43.5, "the face" (bars 14-16).** Seven seconds of first close-up with one mild half-smile. No expression change and no blink shows in 29 samples. His eyes don't lead the head. The TV colour flashes do the only work.
Fix: two beats of `face` (confusion, then worry), blinks on the head turns, and a small eye shift. The push can stay.

**B7. 59.75-63.75, the macro eye (bars 22-23).** The white of the eye and the iris are black, so it reads as a dark almond with a TV floating in it. The lids opening reads; the pupil blowing open doesn't, because there is no iris to compare against.
Fix: raise `eye_key` or add a low fill so the iris and sclera show before the snap.

**B8. Skin and shirt at the lower back, right side (72.75, 74.25, 74.75, 82.75-85.25).** A black slit like a tear sits in the same spot every time his back is lit.
Fix: it's on the person mesh (a crease, or something poking through). Fix it once in the model.

**B9. 80.75-81.25, reaction (bar 30).** The top of his head and his eyes are cut off at 80.75. His near hand hangs limp from the wrist, thumb down, the same dead shape as the remote hand. He snaps from chin-down to arms-out within two samples.
Fix: raise the frame, and `fingers` to open the hand and straighten the wrist, keyed with a moment of anticipation.

**B10. 75.0-82, the fallen lamp.** The shade lies as a half hoop on the rug, as if its near half is missing or sunk through the floor. The base and socket sit beside it, with the shade seemingly detached.
Fix: stop it above the floor, or make the shade double-sided, and keep it on the base.

**B11. 85.5-88.7, walls (bar 32).** The storyboard's walls peeling away don't read. The walls stay whole in every sample. The only sign is a flat red sliver crossing frame at about 88.25, which looks like a glitch.
Fix: peel one big wall on camera at about 86.5, behind him.

**B12. 28.75-29.75, the corner (bar 11).** The storyboard says hold on the camera turning. The camera is a tiny dark shape under a huge black head, so its turn can't be read.
Fix: a tighter lens on the camera, or a second cut to it. Move his head out of frame centre.

**B13. 30.0-31.5, cameraman set (bar 11).** The studio camera is plain untextured boxes and the bird's wing never touches it, though the storyboard has it resting there. From behind, the bird's head and neck is one pink sausage.
Fix: wing `pose` onto the camera, a little more shape or texture on the camera, and a rim light on the back of the head.

**B14. 0.0-0.45, before the first shot.** A bright red-lit view of the corner camera flashes before the dark silhouette, spoiling the reveal at bar 11 and contradicting "Dark". If it is deliberate, ignore this.
Fix: start in black or on the silhouette.

**B15. 10-17, channel surfing (bars 4-6).** Channels change with no hand or click on screen, only his shoulder at the edge of frame, so the change has no visible cause. The shows themselves read well, and the tie bird is visible on the news.
Fix: one or two quick inserts of the thumb, or get his arm into frame.

**B16. Teeth, 57.9-59.7, 65.5, 81.0.** One ridged strip like a grille, with a fang-like glint at 81.0. Visible whenever his mouth opens in close-up.
Fix: darken and soften the teeth material, and keep the jaw from showing them in the tightest shots.

## C: minor

- **17.25-18.25:** blue planks with a black edge of head. It takes a second to read as the TV picture. Fine as a reveal, but it could be half a second shorter.
- **43.5-43.7, glass:** a black blob sits in the water for the first frames of the shot, then disappears (gone by 44.0). The base looks rounded, and it floats slightly above the table.
- **47.75-49.4, frame:** the frame is cut off by the bottom of the screen and two-thirds of the shot is empty wall, before the tick lands. Raise the framing.
- **49.75-54.75 and 74-75, wainscot rail:** the rail runs across the dark curtain or door gap on the left as a floating bright line.
- **56.0-56.25, TV silhouette:** the bird goes from brown to pure black between samples. The tie reads pink, not red.
- **64.5-65.25:** the red and blue TVs hang with no stand. This suits the idea if deliberate, but the blue one is cropped by the frame edge.
- **67.0-67.5:** his arms go up in a nearly matched pair. Offset one arm by a few frames.
- **68.25-68.5:** he ends in a near headstand at frame left, with his head lost in dust at the floor. Check contact in motion.
- **75.75-77.5:** the foreground bare foot is large and blown out. Lower the key or crop it.
- **79-80:** the fan is about 1.4 times the TV's width, so the bird can't have fitted through the screen. Scale it down slightly or open the fan after it's out.
- **85.5-88.7:** large feathers are flat, hard-edged cards with stair-stepped notches. Close ones look like paper cut-outs.
- **85.25:** a dark blurred foreground shape takes up the left third of frame just as the burst starts.

## Couldn't judge from stills

- Water shiver and lamp flicker (bars 16-21), and whether the curtains breathe. At 0.25 s sampling I saw no movement in the water surface, but stills can't prove it.
- Foot slide on the run and at the door: his feet are mostly dark or out of frame.
- Hand contact during the bar 3 remote pick-up (6.25-9): too dark to see, and no fault visible.
