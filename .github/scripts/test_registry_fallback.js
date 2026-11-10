const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8")
  + "\n;globalThis.__localRegistry = localRegistry;";
const sandbox = { document: { addEventListener() {} } };
vm.runInNewContext(appSource, sandbox);

const fallback = sandbox.__localRegistry();
const seed = [
  ...require(path.join(root, "data/behaviors.json")),
  ...require(path.join(root, "data/behavior-releases.json"))
];
const expectedVersions = seed.map(item => item.id + "@" + item.version).sort();
const actualVersions = fallback.map(item => item.id + "@" + item.version).sort();

assert.equal(
  actualVersions.join("|"),
  expectedVersions.join("|"),
  "Local fallback must expose every built-in published behavior version"
);
assert.equal(fallback.length, 5, "Fallback should include four behaviors and the additional Pick & Place release");
assert.equal(new Set(fallback.map(item => item.id)).size, 4, "Fallback behavior count must remain four");

const latestPickPlace = fallback.find(item => item.id === "pick-place" && item.version === "1.1.0");
assert.ok(latestPickPlace, "Latest Pick & Place release must be available offline");
assert.ok(latestPickPlace.steps.includes("Verify object settled"), "Latest release must retain its final verification step");
assert.equal(latestPickPlace.metrics, null, "Fallback must not invent benchmark metrics");
assert.equal(latestPickPlace.metricsStatus, "not-measured", "Fallback must label the specification as unmeasured");

for (const item of fallback) {
  assert.equal(item.metrics, null, "Offline catalog must not expose unverified metrics");
  assert.equal(item.metricsStatus, "not-measured", "Offline catalog must label every specification as unmeasured");
}

console.log("PASS: local registry fallback versions match the published seed catalog without inventing metrics");
