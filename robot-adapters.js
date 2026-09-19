const {spawn}=require("child_process");

const robots={
 "unitree-g1":{name:"Unitree G1",manufacturer:"Unitree Robotics",class:"humanoid",engines:["MuJoCo"],modelSource:"MuJoCo Menagerie",status:"adapter-ready",capabilities:["locomotion","manipulation","whole-body"]},
 "unitree-h1":{name:"Unitree H1",manufacturer:"Unitree Robotics",class:"humanoid",engines:["MuJoCo"],modelSource:"MuJoCo Menagerie",status:"adapter-ready",capabilities:["locomotion","manipulation","whole-body"]},
 "unitree-t1":{name:"Unitree T1",manufacturer:"Unitree Robotics",class:"humanoid",engines:["MuJoCo"],modelSource:"MuJoCo Menagerie",status:"adapter-ready",capabilities:["locomotion","manipulation"]},
 "apollo":{name:"Apollo",manufacturer:"Apptronik",class:"humanoid",engines:["MuJoCo"],modelSource:"MuJoCo Menagerie",status:"adapter-ready",capabilities:["locomotion","manipulation","whole-body"]},
 "talos":{name:"TALOS",manufacturer:"PAL Robotics",class:"humanoid",engines:["MuJoCo"],modelSource:"MuJoCo Menagerie",status:"adapter-ready",capabilities:["locomotion","manipulation","whole-body"]},
 "generic-humanoid":{name:"Generic Humanoid",manufacturer:"HumanoidBehavior",class:"reference",engines:["MuJoCo","simulation-harness"],modelSource:"Built-in task worker",status:"active",capabilities:["benchmarking"]}
};
const adapters={
 "robot-api":{kind:"robot",run:async x=>({status:"queued",transport:"http",endpoint:x.endpoint||null,command:x.command||null,requiresApproval:true,executionContract:{behaviorId:x.behaviorId||null,behaviorVersion:x.behaviorVersion||null,robotId:x.robotId||null}})},
 "ros2":{kind:"robot",run:async x=>({status:"queued",transport:"ros2",node:x.node||null,action:x.action||null,requiresApproval:true,executionContract:{behaviorId:x.behaviorId||null,behaviorVersion:x.behaviorVersion||null,robotId:x.robotId||null}})},
 "mujoco":{kind:"simulation",run:async x=>worker("mujoco",x)},
 "isaac-lab":{kind:"simulation",run:async x=>worker("isaac-lab",x)},
 "gazebo":{kind:"simulation",run:async x=>worker("gazebo",x)}
};
function worker(kind,input){const c=process.env.SIM_WORKER_COMMAND;if(!c)return Promise.resolve({status:"not_configured",kind,message:"Configure SIM_WORKER_COMMAND for a real simulator worker.",job:{kind,input}});return new Promise(resolve=>{const p=spawn(c,{shell:true,env:{...process.env,SIM_KIND:kind}});let o="",e="";p.stdout.on("data",d=>o+=d);p.stderr.on("data",d=>e+=d);p.on("close",code=>resolve({status:code===0?"completed":"failed",kind,exitCode:code,stdout:o.slice(-10000),stderr:e.slice(-5000)}))})}
function getRobot(id){return robots[id]||null}
async function runAdapter(id,input){if(!adapters[id])throw new Error("Unknown adapter: "+id);return adapters[id].run(input)}
module.exports={adapters,robots,getRobot,runAdapter};