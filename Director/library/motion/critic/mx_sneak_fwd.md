# Motion critic: mx_sneak_fwd

51 frames at 30 fps (1.67 s). **Total 8.3/10: passable, weak on snaps and ease (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 7.7 | speed shape 0.55 (bell 0.6, constant 1.0), 40% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median null s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 10 | parts' speed profiles agree 0.23 (1 = everything moves as one); typical lag between parts 2 frames |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 25 body snaps or pops in 1.67 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 3 key poses, readability 0.83 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.60** (0.6 s, f18) RightLowerLeg: RightLowerLeg jumps 18 deg in one frame (also snap)
- **0:01.50** (1.5 s, f45) RightFoot: RightFoot jumps 18 deg in one frame (also snap, abrupt-stop)
- **0:01.07** (1.07 s, f32) RightToes: RightToes jumps 20 deg in one frame (also snap)
- **0:00.27** (0.27 s, f8) RightFoot: RightFoot jumps 16 deg in one frame (also snap, abrupt-start, bowed-head)
