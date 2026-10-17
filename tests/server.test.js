import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {request as httpRequest} from 'node:http';
import {createDocument} from '../shared/scene.js';
import {templates} from '../shared/templates.js';

const password='test-password-very-long-92827';
async function setup(t,extra={}) {
  const dataDir=await mkdtemp(join(tmpdir(),'crow-test-'));
  const app=createApp({password,dataDir,...extra});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
  let cookie='';
  const request=async(path,method='GET',body,headers={})=>{
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:body===undefined?undefined:JSON.stringify(body)});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,body:await r.json(),headers:r.headers};
  };
  return {app,request,base,dataDir};
}
test('workspace requires a password and successful session uses protected cookies',async t=>{
  const {request}=await setup(t);
  assert.equal((await request('/api/projects')).status,401);
  assert.equal((await request('/api/session','POST',{password:'incorrect'})).status,401);
  const login=await request('/api/session','POST',{password});
  assert.equal(login.status,200);
  assert.match(login.headers.get('set-cookie'),/HttpOnly/);
  assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
  assert.equal((await request('/api/session')).body.authenticated,true);
  assert.equal((await request('/api/session','DELETE')).status,200);
  assert.equal((await request('/api/projects')).status,401);
});
test('creates, updates, lists, favorites and deletes a persisted project',async t=>{
  const {request}=await setup(t);
  await request('/api/session','POST',{password});
  const doc=createDocument(templates[0]);
  const created=await request('/api/projects','POST',{document:doc});
  assert.equal(created.status,201);
  assert.equal(created.body.revision,1);
  const id=created.body.id;
  const updated=await request(`/api/projects/${id}`,'PUT',{document:{...doc,name:'Nova ideia'},revision:1,favorite:true});
  assert.equal(updated.status,200);
  assert.equal(updated.body.revision,2);
  assert.equal((await request(`/api/projects/${id}`)).body.document.name,'Nova ideia');
  const list=(await request('/api/projects')).body.projects;
  assert.equal(list.length,1);
  assert.equal(list[0].favorite,true);
  assert.equal(list[0].name,'Nova ideia');
  assert.equal((await request(`/api/projects/${id}`,'DELETE', {revision:2})).status,200);
  assert.equal((await request(`/api/projects/${id}`)).status,404);
});
test('two tabs cannot silently overwrite each other',async t=>{
  const {request}=await setup(t);
  await request('/api/session','POST',{password});
  const document=createDocument(templates[1]);
  const {body:p}=await request('/api/projects','POST',{document});
  assert.equal((await request(`/api/projects/${p.id}`,'PUT',{document,revision:1})).status,200);
  assert.equal((await request(`/api/projects/${p.id}`,'PUT',{document:{...document,name:'Stale tab'},revision:1})).status,409);
  assert.equal((await request(`/api/projects/${p.id}`,'DELETE',{revision:1})).status,409);
  assert.equal((await request(`/api/projects/${p.id}`)).body.document.name,document.name);
});
test('rejects foreign origins, invalid documents and unexpected mutation content types',async t=>{
  const {request,base}=await setup(t);
  assert.equal((await request('/api/session','POST',{password},{Origin:'https://attacker.example'})).status,403);
  await request('/api/session','POST',{password},{Origin:base});
  assert.equal((await request('/api/projects','POST',{document:{pages:[]}})).status,400);
  assert.equal((await request('/api/brand','PUT',{name:'Example',colors:['url(bad)'],fontFamily:'Arial'})).status,400);
  assert.equal((await request('/api/projects','POST',{}, {'Content-Type':'text/plain'})).status,415);
  assert.equal((await request('/api/projects','POST',null)).status,400);
  assert.equal((await request('/api/projects','POST',{}, {Origin:'null'})).status,403);
});
test('rate limits repeated failed login attempts',async t=>{
  const {request}=await setup(t);
  for(let i=0;i<10;i++)await request('/api/session','POST',{password:'wrong'});
  assert.equal((await request('/api/session','POST',{password:'wrong'})).status,429);
});
test('trusted proxies keep forwarded login limits separate for distinct clients',async t=>{
  const {request}=await setup(t,{trustedProxyIps:'192.0.2.200, ::ffff:127.0.0.1'});
  for(let i=0;i<10;i++)assert.equal((await request('/api/session','POST',{password:'wrong'},{'X-Real-IP':'198.51.100.10'})).status,401);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'198.51.100.10'})).status,429);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'198.51.100.20'})).status,200);
});
test('untrusted proxies cannot bypass login limits with spoofed client addresses',async t=>{
  const {request}=await setup(t,{trustedProxyIps:'192.0.2.200'});
  for(let i=0;i<10;i++)assert.equal((await request('/api/session','POST',{password:'wrong'},{'X-Real-IP':`198.51.100.${i+1}`})).status,401);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'198.51.100.200'})).status,429);
});
test('forwarded login addresses require one valid IP from a trusted proxy',async t=>{
  const {request}=await setup(t,{trustedProxyIps:'127.0.0.1'});
  const invalid=['198.51.100.1, 198.51.100.2','client.example','198.51.100.1:1234','999.1.1.1'];
  for(let i=0;i<10;i++)assert.equal((await request('/api/session','POST',{password:'wrong'},{'X-Real-IP':invalid[i%invalid.length]})).status,401);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'invalid.example'})).status,429);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'198.51.100.20'})).status,200);
});
test('forwarded login limits treat IPv4 and mapped IPv6 as the same client',async t=>{
  const {request}=await setup(t,{trustedProxyIps:'127.0.0.1'});
  for(let i=0;i<10;i++)assert.equal((await request('/api/session','POST',{password:'wrong'},{'X-Real-IP':i%2?'::ffff:198.51.100.10':'198.51.100.10'})).status,401);
  assert.equal((await request('/api/session','POST',{password},{'X-Real-IP':'::ffff:198.51.100.10'})).status,429);
});
test('invalid trusted proxy configuration is rejected before startup',async t=>{
  for(const trustedProxyIps of ['127.0.0.1,proxy.example','127.0.0.0/8','*'])await t.test(trustedProxyIps,async t=>{
    const dataDir=await mkdtemp(join(tmpdir(),'crow-test-'));let app;
    t.after(async()=>{if(app)await app.close();await rm(dataDir,{recursive:true,force:true});});
    assert.throws(()=>{app=createApp({password,dataDir,trustedProxyIps});},/TRUSTED_PROXY_IPS/);
  });
});
test('health is public and AI status never exposes credentials',async t=>{
  const {request}=await setup(t,{aiConfig:{apiKey:'secret-test-key',baseUrl:'http://localhost:11434/v1',model:'qwen-test'}});
  assert.equal((await request('/healthz')).body.status,'ok');
  await request('/api/session','POST',{password});
  const status=await request('/api/ai/status');
  assert.equal(status.body.configured,true);
  assert.ok(!JSON.stringify(status.body).includes('secret-test-key'));
});
test('overlapping AI request uploads cannot bypass the single-generation slot',async t=>{
  let running=0,maxRunning=0,release;
  const {base}=await setup(t,{aiConfig:{apiKey:'fixture',baseUrl:'http://fixture',model:'fixture'},generateDesign:async()=>{running++;maxRunning=Math.max(maxRunning,running);await new Promise(r=>release=r);running--;return {message:'ok',page:createDocument(templates[0]).pages[0]};}});
  const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  const cookie=login.headers.get('set-cookie').split(';')[0],payload=JSON.stringify({prompt:'Design',page:createDocument(templates[0]).pages[0]});
  const start=()=>{let request;const response=new Promise((resolve,reject)=>{request=httpRequest(base+'/api/ai/design',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});request.on('error',reject);request.write(payload.slice(0,10));});return {request,response};};
  const first=start(),second=start();await new Promise(r=>setTimeout(r,30));
  first.request.end(payload.slice(10));second.request.end(payload.slice(10));
  await new Promise(r=>setTimeout(r,40));
  const beforeRelease=maxRunning;release?.();
  // A correct server returns 429 for one upload; an incorrect one starts two.
  assert.equal(beforeRelease,1);
  assert.deepEqual((await Promise.all([first.response,second.response])).sort(),[200,429]);
});
test('closing an AI response aborts generation and releases the workspace slot',async t=>{
  let aborted=false,started;const didStart=new Promise(r=>started=r);
  const {base}=await setup(t,{aiConfig:{apiKey:'fixture',baseUrl:'http://fixture',model:'fixture'},generateDesign:async(_input,_config,{signal}={})=>{
    started();await new Promise(resolve=>{if(signal)signal.addEventListener('abort',()=>{aborted=true;resolve();},{once:true});else setTimeout(resolve,180);});return {message:'done',page:createDocument(templates[0]).pages[0]};
  }});
  const login=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  const cookie=login.headers.get('set-cookie').split(';')[0],controller=new AbortController();
  const pending=fetch(base+'/api/ai/design',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({prompt:'Design',page:createDocument(templates[0]).pages[0]})}).catch(()=>{});
  await didStart;controller.abort();await pending;await new Promise(r=>setTimeout(r,60));
  assert.equal(aborted,true);
});
