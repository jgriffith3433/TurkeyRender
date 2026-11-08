# Motion critic: mx_house_3

642 frames at 30 fps (21.37 s). **Total 8.1/10: passable, weak on snaps and hands (8.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.24 over 65 moves, 5% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.66 (bell 0.6, constant 1.0), 42% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 9.9 | 52 big moves: 23 with anticipation, 36 with overshoot and settle |
| 5 Overlap and drag | 8.7 | parts' speed profiles agree 0.18 (1 = everything moves as one); typical lag between parts 1 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 28 cm/s |
| 7 Snaps and pops | 0 | 165 body snaps or pops, 7 finger snaps in 21.37 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 5 | fingers flat and splayed 44% of the time; head bowed 99% of the time |
| 11 Contact | 10 | hands inside the body 0% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.90** (2.9 s, f87) LeftUpperArm: LeftUpperArm jumps 27 deg in one frame
- **0:03.27** (3.27 s, f98) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame
- **0:10.27** (10.27 s, f308) LeftUpperArm: LeftUpperArm jumps 21 deg in one frame
- **0:17.83** (17.83 s, f535) LeftUpperArm: LeftUpperArm jumps 18 deg in one frame
- **0:04.37** (4.37 s, f131) RightUpperArm: RightUpperArm jumps 20 deg in one frame
