# Motion critic calibration (2026-11-08)

200 catalog clips against their hand-written A/B/C grades (the grades are about usefulness on his rig, so partial agreement is the ceiling), plus the keyed hero poses.

| grade | n | mean | p25 | median | p75 |
|---|---|---|---|---|---|
| A | 64 | 8.58 | 8.1 | 8.8 | 9.2 |
| B | 111 | 8.54 | 8.1 | 8.6 | 9.2 |
| C | 20 | 8.54 | 8.1 | 8.5 | 9.1 |
| ban | 5 | 8.62 | 8.5 | 8.9 | 8.9 |

Spearman grade vs total: **0.03**. AUC A over C/ban: **0.52**; A+B over C/ban: 0.51. Mocap over generated (gm_*): **0.78**. Mocap over the hand-keyed hero clips (hp_*, mean 5.94): **0.97** (the separation that matters: real motion against typed joint numbers).

Mocap (mx_*, n 174): mean 8.63, p10 7.6, min 5.2. Under 8: mx_bboy_pose_to_idle 7.8, mx_bow_formal 6.6, mx_breathing_idle 7.7, mx_catwalk_twist_l 5.2, mx_dizzy_idle 7.6, mx_falling_air 7.6, mx_flying_back_death 7.8, mx_greeting 7.4, mx_hanging_idle 7.3, mx_head_no 7.6, mx_hit_reaction 7.8, mx_idle_weight_shift 7.2, mx_point_bent 7.6, mx_pose_hand_head 7.8, mx_pose_hand_hip 7.9, mx_pose_hip_arm_up 7.6, mx_pose_hips_look_back 7.9, mx_pose_legs_crossed_hip 7.7, mx_relieved_sigh 7.2, mx_sigh 7.2, mx_sit_look 7.8, mx_strut 7.6, mx_treading_water 7.4, mx_turn_f 6.7, mx_turn_happy 6.9, mx_turn_in_place 7.2, mx_turn_quick_180 7.9, mx_walk_start_f 7.6, mx_walk_turn_180 7.5.

## Generated clips (Gen motion.from-text)

| clip | grade | total |
|---|---|---|
| gm_sit_thumbs_up | B | 8.2 |
| gm_zg_breathless | C | 7.7 |
| gm_zg_catch_gut | C | 8.1 |
| gm_zg_hold_ball | B | 7.6 |
| gm_zg_idle | B | 7.9 |
| gm_zg_laugh | C | 8.1 |
| gm_zg_search | B | 8.4 |
| gm_zg_startle | B | 8.6 |
| gm_zg_talk | C | 7.1 |
| gm_zg_throw | B | 8.8 |
| gm_zg_tumble | C | 7.2 |

## Per principle: mean score by group

| principle | A | C/ban | mocap | generated |
|---|---|---|---|---|
| arcs | 9.43 | 9.11 | 9.5 | 8.73 |
| ease | 6.53 | 6.33 | 6.45 | 5.26 |
| timing | 9.99 | 9.83 | 9.96 | 10 |
| anticipation | 7.05 | 7.67 | 7.1 | 6.23 |
| overlap | 7.24 | 6.77 | 7.4 | 4.48 |
| weight | 8.78 | 8.73 | 8.9 | 7.74 |
| snaps | 8.13 | 6.72 | 7.56 | 8.25 |
| stiffness | 9.4 | 9.67 | 9.65 | 9.13 |
| silhouette | 9.7 | 9.69 | 9.8 | 9.36 |
| hands | 9.47 | 9.24 | 9.46 | 9.64 |
| contact | 10 | 9.28 | 10 | 7.4 |
| reference | 8.6 | 9.74 | 9 | 9.75 |

## Keyed hero poses (fixtures)

| clip | total | verdict | lowest |
|---|---|---|---|
| hp_a1_atlas | 5.3 | looks animated, not acted: anticipation and overlap give it away (5.3/10) | anticipation 0, overlap 0, snaps 0 |
| hp_a2_setdown | 4.9 | wrong to an animator's eye: arcs and ease (4.9/10) | arcs 0, ease 0, snaps 0 |
| hp_b1_boop | 5.2 | looks animated, not acted: anticipation and snaps give it away (5.2/10) | anticipation 0, snaps 0, arcs 1.3 |
| hp_c1_catch | 5.8 | looks animated, not acted: snaps and arcs give it away (5.8/10) | snaps 0, arcs 1.9, overlap 2 |
| hp_c4_shove | 7.3 | passable, weak on overlap and reference (7.3/10) | overlap 3.4, reference 4.2, hands 7 |
| hp_d2_letgo | 5.2 | looks animated, not acted: anticipation and stiffness give it away (5.2/10) | anticipation 0, stiffness 0, snaps 1.7 |
| hp_doc_after | 4.8 | wrong to an animator's eye: overlap and snaps (4.8/10) | overlap 0, snaps 0, anticipation 1.8 |
| hp_doc_punch | 6 | looks animated, not acted: snaps and overlap give it away (6/10) | snaps 0, overlap 0.8, anticipation 3.9 |
| hp_f1_superman | 7.9 | passable, weak on reference and hands (7.9/10) | reference 2.2, hands 8, timing 10 |
| hp_f2_ram | 7.7 | passable, weak on reference and hands (7.7/10) | reference 2, hands 8, silhouette 8.5 |
| hp_f3_lean | 7.2 | passable, weak on reference and hands (7.2/10) | reference 0, hands 8, silhouette 8.5 |
| hp_h1_hop | 6.2 | looks animated, not acted: snaps and overlap give it away (6.2/10) | snaps 0, overlap 3.2, stiffness 3.3 |
| hp_him_hit | 4.3 | wrong to an animator's eye: anticipation and overlap (4.3/10) | anticipation 0, overlap 0, snaps 0 |
| hp_p1_peer | 4.3 | wrong to an animator's eye: overlap and snaps (4.3/10) | overlap 0, snaps 0, stiffness 0 |
| hp_p2_sneak | 5 | looks animated, not acted: arcs and snaps give it away (5/10) | arcs 0, snaps 0, stiffness 0 |
| hp_p3_deadpan | 7.6 | passable, weak on reference and silhouette (7.6/10) | reference 0, silhouette 9.6, timing 10 |
| hp_r1_pull | 6.4 | looks animated, not acted: overlap and snaps give it away (6.4/10) | overlap 0, snaps 0, stiffness 5 |
| hp_r2_lasso | 5.9 | looks animated, not acted: overlap and snaps give it away (5.9/10) | overlap 0, snaps 0, weight 3.2 |
| hp_s3_strike | 5.8 | looks animated, not acted: overlap and snaps give it away (5.8/10) | overlap 0, snaps 0, anticipation 2.4 |
| zg_neutral | 8.3 | passable, weak on reference and silhouette (8.3/10) | reference 3.1, silhouette 9.1, timing 10 |
| zg_neutral_a | 8.3 | passable, weak on reference and silhouette (8.3/10) | reference 3.3, silhouette 8.5, timing 10 |
| zg_neutral_b | 8.5 | reads as human (8.5/10) | reference 4.2, silhouette 9, timing 10 |
| zg_neutral_c | 8.3 | passable, weak on reference and silhouette (8.3/10) | reference 3.3, silhouette 9.1, timing 10 |
| zg_neutral_d | 8 | passable, weak on reference and silhouette (8/10) | reference 2, silhouette 9.3, timing 10 |
