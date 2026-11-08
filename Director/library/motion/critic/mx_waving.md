# Motion critic: mx_waving

17 frames at 30 fps (0.53 s). **Total 9/10: reads as human (9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 3.8 | speed shape 0.69 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.23 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 9.3 | 0 centre-of-mass jerks, planted feet slide 11 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 0.53 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 1 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 7 deg, spread 6 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.03** (0.03 s, f1) RightHand: RightHand starts at 82% of its peak speed in one frame (also abrupt-start, abrupt-stop)
- **0:00.53** (0.53 s, f16) RightHand: RightHand stops dead from 96% of its peak (also abrupt-stop)
