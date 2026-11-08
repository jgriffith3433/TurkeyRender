# Motion critic: mx_turn_in_place

111 frames at 30 fps (3.67 s). **Total 6.9/10: looks animated, not acted: overlap and snaps give it away (6.9/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.35 over 8 moves, 25% straight lines |
| 2 Slow in and out | 6.8 | speed shape 0.71 (bell 0.6, constant 1.0), 33% of moves start or stop in one frame |
| 3 Timing | 10 | 3 holds (median 0.47 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | 5 | 6 big moves: 0 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 2.6 | parts' speed profiles agree 0.61 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 5.5 | 1 centre-of-mass jerks, planted feet slide 15 cm/s |
| 7 Snaps and pops | 3.2 | 2 body snaps or pops in 3.67 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 10 | 3 key poses, readability 0.77 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 17 deg, spread 21 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.67** (3.67 s, f110) body: the body's centre of mass jerks at 134 m/s^2 (also pop)
- **0:00.90** (0.9 s, f27) Head: Head travels 30 cm in a straight line (bend 0.03) (also abrupt-stop)
- **0:01.87** (1.87 s, f56) RightHand: RightHand starts at 63% of its peak speed in one frame
- **0:02.17** (2.17 s, f65) RightFoot: RightFoot starts at 65% of its peak speed in one frame (also abrupt-stop)
