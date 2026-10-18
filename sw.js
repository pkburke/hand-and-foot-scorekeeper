const CACHE='hand-foot-v3-3-2';
const FILES=['./','./index.html','./styles.css','./app.mjs','./scoring.mjs','./data.mjs','./games.mjs','./manifest.webmanifest','./icons/icon.svg','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hand-foot-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(async response=>{
    if(response.ok){
      // Complete writes during this event. Cache failures must not break an online response.
      try{const cache=await caches.open(CACHE);await cache.put(event.request,response.clone())}catch{}
    }
    return response;
  }).catch(async()=>{
    try{return await caches.match(event.request)||Response.error()}catch{return Response.error()}
  }));
});
