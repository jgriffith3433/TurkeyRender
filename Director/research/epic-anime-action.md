# Epic anime action comedy: rules for Hawkes Punch in real-time 3D

Written 2026-11-07 for Hawkes Punch (the doctor punches a patient into space, he meets his double, they chase, scare and
fight up to throwing real-size planets, then stop, talk, and it becomes a TV ad). J: "make the planets actual planet
size ... Make it an epic animation.. think One Punch Man".

**What this is.** The general craft of the genre (One Punch Man, Mob Psycho 100, Dragon Ball, Gurren Lagann, JoJo,
Spider-Verse, Arcane, Guilty Gear Xrd), turned into rules we can build in Unity 6 URP 17.3, Timeline 1.8, Cinemachine 3.1
and the native Humanoid path. **We copy nothing specific:** no characters, designs, names, shots, sounds or music from any
of these. Only the shared techniques.

**How to read the numbers.** Each rule is tagged:
- **[S]**: a source gives this (cited at the end).
- **[C]**: genre convention. Widely taught and visible in the shows, but no one source sets the number.
- **[J]**: my judgment, worked out for our setup. Test it and tune it; don't treat it as fact.

**Frame rates.** Anime is timed at 24 fps. Our renders are 30 fps (`mv final --fps 30`). Frame counts below are given at
24 fps with the 30 fps value in brackets. **Recommendation [J]:** render Hawkes Punch at 24 fps. Stepped animation
("on 2s", "on 3s") divides evenly into 24 (12 or 8 poses a second), so holds stay even. At 30, 3s gives 10 poses a second,
and the 2s and 3s mix that anime uses comes out uneven.

---

## 0. Why the last pass read as 1/10, in this genre's terms

- **Smooth everything.** Every limb was interpolated at full rate. Nothing held and nothing snapped, so no pose ever
  landed. Anime action gets its force from the contrast between a held pose and a 2-4 frame strike.
- **Clips, not poses.** Floated mocap and generated clips have no designed silhouettes. Anime hero action is
  pose-to-pose: every key reads as a drawing.
- **Scale faked as a toy.** Shrinking Mars to hand size (0.4-1.1, see `SPACE-STAGING.md`) turns the epic beat into a prop
  gag. At real scale a person can't hold a planet. **Real scale changes the staging:** at contact the planet is
  ground or a wall, and at a distance it is a disc behind the person. Section 2 has the rules.
- **No impact language.** There was no hitstop, flash frame, smear, shockwave, debris, shake or sound gap. A hit was two
  bodies touching.
- **No comic contrast.** Faces and lighting stayed in one register. The genre's joke is the cut between two registers:
  epic and serious, then plain and deadpan.

---

## 1. Comedic contrast: the plain hero against absurd power

### Rules

1. **Two registers, switched per shot, never blended.** [C]
   - **Epic register:** low or dutch angle, a short lens close to the body, hard rim light, deep shadows, extra line
     detail, a held pose, rising sound.
   - **Plain register:** eye-level, centred and symmetrical, a 50-85 mm lens, flat front light, few shadows, a simple face
     (dot eyes, small mouth), a static camera, near silence.
   - The joke lives in the cut from one register to the other. The One Punch Man director has said the simple face is the
     hard part: "if you make a mistake, it is so obvious" [S, Yatta-Tachi]. A plain face must be exact.
   - In 3D, build two face states per character: blendshape sets and a material variant (ramp, rim and line width).
     Switch them on the cut, never mid-shot.
2. **Long build, instant resolution.** [C]
   - The build escalates over 6-15 s: cuts tighten, the music swells, an aura grows and the enemy monologues.
   - The resolution takes 1-4 frames: one hit, one flash.
   - Then comes the payoff hold: silence or a small mundane sound, and the plain face held 1.5-3 s [S, comedy timing guides:
     1-2 s for a reaction, 2-4 s for aftermath].
   - Then the mundane line or action.
   - **Never cut away during the payoff hold.** The hold is the laugh.
3. **The bigger the feat, the smaller the reaction.** (Already set in `SPACE-PLAN.md`.) A planet explodes behind him, and
   the shot is his face, plain register, maybe one blink (2-3 frames [3-4]) late. Animate the blink late on purpose: hold
   12-18 frames [15-22] after the impact sound before any reaction.
4. **Mundane sound against epic picture.** [C] After the biggest boom, cut to a gap of near silence, 8-24 frames
   [10-30], then a small domestic sound (a squeak, a sniff, a fridge hum). The audio does as much of the joke as the face.
5. **Visual gags in the frame, not in dialogue.** Edgar Wright's visual-comedy craft [S, Every Frame a Painting]:
   - Things enter or leave the frame to land a joke.
   - Cut on a sound match or a movement match.
   - The camera move itself is the joke: a slow push-in on nothing, or a whip that misses.
   - The edge of the frame hides the reveal.
   - J has already banned puns on planet names. Situation and character carry the comedy.
6. **Mob Psycho's editors balanced tone in the edit**, adding or trimming seconds to keep the "tonal balance" [S, ANN Mob
   Psycho staff interview].
   - We do the same: the comedy holds are tuned in the cut, not the score.
   - Every payoff hold is one cut-level variable (`hold`), so it can be tuned in the note loop.
7. **Rule of three with a break.** [C] Escalate twice, then break the pattern on the third. For example: he dodges a
   moon, dodges a planet, and on the third throw he just catches it and looks bored.

---

## 2. Epic scale: a person against real-size planets

### The numbers (NASA fact sheet [S])

| Body | Diameter | Notes |
|---|---|---|
| Moon | 3,475 km | Seen from Earth: about 0.52° |
| Mercury | 4,879 km | |
| Mars | 6,792 km | |
| Venus | 12,104 km | |
| Earth | 12,756 km | Moon distance 384,000 km. Earth seen from the Moon: about 1.9° |
| Neptune | 49,528 km | |
| Uranus | 51,118 km | |
| Saturn | 120,536 km | Rings about 2.3 times the planet's width |
| Jupiter | 142,984 km | |

A 1.8 m person against Earth is a ratio of about 7,000,000:1, and against Jupiter about 80,000,000:1.

**Angular size.** A body of diameter D at distance d (centre to camera) fills `2*asin(D/2d)`.
- Earth filling 40° of frame height: d ≈ 18,650 km.
- Jupiter filling 40°: d ≈ 209,000 km.
- Mars filling 40°: d ≈ 9,930 km.

**Unity Physical Camera, 36x24 mm sensor (the default). Vertical FOV = 2*atan(12/f).**

| Focal length | 14 mm | 24 mm | 35 mm | 50 mm | 85 mm | 200 mm | 600 mm |
|---|---|---|---|---|---|---|---|
| Vertical FOV | 81° | 53° | 38° | 27° | 16° | 6.9° | 2.3° |

### The key fact for staging [J, from the geometry]

Apparent size is size divided by distance. A person and a planet can both look big in one frame only when they are at very
different distances. That costs nothing in space.

Example: the person at 5 m and Earth at 35,000 km have the same apparent size. The person at 175 m from a 24 mm camera
is about 12 px tall at 1080p, and with Earth about 18,600 km behind him the planet fills 40° of the frame. This works at
real scale.

The one thing real scale forbids is **contact in a single frame**. When his hands touch the planet, both are the same
distance from the camera, and he is 7 million times smaller: invisible in any shot that shows the disc. The previous pass
failed exactly here: "2-pixel man next to a planet" (`SPACE-STAGING.md`).

### Rules

1. **Contact shots are staged at human scale, with the planet as terrain.** [J]
   - When he grabs, pushes or throws a planet, the camera is within metres of him. The planet is a curved horizon, a
     cliff face or a sea under his feet, with its atmosphere a thin bright band (Earth's is about 100 km, roughly 1.6% of
     its radius).
   - The force reads through what happens at his hands: cracks run out for hundreds of km, a shockwave ring spreads
     across the surface, the cloud deck dimples, light flares.
   - This is the honest version of "throwing a planet". Gurren Lagann and Dragon Ball sell scale this way: the figure
     against an endless surface, not a ball in a hand [C].
2. **Disc shots separate the two in depth.**
   - Either the person sits in the foreground at a readable size (12-120 px tall at 1080p) with the planet far behind,
     framed so his silhouette lies over the bright disc.
   - Or he is shown only as a light: a glow, an aura or a trail at least 40-80 px long, attached to the planet.
   - Never as a bare 2-pixel body. [J]
3. **Silhouette against the bright disc.** Put his body over the lit side of the planet or over the sun's glare, so he
   reads as a dark shape with a bright rim. Black clothes on black space read at under 2% contrast (`SPACE-STAGING.md`);
   against a lit planet they read at once. [J, plus our own measurement]
4. **The intercut that sells scale.** [C] Cut between:
   - an extreme close-up of an eye or face (normal human scale, 85 mm, plain or epic register), and
   - an extreme wide of the planet moving (200-600 mm from far away, so the disc fills the frame and moves slowly and
     heavily).
   The audience fills in the scale between them. The cut is a hard cut, and the sound carries over it.
5. **Lens use for scale.** [S for compression, J for the numbers]
   - Telephoto (200-600 mm) from far away stacks a foreground silhouette against a huge background disc. This is how
     photographers make the moon look huge behind a person.
   - Ultra-wide (14-18 mm) close to the body makes the near fist enormous and pushes the planet away. Use it for heroic
     wind-ups, not for scale.
   - 24-35 mm gives normal action coverage.
6. **Scale cues in every wide.** [C]
   - Something of known size near the camera: the other person, the ambulance, a satellite, the can.
   - Cloud systems and storms on the planet, so it has texture at planet scale.
   - Atmospheric scattering only on the limb (a thin blue rim on Earth, a dusty haze on Mars).
   - Moons and rings for depth layers.
   - **Detail at every scale:** a planet with a flat texture reads as a ball. Zoom-ins need terrain and cloud detail.
7. **Speed at real scale needs nearby references.** [J]
   - A planet crossing the frame in 1 s at 18,000 km is moving at about 13,000 km/s, and from far away it still looks
     slow. That slowness is good: it reads as mass.
   - To sell speed, add near-field streaks: debris, ice and dust passing the camera, star streaks, speed lines.
   - Planets move slowly on screen, people and debris move fast.
8. **One planet size per shot.** Keep this existing rule. With real scale there is no reason to change size at all. The
   hand-size planet is gone.

---

## 3. Impact

Order of events for a big hit, at 24 fps [30 fps in brackets]. Every number is tunable per hit. Structure [C], numbers [J]
unless marked.

| # | Beat | Frames | What happens |
|---|---|---|---|
| 1 | Anticipation hold | 8-36 [10-45] | A held key pose, with an aura or tremble. The longer the hold, the bigger the hit reads. |
| 2 | Strike | 2-4 [3-5] | Animated on 1s. One smear or multiples frame in the middle. |
| 3 | Impact frame | 1-4 [1-5] | See the impact-frame rule. |
| 4 | Hitstop | 3-8 [4-10] for normal hits, up to 12-24 [15-30] for the finisher | Both bodies frozen, the victim vibrating. |
| 5 | Release | 2-6 [3-8] | Victim launched, shockwave ring out, debris, camera shake peak. |
| 6 | Slow-motion window (optional) | 12-48 [15-60] at 0.1-0.25x | Then a snap back to 1x on a sound accent. |
| 7 | Settle or payoff | 24-72 [30-90] | The comedy hold, or a wide showing the result. |

### Rules

1. **Hitstop.**
   - Fighting games freeze both bodies on contact. Smash's freeze is longer the more damage the attack does: about 8-15
     frames at 60 fps for a strong hit, capped at 20-30 [S, SSBWiki]. That is roughly 0.13-0.5 s.
   - Sakurai says the hit character vibrates during hitstop: grounded characters side to side, airborne ones up and down.
     The amplitude shrinks over the freeze and is scaled to camera distance. The attacker also vibrates slightly and keeps
     creeping forward, "a trick similar to slow motion" [S, Sakurai via Source Gaming].
   - **Our rule:** hitstop = 0.12-0.33 s for ordinary hits and 0.5-1 s for the planet-scale finisher. Shake the victim on
     the axis across the hit direction, starting at 2-4% of his height and decaying linearly to zero. Creep the attacker
     forward 1-3% of his reach.
2. **The impact frame.** [C]
   - A 1-4 frame break from normal shading: high-contrast two-tone, black silhouettes on white or the reverse, often
     inverted, with radial lines and a sketchy or rough line style.
   - Usually one frame black-on-white, then one white-on-black, then back to normal, sometimes with a red or colour accent.
   - In our renderer, a full-screen pass thresholds luminance plus depth and normal edges into two tones, flipped on
     alternate frames (toolkit T1).
3. **Flash-safety ceiling (hard rule).** [S, Ofcom/Harding]
   - UK broadcast rules allow no more than **3 flashes in any 1 second**. A flash is a pair of opposite luminance changes
     over a large part of the screen (over about 25% of the area).
   - Saturated red flashes are restricted more strictly. Japan has its own, stricter guidelines, written after the 1997
     incident.
   - **Our rule:**
     - One impact sequence holds at most 2 inversions (4 frames).
     - Two impact sequences need at least 1 s between them.
     - No full-screen saturated red flash.
     - QA counts big frame-to-frame luminance flips per second on every final.
   - This matters doubly because the piece "turns into a TV ad".
4. **Flash frame (white).**
   - A white or near-white frame at the instant of contact, 1-2 frames [1-3], at 70-100% opacity, faded over the next 2-4
     frames.
   - Use it for hits that don't get a full impact frame.
   - The same flash-count ceiling applies.
5. **Smears and multiples.** [S for Spider-Verse, C for anime]
   - Spider-Verse dropped CG motion blur and used smears and duplicated limbs, so a frame of an action scene shows several
     arms.
   - Anime uses 1-frame smears: a limb stretched along its arc, or 2-4 ghost copies.
   - **Our rule:**
     - Exactly 1 frame of smear or multiples in the fastest frame of each strike, and nowhere else.
     - No camera motion blur on characters.
     - Motion blur only on the near-field debris and star streaks, if at all.
6. **Speed lines.**
   - Two kinds [C]:
     - **Parallel lines:** the background is replaced by streaks along the direction of travel. For chases.
     - **Radial focus lines:** converging on the subject, for a reveal or impact.
   - Speed lines run on 2s and redraw every step (new random lines each step), as in hand-drawn work.
   - Hold radial lines 6-18 frames [8-22].
7. **Shockwave rings.**
   - A ring that expands from the contact point: a screen-space distortion plus a thin bright ring. Fast-out ease: 70% of
     its radius in the first third of its life. Life 8-20 frames [10-25].
   - Planet-scale hits also get a surface ring across the planet (a decal or shader band) that grows over 1-3 s. Slow
     reads as huge.
8. **Debris.**
   - Faceted chunks in a clear size hierarchy: a few big pieces, many small ones. Yutaka Nakamura's cube debris is the
     famous case [S, Wikipedia]. Learn the principle, don't copy the look.
   - Debris ballistics are linear in space (no gravity). Chunks spin at a constant rate and fly radially from the hit,
     with a size-ordered speed spread: small pieces fast, big pieces slow.
9. **Camera shake.**
   - Use the trauma model [S, Eiserloh GDC 2016]. Trauma runs 0-1 and decays linearly. Shake = trauma² (or trauma³)
     times the maximum.
   - Use smooth noise (Perlin), not random values per frame. Rotation shake matters more than translation.
   - **Our maximums [J], at 1080p:**
     - Roll ±2.5°.
     - Translation ±1.5% of frame height.
     - FOV punch +3-6% for 3-6 frames on the biggest hits.
     - Noise at 12-20 Hz.
     - Decay of 1 trauma in 0.4-0.8 s.
   - Trauma per hit size: light 0.3, heavy 0.6, finisher 1.0.
   - **Shake only on impacts and the planet rumble.** Constant handheld shake erodes contrast with the calm shots.
10. **Slow motion, then snap.** Slow motion must have a reason: a near miss, or a reveal of scale. Never more than 2 s of
    screen time at under 0.3x. The snap back to 1x lands on a sound accent, usually the impact. [J]
11. **Sound design per beat.** [C]
    - Anticipation: a rising tone or charge, plus a breath.
    - Strike: a whoosh pitched to the speed.
    - Impact: a layered hit (a low thump of 40-80 Hz content plus a mid crack plus a high transient) **and** a 2-8 frame
      dropout of everything else just before it, so the hit lands in silence.
    - Release: a rumble tail, debris rattles and a pressure-wave whoomp.
    - Space is silent, but the genre ignores that. Keep it, and play impacts dry and close.
    - Comedy beats: cut everything to near silence, then a small sound.
    - All sound effects go through Hawkes Gen `audio.sfx`.

---

## 4. Animation style: pose-to-pose with holds and snaps

### Rules

1. **Key poses are drawings.**
   - Every key must pass the **silhouette test**: render the key as a black shape from the shot camera. The action
     (punch, dodge, scare, throw) must read with no interior detail. [C, classical animation principle]
   - Limbs stay away from the torso in silhouette. Line of action: one clear curve from head to the weight-bearing or
     thrusting limb.
   - In zero-g there is no weight-bearing limb, so the line runs from the head to the thrusting limb.
2. **Limited-animation holds, then explosive motion.** [C, and S on Xrd's keyframe-only approach]
   - Hold a key pose 8-36 frames [10-45]. Don't let it die: add a 1-2 px tremble, cloth flutter, hair moving on 2s, an
     aura cycling. Then move to the next key in 2-6 frames.
   - Guilty Gear Xrd's team used keyframes only, posed like 2D sprite or cel work, with no in-between smoothing in the
     usual 3D way [S, Game Watch report of GDC 2015].
3. **Stepping by purpose.** [C, S for Spider-Verse]

   | Motion | Stepping at 24 fps | Poses per second |
   |---|---|---|
   | Acting and dialogue (talking, small gestures) | 3s | 8 |
   | Action, chases, dodges | 2s | 12 |
   | Strikes, the fastest arcs, and anything the camera tracks closely | 1s | 24 |

   - Spider-Verse used rates from 1s up to 6s, set per character and even per body part [S, befores & afters]. Miles was
     on 2s and Peter on 1s, to show experience [S].
   - **Our use:**
     - The deadpan hero acts on 3s. Plain is still.
     - The double, who is excitable, acts on 2s.
     - Both go to 1s only inside strikes.
4. **The camera moves on 1s while the characters are stepped.** [J, consistent with Xrd syncing camera and characters
   frame by frame (S, Famitsu CEDEC)]
   - A smooth camera with stepped bodies is the look.
   - **Exception:** a camera locked to a stepped body (a close follow) must step with it, or the body judders against the
     frame.
5. **Anticipation, strike, overshoot, settle.** [C]
   - Anticipation moves opposite to the action: 20-40% of the strike's travel, held.
   - Strike: 2-4 frames.
   - Overshoot past the end pose by 5-15% of the travel, for 2-4 frames.
   - Settle: 6-16 frames with an ease-in.
   - Secondary parts (hair, coat tails, a tie, the doctor's coat) lag the body by 2-4 frames and overshoot 1-2 times as
     far.
6. **Pose per shot for the camera.** [S, Famitsu CEDEC 2015; Sirlin]
   - Xrd's rigs had scale controls: arms stretched on punches, legs bent on kicks.
   - Parts near the camera were enlarged, and far parts made thinner and longer, to sell force.
   - Some parts were swapped for separately modelled versions on specific frames: several hair models, and "5 or 6 feet"
     for one walk [S, Sirlin].
   - Shadows were hand-corrected. Each character had their own light, so faces stay bright and readable [S, Game Watch].
   - Motomura's slogan, as quoted: find anything that looks 3D and avoid it [S, secondary summary of the GDC talk].
   - **Our rule:** a hero pose is authored *for its shot camera*. The fist toward the lens is scaled 1.2-1.6x on the
     strike frame. Exaggerate foreshortening rather than fight it. Cheat any limb that reads badly from that angle; it
     only has to read from that one camera.
7. **Zero-g still applies.** Bodies float in the neutral float posture with physics on the legs (`SPACE-PLAN.md` and
   `zero-g-acting.md`). Action poses push off from something: the other body, a planet surface, a satellite. Momentum is
   conserved. A punch thrown with nothing to push against turns the puncher too, and that can be a gag.

---

## 5. Camera

### Rules

1. **Cut rate: balance.** J has said too many very fast cuts are bad.
   - Bordwell's data: action films are the fastest-cut genre, some at about 2.7 s average shot length, against 8-11 s in
     classical Hollywood. Some modern action cuts so fast it becomes hard to follow [S, Bordwell "Intensified Continuity"].
   - **Our rule [J]:**
     - The average shot length for the whole piece is 2.5-4 s.
     - Action bursts may drop to 0.5-1.2 s shots for 3-6 shots at most, then must land on a hold of at least 2 s: a wide
       of the result, or the deadpan face.
     - No shot under 12 frames [15] except inserts that are part of a strike (the eye, the fist, the impact frame).
2. **Calm beats chaos.**
   - Every chaotic stretch is bracketed by calm frames: a locked-off, centred, symmetrical shot.
   - **The calm shot is where the comedy lives,** and the chaos only reads as chaos next to it.
   - Roughly a third of screen time should be calm. [J]
3. **Cut on impact and on action, never on anticipation.** [C]
   - Let the wind-up play whole in one shot.
   - Cut on the frame of contact or one frame after, to a new angle, with the impact frame bridging the cut.
4. **Keep the 180° line during chases and fights.** Already a rule in `SPACE-PLAN.md`. Cross it only on a visible move, or
   on a reset shot that shows both of them.
5. **Moves and when to use them.** [C, numbers J]
   - **Fast push-in and hold.** Dolly or zoom 15-40% closer over 4-10 frames [5-12] with a fast-out ease, then lock. Use
     it for realisation, scares and the "serious" switch.
   - **Whip pan.** Spin 60-120° in 4-8 frames, motion-blurred or with speed lines, landing hard on the new subject. Two
     whips in a row are too many; use it as a transition or a "where did he go" gag.
   - **Orbit around a clash.** Rotate 30-90° around the contact point over 1-3 s while both bodies are held in hitstop or
     slow motion. Keep the orbit on one side of the line, and the faces turn but don't flip.
   - **Low heroic angle.** Camera 0.3-0.8 m below eye level (in space, "below" means below the face in the frame's up),
     tilted 10-25° up, with a 14-24 mm lens close in.
   - **Dutch angle.** Roll 10-25° for menace, wrongness or the double's first appearance. Use it rarely, so it keeps its
     meaning.
   - **Chase cam.** A camera tracking alongside or behind at a matched speed, with the near-field debris giving speed.
     Use the side tracking view for readability (who is ahead), and the rear view for scale ahead of them.
   - **Crash zoom.** FOV narrows 2-4x in 3-6 frames on a reaction. A comedy tool; use it at most once or twice in the
     piece.
6. **Camera roll in space.** No gravity means no true "up", but the audience needs one. Keep a consistent screen-up per
   scene (a planet's horizon or the sun direction). Roll only as a deliberate move. [J]

---

## 6. Space: staging and light

### Rules

1. **One hard sun.**
   - A single directional light with a small source angle, so shadows are sharp.
   - No sky ambient, or almost none (under 3% of the key).
   - The dark side of everything is near black except where planet bounce reaches it. [S on Gravity: sun as the hard
     key, Earth as the soft bounce]
2. **Planet bounce.**
   - A second, soft directional light from the planet's direction, tinted with the planet's colour. Earth is blue-white,
     albedo about 0.3; Mars is rust; Jupiter is cream and tan; the Moon is grey, about 0.12.
   - Bounce strength [J] = albedo × the lit fraction of the planet facing the character × the planet's apparent size.
     Practically 5-30% of the key when a big lit planet is close behind.
   - Gravity's makers worked out Earth's apparent size and distance with a physicist so the bounce looked right [S,
     Definition magazine].
3. **Per-character face light,** as Xrd did [S]: a face-only fill (a light layer or the face shader's own ramp
   offset), so faces never fall into the black side. This is the `faceFill` already in our rig. Make it part of the toon
   shader rather than a world light.
4. **Rim light from the sun behind** whenever a character is against black. Above all for the black tee: rim at least 1.8
   (see `SPACE-STAGING.md`).
5. **Stars.** A real camera exposed for a sunlit planet shows no stars. Anime shows them anyway.
   - **Our rule [J]:** sparse, dim stars that fade to near zero in frames dominated by the lit planet.
   - Dense stars and a nebula only for wide "space" shots with nothing lit in frame.
   - Stars never cross a planet disc: draw the sky before the planets, with depth on.
6. **Planets need:**
   - A day and night terminator with a soft edge (atmosphere) or a hard one (the Moon, Mercury).
   - A limb atmosphere rim: Fresnel times sun direction, bright on the sunward limb.
   - City lights on Earth's night side.
   - Cloud shadows.
   - Rings that cast shadows and receive the planet's shadow.
   - Slow rotation: Earth turns once in 24 h, invisible on screen. Speed it to a just-visible drift if it helps life;
     that is a free cheat. [J]
7. **Real-scale rendering in Unity: two cameras, never real metres.** [S for the KSP technique; J for numbers]
   - Unity is single precision. At 10,000 km from the origin, positions resolve only to about 1 m: jitter. A far plane of
     tens of thousands of km wrecks depth precision.
   - **Technique (as in Kerbal Space Program's "scaled space"):**
     - A **far camera** renders planets, moons, rings and the sky at a reduced scale (KSP used 1:6000; for us 1:1000 is
       fine, so Earth is 12,756 units across).
     - It copies the near camera's rotation and FOV exactly. Its position = (near camera world position) / scale,
       expressed in the scaled frame.
     - A **near camera**, stacked as a URP Overlay camera that clears depth, renders the characters, debris and VFX in
       true metres near the origin.
     - Angular sizes and parallax come out exact. The sun light is shared, and the planet bounce light affects only the
       near layer.
   - Floating origin: keep the characters within a few km of the origin. Move the world, not the hero.
   - **Contact shots (planet as terrain) need the planet surface in the near layer:** a local patch mesh (a curved
     terrain tile with the planet's textures) at true scale near the origin, matched to the scaled-space disc beyond it.
     Treat it like a landscape set.

---

## 7. Toolkit to build

Each item says how it works in URP 17.

**Some of this already exists in our engine** (`AGENTS.md`, checked 2026-11-07). Extend these pieces; don't rebuild them.
- `fx: impact`: flash, two shockwave rings, debris, sparks, dust, shake, and `hitstop` as a hold in the warp.
- `do: hitstop`.
- `fly` with `trail` speed lines.
- `steps` per actor and per bone group. **Legacy path only:** native bodies ignore `steps`.
- `keys` with `hold`, `anticipate`, `overshoot`, `settle` and `successive`. **Legacy path only.**
- Look keys `flash`, `invert`, `ink`, `toon`, `radial`, `shake`, `zoom`, `dutch`.
- Shot `fovTo` (crash zoom).
- The `crash_zoom` and `hero_reveal` templates.

What is missing is mostly the anime-specific versions:
- the two-tone impact frame (T1)
- radial and parallel speed-line overlays redrawn on 2s (T6)
- multiples and smears (T5)
- the trauma shake curve (T9)
- the two registers (T14)
- scaled-space planets with surface contact patches (T16)
- the flash-safety QA (T18)
- the impact `flashFor` default of 0.07 s (2 frames at 30 fps) is within the rule; the flash counter is not built.

| # | Effect or move | How to build it |
|---|---|---|
| T1 | **Impact frame** (two-tone, inverted) | URP Full Screen Pass Renderer Feature (Shader Graph Fullscreen) injected After Rendering Post Processing. Reads the colour, depth and normals buffers. Output = step(luminance plus edge mask, threshold) mapped to black/white, inverted by a `_Invert` flag. Optional radial-line texture multiplied in, and a `_Accent` colour channel. Driven by a Timeline custom track (clip = frames, mode, invert sequence). Gated by a flash counter that refuses more than 3 flashes a second. |
| T2 | **White flash** | The same pass with a `_Flash` 0-1 lerp to white. Timeline clip with an ease curve. |
| T3 | **Hitstop** | A Timeline custom track that freezes named actors. Their character playables hold their local time (clip-in fixed) for N frames, while the camera, VFX and the victim's vibration offset keep running. Vibration is a post-Animator root offset (sine at 15-30 Hz, decaying), so muscle data stays clean. |
| T4 | **Stepped timing per actor** (exists on legacy as `steps`; native needs it) | Each actor's animation time is quantised: `t_q = floor(t*rate)/rate` (rate 8, 12 or 24 at 24 fps), set per actor and per clip span ("on 3s, then 1s for frames 120-128"). Implement as a per-actor PlayableGraph evaluated manually at t_q, or as a Timeline mixer that floors local time. The camera stays continuous. See `how-others-do-it.md` #9. |
| T5 | **Smear and multiples** | (a) Multiples: on the smear frame, `SkinnedMeshRenderer.BakeMesh` the previous 2-3 sampled poses and draw them with the toon material at decreasing alpha or dither. (b) Stretch: a vertex shader offsets vertices along the negative per-bone velocity, masked to the striking limb, for 1 frame. Known Unity pattern: previous-position vertex offset [S, smear shader examples]. Toggled by the strike clip's metadata. |
| T6 | **Speed lines** (parallel and radial) | A full-screen pass or a camera-facing quad with a procedural shader: radial = polar UV with noise-thresholded thin wedges and a clear centre circle. Parallel = streaks along a screen direction. Re-seed noise every 2nd frame (on 2s). Additive white or ink-black variants. |
| T7 | **Shockwave ring** | (a) Screen space: a full-screen distortion pass with an expanding ring offset (UV push along radius), plus a thin emissive ring quad. (b) World space: an expanding torus or billboard ring on the VFX layer. (c) Planet scale: a surface-ring band in the planet shader (distance on the sphere from the hit point < r(t)), brightening clouds and pushing a cloud displacement. |
| T8 | **Debris** | Particle System (or VFX Graph if we add it) with mesh particles (faceted rocks, 3-4 variants), no gravity, constant angular velocity, radial burst, size-speed inverse curve, toon-lit. Pre-simulated and deterministic: a fixed random seed, Timeline Control Track. |
| T9 | **Camera shake (trauma)** | Cinemachine 3 Impulse, or our own noise extension: trauma per hit from Timeline markers. Shake = trauma² × max (roll 2.5°, translation 1.5% of frame height). Perlin at 12-20 Hz. Deterministic: seed the noise from shot time, so renders repeat exactly. |
| T10 | **FOV punch, crash zoom, push-in and hold** | Timeline animation curves on the Cinemachine camera's lens, with a fast-out ease preset library ("punch", "crash", "push-hold"). |
| T11 | **Whip pan** | A camera yaw curve of 60-120° over 4-8 frames, plus a directional blur on the far layer only (full-screen pass reading screen velocity, or a radial/directional blur with a fixed vector per frame), plus parallel speed lines. |
| T12 | **Orbit at a clash** | A Cinemachine Orbital Follow (or a spline dolly) around the hit point, its angle animated, with both actors in hitstop or slow motion. A line-of-action check keeps it on one side. |
| T13 | **Slow motion and snap** | A global time-scale curve on a Timeline track feeding every actor's and VFX playable time. A snap marker at the impact. Sound matched by a separate audio cue (don't time-stretch the hit sound). |
| T14 | **Two registers** (plain and epic) | Per-character material variants (ramp hardness, rim, line width, shadow colour) plus face blendshape presets, switched on cut by a Timeline "register" track. A matching post Volume profile per register (contrast, vignette, grain). |
| T15 | **Toon shading in Xrd's spirit** | A cel shader with hard ramps, a per-character face-light vector, artist-painted shadow-bias textures (vertex colour or a texture channel, so shadows sit where we want), edited normals on faces (normal transfer from a sphere or proxy, done in Blender), and an inverted-hull outline with vertex-colour width. **Check first** whether `MV/Lit` (`ART_BIBLE.md`) must stay; this would be a new shader for this video. |
| T16 | **Scaled-space planets** | A far camera at 1:1000 plus a near overlay camera (section 6.7). Planet shader: albedo, normal, clouds with shadow, atmosphere limb (Fresnel × sun), night lights, ring shadow, surface-ring hook (T7c). Textures from public NASA or Solar System Scope maps (check licences) or Hawkes Gen `image.generate seamless` with `texture.maps`. |
| T17 | **Silhouette and readability QA** | Renders each key frame from its shot camera as a silhouette (black on white) and measures foreground/background luminance contrast. Fails a frame when the hero is under 12 px or under 3% contrast. Extends the shot check's `readable`. |
| T18 | **Flash-safety QA** | Per final: count frame-to-frame mean-luminance flips over 20% across more than 25% of pixels in a sliding 1 s window, and fail at more than 3. Also flag saturated red flashes. |

---

## 8. Anime-quality keyed hero animation in our stack

### What we have

- Unity 6 with Humanoid Animators. The native path plays Timeline clips in muscle space.
- `clipderive`: a source clip plus keyed muscle offsets, in `HumanTrait.MuscleName` terms.
- Blender 5: scriptable and headless (`blender -b -P`).
- Cascadeur: Python 3.8 console inside the GUI. Its `csc` API covers layers, keys, interpolation, auto-physics and
  auto-posing tools, and FBX import and export (`csc.fbx.FbxLoader.export_*`). There is no documented headless or
  command-line mode, and a community MCP (cascadeur-mcp-plus) runs Python in the GUI thread [S, Cascadeur docs]. Its
  AutoPhysics has a freefall-acceleration setting (default 980 cm/s²), and `Scene.gravity_per_frame()` exists in the API.
  Setting gravity to 0 from a script is **unverified**.
- Mixamo clips.
- Hawkes Gen text-to-motion, which is weak on hands and precise poses. J has also ruled out GPU work for the video system
  for now (memory: no rented GPUs).

### First, a path decision (J's or the director's)

`hawkespunch` is on the **legacy path** (`AGENTS.md`: it keeps the old path). The legacy path already has most of this
grammar:
- `keys` (pose-to-pose with `pose` from `poses.json`, `from: "Clip@t"`, `hold`, `flat`, `ease`, `anticipate`,
  `overshoot`, `settle`, `successive`)
- `steps` per actor and bone group
- bone `pose`
- `limits: 0` for cartoon moments

The native path has better clip playback but ignores `keys`, `pose`, `steps` and limits.

**For the hand-keyed hero shots, the legacy path's `keys` + `steps` are the fastest route to the look today** [J]. The
muscle-space `posederive` below is the native-path route, and the better long-term one because the clip plays through
Unity's own Animator. Pick per video, not per shot: mixing paths within one character was not designed for.

### Recommendation: poses as data in Unity muscle space, stepped, rendered and checked

1. **A pose library as data.** `poses/hero/*.json` holds a pose as a full set of 95 Unity Humanoid muscle values plus
   root rotation, optionally with finger presets and a face blendshape preset. Named after what it is: `punch_windup_r`,
   `scare_lunge`, `float_bored`.
   - **Seeding a pose:** take a frame from a library clip ("Mixamo `Punching` at 0.42 s"), read its `HumanPose` with
     `HumanPoseHandler`, store it, then edit muscles by name, as `clipderive` already does.
   - Agents get poses right far more often by editing a nearby real pose than by writing 95 numbers blind.
2. **A shot's acting as a key list.**
   - `keys: [{t, pose, hold, ease, step}]`, where `step` is 1, 2 or 3 and `ease` is `snap` or `ease-out`.
   - Overrides per key: muscle deltas, root offsets, the exaggeration scale of a bone (rule 4.6), and a `smear` flag.
3. **Compile to a clip with stepped tangents.** A new `call posederive` (sibling of `clipderive`):
   - `HumanPoseHandler.SetHumanPose` on a scratch avatar at each key, sampled into muscle curves.
   - Tangents set to `Constant` for stepped spans. Between keys inside a 1s strike span, Unity's interpolation or a
     breakdown key the agent adds.
   - Overshoot and settle generated from the key's `ease` (one extra key past the target at +5-15%).
   - The output is an ordinary Humanoid clip, so the native path (Timeline, Override tracks with masks for upper-body
     acting over the zero-g float) plays it unchanged.
4. **Things Humanoid clips cannot carry.**
   - Bone scale is unsupported in Humanoid muscle clips. Unity drops scale curves with a conversion warning [S, Unity
     discussions]. So limb stretch, fist enlargement toward the lens and squash and stretch need a **post-Animator
     component**: it reads an "exaggeration" track from Timeline and scales or offsets bones in LateUpdate, after the
     Animator.
   - **Caution:** the native path currently ignores `keys`/`pose` and runs only reach, gaze, eyes and fingers after the
     Animator (`AGENTS.md`). This component is a deliberate addition. Keep it narrow (scale only, per named bone, only
     where a shot asks).
   - Mesh swaps (Xrd's alternate hands and feet) are SkinnedMeshRenderer toggles on Timeline activation tracks.
5. **Check every key by rendering, not by numbers.** For each key, render three views (the shot camera, front, side) at
   low resolution, plus the silhouette from the shot camera (T17). A reviewer reads them against the key's written intent
   ("right fist cocked behind the ear, torso twisted away, eyes on target").
   - Then render the whole span as **motion at the final rate** and judge it at speed. Our standing rule: judge motion,
     never stills.
   - The reviewer is a different agent from the animator (`how-others-do-it.md` #12).
6. **Where Blender earns its place.** Use it for what Unity's Humanoid path is bad at:
   - Hand-modelled smear meshes and alternate body parts.
   - Face normal editing for the toon shader.
   - Batch pose rendering if the Unity render loop is slow. Blender's Workbench silhouettes are very fast, headless.
   A Blender-first keying pipeline (bone rotations, CONSTANT interpolation, FBX to Unity) is fully scriptable and headless.
   But it puts an FBX-to-Humanoid conversion between the authored pose and the played pose, and that conversion moves
   things (twist distribution, finger limits). **Keep Unity muscle space as the source of truth** and use Blender as a
   tool around it.
7. **Where Cascadeur earns its place.** Physics checks of the zero-g arcs: a body pushing off another, a thrown body
   tumbling, momentum through a spin.
   - Use AutoPhysics on a blocked key set to get believable ballistic paths and rotations, then export FBX and import as a
     Humanoid clip to read muscle keys back into the pose library.
   - **Limits:** it is GUI-bound, so an agent drives it only through the in-app console or the community MCP while the
     app is open. Batch runs are unreliable, and the gravity-0 scripting needs testing first.
   - Treat it as a hero-shot tool for 3-6 key moments, not the pipeline backbone. (This matches `how-others-do-it.md`
     #13.)
8. **Mixamo and text-to-motion become seed material only.** Use them for the start pose of a key and as reference for
   timing, never as the final hero acting. Hands are always keyed by finger presets (`fingers`).

### Realistic limits (honest)

- **An agent cannot "see" a pose while writing it.** Every pose needs a render-and-read loop, and vision review of 3D
  poses misses wrist twist, finger interpenetration and depth errors. Expect 2-4 rounds per hero key. Budget about
  10-20 hero keys per action shot and pick the 4-6 shots that carry the piece. The rest can be lighter: holds, plain
  register and cuts.
- **Interpolation between stepped keys in muscle space** can still swing limbs through the body on a 1s strike. Strikes
  need an added breakdown key and an interpenetration check (capsule tests per frame).
- **Contact between two keyed bodies** (a grab, a punch landing on a face) has no paired clip. It is solved per shot:
  pose the victim to the attacker's fist position, use IK for the last centimetres (Animation Rigging TwoBoneIK), and sell
  it with the cut and the impact frame.
- **Per-shot exaggeration rigs** (bone scale) break continuity across angles. That is fine and intended in this style,
  but a pose authored for one camera can't be reused from another angle without re-checking.
- **True Xrd quality** came from artists hand-tuning every frame of 20-second cutscenes, plus custom normals and shadows,
  over months [S]. We get the style's grammar (holds, snaps, stepping, per-camera cheats, impact language). We will not
  match a team of anime key animators frame for frame. Spend effort on the few hero moments: the opening punch, the
  first scare, the planet throw, the payoff face.
- **Real-scale space adds rendering work** (two cameras, a planet shader, surface patches for contact shots). It is
  standard practice, but it is new code for us, and it should be proved on one shot before the whole act.

---

## 9. What I could not verify

- The exact Xrd GDC slides (the PDF host refused connections). The Xrd facts here come from the Japanese press reports
  (Game Watch, Famitsu CEDEC), Sirlin's article and secondary summaries. I found no source for an exact Xrd FOV or exact
  frame counts; don't quote any as Xrd's.
- I found no primary source for the inverted two-tone impact frame's typical length. The 1-4 frame figure is convention
  and judgment.
- Cut rates, shake amplitudes, hold lengths in frames, lens numbers per register, and the bounce formula are judgment
  (marked [J]). Tune them on the first finished shot, at speed.
- Cascadeur's scripted gravity and batch use are untested.

---

## Sources

Guilty Gear Xrd (3D as 2D anime)
- GDC Vault, "GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D" (Junya C. Motomura, GDC 2015): https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The
- Motomura's handout PDF (could not be fetched; listed for J): https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf
- Game Watch report of the GDC 2015 talk (per-character lights, keyframes only, no normal maps, 40k polys, outlines): https://game.watch.impress.co.jp/docs/news/20150307_691725.html
- Famitsu report of Hidehiko Sakamura's CEDEC 2015 talk (per-frame body adjustments, scale rigs, near parts enlarged, frame-based playback, pan-and-layer 2D camera): https://www.famitsu.com/news/201508/27087024.html
- Sirlin on Xrd (specialised models per frame, hand-touched shadows): https://www.sirlin.net/posts/guilty-gear-xrd
- Arc System Works announcement of the talk: https://www.arcsystemworks.com/guilty-gear-xrd-art-talk-at-game-developers-conference-2015/
- Video summary quoting the "kill everything 3D" slogan (secondary): https://videohighlight.com/v/yhGjCzxJV3E

Spider-Verse (stepped CG, smears, linework)
- befores & afters on Across the Spider-Verse (rates from 1s to 6s, per-limb rates, inking team, Kismet lines): https://beforesandafters.com/2023/06/28/this-was-the-first-cg-animated-movie-ive-ever-heard-of-that-actually-had-a-dedicated-inking-team/
- SIGGRAPH 2023, Oskarsson and Chazot, "Fitting variable rate animation into a modern feature film pipeline": https://history.siggraph.org/learning/fitting-variable-rate-animation-into-a-modern-feature-film-pipeline-by-oskarsson-and-chazot
- /Film on Into the Spider-Verse (on twos, no motion blur, strong posing): https://slashfilm.com/into-the-spider-verse-technique
- CG Spectrum on the look (twos, posing every second frame): https://cgspectrum.com/blog/spider-man-into-the-spider-verse-how-they-got-that-mind-blowing-look
- Sessions.edu (ones and twos per character): https://www.sessions.edu/notes-on-design/illustration-art-styles-utilized-in-spider-man-across-the-spider-verse/
- Smear frame overview: https://wiki.riteme.site/wiki/Smear_frames

Anime directors and staff
- Yatta-Tachi interview with Shingo Natsume and Chikashi Kubota (the simple face, action specialists, detail): https://yattatachi.com/one-punch-man-interview
- Anime Herald interview with Natsume: https://www.animeherald.com/interview/one-punch-dandy-conversation-shingo-natsume/
- ANN interview with the Mob Psycho 100 staff (tone balanced in editing by seconds): https://www.animenewsnetwork.com/feature/2019-09-09/interview-the-staff-of-mob-psycho-100/.150874
- Yutaka Nakamura (debris, smears): https://en.wikipedia.org/wiki/Yutaka_Nakamura
- Animetudes on current action animation trends: https://animetudes.com/2021/08/07/current-trends-in-action-animation-hiroto-nagata-and-ryuki-hashimoto/
- Sakugabooru glossary: https://blog.sakugabooru.com/glossary/

Impact, hitstop, shake
- Sakurai on hitstop (Famitsu column, via Source Gaming): https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- SSBWiki, hitlag frame counts by game: https://www.ssbwiki.com/Hitlag
- Capcom column on hit and block stop: https://game.capcom.com/cfn/sfv/column/131545
- Squirrel Eiserloh, "Math for Game Programmers: Juicing Your Cameras With Math", GDC 2016: https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing
- Smear shader patterns in Unity: https://mome36.github.io/2018/06/09/Smear-Effect-in-Unity , https://gist.github.com/dorodo95/d8da68df38335153b4a7599026d2b0fd

Comedy and editing
- Every Frame a Painting, "Edgar Wright - How to Do Visual Comedy" (Tony Zhou): https://www.youtube.com/watch?v=3FOzD4Sfgag (summary: https://openculture.com/2015/05/the-art-of-making-intelligent-comedy-movies.html)
- Comedy reaction-hold rules of thumb (practitioner guides, weak evidence): https://www.thepromptindex.com/skill/1944-storyboard-comedy-timing , https://morphic.com/ai-glossary/reaction-shot
- Anticlimax cut trope: https://tropedia.fandom.com/wiki/Anticlimax_Cut
- David Bordwell, "Intensified Continuity" (shot lengths): https://www.scribd.com/document/414274235/Bordwell02-pdf

Flash safety
- Harding test and Ofcom's 3-flashes rule: https://en.wikipedia.org/wiki/Harding_test , https://www.pinsentmasons.com/out-law/news/bbc-broke-epilepsy-rule-with-flashing-olympics-logo-rules-ofcom
- Netflix photosensitive epilepsy guidance: https://backlothelp.netflix.com/hc/en-us/articles/360057622133-Photosensitive-Epilepsy-Guidelines-What-Can-I-Do-If-My-Content-Fails

Space scale and light
- NASA planetary fact sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- Lens compression and background size: https://blog.borrowlenses.com/?p=19803 , https://snapshot.asia.canon/en/article/composition-technique-creating-the-illusion-of-a-larger-moon
- Gravity's lighting (sun hard key, Earth bounce, physicist-checked Earth size): https://definitionmagazine.com/features/lubezki-and-cuaron-test-the-limits-of-filmmaking-technology-on-gravity/ , https://digitalmediaworld.tv/in-depth/dvein-the-vein-magma-2 , https://www.space.com/23073-gravity-movie-weightlessness-alfonso-cuaron.html
- KSP scaled space and floating origin (forum explanations, secondary): https://forum.kerbalspaceprogram.com/topic/66458-question-regarding-quotscaledspacequot-subscenes-in-ksp-in-unity-maybe-the-modders-know , https://discussions.unity.com/t/managing-a-large-space-environment-with-planets/168459

Unity and tools
- URP Full Screen Pass Renderer Feature (Unity 6): https://docs.unity3d.com/6000.1/Documentation/Manual/urp/renderer-features/renderer-feature-full-screen-pass.html
- Fullscreen Shader Graph master stack: https://docs.unity3d.com/Manual/urp/urp-shaders/fullscreen-master-stack-urp.html
- Humanoid clips and bone scale (unsupported; Generic or LateUpdate): https://forum.unity.com/threads/scaling-animations-in-mecanim.258760/ , https://discussions.unity.com/t/humanoid-bone-scaling-customization/765733
- Blender game rigs and squash and stretch: https://www.blendernation.com/2021/03/12/avoiding-squash-and-stretch-issues-in-game-rigs/
- Cascadeur Python API: https://cascadeur.com/python-api
- Cascadeur scripting help (console, Python 3.8, commands folder): https://cascadeur.com/help/tools/animation_tools/python_scripting_in_cascadeur
- Cascadeur AutoPhysics settings (freefall acceleration): https://cascadeur.com/help/tools/physics_tools/autophysics/autophysics_settings
- Community Cascadeur MCP (unverified): https://glama.ai/mcp/servers/Karylcode/cascadeur-mcp-plus/tools/run_python
