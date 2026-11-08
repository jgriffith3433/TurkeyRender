# Motion critic: hp_r1_pull

69 frames at 30 fps (2.27 s), judged as zero-g. **Total 6.5/10: looks animated, not acted: overlap and snaps give it away (6.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.16 over 10 moves, 0% straight lines |
| 2 Slow in and out | 8.8 | speed shape 0.36 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 1.2 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 6 | 10 big moves: 0 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.95 (1 = everything moves as one); typical lag between parts 0 frames; 17% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 18 body snaps or pops in 2.27 s |
| 8 Stiffness | 5 | 14% of core joints frozen while the body moves; never moves: Head, LeftShoulder, RightShoulder |
| 9 Silhouette | 8.5 | 5 key poses, readability 0.64 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 73 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.80** (0.8 s, f24) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, speed-change, pop, no-prep)
- **0:00.40** (0.4 s, f12) body: in zero-g the body changes speed by 0.5 m/s with nothing to push on (also snap, no-prep)
