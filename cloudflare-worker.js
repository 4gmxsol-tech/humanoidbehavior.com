const VERSION = "cloudflare-d1-api-3";
const ALLOWED_ORIGIN = "https://humanoidbehavior.com";
const encoder = new TextEncoder();

const PLANS = {
  free: { id: "free", name: "Free", price: 0, currency: "USD", limits: { benchmarksPerMonth: 25, privateBehaviors: 5, apiKeys: 0 } },
  pro: { id: "pro", name: "Pro", price: 49, currency: "USD", limits: { benchmarksPerMonth: 500, privateBehaviors: -1, apiKeys: 3 } },
  team: { id: "team", name: "Team", price: 299, currency: "USD", limits: { benchmarksPerMonth: 5000, privateBehaviors: -1, apiKeys: 20 } }
};

const ROBOTS = {
  "unitree-g1": { name: "Unitree G1", manufacturer: "Unitree Robotics", class: "humanoid", engines: ["MuJoCo"], modelSource: "MuJoCo Menagerie", status: "catalog-only", capabilities: ["locomotion", "manipulation", "whole-body"] },
  "unitree-h1": { name: "Unitree H1", manufacturer: "Unitree Robotics", class: "humanoid", engines: ["MuJoCo"], modelSource: "MuJoCo Menagerie", status: "adapter-ready", capabilities: ["locomotion", "manipulation", "whole-body"] },
  "unitree-t1": { name: "Unitree T1", manufacturer: "Unitree Robotics", class: "humanoid", engines: ["MuJoCo"], modelSource: "MuJoCo Menagerie", status: "adapter-ready", capabilities: ["locomotion", "manipulation"] },
  apollo: { name: "Apollo", manufacturer: "Apptronik", class: "humanoid", engines: ["MuJoCo"], modelSource: "MuJoCo Menagerie", status: "adapter-ready", capabilities: ["locomotion", "manipulation", "whole-body"] },
  talos: { name: "TALOS", manufacturer: "PAL Robotics", class: "humanoid", engines: ["MuJoCo"], modelSource: "MuJoCo Menagerie", status: "adapter-ready", capabilities: ["locomotion", "manipulation", "whole-body"] },
  "generic-humanoid": { name: "Generic Humanoid", manufacturer: "HumanoidBehavior", class: "reference", engines: ["MuJoCo", "simulation-harness"], modelSource: "Built-in task worker", status: "active", capabilities: ["benchmarking"] }
};

const BEHAVIORS = [
  {
    id: "pick-place", version: "1.0.0", name: "Pick & Place", category: "Manipulation", level: "Core",
    description: "Pick a specified object and place it at a target location.",
    steps: ["Perceive target object", "Navigate to workspace", "Reach and grasp", "Transport object", "Release at target", "Verify placement"],
    metrics: { success: 94, time: 8.2, collision: 1.4, recovery: 87 }, schemaVersion: "1.0",
    metricsStatus: "illustrative-baseline", compatibleEngines: ["simulation-harness", "MuJoCo"],
    compatibleRobots: ["generic-humanoid"], provenance: { source: "HumanoidBehavior behavior specification", revision: "1.0.0" }, tags: ["manipulation", "core"]
  },
  {
    id: "pick-place", version: "1.1.0", name: "Pick & Place", category: "Manipulation", level: "Core",
    description: "Pick a specified object and place it at a target location with explicit post-placement verification.",
    steps: ["Perceive target object", "Navigate to workspace", "Reach and grasp", "Transport object", "Release at target", "Verify placement", "Verify object settled"],
    metrics: { success: 94, time: 8.2, collision: 1.4, recovery: 87 }, schemaVersion: "1.0",
    metricsStatus: "illustrative-baseline", compatibleEngines: ["simulation-harness", "MuJoCo"],
    compatibleRobots: ["generic-humanoid"], provenance: { source: "HumanoidBehavior behavior specification", revision: "1.1.0" }, tags: ["manipulation", "core", "verification"]
  },
  {
    id: "open-door", version: "1.0.0", name: "Open a Door", category: "Whole-body", level: "Interaction",
    description: "Approach a door, operate its handle and pass through safely.",
    steps: ["Detect door and handle", "Align body", "Grasp handle", "Apply force", "Rotate/pull", "Pass through and verify"],
    metrics: { success: 89, time: 12.7, collision: 2.1, recovery: 81 }, schemaVersion: "1.0",
    metricsStatus: "illustrative-baseline", compatibleEngines: ["simulation-harness", "MuJoCo"],
    compatibleRobots: ["generic-humanoid"], provenance: { source: "HumanoidBehavior behavior specification", revision: "1.0.0" }, tags: ["whole-body", "interaction"]
  },
  {
    id: "follow-person", version: "1.0.0", name: "Follow a Person", category: "Navigation", level: "Social",
    description: "Track a moving person while maintaining a safe distance.",
    steps: ["Detect person", "Estimate motion", "Set following distance", "Plan collision-free path", "Track and adapt", "Recover if target is lost"],
    metrics: { success: 91, time: 18.4, collision: 0.8, recovery: 93 }, schemaVersion: "1.0",
    metricsStatus: "illustrative-baseline", compatibleEngines: ["simulation-harness", "MuJoCo"],
    compatibleRobots: ["generic-humanoid"], provenance: { source: "HumanoidBehavior behavior specification", revision: "1.0.0" }, tags: ["navigation", "social"]
  },
  {
    id: "handover", version: "1.0.0", name: "Hand Object to Person", category: "Interaction", level: "Bimanual",
    description: "Move an object into a human's reachable handover zone.",
    steps: ["Detect object", "Grasp securely", "Detect recipient", "Predict handover pose", "Transfer object", "Confirm release"],
    metrics: { success: 86, time: 10.1, collision: 1.1, recovery: 79 }, schemaVersion: "1.0",
    metricsStatus: "illustrative-baseline", compatibleEngines: ["simulation-harness", "MuJoCo"],
    compatibleRobots: ["generic-humanoid"], provenance: { source: "HumanoidBehavior behavior specification", revision: "1.0.0" }, tags: ["interaction", "bimanual"]
  }
];

let schemaPromise;
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  }});
}
function id() { return crypto.randomUUID(); }
function b64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64(value) { const normalized = String(value || "").replace(/-/g,"+").replace(/_/g,"/"); return Uint8Array.from(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)), c => c.charCodeAt(0)); }
function hex(bytes) { return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,"0")).join(""); }
async function sha256(text) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text))); }

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 20000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$20000$" + b64(salt) + "$" + b64(bits);
}
async function passwordVerify(password, stored) {
  const [kind, iter, salt64, hash64] = String(stored || "").split("$");
  if (kind !== "pbkdf2" || !iter || !salt64 || !hash64) return false;
  const salt = unb64(salt64);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: Number(iter), hash: "SHA-256" }, key, 256);
  return b64(bits) === hash64;
}

async function ensureSchema(env) {
  if (!env.DB) throw new Error("D1 binding DB is not configured");
  if (!schemaPromise) schemaPromise = (async () => {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS behaviors (id TEXT NOT NULL, version TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'private', status TEXT NOT NULL DEFAULT 'draft', package_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(id,version))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_behaviors_public ON behaviors(visibility,status)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)")
    ]);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM behaviors WHERE user_id='system'").first();
    if (!Number(row?.n || 0)) {
      for (const p of BEHAVIORS) {
        await env.DB.prepare("INSERT OR IGNORE INTO behaviors(id,version,user_id,name,description,visibility,status,package_json) VALUES(?,?,?,?,?,?,?,?)")
          .bind(p.id,p.version,"system",p.name,p.description,"public","published",JSON.stringify({...p,status:"published",visibility:"public"})).run();
      }
    }
  })();
  return schemaPromise;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
function planFor(user) { return PLANS[user?.plan] || PLANS.free; }
function publicUser(u) { return { id:u.id, email:u.email, name:u.name, plan:u.plan }; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }
function behaviorSpec(id, version) { return BEHAVIORS.find(b => b.id === id && b.version === version) || null; }
function sanitizeName(value, fallback="Untitled") { const s=String(value||"").trim().replace(/\s+/g," "); return s.slice(0,160)||fallback; }
function sanitizeSteps(value) { return Array.isArray(value) ? value.map(v=>String(v||"").trim().slice(0,300)).filter(Boolean).slice(0,20) : []; }

async function authUser(request, env) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  const hash = await sha256(token);
  const session = await env.DB.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')").bind(hash).first();
  if (session) return session;
  const key = await env.DB.prepare("SELECT u.* FROM api_keys k JOIN users u ON u.id=k.user_id WHERE k.hash=? AND k.revoked_at IS NULL").bind(hash).first();
  return key || null;
}

async function createSession(user, env) {
  const token = "hb_session_" + crypto.randomUUID().replaceAll("-","");
  await env.DB.prepare("INSERT INTO sessions(id,token_hash,user_id,expires_at) VALUES(?,?,?,datetime('now','+30 days'))")
    .bind(id(), await sha256(token), user.id).run();
  return token;
}
async function requireUser(request, env) {
  const u = await authUser(request, env);
  return u || null;
}

async function usage(userId, env) {
  const runs = await env.DB.prepare("SELECT COUNT(*) AS n FROM benchmark_runs WHERE user_id=? AND created_at>=datetime('now','start of month')").bind(userId).first();
  const experiments = await env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN json_extract(result_json,'$.runCount') IS NOT NULL THEN json_extract(result_json,'$.runCount') ELSE 0 END),0) AS n FROM experiments WHERE user_id=? AND created_at>=datetime('now','start of month')").bind(userId).first();
  return Number(runs?.n||0) + Number(experiments?.n||0);
}

function cleanBehavior(row) {
  const p = JSON.parse(row.package_json);
  return { ...p, id: row.id, version: row.version, userId: row.user_id, visibility: row.visibility, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
        "Cache-Control": "no-store"
      }});
    }
    let stage = "start";
    try {
      stage = "ensure-schema";
      await ensureSchema(env);
      const u = new URL(request.url);
      const path = u.pathname;
      stage = path;

      if (path === "/api/health") {
        const d1 = await env.DB.prepare("SELECT 1 AS ok").first();
        return json({ ok:true, service:"humanoidbehavior-api", version:VERSION, storage:"cloudflare-d1", d1:{bound:true,reachable:d1?.ok===1}, capabilities:["cloudflare-workers","d1","behavior-registry","authentication","api-keys","experiments"] });
      }
      if (path === "/api/readiness") {
        return json({ ok:true, ready:true, checks:{ worker:true, databaseConfigured:true, database:"cloudflare-d1", schema:true }});
      }
      if (path === "/") return json({ service:"HumanoidBehavior API", status:"online", version:VERSION });

      if (path === "/api/plans" && request.method === "GET") return json({ data:Object.values(PLANS) });

      if (path === "/api/behaviors" && request.method === "GET") {
        const q = (u.searchParams.get("q")||"").toLowerCase();
        const category = u.searchParams.get("category")||"";
        let sql = "SELECT * FROM behaviors WHERE visibility='public' AND status='published'";
        const args = [];
        if (q) { sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)"; args.push("%"+q+"%","%"+q+"%"); }
        if (category) { sql += " AND json_extract(package_json,'$.category')=?"; args.push(category); }
        sql += " ORDER BY updated_at DESC";
        const rows = await env.DB.prepare(sql).bind(...args).all();
        const data = rows.results.map(cleanBehavior);
        return json({ data, count:data.length });
      }

      if (path === "/api/behaviors" && request.method === "POST") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const plan=planFor(user);
        if(plan.limits.privateBehaviors>=0){const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM behaviors WHERE user_id=? AND visibility='private'").bind(user.id).first();if(Number(count?.n||0)>=plan.limits.privateBehaviors)return json({error:"Private behavior limit reached",limit:plan.limits.privateBehaviors},403);}
        const x=await body(request),name=sanitizeName(x.name),description=sanitizeName(x.description,name),steps=sanitizeSteps(x.steps);
        if(!steps.length)return json({error:"At least one behavior step is required"},400);
        const behaviorId=sanitizeName(x.id,"generated-behavior").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||("behavior-"+crypto.randomUUID().slice(0,8));
        const version=sanitizeName(x.version,"1.0.0");
        if(!/^\d+\.\d+\.\d+$/.test(version))return json({error:"Version must use semantic versioning, e.g. 1.0.0"},400);
        const existing=await env.DB.prepare("SELECT id FROM behaviors WHERE id=? AND version=?").bind(behaviorId,version).first();
        if(existing)return json({error:"Behavior version already exists"},409);
        const pkg={schemaVersion:"1.0",id:behaviorId,version,name,category:sanitizeName(x.category,"Custom"),level:sanitizeName(x.level,"Custom"),description,steps,metrics:x.metrics||{},metricsStatus:"user-defined",compatibleEngines:Array.isArray(x.compatibleEngines)?x.compatibleEngines.slice(0,5):["MuJoCo"],compatibleRobots:Array.isArray(x.compatibleRobots)?x.compatibleRobots.slice(0,10):["generic-humanoid"],provenance:x.provenance||{source:"Behavior Builder",createdBy:user.id},tags:Array.isArray(x.tags)?x.tags.slice(0,20):[]};
        await env.DB.prepare("INSERT INTO behaviors(id,version,user_id,name,description,visibility,status,package_json) VALUES(?,?,?,?,?,?,?,?)").bind(behaviorId,version,user.id,name,description,"private","draft",JSON.stringify(pkg)).run();
        return json({behavior:{...pkg,userId:user.id,visibility:"private",status:"draft"}},201);
      }

      const versionMatch = path.match(/^\/api\/behaviors\/([^/]+)\/versions$/);
      if (versionMatch && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT * FROM behaviors WHERE id=? AND visibility='public' AND status='published' ORDER BY updated_at DESC").bind(decodeURIComponent(versionMatch[1])).all();
        const data = rows.results.map(cleanBehavior);
        return json({ data, count:data.length });
      }

      const behaviorMatch = path.match(/^\/api\/behaviors\/([^/]+)\/([^/]+)$/);
      if (behaviorMatch && request.method === "GET") {
        const row = await env.DB.prepare("SELECT * FROM behaviors WHERE id=? AND version=? AND visibility='public' AND status='published'").bind(decodeURIComponent(behaviorMatch[1]),decodeURIComponent(behaviorMatch[2])).first();
        return row ? json(cleanBehavior(row)) : json({error:"Behavior not found"},404);
      }

      if (path === "/api/auth/signup" && request.method === "POST") {
        let stage = "parse";
        try {
          const x = await body(request);
          const email = String(x.email||"").trim().toLowerCase(), password = String(x.password||"");
          if (!validEmail(email) || !password || password.length < 8 || password.length > 200) return json({error:"Valid email and password (8–200 chars) required"},400);
          stage = "check-email";
          const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
          if (exists) return json({error:"Account already exists"},409);
          const user = { id:id(), email, name:String(x.name||email.split("@")[0]), plan:"free" };
          stage = "hash-password";
          const hash = await passwordHash(password);
          stage = "insert-user";
          await env.DB.prepare("INSERT INTO users(id,email,name,password_hash,plan) VALUES(?,?,?,?,?)").bind(user.id,user.email,user.name,hash,user.plan).run();
          stage = "create-session";
          const token = await createSession(user,env);
          return json({ token, user },201);
        } catch (error) {
          console.error("Signup failed", error); return json({error:"Signup failed"},500);
        }
      }

      if (path === "/api/auth/login" && request.method === "POST") {
        const x = await body(request), email=String(x.email||"").trim().toLowerCase();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
        if (!user || !(await passwordVerify(String(x.password||""),user.password_hash))) return json({error:"Invalid credentials"},401);
        return json({ token:await createSession(user,env), user:publicUser(user) });
      }

      if (path === "/api/auth/demo" && request.method === "POST") {
        return json({error:"Demo access is disabled in production"},403);
      }
      if (false && path === "/api/auth/demo" && request.method === "POST") {
        const user={id:"demo_"+crypto.randomUUID().replaceAll("-",""),email:"demo@example.invalid",name:"Demo Developer",plan:"free"};
        await env.DB.prepare("INSERT INTO users(id,email,name,plan) VALUES(?,?,?,?)").bind(user.id,user.email,user.name,user.plan).run();
        return json({ token:await createSession(user,env), user },200);
      }

      if (path === "/api/me" && request.method === "GET") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        return json({user:publicUser(user),plan:planFor(user),storage:"cloudflare-d1"});
      }

      if (path === "/api/auth/logout" && request.method === "POST") {
        const h=request.headers.get("Authorization")||"";
        if(h.startsWith("Bearer ")){const token=h.slice(7).trim();if(token)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();}
        return json({ok:true});
      }

      if (path === "/api/usage" && request.method === "GET") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const used=await usage(user.id,env), plan=planFor(user);
        return json({plan:user.plan,limits:plan.limits,usage:{benchmarksThisMonth:used}});
      }

      if (path === "/api/keys" && request.method === "GET") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const rows=await env.DB.prepare("SELECT id,name,prefix,created_at,revoked_at FROM api_keys WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all();
        return json({data:rows.results.map(x=>({...x,createdAt:x.created_at,revokedAt:x.revoked_at}))});
      }

      if (path === "/api/keys" && request.method === "POST") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const plan=planFor(user), count=await env.DB.prepare("SELECT COUNT(*) AS n FROM api_keys WHERE user_id=? AND revoked_at IS NULL").bind(user.id).first();
        if (plan.limits.apiKeys>=0 && Number(count?.n||0)>=plan.limits.apiKeys) return json({error:"API key limit reached",limit:plan.limits.apiKeys},403);
        const x=await body(request), raw="hb_live_"+crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-",""), name=String(x.name||"Default key");
        await env.DB.prepare("INSERT INTO api_keys(id,user_id,hash,prefix,name) VALUES(?,?,?,?,?)").bind(id(),await sha256(raw),raw.slice(0,15),name).run();
        return json({key:raw,message:"Store this key now. It will not be shown again."},201);
      }

      const keyDelete=path.match(/^\/api\/keys\/([^/]+)$/);
      if (keyDelete && request.method==="DELETE") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const r=await env.DB.prepare("UPDATE api_keys SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").bind(decodeURIComponent(keyDelete[1]),user.id).run();
        return r.meta.changes ? json({ok:true}) : json({error:"API key not found"},404);
      }

      if (path === "/api/robots" && request.method === "GET") return json({data:Object.entries(ROBOTS).map(([id,robot])=>({id,...robot}))});
      const robotMatch=path.match(/^\/api\/robots\/([^/]+)$/);
      if(robotMatch && request.method==="GET"){const rid=decodeURIComponent(robotMatch[1]),robot=ROBOTS[rid];return robot?json({id:rid,...robot}):json({error:"Robot model not found"},404);}

      const robotEval=path.match(/^\/api\/robots\/([^/]+)\/evaluate$/),robotBehaviorEval=path.match(/^\/api\/robots\/([^/]+)\/behaviors\/([^/]+)$/);
      if((robotEval||robotBehaviorEval)&&request.method==="POST")return json({error:"Robot-specific MuJoCo adapters are not enabled yet. Use Generic behavior evaluation until a verified robot model is connected."},501);

      if (path === "/api/experiments" && request.method === "GET") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const rows=await env.DB.prepare("SELECT result_json FROM experiments WHERE user_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
        return json({data:rows.results.map(x=>JSON.parse(x.result_json))});
      }

      const expMatch=path.match(/^\/api\/experiments\/([^/]+)$/);
      if(expMatch && request.method==="GET"){
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const row=await env.DB.prepare("SELECT result_json FROM experiments WHERE id=? AND user_id=?").bind(decodeURIComponent(expMatch[1]),user.id).first();
        return row?json(JSON.parse(row.result_json)):json({error:"Experiment not found"},404);
      }

      const cancelMatch=path.match(/^\/api\/experiments\/([^/]+)\/cancel$/);
      if(cancelMatch && request.method==="POST"){
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const expId=decodeURIComponent(cancelMatch[1]);
        const row=await env.DB.prepare("SELECT id,status FROM experiments WHERE id=? AND user_id=?").bind(expId,user.id).first();
        if(!row)return json({error:"Experiment not found"},404);
        if(row.status==="completed" || row.status==="failed" || row.status==="cancelled") return json({error:"Experiment is already "+row.status},409);
        const now=new Date().toISOString();
        const resultRow=await env.DB.prepare("SELECT result_json FROM experiments WHERE id=? AND user_id=?").bind(expId,user.id).first();
        const result=JSON.parse(resultRow.result_json);
        result.status="cancelled";
        result.result.status="cancelled";
        result.result.validation={passed:false,message:"Evaluation cancelled by user."};
        result.cancelledAt=now;
        await env.DB.batch([
          env.DB.prepare("UPDATE experiments SET status='cancelled',result_json=? WHERE id=? AND user_id=?").bind(JSON.stringify(result),expId,user.id),
          env.DB.prepare("UPDATE jobs SET status='cancelled',error='Cancelled by user',finished_at=CURRENT_TIMESTAMP WHERE experiment_id=? AND user_id=? AND status IN ('queued','running')").bind(expId,user.id)
        ]);
        return json(result);
      }

      if (path === "/api/experiments/compare" && request.method === "GET") {
        const user=await requireUser(request,env);if(!user)return json({error:"Authentication required"},401);
        const ids=(u.searchParams.get("ids")||"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,20);
        if(!ids.length)return json({data:[]});
        const placeholders=ids.map(()=>"?").join(",");
        const rows=await env.DB.prepare("SELECT result_json FROM experiments WHERE user_id=? AND id IN ("+placeholders+") ORDER BY created_at DESC").bind(user.id,...ids).all();
        return json({data:rows.results.map(x=>JSON.parse(x.result_json))});
      }

      const shareExpMatch=path.match(/^\/api\/experiments\/([^/]+)\/share$/);
      if(shareExpMatch&&request.method==="POST"){
        const user=await requireUser(request,env);if(!user)return json({error:"Authentication required"},401);
        const expId=decodeURIComponent(shareExpMatch[1]),row=await env.DB.prepare("SELECT id,status FROM experiments WHERE id=? AND user_id=?").bind(expId,user.id).first();
        if(!row)return json({error:"Experiment not found"},404);
        if(row.status!=="completed")return json({error:"Only completed experiments can be shared"},409);
        const token=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
        await env.DB.prepare("INSERT INTO experiment_shares(token,experiment_id,user_id) VALUES(?,?,?)").bind(token,expId,user.id).run();
        return json({url:"share.html?token="+encodeURIComponent(token),token});
      }
      if(path==="/api/share"&&request.method==="GET"){
        const token=String(u.searchParams.get("token")||"").trim();
        if(!token||token.length>100)return json({error:"Invalid share token"},400);
        const row=await env.DB.prepare("SELECT e.result_json,e.status FROM experiment_shares s JOIN experiments e ON e.id=s.experiment_id WHERE s.token=?").bind(token).first();
        return row?json(JSON.parse(row.result_json)):json({error:"Shared report not found"},404);
      }

      if (path === "/api/experiments/run" && request.method === "POST") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        const x=await body(request);
        const seeds=Array.isArray(x.seeds)?x.seeds.map(String).filter(Boolean):String(x.seeds||"42,1337").split(",").map(s=>s.trim()).filter(Boolean);
        const policies=Array.isArray(x.policies)&&x.policies.length?x.policies.map(String).filter(Boolean).slice(0,8):["policy-a"];
        if(seeds.length<1||seeds.length>20)return json({error:"Use 1–20 seeds"},400);
        if(policies.length<1||policies.length>8)return json({error:"Use 1–8 policies"},400);
        const requestedRuns=seeds.length*policies.length;
        if(requestedRuns>20)return json({error:"Maximum 20 runs per evaluation"},400);
        const behaviorId=String(x.behaviorId||"pick-place"),behaviorVersion=String(x.behaviorVersion||"1.1.0"),engine=String(x.engine||"MuJoCo");
        if(!["MuJoCo","simulation-harness"].includes(engine))return json({error:"Unsupported engine"},400);
        const spec=behaviorSpec(behaviorId,behaviorVersion);
        if(!spec)return json({error:"Published behavior version not found: "+behaviorId+"@"+behaviorVersion},404);
        if(!spec.compatibleEngines.includes(engine))return json({error:"Behavior version is not compatible with "+engine},400);
        const requested=requestedRuns,plan=planFor(user),used=await usage(user.id,env);
        const active=await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs WHERE user_id=? AND status IN ('queued','running')").bind(user.id).first();
        if(Number(active?.n||0)>=3)return json({error:"Too many evaluations already queued or running. Wait for one to finish."},429);
        if(plan.limits.benchmarksPerMonth>=0&&used+requested>plan.limits.benchmarksPerMonth)return json({error:"Monthly benchmark limit reached",limit:plan.limits.benchmarksPerMonth,used,requested},429);
        const expId=id(),jobId=id(),seconds=Math.max(1,Math.min(Number(x.seconds||5),60));
        const result={id:expId,userId:user.id,benchmark:"behavior-evaluation",engine,status:"queued",behaviorId,behaviorVersion,createdAt:new Date().toISOString(),result:{schemaVersion:"1.0",comparisonType:"behavior-evaluation",measured:engine==="MuJoCo",reproducible:true,seeds,policies,seconds,runCount:0,expectedRunCount:requested,validation:{passed:false,message:"Evaluation queued for execution worker"},rawResults:[],summary:{}}};
        await env.DB.batch([
          env.DB.prepare("INSERT INTO experiments(id,user_id,benchmark,engine,status,behavior_id,behavior_version,result_json) VALUES(?,?,?,?,?,?,?,?)").bind(expId,user.id,result.benchmark,result.engine,result.status,result.behaviorId,result.behaviorVersion,JSON.stringify(result)),
          env.DB.prepare("INSERT INTO jobs(id,experiment_id,user_id,type,status,payload_json) VALUES(?,?,?,?,?,?)").bind(jobId,expId,user.id,"experiment-run","queued",JSON.stringify({...x,seeds,policies,behaviorId,behaviorVersion,engine,seconds}))
        ]);
        result.jobId=jobId;
        await env.DB.prepare("UPDATE experiments SET result_json=? WHERE id=?").bind(JSON.stringify(result),expId).run();
        return json(result,202);
      }

      if (path === "/api/behaviors/compare/benchmark" && request.method === "POST") {
        const user=await requireUser(request,env); if(!user)return json({error:"Authentication required"},401);
        return json({error:"Version comparison worker is being hardened; use a single-version evaluation for now."},501);
      }

      return json({error:"Not found"},404);
    } catch (error) {
      console.error("Worker error",{stage,error}); return json({error:"Internal server error"},500);
    }
  }
};
