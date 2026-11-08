# Motion critic: mx_hh_shimmy

360 frames at 30 fps (11.97 s). **Total 8.3/10: passable, weak on snaps and anticipation (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.42 over 20 moves, 0% straight lines |
| 2 Slow in and out | 7.4 | speed shape 0.52 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 7.3 | 14 big moves: 2 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.1 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 31 cm/s |
| 7 Snaps and pops | 0 | 151 body snaps or pops, 15 finger snaps in 11.97 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.84 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 17 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.27** (0.27 s, f8) LeftUpperArm: LeftUpperArm jumps 23 deg in one frame
- **0:00.53** (0.53 s, f16) LeftUpperArm: LeftUpperArm jumps 21 deg in one frame (also snap)
- **0:01.13** (1.13 s, f34) LeftUpperArm: LeftUpperArm jumps 21 deg in one frame
- **0:02.57** (2.57 s, f77) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame
- **0:04.17** (4.17 s, f125) LeftUpperArm: LeftUpperArm jumps 18 deg in one frame
