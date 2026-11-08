# Motion critic: mx_catwalk_twist_l

157 frames at 30 fps (5.2 s). **Total 5.4/10: looks animated, not acted: ease and snaps give it away (5.4/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 0 | speed shape 0.95 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 6 holds (median 0.6 s), 0% of frames dead still, no fast action to time |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | n/a | too little motion to see overlap |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 2 cm/s |
| 7 Snaps and pops | 0 | 11 body snaps or pops in 5.2 s |
| 8 Stiffness | 0 | 42% of core joints frozen while the body moves; never moves: Spine, Chest, LeftShoulder, RightShoulder |
| 9 Silhouette | 10 | 6 key poses, readability 0.8 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 11 deg, spread 22 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:02.60** (2.6 s, f78) RightLowerLeg: RightLowerLeg jumps 23 deg in one frame
- **0:02.97** (2.97 s, f89) RightLowerLeg: RightLowerLeg jumps 25 deg in one frame
- **0:03.93** (3.93 s, f118) RightLowerLeg: RightLowerLeg jumps 21 deg in one frame
- **0:04.53** (4.53 s, f136) RightLowerLeg: RightLowerLeg jumps 27 deg in one frame
- **0:01.17** (1.17 s, f35) RightFoot: RightFoot jumps 36 deg in one frame
