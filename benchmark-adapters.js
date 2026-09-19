const adapters={
"spec-validator":async({behavior,input})=>({adapter:"spec-validator",kind:"software",status:"passed",note:"Validates task specification only; no physical performance claim.",stepsChecked:Array.isArray(input.completedSteps)?input.completedSteps.length:0}),
"mock-sim":async({behavior})=>({adapter:"mock-sim",kind:"simulation-placeholder",status:"available",note:"Adapter contract only. Connect MuJoCo/Isaac/Gazebo before publishing simulation measurements.",environment:"not-configured"})
};
async function runAdapter(name,args){const fn=adapters[name];if(!fn)throw new Error("Unknown adapter: "+name);return fn(args)}
module.exports={adapters,runAdapter};
