# Motion critic: mx_throwing

168 frames at 30 fps (5.57 s). **Total 7.7/10: passable, weak on snaps and ease (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.41 over 8 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.7 (bell 0.6, constant 1.0), 42% of moves start or stop in one frame |
| 3 Timing | 8.2 | 2 holds (median 1.83 s), 0% of frames dead still, fast parts median 0.67 s |
| 4 Anticipation and follow-through | 9.3 | 8 big moves: 3 with anticipation, 7 with overshoot and settle |
| 5 Overlap and drag | 6.2 | parts' speed profiles agree 0.65 (1 = everything moves as one); typical lag between parts 5 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 5 body snaps or pops, 11 finger snaps in 5.57 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 9.9 | 11 key poses, readability 0.8 (best of front, side, three-quarter), 9% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 35% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.90** (0.9 s, f27) LeftFoot: LeftFoot jumps 13 deg in one frame (also snap)
- **0:01.83** (1.83 s, f55) LeftLowerArm: LeftLowerArm jumps 9 deg in one frame
- **0:01.57** (1.57 s, f47) LeftLowerArm: LeftLowerArm jumps 8 deg in one frame (also snap)
- **0:02.17** (2.17 s, f65) RightHand: RightHand travels 89 cm with no anticipation and no overshoot or settle
- **0:01.23** (1.23 s, f37) RightHand: RightHand stops dead from 66% of its peak
