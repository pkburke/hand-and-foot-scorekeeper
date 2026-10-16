import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function worker(options={}){
  const handlers={},deleted=[],added=[],puts=[],requests=[];
  const cache={addAll:async files=>added.push(...files),put:async(...args)=>{if(options.cacheFails)throw Error('Cache denied');puts.push(args)}};
  const caches={open:async()=>{if(options.cacheOpenFails)throw Error('Cache denied');return cache},keys:async()=>['another-app-cache','hand-foot-v3-0-2-zoomfix'],delete:async key=>deleted.push(key),match:async()=>options.cached};
  const self={addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}},location:{origin:'https://example.test'}};
  const context=vm.createContext({self,caches,URL,Response,Request:class {constructor(url,init){this.url=url;this.cache=init.cache}},fetch:async(...args)=>{requests.push(args);if(options.offline)throw Error('Offline');return new Response('online')}});
  vm.runInContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),context);
  return {handlers,deleted,added,puts,requests,async fetch(request={method:'GET',url:'https://example.test/app.mjs'}){let promise;handlers.fetch({request,respondWith:value=>promise=value});return promise}};
}
test('Installation bypasses stale HTTP caches and includes every required local file',async()=>{
  const sw=worker();let pending;sw.handlers.install({waitUntil:p=>pending=p});await pending;
  assert.ok(sw.added.some(request=>request.url==='./data.mjs'));
  for(const request of sw.added){assert.equal(request.cache,'reload');assert.ok(fs.existsSync(new URL('../'+request.url,import.meta.url)))}
});
test('Activation only removes this app’s old caches',async()=>{
  const sw=worker();let pending;sw.handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(sw.deleted,['hand-foot-v3-0-2-zoomfix']);
});
test('Online fetch revalidates HTTP cache and completes its offline-cache write',async()=>{
  const sw=worker();assert.equal(await(await sw.fetch()).text(),'online');assert.equal(sw.requests[0][1].cache,'no-cache');assert.equal(sw.puts.length,1);
});
test('Cache write/open failure does not break a successful online request',async()=>{
  for(const options of [{cacheFails:true},{cacheOpenFails:true}])assert.equal(await(await worker(options).fetch()).text(),'online');
});
test('Offline fetch serves saved data; a cache miss gives a network error response',async()=>{
  const cached=new Response('offline copy');assert.equal(await(await worker({offline:true,cached}).fetch()).text(),'offline copy');
  assert.equal((await worker({offline:true}).fetch()).type,'error');
});
test('Cross-origin and non-GET requests are left alone',async()=>{
  const sw=worker();assert.equal(await sw.fetch({method:'POST',url:'https://example.test/'}),undefined);assert.equal(await sw.fetch({method:'GET',url:'https://other.test/'}),undefined);assert.equal(sw.requests.length,0);
});
