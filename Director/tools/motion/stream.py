"""The pose stream: one motion as world positions and world rotations of named joints at a frame rate, whatever it came from
(a BVH, an FBX baked by Blender, the MuJoCo sim). Everything else (features, measures, retargeting, the BVH we hand Blender
for the FBX Unity imports) reads this. Space is BVH space: right-handed, Y up, +Z forward, metres.

Canonical rig: Director/library/motion/rig.json (his skeleton, 21 joints, T-pose rest), made by tools/motion_rig.py."""
import json, os
import numpy as np
from . import quat as Q
from . import bvh as B

HERE = os.path.dirname(os.path.abspath(__file__))
DIRECTOR = os.path.dirname(os.path.dirname(HERE))
RIG_PATH = os.path.join(DIRECTOR, 'library', 'motion', 'rig.json')

CANON = ['Hips', 'Spine', 'Chest', 'Neck', 'Head', 'LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
         'RightShoulder', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot', 'LeftToes',
         'RightUpperLeg', 'RightLowerLeg', 'RightFoot', 'RightToes']

# Bone maps: source joint name -> canonical name. Missing joints are allowed (hands or toes a source lacks keep the parent's rotation).
MAPS = {
    # CMU, cgspeed MotionBuilder-friendly 2010 release
    'cmu': {'Hips': 'Hips', 'LowerBack': 'Spine', 'Spine': 'Chest', 'Spine1': None, 'Neck': 'Neck', 'Neck1': None, 'Head': 'Head',
            'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
            'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
            'LeftUpLeg': 'LeftUpperLeg', 'LeftLeg': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
            'RightUpLeg': 'RightUpperLeg', 'RightLeg': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes'},
    # Mixamo (mixamorig: prefix stripped) and our own exports
    'mixamo': {'Hips': 'Hips', 'Spine': 'Spine', 'Spine1': 'Chest', 'Spine2': None, 'Neck': 'Neck', 'Head': 'Head',
               'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
               'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
               'LeftUpLeg': 'LeftUpperLeg', 'LeftLeg': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
               'RightUpLeg': 'RightUpperLeg', 'RightLeg': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes'},
    # PROTOFACTOR Ultimate Animation Collection ("humanoid_ " prefix stripped)
    'protofactor': {'Pelvis': 'Hips', 'Spine': 'Spine', 'Spine1': 'Chest', 'Spine2': None, 'Neck': 'Neck', 'Head': 'Head',
                    'L Clavicle': 'LeftShoulder', 'L UpperArm': 'LeftUpperArm', 'L Forearm': 'LeftLowerArm', 'L Hand': 'LeftHand',
                    'R Clavicle': 'RightShoulder', 'R UpperArm': 'RightUpperArm', 'R Forearm': 'RightLowerArm', 'R Hand': 'RightHand',
                    'L Thigh': 'LeftUpperLeg', 'L Calf': 'LeftLowerLeg', 'L Foot': 'LeftFoot', 'L Toe0': 'LeftToes',
                    'R Thigh': 'RightUpperLeg', 'R Calf': 'RightLowerLeg', 'R Foot': 'RightFoot', 'R Toe0': 'RightToes'},
    # SOMA (NVIDIA GEM-X / Kimodo BVH out of Hawkes Gen motion.from-video and motion.from-text): T-pose rest, centimetres
    'soma': {'Hips': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Chest', 'Chest': None, 'Neck1': 'Neck', 'Neck2': None, 'Head': 'Head',
             'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftUpperArm', 'LeftForeArm': 'LeftLowerArm', 'LeftHand': 'LeftHand',
             'RightShoulder': 'RightShoulder', 'RightArm': 'RightUpperArm', 'RightForeArm': 'RightLowerArm', 'RightHand': 'RightHand',
             'LeftLeg': 'LeftUpperLeg', 'LeftShin': 'LeftLowerLeg', 'LeftFoot': 'LeftFoot', 'LeftToeBase': 'LeftToes',
             'RightLeg': 'RightUpperLeg', 'RightShin': 'RightLowerLeg', 'RightFoot': 'RightFoot', 'RightToeBase': 'RightToes'},
    # his own rig (Unity names)
    'unity': {n: n for n in CANON},
}


def load_rig():
    return json.load(open(RIG_PATH, encoding='utf8'))


class Stream:
    """names [J], parents [J] (index, -1 root), pos [F, J, 3] world, quat [F, J, 4] world (x,y,z,w), fps, meta dict."""
    def __init__(self, names, parents, pos, quat, fps, meta=None):
        self.names = list(names); self.parents = list(parents)
        self.pos = np.asarray(pos, dtype=np.float32); self.quat = np.asarray(quat, dtype=np.float32)
        self.fps = float(fps); self.meta = dict(meta or {})

    @property
    def frames(self): return self.pos.shape[0]
    @property
    def seconds(self): return self.frames / self.fps

    def index(self, name): return self.names.index(name)

    def cut(self, start_frame, end_frame):
        s = Stream(self.names, self.parents, self.pos[start_frame:end_frame], self.quat[start_frame:end_frame], self.fps, self.meta)
        s.meta = {**self.meta, 'cut': [int(start_frame), int(end_frame)]}
        return s

    def resample(self, fps):
        if abs(fps - self.fps) < 1e-6: return self
        n = max(2, int(round(self.frames * fps / self.fps)))
        t_old = np.arange(self.frames) / self.fps; t_new = np.arange(n) / fps
        t_new = np.clip(t_new, 0, t_old[-1])
        idx = np.searchsorted(t_old, t_new, side='right') - 1
        idx = np.clip(idx, 0, self.frames - 2)
        a = ((t_new - t_old[idx]) / (1.0 / self.fps)).astype(np.float32)
        pos = self.pos[idx] * (1 - a)[:, None, None] + self.pos[idx + 1] * a[:, None, None]
        q = Q.continuous(self.quat.astype(float))
        quat = Q.slerp(q[idx], q[idx + 1], a[:, None].repeat(len(self.names), 1))
        return Stream(self.names, self.parents, pos, quat, fps, self.meta)

    def save(self, path):
        np.savez_compressed(path, names=np.array(self.names), parents=np.array(self.parents), pos=self.pos, quat=self.quat,
                            fps=self.fps, meta=json.dumps(self.meta))

    @staticmethod
    def load(path):
        z = np.load(path, allow_pickle=False)
        return Stream([str(n) for n in z['names']], [int(p) for p in z['parents']], z['pos'], z['quat'], float(z['fps']), json.loads(str(z['meta'])))


def from_bvh(path, scale=None, max_frames=None, meta=None, prepend_rest=False):
    """A BVH as a stream. scale: units to metres (None guesses from the hips height of the first frame so a standing body is
    about 0.83 m hips-to-foot; SOMA files are centimetres: 0.01). prepend_rest adds the skeleton's own rest pose (every rotation
    identity, the OFFSETs chained) as frame 0, the T-pose reference to_canonical needs when the file has none of its own."""
    sk, rot, pos, has_pos, fps = B.read(path, max_frames=max_frames)
    if prepend_rest:
        rest_rot = np.zeros((1,) + rot.shape[1:]); rest_rot[..., 3] = 1
        rest_pos = np.zeros((1,) + pos.shape[1:]); rest_pos[0, 0] = pos[0, 0] if has_pos[0] else 0
        rot = np.concatenate([rest_rot, rot]); pos = np.concatenate([rest_pos, pos])
    wp, wq = B.fk(sk, rot, pos, has_pos, 1.0)
    if scale is None:
        scale = guess_scale(sk, wp)
    wp = wp * scale
    s = Stream(sk.names, sk.parents, wp, wq, fps, meta)
    s.meta.update({'file': os.path.basename(path), 'scale': float(scale), 'prependedRest': bool(prepend_rest)})
    return s


def guess_scale(sk, wp):
    """Metres per unit from the standing height of the hips in frame 0 (CMU frame 0 is a T-pose): hips at about 0.96 m."""
    names = sk.names
    def find(*cands):
        for c in cands:
            if c in names: return names.index(c)
        return None
    hip = find('Hips', 'hip', 'Pelvis')
    foot = find('LeftFoot', 'lFoot', 'L Foot', 'RightFoot')
    if hip is None or foot is None: return 1.0
    h = float(wp[0, hip, 1] - wp[0, foot, 1])
    if h <= 1e-6: return 1.0
    return 0.83 / h


def to_canonical(src, bone_map, rest_frame=0, rig=None, facing_fix=True):
    """Retarget a stream onto his rig by rest-pose deltas: each canonical joint's world rotation is the source joint's world rotation
    times the delta that took the source rest bone direction to his rest bone direction. Both rests must be T-poses (CMU frame 0,
    Mixamo and PROTOFACTOR bind poses are A-poses: the delta fixes the direction, the twist about the bone is kept from the source).
    Root path: hips position scaled to his leg length. Unmapped canonical joints take their parent's world rotation (hands, toes).
    Returns a Stream over CANON with world positions from his skeleton."""
    rig = rig or load_rig()
    rj = {j['name']: j for j in rig['joints']}
    inv_map = {}
    for s_name, c_name in bone_map.items():
        if c_name: inv_map[c_name] = s_name
    F = src.frames
    src_names = {n: i for i, n in enumerate(src.names)}
    # strip prefixes like "mixamorig:" or "humanoid_ "
    def find(sname):
        if sname in src_names: return src_names[sname]
        for n, i in src_names.items():
            base = n.split(':')[-1]
            if base == sname: return i
            if base.startswith('humanoid_ ') and base[10:] == sname: return i
        return None
    # world rotation of the "rest" (reference) frame in the source and the target bone directions
    canon_quat = np.zeros((F, len(CANON), 4), dtype=float); canon_quat[..., 3] = 1
    parent_idx = [CANON.index(rj[n]['parent']) if rj[n]['parent'] else -1 for n in CANON]
    for ci, cname in enumerate(CANON):
        sname = inv_map.get(cname)
        si = find(sname) if sname else None
        if si is None:
            canon_quat[:, ci] = canon_quat[:, parent_idx[ci]] if parent_idx[ci] >= 0 else canon_quat[:, ci]
            continue
        q_src = Q.continuous(src.quat[:, si].astype(float))
        q_rest = q_src[rest_frame]
        # direction of this bone in the source at rest, and his rest direction
        kids = [k for k in range(len(src.names)) if src.parents[k] == si]
        tgt_kid = next((k for k in CANON if rj[k]['parent'] == cname and not k.endswith('Shoulder')), None)
        d_tgt = np.array(rj[tgt_kid]['head']) - np.array(rj[cname]['head']) if tgt_kid else np.array(rj[cname]['tail']) - np.array(rj[cname]['head'])
        # the source bone's direction at rest: toward the source joint of the mapped canonical child; when that sits on top of this joint
        # (PROTOFACTOR's Spine starts at the Pelvis, CMU's LowerBack at the Hips) walk down the canonical chain to the first mapped joint
        # at least 3 cm away; with nothing, keep his own direction (delta = identity)
        d_src = None
        walk = tgt_kid
        while walk:
            sj = find(inv_map[walk]) if inv_map.get(walk) else None
            if sj is not None:
                dv = src.pos[rest_frame, sj].astype(float) - src.pos[rest_frame, si].astype(float)
                if np.linalg.norm(dv) > 0.03: d_src = dv; break
            walk = next((k for k in CANON if rj[k]['parent'] == walk and not k.endswith('Shoulder')), None)
        if d_src is None and kids and not tgt_kid:
            dv = src.pos[rest_frame, kids[0]].astype(float) - src.pos[rest_frame, si].astype(float)
            if np.linalg.norm(dv) > 0.03: d_src = dv
        if d_src is None: d_src = d_tgt.copy()
        if np.linalg.norm(d_src) < 1e-6 or np.linalg.norm(d_tgt) < 1e-6:
            delta = np.array([0, 0, 0, 1.0])
        else:
            delta = Q.between(d_tgt, d_src)          # turns his rest bone onto the source's rest bone direction
        # world(f) = (q_src(f) * q_rest^-1) * delta: the source's rotation since its rest, applied to his bone pointed the way the source's rest bone pointed
        canon_quat[:, ci] = Q.mul(Q.mul(q_src, Q.inv(q_rest)), delta)
    # positions: his skeleton under those world rotations, root from the source hips scaled to his legs
    hips_src = find(inv_map['Hips'])
    foot_src = find(inv_map.get('LeftFoot') or inv_map.get('RightFoot'))
    leg_src = float(np.linalg.norm(src.pos[rest_frame, hips_src] - src.pos[rest_frame, foot_src])) if foot_src is not None else None
    leg_tgt = float(np.linalg.norm(np.array(rj['Hips']['head']) - np.array(rj['LeftFoot']['head'])))
    k = (leg_tgt / leg_src) if leg_src and leg_src > 1e-6 else 1.0
    root = src.pos[:, hips_src].astype(float) * k
    pos = fk_canonical(canon_quat, root, rig)
    out = Stream(CANON, parent_idx, pos, canon_quat, src.fps, {**src.meta, 'retargeted': True, 'rootScale': k})
    return out


def fk_canonical(wq, root, rig=None):
    rig = rig or load_rig()
    rj = {j['name']: j for j in rig['joints']}
    F = wq.shape[0]
    pos = np.zeros((F, len(CANON), 3))
    for ci, cname in enumerate(CANON):
        p = rj[cname]['parent']
        if not p: pos[:, ci] = root
        else:
            pi = CANON.index(p)
            pos[:, ci] = pos[:, pi] + Q.rotate(wq[:, pi], np.array(rj[cname]['offset']))
    return pos


def canonical_local(stream, rig=None):
    """Local rotations [F, J, 4] of a canonical stream relative to the T-pose rest (parent^-1 * child)."""
    rig = rig or load_rig()
    rj = {j['name']: j for j in rig['joints']}
    wq = Q.continuous(stream.quat.astype(float))
    loc = np.zeros_like(wq)
    for ci, cname in enumerate(CANON):
        p = rj[cname]['parent']
        loc[:, ci] = wq[:, ci] if not p else Q.mul(Q.inv(wq[:, CANON.index(p)]), wq[:, ci])
    return loc


def write_canonical_bvh(stream, path, rig=None, names='mixamo'):
    """A canonical stream as a BVH on his skeleton with Mixamo joint names, metres, for Blender to turn into the FBX Unity imports."""
    rig = rig or load_rig()
    rj = {j['name']: j for j in rig['joints']}
    loc = canonical_local(stream, rig)
    out_names = [rj[n][names] if names != 'canonical' else n for n in CANON]
    parents = [CANON.index(rj[n]['parent']) if rj[n]['parent'] else -1 for n in CANON]
    offsets = [rj[n]['offset'] if rj[n]['parent'] else [0, 0, 0] for n in CANON]
    ends = {rj[n][names]: list(np.array(rj[n]['tail']) - np.array(rj[n]['head'])) for n in CANON if not any(rj[k]['parent'] == n for k in CANON)}
    B.write(path, out_names, parents, offsets, loc, stream.pos[:, 0].astype(float), stream.fps, ends=ends)
