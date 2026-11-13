import assert from "node:assert/strict";
import fs from "node:fs";

const behaviorSource = fs.readFileSync("app.js", "utf8");
const reportSource = fs.readFileSync("experiment.html", "utf8");

assert.ok(
  !behaviorSource.includes("verified Experiment Lab executions"),
  "Behavior detail must not imply that browser results are independently verified."
);
assert.ok(
  behaviorSource.includes("Browser-computed MuJoCo results are checked against the queued behavior, version, seed/policy matrix and run count"),
  "Behavior detail must describe the actual browser-result validation scope."
);
assert.ok(
  reportSource.includes("<b>Client-reported reproducibility</b>"),
  "Experiment reports must label browser-provided reproducibility as a client-reported claim."
);
assert.ok(
  !reportSource.includes("<b>Reproducible</b>"),
  "Experiment reports must not present the client-provided flag as independently verified reproducibility."
);
assert.ok(
  reportSource.includes("<b>Client-reported reproducibility:</b>"),
  "Comparison reports must label the browser-provided reproducibility flag as a client-reported claim."
);
assert.ok(
  !reportSource.includes('<b>Reproducibility:</b> \' + (r.reproducible?"verified":"—")'),
  "Comparison reports must not describe a client-provided flag as verified."
);

assert.ok(
  reportSource.includes('const verificationNote=prov.worker==="browser-mujoco-wasm"'),
  "Experiment reports must identify browser-computed runs."
);
assert.ok(
  reportSource.includes("does not independently rerun or cryptographically attest the simulation"),
  "Experiment reports must disclose the absence of independent server recomputation or attestation."
);
assert.ok(
  reportSource.includes("Verification scope is not recorded for this result."),
  "Legacy reports without a known verification source must not be presented as verified."
);
assert.ok(
  reportSource.includes('esc(verificationNote)'),
  "The verification disclosure must be HTML-escaped before rendering."
);

console.log("Benchmark verification-scope disclosure checks passed.");
