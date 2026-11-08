# Motion critic: mx_hh_quake

475 frames at 30 fps (15.8 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 5.07 over 5 moves, 0% straight lines |
| 2 Slow in and out | 8.8 | speed shape 0.38 (bell 0.6, constant 1.0), 28% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 1 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.25 (1 = everything moves as one); typical lag between parts 0 frames; 13% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 55 cm/s |
| 7 Snaps and pops | 0 | 177 body snaps or pops, 8 finger snaps in 15.8 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 16 key poses, readability 0.79 (best of front, side, three-quarter), 44% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 11 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.17** (1.17 s, f35) RightUpperLeg: RightUpperLeg jumps 18 deg in one frame
- **0:12.53** (12.53 s, f376) Chest: Chest jumps 21 deg in one frame (also snap)
- **0:00.43** (0.43 s, f13) RightUpperArm: RightUpperArm jumps 20 deg in one frame
- **0:12.90** (12.9 s, f387) RightUpperArm: RightUpperArm jumps 22 deg in one frame
- **0:04.70** (4.7 s, f141) LeftLowerArm: LeftLowerArm jumps 18 deg in one frame
