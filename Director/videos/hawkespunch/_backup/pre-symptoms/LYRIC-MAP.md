# Hawkes Punch: lyric map and beat sheet

**J, 2026-11-07, after the first previs: no music.** The song stays as the clock (every time below still holds, the cut is unchanged), but the mix leaves it out (`"music": 0` in score.json) and nobody lip-syncs the lyrics (`face_act.mjs --no-lips`). The three spoken lines, the sfx and a sound-design pass (`acts/80-sfx.json`) are the sound. The lyric references below are landmarks for timing, not things anyone sings on screen.

The song is 95.4 BPM, 4/4, 0.629 s a beat, 2.518 s a bar, 71 bars, 3:00. Bar 1 beat 1 is at 0.165 s. Not the 128 the brief guessed: everything here is in bars at 95 (`song.json`), and the cut is in beats, so a different song reflows it.

Lyric times are `lyrics.json` (whisper on the vocal stem, aligned to `lyrics.txt` by `tools/align_lyrics.mjs`; verse 1's first four lines were below whisper's ear and sit on bars 9-12, one a bar). The drum hits come from the drums stem (`captures/hits`): the loudest moment of the song is **41:1 (100.79 s)**, in "Put the Earth back"; the punch itself lands on **22:1 (52.99 s)**, the downbeat of chorus 1, the word "Hawkes", after a bar and a half with no drums at all (20:4-21:3, 49.85-52.37 s) which is the room going still.

## Sections

| Bars | Time | What the song does | Lyric | Part |
|---|---|---|---|---|
| 1-4 | 0.2-10.2 | intro, synths, "Ooh, ooh, say ahh" at bar 2 | intro | 1. Waiting room |
| 5-8 | 10.2-20.3 | DROP, drums, no vocal | | 2. The consultation (the exam on the beat) |
| 9-12 | 20.3-30.4 | BREAK, vocal alone | verse 1: woke up green, waiting room, nurse did not blink, a thousand folks like me | 2. He sings from the bed |
| 13-16 | 30.4-40.4 | drums back | verse 1: tapped me on the knee, case of life, wrote a word, slid it over | 2. The prescription, the can |
| 17-19 | 40.4-47.3 | pre-chorus | it's not for everyone, she said / for everyone like you / one a day until it's gone | 3. The turn, the line (spoken 43.2-53.0) |
| 20-21 | 47.3-53.0 | the drums drop out at 20:4 | never really gone, it's true | 3. Still. He opens his mouth |
| 22 | 52.99 | **the hit** | "Hawkes Punch, baby" | 4. The punch |
| 22-25 | 53.0-63.1 | chorus 1 | swallow the sky / one for the morning / healthy amount / shut up and drink it | 4. The flight |
| 26-29 | 63.1-73.1 | chorus 1 tail + a bar of air | here comes the floor / you asked for more | 5. Space, alone; the tap, the flick, the bolt |
| 30-35 | 73.1-88.2 | verse 2 | past the ceiling, past the blue, found a guy, tag you're it (82.9), hide behind a planet boo (84.9) | 6. Cat and mouse, small |
| 36-41 | 88.2-103.3 | verse 2 end, pre-chorus 2 | rope a ring around the Saturn (89.1), throw a world (90.3), catch a planet in the gut (98.1), put the Earth back (100.4) | 7. Lassos, the volley, the Earth |
| 42-49 | 103.3-123.4 | chorus 2, the biggest | Hawkes Punch, baby... you asked for more | 7. Dodgeball with worlds |
| 50-56 | 123.4-141.0 | "oooh", then the bridge, drums thin | out of breath, forehead to forehead, is it right for you, ask your doctor | 8. The stop; the set folds out on 56:3 |
| 57-69 | 141.0-173.7 | chorus 3, outro "say ahh" | Hawkes Punch, baby / say ahh / say ahh | 9. The commercial (announcer 156.6-170) |
| 70-71 | 173.7-180 | the last fill, "Hawkes Punch" at 176.8 | | 10. The button |

## Beat sheet (one line a shot)

Clock is bar:beat. Shares against the brief: waiting 6%, consultation 17%, line 7%, punch and flight 6%, alone 6%, small chase 8%, worlds 20%, stop 10%, commercial 18%, button 3%.

**1. Waiting room** (sick, small)
- 1:1 `w_clock` the clinic clock and the empty pale room, the turkey nurse behind reception. Feel: nobody wants to be here.
- 2:1 `w_sits` he on a waiting chair, slumped, green, coughs on "ooh". Feel: small.
- 3:1 `w_nurse` the nurse looks up at him and does not blink. Feel: seen a thousand like him.
- 4:1 `w_ahh` exam room, "say ahh": his jaw drops for her, close. Feel: ridiculous.

**2. The consultation** (reassured)
- 5:1 `c_wide` the room: he on the paper bed, she leans in. Feel: in good hands.
- 6:1 `c_eyes` her hand lifts his chin, she reads his eyes. Feel: kind.
- 7:1 `c_steth` the stethoscope on his chest, her head tilted. Feel: calm.
- 8:1 `c_knee` the knee tap: his leg kicks on its own, he grins. Feel: ha.
- 9:1 `c_sing` he sings verse 1 from the bed, green, to us. Feel: he is telling us how it went.
- 11:1 `c_sing_side` same, from the side, she writes. Feel: routine.
- 13:1 `d_pad` she at the desk writing the word. Feel: official.
- 14:1 `d_face` his face: reassured, a small smile on "case of life". Feel: relief.
- 15:1 `d_can` the red can slides across the paper to him, her hand riding it; her voice: "every day until the symptoms go away" (35.0-39.5). Feel: that's it?
- 16:1 `d_take` he takes it, looks at her. Feel: okay then.

**3. The line** (uh oh)
- 17:1 `l_turn` she turns to him and the room goes still. Feel: something changed.
- 18:1 `l_line` her face, flat, the line (43.2-53.0), a slow push. Feel: uh oh.
- 20:4 `l_mouth` the drums stop; he opens his mouth to answer. Feel: don't.

**4. The punch** (whoa)
- 21:4 `p_hit` her wind-up, the hit on 22:1 with hitstop and a flash, he goes through the window, the roof plug pops. Feel: WHOA.
- 22:2 `p_glass` from outside: the glass bursts toward us and he is through it. Feel: speed.
- 22:3 `p_travel` one travelling shot riding him up through the clouds, the sky goes black, stars, the can tumbling after. Feel: and up, and up.

**5. Space, alone** (lonely, then play)
- 26:1 `s_drift` he drifts, loose, the can floats by. Feel: silence in the picture.
- 28:1 `s_earth` small against the Earth. Feel: alone.
- 29:1 `s_tap` a tap on the shoulder: the other one, grinning. Feel: wait, what.
- 29:3 `s_flick` nose flick, then he bolts. Feel: game on.

**6. Cat and mouse, small** (fun, escalating; one stunt a bar, silhouette on a planet)
- 30:2 `m_field` the chase through the asteroid field, two silhouettes. 31:1 `m_sat` the other rides a satellite like a bronco. 32:1 `m_sling` slingshot round Mars. 33:1 `m_tag` the kick on "tag you're it" (82.9), the other spins like a top. 34:1 `m_moon` hide and peek behind the moon on "hide behind a planet". 35:1 `m_boo` jump scare out of the comet's tail on "boo" (87.2).

**7. Worlds** (absurd, huge)
- 36:1 `w_lasso` the first lasso: Saturn roped by the rings on "rope a ring". 37:1 `w_swing` hammer-swung and thrown on "throw a world". 38:1 `w_catch` the other catches Saturn (it shrinks to a ball on the way) and throws it back. 39:1 `w_volley` he dodges Saturn, Mars hits him in the gut on "catch a planet in the gut" (98.1). 40:1 `w_gut` folded round Mars, winded. 41:1 `w_earth` the loudest hit: he grabs the next world and it's the Earth; both stop. 42:1 `w_earth_back` they put it back, carefully, hands up. 43:1 `w_ch2_a` chorus 2: straight back to it, the other lassos Jupiter. 44:1 `w_ch2_b` Jupiter swung and thrown. 45:1 `w_ch2_c` he catches it and bowls it back down a lane of asteroids. 46:1 `w_ch2_d` the other dodges over it. 47:1 `w_ch2_e` both throw at once, both catch. 48:1 `w_ch2_f` both wind up, face to face. 49:1 `w_out` they let the worlds go, spent, on "oooh".

**8. The stop** (quiet)
- 50:1 `st_close` out of breath, drifting together. 52:1 `st_forehead` forehead to forehead, nothing to say. 53:1 `st_look` "is it right for you": both look at the lens. 54:3 `st_ask` "ask your doctor": a look between them, then at 56:3 the set folds out of the stars around them.

**9. The commercial** (cheesy, bright)
- 57:1 `tv_wide` the set, the sign, the stools, the lower third. 58:1 `tv_him` him pitching. 59:1 `tv_other` the other points at the lens. 60:1 `tv_can` the giant can. 61:1 `tv_both` both drink. 62:1 `tv_thumbs` thumbs up. 63:1 `tv_ticker` the announcer (156.6-170) over the side-effects ticker, too fast to read. 65:2 `tv_ahh` "say ahh" to the lens, him. 66:2 `tv_ahh2` the other. 67:2 `tv_sign` the sign and the can. 68:3 `tv_hold` the held smiles until the fill.

**10. The button** (punchline)
- 70:1 `b_room` hard cut: the exam room, him on the bed, green, looking at us. 70:2 `b_fist` the fist from off screen; black. 71:1 `b_can` the can rolls into frame. "HAWKES PUNCH".
