#!/usr/bin/env python3
"""Measured Unitree G1 behavior smoke benchmark.

Uses the real G1 Menagerie embodiment and adds a small physical task scene
through MjSpec. The arm is driven by Jacobian-based position control. The
task records approach, grasp-proxy, transport and release/settle phases.
"""
import argparse, json, math, sys
import mujoco
import mujoco_menagerie as mm
import numpy as np


def build(object_mass=0.22, object_size=0.032, target_distance=0.22):
    # Use the official Menagerie G1 model with Dex3-style articulated hands.
    # This turns the task from a release proxy into a contact-rich manipulation
    # benchmark with independently actuated thumb/index/middle joints.
    robot = mm.get("unitree_g1")
    spec = robot.spec("g1_with_hands")
    spec.body("left_wrist_yaw_link").add_site(
        name="left_hand_task_site", pos=[0.082, 0.003, 0.0], size=[0.012]*3, group=4
    )
    table = spec.worldbody.add_body(name="task_table", pos=[0.78, 0.0, 0.79])
    table.add_geom(
        name="task_table_top", type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.55, 0.55, 0.03], mass=30, friction=[1.0, 1.0, 0.005]
    )
    obj = spec.worldbody.add_body(name="task_object", pos=[0.0, 0.0, 0.0])
    obj.add_joint(name="task_object_free", type=mujoco.mjtJoint.mjJNT_FREE)
    obj.add_geom(
        name="task_object_geom", type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[object_size, object_size, object_size*1.4], mass=object_mass, friction=[1.2, 1.0, 0.02],
        rgba=[0.18, 0.45, 0.95, 1.0]
    )
    target = spec.worldbody.add_body(name="task_target", pos=[0.0, 0.0, 0.845])
    target.add_geom(
        name="task_target_geom", type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        size=[0.07, 0.008], contype=0, conaffinity=0,
        rgba=[0.1, 0.8, 0.2, 0.30]
    )
    return spec.compile()


def qidx(model, name):
    j = model.joint(name)
    return j.qposadr[0], j.dofadr[0]


def clamp_keyframe(model, data, key_id):
    # Menagerie's current G1-with-hands stand keyframe has two thumb values
    # a few thousandths outside their declared limits. Clamp before use so
    # benchmark startup is deterministic and range-safe.
    data.qpos[:] = model.key_qpos[key_id]
    for j in range(model.njnt):
        if model.jnt_type[j] in (mujoco.mjtJoint.mjJNT_HINGE, mujoco.mjtJoint.mjJNT_SLIDE):
            a = model.jnt_qposadr[j]
            if model.jnt_limited[j]:
                lo, hi = model.jnt_range[j]
                data.qpos[a] = np.clip(data.qpos[a], lo, hi)
    if model.nu:
        data.ctrl[:] = model.key_ctrl[key_id]
        for a in range(model.nu):
            if model.actuator_ctrllimited[a]:
                lo, hi = model.actuator_ctrlrange[a]
                data.ctrl[a] = np.clip(data.ctrl[a], lo, hi)


def contact_finger_bodies(model, data, object_body_id):
    bodies = set()
    for i in range(data.ncon):
        c = data.contact[i]
        for gid in (int(c.geom1), int(c.geom2)):
            other = int(c.geom2 if gid == int(c.geom1) else c.geom1)
            if int(model.geom_bodyid[gid]) == object_body_id:
                bid = int(model.geom_bodyid[other])
                name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, bid) or ""
                if name.startswith("left_hand_") or name == "left_wrist_yaw_link":
                    bodies.add(name)
    return bodies


def qidx(model, name):
    return model.joint(name).qposadr[0], model.joint(name).dofadr[0]


def actuators(model, names):
    return [model.actuator(name).id for name in names if model.actuator(name).id >= 0]


def evaluate(seconds=8.0, seed="42", policy="A", behavior_version="1.0.0", object_mass=0.22, object_size=0.032, target_distance=0.22):
    object_mass=float(np.clip(object_mass,0.08,0.50))
    object_size=float(np.clip(object_size,0.02,0.05))
    target_distance=float(np.clip(target_distance,0.12,0.35))
    model = build(object_mass, object_size, target_distance)
    data = mujoco.MjData(model)
    model_key = next(
        (i for i in range(model.nkey)
         if mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_KEY, i) == "stand"), 0
    )
    clamp_keyframe(model, data, model_key)
    mujoco.mj_forward(model, data)

    site = model.site("left_hand_task_site").id
    obj_q = model.joint("task_object_free").qposadr[0]
    obj_body = model.body("task_object").id

    arm_names = [
        "left_shoulder_pitch_joint","left_shoulder_roll_joint","left_shoulder_yaw_joint",
        "left_elbow_joint","left_wrist_roll_joint","left_wrist_pitch_joint","left_wrist_yaw_joint"
    ]
    arm_q=[]; arm_v=[]; arm_a=[]
    for name in arm_names:
        q,v=qidx(model,name)
        arm_q.append(q); arm_v.append(v); arm_a.append(model.actuator(name).id)

    finger_names = [
        "left_hand_thumb_0_joint","left_hand_thumb_1_joint","left_hand_thumb_2_joint",
        "left_hand_middle_0_joint","left_hand_middle_1_joint",
        "left_hand_index_0_joint","left_hand_index_1_joint"
    ]
    finger_q=[]; finger_a=[]
    for name in finger_names:
        q,_=qidx(model,name)
        finger_q.append(q); finger_a.append(model.actuator(name).id)

    start = data.site_xpos[site].copy()
    # Place the object inside the G1 hand envelope. The object is not welded:
    # it must be captured by finger/palm contacts and transported dynamically.
    object_pos = start + np.array([0.105, 0.0, 0.0])
    target_pos = object_pos + np.array([target_distance, 0.0, 0.0])
    data.qpos[obj_q:obj_q+3] = object_pos
    data.qvel[model.joint("task_object_free").dofadr[0]:
               model.joint("task_object_free").dofadr[0]+6] = 0
    mujoco.mj_forward(model, data)

    # Position waypoints for the wrist/palm. The grasp phase closes the real
    # articulated fingers around the free body before transport.
    waypoints = [
        ("approach", object_pos + np.array([-0.035, 0.0, 0.0])),
        ("grasp", object_pos + np.array([-0.010, 0.0, 0.0])),
        ("lift", object_pos + np.array([0.0, 0.0, 0.11])),
        ("transport", target_pos + np.array([0.0, 0.0, 0.11])),
        ("place", target_pos + np.array([0.0, 0.0, 0.055])),
    ]

    dt=float(model.opt.timestep)
    steps=max(1,int(seconds/dt))
    phase_i=0
    grasped=False
    released=False
    success=False
    release_time=None
    settled_since=None
    max_err=0.0
    max_tilt=0.0
    min_h=10.0
    cost=0.0
    collisions=0
    object_max_height=float(object_pos[2])
    max_finger_contacts=0
    phase_times={}

    def finger_target(closed):
        out=[]
        for name in finger_names:
            j=model.joint(name).id
            lo,hi=model.jnt_range[j]
            if "thumb" in name:
                # Thumb starts partly open and curls toward the index/middle side.
                frac=0.72 if closed else 0.10
            else:
                # Index/middle joints close toward their negative/positive limits.
                frac=0.78 if closed else 0.06
            out.append(float(lo + frac*(hi-lo)))
        return out

    open_targets=finger_target(False)
    close_targets=finger_target(True)

    for _ in range(steps):
        phase,target=waypoints[min(phase_i,len(waypoints)-1)]
        current=data.site_xpos[site].copy()
        err=target-current
        max_err=max(max_err,float(np.linalg.norm(err)))
        Jp=np.zeros((3,model.nv)); Jr=np.zeros((3,model.nv))
        mujoco.mj_jacSite(model,data,Jp,Jr,site)
        J=Jp[:,np.array(arm_v)]
        gain=0.82 if policy=="A" else 0.64
        dq=J.T@np.linalg.solve(J@J.T+0.025*np.eye(3),gain*err)
        for j,a in enumerate(arm_a):
            q=arm_q[j]
            qdes=float(data.qpos[q]+dq[j])
            jid=model.joint(arm_names[j]).id
            lo,hi=model.jnt_range[jid]
            data.ctrl[a]=float(np.clip(qdes,lo,hi))

        targets=close_targets if phase in ("grasp","lift","transport","place") else open_targets
        for j,a in enumerate(finger_a):
            data.ctrl[a]=targets[j]

        arm_and_fingers=set(arm_a+finger_a)
        for a in range(model.nu):
            if a not in arm_and_fingers:
                lo,hi=model.actuator_ctrlrange[a] if model.actuator_ctrllimited[a] else (-1e9,1e9)
                data.ctrl[a]=float(np.clip(model.key_ctrl[model_key][a],lo,hi))

        mujoco.mj_step(model,data)

        object_now=data.xpos[obj_body].copy()
        object_max_height=max(object_max_height,float(object_now[2]))
        finger_contacts=contact_finger_bodies(model,data,obj_body)
        max_finger_contacts=max(max_finger_contacts,len(finger_contacts))
        if len(finger_contacts)>=2:
            grasped=True
            if "grasp" not in phase_times:
                phase_times["grasp"]=float(data.time)

        # Collision count is measured from MuJoCo contacts; self contacts are
        # naturally included in the raw count for transparent reporting.
        collisions += int(data.ncon)

        if phase=="approach" and np.linalg.norm(current-object_pos)<0.06:
            phase_i=1
            phase_times["approach"]=float(data.time)
        elif phase=="grasp" and grasped and data.time>0.25:
            phase_i=2
            phase_times["grasped"]=float(data.time)
        elif phase=="lift" and grasped and object_now[2] > object_pos[2]+0.055:
            phase_i=3
            phase_times["lift"]=float(data.time)
        elif phase=="transport" and grasped and np.linalg.norm(object_now[:2]-target_pos[:2])<0.075:
            phase_i=4
            phase_times["transport"]=float(data.time)
        elif phase=="place" and grasped and np.linalg.norm(object_now-target_pos)<0.08:
            # Open the real fingers. No object teleportation is used.
            for j,a in enumerate(finger_a):
                data.ctrl[a]=open_targets[j]
            released=True
            if release_time is None:
                release_time=float(data.time)
                phase_times["release"]=release_time

        if released:
            settled=(np.linalg.norm(object_now-target_pos)<0.065 and
                     object_now[2] <= target_pos[2]+0.045 and
                     np.linalg.norm(data.qvel[model.joint("task_object_free").dofadr[0]:
                                               model.joint("task_object_free").dofadr[0]+3])<0.08)
            if settled:
                if settled_since is None:
                    settled_since=float(data.time)
                if float(data.time)-settled_since>=0.15:
                    success=True
                    phase_times["settled"]=float(data.time)
                    break
            else:
                settled_since=None

        if model.nq>=7:
            tilt=math.acos(max(-1.0,min(1.0,float(1-2*(data.qpos[4]**2+data.qpos[5]**2)))))
            max_tilt=max(max_tilt,tilt)
        min_h=min(min_h,float(data.xpos[model.body("pelvis").id,2]))

    completion_time=phase_times.get("settled" if behavior_version=="1.1.0" else "release")
    return {
        "schemaVersion":"1.0","robotId":"unitree_g1","robotModel":"MuJoCo Menagerie",
        "behaviorId":"pick-place","behaviorVersion":behavior_version,"engine":"MuJoCo",
        "measured":True,"simulation":True,"seed":str(seed),"policy":policy,"task":"pick-place",
        "taskSuccess":bool(success),"success":bool(success),"grasped":bool(grasped),
        "released":bool(released),"simulatedSeconds":float(data.time),
        "completionTime":completion_time,"controlCost":float(cost),
        "maxPositionErrorM":max_err,"maxTiltRad":max_tilt,"minBaseHeight":min_h,
        "collisionCount":collisions,"objectMaxHeight":object_max_height,
        "maxFingerContacts":max_finger_contacts,"contactGrasp":bool(grasped),
        "phaseTimes":phase_times,
        "provenance":{
            "source":"mujoco-menagerie","model":"unitree_g1","modelEntry":"g1_with_hands",
            "modelSource":"MuJoCo Menagerie","taskScene":"procedural-mjspec",
            "contactModel":"dynamic free-body object + articulated G1 hand",
            "taskConfig":{"objectMassKg":object_mass,"objectSizeM":object_size,"targetDistanceM":target_distance}
        },
        "notes":"Measured G1 contact manipulation benchmark using articulated thumb/index/middle joints. No object teleportation or welded grasp is used."
    }


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--seconds",type=float,default=8)
    p.add_argument("--seed",default="42")
    p.add_argument("--policy",default="A")
    p.add_argument("--behavior-version",default="1.0.0")
    a=p.parse_args()
    try:
        payload={}
        if not sys.stdin.isatty():
            raw=sys.stdin.read().strip()
            if raw:
                payload=json.loads(raw)
        seconds=float(payload.get("seconds",a.seconds))
        seed=str(payload.get("seed",a.seed))
        policy=str(payload.get("policy",a.policy))
        behavior_version=str(payload.get("behaviorVersion",payload.get("behavior_version",a.behavior_version)))
        print(json.dumps(evaluate(max(.5,min(seconds,30)),seed,policy,behavior_version,object_mass,object_size,target_distance),separators=(",",":")))
    except Exception as e:
        print(json.dumps({"error":str(e)}),file=sys.stderr); raise


if __name__=="__main__": main()
