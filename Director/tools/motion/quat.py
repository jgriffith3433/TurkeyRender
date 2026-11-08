"""Quaternions as numpy arrays [..., 4] in (x, y, z, w) order, vectorised. The one convention every motion tool here shares.
Rotation matrices act on column vectors; euler helpers follow BVH channel order (intrinsic, in the order the channels name)."""
import numpy as np

def normalize(q):
    n = np.linalg.norm(q, axis=-1, keepdims=True)
    n[n == 0] = 1
    return q / n

def mul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0)
    bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by,
                     aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw,
                     aw * bw - ax * bx - ay * by - az * bz], axis=-1)

def inv(q):
    r = q.copy(); r[..., :3] *= -1
    return r

def rotate(q, v):
    """Rotate vectors v [..., 3] by quaternions q [..., 4]."""
    u = q[..., :3]; w = q[..., 3:4]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)

def from_axis_angle(axis, angle_rad):
    axis = np.asarray(axis, dtype=float)
    axis = axis / (np.linalg.norm(axis, axis=-1, keepdims=True) + 1e-12)
    s = np.sin(np.asarray(angle_rad) / 2)[..., None]
    return np.concatenate([axis * s, np.cos(np.asarray(angle_rad) / 2)[..., None]], axis=-1)

def from_rotvec(r):
    r = np.asarray(r, dtype=float)
    th = np.linalg.norm(r, axis=-1, keepdims=True)
    small = th[..., 0] < 1e-9
    k = np.where(small[..., None], 0.5, np.sin(th / 2) / np.where(th == 0, 1, th))
    return np.concatenate([r * k, np.cos(th / 2)], axis=-1)

def to_rotvec(q):
    q = np.where(q[..., 3:4] < 0, -q, q)
    s = np.linalg.norm(q[..., :3], axis=-1, keepdims=True)
    ang = 2 * np.arctan2(s[..., 0], q[..., 3])
    k = np.where(s[..., 0] < 1e-9, 2.0, ang / np.where(s[..., 0] == 0, 1, s[..., 0]))
    return q[..., :3] * k[..., None]

def angle(q):
    """Rotation angle in radians, shortest way."""
    return np.linalg.norm(to_rotvec(q), axis=-1)

def between(a, b):
    """Shortest rotation taking direction a to direction b (both [..., 3])."""
    a = a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-12)
    b = b / (np.linalg.norm(b, axis=-1, keepdims=True) + 1e-12)
    c = np.cross(a, b); d = np.sum(a * b, axis=-1, keepdims=True)
    q = np.concatenate([c, 1 + d], axis=-1)
    flip = d[..., 0] < -0.99999
    if np.any(flip):
        o = np.cross(a[flip], np.where(np.abs(a[flip][..., :1]) < 0.9, [1, 0, 0], [0, 1, 0]))
        o = o / np.linalg.norm(o, axis=-1, keepdims=True)
        q[flip] = np.concatenate([o, np.zeros(o.shape[:-1] + (1,))], axis=-1)
    return normalize(q)

def to_matrix(q):
    x, y, z, w = np.moveaxis(q, -1, 0)
    m = np.empty(q.shape[:-1] + (3, 3))
    m[..., 0, 0] = 1 - 2 * (y * y + z * z); m[..., 0, 1] = 2 * (x * y - z * w); m[..., 0, 2] = 2 * (x * z + y * w)
    m[..., 1, 0] = 2 * (x * y + z * w); m[..., 1, 1] = 1 - 2 * (x * x + z * z); m[..., 1, 2] = 2 * (y * z - x * w)
    m[..., 2, 0] = 2 * (x * z - y * w); m[..., 2, 1] = 2 * (y * z + x * w); m[..., 2, 2] = 1 - 2 * (x * x + y * y)
    return m

def from_matrix(m):
    m = np.asarray(m)
    t = np.trace(m, axis1=-2, axis2=-1)
    q = np.empty(m.shape[:-2] + (4,))
    # Shepperd's method, branch on the largest diagonal term, vectorised with masks
    d = np.stack([m[..., 0, 0], m[..., 1, 1], m[..., 2, 2], t], axis=-1)
    c = np.argmax(d, axis=-1)
    for case in range(4):
        sel = c == case
        if not np.any(sel): continue
        mm = m[sel]
        if case == 3:
            s = np.sqrt(1 + t[sel]) * 2
            q[sel] = np.stack([(mm[..., 2, 1] - mm[..., 1, 2]) / s, (mm[..., 0, 2] - mm[..., 2, 0]) / s, (mm[..., 1, 0] - mm[..., 0, 1]) / s, s / 4], -1)
        elif case == 0:
            s = np.sqrt(1 + mm[..., 0, 0] - mm[..., 1, 1] - mm[..., 2, 2]) * 2
            q[sel] = np.stack([s / 4, (mm[..., 0, 1] + mm[..., 1, 0]) / s, (mm[..., 0, 2] + mm[..., 2, 0]) / s, (mm[..., 2, 1] - mm[..., 1, 2]) / s], -1)
        elif case == 1:
            s = np.sqrt(1 + mm[..., 1, 1] - mm[..., 0, 0] - mm[..., 2, 2]) * 2
            q[sel] = np.stack([(mm[..., 0, 1] + mm[..., 1, 0]) / s, s / 4, (mm[..., 1, 2] + mm[..., 2, 1]) / s, (mm[..., 0, 2] - mm[..., 2, 0]) / s], -1)
        else:
            s = np.sqrt(1 + mm[..., 2, 2] - mm[..., 0, 0] - mm[..., 1, 1]) * 2
            q[sel] = np.stack([(mm[..., 0, 2] + mm[..., 2, 0]) / s, (mm[..., 1, 2] + mm[..., 2, 1]) / s, s / 4, (mm[..., 1, 0] - mm[..., 0, 1]) / s], -1)
    return normalize(q)

_AX = {'X': np.array([1., 0, 0]), 'Y': np.array([0, 1., 0]), 'Z': np.array([0, 0, 1.])}

def from_euler(order, deg):
    """order like 'ZXY' (BVH channel order), deg [..., 3] in that order. Intrinsic: R = R_o0 R_o1 R_o2."""
    deg = np.asarray(deg, dtype=float)
    q = None
    for i, ax in enumerate(order):
        r = from_axis_angle(_AX[ax], np.radians(deg[..., i]))
        q = r if q is None else mul(q, r)
    return q

def to_euler(order, q):
    """Inverse of from_euler for the three orders BVH files use most. Returns degrees [..., 3] in channel order."""
    m = to_matrix(q)
    o = order.upper()
    if o == 'ZXY':
        x = np.arcsin(np.clip(m[..., 2, 1], -1, 1))
        z = np.arctan2(-m[..., 0, 1], m[..., 1, 1]); y = np.arctan2(-m[..., 2, 0], m[..., 2, 2])
        return np.degrees(np.stack([z, x, y], -1))
    if o == 'ZYX':
        y = np.arcsin(np.clip(-m[..., 2, 0], -1, 1))
        z = np.arctan2(m[..., 1, 0], m[..., 0, 0]); x = np.arctan2(m[..., 2, 1], m[..., 2, 2])
        return np.degrees(np.stack([z, y, x], -1))
    if o == 'XYZ':
        y = np.arcsin(np.clip(m[..., 0, 2], -1, 1))
        x = np.arctan2(-m[..., 1, 2], m[..., 2, 2]); z = np.arctan2(-m[..., 0, 1], m[..., 0, 0])
        return np.degrees(np.stack([x, y, z], -1))
    if o == 'YXZ':
        x = np.arcsin(np.clip(-m[..., 1, 2], -1, 1))
        y = np.arctan2(m[..., 0, 2], m[..., 2, 2]); z = np.arctan2(m[..., 1, 0], m[..., 1, 1])
        return np.degrees(np.stack([y, x, z], -1))
    raise ValueError('euler order ' + order)

def continuous(q):
    """Flip signs along axis 0 so consecutive quaternions sit in the same hemisphere."""
    q = q.copy()
    for f in range(1, q.shape[0]):
        d = np.sum(q[f] * q[f - 1], axis=-1)
        q[f][d < 0] *= -1
    return q

def slerp(a, b, t):
    t = np.asarray(t, dtype=float)[..., None]
    d = np.sum(a * b, axis=-1, keepdims=True)
    b = np.where(d < 0, -b, b)
    return normalize(mul(a, from_rotvec(to_rotvec(mul(inv(a), b)) * t)))
