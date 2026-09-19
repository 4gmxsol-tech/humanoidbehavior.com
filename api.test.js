const assert=require("assert"),{evaluate}=require("./benchmark-runner"),{runAdapter}=require("./benchmark-adapters");
const b=require("./data/behaviors.json")[0];
(async()=>{const good=evaluate({behaviorId:b.id,completedSteps:b.steps});assert.equal(good.status,"passed");const bad=evaluate({behaviorId:b.id,completedSteps:b.steps.slice(0,2)});assert.equal(bad.status,"incomplete");const a=await runAdapter("spec-validator",{behavior:b,input:{completedSteps:b.steps}});assert.equal(a.status,"passed");console.log("benchmark and adapter tests passed")})().catch(e=>{console.error(e);process.exit(1)});
const sim=require("./simulation-benchmark");
const sr=sim.run({behaviorId:"pick-place",model:"test-model",environment:"test-env",seed:"ci"});
assert.strictEqual(sr.simulation,true);
assert.ok(sr.metrics.stepsTotal>0);
assert.ok(["passed","failed"].includes(sr.status));
console.log("simulation harness passed");
