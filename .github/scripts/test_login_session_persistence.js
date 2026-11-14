const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("login.html", "utf8");
const start = html.indexOf("async function finishAuth(data){");
assert.notEqual(start, -1, "finishAuth must exist");

const end = html.indexOf("\n}", start);
assert.notEqual(end, -1, "finishAuth must have a closing brace");
const body = html.slice(start, end);

const verify = body.indexOf('const me=await requestJson("/api/me"');
const valid = body.indexOf('if(!me?.user)throw Error("Session verification failed.");');
const tokenStore = body.indexOf('localStorage.setItem("hb_token",data.token)');
const userStore = body.indexOf('localStorage.setItem("hb_user",JSON.stringify(me.user))');
const redirect = body.indexOf('window.location.assign("dashboard.html")');

assert.ok(verify >= 0, "session must be checked with /api/me");
assert.ok(valid > verify, "the verified user response must be checked before persistence");
assert.ok(tokenStore > valid, "the token must not be persisted before session verification");
assert.ok(userStore > valid, "only the verified /api/me user must be persisted");
assert.ok(redirect > userStore, "navigation must happen after verified session persistence");
assert.equal(body.includes('localStorage.setItem("hb_user",JSON.stringify(data.user))'), false,
  "unverified user data from the login response must not be persisted");

console.log("Login session persistence regression passed.");
