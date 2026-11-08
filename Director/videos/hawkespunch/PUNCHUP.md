# Hawkes Punch: punch-up and script for space and the commercial

2026-11-07, comedy pass for J's note: "keep making this video... make it fun and amazing". No song and no singing: voices, sfx and ambience only. This file is the plan. Nothing in cards, acts, cut.json or score.json was touched. The new voices are in `Assets/MusicVideo/Sfx/punch/lines2/`.

Times are song seconds on the current clock (`song.json`, 0.629 s a beat). Shot times come from cut.json as it is now, except where a change below moves them. "+0.4s" means 0.4 s after the shot's first frame.

## What the slice (20-90 s) shows now

- **The clinic works.** The symptoms singles, her unblinking writing, the can thrown and caught, the low-angle wind-up and the glass burst all read. The deadpan lands.
- **The flight (p_travel, 8.8 s) is long and silent in the comedy sense.** It is a small figure against the sky with whooshes and nothing to listen to. It needs a voice.
- **In s_drift he is a dark shape on a dark blue field.** His face can't be read, so a gag that lives on his face won't play there now. The can floating past is the only thing that reads.
- **Space has no words until the commercial.** The chase is clean physical comedy but has no point of view. Nobody says what anyone wants, so the "space ghost" setup from the clinic never pays off.

## The spine: what the story is now

He told the doctor he's in love with a ghost in space. She punched him into space. **So in space he's looking for her.** The first person to tap him on the shoulder must be her ("...Space ghost?"). It's him: same face, red tee. The chase plays as a clumsy flirtation. At the stop, forehead to forehead, he asks the question again and gets the truth ("No, man. I'm you."). He says "You do have a face". That's the callback to "she doesn't have a face", and the scene tips into the ad, because the ad's question ("is it right for you?") is the question he's been asking all along. The doctor's deadpan returns twice: as the ad's testimonial, and in the button, where the announcer's last words ("Your doctor will punch you") come true.

"I tried silence once... more music" pays off where space is silent. His scream is cut dead when he leaves the atmosphere. In the silence he whispers "Silence." Beat. "...Nope. More music." No music plays: the joke is that he hears it anyway.

## 1. Punch-up list, ranked by laugh per effort

| # | Punch-up | Where | Effort | Why it's funny |
|---|---|---|---|---|
| 1 | **The scream cut dead by space, then "Silence." / "...Nope. More music."** | p_travel end, s_drift | Low: 3 voice cues and muting the beds from 82.90 to 88.2. Plus a face shot (see 2). | A physics joke and the best callback in the clinic scene at once. Silence is the setup, and his one line undoes it. |
| 2 | **"...Space ghost?" on the turn after the tap, then booped on the nose** | s_tap, s_flick | Low: 2 cues | The clinic's setup pays off within 10 seconds of arriving. He answers his own love story with a nose flick. |
| 3 | **The button: "Any symptoms?" / "Well, I met someone, and he—" WHAM** | b_room | Low to medium: b_room grows from 1 to 6 beats, and 5 beats of silence are added to the end of the clock | The prescription said "every day until the symptoms go away". He still has the symptom, so he gets his daily dose. Cut mid-word. |
| 4 | **The Earth: "Dude. Dude. That's the Earth." / "I know. I know." / "Sorry, everybody." / "Nobody saw that." then straight into "Okay! Jupiter!"** | w_earth, w_earth_back (made 8b), w_ch2_a | Medium: 5 cues, w_earth_back 4b to 8b, w_ch2_e cut to pay for it | The biggest set piece gets a real beat of shame, then the whiplash back to chaos. |
| 5 | **Side-effects read, fast and deadpan, ending "Your doctor will punch you."** | tv_ticker (15b) | Low: 1 cue, retime the ticker, new ticker text | Lists the whole video back as side effects. Its last line sets up the button. |
| 6 | **The stop as a rom-com scene that turns into an ad** | st_close to st_ask | Low: 7 cues, nods moved | "Are you... the space ghost?" / "No, man. I'm you." / "You do have a face." Then the double turns to the lens: "Are you feeling like there's two of you?" |
| 7 | **The doctor's testimonial: "I've prescribed it to a healthy amount of people."** Lower third "A REAL DOCTOR / Not looking up". | new tv_doc (4b), reusing sym_write2's shot | Medium: a new commercial shot from an existing clinic setup; tv_ahh and tv_ahh2 are cut to pay for it | Her deadpan in the shiny ad, and the "healthy amount" callback. It also puts her back on screen just before her fist. |
| 8 | **"Right in the... Mars."** winded, as the Earth drops into his hands | w_gut | Low: 1 cue | A pun he's too winded to enjoy. |
| 9 | **"Mmm! Tastes like a fist!" / "A good fist."** | tv_thumbs (made 6b) | Low: 2 cues | The product is a punch. |
| 10 | **"BOO!" then his embarrassingly high "Aah!"** | m_boo | Low: 2 cues | The jump scare gets a reaction we hear. |
| 11 | "Oh. That worked." after the first lasso closes on Saturn | w_lasso | Low | He's as surprised as we are. |
| 12 | "No, YOU'RE it!" on the kick (answers "You're it!" from the bolt) | s_flick, m_tag | Low | Gives the chase a rule and a rivalry. |
| 13 | The double's impression of the doctor: "Shut up and swallow the damn planet." | w_ch2_f | Low | A callback with a planet in his hand. |
| 14 | Commercial pitch lines: "Hi there! I'm a patient." / "Do you hear music when it's quiet?" / "Are you in love with someone in space?" | tv_wide, tv_him, tv_other | Low | His symptoms are now the ad's target audience. |
| 15 | **The space ghost is real.** A faceless white sheet ghost, a soft-glow prim with no face, drifts behind him in s_earth while he says "She's out here somewhere." (he's looking the other way). It drifts again behind them in st_look and waves. Nobody notices. | s_earth, st_look | Medium to high: a new prim set piece (capsule body, sphere head, a small arm prim that rotates) plus move cues | A reward for viewers who watch twice. It answers "does a ghost actually appear?" without the characters ever knowing. |
| 16 | Tighten p_travel: the scream starts at 80.40 and the sonic boom lands in it | p_travel | Low | Gives the long flight a voice and an endpoint. |

## 2. Script, with placements

H = him (purple tee), D = the double (red tee), DOC = the doctor, ANN = the announcer. Each line names its file in `lines2/`. "Start" is when the file starts, in song seconds. Mouths: `punch_lines.mjs` keys jaws for `person` and `doctor` today. The double needs `mouth: 'other'` (same envelope method). The announcer has no mouth.

### 4/5. The flight and space, alone

| Shot | Start | Who | Line (file) | Delivery and staging |
|---|---|---|---|---|
| p_travel | 80.40 | H | "Aaaaaah!" (`him_scream_flight`, 3.29 s) | A long open scream riding the climb. The sonic boom at 80.73 lands in it. **Every sound stops hard at 82.90** (scream, rise_whoosh, bed_sky): no fade. The scream is cut mid-note. |
| s_drift | 84.60 | H | "Silence." (`him_silence`, 0.69) | A whisper, eyes opening, a small relieved smile. **Dead silence from 82.90 to 88.2**: move bed_space from 83.185 to 88.2. |
| s_drift | 86.50 | H | "Nope. More music." (`him_more_music`, 1.48) | Deflated and flat. Eyes go up and to the side, listening to music we can't hear; the smile drops. |
| s_earth | 88.45 | H | "She's out here somewhere." (`him_out_here`, 1.19) | Wistful, to himself, small against the Earth. (Ghost gag #15 drifts across the back here.) |
| s_tap | 90.10 | H | "...Space ghost?" (`him_space_ghost_q`, 1.84; the words start 0.76 s in, about 90.86-91.94) | Hushed and hopeful, mid-turn. Face: eyesWide 0.4, smile 0.35, not fear. He thinks it's her. |
| s_flick | 92.45 | D | "Boop! Ha!" (`dbl_boop`, 1.20: "Boop" 92.45-92.89, "Ha" about 93.3) | "Boop" lands on the flick at 92.49 with the nose_boing. |
| s_flick to m_field | 93.60 | D | "You're it!" (`dbl_youre_it`, 0.86) | Shouted over his shoulder as he bolts (the bolt is at 93.37). |
| m_field | 94.30 | H | "Hey! You have my face!" (`him_my_face`, 2.28) | Indignant, mid-chase, running into the m_sat cut. |
| m_sat | 96.60 | D | "Yeehaw!" (`dbl_yeehaw`, 1.60) | A rodeo whoop on the satellite, the Cheer2 arm up. |
| m_sling | | | (nothing) | Physical. Keep the turkey gobble as the Mars turkey watches him pass. |
| m_tag | 102.25 | H | "No, YOU'RE it!" (`him_no_youre_it`, 1.01) | "it!" lands on the kick contact at 103.05 (kick_thud_a 103.057). Face smile 0.5, as now. |
| m_moon | 104.95 | D | "Peekaboo!" (`dbl_peekaboo`, 1.39) | Sing-song as he pops out of the crater at 105.04. |
| m_boo | 107.00 | D | "BOO!" (`dbl_boo`, 0.61) | On his reveal at 1.9b (107.02), with jump_scare_a. |
| m_boo | 107.33 | H | "Aah!" (`him_shriek`, 0.63) | A high, embarrassing yelp on the hit reaction (2.4b). |

### 7. Worlds

| Shot | Start | Who | Line (file) | Delivery and staging |
|---|---|---|---|---|
| w_lasso | 110.60 | H | "Oh. That worked." (`him_that_worked`, 1.42) | Quietly impressed with himself, just after rope_snap_a at 110.49. It runs into w_swing; that's fine. |
| w_swing | | | (nothing) | Physical. |
| w_catch | 114.50 | D | "Is that all you got?" (`dbl_all_you_got`, 1.12) | Trash talk between the catch (114.32) and his throw (release 115.77). |
| w_volley | | | (nothing) | Physical. oof_b stays at 118.275. |
| w_gut | 118.45 | H | "Right in the... Mars." (`him_right_in_mars`, 2.78: "Mars" about 120.4-121.2) | A strangled wheeze. **Drop heavy_breathing at 119.003**; the line is the breathing. "Mars" lands as the Earth drops into his hands. |
| w_earth | 121.30 | D | "Dude. Dude. That's the Earth." (`dbl_thats_earth`, 2.29) | An urgent hushed whisper, all the swagger gone. Both frozen. |
| w_earth_back (now 8b, 123.43-128.46) | 123.75 | H | "I know. I know." (`him_i_know`, 2.12) | A tense whisper through his teeth, still holding it. |
| w_earth_back | 125.95 | H | "Sorry, everybody." (`him_sorry_everybody`, 1.58) | Soft, to the planet as it goes back, like setting down a sleeping baby. |
| w_earth_back to w_ch2_a | 127.60 | D | "Nobody saw that." (`dbl_nobody_saw`, 1.36) | A quick side-of-mouth whisper, hands up (Idle1HaveNoClue). |
| w_ch2_a (now 128.46) | 129.00 | D | "Okay! Jupiter!" (`dbl_okay_jupiter`, 1.99) | Instantly cheerful again. "Jupiter!" goes with the lasso throw at +0.9 s (129.36). |
| w_ch2_b to d | | | (nothing) | Physical. |
| w_ch2_f | 138.70 | D | "Shut up and swallow the damn planet." (`dbl_swallow_planet`, 2.52) | A flat impression of the doctor while flexing, a planet in his hand, fighting a grin. It runs into w_out, where they let the planets go. |

### 8. The stop

| Shot | Start | Who | Line (file) | Delivery and staging |
|---|---|---|---|---|
| st_close | 144.20 | H | "Are you... the space ghost?" (`him_are_you_ghost`, 2.64) | Panting, tender, hopeful. Keep heavy_breathing at 144.16 low (0.3). |
| st_close | 146.95 | D | "No, man. I'm you." (`dbl_im_you`, 1.59) | Out of breath, gentle and kind. Ends about 148.55. |
| st_forehead | 149.30 | H | "You do have a face." (`him_you_have_face`, 1.71) | Very soft, a little let down, still smitten. 85 mm, forehead to forehead, a blink after. |
| st_look | 152.30 | D | "Are you feeling like there's two of you?" (`dbl_two_of_you`, 2.15) | His eyes go to the lens (as now, 151.8) and the voice turns into a TV voice. Optional: a layer of `mx_point_bent` on his right arm (he's male, so the Person2 layer fault doesn't apply). |
| st_ask | 155.40 | H | "Is it right for me?" (`him_right_for_me`, 1.26) | Quiet and sincere, to him, not to the lens. |
| st_ask | 156.90 | D | "It's right for everyone like you." (`dbl_everyone_like_you`, 1.86) | Heartfelt. It echoes the doctor ("you are just one of them"). |
| st_ask | 158.90 | H | "That's me!" (`him_thats_me`, 0.72) | A delighted realisation. **Move the nods to 6.4b and 6.7b and the smiles to 6.3b and 6.5b**, so the nod is his answer. The fold follows at 159.91. |

### 9. The commercial (new order and lengths below)

| Shot | Start | Who | Line (file) | Delivery and staging |
|---|---|---|---|---|
| tv_wide | 161.70 | H | "Hi there! I'm a patient." (`him_tv_hi`, 1.91) | Cheesy daytime host, a big fake smile, after the jingle hit. Duck the applause under it. |
| tv_him | 164.10 | H | "Do you hear music when it's quiet?" (`him_tv_music`, 1.75) | Concerned and sincere to the lens, `mx_sitting_talking`. |
| tv_other | 166.30 | D | "Are you in love with someone in space?" (`dbl_love_space`, 2.40) | Pointing at the lens (`mx_sit_point`, as now). The lower third "ALSO HIM / Also a patient" stays, so the intro gag is visual. |
| tv_doc (new) | 168.60 | DOC | "I've prescribed it to a healthy amount of people." (`doc_testimonial`, 2.72) | Flat monotone, writing, never looks up. Pre-lap 0.1 s over the cut. pen_scratch_a at +0.2. |
| tv_can | 171.45 | ANN | "Hawkes Punch." (`ann_name`, 0.95) | Deep and slow, a car-ad read over the turning can. |
| tv_both | | | (sfx only) | Drinking: psst, three gulps, ahh. The existing cues move +2.52 s. |
| tv_thumbs (now 6b) | 176.40 | H | "Mmm! Tastes like a fist!" (`him_tv_fist`, 2.22) | Delighted, sold. Starts with the ding at 176.3. |
| tv_thumbs | 178.70 | D | "A good fist." (`dbl_good_fist`, 1.60) | A connoisseur's nod: put `mx_nod` on his head at 178.7. |
| tv_ticker (now 15b, 180.03-189.47) | 180.10 | ANN | the side-effects read (`ann_side_effects`, 9.67, sped up 1.4x from a 13.5 s take) | Rapid, deadpan, no breath. Text: "Side effects may include sudden flight, meeting yourself, throwing planets, briefly holding the Earth, forehead contact, music in total silence, and falling in love with a space ghost. Do not take Hawkes Punch if you are allergic to punches. Your doctor will punch you." The two of them nod along, smiles fixed (the nods at 2b and 4b as now). |
| tv_ahh3 | 189.9 | (sfx) | the existing ahh_a and ahh_b | Both "say ahh" to the lens: the waiting room's "say ahh" comes back. |
| tv_sign to tv_hold | 191.20 | ANN | "Ask your doctor if Hawkes Punch is right for you." (`ann_ask`, 2.63) | A smooth sign-off. It ends at 193.83, right on the hard cut to the clinic. |

### 10. The button

| Shot | Start | Who | Line (file) | Delivery and staging |
|---|---|---|---|---|
| b_room (now 6b, 193.87-197.65) | 194.20 | DOC | "Any symptoms?" (`doc_any_symptoms`, 0.93) | Off screen, flat and routine. Keep her out of frame. He looks off-left at her voice. |
| b_room | 195.50 | H | "Well, I met someone, and he—" (`him_button`, 2.93) | Dreamy and eager. `mx_sitting_talking`, eyes drifting up (copy sym_ghost_him's gaze and smile cues). **Hard-cut the audio at 197.65** on the fist: no fade, mid-"he". |
| b_fist | 197.65 | | (punch_impact_2) | As now. |
| b_black, b_can | | | | As now, moved +3.15 s: can_roll to 199.6, tiny_clink to 201.3. |

**Line count: 40 scripted lines** (space chase and worlds 22, the stop 7, the commercial 9, the button 2). Two alternate takes were made and are not used: `dbl_also_him` ("And I'm also him!"; the lower third does that joke) and `ann_say_ahh` ("Now say ahh."; no room after the read).

## 3. Voice files (`Assets/MusicVideo/Sfx/punch/lines2/`)

All 42 were made with Hawkes Gen `audio.voice-open` on project tkshock (qwen3-tts, open path, loudness-normalised to about -16 LUFS, ends trimmed), with `verify: true` (a transcript check) on everything with words. Voice descriptions: him as before, seed 1101. The double is "the same man... cocky, grinning, a bit louder", seed 2202. The doctor uses the "flat and quietly menacing" description for the testimonial and the "kind and reassuring" one for "Any symptoms?", seed 3303. The announcer is "a smooth American male TV commercial announcer from the 2000s, warm rich baritone", seed 4404. Untouched originals of the edited takes are in the scratchpad, not under Assets.

**Not checked by ear:** whether the double sounds like the same man as him, and whether the scream really screams. A description-based voice can drift between seeds. If the double sounds like a stranger, the fix is to clone his voice from a 6 s cut of `symptoms/him_symptoms_tight.mp3` (the `reference` input) with the cocky direction.

| File | Text | Length (s) | Note |
|---|---|---|---|
| him_scream_flight | Aaaaaah! | 3.29 | no transcript check (no words) |
| him_silence | Silence. | 0.69 | retaken: the first take added a sigh and ran 3.1 s |
| him_more_music | Nope. More music. | 1.48 | |
| him_out_here | She's out here somewhere. | 1.19 | |
| him_space_ghost_q | ...Space ghost? | 1.84 | words start at 0.76 |
| him_my_face | Hey! You have my face! | 2.28 | |
| him_no_youre_it | No, YOU'RE it! | 1.01 | |
| him_shriek | Aah! | 0.63 | high yelp |
| him_that_worked | Oh. That worked. | 1.42 | 1.06 s pause cut to 0.33 |
| him_right_in_mars | Right in the... Mars. | 2.78 | pause cut from 0.51 to 0.30 |
| him_i_know | I know. I know. | 2.12 | |
| him_sorry_everybody | Sorry, everybody. | 1.58 | |
| him_are_you_ghost | Are you... the space ghost? | 2.64 | |
| him_you_have_face | You do have a face. | 1.71 | |
| him_right_for_me | Is it right for me? | 1.26 | |
| him_thats_me | That's me! | 0.72 | |
| him_tv_hi | Hi there! I'm a patient. | 1.91 | retaken: the first take dropped "Hi" |
| him_tv_music | Do you hear music when it's quiet? | 1.75 | |
| him_tv_fist | Mmm! Tastes like a fist! | 2.22 | |
| him_button | Well, I met someone, and he— | 2.93 | cut at the fist |
| dbl_boop | Boop! Ha! | 1.20 | retaken: the first "Boop." came out silent (-70 LUFS) |
| dbl_youre_it | You're it! | 0.86 | |
| dbl_yeehaw | Yeehaw! | 1.60 | |
| dbl_peekaboo | Peekaboo! | 1.39 | |
| dbl_boo | BOO! | 0.61 | |
| dbl_all_you_got | Is that all you got? | 1.12 | |
| dbl_thats_earth | Dude. Dude. That's the Earth. | 2.29 | |
| dbl_nobody_saw | Nobody saw that. | 1.36 | an ad-libbed "Huh." cut off the front |
| dbl_okay_jupiter | Okay! Jupiter! | 1.99 | |
| dbl_swallow_planet | Shut up and swallow the damn planet. | 2.52 | an ad-libbed "Heh," cut off the front |
| dbl_im_you | No, man. I'm you. | 1.59 | "Heh." cut, pause tightened |
| dbl_two_of_you | Are you feeling like there's two of you? | 2.15 | |
| dbl_everyone_like_you | It's right for everyone like you. | 1.86 | |
| dbl_love_space | Are you in love with someone in space? | 2.40 | |
| dbl_good_fist | A good fist. | 1.60 | |
| dbl_also_him | And I'm also him! | 1.74 | alternate take, unused |
| doc_testimonial | I've prescribed it to a healthy amount of people. | 2.72 | |
| doc_any_symptoms | Any symptoms? | 0.93 | |
| ann_name | Hawkes Punch. | 0.95 | |
| ann_side_effects | Side effects may include ... Your doctor will punch you. | 9.67 | 1.4x atempo from 13.53 s |
| ann_ask | Ask your doctor if Hawkes Punch is right for you. | 2.63 | |
| ann_say_ahh | Now say ahh. | 0.94 | alternate take, unused |

Cost: 45 runs (42 kept, 3 retakes), **$0.43** total.

## 4. Changes for the cut agent, in plain words

### Clock and cut.json
1. **Make w_earth_back 8b instead of 4b, and cut w_ch2_e (the Mars rally).** The net change is zero from 56:1 on. w_ch2_a to w_ch2_d each start 4 beats (2.52 s) later, so their sfx cues move +2.52 s (126.35 to 135.41 in 80-sfx). Delete w_ch2_e's cues (136.614 to 137.313). Fix continuity in w_ch2_f: Mars is no longer in his hand from w_ch2_e. Its first cue already attaches it, so this should be fine.
2. **Commercial, same 54 beats from fold 64:3 to button 78:1:** tv_fold 2, tv_wide 4, tv_him 4, tv_other 4, **tv_doc 4 (new)**, tv_can 2, tv_both 6, **tv_thumbs 6** (was 4), **tv_ticker 15** (was 11), tv_ahh3 3, tv_sign 3, **tv_hold 1** (was 3). Cut **tv_ahh and tv_ahh2** and drop the `73:4` pin. The new starts are tv_doc 68:1 (168.71), tv_can 69:1 (171.23), tv_both 69:3 (172.49), tv_thumbs 71:1 (176.26), tv_ticker 72:3 (180.03), tv_ahh3 76:2 (189.47), tv_sign 77:1 (191.36), tv_hold 77:4 (193.24).
3. **Button:** b_room 6b instead of 1b. Add **5 beats (3.15 s) of silence to the end of the clock**: `mv cards insert hawkespunch end 5b`. This needs `tools/punch_lines.mjs --export` first, so its LINES live in `lines.json`. The video ends about 203.3 s. Nothing before 193.87 moves.

### Cards
- **s_drift:** split it, or keep one card and cut halfway. 0 to 2.5 s: the wide as now (the can floating past). Then an MCU on `person.head`, lens 70, from the sun side, with the face readable: raise `space_sun_fill` to about 1.2 for this shot. Face cues: eyes open at +1.3, smile 0.25 at 84.6 for "Silence."; at 86.4 the smile goes to 0 and a gaze moves up and to the side (toRel [0.8, 1.2, 1]); at 88.0, `do: blink`.
- **s_tap:** face on him at +0.4: eyesWide 0.4, smile 0.35, fear 0, so he reads smitten, not scared.
- **m_boo:** optional `mx_terrified` layer, mask upper, for 1 s at 2.5b after the hit reaction.
- **w_gut:** no change. The Earth lands on "Mars".
- **w_earth_back (8b):** move the Earth's detach and fly from 0 to 1.6 s, so they hold it through "I know". Keep the Idle1HaveNoClue layers; move the double's to 3.4 s, with "Nobody saw that". The Earth's grow-back moves the same 1.6 s.
- **st_ask:** nods at 6.4b and 6.7b, smiles at 6.3b and 6.5b, so they come after "That's me!".
- **st_look:** optional `mx_point_bent` layer on the double's right arm at 1.2 s for 1.8 s.
- **tv_doc (new, commercial seq but on the clinic set):** copy sym_write2: doctor at desk_doc, `mx_writing_seated`, camera cam_desk_top lens 65, the same shot override, face blink 0, eyesWide 0.05. Add `gfx: lower, title: "A REAL DOCTOR", sub: "Not looking up", color: "#ff2a6a"` at 0.2b for 3.5b. The "HAWKES PUNCH" bug stays up over it. Don't add a layer on her (Person2's layer fault). Leave him out of the cast.
- **tv_him:** clip `mx_sitting_talking` for him.
- **tv_thumbs (6b):** the thumbs-up layers as now. Add a `mx_nod` head layer on the double at 2.5 s.
- **tv_ticker:** replace the ticker text to match the read: "SIDE EFFECTS MAY INCLUDE SUDDEN FLIGHT, MEETING YOURSELF, THROWING PLANETS, BRIEFLY HOLDING THE EARTH, FOREHEAD CONTACT, MUSIC IN TOTAL SILENCE AND FALLING IN LOVE WITH A SPACE GHOST. NOT FOR EVERYONE. FOR EVERYONE LIKE YOU. DO NOT TAKE HAWKES PUNCH IF YOU ARE ALLERGIC TO PUNCHES. YOUR DOCTOR WILL PUNCH YOU." Ticker `for` 15b.
- **b_room (6b):** person `mx_sit_still`, then `mx_sitting_talking` from 1.6 s. Gaze off-left toward the voice at 0.3 s, then up and away with smile 0.55 at 1.7 s (sym_ghost_him's cues). The doctor stays out of frame. Check that the face 110 hook pose isn't visible at lens 65.
- **The ghost (optional, #15):** a new set piece `space_ghost`: a white capsule (0.5 x 1.1 m) and a sphere head, soft emission, no face, with a small arm prim. In s_earth it moves across the far background (behind the Earth, left to right, over 1.9 s). In st_look it moves behind the two of them past `earth_back` over 3.7 s, and the arm prim rotates ±40° twice at 1.5 s (the wave). Hide it everywhere else.

### Sound (80-sfx and the lines tool)
- **The silence:** stop every sound at 82.90 (bed_sky, rise_whoosh, and the scream through its cue length). Move bed_space from 83.185 to 88.2.
- Remove heavy_breathing at 119.003. Turn heavy_breathing at 144.16 down to 0.3, and drop the one at 148.16 (the dialogue is the breath).
- Commercial: tv_both's cues (psst 170.026, gulps, ahh) move +2.52 s. The thumbs ding and applause move from 174.2 to 176.3. **Remove the old announcer_a cue (176.725).** tv_jingle_tag goes from 190.2 to 191.36. Duck the applause under every line by -8 dB.
- Button: punch_impact_2 194.506 to 197.65, can_roll to 199.6, tiny_clink to 201.3. bed_clinic_button stays at 193.867 but needs about 3 s more tail (loop it or extend it).
- Add the 40 lines to `tools/punch_lines.mjs` LINES at the starts above. Add support for `mouth: 'other'` for the double (the same envelope code works on any actor name). Use mouth null for the announcer, the off-screen doctor in b_room, and the scream. The doctor's mouth stays on for tv_doc. him_button needs a hard end at 197.65: give the tool an `until`, or trim the file in the act.

### Not doing
No music, no singing, no AI video, no rented GPU, no Hawkes Biomedical logo or "own the category" line. No body contact: the forehead-to-forehead stays a near-miss framing, and the punches stay cut on the hit.
