# Motion critic: mx_hh_twirl

471 frames at 30 fps (15.67 s). **Total 8.4/10: passable, weak on snaps and weight (8.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.51 over 44 moves, 0% straight lines |
| 2 Slow in and out | 9 | speed shape 0.52 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 9.4 | 31 big moves: 12 with anticipation, 14 with overshoot and settle |
| 5 Overlap and drag | 7.7 | parts' speed profiles agree 0.39 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 70 body snaps or pops in 15.67 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.86 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 11 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.27** (1.27 s, f38) LeftUpperArm: LeftUpperArm jumps 17 deg in one frame
- **0:13.90** (13.9 s, f417) RightFoot: RightFoot jumps 14 deg in one frame
- **0:02.00** (2 s, f60) LeftUpperArm: LeftUpperArm jumps 15 deg in one frame
- **0:05.00** (5 s, f150) RightUpperArm: RightUpperArm jumps 14 deg in one frame
- **0:12.47** (12.47 s, f374) LeftFoot: LeftFoot jumps 14 deg in one frame
