const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "behaviors.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8")
  + "\n;globalThis.__localRegistry = localRegistry;";
const sandbox = { document: { addEventListener() {} } };
vm.runInNewContext(appSource, sandbox);

const fallback = sandbox.__localRegistry();
const unique = new Map();
for (const item of fallback) if (!unique.has(item.id)) unique.set(item.id, item);

const cards = [...html.matchAll(/<a\b([^>]*data-static-behavior="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/g)];
assert.equal(cards.length, unique.size, "Static HTML must contain one card per published behavior");
assert.equal(cards.length, 4, "The public registry must expose four behavior specifications");

const escapeHtml = value => String(value).replace(/[&<>]/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;"
}[char]));

for (const [id, item] of unique) {
  const match = cards.find(card => card[2] === id);
  assert.ok(match, "Static card missing for " + id);
  const attrs = match[1];
  const body = match[3];
  assert.ok(attrs.includes('href="behavior.html?id=' + id + '"'), "Static card link missing for " + id);
  assert.ok(body.includes(escapeHtml(item.name)), "Static card name differs from local fallback for " + id);
  assert.ok(body.includes(escapeHtml(item.description)), "Static card description differs from local fallback for " + id);
  assert.ok(body.includes("v" + item.version), "Static card version differs from local fallback for " + id);
  assert.ok(body.includes(escapeHtml(item.category)), "Static card category differs from local fallback for " + id);
  assert.ok(body.includes(escapeHtml(item.level)), "Static card level differs from local fallback for " + id);
  assert.ok(body.includes("Not measured"), "Static card must disclose unmeasured evidence for " + id);
  assert.ok(!/●\s*Measured/.test(body), "Static card must not imply measured results for " + id);
}
assert.match(html, /id="registry-count">4<\/strong>/, "Initial behavior count must match the public catalog");
assert.match(html, /id="registry-versions">5<\/strong>/, "Initial version count must match local fallback history");
assert.match(html, /role="status">Public behavior specifications are shown below/, "Initial status must not be a blank loading placeholder");
assert.match(html, /rel="canonical" href="https:\/\/humanoidbehavior\.com\/behaviors\.html"/, "Canonical URL must remain unchanged");
assert.match(html, /name="robots" content="index,follow/, "Registry page must remain indexable");
assert.match(html, /<h1>Reusable humanoid robot behaviors\.<\/h1>/, "H1 must identify humanoid robot behaviors");
assert.match(html, /<title>Robot Behavior Registry for Humanoids \| HumanoidBehavior<\/title>/, "Title must align with robot behavior registry intent");
assert.match(html, /<meta name="description" content="Browse versioned humanoid robot behavior specs for manipulation, navigation and handovers\. Compare task definitions and labeled evaluation evidence\."/, "Meta description must explain the registry's contents and evidence labels");
assert.match(html, /<meta property="og:title" content="Robot Behavior Registry for Humanoids \| HumanoidBehavior">/, "Open Graph title must match the document title");
assert.match(html, /<meta name="twitter:title" content="Robot Behavior Registry for Humanoids \| HumanoidBehavior">/, "Twitter title must match the document title");

const jsonLdScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const collection = jsonLdScripts.map(match => JSON.parse(match[1])).find(value => value["@type"] === "CollectionPage");
assert.ok(collection, "CollectionPage JSON-LD is required");
assert.equal(collection.url, "https://humanoidbehavior.com/behaviors.html");
assert.equal(collection.name, "Robot Behavior Registry for Humanoids");
assert.equal(collection.description, "Browse versioned humanoid robot behavior specs for manipulation, navigation and handovers. Compare task definitions and labeled evaluation evidence.");
assert.equal(collection.dateModified, "2026-11-14");
assert.match(collection.dateModified, /^\d{4}-\d{2}-\d{2}$/, "CollectionPage dateModified must be an ISO date");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const behaviorEntry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]).find(entry => entry.includes("<loc>https://humanoidbehavior.com/behaviors.html</loc>"));
assert.ok(behaviorEntry, "Behaviors page must remain in the sitemap");
const sitemapLastmod = behaviorEntry.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
assert.ok(sitemapLastmod, "Behaviors sitemap entry must include lastmod");
assert.equal(sitemapLastmod[1], collection.dateModified, "Sitemap lastmod must match CollectionPage dateModified");
assert.equal(collection.mainEntity["@type"], "ItemList");
assert.equal(collection.mainEntity.numberOfItems, 4);
const schemaNames = collection.mainEntity.itemListElement.map(entry => entry.item.name).sort();
assert.deepEqual(schemaNames, [...unique.values()].map(item => item.name).sort(), "Structured list must match the visible behavior cards");

console.log("PASS: static behavior cards, fallback parity, evidence labels and CollectionPage metadata");
