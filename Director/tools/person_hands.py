"""The hand check: five poses at close range from four angles, one hard light and a soft fill, the same for any build of him.
blender -b -P person_hands.py -- <blend> <out dir> <tag> [left|right] [flat]
Writes <tag>_<pose>_<angle>.png and <tag>_sheet.png. `flat` leaves his maps off (grey clay), for judging the shape alone."""
import bpy, sys, os, math
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index("--") + 1:]
BLEND, OUT, TAG = a[0], a[1], a[2]
n = "Right" if "right" in a else "Left"; s = -1 if n == "Right" else 1
FLAT = "flat" in a
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
ob = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]
GEN = os.path.dirname(os.path.dirname(os.path.abspath(BLEND)))
RIG = os.environ.get("HAND_MAPS") or os.path.join(os.path.dirname(os.path.dirname(BLEND)), "rigged")
for o in bpy.data.objects:
    if o.type == "MESH" and o is not ob: o.hide_render = True


def material():
    me = ob.data
    for mat, nm in zip(me.materials, ("Body", "Head")):
        mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
        o_ = nt.nodes.new("ShaderNodeOutputMaterial"); bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
        nt.links.new(bs.outputs[0], o_.inputs[0])
        if FLAT:
            bs.inputs["Base Color"].default_value = (.62, .46, .38, 1); bs.inputs["Roughness"].default_value = .6
            continue
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(RIG, nm + "_BaseMap.png"), check_existing=False)
        nt.links.new(t.outputs[0], bs.inputs["Base Color"])
        g = nt.nodes.new("ShaderNodeTexImage"); g.image = bpy.data.images.load(os.path.join(RIG, nm + "_MetallicGlossMap.png"), check_existing=False); g.image.colorspace_settings.name = "Non-Color"
        inv = nt.nodes.new("ShaderNodeInvert"); nt.links.new(g.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], bs.inputs["Roughness"])
        b = nt.nodes.new("ShaderNodeTexImage"); b.image = bpy.data.images.load(os.path.join(RIG, nm + "_BumpMap.png"), check_existing=False); b.image.colorspace_settings.name = "Non-Color"
        m_ = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(b.outputs[0], m_.inputs[1]); nt.links.new(m_.outputs[0], bs.inputs["Normal"])


material()
for kb in (ob.data.shape_keys.key_blocks[1:] if ob.data.shape_keys else []): kb.value = 0
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")
axis = Vector((0, s, 0))                                       # flexion: palm down, the fingers curl under


def flex(pb, deg, ax=None):
    pb.matrix = Matrix.Translation(pb.matrix.translation) @ Matrix.Rotation(math.radians(deg), 4, ax or axis) @ pb.matrix.to_3x3().to_4x4()
    bpy.context.view_layer.update()


def reset():
    for b in arm.pose.bones: b.rotation_mode = "QUATERNION"; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    bpy.context.view_layer.update()


def curl(f, a1, a2, a3, spread=0):
    for i, d in ((1, a1), (2, a2), (3, a3)):
        pb = arm.pose.bones[f"{n}Hand{f}{i}"]
        if i == 1 and spread: flex(pb, -spread * s, Vector((0, 0, 1)))
        flex(pb, d, axis)


def thumb(a1, a2, a3):
    for i, d in ((1, a1), (2, a2), (3, a3)):
        pb = arm.pose.bones[f"{n}HandThumb{i}"]
        T = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
        flex(pb, d, T.cross(Vector((0, .72, -.69))).normalized())


def oppose(deg):
    pb = arm.pose.bones[f"{n}HandThumb1"]
    T = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    flex(pb, deg, T.cross(Vector((s * .75, .6, -.28))).normalized())


def relaxed():
    curl("Index", 14, 22, 12); curl("Middle", 20, 27, 14); curl("Ring", 26, 30, 15); curl("Pinky", 31, 32, 16); oppose(14); thumb(6, 12, 12)


def grip():
    curl("Index", 62, 88, 52); curl("Middle", 68, 92, 55); curl("Ring", 72, 94, 56); curl("Pinky", 76, 95, 56); oppose(42); thumb(14, 28, 40)


def spread():
    curl("Index", -2, 3, 2, 13); curl("Middle", -3, 3, 2, 3); curl("Ring", -2, 3, 2, -7); curl("Pinky", 0, 4, 2, -18); thumb(-12, 2, 2)


def point():
    curl("Index", 4, 6, 3); curl("Middle", 66, 92, 52); curl("Ring", 72, 94, 54); curl("Pinky", 76, 95, 55); oppose(42); thumb(14, 30, 38)


def touch():
    flex(arm.pose.bones[n + "Hand"], 26)
    curl("Index", 16, 28, 16); curl("Middle", 12, 24, 14); curl("Ring", 24, 38, 22); curl("Pinky", 34, 46, 26); oppose(20); thumb(8, 14, 16)


def pinch():
    curl("Index", 30, 44, 34); curl("Middle", 48, 62, 38); curl("Ring", 58, 72, 42); curl("Pinky", 64, 78, 46); oppose(44); thumb(12, 26, 34)


POSES = (("relaxed", relaxed), ("grip", grip), ("spread", spread), ("point", point), ("pinch", pinch), ("touch", touch))

s_ = bpy.context.scene
s_.render.engine = "BLENDER_EEVEE"; s_.render.resolution_x, s_.render.resolution_y = 560, 420
s_.eevee.taa_render_samples = 32
s_.render.film_transparent = False
w = bpy.data.worlds.new("w"); s_.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.045, .05, .06, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1
s_.view_settings.view_transform = "Standard"; s_.view_settings.look = "None"
cam = bpy.data.objects.new("hc", bpy.data.cameras.new("hc")); s_.collection.objects.link(cam); s_.camera = cam; cam.data.lens = 70; cam.data.clip_start = .02
key = bpy.data.objects.new("k", bpy.data.lights.new("k", "SPOT")); s_.collection.objects.link(key); key.data.spot_size = 1.2; key.data.shadow_soft_size = .03; key.data.color = (1, .97, .93)
fill = bpy.data.objects.new("f", bpy.data.lights.new("f", "SUN")); s_.collection.objects.link(fill); fill.data.energy = .55; fill.data.color = (.8, .88, 1)
floor = None
files = []
for pname, fn in POSES:
    reset(); fn(); bpy.context.view_layer.update()
    pts = [arm.matrix_world @ arm.pose.bones[f"{n}Hand{f}3"].tail for f in FINGERS] + [arm.matrix_world @ arm.pose.bones[f"{n}Hand{f}2"].tail for f in FINGERS]
    c = sum(pts, Vector()) / len(pts)
    h_ = arm.matrix_world @ arm.pose.bones[n + "Hand"].head
    t = c * .65 + h_ * .35; d = .46
    if floor: bpy.data.objects.remove(floor); floor = None
    if pname == "touch":
        low = min(p.z for p in pts[:5]) - .0085
        bpy.ops.mesh.primitive_plane_add(size=.8, location=(t.x, t.y, low)); floor = bpy.context.object
        mt = bpy.data.materials.new("fl"); mt.use_nodes = True; mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.16, .22, .10, 1); floor.data.materials.append(mt)
    for ai, (dx, dy, dz) in enumerate(((.25, -.75, .6), (-.2 * s, .85, .5), (.8 * s, -.3, -.28), (.1, -.6, -.8))):
        if pname == "touch" and dz < 0: dz = .08
        p = t + Vector((dx, dy, dz)).normalized() * d
        cam.location = p; cam.rotation_euler = (t - p).to_track_quat("-Z", "Y").to_euler()
        lp = t + Vector((dx + .55 * s, dy - .3, dz + .45)).normalized() * .9
        key.location = lp; key.rotation_euler = (t - lp).to_track_quat("-Z", "Y").to_euler(); key.data.energy = 26
        fill.rotation_euler = (Vector((-dx, -dy, -dz)).to_track_quat("-Z", "Y")).to_euler()
        f = os.path.join(OUT, f"{TAG}_{pname}_{ai}.png"); s_.render.filepath = f
        bpy.ops.render.render(write_still=True); files.append(f)
# The hero: the shot the next video needs, a hand coming down on the ground, low and close, in soft daylight.
s_.render.resolution_x, s_.render.resolution_y = 1280, 720
s_.eevee.taa_render_samples = 64
cam.data.lens = 85; d = .46
w.node_tree.nodes["Background"].inputs[0].default_value = (.32, .36, .42, 1)
for tg, off in (("a", (.32, -.9, .02)), ("b", (-.75 * s, -.62, .3))):
    p = t + Vector(off).normalized() * d
    cam.location = p; cam.rotation_euler = (t - p).to_track_quat("-Z", "Y").to_euler()
    lp = t + Vector((.5 * s, -.5, .9)).normalized() * .9
    key.location = lp; key.rotation_euler = (t - lp).to_track_quat("-Z", "Y").to_euler(); key.data.energy = 34; fill.data.energy = 1
    s_.render.filepath = os.path.join(OUT, f"{TAG}_hero_{tg}.png"); bpy.ops.render.render(write_still=True)
print("HANDS DONE", len(files))
