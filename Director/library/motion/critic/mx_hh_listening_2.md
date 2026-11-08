# Motion critic: mx_hh_listening_2

558 frames at 30 fps (18.57 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.5 over 34 moves, 0% straight lines |
| 2 Slow in and out | 9.1 | speed shape 0.52 (bell 0.6, constant 1.0), 25% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.8 | 26 big moves: 11 with anticipation, 15 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.23 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, planted feet slide 34 cm/s |
| 7 Snaps and pops | 0 | 54 body snaps or pops, 39 finger snaps in 18.57 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 6% twinned |
| 10 Hands and face | 10 | fingers curl 10 deg, spread 13 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:15.60** (15.6 s, f468) LeftLowerArm: LeftLowerArm jumps 18 deg in one frame
- **0:00.73** (0.73 s, f22) RightLowerArm: RightLowerArm jumps 18 deg in one frame
- **0:08.80** (8.8 s, f264) RightLowerArm: RightLowerArm jumps 18 deg in one frame
- **0:10.77** (10.77 s, f323) RightLowerArm: RightLowerArm jumps 20 deg in one frame
- **0:13.33** (13.33 s, f400) RightLowerArm: RightLowerArm jumps 19 deg in one frame
