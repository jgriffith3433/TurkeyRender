# Motion critic: ps_zg_throw_recoil_a

150 frames at 30 fps (4.97 s), judged as zero-g. **Total 6.8/10: looks animated, not acted: anticipation and stiffness give it away (6.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.54 over 4 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.6 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 2.8 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 0 | 1 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.9 | parts' speed profiles agree 0.83 (1 = everything moves as one); typical lag between parts 1 frames; 20% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.97 s |
| 8 Stiffness | 2.6 | 26% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder, LeftUpperArm |
| 9 Silhouette | 10 | 10 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.4 | 1.93 robust z from 174 mocap clips; furthest: energyCV high (3.97), legOmegaP95 low (3.09), headOmegaP50 low (3) |

## Worst moments

- **0:00.93** (0.93 s, f28) body: 4 of 5 parts peak on the same frame (everything moves as one) (also abrupt-start, abrupt-stop)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame
