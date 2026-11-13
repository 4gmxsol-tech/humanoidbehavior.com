import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("benchmark.html", "utf8");
const report = fs.readFileSync("experiment.html", "utf8");

const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
const ogDescription = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
const twitterDescription = html.match(/<meta name="twitter:description" content="([^"]+)"/)?.[1];

assert.ok(description, "Benchmark page must retain a meta description.");
assert.equal(ogDescription, description, "Open Graph description must match the page description.");
assert.equal(twitterDescription, description, "Twitter description must match the page description.");
assert.match(html, /<h1>Run a controlled benchmark\.<\/h1>/);
assert.match(html, /controlled MuJoCo behavior evaluations with explicit seeds and policy versions/i);
assert.match(html, /Each run is stored with its configuration and results in your workspace/i);
assert.doesNotMatch(html, /reproducible benchmark|reproducible robotics benchmarks|reproducible seeds/i);
assert.match(html, /Sign in or create a free workspace/);
assert.match(html, /25 benchmark runs per month and 5 private behaviors/);
assert.match(html, /Paid plans are being prepared for secure checkout/);
assert.match(report, /Client-reported reproducibility/);
assert.match(report, /does not independently rerun or cryptographically attest the simulation/);

console.log("Benchmark landing-page claim alignment checks passed.");
