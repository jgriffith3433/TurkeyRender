# TK Shock art bible: what every model, shot and effect must share

All of it must look like one film, not four separate jobs. If your work conflicts with this file, this file wins. If this file is wrong, tell the lead.

## The look

- Real-time 3D only. No AI video on screen. AI images only as textures.
- The first half is a dark room lit only by the TV, plus a tiny red camera light. Deep blacks, film grain, ACES tonemapping, soft bloom.
- The TV is the light source: one hard, colour-changing source from in front of the sofa. Everything must read as a shape under that single light.
- Materials are matte and physical. Skin, cotton, denim, feathers and dusty plastic stay rough. Only glass, the lens and wet eyes are glossy. No plastic shine.
- Detail lives in surfaces that catch one hard light: real creases, feather layers, screws and seams. No detail painted as fake shadow; baked-in shading fights the TV light.
- Later acts push hard into stylized looks (posterize, ink, duotone, halftone), so silhouettes must stay clean and readable. A model that only works in realistic light fails.

## Unity contract

- Units are metres. FBX with Y up, facing -Z. Feet or base at y=0. Exception: turkeys face +Z, matching the old prefabs, so existing `face` and `rot` values keep working.
- Materials use `MV/Lit`, a copy of URP Lit: `_BaseMap`, `_BaseColor`, `_BumpMap`, `_Metallic`, `_Smoothness`, `_MetallicGlossMap`, `_OcclusionMap`, `_EmissionMap`, `_EmissionColor`, `_AlphaClip`, `_Cutoff`. World warp only works on this shader, so bake to these maps and don't need a custom one.
- Up to 2048 px per texture. No transparency except alpha-cutout (feathers, hair cards).
- The person's Humanoid bone names stay as they are. The turkey keeps its armature and take names.
- TV screen: a separate mesh named `screen` with 0-1 UVs. The camera LED is a separate object.

## Scale and placement

- Person 1.8 m, head near (0, 1.22, -0.74) sitting on the sofa, facing +Z toward the TV.
- Turkeys appear at scale 1.5 to 3.2, so they must hold up large.
- Room is 6 m x 6 m, 3 m high. TV stands against the north wall near (0, 0, 2.5). The corner camera hangs from the ceiling near (2.35, 2.71, 2.35).
- TV copies form a wall of up to 170 and a giant one scaled about 4.4 times. Hundreds of turkeys can share the screen.

## Sharing this PC

This laptop has 15 GB of RAM and Unity holds a lot of it, so heavy jobs take turns.

- Before a heavy job (Cycles bake, render, remesh), create `Director/gen/heavy.lock` containing your role, and delete it when done. If it exists and is under 15 minutes old, wait; if it's older, treat it as stale and take it.
- Keep Blender to one instance per agent. Use 2048 px at most for bakes, and use the lowest settings that still let you judge the result.
- The timeline agent owns Unity and also takes the lock for full renders.

## The bar

`Director/STORYBOARD.md` is the story and `Director/POLISH.md` is the standard. Read both. Judge your work against finished high-end music videos, not against the previous version.
