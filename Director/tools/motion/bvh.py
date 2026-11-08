"""BVH read and write, plain numpy. read() gives a Skeleton (names, parents, offsets, channel orders) plus local rotations and the
root path as arrays; write() takes the same back. Units are whatever the file says (CMU: inches/0.45; ours: metres)."""
import re
import numpy as np
from . import quat as Q


class Skeleton:
    def __init__(self):
        self.names, self.parents, self.offsets, self.orders, self.ends = [], [], [], [], {}

    def index(self, name):
        return self.names.index(name)

    def children(self, i):
        return [j for j, p in enumerate(self.parents) if p == i]


def read(path, max_frames=None):
    text = open(path, encoding='utf8', errors='replace').read()
    hi = text.index('HIERARCHY'); mi = text.index('MOTION')
    sk = Skeleton()
    chan_specs = []      # per joint: list of channel names
    stack = []
    cur = None
    for line in text[hi:mi].splitlines():
        t = line.strip()
        if not t: continue
        w = t.split()
        if w[0] in ('ROOT', 'JOINT'):
            name = ' '.join(w[1:])
            sk.names.append(name); sk.parents.append(stack[-1] if stack else -1); sk.offsets.append([0, 0, 0]); sk.orders.append('')
            chan_specs.append([])
            cur = len(sk.names) - 1
        elif w[0] == 'End':
            cur = -2
        elif w[0] == '{':
            stack.append(cur if cur != -2 else stack[-1] if stack else -1)
            if cur == -2: stack[-1] = -2 - stack[-2] if False else stack[-1]
        elif w[0] == '}':
            stack.pop()
            cur = stack[-1] if stack else None
        elif w[0] == 'OFFSET':
            off = [float(x) for x in w[1:4]]
            if cur == -2: sk.ends[stack[-1]] = off
            else: sk.offsets[cur] = off
        elif w[0] == 'CHANNELS':
            chan_specs[cur] = w[2:2 + int(w[1])]
    sk.offsets = np.array(sk.offsets, dtype=float)
    for i, cs in enumerate(chan_specs):
        sk.orders[i] = ''.join(c[0] for c in cs if c.endswith('rotation'))
    m = re.search(r'Frames:\s*(\d+)\s*Frame Time:\s*([0-9.eE+-]+)', text[mi:])
    frames = int(m.group(1)); dt = float(m.group(2))
    body = text[mi + m.end():]
    nch = sum(len(c) for c in chan_specs)
    vals = np.array(body.split(), dtype=float)
    vals = vals[: (len(vals) // nch) * nch].reshape(-1, nch)
    if max_frames: vals = vals[:max_frames]
    frames = len(vals)
    J = len(sk.names)
    rot = np.zeros((frames, J, 4)); rot[..., 3] = 1
    pos = np.zeros((frames, J, 3))
    has_pos = np.zeros(J, bool)
    c = 0
    for i, cs in enumerate(chan_specs):
        pcols, rcols = [], []
        for k, ch in enumerate(cs):
            (pcols if ch.endswith('position') else rcols).append((ch[0], c + k))
        if pcols:
            has_pos[i] = True
            for ax, col in pcols: pos[:, i, 'XYZ'.index(ax)] = vals[:, col]
        if rcols:
            order = ''.join(ax for ax, _ in rcols)
            deg = np.stack([vals[:, col] for _, col in rcols], -1)
            rot[:, i] = Q.from_euler(order, deg)
        c += len(cs)
    return sk, rot, pos, has_pos, 1.0 / dt


def fk(sk, rot, pos, has_pos, scale=1.0):
    """World positions [F, J, 3] and world rotations [F, J, 4]. Joints without position channels sit at their offset."""
    F, J = rot.shape[:2]
    wq = np.zeros((F, J, 4)); wp = np.zeros((F, J, 3))
    for i in range(J):
        p = sk.parents[i]
        local_p = (pos[:, i] if has_pos[i] else np.broadcast_to(sk.offsets[i], (F, 3))) * scale
        if i == 0 or p < 0:
            wq[:, i] = rot[:, i]; wp[:, i] = local_p
        else:
            wq[:, i] = Q.mul(wq[:, p], rot[:, i]); wp[:, i] = wp[:, p] + Q.rotate(wq[:, p], local_p)
    return wp, wq


def write(path, names, parents, offsets, rot_local, root_pos, fps, ends=None, order='ZXY'):
    """rot_local [F, J, 4] (x,y,z,w), root_pos [F, 3]. Every joint gets 3 rotation channels; the root also 3 positions."""
    F, J = rot_local.shape[:2]
    kids = [[j for j, p in enumerate(parents) if p == i] for i in range(J)]
    chan = {'Z': 'Zrotation', 'X': 'Xrotation', 'Y': 'Yrotation'}
    rotchan = ' '.join(chan[c] for c in order)
    lines = ['HIERARCHY']

    def emit(i, depth):
        ind = '\t' * depth
        lines.append(f"{ind}{'ROOT' if parents[i] < 0 else 'JOINT'} {names[i]}")
        lines.append(ind + '{')
        lines.append(f"{ind}\tOFFSET {offsets[i][0]:.6f} {offsets[i][1]:.6f} {offsets[i][2]:.6f}")
        lines.append(f"{ind}\tCHANNELS {'6 Xposition Yposition Zposition ' if parents[i] < 0 else '3 '}{rotchan}")
        if kids[i]:
            for k in kids[i]: emit(k, depth + 1)
        else:
            e = (ends or {}).get(names[i], [0, 0.05, 0])
            lines.append(f"{ind}\tEnd Site\n{ind}\t{{\n{ind}\t\tOFFSET {e[0]:.6f} {e[1]:.6f} {e[2]:.6f}\n{ind}\t}}")
        lines.append(ind + '}')
    roots = [i for i in range(J) if parents[i] < 0]
    emit(roots[0], 0)
    lines.append('MOTION'); lines.append(f'Frames: {F}'); lines.append(f'Frame Time: {1.0 / fps:.6f}')
    eul = Q.to_euler(order, Q.continuous(rot_local))
    # unwrap each channel so a 179 -> -179 step doesn't read as a snap downstream
    out = np.zeros((F, 3 + 3 * J))
    out[:, :3] = root_pos
    for i in range(J):
        out[:, 3 + 3 * i: 6 + 3 * i] = eul[:, i]
    lines.append('\n'.join(' '.join(f'{v:.5f}' for v in row) for row in out))
    open(path, 'w', encoding='utf8', newline='\n').write('\n'.join(lines) + '\n')
