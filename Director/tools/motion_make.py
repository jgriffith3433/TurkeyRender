#!/usr/bin/env python
"""Makes body motion clips on our rig through Hawkes Gen and installs them for Unity.
   py Director/tools/motion_make.py Director/motions.json [--only name,name]
motions.json: {"name": {"prompt": "...", "seconds": 3, "takes": 3, "loop": false, "inPlace": false}}
All jobs go in at once so Gen batches them on one server. Files land in Director/gen/motion/<name>/, then the first take is
copied to Assets/MusicVideo/Motion/Humanoid@<name>.fbx. A clip that already exists is skipped, because every run costs money."""
import argparse, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, r'C:\Projects\hawkesgen\clients\python')
from hawkesgen import HawkesGen  # noqa: E402

ap = argparse.ArgumentParser(); ap.add_argument('list'); ap.add_argument('--only', default='')
a = ap.parse_args()
wanted = json.loads(re.sub(r'^\s*//.*$', '', open(a.list, encoding='utf8').read(), flags=re.M))
only = set(filter(None, a.only.split(',')))
GEN = os.path.join(ROOT, 'Director', 'gen', 'motion'); UNITY = os.path.join(ROOT, 'Assets', 'MusicVideo', 'Motion')
os.makedirs(GEN, exist_ok=True); os.makedirs(UNITY, exist_ok=True)

gen = HawkesGen(project='tkshock')
character = gen.upload(os.path.join(ROOT, 'Assets', 'MusicVideo', 'Person', 'Person.fbx'))
jobs = {}
for name, m in wanted.items():
    if only and name not in only: continue
    if os.path.exists(os.path.join(UNITY, f'Humanoid@{name}.fbx')): print('have', name); continue
    params = {'prompt': m['prompt'], 'seconds': m.get('seconds', 3), 'takes': m.get('takes', 3)}
    for k in ('loop', 'inPlace', 'poses'):
        if k in m: params[k] = m[k]
    jobs[name] = gen.submit('motion.from-text', params=params, inputs={'character': character}, labels={'motion': name})
    print('queued', name, flush=True)

for name, job in jobs.items():
    job_id = job['id'] if isinstance(job, dict) else job
    done = gen.wait(job_id, raise_on_fail=False)
    out = done.get('outputs') or done.get('assets') or []
    print(name, done.get('state') or done.get('status'), len(out), json.dumps(done.get('error'))[:200] if done.get('error') else '', flush=True)
    folder = os.path.join(GEN, name); os.makedirs(folder, exist_ok=True)
    first = None
    for n, o in enumerate(out):
        asset = o.get('id') or o.get('asset') if isinstance(o, dict) else o
        fname = (o.get('name') if isinstance(o, dict) else None) or f'{name}_{n}.bin'
        dest = os.path.join(folder, os.path.basename(fname)); gen.download(asset, dest)
        if first is None and dest.lower().endswith('.fbx'): first = dest
    if first: shutil.copy(first, os.path.join(UNITY, f'Humanoid@{name}.fbx')); print('installed', name, flush=True)
