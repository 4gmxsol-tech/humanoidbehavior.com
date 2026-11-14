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

const csvCellMatch = html.match(/function csvCell\(value\)\s*\{[\s\S]*?\n\}/);
assert.ok(csvCellMatch, "CSV export must use a dedicated cell serializer.");
const csvCell = vm.runInNewContext("(" + csvCellMatch[0] + ")");
assert.equal(csvCell("Ada, \"A\""), "\"Ada, \"\"A\"\"\"", "CSV fields with commas and quotes must be escaped using doubled quotes.");
assert.equal(csvCell("line one\nline two"), "\"line one\nline two\"", "CSV fields containing line breaks must be quoted.");
assert.equal(csvCell(42), "42", "Numeric CSV values must remain readable.");
assert.equal(csvCell(-42), "-42", "Negative numeric values must remain numeric.");
assert.equal(csvCell("=1+1"), "'=1+1", "Formula-leading strings must be neutralized for spreadsheet exports.");
assert.equal(csvCell("  +1+1"), "'  +1+1", "Formula markers after leading whitespace must be neutralized.");
assert.equal(csvCell("@SUM(A1:A2)"), "'@SUM(A1:A2)", "At-sign formula markers must be neutralized.");
assert.equal(csvCell("=1+1, label"), "\"'=1+1, label\"", "Formula neutralization must remain compatible with CSV quoting.");
assert.equal(csvCell(null), "", "Null CSV values must export as empty cells.");
assert.ok(html.includes('keys.map(csvCell).join(",")'), "CSV header cells must use the serializer.");
assert.ok(html.includes('keys.map(k=>csvCell(v[k])).join(",")'), "CSV data cells must use the serializer.");
assert.ok(html.includes('.join("\\r\\n")'), "CSV records must use CRLF separators.");
const sampleCsv = [csvCell("id"), csvCell("value")].join(",") + "\r\n" + [csvCell("1"), csvCell("Ada, \"A\"")].join(",");
assert.equal(sampleCsv, "id,value\r\n1,\"Ada, \"\"A\"\"\"", "CSV export must produce valid separate spreadsheet rows.");

console.log("Experiment report inline JavaScript syntax and verification disclosure checks passed.");
