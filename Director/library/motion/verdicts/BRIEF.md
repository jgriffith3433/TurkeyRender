# Grading brief for the clip catalog (2026-11-07)

You grade clips for TK Shock's clip catalog. Stagers (agents writing shot cards) will pick clips from it, and `mv lint` warns from it, so each verdict must be something you SAW, not guessed from a name.

## What you have per clip (all under C:\Projects\TKShock\Director\library\motion\)
- `previews/<clip>.mp4`: the clip on HIS rig played the native way (Unity Animator, the clean clip where used). 640x360, 30 fps. LEFT half: front three-quarter full body. RIGHT half: medium shot of upper body and hands. Loops repeat to 3 s; one-shots hold the last frame 0.5 s; clips longer than 8 s show their busiest 8 s (`previewFrom` in the json). The floor is a plain lawn; seated clips sit on air (there is no chair), floating clips stand on air: judge the body, not the missing prop.
- `previews/strips/<clip>.jpg`: every 2nd frame (15 fps) of the whole preview, six frames a row (0.4 s a row), time burned in top-left of each cell. This is how you "watch at normal speed": read it row by row as motion.
- `previews/strips/<clip>_hands.jpg`: 30 consecutive frames (one second, 30 fps) of the RIGHT (medium) camera around the clip's fastest hand moment. Step these for pops, flips, fingers.
- `previews/<clip>.json`: measures over the whole clip: `handLeft/handRight.curlMean/curlMin` (degrees; about 0-30 flat or fanned open hand, 60-100 relaxed, 140+ a fist), `fannedFrac` (share of frames the hand is straight AND spread), `handToFaceFrames` (palm within 10 cm of the face), `handInBodyFrames` (palm within 8 cm of the spine line: probably through the body), `headYawDeg` (head against chest), `leanFwdMaxDeg` (hips-to-neck forward lean), `kneeBackwardMaxDeg/Frames` (knee bent the wrong way), `rootDriftM`, `peakHand.t` / `peakFoot.t` (fastest moment, clip seconds: the hit or release of an action), `stance`, `footIK`, `clean`.
- `import.json` `clips.<clip>.clean` has jitter/snaps/slide of the source and clean clip. `clips.json` (same folder) has older hand-written notes for some clips (watched on the OLD path; use as a hint only).
- When a moment matters (a hit, a hand near the face, a suspected flip), make your own burst of consecutive frames: `ffmpeg -y -loglevel error -ss <sec> -i previews/<clip>.mp4 -vf "crop=iw/2:ih:iw/2:0,scale=320:360,tile=8x2" -frames:v 1 <scratch>.jpg` (right half; use `crop=iw/2:ih:0:0` for the full body), written to the scratchpad dir you are given, NOT into the library. Never judge from one still.

## What to look for
Fingers fanned stiff and spread when the action doesn't call for it (a big one: he looks like a mannequin); hands passing through face, head or body; forward fold / hunch that reads wrong; knee or elbow flipping or bending backward; one-frame pops or snaps; feet sliding or skating on the lawn; drift out of place on a clip meant to be in place; the head turning far away from where the body faces; a hit or release that reads weak or late; what the clip is GOOD for as acting.

## Output: write JSON to library/motion/verdicts/<group>.json (only your group's file), an object keyed by clip name:
```json
{
  "mx_hook_punch": {
    "grade": "A",
    "uses": ["punch"],
    "weak": ["talk"],
    "needs": [],
    "line": "good for: a short right hook from a guard, hit at 0.93 s; weak at: anything but a punch (fists the whole clip); needs: nothing",
    "hit": 0.93,
    "watched": "strip 0-4.3 s, hands burst 0.4-1.4 s, own burst 0.8-1.1 s"
  }
}
```
- `grade`: A build on it; B usable with care (say how in weak/needs); C avoid (bad but not broken); ban never (broken: T-pose, limbs through the body, a knee flip in view, a fault no grip or mask can hide).
- `uses`: tags from this list only: talk listen react laugh think shrug sigh gesture point wave thumbs-up clap bow write drink punch kick throw catch dodge hit-react fall taunt scared lift put-down pull look-back fly float sit kneel stand-idle walk sneak run turn stairs crawl injured dance pose jump transition. Tag what it is genuinely good for, including stretches (a clip with a strong 1 s point inside a dance can be tagged point, say the seconds in the line).
- `weak`: tags from the same list it would be wrong for, ONLY where a stager might plausibly reach for it (a seated talk clip that can't drink; a punch clip whose fists ruin a talk; a throw with no real release). Lint warns when a card about that use plays it.
- `needs`: `"relaxed grip"` when the fingers fan or splay stiffly in a way a `fingers set 0.35` would fix (lint then warns when a card sets no grip); also free text like `"chair at seat height 0.45 m"`, `"mask: upper"`, `"start at 1.2 s"`.
- `line`: ONE line "good for: ...; weak at: ...; needs: ..." with clip seconds for the moments that matter.
- `hit`: clip seconds of the contact/release for action clips (punch, kick, throw, catch, hit-react, clap), from what you saw (peakHand.t is a starting point).
- `watched`: what you looked at.

Write the file as you go (every ~8 clips) so nothing is lost. Do not touch Unity, `mv`, cards, import settings, clean clips or any other file. Return a short report: count graded, your bans with reasons, your top picks per use, and anything systematic you noticed (a whole family fanning fingers, etc.).
