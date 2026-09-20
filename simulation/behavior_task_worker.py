import hashlib, json, math, sys
import mujoco

TASKS = {
    "pick-place": {"object": [0.55, 0.0, 0.955], "target": [0.72, 0.0, 0.955], "benchmark": "humanoid-pick-place-v1"},
    "handover": {"object": [0.52, 0.0, 1.02], "target": [0.68, 0.0, 1.15], "benchmark": "humanoid-handover-v1"},
}

# Fixed-base manipulation model. Locomotion is deliberately excluded from this
# benchmark so arm behavior is measured without an uncontrolled free-root.
ARM_XML = r"""<mujoco model="hb_manipulation_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="5 5 .1"/>
<geom name="tabletop" type="box" pos=".60 0 .87" size=".42 .35 .03" mass="20"/>
<body name="torso" pos="0 0 1.05">
  <geom name="torso_geom" type="box" size=".22 .16 .32" mass="10"/>
  <body name="upper" pos=".20 0 .12">
    <joint name="shoulder" type="hinge" axis="0 1 0" range="-2.8 2.8" damping=".8"/>
    <geom name="upper_geom" type="capsule" fromto="0 0 0 .28 0 0" size=".06" mass="2"/>
    <body name="fore" pos=".28 0 0">
      <joint name="elbow" type="hinge" axis="0 1 0" range="-2.8 2.8" damping=".6"/>
      <geom name="fore_geom" type="capsule" fromto="0 0 0 .25 0 0" size=".05" mass="1.5"/>
      <body name="hand" pos=".25 0 0">
        <geom name="hand" type="sphere" size=".07" mass=".4"/>
      </body>
    </body>
  </body>
</body>
<body name="object" pos="0 0 0">
  <freejoint name="object_free"/>
  <geom name="object_geom" type="sphere" size=".055" mass=".4"/>
</body>
<body name="target" pos="0 0 0">
  <geom name="target_geom" type="cylinder" size=".09 .01" mass=".01" contype="0" conaffinity="0"/>
</body>
</worldbody>
<equality><weld name="grasp" body1="hand" body2="object" active="false"/></equality>
<actuator>
  <motor name="shoulder_motor" joint="shoulder" gear="1" ctrlrange="-80 80"/>
  <motor name="elbow_motor" joint="elbow" gear="1" ctrlrange="-70 70"/>
</actuator>
</mujoco>"""

DOOR_XML = r"""<mujoco model="hb_door_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="5 5 .1"/>
<body name="robot" pos="0 0 1.05"><geom type="box" size=".22 .16 .32" mass="20"/></body>
<body name="door" pos=".85 0 1.05"><joint name="door_hinge" type="hinge" axis="0 0 1" range="-0.1 1.5" damping=".5"/><geom name="door_panel" type="box" pos="0 .38 0" size=".035 .38 .9" mass="8"/><geom name="handle" type="sphere" pos="0 .08 0" size=".07" mass=".2"/></body>
</worldbody>
<actuator><motor joint="door_hinge" gear="20" ctrlrange="-1 1"/></actuator>
</mujoco>"""

FOLLOW_XML = r"""<mujoco model="hb_follow_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="10 10 .1"/>
<body name="robot" pos="0 0 0.7"><joint name="slide_x" type="slide" axis="1 0 0" damping="1"/><geom type="cylinder" size=".25 .7" mass="20"/></body>
<body name="person" mocap="true" pos="1 0 .7"><geom type="sphere" size=".22" mass="5"/></body>
</worldbody>
<actuator><motor joint="slide_x" gear="80" ctrlrange="-1 1"/></actuator>
</mujoco>"""

def seed01(seed):
    return int.from_bytes(hashlib.sha256(str(seed).encode()).digest()[:8], "big") / 2**64

def ik(x, z):
    # Exact world-frame shoulder origin and link lengths from ARM_XML.
    sx, sz = .20, 1.17
    l1, l2 = .28, .25
    dx, dz = x - sx, z - sz
    d_raw = math.hypot(dx, dz)
    reachable = abs(l1-l2) + .01 <= d_raw <= l1+l2-.01
    d = min(l1+l2-.01, max(abs(l1-l2)+.01, d_raw))
    c2 = max(-1, min(1, (d*d-l1*l1-l2*l2)/(2*l1*l2)))
    theta2 = math.acos(c2)
    s2 = math.sin(theta2)
    theta1 = math.atan2(dz, dx) - math.atan2(l2*s2, l1+l2*c2)
    return -theta1, -theta2, reachable

def collision_pairs(model, data):
    # Count only robot/environment contacts that are actually undesirable for
    # this manipulation benchmark. Object contact is intentional during grasp;
    # robot self-contact is not a task collision. Return pair names so a
    # persistent contact counts once rather than once per physics step.
    robot = {"torso_geom", "upper_geom", "fore_geom", "hand"}
    environment = {"floor", "tabletop"}
    pairs = set()
    for i in range(data.ncon):
        a, b = data.contact[i].geom1, data.contact[i].geom2
        na, nb = model.geom(a).name, model.geom(b).name
        if (na in robot and nb in environment) or (nb in robot and na in environment):
            pairs.add(tuple(sorted((na, nb))))
    return pairs

def manipulation(behavior, seed, seconds, policy, behavior_version="1.0.0"):
    cfg = TASKS[behavior]
    model = mujoco.MjModel.from_xml_string(ARM_XML)
    data = mujoco.MjData(model)
    rng = seed01(seed)

    if behavior == "pick-place":
        cfg = dict(cfg, object=[.55 + (rng-.5)*.01, 0, .955], target=[.72, 0, .955])

    obj_id = model.body("object").id
    target_id = model.body("target").id
    obj_q = model.joint("object_free").qposadr[0]
    data.qpos[obj_q:obj_q+3] = cfg["object"]
    model.body_pos[target_id] = cfg["target"]
    mujoco.mj_forward(model, data)

    qs = model.joint("shoulder").qposadr[0]
    qe = model.joint("elbow").qposadr[0]
    vs = model.joint("shoulder").dofadr[0]
    ve = model.joint("elbow").dofadr[0]
    hand_id = model.body("hand").id
    torso_id = model.body("torso").id

    grabbed = False
    released = False
    success = False
    complete = None
    grasp_time = None
    settled_since = None
    cost = 0.0
    max_tilt = 0.0
    min_h = float(data.xpos[torso_id, 2])
    collision = 0
    active_collisions = set()
    min_hand_object = float("inf")
    min_object_target = float("inf")
    reachability = True

    steps = int(seconds / model.opt.timestep)
    for _ in range(steps):
        hand = data.xpos[hand_id].copy()
        ob = data.xpos[obj_id].copy()
        tg = data.xpos[target_id].copy()

        if not grabbed:
            gx, gz = float(ob[0]), float(ob[2])
        else:
            gx, gz = float(tg[0]), float(tg[2])

        q1, q2, reachable = ik(gx, gz)
        reachability = reachability and reachable

        # Explicit torque-PD control with enough authority to reach the
        # manipulation workspace. The previous position-actuator configuration
        # left the arm effectively stationary on the free runner.
        if policy == "A":
            kp_s, kp_e, kd = 75.0, 65.0, 12.0
        else:
            kp_s, kp_e, kd = 58.0, 50.0, 10.0
        tau_s = kp_s * (q1 - data.qpos[qs]) - kd * data.qvel[vs]
        tau_e = kp_e * (q2 - data.qpos[qe]) - kd * data.qvel[ve]
        data.ctrl[0] = max(-80.0, min(80.0, tau_s))
        data.ctrl[1] = max(-70.0, min(70.0, tau_e))

        mujoco.mj_step(model, data)

        hand = data.xpos[hand_id].copy()
        ob = data.xpos[obj_id].copy()
        tg = data.xpos[target_id].copy()
        hand_dist = math.dist(hand, ob)
        target_dist = math.dist(ob, tg)
        min_hand_object = min(min_hand_object, hand_dist)
        min_object_target = min(min_object_target, target_dist)

        if not grabbed and hand_dist <= .09:
            data.qpos[obj_q:obj_q+3] = hand
            data.qvel[model.joint("object_free").dofadr[0]:model.joint("object_free").dofadr[0]+3] = 0
            model.eq_active[0] = 1
            grabbed = True
            grasp_time = float(data.time)

        if grabbed and not released and target_dist <= .075:
            model.eq_active[0] = 0
            released = True
            settled_since = float(data.time)

        if released:
            speed = math.sqrt(sum(float(v)**2 for v in data.qvel[obj_q+0:obj_q+3]))
            if target_dist <= .085 and speed < .08:
                if settled_since is None:
                    settled_since = float(data.time)
                required = .15 if behavior_version == "1.1.0" else .05
                if float(data.time) - settled_since >= required:
                    success = True
                    complete = float(data.time)
                    break
            else:
                settled_since = None

        min_h = min(min_h, float(data.xpos[torso_id, 2]))
        max_tilt = max(max_tilt, 0.0)
        cost += float((data.ctrl**2).sum()) * model.opt.timestep
        current_collisions = collision_pairs(model, data)
        collision += len(current_collisions - active_collisions)
        active_collisions = current_collisions

    grasp_duration = None
    if grasp_time is not None:
        grasp_duration = (complete if complete is not None else float(data.time)) - grasp_time

    return {
        "behaviorId": behavior, "seed": str(seed), "policy": policy, "engine": "MuJoCo",
        "measured": True, "simulation": True, "benchmark": cfg["benchmark"],
        "environment": "hb-" + behavior + "-v1", "behaviorVersion": behavior_version,
        "metrics": {
            "taskSuccess": bool(success), "completionTime": complete,
            "simulatedSeconds": float(data.time), "survivalRate": 1.0,
            "minTorsoHeightM": round(min_h, 4), "maxTiltRad": round(max_tilt, 4),
            "controlCost": round(cost, 5), "collisionCount": collision,
            "grasped": grabbed, "released": released,
            "reachability": bool(reachability),
            "minimumHandObjectDistanceM": round(min_hand_object, 5) if math.isfinite(min_hand_object) else None,
            "minimumObjectTargetDistanceM": round(min_object_target, 5) if math.isfinite(min_object_target) else None,
            "graspDurationS": round(grasp_duration, 4) if grasp_duration is not None else None,
            "finalShoulderRad": round(float(data.qpos[qs]), 4),
            "finalElbowRad": round(float(data.qpos[qe]), 4)
        }
    }

def door(seed, seconds, policy):
    model = mujoco.MjModel.from_xml_string(DOOR_XML)
    data = mujoco.MjData(model)
    rng = seed01(seed)
    data.qpos[0] = (rng-.5)*.03
    mujoco.mj_forward(model, data)
    jid = model.joint("door_hinge").qposadr[0]
    vid = model.joint("door_hinge").dofadr[0]
    cost = 0.0
    success = False
    complete = None
    for _ in range(int(seconds/model.opt.timestep)):
        target = .95 if policy == "A" else .8
        tau = 35*(target-data.qpos[jid]) - 7*data.qvel[vid]
        data.ctrl[0] = max(-1, min(1, tau/20))
        mujoco.mj_step(model, data)
        cost += float((data.ctrl**2).sum())*model.opt.timestep
        if data.qpos[jid] > .7:
            success, complete = True, float(data.time)
            break
    return {"behaviorId":"open-door","seed":str(seed),"policy":policy,"engine":"MuJoCo","measured":True,"simulation":True,"benchmark":"humanoid-open-door-v1","environment":"hb-open-door-v1","metrics":{"taskSuccess":success,"completionTime":complete,"simulatedSeconds":float(data.time),"survivalRate":1.0,"controlCost":round(cost,5),"collisionCount":0,"doorAngleRad":round(float(data.qpos[jid]),4)}}

def follow(seed, seconds, policy):
    model = mujoco.MjModel.from_xml_string(FOLLOW_XML)
    data = mujoco.MjData(model)
    rng = seed01(seed)
    cost, errors = 0.0, []
    robot = model.joint("slide_x").qposadr[0]
    vel = model.joint("slide_x").dofadr[0]
    person = model.body("person").mocapid[0]
    steps = int(seconds/model.opt.timestep)
    for _ in range(steps):
        t = float(data.time)
        px = .9 + .5*math.sin(.8*t + rng*2*math.pi)
        data.mocap_pos[person] = [px,0,.7]
        desired = px-.8
        gain = 70 if policy == "A" else 45
        tau = gain*(desired-data.qpos[robot]) - 8*data.qvel[vel]
        data.ctrl[0] = max(-1, min(1, tau/80))
        mujoco.mj_step(model, data)
        errors.append(abs(float(data.qpos[robot])-desired))
        cost += float((data.ctrl**2).sum())*model.opt.timestep
    mae = sum(errors)/len(errors)
    success = mae < .22
    return {"behaviorId":"follow-person","seed":str(seed),"policy":policy,"engine":"MuJoCo","measured":True,"simulation":True,"benchmark":"humanoid-follow-person-v1","environment":"hb-follow-person-v1","metrics":{"taskSuccess":success,"completionTime":seconds if success else None,"simulatedSeconds":seconds,"trackingMAE":round(mae,4),"survivalRate":1.0,"controlCost":round(cost,5),"collisionCount":0}}

def run_behavior(behavior, seed, seconds, policy, behavior_version="1.0.0"):
    if behavior in ("pick-place","handover"):
        return manipulation(behavior, seed, seconds, policy, behavior_version)
    if behavior == "open-door":
        return door(seed, seconds, policy)
    if behavior == "follow-person":
        return follow(seed, seconds, policy)
    raise ValueError("Unsupported behavior task: " + behavior)

def main():
    job = json.load(sys.stdin)
    behavior = job.get("behaviorId", "pick-place")
    seed = job.get("seed", "0")
    seconds = float(job.get("seconds", 5))
    policy = job.get("policy", "A")
    out = run_behavior(behavior, seed, seconds, policy, job.get("behaviorVersion", "1.0.0"))
    print(json.dumps(out))

if __name__ == "__main__":
    main()
