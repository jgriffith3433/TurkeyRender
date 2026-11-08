#!/usr/bin/env python
"""Fetches the mocap libraries motion_match.mjs searches, into Director/gen/mocap/<source>/ (never into Assets), each with a
manifest.json (every clip: file, frames, fps, description, tags, licence). Downloads are untrusted data: nothing here is run,
only unpacked and parsed.
   py Director/tools/mocap_fetch.py cmu            the CMU Graphics Lab Motion Capture Database, cgspeed's MotionBuilder-friendly BVH
                                                   conversion (2,548 clips, 113 subjects), from the GitHub mirror una-dinosauria/cmu-mocap.
                                                   CMU: free for any use; Hahne adds no restriction (READMEFIRST.txt is kept beside the data).
   py Director/tools/mocap_fetch.py protofactor    the 2,957 FBX clips of PROTOFACTOR's Ultimate Animation Collection J bought on the Asset
                                                   Store (the "2,700-clip local collection"), unpacked from the .unitypackage in Unity's download
                                                   folder. Licence: Unity Asset Store EULA (use in J's projects, no redistribution): it stays local.
   py Director/tools/mocap_fetch.py status         what is on disk."""
import io, json, os, re, sys, tarfile, zipfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # Director
MOCAP = os.path.join(ROOT, 'gen', 'mocap')
CMU_ZIP_URL = 'https://codeload.github.com/una-dinosauria/cmu-mocap/zip/refs/heads/master'
PF_PKG = os.path.join(os.environ.get('APPDATA', ''), 'Unity', 'Asset Store-5.x', 'PROTOFACTOR INC', 'AnimationBipedal', 'ULTIMATE ANIMATION COLLECTION.unitypackage')


class ZlibStream:
    """A read()-able view of a gzip file decompressed on the fly with zlib (tarfile's own gzip path seeks, which is quadratic on 1 GB)."""
    def __init__(self, path, chunk=8 << 20):
        import zlib
        self.f = open(path, 'rb'); self.d = zlib.decompressobj(16 + zlib.MAX_WBITS); self.buf = b''; self.chunk = chunk; self.eof = False

    def read(self, n=-1):
        while (n < 0 or len(self.buf) < n) and not self.eof:
            raw = self.f.read(self.chunk)
            if not raw: self.eof = True; self.buf += self.d.flush(); break
            self.buf += self.d.decompress(raw)
            if self.d.eof: self.eof = True
        if n < 0: out, self.buf = self.buf, b''
        else: out, self.buf = self.buf[:n], self.buf[n:]
        return out


def bvh_head(data):
    """frames and fps from a BVH's MOTION block without parsing the whole file."""
    m = re.search(rb'Frames:\s*(\d+)\s*Frame Time:\s*([0-9.eE+-]+)', data[:200000] if len(data) > 200000 else data)
    if not m:
        m = re.search(rb'Frames:\s*(\d+)\s*Frame Time:\s*([0-9.eE+-]+)', data)
    return (int(m.group(1)), round(1.0 / float(m.group(2)), 3)) if m else (0, 0)


def cmu():
    out = os.path.join(MOCAP, 'cmu'); dl = os.path.join(out, '_download'); os.makedirs(dl, exist_ok=True)
    zpath = os.path.join(dl, 'cmu-mocap-master.zip')
    if not os.path.exists(zpath):
        print('downloading', CMU_ZIP_URL, '(about 1.2 GB)')
        urllib.request.urlretrieve(CMU_ZIP_URL, zpath)
    z = zipfile.ZipFile(zpath)
    names = z.namelist()
    base = names[0].split('/')[0]
    # the index: "01_01\tplayground - forward jumps, turn around"
    index = {}
    subject = {}
    idx_name = next(n for n in names if n.endswith('cmu-mocap-index-text.txt'))
    cur_subject = None
    for line in z.read(idx_name).decode('utf8', 'replace').splitlines():
        m = re.match(r'Subject #(\d+)\s*\((.*)\)', line.strip())
        if m: cur_subject = m.group(1).zfill(2); subject[cur_subject] = m.group(2).strip(); continue
        m = re.match(r'(\d+_\d+)\s+(.*)', line.strip())
        if m: index[m.group(1)] = m.group(2).strip()
    readme = next((n for n in names if n.endswith('READMEFIRST.txt')), None)
    if readme: open(os.path.join(out, 'READMEFIRST.txt'), 'wb').write(z.read(readme))
    clips = []
    bvhdir = os.path.join(out, 'bvh')
    for n in names:
        if not n.lower().endswith('.bvh'): continue
        rel = n[len(base) + 1:]                      # data/001/01_01.bvh
        parts = rel.split('/')
        dest = os.path.join(bvhdir, *parts[1:])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        data = z.read(n)
        if not os.path.exists(dest) or os.path.getsize(dest) != len(data):
            open(dest, 'wb').write(data)
        frames, fps = bvh_head(data)
        cid = os.path.splitext(parts[-1])[0]
        subj = cid.split('_')[0]
        desc = index.get(cid, 'Unknown')
        clips.append({'id': cid, 'file': os.path.relpath(dest, out).replace('\\', '/'), 'frames': frames, 'fps': fps,
                      'seconds': round((frames - 1) / fps, 2) if fps else 0, 'subject': subj, 'subjectAbout': subject.get(subj, ''),
                      'description': desc, 'tags': tags_of(desc + ' ' + subject.get(subj, ''))})
        if len(clips) % 200 == 0: print(len(clips), 'clips', flush=True)
    manifest = {'source': 'cmu', 'about': 'CMU Graphics Lab Motion Capture Database, cgspeed MotionBuilder-friendly BVH conversion (2010 release, '
                'first frame is a T-pose facing +Z, units are inches times 0.45 ... scale by leg length). Mirror: github.com/una-dinosauria/cmu-mocap. '
                'Licence: CMU places no restrictions on use of the data (mocap.cs.cmu.edu, funded by NSF EIA-0196217); the converter adds none (READMEFIRST.txt).',
                'licence': 'free for any use (CMU); no added restriction (B. Hahne)', 'boneMap': 'cmu', 'url': CMU_ZIP_URL,
                'count': len(clips), 'clips': clips}
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf8'), indent=1)
    print('cmu:', len(clips), 'clips ->', os.path.join(out, 'manifest.json'))


WORDS = {'walk': 'walk', 'run': 'run', 'jog': 'run', 'jump': 'jump', 'punch': 'punch', 'box': 'punch', 'fight': 'punch', 'kick': 'kick', 'throw': 'throw',
         'catch': 'catch', 'lift': 'lift', 'pick': 'lift', 'carry': 'lift', 'push': 'push', 'pull': 'pull', 'sit': 'sit', 'stand': 'stand', 'dance': 'dance',
         'climb': 'climb', 'fall': 'fall', 'trip': 'fall', 'stumble': 'fall', 'swing': 'swing', 'turn': 'turn', 'idle': 'idle', 'wait': 'idle',
         'stretch': 'stretch', 'basketball': 'sport', 'soccer': 'sport', 'golf': 'sport', 'wash': 'chore', 'sweep': 'chore', 'drink': 'drink',
         'laugh': 'laugh', 'scared': 'scared', 'afraid': 'scared', 'startle': 'startle', 'flinch': 'startle', 'surprise': 'startle', 'duck': 'dodge',
         'dodge': 'dodge', 'hit': 'hit', 'knock': 'hit', 'gethit': 'hit', 'sword': 'weapon', 'gun': 'weapon', 'rifle': 'weapon', 'shoot': 'weapon', 'bow': 'weapon',
         'crawl': 'crawl', 'roll': 'roll', 'cartwheel': 'acrobatic', 'flip': 'acrobatic', 'handstand': 'acrobatic', 'balance': 'balance', 'hop': 'jump',
         'skip': 'skip', 'march': 'walk', 'sneak': 'sneak', 'limp': 'injured', 'injur': 'injured', 'hurt': 'injured', 'zombie': 'zombie', 'wave': 'gesture',
         'point': 'gesture', 'gesture': 'gesture', 'nod': 'gesture', 'talk': 'talk', 'conversation': 'talk', 'shrug': 'gesture', 'block': 'block',
         'dodg': 'dodge', 'uppercut': 'punch', 'jab': 'punch', 'hook': 'punch', 'cross': 'punch', 'combo': 'punch', 'overhead': 'lift', 'heavy': 'lift',
         'crouch': 'crouch', 'kneel': 'kneel', 'die': 'death', 'death': 'death', 'dead': 'death', 'calm': 'gesture', 'hostage': 'scared', 'cover': 'scared'}


def tags_of(text):
    t = re.sub(r'([a-z])([A-Z])', r'\1 \2', text).lower()
    tags = set()
    for w, tag in WORDS.items():
        if w in t: tags.add(tag)
    return sorted(tags)


def protofactor():
    out = os.path.join(MOCAP, 'protofactor'); os.makedirs(out, exist_ok=True)
    if not os.path.exists(PF_PKG): sys.exit('no package at ' + PF_PKG)
    print('unpacking', PF_PKG, '(streamed through zlib: the package is one 3 GB gzip member with an FEXTRA header that gzip and tar choke on)')
    tf = tarfile.open(fileobj=ZlibStream(PF_PKG), mode='r|')
    pending = {}
    clips = []; lists = {}

    def handle(p, blob):
        low = p.lower()
        if '/animations/' in low and low.endswith('.fbx') and '/prop' not in low and 'humanoid@' in low:
            animset = re.search(r'/Animations/([^/]+)/', p).group(1).replace(' Animset', '')
            name = os.path.splitext(os.path.basename(p))[0].split('@', 1)[1]
            dest = os.path.join(out, 'fbx', re.sub(r'[^A-Za-z0-9&]+', '_', animset), os.path.basename(p))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if not os.path.exists(dest) or os.path.getsize(dest) != len(blob):
                open(dest, 'wb').write(blob)
            clips.append({'id': name, 'file': os.path.relpath(dest, out).replace('\\', '/'), 'animset': animset, 'unityPath': p,
                          'rootMotion': name.endswith('_RM'), 'description': re.sub(r'([a-z])([A-Z])', r'\1 \2', name.replace('_RM', '')) + ' (' + animset + ')',
                          'tags': tags_of(name + ' ' + animset)})
            if len(clips) % 300 == 0: print(len(clips), 'clips', flush=True)
        elif low.endswith('.txt') and 'animation list' in low:
            lists[os.path.basename(p)] = blob.decode('utf8', 'replace')
        elif 'protof-actor/fbx files' in low and low.endswith('.fbx'):
            dest = os.path.join(out, 'rig', os.path.basename(p)); os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, 'wb').write(blob)

    for m in tf:
        parts = m.name.split('/')
        if len(parts) < 2 or not m.isfile(): continue
        guid, kind = parts[0], parts[1]
        if kind not in ('pathname', 'asset'): continue
        e = pending.setdefault(guid, {})
        if kind == 'pathname': e['path'] = tf.extractfile(m).read().decode('utf8', 'replace').split('\n')[0]
        else: e['blob'] = tf.extractfile(m).read() if m.size < 40_000_000 else b''
        if 'path' in e and 'blob' in e:
            handle(e['path'], e['blob']); del pending[guid]
    os.makedirs(os.path.join(out, 'lists'), exist_ok=True)
    for n, t in lists.items(): open(os.path.join(out, 'lists', n), 'w', encoding='utf8').write(t)
    manifest = {'source': 'protofactor', 'about': 'PROTOFACTOR Ultimate Animation Collection (Unity Asset Store), unpacked from the .unitypackage J bought. '
                'Rig "humanoid_ *" (3ds Max Biped names), A-pose bind, centimetres. _RM clips carry root motion.',
                'licence': 'Unity Asset Store EULA: for use in the licensee\'s projects; not redistributable. Keep it local.', 'boneMap': 'protofactor',
                'package': PF_PKG, 'count': len(clips), 'clips': clips}
    json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf8'), indent=1)
    print('protofactor:', len(clips), 'clips ->', os.path.join(out, 'manifest.json'))


def status():
    for src in sorted(os.listdir(MOCAP)) if os.path.exists(MOCAP) else []:
        mf = os.path.join(MOCAP, src, 'manifest.json')
        if os.path.exists(mf):
            m = json.load(open(mf, encoding='utf8')); print(f"{src}: {m['count']} clips, {m['licence']}")
        else: print(src, '(no manifest)')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
    {'cmu': cmu, 'protofactor': protofactor, 'status': status}[cmd]()
