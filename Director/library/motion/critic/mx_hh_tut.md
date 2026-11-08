# Motion critic: mx_hh_tut

510 frames at 30 fps (16.97 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 55 moves, 0% straight lines |
| 2 Slow in and out | 8.7 | speed shape 0.58 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 10 | 48 big moves: 22 with anticipation, 26 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.14 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 38 cm/s |
| 7 Snaps and pops | 0 | 133 body snaps or pops, 113 finger snaps in 16.97 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 13 deg, spread 13 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.33** (7.33 s, f220) LeftUpperLeg: LeftUpperLeg jumps 18 deg in one frame (also snap)
- **0:06.40** (6.4 s, f192) RightLowerLeg: RightLowerLeg jumps 25 deg in one frame
- **0:06.10** (6.1 s, f183) RightFoot: RightFoot jumps 18 deg in one frame
- **0:04.70** (4.7 s, f141) RightLowerArm: RightLowerArm jumps 20 deg in one frame
- **0:02.70** (2.7 s, f81) LeftHand: LeftHand jumps 35 deg in one frame
