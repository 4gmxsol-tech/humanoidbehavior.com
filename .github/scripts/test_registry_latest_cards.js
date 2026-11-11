const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8")
  + "\n;globalThis.__latestPublishedBehaviors = latestPublishedBehaviors; globalThis.__renderPublicRegistryCards = renderPublicRegistryCards;";
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

const registryPage = fs.readFileSync(path.join(root, "registry.html"), "utf8");
const registryCards = sandbox.__renderPublicRegistryCards(seed);
assert.equal((registryCards.match(/<article class="behavior-card">/g) || []).length, 4, "Standalone registry page must render one card per behavior");
const pickPlaceStart = registryCards.indexOf("Pick &amp; Place");
const pickPlaceEnd = registryCards.indexOf("</article>", pickPlaceStart);
const pickPlaceCard = registryCards.slice(registryCards.lastIndexOf('<article class="behavior-card">', pickPlaceStart), pickPlaceEnd + 10);
assert.ok(pickPlaceCard.includes("v1.1.0"), "Standalone registry page must show the latest Pick & Place version");
assert.ok(!pickPlaceCard.includes("v1.0.0"), "Standalone registry page must not show an older Pick & Place version");
assert.ok(registryPage.includes("renderPublicRegistryCards(d.data||d.behaviors||[])"), "Standalone registry page must use the shared safe latest-version renderer");
assert.ok(!registryPage.includes("d.data?.map"), "Standalone registry page must not render raw API records directly");

const maliciousCards = sandbox.__renderPublicRegistryCards([{
  id: 'demo" onmouseover="alert(1)',
  version: "1.0.0",
  name: '<img src=x onerror=alert(1)>',
  description: '<script>alert(1)</script>',
  package: { category: '<svg onload=alert(1)>' },
  status: '<b>published</b>'
}]);
assert.doesNotMatch(maliciousCards, /<img|<script|<svg|<b>/i, "Untrusted registry text must be escaped before HTML rendering");
assert.ok(maliciousCards.includes("&lt;img"), "Registry card text should be escaped, not dropped");

console.log("PASS: registry cards show the latest version once per behavior while retaining the full version count");
