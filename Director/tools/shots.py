"""The shoot. Reads Director/shots.json and makes what's missing or changed through Hawkes Gen.
  shots.py stills [id...]   makes the stills, and Director/gen/shots/stills.png to review
  shots.py motion [id...]   turns approved stills into clips and installs them as inserts
A shot only regenerates when its prompt changes (recorded in shots.lock.json). Delete an id from the lock for a new take.
"""
import concurrent.futures as cf, glob, hashlib, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, r"C:\Projects\hawkesgen\clients\python")
from hawkesgen import HawkesGen

ROOT = os.path.join(HERE, "..")
OUT = os.path.join(ROOT, "gen", "shots")
os.makedirs(OUT, exist_ok=True)
LOCK = os.path.join(ROOT, "shots.lock.json")
PERSON = glob.glob(os.path.join(ROOT, "gen", "views", "*-front.png"))[0]
gen = HawkesGen(project="tkshock")
book = json.load(open(os.path.join(ROOT, "shots.json"), encoding="utf8"))
lock = json.load(open(LOCK)) if os.path.exists(LOCK) else {}
want = set(sys.argv[2:])
shots = [s for s in book["shots"] if not want or s["id"] in want]
h = lambda t: hashlib.sha1(t.encode()).hexdigest()[:10]
def save():
    # Other runs may be going at once: merge with what's on disk.
    disk = json.load(open(LOCK)) if os.path.exists(LOCK) else {}
    for k, v in lock.items():
        disk.setdefault(k, {}).update(v)
    json.dump(disk, open(LOCK, "w"), indent=1)
W, H = 1344, 756


def still(s):
    prompt = s["still"] + ". " + book["style"]
    key = h(prompt)
    path = os.path.join(OUT, s["id"] + ".png")
    if lock.get(s["id"], {}).get("still") == key and os.path.exists(path):
        return s["id"], "kept"
    if s["kind"] == "person":
        job = gen.run("image.edit", inputs={"images": [PERSON]}, params={"prompt": "Keep this exact man's face, hair and stubble. " + prompt, "width": W, "height": H})
    else:
        job = gen.run("image.generate", params={"prompt": prompt, "width": W, "height": H})
    gen.download(job["outputs"][0]["asset"], path)
    lock.setdefault(s["id"], {})["still"] = key
    lock[s["id"]]["asset"] = job["outputs"][0]["asset"]
    lock[s["id"]].pop("motion", None)
    save()
    return s["id"], "made"


def motion(s):
    key = h(s["move"] + str(s.get("frames", 49)) + lock[s["id"]]["still"])
    path = os.path.join(OUT, s["id"] + ".mp4")
    if lock[s["id"]].get("motion") == key and os.path.exists(path):
        return s["id"], "kept"
    job = gen.run("video.i2v", inputs={"start": os.path.join(OUT, s["id"] + ".png")}, params={"prompt": s["move"], "width": 832, "height": 468, "frames": s.get("frames", 49), "fps": 16, "motionAmplitude": 1.25})
    gen.download(job["outputs"][0]["asset"], path)
    lock[s["id"]]["motion"] = key
    save()
    subprocess.check_call(["py", os.path.join(HERE, "insert.py"), path, s["id"]])
    return s["id"], "made"


stage = sys.argv[1]
fn = still if stage == "stills" else motion
with cf.ThreadPoolExecutor(6) as ex:
    fs = {ex.submit(fn, s): s["id"] for s in shots}
    for f in cf.as_completed(fs):
        try:
            print(*f.result(), flush=True)
        except Exception as e:
            print(fs[f], "FAILED", str(e)[:200], flush=True)
if stage == "stills":
    files = [os.path.join(OUT, s["id"] + ".png") for s in book["shots"] if os.path.exists(os.path.join(OUT, s["id"] + ".png"))]
    lst = os.path.join(OUT, "list.txt")
    open(lst, "w").write("\n".join("file '%s'\nduration 1" % f.replace("\\", "/") for f in files))
    subprocess.call(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-vf", "scale=480:270,tile=5x%d:padding=3" % ((len(files) + 4) // 5), "-frames:v", "1", os.path.join(OUT, "stills.png")])
