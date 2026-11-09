# Motion critic: mm_catch_brace

101 frames at 30 fps (3.33 s). **Total 7.6/10: passable, weak on ease and arcs (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 4.6 | median bend 0.08 over 3 moves, 0% straight lines |
| 2 Slow in and out | 0 | speed shape 0.95 (bell 0.6, constant 1.0), 80% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.37 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 8 | 3 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.17 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 32 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.33 s |
| 8 Stiffness | 7.1 | 19% of core joints frozen while the body moves; never moves: Head |
| 9 Silhouette | 8.5 | 7 key poses, readability 0.69 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8.2 | 1.56 robust z from 174 mocap clips; furthest: handSpeedP95 low (2.68), moveRate low (2.17), headOmegaP95 low (2.07) |

## Worst moments

- **0:00.20** (0.2 s, f6) RightFoot: RightFoot travels 64 cm with no anticipation and no overshoot or settle (also bowed-head, abrupt-start, abrupt-stop)
- **0:02.47** (2.47 s, f74) LeftFoot: LeftFoot stops dead from 73% of its peak
- **0:03.17** (3.17 s, f95) LeftFoot: LeftFoot starts at 88% of its peak speed in one frame (also abrupt-stop)
- **0:01.13** (1.13 s, f34) RightFoot: RightFoot starts at 99% of its peak speed in one frame (also abrupt-stop)
- **0:01.53** (1.53 s, f46) RightFoot: RightFoot starts at 95% of its peak speed in one frame
