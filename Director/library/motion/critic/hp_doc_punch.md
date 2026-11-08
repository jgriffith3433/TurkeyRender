# Motion critic: hp_doc_punch

151 frames at 30 fps (5 s). **Total 6.3/10: looks animated, not acted: snaps and overlap give it away (6.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 6.4 | median bend 0.1 over 12 moves, 0% straight lines |
| 2 Slow in and out | 5 | speed shape 0.43 (bell 0.6, constant 1.0), 87% of moves start or stop in one frame |
| 3 Timing | 10 | 5 holds (median 0.37 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 3.9 | 10 big moves: 1 with anticipation, 2 with overshoot and settle |
| 5 Overlap and drag | 0.8 | parts' speed profiles agree 0.78 (1 = everything moves as one); typical lag between parts 0 frames; 19% of energy peaks have every part peaking together |
| 6 Weight | 7.8 | 0 centre-of-mass jerks, planted feet slide 27 cm/s |
| 7 Snaps and pops | 0 | 67 body snaps or pops, 190 finger snaps in 5 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 5 key poses, readability 0.81 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 77 deg, spread 10 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:01.10** (1.1 s, f33) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap)
- **0:04.43** (4.43 s, f133) body: 5 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:01.77** (1.77 s, f53) RightUpperArm: RightUpperArm jumps 24 deg in one frame (also snap)
- **0:04.70** (4.7 s, f141) LeftLowerArm: LeftLowerArm jumps 13 deg in one frame (also snap)
- **0:02.77** (2.77 s, f83) LeftHand: LeftHand jumps 9 deg in one frame
