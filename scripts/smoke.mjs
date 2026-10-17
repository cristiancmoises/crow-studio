import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createDocument} from '../shared/scene.js';
import {templates} from '../shared/templates.js';

const directory=await mkdtemp(join(tmpdir(),'crow-smoke-')),password=randomBytes(24).toString('hex'),secret=randomBytes(32).toString('hex');
let child,base,cookie='';
async function start(){
  child=spawn(process.execPath,['server/index.js'],{cwd:resolve('.'),env:{...process.env,STUDIO_PASSWORD:password,SESSION_SECRET:secret,PORT:'0',HOST:'127.0.0.1',DATA_DIR:directory,OPENAI_API_KEY:'',COOKIE_SECURE:'false',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});
  base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);let output='';child.stdout.on('data',c=>{output+=c;const port=output.match(/localhost:(\d+)/)?.[1];if(port&&port!=='0'){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});child.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});});
}
async function stop(){if(!child||child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});}
async function request(path,method='GET',data){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {response,data:await response.json()};}
try{
  await readFile('dist/index.html');await start();
  assert.equal((await request('/healthz')).data.status,'ok');
  const index=await fetch(base+'/');const html=await index.text();assert.ok(html.includes('Crow Studio'));assert.ok(index.headers.get('content-security-policy').includes("object-src 'none'"));
  const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];assert.ok(asset);const js=await fetch(base+asset,{headers:{'Accept-Encoding':'br'}});assert.equal(js.status,200);assert.ok((await js.text()).length>1000);assert.match(js.headers.get('cache-control'),/immutable/);
  assert.equal((await fetch(base+'/crow.svg')).status,200);
  assert.equal((await request('/api/projects')).response.status,401);
  await request('/api/session','POST',{password});
  const created=await request('/api/projects','POST',{document:createDocument(templates[0])});assert.equal(created.response.status,201);
  const id=created.data.id,document={...created.data.document,name:'Persistência após reinício'};
  assert.equal((await request('/api/projects/'+id,'PUT',{document,revision:1})).response.status,200);
  const backupPath=join(directory,'backup.sqlite');
  execFileSync(process.execPath,['scripts/backup.mjs',backupPath],{env:{...process.env,DATA_DIR:directory},stdio:'pipe'});
  const backup=new DatabaseSync(backupPath,{readOnly:true});assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(backup.prepare('SELECT name FROM projects WHERE id=?').get(id).name,document.name);backup.close();
  await stop();await start();
  const persisted=await request('/api/projects/'+id);assert.equal(persisted.response.status,200);assert.equal(persisted.data.document.name,document.name);assert.equal(persisted.data.revision,2);
  console.log('PASS: production entrypoint, health, static assets, compression, authentication, CRUD, SQLite backup integrity and persistence after restart.');
}finally{await stop();await rm(directory,{recursive:true,force:true});}
