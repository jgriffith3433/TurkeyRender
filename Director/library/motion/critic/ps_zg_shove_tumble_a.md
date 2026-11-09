# Motion critic: ps_zg_shove_tumble_a

240 frames at 30 fps (7.97 s), judged as zero-g. **Total 7.1/10: passable, weak on stiffness and weight (7.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.63 over 19 moves, 5% straight lines |
| 2 Slow in and out | 7.3 | speed shape 0.37 (bell 0.6, constant 1.0), 45% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.5 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 9.3 | 19 big moves: 7 with anticipation, 12 with overshoot and settle |
| 5 Overlap and drag | 4.9 | parts' speed profiles agree 0.4 (1 = everything moves as one); typical lag between parts 0 frames; 40% of energy peaks have every part peaking together |
| 6 Weight | 2.5 | 11 centre-of-mass jerks, 53 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 7.97 s |
| 8 Stiffness | 0 | 37% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder, LeftUpperLeg, RightUpperLeg |
| 9 Silhouette | 10 | 3 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 5.7 | 2.06 robust z from 174 mocap clips; furthest: headOmegaP50 low (5), energyCV high (3.25), legOmegaP95 low (3.14) |

## Worst moments

- **0:02.03** (2.03 s, f61) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:05.13** (5.13 s, f154) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:00.70** (0.7 s, f21) body: in zero-g the body changes speed by 0.58 m/s with nothing to push on (also speed-change)
- **0:01.00** (1 s, f30) body: in zero-g the body changes speed by 0.55 m/s with nothing to push on (also speed-change)
- **0:01.30** (1.3 s, f39) body: in zero-g the body changes speed by 0.55 m/s with nothing to push on
