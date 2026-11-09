#!/usr/bin/env python
"""The Python half of motion_match.mjs: turns a query into features, and cuts a chosen segment out of the index into a canonical stream.
   py Director/tools/motion_query.py features <clip.npz|clip.bvh|Humanoid@x.fbx|<index-source>/<clip-id>> <out.f32> [--start s --end s]
       writes the query's features (float32 [frames, 50], 30 fps) and prints JSON {frames}. An FBX goes through Blender first.
   py Director/tools/motion_query.py cut <source> <clip-id> <start-s> <end-s> <out.npz>
       the segment of an indexed clip as a canonical stream (what motion_admit.py takes).
   py Director/tools/motion_query.py fit <query> <start> <end> <cand...>   each candidate's best match distance to the query window (JSON)
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
        if 'left_hip' in names:
            # NOT SOLVED (2026-11-08): HY-Motion's SMPL BVH (motion.from-text with no character) faces -Z with its left at +X and its arms
            # come out crossed through the chest under plain FK in either Euler order, so the retarget is wrong. Refuse rather than rank
            # broken motion; get these takes retargeted by Gen (blender.character with the GEN-BUGS bone map) until this is understood.
            if os.environ.get('TK_SMPL_EXPERIMENT') != '1':
                raise SystemExit('SMPL BVH (HY-Motion) import is not solved: arms cross under FK; see GEN-BUGS.md 7')
            st = S.from_bvh(path, prepend_rest=True)
            # HY-Motion's SMPL BVH comes front-to-back mirrored against BVH space (toes behind the heels, hands crossed): reflect Z
            pos = st.pos.copy(); pos[..., 2] *= -1; qq = st.quat.copy(); qq[..., 0] *= -1; qq[..., 1] *= -1
            st = S.Stream(st.names, st.parents, pos, qq, st.fps, st.meta)
            return S.to_canonical(st, S.MAPS['smpl'], rest_frame=0).cut(1, st.frames)
        if 'LHipJoint' in names: return S.to_canonical(st, S.MAPS['cmu'], rest_frame=0).cut(1, st.frames)
        if 'LeftUpLeg' in names: return S.to_canonical(st, S.MAPS['mixamo'], rest_frame=0)
        return S.to_canonical(st, S.MAPS['unity'], rest_frame=0)
    if low.endswith('.json'):
        return from_dump(path)
    if low.endswith('.fbx'):
        out = os.path.join(tempfile.gettempdir(), 'tk_query_' + os.path.basename(path) + '.npz')
        jp = out + '.jobs.json'; json.dump([{'op': 'fbx2stream', 'in': path, 'out': out, 'fps': 30}], open(jp, 'w'))
        subprocess.run([BLENDER, '-b', '--python', BRIDGE, '--', jp], check=True, capture_output=True)
        return load_any(out)
    raise SystemExit('what is ' + path)


def from_dump(path):
    """A critic bone dump (Unity `call clipbones`, e.g. a keyed hp_ pose sheet's derived clip in gen/critic/clips/) as a canonical stream for a
    motion-matching query: joint positions mirrored back to BVH space (x -> -x); the only rotations the features read (hips yaw, chest up) are
    rebuilt from the positions (hip line and spine), the rest left at identity. Lets an approved pose sheet seed a search over real mocap."""
    from motion import quat as Q
    d = json.load(open(path, encoding='utf8'))
    bi = {b: i for i, b in enumerate(d['bones'])}
    P = np.array([[f['p'][bi[n]] for n in S.CANON] for f in d['frames']], dtype=float); P[..., 0] *= -1
    F = len(P); quat = np.zeros((F, len(S.CANON), 4)); quat[..., 3] = 1
    ci = S.CANON.index
    lr = P[:, ci('LeftUpperLeg')] - P[:, ci('RightUpperLeg')]          # his left is +X in BVH space
    fwd = np.cross(lr, np.array([0, 1.0, 0])); fwd[:, 1] = 0; fwd /= np.linalg.norm(fwd, axis=1, keepdims=True) + 1e-9
    yaw = np.arctan2(fwd[:, 0], fwd[:, 2])
    quat[:, ci('Hips')] = Q.from_axis_angle(np.array([0, 1.0, 0]), yaw)
    up = P[:, ci('Neck')] - P[:, ci('Spine')]; up /= np.linalg.norm(up, axis=1, keepdims=True) + 1e-9
    quat[:, ci('Chest')] = Q.between(np.tile([0, 1.0, 0], (F, 1)), up)
    fps = d.get('fps') or 30
    return S.Stream(S.CANON, _parents(), P, quat, fps, {'source': 'dump', 'clip': d.get('clip')})


def _parents():
    rj = {j['name']: j for j in S.load_rig()['joints']}
    return [S.CANON.index(rj[n]['parent']) if rj[n]['parent'] else -1 for n in S.CANON]


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
    elif cmd == 'fit':
        # how well each candidate fits the beat: the best motion-matching distance between the query window and any window of the candidate
        # (same features, the CMU index's normalisation and weights, 0.8/1/1.25 time warps). A candidate shorter than the query is stretched to it.
        q, a, b = sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
        idx = json.load(open(os.path.join(INDEX, 'cmu.json'), encoding='utf8'))
        mean, std, w = (np.array(idx[k], dtype=float) for k in ('mean', 'std', 'weights'))
        upper = '--upper' in sys.argv; sys.argv = [x for x in sys.argv if x != '--upper']
        if upper:   # zero-g beats: hands, elbows, head and chest only, heights taken from the hips (a float has no floor to stand on)
            w = w.copy(); w[[*range(6, 12), *range(21, 27), *range(33, 39), *range(42, 47)]] = 0
        def norm(f):
            if upper: f = f.copy(); f[:, [1, 4, 13, 16, 19]] -= f[:, [46]]
            return (f - mean) / std * w
        qs = load_any(q).resample(30.0); qs = qs.cut(int(a * 30), min(qs.frames, int(b * 30) + 1)); Qn = norm(FE.features(qs)); n0 = len(Qn); keep = w > 0; Qn = Qn[:, keep]
        out = {}
        for c in sys.argv[5:]:
            try:
                L = norm(FE.features(load_any(c).resample(30.0)))[:, keep]; best = 1e9
                for k in (0.8, 1.0, 1.25):
                    n = max(4, int(round(n0 * k))); t = np.linspace(0, n0 - 1, n); i0 = np.floor(t).astype(int); i1 = np.minimum(i0 + 1, n0 - 1); fr = (t - i0)[:, None]
                    V = Qn[i0] * (1 - fr) + Qn[i1] * fr
                    if len(L) < n:
                        tt = np.linspace(0, len(L) - 1, n); j0 = np.floor(tt).astype(int); j1 = np.minimum(j0 + 1, len(L) - 1); g = (tt - j0)[:, None]
                        best = min(best, float(np.sqrt(np.mean(((L[j0] * (1 - g) + L[j1] * g) - V) ** 2)))); continue
                    for s0 in range(0, len(L) - n + 1, 3):
                        best = min(best, float(np.sqrt(np.mean((L[s0:s0 + n] - V) ** 2))))
                out[c] = round(best, 3)
            except Exception as e:  # noqa: BLE001
                out[c] = None
        print(json.dumps(out))
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
