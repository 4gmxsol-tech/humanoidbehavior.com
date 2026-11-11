const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const target = "https://humanoidbehavior.com/registry.html";
const entries = [...sitemap.matchAll(/<url>([\\s\\S]*?)<\\/url>/g)]
  .map(match => match[1]);
const matches = entries.filter(entry => {
  const loc = entry.match(/<loc>([^<]+)<\\/loc>/);
  return loc?.[1]?.trim() === target;
});

assert.equal(matches.length, 1, "Registry URL must appear exactly once in sitemap.xml");
const lastmod = matches[0].match(/<lastmod>([^<]+)<\\/lastmod>/)?.[1]?.trim();
assert.ok(lastmod, "Registry URL must include lastmod after its content update");
assert.match(lastmod, /^\\d{4}-\\d{2}-\\d{2}$/, "Registry lastmod must use the ISO calendar-date format");
const parsed = new Date(lastmod + "T00:00:00Z");
assert.ok(!Number.isNaN(parsed.getTime()), "Registry lastmod must be a valid date");
assert.equal(parsed.toISOString().slice(0, 10), lastmod, "Registry lastmod must be a real calendar date");

console.log("PASS: registry sitemap entry has one valid lastmod date.");
