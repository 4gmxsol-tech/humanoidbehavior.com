const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8")
  + "\n;globalThis.__latestPublishedBehaviors = latestPublishedBehaviors;";
const sandbox = { document: { addEventListener() {} } };
vm.runInNewContext(appSource, sandbox);

const seed = [
  ...require(path.join(root, "data/behaviors.json")),
  ...require(path.join(root, "data/behavior-releases.json"))
];
const latest = Array.from(sandbox.__latestPublishedBehaviors(seed));
const latestPickPlace = latest.find(item => item.id === "pick-place");

assert.equal(seed.length, 5, "Seed catalog should retain all five published versions");
assert.equal(latest.length, 4, "Public behavior cards should show one latest version per behavior");
assert.equal(new Set(latest.map(item => item.id)).size, 4, "Registry cards must not duplicate behavior IDs");
assert.equal(latestPickPlace?.version, "1.1.0", "Pick & Place card must use the highest semantic version");
assert.equal(latest.filter(item => item.id === "pick-place").length, 1, "Pick & Place should appear once in the catalog");
assert.ok(appSource.includes("const publishedBehaviors=latestPublishedBehaviors(data)"), "Registry rendering must use latest versions for cards");
assert.ok(appSource.includes("document.querySelector(\"#registry-versions\").textContent=data.length"), "Version summary must continue to count every published version");

console.log("PASS: registry cards show the latest version once per behavior while retaining the full version count");
