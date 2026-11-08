# Motion critic: mx_blow_kiss

139 frames at 30 fps (4.6 s). **Total 8.2/10: passable, weak on ease and anticipation (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 6 moves, 0% straight lines |
| 2 Slow in and out | 3.5 | speed shape 0.8 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.7 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 3.6 | 5 big moves: 2 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 6.7 | parts' speed profiles agree 0.48 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.6 s |
| 8 Stiffness | 8.4 | 20% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.27** (0.27 s, f8) LeftHand: LeftHand travels 51 cm with no anticipation and no overshoot or settle (also no-prep, abrupt-start)
- **0:02.97** (2.97 s, f89) RightHand: RightHand travels 31 cm with no anticipation and no overshoot or settle
- **0:02.63** (2.63 s, f79) Head: Head moves at one speed for 1.07 s (flat 0.89): interpolation, not a move
- **0:01.53** (1.53 s, f46) RightHand: RightHand starts at 86% of its peak speed in one frame (also abrupt-stop)
- **0:00.63** (0.63 s, f19) Head: Head stops dead from 100% of its peak
