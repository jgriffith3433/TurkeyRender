# Motion critic: mm_lift_heavy_a

251 frames at 30 fps (8.33 s). **Total 7.3/10: passable, weak on snaps and anticipation (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.37 over 7 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.59 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 6 | 1 holds (median 5.9 s), 0% of frames dead still, fast parts median 2.4 s |
| 4 Anticipation and follow-through | 2.5 | 6 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 1 | 6 body snaps or pops in 8.33 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.72 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.5 | 1.9 robust z from 174 mocap clips; furthest: handSpeedP50 low (5), spineToArm high (3.62), energyCV high (3.55) |

## Worst moments

- **0:00.07** (0.07 s, f2) RightToes: RightToes jumps 14 deg in one frame (also snap, no-prep)
- **0:00.40** (0.4 s, f12) RightToes: RightToes jumps 12 deg in one frame
- **0:01.60** (1.6 s, f48) LeftHand: LeftHand jumps 11 deg in one frame (also no-prep)
- **0:01.13** (1.13 s, f34) LeftToes: LeftToes jumps 10 deg in one frame
- **0:02.43** (2.43 s, f73) RightFoot: RightFoot stops dead from 67% of its peak
