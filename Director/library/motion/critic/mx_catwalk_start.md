# Motion critic: mx_catwalk_start

41 frames at 30 fps (1.33 s). **Total 8.1/10: passable, weak on snaps and ease (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 3 moves, 0% straight lines |
| 2 Slow in and out | 2.9 | speed shape 0.74 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.7 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0.6 | 1 body snaps or pops in 1.33 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 13 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.20** (1.2 s, f36) LeftLowerLeg: LeftLowerLeg jumps 10 deg in one frame (also abrupt-stop)
- **0:00.60** (0.6 s, f18) LeftFoot: LeftFoot starts at 79% of its peak speed in one frame (also abrupt-stop, abrupt-start)
