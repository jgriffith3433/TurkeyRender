# Motion critic: mx_catwalk_to_twist_r

66 frames at 30 fps (2.17 s). **Total 9.3/10: reads as human (9.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.31 over 3 moves, 0% straight lines |
| 2 Slow in and out | 4.5 | speed shape 0.72 (bell 0.6, constant 1.0), 56% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.13 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.11 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.1 | 0 centre-of-mass jerks, planted feet slide 13 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.17 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 14 deg, spread 23 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.20** (0.2 s, f6) RightFoot: RightFoot starts at 62% of its peak speed in one frame
- **0:01.67** (1.67 s, f50) LeftHand: LeftHand starts at 70% of its peak speed in one frame
- **0:02.00** (2 s, f60) LeftHand: LeftHand stops dead from 63% of its peak
- **0:00.93** (0.93 s, f28) RightHand: RightHand starts at 65% of its peak speed in one frame
- **0:01.23** (1.23 s, f37) RightHand: RightHand stops dead from 69% of its peak
