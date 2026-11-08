#!/bin/bash
# Installs her from Director/gen/rigged. She shares his Body maps, so run this after any change to him.
cd /c/Projects/TKShock
R=Director/gen/rigged; P=Assets/MusicVideo/Person2; mkdir -p $P
cp $R/Person2.fbx $P/
cp $R/Body_BaseMap.png $P/Person_Base.png; cp $R/Body_BumpMap.png $P/Person_Normal.png
cp $R/Body_MetallicGlossMap.png $P/Person_Gloss.png; cp $R/Body_OcclusionMap.png $P/Person_Occlusion.png
cp $R/Person2_Head_BaseMap.png $P/Person_Head.png; cp $R/Person2_Head_BumpMap.png $P/Person_Head_Normal.png
cp $R/Person2_Head_MetallicGlossMap.png $P/Person_Head_Gloss.png; cp $R/Person2_Head_OcclusionMap.png $P/Person_Head_Occlusion.png
node Director/mv.mjs refresh | tail -1 | cut -c1-90
node Director/mv.mjs call humanoid '{"fbx":"Assets/MusicVideo/Person2/Person2.fbx","base":"Assets/MusicVideo/Person2/Person_Base.png","normal":"Assets/MusicVideo/Person2/Person_Normal.png","mat":"Assets/MusicVideo/Person2/Person.mat","head":"Assets/MusicVideo/Person2/Person_Head.png","headmat":"Assets/MusicVideo/Person2/Head.mat"}' 2>&1 | tail -3 | tr -d '\n ' | cut -c1-120; echo
