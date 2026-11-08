# Motion critic: mx_sit_disbelief

144 frames at 30 fps (4.77 s). **Total 8/10: passable, weak on snaps and overlap (8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.16 over 10 moves, 0% straight lines |
| 2 Slow in and out | 7.6 | speed shape 0.63 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.53 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 6.9 | 10 big moves: 1 with anticipation, 4 with overshoot and settle |
| 5 Overlap and drag | 6.7 | parts' speed profiles agree 0.48 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.8 | 0 centre-of-mass jerks, planted feet slide 5 cm/s |
| 7 Snaps and pops | 0 | 6 body snaps or pops, 5 finger snaps in 4.77 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 9.3 | 10 key poses, readability 0.67 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 3 deg, spread 5 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:04.33** (4.33 s, f130) RightLowerArm: RightLowerArm jumps 20 deg in one frame (also snap, no-prep)
- **0:00.57** (0.57 s, f17) LeftUpperArm: LeftUpperArm jumps 9 deg in one frame (also no-prep)
- **0:00.20** (0.2 s, f6) LeftHand: LeftHand travels 74 cm with no anticipation and no overshoot or settle (also no-prep)
- **0:04.03** (4.03 s, f121) RightHand: RightHand travels 49 cm with no anticipation and no overshoot or settle
- **0:03.13** (3.13 s, f94) RightFoot: RightFoot stops dead from 63% of its peak
