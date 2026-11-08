# Motion critic: mx_sad_walk

45 frames at 30 fps (1.47 s). **Total 8/10: passable, weak on snaps and anticipation (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.32 over 2 moves, 0% straight lines |
| 2 Slow in and out | 7.5 | speed shape 0.58 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4 | 2 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.09 (1 = everything moves as one); typical lag between parts 5 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 7 body snaps or pops, 1 finger snaps in 1.47 s |
| 8 Stiffness | 9.6 | 14% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.74 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 87% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 12 deg in one frame (also snap, abrupt-start)
- **0:00.83** (0.83 s, f25) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame (also snap)
- **0:00.40** (0.4 s, f12) RightFoot: RightFoot jumps 10 deg in one frame
- **0:01.13** (1.13 s, f34) LeftFoot: LeftFoot jumps 9 deg in one frame (also snap)
- **0:01.47** (1.47 s, f44) LeftFoot: LeftFoot stops dead from 100% of its peak
