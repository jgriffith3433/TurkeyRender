# Motion critic: mx_locking

511 frames at 30 fps (17 s). **Total 8.4/10: passable, weak on snaps and overlap (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.19 over 72 moves, 4% straight lines |
| 2 Slow in and out | 7.7 | speed shape 0.6 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 55 big moves: 28 with anticipation, 43 with overshoot and settle |
| 5 Overlap and drag | 7 | parts' speed profiles agree 0.45 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 273 body snaps or pops, 103 finger snaps in 17 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 17 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.20** (7.2 s, f216) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:07.47** (7.47 s, f224) LeftLowerLeg: LeftLowerLeg jumps 20 deg in one frame
- **0:10.90** (10.9 s, f327) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:12.07** (12.07 s, f362) LeftLowerLeg: LeftLowerLeg jumps 21 deg in one frame
- **0:12.33** (12.33 s, f370) LeftLowerLeg: LeftLowerLeg jumps 20 deg in one frame
