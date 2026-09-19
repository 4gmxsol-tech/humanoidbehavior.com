const assert=require("assert"),{evaluate}=require("./benchmark-runner"),{runAdapter}=require("./benchmark-adapters"),{validateBehaviorPackage}=require("./behavior-schema");
const b=require("./data/behaviors.json")[0];
(async()=>{const good=evaluate({behaviorId:b.id,completedSteps:b.steps});assert.equal(good.status,"passed");const bad=evaluate({behaviorId:b.id,completedSteps:b.steps.slice(0,2)});assert.equal(bad.status,"incomplete");const a=await runAdapter("spec-validator",{behavior:b,input:{completedSteps:b.steps}});assert.equal(a.status,"passed");console.log("benchmark and adapter tests passed")})().catch(e=>{console.error(e);process.exit(1)});
const sim=require("./simulation-benchmark");
const sr=sim.run({behaviorId:"pick-place",model:"test-model",environment:"test-env",seed:"ci"});
assert.strictEqual(sr.simulation,true);
assert.ok(sr.metrics.stepsTotal>0);
assert.ok(["passed","failed"].includes(sr.status));
console.log("simulation harness passed");

const db=require("./db");
assert.ok(typeof db.saveExperiment==="function");
assert.ok(typeof db.listExperiments==="function");
assert.ok(typeof db.getExperiment==="function");
console.log("experiment persistence API passed");

const validPackage={id:"pick-place",name:"Pick & Place",version:"1.0.0",description:"test",steps:["one","two"]};assert.strictEqual(validateBehaviorPackage(validPackage).valid,true);assert.strictEqual(validateBehaviorPackage({...validPackage,id:"Bad ID"}).valid,false);console.log("behavior package schema passed");

const registry=require("./behavior-registry");
(async()=>{await registry.init();const versions=await registry.versions("pick-place",{publicOnly:true});assert.ok(versions.length>=1);const latest=versions[0];assert.strictEqual(latest.visibility,"public");assert.strictEqual(latest.status,"published");console.log("behavior registry/versioning passed")})().catch(e=>{console.error(e);process.exit(1)});
