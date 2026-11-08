# Motion critic: mx_goalie_catch_mid

39 frames at 30 fps (1.27 s). **Total 8/10: passable, weak on snaps and weight (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.92 over 4 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.53 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 6 | 3 big moves: 0 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.24 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5 | 1 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 23 body snaps or pops, 46 finger snaps in 1.27 s |
| 8 Stiffness | 10 | 5% of core joints frozen while the body moves |
| 9 Silhouette | 9.5 | 3 key poses, readability 0.76 (best of front, side, three-quarter), 33% twinned |
| 10 Hands and face | 8 | head bowed 90% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.67** (0.67 s, f20) LeftFoot: LeftFoot jumps 20 deg in one frame (also snap, com-spike)
- **0:00.37** (0.37 s, f11) RightHand: RightHand jumps 15 deg in one frame (also snap)
- **0:00.97** (0.97 s, f29) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame
- **0:00.03** (0.03 s, f1) Head: the head hangs 32 deg forward of the chest
