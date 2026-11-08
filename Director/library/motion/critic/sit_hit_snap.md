# Motion critic: sit_hit_snap

90 frames at 30 fps (2.97 s). **Total 4.8/10: wrong to an animator's eye: anticipation and overlap (4.8/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 1.4 | median bend 0.05 over 4 moves, 50% straight lines |
| 2 Slow in and out | 5 | speed shape 0.29 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 2.87 s), 0% of frames dead still, fast parts median 0.17 s |
| 4 Anticipation and follow-through | 0 | 2 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.88 (1 = everything moves as one); typical lag between parts 0 frames; 50% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 0 | 3 body snaps or pops in 2.97 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 8.5 | 6 key poses, readability 0.64 (best of front, side, three-quarter), 100% twinned |
| 10 Hands and face | 10 | fingers curl 4 deg, spread 6 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.07** (0.07 s, f2) body: 5 of 5 parts peak on the same frame (everything moves as one) (also snap, abrupt-start)
