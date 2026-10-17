import test from 'node:test';
import assert from 'node:assert/strict';
import {isDemoMode,demoApi} from '../src/demo.ts';
import {createDocument} from '../shared/scene.js';
import {templates} from '../shared/templates.js';

function browser(t){
  const originalWindow=globalThis.window,originalFetch=globalThis.fetch,values=new Map(),requests=[];
  globalThis.window={location:{pathname:'/demo'},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify({configured:true,message:'ok',page:templates[0].page}),{headers:{'Content-Type':'application/json'}});};
  t.after(()=>{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;globalThis.fetch=originalFetch;});
  return requests;
}
test('demo mode matches only its exact route',t=>{
  browser(t);
  for(const path of ['/demo','/demo/']){window.location.pathname=path;assert.equal(isDemoMode(),true);}
  for(const path of ['/','/demo-private','/demonstracao']){window.location.pathname=path;assert.equal(isDemoMode(),false);}
});
test('demo project operations never use private HTTP endpoints',async t=>{
  const requests=browser(t);
  assert.equal((await demoApi('/session')).authenticated,true);
  const created=await demoApi('/projects',{method:'POST',body:JSON.stringify({document:createDocument(templates[0])})});
  assert.equal((await demoApi('/projects')).projects[0].id,created.id);
  assert.equal(requests.length,0);
});
test('demo generation and status use only public routes without credentials',async t=>{
  const requests=browser(t);
  await demoApi('/ai/status');
  await demoApi('/ai/design',{method:'POST',body:JSON.stringify({prompt:'Um evento cultural',page:templates[0].page})});
  assert.deepEqual(requests.map(request=>request.url),['/api/demo/ai/status','/api/demo/ai/design']);
  assert.ok(requests.every(request=>request.options.credentials==='omit'));
});
