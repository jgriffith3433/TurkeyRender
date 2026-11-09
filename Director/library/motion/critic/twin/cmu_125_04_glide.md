# Motion critic: cmu_125_04_glide

97 frames at 30 fps (3.2 s), judged as zero-g. **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.38 over 6 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.68 (bell 0.6, constant 1.0), 45% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.33 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 3 | 3 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 7.9 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.7 | 0 centre-of-mass jerks, 1 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.2 s |
| 8 Stiffness | 9.9 | 13% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.73 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.79 robust z from 174 mocap clips; furthest: handSpeedP95 low (1.23), legOmegaP95 low (0.96), armOmegaP95 low (0.94) |

## Worst moments

- **0:02.50** (2.5 s, f75) body: in zero-g the body changes speed by 0.25 m/s with nothing to push on
- **0:00.03** (0.03 s, f1) Head: the head hangs 43 deg forward of the chest (also abrupt-start)
- **0:00.37** (0.37 s, f11) Head: Head starts at 85% of its peak speed in one frame (also abrupt-stop)
