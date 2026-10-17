import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {generateDesign} from '../server/ollama.js';
import {layoutIds,paletteIds} from '../shared/catalog.js';

const page={id:'original-page',name:'Página',width:1080,height:1080,background:'#ffffff',elements:[]};
const brief=()=>({layout:layoutIds[0],palette:paletteIds[0],headline:'Café da manhã',body:'Pães artesanais todos os dias.',eyebrow:'PADARIA',cta:'Conheça o cardápio'});
async function provider(t,handle) {
  const server=createServer(handle);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  return {provider:'ollama',baseUrl:`http://127.0.0.1:${server.address().port}`,model:'fixture',timeoutMs:1000};
}
test('native generation constrains the model and builds an editable validated scene from its brief',async t=>{
  let submitted;
  const config=await provider(t,async(req,res)=>{
    submitted=JSON.parse(await Array.fromAsync(req).then(chunks=>Buffer.concat(chunks).toString()));
    assert.equal(req.url,'/api/chat');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:JSON.stringify(brief())},done:true}));
  });
  const result=await generateDesign({prompt:'Uma padaria acolhedora',page},config);
  assert.equal(result.page.id,page.id);assert.equal(result.page.width,page.width);
  assert.ok(result.page.elements.some(e=>e.type==='text'&&e.text==='Café da manhã'));
  assert.equal(submitted.think,false);assert.equal(submitted.stream,false);assert.equal(submitted.keep_alive,0);
  assert.equal(submitted.options.num_ctx,2048);assert.equal(submitted.options.num_predict,512);
  assert.equal(submitted.options.num_gpu,0);assert.equal(submitted.tools,undefined);
  assert.deepEqual(submitted.format.properties.layout.enum,layoutIds);
});
test('native generation rejects malformed or unknown model fields rather than inventing a scene',async t=>{
  const config=await provider(t,(_req,res)=>res.end(JSON.stringify({message:{content:JSON.stringify({...brief(),layout:'unsupported',shell:'bad'})},done:true})));
  await assert.rejects(generateDesign({prompt:'Proposta breve',page},config),error=>error.status===502);
});
test('Portuguese and English design copy rejects an unexpected mixed writing system',async t=>{
  const config=await provider(t,(_req,res)=>res.end(JSON.stringify({message:{content:JSON.stringify({...brief(),body:'Aprenda a proteger seus dados保護'})},done:true})));
  await assert.rejects(generateDesign({prompt:'Curso em português brasileiro',page},config),error=>error.status===502);
});
test('native provider timeout and caller cancellation abort stalled responses',async t=>{
  const config=await provider(t,()=>{});
  await assert.rejects(generateDesign({prompt:'Proposta breve',page},{...config,timeoutMs:30}),error=>error.status===504);
  const controller=new AbortController();
  const request=generateDesign({prompt:'Proposta breve',page},config,{signal:controller.signal});
  controller.abort();await assert.rejects(request,error=>error.status===499);
});
