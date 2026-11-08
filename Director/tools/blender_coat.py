"""Her white lab coat (Hawkes Punch's doctor): a real garment on Person2, skinned to her rig.
  blender -b -P blender_coat.py -- <gen/rigged dir> [proof dir]
Reads gen/person_work/her.blend (never writes it). Writes gen/rigged/Coat.fbx (her armature + the coat object), gen/rigged/Coat_*.png,
gen/person_work/coat.blend, and with a proof dir, renders of her in the coat in poses taken from the clips she plays (retargeted
from the Mixamo FBX in Assets/MusicVideo/Motion), with a count of coat points inside her body in each.

How it is made:
  1. Closed volumes: the torso and skirt as one loft whose every ring is the convex hull of her body's cross-section there (so it
     bridges the chest and both legs, an A-line below the hips), and a tube along each arm to the wrist, sized from the arm under it.
  2. Voxel remesh unites them into one surface (a shoulder where the sleeve meets the body), soft folds are pushed out of the skirt,
     and a shrinkwrap holds every point at least CLEAR off her body (hair included: the braids go inside the coat).
  3. Straight cuts (bisect planes): the hem at the knee, the cuffs at the wrists, the front opening with its V, a back vent; the
     neck hole. Then a solidify gives the cloth its edge.
  4. Lapels (the V's edge folded back), a collar round the neck, patch pockets (two hip, one breast with a pen), the name badge
     on the breast pocket, and the stethoscope round her neck: tubing, Y, ear tubes and tips, the chest piece.
  5. Weights come from the body under each point (nearest face, interpolated), then: each side of the skirt follows its own thigh,
     the back of the skirt mostly the hips (so it hangs when she sits), nothing on the shins, the hands or the fingers, a smoothing
     pass, four bones a point at most."""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[0]
PROOF = a[1] if len(a) > 1 else None
WORK = os.path.join(os.path.dirname(OUT.rstrip("\\/")), "person_work")
MOTION = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "Assets", "MusicVideo", "Motion")
BADGE_TEX = os.path.join(OUT, "Coat_Badge.png")   # written by coat_assets.py: the badge the right way up

HEM = .48            # the hem, just over her knee (knee joint 0.491)
CLEAR = .017         # the least gap between coat and body at rest
TORSO_OFF = .024     # how far the hull is grown on the torso
SKIRT_FLARE = .07    # extra width at the hem
SLEEVE_OFF = .021    # sleeve over the arm
VOXEL = .0085
BREAK = 1.06         # where the V of the front opening ends (the top button)
GAP = .012           # half the gap between the fronts below the break
NECK_R = .072


def smoothstep(a0, b0, x):
    t = np.clip((np.asarray(x, float) - a0) / (b0 - a0), 0, 1)
    return t * t * (3 - 2 * t)


def co_of(o):
    v = np.zeros(len(o.data.vertices) * 3); o.data.vertices.foreach_get("co", v)
    return v.reshape(-1, 3)


def activate(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o


def hull2d(P):
    """Monotone chain convex hull of 2D points, counter-clockwise."""
    P = sorted(set(map(tuple, np.round(P, 5))))
    if len(P) < 3: return np.array(P)
    def cross(o, a_, b_): return (a_[0] - o[0]) * (b_[1] - o[1]) - (a_[1] - o[1]) * (b_[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])


def hull_radius(H, c, th):
    """Distance from c along each angle th to the edge of convex polygon H."""
    out = np.zeros(len(th))
    for i, t in enumerate(th):
        d = np.array((math.cos(t), math.sin(t))); best = 0
        for j in range(len(H)):
            p, q = H[j] - c, H[(j + 1) % len(H)] - c
            e = q - p; den = d[0] * (-e[1]) - d[1] * (-e[0])
            if abs(den) < 1e-12: continue
            s = (p[0] * (-e[1]) - p[1] * (-e[0])) / den; u = (d[0] * p[1] - d[1] * p[0]) / den
            if s > 0 and -1e-9 <= u <= 1 + 1e-9: best = max(best, s)
        out[i] = best
    return out


def loft(bm, rings):
    """Closed tube through rings (lists of 3D points, same count), capped at both ends."""
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a_, b_ in zip(vs[:-1], vs[1:]):
        for i in range(n):
            bm.faces.new((a_[i], a_[(i + 1) % n], b_[(i + 1) % n], b_[i]))
    bm.faces.new(vs[0][::-1]); bm.faces.new(vs[-1])


# ---------------------------------------------------------------- her
bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "her.blend"))
body = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]; me = body.data
# The coat is made on her in an A pose (arms 40 degrees down from the T), then carried back to her rest pose by inverting the skinning,
# so it hangs right with the arms down, where she spends her time, instead of puffing up at the shoulders as a T-pose garment does.
A_DOWN = 40
for side, sgn in (("Left", 1), ("Right", -1)):
    pb = arm.pose.bones[side + "UpperArm"]; h = arm.data.bones[side + "UpperArm"].head_local
    R = Matrix.Rotation(math.radians(A_DOWN * sgn), 4, "Y")
    pb.matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ arm.data.bones[side + "UpperArm"].matrix_local
    bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
bodyA_me = bpy.data.meshes.new_from_object(body.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
bodyA = bpy.data.objects.new("BodyA", bodyA_me); bpy.context.scene.collection.objects.link(bodyA)
for g in body.vertex_groups: bodyA.vertex_groups.new(name=g.name)
V = co_of(bodyA)
part = np.zeros(len(V), int); me.attributes["part"].data.foreach_get("value", part)
x, y, z = V[:, 0], V[:, 1], V[:, 2]
bones = {b.name: (np.array(arm.pose.bones[b.name].head), np.array(arm.pose.bones[b.name].tail)) for b in arm.data.bones}
print("A POSE wrist", bones["LeftHand"][0].round(3))
faces = [tuple(p.vertices) for p in me.polygons]
fpart = np.array([part[f[0]] for f in faces])
# Everything the coat must clear: shirt, trousers, arms, and the hair below the neck (the braids go inside).
fz = np.array([V[list(f), 2].mean() for f in faces])
clear_f = [f for f, p_, zz in zip(faces, fpart, fz) if p_ in (1, 3, 4) or (p_ == 0 and zz < 1.53)]
tree_all = BVHTree.FromPolygons([Vector(q) for q in V.tolist()], clear_f)
print("BODY", len(V), "verts; clearance faces", len(clear_f))

# ---------------------------------------------------------------- 1. volumes
bm = bmesh.new()
N = 72; TH = np.linspace(0, 2 * math.pi, N, endpoint=False)
torso_pts = (np.isin(part, (3, 4)) | ((part == 5) & (z < 1.50) & (y > 0)))
Z = np.r_[np.linspace(HEM - .03, .95, 16, endpoint=False), np.linspace(.95, 1.535, 26)]
rings = []
for zz in Z:
    band = torso_pts & (np.abs(z - zz) < .018)
    half = .19 if zz > 1.28 else .30
    band &= np.abs(x) < half
    if zz > 1.25: band &= ~((part == 3) & (np.abs(x) > .155) & (z < zz + .02) & (zz < 1.43))   # the short sleeves' fall: the sleeve tube takes the arm
    P = V[band][:, :2]
    H = hull2d(P); c = P.mean(0) if len(P) else np.zeros(2)
    r = hull_radius(H, c, TH)
    grow = TORSO_OFF + SKIRT_FLARE * float(smoothstep(.98, HEM, zz)) ** 1.2
    if zz > 1.47: grow *= 1 - .5 * float(smoothstep(1.47, 1.535, zz))
    r = r + grow
    rings.append([(c[0] + rr * math.cos(t), c[1] + rr * math.sin(t), zz) for rr, t in zip(r, TH)])
# smooth the radii along the height so steps in the hull don't show
R = np.array(rings)
for _ in range(3): R[1:-1] = (R[:-2] + 2 * R[1:-1] + R[2:]) / 4
loft(bm, R.tolist())

M = 24; PH = np.linspace(0, 2 * math.pi, M, endpoint=False)
arm_pts = np.isin(part, (1, 3))
for side, sgn in (("Left", 1), ("Right", -1)):
    sh = bones[side + "UpperArm"][0]; el = bones[side + "LowerArm"][0]; wr = bones[side + "Hand"][0]
    path = [np.array((.10 * sgn, sh[1], sh[2] - .005)), sh, (sh + el) / 2, el, (el + wr) / 2, wr + (wr - el) / np.linalg.norm(wr - el) * .012]
    pts = []
    for i in range(len(path) - 1):
        for t in np.linspace(0, 1, 7, endpoint=False): pts.append(path[i] * (1 - t) + path[i + 1] * t)
    pts.append(path[-1])
    rs = []
    for p in pts:
        d = (wr - sh) / np.linalg.norm(wr - sh)
        sel = arm_pts & (np.abs((V - p) @ d) < .015) & (x * sgn > .2)
        Q = V[sel] - p; Q = Q - np.outer(Q @ d, d)
        r0 = float(np.percentile(np.linalg.norm(Q, axis=1), 72)) if sel.sum() > 8 else .07
        along = float(np.clip((p[0] * sgn - .22) / (wr[0] * sgn - .22), 0, 1))
        rs.append(r0 + SLEEVE_OFF * (.80 + .05 * along))
    rs = np.convolve(np.r_[rs[0], rs, rs[-1]], [.25, .5, .25], "valid")
    ring = []
    for p, r_ in zip(pts, rs):
        u = Vector((0, 0, 1)); d = Vector(tuple((wr - sh) / np.linalg.norm(wr - sh))); u = (u - d * u.dot(d)).normalized(); w_ = d.cross(u)
        ring.append([tuple(Vector(tuple(p)) + (u * math.cos(t) + w_ * math.sin(t)) * r_ * (1.08 if math.sin(t) * sgn < 0 else 1.0)) for t in PH])
    loft(bm, ring)

coat_me = bpy.data.meshes.new("Coat"); bm.to_mesh(coat_me); bm.free()
coat = bpy.data.objects.new("Coat", coat_me); bpy.context.scene.collection.objects.link(coat)
activate(coat)
coat_me.remesh_voxel_size = VOXEL; coat_me.remesh_voxel_adaptivity = 0
bpy.ops.object.voxel_remesh()
print("REMESH", len(coat.data.vertices))

# ---------------------------------------------------------------- 2. folds and clearance
def apply_mod(o, m):
    activate(o); bpy.ops.object.modifier_apply(modifier=m.name)

sm = coat.modifiers.new("smooth", "LAPLACIANSMOOTH"); sm.iterations = 4; sm.lambda_factor = .6; sm.use_volume_preserve = True
apply_mod(coat, sm)
C = co_of(coat)
cx_, cy_ = 0., .0
th = np.arctan2(C[:, 1] - cy_, C[:, 0] - cx_)
skirtw = smoothstep(1.0, HEM, C[:, 2])
fold = (np.sin(th * 7 + .6) * .6 + np.sin(th * 11 + 2.1) * .4) * .5 + .5
radial = np.c_[np.cos(th), np.sin(th), np.zeros(len(th))]
C = C + radial * (fold * .016 * skirtw ** 1.3)[:, None]
# soft creases at the back of the waist and under the arms
C[:, 1] += .004 * np.exp(-((C[:, 2] - 1.05) / .04) ** 2) * (C[:, 1] > .05) * (np.sin(C[:, 0] * 60) * .5 + .5)
coat.data.vertices.foreach_set("co", C.flatten()); coat.data.update()

HAIR = V[(part == 5) & (z < 1.47) & (z > 1.0)]
if len(HAIR):
    hth = np.arctan2(HAIR[:, 0], HAIR[:, 1]); hr = np.hypot(HAIR[:, 0], HAIR[:, 1])
    zb_ = ((HAIR[:, 2] - 1.0) / .02).astype(int); tb_ = ((hth + math.pi) / math.radians(5)).astype(int) % 72
    hmax = np.zeros((25, 72)); np.maximum.at(hmax, (np.clip(zb_, 0, 24), tb_), hr)
    for _ in range(2): hmax = np.maximum(hmax, (np.roll(hmax, 1, 1) + np.roll(hmax, -1, 1)) / 2 * .98)
    cth = np.arctan2(C[:, 0], C[:, 1]); cr = np.hypot(C[:, 0], C[:, 1])
    zi = np.clip(((C[:, 2] - 1.0) / .02).astype(int), 0, 24); ti = ((cth + math.pi) / math.radians(5)).astype(int) % 72
    need = hmax[zi, ti] + .016
    inz = (C[:, 2] > 1.0) & (C[:, 2] < 1.47)
    push = np.where(inz & (need > cr), need - cr, 0) * smoothstep(1.0, 1.08, C[:, 2])
    C[:, 0] += push * np.sin(cth); C[:, 1] += push * np.cos(cth)
    coat.data.vertices.foreach_set("co", C.flatten()); coat.data.update()
    print("HAIR push", int((push > 0).sum()), "points, most", round(float(push.max()), 3))
clear_ob_me = bpy.data.meshes.new("clear"); clear_ob_me.from_pydata(V.tolist(), [], clear_f)
clear_ob = bpy.data.objects.new("Clear", clear_ob_me); bpy.context.scene.collection.objects.link(clear_ob)
sw = coat.modifiers.new("wrap", "SHRINKWRAP"); sw.target = clear_ob; sw.wrap_method = "NEAREST_SURFACEPOINT"; sw.wrap_mode = "OUTSIDE"; sw.offset = CLEAR
apply_mod(coat, sw)
sm = coat.modifiers.new("smooth2", "CORRECTIVE_SMOOTH"); sm.iterations = 3; sm.factor = .5
apply_mod(coat, sm)
sw = coat.modifiers.new("wrap2", "SHRINKWRAP"); sw.target = clear_ob; sw.wrap_method = "NEAREST_SURFACEPOINT"; sw.wrap_mode = "OUTSIDE"; sw.offset = CLEAR
apply_mod(coat, sw)

def despike(o, far=.04):
    """Points that ran off from their neighbours (a smooth or a wrap on a bad corner of the remesh) go back to their neighbours' middle."""
    bm_ = bmesh.new(); bm_.from_mesh(o.data); n_ = 0
    for _ in range(3):
        for v_ in bm_.verts:
            nb_ = [e.other_vert(v_).co for e in v_.link_edges]
            if not nb_: continue
            m_ = sum(nb_, Vector()) / len(nb_)
            if (v_.co - m_).length > far: v_.co = m_; n_ += 1
    bm_.to_mesh(o.data); bm_.free(); o.data.update(); print("DESPIKE", o.name, n_)


despike(coat)
# ---------------------------------------------------------------- 3. cuts
def cut(bm_, co, no, keep_side, geom_filter=None):
    """Bisects by a plane and deletes faces on the far side (keep_side +1: keep where (p-co).no > 0)."""
    geom = list(bm_.verts) + list(bm_.edges) + list(bm_.faces)
    if geom_filter:
        fs = [f for f in bm_.faces if geom_filter(f.calc_center_median())]
        es = {e for f in fs for e in f.edges}; vs_ = {v for f in fs for v in f.verts}
        geom = list(vs_) + list(es) + fs
    bmesh.ops.bisect_plane(bm_, geom=geom, plane_co=co, plane_no=no, dist=1e-6)
    return

bm = bmesh.new(); bm.from_mesh(coat.data)
def kill(pred):
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if pred(f.calc_center_median())], context="FACES")

cut(bm, Vector((0, 0, HEM)), Vector((0, 0, 1)), 1); kill(lambda c: c.z < HEM)
for sgn in (1, -1):
    wr = bones[("Left" if sgn > 0 else "Right") + "Hand"][0]; el = bones[("Left" if sgn > 0 else "Right") + "LowerArm"][0]
    d = Vector(tuple((wr - el) / np.linalg.norm(wr - el))); p0 = Vector(tuple(wr)) - d * .006
    cut(bm, p0, d, -1); kill(lambda c, p0=p0, d=d: (c - p0).dot(d) > 0)
# the neck hole
kill(lambda c: c.z > 1.455 and math.hypot(c.x, (c.y - .02) * 1.15) < NECK_R + (c.z - 1.455) * .3 and c.z > 1.455)
kill(lambda c: c.z > 1.53)

# the front: a V from the collar to BREAK, then a near-closed gap to the hem
TOPX = .095; TOPZ = 1.47
front = lambda c: c.y < -.02
def open_half(zz):
    if zz <= BREAK: return GAP + .010 * (BREAK - zz) / (BREAK - HEM)
    return GAP + (TOPX - GAP) * min(1, (zz - BREAK) / (TOPZ - BREAK)) ** 1.1
for sgn in (1, -1):
    cut(bm, Vector((sgn * GAP, 0, BREAK)), Vector((sgn * 1, 0, -.010 / (BREAK - HEM) * sgn * 0)).normalized(), 1, front)
    dvec = Vector((sgn * (TOPX - GAP), 0, TOPZ - BREAK)).normalized()
    nrm = Vector((dvec.z * sgn, 0, -dvec.x * sgn)).normalized()
    cut(bm, Vector((sgn * GAP, 0, BREAK)), nrm, 1, lambda c: front(c) and c.z > BREAK - .01)
kill(lambda c: front(c) and abs(c.x) < open_half(c.z))
# the back vent
cut(bm, Vector((.004, 0, 0)), Vector((1, 0, 0)), 1, lambda c: c.y > .03 and c.z < .80)
cut(bm, Vector((-.004, 0, 0)), Vector((1, 0, 0)), 1, lambda c: c.y > .03 and c.z < .80)
kill(lambda c: c.y > .03 and c.z < .78 and abs(c.x) < .004)
# loose bits left by the cuts
for _ in range(2):
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    lone = [f for f in bm.faces if sum(1 for e in f.edges if e.is_boundary) >= 3]
    bmesh.ops.delete(bm, geom=lone, context="FACES")
bm.to_mesh(coat.data); bm.free(); coat.data.update()
# keep the largest piece only
bm = bmesh.new(); bm.from_mesh(coat.data); bm.verts.ensure_lookup_table()
seen = set(); islands = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; isl = []; seen.add(v.index)
    while st:
        u = st.pop(); isl.append(u)
        for e in u.link_edges:
            w_ = e.other_vert(u)
            if w_.index not in seen: seen.add(w_.index); st.append(w_)
    islands.append(isl)
islands.sort(key=len, reverse=True)
for isl in islands[1:]: bmesh.ops.delete(bm, geom=isl, context="VERTS")
bm.to_mesh(coat.data); bm.free()
print("CUT", len(coat.data.vertices), "islands dropped", len(islands) - 1)


# ---------------------------------------------------------------- 4. parts on the surface
coat_tree = lambda: BVHTree.FromObject(coat, bpy.context.evaluated_depsgraph_get())


def on_surface(tree, p, dirn=Vector((0, 1, 0)), back=.3):
    h = tree.ray_cast(Vector(p) - dirn * back, dirn, back * 2)
    return (h[0], h[1]) if h[0] is not None else (None, None)


extra = bmesh.new()
mat_of = {}
def panel(tree, cx, cz, w, h, lift, mat, sgn_dir=Vector((0, 1, 0)), nx=8, nz=8, tilt=0.):
    """A patch on the coat's front surface: a grid laid on the cloth, lifted `lift` off it, as one face set."""
    grid = []
    for j in range(nz + 1):
        row = []
        for i in range(nx + 1):
            px = cx - w / 2 + w * i / nx; pz = cz - h / 2 + h * j / nz + tilt * (px - cx)
            hit, n = on_surface(tree, (px, -.4, pz), sgn_dir, .0001 + .0)
            if hit is None:
                hit, n = on_surface(tree, (px, 0, pz), Vector((0, 1, 0)), .4)
            row.append(extra.verts.new(hit + n * lift) if hit is not None else extra.verts.new((px, -.2, pz)))
        grid.append(row)
    fs = []
    for j in range(nz):
        for i in range(nx):
            f = extra.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])); fs.append(f)
    for f in fs: f.material_index = mat
    return grid, fs


def front_hit(tree, px, pz):
    h = tree.ray_cast(Vector((px, -.5, pz)), Vector((0, 1, 0)), 1.0)
    return (h[0], h[1]) if h[0] is not None and h[0].y < -.03 else (None, None)


def strip_on_front(tree, pts_xz, width_fn, lift, mat, nrows=1, segs=1):
    """A ribbon along a polyline on the front surface, `width_fn(t)` wide to the outside (+x side for x > 0)."""
    grid = []
    for k, (px, pz) in enumerate(pts_xz):
        t = k / (len(pts_xz) - 1); w = width_fn(t); s = 1 if px >= 0 else -1
        row = []
        for j in range(segs + 1):
            qx = px + s * w * j / segs
            hit, n = front_hit(tree, qx, pz)
            if hit is None: hit, n = Vector((qx, -.15, pz)), Vector((0, -1, 0))
            row.append(extra.verts.new(hit + n * lift))
        grid.append(row)
    fs = []
    for k in range(len(grid) - 1):
        for j in range(segs):
            q = (grid[k][j], grid[k][j + 1], grid[k + 1][j + 1], grid[k + 1][j])
            if pts_xz[0][0] < 0: q = q[::-1]
            f = extra.faces.new(q); f.material_index = mat; fs.append(f)
    return grid, fs


T = coat_tree()
MAT_CLOTH, MAT_BADGE, MAT_DARK, MAT_METAL, MAT_PEN = 0, 1, 2, 3, 4
# Lapels: along each V edge from the break to the top, 0 wide at the break, 6.5 cm under the collar.
for sgn in (1, -1):
    pts = []
    for t in np.linspace(0, 1, 18):
        zz = BREAK + (TOPZ - .005 - BREAK) * t
        pts.append((sgn * (open_half(zz) + .003), zz))
    strip_on_front(T, pts, lambda t: .004 + .062 * smoothstep(0, .85, t) * (1 - .35 * smoothstep(.9, 1, t)), .005, MAT_CLOTH, segs=4)
# Pockets: two at the hips, one on her left breast.
for sgn in (1, -1):
    panel(T, sgn * .115, .855, .15, .17, .0045, MAT_CLOTH, nx=8, nz=8)
    panel(T, sgn * .115, .932, .155, .022, .0075, MAT_CLOTH, nx=8, nz=1)          # the pocket's hem, a fold at its mouth
panel(T, .118, 1.245, .088, .115, .0045, MAT_CLOTH, nx=6, nz=6)          # clear of the lapel
# The badge on the breast pocket, and the pen clipped in it.
bg, bfs = panel(T, .118, 1.252, .078, .027, .0085, MAT_BADGE, nx=4, nz=1)
uvL = extra.loops.layers.uv.new("UVMap")
_gi = {v_: (i / 4, j / 1) for j, row in enumerate(bg) for i, v_ in enumerate(row)}     # the badge's own grid: exactly 0..1 across it
for f in bfs:
    for l in f.loops: l[uvL].uv = _gi[l.vert]
hit, n = front_hit(T, .108, 1.308)
if hit is not None:
    base = hit + n * .009
    pen = bmesh.ops.create_cone(extra, cap_ends=True, segments=10, radius1=.0045, radius2=.0045, depth=.06, matrix=Matrix.Translation(base + Vector((0, 0, .0))))
    for v_ in pen["verts"]: pass
    for f in {f for v_ in pen["verts"] for f in v_.link_faces}: f.material_index = MAT_PEN
    clip = bmesh.ops.create_cube(extra, size=1, matrix=Matrix.Translation(base + Vector((0, -.0055, .006))) @ Matrix.Diagonal((.0025, .0016, .028, 1)))
    for f in {f for v_ in clip["verts"] for f in v_.link_faces}: f.material_index = MAT_METAL


# ---------------------------------------------------------------- the collar
# The neck hole's own edge, read off the cut coat: the collar grows from it and the stethoscope lies on the collar.
_bm = bmesh.new(); _bm.from_mesh(coat.data)
_B = np.array([tuple(v_.co) for v_ in _bm.verts if v_.is_boundary and v_.co.z > 1.38 and math.hypot(v_.co.x, v_.co.y - .02) < .16]); _bm.free()
_BA = np.arctan2(_B[:, 0], _B[:, 1] - .02)
print("NECK EDGE", len(_B), "points")


def neck_point(phi, zz=None, tree=None, out=.0):
    d = Vector((math.sin(phi), math.cos(phi), 0))
    da = np.abs((_BA - phi + math.pi) % (2 * math.pi) - math.pi)
    near = da < max(.06, float(da.min()) + .02)
    p = _B[near]; p = p[np.argmax(p[:, 2])] * .5 + p.mean(0) * .5
    return Vector(tuple(p)) + d * out


crows = []
PHIS = np.linspace(-math.pi + .55, math.pi - .55, 40)        # from her right front round the back to her left front
for phi in PHIS:
    frontness = (math.cos(phi) < 0) * (-math.cos(phi))
    b0 = neck_point(phi, out=.002)
    d = Vector((math.sin(phi), math.cos(phi), 0))
    stand = b0 + Vector((0, 0, .030 - .012 * frontness)) - d * .004
    fall = b0 + d * (.032 + .01 * frontness) + Vector((0, 0, -.012))
    crows.append([extra.verts.new(b0), extra.verts.new(stand), extra.verts.new(stand + d * .010 + Vector((0, 0, .004))), extra.verts.new(fall)])
for i in range(len(crows) - 1):
    for j in range(3):
        f = extra.faces.new((crows[i][j], crows[i + 1][j], crows[i + 1][j + 1], crows[i][j + 1])); f.material_index = MAT_CLOTH

extra_me = bpy.data.meshes.new("CoatParts"); extra.to_mesh(extra_me); extra.free()
parts_ob = bpy.data.objects.new("CoatParts", extra_me); bpy.context.scene.collection.objects.link(parts_ob)


# ---------------------------------------------------------------- the stethoscope
def tube_ob(name, pts, radius, mat_name):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = radius; cu.bevel_resolution = 2; cu.resolution_u = 6
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = "AUTO"
    sp.use_endpoint_u = True
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
    activate(o); bpy.ops.object.convert(target="MESH")
    o = bpy.context.view_layer.objects.active
    m = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name); o.data.materials.clear(); o.data.materials.append(m)
    return o


T2 = BVHTree.FromObject(parts_ob, bpy.context.evaluated_depsgraph_get())
def rest_on(p, lift=.008):
    """Drops a point onto whatever is in front of it (coat or collar), from the front or from above at the neck."""
    p = Vector(p); best = None
    for tr in (T, T2):
        for d in (Vector((0, 1, 0)), Vector((0, 0, -1)), Vector((0, -1, 0)) if p.y > .03 else Vector((0, 1, 0))):
            h = tr.ray_cast(p - d * .3, d, .6)
            if h[0] is not None and (best is None or (h[0] - p).length < (best[0] - p).length): best = h
    return best[0] + best[1] * lift if best else p


path = []
for phi in np.linspace(-1.95, 1.95, 15):                      # round the back of the neck, on the collar's fall
    d = Vector((math.sin(phi), math.cos(phi), 0))
    path.append(neck_point(phi, out=.030) + Vector((0, 0, -.004)))
right = [rest_on((-.085, -.2, 1.40)), rest_on((-.08, -.2, 1.31)), rest_on((-.07, -.2, 1.22))]
left = [rest_on((.10, -.2, 1.40)), rest_on((.092, -.2, 1.34))]
tube_pts = right[::-1] + path + left
tube = tube_ob("Steth_tube", tube_pts, .0042, "Coat_Dark")
yj = left[-1]
tips = []
for s_, dx in ((1, .022), (-1, -.016)):
    end = rest_on((yj.x + dx, -.2, yj.z - .055), .012)
    tips.append(tube_ob("Steth_ear%d" % s_, [yj, yj + (end - yj) * .5 + Vector((0, -.004, 0)), end], .0018, "Coat_Metal"))
    tip_bm = bmesh.new(); bmesh.ops.create_uvsphere(tip_bm, u_segments=10, v_segments=6, radius=.0055, matrix=Matrix.Translation(end + Vector((0, 0, -.003))))
    tm = bpy.data.meshes.new("tip"); tip_bm.to_mesh(tm); tip_bm.free(); to = bpy.data.objects.new("Steth_tip%d" % s_, tm); bpy.context.scene.collection.objects.link(to)
    tm.materials.append(bpy.data.materials.get("Coat_Dark")); tips.append(to)
cp = right[-1]
nrm = Vector((0, -1, .1)).normalized()
cp_bm = bmesh.new()
bmesh.ops.create_cone(cp_bm, cap_ends=True, segments=20, radius1=.021, radius2=.019, depth=.011, matrix=Matrix.Translation(cp + nrm * .002) @ nrm.to_track_quat("Z", "Y").to_matrix().to_4x4())
cm = bpy.data.meshes.new("chest"); cp_bm.to_mesh(cm); cp_bm.free(); chest = bpy.data.objects.new("Steth_chest", cm); bpy.context.scene.collection.objects.link(chest)
cm.materials.append(bpy.data.materials.get("Coat_Metal"))

# ---------------------------------------------------------------- materials and the join
mats = {}
for nm_, col, rough in (("Coat_Cloth", (.92, .93, .94), .8), ("Coat_Badge", (1, 1, 1), .4), ("Coat_Dark", (.03, .03, .035), .45), ("Coat_Metal", (.75, .76, .78), .2), ("Coat_Pen", (.05, .12, .45), .3)):
    m = bpy.data.materials.get(nm_) or bpy.data.materials.new(nm_)
    m.use_nodes = True; bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*col, 1); bs.inputs["Roughness"].default_value = rough
    if nm_ == "Coat_Metal": bs.inputs["Metallic"].default_value = 1
    if nm_ == "Coat_Badge" and os.path.exists(BADGE_TEX):
        t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.abspath(BADGE_TEX)); m.node_tree.links.new(t.outputs[0], bs.inputs["Base Color"])
    mats[nm_] = m
coat.data.materials.clear()
for nm_ in ("Coat_Cloth", "Coat_Badge", "Coat_Dark", "Coat_Metal", "Coat_Pen"): coat.data.materials.append(mats[nm_])
for nm_ in ("Coat_Cloth", "Coat_Badge", "Coat_Dark", "Coat_Metal", "Coat_Pen"): parts_ob.data.materials.append(mats[nm_])   # (no clear(): it would zero the faces' slots)

# Thickness for the shell and the flat parts (cloth has an edge; the inside shows inside the open front).
for o, th_ in ((coat, .0035), (parts_ob, .0025)):
    s_ = o.modifiers.new("thick", "SOLIDIFY"); s_.thickness = th_; s_.offset = -1; s_.use_rim = True; s_.use_even_offset = True
    apply_mod(o, s_)
for o in [parts_ob, tube, chest] + tips:
    o.select_set(True)
activate(coat)
for o in [parts_ob, tube, chest] + tips: o.select_set(True)
bpy.ops.object.join()
coat = bpy.context.view_layer.objects.active; coat.name = "Coat"; coat.data.name = "Coat"
# UVs for the cloth weave: the badge keeps its own.
activate(coat)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT")
coat.active_material_index = 1
bpy.ops.object.mode_set(mode="OBJECT")
bm = bmesh.new(); bm.from_mesh(coat.data)
uvL = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.verify()
for _l in [l_ for l_ in bm.loops.layers.uv.values() if l_.name != uvL.name]: bm.loops.layers.uv.remove(_l)   # one UV set: Unity reads the first
uvL = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.verify()
for f in bm.faces:
    if f.material_index == MAT_BADGE: continue
    n = f.normal
    for l in f.loops:
        p = l.vert.co
        # a cylindrical wrap about her axis: u round the body, v down it, at 1 unit a 25 cm tile
        if abs(n.z) > .8: l[uvL].uv = (p.x * 4, p.y * 4)
        else: l[uvL].uv = (math.atan2(p.x, -p.y + .02) / (2 * math.pi) * 4, p.z * 4)
bm.normal_update()
for f in bm.faces: f.smooth = True
bm.to_mesh(coat.data); bm.free()
bm = bmesh.new(); bm.from_mesh(coat.data)
ng = [f for f in bm.faces if len(f.verts) > 4]          # caps of the pen and the chest piece: Unity throws away n-gons it can't fan
bmesh.ops.triangulate(bm, faces=ng); bm.to_mesh(coat.data); bm.free()
print("COAT", len(coat.data.vertices), "verts", len(coat.data.polygons), "faces", len(ng), "n-gons split")
import collections
_used = collections.Counter(p.material_index for p in coat.data.polygons)
print("SLOTS", [(m.name, _used[i]) for i, m in enumerate(coat.data.materials)])
assert all(_used[i] for i in range(len(coat.data.materials))), "a material slot has no faces: Unity would drop it"

despike(coat, .08)
_bt = BVHTree.FromPolygons([Vector(q) for q in V.tolist()], faces)
_far = []
for v_ in coat.data.vertices:
    h = _bt.find_nearest(v_.co, .5)
    if h[0] is None or h[3] > (.16 if v_.co.z < 1.0 else .10): _far.append(tuple(round(c, 3) for c in v_.co))
print("FAR points", len(_far), _far[:12])
# ---------------------------------------------------------------- 5. weights
for g in list(coat.vertex_groups): coat.vertex_groups.remove(g)
for g in body.vertex_groups: coat.vertex_groups.new(name=g.name)
dt = coat.modifiers.new("dt", "DATA_TRANSFER"); dt.object = bodyA; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
apply_mod(coat, dt)
names = [g.name for g in coat.vertex_groups]; gi = {n: i for i, n in enumerate(names)}
CV = co_of(coat); nv = len(CV)
W = np.zeros((nv, len(names)))
for v_ in coat.data.vertices:
    for g in v_.groups: W[v_.index, g.group] = g.weight
cx, cy, cz = CV[:, 0], CV[:, 1], CV[:, 2]
mv = lambda src, dst, mask=None: (W.__setitem__((slice(None), gi[dst]), W[:, gi[dst]] + (W[:, gi[src]] * (1 if mask is None else mask))), W.__setitem__((slice(None), gi[src]), W[:, gi[src]] * (0 if mask is None else 1 - mask)))
for s in ("Left", "Right"):
    mv(s + "LowerLeg", s + "UpperLeg"); mv(s + "Foot", s + "UpperLeg"); mv(s + "Toes", s + "UpperLeg")
    mv(s + "Hand", s + "LowerArm")
    for n in names:
        if n.startswith(s + "Hand") and n != s + "Hand": mv(n, s + "LowerArm")
mv("Head", "Neck"); mv("LeftEye", "Neck"); mv("RightEye", "Neck")
# the skirt: each side follows its own thigh; the back mostly the hips
low = smoothstep(1.00, .88, cz)
for s, sgn in (("Left", 1), ("Right", -1)):
    other = "Right" if s == "Left" else "Left"
    mine = (cx * sgn > 0).astype(float)
    hj = bones[s + "UpperLeg"][0]; kj = bones[s + "UpperLeg"][1]
    # where round its own thigh the point is: front of the thigh axis follows the thigh fully, the back mostly the hips
    t_ = np.clip((cz - hj[2]) / (kj[2] - hj[2]), 0, 1); ay = hj[1] + (kj[1] - hj[1]) * t_
    fr = smoothstep(.05, -.06, cy - ay)
    thigh = (.30 + .70 * fr) * smoothstep(.97, .80, cz)        # the back hangs from the seat; the front turns with the lap
    shin = .45 * fr * smoothstep(.58, .49, cz)                 # the hem over the knee drapes with the shin a little
    want = np.zeros_like(W)
    want[:, gi[s + "UpperLeg"]] = thigh - shin * thigh; want[:, gi[s + "LowerLeg"]] = shin * thigh; want[:, gi["Hips"]] = 1 - thigh
    blend = (low * mine)[:, None]
    W = W * (1 - blend) + want * blend
W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
# smooth the weights over the cloth (the coat stands off the body, so it should bend wider than the skin)
bm = bmesh.new(); bm.from_mesh(coat.data); bm.verts.ensure_lookup_table()
nb = [[e.other_vert(v_).index for e in v_.link_edges] for v_ in bm.verts]; bm.free()
for _ in range(2):
    W2 = W.copy()
    for i, nn in enumerate(nb):
        if nn: W2[i] = .5 * W[i] + .5 * W[nn].mean(0)
    W = W2
empty = W.sum(1) < 1e-6
W[empty, gi["Chest"]] = 1
print("NO WEIGHT points", int(empty.sum()))
# four bones a point
idx = np.argsort(-W, axis=1)[:, 4:]
np.put_along_axis(W, idx, 0, axis=1)
W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
for g in coat.vertex_groups: g.remove(range(nv))
for j, n in enumerate(names):
    g = coat.vertex_groups[n]
    nz_ = np.where(W[:, j] > 1e-4)[0]
    for i in nz_: g.add([int(i)], float(W[i, j]), "REPLACE")
# back to her rest pose: each point through the inverse of its own blend of bone moves
D = np.array([np.array(arm.pose.bones[n].matrix @ arm.data.bones[n].matrix_local.inverted()) if n in arm.pose.bones else np.eye(4) for n in names])
Mv = np.einsum("vb,bij->vij", W, D)
bad_ = np.abs(np.linalg.det(Mv)) < .2
Mv[bad_] = np.eye(4)
print("UNPOSE fallbacks", int(bad_.sum()))
P4 = np.c_[CV, np.ones(nv)]
rest = np.einsum("vij,vj->vi", np.linalg.inv(Mv), P4)[:, :3]
coat.data.vertices.foreach_set("co", rest.flatten()); coat.data.update()
for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
bpy.data.objects.remove(bodyA)
print("UNPOSED", round(float(np.abs(rest - CV).max()), 3), "m at most")
coat.parent = arm; coat.matrix_parent_inverse = Matrix.Identity(4)
am = coat.modifiers.new("Armature", "ARMATURE"); am.object = arm
print("WEIGHTS", {n: int((W[:, gi[n]] > .05).sum()) for n in names if (W[:, gi[n]] > .05).sum() > 0})

bpy.data.objects.remove(clear_ob)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "coat.blend"))
activate(arm); body.select_set(False); coat.select_set(True); arm.select_set(True)
body.hide_set(False)
bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True); coat.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "Coat.fbx"), use_selection=True, use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, axis_forward="-Z", axis_up="Y", path_mode="RELATIVE", apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
print("DONE", os.path.join(OUT, "Coat.fbx"))
