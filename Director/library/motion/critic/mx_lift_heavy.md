# Motion critic: mx_lift_heavy

346 frames at 30 fps (11.5 s). **Total 8.1/10: passable, weak on snaps and overlap (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 13 moves, 8% straight lines |
| 2 Slow in and out | 6.7 | speed shape 0.67 (bell 0.6, constant 1.0), 41% of moves start or stop in one frame |
| 3 Timing | 7.5 | 3 holds (median 0.93 s), 0% of frames dead still, fast parts median 0.8 s |
| 4 Anticipation and follow-through | 8.6 | 13 big moves: 6 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 6.1 | parts' speed profiles agree 0.66 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.1 | 0 centre-of-mass jerks, planted feet slide 13 cm/s |
| 7 Snaps and pops | 3.5 | 6 body snaps or pops, 15 finger snaps in 11.5 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 29 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.83** (7.83 s, f235) LeftLowerArm: LeftLowerArm jumps 14 deg in one frame (also snap)
- **0:00.77** (0.77 s, f23) LeftLowerLeg: LeftLowerLeg jumps 11 deg in one frame (also snap, no-prep)
- **0:00.37** (0.37 s, f11) LeftHand: LeftHand travels 69 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:03.77** (3.77 s, f113) Head: Head moves at one speed for 0.87 s (flat 0.92): interpolation, not a move
- **0:01.60** (1.6 s, f48) LeftHand: LeftHand starts at 86% of its peak speed in one frame
