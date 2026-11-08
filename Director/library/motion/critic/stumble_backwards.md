# Motion critic: stumble_backwards

101 frames at 30 fps (3.33 s). **Total 7.8/10: passable, weak on snaps and weight (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.52 over 7 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.47 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.07 s |
| 4 Anticipation and follow-through | 10 | 7 big moves: 5 with anticipation, 6 with overshoot and settle |
| 5 Overlap and drag | 5.2 | parts' speed profiles agree 0.74 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 5 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 64 body snaps or pops, 54 finger snaps in 3.33 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 7 key poses, readability 0.73 (best of front, side, three-quarter), 29% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 67% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.57** (0.57 s, f17) LeftLowerLeg: LeftLowerLeg jumps 18 deg in one frame (also snap)
- **0:01.73** (1.73 s, f52) LeftLowerLeg: LeftLowerLeg jumps 20 deg in one frame (also snap)
- **0:01.07** (1.07 s, f32) RightLowerLeg: RightLowerLeg jumps 31 deg in one frame (also snap)
- **0:01.37** (1.37 s, f41) RightLowerLeg: RightLowerLeg jumps 38 deg in one frame (also snap)
- **0:02.20** (2.2 s, f66) LeftHand: LeftHand jumps 19 deg in one frame
