# Motion critic: gm_zg_idle

112 frames at 30 fps (3.7 s), judged as zero-g. **Total 7.7/10: passable, weak on overlap and anticipation (7.7/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.21 over 7 moves, 0% straight lines |
| 2 Slow in and out | 6.2 | speed shape 0.53 (bell 0.6, constant 1.0), 57% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 1.43 s), 0% of frames dead still, fast parts median 0.23 s |
| 4 Anticipation and follow-through | 4.8 | 5 big moves: 1 with anticipation, 1 with overshoot and settle |
| 5 Overlap and drag | 2.5 | parts' speed profiles agree 0.62 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.7 | 0 centre-of-mass jerks, 2 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.7 s |
| 8 Stiffness | 7.4 | 17% of core joints frozen while the body moves; never moves: Spine |
| 9 Silhouette | 8.7 | 7 key poses, readability 0.52 (best of front, side, three-quarter), 86% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.60** (3.6 s, f108) body: in zero-g the body changes speed by 0.51 m/s with nothing to push on (also speed-change, abrupt-stop)
