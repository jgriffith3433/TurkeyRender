# Motion critic: cmu_121_03_rise

124 frames at 30 fps (4.1 s). **Total 7.9/10: passable, weak on snaps and anticipation (7.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.19 over 8 moves, 0% straight lines |
| 2 Slow in and out | 7.6 | speed shape 0.64 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 9.8 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.33 s |
| 4 Anticipation and follow-through | 1.9 | 8 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.7 | parts' speed profiles agree 0.51 (1 = everything moves as one); typical lag between parts 6 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 76 cm/s |
| 7 Snaps and pops | 0 | 10 body snaps or pops in 4.1 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 8 key poses, readability 0.87 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 9 | 1.4 robust z from 174 mocap clips; furthest: energyCV high (3.85), spineToArm high (2.65), handSpeedP95 high (1.35) |

## Worst moments

- **0:00.57** (0.57 s, f17) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
- **0:01.37** (1.37 s, f41) LeftFoot: LeftFoot jumps 23 deg in one frame (also snap)
- **0:00.30** (0.3 s, f9) RightUpperArm: RightUpperArm jumps 13 deg in one frame (also snap)
- **0:03.30** (3.3 s, f99) RightToes: RightToes jumps 12 deg in one frame
- **0:01.67** (1.67 s, f50) RightToes: RightToes jumps 9 deg in one frame
