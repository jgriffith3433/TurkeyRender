"""Reports on a GLB and renders front, side and close-up pictures. blender -b -P blender_look.py -- model.glb outdir"""
import bpy, sys, os, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
print("OBJECTS", [(o.name, len(o.data.vertices), len(o.data.polygons)) for o in meshes])
print("ARMATURES", [o.name for o in bpy.data.objects if o.type == "ARMATURE"])
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3))); hi = Vector((max(p[i] for p in pts) for i in range(3)))
print("BOUNDS", tuple(round(x, 3) for x in lo), tuple(round(x, 3) for x in hi))
print("IMAGES", [(i.name, i.size[0], i.size[1]) for i in bpy.data.images])
s = bpy.context.scene
s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = 640; s.render.resolution_y = 640
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.8, .8, .8, 1)
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam
c = (lo + hi) / 2; h = hi.z - lo.z
def shot(name, pos, target, lens):
    cam.location = pos; cam.data.lens = lens
    cam.rotation_euler = (Vector(target) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    s.render.filepath = os.path.join(a[1], name + ".png"); bpy.ops.render.render(write_still=True)
d = h * 2.2
shot("front", (c.x, c.y - d, c.z), c, 50)
shot("side", (c.x + d, c.y, c.z), c, 50)
shot("back", (c.x, c.y + d, c.z), c, 50)
head = Vector((c.x, c.y, hi.z - h * .09))
shot("head", (head.x, head.y - h * .5, head.z), head, 85)
