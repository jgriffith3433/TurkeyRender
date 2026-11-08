# Motion critic: hp_p1_peer

151 frames at 30 fps (5 s), judged as zero-g. **Total 4.4/10: wrong to an animator's eye: overlap and snaps (4.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 1.4 | median bend 0.05 over 12 moves, 17% straight lines |
| 2 Slow in and out | 5 | speed shape 0.28 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 4 holds (median 0.8 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 2.2 | 8 big moves: 2 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.99 (1 = everything moves as one); typical lag between parts 0 frames; 53% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 3 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 36 body snaps or pops in 5 s |
| 8 Stiffness | 0 | 18% of core joints frozen while the body moves; never moves: LeftShoulder, RightShoulder, LeftUpperArm, RightUpperArm, LeftUpperLeg, RightUpperLeg |
| 9 Silhouette | 10 | 4 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 36 deg, spread 24 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.50** (2.5 s, f75) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep)
- **0:02.77** (2.77 s, f83) body: 5 of 5 parts peak on the same frame (everything moves as one)
- **0:03.60** (3.6 s, f108) body: 5 of 5 parts peak on the same frame (everything moves as one)
- **0:04.77** (4.77 s, f143) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep)
- **0:01.37** (1.37 s, f41) Neck: Neck jumps 15 deg in one frame
