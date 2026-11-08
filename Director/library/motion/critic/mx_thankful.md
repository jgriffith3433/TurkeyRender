# Motion critic: mx_thankful

91 frames at 30 fps (3 s). **Total 7.9/10: passable, weak on anticipation and snaps (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 4 moves, 0% straight lines |
| 2 Slow in and out | 8.6 | speed shape 0.67 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.47 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.25 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 5.8 | 1 body snaps or pops, 1 finger snaps in 3 s |
| 8 Stiffness | 6.9 | 20% of core joints frozen while the body moves; never moves: RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 18 deg, spread 33 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.40** (0.4 s, f12) RightLowerArm: RightLowerArm jumps 18 deg in one frame
- **0:01.63** (1.63 s, f49) RightHand: RightHand travels 46 cm with no anticipation and no overshoot or settle (also abrupt-stop)
- **0:00.10** (0.1 s, f3) RightHand: RightHand travels 44 cm with no anticipation and no overshoot or settle
- **0:01.20** (1.2 s, f36) LeftHand: LeftHand starts at 70% of its peak speed in one frame
