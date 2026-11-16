import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
const orderedScripts = [
  "api-base.js",
  "product-ui.js",
  "site-settings.js",
  "hb-platform-pro.js",
  "hb-lamp-animation.js",
];

const positions = orderedScripts.map((src) => {
  const tag = `<script src="${src}" defer></script>`;
  assert.equal(html.split(tag).length - 1, 1, `${src} must be loaded exactly once with defer`);
  return html.indexOf(tag);
});

assert.deepEqual(
  positions,
  [...positions].sort((a, b) => a - b),
  "API bootstrap must remain before the deferred scripts that depend on it",
);
assert.ok(
  !html.includes('<script src="api-base.js"></script>'),
  "API bootstrap must not block HTML parsing",
);
assert.ok(
  html.includes('document.addEventListener("DOMContentLoaded",async()=>{const el=document.getElementById("platform-status");'),
  "The health check must wait until deferred API bootstrap scripts have executed",
);
console.log("PASS: homepage API bootstrap is deferred, dependency order is preserved, and the health check waits for DOMContentLoaded.");
