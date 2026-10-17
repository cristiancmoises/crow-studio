import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import JSZip from 'jszip';
import {build} from 'vite';
import {JSDOM} from 'jsdom';
import {createPptx} from '../src/pptx.ts';
import {makeElement} from '../shared/scene.js';

const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5gAAAABJRU5ErkJggg==';
const page=(id,width=960,height=540,elements=[])=>({id,name:id,width,height,background:'#f7f7f2',elements});
const document=pages=>({version:1,name:'Plano & resultados',pages});
async function packageFor(doc){const presentation=await createPptx(doc);return JSZip.loadAsync(await presentation.write({outputType:'arraybuffer'}));}

test('PPTX is an Office package with one slide for every page and editable escaped text',async()=>{
  const text='Plano <Q2> & "ritmo"';
  const zip=await packageFor(document([
    page('first',960,540,[makeElement('text',{text,w:800,fontSize:32}),makeElement('rect',{x:20,y:20,w:120,h:80}),makeElement('text',{text:'PRIVATE HIDDEN',hidden:true})]),
    page('second',800,800,[makeElement('ellipse',{x:0,y:0,w:800,h:800})])
  ]));
  assert.ok(zip.file('[Content_Types].xml'));
  assert.ok(zip.file('_rels/.rels'));
  assert.equal(Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,2);
  const first=await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(first,/<a:t>Plano &lt;Q2&gt; &amp; (?:&quot;|")ritmo(?:&quot;|")<\/a:t>/);
  assert.match(first,/<p:sp>/);
  assert.match(first,/<a:prstGeom prst="rect"/);
  assert.doesNotMatch(first,/PRIVATE HIDDEN|<Q2>/);
  const presentation=await zip.file('ppt/presentation.xml').async('string');
  assert.match(presentation,/<p:sldSz cx="9144000" cy="5143500"/);
  const second=await zip.file('ppt/slides/slide2.xml').async('string');
  assert.match(second,/<a:off x="2000250" y="0"\/>/);
  assert.match(second,/<a:ext cx="5143500" cy="5143500"\/>/);
});

test('PPTX embeds raster media, crops images to their frame and preserves top-left rotation',async()=>{
  const oldImage=globalThis.Image;
  globalThis.Image=class{naturalWidth=1;naturalHeight=1;set src(value){queueMicrotask(()=>this.onload());}};
  let zip;
  try{zip=await packageFor(document([page('images',960,540,[
      makeElement('image',{src:pixel,x:20,y:30,w:200,h:100}),
      makeElement('rect',{x:100,y:100,w:200,h:100,rotation:90,fill:'#2468ac80',opacity:.5})
    ])]));
  }finally{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;}
  const xml=await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(xml,/<p:pic>/);
  assert.match(xml,/<a:srcRect[^>]*(?:t|b)="[1-9]\d*"/);
  assert.match(xml,/<a:xfrm rot="5400000"[^>]*>\s*<a:off x="-476250" y="1428750"\/>/);
  assert.match(xml,/<a:alpha val="25000"\/>/);
  assert.ok(Object.keys(zip.files).some(name=>/^ppt\/media\/.+\.png$/.test(name)));
  const rels=await zip.file('ppt/slides/_rels/slide1.xml.rels').async('string');
  assert.doesNotMatch(rels,/TargetMode="External"/);
});

test('PPTX validates documents before accepting external image sources',async()=>{
  await assert.rejects(()=>createPptx(document([page('unsafe',960,540,[makeElement('image',{src:'https://example.org/private.png'})])])));
  await assert.rejects(()=>createPptx(document([])));
});

test('PPTX XML remains well formed for control characters and supplementary Unicode',async()=>{
  const doc=document([page('unicode',960,540,[makeElement('text',{text:'Texto\u0000 & fim\u000b \ud800 \u{1f426}',w:800,fontSize:32})])]);
  doc.name='Título\u0001 & <resumo>';
  const zip=await packageFor(doc);
  for(const [name,entry] of Object.entries(zip.files)){
    if(entry.dir||!name.endsWith('.xml'))continue;
    const xml=await entry.async('string'),parsed=new JSDOM(xml,{contentType:'application/xml'});
    parsed.window.close();
  }
  const slide=await zip.file('ppt/slides/slide1.xml').async('string');
  assert.ok(slide.includes('\u{1f426}'));
  assert.doesNotMatch(slide,/[\u0000\u000b\ud800]/u);
});

test('image import is refused at both exact demo entrypoints before decoding',async()=>{
  await build({configFile:false,logLevel:'silent',build:{ssr:resolve('src/export.ts'),outDir:resolve('.superpowers/pptx-export-test'),emptyOutDir:true,minify:false}});
  const {readImage}=await import('../.superpowers/pptx-export-test/export.js');
  const oldWindow=globalThis.window;
  try{
    for(const pathname of ['/demo','/demo/']){
      globalThis.window={location:{pathname}};
      await assert.rejects(()=>readImage(new File(['image'],'image.png',{type:'image/png'})),/demo|demonstração/i);
    }
  }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});
