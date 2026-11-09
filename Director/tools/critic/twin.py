#!/usr/bin/env python
"""The critic's headless twin (roadmap item 2, first step): turns any motion we can load outside Unity (a canonical .npz from the
sim or a motion-match cut, a CMU / SOMA / Mixamo .bvh, an .fbx through Blender) into the critic's dump format, so
`critic.mjs dump` scores it without a Unity turn.

How it maps: the canonical stream (tools/motion/stream.py: his 21-joint rig, BVH space, world rotations relative to his T-pose)
becomes local rotations relative to the T-pose (q) and actor-frame positions (p), mirrored from BVH space (right-handed, his left +X)
into Unity space (left-handed, his left -X): x -> -x, quaternion (x,y,z,w) -> (x,-y,-z,w). The rest pose is identity (T-pose).
The critic's angular measures read one-frame steps of local rotations, which a constant rest offset does not change, and its
positional measures read joint positions, so a twin dump and a Unity dump of the same motion should score alike. Not carried:
fingers (no finger data in the sources: the hands principle sees no fingers rather than "fingers never move"), eyes, jaw.

   py -I Director/tools/critic/twin.py <src> <out.json> [--start s --end s --fps 30 --name x]
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); TOOLS = os.path.dirname(HERE)
sys.path.insert(0, TOOLS)
import motion_query as MQ  # noqa: E402
from motion import stream as S  # noqa: E402


def to_dump(st, name):
    rig = S.load_rig()
    loc = S.canonical_local(st, rig)                       # [F, J, 4] x,y,z,w
    pos = st.pos.astype(float)
    mq = loc.copy(); mq[..., 1] *= -1; mq[..., 2] *= -1      # mirror X: (x,-y,-z,w)
    mp = pos.copy(); mp[..., 0] *= -1
    frames = []
    for f in range(st.frames):
        frames.append({'t': round(f / st.fps, 5), 'q': np.round(mq[f], 5).tolist(), 'p': np.round(mp[f], 4).tolist(), 'root': [0, 0, 0, 0, 0, 0, 1]})
    return {'clip': name, 'twin': True, 'fps': st.fps, 'native': None, 'bones': list(S.CANON), 'frames': frames,
            'rest': {b: [0, 0, 0, 1] for b in S.CANON}, 'curl': {}, 'source': st.meta.get('source'), 'length': round(st.seconds, 3)}


def main():
    a = sys.argv[1:]
    src, out = a[0], a[1]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    fps = float(opt('--fps', 30))
    st = MQ.load_any(src).resample(fps)
    s0, s1 = opt('--start'), opt('--end')
    if s0 or s1: st = st.cut(int(float(s0 or 0) * fps), min(st.frames, int(float(s1) * fps) + 1 if s1 else st.frames))
    name = opt('--name', os.path.splitext(os.path.basename(src))[0].replace('Humanoid@', ''))
    d = to_dump(st, name)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    json.dump(d, open(out, 'w', encoding='utf8'), separators=(',', ':'))
    print(json.dumps({'out': out, 'frames': st.frames, 'seconds': round(st.seconds, 2)}))


if __name__ == '__main__':
    main()
