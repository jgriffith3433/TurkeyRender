# Motion critic: mx_catwalk_stop

59 frames at 30 fps (1.93 s). **Total 7.4/10: passable, weak on snaps and ease (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.5 over 5 moves, 0% straight lines |
| 2 Slow in and out | 1.1 | speed shape 0.84 (bell 0.6, constant 1.0), 90% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4 | 1 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.5 | parts' speed profiles agree 0.31 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 1.93 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 15 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.50** (0.5 s, f15) RightFoot: RightFoot jumps 11 deg in one frame (also snap, abrupt-stop)
- **0:00.10** (0.1 s, f3) LeftLowerLeg: LeftLowerLeg jumps 9 deg in one frame (also abrupt-start)
- **0:01.07** (1.07 s, f32) RightFoot: RightFoot moves at one speed for 0.3 s (flat 0.9): interpolation, not a move (also abrupt-start)
- **0:01.37** (1.37 s, f41) RightFoot: RightFoot stops dead from 95% of its peak
- **0:01.77** (1.77 s, f53) RightHand: RightHand starts at 63% of its peak speed in one frame
