#!/usr/bin/env python
"""Makes one sound for the library through Hawkes Gen: py Director/tools/sfx_make.py "<name>" "<description>" [seconds]"""
import os
import sys

sys.path.insert(0, r"C:\Projects\hawkesgen\clients\python")
from hawkesgen import HawkesGen

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "Assets", "MusicVideo", "Sfx")

name, text = sys.argv[1], sys.argv[2]
params = {"text": text}
if len(sys.argv) > 3:
    params["duration"] = max(float(sys.argv[3]), 0.5)
gen = HawkesGen(project="tkshock")
job = gen.run("audio.sfx", params=params)
path = os.path.normpath(os.path.join(OUT, name + ".mp3"))
gen.download(job["outputs"][0]["asset"], path)
print(path, job.get("cost"))
