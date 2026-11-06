import bpy, sys, os
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=a[0])
s = bpy.context.scene; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = 1024; s.render.resolution_y = 1024
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1
ob = [o for o in bpy.data.objects if o.type == "MESH"][0]
print("MATS", [m.name for m in ob.data.materials])
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 0.32
cam.location = (0, -3, 1.66); cam.rotation_euler = (1.5708, 0, 0)
s.render.filepath = a[1]; bpy.ops.render.render(write_still=True)
