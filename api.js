const http=require("http"),fs=require("fs"),path=require("path"),url=require("url"),crypto=require("crypto");
const root=__dirname,port=process.env.PORT||3000,DATA=path.join(root,"data","behaviors.json");
const load=()=>JSON.parse(fs.readFileSync(DATA,"utf8"));
const send=(res,status,data,headers={})=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization",...headers});res.end(JSON.stringify(data))};
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".ico":"image/x-icon"};
const readBody=req=>new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>1e6){req.destroy();reject(new Error("body too large"))}});req.on("end",()=>resolve(b));req.on("error",reject)});
const token=()=>crypto.randomBytes(18).toString("hex");
const sessions=new Map();
function auth(req){const h=req.headers.authorization||"";const t=h.startsWith("Bearer ")?h.slice(7):"";return t&&sessions.has(t)?sessions.get(t):null}
function serve(req,res,u){let p=decodeURIComponent(u.pathname);if(p==="/")p="/index.html";if(p.includes(".."))return send(res,400,{error:"Invalid path"});const file=path.join(root,p);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"public,max-age=300"});fs.createReadStream(file).pipe(res)}
http.createServer(async(req,res)=>{
 const u=url.parse(req.url,true);if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 try{
  if(u.pathname==="/api/health")return send(res,200,{ok:true,service:"humanoidbehavior",version:"0.4.0"});
  if(u.pathname==="/api/behaviors"){let d=load();if(u.query.q){const q=u.query.q.toLowerCase();d=d.filter(x=>(x.name+" "+x.description+" "+x.category).toLowerCase().includes(q))}if(u.query.category)d=d.filter(x=>x.category===u.query.category);return send(res,200,{data:d,count:d.length})}
  if(u.pathname.startsWith("/api/behaviors/")){const b=load().find(x=>x.id===u.pathname.split("/").pop());return b?send(res,200,b):send(res,404,{error:"Behavior not found"})}
  if(u.pathname==="/api/auth/demo"&&req.method==="POST"){const user={id:"demo_"+crypto.randomBytes(5).toString("hex"),name:"Demo Developer",plan:"free"};const t=token();sessions.set(t,user);return send(res,200,{token:t,user})}
  if(u.pathname==="/api/me"){const user=auth(req);return user?send(res,200,{user}):send(res,401,{error:"Authentication required"})}
  if(u.pathname==="/api/benchmark"&&req.method==="POST"){
   const user=auth(req);if(!user)return send(res,401,{error:"Authentication required"});
   const x=JSON.parse(await readBody(req)||"{}"),b=load().find(v=>v.id===x.behaviorId);if(!b)return send(res,404,{error:"Behavior not found"});
   const completed=Array.isArray(x.completedSteps),stepsOk=completed&&completed.length===b.steps.length;
   return send(res,200,{runId:"run_"+Date.now(),userId:user.id,behaviorId:b.id,status:stepsOk?"passed":"incomplete",metrics:b.metrics,checks:{steps:stepsOk,model:Boolean(x.model||x.policy)},createdAt:new Date().toISOString()});
  }
  if(u.pathname==="/api/usage"){const user=auth(req);if(!user)return send(res,401,{error:"Authentication required"});return send(res,200,{plan:user.plan,limits:{benchmarksPerMonth:25,privateBehaviors:5},usage:{benchmarksThisMonth:0,privateBehaviors:0}})}
  return serve(req,res,u);
 }catch(e){return send(res,400,{error:e.message||"Bad request"})}
}).listen(port,()=>console.log("HumanoidBehavior API v0.4.0 listening on "+port));