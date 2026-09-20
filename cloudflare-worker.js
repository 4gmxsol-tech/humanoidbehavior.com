const VERSION = "cloudflare-d1-bootstrap-1";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      let d1 = { bound: Boolean(env.DB), reachable: false };

      if (env.DB) {
        try {
          await env.DB.prepare("SELECT 1 AS ok").first();
          d1.reachable = true;
        } catch (error) {
          d1.error = String(error?.message || error);
        }
      }

      return json({
        ok: true,
        service: "humanoidbehavior-api",
        version: VERSION,
        storage: d1.reachable ? "cloudflare-d1" : "not-connected",
        d1,
        capabilities: ["cloudflare-workers", "d1-bootstrap"]
      });
    }

    if (url.pathname === "/api/readiness") {
      const d1Ready = Boolean(env.DB);
      return json({
        ok: d1Ready,
        ready: d1Ready,
        checks: {
          worker: true,
          databaseConfigured: d1Ready,
          database: d1Ready ? "cloudflare-d1" : "not-connected"
        }
      }, d1Ready ? 200 : 503);
    }

    if (url.pathname === "/") {
      return json({
        service: "HumanoidBehavior API",
        status: "online",
        next: "D1 binding and API migration"
      });
    }

    return json({ error: "Not found" }, 404);
  }
};
