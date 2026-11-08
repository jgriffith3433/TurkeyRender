# Motion critic: mx_look_over_shoulder

114 frames at 30 fps (3.77 s). **Total 6.9/10: looks animated, not acted: anticipation and snaps give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.22 over 7 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.65 (bell 0.6, constant 1.0), 64% of moves start or stop in one frame |
| 3 Timing | 9.7 | 1 holds (median 1 s), 0% of frames dead still, fast parts median 0.37 s |
| 4 Anticipation and follow-through | 0 | 6 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 4.9 | parts' speed profiles agree 0.76 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 9.7 | 0 centre-of-mass jerks, planted feet slide 7 cm/s |
| 7 Snaps and pops | 0 | 4 body snaps or pops in 3.77 s |
| 8 Stiffness | 10 | 9% of core joints frozen while the body moves |
| 9 Silhouette | 9.8 | 8 key poses, readability 0.77 (best of front, side, three-quarter), 13% twinned |
| 10 Hands and face | 10 | fingers curl 12 deg, spread 27 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.17** (0.17 s, f5) RightUpperArm: RightUpperArm jumps 17 deg in one frame (also snap, abrupt-start)
- **0:02.33** (2.33 s, f70) Neck: Neck jumps 10 deg in one frame (also abrupt-start, abrupt-stop)
- **0:03.53** (3.53 s, f106) RightHand: RightHand starts at 68% of its peak speed in one frame (also abrupt-stop)
