const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
const description = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || "";
const canonical = (html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [])[1] || "";
const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "";
const visibleH1 = h1.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

assert.ok(title.includes("Humanoid Robot Behavior"), "Homepage title must retain the primary topic");
assert.ok(description.toLowerCase().includes("humanoid robot behaviors"), "Meta description must retain the primary topic");
assert.equal(canonical, "https://humanoidbehavior.com/", "Homepage canonical must remain stable");
assert.equal(visibleH1, "Humanoid Robot Behavior. Define, measure and benchmark.",
  "Visible H1 must state the primary topic and the platform's core actions");
assert.ok(sitemap.includes("<loc>https://humanoidbehavior.com/</loc>"),
  "Homepage must remain discoverable in the sitemap");
const homepageEntry = (sitemap.match(/<url><loc>https:\/\/humanoidbehavior\.com<\/\/><[\s\S]*?<\/url>/i) || [])[0] || "";
assert.ok(homepageEntry.includes("<lastmod>2026-11-15</lastmod>"),
  "Homepage sitemap lastmod must reflect the November 15 search-intent update");

console.log("Humanoid Robot Behavior homepage search-intent validation passed.");
