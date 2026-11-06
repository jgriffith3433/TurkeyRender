"""Her: blender -b -P blender_her.py -- <gen/rigged dir> [check]
person2. His finished body (same 51 bones, same Body maps) from gen/person_work/final.blend, with his head, hair and mouth taken off and
the Mixamo Ch37 head put on: artist-modelled, with its own texture. It keeps the layout his Head maps use (head islands in the lower 80%,
hair strip above), so she takes two materials like him. Writes Person2.fbx and Person2_Head_*.png.
Shape keys have his names: jawOpen blink eyesWide smile fear. They are simple deformations from landmarks, not his sculpted set."""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[0]
WORK = os.path.join(os.path.dirname(OUT.rstrip("\\/")), "person_work")
MODELS = r"C:\Projects\phoriginsassets\models"
SHIFT = np.array((0, .026, .028))          # her Head joint onto his
HEM = .795                                 # share of the texture height the head islands take
R = 2048
HAIR_END = (1.26, 1.34)                    # where the ends fall: between the shoulder blades
BROWN = np.array((.19, .105, .07))         # hair, sRGB: the brown her old hair prop used


def smoothstep(a0, b0, x):
    t = np.clip((np.asarray(x, float) - a0) / (b0 - a0), 0, 1)
    return t * t * (3 - 2 * t)


def co(o):
    v = np.zeros(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", v)
    return v.reshape(-1, 3)


bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "final.blend"))
ob = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]; me = ob.data
ob.shape_key_clear()
part = np.zeros(len(me.vertices), int); me.attributes["part"].data.foreach_get("value", part)
V = co(ob)
# His neck, read before it goes: hers grows into the same collar.
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.normal_update()
his_neck = BVHTree.FromPolygons([Vector(q) for q in V.tolist()], [tuple(v.index for v in f.verts) for f in bm.faces if all(part[v.index] == 0 for v in f.verts)])
NC = (0., .0)


def neck_r(th, z):
    d = Vector((math.cos(th), math.sin(th), 0)); h = his_neck.ray_cast(Vector((NC[0], NC[1], z)) + d * .4, -d, .4)
    return .4 - h[3] if h[0] is not None else None


# What hair lies on: the shirt's outer faces. The lining faces inward, so it stays out of this.
axis = lambda c: Vector((c.x, c.y, 0))
shirt_f = [tuple(v.index for v in f.verts) for f in bm.faces if all(part[v.index] == 3 for v in f.verts) and f.normal.dot(axis(f.calc_center_median() - Vector((0, 0, f.calc_center_median().z)))) > -.05]
tree_shirt = BVHTree.FromPolygons([Vector(q) for q in V.tolist()], shirt_f)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if part[v.index] not in (1, 2, 3, 4)], context="VERTS")
bm.to_mesh(me); bm.free(); me.update()
print("BODY", len(me.vertices), "verts")

# ---- Her head
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=os.path.join(MODELS, "Ch37_nonPBR.fbx"))
new = [o for o in bpy.data.objects if o not in before]
src = next(o for o in new if o.name.endswith("_Body"))
mat_src = src.data.materials[0]
tex = {}
for n in mat_src.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image:
        for k in ("Diffuse", "Normal", "Glossiness"):
            if k in n.image.filepath: tex[k] = n.image
m_ = src.matrix_world.copy()
src.modifiers.clear(); src.parent = None; src.matrix_world = type(src.matrix_world).Identity(4)
src.data = src.data.copy(); src.data.transform(m_); src.data.update()
for g in src.vertex_groups: g.name = g.name.split(":")[-1]
for o in new:
    if o is not src: bpy.data.objects.remove(o)
head = src; head.name = "HerHead"
bm = bmesh.new(); bm.from_mesh(head.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 1.43 or abs(v.co.x) > .3], context="VERTS")
seen = set(); eye_ids = []
bm.verts.ensure_lookup_table()
for v0 in bm.verts:
    if v0.index in seen: continue
    st = [v0]; seen.add(v0.index); g_ = []
    while st:
        q = st.pop(); g_.append(q.index)
        for e in q.link_edges:
            t = e.other_vert(q)
            if t.index not in seen: seen.add(t.index); st.append(t)
    if len(g_) < 1000: eye_ids += g_
bm.to_mesh(head.data); bm.free()
hm = head.data
hv = co(head) + SHIFT
hv_orig = hv.copy()

# Neck: from under the jaw it widens to his collar, then runs down inside the shirt.
mask = smoothstep(1.525, 1.475, hv[:, 2])
th = np.arctan2(hv[:, 1] - NC[1], hv[:, 0] - NC[0]); r0 = np.hypot(hv[:, 0] - NC[0], hv[:, 1] - NC[1])
for i in np.where(mask > 0)[0]:
    rr = neck_r(th[i], hv[i, 2])
    if rr is None: continue
    r_ = r0[i] + (rr - .0005 - r0[i]) * mask[i]
    hv[i, 0], hv[i, 1] = NC[0] + math.cos(th[i]) * r_, NC[1] + math.sin(th[i]) * r_
hm.vertices.foreach_set("co", hv.flatten()); hm.update()
bm = bmesh.new(); bm.from_mesh(hm)
left = {e for e in bm.edges if e.is_boundary and min(v.co.z for v in e.verts) < 1.52}
chain = {v for e in left for v in e.verts}
edges = list(left)
for z_t in (1.47, 1.44, 1.41):
    r = bmesh.ops.extrude_edge_only(bm, edges=edges)
    nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
    edges = [g for g in r["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
    for v_ in nv:
        t = math.atan2(v_.co.y - NC[1], v_.co.x - NC[0]); rr = neck_r(t, z_t)
        rc = rr - .001 if rr else math.hypot(v_.co.x, v_.co.y - NC[1]) * 1.05
        v_.co = Vector((NC[0] + math.cos(t) * rc, NC[1] + math.sin(t) * rc, z_t))
bm.to_mesh(hm); bm.free(); hm.update()
hv = co(head)
print("NECK", "low", hv[:, 2].min().round(3), "top", hv[:, 2].max().round(3))

# ---- Maps: her head fills the same part of the texture his does.
uvl = hm.uv_layers.active; uvl.name = "UVMap"
L = np.zeros(len(hm.loops) * 2); uvl.data.foreach_get("uv", L); L = L.reshape(-1, 2)
lv = np.zeros(len(hm.loops), int); hm.loops.foreach_get("vertex_index", lv)
u0, v0_ = L.min(0) - .004; u1, v1_ = L.max(0) + .004
print("HEAD UV", u0, v0_, u1, v1_)
# The Mixamo neck carries a painted shadow from its collar, right where hers shows. Those vertices read skin from higher up the neck.
from mathutils import kdtree
Z = hv[:, 2]
ref = np.where((Z > 1.525) & (Z < 1.535) & (np.hypot(hv[:, 0], hv[:, 1]) < .09))[0]
kd = kdtree.KDTree(len(ref))
for k_, i in enumerate(ref):
    t = math.atan2(hv[i, 1], hv[i, 0]); kd.insert((math.cos(t), math.sin(t), 0), k_)
kd.balance()
first = {}
for li_, vi in enumerate(lv): first.setdefault(vi, li_)
low = np.where(lv >= 0)[0]
neckw = smoothstep(1.525, 1.505, Z)
ref_uv = {}
for li_ in range(len(lv)):
    vi = lv[li_]
    if neckw[vi] <= 0 or vi in eye_ids: continue
    t = math.atan2(hv[vi, 1], hv[vi, 0])
    _, k_, _ = kd.find((math.cos(t), math.sin(t), 0))
    L[li_] = L[li_] * (1 - neckw[vi]) + L[first[ref[k_]]] * neckw[vi]
Lnew = (L - (u0, v0_)) / (u1 - u0, v1_ - v0_) * (1, HEM)
uvl.data.foreach_set("uv", Lnew.flatten()); hm.update()


def pixels(im):
    w, h = im.size; p = np.zeros(w * h * 4, np.float32); im.pixels.foreach_get(p)
    return p.reshape(h, w, 4)


def crop(im):
    P = pixels(im); h, w = P.shape[:2]
    H = int(R * HEM)
    ys = np.clip((v0_ + (v1_ - v0_) * (np.arange(H) + .5) / H) * h - .5, 0, h - 1)
    xs = np.clip((u0 + (u1 - u0) * (np.arange(R) + .5) / R) * w - .5, 0, w - 1)
    y0 = ys.astype(int); x0 = xs.astype(int); y1 = np.minimum(y0 + 1, h - 1); x1 = np.minimum(x0 + 1, w - 1)
    fy = (ys - y0)[:, None, None]; fx = (xs - x0)[None, :, None]
    return (P[y0][:, x0] * (1 - fx) + P[y0][:, x1] * fx) * (1 - fy) + (P[y1][:, x0] * (1 - fx) + P[y1][:, x1] * fx) * fy


def his(name):
    im = bpy.data.images.load(os.path.join(OUT, name)); im.colorspace_settings.name = "Non-Color"
    P = pixels(im); k = R // P.shape[0]
    return np.repeat(np.repeat(P, k, 0), k, 1) if k > 1 else P


def save(name, A, cs):
    im = bpy.data.images.new(name, R, R, alpha=True); im.colorspace_settings.name = cs
    im.pixels.foreach_set(A.astype(np.float32).flatten())
    im.filepath_raw = os.path.join(OUT, name + ".png"); im.file_format = "PNG"; im.save()
    return im


H = int(R * HEM)
col = his("Head_BaseMap.png")
hair_rows = col[H:, :, :3]
mean_ = hair_rows.reshape(-1, 3).mean(0); print("HIS HAIR", mean_)
hm_ = hair_rows.mean(2, keepdims=True)                      # his strands with the contrast eased and her colour on them
col[H:, :, :3] = np.clip((1 + (hm_ / max(float(hm_.mean()), .01) - 1) * .55) * BROWN, 0, 1)
col[:H] = crop(tex["Diffuse"]); col[:, :, 3] = 1
nrm = his("Head_BumpMap.png"); nrm[:H] = crop(tex["Normal"]); nrm[:, :, 3] = 1
gl = his("Head_MetallicGlossMap.png")
g_ = crop(tex["Glossiness"])[:, :, :3].mean(2)
gl[:H, :, :3] = 0; gl[:H, :, 3] = np.clip(g_ * .55, .08, .5)
ao = his("Head_OcclusionMap.png"); ao[:H] = 1
# Wet eyes
for vs in (hv[np.array(eye_ids)],):
    pass
luv = Lnew[np.isin(lv, eye_ids)]
for sgn in (1, -1):
    q = luv[(luv[:, 0] > .5) == (sgn > 0)] if True else luv
    if len(q) == 0: continue
    a_ = q.min(0); b_ = q.max(0)
    gl[int(a_[1] * R):int(b_[1] * R) + 1, int(a_[0] * R):int(b_[0] * R) + 1, 3] = .86
iB = save("Person2_Head_BaseMap", col, "sRGB")
iN = save("Person2_Head_BumpMap", nrm, "Non-Color")
save("Person2_Head_MetallicGlossMap", gl, "Non-Color")
save("Person2_Head_OcclusionMap", ao, "Non-Color")
# Scalp: where the head's own texture is painted dark.
Dark = col[:H, :, :3].mean(2)
pv = np.zeros(len(hm.vertices)) + 1
for li_ in range(len(lv)):
    u, v_ = Lnew[li_]
    pv[lv[li_]] = min(pv[lv[li_]], float(Dark[min(int(v_ * R), H - 1), min(int(u * R), R - 1)]))
print("DARK", np.percentile(pv, [5, 25, 50, 75]).round(3))

# ---- Weights on her head
names = {g.index: g.name for g in head.vertex_groups}
W = []
for v in hm.vertices:
    d = {"Head": 0., "Neck": 0.}
    for g in v.groups:
        n = names[g.group]
        d["Head" if n.startswith("Head") or "Eye" in n else "Neck"] += g.weight
    W.append(d)
head.vertex_groups.clear()
gs = {n: head.vertex_groups.new(name=n) for n in ("Head", "Neck", "Chest")}
for i, d in enumerate(W):
    t = float(smoothstep(1.462, 1.515, Z[i]))
    s_ = d["Head"] + d["Neck"]
    h_ = d["Head"] / s_ if s_ > 0 else 0.
    if s_ == 0: h_ = float(smoothstep(1.52, 1.56, Z[i]))
    if t > 0:
        if h_ > .01: gs["Head"].add([i], h_ * t, "REPLACE")
        if 1 - h_ > .01: gs["Neck"].add([i], (1 - h_) * t, "REPLACE")
    if t < 1: gs["Chest"].add([i], 1 - t, "REPLACE")
prt = np.zeros(len(hm.vertices), int); prt[eye_ids] = 6
at = hm.attributes.new("part", "INT", "POINT"); at.data.foreach_set("value", prt.tolist())

# ---- Long hair: ribbons from the scalp, parted in the middle, over the ears and down the back, lying on head, neck and shirt.
bm = bmesh.new(); bm.from_mesh(hm); bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table(); bm.normal_update()
tree_head = BVHTree.FromBMesh(bm)
rng = np.random.RandomState(11)
cand = [f for f in bm.faces if all(prt[v.index] == 0 for v in f.verts) and np.mean([pv[v.index] for v in f.verts]) < .24 and f.calc_center_median().z > 1.6]
cand_all = [f for f in bm.faces if all(prt[v.index] == 0 for v in f.verts) and np.mean([pv[v.index] for v in f.verts]) < .42 and 1.625 < f.calc_center_median().z]
fa = np.array([f.calc_area() for f in cand]); fa /= fa.sum()
pick = rng.choice(len(cand), 9000, p=fa)
roots = []
for i in pick:
    f = cand[i]; vs = [v.co for v in f.verts]; w_ = rng.dirichlet(np.ones(len(vs)))
    roots.append(sum((v_ * float(x) for v_, x in zip(vs, w_)), Vector()))
print("ROOTS", len(roots), "cand faces", len(cand))


def push(p, off):
    # out of the face
    if p.y < -.012 and abs(p.x) < (.066 if p.z > 1.60 else .086) and p.z < 1.712 and p.z > 1.50:
        p = Vector((math.copysign(max(abs(p.x), .05), p.x if p.x else 1), max(p.y, -.012), p.z))
    for tree, o_ in ((tree_head, off), (tree_shirt, off * .9)):
        loc, n, _, dist = tree.find_nearest(p)
        if loc is None: continue
        d = p - loc
        if d.dot(n) < 0 or d.length < o_:
            p = loc + n.normalized() * o_
    return p


N = 13


def grow(p0, off, end_z, side=False):
    """A middle part at the front, combed over the ears; behind that the hair just falls. It settles toward the spine on her back."""
    front = float(smoothstep(.03, -.03, p0.y))
    sx = 1 if p0.x > 0 else -1
    if abs(p0.x) < .004: sx = 1 if rng.rand() > .5 else -1
    p = Vector(p0); path = [p.copy()]
    ds = (max(.1, p.z - end_z) + .07) / (N - 1)
    d_ = 0.
    for i in range(N - 1):
        d_ += ds
        over = 1 - float(smoothstep(.015, .10, d_))
        low = float(smoothstep(1.52, 1.44, p.z))
        F = Vector((sx * (.2 + .9 * front), .35 + .35 * front, -.3)) * over + Vector((-p.x * (.35 + 1.6 * low), (.12 if side else .75) if p.y < .03 else .10, -1)) * (1 - over)
        p = push(p + F.normalized() * ds, off * min(1, .3 + d_ * 12))
        path.append(p.copy())
    a_ = np.array([q[:] for q in path])
    for _ in range(3): a_[1:-1] = (a_[:-2] + a_[1:-1] * 2 + a_[2:]) / 4
    return a_


seeds = rng.choice(len(roots), 150, replace=False)
gp = [grow(roots[int(k)], .012, rng.uniform(*HAIR_END)) for k in seeds]
sc = np.array([roots[int(k)][:] for k in seeds])
verts = []; faces = []; uvs = []


def ribbon(path, w0, thick, u0_):
    s_ = np.linspace(0, 1, len(path))
    tang = np.gradient(path, axis=0); tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    out = path - np.array([0, .0, 1.5]); out /= np.linalg.norm(out, axis=1, keepdims=True)
    side = np.cross(tang, out); side /= np.linalg.norm(side, axis=1, keepdims=True) + 1e-9
    up = np.cross(side, tang)
    base = len(verts)
    for i in range(len(path) - 1):
        w = w0 * (.55 + .45 * min(1, s_[i] * 5)) * (1 - s_[i] ** 3 * .75)
        th_ = thick * (1 - s_[i] * .7)
        for k, (cx_, cy_) in enumerate(((1, 0), (0, 1), (-1, 0), (0, -1))):
            verts.append((path[i] + side[i] * cx_ * w + up[i] * cy_ * th_).tolist())
            uvs.append((u0_ + (.03, .015, 0, .015)[k], .83 + .16 * s_[i]))
    verts.append(path[-1].tolist()); uvs.append((u0_ + .012, .99))
    tip = len(verts) - 1
    for i in range(len(path) - 2):
        for k in range(4):
            j = (k + 1) % 4; a0 = base + i * 4
            faces.append((a0 + k, a0 + 4 + k, a0 + 4 + j, a0 + j))
    a0 = base + (len(path) - 2) * 4
    for k in range(4): faces.append((a0 + k, tip, a0 + (k + 1) % 4))


def lock(i, wr, off, follow, side=False):
    same = np.where(sc[:, 0] * roots[i].x >= 0)[0]            # a lock never joins a group across the part
    g_i = int(same[((sc[same] - np.array(roots[i][:])) ** 2).sum(1).argmin()]) if len(same) else 0
    end = gp[g_i][-1][2] + rng.normal(0, .012)
    path = grow(roots[i], off, end, side)
    s_ = np.linspace(0, 1, len(path))[:, None]
    path = path + (gp[g_i] - path) * s_ ** 1.6 * follow + gp[g_i][-1] * 0
    path = np.array([list(push(Vector(q.tolist()), off * .8)) for q in path])
    w = rng.uniform(*wr)
    ribbon(path, w, min(w * .3, .0035), rng.uniform(0, .94))


idx = rng.permutation(len(roots))
for i in idx[:300]: lock(int(i), (.020, .030), .0045, .45)     # the mass underneath, close on the skull
for i in idx[300:900]: lock(int(i), (.009, .015), .0085, .6)   # the locks
for i in idx[900:1140]: lock(int(i), (.003, .006), .012, .5)   # strands
for i in idx[1140:1175]: lock(int(i), (.0012, .002), .015, .15)  # flyaways
# The temples: the painted scalp runs down in front of the ears, so locks start there and fall straight, over the ears.
cand2 = [f for f in cand_all if abs(f.calc_center_median().x) > .05 and -.075 < f.calc_center_median().y < .03]
fa = np.array([f.calc_area() for f in cand2]); fa /= fa.sum()
n0 = len(roots)
for i in rng.choice(len(cand2), 300, p=fa):
    f = cand2[i]; w_ = rng.dirichlet(np.ones(len(f.verts)))
    roots.append(sum((v_.co * float(x_) for v_, x_ in zip(f.verts, w_)), Vector()))
for i in range(n0, n0 + 170): lock(i, (.010, .017), .009, .25, True)
for i in range(n0 + 170, n0 + 300): lock(i, (.004, .007), .012, .25, True)
bm.free()
hmesh = bpy.data.meshes.new("HerHair"); hmesh.from_pydata(verts, [], faces); hmesh.update()
bm = bmesh.new(); bm.from_mesh(hmesh); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(hmesh); bm.free()
hair = bpy.data.objects.new("HerHair", hmesh); bpy.context.scene.collection.objects.link(hair)
uvh = hmesh.uv_layers.new(name="UVMap")
for l in hmesh.loops: uvh.data[l.index].uv = uvs[l.vertex_index]
vz = np.array(verts)[:, 2]
gh = hair.vertex_groups.new(name="Head"); gn = hair.vertex_groups.new(name="Neck"); gc = hair.vertex_groups.new(name="Chest")
wh = smoothstep(1.54, 1.62, vz); wc = smoothstep(1.56, 1.47, vz); wn = 1 - wh - wc
for i in range(len(vz)):
    if wh[i] > 0: gh.add([i], float(wh[i]), "REPLACE")
    if wn[i] > 0: gn.add([i], float(wn[i]), "REPLACE")
    if wc[i] > 0: gc.add([i], float(wc[i]), "REPLACE")
at = hmesh.attributes.new("part", "INT", "POINT"); at.data.foreach_set("value", [5] * len(vz))
print("HAIR", len(hmesh.polygons), "faces", sum(len(p.vertices) - 2 for p in hmesh.polygons), "tris, ends", vz.min().round(3))

# ---- Join. Everything of hers on the Head material.
mb, mh = me.materials[0], me.materials[1]
for o in (head, hair):
    o.data.materials.clear(); o.data.materials.append(mb); o.data.materials.append(mh)
    for p in o.data.polygons: p.material_index = 1; p.use_smooth = True
n_body = len(me.vertices)
bpy.ops.object.select_all(action="DESELECT")
ob.select_set(True); head.select_set(True); hair.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.object.join()
ob.name = "Person"
for nd in mh.node_tree.nodes if mh.use_nodes else []:
    if nd.type == "TEX_IMAGE" and nd.image and "Base" in nd.image.name: nd.image = iB
    elif nd.type == "TEX_IMAGE" and nd.image and "Bump" in nd.image.name: nd.image = iN

# ---- Shape keys, same names as his.
v = co(ob); pr = np.zeros(len(v), int); me.attributes["part"].data.foreach_get("value", pr)
x, y, z = v[:, 0], v[:, 1], v[:, 2]
skin = (np.arange(len(v)) >= n_body) & (pr == 0)
eyes = []
for sgn in (1, -1):
    q = v[(pr == 6) & (x * sgn > 0)]
    r_ = (q[:, 0].max() - q[:, 0].min()) / 2
    eyes.append((float(q[:, 0].mean()), float(q[:, 1].min() + .0135), float((q[:, 2].max() + q[:, 2].min()) / 2)))
print("EYES", eyes)
EYE_R = .0135
ZM = 1.5825; MW = .0255            # the mouth line and half width, read from the front view
basis = ob.shape_key_add(name="Basis", from_mix=False)


def key(name, d):
    k = ob.shape_key_add(name=name, from_mix=False)
    k.data.foreach_set("co", (v + d).flatten())


def lids(close, up_lo=0.):
    """close 1 shuts the eye; below 0 opens it wider."""
    d = np.zeros_like(v)
    for ex, ey, ez in eyes:
        dd = np.hypot((x - ex) / 1.4, z - ez)
        front = (y < ey + .004) & (np.abs(x - ex) < .04)
        line = ez - .0048
        w_up = smoothstep(.0172, .0108, dd) * front * skin * (z >= line)
        w_lo = smoothstep(.0165, .0105, dd) * front * skin * (z < line)
        if close > 0:
            nz_up = z - (z - line + .0006) * w_up * close
            nz_lo = z - (z - line) * w_lo * .92 * close
        else:
            nz_up = z + (-close) * .0024 * w_up
            nz_lo = z - (-close) * .0009 * w_lo
        nz = np.where(z >= line, nz_up, nz_lo)
        d[:, 2] += nz - z
        # the lid rides over the ball
        moved = (w_up + w_lo) > 0
        rr = (x[moved] - ex) ** 2 + (nz[moved] - ez) ** 2
        ball = ey - np.sqrt(np.maximum((EYE_R + .0009) ** 2 - rr, 0))
        ny = np.minimum(y[moved], ball)
        d[moved, 1] += (ny - y[moved]) * np.minimum(1, (w_up + w_lo)[moved] * 1.5)
    return d


def jaw(deg):
    d = np.zeros_like(v)
    near = smoothstep(MW + .011, MW + .001, np.abs(x))
    soft = smoothstep(ZM + .024, ZM - .036, z)
    sharp = smoothstep(ZM + .0025, ZM - .0025, z)
    near = smoothstep(MW + .004, MW - .007, np.abs(x))
    w = (near * sharp + (1 - near) * soft) * smoothstep(.02, -.02, y) * skin * smoothstep(1.50, 1.53, z)
    inner = smoothstep(-.092, -.074, y) * near           # the mouth's own pocket opens with it, half as far
    w = w * (1 - .5 * inner)
    p0 = np.array((0, .005, 1.602)); a_ = math.radians(deg)
    dy = y - p0[1]; dz = z - p0[2]
    ny = p0[1] + dy * math.cos(a_) + dz * math.sin(a_)
    nz = p0[2] - dy * math.sin(a_) + dz * math.cos(a_)
    d[:, 1] = (ny - y) * w; d[:, 2] = (nz - z) * w
    return d


def smile(k=1.):
    d = np.zeros_like(v)
    for sgn in (1, -1):
        c = np.exp(-(((x - sgn * MW) / .017) ** 2 + ((z - ZM) / .015) ** 2)) * skin * (y < -.05)
        d[:, 2] += .0055 * k * c; d[:, 0] += sgn * .0034 * k * c; d[:, 1] += .0018 * k * c
        ch = np.exp(-(((x - sgn * .042) / .02) ** 2 + ((z - 1.615) / .018) ** 2)) * skin * (y < -.05)
        d[:, 2] += .0018 * k * ch; d[:, 1] += -.0012 * k * ch
    return d


def brows(k):
    d = np.zeros_like(v)
    for ex, ey, ez in eyes:
        b_ = np.exp(-(((x - ex) / .03) ** 2 + ((z - (ez + .023)) / .014) ** 2)) * skin * (y < -.05)
        d[:, 2] += .0042 * k * b_
    return d


key("jawOpen", jaw(7))
key("blink", lids(1))
key("eyesWide", lids(-1))
key("smile", smile() + lids(.1))
key("fear", lids(-1) + brows(1) + jaw(2))
print("TRIS", sum(len(p.vertices) - 2 for p in me.polygons), "KEYS", [k.name for k in me.shape_keys.key_blocks[1:]], "BONES", len(arm.data.bones))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "her.blend"))
bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "Person2.fbx"), use_selection=True, use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, axis_forward="-Z", axis_up="Y", path_mode="RELATIVE", apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
print("DONE", os.path.join(OUT, "Person2.fbx"))
