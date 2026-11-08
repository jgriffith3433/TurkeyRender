# Motion critic: mx_slide_walk

30 frames at 30 fps (0.97 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.63 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.62 (bell 0.6, constant 1.0), 83% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 10 | 2 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree -0.04 (1 = everything moves as one); typical lag between parts 5 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 9 body snaps or pops in 0.97 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 6 deg, spread 16 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.30** (0.3 s, f9) RightFoot: RightFoot jumps 18 deg in one frame (also snap)
- **0:00.80** (0.8 s, f24) LeftFoot: LeftFoot jumps 16 deg in one frame (also snap, abrupt-stop, abrupt-start)
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot starts at 66% of its peak speed in one frame
