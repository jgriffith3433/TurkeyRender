# Space staging: what reads, what doesn't (for the rewrite)

Written 2026-11-08 after the v1 final (31 A faults in review, about 20 of them in space) and three days of fixing them. Set: `library/sets/space.json` (origin [0, 300, 1500]). Hawkes Punch's own moods are hp_space_*, plus `acts/55-space-light.json`. Native bodies.

## Reads well
- **Close and medium shots of the two of them with something big and lit behind** (the Earth or Jupiter). st_close, st_look and st_ask read in every frame: two faces, a lit planet, gentle head turns. Build the dialogue scenes like this.
- **A lit close-up of one face** (s_drift_cu: lens 70, faceFill 0.6, sunRim 1.6, the rim and fill lights up). The face, eyes and a smile all read. A joke that lives on a face needs this shot.
- **Small props in a hand** (the can, Mars at scale 0.8 in the hand). Attach is exact since the engine fix.
- **One clear action per shot from the side or three-quarter view**: the kick (m_tag), the fist pump, a flinch as an upper-body layer.
- **A pale prop drifting in the background** (the ghost): readable when its emission is low, its size about 1.5 m, and its distance 12-25 m.

## Doesn't read
- **Scale.** At any distance where a planet looks like a planet, the people are specks. The w_swing, w_catch, w_ch2_b-d and w_ch2_f wides show a 2-pixel man next to a planet, and the review calls them empty or unreadable. Planets in a hand must be shrunk (0.4-1.1) and grown back off screen. Every cut that hands a planet from scale 16/60/90 to a hand, or back, popped in the review (w_catch, w_ch2_c, w_ch2_d, w_ch2_f). **Rule: one planet size per shot. Change size only off screen or under a cut.**
- **Two people 24 m apart** (throw_l to throw_r) cannot be in one readable frame. A standoff or rally between them only works as cross-cut singles, never as a wide.
- **Throw chains** (lasso, swing, throw, catch) across cuts: the rope end, the swing radius and the catch offsets don't line up from shot to shot. The planet jumps 400 px a frame, the rope points at nothing, rings cut through bodies. Each needs hand-tuned offsets per shot. Budget one throw gag, not five.
- **Black tee on black space.** Under 2% contrast unless the rim and fill are up (rim 1.8, fill 1.4, sunRim 1.3+, faceFill 0.45+). A shot against bare stars needs a lit planet or nebula behind him or a strong rim. The shot check's `readable` catches it.
- **Full-frame impact flashes** read as glitches in space. Keep `flash` at 0.25 or below and `count` at 20 or below.
- **Debris squares** (fx impact) are unlit flat quads, so keep them small, few and off faces.

## Clip and engine traps in space
- **Root motion pitches the body.** mx_stomach_hit (and any fall clip) leaves his root lying flat, and the next cards' casts reset only position and heading. Every card after a hit needs `set rot`, or use a layer (`mask: upper`) for the reaction.
- **mx_boxing_dodge** and other travelling clips teleport him when the next clip starts. Use them as upper-body layers.
- **mx_hit_reaction is banned**, and mx_thumbs_up is a crouched fist pump with no thumb (banned). There's no catalogued seated thumbs-up; Cheer2 on `rightArm` is a clean fist pump.
- **Looping one-shot clips** (mx_look_over_shoulder) snap back mid-shot: give them `once: 1`.
- **`fly` with `face: 1`** pitches the body along the path, so a vertical fly lays him flat. Use `face: yaw` (mx_flying_idle needs it).
- **`hitstop` lags scene time behind song time.** A cast `set` at a cut can show up to 9 frames early in the shot before (w_out). Keep hitstops few, or cover the cut.
- **A camera inside geometry**: chase cameras (`follow`) through the asteroid field enter rocks (m_sling).
- **Gaze is real on native bodies now.** Keep head turns under 40° (`limit`), or use `eyes` for a look up or away.

## Cheap and safe for the rewrite
Dialogue two-shots and singles against a lit planet. Lit face close-ups. One physical gag per beat, shot from the side. Props at hand scale. The ghost as a background gag. Cross-cut singles for anything "far apart". Planets as backdrops, not projectiles, unless the shot is built just for that throw.
