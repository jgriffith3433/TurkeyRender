# Motion critic: vm_box_hooks

250 frames at 30 fps (8.3 s). **Total 7.8/10: passable, weak on snaps and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 1.18 over 8 moves, 0% straight lines |
| 2 Slow in and out | 5.3 | speed shape 0.42 (bell 0.6, constant 1.0), 67% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 2.33 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 10 | 3 big moves: 3 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 2.3 | parts' speed profiles agree 0.64 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 30 cm/s |
| 7 Snaps and pops | 0 | 15 body snaps or pops in 8.3 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 32 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.07 robust z from 174 mocap clips; furthest: energyCV high (3.3), handSpeedP50 low (1.08), spineToArm high (1.03) |

## Worst moments

- **0:01.17** (1.17 s, f35) LeftUpperLeg: LeftUpperLeg jumps 34 deg in one frame (also snap, abrupt-start)
- **0:04.47** (4.47 s, f134) LeftUpperLeg: LeftUpperLeg jumps 34 deg in one frame (also snap, abrupt-stop)
- **0:03.00** (3 s, f90) RightLowerArm: RightLowerArm jumps 9 deg in one frame
- **0:00.30** (0.3 s, f9) RightFoot: RightFoot starts at 100% of its peak speed in one frame
- **0:00.90** (0.9 s, f27) RightFoot: RightFoot stops dead from 69% of its peak
