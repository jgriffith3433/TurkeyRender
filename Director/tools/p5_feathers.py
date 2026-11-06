# Parts 5-6 set: feather mountain, summit cap, crown, rain, flow and a single feather. Run with Blender:
#   blender -b -P Director/tools/p5_feathers.py
# Writes Assets/P5/*.fbx and Feathers.png. Unity axes in the arrays; converted at the end.
import bpy, numpy as np, os, math
OUT = r"C:\Projects\TKShock\Assets\P5"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
H, R, R0 = 22.0, 85.0, 11.0

def profile(r): return H * np.clip(1 - r / R, 0, 1) ** 1.5
def dunes(x, z):
    return .9 * np.sin(x * .13 + 1.3 * np.sin(z * .07)) * np.cos(z * .11 + .9 * np.sin(x * .05)) + .3 * np.sin(x * .41 + z * .33)
def height(x, z):
    r = np.hypot(x, z)
    edge = np.clip((r - 2) / 14, 0, 1) * np.clip((R - r) / 12, 0, 1)
    dent = -.55 * np.exp(-(r / 1.7) ** 2) + .12 * np.exp(-((r - 2.2) / .7) ** 2)
    return profile(r) + dunes(x, z) * edge + dent

def surface_normal(x, z, e=.15):
    dx = height(x + e, z) - height(x - e, z); dz = height(x, z + e) - height(x, z - e)
    n = np.stack([-dx, np.full_like(dx, 2 * e), -dz], 1)
    return n / np.linalg.norm(n, axis=1, keepdims=True)

def norm(a): return a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)

def cards(P, D, N, L, W, tile):
    """Curved two-segment strip: 6 verts, 4 quads worth 2 quads. P base, D along the quill, N up."""
    n = len(P); S = norm(np.cross(D, N)); D2 = norm(np.cross(N, S))
    if (np.sum(D2 * D, 1) < 0).any(): D2 = np.where((np.sum(D2 * D, 1) < 0)[:, None], -D2, D2)
    L = L[:, None]; W = W[:, None]
    mid = P + D2 * L * .5 + N * L * .08
    end = P + D2 * L + N * L * .02
    v = np.stack([P - S * W, P + S * W, mid - S * W, mid + S * W, end - S * W, end + S * W], 1).reshape(-1, 3)
    u0 = (tile % 2) * .5; v0 = (tile // 2) * .5
    uvs = np.stack([np.zeros(n), np.zeros(n), np.ones(n) * 0, np.ones(n), np.ones(n) * 0, np.ones(n)], 1)
    uvs = np.stack([np.tile([0, 1, 0, 1, 0, 1], (n, 1)), np.tile([0, 0, .5, .5, 1, 1], (n, 1))], 2).astype(np.float32)
    uv = np.stack([u0[:, None] + uvs[:, :, 0] * .5, v0[:, None] + uvs[:, :, 1] * .5], 2).reshape(-1, 2)
    base = (np.arange(n) * 6)[:, None]
    q = np.array([[0, 1, 3, 2], [2, 3, 5, 4]])
    f = (base[:, None, :] + q[None, :, :]).reshape(-1, 4)
    return v, uv, f

def merge(parts):
    vs, us, fs, o = [], [], [], 0
    for v, uv, f in parts:
        vs.append(v); us.append(uv); fs.append(f + o); o += len(v)
    return np.concatenate(vs), np.concatenate(us), np.concatenate(fs)

def ring_grid(r0, r1, nr, na):
    rs = r0 + (r1 - r0) * (np.linspace(0, 1, nr) ** 1.3); a = np.linspace(0, 2 * np.pi, na, endpoint=False)
    rr, aa = np.meshgrid(rs, a, indexing='ij'); x = rr * np.cos(aa); z = rr * np.sin(aa); y = height(x, z)
    v = np.stack([x, y - .04, z], -1).reshape(-1, 3)
    i, j = np.meshgrid(np.arange(nr - 1), np.arange(na), indexing='ij'); i = i.ravel(); j = j.ravel(); jn = (j + 1) % na
    f = np.stack([i * na + j, i * na + jn, (i + 1) * na + jn, (i + 1) * na + j], 1)
    uv = np.tile([[.25, .3]], (len(v), 1)).astype(np.float32)
    return v, uv, f

def on_surface(n, r0, r1, sz0, sz1, tilt=.35):
    u = rng.random(n); r = np.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * u); r = r0 + (r1 - r0) * rng.random(n) ** 1.6
    a = rng.random(n) * 2 * np.pi; x = r * np.cos(a); z = r * np.sin(a); y = height(x, z)
    N = surface_normal(x, z)
    down = np.stack([np.cos(a), np.zeros(n), np.sin(a)], 1) + rng.normal(0, .8, (n, 3)) * [1, 0, 1]
    D = norm(down - N * np.sum(down * N, 1, keepdims=True))
    Nj = norm(N + rng.normal(0, tilt, (n, 3)))
    s = sz0 + (sz1 - sz0) * ((r - r0) / max(r1 - r0, 1e-3)) ; s = s * rng.uniform(.7, 1.3, n)
    P = np.stack([x, y + rng.uniform(0, .02, n) + s * .1, z], 1) - D * s[:, None] * .3
    tile = rng.choice(4, n, p=[.55, .33, .11, .01])
    return cards(P, D, Nj, s, s * .34, tile)

def write(name, data, mat="Feather"):
    v, uv, f = data
    me = bpy.data.meshes.new(name)
    vb = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)
    me.vertices.add(len(vb)); me.vertices.foreach_set("co", vb.astype(np.float32).ravel())
    me.loops.add(f.size); me.loops.foreach_set("vertex_index", f.astype(np.int32).ravel())
    me.polygons.add(len(f)); me.polygons.foreach_set("loop_start", (np.arange(len(f)) * 4).astype(np.int32))
    me.update(calc_edges=True)
    l = me.uv_layers.new(name="UVMap"); uvl = uv[f.ravel()]
    l.uv.foreach_set("vector", uvl.astype(np.float32).ravel())
    me.polygons.foreach_set("use_smooth", np.ones(len(f), bool))
    me.materials.append(bpy.data.materials.get(mat) or bpy.data.materials.new(mat))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, name + ".fbx"), use_selection=True, axis_forward='-Z', axis_up='Y', apply_scale_options='FBX_SCALE_ALL', mesh_smooth_type='OFF', add_leaf_bones=False, bake_anim=False, path_mode='STRIP')
    bpy.data.objects.remove(ob); print(name, len(v), len(f))

# The feather texture: 2 x 2 tiles.
S = 512
T = np.zeros((S * 2, S * 2, 4), np.float32)
tints = [(1, .985, .95), (.95, .9, .78), (.74, .74, .76), (.52, .34, .2)]
for t, c in enumerate(tints):
    y, x = np.mgrid[0:S, 0:S].astype(np.float32); u = x / S * 2 - 1; v = y / S
    w = .9 * np.sin(np.pi * np.clip(v, 0, 1) ** .75) ** .5
    barbs = .5 + .5 * np.sin((v * 120 + np.abs(u) * 40) + 3 * np.sin(v * 9))
    notch = np.sin(v * 37 + (u > 0) * 2.1) * .06 + np.sin(v * 71) * .03
    a = (np.abs(u) < w * (1 + notch)).astype(np.float32)
    rib = np.exp(-(u / .035) ** 2)
    shade = .8 + .2 * barbs - .1 * np.abs(u)
    col = np.stack([c[i] * shade for i in range(3)], -1)
    if t == 3:
        bars = .75 + .25 * np.sign(np.sin(v * 26))
        col *= bars[..., None]
    col = col * (1 - .5 * rib[..., None]) + .5 * rib[..., None] * .9
    a[(np.abs(u) < .03) & (v < .2)] = 1
    tile = np.dstack([col, a])
    ty, tx = (t // 2) * S, (t % 2) * S
    T[ty:ty + S, tx:tx + S] = tile
im = bpy.data.images.new("Feathers", S * 2, S * 2, alpha=True); im.pixels.foreach_set(T.ravel()); im.filepath_raw = os.path.join(OUT, "Feathers.png"); im.file_format = 'PNG'; im.save()

bpy.ops.wm.read_factory_settings(use_empty=True) if False else None
for o in list(bpy.data.objects): bpy.data.objects.remove(o)

write("P5Cap", merge([ring_grid(0.01, R0 + .6, 40, 96), on_surface(26000, 0, 4.5, .2, .3), on_surface(22000, 4.5, R0 + .6, .3, .5)]))
write("P5Mountain", merge([ring_grid(R0, R, 60, 160), on_surface(30000, R0, 30, .5, 1.1), on_surface(30000, 30, R, 1.1, 4)]))

def airborne(n, pos, s0, s1):
    D = norm(rng.normal(0, 1, (n, 3))); N = norm(rng.normal(0, 1, (n, 3)))
    s = rng.uniform(s0, s1, n); return cards(pos - D * s[:, None] * .5, D, N, s, s * .34, rng.choice(4, n, p=[.6, .34, .06, 0]))

# Crowns: a unit corona, y 0-1, radius about 1. Scale it up in the score.
for name, n, wide, jets, seed in (("P5Crown1", 9000, 1.0, 14, 1), ("P5Crown2", 9000, 1.45, 11, 2), ("P5Crown3", 5000, .7, 9, 3)):
    th = rng.random(n) * 2 * np.pi; ph = rng.random() * 6
    jet = .6 + .4 * np.cos(jets * th + ph) + .25 * np.cos(jets * 2.3 * th + ph * 2)
    u = rng.random(n) ** .8
    r = wide * (1 + .55 * u ** 2.2) + rng.normal(0, .05 + .1 * u, n)
    y = u * np.clip(jet, .15, 1.3) + rng.normal(0, .03, n)
    write(name, airborne(n, np.stack([r * np.cos(th), np.clip(y, 0, None), r * np.sin(th)], 1), .022, .05))

# Rain: a tall cylinder of loose feathers, 1 m units in xz radius and height.
n = 7000; th = rng.random(n) * 2 * np.pi; r = np.sqrt(rng.random(n)); y = rng.random(n)
write("P5Rain", airborne(n, np.stack([r * np.cos(th), y, r * np.sin(th)], 1), .018, .04))

# Flow: feathers flying over the funnel, cone about the axis; rim radius 1, depth 1 (spin it).
n = 9000; th = rng.random(n) * 2 * np.pi; t = rng.random(n) ** .7
r = .12 + .88 * t; y = -(1 - t) + rng.uniform(0, .18, n)
write("P5Flow", airborne(n, np.stack([r * np.cos(th), y, r * np.sin(th)], 1), .006, .02))

# One feather, 1 long, base at origin, quill along +Y, for attaching to him.
P = np.zeros((1, 3)); write("P5Feather", cards(P, np.array([[0, 1., 0]]), np.array([[0, 0, -1.]]), np.ones(1), np.array([.3]), np.array([3])))
