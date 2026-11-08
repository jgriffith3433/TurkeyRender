# Motion critic: mx_northern_soul

483 frames at 30 fps (16.07 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.19 over 56 moves, 2% straight lines |
| 2 Slow in and out | 8.9 | speed shape 0.6 (bell 0.6, constant 1.0), 27% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 8.5 | 51 big moves: 22 with anticipation, 16 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.19 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 49 cm/s |
| 7 Snaps and pops | 0 | 186 body snaps or pops, 21 finger snaps in 16.07 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 16 key poses, readability 0.79 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 26 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:10.40** (10.4 s, f312) LeftUpperLeg: LeftUpperLeg jumps 21 deg in one frame (also snap)
- **0:05.60** (5.6 s, f168) LeftLowerLeg: LeftLowerLeg jumps 25 deg in one frame
- **0:03.90** (3.9 s, f117) LeftFoot: LeftFoot jumps 20 deg in one frame
- **0:04.20** (4.2 s, f126) LeftFoot: LeftFoot jumps 19 deg in one frame (also snap)
- **0:05.03** (5.03 s, f151) LeftFoot: LeftFoot jumps 19 deg in one frame
