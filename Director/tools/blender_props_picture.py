"""The framed picture's image (AI texture): py Director/tools/blender_props_picture.py. Saved to Director/gen/props/textures/frame_picture.png."""
import os, sys
sys.path.insert(0, r"C:\Projects\hawkesgen\clients\python")
from hawkesgen import HawkesGen
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gen", "props", "textures", "frame_picture.png")
gen = HawkesGen(project="tkshock")
job = gen.run("image.generate", params={"prompt": "faded 1970s thrift store oil painting of a single wild turkey standing alone in a dusk field, looking straight at the viewer, muted brown and olive colours, visible brush strokes and canvas weave, flat front-on scan of the painting, no frame, no text", "width": 768, "height": 1024, "seed": 2207})
gen.download(job["outputs"][0]["asset"], OUT)
print("DONE")
