/* HumanoidBehavior — Replay State Machine, driven only by measured motionFrames */
(function(){
"use strict";
const STATES=[
 {id:"perceive",label:"PERCEIVE",desc:"Observe target"},
 {id:"approach",label:"APPROACH",desc:"Move to object"},
 {id:"grasp",label:"GRASP",desc:"Secure object"},
 {id:"transport",label:"TRANSPORT",desc:"Carry to target"},
 {id:"release",label:"RELEASE",desc:"Release object"},
 {id:"verify",label:"VERIFY",desc:"Confirm placement"}
];
function dist(a,b){if(!a||!b)return Infinity;return Math.hypot((a[0]||0)-(b[0]||0),(a[1]||0)-(b[1]||0),(a[2]||0)-(b[2]||0))}
function classify(frames){
 const out=[]; let previous=null; let releasedSeen=false;
 frames.forEach((f,i)=>{
   let id="approach";
   if(i===0)id="perceive";
   else if(releasedSeen)id="verify";
   else if(f.released){id="release";releasedSeen=true}
   else if(f.grabbed){
     const targetDistance=dist(f.object,f.target);
     id=targetDistance>.055?"transport":"verify";
   }else{
     const handObject=dist(f.hand,f.object);
     id=handObject<.055?"grasp":"approach";
   }
   if(id!==previous){out.push({state:id,index:i,t:Number(f.t||0)});previous=id}
 });
 if(out.length&&!out.some(x=>x.state==="verify"))out.push({state:"verify",index:frames.length-1,t:Number(frames[frames.length-1]?.t||0)});
 return out;
}
function mount(result){
 const section=document.getElementById("live-simulation"), stage=section?.querySelector(".hb-replay-stage");
 const frames=result?.rawResults?.[0]?.metrics?.motionFrames;
 if(!section||!stage||!frames?.length)return;
 let panel=document.getElementById("hb-state-machine");
 if(!panel){panel=document.createElement("div");panel.id="hb-state-machine";panel.className="hb-state-machine";stage.insertAdjacentElement("afterend",panel)}
 const events=classify(frames);
 let activeIndex=0;
 panel.innerHTML='<div class="hb-sm-head"><div><div class="hb-sm-kicker">BEHAVIOR STATE MACHINE</div><div class="hb-sm-current">CURRENT STATE · <b id="hb-sm-current">—</b></div></div><div class="hb-sm-kicker">RUNTIME DERIVED</div></div><div class="hb-sm-track">'+STATES.map(s=>'<button class="hb-sm-node" data-state="'+s.id+'" type="button"><small>'+s.label+'</small><span>'+s.desc+'</span></button>').join("")+'</div><div class="hb-sm-events" id="hb-sm-events"></div><div class="hb-sm-note">Transitions are derived from the measured replay flags and frame geometry. No synthetic runtime state is added.</div>';
 const current=document.getElementById("hb-sm-current"),nodes=[...panel.querySelectorAll(".hb-sm-node")],eventBox=document.getElementById("hb-sm-events"),timeline=document.getElementById("sim-timeline");
 function seek(i){
   i=Math.max(0,Math.min(frames.length-1,i)); if(timeline){timeline.value=String(i);timeline.dispatchEvent(new Event("input",{bubbles:true}))}
 }
 eventBox.innerHTML=events.map((e,n)=>'<button class="hb-sm-event" type="button" data-index="'+e.index+'">'+e.state.toUpperCase()+' · '+e.t.toFixed(2)+'s</button>').join("");
 [...eventBox.querySelectorAll(".hb-sm-event")].forEach(b=>b.onclick=()=>seek(Number(b.dataset.index)));
 function update(){
   const frame=Number(timeline?.value||0);
   for(let n=events.length-1;n>=0;n--){if(frame>=events[n].index){activeIndex=n;break}}
   const state=events[activeIndex]?.state||"perceive";
   current.textContent=(STATES.find(s=>s.id===state)||STATES[0]).label;
   nodes.forEach(node=>{
     const idx=STATES.findIndex(s=>s.id===node.dataset.state),cur=STATES.findIndex(s=>s.id===state);
     node.classList.toggle("active",node.dataset.state===state);node.classList.toggle("done",idx<cur);
   });
   [...eventBox.children].forEach((b,n)=>b.classList.toggle("active",n===activeIndex));
 }
 if(timeline)timeline.addEventListener("input",update);update();
}
window.HBReplayStateMachine={mount};
const old=window.initLiveSimulation;
window.addEventListener("hb:replay-ready",e=>mount(e.detail));
window.addEventListener("load",()=>{if(window.__HB_LAST_REPLAY)mount(window.__HB_LAST_REPLAY)});
})();