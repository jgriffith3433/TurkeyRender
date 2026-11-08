# Motion critic: mx_rumba

72 frames at 30 fps (2.37 s). **Total 7.7/10: passable, weak on snaps and anticipation (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.52 over 4 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.54 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 2 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.06 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 67 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 2.37 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.07** (0.07 s, f2) LeftFoot: LeftFoot jumps 12 deg in one frame (also snap)
- **0:00.87** (0.87 s, f26) LeftFoot: LeftFoot jumps 11 deg in one frame (also snap)
- **0:01.27** (1.27 s, f38) RightFoot: RightFoot jumps 9 deg in one frame
- **0:01.67** (1.67 s, f50) RightFoot: RightFoot jumps 9 deg in one frame
- **0:02.00** (2 s, f60) RightFoot: RightFoot jumps 8 deg in one frame
