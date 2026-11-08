# Motion critic: mx_catwalk_seq05

306 frames at 30 fps (10.17 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.59 over 20 moves, 5% straight lines |
| 2 Slow in and out | 6.4 | speed shape 0.58 (bell 0.6, constant 1.0), 55% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.2 | 14 big moves: 5 with anticipation, 9 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.3 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 68 body snaps or pops in 10.17 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 11 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:08.00** (8 s, f240) LeftLowerLeg: LeftLowerLeg jumps 19 deg in one frame
- **0:09.13** (9.13 s, f274) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame
- **0:03.20** (3.2 s, f96) LeftFoot: LeftFoot jumps 23 deg in one frame
- **0:07.70** (7.7 s, f231) LeftFoot: LeftFoot jumps 22 deg in one frame
- **0:09.97** (9.97 s, f299) LeftFoot: LeftFoot jumps 21 deg in one frame
