#!/usr/bin/env python
"""Joins real clips end to end on his rig (canonical streams), the way an animator would cut two takes together: the second clip is turned
and moved so its hips start where the first one's are (yaw and ground position), and the join is a short blend of the local rotations
(slerp) and the hips path over --blend frames, so no frame jumps. Each part can be trimmed. The critic judges the join afterwards
(`critic.mjs twin` on the result): a splice is only kept if no snap or pop lands in the blend.
   py -I Director/tools/motion_splice.py out.npz <src>@a-b <src>@a-b [...] [--blend 6]
<src> is anything motion_query.load_any reads (.npz, .bvh, .fbx, index ids like protofactor/Cheer1)."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import motion_query as MQ  # noqa: E402
from motion import stream as S, quat as Q  # noqa: E402


def part(spec):
    src, _, rng = spec.rpartition('@') if '@' in spec else (spec, '', '')
    st = MQ.load_any(src).resample(30.0)
    if rng:
        a, b = rng.split('-'); a = float(a or 0); b = float(b) if b else st.seconds
        st = st.cut(int(round(a * 30)), min(st.frames, int(round(b * 30)) + 1))
    return st


def yaw_of(q_hips):
    f = Q.rotate(q_hips, np.array([0, 0, 1.0])); return float(np.arctan2(f[0], f[2]))


def splice(parts, blend=6):
    rig = S.load_rig()
    out_loc = S.canonical_local(parts[0], rig); out_root = parts[0].pos[:, 0].astype(float).copy()
    for st in parts[1:]:
        loc = S.canonical_local(st, rig); root = st.pos[:, 0].astype(float).copy()
        # turn and move the new part so its first frame faces and stands where the last frame of what we have does
        last_q = out_loc[-1, 0]; dy = yaw_of(last_q) - yaw_of(loc[0, 0])
        turn = Q.from_axis_angle(np.array([0, 1.0, 0]), np.array(dy))
        loc[:, 0] = Q.mul(np.broadcast_to(turn, loc[:, 0].shape), loc[:, 0])
        rel = Q.rotate(np.broadcast_to(turn, (len(root), 4)), root - root[0])
        root = out_root[-1] + rel
        root[:, 1] = st.pos[:, 0, 1]                                   # keep the new part's own hip height (a blend below covers the step)
        n = min(blend, len(out_loc) - 1, len(loc) - 1)
        if n > 0:
            w = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n)))[:, None]   # ease in and out across the join
            A = Q.continuous(out_loc[-n:]); B = loc[:n]
            mixed = np.stack([Q.slerp(A[k], B[k], float(w[k, 0])) for k in range(n)])
            mroot = out_root[-n:] * (1 - w) + root[:n] * w
            out_loc = np.concatenate([out_loc[:-n], mixed, loc[n:]]); out_root = np.concatenate([out_root[:-n], mroot, root[n:]])
        else:
            out_loc = np.concatenate([out_loc, loc]); out_root = np.concatenate([out_root, root])
    # world rotations from the local chain, positions on his skeleton
    rj = {j['name']: j for j in rig['joints']}; wq = np.zeros_like(out_loc)
    for ci, c in enumerate(S.CANON):
        p = rj[c]['parent']; wq[:, ci] = out_loc[:, ci] if not p else Q.mul(wq[:, S.CANON.index(p)], out_loc[:, ci])
    pos = S.fk_canonical(wq, out_root, rig)
    return S.Stream(S.CANON, [S.CANON.index(rj[n]['parent']) if rj[n]['parent'] else -1 for n in S.CANON], pos, wq, 30.0, {'source': 'splice'})


def main():
    a = sys.argv[1:]; out = a[0]
    blend = int(a[a.index('--blend') + 1]) if '--blend' in a else 6
    specs = [x for i, x in enumerate(a[1:], 1) if not x.startswith('--') and (a[i - 1] != '--blend')]
    st = splice([part(s) for s in specs], blend)
    st.meta.update({'parts': specs, 'blend': blend}); st.save(out)
    print(f'{out}: {st.frames} frames, {st.seconds:.2f} s from {len(specs)} parts')


if __name__ == '__main__':
    main()
