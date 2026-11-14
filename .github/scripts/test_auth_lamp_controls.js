const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("login.html", "utf8");
const scene = fs.readFileSync("hb-auth-scene.js", "utf8");
const css = fs.readFileSync("hb-auth-scene.css", "utf8");

assert.ok(html.includes('<script src="hb-auth-scene.js" defer></script>'),
  "login page must load the interactive lamp controller");
assert.ok(html.includes('class="auth-lamp scene-lamp" role="group" tabindex="0"'),
  "lamp must remain keyboard-focusable and exposed as a group");
assert.ok(html.includes('aria-keyshortcuts="ArrowDown ArrowUp Enter Space"'),
  "lamp keyboard shortcuts must be disclosed");

assert.ok(scene.includes('lamp.addEventListener("pointerdown"'),
  "lamp must support pointer/touch start");
assert.ok(scene.includes('lamp.addEventListener("pointermove"'),
  "lamp must track drag movement");
assert.ok(scene.includes('lamp.addEventListener("pointerup"'),
  "lamp must apply drag state on release");
assert.ok(scene.includes('lamp.style.setProperty("translate","0 "+delta*.18+"px");'),
  "drag feedback must use the independent translate property");
assert.ok(scene.includes('lamp.style.removeProperty("translate");'),
  "drag feedback must be cleared without replacing responsive transform");
assert.equal(scene.includes("lamp.style.transform"), false,
  "drag must not overwrite the CSS transform used for mobile scaling");
assert.ok(scene.includes('e.key==="ArrowDown"'), "Arrow Down must switch the lamp off");
assert.ok(scene.includes('e.key==="ArrowUp"'), "Arrow Up must switch the lamp on");
assert.ok(scene.includes('e.key===" "||e.key==="Enter"'),
  "Enter and Space must cycle lamp color");

assert.ok(css.includes("transform:scale(.57)"),
  "mobile layout must retain its responsive lamp scale");
assert.ok(css.includes(".scene-lamp:focus-visible"),
  "keyboard focus must remain visibly indicated");

console.log("Responsive and keyboard-accessible auth lamp regression passed.");
