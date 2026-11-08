# Motion critic: mx_samba_pocoto

837 frames at 30 fps (27.87 s). **Total 8.8/10: reads as human (8.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.52 over 63 moves, 0% straight lines |
| 2 Slow in and out | 7.6 | speed shape 0.58 (bell 0.6, constant 1.0), 41% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.8 | 44 big moves: 19 with anticipation, 27 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.06 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 246 body snaps or pops, 67 finger snaps in 27.87 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:26.70** (26.7 s, f801) LeftUpperArm: LeftUpperArm jumps 18 deg in one frame
- **0:22.80** (22.8 s, f684) RightUpperArm: RightUpperArm jumps 19 deg in one frame (also snap)
- **0:01.43** (1.43 s, f43) RightLowerArm: RightLowerArm jumps 23 deg in one frame
- **0:02.07** (2.07 s, f62) RightLowerArm: RightLowerArm jumps 19 deg in one frame
- **0:03.27** (3.27 s, f98) RightLowerArm: RightLowerArm jumps 18 deg in one frame
