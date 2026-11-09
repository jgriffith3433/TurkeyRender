# Motion critic: mm_cross_punch_a

251 frames at 30 fps (8.33 s). **Total 7.8/10: passable, weak on anticipation and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.9 over 5 moves, 0% straight lines |
| 2 Slow in and out | 5.9 | speed shape 0.31 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 6 | 1 holds (median 6.5 s), 0% of frames dead still, fast parts median 1.8 s |
| 4 Anticipation and follow-through | 5 | 3 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5.4 | parts' speed profiles agree 0.72 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.8 | 0 centre-of-mass jerks, planted feet slide 16 cm/s |
| 7 Snaps and pops | 8.5 | 1 body snaps or pops in 8.33 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.72 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7 | 1.8 robust z from 174 mocap clips; furthest: handSpeedP50 low (5), energyCV high (5), moveRate low (2.5) |

## Worst moments

- **0:00.07** (0.07 s, f2) RightToes: RightToes jumps 9 deg in one frame (also abrupt-start)
- **0:01.83** (1.83 s, f55) LeftFoot: LeftFoot stops dead from 65% of its peak (also abrupt-stop)
