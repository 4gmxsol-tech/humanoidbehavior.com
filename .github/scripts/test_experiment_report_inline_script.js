import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("experiment.html", "utf8");
const inlineScripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());

assert.ok(inlineScripts.length > 0, "Experiment report must contain its inline application script.");
for (const [index, source] of inlineScripts.entries()) {
  assert.doesNotThrow(
    () => new vm.Script(source, { filename: "experiment.html:inline-script-" + (index + 1) }),
    "Experiment report inline script " + (index + 1) + " must parse."
  );
}
assert.ok(html.includes("Verification scope:"), "Experiment report must display the verification-scope disclosure.");
assert.ok(html.includes("does not independently rerun or cryptographically attest the simulation"), "The disclosure must describe the actual verification limit.");

console.log("Experiment report inline JavaScript syntax and verification disclosure checks passed.");
