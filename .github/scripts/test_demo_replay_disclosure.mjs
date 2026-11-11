import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("demo.html", "utf8");
const replayStart = html.indexOf('<div class="replay-window"');
const replayEnd = html.indexOf('<div class="demo-list">', replayStart);
assert(replayStart >= 0 && replayEnd > replayStart, "Replay preview section must exist");
const replay = html.slice(replayStart, replayEnd);

assert.match(replay, /role="group"/, "Illustrative scene must expose an image role");
assert.match(replay, /aria-label="Illustrative MuJoCo scene diagram, not a recorded replay"/, "Accessible label must disclose that the scene is illustrative");
assert.match(replay, /ILLUSTRATIVE SCENE · NOT A RECORDED RUN/, "Visible caption must disclose the scene is not a recorded run");
assert.match(replay, /Illustrative scene diagram only\./, "Visible explanatory note must be present");
assert.doesNotMatch(replay, /<button\b/i, "Static illustration must not expose non-functional playback buttons");
assert.match(html, /href="simulation\.html"/, "The real Experiment Lab route must remain available");
assert.match(html, /not a recorded or interactive replay/i, "Section copy must distinguish the illustration from real replay");

const sitemap = readFileSync("sitemap.xml", "utf8");
const demoEntry = sitemap.split("\\n").find((line) => line.includes("<loc>https://humanoidbehavior.com/demo.html</loc>"));
assert(demoEntry, "Demo page must remain in the sitemap");
assert.match(demoEntry, /<lastmod>2026-11-11<\\/lastmod>/, "Demo sitemap lastmod must match the latest content update");

console.log("Demo replay disclosure and non-interactive preview checks passed.");
