const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const pricing = fs.readFileSync(path.join(root, "pricing.html"), "utf8");
const login = fs.readFileSync(path.join(root, "login.html"), "utf8");

for (const plan of ["pro", "team"]) {
  assert.ok(
    pricing.includes('href="login.html?plan=' + plan + '">Create free workspace</a>'),
    plan + " CTA must lead to a free workspace without claiming a waitlist"
  );
}
assert.doesNotMatch(pricing, /Join (?:Pro|Team) waitlist/i, "Pricing must not promise a waitlist that has no submission endpoint");
assert.match(pricing, /selecting Pro or Team does not start a paid subscription/i, "Pricing must disclose that paid billing is not active");

assert.ok(login.includes('id="planNotice" class="auth-status" role="status" aria-live="polite" hidden'), "Login must provide an accessible plan-intent notice");
assert.ok(login.includes('new URLSearchParams(window.location.search).get("plan")'), "Login must read the selected plan from the query string");
assert.ok(login.includes('const planLabels={pro:"Pro",team:"Team"}'), "Only known Pro and Team plans should receive labels");
assert.match(login, /not available for paid checkout yet/i, "The selected plan must be described honestly");
assert.match(login, /no payment or subscription will start/i, "The notice must explicitly rule out an unintended charge");

console.log("PASS: Pro and Team CTAs explain free signup and do not imply a live paid waitlist.");
