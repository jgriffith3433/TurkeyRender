# Motion critic: mx_sitting_thumbs_up

116 frames at 30 fps (3.83 s). **Total 7/10: passable, weak on snaps and anticipation (7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 7 | median bend 0.11 over 5 moves, 0% straight lines |
| 2 Slow in and out | 4.1 | speed shape 0.82 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.43 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 4 | 4 big moves: 2 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 5.7 | parts' speed profiles agree 0.57 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.8 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops, 10 finger snaps in 3.83 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 9.6 | 8 key poses, readability 0.75 (best of front, side, three-quarter), 25% twinned |
| 10 Hands and face | 10 | fingers curl 8 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.27** (1.27 s, f38) RightLowerArm: RightLowerArm jumps 25 deg in one frame
- **0:01.73** (1.73 s, f52) RightLowerArm: RightLowerArm jumps 24 deg in one frame
- **0:02.23** (2.23 s, f67) RightLowerArm: RightLowerArm jumps 23 deg in one frame (also snap)
- **0:00.63** (0.63 s, f19) RightHand: RightHand travels 58 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:00.97** (0.97 s, f29) LeftFoot: LeftFoot starts at 74% of its peak speed in one frame
