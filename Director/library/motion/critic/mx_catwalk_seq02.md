# Motion critic: mx_catwalk_seq02

366 frames at 30 fps (12.17 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.44 over 25 moves, 0% straight lines |
| 2 Slow in and out | 7.3 | speed shape 0.53 (bell 0.6, constant 1.0), 45% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.1 | 20 big moves: 7 with anticipation, 13 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.13 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 59 body snaps or pops in 12.17 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 16 key poses, readability 0.79 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.90** (7.9 s, f237) LeftFoot: LeftFoot jumps 21 deg in one frame
- **0:10.80** (10.8 s, f324) LeftFoot: LeftFoot jumps 16 deg in one frame
- **0:00.40** (0.4 s, f12) RightFoot: RightFoot jumps 15 deg in one frame
- **0:11.40** (11.4 s, f342) RightFoot: RightFoot jumps 15 deg in one frame
- **0:10.20** (10.2 s, f306) RightFoot: RightFoot jumps 14 deg in one frame
