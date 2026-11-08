"""Checks the sign conventions of sim.pose_from_angles numerically: where each rest direction goes under the pose. py -I Director/tools/motion/test_conventions.py"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from motion import sim, quat as Q
def d(q, v): return np.round(Q.rotate(np.asarray(q), np.array(v, float)), 2)
p = sim.pose_from_angles(hipFlex=90, shAbd=0, shFlex=0)
assert np.allclose(d(p['LeftUpperArm'], [1, 0, 0]), [0, -1, 0]), 'left arm hangs'
assert np.allclose(d(p['RightUpperArm'], [-1, 0, 0]), [0, -1, 0]), 'right arm hangs'
assert np.allclose(d(p['LeftUpperLeg'], [0, -1, 0]), [0, 0, 1]), 'hip flexion brings the thigh forward'
p = sim.pose_from_angles(shAbd=0, shFlex=90)
assert np.allclose(d(p['LeftUpperArm'], [1, 0, 0]), [0, 0, 1]), 'shoulder flexion brings a hanging arm forward'
p = sim.pose_from_angles(hipAbd=30)
assert d(p['LeftUpperLeg'], [0, -1, 0])[0] > 0 and d(p['RightUpperLeg'], [0, -1, 0])[0] < 0, 'abduction opens the legs'
p = sim.pose_from_angles(knee=90)
assert np.allclose(d(p['LeftLowerLeg'], [0, -1, 0]), [0, 0, -1]), 'knee bends the shin backward'
p = sim.pose_from_angles(elbow=90, shAbd=90)
assert np.allclose(d(p['LeftLowerArm'], [1, 0, 0]), [0, 0, 1]) and np.allclose(d(p['RightLowerArm'], [-1, 0, 0]), [0, 0, 1]), 'elbows bend forward'
p = sim.pose_from_angles(anklePF=45)
assert d(p['LeftFoot'], [0, 0, 1])[1] < 0, 'plantar flexion points the toes down'
p = sim.pose_from_angles(neck=40, waist=40)
assert d(p['Head'], [0, 1, 0])[2] > 0 and d(p['Spine'], [0, 1, 0])[2] > 0, 'neck and waist flex forward'
print('conventions ok')
