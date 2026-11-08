#!/usr/bin/env python
"""The Python half of motion_match.mjs: turns a query into features, and cuts a chosen segment out of the index into a canonical stream.
   py Director/tools/motion_query.py features <clip.npz|clip.bvh|Humanoid@x.fbx|<index-source>/<clip-id>> <out.f32> [--start s --end s]
       writes the query's features (float32 [frames, 50], 30 fps) and prints JSON {frames}. An FBX goes through Blender first.
   py Director/tools/motion_query.py cut <source> <clip-id> <start-s> <end-s> <out.npz>
       the segment of an indexed clip as a canonical stream (what motion_admit.py takes).
   py Director/tools/motion_query.py pose <out.f32> hipFlex=40 knee=45 ...   one held pose from research angles, 1 s of it, as a query."""
import json, os, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); PROJECT = os.path.dirname(ROOT)
sys.path.insert(0, HERE)
from motion import stream as S, features as FE  # noqa: E402

INDEX = os.path.join(ROOT, 'gen', 'mocap', 'index')
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
BRIDGE = os.path.join(HERE, 'motion', 'blender_bridge.py')


def load_any(path):
    """A canonical stream from a .npz (canonical or Blender-baked), a .bvh (CMU or canonical names) or an .fbx (Mixamo, his clips, PROTOFACTOR)."""
    if not os.path.exists(path) and os.path.exists(os.path.join(PROJECT, path)): path = os.path.join(PROJECT, path)
    low = path.lower()
    if '/' in path and not os.path.exists(path) and not low.endswith(('.npz', '.bvh', '.fbx')):
        src, cid = path.split('/', 1)
        return S.Stream.load(os.path.join(INDEX, src, cid + '.npz'))
    if low.endswith('.npz'):
        z = np.load(path)
        if 'rest_pos' in z:
            st = S.Stream([str(n) for n in z['names']], [int(p) for p in z['parents']], z['pos'], z['quat'], float(z['fps']))
            st2 = S.Stream(st.names, st.parents, np.concatenate([z['rest_pos'][None], st.pos]), np.concatenate([z['rest_quat'][None], st.quat]), st.fps)
            mp = 'protofactor' if any('humanoid_' in n for n in st.names) else 'mixamo'
            return S.to_canonical(st2, S.MAPS[mp], rest_frame=0).cut(1, st2.frames)
        return S.Stream.load(path)
    if low.endswith('.bvh'):
        st = S.from_bvh(path)
        names = set(n.split(':')[-1] for n in st.names)
        if 'LeftShin' in names:
            st = S.from_bvh(path, scale=0.01, prepend_rest=True)
            return S.to_canonical(st, S.MAPS['soma'], rest_frame=0).cut(1, st.frames)
        if 'LHipJoint' in names: return S.to_canonical(st, S.MAPS['cmu'], rest_frame=0).cut(1, st.frames)
        if 'LeftUpLeg' in names: return S.to_canonical(st, S.MAPS['mixamo'], rest_frame=0)
        return S.to_canonical(st, S.MAPS['unity'], rest_frame=0)
    if low.endswith('.fbx'):
        out = os.path.join(tempfile.gettempdir(), 'tk_query_' + os.path.basename(path) + '.npz')
        jp = out + '.jobs.json'; json.dump([{'op': 'fbx2stream', 'in': path, 'out': out, 'fps': 30}], open(jp, 'w'))
        subprocess.run([BLENDER, '-b', '--python', BRIDGE, '--', jp], check=True, capture_output=True)
        return load_any(out)
    raise SystemExit('what is ' + path)


def main():
    cmd = sys.argv[1]
    if cmd == 'features':
        src, out = sys.argv[2], sys.argv[3]
        st = load_any(src).resample(30.0)
        args = sys.argv[4:]
        start = float(args[args.index('--start') + 1]) if '--start' in args else 0.0
        end = float(args[args.index('--end') + 1]) if '--end' in args else st.seconds
        st = st.cut(int(start * 30), min(st.frames, int(end * 30) + 1))
        f = FE.features(st); f.astype('<f4').tofile(out)
        print(json.dumps({'frames': int(f.shape[0]), 'seconds': round(f.shape[0] / 30, 2)}))
    elif cmd == 'cut':
        src, cid, a, b, out = sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
        st = S.Stream.load(os.path.join(INDEX, src, cid + '.npz'))
        seg = st.cut(int(a * st.fps), min(st.frames, int(b * st.fps) + 1))
        seg.meta.update({'source': src, 'clip': cid, 'start': a, 'end': b}); seg.save(out)
        print(json.dumps({'frames': seg.frames, 'seconds': round(seg.seconds, 2)}))
    elif cmd == 'pose':
        from motion import sim
        out = sys.argv[2]; kw = {k: float(v) for k, v in (a.split('=') for a in sys.argv[3:])}
        pose = sim.pose_from_angles(**kw)
        wq = np.zeros((30, len(S.CANON), 4)); rj = {j['name']: j for j in S.load_rig()['joints']}
        for ci, cname in enumerate(S.CANON):
            p = rj[cname]['parent']; wq[:, ci] = pose[cname] if not p else __import__('motion.quat', fromlist=['mul']).mul(wq[:, S.CANON.index(p)], np.broadcast_to(pose[cname], (30, 4)))
        pos = S.fk_canonical(wq, np.tile(np.array(rj['Hips']['head']), (30, 1)))
        st = S.Stream(S.CANON, [S.CANON.index(rj[n]['parent']) if rj[n]['parent'] else -1 for n in S.CANON], pos, wq, 30)
        FE.features(st).astype('<f4').tofile(out); print(json.dumps({'frames': 30}))


if __name__ == '__main__':
    main()
