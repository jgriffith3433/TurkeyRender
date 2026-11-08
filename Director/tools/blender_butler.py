"""Turkey butlers: the TK Shock turkey with a bow tie and collar, plus takes for standing in rows.
   blender -b --factory-startup -P Director/tools/blender_butler.py
Reads Director/gen/turkey/_work/turkey.blend (blender_turkey.py), writes Assets/MusicVideo/Turkey/turkey_butler_{crowd,hero}.fbx.
Two material slots: slot 0 the bird (the white atlas), slot 1 the tie (higher on the body, so `material2` lands on it). New takes, 30 fps:
  butler_idle   60 f  chest up, a slow breath
  butler_bow    30 f  a small lift, a deep bow from the hips, a hold, up with a little overshoot
  butler_hop    30 f  crouch, spring, wings out at the top, land, settle. Feet held on the floor by measuring the leg
  butler_tray   60 f  butler_idle with the right wing held out, palm up, for a tray
Blender's front is -Y on this rig. Pitch toward the front is +X in armature space."""
import bpy, bmesh, math, os
from mathutils import Vector, Quaternion, Matrix

ROOT = "C:/Projects/TKShock"
BLEND = ROOT + "/Director/gen/turkey/_work/turkey.blend"
OUT = ROOT + "/Assets/MusicVideo/Turkey"
X = Vector((1, 0, 0)); Y = Vector((0, 1, 0)); Z = Vector((0, 0, 1))
bpy.ops.wm.open_mainfile(filepath=BLEND)
arm = bpy.data.objects["Armature"]
ad = arm.animation_data or arm.animation_data_create()
bones = arm.pose.bones

# The stand every take starts from: frame 1 of idle.
ad.action = bpy.data.actions["18TurkeyM_idle"]
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
for p in bones:
    q = p.matrix_basis.to_quaternion()
    p.rotation_mode = "QUATERNION"
    p.rotation_quaternion = q
BASE = {p.name: (p.matrix_basis.to_translation(), p.matrix_basis.to_quaternion()) for p in bones}
ad.action = None


def apply_pose(pose):
    """pose: {bone: [(axis, degrees), ...]} rotations in armature space."""
    for p in bones:
        l, q = BASE[p.name]
        p.location = l.copy(); r = q.copy()
        rest = p.bone.matrix_local.to_3x3().inverted()
        for ax, deg in pose.get(p.name, []):
            r = r @ Quaternion((rest @ ax).normalized(), math.radians(deg))
        p.rotation_quaternion = r
    bpy.context.view_layer.update()


def leg(a):
    """Bends both legs by a: thigh forward, knee back, ankle forward. The foot stays flat."""
    d = {}
    for s in "LR":
        d["hip_" + s] = [(X, -a)]; d["shin_" + s] = [(X, a * 2.0)]; d["tarsus_" + s] = [(X, -a * 1.1)]
    return d


def merge(*ps):
    o = {}
    for p in ps:
        for k, v in p.items(): o.setdefault(k, []).extend(v)
    return o


def foot():
    return arm.matrix_world @ bones["tarsus_L"].tail


apply_pose({}); REST_FOOT = foot().copy()


def key_take(name, frames):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ad.action = act
    for f, pose, lift in frames:
        apply_pose(pose)
        if lift is not None:   # put the feet back on the floor, then lift: Root is the only bone above the legs
            now = foot(); dv = Vector((0, REST_FOOT.y - now.y, REST_FOOT.z - now.z + lift))
            r = bones["Root"]; r.location = r.location + r.bone.matrix_local.to_3x3().inverted() @ dv
            bpy.context.view_layer.update()
        for p in bones:
            p.keyframe_insert("location", frame=f); p.keyframe_insert("rotation_quaternion", frame=f)
    return act


def proud(k=1.0):
    return {"body": [(X, -7 * k)], "neck1": [(X, 3 * k)], "neck2": [(X, 2 * k)], "head": [(X, 2 * k)],
            "hip_L": [(X, 7 * k)], "hip_R": [(X, 7 * k)],
            "arm_L": [(Y, -12 * k)], "arm_R": [(Y, 12 * k)], "tail": [(X, 6 * k)]}


def bow(k):
    return {"body": [(X, 40 * k)], "hip_L": [(X, -40 * k)], "hip_R": [(X, -40 * k)], "neck1": [(X, 14 * k)], "neck2": [(X, 12 * k)], "neck3": [(X, 8 * k)],
            "neck4": [(X, 2 * k)], "head": [(X, -8 * k)], "tail": [(X, -26 * k)]}


def tray(k=1.0):
    return {"arm_R": [(Z, 34 * k), (X, -30 * k)], "forearm_R": [(Z, -30 * k)], "hand_R": [(X, -20 * k)]}


wings = lambda a: {"arm_L": [(Y, a)], "arm_R": [(Y, -a)]}

key_take("butler_idle", [(1, proud(), 0), (30, merge(proud(), {"body": [(X, -2)], "neck2": [(X, 1)]}), 0), (60, proud(), 0)])
key_take("butler_bow", [
    (1, proud(), 0),
    (5, proud(1.5), 0),
    (13, merge(proud(0.4), bow(1.08)), 0),
    (15, merge(proud(0.4), bow(1.0)), 0),
    (20, merge(proud(0.4), bow(0.98)), 0),
    (27, proud(1.25), 0),
    (30, proud(), 0)])
key_take("butler_hop", [
    (1, proud(), 0),
    (6, merge(proud(0.5), leg(30)), 0),
    (10, merge(proud(1.3), leg(2)), 0.10),
    (15, merge(proud(1.3), leg(20), wings(30)), 0.30),
    (20, merge(proud(1.0), leg(6), wings(10)), 0.10),
    (23, merge(proud(0.5), leg(30)), 0),
    (27, merge(proud(1.1), leg(4)), 0),
    (30, proud(), 0)])
key_take("butler_tray", [(1, merge(proud(), tray()), 0), (30, merge(proud(), tray(1.02), {"body": [(X, -2)]}), 0), (60, merge(proud(), tray()), 0)])
ad.action = None
for p in bones: p.matrix_basis.identity()
bpy.context.view_layer.update()


def add_bow(me_ob):
    """A collar and bow tie round the neck itself, placed from the bone and the verts that really follow it, not from a guess at a height.
    At the base of the neck a turkey is thin, so the ring is the true neck's width and the bow sits on the front of it, knot forward."""
    me = me_ob.data
    inv = me_ob.matrix_world.inverted() @ arm.matrix_world
    bone = arm.data.bones["neck2"]
    P = inv @ bone.head_local; Q = inv @ bone.tail_local
    d = (Q - P).normalized()
    Y = Vector((0, -1, 0))                # the rig's front
    F = (Y - d * Y.dot(d)).normalized()   # front, square to the neck
    S = d.cross(F).normalized()
    if S.dot(Vector((1, 0, 0))) < 0: S = -S
    g = me_ob.vertex_groups["neck2"].index
    rs = []
    for v in me.vertices:
        w = sum(e.weight for e in v.groups if e.group == g)
        if w > .5:
            r = v.co - P; along = r.dot(d); rad = (r - d * along).length
            if abs(along) < .05: rs.append(rad)
    rs.sort(); rad = rs[int(len(rs) * .5)] * 1.02 if rs else .03
    print("NECK", lod, "centre", tuple(round(c, 3) for c in P), "radius", round(rad, 4), "verts", len(rs))
    bm = bmesh.new(); bm.from_mesh(me); start = len(bm.verts)
    # the collar, a narrow band tipped down at the front
    n = 14; rows = []
    for t in (-.011, .011):
        r = []
        for i in range(n):
            q = i / n * 2 * math.pi
            c, sn = math.cos(q), math.sin(q)
            r.append(bm.verts.new(P + F * (c * rad) + S * (sn * rad) + d * (t - .006 * c)))
        rows.append(r)
    for i in range(n):
        bm.faces.new((rows[0][i], rows[0][(i + 1) % n], rows[1][(i + 1) % n], rows[1][i]))
    # the bow: two soft triangular loops pinched at a knot
    C = P + F * (rad + .006) - d * .006
    W = max(.034, rad * 1.5); Hh = W * .52
    def wing(sg):
        ring = []
        for x, h, b in ((.1, .22, 0), (.45, .62, .012), (.85, 1, .006), (1, .86, 0)):
            r = []
            for dy, dz in ((1, 1), (0, 1.25), (-1, 1), (-1, -1), (0, -1.25), (1, -1)):
                r.append(bm.verts.new(C + S * (sg * x * W) + d * (dz * h * Hh * .8) + F * (dy * (.006 + b))))
            ring.append(r)
        for a, b_ in zip(ring, ring[1:]):
            for i in range(6): bm.faces.new((a[i], a[(i + 1) % 6], b_[(i + 1) % 6], b_[i]))
        bm.faces.new(ring[-1]); bm.faces.new(ring[0][::-1])
    wing(1); wing(-1)
    M = Matrix.Translation(C + F * .004)
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.009, matrix=M)
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    new = set(bm.verts[start:])
    for f in bm.faces:
        if all(v in new for v in f.verts): f.material_index = 1; f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=[f for f in bm.faces if f.material_index == 1])
    bm.to_mesh(me); bm.free()
    vg2 = me_ob.vertex_groups.get("neck2") or me_ob.vertex_groups.new(name="neck2")
    idx = [v.index for v in me.vertices if v.index >= start]
    for gg in list(me_ob.vertex_groups): gg.remove(idx)
    vg2.add(idx, 1.0, "REPLACE")
    return len(idx)


for lod in ("hero", "crowd"):
    bpy.ops.object.select_all(action="DESELECT")
    a = bpy.data.objects["shell_" + lod].copy(); a.data = a.data.copy(); bpy.context.scene.collection.objects.link(a)
    b = bpy.data.objects["parts_" + lod].copy(); b.data = b.data.copy(); bpy.context.scene.collection.objects.link(b)
    a.select_set(True); b.select_set(True); bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    me = bpy.context.view_layer.objects.active
    me.name = "turkey_butler_" + lod; me.data.name = me.name
    me.data.materials.clear()
    me.data.materials.append(bpy.data.materials.new("turkey_butler")); me.data.materials.append(bpy.data.materials.new("butler_tie"))
    n = add_bow(me)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.select_all(action="DESELECT"); me.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = "%s/turkey_butler_%s.fbx" % (OUT, lod)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={"ARMATURE", "MESH"}, apply_unit_scale=True,
                             apply_scale_options="FBX_SCALE_UNITS", global_scale=1.0, axis_forward="-Z", axis_up="Y",
                             bake_space_transform=False, use_mesh_modifiers=True, mesh_smooth_type="FACE", use_tspace=True,
                             add_leaf_bones=False, primary_bone_axis="Y", secondary_bone_axis="X", armature_nodetype="NULL",
                             use_armature_deform_only=False, bake_anim=True, bake_anim_use_all_bones=True,
                             bake_anim_use_nla_strips=False, bake_anim_use_all_actions=True, bake_anim_force_startend_keying=True,
                             bake_anim_step=1.0, bake_anim_simplify_factor=0.0, path_mode="STRIP", embed_textures=False)
    print("EXPORTED", path, "added verts", n, "kb", os.path.getsize(path) // 1024)
    bpy.data.objects.remove(me)
