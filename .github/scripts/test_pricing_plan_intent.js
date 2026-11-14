const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
assert.match(pricing, /Monthly plans with clearly stated included limits/i, "Pricing must describe the fixed monthly tiers and their included limits accurately");
assert.doesNotMatch(pricing, /Usage-based plans/i, "Pricing must not imply variable metered billing when the displayed tiers are fixed monthly prices");
const checkoutNoteIndex = pricing.indexOf('class="pricing-status-note"');
const pricingGridIndex = pricing.indexOf('<div class="pricing-grid">');
assert.ok(checkoutNoteIndex >= 0 && checkoutNoteIndex < pricingGridIndex, "Paid-checkout status must be visible before users compare plan cards");
assert.match(pricing, /class="pricing-status-note" role="note"/, "Checkout status must be exposed as a semantic note");
assert.match(pricing, /selecting Pro or Team does not start a paid subscription/i, "Pricing must disclose that paid billing is not active");
const teamContactIndex = pricing.indexOf('class="pricing-contact-note"');
assert.ok(teamContactIndex > checkoutNoteIndex && teamContactIndex < pricingGridIndex, "Team consultation contact path must appear after checkout status and before plan cards");
assert.match(pricing, /Need to discuss a Team workflow, technical fit, or integration/i, "Pricing must offer a clear consultation path while paid checkout is unavailable");
assert.match(pricing, /<a href="contact\\.html">Contact us<\\/a>/, "Team consultation CTA must lead to the existing contact page");
assert.match(pricing, /This link does not start a payment or subscription/i, "The consultation CTA must not imply an active paid checkout");

assert.match(login, /id="planNotice"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/i, "Login must provide an accessible plan-intent notice");
assert.ok(login.includes('new URLSearchParams(window.location.search).get("plan")'), "Login must read the selected plan from the query string");
assert.ok(login.includes('const planLabels={pro:"Pro",team:"Team"}'), "Only known Pro and Team plans should receive labels");
assert.match(login, /not available for paid checkout yet/i, "The selected plan must be described honestly");
assert.match(login, /no payment or subscription will start/i, "The notice must explicitly rule out an unintended charge");

const inlineScript = [...login.matchAll(/<script>([\s\S]*?)<\/script>/gi)].at(-1)?.[1];
assert.ok(inlineScript, "Login page inline script must be present");
new vm.Script(inlineScript, { filename: "login-inline.js" });

const noticeCode = login.match(/\/\* PRICING_PLAN_NOTICE_START \*\/([\s\S]*?)\/\* PRICING_PLAN_NOTICE_END \*\//)?.[1];
assert.ok(noticeCode, "Plan notice logic must remain isolated for regression testing");
for (const [plan, label] of [["pro", "Pro"], ["team", "Team"]]) {
  const notice = { hidden: true, textContent: "" };
  vm.runInNewContext(noticeCode, {
    document: { getElementById: () => notice },
    window: { location: { search: "?plan=" + plan } },
    URLSearchParams
  });
  assert.equal(notice.hidden, false, label + " intent should display the notice");
  assert.match(notice.textContent, new RegExp(label + " is not available for paid checkout yet"));
  assert.match(notice.textContent, /no payment or subscription will start/);
}
const unknownNotice = { hidden: true, textContent: "" };
vm.runInNewContext(noticeCode, {
  document: { getElementById: () => unknownNotice },
  window: { location: { search: "?plan=enterprise" } },
  URLSearchParams
});
assert.equal(unknownNotice.hidden, true, "Unknown plan values must not create a plan notice");

console.log("PASS: Pro and Team CTAs explain free signup; login intent is accessible, truthful, and does not imply live billing.");
