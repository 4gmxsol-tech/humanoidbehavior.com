const HB={behaviors:[
{id:"pick-place",name:"Pick & Place",category:"Manipulation",level:"Core",description:"Pick a specified object and place it at a target location.",steps:["Perceive target object","Navigate to workspace","Reach and grasp","Transport object","Release at target","Verify placement"],metrics:null},
{id:"open-door",name:"Open a Door",category:"Whole-body",level:"Interaction",description:"Approach a door, operate its handle and pass through safely.",steps:["Detect door and handle","Align body","Grasp handle","Apply force","Rotate/pull","Pass through and verify"],metrics:null},
{id:"follow-person",name:"Follow a Person",category:"Navigation",level:"Social",description:"Track a moving person while maintaining a safe distance.",steps:["Detect person","Estimate motion","Set following distance","Plan collision-free path","Track and adapt","Recover if target is lost"],metrics:null},
{id:"handover",name:"Hand Object to Person",category:"Interaction",level:"Bimanual",description:"Move an object into a human's reachable handover zone.",steps:["Detect object","Grasp securely","Detect recipient","Predict handover pose","Transfer object","Confirm release"],metrics:null}
]};

function escText(v){return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function evidenceState(b){return String(b.metricsStatus||b.evidence||b.measurementStatus||"unmeasured").toLowerCase().includes("measur")&&!String(b.metricsStatus||b.evidence||"").toLowerCase().includes("not")?"measured":"unmeasured";}
function localRegistry(){return HB.behaviors.map(b=>({...b,version:"1.0.0",status:"published",visibility:"public",compatibleEngines:["MuJoCo","simulation-harness"],compatibleRobots:["generic-humanoid"],metricsStatus:"not-measured"}));}
function registryLibrary(){
 const root=document.querySelector("#behavior-list");if(!root)return;
 const status=document.querySelector("#registry-status");
 let data=[];
 const search=()=>document.querySelector("#search")?.value.trim().toLowerCase()||"";
 const category=()=>document.querySelector("#category")?.value||"all";
 const evidence=()=>document.querySelector("#evidence")?.value||"all";
 const render=()=>{
   const filtered=data.filter(b=>{
     const hay=(b.name+" "+b.description+" "+(b.tags||[]).join(" ")+" "+(b.id||"")).toLowerCase();
     const ev=evidenceState(b);
     return (category()==="all"||b.category===category())&&hay.includes(search())&&(evidence()==="all"||(evidence()==="measured"&&ev==="measured")||(evidence()==="unmeasured"&&ev==="unmeasured"));
   });
   root.innerHTML=filtered.map(b=>{
     const ev=evidenceState(b);
     const engines=(b.compatibleEngines||[]).map(escText).join(" · ")||"—";
     return '<a class="behavior-card registry-card" href="behavior.html?id='+encodeURIComponent(b.id)+'">'+
       '<div class="card-top"><span class="icon">'+escText((b.name||"?")[0])+'</span><span class="pill">'+escText(b.category||"Behavior")+'</span></div>'+
       '<h3>'+escText(b.name)+'</h3><p>'+escText(b.description)+'</p>'+
       '<div class="registry-meta"><span>v'+escText(b.version||"—")+'</span><span>'+escText(b.status||"published")+'</span><span>'+engines+'</span><span class="evidence-badge '+ev+'">'+(ev==="measured"?"● Measured":"○ Not measured")+'</span></div>'+
       '<div class="card-bottom"><span>'+escText(b.level||"Core")+'</span><strong>Open technical asset →</strong></div></a>';
   }).join("")||'<div class="empty">No published behaviors match the current filters.</div>';
   const ids=new Set(data.map(x=>x.id));document.querySelector("#registry-count").textContent=ids.size;
   document.querySelector("#registry-versions").textContent=data.length;
 };
 const load=async()=>{
   try{const r=await fetch("/api/behaviors",{headers:{Accept:"application/json"}});if(!r.ok)throw Error();const x=await r.json();data=x.data||x.behaviors||[];status.textContent="Live registry · published specifications";status.dataset.state="live";}
   catch{data=localRegistry();status.textContent="Live registry unavailable · local catalog shown";status.dataset.state="fallback";}
   render();
 };
 ["search","category","evidence"].forEach(id=>document.getElementById(id)?.addEventListener(id==="search"?"input":"change",render));
 load();
}

HB.runs=()=>{try{return JSON.parse(localStorage.getItem("hb_runs")||"[]")}catch{return[]}};
HB.save=r=>{const a=HB.runs();a.unshift(r);localStorage.setItem("hb_runs",JSON.stringify(a.slice(0,100)))};
HB.card=b=>'<a class="behavior-card" href="behavior.html?id='+encodeURIComponent(b.id)+'"><div class="card-top"><span class="icon">'+escText(b.name?.[0]||"?")+'</span><span class="pill">'+escText(b.category)+'</span></div><h3>'+escText(b.name)+'</h3><p>'+escText(b.description)+'</p><div class="card-bottom"><span>'+escText(b.level)+'</span><strong>Specification</strong></div></a>';

function detail(){
 const root=document.querySelector("#behavior-detail");if(!root)return;
 const id=new URLSearchParams(location.search).get("id")||"pick-place";
 const fallback=HB.behaviors.find(x=>x.id===id)||HB.behaviors[0];
 root.innerHTML='<div class="eyebrow">BEHAVIOR TECHNICAL ASSET</div><h1>'+escText(fallback.name)+'</h1><p class="lead">'+escText(fallback.description)+'</p>'+
 '<div class="registry-meta"><span>Specification</span><span>Versioned</span><span>Reproducible</span><span>Compatibility tracked</span></div>'+
 '<div class="detail-grid"><section><h2>Task sequence</h2><ol class="step-list">'+fallback.steps.map((s,i)=>'<li><b>0'+(i+1)+'</b><span>'+escText(s)+'</span></li>').join("")+'</ol></section>'+
 '<section><h2>Evidence</h2><div class="builder-result"><span class="evidence-badge unmeasured">○ Not measured</span><h3>Specification is published; measurement is run-specific.</h3><p>Measured metrics are attached only to verified Experiment Lab executions. This page does not present illustrative numbers as benchmark evidence.</p><a class="button primary" href="simulation.html?behavior='+encodeURIComponent(fallback.id)+'">Open Experiment Lab →</a></div></section></div>'+
 '<div class="builder-result" id="registry-versions"><div class="eyebrow">BEHAVIOR REGISTRY</div><h2>Versions & compatibility</h2><p>Loading registry releases…</p></div>';
 fetch("/api/behaviors/"+encodeURIComponent(fallback.id)+"/versions",{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject()).then(x=>{
   const vs=x.data||x.versions||[],box=document.querySelector("#registry-versions");if(!box)return;
   box.innerHTML='<div class="eyebrow">BEHAVIOR REGISTRY</div><h2>Versions & compatibility</h2>'+
   (vs.length?'<div class="run-row head"><span>Version</span><span>Status</span><span>Compatibility</span><span>Action</span></div>'+
   vs.map(v=>{const version=typeof v==="string"?v:v.version;const engines=(typeof v==="object"?(v.compatibleEngines||v.engines||[]):[]);return '<div class="run-row"><span><b>'+escText(version)+'</b></span><span>'+escText(v.status||"published")+'</span><span>'+escText(engines.join(" · ")||"MuJoCo / reference model")+'</span><a class="button" href="simulation.html?behavior='+encodeURIComponent(fallback.id)+'&version='+encodeURIComponent(version)+'">Evaluate</a></div>'}).join(""):'<p>No published version metadata is available yet.</p>');
 }).catch(()=>{const box=document.querySelector("#registry-versions");if(box)box.innerHTML='<div class="eyebrow">BEHAVIOR REGISTRY</div><h2>Versions & compatibility</h2><p>Registry data is temporarily unavailable. The published specification remains available.</p>'});
}

function dashboard(){
 const root=document.querySelector("#runs");if(!root)return;
 const a=HB.runs();
 root.innerHTML=a.length?a.map(r=>'<div class="run-row"><span>'+escText(r.behavior)+'</span><span>'+new Date(r.createdAt).toLocaleString()+'</span><strong>'+escText(r.status)+'</strong><span>'+escText(r.metrics?.success??"—")+'%</span></div>').join(""):'<div class="empty">No evaluations yet. Run a behavior to populate your workspace.</div>';
}
function builder(){
 const form=document.querySelector("#builder-form");if(!form)return;
 form.onsubmit=e=>{e.preventDefault();const task=document.querySelector("#task").value.trim();const t=task.toLowerCase();const b=t.includes("door")?HB.behaviors[1]:t.includes("follow")?HB.behaviors[2]:t.includes("hand")?HB.behaviors[3]:HB.behaviors[0];document.querySelector("#builder-output").innerHTML='<div class="builder-result"><div class="eyebrow">GENERATED SPECIFICATION</div><h2>'+escText(task)+'</h2><ol class="step-list">'+b.steps.map((s,i)=>'<li><b>0'+(i+1)+'</b><span>'+escText(s)+'</span></li>').join("")+'</ol><a class="button primary" href="behavior.html?id='+b.id+'">Open behavior</a></div>'};
}
async function apiBenchmark(behaviorId,steps){const t=localStorage.getItem("hb_token");if(!t)throw new Error("Please sign in");const r=await fetch("/api/benchmark",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({behaviorId,completedSteps:steps,model:"browser-spec"})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Benchmark failed");return d}
HB.apiBenchmark=apiBenchmark;

function enhanceBuilderPackage(){
 const form=document.querySelector("#builder-form");if(!form)return;
 form.addEventListener("submit",()=>{setTimeout(()=>{const task=document.querySelector("#task")?.value.trim();const t=(task||"").toLowerCase();const b=t.includes("door")?HB.behaviors[1]:t.includes("follow")?HB.behaviors[2]:t.includes("hand")?HB.behaviors[3]:HB.behaviors[0];const pkg={schemaVersion:"1.0",id:"generated-"+b.id,version:"1.0.0",name:task,category:b.category,description:task,steps:b.steps,metrics:b.metrics,visibility:"private",compatibleEngines:["simulation-harness","MuJoCo"],compatibleRobots:["generic-humanoid"],provenance:{source:"Behavior Builder",generatedAt:new Date().toISOString()}};const preview=document.querySelector("#package-preview");if(preview){preview.hidden=false;document.querySelector("#package-json").textContent=JSON.stringify(pkg,null,2);document.querySelector("#copy-package").onclick=()=>navigator.clipboard.writeText(JSON.stringify(pkg,null,2));const save=document.querySelector("#save-package");if(save){save.onclick=async()=>{const token=localStorage.getItem("hb_token"),status=document.querySelector("#save-status");if(!token){status.textContent="Sign in first to save a private behavior.";return}save.disabled=true;status.textContent="Saving…";try{const r=await fetch("/api/behaviors",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(pkg)}),d=await r.json();if(!r.ok)throw new Error(d.error||"Save failed");status.textContent="Saved as private v"+d.behavior.version+". Publish it from the Registry API when ready."}catch(e){status.textContent=e.message}finally{save.disabled=false}}}}},0)})}
document.addEventListener("DOMContentLoaded",()=>{registryLibrary();detail();dashboard();builder();enhanceBuilderPackage()});
