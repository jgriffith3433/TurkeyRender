# Motion critic: ps_zg_startle_a

251 frames at 30 fps (8.33 s), judged as zero-g. **Total 7.3/10: passable, weak on stiffness and anticipation (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.26 over 5 moves, 0% straight lines |
| 2 Slow in and out | 9.5 | speed shape 0.19 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 6 | 2 holds (median 5.4 s), 0% of frames dead still, fast parts median 1.87 s |
| 4 Anticipation and follow-through | 4 | 5 big moves: 3 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 5.3 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9 | 0 centre-of-mass jerks, 2 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 8.33 s |
| 8 Stiffness | 3.4 | 29% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.85 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 5.4 | 2.12 robust z from 174 mocap clips; furthest: headOmegaP50 low (5), energyCV high (5), spineToArm high (2.68) |

## Worst moments

- **0:01.10** (1.1 s, f33) body: in zero-g the body changes speed by 0.53 m/s with nothing to push on (also speed-change, no-prep, abrupt-start)
