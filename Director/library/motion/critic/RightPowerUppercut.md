# Motion critic: RightPowerUppercut

43 frames at 30 fps (1.4 s). **Total 8/10: passable, weak on snaps and anticipation (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.39 over 10 moves, 0% straight lines |
| 2 Slow in and out | 6.4 | speed shape 0.65 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 8 big moves: 2 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 6.9 | parts' speed profiles agree 0.58 (1 = everything moves as one); typical lag between parts 3 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 32 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 1.4 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 73 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.83 robust z from 174 mocap clips; furthest: handSpeedP95 high (1.45), moveRate high (1.19), armOmegaP95 high (1.16) |

## Worst moments

- **0:00.30** (0.3 s, f9) RightHand: RightHand moves 23 cm in one frame (also pop)
- **0:01.00** (1 s, f30) RightHand: RightHand travels 61 cm with no anticipation and no overshoot or settle (also abrupt-stop)
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand travels 41 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:01.40** (1.4 s, f42) Head: Head stops dead from 89% of its peak (also abrupt-stop)
