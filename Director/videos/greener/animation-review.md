# Greener: independent animation review

Reviewer did not animate this. Times are seconds into the shot's own render in `shots/`. Only renders newer than 19:00 on 2026-11-06.
Measured at 15 fps strips and 30 fps bursts. Renders are 640x360, so fine finger detail is limited.

Bar for PASS: he moves like a 2000s pop performer (hit, hold, snap, on the 2), weight on planted feet, eyes on the lens, hands relaxed, and any gag reads in under a second.

## Batch 1 (reviewed 19:25)

| Shot | Verdict | Time | Fault | Fix |
|---|---|---|---|---|
| 004-secret | FAIL (A) | 1.23-2.73+ | Hand parked over eyes and forehead for 1.5 s while singing; blade sticks out of his hair. Eye line gone | Target to the side of the cheek, about 0.25 m out, or use a mocap layer |
| 004-secret | B | 0-1.0 | Dead still in the chair, only the mouth moves | Add head and shoulder move on the 2 |
| 005-lips | FAIL (A) | 0.33-1.53 | No finger at lips. Curled fist under chin on the collarbone, 12 cm low | Raise target to mouth, index on lips, fingers 0.6 |
| 018-creep | FAIL (B) | whole | Stands in a stiff wide straddle, arms pinned at sides, frozen. Pastel is a hard polygon disc with visible facets, stepping out | Weight on one leg, soft arms; subdivide the ring and feather its edge |
| 019-fence-one | FAIL (B) | whole | He is sitting in the chair with his back to us; 018 just had him standing on the lawn. No body move for 1.6 s, not singing | Keep him standing as in 018, or cut him; panels themselves read fine |
| 022-gift-pop | FAIL (A) | 0.86-1.66 | Butler comes through a closed solid lid, hangs in air 0.3 s, sinks back into solid top, bow starts as shot ends. Burst is 1.3 s after "baby" | Lid pops off, spring up with overshoot, bow done by 1.0, land on "baby" |
| 023-ch-med | FAIL (A) | 0-3.37 | See "The groove" below | Replace mx_body_wave with a clip that stops on the 2 |
| 024-ch-med | n/a | | Stale 19:14 file, superseded by 023-ch-med. Same fault | Ignore |
| 035-snatch | FAIL (A) | 1.26-1.30 | Blade sits near his hip then teleports to his hand; no float. Blade is 3 px until then | Float it on a visible arc at chest height, closer framing |
| 035-snatch | FAIL (A) | 1.30-1.46 | Hand closes to a spear: fingers and blade fuse into one spike, arm frozen up | Fist round the stem, blade clear of fingers, settle the arm down |
| 035-snatch | B | 1.26 | Dark patch on the forearm for a frame or two | Check sleeve against arm |
| 040-bed | FAIL (A) | 0.07-end | Camera shows only a brown wall of quilt and a bedpost. No butler, no pillow | Pull back and up, check with `cards sheet` |
| 045-theory | FAIL (A) | 1.5-end | Butler hidden behind lectern box, cloth squashes like a blind with no contact, red strip hangs in the air to the end, butler turns his back at the payoff | Stand him beside the chart, attach cloth to wing, 3-frame yank, hide cloth, end facing lens |
| 050-clever | FAIL (B) | 1.27 | Wall rock is about 2 px. Reads as nothing. Turkey tail in corner | 6-8 degrees from the floor, tail out |
| 052-vase-slides | PASS (C notes) | 0.63-1.4 | Three jerks read and land on "really am". Turkey tail twitches in the corner | Lose the tail |
| 058-takes-it | FAIL (A) | 0.6-1.1 | Plank arm reaching air, hand 0.5 m short, butler holds nothing out, blade invisible, he stands hunched on bent knees | Closer, contact on "mind", wing held out, upright |

### The groove (023-ch-med, mx_body_wave)

This is the main fault and it is in every chorus shot cut from this take. It looks like modern-dance noodling. A 2000s pop routine is step, hip, arm, hold: sharp stops on the 2 with snaps between, chest and hips isolated, hands placed, a grin at the lens.

- 0-2.57 s: no clear hit every 2 beats. Motion is continuous and syrupy.
- 0.93, 2.13: the torso tips from the waist; the hips don't lead.
- 1.13-1.93: left arm locked straight at shoulder height for 0.8 s, half a scarecrow.
- 1.47-1.76: both feet slide about 0.3 m left, flat on the floor, no weight transfer. Foot x at 640 wide: left 284 to 222, right 389 to 346.
- 2.67-3.1: dead spot on straight legs.
- 3.16-3.36: the hop into mx_hh_step is the only moment with snap. Feet point down mid-air, but it's alive.
- Butlers rotate in place at 1.2-1.56 and do not do his move, so the formation isn't "in sync".

## Batch 2 (reviewed 19:28): new shots

| Shot | Verdict | Time | Fault | Fix |
|---|---|---|---|---|
| 024-doors | PASS | 0.39-0.46, 2.2 | Flings land in 2 frames and the hall reveal works. C: doors at 1.2-2.1 are near white, panel lines break up | Lower door exposure a touch |
| 027-balloon-butler | FAIL (B) | 0.87-1.27 | Butler rises with no balloon in frame. He is 30 px tall. Lift is 1.3 s after "baby" | Balloon in frame from frame 1, closer, land on "baby" |
| 029-look-away | PASS | 0.47-0.6 | Unison turn lands on "know" and reads at once. C: fans overlap at the centre, turn is a rigid turntable | Space the front two |
| 038-fork-cu | FAIL (A) | whole | Brown stick on brown table, no tines, no plate. Wing is three pale blobs. Not readable as a fork | Real fork and plate, feathered wing, pull back |
| 047-plan | FAIL (A) | 1.73-end | Cover squashes like a blind, no contact, red strip hangs in the air to the end | Same as 045 |
| 071-hand-opens | FAIL (A) | 2.34-3.3 | Hand never opens on "let go". Plank arm frozen for 3 s | Fix `fingers` set, blade on open palm, soft elbow, hand nearer chest |

## Batch 2: re-renders of batch 1

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 004-secret | 19:24 | FAIL (B) | 1.53-1.93+ | Hand now beside face, good. Blade lies straight across his eyes and nose | Point the blade up |
| 005-lips | 19:25 | FAIL (A) | 0.47-1.47 | Worse. Fist covers left eye and cheek | Stop at the 0.40 pose: centre line, index on lips |
| 035-snatch | 19:25 | FAIL (A) | 0.13-1.46 | No float at all: he holds the blade from 0.13. Blade pops between 1.2 and 1.33. Arm just waves | Hand open and empty, blade rises on its own, quick grab |
| 040-bed | 19:25 | FAIL (A) | whole | Framing fixed. Pillows stack like a snowman and hide the butler, only his fan shows. No plump visible | Butler beside the pillow facing us, big squash |
| 058-takes-it | 19:25 | FAIL (B) | 1.07+ | Distance fixed; blade tip now starts near his beak. His head hits the top of frame. Butler stays static, no wing | Tilt down, butler offers the blade |

## Batch 3 (reviewed 19:33)

### anim-ch1 (whole chorus take, 19:28): FAIL, but moving the right way

Times are seconds into `anim-ch1.mp4`; 0 is 47.63 s of the song. Stops measured from his dark-pixel movement against the 2-beat grid.

| Time | Verdict | Fault | Fix |
|---|---|---|---|
| 4.33-6.3 | Good | Stops about every 0.85 s on the backbeat, real step-touch, weight changes, skate gone | Keep |
| 15.6-16.2 | Good | Arm-up lunge, best pose in the take | Keep |
| 11.2-14.55 | A | "look at you" shot 60 degrees off axis. Near profile at 13.9-14.5. The point goes to a balloon, not the lens | Camera on the axis of the point, on "you" at 13.39 |
| 18.0-18.8 | A | Dead: straight legs, arms held out like a gunslinger, no stop | Use a different slice of the take |
| 0.1-2.55, 10.1-11.15, 14.65-15.5 | B | Continuous, no stops. Only 0.83 lands. At peak speed at 1.70 | Warp so stops land on the 2, hold 0.1 s, snap |
| 6.3-6.6 | B | Stands dead on straight legs | Keep moving |
| 7.0-7.6 | B | Both arms overhead, twinned and static | One arm higher, hip dropped |
| 5.1, 6.9 | C | Lifted feet leave the bottom of frame | Pull back 10 percent |
| whole | B | Butlers turn on their own rhythm, not in sync with him | Shared hit on his 2-beat stops |

### Shots

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 004-secret | 19:29 | FAIL (B) | 1.5+ | Face clear, hand good. Blade comes out of the heel of the fist, pointing down | Flip 180 degrees so it stands above the fingers |
| 005-lips | 19:29 | FAIL (B) | 0.4-1.5 | Face clear, index up, but 10 cm right of the mouth: "one moment", not "shh" | Move to the lips |
| 006-sparrow-away | 19:26 | PASS (C) | 0.9-1.0 | Turn reads. Head leaves top of frame | Lower the hop |
| 022-gift-pop | 19:30 | FAIL (A) | 0.86-1.23 | Still no lid off. Hovers with legs dangling. 1.3 s after "baby" | Lid off, rise from inside, settle under 0.3 s |
| 035-snatch | 19:29 | FAIL (A) | 0.1-1.5 | Still no float. Holds the blade from 0.1 | Open empty hand, blade rises, quick grab |
| 049-clever | 19:30 | PASS (C) | 1.2-1.5 | Room rock reads. Green sliver under the skirting, tail in the corner | Lose the tail |

## Batch 4 (reviewed 19:37)

Cut numbers moved: 060-descend (19:32) is the stale copy of 059-descend, and 058-takes-it is now 056-takes-it.

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 053-he-looks | 19:33 | PASS | 0-0.2 | Still and small, a head turn then a hold. Right for the dip | None |
| 055-holds-out | 19:34 | FAIL (A) | whole | Tray passes through the butler's head. Blade top cut by frame. Nothing moves | Tray forward and lower, on his wing, raise it on beat 1 |
| 056-takes-it | 19:35 | FAIL (A) | 1.0-1.4 | Fencing lunge straight after taking the blade, in the stillest moment of the video. Head out of frame from 0.5. Tray through head | Stay upright, hand to chest, tilt down |
| 057-goes-back | 19:35 | FAIL (B) | whole | 50 px tall from behind. No glide or skirt can read. Bottom third is empty road | Closer, waist height, skirt taken on beat 1 |
| 059-descend | 19:33 | FAIL (B) | whole | Hand behind head frozen 3.3 s, torso tipped 15 degrees, elbow at chin 0.5-1.0, no skirt lift, stairs invisible on flat carpet | Change arm every 2 beats or use skirt hands, stair lines on the carpet |

## Batch 5 (reviewed 19:38)

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 004-secret | 19:36 | PASS | 1.2-3.1 | Hand beside face, blade curves up behind the fingers, face clear | None |
| 005-lips | 19:37 | FAIL (B) | 0.5-1.4 | Finger on the mouth at last, but 45 degrees outward, thumb out, hand covers the mouth corner | Index vertical across the lips, thumb tucked |
| 035-snatch | 19:37 | PASS (C) | 0.3-1.3 | Blade floats, he grabs it at 1.2 without looking. Reads. Tip leaves top of frame at 0.6-1.1 | Stop the rise 15 percent lower |
| 052-grey-wide | 19:36 | FAIL (B) | whole | 25 px tall, no visible travel. The walk can't read | Longer lens or a closer angle |
| 073-darling | 19:36 | FAIL (A) | whole | White plane fills bottom 55 percent, head cut off, knees unseen, lime bar in front of him | New camera, full length on the sofa |
| 075-better | 19:36 | FAIL (A) | whole | Remote never comes up, dead still, gold knob on his head, huge pale shapes overhead, lime bar | Remote at lens on "better", clear the props |
| 076-click-off | 19:36 | FAIL (B) | whole | Ghost reads, but no arm out, since 075 never raised it | Follows from 075 |

## Batch 6 (reviewed 19:41)

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 002-hem | 19:37 | FAIL (B) | whole | Knees wide apart, hands barely move, upper hand floats at 0.8-1.0 | Knees together, palms flat, stroke thigh to knee |
| 020-delight | 19:37 | PASS | 0-0.7 | Smile reads | None |
| 024-doors | 19:39 | PASS | 0.7 | Reveal works | None |
| 025-ch-cu-2 | 19:38 | FAIL (A) | 3.5-4.0 | On axis now and eyes hold the lens, but a closed fist covers his face for 0.5 s, 0.5 s after "you" | Index out, 20 cm lower and to the side, on "you" |
| 025-ch-cu-2 | 19:38 | B | 2.6-2.7 | Arm thrown fully out in a close-up | Tighter arms or a calmer slice |
| 027-balloon-butler | 19:38 | PASS (C) | 0.4 | Balloon in frame, lift has a cause. 0.85 s after "baby". Butler still small | None needed |
| 038-fork-cu | 19:39 | FAIL (A) | whole | Gold bar and three petals. No tines, no plate | Real fork, plate rim, feathered wing |
| 058-hook-3 | 19:39 | PASS (C) | 1.4 | Stairs read, hook is clear. He is small | None needed |
| 059-descend | 19:39 | FAIL (B) | whole | Arm still frozen behind the head, no skirt | Change every 2 beats or skirt hands |
| 069-hand-opens | 19:39 | FAIL (B) | 0.5-1.5, 0-0.33 | Hand opens at 2.6 on "go", good. Head and eyes out of frame 0.5-1.5. First 0.33 s is a different framing with his head tipped low | Tilt up, cut the head of the shot |

## Batch 7 (reviewed 19:45)

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 022-gift-pop | 19:42 | FAIL (B) | 0.9-1.6 | Lid fly-off works. Butler now shows only snood and fan over the rim. Still 1.3 s after "baby" | Raise end height 0.5 m, visible to the waist |
| 033-side-eye | 19:40 | PASS | whole | Small and readable | None |
| 047-plan | 19:40 | PASS (C) | 0.9-1.2 | Reads, strip gone. Cover has no contact | Yank if time allows |
| 052-grey-wide | 19:39 | FAIL (B) | whole | Unchanged | Longer lens |
| 055-holds-out | 19:42 | FAIL (B) | whole | Head clear of tray. Tray hovers with no wing under it, blade top out of frame | Wing under the rim, tilt up |
| 056-takes-it | 19:43 | FAIL (A) | 1.0-1.4 | Lunge still there, head out of frame from 0.5 | Remove lunge, tilt down |
| 068-alone-fog | 19:40 | FAIL (A) | whole | Hand behind head, 20 degree side bend, held 3.3 s. Same pose in 059 and the head of 069: it is leaking across shots | Release it. Upright, arms down, deadpan |

## Batch 8 (reviewed 19:51)

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 022-gift-pop | 19:48 | PASS (C) | 0.9-1.5 | Lid flies, butler up to the chest, bows. 1.3 s after "baby" | Move if the cut allows |
| 052-grey-wide | 19:46 | FAIL (A) | 0-1.7 | Closer now. Wide straddle with bowed arms, not a walk | Narrow plain walk, heel strikes |
| 055-holds-out | 19:49 | FAIL (B) | whole | Tray hovers, blade top cut, his legs cross the foreground | Wing under rim, tilt up, keep him out |
| 056-takes-it | 19:49 | PASS (C) | 0.5-1.6 | Reach, take, step back read. Lunge gone. Heavy stride at 0.9-1.0 | Soften |
| 057-goes-back | 19:47 | FAIL (B) | whole | Unchanged, 50 px | Closer camera |
| 068-alone-fog | 19:49 | FAIL (A) | whole | Hand behind head still, 3.3 s. Not from `dress_stand` | Find what is still running and release it |
| 073-darling | 19:44 | FAIL (A) | whole | Frame fixed. Knees spread wide, opposite of the character, same in 002-hem. `dress_sit` uses z on a forward thigh | y on the upper legs, 20-25 degrees |
| 075-better | 19:47 | FAIL (B) | 1.8+ | Frame clean. Remote goes to screen right, 60 degrees off the lens | Aim at the lens |

Note from the gag agent: `fork_cu` and `bed` are cut from the video, so 038-fork-cu and 040-bed are closed. `gift_pop` stays at bar 30, so the 1.3 s after "baby" stands as accepted.

## Batch 9 (reviewed 19:54)

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 055-holds-out | 19:51 | FAIL (B) | whole | Subject clear now, no legs. Tray still hovers with no wing | Wing under the rim. No owner: gag agent finished |
| 056-takes-it | 19:51 | FAIL (A), regression | whole | Dance stance and lean from frame 1, no reach, lunge at 1.0-1.5. Card says `stand` with a reach; 19:49 render was fine | Plain build, re-render, then check |
| 059-descend | 19:49 | FAIL (B) | whole | Unchanged | As before |
| 068-alone-fog | 19:52 | FAIL (A) | whole | Unchanged. Compiled act says `dress_stand` | Plain build, re-render, then check |

Unconfirmed: this may be a stale or mixed timeline from overlapping builds, since `acts/50-cards.json` was empty when read at about 19:53.

## Batch 10 (reviewed 19:59)

### anim-ch1 (19:58): FAIL (A) on the point only. Best take so far

0 is 47.63 s of the song.

| Time | Verdict | Fault | Fix |
|---|---|---|---|
| 4.33-7.65, 11.25-13.7 | Good | Stops land about every 0.85 s with more between. Hand on hip, knee lifts. Reads as a pop routine | Keep |
| 17.1-18.8 | Good | Alive now, spin at 18.2-18.5, look over the shoulder at 18.8 | Keep |
| 13.8-14.5 | A | Point 0.6 s after "you" (13.39), a claw with fingers down, then swings to screen right | 0.6 s earlier, index out, hold on the lens 2 beats |
| 10.1-11.15, 14.65-16.2 | B | One stop each, still flowing | Warp to stop on the 2 |
| whole | B | Butlers do not share his move. No owner | Shared hit on his stops |

### Shots

| Shot | Render | Verdict | Time | Fault | Fix |
|---|---|---|---|---|---|
| 025-ch-cu-2 | 19:56 | FAIL (A) | 3.6-4.1 | Same point fault. Face no longer covered | As above |
| 052-grey-wide | 19:57 | PASS (C) | 1.9-2.1 | Plain narrow walk at last. Small drift on the turn | None needed |
| 056-takes-it | 19:57 | FAIL (A) | 1.1-1.4, 0.3-0.9 | Reach back, lunge back, head out of frame. 19:49 render was good | Restore it |
| 059-descend | 19:57 | FAIL (B) | 1.75-3.25 | Stuck pose gone, but a jog with knee lifts. No skirt, no chin up | Half the step rate, skirt hands, a step on each beat |
| 068-alone-fog | 19:56 | PASS (C) | 2.4-2.9 | Upright and deadpan. Dark blotch of fog crosses his chest | Check fog over him |

## Review stopped at 20:09

A full render started at 20:08:40 (`mv queue` shows `render greener`), so the review stopped as asked.

Not reviewed: 021-ch-wide, 030-ch-wide-2, 045-theory, 047-plan, 055-holds-out, 056-takes-it (renders from 20:02 to 20:08), and the full render itself.

Last verdict on each open shot, which may be out of date if it changed after that render: anim-ch1 and 025-ch-cu-2 FAIL (A) on the "look at you" point. 056-takes-it FAIL (A) on the lunge. 073-darling FAIL (A) on spread knees.
