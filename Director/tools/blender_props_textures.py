"""AI source textures for the props (run with plain Python: py Director/tools/blender_props_textures.py).
Only what's missing is generated. Everything lands in Director/gen/props/src/. Masks are used as grey wear layers, tiled in the bake."""
import os, sys
sys.path.insert(0, r"C:\Projects\hawkesgen\clients\python")
from hawkesgen import HawkesGen

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gen", "props", "src")
os.makedirs(OUT, exist_ok=True)
FLAT = "flat front-on macro photograph, even soft light, no perspective, no vignette, no text, seamless texture"
T = {
    "plastic": "extremely fine pebbled matte black injection moulded ABS plastic surface, tiny leather-like grain, " + FLAT,
    "paint": "aged off-white powder coated cast aluminium surface, subtle orange peel texture, faint yellowing, " + FLAT,
    "laminate": "black ash wood grain laminate furniture surface, dark charcoal with fine open pores and straight grain, 1990s flat pack furniture, " + FLAT,
    "dust": "white dust specks, tiny lint fibers and hairs scattered on a pure black background, sparse, high contrast, " + FLAT,
    "scratches": "fine thin white hairline scratches and small scuffs in many directions on a pure black background, sparse, high contrast, " + FLAT,
    "prints": "greasy smudged human fingerprints and wipe marks, pale grey on a pure black glass surface, lit from the side, " + FLAT,
    "grime": "grey water stains, drip streaks and blotchy grime on a plain white surface, greyscale, " + FLAT,
}

gen = HawkesGen(project="tkshock")
jobs = {}
for name, prompt in T.items():
    if not os.path.exists(os.path.join(OUT, name + ".png")):
        jobs[name] = gen.submit("image.generate", params={"prompt": prompt, "width": 2048, "height": 2048, "seamless": True, "seed": 4100 + len(jobs)})
for name, j in jobs.items():
    job = gen.wait(j["id"])
    gen.download(job["outputs"][0]["asset"], os.path.join(OUT, name + ".png"))
    print("OK", name, flush=True)
print("DONE")
