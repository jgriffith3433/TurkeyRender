# Motion critic: mx_throw

67 frames at 30 fps (2.2 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.26 over 4 moves, 0% straight lines |
| 2 Slow in and out | 8 | speed shape 0.56 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 10 | 4 big moves: 3 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 5.8 | parts' speed profiles agree 0.68 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.9 | 0 centre-of-mass jerks, planted feet slide 15 cm/s |
| 7 Snaps and pops | 0 | 12 body snaps or pops, 29 finger snaps in 2.2 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 13 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.90** (0.9 s, f27) RightUpperArm: RightUpperArm jumps 22 deg in one frame (also snap, pop)
- **0:00.63** (0.63 s, f19) LeftLowerArm: LeftLowerArm jumps 10 deg in one frame
- **0:01.17** (1.17 s, f35) RightHand: RightHand starts at 80% of its peak speed in one frame
- **0:01.43** (1.43 s, f43) RightHand: RightHand stops dead from 67% of its peak (also abrupt-start)
- **0:01.70** (1.7 s, f51) LeftFoot: LeftFoot stops dead from 84% of its peak
