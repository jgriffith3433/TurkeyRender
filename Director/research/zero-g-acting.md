# Zero-g acting: rules for Hawkes Punch

Research for "Hawkes Punch": two copies of one man floating in space, chasing and talking, now at real planetary scale
("think One Punch Man", J). J's note on the last version: "the feet are all messed up, the characters are facing the
wrong way and they are sitting all weird. They aren't interacting like they are in space at all and their interactions
are awkward."

How to read this file. Every number is tagged:
- **[S]** sourced. The source is in the list at the end.
- **[D]** derived from sourced physics with the arithmetic shown.
- **[M]** measured on our own clips in `Assets/MusicVideo/Motion/Clean` (muscle curves averaged over the clip).
- **[J]** my judgment as a director or animator. Nobody published it.

---

## 0. What went wrong last time (measured, not guessed)

I averaged the muscle curves of every generated zero-g clip (`gm_zg_*__clean.anim`) and compared them with Mixamo
mocap clips on the same rig. **[M]** The generated clips break the Neutral Body Posture in the same ways every time,
and these line up with J's notes:

| Muscle | Mocap standing idle | Real NBP target (section 1) | `gm_zg_*` clips (mean of each clip) | What J sees |
|---|---|---|---|---|
| Neck Nod Down-Up | -0.04 | **-0.2 to -0.35** (head tipped *down*) | **+0.22 to +0.72** (head tipped *up/back*) | chin up, staring at the ceiling: "facing the wrong way" |
| Left Arm Down-Up | -0.39 | about -0.05 (arms floating up and out) | **-0.64 to -0.99** (arms jammed against the sides, lower than a standing man) | stiff, earthbound arms |
| Left Arm Twist In-Out | -0.07 | about the clip's own value | +0.71 (idle), -0.91 (hold_ball) | odd palms, twisted forearms |
| Left Toes Up-Down | 0.00 (every mocap clip) | 0 | **+0.20 to +0.67 held, ±0.28 flapping in idle** | "the feet are all messed up" |
| Left Foot Up-Down | +0.67 | +1.0 (limit) | pinned at +1.00, or swinging the full -1..+1 (startle, catch_gut, tumble) | ankles snapping |
| Left Upper Leg Front-Back | +0.59 | about 0.0 (40° hip flex) | **-0.81 / -0.85** in throw and tumble (about 100° hip flex) | "sitting all weird" |
| Left Lower Leg Stretch | +0.97 | about +0.44 (45° knee) | **-0.41 to -0.67** in several (110°+ knee) | thighs up, shins tucked: a chair pose |

So the clips mix up "floating" with sitting, kneeling or lying back, and the toes carry generator noise. **Rule zero:
every floating body starts from the NBP muscle set in section 1. Toes are always 0. Head is always tipped down, never
up. Hip flexion over about 60° and knee flexion over about 70° held together read as a chair.**

---

## 1. Neutral Body Posture (NBP): the base float

### 1.1 What NASA measured

The NBP is the posture the relaxed body takes in weightlessness. Holding any other posture takes muscle work. **[S]**
NASA documented it in the Man-Systems Integration Standards, NASA-STD-3000, Figure 3.3.4.3-1, from Skylab photographs
of 12 subjects (means with standard deviations). **[S: Mount et al. 2003, Fig. 1 note]** The STS-57 study (6 crew, flight
day 6, blindfolded, told to relax and not orient to any work area) then measured each crew member. Table 1 of that
report is the only per-joint, per-person table in the public record. **[S]** The values below are copied from it. The PDF
table layout is ragged, so I read single values as "both sides" where only one is printed.

| Joint (degrees) | MSIS NBP (Skylab) | C1 | C2 | C3 | C4 | C5 | C6 | STS-57 mean (my arithmetic) |
|---|---|---|---|---|---|---|---|---|
| Hip flexion | **50** | 33 | 33/29 | 33 | 33 | 29 | 12 | **28.5** |
| Hip abduction | **18.5** | 6.5/5.5 | 20/16 | 13/17.5 | 15.5/16 | 3.5/4.5 | 4/9 | **11** |
| Knee flexion | **50** | 50 | 83/87 | 50 | 50 | 44 | 11/12 | **48** |
| Ankle plantar flexion | **21** | 6/7 | 15/14.5 | 29/30 | 27/24 | 16/14 | 35/41 | **21.5** |
| Waist flexion | **0** | 13 | 0 | 1 | 0 | 0 | 2 | **2.7** |
| Neck flexion | **24** | 16 | 18 | 16 | 5 | 7 | 16 | **13** |
| Shoulder flexion | **36** | 49/46 | 67/64 | 29 | 33/35 | 60/57 | 36 | **45** |
| Shoulder abduction | **50** | 32/33 | 26/26.5 | 27/29 | 40.5 | 24/45 | 23/36 | **32** |
| Medial shoulder rotation | **86.6** | 58/61 | 45.5/41 | 71/77 | 74.5/74 | 25.5/26.5 | 50/48 | **55** |
| Elbow flexion | **90** | 78 | 45/53 | 61/57 | 94/91 | 78/80 | 51/64 | **69** |
| Wrist extension | 0 | 0 | 3/0 | 0 | 0 | 0 | 0 | 0 |
| Finger flexion | 0 | 42 | 60 | 30 | 21/57 | 55/47 | 25/35 | **41** |

### 1.2 Individual variation: the posture is a range

- No STS-57 crew member matched the MSIS posture. The authors conclude "one composite posture is not adequate", and a
  range of postures should be used. **[S]**
- An ESA review of the Skylab photos found only 36% matched the MSIS figure. **[S: Mount et al. 2003]**
- Three families showed up **[S]**: (1) almost standing (C6: hip 12, knee 11); (2) pitched forward with a deep knee bend
  and legs at about 45° to the floor (C2: knee 85); (3) elongated with a straight neck (C4, C5: neck 5-7).
- STS-57 arms were "less bent", "closer to the torso sides and generally held lower toward the waist" than MSIS, with
  hands anywhere from shoulder to waist height and a shoulder-width apart to nearly touching. **[S]**
- The 2013-2019 ISS study (9 crew, video in flight) found the "crouch" efforts settle with the hands at or below the
  MSIS posture and the "stretch" efforts with the hands higher. Veterans held the neutral phase longer and steadier, and
  relaxation grew over the mission. **[S: Rajulu et al.; Kim et al.]** It published no joint-angle table I could find.
- Causes offered: build, exercise habits, old injuries, sex (centre of mass), and whether the subject was blindfolded
  (seeing a work area orients the posture). **[S]**

**Use for our two copies [J]:** they are the same man, so they share one base NBP. Give the **chaser** the forward-pitched
family (more hip and knee, arms forward: purpose) and the **chased** the elongated family (straighter, arms lower,
head up a little *only when he is looking at something above him*). The silhouettes then differ while staying one body.

### 1.3 Unity Humanoid muscle values for the base float

**How a muscle maps to an angle.** A muscle is -1..1. Unity's naming convention holds on every clip I checked: the
**first word is the negative end** ("Front-Back": -1 front, "Down-Up": -1 down, "Foot Up-Down": -1 up, "Stretch":
+1 straight). **[M]** Evidence: sitting has Upper Leg Front-Back -0.74, standing +0.59; a straight knee or elbow is
about +1; kneeling with pointed feet has Foot Up-Down +1.0; at full extension of a cross punch the arm is at
Front-Back -0.50.

**Degrees per unit.** I used Unity's default muscle limits as I remember them (Upper Leg Front-Back -90..50 = 70°/unit,
Lower Leg and Forearm Stretch ±80, Arm Down-Up -60..100 = 80°/unit, Arm Front-Back ±100, Upper Leg In-Out ±60,
Foot Up-Down ±50, Spine, Chest, Neck and Head ±40). **These limits are from memory, and our Avatar may override them.**
Verify with `HumanTrait.GetMuscleDefaultMin/Max` (or the Avatar's own `HumanLimit`) before trusting a value to better
than 0.1. Our clips confirm the hip (sit vs stand gives about 69°/unit). They suggest the knee may be wider than
80°/unit (a Mixamo sit knee came out at +0.22). **[M]**

**Zero is not anatomical zero.** A mocap standing idle sits at hip +0.59, knee +0.97, foot +0.67 and arm down -0.39. So
offsets are measured from those standing values, not from 0. **[M]**

| Joint | Target (deg) | Why this number | Unity muscle (both sides) | Value | Reasoning |
|---|---|---|---|---|---|
| Hip flexion | **40** (range 25-50) | between MSIS 50 and STS 28.5 | `Upper Leg Front-Back` | **0.00** (range +0.25..-0.12) | 0.59 - F/70 **[M]** |
| Hip abduction | **12** each (range 5-18) | STS mean 11, MSIS 18.5 | `Upper Leg In-Out` | **+0.24** (range +0.12..+0.35) | 0.04 + A/60 **[M]**; wider than +0.35 reads frog-like **[J]** |
| Knee flexion | **45** (range 35-55) | MSIS 50, STS 48 (C2's 85 is the outlier) | `Lower Leg Stretch` | **+0.44** (range +0.55..+0.31) | 1 - K/80. If the Avatar's knee is wider, use about +0.55 and check by eye **[M/J]** |
| Ankle plantar flexion | **20** | MSIS 21, STS 21.5 | `Foot Up-Down` | **+1.0** | Standing is already +0.67, so 20° more PF hits the limit **[M]**. Every gm_zg clip sits there too. A truer pointed foot needs the Avatar's foot range opened (engine change, not a muscle value) |
| Toes | 0 | relaxed | `Toes Up-Down` | **0.00, always** | mocap is 0, generated noise is not **[M]** |
| Waist and spine | 3 forward | MSIS 0, STS 2.7 | `Spine Front-Back` / `Chest Front-Back` / `UpperChest Front-Back` | **-0.05 / -0.03 / 0** | 40°/unit; a hint of a curl, never a hunch |
| Neck flexion | **20** total (range 10-24) | MSIS 24, STS 13 | `Neck Nod Down-Up` + `Head Nod Down-Up` | **-0.30 + -0.20** (STS look: -0.20 + -0.12) | 0.5 × 40 = 20°. Negative = chin down **[M]** |
| Shoulder (clavicle) | slight raise | arms float up | `Shoulder Down-Up` | **-0.5** (mocap idle -0.68, many clips -1) | judgment **[J]** |
| Shoulder abduction | **40** (32-50) | STS 32, MSIS 50 | `Arm Down-Up` | **-0.05** (range -0.18..+0.05) | -0.39 + (A-15)/80 from the idle anchor **[M]** |
| Shoulder flexion | **40** (36-45) | MSIS 36, STS 45 | `Arm Front-Back` | **-0.20** (range -0.15..-0.24) | idle +0.21 - F/100. The Down-Up and Front-Back axes are coupled when the arm is raised, so judge by eye **[M/J]** |
| Medial rotation | 55-87 | forearms across the front | `Arm Twist In-Out` | keep the source clip's value; check the palms face down and in | sign not verified on our rig; gm_zg_idle's +0.71 is too far **[M]** |
| Elbow flexion | **75** (69-90) | STS 69, MSIS 90 | `Forearm Stretch` | **+0.06** (range +0.14..-0.13) | 1 - E/80 **[M]** |
| Wrist | 0 | both studies | `Hand Down-Up` / `Hand In-Out` | 0 | |
| Fingers | **40** curl | STS mean 41 (MSIS says 0; the crews did not) | `fingers set` | **0.35** ("relaxed") | the engine's relaxed curl; HY-Motion clips have no finger motion and need it **[S/J]** |

How to apply: `call clipderive` **adds** offsets to a source clip. Offset = target value - source clip value per muscle,
and the result is clamped to ±1. Example from `gm_zg_idle` (neck +0.32, arms -0.64, twist +0.71) to NBP: neck -0.62,
head -0.25, arms Down-Up +0.59, Twist about -0.5 (check by eye). Its toes flap ±0.28, which a constant offset cannot
cancel, so `clipderive` cannot fix that clip's feet. It is cleaner to build the base float from a quiet mocap clip with no root motion (`mx_breathing_idle`: Upper Leg +0.59,
Lower Leg +0.97, Neck -0.04, Toes 0) with offsets Upper Leg -0.59, Lower Leg -0.53, In-Out +0.20, Foot +0.33, Neck -0.26,
Head -0.18, Arm Down-Up +0.34, Arm Front-Back -0.41, Forearm -0.61, Shoulder +0.18, Spine -0.05. Then render it front
and side and check it against the NBP sketch before using it. **[M/J]**

---

## 2. Body rules

### 2.1 The base float [S + J]
- Start every floating actor in the NBP above. Nothing hangs: no limb "falls" to a rest pose, because there is no
  weight. A raised arm stays raised until a muscle brings it back. **[S: Framestore, "objects keep moving until something
  stops them"; J]**
- The feet are the tell. **Never** a standing foot (90° to the shin), never curled toes, never ankles flapping. Feet sit
  about hip-width (abduction above), relaxed and pointed, toes soft. Knees never lock straight unless that is the joke.
- Legs are not a seat: hip 25-50° and knee 35-55°. Never hip ≥ 70° and knee ≥ 70° together outside a deliberate tuck
  (laughing, a spin, catching a hit to the gut) that lasts under about 1.5 s. **[S range / J limit]**
- The head is tipped down 10-24° on the neck. Eyes do the looking up. **[S]**

### 2.2 Breathing
- Rest: 12-16 breaths a minute, a cycle of 4-5 s. Talking: breaths are taken at phrase ends. Out of breath after a chase:
  25-35 a minute. **[J, standard physiology]**
- With nothing to press against, a breath moves the whole floating body a little. Chest `Chest Front-Back` ±0.03,
  `Shoulder Down-Up` +0.05 on the in-breath, arms rise 1-2 cm with the ribcage, legs answer by under 1°. **[J]**

### 2.3 Drift and rotation rates
Physics first **[S]**: the centre of mass moves in a straight line at constant speed unless something outside pushes.
Limb motion alone can only rotate the body about its centre of mass. It cannot move it. **[S: Cascadeur]**

| Situation | Translation | Rotation | Tag |
|---|---|---|---|
| Idle float "on station" | 0-3 cm/s (cabin air moves about 8-20 cm/s and nudges you) | 0-2°/s | J (airflow figure from NASA cabin ventilation limits, not checked against the text) |
| Gentle push off a wall | 0.1-0.4 m/s | under 5°/s | D: Mir astronauts' average push-off force was 28 N **[S]**; 28 N × 0.5-1 s / 80 kg = 0.18-0.35 m/s |
| Hurried, a deliberate push | 0.5-1.2 m/s | 5-15°/s from an off-centre push | J |
| All-out soar (real-world max) | **1.9 m/s** | | S: Newman, Amir and Beck, Mir, peak loads near 500 N |
| Leg push-off to a target 3.96 m away | (peak force 225 ± 75 N) | | S: Stirling et al. 2009, parabolic flight |
| Off-centre shove (worked example) | 0.5 m/s | about **50°/s** tumble | D: J = 80 kg × 0.5 = 40 N·s, lever 0.3 m from the centre of mass, I ≈ 13 kg·m² about the side axis → ω = 12/13 rad/s = 53°/s |
| Shoulder poke (worked example) | **6 cm/s** | about **45°/s** about the long axis | D: J = 5 N·s, lever 0.2 m, I ≈ 1.3 kg·m² about the long axis → ω = 0.77 rad/s; v = 5/80 |
| Self-rotation with no contact | 0 | about 90° per full leg circle (somersault axis, Cascadeur's model: two leg circles flipped him onto his back) | S (from their test), slow: 1-2 s per circle |

Rule [J]: **anything that spins keeps spinning at the same rate** until it is grabbed or pushed. A spin from a poke does
not slow down on its own. Speeds are linear: no ease-out to a stop in mid-air, ever. Only contact (a hand, a wall, the
other man) changes velocity, and it does so in 0.1-0.4 s.

Moment of inertia changes the rate **[S physics]**: a tumbling man who tucks (knees to chest) spins about 2-3× faster,
and spreads out to slow down. Use it: tuck to "whip round", open into a starfish to "brake".

### 2.4 How a turn happens
- **With a handhold [S]:** the hand twists the body round (a slow pull, 0.5-1 s for 90°). Astronauts move hand over hand
  with small, continuous corrections. "You don't need to push off from the wall as hard as you might think." (Ed Lu)
- **Without contact [S: Cascadeur]:** turning the chest one way turns the legs the other way. Turning the head and chest
  to look at the other man swings the hips *away*, so the body only "nets" a turn through repeated limb cycles (arms
  out-in, leg circles), roughly 30-90° per 1-2 s cycle **[J from the Cascadeur demo]**. Rule: **a floating man cannot
  just turn to face someone.** He looks with eyes and neck (head up to about 45°), the chest helps (±20°), and the legs
  counter-swing (hips about -0.5× the chest turn). For a full turn he either grabs something, uses the other man, or does
  the visible flail.
- On the native path, `gaze` turns only the neck and head (limit 60). Use it for looks under about 60°. For more,
  re-mark the body (`face` on the cast) on a cut, or motivate a turn with a contact.

### 2.5 Push and touch: both bodies move
- **Equal and opposite [S physics].** Any push gives both bodies the same momentum in opposite directions. Our two are
  copies of one man, so **equal masses give exactly equal and opposite speeds**: if A shoves B away at 0.5 m/s, A goes
  backward at 0.5 m/s. Their separation grows at 1.0 m/s. Never animate the pusher staying put.
- **Off-centre = spin.** Push through his centre of mass (about navel height, deep in the pelvis) and he only drifts. Push
  anywhere else and he drifts **and** rotates (table above). The pusher gets the opposite spin from the same lever.
- **Grab while moving.** A moving at v grabs B, who is still: they now move together at v/2 (equal mass). If the grab is
  off-centre, the pair rotates about their shared centre of mass, midway between them. **[D]**
- **Catch an object.** A catcher of mass M catching mass m at speed u drifts at m·u/(M+m) in its direction. A 0.4 kg can
  at 5 m/s moves an 80 kg man at 2.5 cm/s: visible as a slow drift, and his arms give. **[D]**
- **Throw an object.** The same, backward: throwing the can at 5 m/s sends him back at 2.5 cm/s plus a spin if the
  throw is to the side of his centre. **[D]** (Planet throws: section 6.)
- **Contact timing [J]:** a push or catch acts over 0.15-0.35 s (hands, elbows and shoulders all give). Velocity changes
  only during that contact. Before and after: straight lines at constant speed.

### 2.6 Timing against ground acting
| Action | Multiplier vs the same beat on the ground | Why | Tag |
|---|---|---|---|
| Gestures (talk, point, shrug) | 1.2-1.4× longer, settle with 1-2 small overshoots | no gravity to return the arm; muscle has to stop it | J |
| Whole-body reorientation | 2-4× longer | no floor to push against; limb cycles | S (mechanism), J (number) |
| Recovery after a hit or push | does not settle: he drifts and spins until contact | momentum | S |
| Hair, cloth, loose limbs after the body stops | lag, then overshoot, then **float**, not fall | no weight, no air in vacuum (inside a helmet or ship there is air) | S (Framestore: no air resistance) |
| Anticipation | smaller and earlier than on the ground; comes through the arms and a contact point, not a squat into the legs | no floor to load | J |

Weight without gravity [S: Framestore, "The key to good animation is giving a character weight"; game-anim mass rule]:
weight shows as **inertia**. It is hard to start (contact over several frames, the body compresses into the push),
hard to stop (the body overshoots its grip, the arm stretches, the shoulders lead the hips), and loose parts lag. A
heavy thing can stop abruptly (hits a wall) but never starts abruptly. **[S]**

---

## 3. Acting rules (and what the legs do)

All are [J], built on the physics above.

| Beat | Upper body | Legs | Physics to show |
|---|---|---|---|
| **Surprise** | a full-body starfish over 4-6 frames: arms up and out (Arm Down-Up to +0.5), fingers spread, head back only 5-10° (eyes wide do the rest), spine extends | legs straighten and spread at the same moment (knee to about +0.8, In-Out +0.4), then drift back to NBP over 1-1.5 s | the body pitches a little opposite to the arms (arms thrown back → body tips forward 5-10°) and keeps that rotation |
| **Laughter** | curls up: head down, chest folds, hands to belly or slapping the other man's shoulder | knees come up toward the chest (hip about 70°, knee about 80°) for the laugh, then release | each laugh pulse rocks the whole body ±5-10° in pitch about its centre (nothing anchors it), and a slap on the other man sends both off slowly |
| **Talking** | gestures at chest-to-shoulder height (NBP hands), smaller than on the ground; shrug lifts the whole body slightly | NBP, feet still and relaxed, a slow 2-3 s leg drift; **no weight shifts**, no stepping | a big gesture turns the body a few degrees the other way; let it |
| **Listening** | hands loose in front, head tilted, slow rotation continues | NBP, maybe ankles crossed | he keeps drifting while he listens |
| **Reaching** | arm extends, shoulder follows, the chest leans in only by turning about the centre of mass | **legs swing backward** as the arm goes forward (counter-rotation) | the reach cannot bring him closer; the comedy of the last 5 cm |
| **Catching** | hands meet the object, elbows give 20-40° over 0.2-0.3 s, the head ducks | legs trail and swing in the catch direction | he picks up the drift (section 2.5) and keeps it |
| **Being hit / pushed** | the hit point leads; head and arms lag 2-4 frames, then overshoot | legs lag furthest and whip | translation plus a spin from the lever arm; he does not stop |
| **Grabbing a rail or the other man** | hand closes, arm stretches, shoulder takes the load | legs overshoot past the hand in the travel direction, swing, settle in 0.5-1 s | the stop comes only through that hand |
| **Chasing** | arms forward (shoulder flex 60-90°), eyes on the target | legs trailing behind, knees soft, feet together, toes pointed: "Superman lite" | constant speed between contacts; turns only at contacts |

Facing: in a dialogue float **the torsos face each other within about 45°** and heads make up the rest. A man
cannot correct his facing without a contact (2.4), so if he is wrong, show why (a spin from a poke) or cut and re-mark.
Being turned away is a gag, not an accident. **[J]**

---

## 4. Gag rules: zero-g comedy beats for two

Each beat relies on the physics. Two identical masses make the beats exact and symmetrical, which is funny in itself. **[J]**

1. **The pusher leaves too.** A shoves B to end an argument. Both drift apart at the same speed. A's face: he did not
   plan to leave. Physics: equal masses give equal and opposite speeds (0.3-0.5 m/s each).
2. **The poke spin.** A pokes B's shoulder. B barely moves (6 cm/s) but turns slowly on his long axis (about 45°/s),
   ends up facing away mid-sentence and keeps talking to the void, then comes round again 8 s later and finishes the line.
   Physics: a small impulse with a lever arm on a low moment of inertia.
3. **Swimming nowhere.** Stranded out of reach of everything, B does a frantic breaststroke. His limbs flail, his body
   wobbles, and his centre of mass does not move at all. Physics: no external force, no translation.
4. **Can't stop.** A launches at B, B dodges, A sails past at constant speed, flailing. The flail changes his orientation
   but not his path, so he slowly rotates as he recedes, still mid-yell. Physics: momentum, and internal motion only rotates.
5. **The grab-and-twirl.** A, flying past, grabs B's ankle. The pair start cartwheeling about their shared midpoint at
   half A's speed, both yelling in a circle. Physics: the momentum is shared and the off-centre grab gives angular momentum.
6. **The turn to face him.** A twists his chest to glare at B, and his legs swing the other way; he twists harder and
   his hips swing further; he ends up glaring over his own shoulder at a worse angle. Physics: counter-rotation (Cascadeur).
7. **The slow-motion collision.** Two bodies drift toward each other at 5 cm/s each. It takes forever. Both see it coming
   and can do nothing. Gentle bump, then both drift back apart at the same 5 cm/s. Physics: elastic-ish exchange of momentum.
8. **Recoil throw.** A throws the can at B and drifts gently backward, exactly as far as it takes for B to throw it back,
   and so on: two men slowly separating by a game of catch. Physics: every throw and catch transfers momentum.
9. **Losing the grip.** Holding a rail, A lets go to gesture big for emphasis, and the gesture carries him gently off the
   rail and away mid-rant. Physics: the gesture's reaction drifts his body.
10. **Upside-down argument.** Two heads at opposite ends, each sure he is the right way up. Cut to each man's close-up
    with the camera rolled so his face is upright, then the two-shot shows them inverted. Physics: there is no up.

Comedy craft [J]: the physics is the setup. Hold on the consequence. A drift or spin needs 1-3 s on screen to read as a
joke, longer than a ground gag, because it is slow. Let the victim's face land while the body keeps going.

---

## 5. Camera rules for space

1. **Pick a scene up and keep it.** In space there is no up, so the camera gives the audience its only floor. Set the scene's
   up from the first wide (both men's heads, or the planet's horizon) and hold it for the scene. **[J]** Gravity's camera
   deliberately kept moving to "remove any sense of up and down" and disorient. **[S: CGW]** That works for terror; comedy
   needs the audience oriented to read the joke. Disorient only on purpose, and briefly. **[J]**
2. **Use a horizon.** A planet limb, the ship, or a strong star field gives orientation. Keep the planet's horizon at a
   consistent screen angle within a scene; roll it only when the story rolls. **[J]**
3. **The 180° rule still holds** on the line between the two men. **[S: screen direction]** In 3D the line has a top as well
   as a side: keep which man is screen-left **and** which is screen-higher. After a spin or a big drift, re-establish with
   a wide before cutting in again (the action itself moves the line). **[S/J]**
4. **Match drift across cuts.** A body drifting screen-right keeps drifting screen-right at the same apparent speed in the
   next shot. Spin direction too (a clockwise spin stays clockwise). **[J]**
5. **Show the legs.** Floating is read from the legs and feet, so the medium-wide (knees up) is the tightest default for
   "they are floating"; use full figures for every gag in section 4. Close-ups are for the face beat after the physics
   has read. **[J]** This makes the feet rules in section 2 non-negotiable: they are on screen.
6. **Eyelines.** When one man is rotated against the scene up, his close-up may roll the camera so his face sits within
   about ±30° of upright, but keep the roll direction consistent and return to the scene up in the two-shot. Eyeline
   still points at where the other man really is on screen. **[J]**
7. **Steady camera for jokes.** No handheld in a dialogue float. Drift the camera at the same rate as the subjects, so
   they hold in frame while the stars slide behind. The background slide sells the drift. **[J]**
8. **The camera is a character** (Max Solomon on Gravity) **[S]**, but in comedy the character is calm.

---

## 6. Superhumans at planetary scale ("think One Punch Man")

The NBP rules stay the base whenever the men are idle, talking or floating. When they act superhuman, a second rule set
takes over: **anime and superhero convention beats physics for the hero's own body, while the world obeys physics so
the audience can feel the scale.** **[J]**

### 6.1 Real sizes (for the build)
| Body | Radius | Against a 1.8 m man | Tag |
|---|---|---|---|
| Moon | 1,737 km | 1 : 1,000,000 | S (standard values) |
| Earth | 6,371 km | 1 : 3,500,000 | S |
| Saturn | 58,232 km equatorial, main rings to about 137,000 km | 1 : 32,000,000 | S |
| Jupiter | 69,911 km | 1 : 39,000,000 | S |

- At real scale, a planet behind a man in a medium shot is a curved wall or a horizon. The man is a speck in any frame
  that shows the whole planet. **[D]**
- **Floating point [S: known engine limit; J for the fix]:** a 32-bit float carries about 7 digits, so positions 6,000 km
  from the origin are good to about 0.5 m: characters jitter. Keep the characters near the origin, and draw planets in a
  separate far layer or camera at reduced distance and size with the **same angular size** ("scaled space", as games
  with real-scale solar systems such as Kerbal Space Program do). Divide a planet's distance and radius by the same factor
  k and it looks identical from the camera: Earth at k = 6000 is a 1.06 km sphere, and if it should sit 20,000 km away it
  goes 3.3 km away. Render that layer first, behind the characters. Light and shadows keep the true sun direction.

### 6.2 How scale reads [S + J]
- **Big things move slowly on screen.** A large mass cannot start suddenly; it follows a smooth curve. Contrast its slow
  move with fast small detail (debris, sparks, the man himself). **[S: game-anim; "contrasting speeds helps show scale"]**
- Timing alone sells weight: the same object animated slower reads heavier. **[S: timing]** A planet should drift or
  turn at a rate that takes **several seconds to cross the frame** even when it is "flying fast". **[J]**
- **High-frequency detail keeps it alive.** Simply slowing a big move loses life; add fast surface detail at impact
  (fragments, shockwave rings, dust). **[S: game-anim]**
- Low camera angle on the giant thing, the man in the foreground, a long lens to stack them. **[S: giant-creature timing; J]**
- The man is tiny, so **he reads by silhouette and contrast**: a clean pose, a rim of light, a trail or aura behind his
  motion. A pose that needs detail to read will not read. **[J]**

### 6.3 Flying poses (superhero and anime convention) [J]
| Pose | Body | Use |
|---|---|---|
| **Fist-forward ("Superman")** | one arm straight ahead with a fist (shoulder flex 170°, elbow straight), the other at the side or bent at the hip; body straight, slight arch; legs together, knees soft (10-15°), toes pointed | fast travel toward a target, a hero entrance |
| **Both fists forward** | two arms ahead, head tucked between them | ramming speed, a punch through something |
| **Anime lean flight** | body pitched 30-45° into the direction of travel, arms at the sides or crossed, legs trailing together | casual superhuman travel; nothing strains |
| **Standing in the void** | stands on nothing: legs apart and slightly bent, arms loose or crossed, head level | the anime power stance in space, a deliberate break from NBP that says "this man is not affected by any of this" |
| **Deadpan float** | NBP, hands in pockets or at his sides, face blank | One Punch Man's comic engine: Saitama's casual, unimpressed body against cosmic events; the contrast is the joke |

The deadpan contrast **[S: the show's well-known premise; J for the rule]**: the more casual the body, the bigger the
feat feels. A planet throw by a man who barely winds up is funnier and stronger than one by a straining man. Give the
strain to the opponent (or to the other copy), and give the hero minimal anticipation.

### 6.4 Holding or throwing something enormous [J]
- **The contact patch is tiny.** One hand or a fingertip against a planet. Show it in an insert (hand on the surface, the
  ground cracking out from the fingers), then cut wide so the man is a speck on a world.
- **Without a floor, he braces on the object itself:** hips and shoulders aligned behind the hand, one straight line of
  force from the planet through the arm into the spine. Legs either trail (casual) or tuck and kick (effort).
- **Strength reads as stillness.** The body barely moves while the giant thing moves. Small fast detail around the hand
  (debris, dust, a shock ring) says how hard it is.
- **Physics as a joke (optional):** throwing a planet, the man should fly backward by the ratio of masses, which is
  effectively not at all for the planet... unless he is superhuman and "anchored". Pick one rule per film. My
  recommendation: the hero ignores recoil on huge objects (superhero convention), while ordinary zero-g rules apply to
  small things, the can and each other. Mixing the two well is where the comedy lives (he can throw Saturn but cannot
  turn round to face his double).

### 6.5 Timing of a superhuman throw or catch [S + J]
Anime action timing: one or two frames of anticipation in normal fights, then many frames of reaction. **[S: anime
punch breakdown]** A planet-scale beat stretches the ends and shrinks the middle:

| Phase | Frames at 30 fps | What happens |
|---|---|---|
| **Anticipation / wind-up** | 18-36 (0.6-1.2 s), with a 6-12 frame hold at the peak | the body coils away from the throw, the eyes lock on the target, energy gathers (glow, the planet's rings tremble). For the deadpan hero: 6-12 frames total |
| **Release** | 2-4 | a straight-line smear or trail; an impact flash held 2 frames (the engine's `flashFor` 0.07 s); camera shake 0.2 s |
| **Hit stop** | 3-6 | everything freezes on contact or release, then picks up (standard hit-stop in anime and games) **[S]** |
| **Follow-through hold** | 15-45 (0.5-1.5 s) | the thrower holds the end pose (arm extended, body stretched along the line) while the object leaves; nothing in him moves except slow drift |
| **The giant object's travel** | starts slow over 15-30 frames, then fast | big mass never starts suddenly **[S]**: even after an explosive release, the planet accelerates on a smooth curve; it reads as fast by crossing the camera, not by popping |

Catching something enormous:
1. Arms out early (the hero sees it coming), 12-24 frames of reaching.
2. Contact: a flash and a hit stop of 3-6 frames, a shock ring, debris.
3. Absorb: the body compresses along the line of travel over 8-15 frames (elbows to 90°, the spine curls, the knees come
   up), and **the man is carried backward with the object** before stopping it (momentum). Two copies catching
   together: both are pushed back the same distance.
4. Settle: a held pose, 15-30 frames, then a deadpan beat.

No air in space: no hair or clothes flapping from speed. Use trails, speed lines and aura instead, as anime does.
**[S: vacuum; J]**

---

## 7. Quick checklist before a floating shot goes to J [J]
- [ ] Base float is NBP: hip 25-50°, knee 35-55°, ankles relaxed and pointed, **toes 0**, head tipped down 10-24°, arms
      floating up and forward with elbows at about 75°, fingers relaxed (0.35).
- [ ] No pose reads as sitting, kneeling or lying back (hip ≥ 70° and knee ≥ 70° together, held).
- [ ] Every change of speed or spin has a contact that causes it, and the contact moves both bodies.
- [ ] Speeds are constant between contacts, with no ease-to-stop in mid-air.
- [ ] Torsos in a dialogue face each other within 45°, or the shot explains why not.
- [ ] Scene up and the 180° line are held; drift and spin directions match across cuts.
- [ ] Legs are in frame for every physics gag.
- [ ] Superhuman beats: long wind-up (or deadpan none), 2-4 frame release, 3-6 frame hit stop, held follow-through,
      giant objects start slow.

---

## Sources

Primary NBP data
- Mount, F. E., Whitmore, M., Stealey, S. L. (2003). *Evaluation of Neutral Body Posture on Shuttle Mission STS-57
  (SPACEHAB-1)*, NASA TM-2003-104805. Table 1 (per-joint angles, MSIS and six crew) and Figure 1 note (MSIS from Skylab,
  12 subjects). https://ntrs.nasa.gov/citations/20040200967 (PDF: https://ntrs.nasa.gov/api/citations/20040200967/downloads/20040200967.pdf)
- NASA-STD-3000, Man-Systems Integration Standards, Vol. I, Sec. 3 (Anthropometry and Biomechanics), Fig. 3.3.4.3-1. The
  original site (msis.jsc.nasa.gov) no longer resolves; values above are as reproduced in Mount et al. 2003.
- Rajulu, S., Young, K., Kim, H., Dirlich, T. *Quantification of In-flight Physical Changes: Anthropometry and Neutral Body
  Posture* (ISS, 2017 slides). https://ntrs.nasa.gov/api/citations/20170000413/downloads/20170000413.pdf
- Rajulu, Young, Kim (2019 poster), same study, 9 crew, preliminary NBP results.
  https://ntrs.nasa.gov/api/citations/20190001031/downloads/20190001031.pdf
- Young, Amick, Rajulu, abstract on the same study (Skylab, ASTP, STS-57 background).
  https://ntrs.nasa.gov/api/citations/20150020939/downloads/20150020939.pdf
- Neutral body posture overview (variation, causes). https://en.wikipedia.org/wiki/Neutral_body_posture

Moving in weightlessness
- Cascadeur research, "Moving in Zero Gravity" (80.lv, 2021). https://80.lv/articles/cascadeur-research-moving-in-zero-gravity
- Newman, Amir, Beck: astronaut-induced disturbances on Mir (peak loads near 500 N, soaring up to about 1.9 m/s), via
  https://ntrs.nasa.gov/api/citations/20020000776/downloads/20020000776.pdf and MIT News (average force 28 N):
  https://news.mit.edu/1996/astronauts-0605
- Stirling, Willcox, Ferguson, Newman (2009), *Kinetics and Kinematics for Translational Motions in Microgravity During
  Parabolic Flight* (peak push-off 224.6 ± 74.6 N, 3.96 m target). https://www.doi.org/10.3357/ASEM.2356.2009
- Kulwicki, Schlei, Vergamini, *Weightless Man: Self-Rotation Techniques* (USAF, 1962), record:
  https://scilit.net/publications/aafaa6ede29380e4255fbc594520e9c3 ; Kane and Scher (1970), *Human self-rotation by means
  of limb movements*, J. Biomechanics 3(1):39-49; Stirling, *Development of Astronaut Reorientation Methods* (MIT, 2008):
  https://dspace.mit.edu/handle/1721.1/44930 (numbers not retrieved; cited for the mechanism only)
- Ed Lu, ISS letter on flying inside the station (gentle push-offs). https://oldsite.issfanclub.eu/node/2890.html
- Universe Today, why moving in space is all about the hands. https://www.universetoday.com/articles/why-spacewalking-is-all-about-the-hands

Animation and film
- Max Solomon, FMX 2014 interview on animating Gravity. https://www.animatorisland.com/?p=2862
- Tim Webber on Gravity's weightlessness. https://www.scientificamerican.com/article/gravitys-oscar-winning-visual-effects-mastermind-talks-about-computer-graphics-and-weightlessness
- CGW, "Making Space" (Framestore: keyframed bodies, no air resistance, camera as a character removing up and down).
  https://www.cgw.com/Press-Center/In-Focus/2013/Making-Space.aspx
- Game Anim, weight and mass (large mass cannot start suddenly; add back high-frequency detail). https://www.gameanim.com/?p=76076
- Big and heavy animation (contrasting speeds show scale; low angle). https://res.cloudinary.com/hrsvcp9vu/image/upload/v1641252319/production-TjoCZY/35240892f15b6625b626/BIG___HEAVY_ANIMATION___LinkedIn.pdf
- Anime anticipation and impact frame counts (Ninja Scroll breakdown). https://sites.google.com/view/art379/lessons/anticipation-impacts
- Hit stop. https://tvtropes.org/pmwiki/pmwiki.php/Main/HitStop
- One Punch Man, Saitama vs Boros (episode 12; scale and deadpan contrast). https://www.animenewsnetwork.com/review/one-punch-man/episode-12/.96778
- 180-degree rule and screen direction. https://en.wikipedia.org/wiki/180-degree_rule

Our own measurements
- `Assets/MusicVideo/Motion/Clean/*.anim`: muscle curves averaged per clip (mocap: mx_breathing_idle, mx_sit_idle,
  mx_kneel_idle, mx_flying_idle, mx_treading_water, mx_falling_idle, mx_cross_punch; generated: every gm_zg_*).
- `Assets/MusicVideo/Editor/Native/MVClipClean.cs` (`call clipderive`: offsets are added to the source muscles and
  clamped to ±1).

Not found (and therefore not used): the MSIS figure's standard deviations in machine-readable form, a published ISS NBP
joint table, WALL-E Axiom animation notes, and per-cycle numbers for self-rotation. Where these would have helped I gave
judgment and said so.
