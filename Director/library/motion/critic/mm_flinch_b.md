# Motion critic: mm_flinch_b

47 frames at 30 fps (1.53 s). **Total 7.3/10: passable, weak on anticipation and overlap (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 9.1 | median bend 0.13 over 5 moves, 20% straight lines |
| 2 Slow in and out | 5 | speed shape 0.52 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.63 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 1.2 | parts' speed profiles agree 0.74 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.7 | 0 centre-of-mass jerks, planted feet slide 28 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 1.53 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 3 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9.9 | 1.22 robust z from 174 mocap clips; furthest: spineToArm high (2.66), armOmegaP95 low (1.49), armAccP95 low (1.44) |

## Worst moments

- **0:00.03** (0.03 s, f1) LeftFoot: LeftFoot travels 31 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:01.00** (1 s, f30) RightFoot: RightFoot starts at 85% of its peak speed in one frame (also abrupt-stop)
