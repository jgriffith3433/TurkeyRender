# Motion critic: mx_secret

329 frames at 30 fps (10.93 s). **Total 7.9/10: passable, weak on anticipation and overlap (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.3 | median bend 0.1 over 7 moves, 0% straight lines |
| 2 Slow in and out | 6.7 | speed shape 0.71 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 5 holds (median 0.53 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 2.5 | 6 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5 | parts' speed profiles agree 0.64 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 10.93 s |
| 8 Stiffness | 9.5 | 14% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 27 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:07.30** (7.3 s, f219) Head: Head travels 35 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:01.67** (1.67 s, f50) Head: Head travels 31 cm with no anticipation and no overshoot or settle
- **0:07.87** (7.87 s, f236) LeftFoot: LeftFoot stops dead from 80% of its peak
- **0:09.40** (9.4 s, f282) LeftHand: LeftHand starts at 94% of its peak speed in one frame (also abrupt-stop)
