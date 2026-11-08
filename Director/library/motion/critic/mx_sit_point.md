# Motion critic: mx_sit_point

91 frames at 30 fps (3 s). **Total 7.2/10: passable, weak on snaps and overlap (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 5.4 | median bend 0.09 over 4 moves, 0% straight lines |
| 2 Slow in and out | 6.6 | speed shape 0.69 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.03 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 8.2 | 4 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 2.8 | parts' speed profiles agree 0.84 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.5 | 0 centre-of-mass jerks, planted feet slide 8 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops, 10 finger snaps in 3 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 16 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.20** (0.2 s, f6) RightHand: RightHand jumps 17 deg in one frame (also snap, abrupt-start)
- **0:02.20** (2.2 s, f66) RightLowerArm: RightLowerArm jumps 16 deg in one frame (also abrupt-start)
- **0:02.47** (2.47 s, f74) RightFoot: RightFoot starts at 82% of its peak speed in one frame (also abrupt-stop)
