# Motion critic: mx_sit_to_stand_pump

104 frames at 30 fps (3.43 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.37 over 8 moves, 0% straight lines |
| 2 Slow in and out | 8.8 | speed shape 0.57 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.33 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 9 | 6 big moves: 2 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 9.3 | parts' speed profiles agree 0.37 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.4 | 0 centre-of-mass jerks, planted feet slide 20 cm/s |
| 7 Snaps and pops | 0 | 18 body snaps or pops, 18 finger snaps in 3.43 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 7 key poses, readability 0.78 (best of front, side, three-quarter), 14% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 9 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.17** (1.17 s, f35) RightLowerArm: RightLowerArm jumps 21 deg in one frame (also snap)
- **0:01.80** (1.8 s, f54) RightLowerArm: RightLowerArm jumps 19 deg in one frame (also snap)
- **0:00.50** (0.5 s, f15) RightHand: RightHand jumps 19 deg in one frame (also snap)
- **0:02.27** (2.27 s, f68) RightHand: RightHand jumps 15 deg in one frame
- **0:00.77** (0.77 s, f23) RightHand: RightHand jumps 12 deg in one frame
