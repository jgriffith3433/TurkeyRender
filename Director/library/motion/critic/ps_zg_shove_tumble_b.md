# Motion critic: ps_zg_shove_tumble_b

240 frames at 30 fps (7.97 s), judged as zero-g. **Total 7.2/10: passable, weak on stiffness and weight (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.39 over 15 moves, 20% straight lines |
| 2 Slow in and out | 8.9 | speed shape 0.59 (bell 0.6, constant 1.0), 27% of moves start or stop in one frame |
| 3 Timing | 10 | 6 holds (median 0.53 s), 0% of frames dead still, fast parts median 0.2 s |
| 4 Anticipation and follow-through | 10 | 15 big moves: 7 with anticipation, 10 with overshoot and settle |
| 5 Overlap and drag | 4.7 | parts' speed profiles agree 0.42 (1 = everything moves as one); typical lag between parts 0 frames; 25% of energy peaks have every part peaking together |
| 6 Weight | 2.5 | 8 centre-of-mass jerks, 55 speed changes with no push (zero-g) |
| 7 Snaps and pops | 8.4 | 1 body snaps or pops in 7.97 s |
| 8 Stiffness | 0 | 48% of core joints frozen while the body moves; never moves: Spine, LeftShoulder, RightShoulder, LeftUpperArm, RightUpperLeg |
| 9 Silhouette | 10 | 6 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.4 | 1.93 robust z from 174 mocap clips; furthest: energyCV high (3.59), legOmegaP95 low (3.04), armOmegaP95 low (2.54) |

## Worst moments

- **0:02.10** (2.1 s, f63) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, com-spike)
- **0:06.17** (6.17 s, f185) LeftFoot: LeftFoot travels 170 cm in a straight line (bend 0.03)
- **0:00.70** (0.7 s, f21) body: in zero-g the body changes speed by 0.4 m/s with nothing to push on (also speed-change)
- **0:01.00** (1 s, f30) body: in zero-g the body changes speed by 0.61 m/s with nothing to push on (also speed-change)
- **0:01.40** (1.4 s, f42) body: in zero-g the body changes speed by 1.99 m/s with nothing to push on
