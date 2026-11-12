import assert from "node:assert/strict";
import fs from "node:fs";
import { validateBrowserResult } from "./cloudflare-browser-result.mjs";

const queued = {
  engine: "MuJoCo",
  behaviorId: "pick-place",
  behaviorVersion: "1.1.0",
  request: { expectedRunCount: 2, seeds: ["42", "1337"], policies: ["policy-a"] }
};
const row = seed => ({
  behaviorId: "pick-place",
  behaviorVersion: "1.1.0",
  seed,
  policy: "policy-a",
  engine: "MuJoCo",
  measured: true,
  metrics: { taskSuccess: true, simulatedSeconds: 5 }
});
const valid = {
  status: "completed",
  measured: true,
  reproducible: true,
  behaviorId: "pick-place",
  behaviorVersion: "1.1.0",
  engine: "MuJoCo",
  runCount: 2,
  expectedRunCount: 2,
  rawResults: [row("42"), row("1337")]
};

assert.equal(validateBrowserResult(queued, valid).ok, true, "valid complete run matrix is accepted");
assert.equal(validateBrowserResult(queued, { ...valid, rawResults: [row("42")] }).ok, false, "partial run matrix is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, rawResults: [row("42"), row("42")] }).ok, false, "duplicate seed/policy pair is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, rawResults: [row("42"), row("999")] }).ok, false, "unrequested seed is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, runCount: 1 }).ok, false, "forged runCount is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, expectedRunCount: 20 }).ok, false, "forged expectedRunCount is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, behaviorVersion: "9.9.9" }).ok, false, "mismatched behavior version is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, engine: "simulation-harness" }).ok, false, "mismatched engine is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, status: "failed" }).ok, false, "failed result cannot be marked completed");
assert.equal(validateBrowserResult(queued, { ...valid, measured: false }).ok, false, "unmeasured result is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, rawResults: [row("42"), { ...row("1337"), measured: false }] }).ok, false, "unmeasured row is rejected");
assert.equal(validateBrowserResult(queued, { ...valid, rawResults: [row("42"), { ...row("1337"), metrics: { taskSuccess: "yes", simulatedSeconds: 5 } }] }).ok, false, "invalid task metrics are rejected");
assert.equal(validateBrowserResult({ ...queued, request: { expectedRunCount: 21, seeds: ["x"], policies: Array(21).fill("p") } }, valid).ok, false, "invalid queued quota matrix is rejected");

const doorQueued = {
  engine: "MuJoCo",
  behaviorId: "open-door",
  behaviorVersion: "1.0.0",
  request: { expectedRunCount: 1, seeds: ["7"], policies: ["policy-b"] }
};
const doorResult = {
  status: "completed",
  measured: true,
  reproducible: true,
  behaviorId: "open-door",
  behaviorVersion: "1.0.0",
  engine: "MuJoCo",
  runCount: 1,
  expectedRunCount: 1,
  rawResults: [{
    behaviorId: "open-door",
    seed: "7",
    policy: "policy-b",
    engine: "MuJoCo",
    measured: true,
    metrics: { taskSuccess: false, simulatedSeconds: 5 }
  }]
};
assert.equal(validateBrowserResult(doorQueued, doorResult).ok, true, "supported behaviors without row-level version metadata remain valid");

const repeatedSeedQueued = {
  engine: "MuJoCo",
  behaviorId: "pick-place",
  behaviorVersion: "1.1.0",
  request: { expectedRunCount: 2, seeds: ["42", "42"], policies: ["policy-a"] }
};
const repeatedSeedResult = { ...valid, rawResults: [row("42"), row("42")] };
assert.equal(validateBrowserResult(repeatedSeedQueued, repeatedSeedResult).ok, true, "intentionally repeated seeds remain valid when every requested run is present");

const worker = fs.readFileSync("cloudflare-worker.js", "utf8");
const routeStart = worker.indexOf("const browserMatch = path.match(");
const routeEnd = worker.indexOf('if (path === "/api/behaviors/compare/benchmark"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "browser-result route must be present");
const route = worker.slice(routeStart, routeEnd);
assert.ok(route.includes("validateBrowserResult("), "Worker must validate submitted results against the queued run matrix");
assert.ok(route.indexOf("validateBrowserResult(") < route.indexOf("UPDATE experiments SET status='completed'"), "Validation must happen before marking an experiment completed");
assert.ok(route.includes("status IN ('queued','running')"), "Only queued or running experiments may accept browser results");
assert.ok(route.includes("result_json FROM experiments"), "The queued experiment contract must be loaded before accepting results");

console.log("Cloudflare browser-result integrity tests passed (14 cases plus Worker route guards).");
