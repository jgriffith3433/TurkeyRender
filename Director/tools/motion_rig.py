#!/usr/bin/env python
"""Writes Director/library/motion/rig.json: his skeleton (Assets/MusicVideo/Person/Person.fbx) as the canonical motion rig every
motion tool outside Unity uses (motion_sim.py, motion_match.mjs, motion_admit.py). 22 joints, no fingers or eyes, in BVH space
(right-handed, Y up, he faces +Z, his left is +X; metres). Each joint: his Unity bone name, the Mixamo name the exported clips
carry (Unity's Humanoid mapper knows them), parent, rest offset from the parent, and the segment's mass share for the sim.
   py Director/tools/motion_rig.py            (runs Blender headless on Person.fbx, about 20 s)"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # Director
PROJECT = os.path.dirname(ROOT)
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
PERSON = os.path.join(PROJECT, 'Assets', 'MusicVideo', 'Person', 'Person.fbx')
OUT = os.path.join(ROOT, 'library', 'motion', 'rig.json')

# canonical name: (his Unity bone, Mixamo name, parent, mass kg)   total about 75 kg (de Leva segment shares)
JOINTS = [
    ('Hips', 'Hips', 'Hips', None, 11.0), ('Spine', 'Spine', 'Spine', 'Hips', 9.0), ('Chest', 'Chest', 'Spine1', 'Spine', 14.0),
    ('Neck', 'Neck', 'Neck', 'Chest', 1.0), ('Head', 'Head', 'Head', 'Neck', 5.0),
    ('LeftShoulder', 'LeftShoulder', 'LeftShoulder', 'Chest', 0.5), ('LeftUpperArm', 'LeftUpperArm', 'LeftArm', 'LeftShoulder', 2.2),
    ('LeftLowerArm', 'LeftLowerArm', 'LeftForeArm', 'LeftUpperArm', 1.4), ('LeftHand', 'LeftHand', 'LeftHand', 'LeftLowerArm', 0.5),
    ('RightShoulder', 'RightShoulder', 'RightShoulder', 'Chest', 0.5), ('RightUpperArm', 'RightUpperArm', 'RightArm', 'RightShoulder', 2.2),
    ('RightLowerArm', 'RightLowerArm', 'RightForeArm', 'RightUpperArm', 1.4), ('RightHand', 'RightHand', 'RightHand', 'RightLowerArm', 0.5),
    ('LeftUpperLeg', 'LeftUpperLeg', 'LeftUpLeg', 'Hips', 8.0), ('LeftLowerLeg', 'LeftLowerLeg', 'LeftLeg', 'LeftUpperLeg', 3.5),
    ('LeftFoot', 'LeftFoot', 'LeftFoot', 'LeftLowerLeg', 1.1), ('LeftToes', 'LeftToes', 'LeftToeBase', 'LeftFoot', 0.2),
    ('RightUpperLeg', 'RightUpperLeg', 'RightUpLeg', 'Hips', 8.0), ('RightLowerLeg', 'RightLowerLeg', 'RightLeg', 'RightUpperLeg', 3.5),
    ('RightFoot', 'RightFoot', 'RightFoot', 'RightLowerLeg', 1.1), ('RightToes', 'RightToes', 'RightToeBase', 'RightFoot', 0.2),
]
# the bone that marks where a segment ends (for tails and the end sites)
ENDS = {'Head': 'HeadTop', 'LeftHand': 'LeftHandMiddle3', 'RightHand': 'RightHandMiddle3', 'LeftToes': 'LeftToesEnd', 'RightToes': 'RightToesEnd'}

def blender_to_bvh(p):
    # Blender: Z up, he faces -Y, left +X.  BVH: Y up, faces +Z, left +X.  (x, y, z) -> (x, z, -y)
    return [round(p[0], 5), round(p[2], 5), round(-p[1], 5)]

def main():
    tmp = os.path.join(tempfile.gettempdir(), 'tkshock_rig_dump.json')
    subprocess.run([BLENDER, '-b', '--python', os.path.join(ROOT, 'tools', 'motion', 'rig_dump.py'), '--', PERSON, tmp], check=True, capture_output=True)
    arm = next(iter(json.load(open(tmp)).values()))
    by = {b['name']: b for b in arm}
    joints = []
    for name, unity, mixamo, parent, mass in JOINTS:
        b = by[unity]
        head = blender_to_bvh(b['head'])
        if name == 'Head': tail = [head[0], 1.75, head[2]]                                     # the top of his head
        elif name.endswith('Hand'): tail = blender_to_bvh(by[unity + 'Middle3']['head'])
        elif name.endswith('Toes'): tail = blender_to_bvh(b['tail'])
        else:
            child = next((j for j in JOINTS if j[3] == name and not j[0].endswith('Shoulder')), None)
            tail = blender_to_bvh(by[child[1]]['head']) if child else blender_to_bvh(b['tail'])
        phead = blender_to_bvh(by[[j for j in JOINTS if j[0] == parent][0][1]]['head']) if parent else [0, 0, 0]
        joints.append({'name': name, 'unity': unity, 'mixamo': mixamo, 'parent': parent, 'mass': mass,
                       'head': head, 'tail': tail, 'offset': [round(head[i] - phead[i], 5) for i in range(3)]})
    rig = {'about': 'His skeleton in BVH space (Y up, faces +Z, left +X, metres), from Assets/MusicVideo/Person/Person.fbx by motion_rig.py. '
                    'Rest is his T-pose. offset is from the parent head; the root offset is the hips rest position. Clips made from it carry the mixamo names.',
           'source': 'Assets/MusicVideo/Person/Person.fbx', 'height': 1.75, 'mass': sum(j[4] for j in JOINTS), 'joints': joints}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(rig, open(OUT, 'w'), indent=1)
    print('wrote', OUT, len(joints), 'joints')
    for j in joints: print(f"  {j['name']:14} {j['mixamo']:14} head {j['head']}")

if __name__ == '__main__':
    main()
