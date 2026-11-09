export function canReadBehavior(row, userId) {
  if (!row || typeof row !== "object") return false;

  const publicPublished = row.visibility === "public" && row.status === "published";
  const owner = typeof userId === "string"
    && userId.length > 0
    && row.user_id === userId
    && ["private", "public"].includes(row.visibility)
    && ["draft", "published"].includes(row.status);

  return publicPublished || owner;
}
