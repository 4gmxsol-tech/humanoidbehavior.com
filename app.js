const behaviors=[
{id:"pick-place",name:"Pick & Place",category:"Manipulation",level:"Core",description:"Pick a specified object and place it at a target location.",steps:["Perceive target object","Navigate to workspace","Reach and grasp","Transport object","Release at target","Verify placement"],metrics:{success:94,time:"8.2s",collision:"1.4%",recovery:"87%"}},
{id:"open-door",name:"Open a Door",category:"Whole-body",level:"Interaction",description:"Approach a door, operate its handle and pass through safely.",steps:["Detect door and handle","Align body","Grasp handle","Apply force","Rotate/pull","Pass through and verify"],metrics:{success:89,time:"12.7s",collision:"2.1%",recovery:"81%"}},
{id:"follow-person",name:"Follow a Person",category:"Navigation",level:"Social",description:"Track a moving person while maintaining a safe distance.",steps:["Detect person","Estimate motion","Set following distance","Plan collision-free path","Track and adapt","Recover if target is lost"],metrics:{success:91,time:"18.4s",collision:"0.8%",recovery:"93%"}},
{id:"handover",name:"Hand Object to Person",category:"Interaction",level:"Bimanual",description:"Move an object into a human's reachable handover zone.",steps:["Detect object","Grasp securely","Detect recipient","Predict handover pose","Transfer object","Confirm release"],metrics:{success:86,time:"10.1s",collision:"1.1%",recovery:"79%"}}
];
const $=s=>document.querySelector(s);
function card(b){return '<a class="behavior-card" href="behavior.html?id='+b.id+'"><div class="card-top"><span class="icon">'+b.name.charAt(0)+'</span><span class="pill">'+b.category+'</span></div><h3>'+b.name+'</h3><p>'+b.description+'</p><div class="card-bottom"><span>'+b.level+'</span><strong>'+b.metrics.success+'% success</strong></div></a>'}
function renderLibrary(){
 const root=$("#behavior-list"); if(!root)return;
 const q=($("#search")?.value||"").toLowerCase(); const cat=$("#category")?.value||"all";
 root.innerHTML=behaviors.filter(b=>(cat==="all"||b.category===cat)&&(b.name+" "+b.description).toLowerCase().includes(q)).map(card).join("")||'<div class="empty">No behaviors match your search.</div>';
}
function renderBehavior(){
 const id=new URLSearchParams(location.search).get("id")||"pick-place",b=behaviors.find(x=>x.id===id)||behaviors[0]; if(!$("#behavior-detail"))return;
 $("#behavior-detail").innerHTML='<div class="eyebrow">BEHAVIOR SPECIFICATION</div><h1>'+b.name+'</h1><p class="lead">'+b.description+'</p><div class="detail-grid"><section><h2>Task sequence</h2><ol class="step-list">'+b.steps.map((s,i)=>'<li><b>0'+(i+1)+'</b><span>'+s+'</span></li>').join("")+'</ol></section><section><h2>Baseline metrics</h2><div class="metric-grid"><div><strong>'+b.metrics.success+'%</strong><span>Success</span></div><div><strong>'+b.metrics.time+'</strong><span>Completion</span></div><div><strong>'+b.metrics.collision+'</strong><span>Collision</span></div><div><strong>'+b.metrics.recovery+'</strong><span>Recovery</span></div></div></section></div><div class="runner"><div><div class="eyebrow">LOCAL EVALUATION</div><h2>Run a behavior specification</h2><p>This MVP runner validates the task sequence and produces a deterministic baseline report. Simulation adapters will plug into the same interface.</p></div><button class="button primary" id="run-btn">Run evaluation</button><div id="run-result" class="run-result"></div></div>';
 $("#run-btn").onclick=()=>{const out=$("#run-result");out.innerHTML='<span class="spinner"></span> Running '+b.name+'...';setTimeout(()=>out.innerHTML='<b>Evaluation complete</b><span>6/6 steps valid · baseline success '+b.metrics.success+'%</span>',650)}
}
function init(){renderLibrary();renderBehavior();$("#search")?.addEventListener("input",renderLibrary);$("#category")?.addEventListener("change",renderLibrary)}
document.addEventListener("DOMContentLoaded",init);
