(()=> {
  const page=document.querySelector(".hb-animation-page");
  const lamp=document.querySelector(".scene-lamp");
  if(!page||!lamp||lamp.dataset.controlsReady)return;
  lamp.dataset.controlsReady="1";
  const palette=["#f5b85e","#55d9e8","#d77bff","#73e5a2","#f3f4ed"];
  const switchButton=lamp.querySelector(".lamp-switch");
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let colorIndex=0,isOff=false,startY=0,lastY=0,pointerId=null,dragged=false;
  const setColor=color=>document.documentElement.style.setProperty("--lamp-color",color);
  const cycleColor=()=>{colorIndex=(colorIndex+1)%palette.length;setColor(palette[colorIndex]);};
  const setPower=off=>{
    isOff=off;page.classList.toggle("lamp-is-off",isOff);
    lamp.setAttribute("aria-label",isOff?"Lamp is off. Drag up to turn on; press the button to change its color.":"Lamp is on. Drag down to turn off; press the button to change its color.");
  };
  switchButton.addEventListener("click",()=>{cycleColor();if(isOff)setPower(false);});
  lamp.addEventListener("pointerdown",e=>{
    if(e.target.closest(".lamp-switch"))return;
    if(e.pointerType==="mouse"&&e.button!==0)return;
    pointerId=e.pointerId;startY=e.clientY;lastY=startY;dragged=false;
    lamp.classList.add("is-dragging");
    try{lamp.setPointerCapture(pointerId)}catch{}
  });
  lamp.addEventListener("pointermove",e=>{
    if(pointerId!==e.pointerId)return;
    lastY=e.clientY;
    if(Math.abs(lastY-startY)>7)dragged=true;
    if(dragged){const delta=Math.max(-45,Math.min(65,lastY-startY));lamp.style.transform="translateY("+delta*.18+"px)";}
  });
  const finishDrag=e=>{
    if(pointerId!==e.pointerId)return;
    const delta=lastY-startY;
    if(dragged&&Math.abs(delta)>35)setPower(delta>0);
    pointerId=null;lamp.classList.remove("is-dragging");lamp.style.transform="";
  };
  lamp.addEventListener("pointerup",finishDrag);
  lamp.addEventListener("pointercancel",finishDrag);
  lamp.addEventListener("keydown",e=>{
    if(e.target.closest("button"))return;
    if(e.key==="ArrowDown"){e.preventDefault();setPower(true);}
    if(e.key==="ArrowUp"){e.preventDefault();setPower(false);}
    if(e.key===" "||e.key==="Enter"){e.preventDefault();cycleColor();}
  });
  if(!reduce)setInterval(()=>{if(!isOff)cycleColor()},5000);
})();