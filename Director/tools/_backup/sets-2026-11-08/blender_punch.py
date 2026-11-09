"""Hawkes Punch's prop kit: the clinic, space and the commercial set. Everything is made by script, same method as blender_estate.py.
   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P Director/tools/blender_punch.py [-- name name ...]
Writes Assets/MusicVideo/Props/Punch/<name>.fbx. Palette faces are one cell of punch_palette.png (material slot 0: punch.mat); a piece with textured faces
wears one atlas material instead ({"material": ".../<tex>.mat"}: the picture plus the palette, see save()), so every piece has exactly one material.

Coordinates below are Unity's: x right, y up, z forward, metres, pivot on the floor for things that stand, at the centre for things that float
(planets, the satellite, the comet), at the hinge for a door, at the bridge for the glasses. Wall-hung things face -z (their front is toward -z)."""
import bpy, bmesh, json, math, os, sys, random
from mathutils import Vector, Matrix

ROOT = "C:/Projects/TKShock"
OUT = ROOT + "/Assets/MusicVideo/Props/Punch"
CELLS = json.load(open(ROOT + "/Director/tools/punch_palette.json"))
ONLY = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None
bpy.ops.wm.read_factory_settings(use_empty=True)


def U(x, y, z):
    return Vector((-x, -z, y))


class K:
    """One piece being built. Every primitive paints its own new faces with one palette cell, or marks them textured."""
    def __init__(s):
        s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new("UVMap"); s.done = 0; s.keep = set(); s.scan = False
        s.mark = s.bm.faces.layers.int.new("painted"); s.texd = s.bm.faces.layers.int.new("tex"); s.v0 = 0

    def _paint(s, col, smooth=False):
        s.bm.faces.ensure_lookup_table()
        c = CELLS[col]
        # bmesh.ops.bevel frees faces and later primitives reuse those slots anywhere in the table, so "the faces since s.done" is wrong after any bevel: always take every unpainted face.
        for f in [f for f in s.bm.faces if not f[s.mark]]:
            f.smooth = smooth; f[s.mark] = 1
            for l in f.loops: l[s.uv].uv = c
        s.scan = False; s.done = len(s.bm.faces)

    def _texed(s, smooth=True):
        s.bm.faces.ensure_lookup_table()
        for f in [f for f in s.bm.faces if not f[s.mark]]:
            f.smooth = smooth; f[s.mark] = 1; f[s.texd] = 1; s.keep.add(f)
        s.done = len(s.bm.faces)

    # -- a checkpoint and a turn of everything made since, about a point (Unity axes, degrees x y z)
    def at(s): s.bm.verts.ensure_lookup_table(); s.v0 = len(s.bm.verts)
    def turn(s, rx=0, ry=0, rz=0, about=(0, 0, 0)):
        s.bm.verts.ensure_lookup_table()
        m = Matrix.Translation(U(*about)) @ (Matrix.Rotation(math.radians(ry), 4, U(0, 1, 0) - U(0, 0, 0)) @ Matrix.Rotation(math.radians(rx), 4, U(1, 0, 0) - U(0, 0, 0)) @ Matrix.Rotation(math.radians(rz), 4, U(0, 0, 1) - U(0, 0, 0))) @ Matrix.Translation(-U(*about))
        for v in s.bm.verts[s.v0:]: v.co = m @ v.co

    def box(s, c, size, col, bevel=0.0):
        m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((size[0], size[2], size[1], 1))
        vs = bmesh.ops.create_cube(s.bm, size=1, matrix=m)["verts"]
        if bevel:
            es = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(s.bm, geom=vs + es, offset=bevel, segments=1, profile=.5, affect="EDGES")
            s.scan = True
        s._paint(col)
        s.scan = bool(bevel)

    def lathe(s, base, prof, col, seg=28, smooth=True, tex=False):
        """prof: (radius, height) from bottom to top. A radius of 0 closes that end. tex: u round, v from the first row (0) to the last (1), textured."""
        rows = []; hs = [h for _, h in prof]; h0, h1 = hs[0], hs[-1]
        for r, h in prof:
            p = U(base[0], base[1] + h, base[2])
            if r < 1e-4: rows.append([s.bm.verts.new(p)])
            else: rows.append([s.bm.verts.new(p + Vector((math.cos(i / seg * 2 * math.pi) * r, math.sin(i / seg * 2 * math.pi) * r, 0))) for i in range(seg)])
        faces = []
        for (a, ha), (b, hb) in zip(zip(rows, hs), zip(rows[1:], hs[1:])):
            if len(a) == 1 and len(b) == 1: continue
            for i in range(seg):
                j = (i + 1) % seg
                if len(a) == 1: f = s.bm.faces.new((a[0], b[i], b[j])); uvs = [(i + .5, ha), (i, hb), (i + 1, hb)]
                elif len(b) == 1: f = s.bm.faces.new((a[i], a[j], b[0])); uvs = [(i, ha), (i + 1, ha), (i + .5, hb)]
                else: f = s.bm.faces.new((a[i], a[j], b[j], b[i])); uvs = [(i, ha), (i + 1, ha), (i + 1, hb), (i, hb)]
                faces.append((f, uvs))
        if len(rows[0]) > 1: s.bm.faces.new(rows[0][::-1])
        if len(rows[-1]) > 1: s.bm.faces.new(rows[-1])
        if tex:
            for f, uvs in faces:
                for l, (u, h) in zip(f.loops, uvs): l[s.uv].uv = (u / seg, (h - h0) / max(1e-6, h1 - h0))
            s._texed(smooth)
        else: s._paint(col, smooth)

    def sweep(s, path, w, h, col, closed=False, smooth=True, side=None):
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

    def tube(s, path, r, col, seg=8, closed=False):
        """A round tube along a path (bars joined with balls at the joints)."""
        for a, b in zip(path, path[1:] + ([path[0]] if closed else [])): s.bar(a, b, r, col, seg)
        for p in (path if closed else path[1:-1]): s.ball(p, r, col, sub=1)

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

    def rock(s, c, r, cols, seed=1, bump=.25, scale=(1, 1, 1), sub=3):
        """A lumpy ball: an icosphere pushed by a sum of sines, shaded by height into the given cells (low to high)."""
        before = len(s.bm.verts)
        m = Matrix.Translation(U(*c)) @ Matrix.Diagonal((r * scale[0], r * scale[2], r * scale[1], 1))
        bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=1, matrix=m)
        s.bm.verts.ensure_lookup_table(); s.bm.normal_update()
        def field(p):
            a = math.sin(p.x * 2.1 + seed) * math.sin(p.y * 1.7 - seed) * math.sin(p.z * 2.6 + seed * 2)
            b = math.sin(p.x * 5.3 - seed) * math.sin(p.y * 6.1 + 1) * math.sin(p.z * 4.7)
            c2 = math.sin(p.x * 11 + 2) * math.sin(p.z * 9 - seed)
            return a + b * .5 + c2 * .2
        for v in s.bm.verts[before:]:
            d = (v.co - U(*c)); v.co += d.normalized() * field(d / r) * bump * r
        s.bm.normal_update(); s.bm.faces.ensure_lookup_table()
        for f in [f for f in s.bm.faces if not f[s.mark]]:
            f.smooth = True; v = field((f.calc_center_median() - U(*c)) / r)
            k = cols[min(len(cols) - 1, max(0, int((v + 1.2) / 2.4 * len(cols))))]
            for l in f.loops: l[s.uv].uv = CELLS[k]
            f[s.mark] = 1
        s.done = len(s.bm.faces)

    def uvsphere(s, c, r, seg=64, rings=32, inward=False, dent=None):
        """A textured sphere with an equirect map: u round from +x through +z, v up (image top at the north pole), the seam doubled. dent(dir)->radius scale."""
        rows = []
        for j in range(rings + 1):
            th = j / rings * math.pi; row = []
            for i in range(seg + 1):
                ph = i / seg * 2 * math.pi
                d = Vector((math.sin(th) * math.cos(ph), math.cos(th), math.sin(th) * math.sin(ph)))   # Unity axes
                rr = r * (dent(d) if dent else 1)
                v = s.bm.verts.new(U(c[0] + d.x * rr, c[1] + d.y * rr, c[2] + d.z * rr)); row.append((v, (i / seg, 1 - j / rings)))
            rows.append(row)
        for a, b in zip(rows, rows[1:]):
            for i in range(seg):
                quad = [a[i], a[i + 1], b[i + 1], b[i]]
                if inward: quad = quad[::-1]
                vs = [q[0] for q in quad]
                if len({v.index for v in vs}) < 4 and len({id(v) for v in vs}) < 4: continue
                try: f = s.bm.faces.new(vs)
                except ValueError: continue
                for l, q in zip(f.loops, quad): l[s.uv].uv = q[1]
        s._texed(True)

    def ring(s, c, r0, r1, seg=96, tex=True):
        """A flat annulus in the xz plane, both sides, u from the inner edge (0) to the outer (1), v round."""
        for flip in (False, True):
            inner = [s.bm.verts.new(U(c[0] + math.cos(i / seg * 2 * math.pi) * r0, c[1] + (.002 if flip else -.002), c[2] + math.sin(i / seg * 2 * math.pi) * r0)) for i in range(seg)]
            outer = [s.bm.verts.new(U(c[0] + math.cos(i / seg * 2 * math.pi) * r1, c[1] + (.002 if flip else -.002), c[2] + math.sin(i / seg * 2 * math.pi) * r1)) for i in range(seg)]
            for i in range(seg):
                j = (i + 1) % seg
                vs = [inner[i], outer[i], outer[j], inner[j]]; uvs = [(0, i / seg), (1, i / seg), (1, (i + 1) / seg), (0, (i + 1) / seg)]
                if flip: vs = vs[::-1]; uvs = uvs[::-1]
                f = s.bm.faces.new(vs)
                for l, uv in zip(f.loops, uvs): l[s.uv].uv = uv
        s._texed(True)

    def quad(s, a, b, c, d, n, rect=(0, 0, 1, 1)):
        """A single textured face, a b c d round it from u0,v0: a(u0 v0) b(u1 v0) c(u1 v1) d(u0 v1). n is its facing in Unity axes."""
        vs = [s.bm.verts.new(U(*p)) for p in (a, b, c, d)]
        f = s.bm.faces.new(vs); f.normal_update()
        if f.normal.dot(U(*n) - U(0, 0, 0)) < 0: f.normal_flip()
        uv = {vs[0]: (rect[0], rect[1]), vs[1]: (rect[2], rect[1]), vs[2]: (rect[2], rect[3]), vs[3]: (rect[0], rect[3])}
        for l in f.loops: l[s.uv].uv = uv[l.vert]
        s._texed(False)

    def sheet(s, rows, inward, col=None, tex=False):
        """A smooth open sheet from rows of points; inward is the way it should face. With tex, u along a row, v up the rows."""
        V = [[s.bm.verts.new(U(*p)) for p in r] for r in rows]
        want = U(*inward) - U(0, 0, 0); nr, nc = len(rows), len(rows[0])
        for j, (a, b) in enumerate(zip(V, V[1:])):
            for i in range(len(a) - 1):
                f = s.bm.faces.new((a[i], a[i + 1], b[i + 1], b[i])); f.normal_update()
                uvs = [(i / (nc - 1), j / (nr - 1)), ((i + 1) / (nc - 1), j / (nr - 1)), ((i + 1) / (nc - 1), (j + 1) / (nr - 1)), (i / (nc - 1), (j + 1) / (nr - 1))]
                if f.normal.dot(want) < 0: f.normal_flip(); uvs = uvs[::-1]
                if tex:
                    for l, uv in zip(f.loops, uvs): l[s.uv].uv = uv
                s.keep.add(f)
        if tex: s._texed(True)
        else: s._paint(col, True)

    def save(s, name):
        bmesh.ops.recalc_face_normals(s.bm, faces=[f for f in s.bm.faces if f not in s.keep])
        s.bm.faces.ensure_lookup_table()
        has_pal = any(not f[s.texd] for f in s.bm.faces); has_tex = any(f[s.texd] for f in s.bm.faces)
        if has_pal and has_tex:
            # One material only: Unity orders two submeshes as it likes, so "material2" lands on the wrong one. The piece's texture is an atlas instead
            # (punch_make.py: tex/<name>_atlas.png, the picture in the top 7/8, the palette in the bottom 1/8), and the UVs are remapped to it here.
            for f in s.bm.faces:
                for l in f.loops:
                    u, v = l[s.uv].uv; l[s.uv].uv = (u, 0.125 + v * 0.875) if f[s.texd] else (u, v * 0.125)
        for f in s.bm.faces: f.material_index = 0
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        me.materials.append(bpy.data.materials.get("tex" if has_tex else "punch") or bpy.data.materials.new("tex" if has_tex else "punch"))
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.export_scene.fbx(filepath="%s/%s.fbx" % (OUT, name), use_selection=True, object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                                 bake_space_transform=True, apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE", use_tspace=True,
                                 bake_anim=False, path_mode="STRIP", embed_textures=False)
        print("MADE", name, len(me.polygons), "faces", "atlas" if has_pal and has_tex else "tex" if has_tex else "pal")
        bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)


PIECES = {}


def piece(f):
    PIECES[f.__name__] = f
    return f


# ---------------------------------------------------------------------------------------------------- the clinic
@piece
def exam_bed():
    """1.9 by 0.7, pad top at 0.80, a raised head end, steel frame, a strip of paper down the middle (textured: paper_roll) and the roll at the head."""
    k = K(); L, W, H = 1.9, .7, .72
    for x in (-.8, .8):
        for z in (-.26, .26): k.bar((x, 0, z), (x, H - .02, z), .022, "steel")
    k.box((0, .05, 0), (1.7, .04, .58), "steel"); k.box((0, H - .03, 0), (L - .1, .06, W - .06), "steel")
    for x in (-.8, .8):
        for z in (-.26, .26): k.ball((x, .03, z), .035, "rubber")
    k.box((.15, H + .05, 0), (1.3, .1, W), "pad_blue", .02)   # the flat pad
    k.at(); k.box((-.6, H + .05, 0), (.62, .1, W), "pad_blue", .02); k.turn(0, 0, 22, about=(-.3, H + .05, 0))   # the head end, raised (z axis roll tips the x end up)
    k.box((.32, H + .1, 0), (.9, .005, .28), "paper")   # under the strip, so the quad never z-fights with the pad
    k.quad((-.28, H + .106, -.14), (.8, H + .106, -.14), (.8, H + .106, .14), (-.28, H + .106, .14), (0, 1, 0))
    k.at(); k.bar((-.95, H + .34, -.14), (-.95, H + .34, .14), .045, "paper"); k.turn(0, 0, 22, about=(-.3, H + .05, 0))
    k.bar((-.84, H + .2, -.16), (-.84, H + .2, .16), .008, "steel")
    k.save("exam_bed")


@piece
def desk():
    """1.5 by 0.75, top at 0.74. Laminate top, a drawer pedestal on the left, two steel legs on the right. Front is -z (the patient side)."""
    k = K()
    k.box((0, .735, 0), (1.5, .035, .75), "laminate", .006); k.box((0, .735, 0), (1.52, .02, .77), "laminate_edge")
    k.box((-.5, .355, 0), (.44, .71, .7), "off_white", .004)
    for y in (.16, .36, .56): k.box((-.5, y, -.351), (.4, .012, .006), "steel"); k.bar((-.56, y + .08, -.356), (-.44, y + .08, -.356), .006, "chrome")
    for z in (-.3, .3): k.bar((.65, 0, z), (.65, .72, z), .02, "steel")
    k.box((.65, .02, 0), (.05, .04, .68), "steel"); k.box((0, .6, .36), (1.4, .25, .02), "off_white")
    k.save("desk")


@piece
def stool():
    """A doctor's rolling stool, seat at 0.55."""
    k = K()
    k.lathe((0, 0, 0), [(.0, .02), (.26, .02), (.26, .05), (.04, .07), (.04, .5), (0, .5)], "chrome", 24)
    for i in range(5):
        a = i / 5 * 2 * math.pi; k.bar((0, .04, 0), (math.cos(a) * .25, .04, math.sin(a) * .25), .014, "chrome", 6); k.ball((math.cos(a) * .25, .025, math.sin(a) * .25), .025, "rubber", sub=1)
    k.lathe((0, 0, 0), [(0, .49), (.18, .49), (.19, .53), (.17, .57), (0, .58)], "pad_blue", 28)
    k.save("stool")


@piece
def chair_plain():
    k = K()
    for x in (-.2, .2):
        for z in (-.2, .2): k.bar((x, 0, z), (x, .44, z), .013, "steel")
    k.box((0, .46, 0), (.48, .05, .48), "pad_blue", .01); k.box((0, .72, .2), (.48, .3, .04), "pad_blue", .01)
    for x in (-.2, .2): k.bar((x, .44, .2), (x, .86, .2), .013, "steel")
    k.save("chair_plain")


@piece
def chair_row():
    """Three waiting chairs on one steel beam, seats at 0.46, facing -z."""
    k = K()
    k.box((0, .3, 0), (1.7, .05, .06), "steel")
    for x in (-.6, 0, .6):
        k.box((x, .46, 0), (.5, .06, .48), "pad_blue", .012); k.box((x, .7, .22), (.5, .34, .04), "pad_blue", .012)
        k.bar((x, .3, 0), (x, .44, 0), .02, "steel")
    for x in (-.75, .75):
        k.bar((x, 0, -.2), (x, .3, 0), .016, "steel"); k.bar((x, 0, .2), (x, .3, 0), .016, "steel"); k.ball((x, .02, -.2), .025, "rubber", sub=1); k.ball((x, .02, .2), .025, "rubber", sub=1)
    k.save("chair_row")


@piece
def cabinet_upper():
    """1.2 wide, 0.7 tall, 0.35 deep, two doors, chrome handles, hangs with its pivot at its bottom front edge... bottom centre. Front -z."""
    k = K()
    k.box((0, .35, 0), (1.2, .7, .35), "white", .004)
    for x in (-.3, .3): k.box((x, .35, -.177), (.56, .64, .006), "off_white", .003)
    for x in (-.06, .06): k.bar((x, .22, -.19), (x, .48, -.19), .007, "chrome")
    k.save("cabinet_upper")


@piece
def cabinet_lower():
    """1.8 wide counter at 0.9: pale green doors, a laminate top, a chrome sink and tap on the right. Front -z."""
    k = K()
    k.box((0, .42, .02), (1.8, .84, .56), "pale_green", .004)
    for x in (-.6, 0, .6): k.box((x, .42, -.262), (.56, .78, .006), "mint_wall", .003)
    for x in (-.52, -.08, .52): k.bar((x - .06, .75, -.272), (x + .06, .75, -.272), .007, "chrome")
    k.box((0, .87, 0), (1.84, .05, .62), "laminate", .006)
    k.box((0, 1.0, .3), (1.84, .2, .02), "pale_green")
    k.lathe((.5, .9, 0), [(.0, -.14), (.17, -.14), (.2, -.03), (.21, 0), (.23, .006), (0, .006)], "chrome", 28)
    k.bar((.5, .9, .2), (.5, 1.12, .2), .012, "chrome"); k.bar((.5, 1.12, .2), (.5, 1.12, .04), .012, "chrome"); k.bar((.5, 1.12, .04), (.5, 1.06, .04), .012, "chrome")
    k.save("cabinet_lower")


@piece
def panel_light():
    """A 1.2 by 0.6 fluorescent panel in its frame. Pivot is the ceiling: it hangs 8 cm below."""
    k = K()
    k.box((0, -.04, 0), (1.22, .08, .62), "off_white")
    k.box((0, -.075, 0), (1.14, .02, .54), "glow_white")
    for x in (-.4, 0, .4): k.box((x, -.09, 0), (.012, .01, .56), "off_white")
    k.save("panel_light")


@piece
def window_frame():
    """A 1.4 by 1.2 window frame with a sill, its bottom edge at 0.9 off the floor: pivot on the floor under its centre, front (the room) at -z."""
    k = K(); w, h, y0 = 1.4, 1.2, .9
    for x in (-w / 2, w / 2): k.box((x, y0 + h / 2, 0), (.06, h + .06, .1), "white", .004)
    for y in (y0, y0 + h): k.box((0, y, 0), (w + .06, .06, .1), "white", .004)
    k.box((0, y0 - .035, -.05), (w + .2, .03, .2), "white", .004)   # sill
    k.box((0, y0 + h / 2, 0), (.025, h, .025), "white"); k.box((0, y0 + h * .6, 0), (w, .025, .025), "white")
    k.save("window_frame")


@piece
def window_glass():
    """The glass, a piece of its own so the punch can hide it or pop it."""
    k = K(); k.box((0, 1.5, 0), (1.36, 1.16, .01), "glass"); k.save("window_glass")


@piece
def window_blind():
    """Half-dropped venetian blind inside the window, slats at a slight tilt."""
    k = K()
    k.box((0, 2.13, -.06), (1.38, .04, .04), "off_white")
    for i in range(14):
        k.at(); k.box((0, 2.08 - i * .045, -.06), (1.34, .003, .05), "off_white"); k.turn(-25, 0, 0, about=(0, 2.08 - i * .045, -.06))
    k.bar((.64, 2.1, -.08), (.64, 1.2, -.08), .003, "off_white"); k.bar((.64, 1.2, -.08), (.64, 1.08, -.08), .01, "off_white")
    k.save("window_blind")


@piece
def glass_shard():
    """One shard, 30 cm, for a scatter when the glass breaks."""
    k = K(); k.sheet([[(-.15, 0, 0), (.12, 0, .01)], [(-.04, .22, 0), (.08, .3, .01)]], (0, 0, -1), "glass"); k.save("glass_shard")


@piece
def door_frame():
    """A 0.95 by 2.1 frame, pivot on the floor at the centre of the opening, front -z."""
    k = K()
    for x in (-.5, .5): k.box((x, 1.07, 0), (.08, 2.14, .14), "white", .004)
    k.box((0, 2.12, 0), (1.08, .08, .14), "white", .004)
    k.save("door_frame")


@piece
def door_leaf():
    """The leaf, hinge at x 0 (the left edge seen from -z), swinging about its own pivot. Off-white, a little glass slit, a chrome lever, the EXAM 2 sign (textured)."""
    k = K()
    k.box((.46, 1.04, 0), (.9, 2.06, .045), "off_white", .004)
    k.box((.46, 1.6, 0), (.16, .5, .06), "glass")
    k.bar((.82, 1.02, -.03), (.82, 1.02, -.07), .009, "chrome"); k.bar((.82, 1.02, -.07), (.7, 1.02, -.07), .009, "chrome")
    k.bar((.82, 1.02, .03), (.82, 1.02, .07), .009, "chrome"); k.bar((.82, 1.02, .07), (.7, 1.02, .07), .009, "chrome")
    k.quad((.26, 1.86, -.024), (.66, 1.86, -.024), (.66, 2.06, -.024), (.26, 2.06, -.024), (0, 0, -1))
    k.save("door_leaf")


@piece
def poster():
    """The poster, 0.6 by 0.8, a black frame, its bottom edge at the pivot, on the wall behind it at z 0, facing -z."""
    k = K()
    k.box((0, .4, .012), (.64, .84, .024), "frame_dark", .003)
    k.quad((-.3, .0, -.001), (.3, .0, -.001), (.3, .8, -.001), (-.3, .8, -.001), (0, 0, -1))
    k.save("poster")


@piece
def eye_chart():
    k = K()
    k.box((0, .21, .008), (.3, .44, .016), "frame_dark", .002)
    k.quad((-.14, .0, -.001), (.14, .0, -.001), (.14, .42, -.001), (-.14, .42, -.001), (0, 0, -1))
    k.save("eye_chart")


@piece
def can():
    """A 330 ml can, 12.2 cm tall, pivot at its base. The label is textured (can_label), the ends are chrome, a pull tab on top. Scale it: hand 1, desk 1, giant 20."""
    k = K(); r = .033
    k.lathe((0, 0, 0), [(0, .0), (.024, 0), (.029, .004), (.0315, .009), (.0325, .012)], "chrome", 36)
    k.lathe((0, 0, 0), [(r, .012), (r, .108)], "red", 36, tex=True)
    k.lathe((0, 0, 0), [(.0325, .108), (.0305, .113), (.0285, .118), (.028, .122), (.0265, .1225), (0, .1225)], "chrome", 36)
    k.lathe((0, 0, 0), [(.0282, .121), (.0285, .1235), (0, .1235)], "steel", 36)
    k.box((.0, .1245, .0), (.024, .0015, .011), "chrome", .0005); k.ball((.004, .1245, 0), .003, "chrome", sub=1)
    k.save("can")


@piece
def rx_pad():
    """A prescription pad, 10 by 15 cm, 1.2 cm thick, top sheet textured (rx_pad). Flat, the header at -z."""
    k = K()
    k.box((0, .006, 0), (.1, .012, .15), "paper", .001); k.box((0, .011, -.07), (.1, .004, .012), "steel")
    k.quad((-.05, .0125, .075), (.05, .0125, .075), (.05, .0125, -.075), (-.05, .0125, -.075), (0, 1, 0))
    k.save("rx_pad")


@piece
def clipboard():
    """Hardboard 23 by 32, a chrome clip, the intake form (textured clipboard_sheet) on the -z face. Standing, pivot at its bottom centre."""
    k = K()
    k.box((0, .16, 0), (.23, .32, .006), "laminate_edge", .001)
    k.box((0, .31, -.008), (.1, .025, .012), "chrome", .001); k.box((0, .33, -.004), (.08, .02, .01), "chrome", .001)
    k.quad((-.105, .01, -.0035), (.105, .01, -.0035), (.105, .29, -.0035), (-.105, .29, -.0035), (0, 0, -1))
    k.save("clipboard")


@piece
def pen():
    k = K(); k.bar((-.07, .005, 0), (.07, .005, 0), .005, "black"); k.bar((.07, .005, 0), (.078, .005, 0), .003, "chrome"); k.box((-.04, .011, 0), (.05, .003, .004), "chrome"); k.save("pen")


@piece
def stethoscope():
    """Draped round a neck: pivot at the back of the neck's centre, ear tubes up at the back, the rubber tube down the front (-z is the front) to the chest piece."""
    k = K()
    neck = [(math.sin(a) * .085, .02 - math.cos(a) * .01, -math.cos(a) * .085 + .02) for a in [i / 10 * math.pi - math.pi / 2 for i in range(11)]]
    k.tube([(p[0], p[1], p[2]) for p in neck], .005, "rubber", 8)
    k.tube([(-.085, .02, .02), (-.1, .09, .0), (-.08, .14, -.02)], .004, "chrome", 6); k.ball((-.08, .14, -.02), .009, "rubber", sub=1)
    k.tube([(.085, .02, .02), (.1, .09, .0), (.08, .14, -.02)], .004, "chrome", 6); k.ball((.08, .14, -.02), .009, "rubber", sub=1)
    k.tube([(0, .01, -.065), (.02, -.08, -.09), (.03, -.18, -.1), (.01, -.26, -.11)], .005, "rubber", 8)
    k.lathe((.01, -.26, -.11), [(0, -.012), (.02, -.012), (.022, 0), (.012, .006), (0, .006)], "chrome", 20)
    k.save("stethoscope")


@piece
def glasses():
    """Dark round frames, pivot at the bridge, lenses in front (+z of the pivot is the way the face looks; they sit at z 0), temples back along -z."""
    k = K()
    for x in (-.031, .031):
        k.sweep([(x + math.cos(a) * .021, math.sin(a) * .019, 0) for a in [i / 20 * 2 * math.pi for i in range(20)]], .0035, .003, "frame_dark", closed=True)
        k.lathe((x, 0, 0), [(.0, -.001), (.02, -.001), (.02, .001), (0, .001)], "lens", 20); k.at(); k.turn(90, 0, 0, about=(x, 0, 0))
    k.bar((-.012, .004, 0), (.012, .004, 0), .0025, "frame_dark")
    for x in (-.052, .052):
        k.tube([(x, .004, 0), (x + (.004 if x < 0 else -.004), .004, -.13), (x + (.012 if x < 0 else -.012), -.02, -.15)], .0022, "frame_dark", 6)
    k.save("glasses")


@piece
def reception_desk():
    """2.5 wide, counter at 1.05 with a raised front ledge at 1.17, pale green front with a green band and the RECEPTION sign (textured). Front -z, the nurse stands behind at +z."""
    k = K()
    k.box((0, .52, .05), (2.4, 1.04, .7), "pale_green", .004)
    k.box((0, 1.065, .05), (2.5, .05, .8), "laminate", .006)
    k.box((0, 1.16, -.26), (2.5, .14, .26), "mint_wall", .006); k.box((0, 1.24, -.26), (2.54, .03, .3), "laminate", .004)
    k.box((0, .2, -.3), (2.4, .08, .02), "green_trim")
    k.quad((-.6, .62, -.306), (.6, .62, -.306), (.6, .92, -.306), (-.6, .92, -.306), (0, 0, -1))
    k.box((.7, 1.09, .2), (.4, .02, .3), "off_white"); k.box((.7, 1.2, .3), (.4, .2, .02), "dark_grey")   # a monitor
    k.save("reception_desk")


@piece
def plant_pot():
    k = K()
    k.lathe((0, 0, 0), [(0, 0), (.14, 0), (.17, .3), (.18, .32), (.15, .32), (0, .32)], "laminate_edge", 20)
    for i in range(7):
        a = i / 7 * 2 * math.pi; k.ball((math.cos(a) * .12, .5 + (i % 3) * .12, math.sin(a) * .12), .13, "sign_green", scale=(1, .7, 1), sub=2)
    k.ball((0, .75, 0), .16, "green_trim", scale=(1, .8, 1), sub=2)
    k.save("plant_pot")


@piece
def bin():
    k = K(); k.lathe((0, 0, 0), [(0, 0), (.12, 0), (.14, .32), (.145, .34), (.13, .34), (.13, .02), (0, .02)], "grey", 20); k.save("bin")


@piece
def wall_clock():
    k = K(); k.lathe((0, 0, 0), [(0, 0), (.15, 0), (.15, .03), (0, .03)], "white", 32); k.at(); k.turn(-90, 0, 0)
    k.lathe((0, 0, 0), [(.15, 0), (.16, 0), (.16, .035), (.15, .035)], "dark_grey", 32); k.at(); k.turn(-90, 0, 0)
    k.box((0, .05, -.032), (.006, .1, .002), "black"); k.box((.035, 0, -.032), (.07, .006, .002), "black")
    k.save("wall_clock")


# ---------------------------------------------------------------------------------------------------- space
@piece
def star_dome():
    """Radius 1, faces inward, equirect (stars). Scale it to 1400 round the space set; the camera's far plane is 2000."""
    k = K(); k.uvsphere((0, 0, 0), 1, 64, 32, inward=True); k.save("star_dome")


@piece
def moon():
    """Radius 1 with craters you can stand in (dents 35% of the crater radius deep, a raised rim), textured (moon). Scale 14: a crater of radius .25 is 3.5 m across."""
    k = K()
    # the same first-draw rule as the texture is not reproducible without numpy; craters here are their own set, the paint's craters give the small ones
    rng = random.Random(5); craters = []
    for i in range(60):
        lon, lat = rng.random() * 2 * math.pi, math.acos(1 - 2 * rng.random()); rad = (rng.random() ** 2.2) * .28 + .04
        craters.append((Vector((math.sin(lat) * math.cos(lon), math.cos(lat), math.sin(lat) * math.sin(lon))), rad))
    def dent(d):
        s = 1
        for c, rad in craters:
            t = math.acos(max(-1, min(1, d.dot(c)))) / rad
            if t < 1.4:
                s += -rad * .35 * max(0, 1 - (t / .8) ** 2) + rad * .08 * math.exp(-((t - 1) / .12) ** 2)
        return s
    k.uvsphere((0, 0, 0), 1, 128, 64, dent=dent)
    k.save("moon")


@piece
def saturn_ring():
    """Inner radius 1.25, outer 2.3 (Saturn is radius 1), textured (saturn_ring), both sides. Parent it to saturn and tilt it."""
    k = K(); k.ring((0, 0, 0), 1.25, 2.3, 128); k.save("saturn_ring")


@piece
def asteroid_a():
    k = K(); k.rock((0, 0, 0), 1, ["rock_dark", "rock", "rock_light"], 1, .3, scale=(1.3, .8, 1)); k.save("asteroid_a")


@piece
def asteroid_b():
    k = K(); k.rock((0, 0, 0), 1, ["rock_dark", "rock", "rock_light"], 7, .35, scale=(1, 1.2, .8)); k.save("asteroid_b")


@piece
def asteroid_c():
    k = K(); k.rock((0, 0, 0), 1, ["rock_dark", "rock", "rock_light"], 13, .25, scale=(1.6, .9, .9)); k.save("asteroid_c")


@piece
def comet():
    """Head radius 1 of ice at the pivot, a tail 14 long trailing along -z, glowing and tapering, open enough to hide in. Scale 2 for a 28 m tail."""
    k = K()
    k.rock((0, 0, 0), 1, ["ice", "comet_core", "ice"], 3, .2)
    k.lathe((0, 0, 0), [(0, .7), (1.4, .9), (2.2, 2.5), (2.4, 5), (1.9, 9), (1.1, 12), (0, 14)], "comet_glow", 24); k.at(); k.turn(90, 0, 0)   # +y to -z
    k.ball((0, 0, 0), .78, "comet_core", sub=2)
    k.save("comet")


@piece
def satellite():
    """A 2.6 m satellite: gold foil body, two blue panels on booms, a dish on top, antennae. Pivot at the body centre."""
    k = K()
    k.box((0, 0, 0), (1.1, 1.3, 1.1), "sat_foil", .02)
    for x in (-1, 1):
        k.bar((x * .55, 0, 0), (x * 1.0, 0, 0), .03, "steel"); k.box((x * 2.2, 0, 0), (2.4, .04, 1.1), "sat_panel", .005)
        for i in range(3): k.box((x * (1.4 + i * .8), 0, 0), (.02, .06, 1.12), "steel")
    k.lathe((0, .65, 0), [(0, 0), (.08, 0), (.08, .25), (0, .25)], "steel", 12)
    k.lathe((0, .9, 0), [(0, .0), (.55, .12), (.6, .14), (.5, .14), (0, .05)], "sat_white", 28)
    k.bar((0, .9, 0), (0, 1.45, 0), .02, "steel"); k.ball((0, 1.45, 0), .06, "steel", sub=1)
    k.bar((.3, -.65, .3), (.6, -1.3, .6), .015, "steel"); k.bar((-.3, -.65, -.3), (-.6, -1.3, -.6), .015, "steel")
    k.save("satellite")


@piece
def rope_unit():
    """One metre of lasso rope from the pivot along +z, radius 0.035, with a twist of strands. Scale z to the distance between two points (the engine's rope)."""
    k = K()
    k.bar((0, 0, 0), (0, 0, 1), .03, "rope", 10)
    for s in range(2):
        pts = [(math.cos(i / 24 * 2 * math.pi * 3 + s * math.pi) * .03, math.sin(i / 24 * 2 * math.pi * 3 + s * math.pi) * .03, i / 24) for i in range(25)]
        k.tube(pts, .012, "rope_dark", 6)
    k.save("rope_unit")


@piece
def lasso_loop():
    """The noose: a ring of rope radius 1 in the xz plane, a honda knot, a tail stub. Pivot at the ring's centre. Scale it to the planet."""
    k = K()
    k.sweep([(math.cos(a), 0, math.sin(a)) for a in [i / 48 * 2 * math.pi for i in range(48)]], .07, .07, "rope", closed=True)
    k.ball((1, 0, 0), .11, "rope_dark", sub=2); k.bar((1, 0, 0), (1.5, 0, -.2), .035, "rope")
    k.save("lasso_loop")


# ---------------------------------------------------------------------------------------------------- the commercial
@piece
def backdrop_panel():
    """A 4 by 3.2 curved pastel panel on a frame (textured backdrop), its pivot at its bottom centre on the floor, face toward -z, so a topple from flat unfolds it."""
    k = K()
    rows = []
    for j in range(2):
        rows.append([(x, j * 3.2, .25 * (1 - math.cos((x / 2) * math.pi / 2))) for x in [i / 12 * 4 - 2 for i in range(13)]])
    k.sheet(rows, (0, 0, -1), tex=True)
    for x in (-2, 0, 2): k.box((x, 1.6, .18 + .25 * (1 - math.cos((x / 2) * math.pi / 2))), (.06, 3.2, .06), "chrome")
    k.box((0, 3.23, .18), (4.1, .06, .5), "chrome"); k.box((0, .03, .18), (4.1, .06, .5), "chrome")
    k.save("backdrop_panel")


@piece
def panel_pink():
    k = K(); k.box((0, 1.6, 0), (2.2, 3.2, .08), "pastel_pink", .02); k.box((0, 1.6, .05), (2.3, 3.3, .04), "chrome"); k.save("panel_pink")


@piece
def panel_blue():
    k = K(); k.box((0, 1.6, 0), (2.2, 3.2, .08), "pastel_blue", .02); k.box((0, 1.6, .05), (2.3, 3.3, .04), "chrome"); k.save("panel_blue")


@piece
def panel_yellow():
    k = K(); k.box((0, 1.6, 0), (2.2, 3.2, .08), "pastel_yellow", .02); k.box((0, 1.6, .05), (2.3, 3.3, .04), "chrome"); k.save("panel_yellow")


@piece
def stool_tall():
    """A chrome bar stool with a pink seat at 0.75."""
    k = K()
    for i in range(4):
        a = i / 4 * 2 * math.pi + math.pi / 4; k.bar((math.cos(a) * .22, 0, math.sin(a) * .22), (math.cos(a) * .16, .72, math.sin(a) * .16), .013, "chrome")
    k.sweep([(math.cos(a) * .2, .25, math.sin(a) * .2) for a in [i / 24 * 2 * math.pi for i in range(24)]], .012, .012, "chrome", closed=True)
    k.lathe((0, 0, 0), [(0, .72), (.18, .72), (.19, .76), (.17, .8), (0, .8)], "seat_pink", 28)
    k.save("stool_tall")


@piece
def studio_light():
    """A fresnel on a stand, 2.2 m to the lens, barn doors, the lens glowing (lamp_glow). Points along -z from its head; pivot on the floor under the stand. Turn it with rot."""
    k = K()
    for i in range(3):
        a = i / 3 * 2 * math.pi; k.bar((0, .1, 0), (math.cos(a) * .4, 0, math.sin(a) * .4), .014, "studio_black"); k.ball((math.cos(a) * .4, .02, math.sin(a) * .4), .03, "rubber", sub=1)
    k.bar((0, 0, 0), (0, 1.95, 0), .022, "chrome"); k.bar((0, 1.9, 0), (0, 2.0, 0), .04, "studio_black")
    k.box((0, 2.2, .1), (.5, .5, .5), "studio_black", .02)
    k.lathe((0, 2.2, -.15), [(.0, 0), (.24, 0), (.25, .02), (.0, .02)], "lamp_glow", 28); k.at(); k.turn(-90, 0, 0, about=(0, 2.2, -.15))
    for (x, y, w, h) in ((-.28, 0, .06, .56), (.28, 0, .06, .56), (0, .28, .56, .06), (0, -.28, .56, .06)):
        k.at(); k.box((x, 2.2 + y, -.3), (w, h, .3), "barn_door", .004); k.turn(0, 25 if x else 0, 0, about=(x, 2.2 + y, -.15)) if x else k.turn(-25 if y > 0 else 25, 0, 0, about=(x, 2.2 + y, -.15))
    k.bar((.25, 2.2, .1), (.32, 2.2, .1), .03, "chrome"); k.bar((-.25, 2.2, .1), (-.32, 2.2, .1), .03, "chrome")
    k.save("studio_light")


@piece
def tv_sign():
    """The commercial's glowing sign, 2 by 1 (textured tv_sign), pivot at its bottom centre, facing -z."""
    k = K()
    k.box((0, .5, .03), (2.1, 1.1, .06), "studio_black", .01)
    k.quad((-1, 0, -.001), (1, 0, -.001), (1, 1, -.001), (-1, 1, -.001), (0, 0, -1))
    k.save("tv_sign")


@piece
def mic_boom():
    k = K()
    k.bar((0, 0, 0), (0, 2.6, 0), .018, "studio_black"); k.bar((0, 2.6, 0), (1.6, 2.3, -.4), .014, "studio_black")
    k.lathe((1.6, 2.3, -.4), [(0, -.2), (.05, -.2), (.06, 0), (.05, .12), (0, .12)], "dark_grey", 12)
    k.save("mic_boom")


for name, f in PIECES.items():
    if ONLY and name not in ONLY: continue
    f()
