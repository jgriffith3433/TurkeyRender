# Motion critic: mx_stand_to_sit

68 frames at 30 fps (2.23 s). **Total 8.1/10: passable, weak on snaps and overlap (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.46 over 5 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.55 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 5 big moves: 4 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 3.8 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 2 body snaps or pops, 17 finger snaps in 2.23 s |
| 8 Stiffness | 10 | 7% of core joints frozen while the body moves |
| 9 Silhouette | 9.4 | 5 key poses, readability 0.74 (best of front, side, three-quarter), 40% twinned |
| 10 Hands and face | 8 | head bowed 60% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.20** (0.2 s, f6) Head: Head jumps 9 deg in one frame (also bowed-head)
- **0:01.23** (1.23 s, f37) LeftLowerArm: LeftLowerArm jumps 9 deg in one frame
