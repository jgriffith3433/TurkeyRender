"""Hard-light checks of a built person: blender -b -P person_keys_check.py -- <blend path> <out dir> <head maps prefix> <body maps dir>
Face and shape keys, profile, back of head, and a sit, with the real maps on."""
import bpy, os, sys, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index("--") + 1:]
BLEND, OUT, PRE, RIG = a[:4]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=BLEND)
ob = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]; me = ob.data
def wire(mat, base, normal, cull=True):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled"); nt.links.new(b.outputs[0], o.inputs[0])
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(base); nt.links.new(t.outputs[0], b.inputs["Base Color"])
    t2 = nt.nodes.new("ShaderNodeTexImage"); t2.image = bpy.data.images.load(normal); t2.image.colorspace_settings.name = "Non-Color"
    n = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(t2.outputs[0], n.inputs["Color"]); nt.links.new(n.outputs[0], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = .6; mat.use_backface_culling = cull
wire(me.materials[0], os.path.join(RIG, "Body_BaseMap.png"), os.path.join(RIG, "Body_BumpMap.png"))
wire(me.materials[1], os.path.join(RIG, PRE + "_BaseMap.png"), os.path.join(RIG, PRE + "_BumpMap.png"))
s = bpy.context.scene; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = s.render.resolution_y = 560
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.03, .03, .036, 1)
s.view_settings.view_transform = "Standard"
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam; cam.data.clip_start = .02
li = bpy.data.objects.new("l", bpy.data.lights.new("l", "SPOT")); s.collection.objects.link(li); li.data.spot_size = 1.4; li.data.shadow_soft_size = .03; li.data.color = (.8, .88, 1)
def shoot(name, p, t, lens=85, lp=None):
    p = Vector(p); t = Vector(t); lp = Vector(lp or (p.x * .6 + .35, p.y, p.z + .3))
    cam.location = p; cam.data.lens = lens; cam.rotation_euler = (t - p).to_track_quat("-Z", "Y").to_euler()
    li.location = lp; li.rotation_euler = (t - lp).to_track_quat("-Z", "Y").to_euler(); li.data.energy = 26 * (lp - t).length_squared
    s.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
def key(n=None):
    for k in me.shape_keys.key_blocks[1:]: k.value = 1. if k.name == n else 0.
    bpy.context.view_layer.update()
H = (0, 0, 1.64)
key()
shoot("front", (0, -.95, 1.63), (0, 0, 1.62))
shoot("q34", (.55, -.78, 1.64), (0, 0, 1.62))
shoot("profile", (.95, 0, 1.63), (0, 0, 1.6))
shoot("back", (0, .95, 1.6), (0, 0, 1.52))
shoot("backwide", (-.7, 1.5, 1.5), (0, 0, 1.3), 60)
shoot("high", (.2, .6, 2.2), (0, 0, 1.5), 60)
key(); shoot("key_none", (.14, -.72, 1.63), (0, 0, 1.635), 85, (.3, -1.5, 1.45))
for k in ("jawOpen", "blink", "eyesWide", "smile", "fear"):
    key(k); shoot("key_" + k, (.14, -.72, 1.63), (0, 0, 1.635), 85, (.3, -1.5, 1.45))
key()
# the sit she uses: spine back, head a little turned, arms down
for b in arm.pose.bones: b.rotation_mode = "XYZ"
def aim(name, d_):
    pb = arm.pose.bones[name]; cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    pb.matrix = Matrix.Translation(pb.matrix.translation) @ cur.rotation_difference(Vector(d_).normalized()).to_matrix().to_4x4() @ pb.matrix.to_3x3().to_4x4()
    bpy.context.view_layer.update()
def turn(name, ax, deg):
    pb = arm.pose.bones[name]; t = pb.matrix.translation.copy()
    pb.matrix = Matrix.Translation(t) @ Matrix.Rotation(math.radians(deg), 4, ax) @ pb.matrix.to_3x3().to_4x4(); bpy.context.view_layer.update()
turn("LeftUpperLeg", "X", -88); turn("RightUpperLeg", "X", -88); turn("LeftLowerLeg", "X", 88); turn("RightLowerLeg", "X", 88)
turn("Spine", "X", -8); turn("Chest", "X", -8); turn("Head", "Z", 35); turn("Neck", "Z", 15); turn("Head", "X", 12)
aim("LeftUpperArm", (.2, -.3, -1)); aim("RightUpperArm", (-.2, -.3, -1)); aim("LeftLowerArm", (.1, -1, -.3)); aim("RightLowerArm", (-.1, -1, -.3))
shoot("sit_front", (.5, -1.9, 1.15), (0, -.1, 1.05), 60)
shoot("sit_back", (-.6, 1.6, 1.3), (0, 0, 1.2), 60)
