"""Blender script: dump an FBX rig's bones (name, parent, world head and tail in Blender space, Z up) to JSON.
   blender -b --python Director/tools/motion/rig_dump.py -- <in.fbx> <out.json>
Used by motion_rig.py to make Director/library/motion/rig.json from Assets/MusicVideo/Person/Person.fbx."""
import bpy, sys, json
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=a[0], automatic_bone_orientation=False, ignore_leaf_bones=False)
out = {}
for o in bpy.data.objects:
    if o.type != 'ARMATURE':
        continue
    mw = o.matrix_world
    out[o.name] = [{"name": b.name, "parent": b.parent.name if b.parent else None,
                    "head": [round(v, 5) for v in (mw @ b.head_local)], "tail": [round(v, 5) for v in (mw @ b.tail_local)]}
                   for b in o.data.bones]
json.dump(out, open(a[1], "w"), indent=1)
