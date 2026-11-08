"""Her glasses with real lenses: glasses.fbx (blender_punch.py, one palette material, so the lenses were opaque palette faces that read as white
eyes in a close-up) split into two materials, the frame on punch.mat and the lenses on Glasses_Lens.mat: MV/Lit transparent, premultiplied so
the lights' highlight stays, a faint cool tint, almost clear; no environment reflection (in the white clinic it
mirrored the sky probe and read as mirrored shades). Smoothness .35: from about .5 up, the clinic's light (and the look's `catch`, made for wet
eyes) filled the lens white whatever else was set (measured at p_doc, 65.9 s); at .2 the lens turned away from the lens camera still showed a grey patch on its outer, more grazing
half (URP's Fresnel term on the fallback environment colour and the light's lobe, not a leftover face: every lens face is on Glasses_Lens);
at 0 both lenses read clear (proof: Director/captures/wardrobe/glasses_clinic_closeup.png). The lenses bulge 3 mm.
  1. blender -b -P Director/tools/glasses_lens.py            writes Assets/MusicVideo/Props/Punch/glasses_lens.fbx
  2. py Director/tools/glasses_lens.py --unity               writes its .meta (materials mapped by name) and Glasses_Lens.mat
Cast it with no "material" key (the model's own two materials stay)."""
import os, sys, re, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, "Assets", "MusicVideo", "Props", "Punch")
guid = lambda n: hashlib.md5(("glasses-lens/" + n).encode()).hexdigest()
LENS_UV = (0.5625, 0.6875)          # punch_palette.json "lens"

if "--unity" in sys.argv:
    w = lambda p, s: open(p, "w", encoding="utf8", newline="\n").write(s)
    meta = open(os.path.join(P, "glasses.fbx.meta"), encoding="utf8").read()
    meta = meta.replace(re.search(r"guid: (\w+)", meta).group(1), guid("glasses_lens.fbx"), 1)
    punch = re.search(r"guid: (\w+)", open(os.path.join(P, "punch.mat.meta"), encoding="utf8").read()).group(1)
    ext = "  externalObjects:\n"
    for name, g in (("Glasses_Frame", punch), ("Glasses_Lens", guid("Glasses_Lens.mat"))):
        ext += f"  - first:\n      type: UnityEngine:Material\n      assembly: UnityEngine.CoreModule\n      name: {name}\n    second: {{fileID: 2100000, guid: {g}, type: 2}}\n"
    meta = meta.replace("  externalObjects: {}\n", ext, 1)
    w(os.path.join(P, "glasses_lens.fbx.meta"), meta)
    tmpl = open(os.path.join(ROOT, "Assets", "Videos", "hawkespunch", "Props", "Person2_doctor.mat"), encoding="utf8").read()
    m = tmpl.replace("m_Name: Person2_doctor", "m_Name: Glasses_Lens")
    m = re.sub(r"(- _\w+Map:\n        m_Texture: )\{[^}]*\}", r"\1{fileID: 0}", m)
    m = re.sub(r"  m_ValidKeywords:\n(  - \w+\n)*", "  m_ValidKeywords:\n  - _ALPHAPREMULTIPLY_ON\n  - _ENVIRONMENTREFLECTIONS_OFF\n  - _SURFACE_TYPE_TRANSPARENT\n", m)
    m = m.replace("  m_CustomRenderQueue: -1", "  m_CustomRenderQueue: 3000")
    m = m.replace("  stringTagMap: {}", "  stringTagMap:\n    RenderType: Transparent")
    m = m.replace("  disabledShaderPasses: []", "  disabledShaderPasses:\n  - MOTIONVECTORS\n  - DepthOnly\n  - SHADOWCASTER")
    for k, v in (("_Surface", 1), ("_Blend", 0), ("_BlendModePreserveSpecular", 1), ("_SrcBlend", 1), ("_DstBlend", 10), ("_SrcBlendAlpha", 1),
                 ("_DstBlendAlpha", 10), ("_ZWrite", 0), ("_Cull", 0), ("_Smoothness", 0), ("_Metallic", 0), ("_GlossMapScale", 0), ("_SpecularHighlights", 1),
                 ("_EnvironmentReflections", 0), ("_ReceiveShadows", 0)):
        m = re.sub(r"- %s: [-\d.e]+" % k, "- %s: %g" % (k, v), m)
    c = "{r: 0.06, g: 0.07, b: 0.08, a: 0.10}"   # a dark albedo: MV/Lit's faceFill and skin light add on the albedo without its alpha, which lit pale lenses white
    m = re.sub(r"- _BaseColor: \{[^}]*\}", "- _BaseColor: " + c, m); m = re.sub(r"- _Color: \{[^}]*\}", "- _Color: " + c, m)
    m = re.sub(r"- _EmissionColor: \{[^}]*\}", "- _EmissionColor: {r: 0, g: 0, b: 0, a: 1}", m)
    w(os.path.join(P, "Glasses_Lens.mat"), m)
    w(os.path.join(P, "Glasses_Lens.mat.meta"), f"fileFormatVersion: 2\nguid: {guid('Glasses_Lens.mat')}\nNativeFormatImporter:\n  externalObjects: {{}}\n  mainObjectFileID: 2100000\n  userData: \n  assetBundleName: \n  assetBundleVariant: \n")
    print("wrote glasses_lens.fbx.meta, Glasses_Lens.mat")
    sys.exit(0)

import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(P, "glasses.fbx"))
ob = next(o for o in bpy.data.objects if o.type == "MESH")
me = ob.data
for m_ in list(me.materials): pass
me.materials.clear()
me.materials.append(bpy.data.materials.new("Glasses_Frame")); me.materials.append(bpy.data.materials.new("Glasses_Lens"))
bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.active
n = 0
for f in bm.faces:
    u = sum(l[uv].uv[0] for l in f.loops) / len(f.loops); v = sum(l[uv].uv[1] for l in f.loops) / len(f.loops)
    lens = abs(u - LENS_UV[0]) < .02 and abs(v - LENS_UV[1]) < .02
    f.material_index = 1 if lens else 0; n += lens
# A real lens is curved: a flat disc mirrors a light whole (a white lens); a 3 mm bulge shrinks the highlight to a spot.
lv = {v for f in bm.faces if f.material_index == 1 for v in f.verts}
for v in lv:
    cx = .031 if v.co.x > 0 else -.031
    r2 = ((v.co.x - cx) ** 2 + v.co.z ** 2) / .02 ** 2
    v.co.y -= .003 * max(0., 1 - r2)
bm.to_mesh(me); bm.free()
print("LENS faces", n, "of", len(me.polygons))
bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.fbx(filepath=os.path.join(P, "glasses_lens.fbx"), use_selection=True, object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                         bake_space_transform=True, apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL", mesh_smooth_type="FACE", use_tspace=True,
                         bake_anim=False, path_mode="STRIP", embed_textures=False)
print("DONE glasses_lens.fbx")
