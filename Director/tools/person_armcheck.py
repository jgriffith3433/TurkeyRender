"""Arm and shoulder deformation check for the person. Rest pose proves nothing, so this poses the left arm (and mirrors it on
the right, to catch one-sided mistakes) and renders silhouettes and shaded views from the back and front, in Workbench.
blender -b <rig.blend or final.blend> -P person_armcheck.py -- out_dir [tag]
Writes <out_dir>/<tag>_<pose>_<view>.png: back, front and two three-quarter views, plus _s silhouettes of back and front."""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[0]; TAG = a[1] if len(a) > 1 else "c"
os.makedirs(OUT, exist_ok=True)
ob = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]
s = bpy.context.scene

# Direction each bone points in the armature's space. +X is his left, -Y his front, +Z up. Rest is a T-pose.
def L(up=None, lo=None, cl=None):
    d = {}
    if up: d["LeftUpperArm"] = up
    if lo: d["LeftLowerArm"] = lo
    if cl is not None: d["LeftShoulder"] = cl
    return d

POSES = {
    "rest": L(),
    "down": L((.14, .02, -1), (.1, -.22, -1)),                    # relaxed at his side, where he spends the film
    "out": L((1, 0, .05), (1, 0, .05)),                           # straight out to the side
    "up45": L((.7, 0, .7), (.7, 0, .7)),                          # raised 45 degrees above level
    "overhead": L((.25, .05, 1), (-.75, -.05, .65), 18),          # overhead, elbow bent, collarbone up with it
    "overhead0": L((.25, .05, 1), (-.75, -.05, .65)),             # the same with the collarbone left at rest
    "forward": L((.08, -1, -.05), (.08, -1, -.05)),               # straight forward
    "across": L((-.55, -.8, -.12), (-.8, .25, .35), -8),          # reaching across the chest
}


def pose(d):
    for b in arm.pose.bones:
        b.rotation_mode = "XYZ"; b.rotation_euler = (0, 0, 0); b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for side, sx in (("Left", 1), ("Right", -1)):
        if "LeftShoulder" in d:
            pb = arm.pose.bones[side + "Shoulder"]
            pb.matrix = Matrix.Translation(pb.matrix.translation) @ Matrix.Rotation(math.radians(d["LeftShoulder"]), 4, Vector((0, sx, 0)) * -1) @ pb.matrix.to_3x3().to_4x4()
            bpy.context.view_layer.update()
        for k in ("LeftUpperArm", "LeftLowerArm"):
            if k not in d: continue
            pb = arm.pose.bones[k.replace("Left", side)]
            cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
            t = Vector(d[k]); t.x *= sx
            rot = cur.rotation_difference(t.normalized())
            pb.matrix = Matrix.Translation(pb.matrix.translation) @ rot.to_matrix().to_4x4() @ pb.matrix.to_3x3().to_4x4()
            bpy.context.view_layer.update()


def eval_co():
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    v = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get("co", v)
    ob.evaluated_get(dg).to_mesh_clear()
    return v.reshape(-1, 3)


# Paint parts as colours, so sleeve against skin reads in every view.
me = ob.data
part = np.zeros(len(me.vertices), int); me.attributes["part"].data.foreach_get("value", part)
pal = {0: (.72, .5, .4), 1: (.82, .6, .5), 2: (.82, .6, .5), 3: (.62, .62, .66), 4: (.18, .2, .26), 6: (1, 1, 1), 7: (.1, .08, .07)}
ca = me.color_attributes.new("vis", "FLOAT_COLOR", "POINT")
cols = np.array([pal.get(int(p), (.5, .5, .5)) + (1,) for p in part], np.float32)
ca.data.foreach_set("color", cols.flatten())
me.color_attributes.active_color = ca
if ob.data.shape_keys:
    for kb in ob.data.shape_keys.key_blocks[1:]: kb.value = 0

s.render.engine = "BLENDER_WORKBENCH"; s.render.resolution_x, s.render.resolution_y = 800, 800
s.render.film_transparent = False
cam = bpy.data.objects.new("armcam", bpy.data.cameras.new("armcam")); s.collection.objects.link(cam); s.camera = cam
cam.data.lens = 50; cam.data.clip_start = .02
d = s.display.shading


def shot(name, pos, tgt, sil):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    if sil:
        d.light = "FLAT"; d.color_type = "SINGLE"; d.single_color = (0, 0, 0); d.background_type = "VIEWPORT"; d.background_color = (1, 1, 1); d.show_cavity = False; d.show_object_outline = False
    else:
        d.light = "STUDIO"; d.color_type = "VERTEX"; d.background_type = "VIEWPORT"; d.background_color = (.16, .16, .18); d.show_cavity = True; d.cavity_type = "WORLD"; d.show_object_outline = False
    s.render.filepath = os.path.join(OUT, f"{TAG}_{name}.png"); bpy.ops.render.render(write_still=True)


VIEWS = {"back": ((.1, 2.0, 1.5), (.1, 0, 1.5)), "front": ((.1, -2.0, 1.5), (.1, 0, 1.5)), "q": ((-1, 1.3, 1.75), (.22, 0, 1.45)), "qf": ((1, -1.3, 1.75), (.22, 0, 1.45))}
sel = a[2].split(",") if len(a) > 2 else list(POSES)
rest = None
for nm in sel:
    pose(POSES[nm])
    for vn, (p, t) in VIEWS.items():
        if vn in ("back", "front"): shot(f"{nm}_{vn}_s", p, t, True)
        shot(f"{nm}_{vn}", p, t, False)
pose({})

print("ARMCHECK DONE", OUT)
