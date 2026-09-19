const REQUIRED=["id","name","version","description","steps"];
function validateBehaviorPackage(input){
 const errors=[];
 if(!input||typeof input!=="object")return {valid:false,errors:["Behavior package must be an object"]};
 for(const key of REQUIRED){if(!input[key])errors.push(`Missing required field: ${key}`)}
 if(input.id&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id))errors.push("id must be kebab-case");
 if(input.version&&!/^\d+\.\d+\.\d+$/.test(input.version))errors.push("version must use semantic versioning, e.g. 1.0.0");
 if(input.steps&&!Array.isArray(input.steps))errors.push("steps must be an array");
 if(Array.isArray(input.steps)&&input.steps.length<2)errors.push("steps must contain at least two items");
 if(input.visibility&&!["public","private"].includes(input.visibility))errors.push("visibility must be public or private");
 return {valid:errors.length===0,errors};
}
module.exports={validateBehaviorPackage};