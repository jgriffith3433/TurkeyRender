# Motion critic: Idle1HaveNoClue

71 frames at 30 fps (2.33 s). **Total 7.3/10: passable, weak on snaps and overlap (7.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.15 over 5 moves, 0% straight lines |
| 2 Slow in and out | 5.4 | speed shape 0.74 (bell 0.6, constant 1.0), 43% of moves start or stop in one frame |
| 3 Timing | 10 | 2 holds (median 0.37 s), 0% of frames dead still, fast parts median 0.27 s |
| 4 Anticipation and follow-through | 8.2 | 4 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 3.6 | parts' speed profiles agree 0.76 (1 = everything moves as one); typical lag between parts 1 frames; 25% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 3 cm/s |
| 7 Snaps and pops | 0 | 2 body snaps or pops in 2.33 s |
| 8 Stiffness | 7.2 | 18% of core joints frozen while the body moves; never moves: Spine |
| 9 Silhouette | 9.7 | 5 key poses, readability 0.8 (best of front, side, three-quarter), 20% twinned |
| 10 Hands and face | 10 | fingers curl 24 deg, spread 20 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.27** (1.27 s, f38) body: 4 of 5 parts peak on the same frame (everything moves as one) (also snap, no-prep)
- **0:00.27** (0.27 s, f8) LeftLowerArm: LeftLowerArm jumps 12 deg in one frame (also abrupt-start, abrupt-stop)
- **0:01.60** (1.6 s, f48) LeftHand: LeftHand starts at 81% of its peak speed in one frame (also abrupt-start)
- **0:01.87** (1.87 s, f56) LeftHand: LeftHand stops dead from 69% of its peak (also abrupt-stop)
