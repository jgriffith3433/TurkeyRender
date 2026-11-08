# Motion critic: mx_crawl_backwards

63 frames at 30 fps (2.07 s). **Total 8.2/10: passable, weak on snaps and overlap (8.2/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | n/a | too few moves to judge arcs |
| 2 Slow in and out | 10 | speed shape 0.37 (bell 0.6, constant 1.0), 0% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | n/a | only 0 big moves: nothing to prepare or follow through |
| 5 Overlap and drag | 7.4 | parts' speed profiles agree 0.53 (1 = everything moves as one); typical lag between parts 2 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, foot slide not judged (travelling clip plays in place) |
| 7 Snaps and pops | 0 | 53 body snaps or pops, 9 finger snaps in 2.07 s |
| 8 Stiffness | 10 | 3% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 4 key poses, readability 0.68 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 8 | head bowed 100% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:00.70** (0.7 s, f21) RightUpperLeg: RightUpperLeg jumps 27 deg in one frame (also snap)
- **0:01.43** (1.43 s, f43) LeftLowerLeg: LeftLowerLeg jumps 21 deg in one frame (also snap)
- **0:00.17** (0.17 s, f5) LeftUpperArm: LeftUpperArm jumps 22 deg in one frame (also snap)
- **0:01.03** (1.03 s, f31) RightHand: RightHand jumps 19 deg in one frame (also snap)
- **0:00.43** (0.43 s, f13) RightHand: RightHand jumps 13 deg in one frame
