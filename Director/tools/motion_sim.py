#!/usr/bin/env python
"""Physics beats for his rig, outside Unity: a MuJoCo active ragdoll (tools/motion/sim.py) plays each beat N times with different
impulses, stiffness, damping and seeds, every candidate is measured (tools/motion/measure.py: snaps, jitter, hinge flips, hyperextension)
and checked against the beat's own physics (did he reach the ceiling, did the box stop in about 1.5 s, one slow rotation...), scored,
and the best two are kept as canonical BVH ready for motion_admit.py (FBX, Assets/MusicVideo/Motion, clip import, clean, previews).
   py Director/tools/motion_sim.py <beat|all> [--seeds 8] [--keep 2] [--only-score]
Beats: punched_launch, zg_drift_idle, zg_startle, zg_shove_tumble, catch_slide, zg_throw_recoil.
Output: Director/gen/motion/sim/<beat>/<beat>_s<seed>.bvh|.npz|.json, candidates.json (every candidate's parameters, measures, checks and score,
best first), keep/ (the two kept, as ps_<beat>_a / _b). Deterministic per seed. If Director/tools/critic.mjs exists it is run on each
candidate's BVH (`node critic.mjs <bvh> --json`) and its `score` is averaged in."""
import argparse, json, math, os, shutil, subprocess, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from motion import sim, stream as S, measure as M, quat as Q  # noqa: E402

OUT = os.path.join(ROOT, 'gen', 'motion', 'sim')
CRITIC = os.path.join(HERE, 'critic.mjs')
CANON = S.CANON
I = {n: i for i, n in enumerate(CANON)}
UP = np.array([0, 1.0, 0]); FWD = np.array([0, 0, 1.0])


def upright_helper(body, kp=600, kd=80, hold_xz=None, kxz=800):
    """A hidden hand: a torque on the hips toward world up (and the facing it started with), and a weak spring over a floor point, for
    beats on the ground where a ragdoll would otherwise topple (balance is not what these beats are about). Returns a per-step function."""
    q0 = body.d.xquat[body.bid['Hips']].copy()
    def step(t, b, extra):
        bid = b.bid['Hips']; q = b.d.xquat[bid]
        qx = np.array([q[1], q[2], q[3], q[0]]); q0x = np.array([q0[1], q0[2], q0[3], q0[0]])
        err = Q.to_rotvec(Q.mul(q0x, Q.inv(qx)))                  # world rotation that takes now back to the start
        w = np.zeros(6); import mujoco; mujoco.mj_objectVelocity(b.m, b.d, mujoco.mjtObj.mjOBJ_BODY, bid, w, 0)
        b.d.xfrc_applied[bid, 3:] += kp * err - kd * w[:3]
        if hold_xz is not None:
            p = b.d.xpos[bid]; v = w[3:]
            f = np.array([kxz * (hold_xz[0] - p[0]) - 60 * v[0], 0, kxz * (hold_xz[1] - p[2]) - 60 * v[2]])
            b.d.xfrc_applied[bid, :3] += f
    return step


def set_gravity(body, g):
    body.m.opt.gravity[:] = [0, -g, 0]


def noise_pose(body, rng, amp, periods, seconds, fps=30.0):
    frames = int(seconds * fps) + 2
    n = sim.smooth_noise(rng, len(CANON), frames / fps, fps, amp, periods)
    def at(t):
        f = min(frames - 1, int(t * fps))
        return {CANON[j]: n[f, j] for j in range(len(CANON)) if CANON[j] in body.joints}
    return at


# ---------------------------------------------------------------- beats
def beat_punched_launch(seed, rng, p):
    """Seated on a bed; a hit to the head sends him up and back through the ceiling; flail, then tumble. Gravity on, then off as he leaves."""
    seat_y = 0.5
    props = [{'name': 'bed', 'type': 'box', 'pos': [0, seat_y / 2, -0.35], 'size': [0.9, seat_y / 2, 0.9]},
             {'name': 'ceiling', 'type': 'plane', 'pos': [0, 2.45, 0], 'size': [4, 0.04, 4]}]
    b = sim.Body(props=props, gravity=(0, -9.81, 0), floor=True)
    pose = sim.seated(); b.target = pose
    b.set_pose(pose, root_pos=[0, seat_y + 0.12, 0.0])
    helper = upright_helper(b, kp=400, kd=60)
    import mujoco
    ceil = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_GEOM, 'ceiling')
    t_hit = 0.8; dur = 0.06
    J = p['impulse']; ang = math.radians(p['elevation'])
    direction = np.array([p['side'] * 0.08, math.sin(ang), -math.cos(ang)]); direction /= np.linalg.norm(direction)
    force = direction * J / dur
    flail = noise_pose(b, rng, p['flailDeg'], (0.25, 0.7), 4.0)
    state = {'hit': False, 'broke': None, 'left': None, 'peak': 0.0}
    def step(t, bd, extra):
        head = bd.d.xpos[bd.bid['Head']]
        state['peak'] = max(state['peak'], float(head[1]))
        if t < t_hit:
            helper(t, bd, extra); return
        if not state['hit']:
            state['hit'] = True; bd.target = sim.seated()
        if t < t_hit + dur:
            bd.push('Head', force * 0.35, point=head)
            bd.push('Chest', force * 0.65)
        if t > t_hit + 0.03:
            bd.kp_scale = p['flailStiff']; bd.kd_scale = p['flailDamp']
            bd.noise = flail(t - t_hit)
            bd.gain = {n: (0.6 if n in ('Neck', 'Head', 'Spine', 'Chest') else 1.0) for n in sim.KP}
        if state['broke'] is None and head[1] > 2.3 and bd.d.cvel[bd.bid['Head']][4] > 0:
            bd.m.geom_contype[ceil] = 0; bd.m.geom_conaffinity[ceil] = 0; state['broke'] = round(t, 3)
        if state['left'] is None and bd.d.xpos[bd.bid['Hips']][1] > 2.7:
            set_gravity(bd, 0.0); state['left'] = round(t, 3)
    st, _ = sim.run(b, 3.6, on_step=step)
    v_launch = float(np.linalg.norm(st.pos[int((t_hit + 0.15) * 30), I['Hips']] - st.pos[int((t_hit + 0.05) * 30), I['Hips']]) * 10)
    checks = {'reachedCeiling': state['peak'] > 2.3, 'ceilingBrokeAt': state['broke'], 'gravityOffAt': state['left'],
              'launchSpeed': round(v_launch, 2), 'launchSpeedOk': 5.0 <= v_launch <= 12.0, 'peakHeadY': round(state['peak'], 2),
              'spinAfterLeaving': spin_rate(st, (state['left'] or 2.5), 3.5)}
    checks['pass'] = checks['reachedCeiling'] and checks['launchSpeedOk'] and state['left'] is not None and 60 <= checks['spinAfterLeaving'] <= 720
    return st, checks, {'floor': 0.0, 'zero_g': False}


def beat_zg_drift_idle(seed, rng, p):
    """Gravity 0: hold the NASA neutral float with slow wander and breath. 12 s, a loop candidate (the last second is blended into the first)."""
    b = sim.Body(gravity=(0, 0, 0), floor=False)
    base = sim.nbp(variant=p['variant']); b.target = base; b.set_pose(base, root_pos=[0, 1.3, 0])
    wander = noise_pose(b, rng, p['wanderDeg'], (3.0, 7.0), 13.0)
    breath_per = p['breath']
    def step(t, bd, extra):
        n = wander(t)
        br = math.sin(2 * math.pi * t / breath_per)
        n['Chest'] = Q.mul(n['Chest'], sim.rot([1, 0, 0], -1.5 * br)); n['Spine'] = Q.mul(n['Spine'], sim.rot([1, 0, 0], -0.8 * br))
        for s in ('Left', 'Right'): n[s + 'UpperArm'] = Q.mul(n[s + 'UpperArm'], sim.rot([0, 0, 1], (1 if s == 'Left' else -1) * 1.2 * br))
        bd.noise = n
    b.kp_scale = p['stiff']; b.kd_scale = p['damp']
    st, _ = sim.run(b, 12.0, on_step=step)
    st = loop_blend(st, 1.0)
    nb = nbp_check(st)
    checks = {**nb, 'loopGapDeg': M.measure(st, zero_g=True)['loopGapDeg'], 'hipsDriftM': round(float(np.linalg.norm(st.pos[-1, 0] - st.pos[0, 0])), 3)}
    checks['pass'] = nb['nbpOk'] and checks['loopGapDeg'] < 4 and checks['hipsDriftM'] < 0.08
    return st, checks, {'floor': None, 'zero_g': True}


def beat_zg_startle(seed, rng, p):
    """Gravity 0: NBP, then a flinch (starfish over 6 frames, back over 1.5 s) and a small off-centre poke that sets a slow spin."""
    b = sim.Body(gravity=(0, 0, 0), floor=False)
    base = sim.nbp(variant=p['variant']); star = sim.starfish(); b.target = base; b.set_pose(base, root_pos=[0, 1.3, 0])
    wander = noise_pose(b, rng, 3.0, (3.0, 6.0), 7.0)
    t0 = 1.0; J = p['impulse']; dur = 0.12
    def step(t, bd, extra):
        bd.noise = wander(t)
        if t < t0: return
        u = t - t0
        if u < 0.2: bd.target = sim.blend_pose(base, star, min(1.0, u / 0.12)); bd.kp_scale = p['flinchStiff']
        elif u < 1.8: bd.target = sim.blend_pose(star, base, (u - 0.2) / 1.6); bd.kp_scale = 1.0 + (p['flinchStiff'] - 1.0) * max(0.0, 1 - (u - 0.2) / 0.6)
        else: bd.target = base; bd.kp_scale = 1.0
        if u < dur:
            sh = bd.d.xpos[bd.bid['RightUpperArm']]
            bd.push('Chest', np.array([-1.0, 0.15, 0.3]) / np.linalg.norm([1.0, 0.15, 0.3]) * J / dur, point=sh)
    st, _ = sim.run(b, 6.0, on_step=step)
    spin = spin_rate(st, 2.5, 6.0)
    amp = float(np.degrees(Q.angle(Q.mul(Q.inv(S.canonical_local(st)[int(t0 * 30), I['LeftUpperArm']]), S.canonical_local(st)[int((t0 + 0.2) * 30), I['LeftUpperArm']]))))
    checks = {'spinDegPerS': spin, 'spinOk': 15 <= spin <= 90, 'flinchArmDeg': round(amp, 1), 'flinchOk': amp > 35, **nbp_check(st.cut(int(3.5 * 30), st.frames))}
    checks['pass'] = checks['spinOk'] and checks['flinchOk']
    return st, checks, {'floor': None, 'zero_g': True}


def beat_zg_shove_tumble(seed, rng, p):
    """Gravity 0: pushed from behind between the shoulder blades; one slow rotation over the clip, arms loose for a moment then held."""
    b = sim.Body(gravity=(0, 0, 0), floor=False)
    base = sim.nbp(variant=p['variant']); b.target = base; b.set_pose(base, root_pos=[0, 1.3, 0])
    wander = noise_pose(b, rng, 3.0, (3.0, 6.0), 9.0)
    t0 = 0.5; dur = 0.25; J = p['impulse']
    def step(t, bd, extra):
        bd.noise = wander(t)
        u = t - t0
        if u < 0: return
        if u < dur:
            chest = bd.d.xpos[bd.bid['Chest']]
            bd.push('Chest', np.array([0.0, 0.0, 1.0]) * J / dur, point=chest + np.array([0, p['lever'], -0.1]))
        loose = max(0.0, 1 - u / 0.8)
        bd.kp_scale = 1.0 - (1.0 - p['looseStiff']) * loose
    st, _ = sim.run(b, 8.0, on_step=step)
    total = total_rotation(st, t0 + dur, 8.0)
    v = float(np.linalg.norm(st.pos[-1, 0] - st.pos[int(1.0 * 30), 0]) / (8.0 - 1.0))
    checks = {'rotationDeg': round(total, 1), 'oneTurn': 270 <= total <= 450, 'driftMps': round(v, 2), 'driftOk': 0.25 <= v <= 0.8}
    checks['pass'] = checks['oneTurn'] and checks['driftOk']
    return st, checks, {'floor': None, 'zero_g': True}


def beat_catch_slide(seed, rng, p):
    """Braced on a low-friction floor; a heavy mass flies level into his palms (it comes from space: no weight of its own, only momentum)
    and he brings it to a stop over about 1.5 s, sliding back on his feet."""
    props = [{'name': 'box', 'type': 'box', 'pos': [0, 1.3, 2.2], 'size': [0.3, 0.3, 0.3], 'mass': p['mass'], 'free': True}]
    b = sim.Body(props=props, gravity=(0, -9.81, 0), floor=True)
    import mujoco
    fl = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_GEOM, 'floor'); b.m.geom_friction[fl] = [p['mu'], 0.005, 0.0001]
    bx = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_GEOM, 'box'); b.m.geom_friction[bx] = [1.2, 0.005, 0.0001]
    pose = sim.braced(); b.target = pose; b.set_pose(pose, root_pos=[0, 0.88, 0])
    jid = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_BODY, 'box'); dof = b.m.body_dofadr[jid]
    b.d.qvel[dof:dof + 3] = [0, 0, -p['speed']]
    helper = upright_helper(b, kp=p['brace'], kd=p['brace'] / 8)
    b.kp_scale = p['stiff']
    hist = []
    def step(t, bd, extra):
        helper(t, bd, extra)
        bd.d.xfrc_applied[jid, :3] += [0, p['mass'] * 9.81, 0]          # the mass has momentum but no weight
        if t < 0.3: bd.d.qvel[dof:dof + 3] = [0, 0, -p['speed']]       # fly level until contact
        v = float(np.linalg.norm(bd.d.qvel[dof:dof + 3])); hist.append((round(t, 3), v, float(bd.d.xpos[jid][2]), float(bd.d.xpos[bd.bid['Hips']][1])))
    st, _ = sim.run(b, 3.5, on_step=step)
    contact_t = next((t for t, v, z, hy in hist if v < p['speed'] * 0.95), None)
    stop_t = None
    if contact_t is not None:
        for i, (t, v, z, hy) in enumerate(hist):
            if t > contact_t and v < 0.3 and all(h[1] < 0.4 for h in hist[i:i + 300]): stop_t = t; break
    decel = round(stop_t - contact_t, 2) if contact_t is not None and stop_t is not None else None
    min_hips = min(h[3] for h in hist) if hist else 0
    slide = float(st.pos[-1, 0, 2] - st.pos[0, 0, 2])
    checks = {'contactAt': contact_t, 'stopAfterS': decel, 'decelOk': decel is not None and 0.8 <= decel <= 2.4, 'slideBackM': round(-slide, 2), 'stayedUp': min_hips > 0.6,
              'boxMass': round(p['mass'], 1), 'boxSpeed': round(p['speed'], 2)}
    checks['pass'] = checks['decelOk'] and checks['stayedUp'] and 0.2 <= -slide <= 3.0
    return st, checks, {'floor': 0.0, 'zero_g': False}


def beat_zg_throw_recoil(seed, rng, p):
    """Gravity 0: a ball in the right hand, a wind-up, a throw; the release sends him back and turning (equal and opposite)."""
    props = [{'name': 'ball', 'type': 'sphere', 'pos': [-0.5, 1.6, 0.3], 'size': [0.11], 'mass': p['mass'], 'free': True, 'weld': 'RightHand'}]
    b = sim.Body(props=props, gravity=(0, 0, 0), floor=False)
    import mujoco
    base = sim.nbp(variant=0.0)
    wind = sim.pose_from_angles(hipFlex=35, hipAbd=12, knee=40, anklePF=20, waist=-5, neck=10, shFlex=40, shAbd=40, elbow=75, shTwist=20)
    wind['RightUpperArm'] = Q.mul(sim.rot([0, 1, 0], -30), sim.rot([0, 0, 1], 60)); wind['RightLowerArm'] = sim.rot(sim.HINGE['RightLowerArm'][0], 110)
    wind['Chest'] = sim.rot([0, 1, 0], 25); wind['Spine'] = sim.rot([0, 1, 0], 10)
    throw = dict(wind); throw['RightUpperArm'] = Q.mul(sim.rot([0, 1, 0], 100), sim.rot([0, 0, 1], 30)); throw['RightLowerArm'] = sim.rot(sim.HINGE['RightLowerArm'][0], 10)
    throw['Chest'] = sim.rot([0, 1, 0], -25); throw['Spine'] = sim.rot([0, 1, 0], -10)
    b.target = base; b.set_pose(wind, root_pos=[0, 1.3, 0])
    # put the ball in the hand and weld it
    hb = b.bid['RightHand']; mujoco.mj_forward(b.m, b.d)
    bb = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_BODY, 'ball'); dof = b.m.body_dofadr[bb]; qa = b.m.jnt_qposadr[b.m.body_jntadr[bb]]
    b.d.qpos[qa:qa + 3] = b.d.xpos[hb] + Q.rotate(np.array([b.d.xquat[hb][1], b.d.xquat[hb][2], b.d.xquat[hb][3], b.d.xquat[hb][0]]), np.array([-0.14, 0, 0]))
    mujoco.mj_forward(b.m, b.d)
    eq = mujoco.mj_name2id(b.m, mujoco.mjtObj.mjOBJ_EQUALITY, 'w_ball'); b.m.eq_data[eq][:3] = 0
    # weld needs relative pose: recompute by letting MuJoCo take the current relative pose
    b.m.eq_data[eq][:] = 0; b.m.eq_data[eq][10] = 1  # torquescale
    rel = np.zeros(3); mujoco.mju_sub3(rel, b.d.xpos[bb], b.d.xpos[hb]); qh = b.d.xquat[hb].copy(); qinv = np.zeros(4); mujoco.mju_negQuat(qinv, qh)
    relb = np.zeros(3); mujoco.mju_rotVecQuat(relb, rel, qinv); b.m.eq_data[eq][3:6] = relb
    qrel = np.zeros(4); mujoco.mju_mulQuat(qrel, qinv, b.d.xquat[bb]); b.m.eq_data[eq][6:10] = qrel
    b.d.eq_active[eq] = 1
    t0 = 0.8; swing = p['swing']
    state = {'released': None}
    def step(t, bd, extra):
        u = t - t0
        if u < 0: bd.target = wind; return
        if state['released'] is None:
            bd.target = sim.blend_pose(wind, throw, min(1.0, u / swing)); bd.kp_scale = p['throwStiff']
            if u > swing * p['releaseAt']:
                bd.d.eq_active[eq] = 0; state['released'] = round(t, 3)
        else:
            k = min(1.0, (t - state['released']) / 1.2)
            bd.target = sim.blend_pose(throw, base, k); bd.kp_scale = p['throwStiff'] + (1.0 - p['throwStiff']) * k
    st, extra = sim.run(b, 5.0, on_step=step)
    v_body = float(np.linalg.norm(st.pos[-1, 0] - st.pos[int(2.5 * 30), 0]) / 2.5)
    rot = total_rotation(st, 2.0, 5.0)
    checks = {'releasedAt': state['released'], 'recoilMps': round(v_body, 3), 'recoilOk': 0.05 <= v_body <= 0.8, 'turnDeg': round(rot, 1), 'turnOk': 10 <= rot <= 200}
    checks['pass'] = state['released'] is not None and checks['recoilOk'] and checks['turnOk']
    return st, checks, {'floor': None, 'zero_g': True}


# ---------------------------------------------------------------- checks
def spin_rate(st, t_from, t_to):
    f0, f1 = int(t_from * st.fps), min(st.frames - 1, int(t_to * st.fps))
    if f1 <= f0 + 2: return 0.0
    tot = total_rotation(st, t_from, t_to)
    return round(tot / ((f1 - f0) / st.fps), 1)


def total_rotation(st, t_from, t_to):
    f0, f1 = int(t_from * st.fps), min(st.frames - 1, int(t_to * st.fps))
    q = Q.continuous(st.quat[f0:f1 + 1, I['Hips']].astype(float))
    steps = Q.angle(Q.mul(Q.inv(q[:-1]), q[1:]))
    return float(np.degrees(steps.sum()))


def nbp_check(st):
    """The research's base float: hip 25-50, knee 35-55, head tipped down, toes quiet, no chair (both over 70 for 1.5 s)."""
    knee = M.knee_angle(st, 'Left')
    hip = M.hinge_angle(st, 'Spine', 'Hips', 'LeftUpperLeg', 'LeftLowerLeg')
    loc = S.canonical_local(st); neck = np.degrees(Q.to_rotvec(loc[:, I['Neck']])[:, 0] + Q.to_rotvec(loc[:, I['Head']])[:, 0])
    r = {'hipFlexMean': round(float(hip.mean()), 1), 'kneeFlexMean': round(float(knee.mean()), 1), 'neckDownMean': round(float(neck.mean()), 1)}
    r['nbpOk'] = 20 <= r['hipFlexMean'] <= 60 and 30 <= r['kneeFlexMean'] <= 65 and r['neckDownMean'] > 5
    return r


def loop_blend(st, seconds):
    """Make the last `seconds` meet the first: blend the tail's local rotations and root toward the head's, so frame N-1 flows into frame 0."""
    n = int(seconds * st.fps); F = st.frames
    loc = S.canonical_local(st); root = st.pos[:, 0].astype(float).copy()
    out = loc.copy()
    for k in range(n):
        f = F - n + k; w = (k + 1) / (n + 1)
        w = w * w * (3 - 2 * w)
        out[f] = Q.slerp(loc[f], loc[k], np.full(loc.shape[1], w))
        root[f] = root[f] * (1 - w) + (root[k] + (root[F - n] - root[0])) * w
    # back to world
    wq = np.zeros_like(out)
    rj = {j['name']: j for j in S.load_rig()['joints']}
    for ci, cname in enumerate(CANON):
        p = rj[cname]['parent']; wq[:, ci] = out[:, ci] if not p else Q.mul(wq[:, CANON.index(p)], out[:, ci])
    pos = S.fk_canonical(wq, root)
    return S.Stream(CANON, st.parents, pos, wq, st.fps, {**st.meta, 'loopBlended': seconds})


# ---------------------------------------------------------------- candidates
def params_for(beat, seed):
    rng = np.random.default_rng(seed * 7919 + hash(beat) % 1000)
    u = rng.uniform
    if beat == 'punched_launch': return {'impulse': u(560, 820), 'elevation': u(55, 72), 'side': u(-1, 1), 'flailStiff': u(0.08, 0.25), 'flailDamp': u(0.6, 1.4), 'flailDeg': u(25, 55)}
    if beat == 'zg_drift_idle': return {'variant': u(-0.6, 0.6), 'wanderDeg': u(3, 7), 'breath': u(4.0, 5.2), 'stiff': u(0.5, 1.2), 'damp': u(0.8, 1.6)}
    if beat == 'zg_startle': return {'variant': u(-0.4, 0.4), 'impulse': u(4, 9), 'flinchStiff': u(1.8, 3.2)}
    if beat == 'zg_shove_tumble': return {'variant': u(-0.4, 0.4), 'impulse': u(28, 50), 'lever': u(0.12, 0.3), 'looseStiff': u(0.3, 0.7)}
    if beat == 'catch_slide': return {'mass': u(45, 85), 'speed': u(2.5, 4.0), 'mu': u(0.06, 0.16), 'brace': u(600, 1600), 'stiff': u(0.8, 1.8)}
    if beat == 'zg_throw_recoil': return {'mass': u(3, 8), 'swing': u(0.18, 0.32), 'releaseAt': u(0.6, 0.9), 'throwStiff': u(4.0, 9.0)}
    raise SystemExit('no beat ' + beat)


BEATS = {'punched_launch': beat_punched_launch, 'zg_drift_idle': beat_zg_drift_idle, 'zg_startle': beat_zg_startle,
         'zg_shove_tumble': beat_zg_shove_tumble, 'catch_slide': beat_catch_slide, 'zg_throw_recoil': beat_zg_throw_recoil}


def critic(bvh):
    if not os.path.exists(CRITIC): return None
    try:
        r = subprocess.run(['node', CRITIC, bvh, '--json'], capture_output=True, text=True, timeout=600)
        j = json.loads(r.stdout[r.stdout.index('{'):]); return j
    except Exception as e:  # noqa: BLE001
        return {'error': str(e)[:200]}


def run_beat(beat, seeds, keep):
    out = os.path.join(OUT, beat); os.makedirs(out, exist_ok=True)
    rows = []
    for seed in range(seeds):
        p = params_for(beat, seed); rng = np.random.default_rng(seed)
        t0 = time.time()
        try:
            st, checks, opts = BEATS[beat](seed, rng, p)
        except Exception as e:  # noqa: BLE001
            print(f'{beat} s{seed}: failed {e}'); rows.append({'seed': seed, 'params': p, 'error': str(e)[:300], 'score': 0}); continue
        meas = M.measure(st, floor=opts['floor'], zero_g=opts['zero_g'])
        name = f'{beat}_s{seed}'
        st.meta.update({'beat': beat, 'seed': seed, 'params': {k: round(float(v), 4) for k, v in p.items()}})
        st.save(os.path.join(out, name + '.npz')); S.write_canonical_bvh(st, os.path.join(out, name + '.bvh'))
        cr = critic(os.path.join(out, name + '.bvh'))
        score = meas['score'] - (0 if checks.get('pass') else 2.5) - 0.5 * sum(1 for k, v in checks.items() if k.endswith('Ok') and v is False)
        if cr and isinstance(cr.get('score'), (int, float)): score = (score + float(cr['score'])) / 2
        row = {'seed': seed, 'name': name, 'params': {k: round(float(v), 4) for k, v in p.items()}, 'measures': {k: v for k, v in meas.items() if k != 'snapList'},
               'snapList': meas['snapList'][:5], 'checks': checks, 'critic': cr, 'score': round(max(0.0, score), 2), 'seconds': round(time.time() - t0, 1)}
        json.dump(row, open(os.path.join(out, name + '.json'), 'w'), indent=1, default=float)
        rows.append(row)
        print(f"{name}: score {row['score']} measures snaps {meas['snaps']} flips {meas['hingeFlips']} jitter {meas['jitterReversals']} | {json.dumps(checks, default=float)[:160]}", flush=True)
    rows.sort(key=lambda r: -r.get('score', 0))
    kept = []
    kd = os.path.join(out, 'keep'); os.makedirs(kd, exist_ok=True)
    for f in os.listdir(kd): os.remove(os.path.join(kd, f))
    for i, r in enumerate(rows[:keep]):
        if 'name' not in r: continue
        tag = f"ps_{beat}_{'ab'[i] if i < 2 else chr(97 + i)}"
        shutil.copy(os.path.join(out, r['name'] + '.bvh'), os.path.join(kd, tag + '.bvh')); shutil.copy(os.path.join(out, r['name'] + '.npz'), os.path.join(kd, tag + '.npz'))
        kept.append({'clip': tag, 'from': r['name'], 'score': r['score']})
    json.dump({'beat': beat, 'seeds': seeds, 'kept': kept, 'candidates': rows}, open(os.path.join(out, 'candidates.json'), 'w'), indent=1, default=float)
    print(f'{beat}: kept {kept}')
    return rows, kept


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('beat'); ap.add_argument('--seeds', type=int, default=8); ap.add_argument('--keep', type=int, default=2)
    a = ap.parse_args()
    for bt in (BEATS if a.beat == 'all' else [a.beat]):
        run_beat(bt, a.seeds, a.keep)
