# Design: the dress rehearsal

**Status (2026-11-06): J approved only what raises quality or makes iterating faster. Parts 1 and 2 are underway, and hand and life controls are being added in the performance work. Everything else is parked until J's notes on the next video show it's needed.**

Proposal, not built. Written 2026-11-06 from the Touch Grass log (`videos/touchgrass/PIPELINE-LOG.md`) and J's timed notes on TK Shock. J keeps chat and the Review Room as the interface. Everything here sits behind them.

## What the evidence says

- Of 22 timed notes from J on TK Shock, before the performance library existed, so this overstates what's left (my classification), 14 were body, arms or hands, 4 were objects or staging, 1 was camera and 3 were creative. So 19 of 22 reported something wrong, not a creative choice.
- The Touch Grass log says the worst bugs were silent: three passed lint and `cards check`.
- The contact sheet (30 s) found almost every staging fault before any render.
- Faults cluster at the seams between shots (log 6, 7, 15, 16) and between body and camera (10, 18, 19, 33).

## The idea

Today a card goes straight to pixels. Add a stage between them: a dress rehearsal, a data-only run of the whole video, with every bone, prop, camera and face value for every frame. Checks read it. Pixels come last.

## Parts

1. **Strict compiler.** Every key in a card, set or style must be used or the build fails. A failed build can't produce frames. (log 14, 17, 25, 26)
2. **One render path.** Draft and final differ only in size and samples. (24, 36)
3. **Channels.** Body, hands, face, gaze and breath are separate tracks, with hands set absolutely and life always running under everything. (8, 30, 31)
4. **Continuity.** Performances declare entry and exit state: pose, position, held props. A dry run proves each cut connects, or names the missing transition. (6, 7, 15, 16)
5. **Baked shots, keyed by a hash of their inputs.** The rehearsal file comes from the bake.
6. **Automatic cleanup.** Feet, balance, hand contact, self-collision, run on every bake.
7. **Camera second.** Framing is solved from the baked bones, so kneeling and lying need no extra marks. (10, 18, 19)
8. **The read.** Each card names what the viewer must see, such as `smile on face`. The check proves it's on screen, unblocked and large enough while it happens. (33)
9. **Stable reviews.** A vision verdict holds until the shot's hash changes, then the reviewer judges before against after. Stillness marked as intended is not a fault. (29, 30)
10. **Review against J's history.** Each card and rehearsal is read against J's past notes before J sees it.

## Order

1, 2, then 3, then 4 and 5 together, then 6, 7, 8, 9, 10. Relationship-based cards come after 7, once they can lean on it.

## Risks

Baking may make late timing changes slower, so cue-level timing must stay cheap. Channels touch `MVActing.cs` and `MVPerform.cs`, the core of every shot, so TK Shock needs a regression pass.
