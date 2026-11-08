#!/usr/bin/env python
"""Builds the motion-matching index motion_match.mjs searches: every clip of a fetched library (Director/gen/mocap/<source>/manifest.json)
retargeted onto his rig (tools/motion/stream.py) and turned into per-frame features at 30 fps (tools/motion/features.py).
   py Director/tools/motion_index.py cmu [--workers 6] [--limit N]
   py Director/tools/motion_index.py protofactor [--workers 4]          (FBX: Blender bakes the bones first, 40 clips a Blender start)
   py Director/tools/motion_index.py mixamo                              (his own Assets/MusicVideo/Motion clips, so a clip can be the query)
   py Director/tools/motion_index.py stats
Writes Director/gen/mocap/index/<source>/<clip>.f32 (float32 [frames, 50]), <clip>.npz (the canonical stream, so a match can be cut and admitted
without going back to the source) and index/<source>.json (clips: id, frames, offsets, tags, description; the z-score mean and std)."""
import argparse, json, os, subprocess, sys, tempfile, time
from concurrent.futures import ProcessPoolExecutor
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); PROJECT = os.path.dirname(ROOT)
sys.path.insert(0, HERE)
from motion import stream as S, features as FE  # noqa: E402

MOCAP = os.path.join(ROOT, 'gen', 'mocap'); INDEX = os.path.join(MOCAP, 'index')
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
BRIDGE = os.path.join(HERE, 'motion', 'blender_bridge.py')


def do_bvh(args):
    src, clip, path, out_dir = args
    try:
        st = S.from_bvh(path)
        c = S.to_canonical(st, S.MAPS[S_MAP[src]], rest_frame=0)
        c = c.resample(30.0)
        if src == 'cmu': c = c.cut(1, c.frames)            # frame 0 is the added T-pose
        f = FE.features(c)
        c.meta.update({'source': src, 'clip': clip})
        c.save(os.path.join(out_dir, clip + '.npz'))
        f.astype('<f4').tofile(os.path.join(out_dir, clip + '.f32'))
        return {'id': clip, 'frames': int(f.shape[0]), 'ok': True}
    except Exception as e:  # noqa: BLE001
        return {'id': clip, 'ok': False, 'error': str(e)[:200]}


def do_npz(args):
    """A Blender-baked FBX stream (.npz with rest_pos/rest_quat) onto his rig."""
    src, clip, path, out_dir = args
    try:
        z = np.load(path)
        st = S.Stream([str(n) for n in z['names']], [int(p) for p in z['parents']], z['pos'], z['quat'], float(z['fps']))
        st2 = S.Stream(st.names, st.parents, np.concatenate([z['rest_pos'][None], st.pos]), np.concatenate([z['rest_quat'][None], st.quat]), st.fps)
        c = S.to_canonical(st2, S.MAPS[S_MAP[src]], rest_frame=0).cut(1, st2.frames)
        f = FE.features(c)
        c.meta.update({'source': src, 'clip': clip})
        c.save(os.path.join(out_dir, clip + '.npz'))
        f.astype('<f4').tofile(os.path.join(out_dir, clip + '.f32'))
        return {'id': clip, 'frames': int(f.shape[0]), 'ok': True}
    except Exception as e:  # noqa: BLE001
        return {'id': clip, 'ok': False, 'error': str(e)[:200]}


S_MAP = {'cmu': 'cmu', 'protofactor': 'protofactor', 'mixamo': 'mixamo'}


def bake_fbx(files, out_dir, workers=4, per=40):
    """Blender bakes FBX bones to .npz streams, `per` files a Blender start, `workers` Blenders at once."""
    jobs = []
    for f in files:
        out = os.path.join(out_dir, os.path.splitext(os.path.basename(f))[0].split('@', 1)[-1] + '.raw.npz')
        if not os.path.exists(out): jobs.append({'op': 'fbx2stream', 'in': f, 'out': out, 'fps': 30})
    batches = [jobs[i:i + per] for i in range(0, len(jobs), per)]
    print(f'blender: {len(jobs)} files in {len(batches)} batches', flush=True)
    procs = []
    for bi, batch in enumerate(batches):
        jp = os.path.join(tempfile.gettempdir(), f'tk_bridge_{os.getpid()}_{bi}.json'); json.dump(batch, open(jp, 'w'))
        procs.append((jp, subprocess.Popen([BLENDER, '-b', '--python', BRIDGE, '--', jp], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)))
        while sum(p.poll() is None for _, p in procs) >= workers: time.sleep(0.5)
        done = sum(p.poll() is not None for _, p in procs); print(f'  batch {bi + 1}/{len(batches)} started, {done} done', flush=True)
    for _, p in procs: p.wait()
    bad = []
    for jp, _ in procs:
        try:
            for r in json.load(open(jp + '.result.json')):
                if not r['ok']: bad.append(r)
        except Exception: pass
    return bad


def build(src, workers=6, limit=None):
    mf = json.load(open(os.path.join(MOCAP, src, 'manifest.json'), encoding='utf8')) if src != 'mixamo' else mixamo_manifest()
    out_dir = os.path.join(INDEX, src); os.makedirs(out_dir, exist_ok=True)
    clips = mf['clips'][:limit] if limit else mf['clips']
    todo = [c for c in clips if not os.path.exists(os.path.join(out_dir, c['id'] + '.f32'))]
    print(f'{src}: {len(clips)} clips, {len(todo)} to do', flush=True)
    results = []
    if src == 'cmu':
        tasks = [(src, c['id'], os.path.join(MOCAP, src, c['file']), out_dir) for c in todo]
        with ProcessPoolExecutor(workers) as ex:
            for i, r in enumerate(ex.map(do_bvh, tasks, chunksize=4)):
                results.append(r)
                if (i + 1) % 100 == 0: print(f'  {i + 1}/{len(tasks)}', flush=True)
    else:
        files = [os.path.join(MOCAP, src, c['file']) if src != 'mixamo' else c['file'] for c in todo]
        bad = bake_fbx(files, out_dir, workers=min(workers, 4))
        if bad: print('blender failed on', len(bad), bad[:3])
        tasks = [(src, c['id'], os.path.join(out_dir, c['id'] + '.raw.npz'), out_dir) for c in todo if os.path.exists(os.path.join(out_dir, c['id'] + '.raw.npz'))]
        with ProcessPoolExecutor(workers) as ex:
            for i, r in enumerate(ex.map(do_npz, tasks, chunksize=4)):
                results.append(r)
                if (i + 1) % 100 == 0: print(f'  {i + 1}/{len(tasks)}', flush=True)
    bad = [r for r in results if not r['ok']]
    if bad: print('failed:', len(bad), bad[:5])
    write_index(src, mf, out_dir)


def mixamo_manifest():
    d = os.path.join(PROJECT, 'Assets', 'MusicVideo', 'Motion')
    clips = []
    for f in sorted(os.listdir(d)):
        if f.lower().endswith('.fbx'):
            cid = os.path.splitext(f)[0].split('@', 1)[-1]
            clips.append({'id': cid, 'file': os.path.join(d, f), 'description': cid.replace('_', ' '), 'tags': []})
    return {'source': 'mixamo', 'clips': clips, 'licence': 'Mixamo (Adobe) for use in projects'}


def write_index(src, mf, out_dir):
    rows = []; sums = np.zeros(FE.FEATURE_DIM); sq = np.zeros(FE.FEATURE_DIM); n = 0
    by = {c['id']: c for c in mf['clips']}
    for f in sorted(os.listdir(out_dir)):
        if not f.endswith('.f32'): continue
        cid = f[:-4]; a = np.fromfile(os.path.join(out_dir, f), dtype='<f4').reshape(-1, FE.FEATURE_DIM)
        if not len(a): continue
        sums += a.sum(0); sq += (a.astype(np.float64) ** 2).sum(0); n += len(a)
        c = by.get(cid, {})
        rows.append({'id': cid, 'frames': int(len(a)), 'seconds': round(len(a) / 30.0, 2), 'description': c.get('description', cid), 'tags': c.get('tags', []),
                     'file': c.get('file', ''), **({'animset': c['animset']} if 'animset' in c else {}), **({'subject': c['subject']} if 'subject' in c else {})})
    mean = sums / max(n, 1); std = np.sqrt(np.maximum(sq / max(n, 1) - mean ** 2, 1e-8))
    idx = {'source': src, 'fps': 30, 'dim': FE.FEATURE_DIM, 'names': FE.NAMES, 'weights': [float(w) for w in FE.WEIGHTS], 'mean': [float(x) for x in mean],
           'std': [float(x) for x in std], 'frames': n, 'licence': mf.get('licence', ''), 'clips': rows}
    json.dump(idx, open(os.path.join(INDEX, src + '.json'), 'w', encoding='utf8'))
    print(f'{src}: index of {len(rows)} clips, {n} frames ({n / 30 / 60:.1f} min) -> {os.path.join(INDEX, src + ".json")}')


def stats():
    for f in sorted(os.listdir(INDEX)) if os.path.exists(INDEX) else []:
        if f.endswith('.json'):
            d = json.load(open(os.path.join(INDEX, f))); print(f"{d['source']}: {len(d['clips'])} clips, {d['frames'] / 30 / 60:.1f} min")


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('source'); ap.add_argument('--workers', type=int, default=6); ap.add_argument('--limit', type=int)
    a = ap.parse_args()
    if a.source == 'stats': stats()
    else: build(a.source, a.workers, a.limit)
