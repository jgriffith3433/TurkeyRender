# Motion critic: mx_kneel_down

84 frames at 30 fps (2.77 s). **Total 8.5/10: reads as human (8.5/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.25 over 6 moves, 0% straight lines |
| 2 Slow in and out | 8.6 | speed shape 0.63 (bell 0.6, constant 1.0), 29% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.37 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 0 | 4 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 8.1 | parts' speed profiles agree 0.47 (1 = everything moves as one); typical lag between parts 3 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 8.5 | 0 centre-of-mass jerks, planted feet slide 19 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.77 s |
| 8 Stiffness | 10 | 8% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 6 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 39 deg, spread 30 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.67** (0.67 s, f20) Head: Head travels 67 cm with no anticipation and no overshoot or settle
- **0:01.10** (1.1 s, f33) RightHand: RightHand travels 56 cm with no anticipation and no overshoot or settle
- **0:00.37** (0.37 s, f11) LeftHand: LeftHand travels 44 cm with no anticipation and no overshoot or settle
- **0:02.10** (2.1 s, f63) LeftFoot: LeftFoot starts at 69% of its peak speed in one frame
- **0:02.47** (2.47 s, f74) LeftFoot: LeftFoot stops dead from 67% of its peak
