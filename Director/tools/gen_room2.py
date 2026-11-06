"""The final room: the same room 40 m away, with someone else on the sofa. Regenerated from 01-room.json so the two always match."""
import json, os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "acts")
src = open(os.path.join(D, "01-room.json"), encoding="utf8").read()
data = json.loads(re.sub(r"^\s*//.*$", "", src, flags=re.M))
out, skip = {}, {"tv_r", "tv_b"}
for k, v in data["actors"].items():
    if k in skip:
        continue
    v = json.loads(json.dumps(v))
    if v.get("parent"):
        v["parent"] += "_2"
    elif v.get("pos"):
        v["pos"][0] += 40
    if k == "tv1":
        v["tv"].pop("feed", None)
        v["tv"]["suck"] = False
        v["tv"]["share"] = "tv1"
        out["tv2"] = v
        continue
    if k == "person":
        v["model"] = "person2"; v["material"] = "Assets/MusicVideo/Person2/Person.mat"; v["material2"] = "Assets/MusicVideo/Person2/Head.mat"
        out["person2"] = v
        continue
    out[k + "_2"] = v
red = dict(data["lights"]["red"]); red["pos"] = [red["pos"][0] + 40, red["pos"][1], red["pos"][2]]
cues = [{"at": 0, "do": "anim", "on": "person2", "clip": "IdleSit14", "for": "80bars"}]
json.dump({"actors": out, "lights": {"red2": red}, "cues": cues}, open(os.path.join(D, "06-room2.json"), "w", encoding="utf8"), indent=1)
print(len(out), "actors")
