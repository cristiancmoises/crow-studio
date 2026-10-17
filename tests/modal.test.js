import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'vite';
import React,{act,useState} from 'react';
import {JSDOM} from 'jsdom';

test('modal preserves text focus across parent edits and uses the latest close callback',async()=>{
  const oldNodeEnv=process.env.NODE_ENV;process.env.NODE_ENV='development';
  await build({configFile:false,logLevel:'silent',build:{ssr:resolve('src/components/UI.tsx'),outDir:resolve('.superpowers/modal-test'),emptyOutDir:true,minify:false}});
  const {Modal}=await import('../.superpowers/modal-test/UI.js');
  const dom=new JSDOM('<!doctype html><html><body><button id="previous">Before</button><div id="root"></div></body></html>',{url:'http://localhost/'});
  const old={window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement};
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
  const {createRoot}=await import('react-dom/client');
  let setValue,closedWith;
  function Parent(){const [value,set]=useState('first');setValue=set;return React.createElement(Modal,{title:'Edit',onClose:()=>{closedWith=value;}},React.createElement('textarea',{'aria-label':'Text',defaultValue:'Draft'}));}
  const root=createRoot(document.getElementById('root'));
  try{
    await act(async()=>root.render(React.createElement(Parent)));
    const textarea=document.querySelector('textarea');textarea.focus();
    await act(async()=>setValue('after edit'));
    assert.equal(document.activeElement===textarea,true,'editing must not move focus to the close button');
    await act(async()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    assert.equal(closedWith,'after edit');
  }finally{await act(async()=>root.unmount());Object.assign(globalThis,old);delete globalThis.IS_REACT_ACT_ENVIRONMENT;dom.window.close();if(oldNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNodeEnv;}
});
