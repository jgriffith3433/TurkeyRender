"""Index every downloaded Asset Store .unitypackage (file list, types, previews) without importing anything.
Output: Director/assets/index.json, previews in Director/assets/previews/<pkg>/"""
import json, os, tarfile, gzip, re, sys, time
ROOT = os.path.expandvars(r"%APPDATA%\Unity\Asset Store-5.x")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
TYPES = {"model": {".fbx",".obj",".blend",".dae",".gltf",".glb",".3ds",".max"}, "prefab": {".prefab"},
 "texture": {".png",".jpg",".jpeg",".tga",".psd",".tif",".tiff",".exr",".hdr",".bmp"},
 "audio": {".wav",".mp3",".ogg",".aif",".aiff",".flac"}, "material": {".mat"}, "animation": {".anim",".controller"},
 "shader": {".shader",".shadergraph",".hlsl",".cginc"}, "scene": {".unity"}, "vfx": {".vfx"}, "script": {".cs"}}
EXT = {e: k for k, v in TYPES.items() for e in v}
os.makedirs(OUT, exist_ok=True)
old = {}
idx = os.path.join(OUT, "index.json")
if os.path.exists(idx):
    old = {p["file"]: p for p in json.load(open(idx))["packages"]}
pkgs = []
for d, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".unitypackage"): continue
        full = os.path.join(d, f); st = os.stat(full)
        if full in old and old[full]["size"] == st.st_size and old[full]["mtime"] == int(st.st_mtime):
            pkgs.append(old[full]); continue
        name = f[:-13]; t0 = time.time()
        rel = os.path.relpath(d, ROOT).split(os.sep)
        entries = {}
        with tarfile.open(full, "r:gz") as tar:
            for m in tar:
                parts = m.name.lstrip("./").split("/")
                if len(parts) != 2 or not m.isfile(): continue
                g, part = parts
                e = entries.setdefault(g, {"guid": g})
                if part == "pathname": e["path"] = tar.extractfile(m).read().decode("utf-8", "ignore").splitlines()[0].strip()
                elif part == "asset": e["size"] = m.size
                elif part == "preview.png":
                    p = os.path.join(OUT, "previews", re.sub(r"[^\w-]+", "_", name)); os.makedirs(p, exist_ok=True)
                    open(os.path.join(p, g + ".png"), "wb").write(tar.extractfile(m).read()); e["preview"] = True
        items = []
        for e in entries.values():
            if "path" not in e or "size" not in e: continue
            e["type"] = EXT.get(os.path.splitext(e["path"])[1].lower(), "other")
            items.append(e)
        pkgs.append({"name": name, "publisher": rel[0], "category": rel[1] if len(rel) > 1 else "", "file": full,
                     "size": st.st_size, "mtime": int(st.st_mtime), "items": items})
        print(f"{name}: {len(items)} assets in {time.time()-t0:.0f}s", flush=True)
        json.dump({"packages": pkgs}, open(idx, "w"), separators=(",", ":"))
json.dump({"packages": pkgs}, open(idx, "w"), separators=(",", ":"))
print("done", len(pkgs), "packages", sum(len(p["items"]) for p in pkgs), "assets", flush=True)
