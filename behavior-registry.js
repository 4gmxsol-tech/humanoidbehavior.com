const fs=require("fs"),path=require("path"),db=require("./db");
const DATA=path.join(__dirname,"data","behavior-registry.json");const RELEASES=path.join(__dirname,"data","behavior-releases.json");
function ensure(){fs.mkdirSync(path.dirname(DATA),{recursive:true});if(!fs.existsSync(DATA))fs.writeFileSync(DATA,"[]")}
function read(){ensure();return JSON.parse(fs.readFileSync(DATA,"utf8"))}
function releases(){return fs.existsSync(RELEASES)?JSON.parse(fs.readFileSync(RELEASES,"utf8")):[]}
function write(v){ensure();fs.writeFileSync(DATA,JSON.stringify(v,null,2))}
async function init(){
 if(db.mode()==="json"){const a=read();if(!a.length){const base=require("./data/behaviors.json").map(p=>({...p,userId:"system",status:"published",visibility:"public",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),package:{...p,status:"published",visibility:"public"}}));const extra=releases().map(p=>({...p,userId:"system",status:"published",visibility:"public",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),package:{...p,status:"published",visibility:"public"}}));write([...base,...extra])}}
 await db.query(`CREATE TABLE IF NOT EXISTS behaviors(id TEXT NOT NULL,version TEXT NOT NULL,user_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'private',status TEXT NOT NULL DEFAULT 'draft',package JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(id,version));`);
 await db.query(`CREATE INDEX IF NOT EXISTS behaviors_visibility_idx ON behaviors(visibility,status);`);
 if(db.mode()==="postgresql"){const n=await db.query("SELECT COUNT(*)::int AS count FROM behaviors");if(n.rows[0].count===0){const seed=[...require("./data/behaviors.json"),...releases()];for(const p of seed)await db.query("INSERT INTO behaviors(id,version,user_id,name,description,visibility,status,package) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",[p.id,p.version,"system",p.name,p.description,"public","published",JSON.stringify({...p,status:"published",visibility:"public"})])}}
}
function normalize(x){return {...x,userId:x.userId||x.user_id,createdAt:x.createdAt||x.created_at,updatedAt:x.updatedAt||x.updated_at}}
async function list({userId,publicOnly=false,q="",category=""}={}){
 if(db.mode()==="postgresql"){
  const clauses=[],vals=[];if(publicOnly){clauses.push("visibility='public'","status='published'")}else if(userId){clauses.push("user_id=$"+(vals.length+1));vals.push(userId)}
  if(q){clauses.push("(LOWER(name) LIKE $"+(vals.length+1)+" OR LOWER(description) LIKE $"+(vals.length+1)+")");vals.push("%"+q.toLowerCase()+"%")}
  if(category){clauses.push("package->>'category'=$"+(vals.length+1));vals.push(category)}
  const r=await db.query("SELECT * FROM behaviors "+(clauses.length?"WHERE "+clauses.join(" AND "):"")+" ORDER BY updated_at DESC",vals);return r.rows.map(x=>normalize({...x,package:x.package}))
 }
 let a=read();if(publicOnly)a=a.filter(x=>x.visibility==="public"&&x.status==="published");else if(userId)a=a.filter(x=>x.userId===userId);if(q){const z=q.toLowerCase();a=a.filter(x=>(x.name+" "+x.description).toLowerCase().includes(z))}if(category)a=a.filter(x=>x.package?.category===category);return a.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))
}
async function get(id,version){
 if(db.mode()==="postgresql"){const r=await db.query("SELECT * FROM behaviors WHERE id=$1 AND version=$2",[id,version]);if(!r.rows[0])return null;return normalize({...r.rows[0],package:r.rows[0].package})}
 return read().find(x=>x.id===id&&x.version===version)||null
}
async function versions(id,{publicOnly=false,userId}={}){
 if(db.mode()==="postgresql"){const clauses=["id=$1"],vals=[id];if(publicOnly){clauses.push("visibility='public'","status='published'")}else if(userId){clauses.push("user_id=$2");vals.push(userId)}const r=await db.query("SELECT * FROM behaviors WHERE "+clauses.join(" AND ")+" ORDER BY updated_at DESC",vals);return r.rows.map(x=>normalize({...x,package:x.package}))}
 let a=read().filter(x=>x.id===id);if(publicOnly)a=a.filter(x=>x.visibility==="public"&&x.status==="published");else if(userId)a=a.filter(x=>x.userId===userId);return a.sort((a,b)=>String(b.version).localeCompare(String(a.version)))
}
async function save(pkg,userId){
 const now=new Date().toISOString(),x={id:pkg.id,version:pkg.version,userId,name:pkg.name,description:pkg.description,visibility:"private",status:"draft",package:{...pkg,userId:undefined,visibility:"private",status:"draft"},createdAt:now,updatedAt:now};
 if(db.mode()==="postgresql"){await db.query("INSERT INTO behaviors(id,version,user_id,name,description,visibility,status,package,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",[x.id,x.version,userId,x.name,x.description,x.visibility,x.status,JSON.stringify(x.package),now]);return x}
 const a=read();if(a.some(v=>v.id===x.id&&v.version===x.version))throw new Error("Behavior version already exists");a.push(x);write(a);return x
}
async function publish(id,version,userId){
 if(db.mode()==="postgresql"){const r=await db.query("UPDATE behaviors SET visibility='public',status='published',updated_at=NOW(),package=jsonb_set(jsonb_set(package,'{visibility}',to_jsonb('public'::text)),'{status}',to_jsonb('published'::text)) WHERE id=$1 AND version=$2 AND user_id=$3 RETURNING *",[id,version,userId]);return r.rows[0]?normalize({...r.rows[0],package:r.rows[0].package}):null}
 const a=read(),x=a.find(v=>v.id===id&&v.version===version&&v.userId===userId);if(!x)return null;x.visibility="public";x.status="published";x.package.visibility="public";x.package.status="published";x.updatedAt=new Date().toISOString();write(a);return x
}
module.exports={init,list,get,versions,save,publish};
