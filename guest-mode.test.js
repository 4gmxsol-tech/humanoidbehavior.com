"use strict";
// Guest-mode regression: one no-account MuJoCo run in the Experiment Lab,
// real measured sample values on the demo page, no decorative lamp on the
// homepage, and honest on-request pricing. Run with:
//   node guest-mode.test.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// --- 1. Guest mode in simulation.html -------------------------------------
const simulation = read("simulation.html");

// The guest path runs browser MuJoCo and labels the result; it must never
// create a server experiment or save anything.
assert.match(simulation, /Guest run — not saved/, "Guest results must carry the not-saved label");
assert.match(simulation, /async function runGuestEvaluation/, "Guest runner must exist");
assert.match(simulation, /if\(!token\)\{return runGuestEvaluation\(\)\}/, "Unauthenticated runs must take the guest path");
const guestFn = simulation.slice(
  simulation.indexOf("async function runGuestEvaluation"),
  simulation.indexOf("async function runEvaluation")
);
assert.ok(!guestFn.includes("/api/experiments/run"), "Guest path must not create a server experiment");
assert.ok(!guestFn.includes("/api/experiments/"), "Guest path must not call the experiment API at all");
assert.ok(!guestFn.includes("fetch("), "Guest path must not call any API endpoint");
assert.ok(guestFn.includes("runBrowserCompute"), "Guest path must run the real browser MuJoCo compute");
assert.ok(guestFn.includes("initLiveSimulation"), "Guest path must show the measured replay");

// Fixed guest defaults: Pick & Place, MuJoCo, default seeds/policy.
assert.match(simulation, /behaviorId:"pick-place",behaviorVersion:"1\.1\.0",seeds:\["42","1337","2026","7","99"\],policies:\["policy-a"\],seconds:5/,
  "Guest runs must use the fixed default configuration");
// One guest run per browser session; further runs ask the visitor to sign in.
assert.match(simulation, /hb_guest_run_used/, "Guest usage must be tracked per browser session");
assert.match(simulation, /Guest run used — sign in for more/, "A used guest run must point at sign-in");

// Signed-in flow is unchanged: it still requires a token and saves via the API.
assert.match(simulation, /\/api\/experiments\/run/, "Signed-in runs must still create a server experiment");
assert.match(simulation, /Authorization:"Bearer "\+token/, "Signed-in runs must still authenticate");

// --- 2. No unauthenticated write path in the Worker ------------------------
const worker = read("cloudflare-worker.js");
const runBlock = worker.slice(worker.indexOf('"/api/experiments/run"'), worker.indexOf('"/api/experiments/run"') + 600);
assert.match(runBlock, /requireUser\(request,\s*env\)/, "Experiment creation must still require authentication");
assert.match(runBlock, /Authentication required/, "Experiment creation must still reject guests");
const resultBlock = worker.slice(worker.indexOf("const browserMatch"), worker.indexOf("const browserMatch") + 600);
assert.match(resultBlock, /requireUser\(request,\s*env\)/, "Saving a browser result must still require authentication");

// --- 3. Homepage: lamp gone, first-benchmark CTA goes to the guest lab -----
const index = read("index.html");
assert.doesNotMatch(index, /A little light on the work/, "Decorative lamp section must be gone");
assert.doesNotMatch(index, /hb-lamp-scene/, "Lamp scene markup must be gone");
assert.doesNotMatch(index, /INTERACTIVE ENVIRONMENT/, "Lamp section heading must be gone");
assert.doesNotMatch(index, /hb-lamp-animation\.css/, "Lamp-only stylesheet must not load");
assert.ok(index.includes('<a class="button primary" href="simulation.html">Run your first benchmark'),
  "Run your first benchmark must open the Experiment Lab directly");
assert.match(index, /One guest run, no sign-in/, "Homepage must disclose the no-sign-in guest run");
// The lamp script include is intentionally kept: it no-ops without a scene
// and the homepage script-loading regression test requires it exactly once.
assert.equal(index.split('<script src="hb-lamp-animation.js" defer></script>').length - 1, 1,
  "Lamp script include must remain exactly once (no-op without a scene)");
assert.ok(fs.existsSync(path.join(root, "hb-lamp-animation.js")), "Lamp script file must stay in the repo");
assert.ok(fs.existsSync(path.join(root, "hb-lamp-animation.css")), "Lamp stylesheet file must stay in the repo");

// --- 4. Demo: real measured sample, no illustrative values -----------------
const demo = read("demo.html");
const artifact = JSON.parse(read("data/latest-mujoco-experiment.json"));
assert.equal(artifact.benchmark, "humanoid-stand-v1", "Sample artifact must be humanoid-stand-v1");
assert.equal(artifact.runCount, 10, "Sample artifact must record 10 measured runs");
for (const [policy, key] of [["policy-a-stabilizer", "policy-a-stabilizer"], ["policy-b-stabilizer", "policy-b-stabilizer"]]) {
  const summary = artifact.summary[key];
  for (const value of [
    String(summary.survival_rate.mean),
    String(summary.simulated_seconds.mean),
    String(summary.control_cost.mean),
  ]) {
    assert.ok(demo.includes(value), `Demo must show the measured ${policy} value ${value}`);
  }
}
assert.match(demo, /MEASURED SAMPLE · HUMANOID-STAND-V1/, "Demo result card must name the measured sample");
assert.match(demo, /10 measured MuJoCo runs — 5 seeds × 2 policies/, "Demo must state the real sample size");
assert.match(demo, /fall rate 1\.0/, "Demo must honestly report that both policies fell in every run");
assert.ok(demo.includes('href="data/latest-mujoco-experiment.json"'), "Demo must link the raw experiment artifact");
assert.ok(demo.includes('href="evidence.html"'), "Demo must link the evidence room");
assert.doesNotMatch(demo, /--w:86%/, "Illustrative success bar must be gone");
assert.doesNotMatch(demo, /--w:74%/, "Illustrative stability bar must be gone");
assert.doesNotMatch(demo, /illustrative UI fields/, "Illustrative-values disclaimer must be gone");
// The replay illustration stays honestly labelled (separate regression test).
assert.match(demo, /ILLUSTRATIVE SCENE · NOT A RECORDED RUN/, "Replay illustration must stay labelled");

// --- 5. Pricing: Pro/Team available on request, no live checkout -----------
const pricing = read("pricing.html");
assert.match(pricing, /AVAILABLE ON REQUEST/, "Pro/Team must be labelled available on request");
assert.match(pricing, /No live checkout; no payment is taken on this site/, "Pricing must state there is no live payment");
assert.match(pricing, /selecting Pro or Team does not start a paid subscription/i,
  "Pricing must keep the no-subscription disclosure");
assert.ok(pricing.includes('href="login.html?plan=pro">Create free workspace</a>'), "Pro CTA must stay a free-workspace signup");
assert.ok(pricing.includes('href="login.html?plan=team">Create free workspace</a>'), "Team CTA must stay a free-workspace signup");

// --- 6. Sale docs: guest mode, exclusive scope vs MIT code, Stripe ---------
for (const file of ["README.md", "BUYER_HANDOFF.md", "SALE_PACKAGE.md", "TRANSFER_CHECKLIST.md"]) {
  const doc = read(file);
  assert.match(doc, /guest/i, `${file} must document guest mode`);
}
assert.match(read("README.md"), /no unauthenticated endpoint/i, "README must explain why the Worker needs no guest endpoint");
assert.match(read("BUYER_HANDOFF.md"), /Included exclusively in a sale/,
  "Buyer handoff must split exclusive sale assets from MIT-licensed code");
assert.match(read("BUYER_HANDOFF.md"), /create their own Stripe seller account/,
  "Buyer handoff must state Stripe needs the buyer's own seller account");
assert.match(read("SALE_PACKAGE.md"), /Included exclusively in a sale/,
  "Sale package must split exclusive sale assets from MIT-licensed code");
assert.match(read("TRANSFER_CHECKLIST.md"), /no Stripe account or keys are included in the sale/,
  "Transfer checklist must exclude Stripe accounts/keys from the sale");

console.log("Guest-mode regression: PASS");
