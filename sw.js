const CACHE="hb-shell-v1";
const SHELL=["/","/index.html","/simulation.html","/experiment.html","/styles.css","/api-base.js","/browser-compute.js","/browser-compute-worker.js","/manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const u=new URL(event.request.url);
  if(u.origin!==location.origin || u.pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{
    if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
    return r;
  }).catch(()=>cached)));
});
