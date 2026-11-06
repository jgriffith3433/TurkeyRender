"""The white turkey's necktie: blender -b -P blender_tie.py -- <out dir>
A real short knotted tie: pivot at the knot, hanging along -Y in Unity, front toward +Z, 8 cm wide and 35 cm long at scale 1.
One mesh `tie`, material `Tie`, with Tie_BaseMap, Tie_BumpMap and Tie_MetallicGlossMap (MV/Lit). The twill is in the normal map only."""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

LEN = .35; KNOT_H = .036; WIDE = .085; TOP = .037   # metres
SECT = 14                                          # columns across


def width(s):
    """Half width at s metres below the knot's top."""
    if s < KNOT_H: return np.interp(s, (0, KNOT_H), (.024, .0165))
    tip = LEN - WIDE * .55                         # the tip's shoulders
    if s < tip: return np.interp(s, (KNOT_H, tip), (TOP / 2 + .001, WIDE / 2))
    return np.interp(s, (tip, LEN), (WIDE / 2, 0.0005))


def belly(s):
    """How far the blade stands forward: it leaves the knot, rests on the bird and curls away a little at the tip."""
    return .010 + .030 * math.sin(min(s / LEN, 1) * math.pi * .78) + .012 * max(0, s / LEN - .75) ** 2 / .0625


def surface(s, t):
    """t in -1..1 across. Front of a blade, a soft crown with a slight fold down the middle of the back."""
    h = width(s)
    x = h * t
    z = belly(s) + .0045 * (1 - t * t) * min(1, h / .02)
    return (x, z)


rows = np.concatenate([np.linspace(KNOT_H - .004, .10, 10), np.linspace(.10, LEN - WIDE * .55, 22)[1:], np.linspace(LEN - WIDE * .55, LEN, 9)[1:]])
bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
front = []; back = []
for s in rows:
    a = []; b = []
    for i in range(SECT + 1):
        t = -1 + 2 * i / SECT
        x, z = surface(s, t)
        a.append(bm.verts.new((x, -z, -s)))
        if i not in (0, SECT):
            b.append(bm.verts.new((x, -(belly(s) - .0022 - .0012 * (1 - t * t)), -s)))
        else:
            b.append(a[-1])
    front.append(a); back.append(b)
bm.verts.ensure_lookup_table()


def quad(q, uvs):
    f = bm.faces.new(q)
    for l, u_ in zip(f.loops, uvs): l[uv].uv = u_


def blade_uv(s, t): return (.25 + t * .24 * width(s) / (WIDE / 2), .02 + .96 * s / LEN * .68)


for r in range(len(rows) - 1):
    for i in range(SECT):
        t0 = -1 + 2 * i / SECT; t1 = -1 + 2 * (i + 1) / SECT
        s0, s1 = rows[r], rows[r + 1]
        quad((front[r][i], front[r][i + 1], front[r + 1][i + 1], front[r + 1][i]), (blade_uv(s0, t0), blade_uv(s0, t1), blade_uv(s1, t1), blade_uv(s1, t0)))
        q = (back[r][i + 1], back[r][i], back[r + 1][i], back[r + 1][i + 1])
        if len(set(q)) == 4: quad(q, ((.75, .1), (.8, .1), (.8, .15), (.75, .15)))
# The knot: a four-in-hand, wider at the top, wrapped on a slight diagonal. A faceted loft, so its creases catch one hard light.
K = 18
kr = []
for k, (s, hw, hd, tilt) in enumerate(((-.002, .0205, .0085, .002), (.002, .0255, .0125, .0015), (.012, .0265, .0145, .001), (.024, .0225, .0135, 0), (.036, .0178, .0105, -.001), (.042, .0150, .0080, -.0015))):
    ring = []
    for i in range(K):
        an = 2 * math.pi * i / K
        cx, cz = math.cos(an), math.sin(an)
        sq = 1 / (abs(cx) ** 3.2 + abs(cz) ** 3.2) ** (1 / 3.2)    # a soft rectangle
        ring.append(bm.verts.new((hw * cx * sq + tilt, -(.009 + belly(s) * .35 + hd * cz * sq), -(s + .004 * cx))))
    kr.append(ring)
for r in range(len(kr) - 1):
    for i in range(K):
        j = (i + 1) % K
        v0 = .74 + .24 * r / (len(kr) - 1); v1 = .74 + .24 * (r + 1) / (len(kr) - 1)
        u0 = .02 + .96 * i / K; u1 = .02 + .96 * (i + 1) / K
        quad((kr[r][i], kr[r][j], kr[r + 1][j], kr[r + 1][i]), ((u0, v0), (u1, v0), (u1, v1), (u0, v1)))
for ring, flip in ((kr[0], False), (kr[-1], True)):
    c = bm.verts.new(sum((v.co for v in ring), Vector()) / K)
    for i in range(K):
        j = (i + 1) % K
        quad((ring[i], ring[j], c) if not flip else (ring[j], ring[i], c), ((.5, .78), (.52, .78), (.51, .8)))
# The wrap: a crease running down the knot on the diagonal.
for r_i, ring in enumerate(kr):
    for i, v in enumerate(ring):
        if v.co.y < -.012:
            d = math.exp(-((v.co.x - .009 + .22 * v.co.z) / .005) ** 2)
            v.co.y += .0028 * d
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
me = bpy.data.meshes.new("tie"); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new("tie", me); bpy.context.scene.collection.objects.link(ob)
sub = ob.modifiers.new("s", "SUBSURF"); sub.levels = 1; sub.render_levels = 1
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.modifier_apply(modifier="s")

# Maps. Albedo stays flat deep red with a little yarn variation: no shading in it. The twill is a fine diagonal in the normal map.
R = 1024
rng = np.random.RandomState(9)
yy, xx = np.mgrid[0:R, 0:R].astype(np.float32)
tw = np.sin((xx + yy) * 2 * math.pi / 7)                      # 45 degree twill, about 7 px
yarn = rng.normal(0, 1, (R, R)).astype(np.float32)
for _ in range(2): yarn = (yarn + np.roll(yarn, 1, 0) + np.roll(yarn, 1, 1) + np.roll(yarn, -1, 0) + np.roll(yarn, -1, 1)) / 5
base = np.array([.215, .010, .017])                            # linear: a deep red, about #800A12 in sRGB
alb = base[None, None] * (1 + .10 * tw[..., None] * .35 + .16 * yarn[..., None] * 2.2)
srgb = np.where(alb < .0031, alb * 12.92, 1.055 * np.clip(alb, 1e-5, 1) ** (1 / 2.4) - .055)
H = tw * .5 + yarn * .5
dx = (np.roll(H, -1, 1) - np.roll(H, 1, 1)) * .32; dy = (np.roll(H, -1, 0) - np.roll(H, 1, 0)) * .32
n = np.dstack([-dx, -dy, np.ones_like(H)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
# Smoothness in A: silk catches a soft line, the bible's no-plastic-shine rule still holds. Metallic 0.
gloss = np.dstack([np.zeros((R, R))] * 3 + [np.clip(.46 + .05 * tw + .05 * yarn, 0, 1)])


def save(name, a, cs):
    im = bpy.data.images.new(name, R, R, alpha=a.shape[2] == 4); im.colorspace_settings.name = cs
    a4 = a if a.shape[2] == 4 else np.dstack([a, np.ones((R, R))])
    im.pixels.foreach_set(a4[::-1].astype(np.float32).flatten())
    im.filepath_raw = os.path.join(OUT, name + ".png"); im.file_format = "PNG"; im.save()
    return im


iA = save("Tie_BaseMap", np.clip(srgb, 0, 1), "sRGB")
iN = save("Tie_BumpMap", n * .5 + .5, "Non-Color")
iG = save("Tie_MetallicGlossMap", gloss, "Non-Color")
mat = bpy.data.materials.new("Tie"); mat.use_nodes = True; nt = mat.node_tree
bs = next(x for x in nt.nodes if x.type == "BSDF_PRINCIPLED")
ta = nt.nodes.new("ShaderNodeTexImage"); ta.image = iA; nt.links.new(ta.outputs[0], bs.inputs["Base Color"])
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = iN
nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(tn.outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], bs.inputs["Normal"])
bs.inputs["Roughness"].default_value = .54
me.materials.append(mat)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "tie.fbx"), use_selection=True, use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, axis_forward="-Z", axis_up="Y", path_mode="RELATIVE", apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
v = np.array([x.co[:] for x in me.vertices])
print("TIE tris", sum(len(p.vertices) - 2 for p in me.polygons), "size xyz", (v.max(0) - v.min(0)).round(3).tolist(), "min", v.min(0).round(3).tolist(), "max", v.max(0).round(3).tolist())

# Checks: one hard light from the front and the side, and the reimported FBX's axes.
s = bpy.context.scene; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = 520, 780
w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.03, .03, .035, 1)
s.view_settings.view_transform = "Standard"
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam; cam.data.lens = 85
li = bpy.data.objects.new("l", bpy.data.lights.new("l", "SPOT")); s.collection.objects.link(li); li.data.spot_size = 1.2; li.data.shadow_soft_size = .02; li.data.color = (.82, .9, 1)
tgt = Vector((0, 0, -.17))
for nm_, p, lp in (("front", (0, -.95, -.15), (.28, -.8, .05)), ("side", (.95, -.05, -.15), (.55, -.7, .1)), ("34", (.6, -.75, -.1), (.1, -.9, .15))):
    cam.location = p; cam.rotation_euler = (tgt - Vector(p)).to_track_quat("-Z", "Y").to_euler()
    li.location = lp; li.rotation_euler = (tgt - Vector(lp)).to_track_quat("-Z", "Y").to_euler(); li.data.energy = 26 * (Vector(lp) - tgt).length_squared
    s.render.filepath = os.path.join(OUT, "check_" + nm_ + ".png"); bpy.ops.render.render(write_still=True)
