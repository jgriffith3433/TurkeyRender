"""Builds the person: blender -b -P blender_rig.py -- unused.glb outdir [stages]
Stages (comma list, default all): build, rig, maps, paint, hair, final, and check:t+face+hand+down+sit+run+tv+expr+grip. Each saves its .blend in gen/person_work.

He is no longer a remeshed scan. The clean surfaces come from artist-modelled Mixamo parts already in
phoriginsassets/models (head with real ears and eyelids, hands with real fingers, a crew-neck top, trousers), refitted to
the man in the reference images. Their skin weights are artist-made, so shoulders and hips deform properly.
The face comes from gen/face_tex.png and gen/person_work/tex/side_left.png; cloth and skin colour are flat albedo."""
import bpy, bmesh, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
OUT = a[1]
STAGES = (a[2] if len(a) > 2 else "build,rig,maps,paint,hair,final").split(",")
GEN = os.path.dirname(OUT.rstrip("\\/"))
WORK = os.path.join(GEN, "person_work")
TEX = os.path.join(WORK, "tex")
MODELS = r"C:\Projects\phoriginsassets\models"
os.makedirs(OUT, exist_ok=True)
SIDES = (("Left", 1), ("Right", -1))   # he faces -Y, so his left is +X
SKIN_TONE = np.array([.737, .595, .506])   # the cheek in face_tex.png, as stage_paint prints it (CHEEK TONE): arms, hands, feet and neck all match it
JAW_LINE = np.array([(0, 1.527), (.036, 1.542), (.063, 1.582), (.075, 1.60), (.2, 1.60)])   # |x|, z of the jaw's edge from the front
NECK_HOLE = (-.008, .078, .063)        # the crew neck: centre y, half width, half depth
HEM_X = .392                           # the sleeve ends here: about 70% down the upper arm, clear of the elbow
SLEEVE_GAP = (.0145, .0105)             # cloth off the skin: where the armhole has settled, and at the hem


def activate(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def co(o):
    v = np.zeros(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get("co", v)
    return v.reshape(-1, 3)


def set_co(o, v):
    o.data.vertices.foreach_set("co", np.asarray(v).flatten())
    o.data.update()


def edges_of(o):
    e = np.zeros(len(o.data.edges) * 2, int)
    o.data.edges.foreach_get("vertices", e)
    return e.reshape(-1, 2)


def laplace(v, e, it, lam=.5, mask=None):
    """Plain neighbour smoothing. mask: 1 moves fully, 0 stays."""
    v = v.copy()
    for _ in range(it):
        acc = np.zeros_like(v); cnt = np.zeros(len(v))
        np.add.at(acc, e[:, 0], v[e[:, 1]]); np.add.at(acc, e[:, 1], v[e[:, 0]])
        np.add.at(cnt, e[:, 0], 1); np.add.at(cnt, e[:, 1], 1)
        d = acc / np.maximum(cnt, 1)[:, None] - v
        v += d * (lam if mask is None else (lam * mask)[:, None])
    return v


def smoothstep(a0, b0, x):
    t = np.clip((x - a0) / (b0 - a0), 0, 1)
    return t * t * (3 - 2 * t)


def tps_fit(src, dst, reg=1e-7):
    n = len(src)
    d = np.linalg.norm(src[:, None] - src[None], axis=2)
    K = np.where(d > 0, d * d * np.log(d + 1e-12), 0) + np.eye(n) * reg
    P = np.hstack([np.ones((n, 1)), src])
    A = np.vstack([np.hstack([K, P]), np.hstack([P.T, np.zeros((3, 3))])])
    b = np.vstack([dst, np.zeros((3, 2))])
    return src, np.linalg.solve(A, b)


def tps_apply(fit, p):
    src, c = fit
    d = np.linalg.norm(p[:, None] - src[None], axis=2)
    U = np.where(d > 0, d * d * np.log(d + 1e-12), 0)
    return U @ c[:len(src)] + np.hstack([np.ones((len(p), 1)), p]) @ c[len(src):]


# The face: points on the Mixamo head in a front view, and the same features in face_tex.png.
MM = 2812.5                                  # px per metre in the grid render the mesh points were read from
FACE_S = .00029; FACE_CX = 508; FACE_EYE_Y = 480; FACE_EYE_Z = 1.655   # face_tex.png to metres
EYE_L = (.0330, 1.6552); EYE_R = (-.0325, 1.6548); EYE_Y = -.0953; EYE_RAD = .0123
def _m(px, py): return ((px - 450) / MM, 1.625 + (450 - py) / MM)
def _f(px, py): return ((px - FACE_CX) * FACE_S, FACE_EYE_Z + (FACE_EYE_Y - py) * FACE_S)
FACE_POINTS = [
    (_m(362, 377), _f(395, 482)), (_m(530, 377), _f(620, 478)),                   # eyes
    (_m(325, 378), _f(350, 485)), (_m(405, 381), _f(440, 485)),                   # right eye corners
    (_m(490, 381), _f(578, 482)), (_m(567, 378), _f(662, 480)),                   # left eye corners
    (_m(365, 348), _f(385, 428)), (_m(535, 348), _f(630, 424)),                   # brows
    (_m(450, 470), _f(510, 595)), (_m(402, 487), _f(450, 615)), (_m(497, 487), _f(572, 615)), (_m(450, 503), _f(510, 642)),  # nose
    (_m(370, 568), _f(425, 733)), (_m(527, 568), _f(600, 729)), (_m(450, 562), _f(510, 730)), (_m(450, 600), _f(510, 768)),  # mouth
    (_m(450, 690), _f(505, 902)),                                                 # chin
    (_m(335, 660), _f(385, 850)), (_m(565, 660), _f(635, 850)),                   # jaw
    (_m(275, 590), _f(292, 715)), (_m(628, 590), _f(742, 705)),                   # jaw corners
    (_m(205, 370), _f(215, 508)), (_m(695, 370), _f(806, 488)),                   # ear tops
    (_m(245, 520), _f(262, 678)), (_m(660, 520), _f(770, 665)),                   # ear lobes
    (_m(450, 65), (0, 1.752)), (_m(238, 280), (-.0745, 1.69)), (_m(660, 280), (.0745, 1.69)),  # skull stays
    (_m(285, 700), _f(322, 880)), (_m(615, 700), _f(716, 880)),                   # neck
    (_m(275, 790), (-.058, 1.502)), (_m(628, 790), (.058, 1.502)),
]


def import_parts(fbx, keep):
    """Imports a Mixamo character. Returns the kept meshes in world metres and the joints."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(MODELS, fbx))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    J = {}
    for b in arm.data.bones:
        J[b.name.split(":")[-1]] = np.array((arm.matrix_world @ b.head_local)[:])
    out = {}
    for o in new:
        if o.type != "MESH" or not any(o.name.endswith(k) for k in keep): continue
        m = o.matrix_world.copy()
        o.modifiers.clear(); o.parent = None; o.matrix_world = Matrix.Identity(4)
        o.data = o.data.copy(); o.data.transform(m); o.data.update()
        for g in o.vertex_groups: g.name = g.name.split(":")[-1]
        out[o.name.split("_")[-1]] = o
    for o in new:
        if o.type != "MESH" or o not in out.values():
            bpy.data.objects.remove(o)
    return out, J


def subdivide(o, levels=1):
    activate(o)
    m = o.modifiers.new("s", "SUBSURF"); m.levels = levels; m.render_levels = levels
    bpy.ops.object.modifier_apply(modifier="s")


def boundary_loops(bm):
    """Every open edge loop of the mesh, each as an ordered list of verts."""
    left = {e for e in bm.edges if e.is_boundary}
    loops = []
    while left:
        e = left.pop(); chain = [e.verts[0], e.verts[1]]
        while True:
            nxt = [x for x in chain[-1].link_edges if x in left]
            if not nxt: break
            left.discard(nxt[0]); chain.append(nxt[0].other_vert(chain[-1]))
        if chain[0] == chain[-1]: chain.pop()
        loops.append(chain)
    return loops


def lip(o, ring_test, inner_scale):
    """Closes an open hem: the edge folds inward, so nothing shows through it."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    for chain in boundary_loops(bm):
        c = sum((v.co for v in chain), Vector()) / len(chain)
        if not ring_test(c): continue
        r = bmesh.ops.extrude_edge_only(bm, edges=list({e for v in chain for e in v.link_edges if e.is_boundary}))
        for g in r["geom"]:
            if isinstance(g, bmesh.types.BMVert): g.co = c + (g.co - c) * inner_scale
    bm.to_mesh(o.data); bm.free(); o.data.update()


def soft_hem(o, arms):
    """A sewn sleeve edge: the cloth rolls over and turns back up inside the sleeve, closing onto the arm, so no hole shows."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    for chain in boundary_loops(bm):
        c = sum((v.co for v in chain), Vector()) / len(chain)
        if abs(c.x) < .3: continue
        ar = arms["Left" if c.x > 0 else "Right"]
        ar = ar[np.abs(ar[:, 0] - c.x) < .02][:, 1:]
        sign = math.copysign(1, c.x)
        cc = np.array(c[1:])
        ac = (ar.max(0) + ar.min(0)) / 2; ar = ar - ac
        def closed(y, z):       # just off the skin of the arm, in the direction of this point
            d_ = np.array((y, z)) - ac; d_ /= max(np.linalg.norm(d_), 1e-6)
            return ac + d_ * (float((ar @ d_).max()) + .0018)
        edges = list({e for v in chain for e in v.link_edges if e.is_boundary})
        k0 = 1.
        for dx, k in ((.0022, .985), (.0028, .955), (.0008, .925), (-.0075, 0), (-.022, 0)):
            r = bmesh.ops.extrude_edge_only(bm, edges=edges)
            nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
            edges = [g for g in r["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
            for v_ in nv:
                if k: q = cc + (np.array(v_.co[1:]) - cc) * k / k0
                else: q = closed(v_.co.y, v_.co.z)
                v_.co = Vector((sign * (HEM_X + dx), q[0], q[1]))
            k0 = k or k0
    bm.to_mesh(o.data); bm.free(); o.data.update()


def tree_of(o):
    return BVHTree.FromPolygons([Vector(q) for q in co(o).tolist()], [tuple(p.vertices) for p in o.data.polygons])


def open_neck(o):
    """The Mixamo top has no neck hole: its collar is a closed plug, and the neck used to come straight through it.
    This cuts a real crew neck: an ellipse around the neck, with a clean edge."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    cy, a_, b_ = NECK_HOLE
    inside = lambda q: (q.x / a_) ** 2 + ((q.y - cy) / b_) ** 2 < 1
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > 1.42 and inside(f.calc_center_median())], context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # Whatever is left of the rolled band hanging inside the shirt goes too.
    seen = set(); parts = []
    for v0 in bm.verts:
        if v0 in seen: continue
        st = [v0]; seen.add(v0); g = []
        while st:
            q = st.pop(); g.append(q)
            for e_ in q.link_edges:
                t_ = e_.other_vert(q)
                if t_ not in seen: seen.add(t_); st.append(t_)
        parts.append(g)
    main = max(parts, key=len)
    for g in parts:
        if g is not main: bmesh.ops.delete(bm, geom=g, context="VERTS")
    ring = max((c for c in boundary_loops(bm) if sum(v_.co.z for v_ in c) / len(c) > 1.4 and abs(sum(v_.co.x for v_ in c) / len(c)) < .05), key=len)
    z = np.array([v_.co.z for v_ in ring])
    for _ in range(8): z = (np.roll(z, 1) + z * 2 + np.roll(z, -1)) / 4
    for v_, z_ in zip(ring, z):
        d = Vector((v_.co.x, v_.co.y - cy, 0)); t = math.atan2(d.y / b_, d.x / a_)
        v_.co = Vector((a_ * math.cos(t), cy + b_ * math.sin(t), z_))
    bm.to_mesh(o.data); bm.free(); o.data.update()


def fit_neck(body, shirt):
    """The skin of the neck ends under the shirt, never in front of it, and the collar's edge rolls in and closes on the neck,
    so no join and no gap shows at any angle."""
    bm = bmesh.new(); bm.from_mesh(shirt.data)
    ring = max((c for c in boundary_loops(bm) if sum(v_.co.z for v_ in c) / len(c) > 1.4 and abs(sum(v_.co.x for v_ in c) / len(c)) < .05), key=len)
    c = sum((v_.co for v_ in ring), Vector()) / len(ring)
    ts = tree_of(shirt)
    v = co(body); ids = np.where((v[:, 2] < 1.52) & (np.abs(v[:, 0]) < .2))[0]
    moved = 0
    for i in ids:
        d = Vector((v[i, 0] - c.x, v[i, 1] - c.y, 0)); r = d.length; d.normalize()
        h = ts.ray_cast(Vector((c.x, c.y, v[i, 2])), d, .4)
        if h[0] is None: continue
        lim = h[3] - .007
        if r > lim:
            v[i, :2] = (c.x + d.x * lim, c.y + d.y * lim); moved += 1
    m_ = smoothstep(1.53, 1.50, v[:, 2]) * (np.abs(v[:, 0]) < .2)
    set_co(body, laplace(v, edges_of(body), 3, .5, m_))
    tb = tree_of(body)
    edges = list({e for v_ in ring for e in v_.link_edges if e.is_boundary})
    for dz, gap in ((.0016, None), (-.0030, None), (-.012, .0022), (-.024, .0022)):
        r = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        edges = [g for g in r["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
        for v_ in nv:
            d = Vector((v_.co.x - c.x, v_.co.y - c.y, 0)); rr = d.length; d.normalize(); z = v_.co.z + dz
            if gap is None:
                rn = rr - .0022
            else:
                h = tb.ray_cast(Vector((c.x, c.y, z)), d, .4)
                rn = (h[3] + gap) if h[0] is not None else rr - .006
            v_.co = Vector((c.x + d.x * rn, c.y + d.y * rn, z))
    bm.to_mesh(shirt.data); bm.free(); shirt.data.update()
    print("NECK moved", moved, "of", len(ids))


def open_hem(o):
    """The sweater's hem was closed by a floor across the inside of the shirt, and the jeans passed through it. The floor goes:
    the shirt is an open tube, and its edge turns in and up like a sewn hem."""
    tree = tree_of(o)
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    cy = float(np.mean([v.co.y for v in bm.verts if v.co.z < 1.05]))
    gone = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.z > .98: continue
        d = Vector((c.x, c.y - cy, 0)); d.normalize()
        h = tree.ray_cast(c + d * .006, d, .4)
        if h[0] is not None: gone.append(f)
    bmesh.ops.delete(bm, geom=gone, context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    seen = set(); shells = []
    for v0 in bm.verts:
        if v0 in seen: continue
        st = [v0]; seen.add(v0); g = []
        while st:
            q = st.pop(); g.append(q)
            for e_ in q.link_edges:
                t_ = e_.other_vert(q)
                if t_ not in seen: seen.add(t_); st.append(t_)
        shells.append(g)
    main = max(shells, key=len)
    for g in shells:
        if g is not main: bmesh.ops.delete(bm, geom=g, context="VERTS")
    ring = max((c_ for c_ in boundary_loops(bm) if sum(v_.co.z for v_ in c_) / len(c_) < 1.1), key=len)
    # Cutting the floor away leaves a ragged line: it becomes one clean curve, and the row above it eases to meet it.
    P = np.array([v_.co[:] for v_ in ring])
    for _ in range(40): P = (np.roll(P, 1, 0) + P * 2 + np.roll(P, -1, 0)) / 4
    for v_, q in zip(ring, P): v_.co = Vector(q.tolist())
    rim = set(ring)
    band = {}
    last = set(ring)
    for d_ in range(1, 7):
        nxt = {e.other_vert(v_) for v_ in last for e in v_.link_edges} - rim - set(band)
        for v_ in nxt: band[v_] = 1 - (d_ - 1) / 6
        last = nxt
    for _ in range(14):
        new = {v_: sum((e.other_vert(v_).co for e in v_.link_edges), Vector()) / len(v_.link_edges) for v_ in band}
        for v_, c_ in new.items(): v_.co = v_.co.lerp(c_, .5 * band[v_])
    edges = list({e for v_ in ring for e in v_.link_edges if e.is_boundary})
    for dr, dz in ((.0035, -.0004), (.0012, .022)):
        r = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        edges = [g for g in r["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
        for v_ in nv:
            d = Vector((v_.co.x, v_.co.y - cy, 0)); d.normalize()
            v_.co = v_.co - d * dr + Vector((0, 0, dz))
    print("HEM floor faces gone", len(gone), "ring", len(ring))
    bm.to_mesh(o.data); bm.free(); o.data.update()


def make_arm(hand, J, n):
    """Grows the arm out of the hand's wrist ring, so hand and arm are one surface with clean rings at the elbow."""
    bm = bmesh.new(); bm.from_mesh(hand.data); bm.verts.ensure_lookup_table()
    dv = bm.verts.layers.deform.verify()
    chain = sorted(boundary_loops(bm), key=len, reverse=True)[0]
    ring0 = np.array([v.co[:] for v in chain])
    c0 = ring0.mean(0)
    sh, el, wr = J[n + "Arm"], J[n + "ForeArm"], J[n + "Hand"]
    axis = (sh - wr) / np.linalg.norm(sh - wr)
    # A frame around the arm: b1 points back (+Y), b2 up.
    b1 = np.cross(np.array([0, 0, 1.]), axis); b1 *= np.sign(b1[1]) / np.linalg.norm(b1)
    b2 = np.cross(axis, b1); b2 *= np.sign(b2[2])
    L_fore = float(np.linalg.norm(el - wr)); L_up = float(np.linalg.norm(sh - el))
    # Radii from the reference photos: distance from the wrist, radius back-front, radius up-down.
    prof = np.array([
        [0, 0, 0], [.05, .036, .030], [.10, .041, .034], [L_fore - .09, .046, .040], [L_fore - .04, .045, .042],
        [L_fore, .041, .040], [L_fore + .05, .044, .046], [L_fore + .11, .049, .052], [L_fore + .16, .049, .052], [L_fore + .19, .043, .044]])
    rel = ring0 - c0
    th = np.arctan2(rel @ b2, rel @ b1); r0 = np.hypot(rel @ b1, rel @ b2)
    prof[0, 1] = np.abs(rel @ b1).max(); prof[0, 2] = np.abs(rel @ b2).max()
    D = np.concatenate([np.linspace(0, .12, 8)[:-1], np.linspace(.12, L_fore - .06, 7)[:-1], np.linspace(L_fore - .06, L_fore + .06, 8)[:-1], np.linspace(L_fore + .06, prof[-1, 0], 13)])
    groups = {g.name: g.index for g in hand.vertex_groups}
    for nm in (n + "Hand", n + "ForeArm", n + "Arm"):
        if nm not in groups: groups[nm] = hand.vertex_groups.new(name=nm).index
    prev = list(chain)
    for d in D[1:]:
        ry = np.interp(d, prof[:, 0], prof[:, 1]); rz = np.interp(d, prof[:, 0], prof[:, 2])
        c = c0 + axis * d
        c = c + (wr + axis * d - c) * float(smoothstep(0, .1, np.array(d)))
        ell = 1 / np.sqrt((np.cos(th) / ry) ** 2 + (np.sin(th) / rz) ** 2)
        k = float(smoothstep(0, .06, np.array(d)))
        rr = r0 * (ry / prof[0, 1] * .5 + rz / prof[0, 2] * .5) * (1 - k) + ell * k
        rr = rr + .007 * np.exp(-((d - L_fore) / .022) ** 2) * np.exp(-(th / .7) ** 2)       # the point of the elbow, on the +Y side
        rr = rr + .004 * np.exp(-((d - (L_fore - .09)) / .05) ** 2) * np.cos(th - 2.2) ** 2  # forearm muscle
        w_h = 1 - float(smoothstep(0, .045, np.array(d))); w_u = float(smoothstep(L_fore - .05, L_fore + .05, np.array(d)))
        cur = []
        for i in range(len(chain)):
            p = c + (b1 * math.cos(th[i]) + b2 * math.sin(th[i])) * rr[i]
            v = bm.verts.new(p.tolist()); cur.append(v)
            v[dv][groups[n + "Hand"]] = w_h; v[dv][groups[n + "ForeArm"]] = (1 - w_h) * (1 - w_u); v[dv][groups[n + "Arm"]] = w_u
        for i in range(len(chain)):
            j = (i + 1) % len(chain)
            bm.faces.new((prev[i], prev[j], cur[j], cur[i]))
        prev = cur
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    n0 = len(hand.data.vertices)
    bm.to_mesh(hand.data); bm.free(); hand.data.update()
    m_ = np.zeros(len(hand.data.vertices)); m_[n0:] = 1
    vv_ = co(hand)
    m_[:n0] = smoothstep(.04, .015, np.linalg.norm(vv_[:n0] - c0, axis=1))    # the last of the hand relaxes into the arm too
    set_co(hand, laplace(vv_, edges_of(hand), 12, .5, m_))


def make_foot(J, side, n, name):
    """A bare foot: heel-to-ball loft and five toes as one voxel-remeshed surface, sole flat on the floor."""
    an = J[n + "Foot"]
    bm = bmesh.new()
    # Stations from heel to ball: y from the ankle (forward is -Y), half width, height of the top, centre shift.
    st = [(.070, .012, .012, 0), (.062, .028, .040, 0), (.040, .033, .062, 0), (.010, .033, .078, 0), (-.030, .035, .072, .002), (-.075, .041, .052, .004), (-.115, .047, .036, .004), (-.145, .047, .027, .004), (-.165, .040, .020, .004)]
    N = 28; rings = []
    for y, w, h, cx in st:
        ring = []
        for i in range(N):
            t = i / N * 2 * math.pi
            x = cx + w * math.copysign(abs(math.cos(t)) ** .7, math.cos(t))
            sn = math.sin(t)
            z = (sn * h if sn > 0 else sn * .006) + .007
            ring.append(bm.verts.new((x, y, max(z, .001))))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(N):
            j = (i + 1) % N
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    # The ankle: a tube into the jeans.
    for z0, z1, r0_, r1_ in ((.03, .13, .036, .032), (.13, .20, .032, .030)):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r0_, radius2=r1_, depth=z1 - z0, matrix=Matrix.Translation((0, .012, (z0 + z1) / 2)))
    # Toes: x, y start, y end, radius, height. +x is the big-toe side.
    for x, y0, y1, r, h in ((.031, -.15, -.215, .0135, .019), (.0065, -.16, -.205, .0095, .015), (-.0125, -.155, -.197, .0088, .014), (-.029, -.148, -.186, .0082, .013), (-.043, -.135, -.170, .0078, .012)):
        for f, rr in ((0, r), (.5, r * .94), (1, r)):
            bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=rr, matrix=Matrix.Translation((x, y0 + (y1 - y0) * f, h - .004 * f)))
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=r * .96, radius2=r * .96, depth=abs(y1 - y0), matrix=Matrix.Translation((x, (y0 + y1) / 2, h - .002)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    m = o.modifiers.new("v", "REMESH"); m.mode = "VOXEL"; m.voxel_size = .0052; m.use_smooth_shade = True
    activate(o); bpy.ops.object.modifier_apply(modifier="v")
    v = laplace(co(o), edges_of(o), 5, .5)
    # The big toe goes on the inner side: toward -X on his left foot, +X on his right.
    if side > 0: v[:, 0] *= -1
    t = math.radians(9) * side          # feet turned out a little
    c, s_ = math.cos(t), math.sin(t)
    xy = v[:, :2].copy()
    v[:, 0] = c * xy[:, 0] - s_ * xy[:, 1] + an[0]; v[:, 1] = s_ * xy[:, 0] + c * xy[:, 1] + an[1]
    v[:, 2] = np.maximum(v[:, 2], 0)
    set_co(o, v)
    if side > 0:   # the mirror turned the surface inside out
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    toe = J[n + "ToeBase"]
    gF = o.vertex_groups.new(name=n + "Foot"); gT = o.vertex_groups.new(name=n + "ToeBase"); gL = o.vertex_groups.new(name=n + "Leg")
    f = (toe - an)[:2]; fl = float(np.linalg.norm(f)); f = f / fl
    along = (v[:, :2] - an[:2]) @ f
    wt = smoothstep(fl - .025, fl + .02, along)
    wl = smoothstep(an[2] + .01, an[2] + .06, v[:, 2])
    for i in range(len(v)):
        if wl[i] > 0: gL.add([i], float(wl[i]), "REPLACE")
        if wt[i] > 0: gT.add([i], float(wt[i] * (1 - wl[i])), "REPLACE")
        gF.add([i], float((1 - wt[i]) * (1 - wl[i])), "REPLACE")
    return o


# Sculpted cloth. Each crease is drawn by hand as a line on the front or back of him (x, z in metres), the way a sculptor
# would: drag lines from the armpits, compression at the hem, whiskers at the hip, stacking at the knee and ankle.
SHIRT_FOLDS = {
    "front": [([(.17, 1.33), (.10, 1.20), (.03, 1.10)], 1), ([(-.17, 1.33), (-.12, 1.22), (-.05, 1.14)], 1), ([(.19, 1.22), (.12, 1.12), (.06, 1.03)], .9),
              ([(-.19, 1.18), (-.11, 1.08), (-.02, 1.00)], .9), ([(.12, 1.03), (.13, .95), (.12, .885)], .8), ([(-.09, 1.02), (-.10, .95), (-.11, .885)], .8),
              ([(.02, .99), (.0, .93), (.015, .885)], .6), ([(.20, 1.46), (.12, 1.39), (.05, 1.36)], .5), ([(-.20, 1.46), (-.13, 1.40), (-.07, 1.38)], .5),
              ([(.18, 1.08), (.10, 1.01), (.03, .97)], .7), ([(-.18, 1.04), (-.06, .97)], .6)],
    "back": [([(.17, 1.30), (.05, 1.15)], .9), ([(-.17, 1.28), (-.06, 1.13)], .9), ([(.10, 1.40), (.13, 1.25)], .6), ([(-.10, 1.40), (-.14, 1.26)], .6),
             ([(-.17, 1.02), (0, .985), (.17, 1.03)], .8), ([(.10, 1.0), (.12, .885)], .7), ([(-.12, .99), (-.10, .885)], .7), ([(.0, 1.2), (.03, 1.05), (.0, .95)], .5)],
}
_J = [([(.03, .80), (.09, .86), (.16, .90)], .9), ([(.03, .77), (.10, .80), (.17, .84)], .9), ([(.05, .70), (.12, .73), (.19, .72)], .5),
      ([(.06, .53), (.12, .51), (.18, .53)], .9), ([(.07, .48), (.13, .45), (.19, .48)], .8), ([(.09, .41), (.15, .38), (.20, .36)], .5),
      ([(.08, .31), (.13, .26), (.18, .23)], .7), ([(.17, .33), (.13, .28), (.11, .24)], .4), ([(.08, .19), (.14, .165), (.20, .19)], 1), ([(.09, .15), (.15, .125), (.21, .15)], 1.1)]
_B = [([(.07, .52), (.13, .55), (.19, .52)], 1), ([(.07, .47), (.13, .51), (.19, .47)], 1.2), ([(.08, .43), (.13, .46), (.18, .42)], .8),
      ([(.03, .755), (.10, .725), (.18, .76)], .9), ([(.05, .70), (.11, .68), (.17, .70)], .6), ([(.08, .19), (.14, .16), (.20, .185)], 1), ([(.09, .145), (.15, .125), (.21, .15)], 1)]
JEAN_FOLDS = {"front": _J + [([(-x * .96, z + .012) for x, z in l], k * .9) for l, k in _J], "back": _B + [([(-x * 1.03, z - .01) for x, z in l], k) for l, k in _B]}


def fold_field(P, lines, width, amp):
    """Height at each (x, z): a sharp ridge with a soft valley on one side, fading out at both ends of each line."""
    H = np.zeros(len(P))
    for pts, k in lines:
        pts = np.array(pts)
        L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
        S = np.linspace(0, L[-1], 40)
        Q = np.c_[np.interp(S, L, pts[:, 0]), np.interp(S, L, pts[:, 1])]
        d2 = ((P[:, None] - Q[None]) ** 2).sum(2)
        j = d2.argmin(1); d = np.sqrt(d2[np.arange(len(P)), j])
        tn = 1 - (2 * S[j] / L[-1] - 1) ** 4
        tang = Q[np.minimum(j + 1, 39)] - Q[np.maximum(j - 1, 0)]
        sgn = np.sign((P[:, 0] - Q[j, 0]) * -tang[:, 1] + (P[:, 1] - Q[j, 1]) * tang[:, 0])
        w = width * (.75 + .5 * k)
        H += amp * k * tn * (np.exp(-(d / w) ** 2) - .55 * np.exp(-((d - 1.9 * w) / (w * 1.3)) ** 2) * (sgn > 0))
    return H


def apply_folds(o, folds, width, amp):
    v = co(o); n = np.zeros(len(v) * 3); o.data.vertex_normals.foreach_get("vector", n); n = n.reshape(-1, 3)
    P = np.c_[v[:, 0] + .012 * np.sin(v[:, 2] * 17 + 1.3) + .007 * np.sin(v[:, 2] * 41), v[:, 2] + .009 * np.sin(v[:, 0] * 23) + .004 * np.sin(v[:, 0] * 57 + 2)]
    fm = smoothstep(.0, .3, -n[:, 1]); bk = smoothstep(.0, .3, n[:, 1])
    h = fold_field(P, folds["front"], width, amp) * fm + fold_field(P, folds["back"], width, amp) * bk
    return v, n, h


def stage_build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts, J = import_parts("Ch08_nonPBR.fbx", ("Body",))
    cloth, J2 = import_parts("Ch31_nonPBR.fbx", ("Sweater", "Pants"))
    print("JOINT DIFF", {k: round(float(np.linalg.norm(J[k] - J2[k])), 3) for k in ("Hips", "LeftArm", "LeftHand", "LeftUpLeg", "LeftFoot", "Neck", "Head")})
    print("JOINTS", {k: J[k].round(3).tolist() for k in ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase")})
    body = parts["Body"]; shirt = cloth["Sweater"]; jeans = cloth["Pants"]
    body.name = "Skin"; shirt.name = "Shirt"; jeans.name = "Jeans"

    # Split the Mixamo body into head and hands; the ankle stubs go.
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < .3], context="VERTS")
    bm.to_mesh(body.data); bm.free()
    v = co(body)
    # The head: refit it to the face in the reference image, front on. The depth stays.
    ids = np.where((v[:, 2] > 1.42) & (np.abs(v[:, 0]) < .3))[0]
    src = np.array([p[0] for p in FACE_POINTS]); dst = np.array([p[1] for p in FACE_POINTS])
    fit = tps_fit(src, dst)
    v[ids, 0], v[ids, 2] = tps_apply(fit, v[ids][:, [0, 2]]).T
    # A grown man's bones, in depth: stronger chin and brow, a longer nose, hollow cheeks, a corner to the jaw.
    h_ = v[ids]
    def bump(cx, cz, sx, sz): return np.exp(-((np.abs(h_[:, 0]) - cx) / sx) ** 2 - ((h_[:, 2] - cz) / sz) ** 2)
    front = smoothstep(.03, -.04, h_[:, 1])
    h_[:, 1] -= (.011 * bump(0, 1.545, .032, .024) + .0045 * bump(0, 1.62, .014, .022) + .003 * bump(.03, 1.688, .03, .012)) * front
    sg = np.sign(h_[:, 0])
    h_[:, 0] -= sg * .0055 * bump(.058, 1.592, .02, .022) * front
    h_[:, 0] += sg * .0035 * bump(.066, 1.562, .016, .018)
    h_[:, 1] += .004 * bump(.058, 1.592, .02, .022) * front
    v[ids] = h_
    # The refit leaves the nostrils as deep pits that read as black holes from below. Most of the depth goes.
    ny_ = float(v[(np.abs(v[:, 0]) < .004) & (np.abs(v[:, 2] - 1.62) < .01)][:, 1].min()) + .02
    m_ = np.exp(-((np.abs(v[:, 0]) - .0115) / .012) ** 2 - ((v[:, 2] - 1.612) / .012) ** 2 - ((v[:, 1] - ny_) / .016) ** 2)
    v = laplace(v, edges_of(body), 14, .5, m_)
    set_co(body, v)

    # Eyes: the Mixamo caps are shallow and the refit flattened them, which spreads any highlight into a white glare.
    # They become real spheres with a small cornea.
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    seen = set()
    for s0 in bm.verts:
        if s0.index in seen: continue
        st = [s0]; seen.add(s0.index); ids_ = []
        while st:
            q = st.pop(); ids_.append(q.index)
            for e_ in q.link_edges:
                t_ = e_.other_vert(q)
                if t_.index not in seen: seen.add(t_.index); st.append(t_)
        if len(ids_) < 1000 and np.mean([bm.verts[i].co.z for i in ids_]) > 1.6:
            ex = EYE_L if np.mean([bm.verts[i].co.x for i in ids_]) > 0 else EYE_R
            c_ = Vector((ex[0], EYE_Y, ex[1]))
            for i in ids_:
                d_ = bm.verts[i].co - c_
                d_.normalize()
                lat = math.hypot(d_.x, d_.z) * EYE_RAD
                bm.verts[i].co = c_ + d_ * (EYE_RAD + .0011 * math.exp(-(lat / .0058) ** 2) * (d_.y < 0))
    bm.to_mesh(body.data); bm.free(); body.data.update()

    # The neck goes down into the collar and widens into the shoulders, so there is no gap in the crew neck.
    bm = bmesh.new(); bm.from_mesh(body.data)
    ring = max((c for c in boundary_loops(bm) if sum(v_.co.z for v_ in c) / len(c) < 1.56 and sum(abs(v_.co.x) for v_ in c) / len(c) < .2), key=len)
    edges = list({e_ for v_ in ring for e_ in v_.link_edges if e_.is_boundary})
    c = sum((v_.co for v_ in ring), Vector()) / len(ring)
    for dz, k in ((-.03, 1.12), (-.03, 1.22), (-.03, 1.26)):
        r = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        edges = [g for g in r["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
        for v_ in nv:
            d = v_.co - c
            v_.co = Vector((c.x + d.x * k, c.y + d.y * k * .92, v_.co.z + dz))
        c = c + Vector((0, 0, dz))
    bm.to_mesh(body.data); bm.free(); body.data.update()

    # Hands: arms grown from the wrists.
    def split(obj, test, name):
        activate(obj); bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
        for p in obj.data.polygons: p.select = test(p.center)
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
        o2 = [o for o in bpy.context.selected_objects if o != obj][0]
        o2.name = name
        return o2
    arms = {}
    for side, sign in SIDES:
        h = split(body, lambda c: c.x * sign > .3, "Hand" + side)
        make_arm(h, J, side)
        arms[side] = co(h)

    # The top: smooth away the sweater's pocket and rib, then lengthen it to a T-shirt that hangs to the hip.
    subdivide(shirt, 1); subdivide(jeans, 1)
    v = laplace(co(shirt), edges_of(shirt), 26, .5)
    e = edges_of(shirt)
    v_j = laplace(co(jeans), edges_of(jeans), 16, .5)
    set_co(jeans, v_j)
    # Below the ribs the sweater's rib and pocket are gone: the cloth hangs straight from the ribs to a hem around the hips.
    set_co(shirt, v)
    zr, zhem, zlow = 1.14, .89, v[:, 2].min()
    tree_s = BVHTree.FromObject(shirt, bpy.context.evaluated_depsgraph_get())
    tree_j = BVHTree.FromObject(jeans, bpy.context.evaluated_depsgraph_get())
    cy = float(v_j[v_j[:, 2] > .9][:, 1].mean())
    TH = np.linspace(-math.pi, math.pi, 73)
    def polar(tree, z):
        r = np.zeros(len(TH))
        for i, t in enumerate(TH):
            d = Vector((math.cos(t), math.sin(t), 0)); c = Vector((0, cy, z))
            h = tree.ray_cast(c + d * .5, -d, .5)
            r[i] = .5 - h[3] if h[0] is not None else 0
        return r
    R_top = polar(tree_s, zr); R_hip = polar(tree_j, .93) + .016
    R_hip = np.maximum(R_hip, R_top * .96)
    for i in np.where(v[:, 2] < zr)[0]:
        t = math.atan2(v[i, 1] - cy, v[i, 0]); r = math.hypot(v[i, 0], v[i, 1] - cy)
        z = zr - (zr - v[i, 2]) * (zr - zhem) / (zr - zlow)
        k = float(smoothstep(zr, zhem + .08, np.array(z)))
        want = np.interp(t, TH, R_top) * (1 - k) + np.interp(t, TH, R_hip) * k
        # the rolled lining keeps its place just inside the surface
        d = Vector((math.cos(t), math.sin(t), 0)); h = tree_s.ray_cast(Vector((0, cy, v[i, 2])) + d * .5, -d, .5)
        outer = .5 - h[3] if h[0] is not None else r
        rn = want * min(r / max(outer, .02), 1)
        v[i, 0], v[i, 1], v[i, 2] = rn * math.cos(t), cy + rn * math.sin(t), z
    # Sleeves: the armhole keeps the top's own ease, then the cloth settles onto the arm and follows it down to the hem,
    # SLEEVE_GAP off the skin, measured from the arm itself rather than a fixed tube.
    for side, sign in SIDES:
        sh, wr = J[side + "Arm"], J[side + "Hand"]
        idx = np.where((v[:, 0] * sign > .24) & (v[:, 0] * sign < HEM_X + .03))[0]
        xs = np.abs(v[idx, 0]); bins = np.arange(.24, HEM_X + .04, .02)
        box = [v[idx[np.abs(xs - b_) < .012]][:, 1:] for b_ in bins]              # centre and half size by extent: rows are uneven, so a mean drifts
        cz = np.array([(q_.max(0) + q_.min(0)) / 2 for q_ in box])
        rad = np.array([(q_.max(0) - q_.min(0)) / 2 for q_ in box])
        ar = arms[side]; ar = ar[(ar[:, 0] * sign > .26) & (ar[:, 0] * sign < .55)]
        def ax_(x): return sh[1:] + (wr - sh)[1:] * (x - abs(sh[0])) / (abs(wr[0]) - abs(sh[0]))
        ra = []                                                                  # the arm's half width and depth at each bin
        for b_ in bins:
            q_ = ar[np.abs(np.abs(ar[:, 0]) - b_) < .014]
            ra.append(np.abs(q_[:, 1:] - ax_(b_)).max(0) if len(q_) else (ra[-1] if ra else np.array([.04, .04])))
        ra = np.array(ra)
        ra[:3] = ra[3]                                                           # above the end of the skin: as at its fullest
        for _ in range(3): ra[1:-1] = (ra[:-2] + ra[1:-1] * 2 + ra[2:]) / 4
        for i in idx:
            x = abs(v[i, 0]); c_ = np.array([np.interp(x, bins, cz[:, 0]), np.interp(x, bins, cz[:, 1])])
            r_ = np.array([np.interp(x, bins, rad[:, 0]), np.interp(x, bins, rad[:, 1])])
            t = float(smoothstep(.245, .335, np.array(x)))
            gap = np.interp(x, (.3, HEM_X), SLEEVE_GAP)
            R_ = np.array([np.interp(x, bins, ra[:, 0]), np.interp(x, bins, ra[:, 1])]) + gap
            R_ = R_ - .003 * float(smoothstep(HEM_X - .010, HEM_X, np.array(x))) ** 2       # the folded edge turns in
            ang = math.atan2((v[i, 2] - c_[1]) / r_[1], (v[i, 1] - c_[0]) / r_[0])    # a clean ring: the sweater's lumps go
            q = ax_(x) + np.array([math.cos(ang), math.sin(ang)]) * R_
            q[1] -= .002     # the sleeve hangs a little on the arm
            v[i, 1:] = v[i, 1:] * (1 - t) + q * t
    set_co(shirt, v)

    # Sleeves cut to T-shirt length, jeans to the ankle.
    bm = bmesh.new(); bm.from_mesh(shirt.data)
    for s_ in (1, -1):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(s_ * HEM_X, 0, 0), plane_no=(s_, 0, 0), clear_outer=True)
    bm.to_mesh(shirt.data); bm.free()
    soft_hem(shirt, arms)
    open_neck(shirt)
    lip(jeans, lambda c: c.z < .3, .62)

    open_hem(shirt)
    # The sweater's rib left a ridge across the back at the height of its old hem, folded over on itself in a pleat on his right
    # side: a black slit in any hard light. The band is relaxed until the pleat opens, then the creases go on.
    v = co(shirt); z_ = v[:, 2]
    set_co(shirt, laplace(v, edges_of(shirt), 45, .5, smoothstep(.945, .985, z_) * smoothstep(1.21, 1.12, z_) * (np.abs(v[:, 0]) < .24)))
    # A step can't be smoothed away, so the band is laid again: rows even out in height, and the cloth sits on the straight fall
    # from a clean contour at the ribs to one at the hips.
    v = co(shirt); e_s = edges_of(shirt)
    cy_ = float(v[v[:, 2] < 1.05][:, 1].mean())
    tree_ = tree_of(shirt)
    TH_B = np.linspace(-math.pi, math.pi, 97)
    def contour(z):
        r = []
        for t in TH_B:
            d = Vector((math.cos(t), math.sin(t), 0)); h = tree_.ray_cast(Vector((0, cy_, z)) + d * .5, -d, .5)
            r.append(.5 - h[3] if h[0] is not None else float("nan"))
        r = np.array(r); ok = ~np.isnan(r); r = np.interp(TH_B, TH_B[ok], r[ok])
        for _ in range(6): r[1:-1] = (r[:-2] + r[1:-1] * 2 + r[2:]) / 4
        return r
    R_lo, R_hi = contour(.965), contour(1.19)
    m_b = smoothstep(.945, .975, v[:, 2]) * smoothstep(1.205, 1.165, v[:, 2])
    z_ = v[:, 2].copy()
    acc_z = lambda q: laplace(np.dstack([q, q, q])[0], e_s, 1, .5, m_b)[:, 0]
    for _ in range(60): z_ = acc_z(z_)
    th_b = np.arctan2(v[:, 1] - cy_, v[:, 0])
    t_b = smoothstep(.965, 1.19, np.clip(z_, .965, 1.19))
    r_new = np.interp(th_b, TH_B, R_lo) * (1 - t_b) + np.interp(th_b, TH_B, R_hi) * t_b
    r_old = np.hypot(v[:, 0], v[:, 1] - cy_); r_b = r_old + (r_new - r_old) * m_b
    v[:, 0] = r_b * np.cos(th_b); v[:, 1] = cy_ + r_b * np.sin(th_b); v[:, 2] = z_
    set_co(shirt, v)

    # Sculpt the creases into the real surface.
    v, n, h = apply_folds(shirt, SHIRT_FOLDS, .010, .0072)
    # Sleeves: soft rings where the cloth bunches under the arm.
    for side, sign in SIDES:
        sl = np.clip((np.abs(v[:, 0]) - .24) / .06, 0, 1) * (v[:, 0] * sign > 0)
        under = smoothstep(.1, -.5, n[:, 2])
        phi = np.abs(v[:, 0]) * 95 + 1.2 * np.sin(v[:, 1] * 30) + (sign > 0) * 1.3
        h += sl * (.0005 + .0016 * under) * (np.abs(np.sin(phi)) ** .5 * 2 - 1.2) * (1 - smoothstep(HEM_X - .035, HEM_X, np.abs(v[:, 0])))
    # A real rib collar: a raised band around the neck opening with a sewn line at its edge.
    cc = np.array([0, v[v[:, 2] > 1.45][:, 1].mean()])
    rr = np.hypot(v[:, 0] - cc[0], v[:, 1] - cc[1]); th_ = np.arctan2(v[:, 1] - cc[1], v[:, 0] - cc[0])
    bins_ = ((th_ + math.pi) / (2 * math.pi) * 72).astype(int) % 72
    top_ = v[:, 2] > 1.40
    R_ = np.array([rr[top_ & (bins_ == b_)].min() if (top_ & (bins_ == b_)).any() else .08 for b_ in range(72)])
    for _ in range(4): R_ = (np.roll(R_, 1) + R_ * 2 + np.roll(R_, -1)) / 4
    Ze_ = np.array([v[top_ & (bins_ == b_) & (rr < R_[b_] + .016), 2].max() if (top_ & (bins_ == b_) & (rr < R_[b_] + .016)).any() else 1.47 for b_ in range(72)])
    for _ in range(4): Ze_ = (np.roll(Ze_, 1) + Ze_ * 2 + np.roll(Ze_, -1)) / 4
    TH_ = np.linspace(-math.pi, math.pi, 73)[:-1] + math.pi / 72
    d_ = np.hypot(np.maximum(rr - np.interp(th_, TH_, R_, period=2 * math.pi), 0), np.maximum(np.interp(th_, TH_, Ze_, period=2 * math.pi) - v[:, 2], 0))
    band = top_ * (n[:, 2] > -.2)
    h += band * (.0017 * smoothstep(.0, .0025, d_) * smoothstep(.0235, .0205, d_) - .0011 * np.exp(-((d_ - .0245) / .0013) ** 2))
    json.dump({"c": cc.tolist(), "R": R_.tolist(), "Z": Ze_.tolist()}, open(os.path.join(WORK, "collar.json"), "w"))
    # Loose jersey: a slow wander so nothing is mechanically smooth.
    h += .0016 * np.sin(v[:, 2] * 19 + v[:, 0] * 11) * np.sin(v[:, 0] * 13 - v[:, 1] * 15 + 1)
    v = v + n * h[:, None]
    # No crease may press the sleeve through the arm: push cloth out along the arm's radius until it clears the skin.
    for side, sign in SIDES:
        sh, wr = J[side + "Arm"], J[side + "Hand"]; ar = arms[side]
        ar = ar[(ar[:, 0] * sign > .25) & (ar[:, 0] * sign < HEM_X + .03)]
        for i in np.where((v[:, 0] * sign > .28) & (v[:, 0] * sign < HEM_X))[0]:
            x = abs(v[i, 0]); c_ = sh[1:] + (wr - sh)[1:] * (x - abs(sh[0])) / (abs(wr[0]) - abs(sh[0]))
            d_ = v[i, 1:] - c_; r_ = np.linalg.norm(d_)
            near = ar[np.abs(np.abs(ar[:, 0]) - x) < .01][:, 1:] - c_
            if len(near) == 0: continue
            lim = float((near @ (d_ / r_)).max()) + .006
            if r_ < lim: v[i, 1:] = c_ + d_ * (lim / r_)
    set_co(shirt, v)
    v, n, h = apply_folds(jeans, JEAN_FOLDS, .009, .0062)
    h += .0012 * np.sin(v[:, 2] * 23 + v[:, 0] * 9) * np.sin(v[:, 1] * 19 + 1)
    set_co(jeans, v + n * h[:, None])

    fit_neck(body, shirt)
    for n, s_ in SIDES: make_foot(J, s_, n, "Foot" + n)

    # Materials: 0 body, 1 head.
    mb = bpy.data.materials.new("Body"); mh = bpy.data.materials.new("Head")
    pids = {"Skin": 0, "HandLeft": 1, "HandRight": 1, "FootLeft": 2, "FootRight": 2, "Shirt": 3, "Jeans": 4}
    for o in list(bpy.data.objects):
        if o.type != "MESH": continue
        o.data.materials.clear()
        o.data.materials.append(mb); o.data.materials.append(mh)
        for p in o.data.polygons:
            p.material_index = 1 if o.name == "Skin" else 0
            p.use_smooth = True
        at = o.data.attributes.new("part", "INT", "POINT")
        at.data.foreach_set("value", [pids[o.name]] * len(o.data.vertices))
    json.dump({k: list(map(float, x)) for k, x in J.items()}, open(os.path.join(WORK, "joints.json"), "w"))
    json.dump({k: list(map(float, x)) for k, x in J2.items()}, open(os.path.join(WORK, "joints2.json"), "w"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "build.blend"))
    print("BUILD", {o.name: len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH"})


def quick(name, cams, res=(700, 900)):
    s = bpy.context.scene; s.render.engine = "BLENDER_WORKBENCH"; s.render.resolution_x, s.render.resolution_y = res
    s.display.shading.light = "STUDIO"; s.display.shading.show_cavity = False
    c = bpy.data.objects.get("qc") or bpy.data.objects.new("qc", bpy.data.cameras.new("qc"))
    if c.name not in s.collection.objects: s.collection.objects.link(c)
    s.camera = c; c.data.type = "ORTHO"
    for tag, loc, tgt, sc in cams:
        c.data.ortho_scale = sc; c.location = loc
        c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        s.render.filepath = os.path.join(WORK, "q", name + "_" + tag + ".png"); bpy.ops.render.render(write_still=True)


# ---- Rig: one skinned mesh, two materials, the Humanoid bone names the video already uses.
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")


def bone_table():
    t = {"Hips": "Hips", "Spine": "Spine", "Spine1": "Chest", "Spine2": "Chest", "Neck": "Neck", "Head": "Head", "HeadTop_End": "Head"}
    for n, _ in SIDES:
        t.update({n + "Shoulder": n + "Shoulder", n + "Arm": n + "UpperArm", n + "ForeArm": n + "LowerArm", n + "Hand": n + "Hand",
                  n + "UpLeg": n + "UpperLeg", n + "Leg": n + "LowerLeg", n + "Foot": n + "Foot", n + "ToeBase": n + "Toes", n + "Toe_End": n + "Toes"})
        for f in FINGERS:
            for i in (1, 2, 3, 4):
                t[f"{n}Hand{f}{i}"] = f"{n}Hand{f}{min(i, 3)}"
    return t


def shoulder_weights(ob, W, J):
    """The cloth across each shoulder, reweighted so a raised or lowered arm rolls through the shoulder. The Mixamo weights were
    painted for a sweater with a far wider sleeve, and they end in a hard line right at the arm joint.
    Upper arm takes over along the arm, in a band that is wide over the deltoid and narrow under the armpit, so the top of the
    shoulder rounds and the side of the chest stays put. What is left goes to the collarbone toward the arm and to the chest
    toward the neck. Then the result is smoothed over the surface, so no vertex row stands out as a crease."""
    v = co(ob); e = edges_of(ob); n_v = len(v)
    part = np.zeros(n_v, int); ob.data.attributes["part"].data.foreach_get("value", part)
    cloth = part == 3
    ee = e[cloth[e[:, 0]] & cloth[e[:, 1]]]
    for n, s in SIDES:
        mir = np.array([s, 1, 1.])
        sh = J[n + "Arm"] * mir; el = J[n + "ForeArm"] * mir
        ax = (el - sh) / np.linalg.norm(el - sh)
        pm = v * mir; p = pm - sh
        t = p @ ax; perp = p - t[:, None] * ax
        up = perp[:, 2] / np.maximum(np.linalg.norm(perp, axis=1), 1e-6)     # 1 on top of the arm, -1 under it
        u = (up + 1) / 2
        a0 = -.018 + (-.080 + .018) * u; b0 = .042 + (.060 - .042) * u
        S = smoothstep(a0, b0, t)
        M = smoothstep(.05, .13, pm[:, 0]) * smoothstep(1.22, 1.32, pm[:, 2]) * cloth * (pm[:, 0] > 0)
        Cw = smoothstep(.06, .19, pm[:, 0]) * smoothstep(1.26, 1.39, pm[:, 2])
        ua, sg = n + "UpperArm", n + "Shoulder"
        ids = np.where(M > 0)[0]
        names = sorted({k for i in ids for k, _ in W[i]} | {ua, sg, "Chest"})
        col = {k: i_ for i_, k in enumerate(names)}
        A = np.zeros((n_v, len(names)), np.float32)
        for i in ids:
            for k, w in W[i]: A[i, col[k]] = w
        for i in ids:
            o_ = {k: w for k, w in W[i] if k not in (ua, sg, n + "LowerArm", n + "Hand")}
            tot = sum(o_.values())
            if tot <= 0: o_ = {"Chest": 1.}; tot = 1.
            new = np.zeros(len(names), np.float32)
            new[col[ua]] = S[i]; new[col[sg]] = (1 - S[i]) * Cw[i]
            for k, w in o_.items(): new[col[k]] += (1 - S[i]) * (1 - Cw[i]) * w / tot
            A[i] = A[i] * (1 - M[i]) + new * M[i]
        for _ in range(5):        # smooth over the surface, inside the region only
            acc = np.zeros_like(A); cnt = np.zeros(n_v, np.float32)
            np.add.at(acc, ee[:, 0], A[ee[:, 1]]); np.add.at(acc, ee[:, 1], A[ee[:, 0]])
            np.add.at(cnt, ee[:, 0], 1); np.add.at(cnt, ee[:, 1], 1)
            d = acc / np.maximum(cnt, 1)[:, None] - A
            A[ids] += (d * (M * .5)[:, None])[ids]
        for i in ids:
            top = np.argsort(-A[i])[:4]; tot = float(A[i, top].sum())
            W[i] = [(names[j], float(A[i, j]) / tot) for j in top if A[i, j] / tot > .01]


def core_weights(ob, W, J):
    """The trunk. Shirt and jeans used to come from two characters with their own weights, so at the waist they moved apart and the
    jeans came out through the shirt; and hips, spine and chest met in short bands, so a hard bend pinched the waist.
    Now both layers read one gradient of height: Hips to spine over the whole lumbar, spine to chest over the ribs, with each joint in the
    middle of its band. Below the top of the jeans it is all Hips, so shirt hem and waistband are one.
    The collar is on the chest only, and the neck's base inside the shirt follows it, so it can't swing out through the cloth."""
    v = co(ob); n_v = len(v)
    part = np.zeros(n_v, int); ob.data.attributes["part"].data.foreach_get("value", part)
    z = v[:, 2]
    wh = 1 - smoothstep(1.01, 1.17, z); wc = smoothstep(1.14, 1.34, z); ws = 1 - wh - wc
    TRUNK = ("Hips", "Spine", "Chest")
    for i in np.where((part == 3) | ((part == 4) & (z > .86)))[0]:
        d = dict(W[i]); tot = sum(d.get(k, 0) for k in TRUNK)
        if part[i] == 3:
            tot += d.pop("Neck", 0) + d.pop("Head", 0)
            if not d and tot == 0: tot = 1.
        if tot <= 0: continue
        for k, w in zip(TRUNK, (wh[i], ws[i], wc[i])):
            d[k] = w * tot
        d = {k: x for k, x in d.items() if x > .005}
        top = sorted(d.items(), key=lambda kv: -kv[1])[:4]; s = sum(x for _, x in top)
        W[i] = [(k, x / s) for k, x in top]
    t = smoothstep(1.462, 1.515, z)            # neck skin: chest at the collar, its own weights by the Neck joint
    for i in np.where((part == 0) & (z < 1.515) & (np.abs(v[:, 0]) < .2))[0]:
        d = {k: x * t[i] for k, x in W[i]}; d["Chest"] = d.get("Chest", 0) + (1 - t[i])
        top = sorted(d.items(), key=lambda kv: -kv[1])[:4]; s = sum(x for _, x in top)
        W[i] = [(k, x / s) for k, x in top if x / s > .01]


def stage_rig():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "build.blend"))
    J = {k: np.array(v) for k, v in json.load(open(os.path.join(WORK, "joints.json"))).items()}
    J2 = {k: np.array(v) for k, v in json.load(open(os.path.join(WORK, "joints2.json"))).items()}
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    ob = bpy.data.objects["Skin"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()
    ob.name = "Person"; ob.data.name = "Person"
    # eyes get their own part: wet, not matte
    part = np.zeros(len(ob.data.vertices), int); ob.data.attributes["part"].data.foreach_get("value", part)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    seen = set()
    for s0 in bm.verts:
        if s0.index in seen or part[s0.index] != 0: continue
        st = [s0]; seen.add(s0.index); ids = []
        while st:
            q = st.pop(); ids.append(q.index)
            for e in q.link_edges:
                t = e.other_vert(q)
                if t.index not in seen: seen.add(t.index); st.append(t)
        if len(ids) < 1000: part[ids] = 6
    bm.free()
    ob.data.attributes["part"].data.foreach_set("value", part.tolist())

    table = bone_table(); order = []
    W = {}
    gnames = {g.index: g.name for g in ob.vertex_groups}
    unmapped = set()
    for v in ob.data.vertices:
        d = {}
        for g in v.groups:
            nm = table.get(gnames[g.group])
            if nm is None: unmapped.add(gnames[g.group]); continue
            d[nm] = d.get(nm, 0) + g.weight
        top = sorted(d.items(), key=lambda kv: -kv[1])[:4]
        s = sum(x[1] for x in top)
        W[v.index] = [(k, x / s) for k, x in top if x / s > .01] if s > 0 else []
    print("UNMAPPED", unmapped, "EMPTY", sum(1 for x in W.values() if not x))
    shoulder_weights(ob, W, J)
    core_weights(ob, W, J)
    ob.vertex_groups.clear()
    names = sorted({k for x in W.values() for k, _ in x})
    gs = {n: ob.vertex_groups.new(name=n) for n in names}
    for i, x in W.items():
        for k, w in x: gs[k].add([i], w, "REPLACE")

    P = {}
    for k in ("Spine", "Spine1", "Neck", "Head"): P[k] = J[k]
    P["Hips"] = J2["Hips"]
    bones = [("Hips", None, P["Hips"], P["Spine"]), ("Spine", "Hips", P["Spine"], P["Spine1"]), ("Chest", "Spine", P["Spine1"], P["Neck"]),
             ("Neck", "Chest", P["Neck"], P["Head"]), ("Head", "Neck", P["Head"], np.array([0, P["Head"][1], 1.77]))]
    for n, s in SIDES:
        bones += [(n + "Shoulder", "Chest", J[n + "Shoulder"], J[n + "Arm"]), (n + "UpperArm", n + "Shoulder", J[n + "Arm"], J[n + "ForeArm"]),
                  (n + "LowerArm", n + "UpperArm", J[n + "ForeArm"], J[n + "Hand"]), (n + "Hand", n + "LowerArm", J[n + "Hand"], J[n + "HandMiddle1"]),
                  (n + "UpperLeg", "Hips", J2[n + "UpLeg"], J2[n + "Leg"]), (n + "LowerLeg", n + "UpperLeg", J2[n + "Leg"], J[n + "Foot"]),
                  (n + "Foot", n + "LowerLeg", J[n + "Foot"], J[n + "ToeBase"]), (n + "Toes", n + "Foot", J[n + "ToeBase"], J[n + "ToeBase"] + np.array([s * .012, -.07, 0]))]
        for f in FINGERS:
            prev = n + "Hand"
            for i in (1, 2, 3):
                nm = f"{n}Hand{f}{i}"
                bones.append((nm, prev, J[nm], J[f"{n}Hand{f}{i + 1}"])); prev = nm
    arm = bpy.data.objects.new("Armature", bpy.data.armatures.new("Armature"))
    bpy.context.scene.collection.objects.link(arm)
    activate(arm); bpy.ops.object.mode_set(mode="EDIT")
    for name, parent, h, t in bones:
        e = arm.data.edit_bones.new(name); e.head = Vector(h.tolist()); e.tail = Vector(t.tolist())
        if parent: e.parent = arm.data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    mod = ob.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    ob.parent = arm
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "rig.blend"))
    print("RIG", len(ob.data.polygons), sum(len(p.vertices) - 2 for p in ob.data.polygons), "tris", len(bones), "bones")


# ---- UVs and the maps the textures are painted from. Nothing here is lit: position, normal and part per texel.
def smart_uv(ob, idx):
    activate(ob)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
    for p in ob.data.polygons: p.select = p.material_index == idx
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=.006, area_weight=.3, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def stage_maps():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "rig.blend"))
    ob = bpy.data.objects["Person"]
    me = ob.data
    if not me.uv_layers: me.uv_layers.new(name="UVMap")
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[1])
    me.uv_layers[0].name = "UVMap"
    smart_uv(ob, 0); smart_uv(ob, 1)
    # The head's islands use the lower 80% of its texture. The strip above them is the hair.
    uv = np.zeros(len(me.loops) * 2); me.uv_layers[0].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    for p in me.polygons:
        if p.material_index == 1:
            for l in p.loop_indices: uv[l, 1] *= .8
    me.uv_layers[0].data.foreach_set("uv", uv.flatten())
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 1; s.cycles.device = "CPU"; s.render.bake.margin = 6; s.cycles.use_denoising = False
    R = 2048
    res = {}
    for kind in ("POSITION", "NORMAL", "EMIT"):
        for mi, mat in enumerate(me.materials):
            mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
            o_ = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
            at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "part"; at.attribute_type = "GEOMETRY"
            nt.links.new(at.outputs["Fac"], em.inputs[0]); nt.links.new(em.outputs[0], o_.inputs[0])
            img = bpy.data.images.new(f"{kind}{mi}", R, R, alpha=True, float_buffer=True); img.colorspace_settings.name = "Non-Color"
            img.generated_color = (0, 0, 0, 0)
            t = nt.nodes.new("ShaderNodeTexImage"); t.image = img; nt.nodes.active = t
        activate(ob)
        kw = dict(type=kind, use_selected_to_active=False, margin=6, use_clear=True)
        if kind == "EMIT": kw["pass_filter"] = {"EMIT"}
        if kind == "NORMAL": kw.update(normal_space="OBJECT", normal_r="POS_X", normal_g="POS_Y", normal_b="POS_Z")
        bpy.ops.object.bake(**kw)
        for mi in (0, 1):
            img = bpy.data.images[f"{kind}{mi}"]
            a_ = np.zeros(R * R * 4, np.float32); img.pixels.foreach_get(a_)
            np.save(os.path.join(WORK, f"map_{kind}{mi}.npy"), a_.reshape(R, R, 4).astype(np.float32))
    for mat in me.materials: mat.node_tree.nodes.clear()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "maps.blend"))
    print("MAPS OK")


# ---- Painting. Albedo only: no light, no shadow. Creases come from the surface and the normal map.
def load(path):
    im = bpy.data.images.load(path); im.colorspace_settings.name = "Non-Color"
    w, h = im.size
    a_ = np.zeros(w * h * 4, np.float32); im.pixels.foreach_get(a_)
    bpy.data.images.remove(im)
    return a_.reshape(h, w, 4)[:, :, :3]


def sample(img, u, v, wrap=False):
    h, w = img.shape[:2]
    x = u * w - .5; y = v * h - .5
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    fx = (x - x0)[:, None].astype(np.float32); fy = (y - y0)[:, None].astype(np.float32)
    if wrap:
        xa, xb, ya, yb = x0 % w, (x0 + 1) % w, y0 % h, (y0 + 1) % h
    else:
        xa, xb, ya, yb = np.clip(x0, 0, w - 1), np.clip(x0 + 1, 0, w - 1), np.clip(y0, 0, h - 1), np.clip(y0 + 1, 0, h - 1)
    return (img[ya, xa] * (1 - fx) + img[ya, xb] * fx) * (1 - fy) + (img[yb, xa] * (1 - fx) + img[yb, xb] * fx) * fy


def blur(img, sigma):
    """Wrapped gaussian on a square image, channels kept."""
    h, w = img.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None]
    g = np.exp(-2 * (math.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    if img.ndim == 3: g = g[:, :, None]
    return np.fft.irfft2(np.fft.rfft2(img, axes=(0, 1)) * g, s=(h, w), axes=(0, 1)).astype(np.float32)


def tri(tile, P, N, size):
    w = np.abs(N) ** 4; w = w / np.maximum(w.sum(1, keepdims=True), 1e-6)
    return sample(tile, P[:, 1] / size, P[:, 2] / size, True) * w[:, :1] + sample(tile, P[:, 0] / size, P[:, 2] / size, True) * w[:, 1:2] + sample(tile, P[:, 0] / size, P[:, 1] / size, True) * w[:, 2:]


def wave_noise(P, f, seed):
    """A cheap smooth noise: a few crossed sine waves, warped."""
    r = np.random.RandomState(seed); out = 0
    for i in range(7):
        d = r.normal(size=3); d /= np.linalg.norm(d)
        out = out + np.sin((P @ d) * f * (1 + i * .37) + r.rand() * 6.3 + 1.5 * np.sin((P @ r.normal(size=3)) * f * .7))
    return out / 7


def save_png(a_, path, linear=True):
    h, w = a_.shape[:2]
    if a_.shape[2] == 3: a_ = np.dstack([a_, np.ones((h, w), np.float32)])
    im = bpy.data.images.new("o", w, h, alpha=True, float_buffer=True)
    im.colorspace_settings.name = "Non-Color"
    im.pixels.foreach_set(np.clip(a_, 0, 1).astype(np.float32).flatten())
    sc = bpy.context.scene; f = sc.render.image_settings; f.file_format = "PNG"; f.color_mode = "RGBA"; f.color_depth = "8"; f.compression = 90
    sc.view_settings.view_transform = "Raw"; sc.view_settings.look = "None"
    im.save_render(path, scene=sc); bpy.data.images.remove(im)


def dilate(rgb, valid, n=24):
    """Pushes colour outward over the islands' edges, so mip maps never show the black background."""
    a_ = rgb.copy(); v = valid.astype(np.float32)
    for _ in range(n):
        tot = np.zeros_like(a_); cnt = np.zeros_like(v)
        for ax, k in ((0, 1), (0, -1), (1, 1), (1, -1)):
            tot += np.roll(a_ * v[:, :, None], k, ax); cnt += np.roll(v, k, ax)
        new = (cnt > 0) & (v == 0)
        a_[new] = tot[new] / cnt[new][:, None]; v[new] = 1
    return a_


SIDE_POINTS = [  # head (y, z) after the refit, to px in side_left.png
    ((-.096, 1.655), (280, 472)), ((-.1336, 1.62), (124, 590)), ((-.112, 1.565), (170, 700)), ((-.103, 1.533), (195, 862)),
    ((-.02, 1.655), (560, 455)), ((.0087, 1.655), (700, 460)), ((-.012, 1.606), (580, 650)), ((.0638, 1.525), (770, 900)),
    ((-.05, 1.50), (420, 985)), ((.087, 1.67), (885, 300)), ((-.05, 1.76), (420, 40)), ((-.09, 1.72), (190, 180))]


def stage_paint():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    J = json.load(open(os.path.join(WORK, "joints.json")))
    M = {}
    for k in ("POSITION", "NORMAL", "EMIT"):
        for mi in (0, 1): M[k + str(mi)] = np.load(os.path.join(WORK, f"map_{k}{mi}.npy"), mmap_mode="r")
    R = M["POSITION0"].shape[0]
    tl = {}
    for t in ("cotton", "denim", "skin", "hair"):
        a_ = load(os.path.join(TEX, t + ".png"))
        if t != "hair":
            q_ = a_[6:500, 6:500]; a_ = np.vstack([np.hstack([q_, q_[:, ::-1]]), np.hstack([q_[::-1], q_[::-1, ::-1]])])
        tl[t] = a_; tl[t + "_hp"] = (a_ - blur(a_, 24)).mean(2, keepdims=True); tl[t + "_mean"] = a_.reshape(-1, 3).mean(0)
    face = load(os.path.join(GEN, "face_tex.png")); side = load(os.path.join(TEX, "side_left.png"))
    tone = face[1024 - 640:1024 - 600, 350:400].reshape(-1, 3).mean(0)
    print("TONE", tone.round(3))

    # Body ---------------------------------------------------------------
    pos = M["POSITION0"]
    valid = (np.abs(np.asarray(pos)[:, :, :3]).sum(2) > .01) & (np.rint(np.asarray(M["EMIT0"])[:, :, 0]) >= 1)
    idx = np.where(valid.flatten())[0]
    P = np.asarray(pos)[:, :, :3].reshape(-1, 3)[idx]; N = (np.asarray(M["NORMAL0"])[:, :, :3].reshape(-1, 3)[idx] * 2 - 1)
    part = np.rint(np.asarray(M["EMIT0"])[:, :, 0].reshape(-1)[idx]).astype(int)
    print("PARTS", np.bincount(part))
    col = np.zeros((len(idx), 3), np.float32); hgt = np.zeros(len(idx), np.float32); smo = np.zeros(len(idx), np.float32)
    # cotton: heather grey, flat, with the knit in the normal map
    m = part == 3
    hp = tri(tl["cotton_hp"], P[m], N[m], .22)
    speck = wave_noise(P[m], 90, 3)[:, None]
    col[m] = np.array([.545, .545, .55]) + hp * .38 + speck * .004
    hgt[m] = (hp[:, 0] * .0007 + .0006 * wave_noise(P[m], 260, 5) * (.5 + .5 * wave_noise(P[m], 40, 6)))
    cj = json.load(open(os.path.join(WORK, "collar.json")))
    rr = np.hypot(P[m, 0] - cj["c"][0], P[m, 1] - cj["c"][1]); th_ = np.arctan2(P[m, 1] - cj["c"][1], P[m, 0] - cj["c"][0])
    TH_ = np.linspace(-math.pi, math.pi, 73)[:-1] + math.pi / 72
    d_ = np.hypot(np.maximum(rr - np.interp(th_, TH_, np.array(cj["R"]), period=2 * math.pi), 0), np.maximum(np.interp(th_, TH_, np.array(cj["Z"]), period=2 * math.pi) - P[m, 2], 0))
    band = (P[m, 2] > 1.40) * smoothstep(-.001, .001, d_) * smoothstep(.0235, .0215, d_)
    hgt[m] = hgt[m] * (1 - band) + band * .00028 * np.sin(th_ * 120)
    col[m] *= (1 - .07 * band)[:, None]
    # hems: two rows of stitching, real grooves
    z = P[m, 2]; xa = np.abs(P[m, 0])
    d = np.minimum(np.abs(z - .905), np.abs(z - .9095)); grv = np.exp(-(d / .0007) ** 2) * (z < .93)
    d2 = np.minimum(np.abs(xa - (HEM_X - .020)), np.abs(xa - (HEM_X - .0155))); grv2 = np.exp(-(d2 / .0007) ** 2) * (xa > HEM_X - .035)
    collar = np.hypot(P[m, 0], (P[m, 1] - .02) * 1.2)
    grv3 = np.exp(-((P[m, 2] - (1.487 - .0)) / .0009) ** 2) * (collar < .12) * 0
    hgt[m] -= (grv + grv2) * .0006
    col[m] *= (1 - .10 * (grv + grv2))[:, None]
    smo[m] = .12
    # denim: washed black, wear where real wear goes
    m = part == 4
    hp = tri(tl["denim_hp"], P[m], N[m], .26)
    x, y, z = P[m, 0], P[m, 1], P[m, 2]
    sgn = np.sign(x); lx = np.abs(x) - (.102 + (.918 - z) * .065)                     # across the leg
    ly = y - (.0 + (.918 - z) * .03)
    th = np.arctan2(ly, lx)                                                           # around the leg: 0 outer, pi inner
    knee = np.exp(-((z - .50) / .10) ** 2) * (N[m, 1] < 0)
    thigh = np.exp(-((z - .68) / .13) ** 2) * (N[m, 1] < .1)
    wear = .55 * knee + .8 * thigh + .35 * wave_noise(P[m], 14, 9)
    base = np.array([.098, .104, .118])
    col[m] = base * (1 + .34 * np.clip(wear, -.5, 1))[:, None] + hp * 2.1
    hgt[m] = hp[:, 0] * .0009 + .0004 * wave_noise(P[m], 300, 7)
    # outer and inner leg seams: a raised flat-felled line with stitching
    for t0, w_ in ((0, .040), (math.pi, .05)):
        dt = np.abs(((th - t0 + math.pi) % (2 * math.pi)) - math.pi) * np.hypot(lx, ly)
        ok = (z < .9) if t0 == 0 else (z < .74)
        seam = np.exp(-(dt / .0035) ** 2) * ok
        st = np.exp(-((dt - .0062) / .0009) ** 2) * ok * (np.sin(z * 2400) > -.2)
        hgt[m] += seam * .0008; col[m] += (seam * .012)[:, None] + st[:, None] * np.array([.10, .085, .06])
    # back pockets and the yoke line, in the surface
    pk = (N[m, 1] > .15) & (z > .70) & (z < .885)
    cx = sgn * .095 - 0
    u_ = np.abs(x - cx); v_ = z
    edge_side = np.abs(u_ - (.068 - (.86 - v_) * .10))
    bot = (.74 + u_ * .55)
    e_ = np.minimum(edge_side + 1e3 * (v_ < bot) + 0, np.abs(v_ - bot) + 1e3 * (u_ > .068 - (.86 - v_) * .10))
    pocket = np.exp(-(e_ / .0022) ** 2) * pk
    stp = np.exp(-((e_ - .0042) / .0008) ** 2) * pk * (np.sin((x + z) * 2600) > -.2)
    hgt[m] += pocket * .0014 - stp * .0003; col[m] += stp[:, None] * np.array([.11, .095, .065])
    inside = pk & (u_ < .068 - (.86 - v_) * .10) & (v_ > bot)
    hgt[m] += inside * .0007
    # cuffs
    cuff = np.exp(-((z - .108) / .0012) ** 2); hgt[m] -= cuff * .0005; col[m] += cuff[:, None] * np.array([.10, .085, .06])
    smo[m] = .16
    # skin: hands, arms, feet
    m = (part == 1) | (part == 2)
    hp = tri(tl["skin_hp"], P[m], N[m], .10)
    c = SKIN_TONE * np.array([1.04, 1.03, 1.03]) + hp * .8
    blot = wave_noise(P[m], 22, 21)
    c = c * (1 + .045 * blot)[:, None] + np.array([.02, -.008, -.012]) * (blot[:, None] * .6)
    # warm, blood-rich extremities and joints, as an albedo tint
    def warm(mask, k): return c * (1 - (mask * k)[:, None] * np.array([.0, .08, .10]))
    ax = np.abs(P[m, 0])
    c = warm(smoothstep(.73, .86, ax) * (part[m] == 1), .9)
    c = warm(np.exp(-((ax - .46) / .03) ** 2) * (part[m] == 1), .5)
    c = warm(smoothstep(.09, .04, P[m, 2]) * (part[m] == 2), .9)
    col[m] = c
    hgt[m] = hp[:, 0] * .0007
    smo[m] = .30
    # nails: flat pale plates on the back of each fingertip
    pm = P[m]; nm = N[m]; nail = np.zeros(len(pm), np.float32)
    for n_, s_ in SIDES:
        for f in FINGERS:
            tip = np.array(J[f"{n_}Hand{f}4"]); mid = np.array(J[f"{n_}Hand{f}3"])
            d_ = (tip - mid); L = np.linalg.norm(d_); d_ /= L
            up = np.array([0, .0, 1.]) if f != "Thumb" else np.array([0, -.45, .9])
            if f == "Thumb": up = up / np.linalg.norm(up)
            c0 = tip - d_ * .006
            r_ = pm - c0
            al = r_ @ d_; ac = r_ - al[:, None] * d_ - (r_ @ up)[:, None] * up
            q = (al / .0068) ** 2 + ((ac ** 2).sum(1) / .0056 ** 2)
            nail = np.maximum(nail, smoothstep(1.15, .85, q) * smoothstep(.15, .45, nm @ up))
    col[m] = col[m] * (1 - nail[:, None]) + np.array([.90, .74, .70]) * nail[:, None]
    hgt[m] += nail * .00035; smo[m] += nail * .22
    img = np.zeros((R, R, 3), np.float32); img.reshape(-1, 3)[idx] = col
    save_png(dilate(img, valid)[:, :, :3], os.path.join(OUT, "Body_BaseMap.png"))
    H = np.zeros((R, R), np.float32); H.reshape(-1)[idx] = hgt
    H = dilate(np.dstack([H] * 3), valid, 10)[:, :, 0]; np.save(os.path.join(WORK, "height0.npy"), H)
    G = np.zeros((R, R), np.float32); G.reshape(-1)[idx] = smo
    gm = dilate(np.dstack([G] * 3), valid, 8)[:, :, 0]
    save_png(np.dstack([np.zeros((R, R, 3), np.float32), gm]), os.path.join(OUT, "Body_MetallicGlossMap.png"))

    # Head ---------------------------------------------------------------
    pos = M["POSITION1"]
    valid = np.abs(np.asarray(pos)[:, :, :3]).sum(2) > .01
    idx = np.where(valid.flatten())[0]
    P = np.asarray(pos)[:, :, :3].reshape(-1, 3)[idx]; N = (np.asarray(M["NORMAL1"])[:, :, :3].reshape(-1, 3)[idx] * 2 - 1)
    part = np.rint(np.asarray(M["EMIT1"])[:, :, 0].reshape(-1)[idx]).astype(int)
    u = (P[:, 0] / FACE_S + FACE_CX) / 1024
    v = 1 - (FACE_EYE_Y - (P[:, 2] - FACE_EYE_Z) / FACE_S) / 1024
    Fc = sample(face, u, v)
    fit = tps_fit(np.array([p[0] for p in SIDE_POINTS]), np.array([p[1] for p in SIDE_POINTS], float), 1e-5)
    q = tps_apply(fit, P[:, [1, 2]])
    Sc = sample(side, q[:, 0] / 1024, 1 - q[:, 1] / 1024)
    # A sample that lands on a photo's plain background is no use: it becomes skin.
    def is_bg(c): return smoothstep(.70, .78, c.min(1)) * smoothstep(.09, .05, c.max(1) - c.min(1))
    nf = -N[:, 1]
    wf = smoothstep(.02, .50, nf)
    wf = np.maximum(wf, smoothstep(-.03, -.085, P[:, 1]))          # the front of the face is always the front photo
    wf = np.where(part == 6, 1, wf)
    bf = is_bg(Fc); bs = is_bg(Sc)
    wf = wf * (1 - bf)
    # Match the side photo to the front one where they overlap.
    band = (wf > .25) & (wf < .75) & (bs < .1) & (P[:, 2] > 1.565) & (P[:, 2] < 1.645) & (Sc.mean(1) > .35) & (part != 6)
    gain = Fc[band].mean(0) / Sc[band].mean(0)
    print("SIDE GAIN", gain.round(3), band.sum())
    Sc = Sc * gain
    Sc = Sc * (1 - bs)[:, None] + (tone * .97) * bs[:, None]
    col = Fc * wf[:, None] + Sc * (1 - wf)[:, None]
    hairc = tl["hair_mean"] * .5
    # Back of the head: hair above the nape, plain skin below it.
    nape = smoothstep(1.578, 1.552, P[:, 2])
    back = smoothstep(.0, .25, N[:, 1] + .1) * smoothstep(-.02, .02, P[:, 1])
    col = col * (1 - back * (1 - nape))[:, None] + hairc * (back * (1 - nape))[:, None]
    bk = back * nape
    col = col * (1 - bk)[:, None] + (tone * .95) * bk[:, None]
    ear = smoothstep(.0635, .0695, np.abs(P[:, 0])) * smoothstep(.042, .034, P[:, 1]) * smoothstep(-.034, -.024, P[:, 1]) * smoothstep(1.57, 1.585, P[:, 2]) * smoothstep(1.682, 1.668, P[:, 2]) * (part == 0)
    col = col * (1 - ear)[:, None] + (tone * np.array([.97, .90, .87])) * ear[:, None]
    # Below the photos the neck is plain skin.
    low = smoothstep(1.525, 1.50, P[:, 2]) * (part != 6)
    col = col * (1 - low)[:, None] + (tone * .97) * low[:, None]
    # Stubble belongs to the jaw. Under the jaw line the photo's beard shadow goes, and the neck takes the cheek's own colour.
    chk = (np.abs(P[:, 0]) > .04) & (np.abs(P[:, 0]) < .058) & (P[:, 2] > 1.60) & (P[:, 2] < 1.625) & (P[:, 1] < -.04) & (part == 0)
    ctone = np.median(col[chk], axis=0)
    print("CHEEK TONE", ctone.round(3), "OLD", tone.round(3))
    zj = np.interp(np.abs(P[:, 0]), JAW_LINE[:, 0], JAW_LINE[:, 1])
    neck = smoothstep(zj + .001, zj - .016, P[:, 2]) * (part == 0) * (1 - bk)
    neck = np.maximum(neck, low)
    nc = ctone * np.array([.94, .92, .92]) + (wave_noise(P, 22, 31) * .012)[:, None]
    col = col * (1 - neck)[:, None] + nc * neck[:, None]
    col = col * (1 - ear)[:, None] + (ctone * np.array([.98, .92, .90])) * ear[:, None]
    # Nostrils: a soft warm shadow, not a hole.
    ny_ = float(P[(np.abs(P[:, 0]) < .004) & (np.abs(P[:, 2] - 1.62) < .01) & (part == 0), 1].min()) + .02
    nos = np.exp(-((np.abs(P[:, 0]) - .0115) / .0105) ** 2 - ((P[:, 2] - 1.612) / .010) ** 2 - ((P[:, 1] - ny_) / .014) ** 2) * (part == 0)
    nos = np.clip(nos * 1.5, 0, 1)
    col = col * (1 - nos)[:, None] + (ctone * np.array([.66, .54, .52])) * nos[:, None]
    # The photos paint lids onto the eyeball. Outside the opening it must be plain sclera, because the lids can now open.
    for (ex, ez), pe in ((EYE_R, (395, 482)), (EYE_L, (620, 478))):
        # Same iris on both: the right one in the photo is the cleaner, and each is taken around its own centre.
        m_e = (part == 6) & (np.sign(P[:, 0]) == np.sign(ex))
        dx = P[m_e, 0] - ex; dz = P[m_e, 2] - ez
        r_e = np.hypot(dx, dz)
        iris = sample(face, ((395 + np.sign(ex) * -1 * 0 + dx / FACE_S * .98)) / 1024, 1 - (482 - dz / FACE_S * .98) / 1024)
        sclera = np.array([.74, .70, .66]) * (1 - .10 * smoothstep(.006, .0125, r_e))[:, None] + np.array([.03, -.01, -.01]) * smoothstep(.007, .0125, r_e)[:, None]
        k_ = smoothstep(.0052, .0062, r_e)[:, None]       # outside the iris: plain white of the eye
        col[m_e] = iris * (1 - k_) + sclera * k_
    # keep the skin matte and pored; the 1024 px photos get fine detail from the same skin tile
    hp = tri(tl["skin_hp"], P, N, .09)
    col = col + hp * .35
    img = np.zeros((R, R, 3), np.float32); img.reshape(-1, 3)[idx] = col
    H = np.zeros((R, R), np.float32); H.reshape(-1)[idx] = hp[:, 0] * .0005
    G = np.zeros((R, R), np.float32); G.reshape(-1)[idx] = np.where(part == 6, .93, .32)
    img = dilate(img, valid, 10)
    H = dilate(np.dstack([H] * 3), valid, 10)[:, :, 0]
    gm = dilate(np.dstack([G] * 3), valid, 10)[:, :, 0]
    # The hair strip: real strands, top of the texture.
    top = int(R * .81)
    hs = sample(tl["hair"], np.tile(np.linspace(0, 1, R, endpoint=False), R - top), np.repeat(np.linspace(0, .5, R - top, endpoint=False), R)).reshape(R - top, R, 3)
    img[top:] = hs * .5
    H[top:] = (hs.mean(2) - hs.mean()) * .004
    gm[top:] = .28
    alpha = np.ones((R, R), np.float32)
    g_ = hs.mean(2); lo_, hi_ = np.percentile(g_, 5), np.percentile(g_, 95)
    n_ = np.clip((g_ - lo_) / (hi_ - lo_), 0, 1)
    tt = np.clip((np.arange(top, R)[:, None] / R - .83) / .16, 0, 1)
    alpha[top:] = (n_ + (1 - tt ** 1.5) * 1.5 > .95).astype(np.float32)
    y0, y1 = int(R * .801), int(R * .81)
    for (x0, x1), c_, g_ in (((0, .3), (.15, .045, .05), .55), ((.3, .7), (.80, .76, .66), .6), ((.7, 1), (.46, .20, .21), .6)):
        img[y0:y1, int(x0 * R):int(x1 * R)] = c_; gm[y0:y1, int(x0 * R):int(x1 * R)] = g_; H[y0:y1, int(x0 * R):int(x1 * R)] = 0
    save_png(np.dstack([img[:, :, :3], alpha]), os.path.join(OUT, "Head_BaseMap.png"))
    np.save(os.path.join(WORK, "height1.npy"), H)
    save_png(np.dstack([np.zeros((R, R, 3), np.float32), gm]), os.path.join(OUT, "Head_MetallicGlossMap.png"))
    print("PAINT OK")


def textured(ob, lit=True):
    """Binds the painted maps to the two materials for checks and the export."""
    me = ob.data
    for mat, nm in zip(me.materials, ("Body", "Head")):
        mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
        o_ = nt.nodes.new("ShaderNodeOutputMaterial"); bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
        nt.links.new(bs.outputs[0], o_.inputs[0])
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(OUT, nm + "_BaseMap.png"), check_existing=True)
        nt.links.new(t.outputs[0], bs.inputs["Base Color"])
        gp = os.path.join(OUT, nm + "_MetallicGlossMap.png")
        if lit and os.path.exists(gp):
            g = nt.nodes.new("ShaderNodeTexImage"); g.image = bpy.data.images.load(gp, check_existing=True); g.image.colorspace_settings.name = "Non-Color"
            inv = nt.nodes.new("ShaderNodeInvert"); nt.links.new(g.outputs[1], inv.inputs[1]); nt.links.new(inv.outputs[0], bs.inputs["Roughness"])
        np_ = os.path.join(OUT, nm + "_BumpMap.png")
        if lit and os.path.exists(np_):
            g = nt.nodes.new("ShaderNodeTexImage"); g.image = bpy.data.images.load(np_, check_existing=True); g.image.colorspace_settings.name = "Non-Color"
            nm_ = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(g.outputs[0], nm_.inputs[1]); nt.links.new(nm_.outputs[0], bs.inputs["Normal"])


def stage_checks(tag="c", poses=("t",), res=(640, 800)):
    """Renders under one hard light from the front, like the TV, with almost no fill."""
    s = bpy.context.scene
    ob = bpy.data.objects["Person"]; arm = bpy.data.objects["Armature"]
    s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = res
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.02, .02, .024, 1)
    s.view_settings.view_transform = "Standard"; s.view_settings.look = "None"
    li = bpy.data.objects.get("tv") or bpy.data.objects.new("tv", bpy.data.lights.new("tv", "SPOT"))
    if li.name not in s.collection.objects: s.collection.objects.link(li)
    li.data.spot_size = 1.4; li.data.shadow_soft_size = .04; li.data.color = (.92, .96, 1)
    fill = bpy.data.objects.get("rim") or bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN"))
    if fill.name not in s.collection.objects: s.collection.objects.link(fill)
    fill.data.energy = .35; fill.rotation_euler = (math.radians(70), 0, math.radians(-40))
    cam = bpy.data.objects.get("cc") or bpy.data.objects.new("cc", bpy.data.cameras.new("cc"))
    if cam.name not in s.collection.objects: s.collection.objects.link(cam)
    s.camera = cam; cam.data.lens = 50; cam.data.clip_start = .02
    def shot(name, pos, tgt, lens=50, lpos=None, r=None):
        if r: s.render.resolution_x, s.render.resolution_y = r
        cam.location = pos; cam.data.lens = lens
        cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        lp = Vector(lpos or (pos[0] * .5 + .6, pos[1], pos[2] + .5)); li.location = lp
        li.rotation_euler = (Vector(tgt) - lp).to_track_quat("-Z", "Y").to_euler()
        li.data.energy = 26 * (lp - Vector(tgt)).length_squared
        s.render.filepath = os.path.join(OUT, "check", name + ".png"); bpy.ops.render.render(write_still=True)
    def pose(d):
        for b in arm.pose.bones: b.rotation_mode = "XYZ"; b.rotation_euler = (0, 0, 0)
        arm.location = (0, 0, 0)
        for k, r in d.items():
            if k.endswith("Arm"): continue
            arm.pose.bones[k].rotation_euler = tuple(math.radians(x) for x in r)
        bpy.context.view_layer.update()
        # Arms are posed by the direction each bone should point in, in the armature's space.
        for k in ("LeftUpperArm", "LeftLowerArm", "RightUpperArm", "RightLowerArm"):
            if k not in d: continue
            pb = arm.pose.bones[k]
            cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
            rot = cur.rotation_difference(Vector(d[k]).normalized())
            pb.matrix = Matrix.Translation(pb.matrix.translation) @ rot.to_matrix().to_4x4() @ pb.matrix.to_3x3().to_4x4()
            bpy.context.view_layer.update()
    # Bone local axes: Y runs along the bone. These are found by eye in the check renders.
    ARMS_DOWN = {"LeftUpperArm": (.14, .02, -1), "RightUpperArm": (-.14, .02, -1), "LeftLowerArm": (.1, -.22, -1), "RightLowerArm": (-.1, -.22, -1)}
    SIT = dict(ARMS_DOWN, **{"LeftUpperLeg": (96, 0, 0), "RightUpperLeg": (96, 0, 0), "LeftLowerLeg": (-96, 0, 0), "RightLowerLeg": (-96, 0, 0), "LeftUpperArm": (.2, -.25, -1), "RightUpperArm": (-.2, -.25, -1), "LeftLowerArm": (-.1, -1, -.25), "RightLowerArm": (.1, -1, -.25), "Spine": (-6, 0, 0), "Chest": (-8, 0, 0)})
    RUN = {"LeftUpperArm": (.25, .75, -1), "RightUpperArm": (-.25, -.75, -1), "LeftLowerArm": (-.1, -1, -.15), "RightLowerArm": (.2, -1, .9),
           "LeftUpperLeg": (-62, 0, 0), "LeftLowerLeg": (-55, 0, 0), "RightUpperLeg": (28, 0, 0), "RightLowerLeg": (-70, 0, 0), "Spine": (10, 0, 0), "Chest": (8, 0, 0)}
    if "t" in poses:
        pose({})
        shot(tag + "_t_front", (0, -4.2, 1.0), (0, 0, .92), 50)
        shot(tag + "_t_side", (4.2, 0, 1.0), (0, 0, .92), 50)
        shot(tag + "_t_back", (0, 4.2, 1.0), (0, 0, .92), 50)
    if "face" in poses:
        pose({})
        shot(tag + "_face", (0, -.85, 1.65), (0, 0, 1.64), 85, r=(800, 800))
        shot(tag + "_face34", (.5, -.72, 1.66), (0, 0, 1.64), 85, r=(800, 800))
        shot(tag + "_profile", (.85, 0, 1.65), (0, 0, 1.64), 85, r=(800, 800))
        shot(tag + "_headback", (-.5, .8, 1.72), (0, 0, 1.64), 85, r=(800, 800))
        s.render.resolution_x, s.render.resolution_y = res
    if "hand" in poses:
        pose({})
        shot(tag + "_hand", (.78, -.35, 1.75), (.78, 0, 1.42), 85, r=(800, 600))
        shot(tag + "_foot", (.45, -.8, .32), (.0, 0, .08), 70, r=(800, 600))
        s.render.resolution_x, s.render.resolution_y = res
    if "down" in poses:
        pose(ARMS_DOWN)
        shot(tag + "_down_front", (0, -3.4, 1.0), (0, 0, .92), 50)
        shot(tag + "_down_34", (2.2, -2.6, 1.1), (0, 0, .95), 50)
        shot(tag + "_down_shoulder", (.5, -1.1, 1.4), (.1, 0, 1.3), 60)
    if "sit" in poses:
        pose(SIT)
        shot(tag + "_sit_front", (.9, -3, .9), (0, -.2, .75), 50)
        shot(tag + "_sit_side", (3.2, -.3, .9), (0, -.2, .75), 50)
    if "run" in poses:
        pose(RUN)
        shot(tag + "_run_front", (.7, -3.2, 1.0), (0, 0, .9), 50)
        shot(tag + "_run_side", (3.2, 0, 1.0), (0, 0, .9), 50)
    def keys_set(k=None, val=1.):
        for kb in ob.data.shape_keys.key_blocks[1:]: kb.value = val if kb.name == k else 0
        bpy.context.view_layer.update()
    if "expr" in poses:
        # Dark room: one hard TV from in front of him and a little below, the way the close-ups will be lit.
        pose({})
        w.node_tree.nodes["Background"].inputs[0].default_value = (.003, .003, .004, 1); fill.data.energy = 0
        li.data.spot_size = 1.0; li.data.shadow_soft_size = .06
        for colr, ctag in (((.62, .8, 1), "blue"), ((1, .5, .32), "warm")):
            li.data.color = colr
            for k in ("neutral", "jawOpen", "blink", "eyesWide", "smile", "fear"):
                keys_set(k)
                shot(f"{tag}_x_{ctag}_{k}", (.14, -.72, 1.63), (0, 0, 1.635), 85, lpos=(.32, -1.5, 1.42), r=(640, 640))
                if ctag == "blue" and k in ("jawOpen", "fear"):
                    shot(f"{tag}_x34_{k}", (.5, -.56, 1.62), (0, 0, 1.625), 85, lpos=(.4, -1.5, 1.42), r=(640, 640))
        keys_set()
        s.render.resolution_x, s.render.resolution_y = res
    if "grip" in poses:
        pose({})
        for n_, s_ in SIDES:
            for f in FINGERS:
                for i in (1, 2, 3):
                    pb = arm.pose.bones[f"{n_}Hand{f}{i}"]
                    ang = math.radians((62 if i == 1 else 72 if i == 2 else 45) * (.6 if f == "Thumb" else 1))
                    ax = Vector((0, s_, 0)) if f != "Thumb" else Vector((.3 * s_, .9, -.3)).normalized()
                    if f == "Thumb": ax = Vector((-s_ * .5, 0, -1)).normalized() * s_
                    pb.matrix = Matrix.Translation(pb.matrix.translation) @ Matrix.Rotation(ang, 4, ax) @ pb.matrix.to_3x3().to_4x4()
                    bpy.context.view_layer.update()
        w.node_tree.nodes["Background"].inputs[0].default_value = (.012, .012, .015, 1); fill.data.energy = .1
        li.data.color = (.8, .9, 1)
        shot(tag + "_grip_side", (.8, -.55, 1.40), (.78, 0, 1.40), 70, r=(800, 600), lpos=(.3, -1.2, 1.5))
        shot(tag + "_grip_top", (.8, -.25, 1.85), (.78, 0, 1.40), 70, r=(800, 600), lpos=(.3, -1.2, 1.8))
        s.render.resolution_x, s.render.resolution_y = res
    if "tv" in poses:
        # The scene itself: black room, one hard TV from in front of the sofa.
        pose(SIT)
        w.node_tree.nodes["Background"].inputs[0].default_value = (.002, .002, .003, 1); fill.data.energy = 0
        li.data.color = (.55, .75, 1); li.data.spot_size = 1.2; li.data.shadow_soft_size = .1
        shot(tag + "_tv_wide", (1.2, -2.4, 1.05), (0, -.1, .9), 45, lpos=(.1, -2.3, .55))
        shot(tag + "_tv_face", (.42, -.75, 1.22), (0, -.12, 1.12), 70, lpos=(.1, -2.3, .55))
        li.data.color = (1, .45, .25)
        shot(tag + "_tv_side", (2.0, -.9, 1.0), (0, -.2, .85), 55, lpos=(-.5, -2.3, .7))
        pose({})


# ---- Hair: sculpted clumps on the scalp, grouped under guide locks so they end in real tapered points.
HAIRLINE = np.array([(0, 1.726), (.3, 1.722), (.55, 1.702), (.85, 1.690), (1.08, 1.640), (1.2, 1.645), (1.45, 1.668), (1.75, 1.640), (2.05, 1.600), (2.5, 1.566), (math.pi, 1.556)])


def stage_hair():
    f = os.path.join(WORK, "maps.blend")
    bpy.ops.wm.open_mainfile(filepath=f if os.path.exists(f) else os.path.join(WORK, "rig.blend"))
    ob = bpy.data.objects["Person"]; me = ob.data
    part = np.zeros(len(me.vertices), int); me.attributes["part"].data.foreach_get("value", part)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if part[v.index] != 0], context="VERTS")
    bm.faces.ensure_lookup_table(); bm.normal_update()
    tree = BVHTree.FromBMesh(bm)
    cy = -.012; CROWN = Vector((.018, .045, 1.75))
    rng = np.random.RandomState(4)
    def phi_of(p): return np.arctan2(np.abs(p[:, 0]), -(p[:, 1] - cy))
    def line(p): return np.interp(phi_of(p), HAIRLINE[:, 0], HAIRLINE[:, 1])
    # candidate roots, area-weighted
    tri = [(f.calc_area(), f) for f in bm.faces if max(v.co.z for v in f.verts) > 1.54]
    fa = np.array([t[0] for t in tri]); fa /= fa.sum()
    cand = rng.choice(len(tri), 24000, p=fa)
    roots = []; norms = []
    for i in cand:
        f = tri[i][1]; vs = [v.co for v in f.verts]; w = rng.dirichlet((1, 1, 1))
        p = vs[0] * w[0] + vs[1] * w[1] + vs[2] * w[2]
        roots.append(p[:]); norms.append(f.normal[:])
    roots = np.array(roots); norms = np.array(norms)
    keep = roots[:, 2] > line(roots) + rng.normal(0, .0015, len(roots))
    keep &= norms @ np.array([0, 0, 1.]) > -.8
    keep &= ~((np.abs(roots[:, 0]) > .0755) & (np.abs(roots[:, 1]) < .04) & (roots[:, 2] < 1.672))   # not on the ears
    roots, norms = roots[keep], norms[keep]
    print("ROOTS", len(roots))

    rv = lambda k: Vector((rng.normal(size=3) * k).tolist())
    PARTX = -.035

    def weights(p):
        ph = float(np.arctan2(abs(p.x), -(p.y - cy))); z = p.z
        top = float(smoothstep(1.668, 1.72, np.array(z))) * float(smoothstep(2.75, 1.7, np.array(ph)))
        nape = float(smoothstep(1.625, 1.57, np.array(z)))
        return ph, top, nape

    def volume(p):
        """How far the hair stands off the skull: a real mass on top, tight at the sides, nothing at the nape."""
        ph, top, nape = weights(p)
        t = .0085 + .0285 * top + .006 * top * float(smoothstep(1.0, .2, np.array(ph)))
        return t * (1 - .45 * nape)

    def grow(p0, L, layer, bend, flick, rev, steps=5):
        p = Vector(p0); path = [p.copy()]
        ds = L / steps
        for i in range(steps):
            s_ = (i + 1) / steps
            ph, top, nape = weights(p)
            sx = 1 if p.x > PARTX else -1
            if rev: F = Vector((.35 * sx, -.45, -.8))
            else: F = Vector((.5 * sx, 1, .12)) * top + Vector((.08 * sx, .8, -.62)) * (1 - top) * (1 - nape) + Vector((.1 * sx, .12, -1)) * (1 - top) * nape
            hit = tree.find_nearest(p); q, nh = hit[0], hit[1]
            F = F - nh * F.dot(nh)
            p2 = p + (F.normalized() + bend * s_).normalized() * ds
            hit = tree.find_nearest(p2); q, nh = hit[0], hit[1]
            h_ = volume(q) * layer * min(1, (s_ + .12) * 2.2) + flick * s_ ** 3
            p = q + nh * h_
            path.append(p.copy())
        return np.array([x[:] for x in path])

    verts = []; faces = []; uvs = []
    def clump(path, w0, thick, u0):
        s_ = np.linspace(0, 1, len(path))
        tang = np.gradient(path, axis=0); tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
        out = path - np.array([0, cy, 1.64]); out /= np.linalg.norm(out, axis=1, keepdims=True)
        side = np.cross(tang, out); side /= np.linalg.norm(side, axis=1, keepdims=True) + 1e-9
        up = np.cross(side, tang)
        base = len(verts)
        K = 6
        for i in range(len(path) - 1):
            w = w0 * (1 - s_[i] ** 1.4) ** .9 * (.72 + .28 * min(1, s_[i] * 4)); th = thick * (1 - s_[i]) ** .6
            for k, (cx_, cy_) in enumerate(((1, 0), (.55, 1), (-.55, 1), (-1, 0), (-.55, -.6), (.55, -.6))):
                verts.append((path[i] + side[i] * cx_ * w + up[i] * cy_ * th).tolist())
                uvs.append((u0 + (.03, .022, .008, 0, .008, .022)[k], .83 + .16 * s_[i]))
        verts.append(path[-1].tolist()); uvs.append((u0 + .012, .99))
        tip = len(verts) - 1
        for i in range(len(path) - 2):
            for k in range(K):
                j = (k + 1) % K
                a0 = base + i * K
                faces.append((a0 + k, a0 + K + k, a0 + K + j, a0 + j))
        a0 = base + (len(path) - 2) * K
        for k in range(K):
            faces.append((a0 + k, tip, a0 + (k + 1) % K))

    # Locks gather into clumps: each root belongs to a group that shares one bend and pulls its tips together.
    seeds = roots[rng.choice(len(roots), 150, replace=False)]
    bends = [rv(.24) for _ in seeds]
    guide = []
    for gi_, g0 in enumerate(seeds):
        p0 = Vector(g0); ph, top, nape = weights(p0)
        guide.append(grow(p0, (.036 + .054 * top) * (1 - .45 * nape), .95, bends[gi_], .003, False))
    guide = np.array(guide)

    def make(i, wr, lr, layer, flick=0, rev=False, follow=.62, edge_ok=None):
        p0 = Vector(roots[i])
        ph, top, nape = weights(p0)
        L = (.034 + .052 * top) * (1 - .45 * nape) * rng.uniform(*lr)
        if rev: L = rng.uniform(.03, .05)
        g_ = int(((seeds - roots[i]) ** 2).sum(1).argmin())
        path = grow(p0, L, layer * rng.uniform(.9, 1.06), bends[g_] + rv(.05), flick * rng.uniform(0, 1), rev)
        if path[:, 2].min() < 1.532: return
        s_ = np.linspace(0, 1, len(path))[:, None]
        if not rev: path = path + (guide[g_][-1] - path[-1]) * s_ ** 2.2 * follow * min(1, np.linalg.norm(guide[g_][0] - path[0]) * 25 + .3)
        hl = float(smoothstep(0, .010, np.array(p0.z - np.interp(ph, HAIRLINE[:, 0], HAIRLINE[:, 1]))))
        if edge_ok is not None and hl < edge_ok: return
        w = rng.uniform(*wr) * (.35 + .65 * hl) * (1 - .45 * nape)
        clump(path, w, min(w * .32, .0032), rng.uniform(.0, .94))

    idx = rng.permutation(len(roots))
    n0, n1, n2, n3 = 300, 500, 230, 24
    for i in idx[:n0]: make(i, (.019, .028), (.9, 1.05), .55, 0, False, .5, .99)         # the under mass, never at the edge
    for i in idx[n0:n0 + n1]: make(i, (.010, .016), (.9, 1.1), .85, .002, False, .62, .7)  # main locks
    gap = roots[:, 2] - np.interp(phi_of(roots), HAIRLINE[:, 0], HAIRLINE[:, 1])
    edge = np.where((gap < .012) & (phi_of(roots) < 2.0))[0]
    for i in rng.permutation(edge)[:150]: make(i, (.0024, .0042), (.55, .8), .8, .002, False, .4)  # the hairline: fine, soft
    back_ = np.where(phi_of(roots) > 1.35)[0]
    for i in rng.permutation(back_)[:420]: make(i, (.012, .019), (.8, 1.05), .9, .001, False, .55)  # the back of the head and the nape: never bare from behind
    for i in rng.permutation(back_)[:200]: make(i, (.005, .009), (.85, 1.1), 1.0, .003, False, .55)
    for i in idx[n0 + n1:n0 + n1 + n2]: make(i, (.005, .009), (.85, 1.1), 1.0, .005)     # top strands
    fr = [i for i in idx[n0 + n1 + n2:] if phi_of(roots[i][None])[0] < .7 and roots[i, 2] > 1.72][:26]
    for i in fr: make(i, (.004, .008), (1, 1), .8, .002, True)                           # a few loose over the forehead
    for i in idx[n0 + n1 + n2 + 300:][:n3]: make(i, (.0014, .0024), (1, 1.1), 1.04, .009, False, .3)  # flyaways
    bm.free()

    v = np.array(verts)
    # Height stays 1.8: the very top is compressed, never cut.
    hi = v[:, 2].max(); print("HAIR TOP", hi)
    k_z = np.where(v[:, 2] > 1.775, 1.775 + (v[:, 2] - 1.775) * (.025 / max(hi - 1.775, .025)), v[:, 2]); v[:, 2] = k_z
    hm = bpy.data.meshes.new("Hair"); hm.from_pydata(v.tolist(), [], faces); hm.update()
    bm_ = bmesh.new(); bm_.from_mesh(hm); bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:]); bm_.to_mesh(hm); bm_.free()
    h = bpy.data.objects.new("Hair", hm); bpy.context.scene.collection.objects.link(h)
    hm.materials.append(me.materials[0]); hm.materials.append(me.materials[1])
    for p in hm.polygons: p.material_index = 1; p.use_smooth = True
    uvl = hm.uv_layers.new(name="UVMap")
    for l in hm.loops: uvl.data[l.index].uv = uvs[l.vertex_index]
    g = h.vertex_groups.new(name="Head"); g.add(list(range(len(v))), 1.0, "REPLACE")
    at = hm.attributes.new("part", "INT", "POINT"); at.data.foreach_set("value", [5] * len(v))
    arm = bpy.data.objects["Armature"]
    m = h.modifiers.new("Armature", "ARMATURE"); m.object = arm
    h.parent = arm
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "hair.blend"))
    print("HAIR", len(hm.polygons), sum(len(p.vertices) - 2 for p in hm.polygons), "tris")


# ---- The mouth and the face's shape keys. The Mixamo head only has a shallow pocket behind the lips, so the pocket goes
# and a real mouth takes its place: a cavity grown from the lip line, teeth, a tongue. Everything is on the head material,
# using flat swatches in the strip just above the head's UV islands.
SWATCH = {"mouth": .15, "teeth": .5, "tongue": .85}
SWATCH_V = .805


def build_mouth(ob):
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    pl = bm.verts.layers.int.get("part")
    uvl = bm.loops.layers.uv.active
    dv = bm.verts.layers.deform.verify()
    gi = ob.vertex_groups["Head"].index
    tree = BVHTree.FromBMesh(bm)
    pocket = set()
    for v in bm.verts:
        if v[pl] != 0: continue
        c = v.co
        if abs(c.x) > .05 or not (1.552 < c.z < 1.612) or c.y < -.131 or c.y > 0: continue
        h = tree.ray_cast(c + Vector((0, -.0012, 0)), Vector((0, -1, 0)), .06)
        if h[0] is not None: pocket.add(v.index)
    faces = [f for f in bm.faces if all(v.index in pocket for v in f.verts)]
    print("POCKET", len(pocket), "faces", len(faces))
    bmesh.ops.delete(bm, geom=faces, context="FACES_ONLY")
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces and v[pl] == 0], context="VERTS")
    loops = [c for c in boundary_loops(bm) if len(c) > 6 and abs(sum(v.co.x for v in c) / len(c)) < .02 and abs(sum(v.co.z for v in c) / len(c) - 1.58) < .02 and sum(v.co.y for v in c) / len(c) < -.05]
    print("MOUTH LOOPS", [len(c) for c in loops])
    chain = max(loops, key=len)
    P = np.array([v.co[:] for v in chain])
    ci = int(np.argmax(P[:, 0]))
    chain = chain[ci:] + chain[:ci]; P = np.array([v.co[:] for v in chain])
    # Which half of the lip line is the upper lip? Height can't say: the hole is hidden behind the lips, so both halves sit at
    # nearly the same height. Walk from a point on the upper lip, stopping at the line, and see which half it reaches.
    cs = set(chain); xa, xb = P[:, 0].min() + .0015, P[:, 0].max() - .0015; zc = float(P[:, 2].mean())
    seed = min((v for v in bm.verts if v[pl] == 0 and xa < v.co.x < xb and v.co.y < -.09), key=lambda v: abs(v.co.x - (xa + xb) / 2) * 4 + abs(v.co.z - (zc + .012)) + abs(v.co.y + .125))
    seen_ = {seed}; st_ = [seed]
    while st_:
        q = st_.pop()
        for e_ in q.link_edges:
            t_ = e_.other_vert(q)
            if t_ in seen_ or t_ in cs or not (xa < t_.co.x < xb and abs(t_.co.z - zc) < .017 and t_.co.y < -.09 and t_[pl] == 0): continue
            seen_.add(t_); st_.append(t_)
    touch = lambda i: any(e_.other_vert(chain[i]) in seen_ for e_ in chain[i].link_edges)
    n_ = len(chain)
    a_ = sum(touch(i) for i in range(n_ // 8, n_ * 3 // 8)); b_ = sum(touch(i) for i in range(n_ * 5 // 8, n_ * 7 // 8))
    print("UPPER LIP TOUCHES", a_, b_)
    if b_ > a_:
        chain = [chain[0]] + chain[1:][::-1]; P = np.array([v.co[:] for v in chain])
    seg = np.linalg.norm(np.diff(np.vstack([P, P[:1]]), axis=0), axis=1)
    T = np.r_[0, np.cumsum(seg)[:-1]] / seg.sum() * 2 * math.pi
    c = P.mean(0); w_m = (P[:, 0].max() - P[:, 0].min()) / 2
    zm = float(c[2])
    print("MOUTH c", c.round(4), "half width", round(float(w_m), 4), "z span", P[:, 2].min().round(4), P[:, 2].max().round(4))
    def setuv(f, name):
        for l in f.loops: l[uvl].uv = (SWATCH[name], SWATCH_V)
    rings = [(.012, w_m * .98, .0095), (.032, .040, .021), (.055, .045, .028), (.080, .040, .027), (.100, .024, .019), (.112, .008, .008)]
    prev = list(chain); N = len(chain)
    for dy, rx, rz in rings:
        cur = []
        for i in range(N):
            v = bm.verts.new((c[0] + rx * math.cos(T[i]), c[1] + dy, zm + rz * math.sin(T[i]) - dy * .05))
            v[pl] = 7 if math.sin(T[i]) >= 0 else 10; v[dv][gi] = 1.0; cur.append(v)
        for i in range(N):
            j = (i + 1) % N
            f = bm.faces.new((prev[i], prev[j], cur[j], cur[i])); f.material_index = 1; f.smooth = True; setuv(f, "mouth")
        prev = cur
    f = bm.faces.new(prev); f.material_index = 1; f.smooth = True; setuv(f, "mouth")

    def blob(p, r, sub, name, part, box=.62):
        g = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
        for v in g["verts"]:
            q = v.co
            v.co = Vector((math.copysign(abs(q.x) ** box, q.x) * r[0], math.copysign(abs(q.y) ** box, q.y) * r[1], math.copysign(abs(q.z) ** box, q.z) * r[2]))
            v.co = p[1] @ v.co + p[0]
            v[pl] = part; v[dv][gi] = 1.0
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = 1; f.smooth = True; setuv(f, name)
    yf = float(c[1]) + .014
    def arch(z, sizes, part, yback):
        n = len(sizes); yf_ = yf
        L = sum(w * 2 for w, h in sizes)
        for side in (1, -1):
            d = .0
            for i, (w, h) in enumerate(sizes):
                d += w
                a = d / L * 1.42
                x = side * .0325 * math.sin(a); y = yf_ + yback * (1 - math.cos(a))
                yaw = Matrix.Rotation(-side * a * .95, 3, "Z")
                blob((Vector((x, y, z)), yaw), (w * .99, .0026, h), 1, "teeth", part, .42)
                d += w
    arch(zm + .0074, [(.0042, .0066), (.0034, .0060), (.0037, .0064), (.0036, .0058), (.0036, .0056), (.0048, .0052), (.0050, .0048)], 9, .046)
    yf += .0035
    arch(zm - .0080, [(.0030, .0056), (.0031, .0056), (.0034, .0058), (.0035, .0054), (.0036, .0052), (.0048, .0048), (.0050, .0046)], 8, .042)
    blob((Vector((0, c[1] + .056, zm - .0185)), Matrix.Identity(3)), (.027, .040, .0085), 2, "tongue", 8, .9)
    head_faces = [f for f in bm.faces if f.verts[0][pl] in (0, 7, 10)]
    bmesh.ops.recalc_face_normals(bm, faces=head_faces)
    bm.normal_update()
    bm.to_mesh(me); bm.free(); me.update()
    return zm, P


def boundary_of(ob, part_ok):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    pl = bm.verts.layers.int.get("part")
    out = [[v.index for v in c] for c in boundary_loops(bm) if c[0][pl] in part_ok]
    bm.free()
    return out


def face_keys(ob, zm, lip):
    me = ob.data
    v = co(ob); part = np.zeros(len(v), int); me.attributes["part"].data.foreach_get("value", part)
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    e = edges_of(ob)
    head = (part == 0) | (part >= 6)
    skin = part == 0
    # ---- the jaw
    order = np.argsort(lip[:, 0]); lx = lip[order, 0]; lz = lip[order, 2]
    zl = np.interp(x, lx, lz)
    hw = float(np.abs(lip[:, 0]).max())
    near = smoothstep(hw + .012, hw + .001, np.abs(x))
    wz = near * smoothstep(zl + .004, zl - .004, z) + (1 - near) * smoothstep(zm + .022, zm - .034, z)
    wj = wz * smoothstep(.02, -.02, y) * skin
    wj = wj * smoothstep(1.47, 1.525, z)                     # the jaw lifts off the neck: the neck itself stays where it is
    # The two lips: flood from a point on each, inside the width of the mouth, stopping at the lip line. Height can't
    # separate them, because the inside of the upper lip dips below the line.
    from mathutils import kdtree
    kd = kdtree.KDTree(len(v))
    for i, q in enumerate(v): kd.insert(q.tolist(), i)
    kd.balance()
    N_ = len(lip); chain = {}
    for i, q in enumerate(lip):
        c_, id_, d_ = kd.find(q.tolist())
        if d_ < 1e-4: chain[id_] = math.sin(i / N_ * 2 * math.pi)
    band = skin & (x > lip[:, 0].min() + .0015) & (x < lip[:, 0].max() - .0015) & (np.abs(z - zm) < .017) & (y < -.09)
    adj = {}
    for a_, b_ in e:
        if band[a_] and band[b_]:
            adj.setdefault(a_, []).append(b_); adj.setdefault(b_, []).append(a_)
    def flood(seed):
        seen_ = {seed}; st_ = [seed]
        while st_:
            q = st_.pop()
            for t_ in adj.get(q, ()):
                if t_ not in seen_ and t_ not in chain: seen_.add(t_); st_.append(t_)
        return seen_
    ids_ = np.where(band)[0]
    su = ids_[np.argmin(np.abs(x[ids_]) * 4 + np.abs(z[ids_] - (zm + .012)) + np.abs(y[ids_] + .125))]
    sl = ids_[np.argmin(np.abs(x[ids_]) * 4 + np.abs(z[ids_] - (zm - .013)) + np.abs(y[ids_] + .125))]
    Fu = flood(int(su)); Fl = flood(int(sl))
    print("LIPS upper", len(Fu), "lower", len(Fl), "both", len(Fu & Fl), "chain", len(chain))
    # The lips follow an oval, not a slot: full drop at the middle of the lower lip, half at the corners, a little of the upper.
    u_ = np.clip(np.abs(x - float(lip[:, 0].mean())) / hw, 0, 1)
    p_lo = .5 + .5 * np.sqrt(1 - u_ ** 2); p_up = .5 * u_ ** 3
    wj[list(Fu - Fl)] = p_up[list(Fu - Fl)]; wj[list(Fl - Fu)] = p_lo[list(Fl - Fu)]
    for i, sn in chain.items(): wj[i] = p_up[i] if sn > .1 else p_lo[i] if sn < -.1 else .5
    m_ = np.where(skin, 1., 0.); m_[list(Fu | Fl)] = 0; m_[list(chain)] = 0
    wj = laplace(np.c_[wj, wj, wj], e, 12, .5, m_)[:, 0]
    wj = np.where(part == 8, 1., wj)
    wj = np.where(part == 7, p_up, wj)
    wj = np.where(part == 10, smoothstep(.02, -.03, y) * p_lo, wj)
    wj = np.where(~head, 0., wj)
    hinge = np.array([0, -.012, 1.622])
    def jaw(deg):
        a = np.radians(deg) * wj
        d = v - hinge
        out = np.zeros_like(v)
        out[:, 1] = d[:, 1] * np.cos(a) - d[:, 2] * np.sin(a) - d[:, 1]
        out[:, 2] = d[:, 1] * np.sin(a) + d[:, 2] * np.cos(a) - d[:, 2]
        return out * head[:, None]
    # ---- eyelids
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    pl = bm.verts.layers.int.get("part")
    tree = BVHTree.FromBMesh(bm)
    up = np.zeros(len(v)); lo = np.zeros(len(v)); ey_shut = np.zeros_like(v)
    for ex, ez in (EYE_R, EYE_L):
        xs = []; zu_ = []; zl_ = []
        for qx in np.arange(ex - .021, ex + .021, .0008):
            hits = []
            for qz in np.arange(ez - .012, ez + .012, .0003):
                h = tree.ray_cast(Vector((qx, -.25, qz)), Vector((0, 1, 0)), .3)
                if h[0] is not None and bm.faces[h[2]].verts[0][pl] == 6: hits.append(qz)
            if len(hits) > 1:
                xs.append(qx); zu_.append(max(hits)); zl_.append(min(hits))
        print("EYE OPENING", round(float(ex), 3), "x", round(xs[0], 4), round(xs[-1], 4), "height", round(max(a_ - b_ for a_, b_ in zip(zu_, zl_)), 4))
        xs = np.array(xs); zu_ = np.array(zu_); zl_ = np.array(zl_)
        for _ in range(3):
            zu_[1:-1] = (zu_[:-2] + zu_[1:-1] * 2 + zu_[2:]) / 4; zl_[1:-1] = (zl_[:-2] + zl_[1:-1] * 2 + zl_[2:]) / 4
        mid = (zu_[0] + zl_[0] + zu_[-1] + zl_[-1]) / 4
        xp = np.r_[xs[0] - .0015, xs, xs[-1] + .0015]
        ru = np.interp(x, xp, np.r_[mid, zu_, mid]); rl = np.interp(x, xp, np.r_[mid, zl_, mid])
        span = (xs[-1] - xs[0]) / 2 + .006; cx = (xs[0] + xs[-1]) / 2
        side = (np.abs(x - cx) < span + .004) & skin & (y < -.07)
        fade = smoothstep(span + .004, span - .0045, np.abs(x - cx))
        zu = z - ru; zd = rl - z
        wu = side * fade * np.where(zu >= -.0004, np.clip(1 - zu / .0130, 0, 1) ** 1.3, 0)
        wl = side * fade * np.where(zd >= -.0004, np.clip(1 - zd / .0075, 0, 1) ** 1.3, 0)
        up += wu; lo += wl
        meet = rl + .0026
        ey_shut[:, 2] += wu * (meet - ru) + wl * .0026
        # the lid rides over the eyeball as it closes
        zn = z + wu * (meet - ru)
        ball = EYE_Y - np.sqrt(np.clip((EYE_RAD + .0011) ** 2 - (x - ex) ** 2 - (zn - ez) ** 2, 0, None)) - .0013
        ey_shut[:, 1] += wu * np.minimum(ball - y, 0) * (np.abs(x - ex) < .0125)
    bm.free()
    ey_shut = laplace(ey_shut, e, 5, .5, skin * smoothstep(.0, .05, up + lo) * smoothstep(1.0, .5, up))
    def lids(k_up, k_lo):
        d = np.zeros_like(v); d[:, 2] = up * k_up + lo * k_lo
        return d
    def brows(inner, outer):
        d = np.zeros_like(v)
        for s in (1, -1):
            b = skin * np.exp(-((x - s * .036) / .032) ** 2 - ((z - 1.692) / .016) ** 2)
            i_ = smoothstep(.05, .008, np.abs(x)) * (x * s > 0)
            d[:, 2] += b * (x * s > -.002) * (inner * i_ + outer * (1 - i_))
        return d
    def corners(dx, dz, dy, sx=.025, sz=.021):
        d = np.zeros_like(v)
        for s in (1, -1):
            cx = lip[:, 0].max() if s > 0 else lip[:, 0].min()
            cz = lip[np.argmax(lip[:, 0] * s), 2]
            w_ = skin * np.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
            w_ = w_ * smoothstep(.0, -.06, y)
            d[:, 0] += w_ * dx * s; d[:, 2] += w_ * dz; d[:, 1] += w_ * dy
        return d
    def cheek_up(k):
        d = np.zeros_like(v)
        for s in (1, -1):
            w_ = skin * np.exp(-(((x - s * .045) / .02) ** 2 + ((z - 1.615) / .018) ** 2)) * smoothstep(.0, -.05, y)
            d[:, 2] += w_ * k; d[:, 1] -= w_ * k * .4
        return d
    def cheek_in(k):
        d = np.zeros_like(v)
        for s in (1, -1):
            w_ = skin * np.exp(-(((x - s * .052) / .022) ** 2 + ((z - 1.578) / .026) ** 2)) * smoothstep(.0, -.05, y)
            d[:, 0] -= w_ * k * s
        return d
    upper_lip = skin * smoothstep(.034, .004, np.abs(x)) * np.exp(-((z - (zm + .005)) / .008) ** 2) * (y < -.1)
    ulip = np.zeros_like(v); ulip[:, 2] = upper_lip * .0035
    # The upper lip stays down over the teeth when he speaks: it relaxes and comes forward a little, it never lifts.
    usoft = np.zeros_like(v); usoft[:, 2] = -upper_lip * .0014; usoft[:, 1] = -upper_lip * .0018
    keys = {
        "jawOpen": jaw(14) + usoft + corners(-.0042, -.0024, .0010, .028, .024) + cheek_in(.0012),
        "blink": ey_shut,
        "eyesWide": lids(.0042, -.0024) + brows(.0045, .0035),
        "smile": jaw(3) + corners(.0075, .0105, .0085, .023, .024) + cheek_up(.0062) + lids(-.0012, .0026) + ulip * .3,
        "fear": jaw(6) + lids(.0030, -.0014) + brows(.0058, .0005) + corners(.0036, -.0030, .0010, .026, .023) + usoft * .7,
    }
    ob.shape_key_add(name="Basis", from_mix=False)
    for k, d in keys.items():
        sk = ob.shape_key_add(name=k, from_mix=False)
        sk.slider_min = 0; sk.slider_max = 1; sk.value = 0
        sk.data.foreach_set("co", (v + d).astype(np.float32).flatten())
        print("KEY", k, "max move", round(float(np.linalg.norm(d, axis=1).max()), 4))
    ob.active_shape_key_index = 0
    me.update()


def shirt_lining(ob):
    """The inside of the shirt. Nothing lives in there and backfaces are culled, so a sleeve or armhole that opened in a bend looked
    straight through him. A second skin just inside the cloth, facing in, with the same UVs and weights, so an opening shows the
    inside of the cloth. It goes on after the bakes, so it can't overprint them."""
    part = np.zeros(len(ob.data.vertices), int); ob.data.attributes["part"].data.foreach_get("value", part)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    near = {v for v in bm.verts if part[v.index] == 3 and v.is_boundary}
    for _ in range(10): near |= {e.other_vert(v) for v in near for e in v.link_edges}   # clear of the folds at the collar, sleeves and hem
    faces = [f for f in bm.faces if all(part[v.index] == 3 for v in f.verts) and not any(v in near for v in f.verts)]
    bm.normal_update()
    d = bmesh.ops.duplicate(bm, geom=faces)
    nf = [g for g in d["geom"] if isinstance(g, bmesh.types.BMFace)]
    nv = [g for g in d["geom"] if isinstance(g, bmesh.types.BMVert)]
    for v_ in nv: v_.co -= v_.normal * .004
    bmesh.ops.reverse_faces(bm, faces=nf)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()
    print("LINING", len(nf), "faces")


def stage_final():
    """Joins the hair in, bakes the normal and occlusion maps from the painted heights, and exports.
    With PERSON_FAST set it skips the bakes and the export, for iterating on the shape keys."""
    FAST = bool(os.environ.get("PERSON_FAST"))
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "hair.blend"))
    ob = bpy.data.objects["Person"]; h = bpy.data.objects["Hair"]
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); h.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()
    me = ob.data
    zm, lip = build_mouth(ob)
    print("FINAL TRIS", sum(len(p.vertices) - 2 for p in me.polygons), "UV", [u.name for u in me.uv_layers], "MATS", [m.name for m in me.materials])
    if FAST:
        shirt_lining(ob)
        face_keys(ob, zm, lip)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "final.blend"))
        return
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.device = "CPU"; s.cycles.samples = 1; s.cycles.use_denoising = False
    R = 2048
    for mi, (mat, nm) in enumerate(zip(me.materials, ("Body", "Head"))):
        mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
        o_ = nt.nodes.new("ShaderNodeOutputMaterial"); bs = nt.nodes.new("ShaderNodeBsdfDiffuse"); nt.links.new(bs.outputs[0], o_.inputs[0])
        H = np.load(os.path.join(WORK, f"height{mi}.npy"))
        hi = bpy.data.images.new(f"h{mi}", R, R, float_buffer=True); hi.colorspace_settings.name = "Non-Color"
        A = np.dstack([H * 200 + .5] * 3 + [np.ones((R, R), np.float32)])
        hi.pixels.foreach_set(A.astype(np.float32).flatten())
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = hi; t.interpolation = "Cubic"
        b = nt.nodes.new("ShaderNodeBump"); b.inputs["Distance"].default_value = 1 / 200; b.inputs["Strength"].default_value = 1
        nt.links.new(t.outputs[0], b.inputs["Height"]); nt.links.new(b.outputs[0], bs.inputs["Normal"])
        o2 = bpy.data.images.new(nm + "_N", R, R, float_buffer=True); o2.colorspace_settings.name = "Non-Color"
        t2 = nt.nodes.new("ShaderNodeTexImage"); t2.image = o2; nt.nodes.active = t2
    activate(ob)
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", use_selected_to_active=False, margin=8, use_clear=True)
    for nm in ("Body", "Head"):
        im = bpy.data.images[nm + "_N"]; a_ = np.zeros(R * R * 4, np.float32); im.pixels.foreach_get(a_)
        save_png(a_.reshape(R, R, 4)[:, :, :3], os.path.join(OUT, nm + "_BumpMap.png"))
    # Ambient occlusion only touches ambient light in URP Lit: the TV's hard light stays untouched by it.
    s.cycles.samples = 12; s.world = None
    for mat, nm in zip(me.materials, ("Body", "Head")):
        nt = mat.node_tree
        o2 = bpy.data.images.new(nm + "_AO", 1024, 1024, float_buffer=True); o2.colorspace_settings.name = "Non-Color"
        t2 = nt.nodes.new("ShaderNodeTexImage"); t2.image = o2; nt.nodes.active = t2
    s.world = bpy.data.worlds.new("w")
    activate(ob)
    bpy.ops.object.bake(type="AO", use_selected_to_active=False, margin=8, use_clear=True)
    for nm in ("Body", "Head"):
        im = bpy.data.images[nm + "_AO"]; a_ = np.zeros(1024 * 1024 * 4, np.float32); im.pixels.foreach_get(a_)
        g = np.clip(a_.reshape(1024, 1024, 4)[:, :, 0], 0, 1)
        save_png(np.dstack([g, g, g]), os.path.join(OUT, nm + "_OcclusionMap.png"))
    for mat in me.materials: mat.node_tree.nodes.clear()
    textured(ob, lit=False)
    shirt_lining(ob)
    face_keys(ob, zm, lip)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "final.blend"))
    export_fbx()


def export_fbx():
    arm = bpy.data.objects["Armature"]; ob = bpy.data.objects["Person"]
    bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, "Person.fbx"), use_selection=True, use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, axis_forward="-Z", axis_up="Y", path_mode="RELATIVE", apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")
    import shutil
    for a_, b_ in (("Body_BaseMap", "Image_0"), ("Body_MetallicGlossMap", "Image_1"), ("Body_BumpMap", "Image_2"), ("Head_BaseMap", "Head_Base")):
        shutil.copyfile(os.path.join(OUT, a_ + ".png"), os.path.join(OUT, b_ + ".png"))
    print("DONE", os.path.join(OUT, "Person.fbx"))


def open_for_check():
    f = "final" if os.path.exists(os.path.join(WORK, "final.blend")) else "hair" if os.path.exists(os.path.join(WORK, "hair.blend")) else "maps"
    bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, f + ".blend"))
    textured(bpy.data.objects["Person"])


FINAL = False
for st in STAGES:
    if st == "build": stage_build(); quick("b", [("front", (0, -4, .9), (0, 0, .9), 2.0), ("side", (4, 0, .9), (0, 0, .9), 2.0), ("head", (.15, -4, 1.62), (0, 0, 1.62), .4), ("foot", (1, -2, .3), (0, 0, .1), .6)])
    elif st == "rig": stage_rig()
    elif st == "maps": stage_maps()
    elif st == "paint": stage_paint()
    elif st == "hair":
        stage_hair()
        quick("h", [("f", (0, -3, 1.65), (0, 0, 1.65), .36), ("s", (3, -.02, 1.65), (0, -.02, 1.65), .36), ("t", (1.6, -2, 2.2), (0, 0, 1.67), .36), ("b", (-1.5, 3, 1.8), (0, 0, 1.65), .36)], (600, 600))
    elif st == "final": stage_final(); FINAL = True
    elif st.startswith("check:"):
        open_for_check(); stage_checks("c", tuple(st.split(":")[1].split("+")))
