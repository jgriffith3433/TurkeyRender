"""Measures a render against the pace targets: py Director/tools/measure.py <video> [--parts]
Detects cuts with ffmpeg, then reports per part: cuts per bar, average and longest shot, frames that are too dark or blown,
stretches with no motion, and shots with big jumps in length next to equal runs."""
import json, os, re, subprocess, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
song = json.load(open(os.path.join(D, "song.json")))
b, ph = song["beats"], song["downbeatPhase"]
T = lambda bar: b[min(ph + (bar - 1) * 4, len(b) - 1)]
ib = b[1] - b[0]
PARTS = [("1 He watches", 1, 14, .3, .5), ("2 It wakes up", 14, 25, .7, 1), ("3 Breakdown", 25, 34, 1.5, 2), ("4 The fall", 34, 41, 1, 2),
         ("5 Feathers", 41, 52, .25, .5), ("6 Pulled in", 52, 59, .7, 1), ("7 He's on TV", 59, 69, 1, 4), ("8 The next one", 69, 74, .3, .5)]
video = sys.argv[1]
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).strip())
# Sample at 10 fps, small: scene score, brightness, and frame-to-frame change.
cmd = ["ffmpeg", "-v", "info", "-i", video, "-vf", "fps=10,scale=160:90,signalstats,metadata=print:file=-", "-an", "-f", "null", "-"]
cut_cmd = ["ffmpeg", "-v", "info", "-i", video, "-vf", "scale=320:180,select='gt(scene,0.28)',showinfo", "-an", "-f", "null", "-"]
err = subprocess.run(cut_cmd, capture_output=True, text=True, errors="ignore").stderr
cuts = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", err)]
out = subprocess.run(cmd, capture_output=True, text=True, errors="ignore").stdout
frames, cur = [], {}
for line in out.splitlines():
    m = re.match(r"frame:\d+\s+pts:\d+\s+pts_time:([0-9.]+)", line)
    if m:
        cur = {"t": float(m.group(1))}; frames.append(cur); continue
    m = re.match(r"lavfi\.signalstats\.(YAVG|YDIF)=([0-9.]+)", line)
    if m and cur is not None:
        cur[m.group(1)] = float(m.group(2))
print(f"{os.path.basename(video)}: {dur:.1f}s, {len(cuts)} hard cuts, average shot {dur / max(1, len(cuts)) / ib:.1f} beats\n")
print(f"{'part':18}{'cuts/bar':>9}{'target':>10}{'avg':>6}{'long':>6}{'dark%':>7}{'blown%':>8}{'still%':>8}")
issues = []
for name, a, e, lo, hi in PARTS:
    t0, t1 = T(a), min(T(e), dur)
    c = [x for x in cuts if t0 <= x < t1]
    edges = [t0] + c + [t1]
    shots = [q - p for p, q in zip(edges, edges[1:])]
    bars = (t1 - t0) / (ib * 4)
    rate = len(c) / bars
    fr = [f for f in frames if t0 <= f["t"] < t1 and "YAVG" in f]
    dark = 100 * sum(f["YAVG"] < 14 for f in fr) / max(1, len(fr))
    blown = 100 * sum(f["YAVG"] > 215 for f in fr) / max(1, len(fr))
    still = 100 * sum(f.get("YDIF", 9) < .25 for f in fr) / max(1, len(fr))
    print(f"{name:18}{rate:9.2f}{f'{lo}-{hi}':>10}{sum(shots) / len(shots) / ib:6.1f}{max(shots) / ib:6.1f}{dark:7.1f}{blown:8.1f}{still:8.1f}")
    if rate > hi * 1.25: issues.append(f"{name}: too many cuts ({rate:.2f} a bar)")
    if rate < lo * .6: issues.append(f"{name}: very few cuts ({rate:.2f} a bar), check that events carry it")
    if blown > 6: issues.append(f"{name}: {blown:.0f}% blown out")
    if still > 25: issues.append(f"{name}: {still:.0f}% of frames barely move")
    if name[0] not in "128" and dark > 15: issues.append(f"{name}: {dark:.0f}% very dark")
same = 0
for p, q, r in zip(cuts, cuts[1:], cuts[2:]):
    same = same + 1 if abs((q - p) - (r - q)) < .05 else 0
    if same == 5: issues.append(f"run of equal-length shots near {q:.1f}s reads like a slideshow")
print("\nFlags:" if issues else "\nNo flags.")
for i in issues: print(" -", i)
