"""Proof of her coat: her poses from the clips she plays, retargeted onto her rig, with the coat on, rendered, and every coat point
inside her body counted.   blender -b -P blender_coat_proof.py -- <proof dir> [clip@t,...]
Default poses: mx_writing_seated, IdleBreathe (stand), mx_hook_punch at the punch's reach, mx_throw at the release, mx_sit_still.
A clip pose is read from its Mixamo FBX and laid on her by world rotation from the T-pose (both rigs rest in a T), so it is close
to, not exactly, what Unity's muscle retarget plays; the Unity lab renders are the final word."""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[0]; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = os.path.join(ROOT, "Director", "gen", "person_work")
MOTION = os.path.join(ROOT, "Assets", "MusicVideo", "Motion")
POSES = a[1].split(",") if len(a) > 1 else ["mx_writing_seated@0.35", "mx_breathing_idle@0.3", "mx_hook_punch@reach", "mx_throw@reach", "mx_sit_still@0.5", "mx_hook_punch@wind"]
MAP = {"Hips": "Hips", "Spine": "Spine", "Chest": "Spine2", "Neck": "Neck", "Head": "Head"}
for s in ("Left", "Right"):
    MAP.update({s + "Shoulder": s + "Shoulder", s + "UpperArm": s + "Arm", s + "LowerArm": s + "ForeArm", s + "Hand": s + "Hand",
                s + "UpperLeg": s + "UpLeg", s + "LowerLeg": s + "Leg", s + "Foot": s + "Foot", s + "Toes": s + "ToeBase"})
    for f in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for i in (1, 2, 3): MAP[f"{s}Hand{f}{i}"] = f"{s}Hand{f}{i}"

bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "coat.blend"))
arm = bpy.data.objects["Armature"]; body = bpy.data.objects["Person"]; coat = bpy.data.objects["Coat"]
for o in list(bpy.data.objects):
    if o not in (arm, body, coat): bpy.data.objects.remove(o)
s = bpy.context.scene


def clip_file(name):
    for f in (f"Humanoid@{name}.fbx", f"{name}.fbx"):
        p = os.path.join(MOTION, f)
        if os.path.exists(p): return p
    for f in os.listdir(MOTION):
        if f.endswith(".fbx") and name.lower() in f.lower(): return os.path.join(MOTION, f)
    raise FileNotFoundError(name)


def load_clip(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=clip_file(name), automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    for o in new:
        if o is not src: bpy.data.objects.remove(o)
    pre = "mixamorig:" if any(b.name.startswith("mixamorig:") for b in src.data.bones) else ""
    return src, pre


def world_rest(o, b): return (o.matrix_world @ b.matrix_local).to_quaternion()


def pose_from(src, pre, frame):
    s.frame_set(frame); bpy.context.view_layer.update()
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    sh = src.pose.bones[pre + "Hips"]
    src_h = (src.matrix_world @ src.data.bones[pre + "Hips"].head_local)
    src_p = (src.matrix_world @ sh.head)
    ratio = arm.data.bones["Hips"].head_local.z / max(src_h.z, 1e-6)
    order = [b.name for b in arm.data.bones]
    for tn in order:
        sn = MAP.get(tn)
        if not sn or pre + sn not in src.pose.bones: continue
        sb = src.data.bones[pre + sn]; sp = src.pose.bones[pre + sn]
        D = (src.matrix_world @ sp.matrix).to_quaternion() @ world_rest(src, sb).inverted()
        tb = arm.data.bones[tn]; tp = arm.pose.bones[tn]
        R = D @ world_rest(arm, tb)
        head = tp.head.copy() if tn != "Hips" else Vector((src_p.x * ratio, src_p.y * ratio, src_p.z * ratio))
        tp.matrix = Matrix.LocRotScale(head, (arm.matrix_world.inverted().to_quaternion() @ R), Vector((1, 1, 1)))
        bpy.context.view_layer.update()


def hand_reach(src, pre, frame):
    s.frame_set(frame)
    hip = src.matrix_world @ src.pose.bones[pre + "Spine2"].head
    return max(((src.matrix_world @ src.pose.bones[pre + h + "Hand"].head) - hip).length for h in ("Left", "Right"))


def pick_frame(src, pre, spec):
    act = src.animation_data.action; f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    if spec in ("reach", "wind"):
        r = [(hand_reach(src, pre, f), f) for f in range(f0, f1 + 1)]
        if spec == "reach": return max(r)[1]
        fmax = max(r)[1]; return min(r[: max(1, fmax - f0)])[1]
    return int(round(f0 + float(spec) * (f1 - f0)))


def mesh_world(o):
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); m = e.to_mesh()
    v = np.array([tuple(o.matrix_world @ x.co) for x in m.vertices]); f = [tuple(p.vertices) for p in m.polygons]
    mi = np.array([p.material_index for p in m.polygons])
    e.to_mesh_clear(); return v, f, mi


def poke(min_depth=.003):
    """Coat points inside her body: nearest point on the body, behind its surface by more than min_depth."""
    BV, BF, _ = mesh_world(body)
    part = np.zeros(len(body.data.vertices), int); body.data.attributes["part"].data.foreach_get("value", part)
    keep = [f for f in BF if all(part[i] in (1, 3, 4) for i in f[:1])]
    tr = BVHTree.FromPolygons([Vector(q) for q in BV.tolist()], keep)
    CV, CF, _ = mesh_world(coat)
    bad = []
    for i, p in enumerate(CV):
        h = tr.find_nearest(Vector(p), .08)
        if h[0] is None: continue
        d = (Vector(p) - h[0]).dot(h[1])
        if d < -min_depth: bad.append((i, -d))
    return bad, CV


# ---- look
def wire(mat, base, normal=None):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled"); nt.links.new(b.outputs[0], o.inputs[0])
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(base, check_existing=True); nt.links.new(t.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = .6


props = os.path.join(ROOT, "Assets", "Videos", "hawkespunch", "Props")
P2 = os.path.join(ROOT, "Assets", "MusicVideo", "Person2")
wire(body.data.materials[0], os.path.join(props, "Person2_doctor.png") if os.path.exists(os.path.join(props, "Person2_doctor.png")) else os.path.join(P2, "Person_Base.png"))
wire(body.data.materials[1], os.path.join(P2, "Person_Head.png"))
s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = 520; s.render.resolution_y = 780
s.view_settings.view_transform = "Standard"; s.view_settings.look = "None"
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.36, .37, .4, 1)
for nm, loc, en, sz in (("key", (1.8, -2.4, 3.0), 220, 1.5), ("fill", (-2.5, -1.5, 1.6), 60, 3), ("rim", (0, 3, 2.5), 100, 2)):
    li = bpy.data.objects.new(nm, bpy.data.lights.new(nm, "AREA")); s.collection.objects.link(li); li.data.energy = en; li.data.size = sz
    li.location = loc; li.rotation_euler = (Vector((0, 0, 1.0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
floor = bpy.data.meshes.new("floor"); floor.from_pydata([(-5, -5, 0), (5, -5, 0), (5, 5, 0), (-5, 5, 0)], [], [(0, 1, 2, 3)])
fo = bpy.data.objects.new("floor", floor); s.collection.objects.link(fo)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); s.collection.objects.link(cam); s.camera = cam; cam.data.lens = 50


def shoot(tag, views):
    deps = bpy.context.evaluated_depsgraph_get()
    BV, _, _ = mesh_world(coat)
    lo, hi = BV.min(0), BV.max(0); c = Vector(tuple((lo + hi) / 2)); size = float(max(hi - lo))
    outs = []
    for vn, ang, el in views:
        d = Vector((math.sin(math.radians(ang)), -math.cos(math.radians(ang)), math.tan(math.radians(el)))).normalized()
        dist = size * 1.9 + .6
        cam.location = c + d * dist; cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        f = os.path.join(OUT, f"{tag}_{vn}.png"); s.render.filepath = f; bpy.ops.render.render(write_still=True); outs.append(f)
    return outs


report = []
bad0, _ = poke(); report.append(("tpose", 0, len(bad0), max([d for _, d in bad0], default=0)))
shoot("tpose", [("front", 20, 5), ("back", 200, 5)])
for spec in POSES:
    name, _, when = spec.partition("@")
    src, pre = load_clip(name)
    fr = pick_frame(src, pre, when or "0.5")
    pose_from(src, pre, fr)
    src.hide_render = True; src.hide_set(True)
    bad, CV = poke()
    worst = max([d for _, d in bad], default=0)
    report.append((spec, fr, len(bad), worst))
    tag = spec.replace("@", "_")
    shoot(tag, [("three", 30, 8), ("side", 95, 6), ("front", -25, 8)])
    if bad and os.environ.get("POKE_VIZ"):
        import bmesh
        bm_ = bmesh.new()
        for i, _ in bad[::max(1, len(bad) // 600)]:
            bmesh.ops.create_icosphere(bm_, subdivisions=1, radius=.008, matrix=Matrix.Translation(Vector(CV[i])))
        mm = bpy.data.meshes.new("pk"); bm_.to_mesh(mm); bm_.free(); po = bpy.data.objects.new("pk", mm); s.collection.objects.link(po)
        red = bpy.data.materials.new("red"); red.use_nodes = True; red.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 0, 0, 1)
        red.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 5; mm.materials.append(red)
        coat.hide_render = True
        shoot(tag + "_poke", [("three", 30, 8), ("side", 95, 6)])
        coat.hide_render = False; bpy.data.objects.remove(po)
    if bad:
        np.save(os.path.join(OUT, f"{tag}_poke.npy"), np.array([CV[i] for i, _ in bad]))
        np.save(os.path.join(OUT, f"{tag}_poke_rest.npy"), np.array([tuple(coat.data.vertices[i].co) + (d,) for i, d in bad]))
    bpy.data.objects.remove(src)
for r in report: print("POKE", r[0], "frame", r[1], "points inside", r[2], "deepest", round(r[3] * 100, 2), "cm")
open(os.path.join(OUT, "poke.txt"), "w").write("\n".join(f"{r[0]}\tframe {r[1]}\tinside {r[2]}\tdeepest {r[3]*100:.2f} cm" for r in report))
