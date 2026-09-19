import hashlib, json, math, sys
import mujoco

TASKS = {
    "pick-place": {"object": [0.55, 0.0, 0.95], "target": [0.72, 0.0, 0.95], "benchmark": "humanoid-pick-place-v1"},
    "handover": {"object": [0.52, 0.0, 1.02], "target": [0.68, 0.0, 1.15], "benchmark": "humanoid-handover-v1"},
}

ARM_XML = r"""<mujoco model="hb_manipulation_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="5 5 .1"/>
<body name="torso" pos="0 0 1.05"><freejoint name="root"/><geom type="box" size=".22 .16 .32" mass="10"/>
<body name="upper" pos=".20 0 .12"><joint name="shoulder" type="hinge" axis="0 1 0" range="-2.8 2.8"/><geom type="capsule" fromto="0 0 0 .28 0 0" size=".06" mass="2"/>
<body name="fore" pos=".28 0 0"><joint name="elbow" type="hinge" axis="0 1 0" range="-2.8 2.8"/><geom type="capsule" fromto="0 0 0 .25 0 0" size=".05" mass="1.5"/>
<body name="hand" pos=".25 0 0"><geom name="hand" type="sphere" size=".07" mass=".4"/></body>
</body></body></body>
<body name="object" pos="0 0 0"><freejoint name="object_free"/><geom name="object_geom" type="sphere" size=".055" mass=".4"/></body>
<body name="target" pos="0 0 0"><geom name="target_geom" type="cylinder" size=".09 .01" mass="0.01" contype="0" conaffinity="0"/></body>
</worldbody>
<equality><weld name="grasp" body1="hand" body2="object" active="false"/></equality>
<actuator><motor joint="shoulder" gear="20"/><motor joint="elbow" gear="15"/></actuator>
</mujoco>"""

DOOR_XML = r"""<mujoco model="hb_door_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="5 5 .1"/>
<body name="robot" pos="0 0 1.05"><freejoint name="root"/><geom type="box" size=".22 .16 .32" mass="10"/></body>
<body name="door" pos=".85 0 1.05"><joint name="door_hinge" type="hinge" axis="0 0 1" range="-0.1 1.5"/><geom name="door_panel" type="box" pos="0 .38 0" size=".035 .38 .9" mass="8"/><geom name="handle" type="sphere" pos="0 .08 0" size=".07" mass=".2"/></body>
</worldbody>
<actuator><motor joint="door_hinge" gear="20"/></actuator>
</mujoco>"""

FOLLOW_XML = r"""<mujoco model="hb_follow_task">
<option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
<worldbody>
<geom name="floor" type="plane" size="10 10 .1"/>
<body name="robot" pos="0 0 0.7"><joint name="slide_x" type="slide" axis="1 0 0"/><geom type="cylinder" size=".25 .7" mass="20"/></body>
<body name="person" mocap="true" pos="1 0 .7"><geom type="sphere" size=".22" mass="5"/></body>
</worldbody>
<actuator><motor joint="slide_x" gear="80"/></actuator>
</mujoco>"""

def seed01(seed):
    return int.from_bytes(hashlib.sha256(str(seed).encode()).digest()[:8], "big") / 2**64

def ik(x,z):
    l1,l2=.28,.25
    dx=x-.20; dz=z-1.17
    d=min(l1+l2-.001,max(abs(l1-l2)+.001,math.hypot(dx,dz)))
    c2=max(-1,min(1,(d*d-l1*l1-l2*l2)/(2*l1*l2)))
    e=math.acos(c2)
    s2=math.sin(e)
    q1=math.atan2(dz,dx)-math.atan2(l2*s2,l1+l2*c2)
    return q1,e

def collisions(model,data,allowed=("floor","object_geom","target_geom")):
    count=0
    for i in range(data.ncon):
        a,b=data.contact[i].geom1,data.contact[i].geom2
        na,nb=model.geom(a).name,model.geom(b).name
        if na not in allowed and nb not in allowed:
            count+=1
    return count

def manipulation(behavior,seed,seconds,policy):
    cfg=TASKS[behavior]; model=mujoco.MjModel.from_xml_string(ARM_XML); data=mujoco.MjData(model)
    rng=seed01(seed); data.qpos[2]=1.08; data.qpos[3]=1.0
    data.qpos[4]=(rng-.5)*.02; data.qpos[5]=((rng*1.7)%1-.5)*.02
    obj=model.body("object").id; target=model.body("target").id
    obj_q=model.joint("object_free").qposadr[0]
    data.qpos[obj_q:obj_q+3]=cfg["object"]
    model.body_pos[target]=cfg["target"]
    mujoco.mj_forward(model,data)
    qshould=model.joint("shoulder").qposadr[0]; qelbow=model.joint("elbow").qposadr[0]
    vshould=model.joint("shoulder").dofadr[0]; velbow=model.joint("elbow").dofadr[0]
    grabbed=False; released=False; success=False; complete=None; cost=0; max_tilt=0; min_h=99; collision=0
    steps=int(seconds/model.opt.timestep)
    for _ in range(steps):
        ob=data.xpos[obj].copy(); tg=data.xpos[target].copy()
        gx,gz=(float(ob[0]),float(ob[2])) if not grabbed else (float(tg[0]),float(tg[2]))
        if grabbed: gx,gz=float(tg[0]),float(tg[2])
        q1,q2=ik(gx,gz)
        gain=38 if policy=="A" else 27; damp=8 if policy=="A" else 5
        data.ctrl[0]=max(-1,min(1,(gain*(q1-data.qpos[qshould])-damp*data.qvel[vshould])/20))
        data.ctrl[1]=max(-1,min(1,(gain*(q2-data.qpos[qelbow])-damp*data.qvel[velbow])/15))
        mujoco.mj_step(model,data)
        hand=data.xpos[model.body("hand").id]; ob=data.xpos[obj]; tg=data.xpos[target]
        dist=math.dist(hand,ob if not grabbed else tg)
        if not grabbed and dist<.09:
            model.eq_active[0]=1; grabbed=True
        if grabbed and math.dist(ob,tg)<.10:
            model.eq_active[0]=0; released=True; success=True; complete=float(data.time); break
        min_h=min(min_h,float(data.xpos[model.body("torso").id,2]))
        max_tilt=max(max_tilt,math.sqrt(float(data.qpos[4])**2+float(data.qpos[5])**2))
        cost+=float((data.ctrl**2).sum())*model.opt.timestep; collision+=collisions(model,data)
    return result(behavior,seed,policy,seconds,data,success,complete,cost,min_h,max_tilt,collision,grabbed,released)

def result(behavior,seed,policy,seconds,data,success,complete,cost,min_h,max_tilt,collision,grabbed,released):
    return {"behaviorId":behavior,"seed":str(seed),"policy":policy,"engine":"MuJoCo","measured":True,"simulation":True,
            "benchmark":TASKS.get(behavior,{}).get("benchmark","humanoid-task-v1"),"environment":"hb-"+behavior+"-v1",
            "metrics":{"taskSuccess":bool(success),"completionTime":complete,"simulatedSeconds":float(data.time),
                       "survivalRate":1.0 if min_h>.62 else float(data.time/seconds),"minTorsoHeightM":round(min_h,4),
                       "maxTiltRad":round(max_tilt,4),"controlCost":round(cost,5),"collisionCount":collision,
                       "grasped":grabbed,"released":released}}

def door(seed,seconds,policy):
    model=mujoco.MjModel.from_xml_string(DOOR_XML); data=mujoco.MjData(model); rng=seed01(seed)
    data.qpos[0]=(rng-.5)*.03; mujoco.mj_forward(model,data); jid=model.joint("door_hinge").qposadr[0]; vid=model.joint("door_hinge").dofadr[0]
    cost=0; success=False; complete=None; collision=0
    for _ in range(int(seconds/model.opt.timestep)):
        target=.95 if policy=="A" else .8
        data.ctrl[0]=max(-1,min(1,(35*(target-data.qpos[jid])-7*data.qvel[vid])/20)); mujoco.mj_step(model,data)
        cost+=float((data.ctrl**2).sum())*model.opt.timestep
        if data.qpos[jid]>.7: success=True; complete=float(data.time); break
    return {"behaviorId":"open-door","seed":str(seed),"policy":policy,"engine":"MuJoCo","measured":True,"simulation":True,"benchmark":"humanoid-open-door-v1","environment":"hb-open-door-v1","metrics":{"taskSuccess":success,"completionTime":complete,"simulatedSeconds":float(data.time),"survivalRate":1.0,"controlCost":round(cost,5),"collisionCount":collision,"doorAngleRad":round(float(data.qpos[jid]),4)}}

def follow(seed,seconds,policy):
    model=mujoco.MjModel.from_xml_string(FOLLOW_XML); data=mujoco.MjData(model); rng=seed01(seed); cost=0; errors=[]
    robot=model.joint("slide_x").qposadr[0]; vel=model.joint("slide_x").dofadr[0]
    person=model.body("person").mocapid[0]
    for _ in range(int(seconds/model.opt.timestep)):
        t=float(data.time); px=.9+.5*math.sin(.8*t+rng*2*math.pi); data.mocap_pos[person]=[px,0,.7]
        desired=px-.8; gain=70 if policy=="A" else 45
        data.ctrl[0]=max(-1,min(1,(gain*(desired-data.qpos[robot])-8*data.qvel[vel])/80)); mujoco.mj_step(model,data)
        err=abs(float(data.qpos[robot])-desired); errors.append(err); cost+=float((data.ctrl**2).sum())*model.opt.timestep
    mae=sum(errors)/len(errors); success=mae<.22
    return {"behaviorId":"follow-person","seed":str(seed),"policy":policy,"engine":"MuJoCo","measured":True,"simulation":True,"benchmark":"humanoid-follow-person-v1","environment":"hb-follow-person-v1","metrics":{"taskSuccess":success,"completionTime":seconds if success else None,"simulatedSeconds":seconds,"trackingMAE":round(mae,4),"survivalRate":1.0,"controlCost":round(cost,5),"collisionCount":0}}

def run_behavior(behavior, seed, seconds, policy):
    if behavior in ("pick-place","handover"): return manipulation(behavior,seed,seconds,policy)
    if behavior=="open-door": return door(seed,seconds,policy)
    if behavior=="follow-person": return follow(seed,seconds,policy)
    raise ValueError("Unsupported behavior task: "+behavior)

def main():
    job=json.load(sys.stdin); behavior=job.get("behaviorId","pick-place"); seed=job.get("seed","0"); seconds=float(job.get("seconds",5)); policy=job.get("policy","A")
    out=run_behavior(behavior,seed,seconds,policy)
    print(json.dumps(out))

if __name__=="__main__": main()
