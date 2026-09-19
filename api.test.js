const assert=require("assert"),{evaluate}=require("./benchmark-runner");
const b=require("./data/behaviors.json")[0];
const good=evaluate({behaviorId:b.id,completedSteps:b.steps});
assert.equal(good.ok,true);assert.equal(good.status,"passed");assert.equal(good.checks.length,b.steps.length);
const bad=evaluate({behaviorId:b.id,completedSteps:b.steps.slice(0,2)});
assert.equal(bad.status,"incomplete");
console.log("benchmark runner tests passed");
