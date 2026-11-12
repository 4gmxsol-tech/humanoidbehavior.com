const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const fixedCommunityOverlay = /<a\\b(?=[^>]*href="https:\\/\\/discord\\.gg\\/ewUr2dmt")(?=[^>]*style="[^"]*position:\\s*fixed)[^>]*>[\\s\\S]*?<\\/a>/i;
assert(!fixedCommunityOverlay.test(html), "The unrelated fixed community overlay must not cover product content.");
assert(!/aria-label="Join the Domainzax Discord community"/i.test(html), "The floating Domainzax overlay label must be removed.");

const footerStart = html.indexOf('<div class="footer-links">');
const footerEnd = html.indexOf('<div class="footer-bottom">', footerStart);
assert(footerStart >= 0 && footerEnd > footerStart, "The site footer links section must exist.");
const footer = html.slice(footerStart, footerEnd);
assert(/href="https:\\/\\/discord\\.gg\\/ewUr2dmt" target="_blank" rel="noopener noreferrer">Domainzax community/.test(footer), "The community destination must remain available as a normal footer link.");

for (const [href, label] of [
  ['href="login.html"', "Run your first benchmark"],
  ['href="behaviors.html"', "Explore behavior library"],
  ['href="pricing.html"', "View plans"],
  ['href="contact.html"', "Contact"]
]) {
  assert(html.includes(href), "Primary conversion path is missing: " + label);
}
console.log("Homepage conversion focus and community-link placement: PASS");
