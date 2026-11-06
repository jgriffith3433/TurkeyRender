"""Stress test for the person: blender -b -P person_poses.py -- <work dir with .blend> <blend name> <out dir> [poses] [tag]
Poses him in the worst bends (crawl, arch, head down, twist, reach), renders every part in a flat false colour from an orbit of
cameras, backfaces culled against magenta, so a void shows magenta. It also counts vertices of neck and jeans that come out through
the shirt."""
import bpy, os, sys, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]
WORK, BLEND, OUT = a[:3]
ONLY = a[3].split(",") if len(a) > 3 and a[3] != "all" else None
TAG = a[4] if len(a) > 4 else "p"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, BLEND))
ob = bpy.data.objects.get("Person"); arm = bpy.data.objects["Armature"]
me = ob.data
COL = {0: (.95, .72, .6), 1: (.95, .55, .35), 2: (.9, .5, .3), 3: (.25, .55, 1), 4: (.1, .12, .3), 5: (.05, 1, .15), 6: (1, 1, 1), 7: (1, 1, 0)}
part = np.zeros(len(me.vertices), int); me.attributes["part"].data.foreach_get("value", part)
ca = me.color_attributes.new("pc", "FLOAT_COLOR", "POINT")
ca.data.foreach_set("color", np.array([COL.get(int(p), (1, 1, 0)) + (1,) for p in part], np.float32).flatten())
me.color_attributes.active_color = ca
s = bpy.context.scene; s.render.engine = "BLENDER_WORKBENCH"; s.render.resolution_x = s.render.resolution_y = 420
d = s.display.shading; d.light = "STUDIO"; d.color_type = "VERTEX"; d.show_backface_culling = True
s.world = bpy.data.worlds.new("w"); s.world.color = (1, 0, 1)
s.render.film_transparent = False
cam = bpy.data.objects.new("pc", bpy.data.cameras.new("pc")); s.collection.objects.link(cam); s.camera = cam; cam.data.lens = 45; cam.data.clip_start = .02


def clear():
    for b in arm.pose.bones:
        b.rotation_mode = "QUATERNION"; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    bpy.context.view_layer.update()


def turn(name, fwd=0, side=0, twist=0):
    pb = arm.pose.bones[name]
    R = (Matrix.Rotation(math.radians(fwd), 4, "X") @ Matrix.Rotation(math.radians(side), 4, "Y") @ Matrix.Rotation(math.radians(twist), 4, "Z")).to_3x3()
    t = pb.matrix.translation.copy()
    pb.matrix = Matrix.Translation(t) @ R.to_4x4() @ pb.matrix.to_3x3().to_4x4()
    bpy.context.view_layer.update()


def aim(name, d_):
    pb = arm.pose.bones[name]
    cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    rot = cur.rotation_difference(Vector(d_).normalized())
    pb.matrix = Matrix.Translation(pb.matrix.translation) @ rot.to_matrix().to_4x4() @ pb.matrix.to_3x3().to_4x4()
    bpy.context.view_layer.update()


def legs():
    turn("LeftUpperLeg", -75); turn("RightUpperLeg", -75); turn("LeftLowerLeg", 90); turn("RightLowerLeg", 90)


def p_rest(): pass


def p_bend():
    turn("Spine", 40); turn("Chest", 35); turn("Neck", 20); turn("Head", 20)
    aim("LeftUpperArm", (.2, -.7, -.7)); aim("RightUpperArm", (-.2, -.7, -.7)); aim("LeftLowerArm", (.1, -.6, -.8)); aim("RightLowerArm", (-.1, -.6, -.8))


def p_crawl():
    turn("Hips", 72); legs(); turn("Spine", -18); turn("Chest", -22); turn("Neck", -18); turn("Head", -20)
    aim("RightUpperArm", (-.25, -.95, .1)); aim("RightLowerArm", (-.1, -1, .3)); aim("LeftUpperArm", (.3, -.3, -.9)); aim("LeftLowerArm", (.1, -.2, -1))


def p_arch():
    turn("Hips", 80); legs(); turn("Spine", -35); turn("Chest", -35); turn("Neck", -20); turn("Head", -15)
    aim("RightUpperArm", (-.5, -.5, -.7)); aim("RightLowerArm", (-.2, -.4, -.9)); aim("LeftUpperArm", (.4, .4, -.8)); aim("LeftLowerArm", (.6, -.3, -.7))


def p_headdown():
    turn("Hips", 55); legs(); turn("Spine", 30); turn("Chest", 45); turn("Neck", 45); turn("Head", 40)
    aim("RightUpperArm", (-.3, -.1, -1)); aim("RightLowerArm", (-.1, -.2, -1)); aim("LeftUpperArm", (.3, -.1, -1)); aim("LeftLowerArm", (.1, -.2, -1))


def p_twist():
    turn("Spine", 18, 25, 28); turn("Chest", 15, 25, 30); turn("Head", 0, 0, 40)
    aim("RightUpperArm", (-.2, .7, -.7)); aim("LeftUpperArm", (.9, -.5, .1)); aim("LeftLowerArm", (.9, -.5, .3))


def p_reach():
    aim("RightUpperArm", (-.3, -.1, 1)); aim("RightLowerArm", (-.1, -.1, 1)); aim("LeftUpperArm", (.4, .7, -.3)); aim("LeftLowerArm", (.3, .9, -.4))


POSES = dict(rest=p_rest, bend=p_bend, crawl=p_crawl, arch=p_arch, headdown=p_headdown, twist=p_twist, reach=p_reach)


def posed():
    dg = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(dg); m = e.to_mesh()
    v = np.zeros(len(m.vertices) * 3); m.vertices.foreach_get("co", v); v = v.reshape(-1, 3)
    w = np.array(ob.matrix_world.to_3x3()); v = v @ w.T + np.array(ob.matrix_world.translation)
    pol = [tuple(p.vertices) for p in m.polygons]; e.to_mesh_clear()
    return v, pol


def poke():
    """Vertices of the neck and jeans outside the shirt: the way from the vertex to the spine crosses cloth."""
    v, pol = posed()
    sh = [p for p in pol if part[p[0]] == 3]
    tree = BVHTree.FromPolygons([Vector(q) for q in v.tolist()], sh)
    chain = np.array([np.array(arm.pose.bones[n].head) for n in ("Hips", "Spine", "Chest", "Neck")])
    res = {}
    rest = np.array([x.co[:] for x in me.vertices])
    for nm, ids in (("neck", np.where((part == 0) & (rest[:, 2] < 1.47) & (np.abs(rest[:, 0]) < .13))[0]), ("jeans", np.where((part == 4) & (rest[:, 2] > .89))[0])):
        n = 0; bad = []
        for i in ids:
            p = v[i]; best = None
            for a_, b_ in zip(chain[:-1], chain[1:]):
                t = np.clip(np.dot(p - a_, b_ - a_) / np.dot(b_ - a_, b_ - a_), 0, 1); c = a_ + (b_ - a_) * t
                if best is None or np.linalg.norm(p - c) < np.linalg.norm(p - best): best = c
            d_ = best - p; L = np.linalg.norm(d_)
            if L < 1e-5: continue
            h = tree.ray_cast(Vector(p.tolist()), Vector((d_ / L).tolist()), float(L))
            if h[0] is not None: n += 1; bad.append(rest[i])
        res[nm] = n
        if bad: res[nm + "_at"] = np.array(bad).mean(0).round(3).tolist()
    return res


def orbit(name, tgt, r, n=8, h=.15, y0=0):
    for i in range(n):
        an = y0 + 2 * math.pi * i / n
        p = Vector(tgt) + Vector((math.sin(an) * r, -math.cos(an) * r, h * r))
        cam.location = p; cam.rotation_euler = (Vector(tgt) - p).to_track_quat("-Z", "Y").to_euler()
        s.render.filepath = os.path.join(OUT, f"{TAG}_{name}_{i}.png"); bpy.ops.render.render(write_still=True)


def hard_light():
    """Real maps under one hard light, like the TV: the same poses, close on the waist, armholes and collar."""
    s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = s.render.resolution_y = 520
    s.world.color = (.03, .03, .035); s.view_settings.view_transform = "Standard"
    for p in ob.data.materials:
        p.use_backface_culling = True
    li = bpy.data.objects.new("hl", bpy.data.lights.new("hl", "SPOT")); s.collection.objects.link(li)
    li.data.spot_size = 1.5; li.data.shadow_soft_size = .03; li.data.color = (.78, .86, 1)
    def shoot(name, tgt, r, az, el):
        p = Vector(tgt) + Vector((math.sin(az) * math.cos(el) * r, -math.cos(az) * math.cos(el) * r, math.sin(el) * r))
        cam.location = p; cam.rotation_euler = (Vector(tgt) - p).to_track_quat("-Z", "Y").to_euler()
        lp = p + Vector((.3, 0, .35)); li.location = lp; li.rotation_euler = (Vector(tgt) - lp).to_track_quat("-Z", "Y").to_euler()
        li.data.energy = 30 * (lp - Vector(tgt)).length_squared
        s.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
    for pn in ("crawl", "arch", "headdown", "reach", "twist"):
        if ONLY and pn not in ONLY: continue
        clear(); POSES[pn]()
        sp = arm.pose.bones["Spine"].head; ch = arm.pose.bones["Chest"].tail; la = arm.pose.bones["RightUpperArm"].head; ne = arm.pose.bones["Neck"].head
        for i, az in enumerate((2.6, 3.14, 3.7)): shoot(f"{TAG}_{pn}_waist{i}", sp[:], .75, az, .35)
        for i, az in enumerate((-.9, 1.0, 3.14)): shoot(f"{TAG}_{pn}_collar{i}", ne[:], .6, az, .6)
        for i, az in enumerate((-1.2, -1.9, -2.6)): shoot(f"{TAG}_{pn}_arm{i}", la[:], .55, az, .1)


if os.environ.get("LIT"):
    hard_light()
    raise SystemExit
for name, fn in POSES.items():
    if ONLY and name not in ONLY: continue
    clear(); fn()
    print("POKE", name, poke())
    c = arm.matrix_world @ arm.pose.bones["Chest"].head
    orbit(name, c[:], 1.7)
    if name in ("headdown", "bend", "rest"):
        hd = arm.matrix_world @ arm.pose.bones["Head"].head
        orbit(name + "_head", hd[:], .75, 4, .1, math.pi / 4)
