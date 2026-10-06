(function(){
"use strict";
function d(a,b){return a&&b?Math.hypot((a[0]||0)-(b[0]||0),(a[1]||0)-(b[1]||0),(a[2]||0)-(b[2]||0)):Infinity}
function states(frames){
 const a=[];let p=null,r=false;
 frames.forEach((f,i)=>{let s=i===0?"perceive":r?"verify":f.released?(r=true,"release"):f.grabbed?(d(f.object,f.target)>.055?"transport":"verify"):(d(f.hand,f.object)<.055?"grasp":"approach");if(s!==p){a.push({s,i,t:Number(f.t||0)});p=s}});
 if(a.length&&!a.some(x=>x.s==="verify"))a.push({s:"verify",i:frames.length-1,t:Number(frames.at(-1)?.t||0)});
 return a;
}
function mount(){
 const section=document.getElementById("live-simulation"),controls=section?.querySelector(".hb-replay-controls"),frames=window.__HB_LAST_REPLAY?.rawResults?.[0]?.metrics?.motionFrames;
 if(!controls||!frames?.length||document.getElementById("hb-timeline-pro"))return;
 const ev=states(frames),pro=document.createElement("div");pro.id="hb-timeline-pro";pro.className="hb-timeline-pro";
 const pct=e=>((frames.length>1?e.i/(frames.length-1):0)*100).toFixed(3);
 pro.innerHTML='<div class="hb-timeline-track"><div class="hb-timeline-line"></div>'+ev.map(e=>'<button class="hb-timeline-marker" data-index="'+e.i+'" data-state="'+e.s+'" style="left:'+pct(e)+'%" title="'+e.s.toUpperCase()+' · '+e.t.toFixed(2)+'s"></button>').join("")+'</div><div class="hb-timeline-labels">'+ev.map((e,n)=>'<span class="hb-timeline-label" data-n="'+n+'" style="left:'+pct(e)+'%">'+e.s.toUpperCase()+'</span>').join("")+'</div><div class="hb-timeline-legend"><span><i></i> transition</span><span><i class="release"></i> release</span><span><i class="verify"></i> verify</span></div>';
 controls.appendChild(pro);
 const timeline=document.getElementById("sim-timeline");
 pro.querySelectorAll(".hb-timeline-marker").forEach(b=>b.onclick=()=>{if(timeline){timeline.value=b.dataset.index;timeline.dispatchEvent(new Event("input",{bubbles:true}))}});
 const sync=()=>{const i=Number(timeline?.value||0);let n=0;ev.forEach((e,k)=>{if(i>=e.i)n=k});pro.querySelectorAll(".hb-timeline-marker").forEach((b,k)=>b.classList.toggle("active",k===n));pro.querySelectorAll(".hb-timeline-label").forEach((b,k)=>b.classList.toggle("active",k===n))};
 timeline?.addEventListener("input",sync);sync();
}
window.addEventListener("hb:replay-ready",mount);window.addEventListener("load",mount);
})();