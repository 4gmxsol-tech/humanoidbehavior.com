const http=require("http"),fs=require("fs"),path=require("path"),url=require("url");
const root=__dirname,port=process.env.PORT||3000;
const load=()=>JSON.parse(fs.readFileSync(path.join(root,"data","behaviors.json"),"utf8"));
const send=(res,status,data)=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"});res.end(JSON.stringify(data))};
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".ico":"image/x-icon"};
function serve(req,res,u){let p=decodeURIComponent(u.pathname);if(p==="/")p="/index.html";if(p.includes(".."))return send(res,400,{error:"Invalid path"});const file=path.join(root,p);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"public, max-age=300"});fs.createReadStream(file).pipe(res)}
http.createServer((req,res)=>{
 const u=url.parse(req.url,true);
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 if(u.pathname==="/api/health")return send(res,200,{ok:true,service:"humanoidbehavior",version:"0.3.0"});
 if(u.pathname==="/api/behaviors"){
  let d=load(); if(u.query.q){const q=u.query.q.toLowerCase();d=d.filter(x=>(x.name+" "+x.description+" "+x.category).toLowerCase().includes(q))}
  if(u.query.category)d=d.filter(x=>x.category===u.query.category);
  return send(res,200,{data:d,count:d.length});
 }
 if(u.pathname.startsWith("/api/behaviors/")){
  const b=load().find(x=>x.id===u.pathname.split("/").pop());return b?send(res,200,b):send(res,404,{error:"Behavior not found"});
 }
 if(u.pathname==="/api/benchmark"&&req.method==="POST"){
  let body="";req.on("data",c=>{body+=c;if(body.length>1e6)req.destroy()});
  req.on("end",()=>{try{
   const x=JSON.parse(body||"{}"),b=load().find(v=>v.id===x.behaviorId);if(!b)return send(res,404,{error:"Behavior not found"});
   const completed=Array.isArray(x.completedSteps),stepsOk=completed&&completed.length===b.steps.length;
   const result={runId:"run_"+Date.now(),behaviorId:b.id,status:stepsOk?"passed":"incomplete",metrics:b.metrics,checks:{steps:stepsOk,model:Boolean(x.model||x.policy)},createdAt:new Date().toISOString()};
   send(res,200,result);
  }catch(e){send(res,400,{error:"Invalid JSON"})}});
  return;
 }
 serve(req,res,u);
}).listen(port,()=>console.log("HumanoidBehavior server listening on "+port));