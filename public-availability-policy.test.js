"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
if (!/https:\/\/humanoidbehavior\.com\/acquisition\//i.test(sitemap)) {
  throw new Error("The acquisition page must be listed in the public sitemap.");
}

const forbiddenHoldClaims = [
  /not currently being offered for sale/i,
  /not for sale/i,
  /Status: HOLD/i
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
let homepageLinksToAcquisition = false;
for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const html = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenHoldClaims) {
    if (pattern.test(html)) {
      throw new Error("Stale HOLD claim " + pattern + " found in " + relative);
    }
  }
  if (relative === "acquisition/index.html") {
    if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) {
      throw new Error("Acquisition page must be indexable, not noindex: " + relative);
    }
    if (!/available for acquisition/i.test(html)) {
      throw new Error("Acquisition page must clearly state it is available for acquisition: " + relative);
    }
    continue;
  }
  if (relative === "index.html" && /href=["'][^"']*acquisition\//i.test(html)) {
    homepageLinksToAcquisition = true;
  }
}
if (!homepageLinksToAcquisition) {
  throw new Error("Homepage must link to the acquisition page.");
}

const referenceDocs = [
  "ACQUISITION_ASSET_INVENTORY.md",
  "BUYER_HANDOFF.md",
  "SALE_PACKAGE.md",
  "TRANSFER_CHECKLIST.md"
];
for (const file of referenceDocs) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (!content.startsWith("#") || !/Status: AVAILABLE FOR ACQUISITION/i.test(content)) {
    throw new Error("Reference document is missing the AVAILABLE FOR ACQUISITION notice: " + file);
  }
}

console.log("Public availability policy passed across " + htmlFiles.length + " HTML files and " + referenceDocs.length + " reference documents.");
