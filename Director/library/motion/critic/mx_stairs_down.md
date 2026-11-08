# Motion critic: mx_stairs_down

29 frames at 30 fps (0.93 s). **Total 8.2/10: passable, weak on snaps and ease (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.47 over 5 moves, 0% straight lines |
| 2 Slow in and out | 5.9 | speed shape 0.42 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.6 | 5 big moves: 2 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 7.2 | parts' speed profiles agree 0.43 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 10 body snaps or pops in 0.93 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.82 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 45 deg, spread 36 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.77** (0.77 s, f23) LeftLowerLeg: LeftLowerLeg jumps 28 deg in one frame (also snap, abrupt-stop)
- **0:00.50** (0.5 s, f15) RightFoot: RightFoot jumps 32 deg in one frame (also snap)
- **0:00.03** (0.03 s, f1) LeftHand: LeftHand travels 49 cm with no anticipation and no overshoot or settle
