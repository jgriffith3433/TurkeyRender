# Motion critic: mx_sit_to_stand_2

146 frames at 30 fps (4.83 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.21 over 5 moves, 0% straight lines |
| 2 Slow in and out | 8.8 | speed shape 0.58 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.8 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 3 | 5 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 5.4 | parts' speed profiles agree 0.72 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.6 | 0 centre-of-mass jerks, planted feet slide 18 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 4.83 s |
| 8 Stiffness | 10 | 12% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 28 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.70** (0.7 s, f21) LeftFoot: LeftFoot travels 35 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:02.10** (2.1 s, f63) LeftFoot: LeftFoot starts at 79% of its peak speed in one frame
- **0:02.43** (2.43 s, f73) LeftFoot: LeftFoot stops dead from 66% of its peak
