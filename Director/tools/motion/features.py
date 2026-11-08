"""Motion-matching features of a canonical stream at 30 fps, per frame, in the body's own frame (hips on the ground plane, yaw
removed): positions of 9 key joints, velocities of hands, feet and head, hips velocity and yaw rate, hips height, chest up
vector. 50 numbers a frame. A library index is the z-scored features of every clip; a query is a window of them.
motion_match.mjs reads the binary this writes (little-endian float32), so FEATURE_DIM and the layout are a contract."""
import numpy as np
from . import quat as Q
from . import stream as S

KEY = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head', 'LeftLowerArm', 'RightLowerArm', 'LeftLowerLeg', 'RightLowerLeg']
VEL = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head']
FEATURE_DIM = 9 * 3 + 5 * 3 + 3 + 1 + 1 + 3   # 50
NAMES = [f'{k}.{a}' for k in KEY for a in 'xyz'] + [f'v{k}.{a}' for k in VEL for a in 'xyz'] + ['vHips.x', 'vHips.y', 'vHips.z', 'yawRate', 'hipsY', 'chestUp.x', 'chestUp.y', 'chestUp.z']


def body_frame(stream):
    """Per frame: the yaw rotation (about Y) of the hips and the ground point under them."""
    hips = stream.pos[:, stream.index('Hips')].astype(float)
    # facing from the hips' rotation: his forward is +Z at rest
    fwd = Q.rotate(stream.quat[:, stream.index('Hips')].astype(float), np.array([0, 0, 1.0]))
    # if the body is lying or tumbling, fall back to the shoulders' line for yaw
    yaw = np.arctan2(fwd[:, 0], fwd[:, 2])
    return yaw, hips


def features(stream):
    st = stream if abs(stream.fps - 30) < 0.5 else stream.resample(30.0)
    F = st.frames
    yaw, hips = body_frame(st)
    inv = Q.from_axis_angle(np.array([0, 1.0, 0]), -yaw)                 # undo yaw
    origin = hips.copy(); origin[:, 1] = 0
    idx = {n: st.index(n) for n in st.names}
    out = np.zeros((F, FEATURE_DIM), np.float32)
    c = 0
    local = {}
    for k in KEY:
        p = Q.rotate(inv, st.pos[:, idx[k]].astype(float) - origin); local[k] = p
        out[:, c:c + 3] = p; c += 3
    dt = 1.0 / st.fps
    for k in VEL:
        p = local[k]; v = np.zeros_like(p)
        if F > 1: v[1:] = (p[1:] - p[:-1]) / dt; v[0] = v[1]
        out[:, c:c + 3] = v; c += 3
    hv = np.zeros((F, 3))
    if F > 1: hv[1:] = (hips[1:] - hips[:-1]) / dt; hv[0] = hv[1]
    out[:, c:c + 3] = Q.rotate(inv, hv); c += 3
    yr = np.zeros(F)
    if F > 1: d = np.diff(yaw); d = (d + np.pi) % (2 * np.pi) - np.pi; yr[1:] = d / dt; yr[0] = yr[1]
    out[:, c] = yr; c += 1
    out[:, c] = hips[:, 1]; c += 1
    up = Q.rotate(st.quat[:, idx['Chest']].astype(float), np.array([0, 1.0, 0]))
    out[:, c:c + 3] = Q.rotate(inv, up); c += 3
    return out


# Weights per group so a hand's position isn't drowned by five velocities
WEIGHTS = np.concatenate([np.full(27, 1.0), np.full(15, 0.35), np.full(3, 0.6), [0.5], [1.0], np.full(3, 0.8)]).astype(np.float32)
