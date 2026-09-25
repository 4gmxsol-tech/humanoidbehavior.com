(()=>{"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function palette(){
 if(document.querySelector(".hb-command"))return;
 const p=document.createElement("div");p.className="hb-command";p.innerHTML='<div class="hb-command-backdrop"></div><div class="hb-command-panel" role="dialog" aria-modal="true" aria-label="Command palette"><div class="hb-command-head"><span>⌘</span><input autocomplete="off" placeholder="Search HumanoidBehavior…" aria-label="Search"></div><div class="hb-command-list"></div><div class="hb-command-foot"><span>↑↓ Navigate</span><span>Enter Open</span><span>Esc Close</span></div></div>';document.body.appendChild(p);
 const items=[
  ["Open Workspace","dashboard.html","⌘ Workspace"],["Behaviors","behaviors.html","Library"],["New Evaluation","simulation.html","Run benchmark"],["Benchmark","benchmark.html","Experiments"],["Documentation","docs.html","API & guides"],["Plans","pricing.html","Pricing"],["Contact","contact.html","Contact"],["Home","index.html","Landing"]
 ];
 const input=p.querySelector("input"),list=p.querySelector(".hb-command-list");let active=0;
 function render(q=""){const a=items.filter(x=>(x[0]+" "+x[2]).toLowerCase().includes(q.toLowerCase()));active=Math.min(active,a.length-1);list.innerHTML=a.map((x,i)=>'<a class="hb-command-item '+(i===active?"active":"")+'" href="'+x[1]+'"><span class="hb-command-icon">'+x[2].charAt(0)+'</span><span><b>'+esc(x[0])+'</b><small>'+esc(x[2])+'</small></span><kbd>↵</kbd></a>').join("")||'<div class="hb-command-empty">No matching destination.</div>'}
 function open(){p.classList.add("is-open");input.value="";render();setTimeout(()=>input.focus(),20)}
 function close(){p.classList.remove("is-open")}
 window.HBCommand={open,close};
 render();input.oninput=()=>render(input.value);p.querySelector(".hb-command-backdrop").onclick=close;
 input.onkeydown=e=>{const links=[...list.querySelectorAll("a")];if(e.key==="ArrowDown"){e.preventDefault();active=Math.min(active+1,links.length-1);render(input.value)}else if(e.key==="ArrowUp"){e.preventDefault();active=Math.max(active-1,0);render(input.value)}else if(e.key==="Enter"&&links[active])links[active].click();else if(e.key==="Escape")close()};
 document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open()}if(e.key==="Escape")close()});
 const nav=document.querySelector(".nav");if(nav&&!nav.querySelector(".hb-command-trigger")){const b=document.createElement("button");b.className="hb-command-trigger";b.type="button";b.innerHTML="⌘K";b.setAttribute("aria-label","Open command palette");b.onclick=open;nav.querySelector(".nav-actions")?.insertBefore(b,nav.querySelector(".hb-settings-trigger")||null)}
}
function workspace(){
 const page=document.querySelector(".dashboard-page");if(!page||page.querySelector(".workspace-commandbar"))return;
 const grid=page.querySelector(".workspace-grid");
 const hero=document.createElement("div");hero.className="workspace-commandbar";hero.innerHTML='<div><span class="eyebrow">ROBOTICS CONTROL CENTER</span><h2>Workspace</h2><p>One place for behaviors, experiments, evidence and developer access.</p></div><div class="workspace-actions"><a class="button primary" href="simulation.html">＋ New evaluation</a><button class="button secondary" id="workspace-command">⌘K Command</button></div>';
 page.insertBefore(hero,grid);
 const rail=document.createElement("div");rail.className="workspace-status-rail";rail.innerHTML='<div><span class="status-node live"></span><b>Workspace</b><small>Connected</small></div><i></i><div><span class="status-node"></span><b>Compute</b><small>Browser MuJoCo</small></div><i></i><div><span class="status-node"></span><b>Evidence</b><small>Persisted runs</small></div><i></i><div><span class="status-node"></span><b>API</b><small>Developer ready</small></div>';
 page.insertBefore(rail,grid);
 document.getElementById("workspace-command")?.addEventListener("click",()=>window.HBCommand?.open());
}
function init(){palette();workspace()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();