import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, parsePage, toSvg, createDocument, makeElement, contrastInk } from '../shared/scene.js';
import { templates } from '../shared/templates.js';
import { history } from '../shared/history.js';

test('all original templates are valid, portable and have unique element IDs', () => {
  assert.ok(templates.length >= 10);
  for (const template of templates) {
    const doc = parseDocument(createDocument(template));
    assert.ok(doc.pages[0].elements.length > 0);
    assert.equal(new Set(doc.pages[0].elements.map(x => x.id)).size, doc.pages[0].elements.length);
    assert.match(toSvg(doc.pages[0]), /^<svg/);
  }
});
test('rejects oversized documents and duplicate page IDs', () => {
  const doc = createDocument(templates[0]);
  assert.throws(() => parseDocument({...doc,pages:Array(21).fill(doc.pages[0])}));
  assert.throws(() => parseDocument({...doc,pages:[doc.pages[0],doc.pages[0]]}));
  assert.throws(() => parsePage({...doc.pages[0],width:5000}));
});
test('rejects non-finite coordinates, scripts and external image URLs', () => {
  const page = createDocument(templates[0]).pages[0];
  for (const src of ['javascript:alert(1)','https://tracker.example/pixel','data:image/svg+xml;base64,AAAA']) {
    assert.throws(() => parsePage({...page,elements:[makeElement('image',{src})]}));
  }
  assert.throws(() => parsePage({...page,elements:[makeElement('rect',{x:Infinity})]}));
  assert.throws(() => parsePage({...page,background:'url(javascript:alert(1))'}));
});
test('SVG escapes text, excludes hidden elements and includes rotations', () => {
  const page = parsePage({id:'p',name:'Test',width:500,height:500,background:'#ffffff',elements:[
    makeElement('text',{id:'text',text:'<script>&"',rotation:25}),
    makeElement('text',{id:'hidden',text:'SECRET',hidden:true})
  ]});
  const svg = toSvg(page);
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('SECRET'));
  assert.ok(svg.includes('rotate(25'));
});
test('undo/redo is immutable, bounded and clears redo after a new edit', () => {
  let state = history.init({value:1});
  state = history.push(state,{value:2});
  state = history.undo(state);
  assert.equal(state.present.value,1);
  state = history.redo(state);
  assert.equal(state.present.value,2);
  state = history.undo(state);
  state = history.push(state,{value:3});
  assert.equal(state.future.length,0);
  for (let n=0;n<80;n++) state = history.push(state,{value:n});
  assert.ok(state.past.length <= 50);
});
test('new text is visible against both dark and light template backgrounds',()=>{
  assert.equal(contrastInk('#0b181c'),'#f5f7f2');
  assert.equal(contrastInk('#111416'),'#f5f7f2');
  assert.equal(contrastInk('#fff'),'#192b31');
  assert.equal(contrastInk('#f7f7f2'),'#192b31');
});
