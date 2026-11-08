"""The acting shapes on top of a person's mouth and lid keys: narrowed eyes, a squint, brows down / up / one up, lips pressed and closed,
a smirk, a frown, a cheek raise and a sneer. Both rigs (him: blender_rig.py, her: blender_her.py) call add(); run alone it adds them to a
finished blend and exports its FBX with the same settings as the builds:

  blender -b -P face_shapes.py -- <in.blend> <head base map .png> <out.fbx | -> [--save <out.blend>] [--sheet <dir> <tag>]

Every shape is an offset on the head skin (part 0) from landmarks read off the mesh itself, so the same code fits both heads:
  - the eyes: the balls (part 6); the lids: the existing `blink` key (its upper half moves down, its lower half up);
  - the mouth corners and line: where the existing `smile` key moves most; the lower lip and jaw: the existing `jawOpen` key;
  - the brows: the dark of the head's own base map in a band above each eye.
Names are chosen so none ends with another key's name (the engine matches blend shapes by suffix, MVActing.Keys):
  eyesNarrow squint browDown browUp browRaiseL browRaiseR mouthClose mouthPress smirk frown cheekRaise sneer
L and R are the character's own left and right (+x and -x in Blender). mouthClose is ARKit's: it closes the lips over a dropped jaw, so
use it with jawOpen at about the same value (m b p while the jaw is moving); mouthPress presses shut lips thin (m b p, held, anger).
Every key is left at value 0, so a model imports with them all off."""
import bpy, sys, os, math
import numpy as np

EXTRA = ["eyesNarrow", "squint", "browDown", "browUp", "browRaiseL", "browRaiseR", "mouthClose", "mouthPress", "smirk", "frown", "cheekRaise", "sneer"]


def smoothstep(a0, b0, x):
    t = np.clip((np.asarray(x, float) - a0) / (b0 - a0), 0, 1)
    return t * t * (3 - 2 * t)


def kco(kb):
    a = np.zeros(len(kb.data) * 3); kb.data.foreach_get("co", a)
    return a.reshape(-1, 3)


def vertex_luma(ob, tex_path):
    """Each vertex's brightness in the head map (its loops' UVs averaged), NaN off the head material."""
    me = ob.data
    im = bpy.data.images.load(tex_path, check_existing=True)
    W, H = im.size; px = np.zeros(W * H * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(H, W, 4)
    luma = px[..., 0] * .3 + px[..., 1] * .59 + px[..., 2] * .11
    uvl = me.uv_layers.active.data
    uv = np.zeros(len(me.loops) * 2); uvl.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
    mat = np.zeros(len(me.polygons), int); me.polygons.foreach_get("material_index", mat)
    ls = np.zeros(len(me.polygons), int); me.polygons.foreach_get("loop_start", ls)
    lt = np.zeros(len(me.polygons), int); me.polygons.foreach_get("loop_total", lt)
    head_mat = max(range(len(me.materials)), key=lambda i: 1 if me.materials[i] and "head" in me.materials[i].name.lower() else 0)
    lmat = np.repeat(mat, lt)
    ok = lmat == head_mat
    s = np.zeros(len(me.vertices)); n = np.zeros(len(me.vertices))
    u = np.clip((uv[ok, 0] % 1) * (W - 1), 0, W - 1).astype(int); w = np.clip((uv[ok, 1] % 1) * (H - 1), 0, H - 1).astype(int)
    np.add.at(s, lv[ok], luma[w, u]); np.add.at(n, lv[ok], 1)
    out = np.full(len(me.vertices), np.nan); out[n > 0] = s[n > 0] / n[n > 0]
    return out


def landmarks(ob, tex_path):
    me = ob.data; kb = me.shape_keys.key_blocks
    v = kco(kb["Basis"]); part = np.zeros(len(v), int); me.attributes["part"].data.foreach_get("value", part)
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    skin = part == 0
    L = {"v": v, "part": part, "skin": skin}
    for k in ("blink", "smile", "jawOpen"): L["d_" + k] = kco(kb[k]) - v
    eyes = []
    for sgn in (1, -1):
        q = v[(part == 6) & (x * sgn > 0)]
        eyes.append(np.array((q[:, 0].mean(), q[:, 1].min(), (q[:, 2].max() + q[:, 2].min()) / 2)))
    L["eyes"] = eyes
    ecz = float(np.mean([e[2] for e in eyes]))
    # The mouth corners: where `smile` moves most on each side, below the eyes.
    ds = np.linalg.norm(L["d_smile"], axis=1) * skin * (z < ecz - .03)
    corners = []
    for sgn in (1, -1):
        m = ds * (x * sgn > .005)
        top = m > m.max() * .85
        corners.append(np.average(v[top], axis=0, weights=m[top]))
    L["corners"] = corners
    zm = float(np.mean([c[2] for c in corners])); mw = float(np.mean([abs(c[0]) for c in corners]))
    near_mouth = skin & (np.abs(x) < mw) & (np.abs(z - zm) < .012)
    L["zm"], L["mw"], L["ylip"] = zm, mw, float(y[near_mouth].min())
    # The brows: the dark of the head map in a band over each eye.
    lu = vertex_luma(ob, tex_path)
    brows = []
    for e in eyes:
        band = skin & (np.abs(x - e[0]) < .034) & (z > e[2] + .009) & (z < e[2] + .05) & (y < e[1] + .03) & ~np.isnan(lu)
        if band.sum() < 12:
            brows.append((float(e[0]), float(e[2] + .03), .028, "fallback")); continue
        t = np.nanpercentile(lu[band], 22)
        dark = band & (lu <= t) & (lu < np.nanmedian(lu[band]) * .85)
        if dark.sum() < 4:
            brows.append((float(e[0]), float(e[2] + .03), .028, "fallback")); continue
        bx = float(np.average(x[dark])); bz = float(np.average(z[dark]))
        half = float(max(.02, min(.032, (x[dark].max() - x[dark].min()) / 2)))
        brows.append((bx, bz, half, int(dark.sum())))
    L["brows"] = brows
    yf = float(np.mean([e[1] for e in eyes]))
    L["yface"] = yf
    return L


def shapes(L):
    v, skin = L["v"], L["skin"]; x, y, z = v[:, 0], v[:, 1], v[:, 2]
    zm, mw, ylip, yf = L["zm"], L["mw"], L["ylip"], L["yface"]
    db = L["d_blink"] * skin[:, None]
    up = db * (db[:, 2] < -1e-6)[:, None]; lo = db * (db[:, 2] > 1e-6)[:, None]
    side = lambda sgn: (x * sgn > -.002).astype(float)
    front_mouth = smoothstep(ylip + .035, ylip + .012, y) * skin
    front_eyes = smoothstep(yf + .04, yf + .015, y) * skin

    def brow(inner, outer, dx_in=0., dy=0., sides=(1, -1)):
        d = np.zeros_like(v)
        for sgn, (bx, bz, half, _) in zip((1, -1), L["brows"]):
            if sgn not in sides: continue
            bx = abs(bx) * sgn
            gx = np.exp(-((x - bx) / (half * 1.35)) ** 2)
            dzr = z - bz
            gz = np.where(dzr >= 0, np.exp(-(dzr / .03) ** 2), np.exp(-(dzr / .0105) ** 2))
            w = gx * gz * front_eyes * (x * sgn > -.004) * smoothstep(-.012, .0, (x * sgn))
            t = np.clip((np.abs(x) - (abs(bx) - half)) / (2 * half), 0, 1)       # 0 at the inner end, 1 at the outer
            d[:, 2] += w * (inner * (1 - t) + outer * t)
            d[:, 0] -= w * dx_in * (1 - t) * sgn
            d[:, 1] += w * dy * (1 - t * .5)
        return d

    def cheek(k, sides=(1, -1)):
        d = np.zeros_like(v)
        for sgn, e in zip((1, -1), L["eyes"]):
            if sgn not in sides: continue
            cx = e[0] + sgn * .006; cz = e[2] - .033
            w = np.exp(-(((x - cx) / .021) ** 2 + ((z - cz) / .017) ** 2)) * front_eyes
            d[:, 2] += w * .0045 * k; d[:, 1] -= w * .0018 * k
        return d

    def corner(dx, dz, dy, sides=(1, -1), sx=.019, sz=.017):
        d = np.zeros_like(v)
        for sgn, c in zip((1, -1), L["corners"]):
            if sgn not in sides: continue
            w = np.exp(-(((x - c[0]) / sx) ** 2 + ((z - c[2]) / sz) ** 2)) * front_mouth
            d[:, 0] += w * dx * sgn; d[:, 2] += w * dz; d[:, 1] += w * dy
        return d

    def gauss(cx, cz, sx, sz, dx=0., dz=0., dy=0., mirror=True):
        d = np.zeros_like(v)
        for sgn in ((1, -1) if mirror else (1,)):
            w = np.exp(-(((x - cx * sgn) / sx) ** 2 + ((z - cz) / sz) ** 2)) * front_mouth
            d[:, 0] += w * dx * sgn; d[:, 2] += w * dz; d[:, 1] += w * dy
        return d

    # The lips, seen as a band either side of the mouth line, as wide as the corners.
    in_mouth = smoothstep(mw + .006, mw - .002, np.abs(x)) * front_mouth
    r = z - zm; a = .0045
    toward_line = (np.abs(r) / a) * np.exp(1 - (r / a) ** 2)                  # 0 on the line, 1 at 4.5 mm, gone by 1 cm
    press = np.zeros_like(v)
    press[:, 2] = -np.sign(r) * .0027 * toward_line * in_mouth
    press[:, 1] += .0020 * np.exp(-(r / .004) ** 2) * in_mouth               # the lips roll in a little
    # mouthClose: undo what jawOpen does to the lips and the skin just under them, so the jaw can stay down behind closed lips.
    wl = smoothstep(zm - .034, zm - .012, z) * smoothstep(mw + .032, mw + .008, np.abs(x)) * skin * smoothstep(ylip + .035, ylip + .012, y)
    close = -L["d_jawOpen"] * wl[:, None]

    k = {
        "eyesNarrow": up * .42 + lo * .40 + brow(-.0012, -.0006),
        "squint": up * .22 + lo * .80 + cheek(.6),
        "browDown": brow(-.0095, -.0035, dx_in=.0045, dy=-.0024) + up * .12,
        "browUp": brow(.0115, .0095, dy=-.0006),
        "browRaiseL": brow(.0085, .0130, sides=(1,)),
        "browRaiseR": brow(.0085, .0130, sides=(-1,)),
        "mouthClose": close,
        "mouthPress": press + corner(-.0016, -.0004, .0006) + gauss(0, zm - .028, .016, .011, dz=.0012, dy=-.0008, mirror=False),
        "smirk": corner(.0055, .0080, .0045, sides=(1,)) + cheek(.45, sides=(1,)) + lo * .2 * side(1)[:, None],
        "frown": corner(.0020, -.0082, -.0008, sx=.019, sz=.017) + gauss(0, zm - .030, .016, .011, dz=.0014, dy=-.0010, mirror=False),
        "cheekRaise": cheek(1.5) + lo * .45,
        "sneer": gauss(.017, zm + .024, .011, .013, dz=.0070, dy=-.0020) + gauss(.012, zm + .006, .010, .007, dz=.0038, dy=-.0012) + up * .1,
    }
    return k


def add(ob, tex_path, log=print):
    """Adds (or replaces) the extra shapes on ob, and leaves every key at 0."""
    me = ob.data
    for n in EXTRA:
        if me.shape_keys and n in me.shape_keys.key_blocks: ob.shape_key_remove(me.shape_keys.key_blocks[n])
    L = landmarks(ob, tex_path)
    log("FACE eyes", [e.round(4).tolist() for e in L["eyes"]], "corners", [c.round(4).tolist() for c in L["corners"]],
        "mouth z", round(L["zm"], 4), "half width", round(L["mw"], 4), "brows", [(round(b[0], 4), round(b[1], 4), round(b[2], 4), b[3]) for b in L["brows"]])
    v = L["v"]
    for n, d in shapes(L).items():
        sk = ob.shape_key_add(name=n, from_mix=False)
        sk.slider_min = 0; sk.slider_max = 1
        sk.data.foreach_set("co", (v + d).astype(np.float32).flatten())
        log("KEY", n, "max move", round(float(np.linalg.norm(d, axis=1).max()), 4))
    for kb in me.shape_keys.key_blocks[1:]: kb.value = 0
    ob.active_shape_key_index = 0; ob.show_only_shape_key = False
    me.update()


def export(path):
    arm = bpy.data.objects["Armature"]; ob = bpy.data.objects["Person"]
    bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, use_mesh_modifiers=False, add_leaf_bones=False, bake_anim=False, axis_forward="-Z", axis_up="Y", path_mode="RELATIVE", apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE")


def sheet(out_dir, tag, tex_path, keys=None, res=420):
    """Each key at 1 on the face, under a hard key from above left and a soft fill, at a medium close-up's lens, plus the neutral."""
    import bpy
    from mathutils import Vector
    os.makedirs(out_dir, exist_ok=True)
    ob = bpy.data.objects["Person"]; me = ob.data; s = bpy.context.scene
    for mat in me.materials:
        mat.use_nodes = True; nt = mat.node_tree
        if not any(n.type == "TEX_IMAGE" for n in nt.nodes):
            pass
    s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = s.render.resolution_y = res
    s.view_settings.view_transform = "Standard"; s.view_settings.look = "None"
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.25, .25, .27, 1)
    for o in [o for o in s.objects if o.type in ("LIGHT", "CAMERA")]: bpy.data.objects.remove(o)
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA")); s.collection.objects.link(key); key.data.energy = 60; key.data.size = .5
    key.location = (.6, -1.2, 2.2); key.rotation_euler = (Vector((0, 0, 1.62)) - key.location).to_track_quat("-Z", "Y").to_euler()
    fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA")); s.collection.objects.link(fill); fill.data.energy = 18; fill.data.size = 1.2
    fill.location = (-1.0, -1.0, 1.6); fill.rotation_euler = (Vector((0, 0, 1.62)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("cc", bpy.data.cameras.new("cc")); s.collection.objects.link(cam); s.camera = cam; cam.data.lens = 85; cam.data.clip_start = .02
    head = bpy.data.objects["Armature"].data.bones["Head"].head_local
    tgt = Vector((0, 0, head.z + .075))
    cam.location = tgt + Vector((.12, -.62, .01)); cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
    kb = me.shape_keys.key_blocks
    names = ["neutral"] + (keys or [k.name for k in kb[1:]] + ["jawOpen+mouthClose", "jawOpen=0.5+mouthClose=0.5", "browDown+eyesNarrow+mouthPress", "browUp+eyesWide", "smirk+browRaiseL", "frown+browDown"])
    for n in names:
        for k_ in kb[1:]: k_.value = 0
        if n != "neutral":
            for part_ in n.split("+"):
                nm_, _, val = part_.partition("=")
                kb[nm_].value = float(val) if val else 1
        s.render.filepath = os.path.join(out_dir, f"{tag}_{n}.png"); bpy.ops.render.render(write_still=True)
    for k_ in kb[1:]: k_.value = 0


if __name__ == "__main__" and "--" in sys.argv:
    a = sys.argv[sys.argv.index("--") + 1:]
    BLEND, TEX, OUTFBX = a[0], a[1], a[2]
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    ob = bpy.data.objects["Person"]
    add(ob, TEX)
    if "--save" in a: bpy.ops.wm.save_as_mainfile(filepath=a[a.index("--save") + 1])
    if OUTFBX != "-": export(OUTFBX); print("DONE", OUTFBX)
    if "--sheet" in a:
        i = a.index("--sheet"); sheet(a[i + 1], a[i + 2], TEX)
        print("SHEET", a[i + 1])
