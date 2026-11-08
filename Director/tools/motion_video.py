#!/usr/bin/env python
"""Motion from reference video through Hawkes Gen (`motion.from-video`, NVIDIA GEM-X): collects the jobs' BVH files (SOMA skeleton),
keeps Gen's own `motion.check` numbers and cost in Director/gen/refvideo/manifest.json, retargets each onto his rig (tools/motion/stream.py,
bone map `soma`) and admits it as vm_<name> (motion_admit.py). The footage, its licences and the trims are in gen/refvideo/ (manifest.json).
   py Director/tools/motion_video.py collect            fetch every finished job listed in manifest.json "jobs", write the BVH beside the trims
   py Director/tools/motion_video.py admit [name...]    retarget and admit the collected clips (ground clips grounded, zero-g clips not)
   py Director/tools/motion_video.py status
Jobs are started by hand (hawkesgen_run motion.from-video with the trim as `video`, project tkshock, no character: BVH only, about $0.09-0.12
each) and their ids written into manifest.json "jobs": {name: job_id}."""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', 'hawkesgen', 'clients', 'python')); sys.path.insert(0, r'C:\Projects\hawkesgen\clients\python')
REF = os.path.join(ROOT, 'gen', 'refvideo'); MF = os.path.join(REF, 'manifest.json')
GROUND = {'box_cross', 'box_hooks', 'lift_kettlebell', 'lift_cleanjerk_cg', 'throw_javelin_a', 'throw_javelin_b'}


def manifest():
    return json.load(open(MF, encoding='utf8'))


def save(m):
    json.dump(m, open(MF, 'w', encoding='utf8'), indent=1)


def collect():
    from hawkesgen import HawkesGen
    gen = HawkesGen(project='tkshock')
    m = manifest(); jobs = m.get('jobs', {})
    total = 0.0
    for name, jid in jobs.items():
        j = gen.job(jid) if hasattr(gen, 'job') else gen.get_job(jid)
        state = j.get('status') or j.get('state')
        c = m['clips'][name]; c['job'] = jid; c['jobStatus'] = state
        if state != 'done':
            print(name, jid, state, j.get('detail', '')); continue
        res = j.get('result') or {}
        c['genCheck'] = res.get('check'); c['genCost'] = j.get('cost'); c['gpuSeconds'] = j.get('gpu_seconds'); c['conversion'] = res.get('conversion')
        total += float(j.get('cost') or 0)
        out = os.path.join(REF, 'gen', 'vm_' + name); os.makedirs(out, exist_ok=True)
        for o in j.get('outputs', []):
            aid = o.get('asset') or o.get('id')
            dest = os.path.join(out, 'vm_' + name + '.bvh')
            if not os.path.exists(dest): gen.download(aid, dest)
            c['bvh'] = os.path.relpath(dest, REF).replace('\\', '/')
        ck = c.get('genCheck') or {}
        print(f"{name}: ${j.get('cost')} {j.get('gpu_seconds')} GPU s, check ok={ck.get('ok')} {ck.get('problems')} skate={ck.get('metrics', {}).get('footSkate')} jitter={ck.get('metrics', {}).get('jitter')}")
    m['spend'] = round(total, 3); save(m); print('spend so far $', round(total, 3))


def admit(names):
    m = manifest()
    for name, c in m['clips'].items():
        if names and name not in names: continue
        if not c.get('bvh'): continue
        bvh = os.path.join(REF, c['bvh'])
        args = ['py', '-I', os.path.join(HERE, 'motion_admit.py'), bvh, '--name', 'vm_' + name, '--source', 'video', '--note', f"{c['beat']}; {c['url']} ({c['licence'][:40]}); Gen job {c.get('job')}"]
        if name in GROUND: args.append('--ground')
        r = subprocess.run(args, capture_output=True, text=True); print((r.stdout or r.stderr).strip()[-300:])


def status():
    m = manifest()
    for name, c in m['clips'].items(): print(name, c.get('job'), c.get('jobStatus'), c.get('genCost'), (c.get('genCheck') or {}).get('ok'))
    print('spend $', m.get('spend'))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
    {'collect': collect, 'admit': lambda: admit(sys.argv[2:]), 'status': status}[cmd]()
