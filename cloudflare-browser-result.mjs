export function validateBrowserResult(queued, submitted) {
  const fail = error => ({ ok: false, error });
  if (!queued || !submitted || typeof submitted !== "object") return fail("Invalid browser evaluation result");

  const request = queued.request || {};
  const expected = Number(request.expectedRunCount);
  const seeds = Array.isArray(request.seeds) ? request.seeds.map(String) : [];
  const policies = Array.isArray(request.policies) ? request.policies.map(String) : [];

  if (queued.engine !== "MuJoCo" || submitted.engine !== queued.engine) return fail("Browser result engine does not match the queued experiment");
  if (submitted.behaviorId !== queued.behaviorId || submitted.behaviorVersion !== queued.behaviorVersion) return fail("Browser result behavior does not match the queued experiment");
  if (!Number.isInteger(expected) || expected < 1 || expected > 20 || !seeds.length || !policies.length || seeds.length * policies.length !== expected) {
    return fail("Queued experiment run matrix is invalid");
  }
  if (submitted.status !== "completed" || submitted.measured !== true || submitted.reproducible !== true) {
    return fail("Browser result must be completed, measured and reproducible");
  }
  if (!Array.isArray(submitted.rawResults) || submitted.rawResults.length !== expected) {
    return fail("Browser result must contain exactly the requested number of runs");
  }
  if (Number(submitted.runCount) !== expected || Number(submitted.expectedRunCount) !== expected) {
    return fail("Browser result run counts do not match the queued experiment");
  }

  const expectedPairs = new Set(seeds.flatMap(seed => policies.map(policy => JSON.stringify([seed, policy]))));
  const seenPairs = new Set();
  for (const row of submitted.rawResults) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return fail("Browser result contains an invalid run row");
    const seed = String(row.seed ?? "");
    const policy = String(row.policy ?? "");
    if (!seeds.includes(seed) || !policies.includes(policy)) return fail("Browser result contains an unrequested seed or policy");
    if (row.behaviorId !== queued.behaviorId || row.engine !== queued.engine || row.measured !== true) {
      return fail("Browser result run metadata does not match the queued experiment");
    }
    if (row.behaviorVersion != null && row.behaviorVersion !== queued.behaviorVersion) {
      return fail("Browser result run version does not match the queued experiment");
    }
    if (!row.metrics || typeof row.metrics !== "object" || Array.isArray(row.metrics) ||
        typeof row.metrics.taskSuccess !== "boolean" ||
        !Number.isFinite(Number(row.metrics.simulatedSeconds)) || Number(row.metrics.simulatedSeconds) <= 0) {
      return fail("Browser result contains incomplete run metrics");
    }
    const pair = JSON.stringify([seed, policy]);
    if (seenPairs.has(pair)) return fail("Browser result contains a duplicate seed/policy run");
    seenPairs.add(pair);
  }
  if (seenPairs.size !== expectedPairs.size) return fail("Browser result is missing a requested seed/policy run");
  return { ok: true, error: null };
}
