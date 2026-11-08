# Motion critic: mx_house_4

596 frames at 30 fps (19.83 s). **Total 8.7/10: reads as human (8.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.27 over 64 moves, 2% straight lines |
| 2 Slow in and out | 8.6 | speed shape 0.59 (bell 0.6, constant 1.0), 30% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | 10 | 55 big moves: 27 with anticipation, 23 with overshoot and settle |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.18 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 19 cm/s |
| 7 Snaps and pops | 0 | 169 body snaps or pops, 31 finger snaps in 19.83 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 16 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 67% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:10.40** (10.4 s, f312) LeftFoot: LeftFoot jumps 19 deg in one frame
- **0:01.90** (1.9 s, f57) LeftUpperArm: LeftUpperArm jumps 19 deg in one frame
- **0:02.37** (2.37 s, f71) RightUpperArm: RightUpperArm jumps 23 deg in one frame
- **0:03.57** (3.57 s, f107) RightUpperArm: RightUpperArm jumps 22 deg in one frame
- **0:15.43** (15.43 s, f463) RightUpperArm: RightUpperArm jumps 19 deg in one frame
