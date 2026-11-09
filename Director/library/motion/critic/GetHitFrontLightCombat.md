# Motion critic: GetHitFrontLightCombat

17 frames at 30 fps (0.53 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.48 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 3.6 | parts' speed profiles agree 0.52 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 31 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 0.53 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 1 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 73 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.89 robust z from 174 mocap clips; furthest: moveRate high (1.6), spineToArm high (1.35), headOmegaP50 high (1.24) |

## Worst moments

- **0:00.03** (0.03 s, f1) Head: Head starts at 100% of its peak speed in one frame (also abrupt-start)
- **0:00.53** (0.53 s, f16) Head: Head stops dead from 67% of its peak (also abrupt-stop)
