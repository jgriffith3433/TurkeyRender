"""The shared pastel kit: the estate, the flats, and the props that fill them. Everything is made by script.
   blender -b --factory-startup -P Director/tools/blender_estate.py [-- name name ...]
Writes Assets/MusicVideo/Props/Estate/<name>.fbx. No textures of its own: every face is one cell of estate_palette.png, so all pieces share estate.mat
(in a set: {"model": "Assets/MusicVideo/Props/Estate/x.fbx", "material": "Assets/MusicVideo/Props/Estate/estate.mat"}).

Coordinates below are Unity's: x right, y up, z forward, metres, pivot on the floor. U() turns them into Blender's for the exporter's axis settings.
A piece that pops up has its pivot where it stands, so `scale`, `pop` and `topple` work without an offset."""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix

ROOT = "C:/Projects/TKShock"
OUT = ROOT + "/Assets/MusicVideo/Props/Estate"
CELLS = json.load(open(ROOT + "/Director/tools/estate_palette.json"))
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)


def U(x, y, z):
    return Vector((-x, -z, y))


class K:
    """One piece being built. Every primitive paints its own new faces with one palette cell."""
    def __init__(s):
        s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new("UVMap"); s.done = 0; s.keep = set(); s.scan = False; s.mark = s.bm.faces.layers.int.new("painted")

    def _paint(s, col, smooth=False):
        # bmesh.ops.bevel frees faces, and the next primitive reuses those slots ahead of s.done: without this scan they stayed unpainted, on the empty palette corner, and rendered black.
        s.bm.faces.ensure_lookup_table()
        c = CELLS[col]
        todo = [f for f in s.bm.faces if not f[s.mark]] if s.scan else s.bm.faces[s.done:]
        for f in todo:
            f.smooth = smooth; f[s.mark] = 1
            for l in f.loops: l[s.uv].uv = c
        s.scan = False; s.done = len(s.bm.faces)

    def box(s, c, size, col, bevel=0.0):
        m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((size[0], size[2], size[1], 1))
        vs = bmesh.ops.create_cube(s.bm, size=1, matrix=m)["verts"]
        if bevel:
            es = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(s.bm, geom=vs + es, offset=bevel, segments=1, profile=.5, affect="EDGES")
            s.scan = True
        s._paint(col)
        s.scan = bool(bevel)

    def lathe(s, base, prof, col, seg=28, smooth=True):
        """prof: (radius, height) from bottom to top. A radius of 0 closes that end."""
        rows = []
        for r, h in prof:
            p = U(base[0], base[1] + h, base[2])
            if r < 1e-4: rows.append([s.bm.verts.new(p)])
            else: rows.append([s.bm.verts.new(p + Vector((math.cos(i / seg * 2 * math.pi) * r, math.sin(i / seg * 2 * math.pi) * r, 0))) for i in range(seg)])
        for a, b in zip(rows, rows[1:]):
            if len(a) == 1 and len(b) == 1: continue
            for i in range(seg):
                j = (i + 1) % seg
                if len(a) == 1: s.bm.faces.new((a[0], b[i], b[j]))
                elif len(b) == 1: s.bm.faces.new((a[i], a[j], b[0]))
                else: s.bm.faces.new((a[i], a[j], b[j], b[i]))
        if len(rows[0]) > 1: s.bm.faces.new(rows[0][::-1])
        if len(rows[-1]) > 1: s.bm.faces.new(rows[-1])
        s._paint(col, smooth)

    def sweep(s, path, w, h, col, closed=False, smooth=True, side=None):
        """A flat band along a path: w across, h thick. side is the across direction, or it is computed against up."""
        P = [U(*p) for p in path]; n = len(P); rows = []
        for i in range(n):
            a = P[(i - 1) % n] if closed or i > 0 else P[0]; b = P[(i + 1) % n] if closed or i < n - 1 else P[-1]
            t = (b - a).normalized()
            x = U(*side) - U(0, 0, 0) if side else t.cross(Vector((0, 0, 1)))
            if x.length < 1e-3: x = Vector((1, 0, 0))
            x.normalize(); y = x.cross(t).normalized()
            rows.append([s.bm.verts.new(P[i] + x * dx * w / 2 + y * dy * h / 2) for dx, dy in ((1, 1), (-1, 1), (-1, -1), (1, -1))])
        for i in range(n if closed else n - 1):
            a, b = rows[i], rows[(i + 1) % n]
            for k in range(4): s.bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
        if not closed: s.bm.faces.new(rows[0][::-1]); s.bm.faces.new(rows[-1])
        s._paint(col, smooth)

    def bar(s, a, b, r, col, seg=10):
        a = U(*a); b = U(*b); d = b - a
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        m = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length, matrix=m)
        s._paint(col, True)

    def ball(s, c, r, col, scale=(1, 1, 1), sub=3):
        m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((r * scale[0], r * scale[2], r * scale[1], 1))
        bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=1, matrix=m)
        s._paint(col, True)

    def hedge(s, c, size, seed=1, bump=.05, cuts=20, shape="box"):
        """Clipped green: a grid or a ball, pushed in and out by a sum of sines, three greens by the same field."""
        before = len(s.bm.verts)
        if shape == "box":
            m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((size[0], size[2], size[1], 1))
            vs = bmesh.ops.create_cube(s.bm, size=1, matrix=m)["verts"]
            es = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(s.bm, geom=vs + es, offset=.12, segments=3, profile=.5, affect="EDGES")
            bmesh.ops.subdivide_edges(s.bm, edges=[e for e in s.bm.edges if e.verts[0].index == -1 or True][-99999:] if False else list(s.bm.edges), cuts=0, use_grid_fill=True) if False else None
            s.bm.edges.ensure_lookup_table()
            bmesh.ops.subdivide_edges(s.bm, edges=[e for e in s.bm.edges if e.calc_length() > max(size) / cuts], cuts=int(cuts / 3), use_grid_fill=True)
        else:
            m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((size[0] / 2, size[2] / 2, size[1] / 2, 1))
            bmesh.ops.create_icosphere(s.bm, subdivisions=4, radius=1, matrix=m)
        s.bm.verts.ensure_lookup_table(); s.bm.normal_update()
        def field(p):
            a = math.sin(p.x * 7 + seed) * math.sin(p.y * 6.3 - seed) * math.sin(p.z * 8.1 + seed * 2)
            b = math.sin(p.x * 17 - seed) * math.sin(p.y * 19 + 1) * math.sin(p.z * 15)
            return a + b * .55
        for v in s.bm.verts[before:]:
            v.co += v.normal * field(v.co) * bump
        s.bm.normal_update(); s.bm.faces.ensure_lookup_table()
        for f in s.bm.faces[s.done:]:
            f.smooth = True
            v = field(f.calc_center_median())
            c2 = CELLS["hedge_c" if v < -.25 else "hedge_a" if v < .3 else "hedge_b"]
            for l in f.loops: l[s.uv].uv = c2
            f[s.mark] = 1
        s.done = len(s.bm.faces)

    def quad(s, a, b, c, d, n, rect=(0, 0, 1, 1)):
        """A single textured face, a b c d round it from u0,v0: a(u0 v0) b(u1 v0) c(u1 v1) d(u0 v1). n is its facing in Unity axes. Not painted from the palette."""
        vs = [s.bm.verts.new(U(*p)) for p in (a, b, c, d)]
        f = s.bm.faces.new(vs); f.normal_update()
        if f.normal.dot(U(*n) - U(0, 0, 0)) < 0: f.normal_flip()
        uv = {vs[0]: (rect[0], rect[1]), vs[1]: (rect[2], rect[1]), vs[2]: (rect[2], rect[3]), vs[3]: (rect[0], rect[3])}
        for l in f.loops: l[s.uv].uv = uv[l.vert]
        f[s.mark] = 1; s.keep.add(f); s.bm.faces.ensure_lookup_table(); s.done = len(s.bm.faces)

    def sheet(s, rows, inward, col):
        """A smooth open sheet from rows of points. inward: the way it should face, Unity axes."""
        V = [[s.bm.verts.new(U(*p)) for p in r] for r in rows]
        want = U(*inward) - U(0, 0, 0)
        for a, b in zip(V, V[1:]):
            for i in range(len(a) - 1):
                f = s.bm.faces.new((a[i], a[i + 1], b[i + 1], b[i])); f.normal_update()
                if f.normal.dot(want) < 0: f.normal_flip()
                s.keep.add(f)
        s._paint(col, True)

    def save(s, name):
        bmesh.ops.recalc_face_normals(s.bm, faces=[f for f in s.bm.faces if f not in s.keep])
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.export_scene.fbx(filepath="%s/%s.fbx" % (OUT, name), use_selection=True, object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                                 bake_space_transform=True, apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE", use_tspace=True,
                                 bake_anim=False, path_mode="STRIP", embed_textures=False)
        print("MADE", name, len(me.polygons), "faces")
        bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)


PIECES = {}


def piece(f):
    PIECES[f.__name__] = f
    return f


# ---------------------------------------------------------------------------------------------------- architecture bits
def window(k, x, y, z, w=1.5, h=2.8, out=-1, shutters=True, gl="blue_deep", wall="cream"):
    """A tall window on a wall whose front is at z, facing out (-1: -z). Glass, frame, glazing bars, sill, a pediment, mint shutters."""
    d = out
    k.box((x, y + h / 2, z + d * .02), (w + .3, h + .3, .06), wall, .01)
    k.box((x, y + h / 2, z + d * .05), (w, h, .04), gl)
    for i in (-1, 0, 1):
        k.box((x + i * w / 2, y + h / 2, z + d * .09), (.07, h, .05), "white")
    for j in (0, 1, 2, 3):
        k.box((x, y + h * j / 3, z + d * .09), (w, .06, .05), "white")
    k.box((x, y - .08, z + d * .16), (w + .5, .12, .3), "white", .02)
    k.box((x, y + h + .24, z + d * .12), (w + .6, .18, .22), "white", .03)
    if shutters:
        for s in (-1, 1):
            k.box((x + s * (w / 2 + .42), y + h / 2, z + d * .08), (.72, h, .06), "mint_deep", .01)
            for j in range(1, 9):
                k.box((x + s * (w / 2 + .42), y + h * j / 9, z + d * .12), (.62, .05, .03), "mint")


def pilaster(k, x, y, z, h, w=.6, out=-1, col="white"):
    k.box((x, y + .25, z + out * .1), (w + .24, .5, .3), col, .02)
    k.box((x, y + h / 2, z + out * .06), (w, h, .2), col)
    for i in (-2, -1, 0, 1, 2):
        k.box((x + i * w / 6, y + h / 2, z + out * .17), (.05, h - 1, .03), "cream")
    k.box((x, y + h - .18, z + out * .1), (w + .24, .36, .3), col, .02)
    k.box((x, y + h - .4, z + out * .16), (w + .05, .06, .1), "gold")


def cornice(k, x, y, z, w, out=-1):
    k.box((x, y, z + out * .1), (w, .42, .3), "white", .02)
    k.box((x, y + .3, z + out * .2), (w + .1, .2, .5), "white", .03)
    k.box((x, y - .3, z + out * .06), (w, .08, .16), "gold")
    n = int(w / .55)
    for i in range(n):
        k.box((x - w / 2 + (i + .5) * w / n, y + .02, z + out * .3), (.14, .22, .2), "cream")


def column(k, x, y, z, h, r=.42):
    prof = [(0, 0), (r * 1.45, 0), (r * 1.45, .12), (r * 1.3, .2), (r * 1.2, .34), (r * 1.08, .42), (r, .5)]
    for t in (.3, .55, .8, 1):
        prof.append((r * (1 - .14 * t * t), .5 + (h - 1.3) * t))
    prof += [(r * .92, h - .72), (r * 1.1, h - .62), (r * .9, h - .54), (r * 1.1, h - .3), (r * 1.5, h - .18), (r * 1.5, h), (0, h)]
    k.lathe((x, y, z), prof, "white", 24)
    k.lathe((x, y + h - .62, z), [(0, 0), (r * 1.14, 0), (r * 1.14, .1), (0, .1)], "gold", 24)


# ---------------------------------------------------------------------------------------------------- estate, outside
def wing(k, side):
    W, H = 15.6, 8.4
    k.box((0, H / 2, .25), (W, H, .5), "pink")
    k.box((0, .35, -.04), (W + .1, .7, .12), "pink_deep", .03)
    k.box((0, 4.1, -.05), (W, .16, .1), "white")
    cornice(k, 0, H, 0, W + .2)
    for i in range(-2, 3):
        x = i * 3.1
        window(k, x, .95, 0, 1.3, 2.5)
        window(k, x, 4.7, 0, 1.3, 2.5, shutters=False)
    for x in (-W / 2, W / 2):
        pilaster(k, x + (.3 if x < 0 else -.3), 0, 0, H - .3, .7)
    # the balustrade on top
    k.box((0, H + .75, .1), (W, .1, .3), "white")
    k.box((0, H + .22, .1), (W, .1, .3), "white")
    for i in range(int(W / .34)):
        k.lathe((-W / 2 + .17 + i * .34, H + .24, .1), [(0, 0), (.05, 0), (.09, .1), (.05, .34), (.06, .46), (.07, .48), (0, .5)], "white", 8)


@piece
def est_wing_l(): k = K(); wing(k, -1); k.save("est_wing_l")


@piece
def est_wing_r(): k = K(); wing(k, 1); k.save("est_wing_r")


@piece
def est_center():
    k = K(); W, H = 12.4, 11.2; DW, DH = 3.4, 5.4
    # the wall, in four parts round the door
    k.box((0, DH + (H - DH) / 2, .25), (W, H - DH, .5), "pink_deep")
    for s in (-1, 1):
        k.box((s * (W + DW) / 4, DH / 2, .25), ((W - DW) / 2, DH, .5), "pink_deep")
    # door surround and a fanlight
    for s in (-1, 1):
        k.box((s * (DW / 2 + .22), DH / 2, -.08), (.44, DH, .3), "white", .02)
    k.box((0, DH + .2, -.08), (DW + .9, .4, .3), "white", .02)
    k.lathe((0, DH + .3, -.07), [(0, 0), (DW / 2, 0), (DW / 2, .03), (0, .03)], "gold", 24) if False else None
    for s in (-1, 1):
        window(k, s * 4.2, .95, 0, 1.5, 3.2)
        window(k, s * 4.2, 5.9, 0, 1.5, 2.6, shutters=False)
    window(k, 0, 6.3, 0, 2.4, 2.8, shutters=False)
    cornice(k, 0, H, 0, W + .3)
    k.box((0, H - 3.6, -.05), (W, .16, .1), "white")
    for s in (-1, 1):
        pilaster(k, s * (W / 2 - .35), 0, 0, H - .3, .8)
    k.save("est_center")


@piece
def est_portico():
    k = K(); H = 7.4; Z = -4.2
    xs = [-5.6, -3.4, -1.3, 1.3, 3.4, 5.6]
    for x in xs: column(k, x, 0, Z, H)
    for z in (-.8,):
        for x in (-5.6, 5.6): pilaster(k, x, 0, z, H, .8)
    # entablature
    k.box((0, H + .28, Z / 2 - .1), (12.8, .56, abs(Z) + 1.4), "white", .03)
    k.box((0, H + .28, Z - .63), (12.9, .14, .06), "gold")
    k.box((0, H + .72, Z / 2 - .1), (13.3, .32, abs(Z) + 1.9), "white", .04)
    for i in range(24):
        k.box((-6.4 + i * .556, H + .6, Z - .86), (.16, .18, .2), "cream")
    # the pediment: a low triangle
    for sgn in (1, ):
        y0 = H + .88; hh = 2.2; w = 6.9
        vs = [U(-w, y0, Z - .7), U(w, y0, Z - .7), U(0, y0 + hh, Z - .7), U(-w, y0, .6), U(w, y0, .6), U(0, y0 + hh, .6)]
        V = [k.bm.verts.new(v) for v in vs]
        for f in ((0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (1, 4, 5, 2), (0, 3, 4, 1)):
            k.bm.faces.new([V[i] for i in f])
        k._paint("pink")
        rake = math.atan2(hh, w)
        for s in (-1, 1):
            k.sweep([(s * (w + .3), y0 - .05, Z - .85), (0, y0 + hh + .15, Z - .85)], .34, .3, "white", smooth=False, side=(0, 0, 1))
            k.sweep([(s * (w + .3), y0 - .2, Z - .95), (0, y0 + hh, Z - .95)], .06, .08, "gold", smooth=False, side=(0, 0, 1))
        k.lathe((0, y0 + .5, Z - .78), [(0, 0), (.7, 0), (.7, .04), (0, .04)], "gold", 24) if False else None
        k.ball((0, y0 + .85, Z - .82), .55, "gold", (1, 1, .22), 3)
    k.box((0, .03, Z / 2), (12.4, .06, abs(Z) + 1.4), "marble_a")
    k.box((0, .06, -3.85), (3.2, .03, 9.3), "rose")
    k.save("est_portico")


@piece
def est_gate():
    k = K(); H = 3.2; W = 9
    for s in (-1, 1):
        k.box((s * W / 2, 1.9, 0), (.8, 3.8, .8), "cream", .03)
        k.box((s * W / 2, 3.9, 0), (1.05, .22, 1.05), "white", .03)
        k.lathe((s * W / 2, 4, 0), [(0, 0), (.3, 0), (.42, .3), (.3, .6), (.08, .78), (.12, .9), (0, 1.05)], "gold", 16)
        for i in range(1, 12):
            x = s * (.2 + i * .34)
            k.bar((x, 0, 0), (x, H - .35 + .55 * math.sin(i / 12 * math.pi / 2 + .1), 0), .025, "gold", 8)
            k.lathe((x, H - .35 + .55 * math.sin(i / 12 * math.pi / 2 + .1), 0), [(0, 0), (.05, .02), (.02, .16), (0, .18)], "gold", 6)
        k.box((s * 2.2, .5, 0), (4.1, .06, .05), "gold"); k.box((s * 2.2, 2.3, 0), (4.1, .06, .05), "gold")
        for i in range(30):
            q = i / 29 * math.pi
    k.save("est_gate")


@piece
def hedge_box():
    k = K(); k.hedge((0, .55, 0), (4, 1.1, .9), 2, .035, 30); k.box((0, .02, 0), (4.1, .04, 1), "white"); k.save("hedge_box")


@piece
def hedge_cone():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.44, 0), (.5, .08), (.42, .5), (.48, .56), (0, .56)], "white", 20)
    for y, r in ((1.0, .62), (1.8, .44), (2.4, .28)):
        k.hedge((0, y, 0), (r * 2, r * 2, r * 2), y * 7, .03, shape="ball")
    k.bar((0, .5, 0), (0, 2.8, 0), .03, "timber"); k.lathe((0, 2.7, 0), [(0, 0), (.07, .05), (.05, .13), (0, .2)], "gold", 10)
    k.save("hedge_cone")


@piece
def hedge_ball():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.36, 0), (.4, .08), (.33, .46), (.38, .5), (0, .5)], "white", 20)
    k.hedge((0, 1.1, 0), (1.3, 1.3, 1.3), 5, .03, shape="ball")
    k.save("hedge_ball")


@piece
def fountain():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (4.2, 0), (4.2, .55), (4, .62), (3.85, .62), (3.8, .3), (0, .3)], "white", 48)
    k.lathe((0, 0, 0), [(0, .38), (3.84, .38), (3.84, .4), (0, .4)], "water", 48)
    k.lathe((0, .3, 0), [(0, 0), (.9, 0), (.8, .2), (.42, .5), (.3, 1.3), (.44, 1.6), (0, 1.6)], "white", 24)
    k.lathe((0, 1.8, 0), [(.1, 0), (.5, 0), (1.5, .3), (1.9, .55), (1.85, .62), (1.5, .4), (.6, .4), (0, .42)], "white", 36)
    k.lathe((0, 2.2, 0), [(0, 0), (1.5, 0), (1.5, .02), (0, .02)], "water", 36)
    k.lathe((0, 2.1, 0), [(.5, 0), (.26, .3), (.2, 1), (.3, 1.2), (0, 1.2)], "white", 16)
    k.lathe((0, 3.25, 0), [(.08, 0), (.3, 0), (.9, .2), (1.1, .34), (1.05, .4), (.8, .3), (0, .3)], "white", 28)
    k.lathe((0, 3.6, 0), [(0, 0), (.14, .05), (.1, .3), (.22, .5), (.05, .8), (0, .85)], "gold", 16)
    k.save("fountain")


# ---------------------------------------------------------------------------------------------------- hall
@piece
def hall_landing_door():
    k = K()
    k.box((0, 2.6, 0), (3.6, 5.2, .15), "white", .02); k.box((0, 2.3, -.1), (2.6, 4.6, .1), "gold", .01)
    for x in (-.66, .66):
        k.box((x, 2.3, -.17), (1.2, 4.4, .08), "mint", .01)
        k.box((x, 3.2, -.22), (.84, 1.8, .03), "white"); k.box((x, 1.1, -.22), (.84, 1.2, .03), "white")
        k.ball((x * .14, 2.1, -.28), .06, "gold")
    k.save("hall_landing_door")


# ---------------------------------------------------------------------------------------------------- dining
@piece
def dining_table():
    """26 m long, 1.6 wide, 76 cm high. Cloth to the floor, a runner, gold legs at the ends only just showing."""
    k = K(); L, W = 26, 1.6
    k.box((0, .74, 0), (W, .03, L), "cloth", .01)
    for s in (-1, 1):
        k.box((s * (W / 2 + .006), .38, 0), (.012, .72, L), "cloth")
    k.box((0, .38, -L / 2 - .006), (W, .72, .012), "cloth"); k.box((0, .38, L / 2 + .006), (W, .72, .012), "cloth")
    n = 34
    for s in (-1, 1):
        for i in range(n):
            z = -L / 2 + (i + .5) * L / n
            k.bar((s * (W / 2 + .03), .02, z), (s * (W / 2 + .03), .7, z), .03, "cloth", 8)
    k.box((0, .757, 0), (.5, .006, L - .2), "gold")
    for s in (-1, 1):
        k.box((s * (W / 2 + .018), .6, 0), (.02, .03, L), "gold")
    k.save("dining_table")


def place_setting(k, x, z, ang=0):
    k.lathe((x, .755, z), [(0, 0), (.16, 0), (.16, .012), (.13, .012), (.1, .006), (0, .006)], "white", 24)
    k.lathe((x, .768, z), [(0, 0), (.12, 0), (.12, .004), (0, .004)], "pink", 24)
    k.box((x + .22, .757, z), (.016, .004, .2), "gold"); k.box((x - .22, .757, z), (.016, .004, .2), "gold")
    k.lathe((x + .2, .755, z - .2), [(0, 0), (.04, 0), (.008, .02), (.006, .12), (.03, .15), (.045, .25), (0, .25)], "glass", 12)


@piece
def dining_settings():
    """Candelabra and place settings for the whole table, one mesh."""
    k = K()
    for i in range(14):
        z = -12.2 + i * 1.88
        for s in (-1, 1):
            place_setting(k, s * .5, z)
        if i % 2 == 0:
            k.lathe((0, .755, z + .94), [(0, 0), (.14, 0), (.14, .03), (.05, .07), (.03, .26), (.05, .3), (.03, .4), (.06, .46), (0, .46)], "gold", 14)
            for a in (-1, 1):
                k.sweep([(0, 1.2, z + .94), (a * .12, 1.2, z + .94), (a * .2, 1.3, z + .94), (a * .2, 1.38, z + .94)], .03, .03, "gold", side=(0, 0, 1))
                k.lathe((a * .2, 1.38, z + .94), [(0, 0), (.022, 0), (.022, .18), (0, .18)], "candle", 8)
                k.ball((a * .2, 1.6, z + .94), .018, "flame", (1, 2, 1), 2)
            k.lathe((0, 1.2, z + .94), [(0, 0), (.022, 0), (.022, .34), (0, .34)], "candle", 8); k.ball((0, 1.58, z + .94), .018, "flame", (1, 2, 1), 2)
    k.save("dining_settings")


@piece
def dining_chair():
    k = K(); S = .47
    for x in (-.2, .2):
        for z in (-.2, .2):
            k.lathe((x, 0, z), [(0, 0), (.022, 0), (.028, .06), (.018, .2), (.03, .44), (0, S - .02)], "gold", 8)
    k.box((0, S - .03, 0), (.5, .06, .5), "gold", .01); k.box((0, S + .02, 0), (.46, .07, .46), "pink_deep", .025)
    for x in (-.21, .21): k.bar((x, S, .22), (x, 1.16, .24), .022, "gold", 8)
    k.sweep([(-.24, 1.13, .24), (-.14, 1.21, .24), (0, 1.25, .24), (.14, 1.21, .24), (.24, 1.13, .24)], .05, .03, "gold", side=(0, 0, 1))
    k.box((0, .87, .24), (.34, .56, .05), "pink", .02)
    k.save("dining_chair")


@piece
def dining_throne():
    """His chair at the end of the table: the same chair, too big."""
    k = K(); S = .47
    k.box((0, .22, 0), (.72, .44, .66), "gold", .02); k.box((0, S, 0), (.64, .1, .6), "rose", .03)
    k.box((0, 1.25, .36), (.82, 1.7, .1), "gold", .02); k.box((0, 1.2, .3), (.66, 1.4, .05), "rose", .02)
    for x in (-.4, .4):
        k.box((x, .72, .02), (.08, .05, .62), "gold", .01); k.bar((x, .44, -.26), (x, .72, -.26), .025, "gold", 8)
    k.ball((0, 2.2, .36), .12, "gold"); k.ball((-.42, 2.1, .36), .07, "gold"); k.ball((.42, 2.1, .36), .07, "gold")
    k.save("dining_throne")


@piece
def din_door():
    """The small plain door in the pink panel, hinge at x 0. Painted pink to match the wall on this side: he finds it only because the paint stops."""
    k = K()
    k.box((.46, 1.05, 0), (.92, 2.1, .04), "pink")
    k.box((.46, 1.05, .024), (.92, 2.1, .008), "ply")
    k.ball((.82, 1, -.05), .03, "silver")
    k.save("din_door")


# ---------------------------------------------------------------------------------------------------- small props
def gift(k, col, rib):
    k.box((0, .46, 0), (1, .92, 1), col, .012)
    k.box((0, .95, 0), (1.06, .16, 1.06), col, .015)
    for sx, sz in ((.2, 1.09), (1.09, .2)):
        k.box((0, .96, 0), (sx, .18, sz), rib)
        k.box((0, .46, 0), (sx - .08, .94, sz - .08), rib)
    # the bow: two loops, two tails, a knot
    for s in (-1, 1):
        pts = [(s * .02, 1.05, 0), (s * .2, 1.2, .03), (s * .42, 1.28, 0), (s * .46, 1.16, 0), (s * .22, 1.06, -.03), (s * .02, 1.05, 0)]
        k.sweep(pts, .16, .02, rib, side=(0, 0, 1))
        k.sweep([(s * .03, 1.04, .05), (s * .2, 1.05, .22), (s * .3, 1.04, .4)], .13, .012, rib, side=(1, 0, 0))
    k.ball((0, 1.07, 0), .07, rib, (1, .8, 1))


@piece
def gift_pink(): k = K(); gift(k, "pink", "gold"); k.save("gift_pink")


@piece
def gift_mint(): k = K(); gift(k, "mint", "rose"); k.save("gift_mint")


@piece
def gift_blue(): k = K(); gift(k, "blue", "white"); k.save("gift_blue")


@piece
def gift_lilac(): k = K(); gift(k, "lilac", "gold"); k.save("gift_lilac")


def balloon(k, col):
    prof = [(0, 0)]
    for i in range(1, 19):
        a = i / 19 * math.pi
        r = math.sin(a) ** .8 * .15 * (1 + .13 * math.cos(a))
        prof.append((r, .2 - math.cos(a) * .2))
    prof.append((0, .4))
    k.lathe((0, 0, 0), prof, col, 24)
    k.lathe((0, -.03, 0), [(0, 0), (.022, 0), (.008, .03), (.012, .04), (0, .04)], col, 10)
    pts = [(0, -.03, 0)]
    for i in range(1, 9):
        pts.append((.02 * math.sin(i * 1.3), -.03 - i * .14, .02 * math.cos(i * .9)))
    k.sweep(pts, .004, .004, "white", smooth=False)


for _c in ("pink", "mint", "blue", "gold", "lilac", "rose"):
    def _f(c=_c):
        k = K(); balloon(k, c); k.save("balloon_" + c)
    _f.__name__ = "balloon_" + _c
    PIECES["balloon_" + _c] = _f


@piece
def tray_silver():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.2, 0), (.215, .012), (.235, .024), (.225, .028), (.2, .014), (0, .014)], "silver", 40)
    for s in (-1, 1): k.bar((s * .225, .02, 0), (s * .26, .03, 0), .008, "silver", 6)
    k.save("tray_silver")


@piece
def cloche():
    """Dome, pivot on the rim, knob on top: lifting it is a `move` up."""
    k = K(); R = .17
    prof = [(R + .006, 0), (R, .008)]
    for i in range(1, 13):
        a = i / 13 * math.pi / 2
        prof.append((math.cos(a) * R, .008 + math.sin(a) * R * .9))
    prof.append((0, R * .9 + .008))
    k.lathe((0, 0, 0), prof, "silver", 36)
    k.lathe((0, R * .9, 0), [(0, 0), (.012, .0), (.008, .02), (.022, .03), (.018, .045), (0, .05)], "gold", 16)
    k.save("cloche")


@piece
def blade():
    """One blade of grass, 12 cm, stood on its base: a soft curved strap, wider in the lower third."""
    k = K(); n = 12
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((.012 * t * t, .12 * t, .03 * t * t))
    rows = []
    for (x, y, z), t in zip(pts, [i / n for i in range(n + 1)]):
        w = .0045 * (1.2 - t) * (1 if t < .85 else (1 - t) / .15 * .9 + .1)
        rows.append([k.bm.verts.new(U(x + dx * w, y, z + dz)) for dx, dz in ((1, 0), (0, .0012), (-1, 0), (0, -.0012))])
    for a, b in zip(rows, rows[1:]):
        for i in range(4): k.bm.faces.new((a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]))
    k.bm.faces.new(rows[0][::-1]); k.bm.faces.new(rows[-1])
    k._paint("blade", True)
    k.save("blade")


@piece
def flute():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.035, 0), (.036, .004), (.008, .012), (.005, .1), (.012, .118), (.026, .15), (.03, .2), (.024, .25), (0, .25)], "glass", 16)
    k.save("flute")


@piece
def easel_gold():
    k = K()
    for s in (-1, 1): k.bar((s * .55, 0, -.2), (0, 1.9, .05), .025, "gold", 8)
    k.bar((0, 0, .5), (0, 1.8, .05), .025, "gold", 8)
    k.box((0, .58, -.11), (1.5, .04, .16), "gold", .005)
    k.save("easel_gold")


@piece
def plinth():
    k = K()
    k.box((0, .04, 0), (.8, .08, .8), "white", .01); k.box((0, .55, 0), (.62, 1, .62), "cream", .01); k.box((0, 1.08, 0), (.8, .08, .8), "white", .01); k.box((0, 1.05, -.315), (.62, .04, .02), "gold")
    k.save("plinth")


@piece
def lawn_chair():
    """Cheap folding aluminium chair, webbing in tired green and white. Seat 44 cm, faces -z... the sitter faces the way the actor faces (+z)."""
    k = K(); S = .44; W = .5
    F = 1
    # side frames: a loop of tube each side
    for s in (-1, 1):
        x = s * W / 2
        k.bar((x, .02, F * .3), (x, S + .22, F * .28), .012, "alu", 8)       # front leg and arm post
        k.bar((x, .02, -F * .26), (x, S + .22, -F * .22), .012, "alu", 8)    # rear leg
        k.bar((x, .02, -.3), (x, .02, .34), .012, "alu", 8)                  # floor rail
        k.box((x, S + .23, F * .03), (.05, .014, .52), "web_white", .004)    # arm rest
        k.bar((x, S, F * .3), (x, S - .03, -F * .22), .012, "alu", 8)        # seat rail
        k.bar((x, S - .03, -F * .2), (x, S + .42, -F * .36), .012, "alu", 8) # back rail
    for t in ((0, .02, .32), (0, S, .3), (0, S - .03, -.22), (0, S + .42, -.36), (0, .02, -.28)):
        k.bar((-W / 2, t[1], t[2]), (W / 2, t[1], t[2]), .012, "alu", 8)
    for i in range(7):  # seat straps front to back, sagging; two have gone slack
        x = -W / 2 + .05 + i * (W - .1) / 6
        sag = .035 if i != 4 else .07
        k.sweep([(x, S + .005, .3), (x, S - sag, .05), (x, S - .025, -.22)], .05, .004, "web_green" if i % 2 else "web_white", smooth=False, side=(1, 0, 0))
    for i in range(5):
        y = .08 + i * .08
        k.sweep([(-W / 2, S + y - .02, -.215 - y * .3), (0, S + y - .03, -.2 - y * .3), (W / 2, S + y - .02, -.215 - y * .3)], .05, .004, "web_green" if i % 2 == 0 else "web_white", smooth=False, side=(0, 1, 0))
    k.save("lawn_chair")


# ---------------------------------------------------------------------------------------------------- the back of the set
@piece
def flat_brace():
    """A stage jack: a triangle of 2x4 that holds a flat up. Foot at z -2.6, top against the flat at z 0, 4.6 m up."""
    k = K(); H, B = 4.6, 2.6; t = .045
    k.box((0, H / 2, 0), (t * 2, H, t * 2), "timber")
    k.box((0, t, -B / 2), (t * 2, t * 2, B), "timber")
    k.sweep([(0, H, 0), (0, t, -B)], t * 2, t * 2, "timber", smooth=False, side=(1, 0, 0))
    k.sweep([(0, H * .45, 0), (0, t, -B * .55)], t * 2, t * 2, "ply_dark", smooth=False, side=(1, 0, 0))
    k.box((0, .1, -B), (.3, .02, .14), "grey")
    # the sandbag on its foot
    k.ball((0, .1, -B + .12), .22, "sand", (1.2, .55, .8))
    k.ball((0, .24, -B + .12), .17, "sand", (1.1, .5, .75))
    k.save("flat_brace")


@piece
def crate():
    k = K(); S = .46
    k.box((0, S / 2, 0), (.62, S, .46), "timber", .005)
    for y in (.08, .24, .4):
        for z in (-.235, .235): k.box((0, y, z), (.64, .12, .02), "ply_edge")
    for x in (-.32, .32): k.box((x, S / 2, 0), (.02, S, .48), "ply_dark")
    k.save("crate")


# ---------------------------------------------------------------------------------------------------- the painted surfaces (see estate_tex.py)
def rail_section(x, y, z, h=1):
    return x, y, z


def baluster(k, x, y, z, h=1.0, col="white"):
    k.lathe((x, y, z), [(0, 0), (.055, 0), (.055, .05), (.03, .1), (.06, .3 * h), (.075, .42 * h), (.03, .62 * h), (.024, .8 * h), (.05, .9 * h), (.05, h), (0, h)], col, 8)


def pframe(k, c, w, h, t, d, col, axis):
    """A raised frame on a wall. axis 'x': the wall runs along x. 'z': along z."""
    x, y, z = c
    if axis == "z":
        k.box((x, y + h / 2, z), (d, t, w), col, .008); k.box((x, y - h / 2, z), (d, t, w), col, .008)
        k.box((x, y, z + w / 2), (d, h, t), col, .008); k.box((x, y, z - w / 2), (d, h, t), col, .008)
    else:
        k.box((x, y + h / 2, z), (w, t, d), col, .008); k.box((x, y - h / 2, z), (w, t, d), col, .008)
        k.box((x + w / 2, y, z), (t, h, d), col, .008); k.box((x - w / 2, y, z), (t, h, d), col, .008)


@piece
def hall_floor():
    k = K(); k.quad((-13, 0, 0), (13, 0, 0), (13, 0, 23), (-13, 0, 23), (0, 1, 0)); k.save("hall_floor")


@piece
def hall_ceiling():
    k = K(); k.quad((-13, 11, 0), (13, 11, 0), (13, 11, 23), (-13, 11, 23), (0, -1, 0)); k.save("hall_ceiling")


@piece
def din_ceiling():
    k = K(); k.quad((-5.5, 7, 0), (-5.5, 7, 32), (5.5, 7, 32), (5.5, 7, 0), (0, -1, 0)); k.save("din_ceiling")


@piece
def hall_walls():
    """The papered walls, one mesh on the atlas: sides at the top of it, ends below."""
    k = K(); W, D, H = 13, 23, 11; DW, DH = 1.7, 5.4; e = .012
    side = (0, 1 - 980 / 2048, 1, 1); v0, v1 = 1 - 1866 / 2048, 1 - 1000 / 2048
    k.quad((-W + e, 0, 0), (-W + e, 0, D), (-W + e, H, D), (-W + e, H, 0), (1, 0, 0), side)
    k.quad((W - e, 0, 0), (W - e, 0, D), (W - e, H, D), (W - e, H, 0), (-1, 0, 0), side)
    k.quad((-W, 0, D - e), (W, 0, D - e), (W, H, D - e), (-W, H, D - e), (0, 0, -1), (0, v0, 1, v1))
    def fr(x0, x1, y0, y1):
        u = lambda x: (x + W) / (2 * W); v = lambda y: v0 + (v1 - v0) * y / H
        k.quad((x0, y0, e), (x1, y0, e), (x1, y1, e), (x0, y1, e), (0, 0, 1), (u(x0), v(y0), u(x1), v(y1)))
    fr(-W, -DW, 0, H); fr(DW, W, 0, H); fr(-DW, DW, DH, H)
    k.save("hall_walls")


@piece
def din_walls():
    k = K(); W, D, H = 5.5, 32, 7; e = .012
    side = (0, 1 - 446 / 2048, 1, 1); end = (0, 1 - 1773 / 2048, 1, 1 - 470 / 2048)
    k.quad((-W + e, 0, 0), (-W + e, 0, D), (-W + e, H, D), (-W + e, H, 0), (1, 0, 0), side)
    k.quad((W - e, 0, 0), (W - e, 0, D), (W - e, H, D), (W - e, H, 0), (-1, 0, 0), side)
    k.quad((-W, 0, D - e), (W, 0, D - e), (W, H, D - e), (-W, H, D - e), (0, 0, -1), end)
    k.quad((-W, 0, e), (W, 0, e), (W, H, e), (-W, H, e), (0, 0, 1), end)
    k.save("din_walls")


@piece
def din_floor():
    k = K(); k.quad((-5.5, 0, 0), (5.5, 0, 0), (5.5, 0, 32), (-5.5, 0, 32), (0, 1, 0)); k.save("din_floor")


@piece
def din_glass():
    """The windows' painted sky, each a slice of one picture, so the sky runs on behind the glazing bars."""
    k = K(); W = 5.5 - .09
    for s in (-1, 1):
        for i in range(8):
            z = 2 + i * 4; u0 = i / 8; u1 = (i + .8) / 8
            k.quad((s * W, .95, z - 1.15), (s * W, .95, z + 1.15), (s * W, 5.45, z + 1.15), (s * W, 5.45, z - 1.15), (-s, 0, 0), (u0, .15, u1, .85))
    k.save("din_glass")


@piece
def ground_plan():
    k = K(); k.quad((-150, 0, -135), (150, 0, -135), (150, 0, 165), (-150, 0, 165), (0, 1, 0)); k.save("ground_plan")


@piece
def hall_shell():
    """Bones of the hall: outer walls, cornice, pilasters, gold mirror frames, dado. Floor, paper and ceiling are their own pieces, on painted textures."""
    k = K(); W, D, H = 26, 23, 11; DW, DH = 3.4, 5.4; T = .4
    for s in (-1, 1):
        k.box((s * (W / 2 + T / 2), H / 2, D / 2), (T, H, D + 1), "pink")
        k.box((s * (W + DW) / 4, DH / 2, -T / 2), ((W - DW) / 2, DH, T), "pink")
    k.box((0, DH + (H - DH) / 2, -T / 2), (W, H - DH, T), "pink")
    k.box((0, H / 2, D + T / 2), (W, H, T), "pink")
    k.box((0, H + T / 2, D / 2), (W + 1, T, D + 1), "cream")
    for s in (-1, 1):
        for i in range(6):
            z = 1.9 + i * 3.8
            pil = s * (W / 2 - .13)
            k.box((pil, H / 2 - .1, z), (.26, H - .6, .78), "white", .02)                # the shaft
            k.box((pil - s * .1, H / 2 - .1, z), (.08, H - 1.8, .5), "cream", .01)       # the fluting panel
            for dz in (-.16, 0, .16): k.box((pil - s * .15, H / 2 - .1, z + dz), (.04, H - 2, .05), "white")
            k.box((pil, .3, z), (.34, .6, .96), "white", .02); k.box((pil, .64, z), (.3, .08, .9), "gold")
            k.box((pil, H - 1.2, z), (.36, .5, 1), "white", .02); k.box((pil - s * .1, H - 1.54, z), (.26, .1, .9), "gold"); k.ball((pil - s * .2, H - 1.2, z), .16, "gold", (.5, 1, 1), 2)
            if i < 5:
                zm = z + 1.9
                pframe(k, (s * (W / 2 - .05), 3.2, zm), 2.36, 4.66, .16, .1, "gold", "z")
                pframe(k, (s * (W / 2 - .05), 7.8, zm), 2.36, 1.76, .14, .1, "gold", "z")
                k.ball((s * (W / 2 - .09), 5.72, zm), .17, "gold", (.5, 1, 1.5), 2)
        k.box((s * (W / 2 - .05), .9, D / 2), (.1, .06, D), "gold")
        k.box((s * (W / 2 - .04), .45, D / 2), (.08, .9, D), "white")
        k.box((s * (W / 2 - .15), H - .3, D / 2), (.4, .6, D), "white")
        k.box((s * (W / 2 - .16), H - .68, D / 2), (.34, .1, D), "gold")
    for x in (-1, 1):
        k.box((x * (W + DW) / 4, .45, .06), ((W - DW) / 2, .9, .12), "white"); k.box((x * (W + DW) / 4, .92, .08), ((W - DW) / 2, .05, .1), "gold")
    for z in (.1, D - .1):
        k.box((0, H - .3, z), (W, .6, .4), "white"); k.box((0, H - .68, z), (W, .1, .3), "gold")
    # the door inside: pediment, a fanlight
    for s in (-1, 1): k.box((s * 2.0, DH / 2, .08), (.5, DH, .22), "white", .02); k.box((s * 1.78, DH / 2, .2), (.05, DH - .1, .05), "gold")
    k.box((0, DH + .25, .1), (4.8, .5, .26), "white", .02); k.box((0, DH + .03, .24), (4.4, .05, .05), "gold"); k.ball((0, DH + .9, .08), .5, "gold", (1, 1, .3), 2)
    # two ceiling roses, the chandeliers' roots
    for z in (5.2, 13.2):
        k.lathe((0, H - .12, z), [(0, 0), (.9, 0), (.9, .04), (.5, .1), (.5, .12), (0, .12)], "gold", 24)
    k.save("hall_shell")


@piece
def hall_stair():
    """The grand stair: from the floor at z 0 to a landing 4.2 m up at z 7, 7.6 wide, carpet down the middle. The landing runs wall to wall, panelled below, a real balustrade along it. Rails sweep out at the foot, with turned balusters and newels."""
    k = K(); N = 22; R = 4.2 / N; G = 7.0 / N; W = 7.6
    for i in range(N):
        y = R * (i + 1); z = G * i
        k.box((0, y / 2 - .01, z + G / 2), (W, y - .02, G), "cream")
        k.box((0, y - .015, z + G / 2 - .005), (W + .02, .03, G + .02), "marble_a")     # the tread, with a nose
        k.box((0, y - R / 2 - .015, z - .004), (W, R - .03, .012), "pink")                # the riser
        k.box((0, y + .012, z + G / 2), (3.2, .025, G + .02), "rose")
        k.box((0, y - R / 2, z - .012), (3.2, R, .02), "rose")
        for s in (-1, 1):
            k.box((s * 1.56, y + .03, z + .02), (.05, .03, .05), "gold"); k.box((s * 1.56, y - R / 2 + .02, z - .03), (.02, R - .05, .02), "gold")
            k.box((s * 1.72, y + .014, z + G / 2), (.12, .028, G + .02), "gold")
    k.box((0, 2.1, 8.5), (26.6, 4.2, 3), "cream")
    k.box((0, 4.215, 8.5), (3.2, .03, 3), "rose")
    k.box((0, 4.08, 7.0), (26.6, .2, .1), "white", .02); k.box((0, 3.92, 7.0), (26.6, .05, .08), "gold")
    k.box((0, .22, 6.98), (26.6, .44, .1), "white", .02)
    for s in (-1, 1):
        for x in (5.2, 7.6, 10, 12.3):   # pilasters and panels under the balcony
            k.box((s * x, 2, 6.97), (.36, 3.8, .12), "white", .01)
        for x in (6.4, 8.8, 11.15):
            k.box((s * x, 2.05, 6.985), (1.9, 2.9, .03), "pink"); pframe(k, (s * x, 2.05, 6.95), 1.9, 2.9, .08, .06, "gold", "x")
            k.lathe((s * x, .44, 6.5), [(0, 0), (.3, 0), (.34, .1), (.2, .24), (.42, .7), (.46, 1.0), (.32, 1.24), (.22, 1.32), (.3, 1.4), (0, 1.4)], "gold", 16)
            k.ball((s * x, 2.2, 6.5), .3, "hedge_a", (1, 1.1, 1), 2)
            k.lathe((s * x, 1.8, 6.5), [(0, 0), (.04, 0), (.04, .3), (0, .3)], "gold", 8)
    for s in (-1, 1):
        def foot(z):
            a = (z + 1.1) / 3.2
            return s * (W / 2 + .1 + (1.5 * (1 - a) ** 2 if a < 1 else 0))
        rail = []
        for i in range(26):
            z = -1.1 + 8.1 * i / 25
            rail.append((foot(z), max(z, 0) / 7 * 4.2 + 1.02, z))
        k.sweep(rail, .12, .09, "gold", side=(1, 0, 0))
        k.sweep([(x, y - .07, z) for x, y, z in rail], .06, .03, "white", side=(1, 0, 0))
        n = 24
        for i in range(n):
            z = -.75 + 7.7 * i / (n - 1)
            baluster(k, foot(z), max(z, 0) / 7 * 4.2, z, .96)
        x0 = foot(-1.1)
        k.lathe((x0, 0, -1.1), [(0, 0), (.3, 0), (.3, .2), (.2, .3), (.15, .9), (.21, 1.0), (.1, 1.16), (0, 1.18)], "white", 16)
        k.lathe((x0, 1.16, -1.1), [(0, 0), (.1, .1), (.15, .22), (.1, .34), (.03, .44), (0, .5)], "gold", 14)
        k.lathe((s * 3.9, 4.2, 7.0), [(0, 0), (.2, 0), (.2, .14), (.14, .2), (.12, 1.0), (.18, 1.12), (.08, 1.2), (0, 1.22)], "white", 12)
        k.ball((s * 3.9, 5.54, 7.0), .15, "gold", (1, 1.3, 1), 2)
        k.box((s * 8.4, 5.14, 7.0), (9.0, .08, .16), "gold", .01); k.box((s * 8.4, 4.26, 7.0), (9.0, .1, .22), "white")
        for i in range(24):
            baluster(k, s * (4.15 + i * .375), 4.3, 7.0, .84)
    k.save("hall_stair")


@piece
def chandelier_gold():
    """Pivot at the ceiling, hanging down -y, 3.4 m tall, 3.6 across. Three rings of arms, candles that glow, crystal drops."""
    k = K()
    k.bar((0, 0, 0), (0, -.9, 0), .03, "gold", 6)
    for i in range(5): k.ball((0, -.1 - i * .18, 0), .05, "gold", (1, 1.4, 1), 1)
    k.lathe((0, -3.2, 0), [(0, 0), (.06, .1), (.16, .26), (.1, .46), (.06, .7), (.22, .92), (.08, 1.2), (.05, 1.6), (.18, 1.76), (.06, 2.0), (.05, 2.3), (0, 2.34)], "gold", 14)
    k.ball((0, -3.3, 0), .13, "crystal", (1, 1.4, 1), 2)
    for R, y, n in ((1.75, -2.45, 10), (1.2, -1.75, 8), (.7, -1.15, 6)):
        ring = [(math.cos(a / 20 * 2 * math.pi) * R, y, math.sin(a / 20 * 2 * math.pi) * R) for a in range(20)]
        k.sweep(ring, .05, .05, "gold", closed=True, side=(0, 1, 0))
        for i in range(n):
            a = i / n * 2 * math.pi; c, s = math.cos(a), math.sin(a)
            k.sweep([(c * .08, y - .5, s * .08), (c * R * .5, y - .42, s * R * .5), (c * R, y - .2, s * R), (c * R, y, s * R)], .035, .035, "gold")
            k.lathe((c * R, y, s * R), [(0, 0), (.09, 0), (.1, .03), (.03, .05), (.022, .06), (.022, .26), (0, .26)], "candle", 8)
            k.ball((c * R, y + .3, s * R), .05, "glow", (.8, 1.6, .8), 1)
            for t in (.5, .5 + .5 / n):
                b = a + t * 2 * math.pi / n
                x, z = math.cos(b) * R, math.sin(b) * R
                k.ball((x, y - .14, z), .05, "crystal", (.7, 1.5, .7), 1)
            for d in (.3, .6):
                k.ball((c * R * d, y - .5 + d * .04 - .12, s * R * d), .036, "crystal", (.7, 1.4, .7), 1)
    k.save("chandelier_gold")


def curtain(k, s, z, c, W):
    """One curtain beside a window. s: wall side, c: which side of the glass. Pleated, drawn in at a tieback at 1.9 m."""
    x0 = s * (W - .2); rows = []
    for j in range(9):
        t = j / 8; y = 5.75 - t * 5.7
        tie = math.exp(-((y - 1.9) / .7) ** 2)
        wd = .78 - .42 * tie + (.08 * t)
        r = []
        for i in range(9):
            u = i / 8
            r.append((x0 - s * (.1 * math.sin(u * 4 * 2 * math.pi) * (1 - .5 * tie) + .08), y, z + c * (.76 + (u - .5) * wd + .16 * tie)))
        rows.append(r)
    k.sheet(rows, (-s, 0, 0), "pink_deep")
    k.sweep([(x0 - s * .24, 1.9, z + c * .62), (x0 - s * .28, 1.82, z + c * .9), (x0 - s * .1, 1.9, z + c * 1.14)], .08, .03, "gold", side=(0, 1, 0))
    k.ball((x0 - s * .3, 1.74, z + c * .9), .06, "gold", (1, 1.6, 1), 1)


def valance(k, s, z, W):
    x = s * (W - .34)
    for a in (-1, 0, 1):
        rows = []
        for j in range(4):
            r = []
            for i in range(9):
                u = i / 8; dz = (u - .5) * .9
                sag = (.62 - .1 * abs(a)) * math.sin(u * math.pi) * j / 3
                r.append((x - s * .1 * math.sin(u * math.pi) * j / 3, 6.1 - j * .06 - sag - (1 - j / 3) * .0, z + a * .78 + dz))
            rows.append(r)
        k.sheet(rows, (-s, 0, 0), "rose")
    for dz in (-1.22, -.4, .4, 1.22):
        k.ball((x - s * .04, 5.86, z + dz), .07, "gold", (1, 1, 1), 2); k.bar((x - s * .04, 5.86, z + dz), (x - s * .04, 5.54, z + dz), .018, "gold", 6)
    k.box((s * (W - .3), 6.14, z), (.14, .1, 2.8), "gold", .01)


@piece
def dining_shell():
    """32 m long, 11 wide, 7 high. z 0 is the near end, z 32 the far end. Windows with real curtains on both sides, piers, cornice. Floor, paper, ceiling, sky are their own pieces."""
    k = K(); W, D, H = 11, 32, 7; T = .4
    k.box((0, H + T / 2, D / 2), (W + 1, T, D + 1), "cream")
    for z in (-T / 2, D + T / 2): k.box((0, H / 2, z), (W, H, T), "pink")
    for s in (-1, 1):
        k.box((s * (W / 2 + T / 2), H / 2, D / 2), (T, H, D + 1), "pink")
        k.box((s * (W / 2 - .04), .45, D / 2), (.08, .9, D), "white"); k.box((s * (W / 2 - .05), .92, D / 2), (.09, .05, D), "gold")
        for i in range(8):
            z = 2 + i * 4
            pframe(k, (s * (W / 2 - .05), 3.2, z), 2.46, 4.66, .12, .12, "gold", "z")
            k.box((s * (W / 2 - .13), 3.2, z), (.05, 4.5, .06), "white")
            for y in (2.05, 3.2, 4.35): k.box((s * (W / 2 - .13), y, z), (.05, .05, 2.3), "white")
            for dz in (-.6, .6): k.box((s * (W / 2 - .13), 3.2, z + dz), (.04, 4.5, .03), "white")
            for c in (-1, 1): curtain(k, s, z, c, W / 2)
            valance(k, s, z, W / 2)
        for i in range(9):
            z = i * 4
            if 0 < i < 8 or True:
                k.box((s * (W / 2 - .14), 3.4, z), (.28, 6.8, .8), "white", .02); k.box((s * (W / 2 - .2), 3.3, z), (.06, 5.6, .46), "cream", .01)
                k.box((s * (W / 2 - .22), .36, z), (.36, .72, .96), "white", .02); k.box((s * (W / 2 - .22), 6.2, z), (.34, .4, .96), "white", .02); k.ball((s * (W / 2 - .34), 6.2, z), .13, "gold", (.5, 1, 1), 2)
        k.box((s * (W / 2 - .15), H - .25, D / 2), (.4, .5, D), "white"); k.box((s * (W / 2 - .16), H - .58, D / 2), (.34, .08, D), "gold")
    for z in (.1, D - .1):
        k.box((0, H - .25, z), (W, .5, .4), "white"); k.box((0, H - .6, z), (W, .08, .3), "gold")
        k.box((0, .45, z - .06 if z > 1 else z + .06), (W, .9, .08), "white")
    pframe(k, (-1.6, 3.6, D - .04), 5.5, 5.1, .2, .1, "gold", "x")
    for z in (8, 16, 24):
        k.lathe((0, H - .12, z), [(0, 0), (.6, 0), (.6, .04), (.3, .1), (.3, .12), (0, .12)], "gold", 20)
    k.save("dining_shell")


@piece
def est_roof():
    """Mansard roof over the wings and the centre, running back to cover the hall. Over the hall it starts above the ceiling, so nothing of it hangs in the room. Dormers, gold finials, a little cupola."""
    k = K()
    def hip(cx, w, y0, y1, d0, d1, col, inset):
        V = [U(cx - w / 2, y0, d0), U(cx + w / 2, y0, d0), U(cx + w / 2, y0, d1), U(cx - w / 2, y0, d1),
             U(cx - w / 2 + inset, y1, d0 + inset), U(cx + w / 2 - inset, y1, d0 + inset), U(cx + w / 2 - inset, y1, d1 - inset), U(cx - w / 2 + inset, y1, d1 - inset)]
        V = [k.bm.verts.new(v) for v in V]
        for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
            k.bm.faces.new([V[i] for i in f])
        k._paint(col)
    for s in (-1, 1):
        hip(s * 17.6, 8.6, 9.4, 12.4, -.3, 26, "blue_deep", 1.5)     # the outer end, clear of the hall
        hip(s * 9.65, 7.1, 11.4, 12.4, .85, 26, "blue_deep", .3)     # above the hall's ceiling
        k.box((s * 9.65, 10.4, .3), (7.1, 2.1, .9), "blue_deep")     # the attic front
        k.box((s * 9.65, 11.46, .3), (7.3, .12, 1), "white")
    hip(0, 12.6, 11.5, 15.8, -.3, 26, "blue", 2.4)
    for x in (-19, -14, -9, 9, 14, 19):
        k.box((x, 10.6, -.25), (1.2, 1.5, .9), "white", .03)
        k.box((x, 10.6, -.72), (.8, 1.1, .06), "blue_deep")
        k.lathe((x, 11.35, -.25), [(0, 0), (.85, 0), (.3, .5), (0, .6)], "pink_deep", 4, False)
    for x in (-3.4, 0, 3.4):
        k.box((x, 12.9, .9), (1.4, 1.8, 1.2), "white", .03)
        k.box((x, 12.9, .3), (.95, 1.3, .06), "blue_deep")
        k.lathe((x, 13.8, .9), [(0, 0), (1, 0), (.3, .55), (0, .65)], "pink", 4, False)
    k.lathe((0, 15.8, 12), [(0, 0), (2.2, 0), (2.2, .3), (1.8, .4), (1.8, 2.2), (2.1, 2.4), (2.1, 2.6), (1.2, 3.4), (.2, 4.2), (0, 4.3)], "white", 24)
    k.lathe((0, 20.1, 12), [(0, 0), (.14, 0), (.14, .4), (.26, .6), (.14, .85), (.04, 1.5), (0, 1.55)], "gold", 16)
    for x in (-21.6, -6.4, 6.4, 21.6):
        k.lathe((x, 12.3, 1.7), [(0, 0), (.1, 0), (.1, .3), (.2, .5), (.08, .8), (.02, 1.2), (0, 1.25)], "gold", 12)
    k.save("est_roof")


def ribbon_band(k, path, w, h, side, closed=False):
    """A satin band with two gold edges."""
    k.sweep(path, w, h, "ribbon", closed=closed, smooth=False, side=side)
    a = U(*side) - U(0, 0, 0)
    for e in (-1, 1):
        off = [(p[0] + side[0] * e * (w / 2 - .09), p[1] + side[1] * e * (w / 2 - .09), p[2] + side[2] * e * (w / 2 - .09)) for p in path]
        k.sweep(off, .14, h + .05, "gold", closed=closed, smooth=False, side=side)


@piece
def wrap_band():
    """The ribbon round the whole estate at wall height."""
    k = K(); y = 6.3
    ribbon_band(k, [(-22.8, y, -.9), (22.8, y, -.9), (22.8, y, 26.8), (-22.8, y, 26.8)], 3, .1, (0, 1, 0), True)
    k.save("wrap_band")


@piece
def wrap_cross():
    """The other way, over the top: up the front of the centre, over the roof and the cupola, down the back."""
    k = K()
    ribbon_band(k, [(0, 0, -5.4), (0, 9.2, -5.4), (0, 11, -4.8), (0, 16.45, -.2), (0, 16.45, 8.8), (0, 21, 11.2), (0, 21, 12.8), (0, 16.45, 15.2), (0, 16.45, 23.5), (0, 12, 27), (0, 0, 27)], 3, .1, (1, 0, 0))
    k.save("wrap_cross")


@piece
def wrap_bow():
    """The bow. Pivot at the knot. Two big satin loops, each folded so it reads as cloth, two tails with cut ends. About 26 m across."""
    k = K(); w = 5
    for s in (-1, 1):
        for layer, (sc, col, zo) in enumerate(((1, "ribbon", 0), (.72, "rose", -.9))):
            rows = []
            for i in range(29):
                a = i / 28 * 2 * math.pi
                lx = (5.4 + 5.4 * math.cos(a + math.pi)) * sc          # out along the loop, 0 at the knot
                ly = (3.6 * math.sin(a)) * sc * (.6 + .4 * lx / (10.8 * sc))
                up = lx * .34
                r = []
                for j in range(5):
                    t = (j / 4 - .5) * w * (.34 + .66 * min(1, lx / 3.5))
                    bulge = .9 * math.sin(j / 4 * math.pi) * math.sin(a)
                    r.append((s * (lx + .4), ly + up + 1.0 + .25 * math.sin(j / 4 * math.pi), t + zo + bulge * .2))
                rows.append(r)
            V = [[k.bm.verts.new(U(*p)) for p in r] for r in rows]
            for a_, b_ in zip(V, V[1:]):
                for i in range(4):
                    f = k.bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
            k._paint(col, True)
        tail = [(s * .3, -.2, -.5), (s * 2.6, -.6, -1.8), (s * 5, -3, -2.2), (s * 7, -6.6, -2.2), (s * 8, -10.4, -2)]
        k.sweep(tail, w * .86, .12, "ribbon", side=(s * .3, 0, 1))
        e = tail[-1]
        k.sweep([e, (e[0], e[1] - .9, e[2])], .1, .12, "gold", side=(1, 0, 0))
    k.ball((0, .9, 0), 2.1, "rose", (1, .9, .8), 3)
    k.sweep([(-1.5, .9, -1.65), (1.5, .9, -1.65)], 1.4, .08, "gold", side=(0, 1, 0))
    k.save("wrap_bow")


def flat_frame(k, W, H):
    """2x4 battens in a real grid with toggles and diagonal corner plates."""
    for x in (-W / 2 + .05, -W / 4, 0, W / 4, W / 2 - .05):
        k.box((x, H / 2, -.055), (.09, H, .045), "timber")
    for y in (.05, H / 3, H * 2 / 3, H - .05):
        k.box((0, y, -.055), (W, .09, .045), "timber")
    for x in (-W / 2 + .05, W / 2 - .05):
        for y, sg in ((.4, 1), (H / 3 + .4, 1), (H - .4, -1)):
            k.box((x + (.22 if x < 0 else -.22), y, -.085), (.42, .42, .012), "ply_dark")
    # screws on the battens
    for x in (-W / 2 + .05, W / 2 - .05):
        for i in range(10): k.ball((x, .4 + i * .8, -.08), .012, "grey_dark", sub=1)


@piece
def flat_back():
    """One flat's frame from behind, 4.88 wide, 8 high. The plywood skin behind the battens is the `ply_wall` actor, one long sheet, so the sheets, stains and marks run on across the row. The front is painted pink and only shows at the edges."""
    k = K(); W, H = 4.88, 8
    k.box((0, H / 2, .02), (W, H, .024), "pink")
    flat_frame(k, W, H)
    k.save("flat_back")


@piece
def flat_door():
    """A flat with the door in it: same size, a 1 by 2.1 hole, a framed opening, pink showing at the reveal."""
    k = K(); W, H = 4.88, 8; DW, DH = 1.0, 2.1
    k.box((0, DH + (H - DH) / 2, .012), (W, H - DH, .024), "pink")
    for s in (-1, 1):
        k.box((s * (W + DW) / 4, DH / 2, .012), ((W - DW) / 2, DH, .024), "pink")
        k.box((s * (W + DW) / 4, DH / 2, -.008), ((W - DW) / 2 - .01, DH, .016), "ply")
        k.box((s * (DW / 2 + .045), DH / 2 + .05, -.055), (.09, DH + .1, .09), "timber")
    k.box((0, DH + (H - DH) / 2, -.008), (W - .02, H - DH, .016), "ply_edge")
    k.box((0, DH + .045, -.055), (DW + .18, .09, .09), "timber")
    for x in (-W / 2 + .05, W / 2 - .05, -W / 4 - .2, W / 4 + .2):
        k.box((x, H / 2, -.055), (.09, H, .09), "timber")
    for y in (.05, H * 2 / 3, H - .05):
        if y > .1: k.box((0, y, -.055), (W, .09, .09), "timber")
    k.box((-(W + DW + .18) / 4, .05, -.055), ((W - DW - .18) / 2, .09, .09), "timber"); k.box(((W + DW + .18) / 4, .05, -.055), ((W - DW - .18) / 2, .09, .09), "timber")
    k.save("flat_door")


@piece
def frame_gold():
    """A gold frame, 1.6 by 1.2 outside, 1.24 by .84 open, front at -z, pivot at the bottom middle. The lawn in it is a real tuft: a raised turf in the opening."""
    k = K(); W, H, B = 1.6, 1.2, .18
    def rail(c, s): k.box(c, s, "gold", .02)
    rail((0, B / 2, 0), (W, B, .1)); rail((0, H - B / 2, 0), (W, B, .1))
    for s in (-1, 1): rail((s * (W - B) / 2, H / 2, 0), (B, H, .1))
    for y in (B + .01, H - B - .01): k.box((0, y, -.02), (W - 2 * B, .02, .1), "gold_dark")
    for x in (-(W - 2 * B) / 2, (W - 2 * B) / 2): k.box((x, H / 2, -.02), (.02, H - 2 * B, .1), "gold_dark")
    for i in range(24):
        a = i / 24
        for y in (.02, H - .02): k.ball((-W / 2 + a * W + W / 48, y, -.05), .022, "gold", (1, 1, .6), 1)
    for x, y in ((-W / 2, 0), (W / 2, 0), (-W / 2, H), (W / 2, H)): k.ball((x, y, -.05), .08, "gold", (1, 1, .5), 2)
    k.box((0, H / 2, .04), (W - 2 * B, H - 2 * B, .05), "hedge_c")
    import random
    r = random.Random(4)
    for i in range(420):   # blades of real length, standing out of the frame toward the viewer
        x = r.uniform(-.6, .6); y = r.uniform(.2, 1.0); l = r.uniform(.05, .1)
        k.bar((x, y, .02), (x + r.uniform(-.02, .02), y + l * .7, -.02 - l * .4), .006, "hedge_a" if i % 3 else "blade", 3)
    k.save("frame_gold")


@piece
def flute_grass():
    """A champagne flute with one blade standing in it, bubbles, a sliver of drink. Pivot at the foot; 25 cm tall at scale 1."""
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.036, 0), (.037, .004), (.009, .012), (.0055, .1), (.012, .118), (.027, .15), (.031, .2), (.0255, .25), (.024, .25), (.029, .2), (.025, .152), (.011, .122), (0, .116)], "glass", 20)
    k.lathe((0, .118, 0), [(0, 0), (.022, .03), (.028, .08), (.0272, .1), (0, .1)], "wine", 18)
    for i in range(14):
        a = i * 2.4; y = .125 + i * .0065; r = .006 + .012 * math.sin(i * 1.7) ** 2
        k.ball((math.cos(a) * r, y, math.sin(a) * r), .0018, "white", sub=1)
    pts = [(.002 * t * t * 3, .125 + .19 * t, .0 + .012 * t * t) for t in (0, .2, .4, .6, .8, 1)]
    k.sweep(pts, .007, .0012, "blade", smooth=True, side=(1, 0, 0))
    k.save("flute_grass")


@piece
def door_free():
    """A freestanding door in its own frame, on a low base, nothing either side of it. Pivot on the hinge side bottom? No: the actor is centred, so its pivot is the middle of the door at 1.7 m, as the old box was. The leaf swings on door_leaf."""
    k = K(); W, H = 1.5, 3.4
    k.box((0, -1.68, 0), (2.6, .06, 1.1), "white", .01)
    for s in (-1, 1):
        k.lathe((s * .98, -1.65, 0), [(0, 0), (.16, 0), (.16, .1), (.1, .16), (.085, 3.1), (.13, 3.2), (.13, 3.3), (0, 3.3)], "white", 10)
    k.box((0, 1.7, 0), (2.5, .22, .3), "white", .02); k.box((0, 1.84, 0), (2.7, .08, .4), "white", .02); k.box((0, 1.58, -.16), (2.4, .04, .02), "gold"); k.box((0, 1.58, .16), (2.4, .04, .02), "gold")
    k.lathe((0, 1.88, 0), [(0, 0), (.3, 0), (.22, .16), (.1, .3), (.05, .42), (0, .5)], "gold", 12)
    for s in (-1, 1): k.box((s * .8, 0, 0), (.1, 3.34, .22), "gold", .01)
    k.save("door_free")


@piece
def door_leaf():
    """The leaf: hinge at x 0 of the piece, swings by `rotate`. Pale panels, gold beading, a big knob. Centre of the door is x .75, y 0."""
    for name, col in (("door_leaf_cream", "cream"), ("door_leaf_pink", "pink"), ("door_leaf_mint", "mint")):
        k = K()
        k.box((.75, 0, 0), (1.48, 3.3, .08), col, .012)
        for yy, hh in ((.75, 1.55), (-.9, 1.15)):
            for t in (-1, 1):
                pframe(k, (.75, yy, t * .043), 1.04, hh, .035, .012, "gold", "x")
                k.box((.75, yy, t * .043), (.9, hh - .14, .006), "white")
        for t in (-1, 1): k.ball((1.38, -.1, t * .09), .05, "gold", sub=2); k.box((1.38, -.1, t * .055), (.07, .22, .012), "gold")
        k.save(name)


PIECES["door_leaf_cream"] = door_leaf
del PIECES["door_leaf"]


@piece
def bed_giant():
    """A bed for a giant: 7 wide, 8 long. Four gold posts, a canopy with pink swags, a quilted cover. Pivot on the floor in the middle of its foot-to-head length. Head at -z (toward the door in `bed_mark` it stands at z 10)."""
    k = K(); W, L = 7, 8
    k.box((0, .35, 0), (W, .7, L), "white", .03)
    for s in (-1, 1):
        k.box((s * (W / 2 + .01), .35, 0), (.02, .3, L - .3), "gold"); k.box((0, .35, s * (L / 2 + .01)), (W - .3, .3, .02), "gold")
    k.box((0, 1.05, 0), (W - .06, .7, L - .06), "cream", .12)
    rows = []
    for j in range(13):      # the quilt, tufted
        z = -L / 2 + 2.1 + (L - 2.1) * j / 12
        r = []
        for i in range(15):
            x = -(W + .24) / 2 + (W + .24) * i / 14
            e = min(1, abs(abs(x) - (W + .24) / 2) / .4)
            r.append((x, .35 + 1.1 * e + .06 * (math.cos(x * 3.6) * math.cos(z * 3.6) + 1) * e, z))
        rows.append(r)
    k.sheet(rows, (0, 1, 0), "pink")
    for i in range(-3, 4):
        k.ball((i * .87, 1.5, -L / 2 + 3 + 0), .05, "gold", sub=1); k.ball((i * .87, 1.5, 0), .05, "gold", sub=1); k.ball((i * .87, 1.5, 2.6), .05, "gold", sub=1)
    k.box((0, 1.0, L / 2 - .25), (W + .24, .9, .5), "pink", .08)
    # headboard
    k.box((0, 2.2, -L / 2 + .1), (W, 3.4, .2), "gold", .02); k.box((0, 2.3, -L / 2 + .22), (W - .6, 2.9, .1), "pink", .06)
    k.ball((0, 4.2, -L / 2 + .1), .5, "gold", (1.6, 1, .4), 2)
    for x in (-2.2, 0, 2.2):
        k.ball((x, 2, -L / 2 + 1.1), .95, "white", (1.25, .55, .8), 3)
    k.ball((0, 2.15, -L / 2 + 1.7), .6, "pink_deep", (1.3, .5, .6), 3)
    for s in (-1, 1):
        for z in (-1, 1):
            x, zz = s * (W / 2 + .1), z * (L / 2 + .05)
            k.lathe((x, 0, zz), [(0, 0), (.3, 0), (.3, .3), (.2, .4), (.14, .9), (.22, 1.2), (.13, 1.6), (.1, 6.6), (.2, 6.8), (.08, 7.0), (0, 7.1)], "gold", 12)
    k.box((0, 7.0, 0), (W + .6, .3, L + .6), "pink", .05); k.box((0, 6.84, 0), (W + .7, .05, L + .7), "gold")
    for s in (-1, 1):
        rows = []
        for j in range(4):
            r = []
            for i in range(17):
                u = i / 16; sag = .9 * abs(math.sin(u * 3 * math.pi)) * j / 3
                r.append((s * (W / 2 + .36), 6.9 - sag, -L / 2 - .3 + u * (L + .6)))
            rows.append(r)
        k.sheet(rows, (s, 0, 0), "rose")
    k.save("bed_giant")


@piece
def pillow_big():
    k = K(); k.ball((0, 0, 0), 1, "white", (1.3, .36, .72), 3); k.ball((0, .02, 0), .9, "white", (1.42, .22, .84), 3); k.save("pillow_big")


@piece
def easel_chart():
    """A gold easel for the chart boards: pivot at the middle of the board, which stands 1.0 by 1.3 in front of it. Legs go down 1.7."""
    k = K()
    for s in (-1, 1): k.bar((s * .75, -1.7, -.3), (s * .2, 1, .05), .03, "gold", 8)
    k.bar((0, -1.7, .7), (0, .9, .08), .03, "gold", 8)
    k.box((0, -.62, -.12), (1.7, .05, .2), "gold", .008); k.box((0, .62, -.04), (.5, .05, .1), "gold", .008)
    k.ball((0, 1.03, .06), .06, "gold", sub=2)
    k.save("easel_chart")


@piece
def pot_bow():
    """A small terracotta pot of real grass with a pink bow on it. Pivot at the foot; 22 cm tall with the grass."""
    k = K(); import random; r = random.Random(9)
    k.lathe((0, 0, 0), [(0, 0), (.07, 0), (.09, .1), (.094, .102), (.098, .125), (.082, .125), (.08, .11), (0, .11)], "terracotta", 20)
    for i in range(70):
        a = r.random() * 6.3; q = math.sqrt(r.random()) * .074; x, z = math.cos(a) * q, math.sin(a) * q
        t = (r.uniform(-.018, .018), r.uniform(.05, .1), r.uniform(-.018, .018))
        k.sweep([(x, .11, z), (x + t[0] * .4, .11 + t[1] * .6, z + t[2] * .4), (x + t[0] * 1.3, .11 + t[1], z + t[2] * 1.3)], .004, .001, "blade" if i % 2 else "hedge_c", smooth=True, side=(math.cos(a + 1.5), 0, math.sin(a + 1.5)))
    # ribbon round the pot, a bow on the front
    k.lathe((0, .07, 0), [(.0865, 0), (.0915, .0), (.094, .035), (.0885, .035)], "rose", 20)
    for s in (-1, 1):
        k.sweep([(s * .004, .087, -.095), (s * .03, .105, -.1), (s * .055, .1, -.102), (s * .05, .08, -.1), (s * .004, .087, -.095)], .022, .002, "rose", side=(0, 0, 1) if False else (0, .3, 1))
        k.sweep([(s * .004, .085, -.096), (s * .02, .06, -.103), (s * .03, .03, -.1)], .014, .002, "rose", side=(1, 0, .2))
    k.ball((0, .087, -.098), .009, "rose", sub=1)
    k.save("pot_bow")


todo = ONLY or list(PIECES)
for n in todo:
    PIECES[n]()
