const http=require("http"),fs=require("fs"),path=require("path"),url=require("url"),crypto=require("crypto");
const root=__dirname,port=process.env.PORT||3000,DATA=path.join(root,"data","behaviors.json"),RUNS=path.join(root,"data","runs.json"),PLANS=path.join(root,"data","plans.json"),runner=require("./benchmark-runner"),adapters=require("./benchmark-adapters");
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));const save=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2));
const send=(res,status,data,headers={})=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization",...headers});res.end(JSON.stringify(data))};
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8"};
const readBody=req=>new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>1e6){req.destroy();reject(new Error("body too large"))}});req.on("end",()=>resolve(b));req.on("error",reject)});
const token=()=>crypto.randomBytes(24).toString("hex"),sessions=new Map();
function auth(req){const h=req.headers.authorization||"",t=h.startsWith("Bearer ")?h.slice(7):"";return t&&sessions.get(t)}
function serve(res,u){let p=decodeURIComponent(u.pathname);if(p==="/")p="/index.html";if(p.includes(".."))return send(res,400,{error:"Invalid path"});const file=path.join(root,p);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"public,max-age=300"});fs.createReadStream(file).pipe(res)}
function planFor(user){return load(PLANS).find(p=>p.id===user.plan)||load(PLANS)[0]}
http.createServer(async(req,res)=>{
 const u=url.parse(req.url,true);if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 try{
  if(u.pathname==="/api/health")return send(res,200,{ok:true,service:"humanoidbehavior",version:"0.6.0",capabilities:["behaviors","benchmark","adapters","workspace","plans"]});
  if(u.pathname==="/api/behaviors"){let d=load(DATA);if(u.query.q){const q=u.query.q.toLowerCase();d=d.filter(x=>(x.name+" "+x.description+" "+x.category).toLowerCase().includes(q))}if(u.query.category)d=d.filter(x=>x.category===u.query.category);return send(res,200,{data:d,count:d.length})}
  if(u.pathname.startsWith("/api/behaviors/")){const b=load(DATA).find(x=>x.id===u.pathname.split("/").pop());return b?send(res,200,b):send(res,404,{error:"Behavior not found"})}
  if(u.pathname==="/api/plans")return send(res,200,{data:load(PLANS)});
  if(u.pathname==="/api/adapters")return send(res,200,{data:Object.keys(adapters.adapters).map(id=>({id,kind:adapters.adapters[id].kind||"adapter"}))});
  if(u.pathname==="/api/auth/demo"&&req.method==="POST"){const user={id:"demo_"+crypto.randomBytes(5).toString("hex"),name:"Demo Developer",plan:"free"};const t=token();sessions.set(t,user);return send(res,200,{token:t,user})}
  if(u.pathname==="/api/me"){const user=auth(req);return user?send(res,200,{user,plan:planFor(user)}):send(res,401,{error:"Authentication required"})}
  if(u.pathname==="/api/usage"){const user=auth(req);if(!user)return send(res,401,{error:"Authentication required"});const runs=load(RUNS).filter(r=>r.userId===user.id&&r.createdAt.slice(0,7)===new Date().toISOString().slice(0,7));const p=planFor(user);return send(res,200,{plan:p.id,limits:p.limits,usage:{benchmarksThisMonth:runs.length,privateBehaviors:0}})}
  if(u.pathname==="/api/runs"&&req.method==="GET"){const user=auth(req);if(!user)return send(res,401,{error:"Authentication required"});return send(res,200,{data:load(RUNS).filter(r=>r.userId===user.id).slice(-100).reverse()})}
  if(u.pathname==="/api/benchmark"&&req.method==="POST"){
   const user=auth(req);if(!user)return send(res,401,{error:"Authentication required"});
   const p=planFor(user),runs=load(RUNS).filter(r=>r.userId===user.id&&r.createdAt.slice(0,7)===new Date().toISOString().slice(0,7));if(p.limits.benchmarksPerMonth>=0&&runs.length>=p.limits.benchmarksPerMonth)return send(res,429,{error:"Monthly benchmark limit reached",limit:p.limits.benchmarksPerMonth});
   const x=JSON.parse(await readBody(req)||"{}"),b=load(DATA).find(v=>v.id===x.behaviorId);if(!b)return send(res,404,{error:"Behavior not found"});
   const result=runner.evaluate(x);result.userId=user.id;result.checks.model=Boolean(x.model||x.policy);result.adapter=await adapters.runAdapter(x.adapter||"spec-validator",{behavior:b,input:x});
   const all=load(RUNS);all.push(result);save(RUNS,all.slice(-10000));return send(res,200,result);
  }
  serve(res,u);
 }catch(e){return send(res,400,{error:e.message||"Bad request"})}
}).listen(port,()=>console.log("HumanoidBehavior API v0.6.0 listening on "+port));