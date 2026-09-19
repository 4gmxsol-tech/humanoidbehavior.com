const db=require("./db"),{spawn,spawnSync}=require("child_process");
const gitSha=process.env.GIT_SHA||(()=>{try{return spawnSync("git",["rev-parse","HEAD"],{cwd:__dirname,encoding:"utf8"}).stdout.trim()}catch(e){return null}})();
const POLICIES={"policy-a-stabilizer":{name:"policy-a-stabilizer",kp:38,kd:8},"policy-b-stabilizer":{name:"policy-b-stabilizer",kp:24,kd:5},"policy-a":{name:"policy-a-stabilizer",kp:38,kd:8},"policy-b":{name:"policy-b-stabilizer",kp:24,kd:5}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function progress(job,completed,total){const percentage=total?Math.round(completed/total*100):0;await db.updateJob(job.id,{progress:{completed,total,percentage}});const exp=await db.getExperiment(job.experimentId,job.userId);if(exp){exp.status="running";exp.result={...(exp.result||{}),status:"running",runCount:completed,expectedRunCount:total,validation:{passed:false,message:`Evaluation running: ${completed}/${total} runs completed.`}};await db.saveExperiment(exp)}}
function rowSummary(rows){const out={};const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;const median=a=>{const x=[...a].sort((a,b)=>a-b),m=Math.floor(x.length/2);return x.length?(x.length%2?x[m]:(x[m-1]+x[m])/2):0};const stddev=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1))};const ci95=a=>{const m=mean(a),s=stddev(a),half=1.96*s/Math.sqrt(a.length||1);return{low:m-half,high:m+half}};for(const p of [...new Set(rows.map(r=>r.policy))]){const x=rows.filter(r=>r.policy===p),v=k=>x.map(r=>Number(r.metrics?.[k]??0)),survival=v("survivalRate"),seconds=v("simulatedSeconds"),cost=v("controlCost"),tilt=v("maxTiltRad");out[p]={runs:x.length,fallRate:mean(x.map(r=>r.metrics?.fell?1:0)),taskSuccessRate:mean(x.map(r=>r.metrics?.taskSuccess?1:0)),survivalRate:{mean:mean(survival),median:median(survival),stddev:stddev(survival),ci95:ci95(survival)},simulatedSeconds:{mean:mean(seconds),median:median(seconds),stddev:stddev(seconds),ci95:ci95(seconds)},controlCost:{mean:mean(cost),median:median(cost),stddev:stddev(cost),ci95:ci95(cost)},maxTiltRad:{mean:mean(tilt),median:median(tilt),stddev:stddev(tilt),ci95:ci95(tilt)}}}return out}
function runProcess(input,script="simulation/mujoco_worker.py"){return new Promise((resolve,reject)=>{const child=spawn(process.env.MUJOCO_PYTHON||"python3",[script],{cwd:__dirname,env:process.env});let out="",err="";const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("MuJoCo worker timeout"))},Math.max(10000,Number(input.seconds||5)*5000));child.stdout.on("data",d=>out+=d);child.stderr.on("data",d=>err+=d);child.on("close",code=>{clearTimeout(timer);if(code!==0)return reject(new Error(err||"MuJoCo worker failed"));try{resolve(JSON.parse(out.trim().split("\n").pop()))}catch(e){reject(new Error("Invalid MuJoCo worker JSON: "+e.message))}});child.stdin.end(JSON.stringify(input))})}
async function executeVersionComparison(job){
 const p=job.payload||{}, rows=[], versions=p.versions||[];
 if(versions.length!==2) throw new Error("Version comparison requires exactly two versions");
 for(const version of versions) for(const seed of p.seeds||[]) for(const policyName of p.policies||[]){
  const policy=POLICIES[policyName]||POLICIES["policy-a"];
  const rr=await runProcess({behaviorId:p.behaviorId,behaviorVersion:version,policy:policy.name.includes("a")?"A":"B",seed,seconds:p.seconds},"simulation/behavior_task_worker.py");
  rr.seed=String(seed); rr.policy=policy.name; rr.behaviorId=p.behaviorId; rr.behaviorVersion=version; rr.engine="MuJoCo"; rr.measured=true; rows.push(rr); await progress(job,rows.length,(versions.length*(p.seeds||[]).length*(p.policies||[]).length));
 }
 const exp=await db.getExperiment(job.experimentId,job.userId); if(!exp) throw new Error("Experiment not found");
 const summary={}; for(const version of versions) summary[version]=rowSummary(rows.filter(r=>r.behaviorVersion===version));
 const paired=[];
 for(const seed of p.seeds||[]) for(const policyName of p.policies||[]){
  const policy=POLICIES[policyName]||POLICIES["policy-a"];
  const a=rows.find(r=>r.behaviorVersion===versions[0]&&r.seed===String(seed)&&r.policy===policy.name);
  const b=rows.find(r=>r.behaviorVersion===versions[1]&&r.seed===String(seed)&&r.policy===policy.name);
  if(a&&b){
   const metricDelta=(key)=>Number(b.metrics?.[key]??0)-Number(a.metrics?.[key]??0);
   paired.push({seed:String(seed),policy:policy.name,taskSuccessDelta:metricDelta("taskSuccess"),controlCostDelta:metricDelta("controlCost"),completionTimeDelta:metricDelta("completionTime"),simulatedSecondsDelta:metricDelta("simulatedSeconds"),survivalRateDelta:metricDelta("survivalRate"),maxTiltRadDelta:metricDelta("maxTiltRad"),collisionCountDelta:metricDelta("collisionCount")});
  }
 }
 const deltaStats=(key)=>{
  const values=paired.map(x=>Number(x[key]??0)); const n=values.length;
  if(!n)return {n:0,mean:0,stddev:0,ci95:{low:0,high:0}};
  const m=values.reduce((s,v)=>s+v,0)/n;
  const sd=n>1?Math.sqrt(values.reduce((s,v)=>s+(v-m)**2,0)/(n-1)):0;
  const half=1.96*sd/Math.sqrt(n);
  return {n,mean:Number(m.toFixed(6)),stddev:Number(sd.toFixed(6)),ci95:{low:Number((m-half).toFixed(6)),high:Number((m+half).toFixed(6))}};
 };
 const deltaSummary={};
 for(const key of ["taskSuccessDelta","controlCostDelta","completionTimeDelta","simulatedSecondsDelta","survivalRateDelta","maxTiltRadDelta","collisionCountDelta"]) deltaSummary[key]=deltaStats(key);
 const result={...(exp.result||{}),status:"completed",comparisonType:"behavior-version-vs-version",behaviorId:p.behaviorId,versions,engine:"MuJoCo",measured:true,reproducible:true,runCount:rows.length,validation:{passed:rows.length===Number(exp.result?.expectedRunCount||rows.length),message:"Both versions evaluated on identical seeds and policies."},rawResults:rows,summary,pairedDeltas:paired,deltaSummary,provenance:{gitSha,worker:"humanoidbehavior-worker",execution:"durable-version-comparison"},completedAt:new Date().toISOString()};
 exp.status="completed"; exp.engine="MuJoCo"; exp.result=result; await db.saveExperiment(exp);
 await db.updateJob(job.id,{status:"completed",result,finishedAt:new Date().toISOString()});
 await db.saveArtifact({id:db.id(),experimentId:job.experimentId,userId:job.userId,name:"version-comparison.json",contentType:"application/json",storage:"database",payload:result});
}
async function executeG1BehaviorComparison(job){
 const p=job.payload||{},exp=await db.getExperiment(job.experimentId,job.userId);if(!exp)throw new Error("Experiment not found");
 const versions=p.versions||[],seeds=(p.seeds||["42","1337"]).map(String),policies=(p.policies||["A","B"]).map(String),rows=[];
 if(versions.length!==2)throw new Error("G1 comparison requires two versions");
 for(const version of versions)for(const seed of seeds)for(const policy of policies){
  const rr=await runProcess({seconds:p.seconds,seed,policy,behaviorVersion:version},"simulation/robot_behavior_worker.py");
  rr.behaviorVersion=version;rr.seed=String(seed);rr.policy=policy;rr.robotId="unitree_g1";rr.behaviorId="pick-place";rr.engine="MuJoCo";rr.measured=true;rows.push(rr);await progress(job,rows.length,seeds.length*policies.length);await progress(job,rows.length,seeds.length*policies.length*2);
 }
 const pairs=[];for(const seed of seeds)for(const policy of policies){const a=rows.find(r=>r.behaviorVersion===versions[0]&&r.seed===seed&&r.policy===policy),b=rows.find(r=>r.behaviorVersion===versions[1]&&r.seed===seed&&r.policy===policy);if(a&&b)pairs.push({seed,policy,taskSuccessDelta:Number(b.taskSuccess)-Number(a.taskSuccess),completionTimeDelta:Number(b.completionTime||0)-Number(a.completionTime||0),controlCostDelta:Number(b.controlCost||0)-Number(a.controlCost||0),collisionCountDelta:Number(b.collisionCount||0)-Number(a.collisionCount||0),maxTiltRadDelta:Number(b.maxTiltRad||0)-Number(a.maxTiltRad||0)})}
 const stats=k=>{const v=pairs.map(x=>x[k]),n=v.length,m=n?v.reduce((a,b)=>a+b,0)/n:0,sd=n>1?Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(n-1)):0,half=n?1.96*sd/Math.sqrt(n):0;return{n,mean:m,stddev:sd,ci95:{low:m-half,high:m+half}}};
 const deltaSummary={};for(const k of ["taskSuccessDelta","completionTimeDelta","controlCostDelta","collisionCountDelta","maxTiltRadDelta"])deltaSummary[k]=stats(k);
 const result={...(exp.result||{}),comparisonType:"robot-behavior-version-vs-version",robotId:"unitree-g1",behaviorId:"pick-place",versions,engine:"MuJoCo",measured:true,reproducible:true,runCount:rows.length,validation:{passed:rows.length===seeds.length*policies*2,message:"Both behavior versions evaluated on identical G1 seeds and policies."},pairedDeltas:pairs,deltaSummary,rawResults:rows,provenance:{gitSha,worker:"humanoidbehavior-worker",execution:"g1-pick-place-version-compare"},completedAt:new Date().toISOString()};
 exp.status="completed";exp.result=result;await db.saveExperiment(exp);await db.updateJob(job.id,{status:"completed",result,finishedAt:new Date().toISOString()});await db.saveArtifact({id:db.id(),experimentId:job.experimentId,userId:job.userId,name:"g1-pick-place-version-comparison.json",contentType:"application/json",storage:"database",payload:result});
}
async function executeG1BehaviorEvaluation(job){
 const p=job.payload||{},exp=await db.getExperiment(job.experimentId,job.userId);if(!exp)throw new Error("Experiment not found");
 const seconds=Math.max(.5,Math.min(Number(p.seconds||8),30)),seeds=(p.seeds||["42","1337"]).map(String),policies=(p.policies||["A","B"]).map(String),rows=[];
 for(const seed of seeds) for(const policy of policies){
  const rr=await runProcess({seconds,seed,policy},"simulation/robot_behavior_worker.py");
  rr.robotId="unitree_g1";rr.behaviorId="pick-place";rr.engine="MuJoCo";rr.measured=true;rows.push(rr);
 }
 const mean=k=>rows.length?rows.reduce((a,r)=>a+Number(r[k]??0),0)/rows.length:0;
 const result={...(exp.result||{}),schemaVersion:"1.0",comparisonType:"robot-behavior-evaluation",robotId:"unitree_g1",behaviorId:"pick-place",behaviorVersion:p.behaviorVersion||"1.0.0",engine:"MuJoCo",measured:true,reproducible:true,task:"pick-place",runCount:rows.length,expectedRunCount:seeds.length*policies.length,successRate:rows.filter(r=>r.taskSuccess).length/Math.max(1,rows.length),summary:{taskSuccessRate:rows.filter(r=>r.taskSuccess).length/Math.max(1,rows.length),completionTimeMean:mean("completionTime"),controlCostMean:mean("controlCost"),maxTiltRadMean:mean("maxTiltRad"),collisionCountMean:mean("collisionCount")},rawResults:rows,validation:{passed:rows.length===seeds.length*policies.length,message:"Measured Unitree G1 pick-place evaluation completed."},provenance:{gitSha,worker:"humanoidbehavior-worker",execution:"g1-pick-place"}};
 exp.status="completed";exp.engine="MuJoCo";exp.result=result;await db.saveExperiment(exp);await db.updateJob(job.id,{status:"completed",result,finishedAt:new Date().toISOString()});await db.saveArtifact({id:db.id(),experimentId:job.experimentId,userId:job.userId,name:"g1-pick-place.json",contentType:"application/json",storage:"database",payload:result});
}
async function executeRobotEvaluation(job){
 const p=job.payload||{},exp=await db.getExperiment(job.experimentId,job.userId);
 if(!exp)throw new Error("Experiment not found");
 const seconds=Math.max(0.1,Math.min(Number(p.seconds||2),30)),seeds=(p.seeds||["42"]).map(String),rows=[];
 for(const seed of seeds){
  const rr=await runProcess({robot:p.robotId||"unitree_g1",seconds,seed},"simulation/robot_menagerie_worker.py");
  rr.robotId=p.robotId||"unitree_g1";rr.seed=String(seed);rr.engine="MuJoCo";rr.measured=true;rows.push(rr);await progress(job,rows.length,seeds.length);
 }
 const successes=rows.filter(r=>r.success).length;
 const mean=k=>rows.length?rows.reduce((a,r)=>a+Number(r[k]||0),0)/rows.length:0;
 const result={...(exp.result||{}),schemaVersion:"1.0",comparisonType:"robot-embodiment-evaluation",robotId:p.robotId||"unitree_g1",engine:"MuJoCo",measured:true,reproducible:true,task:"stand-stability",runCount:rows.length,expectedRunCount:rows.length,successRate:successes/Math.max(1,rows.length),survivalRate:successes/Math.max(1,rows.length),summary:{successRate:successes/Math.max(1,rows.length),survivalRate:successes/Math.max(1,rows.length),controlCostMean:mean("controlCost"),maxTiltRadMean:mean("maxTiltRad"),minBaseHeightMean:mean("minBaseHeight"),simulatedSecondsMean:mean("simulatedSeconds")},rawResults:rows,validation:{passed:rows.length===seeds.length&&rows.every(r=>r.error==null),message:"Measured embodiment evaluation completed against MuJoCo Menagerie."},provenance:{gitSha,worker:"humanoidbehavior-worker",execution:"robot-menagerie-evaluation"},completedAt:new Date().toISOString()};
 exp.status="completed";exp.engine="MuJoCo";exp.result=result;await db.saveExperiment(exp);await db.updateJob(job.id,{status:"completed",result,finishedAt:new Date().toISOString()});await db.saveArtifact({id:db.id(),experimentId:job.experimentId,userId:job.userId,name:"robot-evaluation.json",contentType:"application/json",storage:"database",payload:result});
}
async function execute(job){if(job.type==="behavior-version-compare")return executeVersionComparison(job);if(job.type==="robot-embodiment-evaluate")return executeRobotEvaluation(job);if(job.type==="g1-pick-place")return executeG1BehaviorEvaluation(job);if(job.type==="g1-pick-place-compare")return executeG1BehaviorComparison(job);const p=job.payload||{},rows=[];const behaviorRef=p.behaviorId&&p.behaviorVersion?{behaviorId:p.behaviorId,behaviorVersion:p.behaviorVersion}:null;for(const seed of p.seeds||[])for(const policyName of p.policies||[]){if(p.engine==="MuJoCo"){const policy=POLICIES[policyName]||POLICIES["policy-a"];const taskBehavior=["pick-place","open-door","handover","follow-person"].includes(p.behaviorId);const r=await runProcess({behaviorId:p.behaviorId||"pick-place",behaviorVersion:p.behaviorVersion||"1.0.0",policy:policy.name.includes("a")?"A":"B",seed,seconds:p.seconds},taskBehavior?"simulation/behavior_task_worker.py":"simulation/mujoco_worker.py");r.seed=String(seed);r.policy=policy.name;r.engine="MuJoCo";r.measured=true;if(behaviorRef)Object.assign(r,behaviorRef);rows.push(r);await progress(job,rows.length,(p.seeds||[]).length*(p.policies||[]).length)}else{const sim=require("./simulation-benchmark");const r=sim.run({behaviorId:p.behaviorId||"pick-place",model:policyName,environment:p.environment||"hb-humanoid-v1",seed});r.seed=String(seed);r.policy=policyName;r.engine="simulation-harness";r.measured=false;if(behaviorRef)Object.assign(r,behaviorRef);rows.push(r);await progress(job,rows.length,(p.seeds||[]).length*(p.policies||[]).length)}}const exp=await db.getExperiment(job.experimentId,job.userId);if(!exp)throw new Error("Experiment not found");const result={...(exp.result||{}),status:"completed",behaviorId:p.behaviorId||exp.behaviorId||null,behaviorVersion:p.behaviorVersion||exp.behaviorVersion||null,engine:p.engine||"simulation-harness",measured:rows.every(r=>r.measured===true),runCount:rows.length,validation:{passed:rows.length===Number(exp.result?.expectedRunCount||rows.length),message:"Every requested seed was evaluated against every policy."},rawResults:rows,summary:rowSummary(rows),provenance:{gitSha,worker:"humanoidbehavior-worker",execution:"durable-job"},completedAt:new Date().toISOString()};exp.status="completed";exp.engine=result.engine;exp.result=result;await db.saveExperiment(exp);await db.updateJob(job.id,{status:"completed",result,finishedAt:new Date().toISOString()});await db.saveArtifact({id:db.id(),experimentId:job.experimentId,userId:job.userId,name:"experiment.json",contentType:"application/json",storage:"database",payload:result})}
async function loop(){console.log("HumanoidBehavior worker started");for(;;){try{const job=await db.claimJob();if(job){try{await execute(job)}catch(e){const exp=await db.getExperiment(job.experimentId,job.userId);if(exp){exp.status="failed";exp.result={...(exp.result||{}),status:"failed",validation:{passed:false,message:e.message}};await db.saveExperiment(exp)}if(Number(job.attempts||1)<3)await db.updateJob(job.id,{status:"queued",error:e.message});else await db.updateJob(job.id,{status:"failed",error:e.message,finishedAt:new Date().toISOString()})}}else await sleep(Number(process.env.WORKER_POLL_MS||1000))}catch(e){console.error("worker loop:",e.message);await sleep(2000)}}}
db.init().then(loop).catch(e=>{console.error(e);process.exit(1)});
