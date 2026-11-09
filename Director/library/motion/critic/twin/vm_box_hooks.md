# Motion critic: vm_box_hooks

251 frames at 30 fps (8.33 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 11 moves, 9% straight lines |
| 2 Slow in and out | 8.2 | speed shape 0.46 (bell 0.6, constant 1.0), 35% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 2.33 s), 0% of frames dead still, fast parts median 0.1 s |
| 4 Anticipation and follow-through | 9.8 | 7 big moves: 3 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 7.5 | parts' speed profiles agree 0.53 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.6 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 18 body snaps or pops in 8.33 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 1.04 robust z from 174 mocap clips; furthest: energyCV high (3.29), spineOmegaP50 low (0.82), handSpeedP50 low (0.77) |

## Worst moments

- **0:04.50** (4.5 s, f135) LeftUpperArm: LeftUpperArm jumps 14 deg in one frame (also snap)
- **0:01.20** (1.2 s, f36) Hips: Hips jumps 12 deg in one frame (also snap)
- **0:02.90** (2.9 s, f87) Hips: Hips jumps 8 deg in one frame (also snap)
- **0:01.97** (1.97 s, f59) LeftUpperArm: LeftUpperArm jumps 8 deg in one frame
- **0:02.43** (2.43 s, f73) LeftHand: LeftHand moves 22 cm in one frame
