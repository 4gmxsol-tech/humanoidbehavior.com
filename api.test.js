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


// Behavior read authorization regression tests.
const behaviorAccess = require("./behavior-access");
const publicPublished = { id: "public-1", userId: "owner-a", visibility: "public", status: "published" };
const publicDraft = { id: "public-draft", userId: "owner-a", visibility: "public", status: "draft" };
const privatePublished = { id: "private-published", userId: "owner-a", visibility: "private", status: "published" };
const privateDraft = { id: "private-draft", userId: "owner-a", visibility: "private", status: "draft" };
const owner = { id: "owner-a" };
const otherUser = { id: "owner-b" };

assert.strictEqual(behaviorAccess.isPublicPublished(publicPublished), true);
assert.strictEqual(behaviorAccess.canReadBehavior(publicPublished, null), true);
assert.strictEqual(behaviorAccess.canReadBehavior(publicPublished, otherUser), true);
assert.strictEqual(behaviorAccess.canReadBehavior(publicDraft, null), false);
assert.strictEqual(behaviorAccess.canReadBehavior(privatePublished, null), false);
assert.strictEqual(behaviorAccess.canReadBehavior(privateDraft, null), false);
assert.strictEqual(behaviorAccess.canReadBehavior(privateDraft, owner), true);
assert.strictEqual(behaviorAccess.canReadBehavior(privatePublished, owner), true);
assert.strictEqual(behaviorAccess.canReadBehavior(privateDraft, otherUser), false);
assert.strictEqual(behaviorAccess.canReadBehavior(null, owner), false);
console.log("behavior read authorization tests passed");


// API-route regression guards: private behavior data must not be used by another account.
const fs = require("fs");
const path = require("path");
const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");

const experimentStart = apiSource.indexOf('if(u.pathname==="/api/experiments/run"&&req.method==="POST")');
const experimentEnd = apiSource.indexOf('if(u.pathname==="/api/experiments"&&req.method==="GET")', experimentStart);
assert.ok(experimentStart >= 0 && experimentEnd > experimentStart, "experiment-run route must be present");
const experimentRoute = apiSource.slice(experimentStart, experimentEnd);
const experimentGuard = experimentRoute.indexOf("behaviorAccess.canReadBehavior(selectedBehavior,u)");
const experimentQueue = experimentRoute.indexOf("await db.enqueueJob");
assert.ok(experimentGuard >= 0 && experimentGuard < experimentQueue, "experiment route must authorize behavior access before queuing a run");
assert.ok(experimentRoute.includes('return send(res,404,{error:"Behavior not found"})'), "private behavior access must fail closed with a non-disclosing 404");

const benchmarkStart = apiSource.indexOf('if(u.pathname==="/api/benchmark"&&req.method==="POST")');
const benchmarkEnd = apiSource.indexOf('if(u.pathname==="/api/billing/status"&&req.method==="GET")', benchmarkStart);
assert.ok(benchmarkStart >= 0 && benchmarkEnd > benchmarkStart, "benchmark route must be present");
const benchmarkRoute = apiSource.slice(benchmarkStart, benchmarkEnd);
const benchmarkGuard = benchmarkRoute.indexOf("behaviorAccess.canReadBehavior(b,u)");
const benchmarkExecution = benchmarkRoute.indexOf("runner.evaluate");
assert.ok(benchmarkGuard >= 0 && benchmarkGuard < benchmarkExecution, "benchmark route must authorize behavior access before execution");
assert.ok(benchmarkRoute.includes('return send(res,404,{error:"Behavior not found"})'), "benchmark route must not disclose private behavior existence");
console.log("private behavior API authorization regression checks passed");


// API-route regression guards: private behavior data must be authorized before
// an experiment is persisted, queued, evaluated, or returned to another account.
const fs = require("fs");
const path = require("path");
const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");

function extractApiRoute(startMarker, endMarker, label) {
  const start = apiSource.indexOf(startMarker);
  const end = apiSource.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, label + " route must be present");
  return apiSource.slice(start, end);
}

const experimentRoute = extractApiRoute(
  'if(u.pathname==="/api/experiments/run"&&req.method==="POST")',
  'if(u.pathname==="/api/experiments"&&req.method==="GET")',
  "experiment-run"
);
const experimentUserGate = experimentRoute.indexOf("requireUser(req,res)");
const experimentLookup = experimentRoute.indexOf("behaviorRegistry.get(");
const experimentGuard = experimentRoute.indexOf("behaviorAccess.canReadBehavior(selectedBehavior,u)");
const experimentPersist = experimentRoute.indexOf("await db.saveExperiment(e)");
const experimentQueue = experimentRoute.indexOf("await db.enqueueJob");
assert.ok(experimentUserGate >= 0 && experimentUserGate < experimentLookup,
  "experiment route must authenticate before looking up a requested behavior");
assert.ok(experimentGuard >= 0 && experimentGuard < experimentPersist && experimentGuard < experimentQueue,
  "experiment route must authorize behavior access before persistence or queueing");
assert.ok(experimentRoute.includes('return send(res,404,{error:"Behavior not found"})'),
  "private experiment access must fail closed with a non-disclosing 404");

const benchmarkRoute = extractApiRoute(
  'if(u.pathname==="/api/benchmark"&&req.method==="POST")',
  'if(u.pathname==="/api/billing/status"&&req.method==="GET")',
  "benchmark"
);
const benchmarkUserGate = benchmarkRoute.indexOf("requireUser(req,res)");
const benchmarkLookup = benchmarkRoute.indexOf("behaviorRegistry.get(");
const benchmarkGuard = benchmarkRoute.indexOf("behaviorAccess.canReadBehavior(b,u)");
const benchmarkExecution = benchmarkRoute.indexOf("runner.evaluate");
const benchmarkPersist = benchmarkRoute.indexOf("await db.saveRun(result)");
assert.ok(benchmarkUserGate >= 0 && benchmarkUserGate < benchmarkLookup,
  "benchmark route must authenticate before looking up a requested behavior");
assert.ok(benchmarkGuard >= 0 && benchmarkGuard < benchmarkExecution && benchmarkGuard < benchmarkPersist,
  "benchmark route must authorize behavior access before execution or persistence");
assert.ok(benchmarkRoute.includes('return send(res,404,{error:"Behavior not found"})'),
  "benchmark route must not disclose private behavior existence");
console.log("private behavior API route regression checks passed");
