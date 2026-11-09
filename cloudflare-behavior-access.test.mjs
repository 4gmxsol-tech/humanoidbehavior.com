import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canReadBehavior } from "./cloudflare-behavior-access.mjs";

const owner = "owner-a";
const other = "owner-b";
const row = (user_id, visibility, status) => ({ id: "custom", version: "1.0.0", user_id, visibility, status });

assert.equal(canReadBehavior(row("system", "public", "published"), null), true,
  "anonymous readers can read public published behavior");
assert.equal(canReadBehavior(row("system", "public", "published"), other), true,
  "authenticated non-owners can read public published behavior");
assert.equal(canReadBehavior(row(owner, "private", "draft"), owner), true,
  "owners can read their private drafts");
assert.equal(canReadBehavior(row(owner, "private", "published"), owner), true,
  "owners can read their private published versions");
assert.equal(canReadBehavior(row(owner, "public", "draft"), owner), true,
  "owners can read their own public drafts");
assert.equal(canReadBehavior(row(owner, "private", "draft"), other), false,
  "other users cannot read private drafts");
assert.equal(canReadBehavior(row(owner, "private", "published"), other), false,
  "other users cannot read private published versions");
assert.equal(canReadBehavior(row(owner, "public", "draft"), other), false,
  "other users cannot read unpublished public drafts");
assert.equal(canReadBehavior(row(owner, "archived", "published"), owner), false,
  "unknown visibility values fail closed");
assert.equal(canReadBehavior(row(owner, "private", "archived"), owner), false,
  "unknown status values fail closed");
assert.equal(canReadBehavior(null, owner), false, "missing behavior is denied");
assert.equal(canReadBehavior(row(owner, "private", "draft"), ""), false,
  "an empty identity cannot claim ownership");

const source = readFileSync(new URL("./cloudflare-worker.js", import.meta.url), "utf8");
assert.ok(source.includes('import { canReadBehavior } from "./cloudflare-behavior-access.mjs";'),
  "Cloudflare Worker must use the tested access policy");

const versionsStart = source.indexOf("const versionMatch = path.match");
const singleStart = source.indexOf("const behaviorMatch = path.match", versionsStart);
const versionsRoute = source.slice(versionsStart, singleStart);
assert.ok(versionsRoute.includes("canReadBehavior(row,user?.id)"),
  "behavior version listing must filter private rows to their owner");
assert.ok(versionsRoute.includes("(visibility='public' AND status='published') OR user_id=?"),
  "behavior version listing query must include public published rows or the current owner's rows");

const signupStart = source.indexOf('if (path === "/api/auth/signup"');
const singleRoute = source.slice(singleStart, signupStart);
assert.ok(singleRoute.includes("canReadBehavior(row,user?.id)"),
  "single behavior reads must authorize the owner before returning a row");

const runStart = source.indexOf('if (path === "/api/experiments/run" && request.method === "POST")');
const browserStart = source.indexOf("const browserMatch", runStart);
const runRoute = source.slice(runStart, browserStart);
const accessCheck = runRoute.indexOf("canReadBehavior(behaviorRow,user.id)");
const queueWrite = runRoute.indexOf("INSERT INTO experiments");
assert.ok(accessCheck >= 0 && queueWrite > accessCheck,
  "experiment route must authorize the selected behavior before queueing work");
assert.ok(runRoute.includes("const spec=cleanBehavior(behaviorRow)"),
  "evaluation must use the authorized D1 behavior package, not only the static catalogue");
assert.ok(!runRoute.includes("behaviorSpec("),
  "evaluation route must not bypass D1 owner/public access policy");

console.log("Cloudflare behavior access tests passed (12 policy cases + route wiring guards).");
