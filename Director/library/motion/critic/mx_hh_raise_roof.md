# Motion critic: mx_hh_raise_roof

125 frames at 30 fps (4.13 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.32 over 2 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.51 (bell 0.6, constant 1.0), 13% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.4 | parts' speed profiles agree 0.41 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 17 body snaps or pops, 8 finger snaps in 4.13 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 8 key poses, readability 0.81 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.33** (2.33 s, f70) LeftLowerArm: LeftLowerArm jumps 18 deg in one frame
- **0:00.73** (0.73 s, f22) RightLowerArm: RightLowerArm jumps 19 deg in one frame (also snap)
- **0:01.73** (1.73 s, f52) RightLowerArm: RightLowerArm jumps 17 deg in one frame
- **0:03.33** (3.33 s, f100) LeftLowerArm: LeftLowerArm jumps 16 deg in one frame
- **0:01.27** (1.27 s, f38) RightLowerArm: RightLowerArm jumps 16 deg in one frame
