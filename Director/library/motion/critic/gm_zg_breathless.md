# Motion critic: gm_zg_breathless

112 frames at 30 fps (3.7 s), judged as zero-g. **Total 7.4/10: passable, weak on ease and overlap (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 5.9 | median bend 0.1 over 11 moves, 0% straight lines |
| 2 Slow in and out | 2.3 | speed shape 0.77 (bell 0.6, constant 1.0), 73% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 1.43 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 4 | 6 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 3.2 | parts' speed profiles agree 0.8 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.7 s |
| 8 Stiffness | 9.5 | 14% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 7 key poses, readability 0.66 (best of front, side, three-quarter), 43% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.27** (3.27 s, f98) LeftFoot: LeftFoot travels 32 cm with no anticipation and no overshoot or settle
- **0:00.03** (0.03 s, f1) RightFoot: RightFoot moves at one speed for 0.43 s (flat 0.89): interpolation, not a move (also abrupt-start)
- **0:00.63** (0.63 s, f19) RightFoot: RightFoot starts at 63% of its peak speed in one frame (also abrupt-stop, abrupt-start)
- **0:01.43** (1.43 s, f43) RightHand: RightHand stops dead from 66% of its peak
- **0:01.90** (1.9 s, f57) Head: Head starts at 76% of its peak speed in one frame
