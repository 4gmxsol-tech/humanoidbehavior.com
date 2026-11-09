import assert from "node:assert/strict";
import { canReadBehavior } from "../../cloudflare-behavior-access.mjs";

const publicPublished = {
  id: "public-1",
  user_id: "owner-a",
  visibility: "public",
  status: "published"
};
const publicDraft = {
  id: "public-draft",
  user_id: "owner-a",
  visibility: "public",
  status: "draft"
};
const privatePublished = {
  id: "private-1",
  user_id: "owner-a",
  visibility: "private",
  status: "published"
};
const privateDraft = {
  id: "private-draft",
  user_id: "owner-a",
  visibility: "private",
  status: "draft"
};

const cases = [
  ["public published behavior is readable without a session", publicPublished, undefined, true],
  ["public published behavior is readable by another user", publicPublished, "owner-b", true],
  ["public draft is not readable anonymously", publicDraft, undefined, false],
  ["public draft is readable by its owner", publicDraft, "owner-a", true],
  ["private published behavior is not readable anonymously", privatePublished, undefined, false],
  ["private published behavior is readable by its owner", privatePublished, "owner-a", true],
  ["private published behavior is not readable by another user", privatePublished, "owner-b", false],
  ["private draft is readable by its owner", privateDraft, "owner-a", true],
  ["private draft is not readable by another user", privateDraft, "owner-b", false],
  ["missing behavior is never readable", null, "owner-a", false],
  ["unsupported visibility is denied even to the owner", { ...privateDraft, visibility: "unlisted" }, "owner-a", false],
  ["unsupported status is denied even to the owner", { ...privateDraft, status: "archived" }, "owner-a", false],
  ["empty owner identifiers do not grant access", { ...privateDraft, user_id: "" }, "", false]
];

for (const [label, row, userId, expected] of cases) {
  assert.equal(canReadBehavior(row, userId), expected, label);
}

console.log(`Cloudflare behavior access tests passed (${cases.length} cases).`);
