# Motion critic: mx_flying_back_death

92 frames at 30 fps (3.03 s). **Total 7.4/10: passable, weak on snaps and overlap (7.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.46 over 14 moves, 7% straight lines |
| 2 Slow in and out | 5.5 | speed shape 0.65 (bell 0.6, constant 1.0), 58% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 10 | 12 big moves: 9 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 5 | parts' speed profiles agree 0.63 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 5 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 57 body snaps or pops in 3.03 s |
| 8 Stiffness | 10 | 2% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.72 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 53% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.17** (0.17 s, f5) RightUpperLeg: RightUpperLeg jumps 23 deg in one frame (also snap)
- **0:00.80** (0.8 s, f24) RightUpperLeg: RightUpperLeg jumps 26 deg in one frame (also snap)
- **0:01.37** (1.37 s, f41) RightLowerArm: RightLowerArm jumps 18 deg in one frame (also snap)
- **0:01.10** (1.1 s, f33) RightFoot: RightFoot jumps 17 deg in one frame
- **0:01.80** (1.8 s, f54) RightFoot: RightFoot jumps 13 deg in one frame
