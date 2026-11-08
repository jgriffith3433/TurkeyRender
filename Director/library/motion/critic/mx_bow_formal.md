# Motion critic: mx_bow_formal

83 frames at 30 fps (2.73 s). **Total 6.4/10: looks animated, not acted: anticipation and arcs give it away (6.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 2.5 | median bend 0.06 over 2 moves, 0% straight lines |
| 2 Slow in and out | 3.3 | speed shape 0.72 (bell 0.6, constant 1.0), 71% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 2.03 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 2.9 | parts' speed profiles agree 0.83 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 2.73 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 6 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 12 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.97** (0.97 s, f29) LeftHand: LeftHand starts at 78% of its peak speed in one frame (also abrupt-stop)
- **0:01.23** (1.23 s, f37) LeftFoot: LeftFoot starts at 87% of its peak speed in one frame (also abrupt-stop)
