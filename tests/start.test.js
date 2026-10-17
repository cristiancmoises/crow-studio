import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

async function setup(t,existing) {
  const root=await mkdtemp(join(tmpdir(),'crow-start-')),scripts=join(root,'scripts'),bin=join(root,'bin'),log=join(root,'calls');
  t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(scripts);await mkdir(bin);
  await writeFile(join(scripts,'start.sh'),await readFile(new URL('../scripts/start.sh',import.meta.url)));
  await writeFile(join(scripts,'provision-model.sh'),'#!/bin/sh\nprintf "PROVISION\\n" >> "$CALL_LOG"\n');
  await writeFile(join(bin,'docker'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\n');await chmod(join(bin,'docker'),0o700);
  if(existing)await writeFile(join(root,'.env'),existing,{mode:0o600});
  const result=spawnSync('sh',[join(scripts,'start.sh')],{encoding:'utf8',env:{...process.env,AI_PROVIDER:'',PATH:bin+':'+process.env.PATH,CALL_LOG:log}});
  return {result,envFile:await readFile(join(root,'.env'),'utf8'),calls:await readFile(log,'utf8')};
}
test('fresh startup configures and provisions local generation without logging its password',async t=>{
  const {result,envFile,calls}=await setup(t);
  assert.equal(result.status,0,result.stderr);assert.ok(envFile.includes('AI_PROVIDER=ollama\n'),'Local generation must be configured');
  const password=envFile.split('\n').find(line=>line.startsWith('STUDIO_PASSWORD=')).split('=')[1];
  assert.ok(/^[0-9a-f]{48}$/.test(password));assert.ok(!result.stdout.includes(password),'Generated password must stay in its private file');
  assert.ok(calls.includes('PROVISION'));assert.ok(calls.includes('compose up -d --build'));
});
test('CLI startup preserves an existing configuration and skips local model provisioning',async t=>{
  const existing='STUDIO_PASSWORD=private-fixture-password\nSESSION_SECRET=private-fixture-session\nAI_PROVIDER="qwen-code"\n';
  const {result,envFile,calls}=await setup(t,existing);
  assert.equal(result.status,0,result.stderr);assert.equal(envFile,existing);
  assert.ok(!calls.includes('PROVISION'));assert.ok(calls.includes('compose up -d --build studio'));
  assert.ok(!result.stdout.includes('private-fixture-password'));
});
