# Motion critic: cmu_126_06_glide

55 frames at 30 fps (1.8 s), judged as zero-g. **Total 9.1/10: reads as human (9.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.47 over 7 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.55 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 7 big moves: 3 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.27 (1 = everything moves as one); typical lag between parts 6 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 8 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.8 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.71 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.48 robust z from 174 mocap clips; furthest: moveRate high (1.15), handSpeedP95 high (0.79), armOmegaP95 high (0.78) |

## Worst moments

- **0:01.50** (1.5 s, f45) body: in zero-g the body changes speed by 0.45 m/s with nothing to push on (also speed-change)
- **0:00.10** (0.1 s, f3) body: in zero-g the body changes speed by 0.35 m/s with nothing to push on (also speed-change, no-prep, abrupt-start)
- **0:00.70** (0.7 s, f21) body: in zero-g the body changes speed by 0.34 m/s with nothing to push on (also speed-change)
- **0:00.40** (0.4 s, f12) body: in zero-g the body changes speed by 0.25 m/s with nothing to push on
- **0:01.80** (1.8 s, f54) LeftHand: LeftHand stops dead from 100% of its peak
