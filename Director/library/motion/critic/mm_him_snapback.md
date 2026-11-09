# Motion critic: mm_him_snapback

32 frames at 30 fps (1.03 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.2 | median bend 0.13 over 7 moves, 14% straight lines |
| 2 Slow in and out | 5 | speed shape 0.6 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6.1 | 7 big moves: 5 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 8.5 | parts' speed profiles agree 0.31 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 5 | 1 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.03 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 2 key poses, readability 0.75 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.75 robust z from 174 mocap clips; furthest: headOmegaP95 high (1.28), moveRate high (1.22), armAccP95 high (0.81) |

## Worst moments

- **0:00.77** (0.77 s, f23) RightHand: RightHand travels 48 cm in a straight line (bend 0.01) (also abrupt-stop)
- **0:01.03** (1.03 s, f31) body: the body's centre of mass jerks at 62 m/s^2
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot travels 54 cm with no anticipation and no overshoot or settle (also abrupt-start)
