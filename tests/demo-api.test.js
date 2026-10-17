import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {request as httpRequest} from 'node:http';

const page={id:'sample',name:'Página',width:1080,height:1080,background:'#ffffff',elements:[]};
const password='demo-test-password-long-enough';
const config={provider:'ollama',baseUrl:'http://inference:11434',model:'fixture'};
async function setup(t,options={}) {
  const dataDir=await mkdtemp(join(tmpdir(),'crow-demo-api-'));
  let clock=Date.now(),app,base;
  const start=async()=>{
    app=createApp({password,secret:'persistent-demo-test-secret',dataDir,trustedProxyIps:'127.0.0.1',aiConfig:config,clock:()=>clock,generateDesign:async input=>({message:'Proposta criada.',page:input.page}),...options});
    await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${app.server.address().port}`;
  };
  await start();
  t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
  return {
    request:async(path='/api/demo/ai/design',body={prompt:'Cartaz de café',page},headers={},method='POST')=>{
      const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Real-IP':'198.51.100.10',...headers},body:method==='GET'?undefined:JSON.stringify(body)});
      return {status:r.status,body:await r.json(),headers:r.headers};
    },
    restart:async()=>{await app.close();await start();},
    getBase:()=>base,
    advance:ms=>{clock+=ms;}
  };
}
test('anonymous generation has a separate public status and cannot read private data',async t=>{
  const {request}=await setup(t);
  const status=await request('/api/demo/ai/status',undefined,{},'GET');
  assert.equal(status.status,200);assert.equal(status.body.configured,true);
  assert.ok(!JSON.stringify(status.body).includes('http://inference'));
  assert.equal((await request()).status,200);
  assert.equal((await request('/api/projects',undefined,{},'GET')).status,401);
  assert.equal((await request('/api/demo/projects',undefined,{},'GET')).status,404);
  const login=await request('/api/session',{password});
  assert.equal(login.status,200);
  const privateProjects=await request('/api/projects',undefined,{Cookie:login.headers.get('set-cookie').split(';')[0]},'GET');
  assert.deepEqual(privateProjects.body.projects,[]);
});
test('demo input and origin failures consume no generation allowance',async t=>{
  const {request}=await setup(t);
  const invalid=[{prompt:'x'.repeat(801),page},{prompt:'Coffee',page:{...page,width:1921}},{prompt:'Coffee',page:{...page,elements:[{id:'picture',type:'image',x:0,y:0,w:100,h:100,src:'data:image/png;base64,AAAA'}]}}];
  for(const input of invalid)assert.equal((await request(undefined,input)).status,400);
  assert.equal((await request(undefined,undefined,{Origin:'https://foreign.example'})).status,403);
  assert.equal((await request(undefined,{prompt:'a'.repeat(66000),page})).status,413);
  assert.equal((await request()).status,200);assert.equal((await request()).status,200);
  const limited=await request();assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>0);
});
test('normalized client quotas survive restart and cannot be bypassed by mapped IPv6',async t=>{
  const {request,restart}=await setup(t);
  assert.equal((await request()).status,200);assert.equal((await request()).status,200);
  await restart();
  assert.equal((await request(undefined,undefined,{'X-Real-IP':'::ffff:198.51.100.10'})).status,429);
  assert.equal((await request(undefined,undefined,{'X-Real-IP':'198.51.100.20'})).status,200);
});
test('demo enforces persisted hourly and daily global budgets across different clients',async t=>{
  const {request,advance,restart}=await setup(t);
  let used=0;
  for(let hour=0;hour<4;hour++) {
    const count=hour===3?6:8;
    for(let i=0;i<count;i++) {
      const r=await request(undefined,undefined,{'X-Real-IP':`198.51.100.${20+i}`});
      assert.equal(r.status,200);used++;
    }
    const blocked=await request(undefined,undefined,{'X-Real-IP':'203.0.113.80'});
    assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('retry-after'))>0);
    if(hour<3)advance(3600001);
  }
  assert.equal(used,30);await restart();advance(3600001);
  assert.equal((await request(undefined,undefined,{'X-Real-IP':'203.0.113.90'})).status,429);
  advance(24*3600000);assert.equal((await request()).status,200);
});
test('demo and private generations share one generation slot',async t=>{
  let started,release;const didStart=new Promise(resolve=>started=resolve);
  const {request}=await setup(t,{generateDesign:async(input,_config,{signal})=>{
    started();await new Promise(resolve=>{release=resolve;signal.addEventListener('abort',resolve,{once:true});});return {message:'Pronto.',page:input.page};
  }});
  const first=request();assert.equal(await Promise.race([didStart.then(()=>'started'),first]),'started');
  const login=await request('/api/session',{password});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const blocked=await request('/api/ai/design',{prompt:'Outro cartaz',page},{Cookie:cookie});
  assert.equal(blocked.status,429);release();assert.equal((await first).status,200);
});
test('untrusted clients cannot evade public quotas with spoofed forwarding headers',async t=>{
  const {request}=await setup(t,{trustedProxyIps:'192.0.2.200'});
  for(let i=0;i<2;i++)assert.equal((await request(undefined,undefined,{'X-Real-IP':`198.51.100.${i+1}`})).status,200);
  assert.equal((await request(undefined,undefined,{'X-Real-IP':'198.51.100.200'})).status,429);
});
test('closing a public generation cancels its work and keeps its consumed allowance',async t=>{
  let calls=0,started,stopped;
  const didStart=new Promise(resolve=>started=resolve),didStop=new Promise(resolve=>stopped=resolve);
  const {request,getBase}=await setup(t,{generateDesign:async(input,_config,{signal})=>{
    if(++calls===1){started();await new Promise(resolve=>signal.addEventListener('abort',()=>{resolve();stopped();},{once:true}));}
    return {message:'Pronto.',page:input.page};
  }});
  const controller=new AbortController();
  const first=fetch(getBase()+'/api/demo/ai/design',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','X-Real-IP':'198.51.100.10'},body:JSON.stringify({prompt:'Cartaz de café',page})}).catch(()=>{});
  await didStart;controller.abort();await first;await didStop;await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await request()).status,200);assert.equal((await request()).status,429);
});
test('chunked demo uploads receive a clear body-limit response',async t=>{
  const {getBase}=await setup(t);
  const payload=JSON.stringify({prompt:'a'.repeat(66000),page});
  const status=await new Promise((resolve,reject)=>{
    const req=httpRequest(getBase()+'/api/demo/ai/design',{method:'POST',headers:{'Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>{req.end();resolve(res.statusCode);});});
    req.setTimeout(2000,()=>req.destroy(new Error('No body-limit response')));
    req.on('error',reject);req.write(payload);
  });
  assert.equal(status,413);
});
