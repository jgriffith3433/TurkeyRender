"""The active ragdoll: a MuJoCo humanoid built from his skeleton (library/motion/rig.json), driven by PD torques toward a target
pose, with impulses, gravity schedules and props per beat. Every beat is a pure function of its seed and parameters, so a
candidate can be made again. Output: a canonical pose Stream (tools/motion/stream.py) at 30 fps.

Space: the sim runs in BVH space (Y up, +Z forward, his left +X): MuJoCo doesn't care which axis is up as long as gravity
says so. Bodies sit at his joint heads; at qpos zero the body is his T-pose, so a body's world quaternion is directly the
canonical joint's world rotation.

Joints: Hips free; Spine, Chest, Neck, Head, shoulders, hips, ankles are ball joints (one range angle); elbows and knees are
hinges. Shoulders (clavicles), hands and toes ride their parents. Target poses are given as joint rotations relative to the
T-pose in the parent's frame (the same thing canonical_local() measures), from `pose_from_angles` (research angles) or a
canonical stream frame."""
import math
import numpy as np
import mujoco
from . import quat as Q
from . import stream as S

RIG = S.load_rig()
RJ = {j['name']: j for j in RIG['joints']}
CANON = S.CANON

# joint kinds: ball with a range (deg) or hinge with axis and range (deg)
BALL = {'Spine': 30, 'Chest': 30, 'Neck': 45, 'Head': 30, 'LeftUpperArm': 150, 'RightUpperArm': 150, 'LeftUpperLeg': 120, 'RightUpperLeg': 120,
        'LeftFoot': 45, 'RightFoot': 45, 'LeftHand': 40, 'RightHand': 40}
# Elbows: forearm along +X (left) bends forward (+Z): (1,0,0) -> (0,0,1) is a rotation about -Y... about Y by -90: x' = cos, z' = -sin -> +90 gives z=-1, so -90.
# Knees: shin along -Y bends backward (-Z): (0,-1,0) -> (0,0,-1) about X: y'= -cos.. use axis X: y' = y cos - z sin, z' = y sin + z cos; y=-1: z' = -sin -> +90 gives -1. So +.
HINGE = {'LeftLowerArm': ([0, -1, 0], (0, 150)), 'RightLowerArm': ([0, 1, 0], (0, 150)),
         'LeftLowerLeg': ([1, 0, 0], (0, 150)), 'RightLowerLeg': ([1, 0, 0], (0, 150))}
FIXED = {'LeftShoulder', 'RightShoulder', 'LeftToes', 'RightToes'}
# PD gains per joint (Nm/rad), damping as a fraction of kp
KP = {'Spine': 400, 'Chest': 400, 'Neck': 40, 'Head': 25, 'LeftUpperArm': 120, 'RightUpperArm': 120, 'LeftLowerArm': 60, 'RightLowerArm': 60,
      'LeftHand': 8, 'RightHand': 8, 'LeftUpperLeg': 300, 'RightUpperLeg': 300, 'LeftLowerLeg': 200, 'RightLowerLeg': 200, 'LeftFoot': 40, 'RightFoot': 40}
RADII = {'Hips': 0.12, 'Spine': 0.11, 'Chest': 0.12, 'Neck': 0.05, 'Head': 0.10, 'UpperArm': 0.045, 'LowerArm': 0.04, 'Hand': 0.04,
         'UpperLeg': 0.075, 'LowerLeg': 0.055, 'Foot': 0.045, 'Toes': 0.03, 'Shoulder': 0.05}


def _radius(name):
    for k, r in RADII.items():
        if name.endswith(k): return r
    return 0.05


def build_xml(props=None, gravity=(0, -9.81, 0), floor=True, timestep=0.001):
    """MJCF of his body (plus optional props: list of dicts {name, type: box|sphere|plane, pos, size, mass, free}) as a string."""
    props = props or []
    lines = [f'<mujoco model="person"><compiler angle="degree" inertiafromgeom="true"/>',
             f'<option timestep="{timestep}" gravity="{gravity[0]} {gravity[1]} {gravity[2]}" integrator="implicitfast" cone="elliptic" impratio="5"/>',
             # his own geoms: contype 1, conaffinity 0, so they meet the floor and props (contype 1, conaffinity 1) but never each other
             '<default><geom condim="3" friction="0.9 0.005 0.0001" solref="0.01 1" solimp="0.95 0.99 0.001" contype="1" conaffinity="0"/>'
             '<joint damping="0.5" armature="0.01"/><default class="world"><geom contype="1" conaffinity="1"/></default></default>',
             '<worldbody>']
    if floor: lines.append('<geom name="floor" class="world" type="plane" size="20 20 0.1" zaxis="0 1 0" rgba="0.3 0.3 0.3 1"/>')
    kids = {n: [k for k in CANON if RJ[k]['parent'] == n] for n in CANON}

    def body(name, depth):
        j = RJ[name]; ind = '  ' * depth
        pos = j['offset'] if j['parent'] else j['head']
        lines.append(f'{ind}<body name="{name}" pos="{pos[0]} {pos[1]} {pos[2]}">')
        if not j['parent']:
            lines.append(f'{ind}  <freejoint name="root"/>')
        elif name in BALL:
            lines.append(f'{ind}  <joint name="{name}" type="ball" range="0 {BALL[name]}" limited="true"/>')
        elif name in HINGE:
            ax, rg = HINGE[name]
            lines.append(f'{ind}  <joint name="{name}" type="hinge" axis="{ax[0]} {ax[1]} {ax[2]}" range="{rg[0]} {rg[1]}" limited="true"/>')
        # geom: a capsule from this joint toward its child (or tail), mass from the rig
        end = np.array(RJ[kids[name][0]]['offset']) if kids[name] and not kids[name][0].endswith('Shoulder') else np.array(j['tail']) - np.array(j['head'])
        if name == 'Chest': end = np.array(RJ['Neck']['offset'])
        if name == 'Hips': end = np.array(RJ['Spine']['offset'])
        r = _radius(name); L = float(np.linalg.norm(end))
        if L > 2 * r + 0.01:
            shrink = r / L
            a = end * shrink; b = end * (1 - shrink)
            lines.append(f'{ind}  <geom name="g_{name}" type="capsule" fromto="{a[0]} {a[1]} {a[2]} {b[0]} {b[1]} {b[2]}" size="{r}" mass="{j["mass"]}"/>')
        else:
            c = end / 2
            lines.append(f'{ind}  <geom name="g_{name}" type="sphere" pos="{c[0]} {c[1]} {c[2]}" size="{max(r, L / 2 + 0.01)}" mass="{j["mass"]}"/>')
        if name == 'Hips':   # pelvis width
            lines.append(f'{ind}  <geom name="g_pelvis" type="capsule" fromto="-0.09 -0.03 0 0.09 -0.03 0" size="0.09" mass="0.1"/>')
        if name == 'Chest':  # shoulders width
            lines.append(f'{ind}  <geom name="g_shoulders" type="capsule" fromto="-0.14 0.27 0 0.14 0.27 0" size="0.07" mass="0.1"/>')
        for k in kids[name]: body(k, depth + 1)
        lines.append(f'{ind}</body>')
    body('Hips', 1)
    for p in props:
        pos = p.get('pos', [0, 0, 0]); size = p.get('size', [0.2, 0.2, 0.2])
        free = '<freejoint/>' if p.get('free') else ''
        if p['type'] == 'plane':
            lines.append(f'<geom name="{p["name"]}" class="world" type="box" pos="{pos[0]} {pos[1]} {pos[2]}" size="{size[0]} {size[1]} {size[2]}" rgba="0.6 0.6 0.9 0.5"/>')
        else:
            sz = ' '.join(str(s) for s in size)
            lines.append(f'<body name="{p["name"]}" pos="{pos[0]} {pos[1]} {pos[2]}">{free}<geom name="{p["name"]}" class="world" type="{p["type"]}" size="{sz}" mass="{p.get("mass", 1)}"/></body>')
    lines.append('</worldbody>')
    if any(p.get('weld') for p in props):
        lines.append('<equality>' + ''.join(f'<weld name="w_{p["name"]}" body1="{p["weld"]}" body2="{p["name"]}" active="false"/>' for p in props if p.get('weld')) + '</equality>')
    lines.append('</mujoco>')
    return '\n'.join(lines)


class Body:
    def __init__(self, props=None, gravity=(0, -9.81, 0), floor=True, timestep=0.001, omega=18.0, zeta=0.9):
        self.xml = build_xml(props, gravity, floor, timestep)
        self.model = mujoco.MjModel.from_xml_string(self.xml)
        self.data = mujoco.MjData(self.model)
        self.m, self.d = self.model, self.data
        self.bid = {n: mujoco.mj_name2id(self.m, mujoco.mjtObj.mjOBJ_BODY, n) for n in CANON}
        self.joints = {}
        for n in CANON:
            jid = mujoco.mj_name2id(self.m, mujoco.mjtObj.mjOBJ_JOINT, n)
            if jid >= 0:
                self.joints[n] = {'id': jid, 'qadr': self.m.jnt_qposadr[jid], 'vadr': self.m.jnt_dofadr[jid], 'type': self.m.jnt_type[jid]}
        self.target = identity_pose()
        self.gain = {n: 1.0 for n in KP}
        self.kp_scale = 1.0; self.kd_scale = 1.0
        self.noise = None
        # The PD is MuJoCo's own joint spring and damper (implicit, so stiff joints don't blow up): stiffness = omega^2 * I, damping = 2 zeta omega I,
        # with I the inertia of everything the joint carries about the joint, from the model at rest. KP holds per-joint multipliers of that.
        mujoco.mj_forward(self.m, self.d)
        self.base = {}
        for n, j in self.joints.items():
            b = self.bid[n]
            inertia = 0.0
            for k in range(self.m.nbody):
                # bodies in this subtree: walk parents
                p = k; inside = False
                while p > 0:
                    if p == b: inside = True; break
                    p = self.m.body_parentid[p]
                if not inside: continue
                r = self.d.xipos[k] - self.d.xpos[b]
                inertia += self.m.body_mass[k] * float(r @ r) + float(self.m.body_inertia[k].mean())
            inertia = max(inertia, 0.002)
            w = omega * (KP[n] / 100.0) ** 0.25          # KP's relative weights move the natural frequency a little (trunk quicker than wrists)
            self.base[n] = (w * w * inertia, 2 * zeta * w * inertia)
        self.apply_gains()

    def apply_gains(self):
        for n, j in self.joints.items():
            kp, kd = self.base[n]; g = self.gain.get(n, 1.0)
            self.m.jnt_stiffness[j['id']] = kp * g * self.kp_scale
            nd = 3 if j['type'] == mujoco.mjtJoint.mjJNT_BALL else 1
            self.m.dof_damping[j['vadr']:j['vadr'] + nd] = kd * math.sqrt(max(g * self.kp_scale, 1e-3)) * self.kd_scale

    # ---- pose
    def set_pose(self, pose, root_pos=None, root_quat=None):
        """Put the body in a pose at once (local rotations per joint, as pose dicts), velocities zero."""
        d = self.d
        for n, j in self.joints.items():
            q = pose.get(n)
            if q is None: continue
            if j['type'] == mujoco.mjtJoint.mjJNT_BALL:
                d.qpos[j['qadr']:j['qadr'] + 4] = [q[3], q[0], q[1], q[2]]          # MuJoCo w,x,y,z
            else:
                d.qpos[j['qadr']] = hinge_angle(n, q)
        if root_pos is not None: d.qpos[0:3] = root_pos
        if root_quat is not None: d.qpos[3:7] = [root_quat[3], root_quat[0], root_quat[1], root_quat[2]]
        d.qvel[:] = 0
        mujoco.mj_forward(self.m, d)

    def pd(self):
        """Point every joint's spring at the target (plus noise) and refresh the gains."""
        d, m = self.d, self.m
        for n, j in self.joints.items():
            tq = np.asarray(self.target.get(n, [0, 0, 0, 1]), float)
            if self.noise is not None and n in self.noise: tq = Q.mul(tq, self.noise[n])
            if j['type'] == mujoco.mjtJoint.mjJNT_BALL:
                m.qpos_spring[j['qadr']:j['qadr'] + 4] = [tq[3], tq[0], tq[1], tq[2]]
            else:
                m.qpos_spring[j['qadr']] = hinge_angle(n, tq)
        self.apply_gains()

    def step(self):
        self.pd(); mujoco.mj_step(self.m, self.d)

    def push(self, body, force, point=None):
        """A force (N, world) on a body this step (xfrc_applied, cleared by the caller)."""
        b = self.bid[body] if isinstance(body, str) else body
        self.d.xfrc_applied[b, :3] = force
        if point is not None:
            r = np.asarray(point) - self.d.xpos[b]
            self.d.xfrc_applied[b, 3:] = np.cross(r, force)

    def clear_push(self): self.d.xfrc_applied[:] = 0

    def world(self):
        """Canonical joint world positions [J,3] and quaternions [J,4] (x,y,z,w) now."""
        pos = np.zeros((len(CANON), 3)); quat = np.zeros((len(CANON), 4))
        for i, n in enumerate(CANON):
            b = self.bid[n]; pos[i] = self.d.xpos[b]; q = self.d.xquat[b]; quat[i] = [q[1], q[2], q[3], q[0]]
        return pos, quat

    def com(self):
        return self.d.subtree_com[self.bid['Hips']].copy()

    def com_vel(self):
        v = np.zeros(6); mujoco.mj_objectVelocity(self.m, self.d, mujoco.mjtObj.mjOBJ_BODY, self.bid['Hips'], v, 0)
        return v[3:]


def identity_pose():
    return {n: np.array([0, 0, 0, 1.0]) for n in CANON}


def hinge_angle(name, q):
    """The signed hinge angle (rad) a local quaternion means on this hinge."""
    ax = np.array(HINGE[name][0], float)
    r = Q.to_rotvec(np.asarray(q, float))
    return float(np.dot(r, ax))


def rot(axis, deg):
    return Q.from_axis_angle(np.array(axis, float), math.radians(deg))


def pose_from_angles(hipFlex=0, hipAbd=0, knee=0, anklePF=0, waist=0, neck=0, shFlex=0, shAbd=90, elbow=0, shTwist=0, **kw):
    """A symmetric pose from the research's joint angles (degrees). shAbd is the arm's angle from the torso (90 = T-pose, 0 = hanging).
    Rest: left arm +X, right arm -X, thighs -Y, forward +Z, up +Y. Checked numerically in tools/motion/test_conventions.py.
    kw overrides per joint ('LeftUpperArm': quat...)."""
    p = identity_pose()
    for s, sx in (('Left', 1), ('Right', -1)):
        # arm: lower it from the T-pose (about Z: +X toward -Y is Rz(-90) on the left), then swing it forward about the body's X axis
        # (a hanging arm (0,-1,0) goes to +Z under Rx(-90)), then twist about the bone
        down = rot([0, 0, 1], -sx * (90 - shAbd))
        fwd = rot([1, 0, 0], -shFlex)
        tw = rot([sx, 0, 0], shTwist)
        p[s + 'UpperArm'] = Q.mul(Q.mul(fwd, down), tw)
        p[s + 'LowerArm'] = rot(HINGE[s + 'LowerArm'][0], elbow)
        # leg: flex forward (thigh (0,-1,0) to +Z is Rx(-angle)), abduct outward (left thigh to +X is Rz(+angle))
        p[s + 'UpperLeg'] = Q.mul(rot([0, 0, 1], sx * hipAbd), rot([1, 0, 0], -hipFlex))
        p[s + 'LowerLeg'] = rot(HINGE[s + 'LowerLeg'][0], knee)
        p[s + 'Foot'] = rot([1, 0, 0], anklePF)                 # toes down: the foot (+Z) toward -Y is Rx(+angle)
    p['Spine'] = rot([1, 0, 0], waist * 0.5); p['Chest'] = rot([1, 0, 0], waist * 0.5)
    p['Neck'] = rot([1, 0, 0], neck * 0.6); p['Head'] = rot([1, 0, 0], neck * 0.4)
    for k, v in kw.items(): p[k] = np.asarray(v, float)
    return p


def blend_pose(a, b, t):
    return {n: Q.slerp(np.asarray(a[n], float)[None], np.asarray(b[n], float)[None], t)[0] for n in a}


# ---- poses the beats use
def nbp(rng=None, variant=0.0):
    """NASA neutral body posture (Director/research/zero-g-acting.md section 1): hip 40, abd 12, knee 45, ankle 20, waist 3, neck 20,
    shoulder flex 40 / abd 40, elbow 75. variant in -1..1 moves between the 'almost standing' and 'pitched forward' families."""
    v = variant
    return pose_from_angles(hipFlex=40 + 15 * v, hipAbd=12 + 4 * v, knee=45 + 15 * v, anklePF=20, waist=3 + 5 * v, neck=20,
                            shFlex=40 + 10 * v, shAbd=40, elbow=75, shTwist=20)


def seated():
    """On a bed edge: thighs level, shins down, feet flat, hands on the thighs, head level."""
    return pose_from_angles(hipFlex=85, hipAbd=8, knee=85, anklePF=0, waist=5, neck=5, shFlex=35, shAbd=12, elbow=35, shTwist=0)


def braced():
    """A catch stance: feet apart, knees soft, arms forward at chest height, palms out."""
    return pose_from_angles(hipFlex=25, hipAbd=15, knee=35, anklePF=-10, waist=10, neck=-5, shFlex=85, shAbd=20, elbow=35, shTwist=-30)


def starfish():
    return pose_from_angles(hipFlex=5, hipAbd=25, knee=5, anklePF=25, waist=-10, neck=-8, shFlex=-10, shAbd=120, elbow=10)


def standing():
    return pose_from_angles(hipFlex=2, hipAbd=4, knee=4, anklePF=0, waist=0, neck=0, shFlex=5, shAbd=12, elbow=10)


# ---- running a beat
def run(body, seconds, fps=30.0, on_step=None):
    """Steps the sim, calling on_step(t, body) before each step, recording the canonical stream at fps."""
    m, d = body.m, body.d
    n = int(round(seconds * fps)); per = int(round(1.0 / (fps * m.opt.timestep)))
    pos = np.zeros((n, len(CANON), 3), np.float32); quat = np.zeros((n, len(CANON), 4), np.float32)
    extra = []
    for f in range(n):
        p, q = body.world(); pos[f] = p; quat[f] = q
        for _ in range(per):
            body.clear_push()
            if on_step: on_step(d.time, body, extra)
            body.step()
    st = S.Stream(CANON, [CANON.index(RJ[n]['parent']) if RJ[n]['parent'] else -1 for n in CANON], pos, quat, fps)
    return st, extra


def smooth_noise(rng, n_joints, seconds, fps, amp_deg, periods=(3.0, 7.0)):
    """Per-joint slow wander: a sum of three sines with random periods and phases, as small rotations [frames, joints, 4]."""
    t = np.arange(int(seconds * fps)) / fps
    out = np.zeros((len(t), n_joints, 4)); out[..., 3] = 1
    for j in range(n_joints):
        r = np.zeros((len(t), 3))
        for k in range(3):
            per = rng.uniform(*periods); ph = rng.uniform(0, 2 * np.pi); ax = rng.normal(size=3); ax /= np.linalg.norm(ax)
            r += np.sin(2 * np.pi * t / per + ph)[:, None] * ax * math.radians(amp_deg) / 3
        out[:, j] = Q.from_rotvec(r)
    return out
