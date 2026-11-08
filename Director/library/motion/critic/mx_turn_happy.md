# Motion critic: mx_turn_happy

23 frames at 30 fps (0.73 s). **Total 6.3/10: looks animated, not acted: snaps and overlap give it away (6.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 5 | speed shape 0.16 (bell 0.6, constant 1.0), 100% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 2.1 | parts' speed profiles agree 0.66 (1 = everything moves as one); typical lag between parts 0 frames |
| 6 Weight | 2.5 | 1 centre-of-mass jerks, planted feet slide 70 cm/s |
| 7 Snaps and pops | 0 | 8 body snaps or pops, 2 finger snaps in 0.73 s |
| 8 Stiffness | 10 | 6% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 2 key poses, readability 0.74 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl 19 deg, spread 12 deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.73** (0.73 s, f22) body: the body's centre of mass jerks at 137 m/s^2 (also pop, abrupt-stop)
- **0:00.37** (0.37 s, f11) LeftLowerLeg: LeftLowerLeg jumps 12 deg in one frame (also snap)
- **0:00.07** (0.07 s, f2) LeftHand: LeftHand jumps 10 deg in one frame
