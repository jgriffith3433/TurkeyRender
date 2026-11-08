# Motion critic: mx_body_wave

213 frames at 30 fps (7.07 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.57 over 11 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.51 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 7.3 | 9 big moves: 8 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.05 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.6 | 0 centre-of-mass jerks, planted feet slide 29 cm/s |
| 7 Snaps and pops | 0 | 64 body snaps or pops in 7.07 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 14 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 8 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.00** (2 s, f60) LeftUpperArm: LeftUpperArm jumps 25 deg in one frame
- **0:00.20** (0.2 s, f6) RightUpperArm: RightUpperArm jumps 19 deg in one frame
- **0:02.90** (2.9 s, f87) RightUpperArm: RightUpperArm jumps 18 deg in one frame
- **0:03.20** (3.2 s, f96) RightUpperArm: RightUpperArm jumps 23 deg in one frame
- **0:06.50** (6.5 s, f195) RightLowerArm: RightLowerArm jumps 19 deg in one frame
