# Motion critic: mx_twist

284 frames at 30 fps (9.43 s). **Total 7.8/10: passable, weak on snaps and overlap (7.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.36 over 10 moves, 0% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.57 (bell 0.6, constant 1.0), 50% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9 | 6 big moves: 2 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 4.9 | parts' speed profiles agree 0.4 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 7.7 | 0 centre-of-mass jerks, planted feet slide 28 cm/s |
| 7 Snaps and pops | 0 | 16 body snaps or pops, 16 finger snaps in 9.43 s |
| 8 Stiffness | 10 | 1% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 24 deg, spread 11 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.57** (1.57 s, f47) LeftUpperArm: LeftUpperArm jumps 12 deg in one frame
- **0:00.43** (0.43 s, f13) Hips: Hips jumps 10 deg in one frame
- **0:07.50** (7.5 s, f225) Hips: Hips jumps 10 deg in one frame
- **0:08.93** (8.93 s, f268) RightLowerLeg: RightLowerLeg jumps 10 deg in one frame
- **0:06.10** (6.1 s, f183) Hips: Hips jumps 9 deg in one frame
