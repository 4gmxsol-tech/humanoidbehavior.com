import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("cloudflare-worker.js", "utf8");
const deployWorkflow = fs.readFileSync(".github/workflows/cloudflare-worker-deploy.yml", "utf8");
const accessWorkflow = fs.readFileSync(".github/workflows/cloudflare-worker-access-tests.yml", "utf8");

const localImports = [...worker.matchAll(/from\s+["'](\.\/[^"']+)["']/g)]
  .map((match) => match[1].replace(/^\.\//, ""));

assert.ok(localImports.length > 0, "Expected the Worker to declare at least one local module import.");

for (const importedPath of localImports) {
  assert.ok(
    deployWorkflow.includes('- "' + importedPath + '"'),
    "Worker deployment must trigger when imported runtime module changes: " + importedPath
  );
}

for (const requiredPath of [
  "cloudflare-worker.js",
  "wrangler.jsonc",
  ".github/workflows/cloudflare-worker-deploy.yml",
  "migrations/**"
]) {
  assert.ok(
    deployWorkflow.includes('- "' + requiredPath + '"'),
    "Worker deployment path filter is missing required path: " + requiredPath
  );
}

assert.ok(deployWorkflow.includes("workflow_dispatch:"), "Manual Worker deployment must remain available.");
assert.ok(accessWorkflow.includes(".github/workflows/cloudflare-worker-deploy.yml"), "The deployment-path test must run when the deployment workflow changes.");
assert.ok(accessWorkflow.includes("node cloudflare-worker-deploy-paths.test.mjs"), "The deployment-path regression test must be wired into CI.");

console.log("Worker deployment path coverage: PASS");
console.log("Checked local Worker imports: " + localImports.join(", "));
