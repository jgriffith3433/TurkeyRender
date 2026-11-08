# Motion critic: mx_stairs_up

42 frames at 30 fps (1.37 s). **Total 7.1/10: passable, weak on snaps and overlap (7.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.61 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5.7 | speed shape 0.5 (bell 0.6, constant 1.0), 63% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 4 | 2 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.2 | parts' speed profiles agree 0.65 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 7 body snaps or pops in 1.37 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.75 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 10 | fingers curl 37 deg, spread 37 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.23** (1.23 s, f37) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame (also snap, abrupt-stop)
- **0:00.57** (0.57 s, f17) RightLowerLeg: RightLowerLeg jumps 16 deg in one frame (also snap)
- **0:00.03** (0.03 s, f1) Head: Head starts at 99% of its peak speed in one frame (also abrupt-stop)
