# Motion critic: mx_stairs_up_2

37 frames at 30 fps (1.2 s). **Total 7.6/10: passable, weak on snaps and anticipation (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.62 over 4 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.39 (bell 0.6, constant 1.0), 14% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 4 big moves: 2 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 5 | 1 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 7 body snaps or pops in 1.2 s |
| 8 Stiffness | 10 | 12% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.10** (1.1 s, f33) RightLowerLeg: RightLowerLeg jumps 14 deg in one frame (also snap)
- **0:00.50** (0.5 s, f15) LeftLowerLeg: LeftLowerLeg jumps 14 deg in one frame (also snap, com-spike)
- **0:00.03** (0.03 s, f1) RightFoot: RightFoot starts at 66% of its peak speed in one frame
