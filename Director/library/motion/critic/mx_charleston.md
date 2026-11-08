# Motion critic: mx_charleston

628 frames at 30 fps (20.9 s). **Total 8.9/10: reads as human (8.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.42 over 55 moves, 0% straight lines |
| 2 Slow in and out | 8.3 | speed shape 0.57 (bell 0.6, constant 1.0), 34% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 10 | 48 big moves: 25 with anticipation, 32 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.11 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 49 cm/s |
| 7 Snaps and pops | 0 | 339 body snaps or pops, 74 finger snaps in 20.9 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.84 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 19 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.13** (0.13 s, f4) LeftLowerLeg: LeftLowerLeg jumps 28 deg in one frame
- **0:01.73** (1.73 s, f52) LeftLowerLeg: LeftLowerLeg jumps 23 deg in one frame
- **0:02.40** (2.4 s, f72) LeftLowerLeg: LeftLowerLeg jumps 25 deg in one frame
- **0:02.73** (2.73 s, f82) LeftLowerLeg: LeftLowerLeg jumps 27 deg in one frame
- **0:05.03** (5.03 s, f151) LeftLowerLeg: LeftLowerLeg jumps 22 deg in one frame
