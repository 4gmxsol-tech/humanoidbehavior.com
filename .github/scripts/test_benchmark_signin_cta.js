const fs = require("node:fs");
const assert = require("node:assert/strict");

const benchmark = fs.readFileSync("benchmark.html", "utf8");
const login = fs.readFileSync("login.html", "utf8");

assert.match(
  benchmark,
  /<p id="message" class="lead" role="status" aria-live="polite"><\/p>/,
  "Benchmark feedback must be announced through a polite status region."
);
assert.match(
  benchmark,
  /function showSignInPrompt\(\)\s*\{[\s\S]*?message\.textContent = "Sign in to run a measured benchmark\. ";[\s\S]*?link\.href = "login\.html";[\s\S]*?link\.textContent = "Sign in or create a free workspace";[\s\S]*?message\.append\(link\);[\s\S]*?\}/,
  "Unauthenticated visitors must receive a keyboard-accessible link to sign in or create a free workspace."
);
assert.match(
  benchmark,
  /if\(!token\)\s*\{\s*showSignInPrompt\(\);\s*return\s*\}/,
  "The unauthenticated Run benchmark path must use the sign-in prompt."
);
assert.match(
  login,
  /<button id="signup" type="button" class="button secondary">Create free account<\/button>/,
  "The sign-in destination must expose the free-account path."
);

const staticCta = '<p class="benchmark-signup-cta"><a class="button primary" href="login.html">Sign in or create a free workspace</a></p>';
assert.ok(
  benchmark.includes(staticCta),
  "The benchmark page must show a visible free-workspace CTA before visitors interact with Run benchmark."
);
assert.ok(
  benchmark.indexOf(staticCta) < benchmark.indexOf('<section class="builder-result">'),
  "The free-workspace CTA must appear before the benchmark controls."
);


const plans = JSON.parse(fs.readFileSync("data/plans.json", "utf8"));
const freePlan = plans.find((plan) => plan.id === "free");
assert.ok(freePlan, "A published free plan must exist.");
const freeNoteStart = benchmark.indexOf('<p class="benchmark-free-note muted">');
const freeNoteEnd = benchmark.indexOf("</p>", freeNoteStart);
assert.ok(freeNoteStart >= 0 && freeNoteEnd > freeNoteStart, "Benchmark visitors must see the free-workspace limits before using the builder.");
const freeNote = benchmark.slice(freeNoteStart, freeNoteEnd + 4);
assert.ok(
  freeNote.includes(freePlan.limits.benchmarksPerMonth + " benchmark runs per month"),
  "Benchmark free-tier run allowance must match data/plans.json."
);
assert.ok(
  freeNote.includes(freePlan.limits.privateBehaviors + " private behaviors"),
  "Benchmark free-tier private-behavior allowance must match data/plans.json."
);
assert.ok(freeNote.includes('href="pricing.html"'), "The free-tier note must link to full plan limits.");
assert.ok(freeNote.includes("Paid plans are being prepared for secure checkout"));
assert.ok(freeNote.includes("selecting Pro or Team does not start a paid subscription"));
assert.ok(
  freeNoteStart > benchmark.indexOf(staticCta)
    && freeNoteStart < benchmark.indexOf('<section class="builder-result">'),
  "Free-tier details must appear after the signup CTA and before the benchmark controls."
);

console.log("Benchmark unauthenticated sign-in CTA regression: PASS");
