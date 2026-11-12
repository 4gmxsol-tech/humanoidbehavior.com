const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const communityLinks = [...html.matchAll(/<a\b[^>]*href="https:\/\/discord\.gg\/ewUr2dmt"[^>]*>[\s\S]*?<\/a>/gi)].map(match => match[0]);
assert(communityLinks.length === 1, "The Domainzax community destination must appear exactly once.");
assert(!/position\s*:\s*fixed/i.test(communityLinks[0]), "The community link must not be a fixed overlay.");
assert(!/aria-label="Join the Domainzax Discord community"/i.test(html), "The floating overlay label must be removed.");

const footerStart = html.indexOf('<div class="footer-links">');
const footerEnd = html.indexOf('<div class="footer-bottom">', footerStart);
assert(footerStart >= 0 && footerEnd > footerStart, "The site footer links section must exist.");
const footer = html.slice(footerStart, footerEnd);
assert(footer.includes(communityLinks[0]), "The community destination must remain available in the normal footer.");

for (const [href, label] of [
  ['href="login.html"', "Run your first benchmark"],
  ['href="behaviors.html"', "Explore behavior library"],
  ['href="pricing.html"', "View plans"],
  ['href="contact.html"', "Contact"]
]) {
  assert(html.includes(href), "Primary conversion path is missing: " + label);
}
assert(/target="_blank" rel="noopener noreferrer"/.test(communityLinks[0]), "The external community link must retain safe new-tab attributes.");
console.log("Homepage conversion focus and community-link placement: PASS");
