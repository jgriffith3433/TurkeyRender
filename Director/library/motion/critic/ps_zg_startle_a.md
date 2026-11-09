# Motion critic: ps_zg_startle_a

180 frames at 30 fps (5.97 s), judged as zero-g. **Total 8.2/10: passable, weak on overlap and timing (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.42 over 5 moves, 0% straight lines |
| 2 Slow in and out | 9.5 | speed shape 0.14 (bell 0.6, constant 1.0), 20% of moves start or stop in one frame |
| 3 Timing | 6 | 2 holds (median 3.03 s), 0% of frames dead still, fast parts median 1.87 s |
| 4 Anticipation and follow-through | 7 | 5 big moves: 4 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5.7 | parts' speed profiles agree 0.57 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.9 | 0 centre-of-mass jerks, 3 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 5.97 s |
| 8 Stiffness | 7 | 11% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder |
| 9 Silhouette | 9.9 | 12 key poses, readability 0.86 (best of front, side, three-quarter), 8% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 7.8 | 1.64 robust z from 174 mocap clips; furthest: energyCV high (5), spineOmegaP50 low (2.25), moveRate low (2.01) |

## Worst moments

- **0:01.00** (1 s, f30) body: in zero-g the body changes speed by 0.41 m/s with nothing to push on (also speed-change, no-prep)
- **0:01.30** (1.3 s, f39) body: in zero-g the body changes speed by 0.29 m/s with nothing to push on
- **0:05.97** (5.97 s, f179) Head: Head stops dead from 100% of its peak
