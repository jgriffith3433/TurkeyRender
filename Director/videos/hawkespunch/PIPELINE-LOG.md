# Hawkes Punch: pipeline log

Every place the pipeline got in the way, was slow or lacked something, and the fix. Status: FIXED (done in the tool), WORKAROUND (done for this video, the tool still lacks it), OPEN. Greener's log is the model.

Song: "Hawkes Punch", 95.4 BPM (the brief guessed 128), 71 bars, 3:00, analysed by `mv song` while the cut was planned. Sections in `song.json` are coarse (four 4-bar blocks then 19-bar runs), so the beat sheet was placed from the timed lyrics and the drums stem (`LYRIC-MAP.md`).

## Faults, in the order they were met

1. **`face_act.mjs` was Greener's.** FIXED. Its line-by-line DIRECTION, the 147 s outro hack, the "Oh, darling" stem search, the 154.7 s song end and the `darling` shot were in the tool. Now: `videos/<v>/face-direction.json` is the direction (lyrics.json line order, same keys), the hacks run only for greener, the song end comes from `song.json`, and a word the dictionary lacks is spelt by rule (`g2p`) instead of stopping the tool.
2. **No lyric aligner existed.** FIXED. Greener's `lyrics.json` said "timed by whisper, aligned to lyrics.txt" and nothing in `tools/` did that. `tools/align_lyrics.mjs`: Needleman-Wunsch over normalised words, a near miss keeps J's spelling with whisper's time, and `--bars 9:1,10:1 --lines 2-5` places whole lines whisper never heard (verse 1's first four, sung low under no drums) one a bar.
3. **No ducking.** FIXED in the Node mix. `tools/mv/sound.mjs` reads `videos/<v>/duck.json` (`{from,to,gain,fade}`) and drops the song under each range with a smooth `volume` expression; `mv shot` and `mv final` mix through it. Transport.cs's own `mv render` mix does not duck (a slice render has the lines at full music). `tools/punch_lines.mjs` writes the ranges beside the `sfx` cues.
4. **The doctor had no mouth for a 10 s line.** WORKAROUND. `doctor_turn_cold`'s `talk` is 2.2 s on a fixed rhythm. `punch_lines.mjs` reads each line's mp3 envelope with ffmpeg and keys her `jawOpen` on it at 15 Hz (`acts/70-lines.json`), so the placeholder mouth follows the actual words. `talkAt: 30` on the performance keeps its own flaps out of the shot.
5. **Glasses and stethoscope could not sit on Person2's head bone** (its frame is not world-aligned; the sets agent tried four offsets). WORKAROUND: both ride her root (`"parent":"doctor"`, glasses at [0,1.565,0.15]) and are hidden from the wind-up on; fine while her head barely moves. A `parent` offset in the bone's own frame, read from `Director/gen/lab/_fix_doctor5.*`, would be the fix.
6. **Marks for a two-person stunt.** The space set had one mark per stunt. Added pairs an arm apart (`flick_b`, `kick_a/b`, `throw_l_face`, `earth_hands`...) to `library/sets/space.json` rather than raw `set` cues, so the camera presets read the right place.
7. **`over-shoulder` on a card map wants `on: [shoulder, subject]`.** The error text only shows the string form. Noted here so the next card writer knows.
8. **A `shot.look` must be an actor.** A point is the known build trap, so `aim_volley` is an empty actor in `acts/00-cast.json`.
9. **A performance's args only count on its first card**, so the second "say ahh" card gives the other one a raw `perform` instead of new args (the check warns; good).

## First build and the staging sheets (2026-11-07, afternoon)

10. **`bake.mjs` only baked `person`.** FIXED. `uses()` skipped every other actor, so the doctor's and the other one's takes played from source and the gate listed 23 NOT BAKED. It now reads the human actors from the video's acts (model `person*`) and passes each job's `model` to `bakedump` (which already took one), so Person2 bakes on her own rig.
11. **The gate counted a ragdoll's snaps.** FIXED. `punched_away` is a no-gravity ragdoll by design (gallery B); its 22 snaps failed the video total of 5. `library/bake-gate.json` has a `ragdoll` list whose takes are left out of the video totals (`bakegate.judge`).
12. **Person2 bakes keep one flipped elbow frame each** (doctor_turn_cold, doctor_punch). WORKAROUND: `elbowFlip` 0 to 2 in the gate with a note; the fix is reading her hinge axes from her skeleton in `tools/bake/mechanics.mjs`.
13. **Seated performances assume the root on the floor.** WORKAROUND. `take_can` brought the can to `toRel [0.22,0.98,0.3]`, chest height for a man whose root stands on the floor; on the `bed` mark (y 0.82, the pad) his root sits on the seat, so the hand went up behind his head. The point is now the parameter `chest`; the card passes 0.42. Any seated take with a `toRel`/`cam`/`to` point has the same trap on a seat-height mark.
14. **Space was black.** FIXED in the library. `lighting/space_sun.json` had fill 0.22 and an ambient of #0a0c16, so any body with its back to the sun was a hole, and `sunRim 1.4` in the moods blew a backlit body to pure white. Fill 0.9, rim 0.7, ambient #1a2040, sunRim 0.7, exposure up a little. The camera positions were right all along (`call peek` proved the geometry); the frames read as misplaced cameras.
15. **A `shot` override and the camera check.** `shot: {pos, look, rot: null}` on a spot preset works (w_lasso, w_catch), but `check` still warns "outside set" from the preset's own position. Harmless.
16. **The glasses on her root float when she leans** (doctor_examine, d_pad). They show only 16:1-21:3, where she stands straight. The head-bone offset is still the real fix (fault 5).
17. **A take that runs on ignores new args** (check warns): the second lasso's `spins`, the second "say ahh"'s `to`. Raw `perform` cues restart them where needed.
18. **`"music": 0`.** NEW (J: no music). `sound.mjs` scales the song input by `score.music` (0 removes it) while song.json keeps every time; `mv shot` and `mv final` mix through it. `mv render`'s own mix in Transport.cs still carries the song: a slice render is remuxed from the Node mix (`tools/remix.mjs`, below) rather than changing C#. `face_act.mjs --no-lips` keeps blinks, darts and expressions and shuts the sung mouth; the doctor's spoken-line mouth is `70-lines.json`.

## J's slice notes and the clinic restage (2026-11-07, 14:00)

19. **Person2 bakes lifted her arm for the whole line.** FIXED by restaging. `doctor_turn_cold`/`doctor_punch` baked on her rig held the right arm up and half out of frame; the cleaner's hinge axes are the person's. The doctor now plays clips only (`stand`, `doctor_slide_can`, `doctor_punch`, `doctor_fist_offscreen`), gazes and blinks for the turn, and bakes per use with clean numbers (0 across).
20. **Any `layer` on Person2 throws both arms straight out.** OPEN in the engine, WORKED AROUND. Every `g_*` gesture (point, nod, hand to cheek) on her reads as a T-pose arm; the cards give her none. The exam is sold by him reacting and her standing still.
21. **Body contact can't be staged safely yet** (the motion check on the slice: self 12, joint 11, prop 6, bodies 3, hand 2). The clinic is restaged the way films sell it: wind-up in a two-shot, hard cut on the hit to his face snapping back with the flash and hitstop; the can slides across the desk under her hand, an insert of his hand closing on it, him with it at his chest; no reach to a face or chest anywhere; singles instead of over-shoulders.
22. **`take_can` and seated `toRel` points.** OPEN. On the desk chair (root on the floor) the hand still went straight up to the ceiling with the can; the card now does the take by hand (`reach` to the can, fingers, `attach`, release) and the arm comes back to the sit clip's rest.
23. **The space drift was the performances, not the bakes or the cameras** (found by the performance agent): 15 Hawkes Punch takes played no clip of their own, so `keys` hips/root stacked frame on frame (lasso_throw +9 to +18 m, the other 17 m off his mark through the volley). Fixed in `library/performances` with a `base` clip param; their bakes are stale until the next build. `mv lab` probes with `probe`/`probeBones` were the fast way to see it (hips 15 m above the root at t 0.1 from source, at any position).
24. **Camera inside the subject.** `cam_desk_top` (1.0,1.25,0.95) sits in the patient's face when he is in the desk chair: his desk singles come from `cam_over_desk`. A `check` for a camera inside a cast actor's head would catch this.
25. **sound.mjs only mixes sfx that start inside the window** (the sfx agent): beds that began earlier are missing from an `mv shot` preview. OPEN; a final mixes from 0 and is right.

## Part 2a, the symptoms scene (2026-11-07, 15:00)

26. **Lengthening a video means lengthening its clock.** NEW. The scene needed 12 bars where 4 were, so the cut runs 8 bars past the song's last beat; cards, lint and Unity (the timeline's fixed length is `song.json` duration) all stop at the song. The rebase (`_backup/pre-symptoms/`, script in the agent's scratchpad, numbers in `_backup/pre-symptoms/rebase.json`): 32 beats appended to song.json at the last bars' spacing, duration 200.187, envelopes padded with zeros; both copies of the (muted) song padded with silence, since `sound.mjs` mixes `amix duration=first` with the song first and would end the sound at 180 s; every absolute time after old 13:1 moved by the song's own beats, t -> timeOf(beatOf(t)+32): `punch_lines.mjs` LINES, `acts/80-sfx.json` (91 cues moved, the three `c_sing` cues dropped), lyrics.json lines from 12:4 on (face_act keys expressions on them), the bar pins in cut.json and acts/00-cast.json. A tool for this (`mv cards insert <at> <bars>`) would be worth having: every hard-coded second in a video is a trap when the cut moves.
27. **A bed that spans the insert.** `bed_clinic.mp3` (50.4 s, its dips baked in at the turn and the drums-out) became `bed_clinic_long.mp3`: 20.17 s of the steady hum spliced in at 30.35 s with 0.3 s crossfades, so the dips still land on l_turn and the old drums-out.
28. **face_act --no-lips now leaves the jaw alone**, so a spoken-line mouth from `punch_lines.mjs` (now `mouth: person` too) is never zeroed by a lyric word's key.
29. **The tiny YAML doesn't unescape `''`** inside a single-quoted scalar: write the idea without quote marks.
30. **`mv lint` reported mx_sit_still as unknown** until `--reindex` (fault 5 of Greener's log again).

## The hybrid native path (2026-11-07, evening)

31. **Native on.** `"native": true` in score.json. Every human beat is now a clip (cast `clip:` or a raw `anim`/`layer`), a derived clip, or a post-Animator reach/gaze/fingers/face. The build's native notes list no dropped keys, poses, stances or additive layers. Only `steps` and `speed` don't reach native bodies, so the punch's `hitstop` freezes the world and the flash but not the bodies. No library performance is used by a human any more; the 32 Hawkes Punch performance files are unchanged, and the cards carry their acting directly.
32. **Clip timings are measured, not guessed.** `clip_admit` on the 28 new mx_ clips gave motion beats but no hit times, so a lab probe of the striking bone at 30 Hz found them: hook punch contact about 1.0 s, cross 1.0, roundhouse 0.8, throw release 0.9, baseball pitch 2.1, goalie overhand 1.6, goalie catch 0.36, stomach hit 0.1, flying-back-death launch 0.45. The sitting-drinking clip sips with the right hand from 7.5 to 11.3 s (probe script in the agent's scratchpad; numbers in `captures/cliptimes.json`). Missing from the 37: sitting_thumbs_up, clap_seated, waving, telling_secret, relieved_sigh, breathing_idle, sitting_hands_thighs, dizzy_idle; stand-ins: mx_thumbs_up on the right arm, mx_sit_still, IdleBreathe, Idle1HaveNoClue.
33. **Derived clips.** `sit_cough` (mx_sit_idle with two chest and head jolts at 1.4 s) via `call clipderive`; admitted. `sit_knee_kick_r` (the proof's) admitted too.
34. **Seats were the wrong height.** A seated clip puts the hips about 0.58 m over the root, a chair seat height. The studio stools are 0.80 tall (stool_l/r marks to y 0.35), the clinic stool 0.58 (desk_doc to y 0.13, and moved back 0.26 m with the stool, so her thighs clear the desk), the bed mark to 0.40, the waiting chair mark to 0.08. In the old cards' frames the stool's ring sat at their waists.
35. **Two solid slabs in the clinic set.** `skirting` was one 5 x 4.5 m box 8 cm high over the whole exam room floor, so every standing foot was "in" it; `rec_trim` was a 7 x 5 m slab at 0.86 m across the reception, through the waiting chairs (likely the dark slab in cam_room_wide). Both are four wall strips now. The doctor's stand marks are up 3 cm (her clips' feet sat 2-4 cm under the floor).
36. **The contact gate on the slice (motioncheck 20-90, person, doctor, other):** 0 bodies, 0 prop, 0 self (her cutaway is tighter so his crossed legs are out of frame), 1 hand. The one hand finding: the can attached to her hand reads 0.42 m off before the throw in the check. The frames show the can in her throwing hand and in his lap after, so it is probably how the check reads an attach on a native bone; I have not proven that. Joints left are the clips' own (hook punch hip, falling-air ankle, the throw's head twist 45.5). The pops left are the throw's release, the punch, and his flight (the clip switches on the cut into p_travel now, not by a crossfade in view).
37. **Staging changes forced by contact:** the prescription is now a throw (she fires the can at him from a metre; it lands in his lap), not a toss over her shoulder (out of reach, shoulder 84 degrees behind her back). After the catch his arm rests with the can (a native reach can't hold a point; it missed by 14 cm). Gazes carry `limit` or `head: 0` where the head twisted past 45.
38. **Contact gate, space and the commercial (2026-11-07 evening).** Found by the gate and fixed in cards:
    - From 118 s his root stayed pitched flat after mx_stomach_hit, because a cast resets only position and heading. He lay horizontal through the second rally. Fixed with a `set rot` on w_gut and w_earth, and w_gut now plays mx_dizzy_idle.
    - A dropped Earth-reach release left IK pulling his arms at a far-off Earth for the rest of the video.
    - Native attaches don't follow a hand through a big arm move. The commercial cans are now the video's own actors (tv_can_a/b), held through the drink and put down after it.
    - Overreaching reaches came out (s_tap, s_flick). The catches moved further out. The chase double flies above his line. Saturn was caught at scale 0.5.
    - `fingers set` freezes a native clip's fingers into a fan, so every hand now gets `curl 0.42` on top of the clip.
39. **Shot-check readable:** a black tee on black space read under 2% contrast. Hawkes Punch now has its own moods (hp_space_*: sunRim 1.3, faceFill 0.45), plus a brighter rim and fill from the drift on (acts/55-space-light.json). The shared rig and moods are untouched, because _shotcheck_test uses them.
40. **Punch-up (PUNCHUP.md) applied:**
    - Lines: tools/punch_lines.mjs reads lines.json (exported), with 40 new lines and mouths for him, his double (`other`) and the doctor.
    - Hard cuts are trimmed mp3 copies: the scream at 82.90, bed_sky, sonic_boom, and him_button at the fist.
    - Clock and cut: `mv cards insert end 5b`. In the cut, w_earth_back is 8b, w_ch2_e is cut, the ad is re-timed with tv_doc, tv_ahh/tv_ahh2 are cut, b_room is 6b, and s_drift is split for a lit close-up (s_drift_cu).
    - Clips: mx_sitting_thumbs_up, mx_clap_seated, mx_waving and mx_dizzy_idle were imported and cleaned.
    - Banned clips replaced: mx_hit_reaction became boxing_dodge/falling_air, and mx_thumbs_up is gone.
    - The ghost set piece (#15) is not done.
41. **v1 final** (`output/hawkespunch-v1.mp4`, 203.3 s, 1280x720, join clean, no song): the review found 31 A faults. About 20 are in space (scale, throw chains, flashes). The rest are fixed in cards and not yet re-rendered:
    - the nurse's snap turn;
    - his loop seam in sym_write1;
    - the punch debris and a camera that chased his head;
    - root-motion teleports and pitches (flinches are now upper-body layers, plus `set rot` after the stomach hits);
    - the full-frame flashes;
    - Mars arriving planet-sized in w_ch2_f;
    - the can arm in tv_other;
    - the last frames of b_can.
    J then asked for a script rewrite, so space and commercial polish stopped. Space limits are written up in SPACE-STAGING.md.
42. **w_out's 9-frame jump, root cause:** every `hitstop` pauses scene time while song time runs on. Cast `set` cues run on scene time and cuts on song time, so after N hitstop frames every cast change lands N frames before its cut. Moving the cut moves the set with it, so that doesn't help. The three space hitstops are gone, so the lag after 73 s is the punch's 3 frames. It's an engine issue, reported.
43. **Draft 2 (SCRIPT.md) built to previs, 2026-11-08.**
    - **Generation:** one shot list (scratchpad `script2.py`) writes cut.json (73 shots, in seconds, 208.8 s), lines.json (41 lines), acts/80-sfx.json, and acts/55-space-light.json. 80-sfx.json has room-tone beds trimmed to each scene in Sfx/punch/script2/, so the only silence is scene 5.
    - **Cards:**
      - draft2_clinic.yaml: the waiting room, the gloves insert, the new prescription beats, the turkey, the next day.
      - playground.yaml: scenes 5-8 and the end.
      - draft2_ad.yaml: the ad's new shots and the full-frame cards.
      - Kept from before: the symptoms cards, d_can, d_take, l_line, l_react, l_mouth, p_hit, p_face, p_glass, p_travel, tv_fold, tv_doc, tv_both, tv_thumbs, b_can. The old space cards are in _backup/script2.
    - **Props** (Assets/Videos/hawkespunch/Props): gloves_frame.png on a thin cube on the exam room's north wall, plus next_day.png, side_effects_1/2.png and end_card.png as `gfx: image` cards.
    - **The playground:** Jupiter is scale 140 at [30, 315, 1900], always behind and right. The little planets are Mars 0.55, the ringed one 1.4, the Earth 0.45. Marks are pg_* in library/sets/space.json.
    - **Traps found:**
      - A `set` on a body doesn't override an earlier `fly`, which holds its end, so bodies are placed with a 0.02 s fly.
      - A one-shot clip (`once`) holds its last frame, step included, until another `anim`. A cast that repeats the same clip doesn't re-issue it, so return to the base clip explicitly.
      - p_travel's follow camera lost him after the cut order changed; it's a dolly riding his climb now.
    - **The coat:** there's no coat asset, so her white top stands in.
