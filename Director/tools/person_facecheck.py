"""Face and neck check for the person: every mouth shape from the front, three-quarter and below, plus the neck and collar.
blender -b final.blend -P person_facecheck.py -- out_dir [tag] [shapes]
Uses the painted maps under a plain, even light, so tone mismatches and dark holes read as they are."""
import bpy, sys, os
from mathutils import Vector

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[0]; TAG = a[1] if len(a) > 1 else "f"
os.makedirs(OUT, exist_ok=True)
RIG = os.path.join(os.path.dirname(bpy.data.filepath), "..", "rigged")
ob = bpy.data.objects["Person"]; me = ob.data
s = bpy.context.scene

for mat, nm in zip(me.materials, ("Body", "Head")):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    o_ = nt.nodes.new("ShaderNodeOutputMaterial"); bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bs.outputs[0], o_.inputs[0]); bs.inputs["Roughness"].default_value = .6
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(RIG, nm + "_BaseMap.png"), check_existing=True)
    nt.links.new(t.outputs[0], bs.inputs["Base Color"])
    n_ = nt.nodes.new("ShaderNodeTexImage"); n_.image = bpy.data.images.load(os.path.join(RIG, nm + "_BumpMap.png"), check_existing=True); n_.image.colorspace_settings.name = "Non-Color"
    nm_ = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n_.outputs[0], nm_.inputs[1]); nt.links.new(nm_.outputs[0], bs.inputs["Normal"])
    if nm == "Head":
        mat.blend_method = "CLIP"; nt.links.new(t.outputs[1], bs.inputs["Alpha"])

s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = s.render.resolution_y = 560
s.view_settings.view_transform = "Standard"; s.view_settings.look = "None"
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.32, .32, .34, 1)
li = bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN")); s.collection.objects.link(li); li.data.energy = 1.8; li.data.angle = .5
cam = bpy.data.objects.new("cc", bpy.data.cameras.new("cc")); s.collection.objects.link(cam); s.camera = cam; cam.data.lens = 85; cam.data.clip_start = .02


def shot(name, pos, tgt, lpos):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    li.rotation_euler = (Vector(tgt) - Vector(lpos)).to_track_quat("-Z", "Y").to_euler()
    s.render.filepath = os.path.join(OUT, f"{TAG}_{name}.png"); bpy.ops.render.render(write_still=True)


def key(k):
    for kb in me.shape_keys.key_blocks[1:]: kb.value = 1. if kb.name == k else 0.
    bpy.context.view_layer.update()


shapes = a[2].split(",") if len(a) > 2 else ["neutral", "jawOpen", "fear", "smile"]
for k in shapes:
    key(k)
    shot(k + "_front", (.0, -.8, 1.60), (0, 0, 1.60), (.2, -1, 1.8))
    shot(k + "_34", (.42, -.66, 1.58), (0, 0, 1.59), (.2, -1, 1.8))
    shot(k + "_below", (.03, -.62, 1.28), (0, -.03, 1.58), (.1, -1, 1.0))
key("neutral")
shot("neck_front", (.0, -.75, 1.46), (0, 0, 1.47), (.2, -1, 1.7))
shot("neck_34", (.45, -.6, 1.42), (0, 0, 1.47), (.2, -1, 1.7))
shot("neck_side", (.75, -.05, 1.5), (0, 0, 1.49), (.6, -.6, 1.7))
shot("neck_back", (-.2, .75, 1.5), (0, 0, 1.49), (-.2, 1, 1.7))
print("FACECHECK DONE")
