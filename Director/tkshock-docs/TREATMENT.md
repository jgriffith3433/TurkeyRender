# TK Shock: treatment (J's direction, the design document)

Add to this before building new content. J directs, Claude builds. J never has to do any work in Unity.

## The video

1. A human in the dark. A bright television is on: from how bright the TV is against how dark the room is, you see only a silhouette.
2. A camera in the corner, its red light on so you know it is really on.
3. After a few camera angles it shows their face, and the TV starts flashing because of how much it is changing.
4. The TV's brightness is a way to show it is part of the song.
5. A moment where the TV brightness explodes so big it engulfs the person in the room and "the camera".
6. The person starts getting sucked into the TV and has to run away.
7. It starts turning into turkeys coming at them. The whole world gets distorted by the TV sucking everything in, and more and more turkeys rain in, getting sucked in.
8. The style of everything changes a lot, so it is not just typical 3D animation.
9. A slow motion part when the music slows down between the breakdowns.
10. A good build up the 2nd time, the person gets sucked in, they become part of the TV.
11. It switches to the next person, also watching TV in the dark. End.

## Rules of the look

- Must not look like Unity at all.
- Lots of animation, world distortion, and fine control over lighting.
- Full camera control: blur, custom effects. Mostly cuts, not blends; blends only when creative.
- Good use of every post effect.
- Scrubbing back and forth must work in reverse: everything is timeline driven.
- Time scale is timeline driven and never touches the audio.

## Addition: the eyes and the R, G, B split

Before the pull begins the camera goes close into the person's eyes and they are jolted. It then shows what they see:
the TV splits into 3 different TVs, showing the R, G and B versions of each. That is the moment the TV starts sucking them in.

## Addition: overwhelmed, lifted

The person gets really overwhelmed by what they see and goes to throw up, but instead they are lifted into the air. The camera swings around them, showing how swept up they are in that moment.

## J's notes on v6 (the most important notes so far)

- Too many camera angle switches. Timing okay, but it did not tell a good story. It needs more content, not camera changes. It must be a full animation, 10 times better, that actually tells a story.
- The sucking into the TV must feel much more gradual.
- More moments: for instance the couch falls backwards right when the breakdown happens.
- The beginning was only watching the person watch TV from multiple angles. Do better.
- The model looks really bad.
- The whole bit where he gets sucked into the TV must be better.
- When he is in the TV, show him in multiple different TV shows.
- The eyeball close-up looks weird with the giant white rectangle.
- The slow motion with turkey feathers: he could fall into a pile of feathers, or get "feathered".
- Overall it is blocked together okay.

## Decisions (J left these to the director, 2026-11-05)

- Tone: dark comedy. Dread and real jokes together, with the jokes always at his expense and never breaking the threat.
- The next person is a woman, seen in the same silhouette framing as the opening.

## J's notes on v7 (2026-11-05)

"It has an interesting story. The animation needs to be much much better. Like significantly better. A lot of work needs to go into the animations and poses etc. Make sure to work on that fully. A LOT of work on that."

Story stays. Animation and posing are now the top priority of the whole project.

J, 2026-11-05: AI-generated body motion is allowed on the 3D characters (Hawkes Gen `motion.from-text`). Still no AI video on screen. AI is for textures and motion data only.

J, 2026-11-05: if he's a Mixamo character, use Mixamo animations too. "Be creative here. Don't hold back."
Motion sources now: the 2,700-clip collection, Mixamo, baked ragdoll, hand-keyed poses. Gen's `motion.from-text` can't run yet: it needs an SSH GPU server and those went with AWS.

J, 2026-11-05: his arms and hands look messed up when he lifts his arm and throws the remote. Rule that follows: arm gestures use mocap clips on layers first. `reach` is only for real contact.

J, 2026-11-05: the duplicate of himself behind the door at 1:24 doesn't read. Cut. The door now opens on a wall of turkeys.

J, 2026-11-05: 1:54-2:10 needs better animation, and the mouth looks wrong. Camera shakes too much: use a dead zone when looking at a subject. Fix notes right away as they come in.

J, 2026-11-05: add a cameraman filming himself in the beginning, a triple fourth wall break. Designed in STORYBOARD.md, "The cameraman".

J, 2026-11-05: yes to all fun ideas. See STORYBOARD.md, "Fun additions".

J, 2026-11-05: no Hawkes Biomedical name, logo or branding in this video.

J, 2026-11-06: 1:54-2:07 is the moment he sees the turkey and realizes it is the enemy. No flailing. See STORYBOARD.md, "The realization".
