import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'vite';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';

test('a rejected proposal stays available and reports success only after it is applied',async()=>{
  const oldNodeEnv=process.env.NODE_ENV;process.env.NODE_ENV='development';
  await build({configFile:false,logLevel:'silent',build:{ssr:resolve('src/components/AIPanel.tsx'),outDir:resolve('.superpowers/ai-panel-test'),emptyOutDir:true,minify:false}});
  const {default:AIPanel}=await import('../.superpowers/ai-panel-test/AIPanel.js');
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/'});
  const old={window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement,fetch:globalThis.fetch};
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
  const page={id:'original',name:'Página',width:1080,height:1080,background:'#ffffff',elements:[]};
  globalThis.fetch=async url=>Response.json(String(url).endsWith('/status')?{configured:true}:{message:'Proposta pronta.',page});
  const {createRoot}=await import('react-dom/client');
  const root=createRoot(document.getElementById('root'));
  const notices=[];let accepted=false,applyCount=0;
  const render=async current=>act(async()=>root.render(React.createElement(AIPanel,{page:current,onClose:()=>{},notify:message=>notices.push(message),onApply:()=>{applyCount++;return accepted;}})));
  const apply=async()=>act(async()=>document.querySelector('.ai-result .primary').click());
  try{
    await render(page);
    await act(async()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.ok(document.querySelector('.ai-result'));
    await render({...page,id:'second'});
    await apply();
    assert.ok(document.querySelector('.ai-result'),'switching pages must preserve the proposal');
    assert.equal(applyCount,0,'a proposal must target its original page');
    assert.ok(!notices.some(message=>message.startsWith('Proposta aplicada')));
    await render(page);
    await apply();
    assert.ok(document.querySelector('.ai-result'),'validation failure must preserve the proposal');
    assert.equal(applyCount,1);
    assert.ok(!notices.some(message=>message.startsWith('Proposta aplicada')));
    accepted=true;
    await apply();
    assert.equal(document.querySelector('.ai-result'),null);
    assert.equal(applyCount,2);
    assert.equal(notices.filter(message=>message.startsWith('Proposta aplicada')).length,1);
  }finally{await act(async()=>root.unmount());Object.assign(globalThis,old);delete globalThis.IS_REACT_ACT_ENVIRONMENT;dom.window.close();if(oldNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNodeEnv;}
});
