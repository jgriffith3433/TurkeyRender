"""Blender script: the two conversions the motion tools need from Blender, batched so one Blender start does many files.
   blender -b --python Director/tools/motion/blender_bridge.py -- <jobs.json>
jobs.json: [{"op": "bvh2fbx", "in": "x.bvh", "out": "x.fbx"},
            {"op": "fbx2stream", "in": "x.fbx", "out": "x.npz", "fps": 30}]
bvh2fbx: the BVH (metres, Y up) becomes an FBX with just the armature and its baked animation, named after the file, the way
  Mixamo "Without Skin" clips arrive. Unity imports it as Humanoid and retargets it onto his Avatar.
fbx2stream: every bone's world position and rotation per frame (BVH space: Y up, +Z forward), written as the .npz the
  pose stream loads (tools/motion/stream.py). Rest pose (bind) is frame index -1 in meta: it is stored as 'rest_pos'/'rest_quat'.
Each job's result (ok, error, frames) goes to <jobs.json>.result.json."""
import bpy, sys, json, os, math
import numpy as np
from mathutils import Matrix, Quaternion

jobs_path = sys.argv[sys.argv.index("--") + 1]
jobs = json.load(open(jobs_path, encoding='utf8'))
results = []

# Blender (Z up, -Y forward... an imported FBX/BVH faces whatever it faces) to BVH space (Y up): (x, y, z) -> (x, z, -y)
TO_BVH = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0))).to_4x4()


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def armatures():
    return [o for o in bpy.data.objects if o.type == 'ARMATURE']


def bvh2fbx(job):
    reset()
    bpy.ops.import_anim.bvh(filepath=job['in'], global_scale=job.get('scale', 1.0), frame_start=1, use_fps_scale=False,
                            update_scene_fps=True, update_scene_duration=True, rotate_mode='NATIVE', axis_forward='-Z', axis_up='Y')
    arm = armatures()[0]
    arm.name = job.get('name') or os.path.splitext(os.path.basename(job['out']))[0].replace('Humanoid@', '')
    if arm.animation_data and arm.animation_data.action:
        arm.animation_data.action.name = arm.name
    bpy.ops.export_scene.fbx(filepath=job['out'], object_types={'ARMATURE'}, add_leaf_bones=False, bake_anim=True,
                             bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False, bake_anim_simplify_factor=0.0,
                             bake_anim_step=1.0, apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y')
    return {'frames': bpy.context.scene.frame_end, 'fps': bpy.context.scene.render.fps}


def fbx2stream(job):
    reset()
    bpy.ops.import_scene.fbx(filepath=job['in'], automatic_bone_orientation=False, ignore_leaf_bones=False, use_anim=True)
    arms = armatures()
    if not arms: raise RuntimeError('no armature')
    arm = max(arms, key=lambda a: len(a.data.bones))
    sc = bpy.context.scene
    src_fps = sc.render.fps / sc.render.fps_base
    f0, f1 = sc.frame_start, sc.frame_end
    if arm.animation_data and arm.animation_data.action:
        fr = arm.animation_data.action.frame_range
        f0, f1 = int(math.floor(fr[0])), int(math.ceil(fr[1]))
    out_fps = float(job.get('fps') or src_fps)
    bones = list(arm.pose.bones)
    names = [b.name for b in bones]
    parents = [names.index(b.parent.name) if b.parent else -1 for b in bones]
    n = int(round((f1 - f0) * out_fps / src_fps)) + 1
    pos = np.zeros((n, len(bones), 3), np.float32); quat = np.zeros((n, len(bones), 4), np.float32)
    dg = bpy.context.evaluated_depsgraph_get()
    for k in range(n):
        sc.frame_set(f0 + int(round(k * src_fps / out_fps)))
        mw = TO_BVH @ arm.matrix_world
        for i, b in enumerate(bones):
            m = mw @ b.matrix
            t = m.to_translation(); q = m.to_quaternion()
            pos[k, i] = (t.x, t.y, t.z); quat[k, i] = (q.x, q.y, q.z, q.w)
    # rest (bind) pose
    rest_pos = np.zeros((len(bones), 3), np.float32); rest_quat = np.zeros((len(bones), 4), np.float32)
    mw = TO_BVH @ arm.matrix_world
    for i, b in enumerate(bones):
        m = mw @ b.bone.matrix_local
        t = m.to_translation(); q = m.to_quaternion()
        rest_pos[i] = (t.x, t.y, t.z); rest_quat[i] = (q.x, q.y, q.z, q.w)
    meta = {'file': os.path.basename(job['in']), 'srcFps': src_fps, 'rest': 'rest_pos/rest_quat in the npz'}
    np.savez_compressed(job['out'], names=np.array(names), parents=np.array(parents), pos=pos, quat=quat, fps=out_fps,
                        meta=json.dumps(meta), rest_pos=rest_pos, rest_quat=rest_quat)
    return {'frames': n, 'fps': out_fps, 'bones': len(bones)}


for job in jobs:
    try:
        r = {'bvh2fbx': bvh2fbx, 'fbx2stream': fbx2stream}[job['op']](job)
        results.append({'ok': True, 'in': job['in'], 'out': job['out'], **r})
    except Exception as e:  # noqa: BLE001
        results.append({'ok': False, 'in': job['in'], 'out': job.get('out'), 'error': str(e)})
json.dump(results, open(jobs_path + '.result.json', 'w'), indent=1)
print('bridge done', sum(r['ok'] for r in results), 'of', len(results))
