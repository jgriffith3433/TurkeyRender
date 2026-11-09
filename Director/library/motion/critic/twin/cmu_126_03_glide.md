# Motion critic: cmu_126_03_glide

49 frames at 30 fps (1.6 s), judged as zero-g. **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 9 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.6 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 3.6 | 9 big moves: 2 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 6.8 | parts' speed profiles agree 0.59 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 2 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.6 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.73 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.52 robust z from 174 mocap clips; furthest: moveRate high (0.99), headOmegaP50 high (0.85), energyCV high (0.78) |

## Worst moments

- **0:01.50** (1.5 s, f45) body: in zero-g the body changes speed by 0.32 m/s with nothing to push on (also speed-change, abrupt-stop)
- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot travels 76 cm with no anticipation and no overshoot or settle (also abrupt-start, no-prep)
- **0:00.83** (0.83 s, f25) RightFoot: RightFoot travels 34 cm with no anticipation and no overshoot or settle (also linear, abrupt-start)
