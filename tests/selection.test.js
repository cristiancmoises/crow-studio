import test from 'node:test';
import assert from 'node:assert/strict';
import Konva from 'konva';
import {findElementNode} from '../shared/selection.js';
test('selection finds actual Konva nodes when UUIDs start with digits',()=>{
  const container=new Konva.Group();
  for(const id of ['1b22-abc','9ff0-123','abc-123']){
    const element=new Konva.Group({id});container.add(element);
    assert.equal(findElementNode(container,id),element);
  }
  assert.equal(findElementNode(container,'missing'),undefined);container.destroy();
});
