import json,sys
from mujoco_worker import run
job=json.load(sys.stdin)
seed=job.get("seed","0"); seconds=float(job.get("seconds",5))
rows=[run({"name":"policy-a-stabilizer","kp":38.0,"kd":8.0},seed,seconds),run({"name":"policy-b-stabilizer","kp":24.0,"kd":5.0},seed,seconds)]
for r in rows:r["benchmark"]="humanoid-stand-v1";r["environment"]="hb-humanoid-v1"
print(json.dumps({"benchmark":"humanoid-stand-v1","engine":"MuJoCo","measured":True,"seed":str(seed),"results":rows}))
