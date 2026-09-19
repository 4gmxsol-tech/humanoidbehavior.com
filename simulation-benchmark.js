const crypto=require("crypto");
const behaviors=require("./data/behaviors.json");
function run(input={}){
 const b=behaviors.find(x=>x.id===input.behaviorId);
 if(!b)throw new Error("Unknown behavior");
 const seed=crypto.createHash("sha256").update(JSON.stringify({behavior:b.id,model:input.model||"baseline",environment:input.environment||"default",seed:input.seed||"0"})).digest();
 const n=(i,max)=>seed[i]%max;
 const completed=Math.max(1,Math.min(b.steps.length,b.steps.length-(n(0,3))));
 const collisions=n(1,4),duration=Number((5+b.steps.length*1.7+n(2,80)/10).toFixed(2));
 const success=completed===b.steps.length&&collisions<3;
 return {engine:"deterministic-physics-proxy",simulation:true,measured:false,runId:"sim_"+crypto.randomBytes(8).toString("hex"),behaviorId:b.id,model:input.model||"baseline-policy",environment:input.environment||"humanoid-lab-v1",seed:input.seed||"0",status:success?"passed":"failed",metrics:{successRate:success?1:0,completionTimeSec:duration,collisions,stepsCompleted:completed,stepsTotal:b.steps.length},checks:b.steps.map((s,i)=>({step:i+1,name:s,passed:i<completed})),note:"This is a deterministic benchmark harness for pipeline validation, not a physics simulator. Connect MuJoCo/Isaac/Gazebo to publish physical simulation measurements."};
}
module.exports={run};
