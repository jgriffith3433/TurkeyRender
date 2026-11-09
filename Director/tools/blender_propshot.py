"""A quick look at one or more prop FBX files, off Unity: workbench renders from three sides, palette colours from the atlas UVs ignored (flat
material colour by object), so this is for shape only. Staging, never a judgement of the final look.
   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P Director/tools/blender_propshot.py -- <out.png> <a.fbx> [b.fbx ...]
Writes one PNG strip: each prop from the front, three-quarter and side."""
import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out, files = args[0], args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x, sc.render.resolution_y = 360, 360
sc.render.film_transparent = False
tiles = []
import os, tempfile
tmp = tempfile.mkdtemp()
for fi, f in enumerate(files):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    bpy.ops.import_scene.fbx(filepath=f)
    obs = [o for o in bpy.data.objects if o.type == "MESH"]
    # palette textures: point every material at the punch palette or the atlas by name, so colours show
    for o in obs:
        for m in o.data.materials:
            if m is None: continue
            m.use_nodes = True
            nt = m.node_tree; bsdf = nt.nodes.get("Principled BSDF")
            img = None
            base = "C:/Projects/TKShock/Assets/MusicVideo/Props/Punch/"
            name = os.path.splitext(os.path.basename(f))[0]
            cand = [base + "tex/" + t + "_atlas.png" for t in sys.argv[-1:]] if False else []
            for c in cand + [base + "punch_palette.png"]:
                if os.path.exists(c): img = bpy.data.images.load(c); break
            if img and bsdf:
                tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; tn.interpolation = "Closest"
                nt.links.new(tn.outputs["Color"], bsdf.inputs["Base Color"])
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in obs:
        for v in o.bound_box:
            w = o.matrix_world @ Vector(v); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    c = (lo + hi) / 2; r = (hi - lo).length / 2
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50
    for ai, (az, el) in enumerate(((0, 10), (40, 25), (90, 10))):
        # Blender: -y is Unity's +z front; a piece faces Unity -z, which is Blender +y
        d = Vector((math.sin(math.radians(az)) * math.cos(math.radians(el)), math.cos(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el))))
        cam.location = c + d * r * 3.2
        cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
        p = os.path.join(tmp, "%d_%d.png" % (fi, ai)); sc.render.filepath = p; bpy.ops.render.render(write_still=True); tiles.append((fi, ai, p))
    bpy.data.objects.remove(cam)
W = 360; img = bpy.data.images.new("strip", W * 3, W * len(files)); px = [0.0] * (W * 3 * W * len(files) * 4)
for fi, ai, p in tiles:
    t = bpy.data.images.load(p); tp = list(t.pixels)
    row0 = (len(files) - 1 - fi) * W
    for y in range(W):
        s0 = y * W * 4; d0 = ((row0 + y) * W * 3 + ai * W) * 4
        px[d0:d0 + W * 4] = tp[s0:s0 + W * 4]
img.pixels = px; img.filepath_raw = out; img.file_format = "PNG"; img.save()
print("WROTE", out)
