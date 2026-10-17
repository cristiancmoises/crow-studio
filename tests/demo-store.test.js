import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoStore,demoLimits} from '../shared/demo-store.js';
import {createDocument} from '../shared/scene.js';
import {templates} from '../shared/templates.js';

function setup(){const values=new Map();return {values,storage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};}
const input=value=>({method:'POST',body:JSON.stringify(value)});
test('demo opens without credentials and keeps projects in its own browser storage',()=>{
  const {storage,values}=setup(),demo=createDemoStore(storage);
  assert.equal(demo.request('/session').authenticated,true);
  const created=demo.request('/projects',input({document:createDocument(templates[0])}));
  assert.equal(created.revision,1);
  assert.equal(demo.request('/projects').projects[0].id,created.id);
  assert.equal(createDemoStore(storage).request('/projects/'+created.id).document.name,created.name);
  assert.equal(values.size,1);
  assert.deepEqual(createDemoStore(setup().storage).request('/projects').projects,[]);
});
test('demo updates and deletion require the current project revision',()=>{
  const demo=createDemoStore(setup().storage),project=demo.request('/projects',input({document:createDocument(templates[0])}));
  const document={...project.document,name:'Apresentação de teste'};
  const changed=demo.request('/projects/'+project.id,{method:'PUT',body:JSON.stringify({document,revision:1,favorite:true})});
  assert.equal(changed.revision,2);assert.equal(changed.favorite,true);
  assert.throws(()=>demo.request('/projects/'+project.id,{method:'PUT',body:JSON.stringify({document,revision:1})}),{status:409});
  assert.throws(()=>demo.request('/projects/'+project.id,{method:'DELETE',body:JSON.stringify({revision:1})}),{status:409});
  demo.request('/projects/'+project.id,{method:'DELETE',body:JSON.stringify({revision:2})});
  assert.equal(demo.request('/projects').projects.length,0);
});
test('demo enforces project, page, element, dimension and image limits',()=>{
  const demo=createDemoStore(setup().storage);
  for(let i=0;i<demoLimits.projects;i++)demo.request('/projects',input({document:createDocument(templates[0])}));
  assert.throws(()=>demo.request('/projects',input({document:createDocument(templates[0])})),{status:413});
  for(const change of [
    doc=>{doc.pages=Array.from({length:4},(_,i)=>({...doc.pages[0],id:'page-'+i}));},
    doc=>{doc.pages[0].width=2000;},
    doc=>{doc.pages[0].elements=Array.from({length:61},(_,i)=>({...doc.pages[0].elements[0],id:'e-'+i}));},
    doc=>{doc.pages[0].elements[0]={...doc.pages[0].elements[0],type:'image',src:'data:image/png;base64,aGVsbG8='};}
  ]){
    const document=createDocument(templates[0]);change(document);
    assert.throws(()=>createDemoStore(setup().storage).request('/projects',input({document})),{status:413});
  }
});
test('demo rejects oversized text documents and a full browser storage without losing data',()=>{
  const memory=setup(),demo=createDemoStore(memory.storage);
  const project=demo.request('/projects',input({document:createDocument(templates[0])}));
  const before=[...memory.values.values()][0];
  const document=createDocument(templates[0]);
  document.pages[0].elements=Array.from({length:12},(_,i)=>({...document.pages[0].elements[0],id:'text-'+i,text:'x'.repeat(7000),type:'text'}));
  assert.throws(()=>demo.request('/projects',input({document})),{status:413});
  assert.equal([...memory.values.values()][0],before);
  const failing=createDemoStore({getItem:memory.storage.getItem,setItem(){throw new Error('QuotaExceededError');}});
  assert.throws(()=>failing.request('/projects',input({document:createDocument(templates[0])})),{status:507});
  assert.equal(demo.request('/projects/'+project.id).revision,1);
});
test('demo refuses private or malformed routes and does not expose authentication mutations',()=>{
  const demo=createDemoStore(setup().storage);
  for(const path of ['/admin','/projects/../private','/ai/design'])assert.throws(()=>demo.request(path),{status:404});
  assert.throws(()=>demo.request('/session',input({password:'anything'})),{status:403});
  assert.throws(()=>demo.request('/projects',{method:'POST',body:'bad JSON'}),{status:400});
  assert.throws(()=>demo.request('/projects',input({document:createDocument(templates[0]),unexpected:true})),{status:400});
});
