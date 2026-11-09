"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
if (/https:\/\/humanoidbehavior\.com\/acquisition\//i.test(sitemap)) {
  throw new Error("The acquisition status endpoint must not be listed in the public sitemap.");
}

const forbiddenPublicClaims = [
  /available for acquisition/i,
  /available for strategic acquisition/i,
  /acquisition opportunity/i,
  /request acquisition discussion/i,
  /acquisition room/i,
  /buyer room/i,
  /open sale package/i,
  /buyer handoff/i,
  /sale package/i,
  /see the acquisition path/i
];

function walkHtml(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".github", "coverage", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, results);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) results.push(full);
  }
  return results;
}

const htmlFiles = walkHtml(root);
for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const html = fs.readFileSync(file, "utf8");
  if (relative === "acquisition/index.html") {
    if (!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) {
      throw new Error("Acquisition status endpoint must be noindex: " + relative);
    }
    if (!/not currently being offered for sale/i.test(html)) {
      throw new Error("Acquisition status endpoint must clearly state HOLD: " + relative);
    }
    continue;
  }
  for (const pattern of forbiddenPublicClaims) {
    if (pattern.test(html)) {
      throw new Error("Unapproved public sale claim " + pattern + " found in " + relative);
    }
  }
  if (/href=["'][^"']*acquisition\//i.test(html)) {
    throw new Error("Public page still links to acquisition endpoint: " + relative);
  }
}

const referenceDocs = [
  "ACQUISITION_ASSET_INVENTORY.md",
  "BUYER_HANDOFF.md",
  "SALE_PACKAGE.md",
  "TRANSFER_CHECKLIST.md"
];
for (const file of referenceDocs) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (!content.startsWith("#") || !/Status: HOLD — not currently offered for sale/i.test(content)) {
    throw new Error("Reference document is missing the HOLD notice: " + file);
  }
}

console.log("Public sale-status policy passed across " + htmlFiles.length + " HTML files and " + referenceDocs.length + " reference documents.");
