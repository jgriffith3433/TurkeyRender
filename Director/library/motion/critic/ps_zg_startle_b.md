# Motion critic: ps_zg_startle_b

180 frames at 30 fps (5.97 s), judged as zero-g. **Total 7.2/10: passable, weak on stiffness and overlap (7.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 8 moves, 0% straight lines |
| 2 Slow in and out | 5.2 | speed shape 0.71 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 6 | 2 holds (median 3.1 s), 0% of frames dead still, fast parts median 1.87 s |
| 4 Anticipation and follow-through | 7.8 | 8 big moves: 6 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 4.3 | parts' speed profiles agree 0.7 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 7.9 | 1 body snaps or pops in 5.97 s |
| 8 Stiffness | 3.2 | 30% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.9 | 12 key poses, readability 0.86 (best of front, side, three-quarter), 8% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 8 | 1.61 robust z from 174 mocap clips; furthest: energyCV high (5), headOmegaP50 low (1.91), legOmegaP95 low (1.71) |

## Worst moments

- **0:01.30** (1.3 s, f39) body: in zero-g the body changes speed by 0.41 m/s with nothing to push on (also snap, speed-change)
- **0:01.00** (1 s, f30) body: in zero-g the body changes speed by 0.29 m/s with nothing to push on
- **0:02.40** (2.4 s, f72) LeftFoot: LeftFoot moves at one speed for 3 s (flat 0.88): interpolation, not a move
- **0:05.97** (5.97 s, f179) Head: Head stops dead from 100% of its peak
- **0:04.70** (4.7 s, f141) LeftHand: LeftHand starts at 64% of its peak speed in one frame
