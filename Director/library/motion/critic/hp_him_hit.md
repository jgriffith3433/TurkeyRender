# Motion critic: hp_him_hit

151 frames at 30 fps (5 s). **Total 4.6/10: wrong to an animator's eye: anticipation and overlap (4.6/10).**

| principle | score | what the numbers say |
|---|---|---|
| 1 Arcs | 1.7 | median bend 0.05 over 5 moves, 40% straight lines |
| 2 Slow in and out | n/a | too few moves to judge ease |
| 3 Timing | 10 | 3 holds (median 1.53 s), 0% of frames dead still, fast parts median 0.03 s |
| 4 Anticipation and follow-through | 0 | 5 big moves: 0 with anticipation, 0 with overshoot and settle |
| 5 Overlap and drag | 0 | parts' speed profiles agree 0.86 (1 = everything moves as one); typical lag between parts 0 frames; 0% of energy peaks have every part peaking together |
| 6 Weight | 10 | 0 centre-of-mass jerks, planted feet slide 1 cm/s |
| 7 Snaps and pops | 0 | 23 body snaps or pops, 14 finger snaps in 5 s |
| 8 Stiffness | n/a | the body hardly moves: stiffness not judged |
| 9 Silhouette | 9 | 3 key poses, readability 0.67 (best of front, side, three-quarter), 67% twinned |
| 10 Hands and face | 7 | fingers flat and splayed 32% of the time |
| 11 Contact | 10 | hands clear of the body (no partner dump: hit and catch targets not judged) (partial) |
| 12 Distance from human motion | n/a | no reference yet: node Director/tools/critic.mjs reference |

## Worst moments

- **0:03.40** (3.4 s, f102) Hips: Hips jumps 36 deg in one frame (also snap, pop, no-prep)
- **0:02.80** (2.8 s, f84) Chest: Chest jumps 19 deg in one frame (also snap)
