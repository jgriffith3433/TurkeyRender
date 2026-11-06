"""Hero props for TK Shock: the corner camera, the TV, its stand and the light TV for the wall.

  blender -b -P Director/tools/blender_props.py -- model tv|stand|camera     build, save src/<asset>.blend, clay render
  blender -b -P Director/tools/blender_props.py -- bake  tv|stand|camera     UVs, masks, baked PBR maps (needs model)
  blender -b -P Director/tools/blender_props.py -- light                     builds tv_light from the baked tv
  blender -b -P Director/tools/blender_props.py -- render tv|stand|camera|light [shot words]
  blender -b -P Director/tools/blender_props.py -- export tv|stand|camera|light
  blender -b -P Director/tools/blender_props.py -- check                     reads each FBX back: size, pivot, screen

Modelled facing -Y, Z up, base at z=0. On export a model point (x,y,z) lands in Unity at (x,z,y), so the front faces Unity -Z.
Source textures come from blender_props_textures.py. Heavy steps take Director/gen/heavy.lock (see Director/ART_BIBLE.md)."""
import bpy, bmesh, sys, os, math, time, random, atexit
import numpy as np
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
PROPS = os.path.normpath(os.path.join(HERE, "..", "gen", "props"))
SRC = os.path.join(PROPS, "src")
TEX = os.path.join(PROPS, "textures")
RENDERS = os.path.join(PROPS, "renders")
LOCK = os.path.normpath(os.path.join(HERE, "..", "gen", "heavy.lock"))
for d in (SRC, TEX, RENDERS):
    os.makedirs(d, exist_ok=True)

Rx90 = Matrix.Rotation(math.radians(90), 4, "X")


# ---------------------------------------------------------------- the shared heavy-job lock
_held = False
def lock():
    global _held
    if _held:
        return
    while os.path.exists(LOCK) and time.time() - os.path.getmtime(LOCK) < 15 * 60:
        print("waiting for heavy.lock", flush=True)
        time.sleep(20)
    with open(LOCK, "w") as f:
        f.write("props")
    _held = True

def touch():
    if _held:
        with open(LOCK, "w") as f:
            f.write("props")

def unlock():
    global _held
    if _held and os.path.exists(LOCK):
        os.remove(LOCK)
    _held = False
atexit.register(unlock)


# ---------------------------------------------------------------- mesh helpers
def new_obj(name, me, mat=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if mat:
        me.materials.append(M(mat))
    return o

def rrect(w, h, r, cx, cz, y, n=6):
    """A rounded rectangle in the XZ plane, always 4*(n+1) points, starting at the top right."""
    out = []
    r = min(r, w / 2 - 1e-5, h / 2 - 1e-5)
    for k, (sx, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for i in range(n + 1):
            a = math.radians(90 * k + 90 * i / n)
            out.append((cx + sx * (w / 2 - r) + r * math.cos(a), y, cz + sz * (h / 2 - r) + r * math.sin(a)))
    return out

def loft(name, rings, mat, n=6, xf=None, caps=True, cx=0.0):
    """Skins rings of (y, w, h, r, cz) into a closed solid."""
    bm = bmesh.new()
    loops = [[bm.verts.new(p) for p in rrect(w, h, r, cx, cz, y, n)] for y, w, h, r, cz in rings]
    bm.verts.index_update()
    c = len(loops[0])
    for a, b in zip(loops, loops[1:]):
        for i in range(c):
            j = (i + 1) % c
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps:
        bm.faces.new(loops[0]); bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    if xf:
        me.transform(xf)
    return new_obj(name, me, mat)

def lathe(name, prof, mat, segs=96, axis="Y", loc=(0, 0, 0), arc=None, open=False):
    """Spins (radius, distance) points around an axis. A radius of 0 closes to a pole. Closed if both ends reach 0."""
    bm = bmesh.new()
    rows = []
    a0, a1 = arc if arc else (0, 2 * math.pi)
    for r, d in prof:
        if r <= 1e-7:
            p = (0, d, 0) if axis == "Y" else (0, 0, d)
            rows.append([bm.verts.new(p)])
            continue
        row = []
        for i in range(segs):
            a = a0 + (a1 - a0) * i / segs
            u, v = r * math.cos(a), r * math.sin(a)
            row.append(bm.verts.new((u, d, v) if axis == "Y" else (u, v, d)))
        rows.append(row)
    for a, b in zip(rows, rows[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(segs):
                bm.faces.new((a[0], b[i], b[(i + 1) % segs]))
        elif len(b) == 1:
            for i in range(segs):
                bm.faces.new((a[i], a[(i + 1) % segs], b[0]))
        else:
            for i in range(segs - (1 if arc else 0)):
                j = (i + 1) % segs
                bm.faces.new((a[i], a[j], b[j], b[i]))
    for row in (rows[0], rows[-1]):
        if len(row) > 1 and not open and not arc:
            bm.faces.new(row)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    return new_obj(name, me, mat, loc)

def box(name, size, loc, mat, xf=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    me.transform(Matrix.Diagonal((*size, 1)))
    if xf:
        me.transform(xf)
    return new_obj(name, me, mat, loc)

def pipe(name, pts, r, mat, res=10):
    """A smooth tube along points (cables)."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    s = cu.splines.new("NURBS"); s.points.add(len(pts) - 1)
    for p, c in zip(s.points, pts):
        p.co = (*c, 1)
    s.use_endpoint_u = True; s.order_u = 3; s.resolution_u = 16
    cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
    o = new_obj(name, me, mat); me.shade_smooth()
    return o

def text(body, size, loc, mat, xf=Rx90, align="CENTER", thick=0.00012, spacing=1.0):
    """Printed lettering as thin raised meshes. Default faces -Y."""
    cu = bpy.data.curves.new("t", "FONT"); cu.body = body; cu.size = size; cu.align_x = align; cu.align_y = "CENTER"
    cu.extrude = thick; cu.fill_mode = "BOTH"; cu.resolution_u = 3; cu.space_character = spacing
    ob = bpy.data.objects.new("t", cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
    me.transform(Matrix.Translation(loc) @ xf)
    return new_obj("txt", me, mat)

_screw = {}
def screw(loc, normal, r, mat, kind="phillips", name="screw"):
    """A real screw head with its recess. Axis along the normal."""
    key = kind
    if key not in _screw:
        prof = [(0, 0.0), (1.0, 0.0), (1.0, -0.12), (0.92, -0.26), (0.72, -0.38), (0.42, -0.44), (0.0, -0.45)] if kind == "phillips" else \
               [(0, 0.0), (1.0, 0.0), (1.0, -0.22), (0.93, -0.26), (0.0, -0.26)]
        h = lathe("s", prof, mat, segs=28)
        cutters = []
        if kind == "phillips":
            for ang in (0, 90):
                xf = Matrix.Rotation(math.radians(ang), 4, "Y")
                cutters.append(box("c", (1.1, 0.5, 0.17), (0, -0.45, 0), "black", xf=xf))
                cutters.append(box("c", (0.5, 0.7, 0.3), (0, -0.45, 0), "black", xf=xf))
        else:
            cutters.append(box("c", (2.4, 0.3, 0.22), (0, -0.26, 0), "black"))
        boolcut(h, cutters)
        finish(h, 0.012, 2, 35)
        _screw[key] = h.data; bpy.data.objects.remove(h)
    me = _screw[key].copy()
    me.transform(Matrix.Scale(r, 4))
    q = Vector((0, -1, 0)).rotation_difference(Vector(normal).normalized())
    roll = Quaternion(Vector((0, -1, 0)), random.uniform(0, 6.28))
    me.transform((q @ roll).to_matrix().to_4x4())
    o = new_obj(name, me, None, loc)
    me.materials.clear(); me.materials.append(M(mat))
    if kind == "phillips":
        me.materials.append(M("black"))
    apply_loc(o)
    return o

def apply_loc(o):
    o.data.transform(Matrix.Translation(o.location)); o.location = (0, 0, 0)

def active(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); bpy.context.view_layer.objects.active = o

def join(name, objs, shared_ok=True):
    objs = [o for o in objs if o]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if o.data.users > 1:
            o.data = o.data.copy()
        apply_loc(o)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name; o.data.name = name
    return o

def boolcut(o, cutters, transfer=True):
    """Cuts every cutter from o. Cut faces take the cutter's material."""
    cut = join("cutters", cutters)
    m = o.modifiers.new("b", "BOOLEAN"); m.operation = "DIFFERENCE"; m.solver = "EXACT"; m.object = cut
    m.material_mode = "TRANSFER" if transfer else "INDEX"
    m.use_self = False; m.use_hole_tolerant = False
    active(o); bpy.ops.object.modifier_apply(modifier="b")
    bpy.data.objects.remove(cut)

def finish(o, bevel=0.0012, segs=2, angle=32):
    """Real bevels so edges catch the single hard light, and weighted normals so flats stay flat."""
    active(o)
    if bevel > 0:
        m = o.modifiers.new("bv", "BEVEL"); m.width = bevel; m.segments = segs; m.limit_method = "ANGLE"
        m.angle_limit = math.radians(angle); m.profile = 0.6; m.use_clamp_overlap = True; m.harden_normals = False
        bpy.ops.object.modifier_apply(modifier="bv")
    o.data.shade_smooth()
    o.data.set_sharp_from_angle(angle=math.radians(angle))
    w = o.modifiers.new("wn", "WEIGHTED_NORMAL"); w.keep_sharp = True; w.weight = 60
    bpy.ops.object.modifier_apply(modifier="wn")
    return o


# ---------------------------------------------------------------- materials
# Each wear material is one recipe. Base texture is box-projected in object space, wear layers are the AI greys, masks are baked per asset.
RECIPES = {
    # name: tex, tile(m), color, rough, metal, edge colour, edge rough, edge metal, dust, prints, grime, bump
    "plastic":  dict(tex="plastic", tile=0.2, amp=.14, col=(.030, .030, .032), rough=.6, metal=0, wcol=(.13, .13, .135), wrough=.48, wmetal=0, dust=1, prints=.6, grime=.25, bump=.00007),
    "plastic2": dict(tex="plastic", tile=0.16, amp=.14, col=(.018, .018, .02), rough=.5, metal=0, wcol=(.09, .09, .095), wrough=.42, wmetal=0, dust=.8, prints=1, grime=.15, bump=.00004),
    "backpl":   dict(tex="plastic", tile=0.3, amp=.14, col=(.022, .022, .024), rough=.7, metal=0, wcol=(.1, .1, .1), wrough=.55, wmetal=0, dust=1.3, prints=0, grime=.4, bump=.00006),
    "rubber":   dict(tex="plastic", tile=0.1, amp=.14, col=(.012, .012, .012), rough=.85, metal=0, wcol=(.05, .05, .05), wrough=.8, wmetal=0, dust=.8, prints=0, grime=.2, bump=.00004),
    "black":    dict(tex=None, col=(.004, .004, .004), rough=.9, metal=0, wcol=(.01, .01, .01), wrough=.9, wmetal=0, dust=.15, prints=0, grime=0, bump=0),
    "paint_w":  dict(tex=None, col=(.72, .71, .68), rough=.3, metal=0, wcol=(.5, .5, .5), wrough=.4, wmetal=0, dust=0, prints=0, grime=0, bump=0),
    "steel":    dict(tex=None, col=(.52, .52, .53), rough=.38, metal=1, wcol=(.6, .6, .6), wrough=.3, wmetal=1, dust=.5, prints=0, grime=.5, bump=.00005),
    "zinc":     dict(tex=None, col=(.38, .37, .34), rough=.5, metal=1, wcol=(.55, .54, .5), wrough=.35, wmetal=1, dust=.6, prints=0, grime=.7, bump=.00005),
    "brassy":   dict(tex=None, col=(.5, .38, .17), rough=.4, metal=1, wcol=(.6, .5, .3), wrough=.3, wmetal=1, dust=.5, prints=0, grime=.3, bump=0),
    "laminate": dict(tex="laminate", tile=0.9, col=(.11, .105, .10), rough=.55, metal=0, wcol=(.24, .16, .09), wrough=.85, wmetal=0, dust=.8, prints=.5, grime=.3, bump=.00006),
    "mdf":      dict(tex=None, col=(.19, .13, .08), rough=.85, metal=0, wcol=(.25, .18, .11), wrough=.9, wmetal=0, dust=1.2, prints=0, grime=.4, bump=.0002),
    "campaint": dict(tex="paint", tile=0.16, amp=.1, col=(.62, .60, .55), rough=.6, metal=0, wcol=(.55, .55, .56), wrough=.32, wmetal=1, dust=.4, prints=.2, grime=1.1, bump=.00002),
    "anodized": dict(tex=None, col=(.012, .012, .013), rough=.46, metal=.8, wcol=(.42, .42, .44), wrough=.34, wmetal=1, dust=.25, prints=0, grime=.05, bump=0),
    "pcb":      dict(tex=None, col=(.008, .009, .01), rough=.5, metal=0, wcol=(.06, .06, .05), wrough=.4, wmetal=0, dust=.8, prints=0, grime=.2, bump=.00003),
    "ir":       dict(tex=None, col=(.05, .012, .03), rough=.16, metal=0, wcol=(.05, .012, .03), wrough=.2, wmetal=0, dust=.3, prints=0, grime=0, bump=0),
    "btn_light": dict(tex=None, col=(.26, .26, .27), rough=.44, metal=0, wcol=(.5, .5, .5), wrough=.3, wmetal=0, dust=.4, prints=1, grime=.1, bump=.00002),
    "glossred": dict(tex=None, col=(.42, .012, .01), rough=.38, metal=0, wcol=(.6, .2, .18), wrough=.3, wmetal=0, dust=.2, prints=1, grime=.05, bump=.00001),
    "glasswet": dict(tex=None, col=(.045, .065, .08), rough=.06, metal=0, wcol=(.09, .1, .11), wrough=.1, wmetal=0, dust=.2, prints=1, grime=0, bump=0),
    "glassy":   dict(tex=None, col=(.11, .125, .13), rough=.07, metal=0, wcol=(.09, .1, .11), wrough=.12, wmetal=0, dust=.28, prints=1, grime=0, bump=0),
    "ceramic":  dict(tex=None, col=(.16, .19, .18), rough=.36, metal=0, wcol=(.4, .38, .33), wrough=.6, wmetal=0, dust=.8, prints=.5, grime=.4, bump=.00001),
    "linen":    dict(tex="linen", tile=.08, amp=.2, col=(.52, .46, .35), rough=.9, metal=0, wcol=(.42, .36, .27), wrough=.95, wmetal=0, dust=.8, prints=0, grime=.5, bump=.00006),
    "oak":      dict(tex="laminate", tile=.5, amp=.3, col=(.11, .065, .03), rough=.5, metal=0, wcol=(.3, .2, .1), wrough=.4, wmetal=0, dust=.8, prints=.3, grime=.3, bump=.00004),
    "matboard": dict(tex=None, col=(.55, .52, .44), rough=.85, metal=0, wcol=(.5, .45, .35), wrough=.9, wmetal=0, dust=.6, prints=0, grime=.7, bump=.00001),
    "chrome":   dict(tex=None, col=(.7, .7, .72), rough=.24, metal=1, wcol=(.7, .7, .72), wrough=.3, wmetal=1, dust=.6, prints=.5, grime=.2, bump=0),
    "paper":    dict(tex=None, col=(.55, .53, .47), rough=.7, metal=0, wcol=(.35, .31, .24), wrough=.8, wmetal=0, dust=1, prints=0, grime=.9, bump=.00005),
    "red":      dict(tex=None, col=(.38, .02, .015), rough=.45, metal=0, wcol=(.5, .1, .1), wrough=.4, wmetal=0, dust=.7, prints=0, grime=.1, bump=0),
    "yellow":   dict(tex=None, col=(.6, .4, .03), rough=.45, metal=0, wcol=(.6, .5, .2), wrough=.4, wmetal=0, dust=.7, prints=0, grime=.1, bump=0),
    "label":    dict(tex=None, col=(.45, .44, .42), rough=.5, metal=0, wcol=(.3, .3, .3), wrough=.5, wmetal=0, dust=.2, prints=0, grime=0, bump=0),
}

def img(name):
    return bpy.data.images.load(os.path.join(SRC, "p_" + name + ".png"), check_existing=True)

class G:
    """Small node-graph language."""
    def __init__(s, nt): s.nt = nt; s.n = nt.nodes; s.l = nt.links
    def mathop(s, op, a, b=None, clamp=False):
        m = s.n.new("ShaderNodeMath"); m.operation = op; m.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: s.l.new(v, m.inputs[i])
        return m.outputs[0]
    def mul(s, a, b): return s.mathop("MULTIPLY", a, b)
    def add(s, a, b): return s.mathop("ADD", a, b, True)
    def inv(s, a): return s.mathop("SUBTRACT", 1.0, a, True)
    def ramp(s, v, lo, hi):
        m = s.n.new("ShaderNodeMapRange"); m.interpolation_type = "SMOOTHSTEP"
        s.l.new(v, m.inputs[0]); m.inputs[1].default_value = lo; m.inputs[2].default_value = hi
        return m.outputs[0]
    def mix(s, f, a, b):
        m = s.n.new("ShaderNodeMix"); m.data_type = "RGBA"; m.clamp_factor = True
        if isinstance(f, (int, float)): m.inputs[0].default_value = f
        else: s.l.new(f, m.inputs[0])
        for i, v in ((6, a), (7, b)):
            if isinstance(v, (tuple, list)): m.inputs[i].default_value = (*v[:3], 1)
            else: s.l.new(v, m.inputs[i])
        return m.outputs[2]
    def mixf(s, f, a, b):
        m = s.n.new("ShaderNodeMix"); m.data_type = "FLOAT"; m.clamp_factor = True
        if isinstance(f, (int, float)): m.inputs[0].default_value = f
        else: s.l.new(f, m.inputs[0])
        for i, v in ((2, a), (3, b)):
            if isinstance(v, (int, float)): m.inputs[i].default_value = v
            else: s.l.new(v, m.inputs[i])
        return m.outputs[0]
    def box(s, image, tile, co, noncolor=True):
        if image.colorspace_settings.name != "Non-Color" and noncolor:
            image.colorspace_settings.name = "Non-Color"
        mp = s.n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / tile,) * 3
        s.l.new(co, mp.inputs[0])
        t = s.n.new("ShaderNodeTexImage"); t.image = image; t.projection = "BOX"; t.projection_blend = 0.3
        s.l.new(mp.outputs[0], t.inputs[0])
        return t.outputs[0]
    def bw(s, c):
        r = s.n.new("ShaderNodeRGBToBW"); s.l.new(c, r.inputs[0]); return r.outputs[0]
    def noise(s, co, scale, detail=4):
        n = s.n.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
        s.l.new(co, n.inputs["Vector"]); return n.outputs[0]

def M(name):
    """Gets or makes a recipe material."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    if name not in RECIPES:
        m = bpy.data.materials.new(name); m.use_nodes = True
        return m
    R = RECIPES[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); g = G(nt)
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.name = "OUT"
    pr = nt.nodes.new("ShaderNodeBsdfPrincipled"); pr.name = "PR"
    co = nt.nodes.new("ShaderNodeTexCoord").outputs["Object"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    # Baked mask (R edge, G occlusion), in the group's UVs, filled in by the bake.
    mask = nt.nodes.new("ShaderNodeTexImage"); mask.name = "MASK"
    sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(mask.outputs[0], sep.inputs[0])
    edge_raw, occ = sep.outputs[0], sep.outputs[1]
    dust = g.bw(g.box(img("dust"), 0.32, co))
    scr = g.bw(g.box(img("scratches"), 0.42, co))
    prints = g.bw(g.box(img("prints"), 0.3, co))
    grime = g.bw(g.box(img("grime"), 0.6, co))
    wear_n = g.noise(co, 95, 5)
    big_n = g.noise(co, 7, 4)
    # Edge wear breaks into chips and rubs, never a clean line.
    edge = g.mul(g.ramp(edge_raw, .10, .55), g.ramp(g.mathop("ADD", wear_n, g.mul(big_n, .35)), .56, .74))
    z = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Normal"], z.inputs[0]); up = g.ramp(z.outputs[2], .2, .92)
    if R.get("tex"):
        t = g.box(img(R["tex"]), R["tile"], co)
        bl = g.ramp(g.bw(t), .2, .8)
        amp = R.get("amp", .45)
        col = g.mix(bl, tuple(c * (1 - amp) for c in R["col"]), tuple(c * (1 + amp) for c in R["col"]))
        height = g.mul(g.bw(t), 1.0)
    else:
        col = g.mix(0, tuple(R["col"]), tuple(R["col"]))
        height = g.mul(big_n, .2)
    # Grime sits on the surface and in cavities: colour only, no shadow painted on.
    gr = g.mul(g.ramp(g.add(grime, g.mul(g.inv(occ), .5)), .35, .95), R["grime"])
    col = g.mix(g.mul(gr, .55), col, (.11, .095, .07))
    # Scratches
    sc = g.mul(g.ramp(scr, .25, .7), .7)
    col = g.mix(g.mul(sc, .45), col, tuple(R["wcol"]))
    rough = g.mixf(g.mul(gr, .5), R["rough"], min(1, R["rough"] + .25))
    rough = g.mixf(sc, rough, R["wrough"])
    # Edge wear
    col = g.mix(edge, col, tuple(R["wcol"]))
    rough = g.mixf(edge, rough, R["wrough"])
    metal = g.mixf(edge, R["metal"], R["wmetal"])
    # Fingerprints change gloss, not colour.
    pr_m = g.mul(g.ramp(prints, .22, .7), R["prints"])
    rough = g.mixf(g.mul(pr_m, .75), rough, max(.12, R["rough"] - .28))
    # Dust: a soft film on anything facing up, specks and lint everywhere.
    film = g.mul(g.mul(up, g.ramp(big_n, .3, .68)), .62 * R["dust"])
    sp = g.mul(g.ramp(dust, .4, .85), .6 * R["dust"])
    dm = g.add(film, g.mul(sp, g.add(.45, up)))
    col = g.mix(dm, col, (.27, .255, .235))
    rough = g.mixf(dm, rough, .96)
    metal = g.mixf(dm, metal, 0)
    # Height
    h = g.mathop("ADD", g.mul(height, 1.0), g.mul(g.ramp(dust, .4, .85), .7))
    h = g.mathop("SUBTRACT", h, g.mul(sc, 1.2))
    h = g.mathop("SUBTRACT", h, g.mul(edge, 1.6))
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1
    bump.inputs["Distance"].default_value = R["bump"] * 2.2
    nt.links.new(h, bump.inputs["Height"])
    nt.links.new(bump.outputs[0], pr.inputs["Normal"])
    for nm, s, ty in (("OUT_col", col, "c"), ("OUT_rough", rough, "f"), ("OUT_metal", metal, "f")):
        rr = nt.nodes.new("NodeReroute"); rr.name = nm
        nt.links.new(s, rr.inputs[0])
        nt.links.new(rr.outputs[0], pr.inputs[{"OUT_col": "Base Color", "OUT_rough": "Roughness", "OUT_metal": "Metallic"}[nm]])
    nt.links.new(pr.outputs[0], out.inputs[0])
    return m

def plain(name, col, rough=.4, metal=0, emit=None, strength=1):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*col, 1); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = (*emit, 1); p.inputs["Emission Strength"].default_value = strength
    return m


# ---------------------------------------------------------------- the TV
TV = dict(W=.94, H=.76, D=.62, foot=.035, sw=.74, sh=.555, scz=.425, apex=-.296, bx=.020, bz=.012)

def screen_mesh(nx=32, nz=24, name="screen"):
    """The tube face: quads over a gentle Trinitron-like bulge, UV 0-1 over the whole mesh. Origin at the centre of the glass."""
    t = TV
    bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap")
    v = [[bm.verts.new(((i / nx - .5) * t["sw"], t["bx"] * (2 * i / nx - 1) ** 2 + t["bz"] * (2 * j / nz - 1) ** 2, (j / nz - .5) * t["sh"])) for i in range(nx + 1)] for j in range(nz + 1)]
    for j in range(nz):
        for i in range(nx):
            f = bm.faces.new((v[j][i], v[j][i + 1], v[j + 1][i + 1], v[j + 1][i]))
            for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                l[uv].uv = (a / nx, b / nz)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.shade_smooth()
    o = new_obj(name, me, None, (0, t["apex"], t["scz"]))
    return o

def build_tv():
    t = TV; W, H, D, ft = t["W"], t["H"], t["D"], t["foot"]
    cz0 = (H + ft) / 2; H0 = H - ft; sc = t["scz"]
    fy = -D / 2
    # The bezel: one surface from the seam, round the rim, across the face, down the funnel to the tube.
    rings = [(fy + .085, W - .004, H0 - .004, .03, cz0)]
    rings += [(fy + .02, W, H0, .036, cz0)]
    for i in range(1, 5):                                     # big soft rim
        a = math.radians(90 * i / 4); rim = .02
        rings.append((fy + rim * (1 - math.sin(a)), W - 2 * rim * (1 - math.cos(a)), H0 - 2 * rim * (1 - math.cos(a)), .036 - .012 * (i / 4), cz0))
    # Face plane z .122 to .73: the band under the tube is the chin.
    face_w, face_h, fcz = .842, .608, .426
    rings += [(fy, face_w, face_h, .05, fcz),                 # the face plane stops, a groove, then the funnel
              (fy + .003, face_w - .004, face_h - .004, .05, fcz),
              (fy + .003, face_w - .012, face_h - .012, .048, fcz),
              (fy + .0015, face_w - .016, face_h - .016, .047, fcz),
              (fy + .007, .775, .578, .04, sc + .001),        # the funnel
              (-.278, .724, .544, .03, sc),
              (-.268, .712, .534, .028, sc)]
    bz = loft("bezel", rings, "plastic", n=8)
    cut = []
    # Speakers: long slot grilles left and right in the chin. Pockets are black.
    zz = [.0635 + i * .0088 for i in range(6)]
    for sx in (-1, 1):
        for i, z in enumerate(zz):
            cut.append(loft("s", [(fy - .01, .21, .0046, .0023, z), (fy + .012, .21, .0046, .0023, z)], "black", n=3, cx=sx * .29))
    # Button well in the middle of the chin and the power button seat
    cut.append(loft("well", [(fy - .01, .17, .022, .004, .078), (fy + .006, .17, .022, .004, .078)], "plastic2", n=3))
    cut.append(lathe("pw", [(0, fy - .01), (.0178, fy - .01), (.0178, fy + .005), (0, fy + .005)], "plastic2", segs=40, loc=(0, 0, 0)))
    for c in cut[-1:]:
        c.data.transform(Matrix.Translation((.125, 0, .078)))
    boolcut(bz, cut)
    finish(bz, .0012, 2, 28)
    parts_front = [bz]

    # Buttons in the well: five pills with a moulded rib, labels printed above.
    names = ("MENU", "- VOL", "VOL +", "- CH", "CH +")
    for i, lb in enumerate(names):
        x = -.064 + i * .032
        b = loft("btn", [(fy + .0058, .025, .0115, .0035, .078), (fy - .0006, .025, .0115, .0035, .078), (fy - .0016, .0235, .0103, .0032, .078)], "plastic2", n=3, cx=x)
        finish(b, .0005, 2, 30); parts_front.append(b)
        parts_front.append(text(lb, .0052, (x, fy - .0001, .0945), "paint_w"))
    # The power button: big, pale, ringed, its own object so a finger can press it in (+Z in Unity).
    px, pz_ = .125, .078
    ring = lathe("pwring", [(.0178, fy + .002), (.0178, fy - .0012), (.0170, fy - .0018), (.0158, fy - .0018), (.0158, fy + .002)], "chrome", segs=64, open=True)
    ring.data.transform(Matrix.Translation((px, 0, pz_))); parts_front.append(ring)
    pb = lathe("tv_power", [(0, .008), (.0152, .008), (.0152, -.0034), (.0143, -.0043), (.0128, -.0047), (0, -.0047)], "btn_light", segs=64)
    finish(pb, .0004, 2, 30)
    bar = box("bar", (.0022, .0004, .0084), (0, -.0048, .0035), "paint_w"); apply_loc(bar)
    arc = lathe("arc", [(.0056, -.0048), (.0074, -.0048), (.0074, -.0052), (.0056, -.0052)], "paint_w", segs=30, arc=(math.radians(-60), math.radians(240)))
    pb = join("tv_power", [pb, bar, arc])
    pb.location = (px, fy, pz_)
    parts_front.append(text("POWER", .0048, (px, fy - .0001, .1006), "paint_w"))
    # Model badge, IR window, stickers
    parts_front.append(text("TK-3600", .0115, (0, fy - .0002, .1095), "paint_w", spacing=1.25))
    parts_front.append(text("FLAT  TUBE  36", .0048, (-.29, fy - .0001, .1155), "paint_w", spacing=1.1))
    irw = loft("irw", [(fy + .002, .05, .017, .0045, .078), (fy - .0006, .05, .017, .0045, .078), (fy - .001, .0485, .0155, .004, .078)], "ir", n=3, cx=-.135)
    finish(irw, .0003, 1, 30); parts_front.append(irw)
    # Standby lamp seat
    seat = lathe("seat", [(.0052, fy - .0006), (.0042, fy - .0009), (.0042, fy + .002), (.0052, fy + .002)], "chrome", segs=24)
    seat.data.transform(Matrix.Translation((.158, 0, .078))); parts_front.append(seat)

    # Rear shell: steps down onto the tube's back, heavy and stepped like the real thing.
    b = fy + .08
    rings = [(b, W - .006, H0 - .006, .03, cz0),
             (b + .135, W - .012, H0 - .012, .03, cz0),
             (b + .142, W - .03, H0 - .03, .03, cz0 - .002),
             (b + .155, W - .05, H0 - .05, .035, cz0 - .004),
             (b + .30, W - .16, H0 - .10, .05, cz0 - .025),
             (b + .308, W - .19, H0 - .125, .05, cz0 - .028),
             (b + .46, W - .335, H0 - .2, .05, cz0 - .05),
             (D / 2 - .022, W - .42, H0 - .25, .05, cz0 - .058),
             (D / 2, W - .43, H0 - .26, .05, cz0 - .06)]
    sh = loft("shell", rings, "plastic", n=8)
    cut = []
    # Vents: louvres over the top, both sides and the back. Dark inside.
    def vents(n, pitch, slot_l, slot_w, rot, at):
        o = []
        for i in range(n):
            o.append(loft("v", [(-.045, slot_l, slot_w, slot_w / 2 - .0001, 0), (.045, slot_l, slot_w, slot_w / 2 - .0001, 0)], "black", n=2,
                          xf=Matrix.Translation(at) @ rot @ Matrix.Translation((0, 0, (i - (n - 1) / 2) * pitch))))
        return o
    top = Matrix.Rotation(math.radians(90), 4, "X")           # cutter's axis along Z, slots along X
    for x in (-.24, 0, .24):
        cut += vents(13, .0115, .19, .005, top, (x, b + .225, cz0 + H0 / 2 - .05))     # upper shoulder
    for sx in (-1, 1):
        side = Matrix.Rotation(math.radians(90), 4, "Z")
        cut += vents(11, .0125, .16, .005, side, (sx * ((W - .09) / 2 - .012), b + .23, cz0 + .1))
    cut += vents(9, .0125, .28, .0055, Matrix.Identity(4), (0, D / 2, cz0 - .02))
    boolcut(sh, cut)
    finish(sh, .0014, 2, 26)
    shell_parts = [sh]
    # Swivel plinth and rubber feet
    bm = [(0.0, .66, .40), (ft - .012, .70, .44), (ft - .004, .70, .44), (ft + .01, .66, .40)]
    plz = []
    for z, w, d in bm:
        plz.append((z, w, d, .04, 0))
    pl = loft("plinth", plz, "plastic", n=8, xf=Rx90)
    finish(pl, .0012, 2, 28); shell_parts.append(pl)
    for sx in (-.31, .31):
        for sy in (-.17, .17):
            f = lathe("foot", [(0, .004), (.019, .004), (.021, .002), (.021, 0.0), (0, 0.0)], "rubber", segs=24, axis="Z", loc=(sx, sy, 0)); apply_loc(f); finish(f, .0005, 1, 30); shell_parts.append(f)
    # Back plate with sockets
    pz = cz0 - .06
    plate = loft("plate", [(D / 2 - .004, .36, .22, .006, pz + .0), (D / 2 + .004, .36, .22, .006, pz + .0)], "backpl", n=3)
    finish(plate, .0012, 2, 30); shell_parts.append(plate)
    plate_y = D / 2 + .004
    for x, z in ((-.168, pz + .098), (.168, pz + .098), (-.168, pz - .098), (.168, pz - .098)):
        shell_parts.append(screw((x, plate_y, z), (0, 1, 0), .0058, "steel"))
    for x, z in ((-.225, pz + .185), (.225, pz + .185), (-.225, pz - .185), (.225, pz - .185)):
        shell_parts.append(screw((x, D / 2, z), (0, 1, 0), .0062, "steel"))
    # Coax, RCA trio, S-video, power cord with a strain relief
    def rca(x, z, col):
        o = lathe("rca", [(0, 0), (.0065, 0), (.0065, .004), (.0055, .004), (.0055, .012), (.0045, .0125), (.0032, .0125), (.0032, .004), (0, .004)], "steel", segs=24)
        o.data.transform(Matrix.Translation((x, plate_y - .002, z)))
        ring = lathe("rcar", [(0, 0), (.0082, 0), (.0082, .0028), (.0072, .0032), (0, .0032)], col, segs=24)
        ring.data.transform(Matrix.Translation((x, plate_y - .002, z)))
        finish(ring, .0002, 1, 30)
        return [o, ring]
    for i, c in enumerate(("yellow", "paint_w", "red")):
        shell_parts += rca(-.07 + i * .026, pz + .03, c)
    coax = lathe("coax", [(0, 0), (.0098, 0), (.0098, .002), (.0066, .002), (.0066, .016), (.0055, .0165), (.0015, .0165), (.0015, .010), (0, .01)], "brassy", segs=24)
    coax.data.transform(Matrix.Translation((.08, plate_y - .002, pz + .03))); shell_parts.append(coax)
    shell_parts.append(text("ANT  IN", .0065, (.08, plate_y + .0002, pz + .06), "paint_w", xf=Matrix.Rotation(math.radians(180), 4, "Z") @ Rx90))
    shell_parts.append(text("VIDEO   L   R", .0052, (-.044, plate_y + .0002, pz + .054), "paint_w", xf=Matrix.Rotation(math.radians(180), 4, "Z") @ Rx90))
    lbl = box("label", (.16, .0007, .075), (0, plate_y + .0004, pz - .05), "label"); shell_parts.append(lbl)
    for i, s in enumerate(("TK-3600   COLOR TELEVISION", "AC 120V  60Hz  185W", "CAUTION  RISK OF ELECTRIC SHOCK")):
        shell_parts.append(text(s, .0052, (0, plate_y + .0009, pz - .027 - i * .0105), "black", xf=Matrix.Rotation(math.radians(180), 4, "Z") @ Rx90))
    relief = lathe("relief", [(0, 0), (.011, 0), (.011, .006), (.0085, .007), (.0065, .03), (0, .03)], "rubber", segs=20)
    relief.data.transform(Matrix.Translation((.15, plate_y - .001, pz - .08))); shell_parts.append(relief)
    shell_parts.append(pipe("cord", [(.15, plate_y + .02, pz - .08), (.16, plate_y + .08, pz - .12), (.11, plate_y + .11, pz - .2), (.05, plate_y + .085, ft + .08), (.01, plate_y + .07, 0.012), (-.2, plate_y + .07, 0.008)], .0034, "rubber"))

    front = join("tv_front", parts_front)
    shell = join("tv_shell", shell_parts)
    scr = screen_mesh()
    # Standby lamp: separate so it can be driven.
    led = lathe("tv_led", [(0, -.0016), (.0024, -.0016), (.0036, -.0007), (.0042, .0), (0, .0)], "ledmat", segs=20, loc=(.158, fy - .0004, .078))
    led.data.shade_smooth()
    return [front, shell, scr, led, pb]


# ---------------------------------------------------------------- the stand
ST = dict(W=1.10, H=.62, D=.62)

def build_stand():
    W, H, D = ST["W"], ST["H"], ST["D"]
    th = .032
    p = []
    def panel(name, size, loc, mat="laminate", bev=.0012):
        o = box(name, size, loc, mat); apply_loc(o); finish(o, bev, 2, 30); return o
    foot_h = .05
    p.append(panel("top", (W, D, th), (0, 0, H - th / 2)))
    p.append(panel("bot", (W - .03, D - .02, th), (0, 0, foot_h + th / 2)))
    for s in (-1, 1):
        p.append(panel("side", (th, D - .012, H - foot_h - th - th), (s * (W / 2 - th / 2 - .012), 0, foot_h + th + (H - foot_h - 2 * th) / 2)))
    # Middle divider and shelf
    p.append(panel("mid", (W - .09, D - .05, .024), (0, -.005, .335)))
    back = box("back", (W - .03, .006, H - foot_h - th - th), (0, D / 2 - .012, foot_h + th + (H - foot_h - 2 * th) / 2), "mdf"); apply_loc(back)
    boolcut(back, [lathe("hole", [(0, -.03), (.035, -.03), (.035, .03), (0, .03)], "mdf", segs=32, loc=(.25, D / 2 - .012, .45))])
    apply_loc(back); finish(back, .0005, 1, 30); p.append(back)
    # Exposed fibreboard on a corner where the edging tape has lifted
    tape = box("tape", (.07, .0016, th + .001), (-.44, -D / 2 - .0002, H - th / 2 - .0006), "mdf"); apply_loc(tape); p.append(tape)
    # Chrome ball feet on black pegs
    for sx in (-.46, .46):
        for sy in (-.24, .24):
            f = lathe("foot", [(0, foot_h), (.03, foot_h), (.03, foot_h - .004), (.021, foot_h - .008), (.017, .03), (.021, .012), (.024, .004), (.022, 0), (0, 0)], "plastic", segs=32, axis="Z", loc=(sx, sy, 0))
            apply_loc(f); finish(f, .0006, 1, 30); p.append(f)
    # Screw caps on the top panel
    for sx in (-1, 1):
        for sy in (-.22, .22):
            s = lathe("cap", [(0, 0), (.0072, 0), (.0072, .0009), (.0052, .0016), (0, .0018)], "plastic2", segs=16, axis="Z", loc=(sx * (W / 2 - .03), sy, H)); apply_loc(s); p.append(s)

    # VCR on the upper shelf
    vy = -.10; vz = .347; vw, vh, vd = .43, .092, .32
    vcr = loft("vcr", [(vy - vd / 2, vw - .006, vh - .006, .003, vz + vh / 2), (vy - vd / 2 + .004, vw, vh, .004, vz + vh / 2), (vy + vd / 2, vw, vh, .004, vz + vh / 2)], "plastic", n=3)
    vfront = vy - vd / 2
    bc = []
    bc.append(loft("tray", [(vfront - .01, .19, .017, .002, vz + .06), (vfront + .012, .19, .017, .002, vz + .06)], "black", n=2, cx=-.09))
    bc.append(loft("disp", [(vfront - .01, .115, .024, .002, vz + .06), (vfront + .002, .115, .024, .002, vz + .06)], "black", n=2, cx=.105))
    boolcut(vcr, bc); finish(vcr, .0008, 2, 30); p.append(vcr)
    flap = loft("flap", [(vfront + .009, .184, .0145, .001, vz + .06), (vfront + .006, .184, .0145, .001, vz + .06)], "plastic2", n=2, cx=-.09); finish(flap, .0003, 1, 30); p.append(flap)
    for i in range(6):
        v = box("vb", (.022, .004, .009), (.035 + i * .0275 + .0, vfront - .001, vz + .031), "plastic2"); apply_loc(v); finish(v, .0006, 1, 30); p.append(v)
    p.append(text("STEREO  HI-FI   VHS", .0052, (-.09, vfront - .0002, vz + .035), "paint_w"))
    for s in (-1, 1):
        for sy in (-.13, .13):
            ft = lathe("vf", [(0, .0), (.016, .0), (.016, .012), (0, .012)], "rubber", segs=14, axis="Z", loc=(s * .17, vy + sy, vz - .002)); apply_loc(ft); p.append(ft)
    # Tapes on the lower shelf
    random.seed(3)
    z = foot_h + th
    for i, (w, x, rz) in enumerate(((.188, -.26, 2), (.188, -.25, -3), (.188, -.27, 5))):
        tp = box("tape", (w, .104, .026), (x, -.14, z + .013 + i * .0262), "plastic", xf=Matrix.Rotation(math.radians(rz), 4, "Z")); apply_loc(tp); finish(tp, .0009, 1, 30); p.append(tp)
        lb = box("lbl", (.145, .0006, .016), (x, -.1925, z + .013 + i * .0262), "paper", xf=Matrix.Rotation(math.radians(rz), 4, "Z")); apply_loc(lb); p.append(lb)
    p.append(text("RECORDED  OVER", .0062, (-.26, -.1935, z + .013 + 2 * .0262), "black"))
    # A tangle of cable hanging down the back of the upper shelf
    p.append(pipe("c1", [(.2, .05, vz + .05), (.25, .22, vz + .03), (.27, .285, vz + .09), (.24, .29, .29), (.22, .29, .2), (.26, .285, .1)], .0032, "rubber"))
    p.append(pipe("c2", [(-.1, .05, vz + .04), (-.05, .2, vz + .02), (.1, .27, vz + .08), (.2, .285, vz + .1), (.25, .29, .46)], .0026, "rubber"))
    st = join("tv_stand", p)
    # VCR clock, separate so it can blink. 12:00, forever.
    me = text("12:00", .0185, (0, 0, 0), "clockmat", thick=.00005)
    me.name = "vcr_clock"; me.data.name = "vcr_clock"
    me.location = (.105, vfront + .0015, vz + .06)
    return [st, me]


# ---------------------------------------------------------------- the camera
CAM = dict(axis=-.28, ball=-.197)

def build_camera():
    A, B = CAM["axis"], CAM["ball"]
    br, hd = [], []
    Up = lambda o, z=A: (o.data.transform(Matrix.Translation((0, 0, z))), o)[1]

    # ---- bracket
    plate = lathe("plate", [(0, 0.0), (.058, 0.0), (.058, -.0035), (.0555, -.0058), (.052, -.0062), (.034, -.0085), (.03, -.0145), (.0265, -.0165), (.024, -.0165), (0, -.0165)], "campaint", segs=96, axis="Z")
    finish(plate, .0006, 2, 22); br.append(plate)
    for i in range(3):
        a = math.radians(30 + 120 * i)
        br.append(screw((.046 * math.cos(a), .046 * math.sin(a), -.0048), (0, .0, -1), .0052, "steel"))
    tube = lathe("tube", [(0, -.0165), (.0165, -.0165), (.0165, -.03), (.0155, -.032), (.0138, -.033), (.0138, B + .062), (.0165, B + .058), (.0165, B + .052), (.0138, B + .048), (.0125, B + .03), (0, B + .03)], "campaint", segs=64, axis="Z")
    finish(tube, .0005, 2, 25); br.append(tube)
    # Clamp socket with a thumb screw
    sock = lathe("sock", [(0, B + .036), (.015, B + .036), (.0182, B + .03), (.0212, B + .022), (.0232, B + .012), (.0232, B + .005), (.0222, B + .002), (.0205, B + .002), (.0205, B + .010), (0, B + .012)], "zinc", segs=64, axis="Z")
    finish(sock, .0005, 2, 25); br.append(sock)
    # Split line and clamp ears of the socket
    ear = box("ear", (.012, .009, .012), (.0255, 0, B + .018), "zinc"); apply_loc(ear); finish(ear, .0006, 1, 30); br.append(ear)
    ear2 = box("ear", (.012, .009, .012), (-.0255, 0, B + .018), "zinc"); apply_loc(ear2); finish(ear2, .0006, 1, 30); br.append(ear2)
    ts = lathe("thumb", [(0, 0), (.0035, 0), (.0035, .018), (.009, .0195), (.0095, .021), (.0095, .0285), (.0085, .0295), (0, .0295)], "plastic", segs=12)
    ts.data.transform(Matrix.Rotation(math.radians(90), 4, "Z")); ts.data.transform(Matrix.Translation((.0165, 0, B + .018)))
    finish(ts, .0004, 1, 24); br.append(ts)
    br.append(pipe("wire_in", [(.0125, .002, -.0156), (.03, .012, -.03), (.046, .02, -.09), (.030, .03, -.14), (.018, .04, B + .05)], .0026, "rubber"))

    # ---- the head, built around its axis then moved under the ball
    prof = [(0, .122), (.022, .122), (.031, .1205), (.038, .117), (.0435, .1115), (.0458, .1085), (.0462, .104), (.0454, .1035), (.0454, .1015),
            (.0472, .101), (.0472, -.086), (.0492, -.087), (.0492, -.1045), (.0486, -.1052), (.0486, -.1085), (.0498, -.1092), (.0498, -.1165), (.048, -.118), (.0452, -.118),
            (.0442, -.1155), (.0432, -.0985), (0, -.0985)]
    body = lathe("body", prof, "campaint", segs=128); finish(body, .0005, 2, 25); hd.append(Up(body))
    # Casting ribs along the belly
    for a in (205, 225, 245, 295, 315, 335):
        r = math.radians(a)
        rib = box("rib", (.0035, .15, .0028), (0, -.002, 0), "campaint", xf=Matrix.Rotation(-r + math.pi / 2, 4, "Y") @ Matrix.Translation((0, 0, .0478)))
        apply_loc(rib); finish(rib, .0006, 1, 30); hd.append(Up(rib))
    # Rear cap screws and cable gland
    for i in range(4):
        a = math.radians(45 + 90 * i)
        hd.append(Up(screw((.0345 * math.cos(a), .1195, .0345 * math.sin(a)), (0, 1, 0), .0034, "steel")))
    gl = lathe("gland", [(0, .12), (.0092, .12), (.0092, .1265), (.0072, .127), (.0072, .1345), (.0048, .137), (.0044, .143), (0, .143)], "rubber", segs=6 * 4)
    finish(gl, .0003, 1, 40); gl.data.transform(Matrix.Translation((0, 0, -.012))); hd.append(Up(gl))
    # The flange screws
    for i in range(6):
        a = math.radians(30 + 60 * i)
        hd.append(Up(screw((.0496 * math.cos(a), -.0955, .0496 * math.sin(a)), (math.cos(a), 0, math.sin(a)), .0026, "steel")))
    # Sun hood: a bent sheet on two standoffs
    Rh, th = .0585, .0016
    a0, a1 = math.radians(18), math.radians(162)
    bm = bmesh.new(); N = 48; stations = [.114 - i * (.114 + .172) / 12 for i in range(13)]
    rows = []
    for st in stations:
        row = []
        lean = max(0, (-.118 - st)) * .9    # the front edge is cut back at the sides
        for r_, rev in ((Rh + th, 0), (Rh, 1)):
            pts = []
            for i in range(N + 1):
                u = i / N; a = a0 + (a1 - a0) * u
                k = (2 * u - 1) ** 2
                extra = -lean * k * 1.2
                pts.append(Vector((r_ * math.cos(a), st + (lean * k * 0), r_ * math.sin(a))))
            row += pts if not rev else pts[::-1]
        rows.append([bm.verts.new(p) for p in row])
    c = len(rows[0])
    for a, b in zip(rows, rows[1:]):
        for i in range(c):
            bm.faces.new((a[i], a[(i + 1) % c], b[(i + 1) % c], b[i]))
    bm.faces.new(rows[0]); bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("hood"); bm.to_mesh(me); bm.free()
    hood = new_obj("hood", me, "campaint")
    # Rake the front of the hood back at the sides with a cutter
    rake = []
    for s in (-1, 1):
        rk = box("rk", (.08, .08, .08), (s * .064, -.21, -.01), "campaint", xf=Matrix.Rotation(s * math.radians(38), 4, "Z"))
        rake.append(rk)
    boolcut(hood, rake)
    finish(hood, .0004, 2, 25); hd.append(Up(hood))
    # Standoffs and hood screws
    for sy in (-.05, .05):
        for sx in (-.022, .022):
            so = lathe("so", [(0, .0), (.0048, .0), (.0048, .014), (0, .014)], "zinc", segs=16, axis="Z", loc=(sx, sy, .0445)); apply_loc(so); hd.append(Up(so))
            hd.append(Up(screw((sx, sy, .0606), (0, 0, 1), .0038, "steel")))
    # Saddle on top of the hood and the ball stem
    sad = loft("saddle", [(-.035, .034, .012, .004, .0668), (.035, .034, .012, .004, .0668)], "zinc", n=3); finish(sad, .0008, 2, 30); hd.append(Up(sad))
    for sy in (-.024, .024):
        hd.append(Up(screw((0, sy, .0729), (0, 0, 1), .0042, "steel")))
    stem = lathe("stem", [(0, .072), (.0145, .072), (.0145, .0755), (.0095, .077), (.0085, B - A - .012), (0, B - A - .012)], "zinc", segs=40, axis="Z"); finish(stem, .0005, 1, 30); hd.append(Up(stem))
    ball = lathe("ball", [(.0195 * math.sin(math.radians(i * 180 / 24)), .0195 * math.cos(math.radians(i * 180 / 24))) for i in range(25)], "chrome", segs=48, axis="Z", loc=(0, 0, 0))
    ball.data.shade_smooth(); ball.data.transform(Matrix.Translation((0, 0, B))); hd.append(ball)

    # Face: rubber gasket, PCB ring, IR LEDs, sensor
    ring = lathe("gasket", [(.0452, -.118), (.0448, -.1196), (.0434, -.1196), (.0425, -.1155), (.0425, -.1125), (.0432, -.1)], "rubber", segs=96, open=True); ring.data.transform(Matrix.Scale(1, 4)); hd.append(Up(ring))
    pcb = lathe("pcb", [(.0212, -.0995), (.0425, -.0995), (.0425, -.097), (.0212, -.097)], "pcb", segs=96); finish(pcb, .0002, 1, 30); hd.append(Up(pcb))
    n = 22
    rir = .0322
    for i in range(n):
        a = math.radians(360 * i / n + 8.1)
        if abs(((math.degrees(a) % 360) - 315)) < 8.3:    # the red status lamp takes this seat
            continue
        x, z = rir * math.cos(a), rir * math.sin(a)
        cup = lathe("cup", [(.0029, -.0995), (.0041, -.1003), (.0044, -.1006), (.0040, -.1009), (.0031, -.1), (.0024, -.0994)], "chrome", segs=20, open=True)
        cup.data.transform(Matrix.Translation((x, 0, z))); hd.append(Up(cup))
        dome = lathe("irled", [(.0026, -.0985)] + [(.0026 * math.cos(math.radians(t)), -.1002 - .0026 * math.sin(math.radians(t))) for t in range(0, 91, 15)], "ir", segs=18)
        dome.data.shade_smooth(); dome.data.transform(Matrix.Translation((x, 0, z))); hd.append(Up(dome))
    sens = lathe("cds", [(0, -.0985), (.0026, -.0985), (.0026, -.1), (.0018, -.1006), (0, -.1007)], "yellow", segs=16)
    sens.data.transform(Matrix.Translation((0, 0, .0385))); hd.append(Up(sens))
    # A printed line round the PCB
    a_ = 0
    for ch in "IR 22 LED  DAY/NIGHT":
        an = math.radians(248 - a_ * 6.2)
        xf = Matrix.Rotation(an - math.radians(90) + 0, 4, "Y")
        o = text(ch, .0026, (0, 0, 0), "paint_w")
        o.data.transform(Matrix.Translation((0, 0, -.0395)))
        o.data.transform(Matrix.Rotation(an - math.radians(270), 4, "Y"))
        o.data.transform(Matrix.Translation((0, -.0996, 0)))
        hd.append(Up(o)); a_ += 1

    # The lens barrel: stacked rings, knurled focus ring, engraved scale, baffle grooves down to the glass.
    lb = [(.0212, -.098), (.0212, -.1045), (.0202, -.105), (.0202, -.1072)]                          # base
    lb += [(.0222, -.1078), (.0222, -.1195), (.0208, -.1205), (.0208, -.1212)]                        # focus ring (knurled below)
    lb += [(.0226, -.1218), (.0226, -.1305), (.0222, -.1322), (.0205, -.1328)]                        # name ring
    grooves = 7
    r0, y0, r1, y1 = .0203, -.1328, .0153, -.1175
    for i in range(grooves):
        u0 = i / grooves; u1 = (i + .45) / grooves; u2 = (i + 1) / grooves
        lb.append((r0 + (r1 - r0) * u1, y0 + (y1 - y0) * u0 + .0002))
        lb.append((r0 + (r1 - r0) * u1, y0 + (y1 - y0) * u2))
    lb += [(.0148, -.1173), (.0146, -.1168), (.0146, -.113), (0, -.113)]
    barrel = lathe("barrel", lb, "anodized", segs=128)
    finish(barrel, .00025, 1, 28); hd.append(Up(barrel))
    # Knurl: real ribs
    n = 72
    for i in range(n):
        a = 2 * math.pi * i / n
        k = box("kn", (.0011, .0098, .0009), (0, -.1136, 0), "anodized", xf=Matrix.Rotation(-a, 4, "Y") @ Matrix.Translation((0, 0, .0226)))
        apply_loc(k); hd.append(Up(k))
    # Engraving round the name ring: text in a circle.
    s = "2.8-12mm  1:1.4  CS   VARI-FOCAL   IR CORRECTED      "
    for i, ch in enumerate(s):
        if ch == " ":
            continue
        an = math.radians(-i * 360 / len(s))
        o = text(ch, .0024, (0, 0, 0), "paint_w", xf=Matrix.Rotation(math.radians(90), 4, "Y") @ Matrix.Rotation(math.radians(90), 4, "Z") @ Rx90 @ Matrix.Rotation(math.radians(0), 4, "X"))
        o.data.transform(Matrix.Translation((.02262, 0, 0)))
        o.data.transform(Matrix.Translation((0, -.1262, 0)))
        o.data.transform(Matrix.Rotation(an, 4, "Y"))
        hd.append(Up(o))
    # A label on the housing's flank
    side = Matrix.Rotation(math.radians(20), 4, "Y")
    lab = lathe("label", [(.0473, .03), (.0473, -.03)], "paper", segs=72, arc=(math.radians(150), math.radians(186)))
    hd.append(Up(lab))
    hd.append(pipe("wire", [(0, .142, -.012 + A), (0, .170, -.03 + A), (.018, .19, A + .02), (.03, .15, A + .09), (.03, .08, B + .045), (.018, .04, B + .05)], .0026, "rubber"))

    bracket = join("bracket", br)
    head = join("head", hd)
    # Head origin at the ball, so rotating it aims the camera.
    head.data.transform(Matrix.Translation((0, 0, -B))); head.location = (0, 0, B)
    # The lens: a real convex front element, separate.
    prof = [(.0147 * math.sin(math.radians(i * 2.4)) / math.sin(math.radians(60)), -.0088 + (.0147 / math.sin(math.radians(60))) * (math.cos(math.radians(60)) - math.cos(math.radians(i * 2.4)))) for i in range(25, -1, -1)]
    prof = [(.0147, .0003)] + prof
    lens = lathe("lens", prof, "lensmat", segs=128)
    lens.data.shade_smooth()
    lens.parent = head; lens.location = (0, -.1165 + .0088 * 0 + .0, A - B)
    # Status LED: a 7 mm dome with its seat.
    a = math.radians(315)
    x, z = rir * math.cos(a), rir * math.sin(a)
    prof = [(.0036, .0)] + [(.0036 * math.cos(math.radians(t)), -.0014 - .0036 * math.sin(math.radians(t))) for t in range(0, 91, 10)]
    led = lathe("led", prof, "ledmat", segs=32); led.data.shade_smooth()
    led.parent = head; led.location = (x, -.0995, A - B + z)
    # Its seat is part of the head (added before the join would be simpler; a small collar here).
    return [bracket, head, lens, led]


# ---------------------------------------------------------------- the light wall TV
def build_light():
    t = TV; W, H, ft = t["W"], t["H"], t["foot"]; D = t["D"]
    cz0 = (H + ft) / 2; H0 = H - ft; fy = -D / 2; sc = t["scz"]
    r = [(fy + .08, W - .004, H0 - .004, .03, cz0), (fy + .012, W, H0, .036, cz0), (fy, W - .024, H0 - .024, .03, cz0),
         (fy, .842, .655, .05, sc), (fy + .007, .775, .59, .04, sc), (-.278, .724, .544, .03, sc), (-.268, .712, .534, .028, sc)]
    a = loft("lf", r, "plastic", n=3)
    b = fy + .08
    r2 = [(b, W - .006, H0 - .006, .03, cz0), (b + .135, W - .012, H0 - .012, .03, cz0), (b + .155, W - .05, H0 - .05, .035, cz0 - .004),
          (b + .30, W - .16, H0 - .10, .05, cz0 - .025), (b + .46, W - .335, H0 - .2, .05, cz0 - .05), (D / 2, W - .43, H0 - .26, .05, cz0 - .06)]
    c = loft("lb", r2, "plastic", n=2)
    pl = box("lp", (.70, .44, ft), (0, 0, ft / 2), "plastic"); apply_loc(pl)
    o = join("tv_light_body", [a, c, pl])
    o.data.shade_smooth(); o.data.set_sharp_from_angle(angle=math.radians(35))
    return o


# ---------------------------------------------------------------- story props
RM = dict(L=.195, W=.054, T=.024)

def build_remote():
    """Chunky late-90s remote, lying flat, nose toward -Y. Top of the buttons toward +Z."""
    L, W, T = RM["L"], RM["W"], RM["T"]
    top = lambda y: T - .003 * max(0, y + L / 2 - .012) / (L - .024)
    rings = [(-L / 2, W - .012, T - .010, .005, T / 2), (-L / 2 + .002, W - .006, T - .005, .007, T / 2), (-L / 2 + .012, W, T, .009, T / 2),
             (L / 2 - .012, W - .002, T - .003, .009, (T - .003) / 2), (L / 2 - .002, W - .007, T - .009, .007, (T - .003) / 2), (L / 2, W - .013, T - .014, .005, (T - .003) / 2)]
    body = loft("remote", rings, "plastic2", n=6)
    well = lathe("pw", [(0, T - .004), (.0112, T - .004), (.0112, T + .01), (0, T + .01)], "plastic2", segs=48, axis="Z", loc=(0, -.072, 0)); apply_loc(well)
    boolcut(body, [well]); finish(body, .0007, 2, 30)
    p = [body]
    ir = loft("irw", [(-L / 2 - .0002, W - .03, T - .014, .004, T / 2), (-L / 2 + .004, W - .03, T - .012, .004, T / 2)], "ir", n=3); finish(ir, .0003, 1, 30); p.append(ir)
    Rz = Matrix.Rotation(math.pi, 4, "Z")
    def label(s, x, y, size=.0042):
        return text(s, size, (x, y, top(y) + .00005), "paint_w", xf=Rz)
    def key(x, y, w, h, mat="rubber"):
        z = top(y)
        k = loft("key", [(-.0015, w, h, min(w, h) * .42, 0), (.0022, w, h, min(w, h) * .42, 0), (.0028, w - .001, h - .001, min(w, h) * .4, 0)], mat, n=4, xf=Matrix.Translation((x, y, z)) @ Rx90)
        finish(k, .00025, 1, 30); return k
    p.append(label("POWER", 0, -.0555, .0044))
    for s, x in (("MUTE", -.015), ("TV/AV", .015)):
        p.append(key(x, -.0475, .015, .0072)); p.append(label(s, x, -.0415, .0032))
    # Channel and volume rockers, then the number pad.
    for x, y, w, h in ((-.015, -.024, .011, .019), (.015, -.024, .011, .019), (0, -.03, .012, .008), (0, -.018, .012, .008)):
        p.append(key(x, y, w, h))
    p.append(label("VOL", -.015, -.0115, .0034)); p.append(label("CH", .015, -.0115, .0034))
    for i, s in enumerate("123456789 0 "):
        y = -.0005 + (i // 3) * .0145; x = .0145 - (i % 3) * .0145
        if s != " ":
            p.append(key(x, y + .0035, .0115, .0074)); p.append(label(s, x, y - .0028, .0042))
    p.append(text("TK-3600", .0048, (0, .083, top(.083) + .00005), "paint_w", xf=Rz))
    o = join("remote", p)
    btn = lathe("remote_power", [(0, -.012), (.0098, -.012), (.0098, .0005), (.0088, .0016), (.0062, .0024), (0, .0026)], "glossred", segs=48, axis="Z"); finish(btn, .0003, 2, 30)
    btn.location = (0, -.072, T - .0005)
    return [o, btn]

def build_glass():
    """A heavy diner tumbler, fluted low down. Water is separate so it can shiver."""
    H = .118; R0, R1 = .033, .0405
    r = lambda z: R0 + (R1 - R0) * (z / H)
    prof = [(0, .0), (R0 - .0015, 0.0), (R0, .002)] + [(r(i / 16 * H), i / 16 * H) for i in range(1, 17)]
    prof += [(R1 - .0006, H + .0009), (R1 - .0018, H + .0009), (R1 - .0026, H)]
    prof += [(r(.116 - i / 10 * .1) - .0026, .116 - i / 10 * .1) for i in range(1, 11)] + [(.021, .0135), (.012, .0125), (0, .012)]
    g = lathe("glass", prof, "glassy", segs=120, axis="Z")
    for v in g.data.vertices:          # flutes on the outside, lower half
        c = v.co; rr = math.hypot(c.x, c.y)
        if .004 < c.z < .07 and rr > r(c.z) - .001:
            a = math.atan2(c.y, c.x); k = 1 + .028 * (abs(math.cos(a * 6)) - .6) * min(1, (.07 - c.z) / .012)
            c.x *= k; c.y *= k
    g.data.update(); finish(g, 0, 1, 40)
    # No transparency here: the outer wall below the water line is a darker, wetter tone, so the level reads from the side.
    g.data.materials.append(M("glasswet"))
    for f in g.data.polygons:
        if f.center.z < .088 and math.hypot(f.center.x, f.center.y) > r(f.center.z) - .0012 and f.normal.z < .6:
            f.material_index = 1
    # Water: a surface with a meniscus, plus a body. Origin at the surface, so a hop or scale reads as a shiver.
    zw = .088; rw = r(zw) - .0030
    pr = [(0, 0)] + [(rw * i / 14, 0.0) for i in range(1, 13)] + [(rw * .98, .0002), (rw * .995, .0007), (rw, .0014), (rw, -.02), (r(.03) - .0028, .03 - zw), (0, .03 - zw)]
    w = lathe("water", pr, "watermat", segs=64, axis="Z"); w.data.shade_smooth(); w.data.set_sharp_from_angle(angle=math.radians(60))
    w.location = (0, 0, zw)
    return [g, w]

def build_lamp():
    """A dull ceramic table lamp with a linen shade. Shade and bulb are separate, so they can flicker."""
    N = 26; pr = [(0, 0), (.078, 0), (.078, .01), (.072, .015)]
    for i in range(N + 1):
        t = i / N; z = .02 + t * .27
        pr.append((.03 + .078 * math.sin(math.pi * (t * .93 + .05)) ** 1.25, z))
    pr += [(.024, .296), (.024, .304), (.031, .308), (.031, .314), (.0165, .32), (0, .32)]
    base = lathe("lamp_base", pr, "ceramic", segs=96, axis="Z"); finish(base, .0005, 1, 24)
    neck = lathe("neck", [(0, .318), (.0078, .318), (.0078, .335), (.0145, .338), (.0155, .35), (.0155, .385), (.0135, .39), (.0135, .395), (0, .395)], "brassy", segs=48, axis="Z"); finish(neck, .0003, 1, 30)
    p = [base, neck]
    pts = [(-.012, 0, .35), (-.045, 0, .40), (-.058, 0, .47), (-.03, 0, .535), (0, 0, .545), (.03, 0, .535), (.058, 0, .47), (.045, 0, .40), (.012, 0, .35)]
    p.append(pipe("harp", pts, .0016, "brassy"))
    p.append(lathe("finial", [(0, .544), (.006, .544), (.0075, .55), (.0042, .556), (.0095, .566), (.0065, .575), (0, .581)], "brassy", segs=24, axis="Z"))
    for i in range(14):
        b = lathe("bead", [(.0017 * math.sin(math.radians(a)), .0017 * math.cos(math.radians(a))) for a in range(0, 181, 45)], "brassy", segs=8, axis="Z", loc=(.0165, 0, .375 - i * .0052)); apply_loc(b); b.data.shade_smooth(); p.append(b)
    p.append(pipe("cord", [(.05, .07, .004), (.09, .14, .004), (.05, .24, .006), (-.06, .3, .006), (-.2, .33, .006)], .0028, "rubber"))
    o = join("lamp", p)
    sb, st, zb, zt = .175, .105, .335, .545
    pts = [(sb + (st - sb) * i / 8, zb + (zt - zb) * i / 8) for i in range(9)] + [(st - .002, zt - .0005)] + [(sb + (st - sb) * i / 8 - .002, zb + (zt - zb) * i / 8) for i in range(8, -1, -1)]
    sh = lathe("lamp_shade", pts, "linen", segs=96, axis="Z", open=True)
    tr = lathe("trim", [(sb + .0008, zb), (sb + .0008, zb + .012), (sb - .0005, zb + .0125), (sb - .0026, zb)], "matboard", segs=96, axis="Z", open=True)
    tr2 = lathe("trim", [(st + .0008, zt), (st + .0008, zt - .01), (st - .0005, zt - .0105), (st - .0026, zt)], "matboard", segs=96, axis="Z", open=True)
    sh = join("lamp_shade", [sh, tr, tr2]); sh.data.shade_smooth(); sh.data.set_sharp_from_angle(angle=math.radians(50))
    bulb = lathe("lamp_bulb", [(0, .392), (.016, .395), (.018, .41), (.03, .44), (.034, .46), (.03, .485), (.016, .498), (0, .502)], "bulbmat", segs=32, axis="Z"); bulb.data.shade_smooth()
    return [o, sh, bulb]

def build_frame():
    """Hung from one nail: the origin is the nail, so rotating about the wall's normal ticks it crooked. Back flat at y=0, facing -Y."""
    W, H, top = .42, .52, -.03
    cz = top - H / 2
    rings = [(0, W, H, .001, cz), (-.016, W, H, .001, cz), (-.019, W - .004, H - .004, .001, cz), (-.026, W - .012, H - .012, .001, cz), (-.026, W - .026, H - .026, .001, cz),
             (-.021, W - .034, H - .034, .001, cz), (-.0225, W - .040, H - .040, .001, cz), (-.010, W - .070, H - .070, .001, cz)]
    fr = loft("frame", rings, "oak", n=1); finish(fr, .0008, 2, 24)
    ins = W - .07
    mat = box("mat", (ins, .002, H - .07), (0, -.0105, cz), "matboard"); apply_loc(mat)
    boolcut(mat, [box("w", (.27, .02, .37), (0, -.0105, cz), "matboard")]); finish(mat, .0006, 1, 30)
    fro = join("frame", [fr, mat])
    bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); w, h = .28, .38
    vs = [bm.verts.new(c) for c in ((-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2))]
    f = bm.faces.new(vs)
    for l, q in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        l[uv].uv = q
    me = bpy.data.meshes.new("picture"); bm.to_mesh(me); bm.free()
    pic = new_obj("picture", me, "picmat", (0, -.0106, cz))
    nail = lathe("nail", [(0, .0), (.0018, 0), (.0018, -.008), (.0036, -.0082), (.0036, -.0098), (.003, -.0104), (0, -.0104)], "steel", segs=18)
    finish(nail, .0002, 1, 30)
    wire = pipe("wire", [(-.14, .002, cz + .1), (-.05, .003, -.008), (0, .0015, -.001), (.05, .003, -.008), (.14, .002, cz + .1)], .0009, "steel")
    hanger = join("nail", [nail, wire])
    return [fro, pic, hanger]


# ---------------------------------------------------------------- UVs and baking
GROUPS = {
    "tv": [("tv_front", 2048), ("tv_shell", 2048), ("tv_power", 512)],
    "stand": [("tv_stand", 2048)],
    "camera": [("head", 2048), ("bracket", 1024)],
    "remote": [("remote", 2048), ("remote_power", 256)],
    "glass": [("glass", 1024)],
    "lamp": [("lamp", 2048), ("lamp_shade", 1024)],
    "frame": [("frame", 2048), ("nail", 256)],
}

def cycles(samples, threads=8):
    s = bpy.context.scene; s.render.engine = "CYCLES"; c = s.cycles
    c.device = "CPU"; c.samples = samples; c.use_adaptive_sampling = False; c.use_denoising = False
    s.render.threads_mode = "FIXED"; s.render.threads = threads

def unwrap(o):
    active(o)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=.003, area_weight=.6, scale_to_bounds=False)
    bm = bmesh.from_edit_mesh(o.data); uvl = bm.loops.layers.uv.active
    slots = [i for i, m in enumerate(o.data.materials) if m and m.name in ("paint_w", "chrome_txt")]
    seen = set()
    for f in bm.faces:                       # lettering would otherwise bake away to mush: each letter gets 5x the texels
        if f.material_index in slots and f.index not in seen:
            stack = [f]; comp = []; seen.add(f.index)
            while stack:
                c = stack.pop(); comp.append(c)
                for e in c.edges:
                    for n in e.link_faces:
                        if n.index not in seen and n.material_index in slots:
                            seen.add(n.index); stack.append(n)
            ls = [l for c in comp for l in c.loops]
            cu = sum(l[uvl].uv.x for l in ls) / len(ls); cv = sum(l[uvl].uv.y for l in ls) / len(ls)
            for l in ls:
                l[uvl].uv = (cu + (l[uvl].uv.x - cu) * 5, cv + (l[uvl].uv.y - cv) * 5)
    bmesh.update_edit_mesh(o.data)
    bpy.ops.uv.pack_islands(rotate=True, margin=.0025)
    bpy.ops.object.mode_set(mode="OBJECT")

def new_img(name, size, srgb=False):
    im = bpy.data.images.get(name)
    if im:
        bpy.data.images.remove(im)
    im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    im.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    return im

def target(o, im):
    for m in o.data.materials:
        nt = m.node_tree
        n = nt.nodes.get("BAKE") or nt.nodes.new("ShaderNodeTexImage")
        n.name = "BAKE"; n.image = im
        for x in nt.nodes:
            x.select = False
        n.select = True; nt.nodes.active = n

def wire(o, out):
    for m in o.data.materials:
        nt = m.node_tree
        ou = nt.nodes["OUT"]
        if out is None:
            nt.links.new(nt.nodes["PR"].outputs[0], ou.inputs[0])
        else:
            e = nt.nodes.get("EM") or nt.nodes.new("ShaderNodeEmission"); e.name = "EM"
            nt.links.new(nt.nodes[out].outputs[0], e.inputs[0]); nt.links.new(e.outputs[0], ou.inputs[0])

def mask_material():
    m = bpy.data.materials.get("_mask")
    if m:
        return m
    m = bpy.data.materials.new("_mask"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); g = G(nt)
    ou = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    bev = nt.nodes.new("ShaderNodeBevel"); bev.samples = 8; bev.inputs["Radius"].default_value = .0035
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    nt.links.new(bev.outputs[0], dot.inputs[0]); nt.links.new(geo.outputs["Normal"], dot.inputs[1])
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion"); ao.samples = 8; ao.inputs["Distance"].default_value = .05
    convex = nt.nodes.new("ShaderNodeAmbientOcclusion"); convex.samples = 6; convex.inputs["Distance"].default_value = .006
    edge = g.mathop("MULTIPLY", g.mathop("SUBTRACT", 1.0, dot.outputs["Value"], True), 9.0)
    edge = g.mul(g.mathop("MINIMUM", edge, 1.0), g.ramp(convex.outputs["AO"] if "AO" in convex.outputs else convex.outputs[1], .55, .9))
    c = nt.nodes.new("ShaderNodeCombineColor")
    nt.links.new(edge, c.inputs[0]); nt.links.new(ao.outputs[1], c.inputs[1]); c.inputs[2].default_value = 0
    nt.links.new(c.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], ou.inputs[0])
    return m

def save(im, name):
    im.filepath_raw = os.path.join(TEX, name + ".png"); im.file_format = "PNG"; im.save()

def bake_group(name, size):
    o = bpy.data.objects[name]
    t0 = time.time()
    while o.data.uv_layers:                  # lettering arrives with its own UVs
        o.data.uv_layers.remove(o.data.uv_layers[0])
    o.data.uv_layers.new(name="UVMap")
    unwrap(o)
    active(o)
    b = bpy.context.scene.render.bake; b.margin = 6; b.margin_type = "EXTEND"; b.use_clear = True; b.use_selected_to_active = False
    # Masks: edge in R, occlusion in G. Low sample count, these are soft.
    ms = new_img(name + "_mask_raw", 1024)
    mats = list(o.data.materials); mk = mask_material()
    target_nodes = mk.node_tree.nodes
    n = target_nodes.get("BAKE") or target_nodes.new("ShaderNodeTexImage"); n.name = "BAKE"; n.image = ms; target_nodes.active = n
    for i in range(len(o.data.materials)):
        o.data.materials[i] = mk
    cycles(8); touch()
    bpy.ops.object.bake(type="EMIT")
    print(name, "mask", int(time.time() - t0), flush=True)
    for i, m in enumerate(mats):
        o.data.materials[i] = m
    save(ms, name + "_occlusion")
    for m in mats:
        nd = m.node_tree.nodes.get("MASK")
        if nd:
            nd.image = ms
            nd.interpolation = "Linear"
    cycles(3); touch()
    alb = new_img(name + "_albedo", size, True)
    rou = new_img(name + "_rough", size)
    met = new_img(name + "_metal", size)
    nor = new_img(name + "_normal", size)
    for im, out in ((alb, "OUT_col"), (rou, "OUT_rough"), (met, "OUT_metal")):
        target(o, im); wire(o, out); touch()
        bpy.ops.object.bake(type="EMIT")
        print(name, im.name, int(time.time() - t0), flush=True)
    wire(o, None); target(o, nor); touch()
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", normal_r="POS_X", normal_g="POS_Y", normal_b="POS_Z")
    save(alb, name + "_albedo"); save(nor, name + "_normal")
    # MV/Lit wants metallic in R and smoothness in A.
    pack(met, rou, name + "_metalsmooth", size)
    # Occlusion map: G channel of the mask, spread out, at most 1024.
    print(name, "baked", int(time.time() - t0), flush=True)

def pack(met, rou, name, size):
    m = np.array(met.pixels[:], dtype=np.float32).reshape(size, size, 4)
    r = np.array(rou.pixels[:], dtype=np.float32).reshape(size, size, 4)
    px = np.zeros((size, size, 4), np.float32)
    px[..., 0] = px[..., 1] = px[..., 2] = m[..., 0]; px[..., 3] = 1 - r[..., 0]
    im = bpy.data.images.get(name)
    if im:
        bpy.data.images.remove(im)
    im = bpy.data.images.new(name, size, size, alpha=True); im.colorspace_settings.name = "Non-Color"; im.alpha_mode = "STRAIGHT"
    im.pixels.foreach_set(px.ravel()); im.update()
    save(im, name)

def tex(name, noncolor=True):
    p = os.path.join(TEX, name + ".png")
    im = bpy.data.images.load(p, check_existing=False)
    if noncolor:
        im.colorspace_settings.name = "Non-Color";
    return im

def final_material(name):
    """What Unity gets: the four baked maps on a plain PBR surface."""
    m = bpy.data.materials.get("M_" + name)
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new("M_" + name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    ou = nt.nodes.new("ShaderNodeOutputMaterial"); ou.name = "OUT"
    pr = nt.nodes.new("ShaderNodeBsdfPrincipled"); pr.name = "PR"
    a = nt.nodes.new("ShaderNodeTexImage"); a.image = tex(name + "_albedo", False)
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = tex(name + "_normal")
    s = nt.nodes.new("ShaderNodeTexImage"); s.image = tex(name + "_metalsmooth")
    s.image.alpha_mode = "CHANNEL_PACKED"
    nm = nt.nodes.new("ShaderNodeNormalMap")
    inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1
    nt.links.new(s.outputs["Alpha"], inv.inputs[1])
    nt.links.new(n.outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], pr.inputs["Normal"])
    sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(s.outputs[0], sep.inputs[0])
    for nmn, sock in (("OUT_col", a.outputs[0]), ("OUT_rough", inv.outputs[0]), ("OUT_metal", sep.outputs[0])):
        rr = nt.nodes.new("NodeReroute"); rr.name = nmn; nt.links.new(sock, rr.inputs[0])
        nt.links.new(rr.outputs[0], pr.inputs[{"OUT_col": "Base Color", "OUT_rough": "Roughness", "OUT_metal": "Metallic"}[nmn]])
    nt.links.new(pr.outputs[0], ou.inputs[0])
    return m

def use_final(name):
    o = bpy.data.objects[name]
    me = o.data
    me.materials.clear(); me.materials.append(final_material(name))
    for p in me.polygons:
        p.material_index = 0


# ---------------------------------------------------------------- the lens map, procedural so it can be exact
def lens_map(size=1024):
    """Coating and the look of depth in one radial image. R is 0 at the rim of the glass. Emission uses the same picture dimly."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    # The lens's UVs are planar, centred: u,v = 0.5 + xz / (2 * rim).
    dx = (x + .5) / size * 2 - 1; dy = (y + .5) / size * 2 - 1
    r = np.sqrt(dx * dx + dy * dy); th = np.arctan2(dy, dx)
    def band(c, w, amt, tint):
        return np.exp(-((r - c) / w) ** 2)[..., None] * np.array(tint, np.float32) * amt
    # Dark glass. The coating is one slow shift, violet at the rim through blue-green, never bands.
    t = np.clip((r - .34) / .66, 0, 1)[..., None]
    col = (1 - t) * np.array((.012, .03, .05), np.float32) + t * np.array((.05, .10, .12), np.float32)
    col += (t ** 5) * np.array((.24, .05, .30), np.float32)
    # Seven iris blades seen deep in the glass: each overlaps the next, lit a little along its edge. The pupil is black.
    n = 7
    w = (th + r * 1.1) % (2 * math.pi / n)
    hep = np.cos(math.pi / n) / np.cos(w - math.pi / n) * .30
    blade = np.clip((r - hep) / .02, 0, 1) * np.clip((.60 - r) / .16, 0, 1)
    sheen = (w / (2 * math.pi / n)) ** 2.4
    col += (blade * sheen)[..., None] * np.array((.10, .10, .13), np.float32)
    col *= (.04 + .96 * np.clip((r - hep) / .025, 0, 1))[..., None]
    col *= 1.0 - np.clip((r - .995) / .02, 0, 1)[..., None]
    a = np.ones((size, size, 1), np.float32)
    px = np.concatenate([np.clip(col, 0, 1), a], 2)
    im = bpy.data.images.new("lens_coating", size, size, alpha=False)
    im.colorspace_settings.name = "Non-Color"; im.pixels.foreach_set(px.ravel()); im.update()
    save(im, "lens_coating")

def lens_material():
    m = bpy.data.materials.get("lens_glass")
    if m: bpy.data.materials.remove(m)
    m = bpy.data.materials.new("lens_glass"); m.use_nodes = True
    nt = m.node_tree; pr = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = tex("lens_coating", True)
    nt.links.new(t.outputs[0], pr.inputs["Base Color"])
    em = nt.nodes.new("ShaderNodeMath"); em.operation = "MULTIPLY"
    pr.inputs["Metallic"].default_value = 1; pr.inputs["Roughness"].default_value = .05
    pr.inputs["Coat Weight"].default_value = 1; pr.inputs["Coat Roughness"].default_value = .03
    nt.links.new(t.outputs[0], pr.inputs["Emission Color"]); pr.inputs["Emission Strength"].default_value = .12
    return m

def lens_uv(o, rim=.0147):
    me = o.data
    uv = me.uv_layers.new(name="UVMap")
    for l in me.loops:
        v = me.vertices[l.vertex_index].co
        uv.data[l.index].uv = (.5 + v.x / (2 * rim), .5 + v.z / (2 * rim))


# ---------------------------------------------------------------- source textures
# The AI images carry soft blobs from the seamless crossfade. Only their fine detail is kept (high pass, levelled), and the wear layers
# that the model can't paint well (scratches, fingerprints, grime) are drawn here, so they read as real marks at a known scale.
def gray(name):
    im = bpy.data.images.load(os.path.join(SRC, name + ".png"))
    w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return (a[0::4] * .3 + a[1::4] * .59 + a[2::4] * .11).reshape(h, w)

def blur(a, sx, sy=None):
    sy = sx if sy is None else sy
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * ((sx * fx) ** 2 + (sy * fy) ** 2))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=a.shape).astype(np.float32)

def level(a, s):
    hp = a - blur(a, s)
    return hp / (np.sqrt(blur(hp * hp, s * 2)) + 1e-4)

def put(name, a):
    h, w = a.shape
    px = np.ones((h, w, 4), np.float32); px[..., 0] = px[..., 1] = px[..., 2] = np.clip(a, 0, 1)
    im = bpy.data.images.new("p_" + name, w, h, alpha=False); im.colorspace_settings.name = "Non-Color"
    im.pixels.foreach_set(px.ravel()); im.filepath_raw = os.path.join(SRC, "p_" + name + ".png"); im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)

def lines(a, rng, n, lmin, lmax, amt, ang=None, spread=.12, curve=.002):
    h, w = a.shape
    for _ in range(n):
        L = int(rng.uniform(lmin, lmax)); x, y = rng.uniform(0, w), rng.uniform(0, h)
        th = rng.uniform(0, math.pi * 2) if ang is None else ang + rng.normal(0, spread)
        t = np.arange(L, dtype=np.float32); c = rng.normal(0, curve)
        px = (x + t * np.cos(th + c * t)).astype(int) % w; py = (y + t * np.sin(th + c * t)).astype(int) % h
        f = amt * rng.uniform(.3, 1) * np.sin(np.pi * t / L) ** .4
        np.add.at(a, (py, px), f)

def stage_prep():
    rng = np.random.default_rng(7); S = 2048
    for n, s in (("plastic", 14), ("paint", 22), ("laminate", 70)):
        q = gray(n)[32:992, 32:992]                # one quadrant: free of the crossfade's seam cross, mirrored so it tiles
        q = np.concatenate([q, q[:, ::-1]], 1); q = np.concatenate([q, q[::-1]], 0)
        put(n, .5 + level(q, s) * .2)
    # Dust: the AI's specks and lint, then scattered fibres and grains.
    d = np.clip(level(gray("dust"), 7) * .22 - .35, 0, 1) * 1.5
    f = np.zeros((S, S), np.float32)
    lines(f, rng, 420, 12, 60, .75, curve=.04)
    grains = (rng.random((S, S)) > .9985).astype(np.float32); grains = blur(grains, .9) * 7
    put("dust", np.maximum(d, np.clip(blur(f, .5) * 1.5 + grains, 0, 1)))
    # Scratches: fine hairlines, wiping marks in families of one direction, a few deep scuffs.
    s_ = np.zeros((S, S), np.float32)
    lines(s_, rng, 900, 30, 240, .34)
    for _ in range(14):
        lines(s_, rng, 45, 60, 320, .3, ang=rng.uniform(0, 3.14), curve=.0006)
    deep = np.zeros((S, S), np.float32); lines(deep, rng, 26, 16, 90, 2.2); deep = blur(deep, 1.3) * 2.2
    put("scratches", np.clip(blur(s_, .45) * 1.8 + deep, 0, 1))
    # Fingerprints: ridged ovals, smeared where they were dragged, among soft wipes.
    y, x = np.mgrid[0:S, 0:S].astype(np.float32); pr = np.zeros((S, S), np.float32)
    warp = blur(rng.normal(0, 1, (S, S)).astype(np.float32), 12) * 42
    for _ in range(46):
        cx, cy = rng.uniform(0, S, 2); a, b = rng.uniform(44, 58), rng.uniform(62, 82); th = rng.uniform(0, 3.14)
        dx = ((x - cx + S / 2) % S) - S / 2; dy = ((y - cy + S / 2) % S) - S / 2
        u = dx * math.cos(th) + dy * math.sin(th); v = -dx * math.sin(th) + dy * math.cos(th)
        r = np.sqrt((u / a) ** 2 + (v / b) ** 2)
        m = np.clip((1.05 - r) * 5, 0, 1) * rng.uniform(.5, 1)
        k = rng.uniform(.8, 1.2)
        ridge = .5 + .5 * np.sin((np.sqrt(u ** 2 + (v * .8 + 20) ** 2) + warp) * 2.1 * k)
        pr = np.maximum(pr, m * (.25 + .75 * ridge))
    wipe = np.clip((blur(rng.normal(0, 1, (S, S)).astype(np.float32), 70, 20) * 90 - 1.0) * .5, 0, .3)
    put("prints", np.maximum(pr, wipe))
    # Grime: blotches and drips that run down the Z axis of a box projection.
    n = rng.normal(0, 1, (S, S)).astype(np.float32)
    blot = blur(n, 60) * 200 + blur(n, 18) * 26 + blur(n, 5) * 3
    drip = blur(n, 3, 110) * 26
    put("grime", np.clip(.36 + blot * .07 + drip * .09, 0, 1))
    print("prep done")


# ---------------------------------------------------------------- stages
def blend(asset):
    return os.path.join(SRC, asset + ".blend")

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def stage_model(asset):
    reset(); random.seed(11)
    for n in ("black",):
        M(n)
    bpy.data.materials.new("ledmat").use_nodes = True
    for n in ("clockmat", "watermat", "bulbmat", "picmat"):
        bpy.data.materials.new(n).use_nodes = True
    {"tv": build_tv, "stand": build_stand, "camera": build_camera, "remote": build_remote, "glass": build_glass, "lamp": build_lamp, "frame": build_frame}[asset]()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend(asset))
    stats(asset)

def stats(asset):
    for o in bpy.data.objects:
        if o.type == "MESH":
            dg = bpy.context.evaluated_depsgraph_get()
            o.data.calc_loop_triangles()
            print(f"  {o.name}: {len(o.data.loop_triangles)} tris, dims {tuple(round(d, 4) for d in o.dimensions)}", flush=True)

def stage_bake(asset):
    bpy.ops.wm.open_mainfile(filepath=blend(asset))
    lock()
    if asset == "camera":
        lens_map()
        o = bpy.data.objects["lens"]
        lens_uv(o); o.data.materials.clear(); o.data.materials.append(lens_material())
    for name, size in GROUPS[asset]:
        bake_group(name, size)
    for name, size in GROUPS[asset]:
        use_final(name)
    for o in bpy.data.objects:
        if o.name in ("tv_led", "led"):
            set_led(o, (1, .02, .01), 2.5)
        if o.name == "vcr_clock":
            set_led(o, (1, .05, .02), 3)
        if o.name == "water":
            o.data.materials.clear(); o.data.materials.append(plain("water_mat", (.05, .075, .085), .06))
        if o.name == "lamp_bulb":
            o.data.materials.clear(); o.data.materials.append(plain("lamp_bulb_mat", (.8, .75, .65), .3, 0, (1, .72, .4), 3))
        if o.name == "picture":
            m = plain("picture_mat", (.5, .5, .5), .32)
            n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = tex("frame_picture", False)
            m.node_tree.links.new(n.outputs[0], next(x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED").inputs["Base Color"])
            o.data.materials.clear(); o.data.materials.append(m)
    for im in list(bpy.data.images):
        if im.users == 0:
            bpy.data.images.remove(im)
    bpy.ops.wm.save_as_mainfile(filepath=blend(asset))
    unlock()

def set_led(o, col, strength):
    me = o.data; name = o.name + "_mat"
    me.materials.clear(); me.materials.append(plain(name, (.25, .01, .01), .2, 0, col, strength))

def stage_light():
    bpy.ops.wm.open_mainfile(filepath=blend("tv"))
    lock()
    lo = build_light()
    unwrap(lo)
    active(lo)
    size = 1024
    # High parts bake down: front and shell, screen hidden.
    hi = [bpy.data.objects["tv_front"], bpy.data.objects["tv_shell"], bpy.data.objects["tv_power"]]
    lo.data.materials.clear()
    m = bpy.data.materials.new("bakeL"); m.use_nodes = True
    nt = m.node_tree; lo.data.materials.append(m)
    for h in hi:
        h.select_set(True)
    active_o = lo; bpy.context.view_layer.objects.active = lo; lo.select_set(True)
    b = bpy.context.scene.render.bake; b.use_selected_to_active = True; b.use_cage = False; b.cage_extrusion = .012; b.max_ray_distance = .05; b.margin = 4; b.use_clear = True
    cycles(4)
    alb = new_img("tv_light_albedo", size, True); rou = new_img("tv_light_rough", size); met = new_img("tv_light_metal", size); nor = new_img("tv_light_normal", size)
    n = nt.nodes.new("ShaderNodeTexImage"); nt.nodes.active = n; n.select = True
    for im, out in ((alb, "OUT_col"), (rou, "OUT_rough"), (met, "OUT_metal")):
        n.image = im; touch()
        for h in hi: wire(h, out)
        bpy.ops.object.bake(type="EMIT")
    for h in hi: wire(h, None)
    n.image = nor
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", normal_r="POS_X", normal_g="POS_Y", normal_b="POS_Z")
    save(alb, "tv_light_albedo"); save(nor, "tv_light_normal"); pack(met, rou, "tv_light_metalsmooth", size)
    for o in list(bpy.data.objects):
        if o not in (lo,) and o.name not in ("screen",):
            bpy.data.objects.remove(o)
    old = bpy.data.objects["screen"]; bpy.data.objects.remove(old)
    s = screen_mesh(8, 6)
    lo.data.materials.clear(); lo.data.materials.append(final_material("tv_light"))
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend("light"))
    stats("light")
    unlock()

def stage_export(asset):
    bpy.ops.wm.open_mainfile(filepath=blend(asset))
    # Turn the model so the recipe (forward -Z, up Y) puts the front on Unity -Z.
    R = Matrix.Rotation(math.pi, 4, "Z")
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.transform(R); o.data.update()
            o.location = R @ o.location
    bpy.ops.object.select_all(action="SELECT")
    name = {"stand": "tv_stand", "light": "tv_light"}.get(asset, asset)
    bpy.ops.export_scene.fbx(filepath=os.path.join(PROPS, name + ".fbx"), use_selection=False, object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                             bake_space_transform=True, apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="OFF", use_tspace=True,
                             bake_anim=False, add_leaf_bones=False, path_mode="RELATIVE", embed_textures=False)
    print("exported", name)


# ---------------------------------------------------------------- check renders
def look_at(cam, pos, target, lens):
    cam.location = pos; d = Vector(target) - Vector(pos)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens

def tv_picture():
    m = bpy.data.materials.new("screen_on"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); g = G(nt)
    ou = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord").outputs["UV"]
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 340; n.inputs["Detail"].default_value = 2
    nt.links.new(tc, n.inputs["Vector"])
    w = g.ramp(n.outputs[0], .3, .7)
    c = g.mix(w, (.25, .36, .4), (.8, .95, 1.0))
    nt.links.new(c, em.inputs[0]); em.inputs[1].default_value = 1.2
    nt.links.new(em.outputs[0], ou.inputs[0])
    return m

def room(floor=True):
    mt = plain("room", (.05, .05, .055), .7)
    me = bpy.data.meshes.new("room")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    me.transform(Matrix.Translation((0, 0, .5))); me.transform(Matrix.Diagonal((6, 6, 3, 1))); me.materials.append(mt)
    o = bpy.data.objects.new("room", me); bpy.context.scene.collection.objects.link(o)
    return o

def world(strength=.0):
    w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1); w.node_tree.nodes["Background"].inputs[1].default_value = strength

def light(kind, loc, col, power, size=.2, spot=None, aim=None):
    d = bpy.data.lights.new("l", kind); d.color = col; d.energy = power * (10 if kind == "POINT" else 1)
    if kind == "AREA": d.size = size
    else: d.shadow_soft_size = size
    o = bpy.data.objects.new("l", d); bpy.context.scene.collection.objects.link(o); o.location = loc
    if aim:
        o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

def render_set(asset, shots, w=800, h=450, samples=24):
    s = bpy.context.scene
    cycles(samples)
    c = s.cycles; c.use_denoising = True; c.denoiser = "OPENIMAGEDENOISE"; c.denoising_use_gpu = False; c.max_bounces = 4; c.caustics_reflective = False; c.caustics_refractive = False
    s.render.resolution_x = w; s.render.resolution_y = h; s.render.image_settings.file_format = "PNG"
    s.view_settings.view_transform = "AgX"; s.view_settings.look = "AgX - Medium High Contrast"
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(cam); s.camera = cam
    cam.data.clip_start = .005
    lock()
    for shot in shots:
        print("shot", shot["n"], flush=True); touch()
        look_at(cam, shot["pos"], shot["at"], shot.get("lens", 40))
        cam.data.dof.use_dof = "fstop" in shot
        if "fstop" in shot:
            cam.data.dof.aperture_fstop = shot["fstop"]; cam.data.dof.focus_distance = (Vector(shot["pos"]) - Vector(shot["at"])).length
        lights = [light(*l[:4], **(l[4] if len(l) > 4 else {})) for l in shot.get("lights", [])]
        s.view_settings.exposure = shot.get("ev", 0)
        s.render.filepath = os.path.join(RENDERS, f"{asset}_{shot['n']}.png")
        bpy.ops.render.render(write_still=True)
        for l in lights:
            bpy.data.objects.remove(l)
    unlock()

def stage_render(asset, words):
    bpy.ops.wm.open_mainfile(filepath=blend(asset))
    world(0);
    S = bpy.context.scene
    hi = 0.62
    if asset in ("tv", "stand", "light"):
        tvo = None
    if asset == "tv" or asset == "light":
        scr = bpy.data.objects["screen"]; scr.data.materials.clear(); scr.data.materials.append(tv_picture())
    if asset == "tv":
        st = bpy.ops.wm.append  # the stand comes in beside it
        with bpy.data.libraries.load(blend("stand"), link=False) as (a, b):
            b.objects = [n for n in a.objects if n in ("tv_stand", "vcr_clock")]
        for o in b.objects:
            S.collection.objects.link(o); o.location.z -= 0.62
        for o in bpy.data.objects:
            if o.type == "MESH" and o.name not in ("tv_stand", "vcr_clock"):
                pass
        for o in b.objects:
            o.location.z += 0
        # Put the TV on the stand: all parts up.
        rm = room(); rm.location = (0, -1.0, -.62)
        for o in b.objects:
            o.parent = None
        fill = (.55, .62, 1)
        shots = [
            dict(n="dark34", pos=(-1.3, -2.0, .55), at=(0, 0, .28), lens=38, ev=-.5, lights=[("POINT", (0, -1.2, .4), (.5, .65, 1), .08, dict(size=.4))]),
            dict(n="front", pos=(0, -2.3, .4), at=(0, 0, .3), lens=45, ev=-1, lights=[("POINT", (.9, -1.8, .9), (1, .9, .8), 3, dict(size=.05))]),
            dict(n="side_hardlight", pos=(1.5, -1.4, .75), at=(0, -.05, .25), lens=42, ev=-.2, lights=[("SPOT", (-1.4, -1.2, .8), (.8, .85, 1), 40, dict(size=.02, aim=(0, 0, .3)))]),
            dict(n="chin", pos=(.15, -.75, .17), at=(.06, -.3, .12), lens=55, ev=0, lights=[("POINT", (-.5, -.8, .35), (.75, .85, 1), 1.2, dict(size=.03))]),
            dict(n="corner_cu", pos=(.72, -.62, .62), at=(.38, -.3, .55), lens=55, ev=0, lights=[("POINT", (.9, -.9, 1.0), (.75, .85, 1), 2.5, dict(size=.03))]),
            dict(n="back", pos=(.95, 1.25, .95), at=(0, .15, .3), lens=38, ev=0, lights=[("POINT", (1.3, 1.2, 1.2), (.85, .9, 1), 7, dict(size=.05))]),
        ]
    elif asset == "stand":
        rm = room(); rm.location = (0, -2.4, 0)
        shots = [
            dict(n="front", pos=(.2, -2.2, .7), at=(0, 0, .32), lens=42, ev=0, lights=[("POINT", (.8, -1.5, 1.4), (.85, .9, 1), 10, dict(size=.08))]),
            dict(n="cu", pos=(.42, -.72, .5), at=(.14, -.28, .4), lens=45, ev=0, lights=[("POINT", (.5, -.9, .9), (.85, .9, 1), 3, dict(size=.05)), ("POINT", (-.2, -.5, .3), (.5, .6, 1), .2, dict(size=.05))]),
        ]
    elif asset == "light":
        rm = room(); rm.location = (0, -2.4, 0)
        shots = [dict(n="front", pos=(-.9, -2.2, .7), at=(0, 0, .38), lens=45, ev=-.5, lights=[("POINT", (.8, -1.5, 1.2), (1, .9, .8), 8, dict(size=.05))])]
    elif asset in ("remote", "glass", "lamp", "frame"):
        rm = room(); rm.location = (0, 0, 0)
        if asset == "frame":
            rm.location = (0, -2.9, -1.4)
        hard = ("SPOT", (-1.1, -1.7, .8), (.72, .82, 1), 220, dict(size=.015, aim=(0, 0, -.3 if asset == "frame" else .1)))
        c = dict(remote=(.11, -.15, .24, 0, 0, .01, 50), glass=(.2, -.34, .2, 0, 0, .06, 50), lamp=(.65, -1.0, .55, 0, 0, .29, 45), frame=(.45, -.85, -.1, 0, 0, -.29, 45))[asset]
        d = dict(remote=(.03, -.08, .09, 0, -.072, .025, 80), glass=(.05, -.2, .16, 0, 0, .085, 70), lamp=(.2, -.5, .24, .02, 0, .22, 50), frame=(.1, -.32, -.08, .13, 0, -.1, 60))[asset]
        shots = [dict(n="hard", pos=c[:3], at=c[3:6], lens=c[6], lights=[hard]), dict(n="cu", pos=d[:3], at=d[3:6], lens=d[6], lights=[hard])]
    else:
        rm = room(); rm.location = (0, -2.0, -2.7 + 0)
        Z = CAM["axis"]
        tvlight = ("SPOT", (-1.4, -2.2, -2.2), (.55, .7, 1), 500, dict(size=.05, aim=(0, 0, Z)))
        far = ("POINT", (-1, -1.6, -1.8), (.55, .68, 1), 12, dict(size=.3))
        shots = [
            dict(n="dark_hero", pos=(-.42, -.82, Z - .28), at=(0, -.03, Z + .02), lens=62, ev=0, lights=[tvlight]),
            dict(n="lens_cu", pos=(-.018, -.27, Z - .03), at=(0, -.1, Z), lens=85, ev=0, lights=[("POINT", (-.35, -.5, Z - .18), (.65, .78, 1), .9, dict(size=.02))]),
            dict(n="lens_xcu", pos=(.002, -.195, Z + .012), at=(0, -.118, Z), lens=70, ev=0, lights=[("POINT", (-.2, -.34, Z - .08), (.65, .78, 1), .18, dict(size=.012))]),
            dict(n="led_cu", pos=(.05, -.2, Z - .05), at=(.0228, -.1, Z - .0228), lens=95, ev=0, fstop=3.2, lights=[("POINT", (-.2, -.3, Z - .2), (.65, .78, 1), .22, dict(size=.02))]),
            dict(n="side", pos=(.72, -.34, Z - .12), at=(0, 0, Z + .08), lens=55, ev=0, lights=[("POINT", (.9, -.9, -.3), (.9, .92, 1), 6, dict(size=.05))]),
            dict(n="rear", pos=(.5, .55, Z + .12), at=(0, 0, Z + .1), lens=60, ev=0, lights=[("POINT", (.9, .5, -.1), (.9, .92, 1), 5, dict(size=.05))]),
        ]
    if words:
        shots = [x for x in shots if x["n"] in words]
    if asset == "tv":
        bpy.ops.object.select_all(action="DESELECT")
    render_set(asset, shots)

def clay(asset):
    """Grey shape check, before any texture work."""
    bpy.ops.wm.open_mainfile(filepath=blend(asset))
    world(.0)
    grey = plain("grey", (.3, .3, .31), .45)
    for o in bpy.data.objects:
        if o.type == "MESH":
            for i in range(len(o.data.materials)):
                o.data.materials[i] = grey
            if not o.data.materials:
                o.data.materials.append(grey)
    k = ("SPOT", (-1.2, -2.2, 1.6), (1, 1, 1), 180, dict(size=.05, aim=(0, 0, .3)))
    f = ("POINT", (1.5, -1.5, .6), (.6, .7, 1), 10, dict(size=.5))
    if asset == "camera":
        Z = CAM["axis"]
        k = ("SPOT", (-1.0, -1.6, -.6), (1, 1, 1), 60, dict(size=.05, aim=(0, 0, Z)))
        shots = [dict(n="clay_34", pos=(-.42, -.7, Z - .2), at=(0, 0, Z + .08), lens=55, lights=[k, f]),
                 dict(n="clay_front", pos=(-.02, -.42, Z - .05), at=(0, -.1, Z), lens=60, lights=[("POINT", (-.3, -.6, Z - .1), (1, 1, 1), 3, dict(size=.05))]),
                 dict(n="clay_side", pos=(.75, -.2, Z + .1), at=(0, 0, Z + .08), lens=60, lights=[("POINT", (.7, -.7, Z + .3), (1, 1, 1), 6, dict(size=.05))]),
                 dict(n="clay_rear", pos=(.42, .62, Z + .05), at=(0, 0, Z + .08), lens=55, lights=[("POINT", (.8, .6, Z + .3), (1, 1, 1), 6, dict(size=.05))])]
    elif asset == "tv":
        shots = [dict(n="clay_34", pos=(-1.4, -2.2, 1.1), at=(0, 0, .35), lens=40, lights=[k, f]),
                 dict(n="clay_chin", pos=(.0, -1.0, .2), at=(0, -.3, .14), lens=45, lights=[("POINT", (.4, -.9, .5), (1, 1, 1), 4, dict(size=.05))]),
                 dict(n="clay_back", pos=(1.3, 1.7, 1.1), at=(0, .1, .35), lens=40, lights=[("POINT", (1.5, 1.2, 1.5), (1, 1, 1), 25, dict(size=.05))])]
    else:
        shots = [dict(n="clay_34", pos=(-1.1, -2.2, .9), at=(0, 0, .3), lens=40, lights=[k, f])]
    render_set(asset, shots, 640, 360, 12)


def check():
    """Reads each FBX with no axis conversion: raw FBX axes, Unity negates X. Reports what Unity will see."""
    for name in ("tv", "tv_light", "tv_stand", "camera", "remote", "glass", "lamp", "frame"):
        p = os.path.join(PROPS, name + ".fbx")
        if not os.path.exists(p):
            continue
        reset()
        bpy.ops.import_scene.fbx(filepath=p, use_manual_orientation=True, axis_forward="Y", axis_up="Z", global_scale=1.0, use_custom_normals=True)
        print("==", name, os.path.getsize(p) // 1024, "KB")
        lo = [9e9] * 3; hi = [-9e9] * 3; tris = 0
        for o in bpy.data.objects:
            if o.type != "MESH":
                continue
            bpy.context.view_layer.update()
            o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
            mw = o.matrix_world
            for v in o.data.vertices:
                c = mw @ v.co
                u = (-c.x, c.y, c.z)     # Unity axes
                for i in range(3):
                    lo[i] = min(lo[i], u[i]); hi[i] = max(hi[i], u[i])
            l = o.matrix_world.translation
            n = o.data.polygons[0].normal if len(o.data.polygons) else None
            print(f"  {o.name}: parent {o.parent.name if o.parent else None} pos({-l.x:.4f},{l.y:.4f},{l.z:.4f}) rot{tuple(round(math.degrees(a), 2) for a in o.rotation_euler)} scale{tuple(round(a, 4) for a in o.scale)} "
                  f"verts {len(o.data.vertices)} tris {len(o.data.loop_triangles)} first normal {tuple(round(a, 2) for a in (-n.x, n.y, n.z)) if n else None}")
            if o.name == "screen":
                vs = [o.matrix_world @ v.co for v in o.data.vertices]
                uv = o.data.uv_layers[0].data
                us = [d.uv.x for d in uv]; vv = [d.uv.y for d in uv]
                print(f"    screen uv u {min(us):.3f}-{max(us):.3f} v {min(vv):.3f}-{max(vv):.3f}; size x {max(v.x for v in vs) - min(v.x for v in vs):.4f} y {max(v.y for v in vs) - min(v.y for v in vs):.4f} z(depth) {max(v.z for v in vs) - min(v.z for v in vs):.4f}")
                # u must rise toward Unity +X
                a = o.data.loops[o.data.polygons[0].loop_start]
                best = max(range(len(uv)), key=lambda i: uv[i].uv.x)
                wi = o.matrix_world @ o.data.vertices[o.data.loops[best].vertex_index].co
                print(f"    u=1 vertex at Unity x {-wi.x:.3f}")
        print(f"  total tris {tris}; bounds Unity x {lo[0]:.4f}..{hi[0]:.4f} y {lo[1]:.4f}..{hi[1]:.4f} z {lo[2]:.4f}..{hi[2]:.4f}")


if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    step = a[0]
    if step == "prep":
        reset(); stage_prep()
    elif step == "linen":
        reset(); S = 2048; y, x = np.mgrid[0:S, 0:S].astype(np.float32); rng = np.random.default_rng(5)
        warp = blur(rng.normal(0, 1, (S, S)).astype(np.float32), 30) * 60
        put("linen", np.clip(.5 + .2 * np.sin((x + warp) * .29) * np.sign(np.sin((y + warp) * .29) + .01) + rng.normal(0, .07, (S, S)), 0, 1))
    elif step == "model":
        stage_model(a[1])
    elif step == "clay":
        clay(a[1])
    elif step == "bake":
        stage_bake(a[1])
    elif step == "light":
        stage_light()
    elif step == "render":
        stage_render(a[1], a[2:])
    elif step == "export":
        stage_export(a[1])
    elif step == "check":
        check()
