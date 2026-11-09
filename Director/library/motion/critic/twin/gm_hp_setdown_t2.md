# Motion critic: gm_hp_setdown_t2

120 frames at 30 fps (3.97 s). **Total 9.4/10: reads as human (9.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.18 over 11 moves, 0% straight lines |
| 2 Slow in and out | 7.4 | speed shape 0.71 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.4 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6.7 | 8 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 8.8 | parts' speed profiles agree 0.41 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.97 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 8 key poses, readability 0.58 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.99 robust z from 174 mocap clips; furthest: legOmegaP95 low (2.61), headOmegaP95 low (1.42), headOmegaP50 low (1.04) |

## Worst moments

- **0:01.07** (1.07 s, f32) Head: Head starts at 71% of its peak speed in one frame
- **0:01.43** (1.43 s, f43) Head: Head stops dead from 77% of its peak
