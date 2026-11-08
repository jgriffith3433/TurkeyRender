# Motion critic: hp_p2_sneak

61 frames at 30 fps (2 s), judged as zero-g. **Total 5.1/10: looks animated, not acted: arcs and snaps give it away (5.1/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 0 | median bend 0.03 over 4 moves, 100% straight lines |
| 2 Slow in and out | n/a | too few moves to judge ease |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 3.4 | parts' speed profiles agree 0.54 (1 = everything moves as one); typical lag between parts 0 frames; 62% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, 0 speed changes with no push (zero-g) |
| 7 Snaps and pops | 0 | 8 body snaps or pops in 2 s |
| 8 Stiffness | 0 | 0% of core joints frozen while the body moves; never moves: Hips, Spine, Chest, Neck, Head, LeftShoulder, RightShoulder |
| 9 Silhouette | 9.3 | 4 key poses, readability 0.69 (best of front, side, three-quarter), 50% twinned |
| 10 Hands and face | 10 | fingers curl 13 deg, spread 36 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.40** (0.4 s, f12) body: 4 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:00.77** (0.77 s, f23) body: 4 of 5 parts peak on the same frame (everything moves as one)
- **0:01.40** (1.4 s, f42) body: 4 of 5 parts peak on the same frame (everything moves as one) (also lockstep, snap)
- **0:01.77** (1.77 s, f53) body: 4 of 5 parts peak on the same frame (everything moves as one)
