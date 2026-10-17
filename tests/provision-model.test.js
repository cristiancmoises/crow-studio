import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

async function setup(t,digest) {
  const dir=await mkdtemp(join(tmpdir(),'crow-provision-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const log=join(dir,'calls.log');
  const docker=`#!/bin/sh\nprintf '%s\\n' "$*" >> "$CALL_LOG"\ncase "$1 $2" in\n 'info --format') printf '/tmp\\n';;\n 'image inspect') exit 0;;\n 'volume inspect') exit 0;;\n 'run --rm') case "$*" in *'/models/blobs/'*) printf '8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7  source\\n3d0b790534fe4b79525fc3692950408dca41171676ed7e21db57af5c65ef6ab6  weights\\n';; *) printf '%s  cached-manifest\\n' "$FIXTURE_DIGEST";; esac;;\nesac\n`;
  await writeFile(join(dir,'docker'),docker);await chmod(join(dir,'docker'),0o700);
  await writeFile(join(dir,'df'),'#!/bin/sh\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted\\nfixture 99999999 0 99999999 1%% /tmp\\n"\n');await chmod(join(dir,'df'),0o700);
  const result=spawnSync('sh',['scripts/provision-model.sh'],{encoding:'utf8',env:{...process.env,PATH:dir+':'+process.env.PATH,CALL_LOG:log,FIXTURE_DIGEST:digest}});
  return {result,calls:await readFile(log,'utf8').catch(()=>'')};
}
test('model provisioning accepts only its pinned cached manifest without starting a download daemon',async t=>{
  const {result,calls}=await setup(t,'0f45bae8cd2fec097cf09b400b078cf42388a1f5702f4058d2d6d641a09db46d');
  assert.equal(result.status,0,result.stderr);assert.ok(!calls.includes('run -d'));assert.ok(!calls.includes('pull qwen3'));
});
test('model provisioning refuses an unexpected cached manifest and never overwrites it',async t=>{
  const {result,calls}=await setup(t,'f'.repeat(64));
  assert.notEqual(result.status,0);assert.ok(!calls.includes('pull qwen3'));assert.match(result.stderr,/digest|manifesto/i);
});
