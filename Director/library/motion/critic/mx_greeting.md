# Motion critic: mx_greeting

155 frames at 30 fps (5.13 s). **Total 6.4/10: looks animated, not acted: anticipation and snaps give it away (6.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.18 over 2 moves, 0% straight lines |
| 2 Slow in and out | 10 | speed shape 0.57 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 1.13 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 7.3 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 0 | 5 body snaps or pops in 5.13 s |
| 8 Stiffness | 1.1 | 33% of core joints frozen while the body moves; never moves: Spine, Chest, LeftShoulder |
| 9 Silhouette | 10 | 10 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 39% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.40** (1.4 s, f42) RightHand: RightHand jumps 16 deg in one frame (also no-prep)
- **0:04.30** (4.3 s, f129) RightHand: RightHand jumps 13 deg in one frame (also snap)
- **0:03.97** (3.97 s, f119) RightUpperArm: RightUpperArm jumps 8 deg in one frame
- **0:02.87** (2.87 s, f86) RightLowerArm: RightLowerArm jumps 8 deg in one frame
- **0:03.67** (3.67 s, f110) RightHand: RightHand travels 57 cm with no anticipation and no overshoot or settle
