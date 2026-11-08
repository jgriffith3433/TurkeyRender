# Motion critic: mx_happy_walk

34 frames at 30 fps (1.1 s). **Total 7.8/10: passable, weak on snaps and anticipation (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.52 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.62 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 2 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.4 | parts' speed profiles agree 0.45 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 25 body snaps or pops in 1.1 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.83** (0.83 s, f25) LeftLowerArm: LeftLowerArm jumps 28 deg in one frame (also snap, no-prep)
- **0:00.37** (0.37 s, f11) RightToes: RightToes jumps 24 deg in one frame (also snap)
- **0:01.10** (1.1 s, f33) RightHand: RightHand stops dead from 72% of its peak (also abrupt-stop)
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot starts at 88% of its peak speed in one frame (also abrupt-start)
