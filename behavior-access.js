function isPublicPublished(behavior) {
  return Boolean(behavior && behavior.visibility === "public" && behavior.status === "published");
}

function canReadBehavior(behavior, requester) {
  if (!behavior) return false;
  if (isPublicPublished(behavior)) return true;
  return Boolean(requester && behavior.userId && behavior.userId === requester.id);
}

module.exports = { isPublicPublished, canReadBehavior };
