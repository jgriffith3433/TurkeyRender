# Motion critic: mx_sit_laugh

252 frames at 30 fps (8.37 s). **Total 8.6/10: reads as human (8.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.2 over 5 moves, 0% straight lines |
| 2 Slow in and out | 6.3 | speed shape 0.67 (bell 0.6, constant 1.0), 45% of moves start or stop in one frame |
| 3 Timing | 10 | 7 holds (median 0.5 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 6 | 4 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 8.1 | parts' speed profiles agree 0.47 (1 = everything moves as one); typical lag between parts 4 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.9 | 0 centre-of-mass jerks, planted feet slide 4 cm/s |
| 7 Snaps and pops | 7 | 2 body snaps or pops, 2 finger snaps in 8.37 s |
| 8 Stiffness | 10 | 11% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 7 key poses, readability 0.79 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 67% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.03** (3.03 s, f91) RightHand: RightHand jumps 20 deg in one frame (also snap)
- **0:01.17** (1.17 s, f35) RightHand: RightHand travels 31 cm with no anticipation and no overshoot or settle
- **0:02.53** (2.53 s, f76) RightHand: RightHand travels 32 cm with no anticipation and no overshoot or settle
- **0:00.03** (0.03 s, f1) Head: the head hangs 38 deg forward of the chest
- **0:03.30** (3.3 s, f99) RightFoot: RightFoot starts at 75% of its peak speed in one frame
