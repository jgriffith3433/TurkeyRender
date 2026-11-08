#!/bin/bash
# Rebuilds the 3D person end to end: Blender build, rig, bakes and export, copy into Unity, set up as a Humanoid.
# Pass "--no-blender" to skip the Blender run and only install what is already in Director/gen/rigged.
# Parts come from phoriginsassets/models (Mixamo Ch08 head and hands, Ch31 top and trousers); the face and tiles from
# Director/gen/face_tex.png and Director/gen/person_work/tex/. Heavy stages take Director/gen/heavy.lock (see ART_BIBLE.md).
cd /c/Projects/TKShock
OUT="$PWD/Director/gen/rigged"; L=Director/gen/heavy.lock
if [ "$1" != "--no-blender" ]; then
  while [ -f "$L" ] && [ $(( $(date +%s) - $(stat -c %Y "$L") )) -lt 900 ]; do sleep 10; done
  echo "person: rebuild" > "$L"
  timeout 1500 "/c/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P Director/tools/blender_rig.py -- x "$(cygpath -w "$OUT")" build,rig,maps,paint,hair,final 2>&1 | grep -E "DONE|FINAL|Error:|Traceback" | cut -c1-170
  rm -f "$L"
fi
P=Assets/MusicVideo/Person
cp "$OUT/Person.fbx" $P/Person.fbx
cp "$OUT/Body_BaseMap.png" $P/Person_Base.png
cp "$OUT/Body_BumpMap.png" $P/Person_Normal.png
cp "$OUT/Body_MetallicGlossMap.png" $P/Person_Gloss.png
cp "$OUT/Body_OcclusionMap.png" $P/Person_Occlusion.png
cp "$OUT/Head_BaseMap.png" $P/Person_Head.png
cp "$OUT/Head_BumpMap.png" $P/Person_Head_Normal.png
cp "$OUT/Head_MetallicGlossMap.png" $P/Person_Head_Gloss.png
cp "$OUT/Head_MetallicGlossMap.png" $P/Person_Head_Gloss_hair.png   # Head.mat reads this one (the hair's sheen is in the map itself now)
cp "$OUT/Head_OcclusionMap.png" $P/Person_Head_Occlusion.png
node Director/mv.mjs refresh | tail -1 | cut -c1-90
node Director/mv.mjs call humanoid '{"fbx":"Assets/MusicVideo/Person/Person.fbx","base":"Assets/MusicVideo/Person/Person_Base.png","normal":"Assets/MusicVideo/Person/Person_Normal.png","mat":"Assets/MusicVideo/Person/Person.mat","head":"Assets/MusicVideo/Person/Person_Head.png","headmat":"Assets/MusicVideo/Person/Head.mat"}' 2>&1 | tail -3 | tr -d '\n ' | cut -c1-120; echo
