# Unity animation done right, against what we did

Written 2026-11-07 after J asked whether we misunderstand Unity animation. Sources at the end. Some sources are older Unity versions or forum posts; the comparison holds, but check details against Unity 6000.3 when building.

## The core finding

Unity has a complete animation system for exactly our case: humanoid characters, mocap clips, scrubbable cinematics. We bypassed nearly all of it. Since TK Shock, our engine samples a clip and then rewrites bone transforms itself every frame: blending, layers, stance, foot planting, reaching, limits, overlap. Each of those reimplements something Unity already does, and each reimplementation is where a class of our faults comes from.

| Need | Unity's way | What we built | Faults ours caused |
|---|---|---|---|
| Blending two clips | Animator / Playables mixer on a Humanoid Avatar: Unity works in **muscle space** with an Avatar | `Quaternion.Slerp` of raw local bone rotations | limbs leaving hinge planes, twisted forearms, "broken" arms |
| Upper body from one clip, legs from another | Timeline **Animation Override track + Avatar Mask** | our own `layer` with masks, slerping bones | arms fighting the body, snaps at layer edges |
| Transitions | Timeline clip **blend areas, blend curves, Match Offsets to Previous Clip** | inertialization (MVInertia.cs) | one-frame jumps measured at cuts and transitions |
| Floor and floating | Clip import: **Root Transform Position Y, Based Upon Feet**; **Bake Into Pose** for in-place loops | `MVGround.cs` per-frame leg IK | most knee snaps on Greener (705 knee flips before the bake) |
| Foot sliding after retarget | **Foot IK** per clip / `ApplyFootIK` on the playable, pulling feet back to the source positions | per-frame foot pinning, then a bake to hide it | foot slide 56 m on Greener before the bake |
| A hand on a thing, a head looking at a thing | **Animation Rigging** package: TwoBoneIK, MultiAim, evaluated after Timeline | our own two-bone IK `reach` with hints and bias, position-blended | elbow flips, arms swinging through bodies, the 0:36 and 2:19 snaps |
| A prop in a hand | **Parent Constraint** to the hand (or a helper bone), zeroed offsets | `attach` with guessed offsets per bone | cup and blade in the wrong place for three versions; glasses floating on Person2 |
| Two people interacting | **Paired mocap**: two actors captured together at a set distance, A/B clips, aligned by a sync point at the root | two separately built performances, aligned by hand | her arm through his head, the can through his face, the lasso moving him 16 m |

## What to change

1. **Characters run on an Animator with the Humanoid Avatar, driven by Timeline Animation Tracks.** Our cards and cuts stay; the compiler writes Timeline clips (with blends, ease and Match Offsets) instead of our own tracks. Timeline is deterministic and scrubbable, so the pure-function-of-time rule still holds.
2. **Import every clip correctly once:** loop clips Loop Time and Bake Into Pose; Root Transform Position Y Based Upon Feet; Foot IK on where it helps. Most floor and slide fixes then aren't needed.
3. **Upper/lower mixes with Override tracks and Avatar Masks,** not our layers.
4. **Contact with Animation Rigging** (TwoBoneIK for a hand on a can, MultiAim for looks), and **props with Parent Constraints.**
5. **Interactions from paired clips** where they exist; otherwise sold by the camera and the cut.
6. **Remove our runtime stack** (stance, ground, overlap, our reach and plant, inertia) from character playback. Keep the bake only if measurements show it still adds something on top of Unity's output.
7. **Prove it with numbers first:** the engine-fidelity test (Director/review/engine-fidelity.md) compares the same clips through Unity and through ours, and renders two real shots both ways.

## Sources

- Unity Timeline humanoid workflow (Match Offsets, blends, foot slide): https://docs.unity3d.com/ru/2018.4/Manual/TimelineWorkflowHumanoidAnimation.html
- Timeline Override track with Avatar Mask: https://docs.unity3d.com/Packages/com.unity.timeline@1.8/manual/wf-anim-override.html
- Root Motion and Based Upon Feet: https://docs.unity3d.com/ru/560/Manual/RootMotion.html
- Unity animation overview (muscle space with an Avatar): https://docs.unity.cn/2022.3/Documentation/Manual/AnimationOverview.html
- Animation Rigging constraints and Timeline order: https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.1/api/UnityEngine.Animations.Rigging.html , https://docs.unity3d.com/Packages/com.unity.animation.rigging@0.3/changelog/CHANGELOG.html
- Parent Constraint for props: https://docs.unity.cn/6000.2/Documentation/Manual/class-ParentConstraint.html
- Foot IK and ApplyFootIK with Playables: https://kybernetik.com.au/animancer/docs/manual/ik
- Paired two-person mocap: https://discussions.reallusion.com/t/misalignment-in-dual-person-mocap-animations/14277 , https://forums.unrealengine.com/t/setting-up-paired-animations-for-example-grabbing-another-player/20644
- Mixamo import practice (Bake Into Pose, Loop Time): https://respawn.outlookindia.com/gaming/gaming-guides/animation-in-unity-from-mecanim-basics-to-blend-trees
