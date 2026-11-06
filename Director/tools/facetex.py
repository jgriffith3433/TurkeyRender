import sys, glob
sys.path.insert(0, r"C:\Projects\hawkesgen\clients\python")
from hawkesgen import HawkesGen
gen = HawkesGen(project="tkshock")
f = glob.glob(r"C:\Projects\TKShock\Director\gen\views\*-front.png")[0]
job = gen.run("image.edit", inputs={"images": [f]}, params={"prompt": "Texture reference photograph of this exact same man's head, perfectly straight-on front view, head filling the whole square frame from the top of the hair to the chin, neutral expression, mouth closed, eyes open looking straight ahead, flat soft even studio lighting with no shadows, plain light grey background, ultra sharp skin pores, photogrammetry albedo texture", "width": 1024, "height": 1024, "seed": 77})
gen.download(job["outputs"][0]["asset"], r"C:\Projects\TKShock\Director\gen\face_tex.png")
print("ok")
