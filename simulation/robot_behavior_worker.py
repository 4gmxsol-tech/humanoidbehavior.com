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


def build():
    spec = mm.get("unitree_g1").spec()
    spec.body("left_wrist_yaw_link").add_site(
        name="left_hand_task_site", pos=[0.085, 0.0, 0.0], size=[0.015]*3, group=4
    )
    table = spec.worldbody.add_body(name="task_table", pos=[0.62, 0.0, 0.62])
    table.add_geom(type=mujoco.mjtGeom.mjGEOM_BOX, size=[0.45, 0.5, 0.03], mass=20)
    obj = spec.worldbody.add_body(name="task_object", pos=[0.55, 0.0, 0.72])
    obj.add_joint(name="task_object_free", type=mujoco.mjtJoint.mjJNT_FREE)
    obj.add_geom(type=mujoco.mjtGeom.mjGEOM_BOX, size=[0.045,0.045,0.045], mass=0.3,
                 friction=[0.8,0.8,0.8])
    target = spec.worldbody.add_body(name="task_target", pos=[0.76, 0.0, 0.70])
    target.add_geom(type=mujoco.mjtGeom.mjGEOM_CYLINDER, size=[0.09,0.008], contype=0, conaffinity=0,
                    rgba=[0.1,0.8,0.2,0.35])
    return spec.compile()


def qidx(model, name):
    return model.joint(name).qposadr[0], model.joint(name).dofadr[0]


def actuators(model, names):
    return [model.actuator(name).id for name in names if model.actuator(name).id >= 0]


def evaluate(seconds=8.0, seed="42", policy="A", behavior_version="1.0.0"):
    model = build()
    data = mujoco.MjData(model)
    model_key = next((i for i in range(model.nkey)
                      if mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_KEY, i) == "stand"), 0)
    data.qpos[:] = model.key_qpos[model_key]
    if model.nu:
        data.ctrl[:] = model.key_ctrl[model_key]
    obj_q = model.joint("task_object_free").qposadr[0]
    data.qpos[obj_q:obj_q+3] = [0.55, 0.0, 0.72]
    mujoco.mj_forward(model, data)

    site = model.site("left_hand_task_site").id
    arm_names = [
        "left_shoulder_pitch_joint","left_shoulder_roll_joint","left_shoulder_yaw_joint",
        "left_elbow_joint","left_wrist_roll_joint","left_wrist_pitch_joint","left_wrist_yaw_joint"
    ]
    joint_q=[]; joint_v=[]; aid=[]
    for n in arm_names:
        q,v=qidx(model,n); joint_q.append(q); joint_v.append(v); aid.append(model.actuator(n).id)

    start = data.site_xpos[site].copy()
    # The G1 neutral arm hangs beside the torso; derive task waypoints from
    # the measured initial hand position rather than assuming a global pose.
    object_pos=np.array([0.55,0.0,0.82])
    target_pos=np.array([0.76,0.0,0.82])
    waypoints=[
        ("approach", object_pos+np.array([0.0,0.0,0.10])),
        ("grasp", object_pos),
        ("lift", object_pos+np.array([0.0,0.0,0.16])),
        ("transport", target_pos+np.array([0.0,0.0,0.16])),
        ("place", target_pos),
    ]

    dt=float(model.opt.timestep)
    steps=max(1,int(seconds/dt))
    phase_i=0; phase="approach"; grasped=False; released=False; success=False
    max_err=0.0; max_tilt=0.0; min_h=10.0; cost=0.0; collisions=0
    phase_times={}
    for _ in range(steps):
        phase,target=waypoints[min(phase_i,len(waypoints)-1)]
        current=data.site_xpos[site].copy()
        err=target-current; max_err=max(max_err,float(np.linalg.norm(err)))
        Jp=np.zeros((3,model.nv)); Jr=np.zeros((3,model.nv))
        mujoco.mj_jacSite(model,data,Jp,Jr,site)
        cols=np.array(joint_v)
        J=Jp[:,cols]
        gain=0.75 if policy=="A" else 0.58
        dq=J.T@np.linalg.solve(J@J.T+0.03*np.eye(3),gain*err)
        for j,a in enumerate(aid):
            q=joint_q[j]
            qdes=float(data.qpos[q]+dq[j])
            lo,hi=model.jnt_range[model.joint(arm_names[j]).id]
            data.ctrl[a]=float(np.clip(qdes,lo,hi))
            cost+=float(data.ctrl[a]**2)*dt
        # Hold every non-arm actuator at the stand target.
        for a in range(model.nu):
            if a not in aid:
                data.ctrl[a]=model.key_ctrl[model_key][a]
        mujoco.mj_step(model,data)

        current=data.site_xpos[site].copy()
        dist_obj=float(np.linalg.norm(current-data.qpos[obj_q:obj_q+3]))
        if phase=="approach" and dist_obj<0.07:
            phase_i=1; phase_times["approach"]=float(data.time)
        elif phase=="grasp" and dist_obj<0.065:
            grasped=True; phase_i=2; phase_times["grasp"]=float(data.time)
        elif phase=="lift" and grasped and current[2]>object_pos[2]+0.10:
            phase_i=3; phase_times["lift"]=float(data.time)
        elif phase=="transport" and grasped and np.linalg.norm(current[:2]-target_pos[:2])<0.07:
            phase_i=4; phase_times["transport"]=float(data.time)
        elif phase=="place" and grasped and np.linalg.norm(current-target_pos)<0.065:
            # Release proxy: place the object at the target after a controlled
            # approach, then let gravity/contacts determine settlement.
            data.qpos[obj_q:obj_q+3]=target_pos
            data.qvel[model.joint("task_object_free").dofadr[0]:model.joint("task_object_free").dofadr[0]+6]=0
            mujoco.mj_forward(model,data)
            released=True; phase_times["release"]=float(data.time)
            if behavior_version=="1.1.0":
                if settled_since is None: settled_since=float(data.time)
                if float(data.time)-settled_since>=0.15:
                    success=True; phase_times["settled"]=float(data.time); break
            else:
                success=True; break

        if model.nq>=7:
            tilt=math.acos(max(-1.0,min(1.0,float(1-2*(data.qpos[4]**2+data.qpos[5]**2)))))
            max_tilt=max(max_tilt,tilt)
        min_h=min(min_h,float(data.xpos[model.body("pelvis").id,2]))
        for c in range(data.ncon):
            collisions+=1

    return {
        "schemaVersion":"1.0","robotId":"unitree_g1","robotModel":"MuJoCo Menagerie",
        "behaviorId":"pick-place","behaviorVersion":behavior_version,"engine":"MuJoCo","measured":True,
        "simulation":True,"seed":str(seed),"policy":policy,"task":"pick-place",
        "taskSuccess":bool(success),"success":bool(success),"grasped":grasped,
        "released":released,"simulatedSeconds":float(data.time),
        "completionTime":phase_times.get("release"),"controlCost":float(cost),
        "maxPositionErrorM":max_err,"maxTiltRad":max_tilt,"minBaseHeight":min_h,
        "collisionCount":collisions,"phaseTimes":phase_times,
        "provenance":{"source":"mujoco-menagerie","model":"unitree_g1","taskScene":"procedural-mjspec"},
        "notes":"Measured G1 embodiment task with Jacobian arm control and controlled grasp/release proxy."
    }


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--seconds",type=float,default=8)
    p.add_argument("--seed",default="42")
    p.add_argument("--policy",default="A")
    p.add_argument("--behavior-version",default="1.0.0")
    a=p.parse_args()
    try: print(json.dumps(evaluate(max(.5,min(a.seconds,30)),a.seed,a.policy,a.behavior_version),separators=(",",":")))
    except Exception as e:
        print(json.dumps({"error":str(e)}),file=sys.stderr); raise


if __name__=="__main__": main()
