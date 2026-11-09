# Motion critic: gm_hp_atlas_t0

120 frames at 30 fps (3.97 s), judged as zero-g. **Total 8.3/10: passable, weak on anticipation and overlap (8.3/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 10 | median bend 0.15 over 12 moves, 8% straight lines |
| 2 Slow in and out | 6.5 | speed shape 0.7 (bell 0.6, constant 1.0), 38% of moves start or stop in one frame |
| 3 Timing | 10 | 0 holds (median 0 s), 0% of frames dead still, fast parts median 0.13 s |
| 4 Anticipation and follow-through | 0.9 | 10 big moves: 1 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 5.7 | parts' speed profiles agree 0.57 (1 = everything moves as one); typical lag between parts 1 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 7.5 | 0 centre-of-mass jerks, 18 speed changes with no push (zero-g) |
| 7 Snaps and pops | 10 | 0 body snaps or pops in 3.97 s |
| 8 Stiffness | 10 | 4% of core joints frozen while the body moves |
| 9 Silhouette | 10 | 8 key poses, readability 0.78 (best of front, side, three-quarter), 0% twinned |
| 10 Hands and face | 10 | fingers curl NaN deg, spread NaN deg, head level |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | 10 | 0.44 robust z from 174 mocap clips; furthest: headOmegaP95 low (0.83), energyCV high (0.77), headOmegaP50 low (0.67) |

## Worst moments

- **0:00.10** (0.1 s, f3) body: in zero-g the body changes speed by 0.88 m/s with nothing to push on (also speed-change)
- **0:00.40** (0.4 s, f12) body: in zero-g the body changes speed by 0.65 m/s with nothing to push on
- **0:01.30** (1.3 s, f39) body: in zero-g the body changes speed by 0.4 m/s with nothing to push on (also speed-change)
- **0:01.60** (1.6 s, f48) body: in zero-g the body changes speed by 0.46 m/s with nothing to push on
- **0:03.30** (3.3 s, f99) body: in zero-g the body changes speed by 0.43 m/s with nothing to push on
