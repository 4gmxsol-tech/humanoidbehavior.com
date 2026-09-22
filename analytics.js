(()=> {
  const key="hb_visitor_id";
  const apiOrigin=window.HB_API_ORIGIN || location.origin;
  let visitorId="";
  try {
    visitorId=localStorage.getItem(key)||crypto.randomUUID();
    localStorage.setItem(key,visitorId);
  } catch(_) {}
  const send=(eventType,metadata={})=>{
    const payload={eventType,page:location.pathname+location.search,referrer:document.referrer,visitorId,metadata};
    try {
      fetch(apiOrigin+"/api/analytics/event",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
        keepalive:true,
        credentials:"omit"
      }).catch(()=>{});
    } catch(_) {}
  };
  send("pageview");
  document.addEventListener("click",e=>{
    const a=e.target.closest?.("a");
    if(!a)return;
    const href=a.getAttribute("href")||"";
    if(href.includes("wa.me"))send("whatsapp");
    else if(/contact\.html|mailto:/i.test(href))send("contact");
    else if(/pricing\.html/i.test(href))send("click",{target:"pricing"});
    else if(/login\.html/i.test(href))send("signup",{target:"login"});
    else if(/benchmark|simulation|experiment/i.test(href))send("benchmark",{target:href});
  },{passive:true});
})();