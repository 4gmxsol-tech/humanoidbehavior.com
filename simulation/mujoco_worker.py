import json, os, sys, hashlib, math
try:
    import mujoco
except ImportError as exc:
    print(json.dumps({"status":"not_configured","error":"Install mujoco in the simulation worker environment.","detail":str(exc)})); sys.exit(0)

XML=r"""<mujoco model="hb_humanoid">
  <option timestep="0.002" integrator="RK4" gravity="0 0 -9.81"/>
  <worldbody>
    <geom name="floor" type="plane" size="20 20 .1" rgba=".8 .8 .8 1"/>
    <body name="pelvis" pos="0 0 1.05">
      <freejoint name="root"/>
      <geom type="box" size=".18 .12 .12" mass="8"/>
      <body name="torso" pos="0 0 .30">
        <joint name="waist" type="hinge" axis="0 1 0" range="-45 45"/>
        <geom type="box" size=".20 .13 .30" mass="10"/>
        <body name="head" pos="0 0 .42"><geom type="sphere" size=".11" mass="2"/></body>
        <body name="left_arm" pos="0 .18 .18">
          <joint name="l_shoulder" type="hinge" axis="1 0 0" range="-80 80"/>
          <geom type="capsule" fromto="0 0 0 0 .25 0" size=".055" mass="1.5"/>
        </body>
        <body name="right_arm" pos="0 -.18 .18">
          <joint name="r_shoulder" type="hinge" axis="1 0 0" range="-80 80"/>
          <geom type="capsule" fromto="0 0 0 0 -.25 0" size=".055" mass="1.5"/>
        </body>
      </body>
      <body name="left_thigh" pos="0 .10 -.18">
        <joint name="l_hip" type="hinge" axis="0 1 0" range="-60 60"/>
        <geom type="capsule" fromto="0 0 0 0 0 -.38" size=".08" mass="4"/>
        <body name="left_shin" pos="0 0 -.38">
          <joint name="l_knee" type="hinge" axis="0 1 0" range="0 130"/>
          <geom type="capsule" fromto="0 0 0 0 0 -.38" size=".065" mass="3"/>
          <body name="left_foot" pos="0 0 -.38"><geom type="box" size=".11 .07 .045" mass="1"/></body>
        </body>
      </body>
      <body name="right_thigh" pos="0 -.10 -.18">
        <joint name="r_hip" type="hinge" axis="0 1 0" range="-60 60"/>
        <geom type="capsule" fromto="0 0 0 0 0 -.38" size=".08" mass="4"/>
        <body name="right_shin" pos="0 0 -.38">
          <joint name="r_knee" type="hinge" axis="0 1 0" range="0 130"/>
          <geom type="capsule" fromto="0 0 0 0 0 -.38" size=".065" mass="3"/>
          <body name="right_foot" pos="0 0 -.38"><geom type="box" size=".11 .07 .045" mass="1"/></body>
        </body>
      </body>
    </body>
  </worldbody>
  <actuator>
    <motor joint="waist" gear="35"/>
    <motor joint="l_shoulder" gear="10"/><motor joint="r_shoulder" gear="10"/>
    <motor joint="l_hip" gear="55"/><motor joint="l_knee" gear="45"/>
    <motor joint="r_hip" gear="55"/><motor joint="r_knee" gear="45"/>
  </actuator>
</mujoco>"""

def seed_value(seed):
    h=hashlib.sha256(str(seed).encode()).digest()
    return int.from_bytes(h[:8],"big")/2**64

def run(policy, seed, seconds=5.0):
    model=mujoco.MjModel.from_xml_string(XML)
    data=mujoco.MjData(model)
    rng=seed_value(seed)
    data.qpos[2]=1.08
    data.qpos[3]=1.0
    # Reproducible small initial pitch/roll perturbation.
    data.qpos[4]=(rng-.5)*0.06
    data.qpos[5]=((rng*1.7)%1-.5)*0.06
    mujoco.mj_forward(model,data)
    pelvis_id=model.body("pelvis").id
    target=[0,0,0,0,0.0,0.0,0.0]
    qids=[model.joint(i).qposadr[0] for i in range(model.njnt) if model.jnt_type[i]==mujoco.mjtJoint.mjJNT_HINGE]
    vels=[model.joint(i).dofadr[0] for i in range(model.njnt) if model.jnt_type[i]==mujoco.mjtJoint.mjJNT_HINGE]
    total_cost=0.0; min_height=10.0; max_tilt=0.0; steps=int(seconds/model.opt.timestep)
    fallen_at=None
    for _ in range(steps):
        kp=policy["kp"]; kd=policy["kd"]
        for a,(qi,vi) in enumerate(zip(qids,vels)):
            err=target[a]-data.qpos[qi] if a<len(target) else -data.qpos[qi]
            u=kp*err-kd*data.qvel[vi]
            data.ctrl[a]=max(-1.0,min(1.0,u/50.0))
        mujoco.mj_step(model,data)
        h=float(data.xpos[pelvis_id,2]); min_height=min(min_height,h)
        tilt=math.sqrt(float(data.qpos[4])**2+float(data.qpos[5])**2)
        max_tilt=max(max_tilt,tilt); total_cost+=float((data.ctrl**2).sum())*model.opt.timestep
        if h<0.62:
            fallen_at=float(data.time); break
    duration=float(data.time)
    survival=duration/seconds
    return {"policy":policy["name"],"seed":str(seed),"engine":"MuJoCo","measured":True,"simulation":True,"metrics":{"survivalRate":round(survival,4),"simulatedSeconds":round(duration,3),"minTorsoHeightM":round(min_height,4),"maxTiltRad":round(max_tilt,4),"controlCost":round(total_cost,5),"fell":fallen_at is not None},"fellAtSec":fallen_at}

def main():
    job=json.load(sys.stdin)
    policies={"A":{"name":"policy-a-stabilizer","kp":38.0,"kd":8.0},"B":{"name":"policy-b-stabilizer","kp":24.0,"kd":5.0}}
    selected=job.get("policy","A")
    out=run(policies[selected],job.get("seed","0"),float(job.get("seconds",5)))
    out["benchmark"]="humanoid-stand-v1"; out["environment"]="hb-humanoid-v1"
    print(json.dumps(out))

if __name__=="__main__": main()
