# Motion critic: ps_catch_slide_b

105 frames at 30 fps (3.47 s). **Total 7/10: passable, weak on snaps and stiffness (7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.26 over 10 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.54 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.03 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 4.8 | 10 big moves: 2 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 3.7 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 89 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 3.47 s |
| 8 Stiffness | 3.1 | 16% of core joints frozen while the body moves; never moves: Spine, Chest, LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 7 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.6 | 1.47 robust z from 174 mocap clips; furthest: energyCV high (5), spineToArm high (3.03), armOmegaP50 low (1.52) |

## Worst moments

- **0:01.00** (1 s, f30) LeftUpperLeg: LeftUpperLeg jumps 170 deg in one frame (also snap)
- **0:01.63** (1.63 s, f49) LeftUpperLeg: LeftUpperLeg jumps 173 deg in one frame (also snap, no-prep)
- **0:00.40** (0.4 s, f12) Head: Head travels 72 cm with no anticipation and no overshoot or settle
- **0:00.10** (0.1 s, f3) LeftHand: LeftHand travels 53 cm with no anticipation and no overshoot or settle (also no-prep)
