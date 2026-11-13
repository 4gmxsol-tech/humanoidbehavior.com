import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("experiment.html", "utf8");
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
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
assert.ok(html.includes('<select id="viewer-speed" aria-label="Simulation replay speed"'), "Replay speed control must have an accessible name.");
assert.ok(html.includes('<canvas id="simulation-canvas" role="img" aria-label="Recorded MuJoCo simulation replay showing the robot, object and target" aria-describedby="viewer-time"'), "Simulation replay canvas must expose its purpose and text description.");
assert.match(html, /<div id="viewer-time"/, "The canvas description target must remain available.");

const csvJoin = html.match(/const csv=\[[\s\S]*?\]\.join\((["'])(.*?)\1\)/);
assert.ok(csvJoin, "CSV export must assemble rows with a record separator.");
assert.equal(csvJoin[2], "\\n", "CSV records must use a real newline separator.");
const sampleCsv = ["id,name", "1,Ada"].join(csvJoin[2] === "\\n" ? "\n" : csvJoin[2]);
assert.equal(sampleCsv, "id,name\n1,Ada", "CSV export must produce separate spreadsheet rows.");

console.log("Experiment report inline JavaScript syntax and verification disclosure checks passed.");
