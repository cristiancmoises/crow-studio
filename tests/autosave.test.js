import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosave} from '../shared/autosave.js';
test('a slow save followed by edits persists the newer state using the returned revision',async()=>{
  let release,first=true;const calls=[],statuses=[];
  const save=createAutosave({n:0},1,async(doc,revision)=>{
    calls.push({doc,revision});if(first){first=false;await new Promise(r=>release=r);}return {revision:revision+1};
  },s=>statuses.push(s.status),60000);
  save.set({n:1});const flushing=save.flush();
  await new Promise(r=>setImmediate(r));
  save.set({n:2});release();await flushing;
  assert.deepEqual(calls,[{doc:{n:1},revision:1},{doc:{n:2},revision:2}]);
  assert.equal(statuses.at(-1),'saved');assert.equal(save.dirty(),false);save.destroy();
});
test('a save conflict keeps local work dirty and reports the actual error',async()=>{
  let last;const conflict=Object.assign(new Error('Another tab'),{status:409});
  const save=createAutosave({n:0},1,async()=>{throw conflict;},s=>last=s,60000);
  save.set({n:1});await assert.rejects(()=>save.flush(),conflict);
  assert.equal(last.status,'conflict');assert.equal(save.dirty(),true);save.destroy();
});
test('undoing to the original during a pending save keeps unload protection until correction is saved',async()=>{
  let release;const writes=[],states=[];
  const save=createAutosave({n:0},1,async(document,revision)=>{
    if(writes.length===0)await new Promise(r=>release=r);
    writes.push(document);return {revision:revision+1};
  },s=>states.push(s.status),60000);
  save.set({n:1});const work=save.flush();await new Promise(r=>setImmediate(r));
  save.set({n:0});
  assert.equal(save.dirty(),true,'pending non-original write must keep unload warning');
  assert.notEqual(states.at(-1),'saved');
  release();await work;
  assert.deepEqual(writes,[{n:1},{n:0}]);assert.equal(save.dirty(),false);save.destroy();
});
