# Motion critic: mx_rib_pops

102 frames at 30 fps (3.37 s). **Total 7.9/10: passable, weak on snaps and overlap (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 9.5 | speed shape 0.42 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.24 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 36 cm/s |
| 7 Snaps and pops | 0 | 35 body snaps or pops, 5 finger snaps in 3.37 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 7 key poses, readability 0.76 (best of front, side, three-quarter), 29% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.40** (1.4 s, f42) RightUpperArm: RightUpperArm jumps 22 deg in one frame
- **0:02.93** (2.93 s, f88) LeftLowerArm: LeftLowerArm jumps 23 deg in one frame
- **0:03.33** (3.33 s, f100) LeftLowerArm: LeftLowerArm jumps 25 deg in one frame
- **0:00.13** (0.13 s, f4) LeftHand: LeftHand jumps 20 deg in one frame
- **0:01.03** (1.03 s, f31) LeftHand: LeftHand jumps 25 deg in one frame
