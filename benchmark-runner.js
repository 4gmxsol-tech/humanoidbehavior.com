const fs=require("fs"),path=require("path"),crypto=require("crypto");
const behaviors=JSON.parse(fs.readFileSync(path.join(__dirname,"data","behaviors.json"),"utf8"));
function evaluate(input){
 const b=behaviors.find(x=>x.id===input.behaviorId);
 if(!b) return {ok:false,error:"Behavior not found"};
 const completed=Array.isArray(input.completedSteps)?input.completedSteps:[];
 const expected=b.steps;
 const checks=expected.map((step,i)=>({step,index:i,completed:completed[i]===step}));
 const passed=checks.every(x=>x.completed);
 return {ok:true,runId:"run_"+crypto.randomBytes(8).toString("hex"),behaviorId:b.id,status:passed?"passed":"incomplete",checks,metrics:b.metrics,createdAt:new Date().toISOString()};
}
module.exports={evaluate};
