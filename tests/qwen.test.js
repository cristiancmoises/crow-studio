import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {parseAiOutput,generateDesign} from '../server/qwen.js';
import {createDocument} from '../shared/scene.js';
import {templates} from '../shared/templates.js';
const page=createDocument(templates[0]).pages[0];
test('extracts the official CLI result and validates a page proposal',()=>{
  const result=parseAiOutput(JSON.stringify([{type:'result',is_error:false,result:JSON.stringify({message:'Uma proposta',page})}]),page);
  assert.equal(result.message,'Uma proposta');assert.equal(result.page.width,page.width);
});
test('rejects executable markup, malformed JSON and changed canvas sizes',()=>{
  assert.throws(()=>parseAiOutput('<script>alert(1)</script>',page));
  assert.throws(()=>parseAiOutput(JSON.stringify([{type:'result',is_error:true,result:'bad'}]),page));
  assert.throws(()=>parseAiOutput(JSON.stringify([{type:'result',result:JSON.stringify({message:'ok',page:{...page,width:64}})}]),page));
});
test('missing provider is a configuration error, not fake AI output',async()=>{
  await assert.rejects(()=>generateDesign({prompt:'Make a design',page},{}),e=>e.status===503);
});
test('real Qwen Code CLI communicates with a controlled compatible endpoint',async t=>{
  let requests=0,toolNames=[];
  const fixture=createServer(async(req,res)=>{
    const chunks=[];for await(const c of req)chunks.push(c);
    if(req.url.endsWith('/models')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:[{id:'fixture-model'}]}));}
    const data=JSON.parse(Buffer.concat(chunks).toString()||'{}');requests++;toolNames=(data.tools||[]).map(t=>t.function?.name);
    const content=JSON.stringify({message:'Proposta de teste pelo CLI real',page});
    if(data.stream){
      res.writeHead(200,{'Content-Type':'text/event-stream'});
      res.write(`data: ${JSON.stringify({id:'test',object:'chat.completion.chunk',created:1,model:'fixture-model',choices:[{index:0,delta:{role:'assistant',content},finish_reason:null}]})}\n\n`);
      res.write(`data: ${JSON.stringify({id:'test',object:'chat.completion.chunk',created:1,model:'fixture-model',choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:50,completion_tokens:50,total_tokens:100}})}\n\n`);
      res.end('data: [DONE]\n\n');
    }else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'test',object:'chat.completion',model:'fixture-model',choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}],usage:{prompt_tokens:50,completion_tokens:50,total_tokens:100}}));}
  });
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>{fixture.closeAllConnections();fixture.close(r);}));
  const result=await generateDesign({prompt:'Crie uma capa.',page},{apiKey:'fixture-only',baseUrl:`http://127.0.0.1:${fixture.address().port}/v1`,model:'fixture-model',timeoutMs:20000});
  assert.equal(result.message,'Proposta de teste pelo CLI real');assert.ok(requests>=1);
  assert.deepEqual(toolNames,[],'no executable tools may be advertised to the model');
});
test('real CLI timeout terminates the request instead of waiting forever',async t=>{
  const fixture=createServer((req,res)=>{});
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
  t.after(()=>{fixture.closeAllConnections();fixture.close();});
  await assert.rejects(()=>generateDesign({prompt:'Crie uma capa.',page},{apiKey:'fixture',baseUrl:`http://127.0.0.1:${fixture.address().port}/v1`,model:'fixture',timeoutMs:1200}),e=>e.status===504);
});
test('an abort signal terminates an active real CLI invocation',async t=>{
  let called,didStart=false;const started=new Promise(r=>called=r);
  const fixture=createServer((req,res)=>{didStart=true;called();});
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
  t.after(()=>{fixture.closeAllConnections();fixture.close();});
  const controller=new AbortController();
  const result=generateDesign({prompt:'Crie uma capa.',page},{apiKey:'fixture',baseUrl:`http://127.0.0.1:${fixture.address().port}/v1`,model:'fixture',timeoutMs:20000},{signal:controller.signal});
  const rejected=assert.rejects(()=>result,e=>e.status===499);
  await Promise.race([started,rejected]);
  assert.equal(didStart,true,'the CLI must reach the controlled endpoint before cancellation');
  const cancelledAt=performance.now();controller.abort();
  await rejected;
  assert.ok(performance.now()-cancelledAt<1500,'cancellation must stop active work promptly');
});
