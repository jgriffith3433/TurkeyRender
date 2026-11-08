# Motion critic: mx_catwalk_stop_twist

76 frames at 30 fps (2.5 s). **Total 7.9/10: passable, weak on anticipation and ease (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.8 over 2 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.61 (bell 0.6, constant 1.0), 70% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.3 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 0 | 1 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 4 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 5 | 1 body snaps or pops in 2.5 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.60** (0.6 s, f18) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame (also abrupt-stop)
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot starts at 100% of its peak speed in one frame (also abrupt-start)
- **0:01.50** (1.5 s, f45) RightHand: RightHand starts at 75% of its peak speed in one frame
- **0:00.93** (0.93 s, f28) Head: Head starts at 69% of its peak speed in one frame (also abrupt-stop)
- **0:02.13** (2.13 s, f64) RightHand: RightHand starts at 78% of its peak speed in one frame
