#!/usr/bin/env python
"""Admits a motion made outside Unity to the clip library: canonical stream -> BVH on his skeleton (Mixamo joint names) -> FBX (Blender) ->
Assets/MusicVideo/Motion/Humanoid@<name>.fbx, with its provenance in Director/library/motion/sources.json. Then, with --unity (one
queue turn, import and preview only): `mv call clipimport` and `mv call cleanclips` on just these clips, catalog previews, catalog build.
   py Director/tools/motion_admit.py <clip.npz|clip.bvh> --name ps_punched_launch_a [--ground] [--source sim --note "..."]
   py Director/tools/motion_admit.py --sim <beat>                 the beat's kept candidates (gen/motion/sim/<beat>/keep/*.npz)
   py Director/tools/motion_admit.py --match <cut.npz> --name mm_cross_punch_a [--ground]
   py Director/tools/motion_admit.py --unity [names...]          the Unity turn for the named clips (or every clip admitted and not yet imported)
Names: ps_ physics sim, mm_ motion match (mocap library), vm_ motion from video (Hawkes Gen). --ground drops the clip so its lowest foot
frame sits on the floor (for clips that stand on something); zero-g clips keep their height."""
import argparse, json, os, shutil, subprocess, sys, tempfile, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); PROJECT = os.path.dirname(ROOT)
sys.path.insert(0, HERE)
from motion import stream as S, measure as M  # noqa: E402
import motion_query as MQ  # noqa: E402

MOTION = os.path.join(PROJECT, 'Assets', 'MusicVideo', 'Motion')
SOURCES = os.path.join(ROOT, 'library', 'motion', 'sources.json')
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
BRIDGE = os.path.join(HERE, 'motion', 'blender_bridge.py')
STAGE = os.path.join(ROOT, 'gen', 'motion', 'admit')


def read_sources():
    try: return json.load(open(SOURCES, encoding='utf8'))
    except Exception: return {'about': 'Every clip in Assets/MusicVideo/Motion that was made outside Unity (motion_admit.py): where it came from, how, and its scores. '
                              'ps_ physics sim (motion_sim.py), mm_ motion match over the mocap libraries (motion_match.mjs), vm_ motion from video (Hawkes Gen motion.from-video).', 'clips': {}}


def ground(st):
    low = float(min(st.pos[:, st.index('LeftToes'), 1].min(), st.pos[:, st.index('RightToes'), 1].min(), st.pos[:, st.index('LeftFoot'), 1].min() - 0.06, st.pos[:, st.index('RightFoot'), 1].min() - 0.06))
    pos = st.pos.copy(); pos[..., 1] -= low
    return S.Stream(st.names, st.parents, pos, st.quat, st.fps, {**st.meta, 'grounded': round(low, 4)})


def admit(src, name, grounded=False, source=None, note=None, extra=None):
    st = MQ.load_any(src) if not src.endswith('.npz') or 'rest_pos' in np.load(src) else S.Stream.load(src)
    if st.names != S.CANON: st = MQ.load_any(src)
    st = st.resample(30.0)
    if grounded: st = ground(st)
    os.makedirs(STAGE, exist_ok=True)
    bvh = os.path.join(STAGE, name + '.bvh'); fbx = os.path.join(STAGE, 'Humanoid@' + name + '.fbx')
    S.write_canonical_bvh(st, bvh)
    jp = os.path.join(STAGE, name + '.jobs.json'); json.dump([{'op': 'bvh2fbx', 'in': bvh, 'out': fbx, 'name': name}], open(jp, 'w'))
    r = subprocess.run([BLENDER, '-b', '--python', BRIDGE, '--', jp], capture_output=True, text=True)
    res = json.load(open(jp + '.result.json'))[0]
    if not res['ok']: raise SystemExit('blender: ' + res.get('error', r.stderr[-500:]))
    dest = os.path.join(MOTION, 'Humanoid@' + name + '.fbx'); shutil.copy(fbx, dest)
    meas = M.measure(st, floor=0.0 if grounded else None, zero_g=not grounded)
    doc = read_sources()
    doc['clips'][name] = {'file': 'Assets/MusicVideo/Motion/Humanoid@' + name + '.fbx', 'source': source or st.meta.get('source') or 'unknown', 'from': os.path.relpath(src, ROOT).replace('\\', '/') if os.path.isabs(src) else src,
                          'seconds': round(st.seconds, 2), 'frames': st.frames, 'grounded': grounded, 'meta': {k: v for k, v in st.meta.items() if k not in ('file',)},
                          'measures': {k: v for k, v in meas.items() if k != 'snapList'}, 'note': note, 'admitted': time.strftime('%Y-%m-%d %H:%M'), 'unity': False, **(extra or {})}
    os.makedirs(os.path.dirname(SOURCES), exist_ok=True); json.dump(doc, open(SOURCES, 'w', encoding='utf8'), indent=1, default=float)
    print(f'admitted {name}: {st.frames} frames, {st.seconds:.1f} s, score {meas["score"]} -> {dest}')
    return name


def unity_turn(names):
    """Import, clean and preview the named clips through the mv queue (one hold)."""
    mv = os.path.join(ROOT, 'mv.mjs')
    doc = read_sources()
    names = names or [n for n, c in doc['clips'].items() if not c.get('unity')]
    if not names: print('nothing to import'); return
    print('unity turn for', names, flush=True)
    def call(cmd, args):
        r = subprocess.run(['node', mv, '--video', 'hawkespunch', 'call', cmd, json.dumps(args)], capture_output=True, text=True, cwd=PROJECT)
        print(f'  {cmd}: {(r.stdout or r.stderr).strip()[:400]}', flush=True); return r
    call('refresh', {})
    time.sleep(8)
    call('clipimport', {'apply': True, 'only': names})
    call('cleanclips', {'only': names})
    r = subprocess.run(['node', mv, 'hold', 'node', os.path.join(HERE, 'clip_catalog.mjs'), 'previews', *names, '--force'], capture_output=True, text=True, cwd=PROJECT)
    print('  previews:', (r.stdout or r.stderr).strip()[-600:], flush=True)
    subprocess.run(['node', os.path.join(HERE, 'clip_catalog.mjs'), 'strips', *names], capture_output=True, text=True, cwd=PROJECT)
    subprocess.run(['node', os.path.join(HERE, 'clip_catalog.mjs'), 'build'], capture_output=True, text=True, cwd=PROJECT)
    for n in names:
        if n in doc['clips']: doc['clips'][n]['unity'] = os.path.exists(os.path.join(ROOT, 'library', 'motion', 'previews', n + '.mp4'))
    json.dump(doc, open(SOURCES, 'w', encoding='utf8'), indent=1, default=float)
    print('previews in Director/library/motion/previews/, strips in previews/strips/; watch them and write verdicts.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('clip', nargs='?'); ap.add_argument('--name'); ap.add_argument('--ground', action='store_true')
    ap.add_argument('--source'); ap.add_argument('--note'); ap.add_argument('--sim'); ap.add_argument('--match'); ap.add_argument('--unity', nargs='*')
    a = ap.parse_args()
    done = []
    if a.sim:
        kd = os.path.join(ROOT, 'gen', 'motion', 'sim', a.sim, 'keep'); cand = json.load(open(os.path.join(ROOT, 'gen', 'motion', 'sim', a.sim, 'candidates.json')))
        for k in cand['kept']:
            row = next(r for r in cand['candidates'] if r.get('name') == k['from'])
            grounded = a.sim in ('catch_slide',)
            done.append(admit(os.path.join(kd, k['clip'] + '.npz'), k['clip'], grounded, source='sim', note=f"{a.sim} seed {row['seed']}", extra={'score': k['score'], 'params': row['params'], 'checks': row['checks']}))
    elif a.match:
        done.append(admit(a.match, a.name, a.ground, source='match', note=a.note))
    elif a.clip:
        done.append(admit(a.clip, a.name, a.ground, source=a.source, note=a.note))
    if a.unity is not None:
        unity_turn(a.unity or done)
