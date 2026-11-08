"""The bake's measures on a canonical stream, outside Unity: snaps (a joint turns more than SNAP_DEG in one frame at 30 fps and that
step is a spike against its neighbours), jitter (frame-to-frame reversal of the hands, feet and head), hinge flips (an elbow or
knee whose bend axis swings more than 8 degrees between frames while bent), hyperextension (a hinge bent the wrong way or dead
straight), peak speeds, floor penetration, and a plausibility pass per beat. Score 0-10 like qa.mjs: 10 minus penalties."""
import numpy as np
from . import quat as Q
from . import stream as S

SNAP_DEG = 25.0          # one-frame joint step at 30 fps that reads as a snap
HINGES = [('LeftElbow', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand'), ('RightElbow', 'RightUpperArm', 'RightLowerArm', 'RightHand'),
          ('LeftKnee', 'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot'), ('RightKnee', 'RightUpperLeg', 'RightLowerLeg', 'RightFoot')]
EXTREMITIES = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'Head']


def measure(stream, floor=None, zero_g=False):
    st = stream.resample(30.0) if abs(stream.fps - 30) > 0.5 else stream
    fps = st.fps
    loc = S.canonical_local(st)
    F, J = loc.shape[:2]
    idx = {n: i for i, n in enumerate(st.names)}
    res = {'frames': F, 'seconds': round(F / fps, 3), 'fps': fps}
    # joint steps per frame (deg)
    step = np.zeros((F, J))
    if F > 1:
        d = Q.mul(Q.inv(loc[:-1]), loc[1:])
        step[1:] = np.degrees(Q.angle(d))
    snaps = []
    for j in range(J):
        s = step[:, j]
        for f in range(2, F - 1):
            if s[f] > SNAP_DEG and s[f] > 3 * (s[f - 1] + s[f + 1]) / 2 + 5:
                snaps.append({'joint': st.names[j], 'f': int(f), 't': round(f / fps, 3), 'deg': round(float(s[f]), 1)})
    res['snaps'] = len(snaps); res['snapList'] = snaps[:20]
    res['peakStepDeg'] = round(float(step.max()), 1) if F > 1 else 0
    # jitter: direction reversals of extremity velocity with a size (m/frame)
    jit = 0.0; rev = 0
    for n in EXTREMITIES:
        p = st.pos[:, idx[n]].astype(float)
        v = np.diff(p, axis=0)
        if len(v) > 2:
            dots = np.sum(v[1:] * v[:-1], axis=1)
            mags = np.linalg.norm(v[1:], axis=1) * np.linalg.norm(v[:-1], axis=1)
            r = (dots < -0.3 * mags) & (np.linalg.norm(v[1:], axis=1) > 0.004)
            rev += int(r.sum())
            acc = np.linalg.norm(np.diff(v, axis=0), axis=1)
            jit += float(np.mean(acc)) * fps * fps
    res['jitterReversals'] = rev
    res['meanAccel'] = round(jit / len(EXTREMITIES), 2)        # m/s^2 mean over hands, feet, head
    # hinges
    flips = 0; hyper = 0; maxAng = {}
    for name, a, b, c in HINGES:
        pa, pb, pc = (st.pos[:, idx[x]].astype(float) for x in (a, b, c))
        u = pb - pa; l = pc - pb
        un = u / (np.linalg.norm(u, axis=1, keepdims=True) + 1e-9); ln = l / (np.linalg.norm(l, axis=1, keepdims=True) + 1e-9)
        ang = np.degrees(np.arccos(np.clip(np.sum(un * ln, axis=1), -1, 1)))         # 0 straight
        ax = np.cross(un, ln); ax = ax / (np.linalg.norm(ax, axis=1, keepdims=True) + 1e-9)
        # axis in the upper segment's frame so a body turn doesn't count
        qa = Q.inv(st.quat[:, idx[a]].astype(float)); axl = Q.rotate(qa, ax)
        bent = ang > 12
        avg = axl[bent].mean(axis=0) if bent.any() else np.array([0, 0, 1.0]); avg /= (np.linalg.norm(avg) + 1e-9)
        for f in range(1, F):
            if bent[f] and bent[f - 1]:
                d = np.degrees(np.arccos(np.clip(np.dot(axl[f], axl[f - 1]), -1, 1)))
                if d > 8: flips += 1
            if ang[f] > 4 and np.dot(axl[f], avg) < 0: hyper += 1
        maxAng[name] = round(float(ang.max()), 1)
    res['hingeFlips'] = flips; res['hyper'] = hyper; res['maxBend'] = maxAng
    # speeds
    pk = {}
    for n in EXTREMITIES + ['Hips']:
        v = np.linalg.norm(np.diff(st.pos[:, idx[n]].astype(float), axis=0), axis=1) * fps if F > 1 else np.zeros(1)
        pk[n] = round(float(v.max()), 2)
    res['peakSpeed'] = pk
    # floor
    if floor is not None:
        low = float(min(st.pos[:, idx['LeftToes'], 1].min(), st.pos[:, idx['RightToes'], 1].min(), st.pos[:, idx['LeftFoot'], 1].min() - 0.08))
        res['belowFloorCm'] = round(max(0.0, (floor - low) * 100), 1)
    # loop gap: pose distance first vs last frame
    res['loopGapDeg'] = round(float(np.degrees(Q.angle(Q.mul(Q.inv(loc[0]), loc[-1]))).mean()), 1)
    res['hipsTravelM'] = round(float(np.linalg.norm(st.pos[-1, 0] - st.pos[0, 0])), 2)
    # chair test from the research: hip and knee both over 70 deg for more than 1.5 s
    hipflex = hinge_angle(st, 'Spine', 'Hips', 'LeftUpperLeg', 'LeftLowerLeg')
    knee = knee_angle(st, 'Left')
    chair = (hipflex > 70) & (knee > 70)
    res['chairSeconds'] = round(float(chair.sum() / fps), 2)
    res['score'] = score(res, zero_g=zero_g)
    return res


def unit(st, a, b):
    d = st.pos[:, st.index(b)].astype(float) - st.pos[:, st.index(a)].astype(float)
    return d / (np.linalg.norm(d, axis=1, keepdims=True) + 1e-9)


def hinge_angle(st, up_a, up_b, lo_a, lo_b):
    """Hip flexion in degrees: the angle between the trunk's down direction (Spine -> Hips) and the thigh (0 when standing straight)."""
    trunk = -unit(st, up_b, up_a)
    thigh = unit(st, lo_a, lo_b)
    return np.degrees(np.arccos(np.clip(np.sum(trunk * thigh, axis=1), -1, 1)))


def knee_angle(st, side):
    """Knee flexion in degrees: the angle between thigh and shin directions (0 straight)."""
    return np.degrees(np.arccos(np.clip(np.sum(unit(st, side + 'UpperLeg', side + 'LowerLeg') * unit(st, side + 'LowerLeg', side + 'Foot'), axis=1), -1, 1)))


def score(m, zero_g=False):
    s = 10.0
    s -= min(4, m['snaps'] * 0.8)
    s -= min(2, m['hingeFlips'] * 0.3)
    s -= min(1.5, m['hyper'] / 30.0)
    s -= min(1.5, m['jitterReversals'] / 20.0)
    if m.get('belowFloorCm', 0) > 3: s -= min(1, (m['belowFloorCm'] - 3) / 10)
    if zero_g and m['chairSeconds'] > 1.5: s -= 1
    return round(max(0.0, s), 2)
