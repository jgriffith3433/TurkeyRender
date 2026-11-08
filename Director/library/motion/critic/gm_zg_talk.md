# Motion critic: gm_zg_talk

113 frames at 30 fps (3.73 s), judged as zero-g. **Total 6/10: looks animated, not acted: contact and snaps give it away (6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 7.3 | median bend 0.11 over 14 moves, 0% straight lines |
| 2 Slow in and out | 5.2 | speed shape 0.66 (bell 0.6, constant 1.0), 60% of moves start or stop in one frame |
| 3 Timing | 10 | 1 holds (median 0.37 s), 0% of frames dead still, fast parts median 0.2 s |
| 4 Anticipation and follow-through | 6 | 9 big moves: 1 with anticipation, 3 with overshoot and settle |
| 5 Overlap and drag | 3.6 | parts' speed profiles agree 0.76 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 4 speed changes with no push (zero-g) |
| 7 Snaps and pops | 3.3 | 2 body snaps or pops in 3.73 s |
| 8 Stiffness | 5.8 | 18% of core joints frozen while the body moves; never moves: Spine, RightShoulder |
| 9 Silhouette | 7 | 8 key poses, readability 0.45 (best of front, side, three-quarter), 88% twinned |
| 10 Hands and face | 10 | fingers curl 0 deg, spread 15 deg, head level |
| 11 Contact | 0 | hands inside the body 87% of the time (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.67** (3.67 s, f110) RightFoot: RightFoot jumps 15 deg in one frame (also speed-change, snap)
- **0:03.40** (3.4 s, f102) body: in zero-g the body changes speed by 0.48 m/s with nothing to push on
- **0:00.10** (0.1 s, f3) body: in zero-g the body changes speed by 0.34 m/s with nothing to push on (also self-penetration)
- **0:00.67** (0.67 s, f20) LeftHand: LeftHand is inside the torso
- **0:01.00** (1 s, f30) LeftHand: LeftHand is inside the torso
