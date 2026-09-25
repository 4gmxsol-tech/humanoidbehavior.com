(()=>{"use strict";
const KEY="hb_preferences_v1";
const defaults={theme:"system",accent:"violet",density:"comfortable",motion:"full"};
const prefs={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};
const accents={violet:["#6d5dfc","#8b7cff"],cyan:["#0891b2","#22d3ee"],blue:["#2563eb","#60a5fa"],emerald:["#059669","#34d399"],orange:["#ea580c","#fb923c"]};
function save(){localStorage.setItem(KEY,JSON.stringify(prefs));apply();renderState()}
function apply(){
 const root=document.documentElement;
 root.dataset.theme=prefs.theme;
 root.dataset.density=prefs.density;
 root.dataset.motion=prefs.motion;
 const a=accents[prefs.accent]||accents.violet;
 root.style.setProperty("--hb-violet",a[0]);root.style.setProperty("--hb-violet-2",a[1]);
 root.style.setProperty("--hb-user-accent",a[0]);
}
function icon(name){return name==="sun"?"☀":name==="moon"?"☾":name==="system"?"◐":"⚙"}
function build(){
 if(document.querySelector(".hb-mobile-menu"))return;
 const nav=document.querySelector(".nav");if(!nav)return;
 const menu=document.createElement("button");menu.className="hb-mobile-menu";menu.type="button";menu.setAttribute("aria-label","Open navigation");menu.setAttribute("aria-expanded","false");menu.innerHTML="<span></span><span></span><span></span>";
 nav.insertBefore(menu,nav.querySelector(".nav-actions")||null);
 menu.onclick=()=>{const open=nav.classList.toggle("hb-menu-open");menu.setAttribute("aria-expanded",String(open))};
 const settings=document.createElement("button");settings.className="hb-settings-trigger";settings.type="button";settings.setAttribute("aria-label","Customize appearance");settings.innerHTML="⚙";
 settings.onclick=()=>document.querySelector(".hb-settings").classList.toggle("is-open");
 nav.querySelector(".nav-actions")?.appendChild(settings);
 const panel=document.createElement("aside");panel.className="hb-settings";panel.setAttribute("aria-label","Site customization");
 panel.innerHTML='<div class="hb-settings-head"><div><b>Appearance</b><span>Customize HumanoidBehavior</span></div><button type="button" class="hb-settings-close" aria-label="Close">×</button></div>'+
 '<div class="hb-setting"><label>Theme</label><div class="hb-segment" data-setting="theme"><button data-value="system">'+icon("system")+' System</button><button data-value="light">'+icon("sun")+' Light</button><button data-value="dark">'+icon("moon")+' Dark</button></div></div>'+
 '<div class="hb-setting"><label>Accent color</label><div class="hb-swatches" data-setting="accent">'+Object.keys(accents).map(k=>'<button data-value="'+k+'" class="hb-swatch hb-'+k+'" aria-label="'+k+'"></button>').join("")+'</div></div>'+
 '<div class="hb-setting"><label>Interface density</label><div class="hb-segment" data-setting="density"><button data-value="comfortable">Comfort</button><button data-value="compact">Compact</button></div></div>'+
 '<div class="hb-setting"><label>Motion</label><div class="hb-segment" data-setting="motion"><button data-value="full">Live</button><button data-value="reduced">Reduced</button></div></div>'+
 '<div class="hb-settings-note">Preferences are saved on this device and apply across the site.</div>';
 document.body.appendChild(panel);
 panel.querySelector(".hb-settings-close").onclick=()=>panel.classList.remove("is-open");
 panel.addEventListener("click",e=>{const b=e.target.closest("[data-value]");if(!b)return;const group=b.closest("[data-setting]");prefs[group.dataset.setting]=b.dataset.value;save()});
 document.addEventListener("click",e=>{if(!panel.contains(e.target)&&!e.target.closest(".hb-settings-trigger"))panel.classList.remove("is-open")});
}
function renderState(){document.querySelectorAll("[data-setting]").forEach(g=>g.querySelectorAll("[data-value]").forEach(b=>b.classList.toggle("selected",b.dataset.value===prefs[g.dataset.setting])))}
function init(){apply();build();renderState()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();