# Greener: what happened, and what to change

Written 2026-11-07 after v9, the final J asked for. Numbers come from the logs, the bake report and the review files in this folder. Where something is my judgement rather than a measurement, it says so.

## Greener against TK Shock

| | TK Shock | Greener |
|---|---|---|
| Wall-clock from brief to the last render | days | 9 hours (brief 16:16, v9 01:18) |
| Full renders | 11 | 9, plus one partial |
| Agent runs | about 40 | about 25 |
| Hand-written cues | about 4,000 | 133 cards, compiled to about 850 cues, no generated acts edited by hand |
| J's notes | about 100, many repeats | about 20 timed notes, plus 6 "it looks bad / animation needs work" |
| Time J waited for a first look | days | 21 min to a rough cut, 65 min to a full one |
| Money on generation | GPU fleet, hours | $0 GPU. Vision QA about $5 total |
| Quality of picture | game-like throughout | glossy and rich by v5; faces still game-like up close |
| Quality of animation | bad to the end | clunky to v4, measurably clean by v8, still not good enough for J |

So: faster and cheaper by a lot, picture much better, animation better but not yet good, and the number of iterations barely fell. Nine renders is almost eleven. The roadmap target of fewer than 20 notes was met only on paper: J had to say "the animation needs a lot of work" three times, and that is the note that matters.

## Why there were still nine renders

1. **Engine changes forced full re-renders.** Shot reuse works (one fix re-rendered 1 of 78 shots in 2.8 min), but every version from v3 to v8 changed the engine or his model, so every render redid all 78 shots at 15-19 minutes. Reuse only pays when the engine is frozen before polish.
2. **Faults were found by J, not by us.** Every snap, floating foot and wrong-hand cup that J reported was visible at full speed and invisible in my contact sheets. I called v1, v3 and v5 good from sampled frames. That is the same mistake as TK Shock, repeated, and the direct cause of v4 through v7.
3. **Fixes were layered at runtime and fought each other.** Ground IK, overlap, quick layer blends, gaze stacking and hand-target reaches each added snaps on top of the clips: 1,954 snaps across the takes before the bake. Each fix made the last one worse, which is why "fix the arms" rounds never converged on TK Shock either.
4. **Unity was the only lane.** One Unity, up to six agents queued behind it, and two out-of-memory crashes (a mesh leak in the motion lab, about 40 GB of commit) that cost about an hour and a half.
5. **Animation came last in the order.** Sets, look and cameras were built before anyone had a good dance take. When the take changed, cameras had to be refitted twice.

## What worked, and should be the default

- **Cards, sequences and takes.** 76 shots stayed editable to the end; swapping the song reflowed everything; a camera fix was one line.
- **One performance take per section, several cameras on it.** The slice method, started at v4, is what made the chorus work. Chorus 2 reused chorus 1's take.
- **Choreography from clip segments.** Best 1-4 bars of each clip, chained in 8-count phrases with a repeating signature hook, with `warpTo` on the grid. The second pass (jazz square, slides, level change, backbeat hip pops) was a clear step up.
- **Bake and clean.** `tools/bake.mjs` takes the whole runtime stack to one clean clip: snaps 1,954 to 2, acceleration spikes 936 to 0, elbow flips 104 to 0, knee flips 705 to 0, wrist out of range 3,373 to 0, foot sliding 56 m to 8.5 m, with hand peak speeds kept. Mechanics on top (arm drag, head lead, plant drop, breath) without bringing snaps back. This is the single biggest animation gain of the project.
- **Joint-rotation blending for reaches** instead of sliding the hand's position. Arms arc instead of flipping.
- **The agents that don't build.** The blunt reviewer (16 shots judged in motion, a frame-difference scan of all 4,643 frames) and the story editor (10 changes that fixed the arc) found more than the builders did, at a fraction of the cost.
- **A time box.** "30 minutes, then render" ended polish that was not converging.
- **The look pass as files.** `pastel-fantasy`, the lighting rigs, `shell` shadows, `faceFill` and `catch` carry to every future video.

## What didn't work

- **Source motion.** The 2,700-clip local collection has no dance at all. Mixamo gave 35 clips, 15 admitted, and the best of them set the ceiling. Nobody checked this before the video started.
- **Hand-target gestures (`reach`).** The 0:36 and 2:19 snaps, the fist over his eye, the throw that "snapped back": all reaches. A hand that starts moving just after a cut reads as broken.
- **Props by parenting to the hand.** The blade sat wrong in three versions; the cup moved hands; two copies of the blade swapped in view. World-fixed props with a hand reach, pinched from the fingertip bone, worked.
- **Runtime foot and overlap fixes.** `MVGround` per-frame IK was the main source of knee snaps; `overlap` the main source of wrist snaps. Good ideas, wrong place: they belong in the bake, not at playback.
- **Judging by sheets.** Every version I praised, J rejected. Sampling at 2-15 fps cannot see a two-frame snap, and a frame of a bad performance looks fine.
- **Four agents on 80 shots.** v1-v3 spread effort thin and got a little better everywhere. Polish only started paying after it was concentrated on one 21-second slice.
- **Shoes, hands, face.** Plain black feet read as stubs; thick low-detail hands; plastic skin in close-up. Model problems, not animation problems, and they make good motion look worse.

## Animation: what to change for the next video

### 1. Build the motion library before the video, not during it

- A day of pre-production: fetch 60-100 Mixamo clips by category (groove, step, slide, turn, pose, walk, sit, gesture), admit them, and watch each at normal speed. Rank by style, not by measurements. Keep the gallery with a one-line note per clip and the best 1-4 bar segments.
- Rejections on measurements are advisory: `mx_hh_step`, `mx_house_2` and `mx_catwalk_seq03` all failed admission and carried the dance. The bake removes what admission measures.
- If the budget allows, a professional dance mocap pack is the cheapest way to raise the ceiling. Real dancers on good capture, bought once.
- Gesture clips too: point, shrug, hand to heart, hand to cheek, finger to lips, wave, curtsy. Every lyric gesture on Greener was built from a reach because no clip existed.

### 2. Choreograph first, then shoot

- Order: brief, song map, choreography takes (baked, judged at speed with the song), slice at full quality, cameras and cut, gags, look, final. Cameras are fitted to a finished take, never the other way round.
- One take per section, 8-count phrases, one signature hook, exact take lengths. The clones and butlers follow the take's beat list.
- Judge takes by playing the mp4 at normal speed before anything is built around them. Sheets are for staging, never for motion.

### 3. Bake everything, measure everything

- Every human take is baked through `bake.mjs` as part of `mv cards`; runtime stacking is for previs only.
- Gate before any render J sees: bake report snaps 5 or fewer per video, 0 flips, 0 acceleration spikes, ankle-over below a set number, foot travel under 1 m per take. The report exists; make it a hard stop.
- Keep extending the mechanics pass: it already does drag, counter-rotation, head lead, plant drop and breath. Next are secondary motion on hair and cloth, and finger follow-through.
- Still open from the report: ankle range (832 frames, worst on the stairs), one spin flagged, one 6 mm purity drift. Fix them in the bake, not with new runtime code.

### 4. Gestures and props

- Gestures come from clips on layers. `reach` is for contact only, blends by joint rotation, and a hand on a cut starts already in place (`for: 0`).
- Grips: a library per prop, tested in a close-up render before the cut uses it. Small things pinch from `rightIndexDistal`; a cup or remote sits world-fixed with a reach. One copy of a prop in view at a time.
- `ease: hand` (the natural reach curve) is now the default for hands.

### 5. Review in motion, by rule

- The 30 fps reviewer runs on every final, automatically: frame-difference spikes over the whole video, consecutive frames at readable size on every spike and every cut, A/B/C faults with times. No version goes to J with an A fault.
- Nobody, including me, calls a render good from a contact sheet. The rule is in PIPELINE.md and in memory.
- J watches at full speed with sound. That remains the only judge of feel and lip sync.

### 6. Freeze the engine, then polish

- Engine and model changes happen in the first half. From the slice onward the engine is frozen so `final` reuses shots and a fix costs minutes, not 18. On Greener the arm blend fix, the bake, the ground pass and the look pass each forced a full re-render.

### 7. The character

- Shoes with shape and a lighter sole, hands with knuckle and crease detail, and face shading that survives a close-up. These are one-time model jobs that would have made every version look better. Do them before the next video, not during it.
- Consider a deliberately stylised look if realism keeps failing in close-up; the one test on Greener did not work with the current shader, but a proper ramp shader could.

## Process changes, outside animation

- **Two Unity agents at most,** `mv refresh` between batches, the lab mesh cap stays. A second Unity on a second machine would double throughput; untested here.
- **The story editor and the blunt reviewer run on every video,** early and cheap, before polish.
- **Slice first, always.** Twenty seconds at full quality before anything is built out.
- **Time-box polish.** Render on the clock, then fix what a viewer would notice.
- **Lip sync and sound** need a check I cannot do: either J listens, or we build a mouth-to-waveform comparison that actually works (the attempt on Greener failed).

## Costs

Hawkes Gen: about $5 of vision QA, no GPU. The real cost was agent time: about 25 agent runs, most of them over 300k tokens, and the nine renders at about 17 minutes each on this laptop. Halving the renders and the agent rounds is where the next saving is, and the gates above are how.

## What is still weak in v9

Verse 1 stays seated; the "look at you" point is an open hand; ankles on the stairs; hands and face in close-up; verse 2 on the table unverified at speed; the chorus 2 clones arrive with no setup; motion check not run on the whole cut; nothing in v9 was reviewed at 30 fps before J saw it.
