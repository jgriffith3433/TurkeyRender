"""Search and selectively unpack J's downloaded Asset Store packages.
  find <words...> [--type model|prefab|audio|texture|animation|material|vfx] [--limit N]
  pull "<package words>" "<path words>" [...more path filters]
       Writes the matches and everything they reference (materials, textures, scripts, controllers) into Assets/,
       with the package's own GUIDs, without touching the rest of the package.
"""
import json, os, re, sys, tarfile
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.abspath(os.path.join(HERE, "..", ".."))
INDEX = json.load(open(os.path.join(HERE, "..", "assets", "index.json")))
GUID = re.compile(rb"guid: ([0-9a-f]{32})")
TEXTY = (".prefab", ".mat", ".controller", ".overridecontroller", ".anim", ".asset", ".mask", ".playable", ".physicmaterial", ".shadergraph", ".shadersubgraph", ".vfx", ".lighting", ".signal")
DEFAULT_ORDER = {"prefab": 0, "model": 1, "audio": 2, "vfx": 2, "animation": 3, "material": 4, "texture": 5}


def find(words, typ, limit):
    words = [w.lower() for w in words]
    hits = []
    for p in INDEX["packages"]:
        hay_pkg = (p["name"] + " " + p["category"]).lower()
        for i in p["items"]:
            if typ and i["type"] != typ:
                continue
            hay = i["path"].lower()
            if all(w in hay or w in hay_pkg for w in words):
                score = sum(hay.count(w) for w in words) * 3 + sum(w in os.path.basename(hay) for w in words) * 5
                hits.append((-score, DEFAULT_ORDER.get(i["type"], 9), p["name"], i))
    hits.sort(key=lambda h: h[:2])
    print(f"{len(hits)} matches")
    for _, _, name, i in hits[:limit]:
        print(f"{i['type']:9} {name[:32]:32} {i['path']}" + ("  [preview]" if i.get("preview") else ""))


def pull(pkg_words, filters):
    pkgs = [p for p in INDEX["packages"] if all(w.lower() in p["name"].lower() for w in pkg_words.split())]
    if len(pkgs) != 1:
        sys.exit("package must match exactly one: " + ", ".join(p["name"] for p in pkgs))
    p = pkgs[0]
    by_guid = {i["guid"]: i for i in p["items"]}
    roots = [i["guid"] for i in p["items"] if any(f.lower() in i["path"].lower() for f in filters)]
    if not roots:
        sys.exit("nothing matches " + str(filters))

    # Pass 1: read every meta and text asset so references can be followed.
    text, meta = {}, {}
    with tarfile.open(p["file"], "r:gz") as tar:
        for m in tar:
            parts = m.name.lstrip("./").split("/")
            if len(parts) != 2 or not m.isfile():
                continue
            g, part = parts
            if part == "asset.meta":
                meta[g] = tar.extractfile(m).read()
            elif part == "asset" and g in by_guid and by_guid[g]["path"].lower().endswith(TEXTY) and m.size < 40_000_000:
                text[g] = tar.extractfile(m).read()

    want, stack = set(), list(roots)
    while stack:
        g = stack.pop()
        if g in want or g not in by_guid:
            continue
        if by_guid[g]["path"].lower().endswith(".cs") or by_guid[g]["path"].lower().endswith(".asmdef"):
            continue  # pack scripts can break the build and the video never runs them
        want.add(g)
        for blob in (text.get(g, b""), meta.get(g, b"")):
            stack.extend(x.decode() for x in GUID.findall(blob))
        # A shader's includes aren't GUID references: bring its folder's include files.
        if by_guid[g]["path"].lower().endswith(".shader"):
            folder = os.path.dirname(by_guid[g]["path"])
            stack.extend(i["guid"] for i in p["items"] if os.path.dirname(i["path"]) == folder and i["path"].lower().endswith((".cginc", ".hlsl")))

    # Pass 2: write them.
    written = 0
    with tarfile.open(p["file"], "r:gz") as tar:
        for m in tar:
            parts = m.name.lstrip("./").split("/")
            if len(parts) != 2 or not m.isfile() or parts[0] not in want:
                continue
            g, part = parts
            rel = by_guid[g]["path"]
            if ".." in rel.replace("\\", "/").split("/"):  # package paths are untrusted input
                continue
            dest = os.path.join(PROJECT, rel)
            if part == "asset":
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as f:
                    src = tar.extractfile(m)
                    for chunk in iter(lambda: src.read(1 << 20), b""):
                        f.write(chunk)
                written += 1
            elif part == "asset.meta":
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest + ".meta", "wb") as f:
                    f.write(tar.extractfile(m).read())
    tops = sorted({"/".join(by_guid[g]["path"].split("/")[:3]) for g in want})
    print(json.dumps({"package": p["name"], "written": written, "matched": len(roots), "roots": tops,
                      "main": [by_guid[g]["path"] for g in roots][:40]}, indent=1))


a = sys.argv[1:]
if not a:
    sys.exit(__doc__)
if a[0] == "find":
    typ, limit, words = None, 40, []
    rest = a[1:]
    while rest:
        x = rest.pop(0)
        if x == "--type":
            typ = rest.pop(0)
        elif x == "--limit":
            limit = int(rest.pop(0))
        else:
            words.append(x)
    find(words, typ, limit)
elif a[0] == "pull":
    pull(a[1], a[2:])
else:
    sys.exit(__doc__)
