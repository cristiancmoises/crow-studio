import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Qwen optional sharp dependency is pinned beyond the known librsvg advisory',()=>{
  const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
  assert.equal(lock.packages['node_modules/sharp'].version,'0.35.5');
});
