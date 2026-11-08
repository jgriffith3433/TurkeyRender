# Motion critic: mx_thinking

128 frames at 30 fps (4.23 s). **Total 7.6/10: passable, weak on snaps and anticipation (7.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.47 over 8 moves, 0% straight lines |
| 2 Slow in and out | 5.8 | speed shape 0.7 (bell 0.6, constant 1.0), 45% of moves start or stop in one frame |
| 3 Timing | 9.5 | 1 holds (median 1.1 s), 0% of frames dead still, fast parts median 0.4 s |
| 4 Anticipation and follow-through | 3 | 5 big moves: 0 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 7.8 | parts' speed profiles agree 0.5 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.7 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 6 body snaps or pops, 12 finger snaps in 4.23 s |
| 8 Stiffness | 10 | 10% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 9 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 22 deg, spread 42 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.70** (0.7 s, f21) LeftHand: LeftHand jumps 15 deg in one frame (also abrupt-stop)
- **0:03.53** (3.53 s, f106) RightHand: RightHand jumps 13 deg in one frame
- **0:02.97** (2.97 s, f89) LeftLowerArm: LeftLowerArm jumps 12 deg in one frame (also snap)
- **0:00.30** (0.3 s, f9) RightHand: RightHand travels 57 cm with no anticipation and no overshoot or settle (also abrupt-start)
- **0:01.00** (1 s, f30) Head: Head starts at 83% of its peak speed in one frame
