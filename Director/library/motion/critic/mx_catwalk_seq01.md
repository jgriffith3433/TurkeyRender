# Motion critic: mx_catwalk_seq01

439 frames at 30 fps (14.6 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.51 over 25 moves, 0% straight lines |
| 2 Slow in and out | 6.5 | speed shape 0.61 (bell 0.6, constant 1.0), 53% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 23 big moves: 14 with anticipation, 10 with overshoot and settle |
| 5 Overlap and drag | 9.1 | parts' speed profiles agree 0.38 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 56 body snaps or pops in 14.6 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.79 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 11 deg, spread 21 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.27** (3.27 s, f98) LeftFoot: LeftFoot jumps 22 deg in one frame
- **0:12.03** (12.03 s, f361) LeftFoot: LeftFoot jumps 18 deg in one frame
- **0:00.40** (0.4 s, f12) RightFoot: RightFoot jumps 14 deg in one frame
- **0:11.47** (11.47 s, f344) RightFoot: RightFoot jumps 15 deg in one frame
- **0:14.17** (14.17 s, f425) RightUpperLeg: RightUpperLeg jumps 14 deg in one frame
