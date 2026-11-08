# Motion critic: mx_boxing_dodge

71 frames at 30 fps (2.33 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.17 over 9 moves, 0% straight lines |
| 2 Slow in and out | 7.5 | speed shape 0.65 (bell 0.6, constant 1.0), 36% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 9 | 8 big moves: 3 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 6 | parts' speed profiles agree 0.22 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 20 body snaps or pops in 2.33 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 69 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.70** (1.7 s, f51) RightFoot: RightFoot jumps 17 deg in one frame (also snap)
- **0:00.73** (0.73 s, f22) RightUpperLeg: RightUpperLeg jumps 16 deg in one frame (also snap)
- **0:01.17** (1.17 s, f35) Hips: Hips jumps 10 deg in one frame
- **0:02.23** (2.23 s, f67) Hips: Hips jumps 10 deg in one frame
- **0:00.20** (0.2 s, f6) RightFoot: RightFoot jumps 10 deg in one frame
