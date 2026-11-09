# Motion critic: ps_zg_throw_recoil_b

150 frames at 30 fps (4.97 s), judged as zero-g. **Total 6.9/10: looks animated, not acted: overlap and anticipation give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.17 over 7 moves, 0% straight lines |
| 2 Slow in and out | 6.3 | speed shape 0.47 (bell 0.6, constant 1.0), 56% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.6 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 1.8 | 5 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0.5 | parts' speed profiles agree 0.81 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.97 s |
| 8 Stiffness | 3.7 | 20% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder, LeftUpperArm |
| 9 Silhouette | 10 | 3 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 6.2 | 1.97 robust z from 174 mocap clips; furthest: energyCV high (4.89), spineToArm high (3.33), legOmegaP95 low (2.95) |

## Worst moments

- **0:02.33** (2.33 s, f70) RightFoot: RightFoot travels 43 cm with no anticipation and no overshoot or settle (also no-prep, linear, abrupt-start)
- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 100% of its peak speed in one frame
- **0:00.83** (0.83 s, f25) RightFoot: RightFoot travels 31 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:04.97** (4.97 s, f149) LeftFoot: LeftFoot stops dead from 98% of its peak (also abrupt-stop)
- **0:02.70** (2.7 s, f81) Head: Head stops dead from 92% of its peak
