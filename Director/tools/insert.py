"""Turns a video into an insert: insert.py <video> <name> [--crop W:H:X:Y]
Frames go to Director/inserts/<name>/, used in the score as {"insert":"<name>"}."""
import glob, os, subprocess, sys
root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
video, name = sys.argv[1], sys.argv[2]
folder = os.path.join(root, "Director", "inserts", name)
os.makedirs(folder, exist_ok=True)
for f in glob.glob(os.path.join(folder, "f_*")):
    os.remove(f)
vf = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
if "--crop" in sys.argv:
    vf = "crop=" + sys.argv[sys.argv.index("--crop") + 1] + "," + vf
subprocess.check_call(["ffmpeg", "-y", "-v", "error", "-i", video, "-vf", vf, "-q:v", "3", os.path.join(folder, "f_%04d.jpg")])
print(name, len(glob.glob(os.path.join(folder, "f_*.jpg"))), "frames")
