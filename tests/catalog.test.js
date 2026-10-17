import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePage,textLines} from '../shared/scene.js';
import {templates} from '../shared/templates.js';
import {catalogCount,catalogCategories,listTemplates,getTemplate,designFromBrief,layoutIds,paletteIds} from '../shared/catalog.js';

function descriptors(){
  const result=[];
  for(let page=1;;page++){
    const batch=listTemplates({page,pageSize:48});result.push(...batch.items);
    if(page>=batch.pages)break;
  }
  return result;
}
const brief={layout:'split-editorial',palette:'lagoon',headline:'Ideias para um novo começo',body:'Uma perspectiva clara para transformar planos em próximos passos.',eyebrow:'ESTÚDIO ABERTO',cta:'Explore as possibilidades'};

test('catalog lists thousands of stable scene-free descriptors and preserves original templates',()=>{
  assert.ok(catalogCount>3000);assert.ok(layoutIds.length>=20);assert.ok(paletteIds.length>=6);
  const all=descriptors();assert.equal(all.length,catalogCount);assert.equal(new Set(all.map(item=>item.id)).size,catalogCount);
  for(const descriptor of all){assert.equal('page' in descriptor,false);assert.equal('elements' in descriptor,false);assert.ok(catalogCategories.some(category=>category.id===descriptor.category));}
  for(const original of templates){assert.ok(all.some(item=>item.id===original.id));assert.deepEqual(getTemplate(original.id),original);}
  assert.deepEqual(listTemplates({page:2}),listTemplates({page:2}));
  assert.ok(Buffer.byteLength(JSON.stringify(listTemplates()))<20000);
});

test('catalog search is accent-insensitive and filters formats before pagination',()=>{
  const accented=listTemplates({query:'educação',category:'presentation',pageSize:48});
  const plain=listTemplates({query:'educacao',category:'presentation',pageSize:48});
  assert.deepEqual(accented,plain);assert.ok(plain.total>48);assert.equal(plain.items.length,48);
  assert.ok(plain.items.every(item=>item.category==='presentation'&&item.width===1920&&item.height===1080));
  const next=listTemplates({query:'educacao',category:'presentation',page:2,pageSize:48});
  assert.ok(next.items.every(item=>!plain.items.some(first=>first.id===item.id)));
  assert.deepEqual(listTemplates({query:'zzzz-sem-correspondencia'}),{items:[],total:0,pages:0,page:1});
  assert.equal(listTemplates({page:-4,pageSize:999}).items.length,48);
  const last=listTemplates({page:Number.MAX_SAFE_INTEGER});assert.equal(last.page,last.pages);
  assert.throws(()=>getTemplate('missing-template'),/template/i);
});

test('the first catalog page offers varied layout families, palettes and formats',()=>{
  const generated=listTemplates().items.filter(item=>item.id.startsWith('catalog-'));
  const visibleLayouts=layoutIds.filter(layout=>generated.some(item=>item.id.startsWith('catalog-'+layout+'-')));
  const visiblePalettes=paletteIds.filter(palette=>generated.some(item=>item.id.includes('-'+palette+'-')));
  assert.ok(visibleLayouts.length>=8);assert.ok(visiblePalettes.length>=4);
  assert.ok(new Set(generated.map(item=>item.category)).size>=4);
});

test('every catalog scene validates, fits its canvas and retains complete generated text',()=>{
  for(const descriptor of descriptors()){
    const template=getTemplate(descriptor.id);parsePage(template.page);
    assert.equal(template.page.width,descriptor.width);assert.equal(template.page.height,descriptor.height);
    if(templates.some(original=>original.id===descriptor.id))continue;
    assert.ok(template.page.elements.length<=60);
    for(const element of template.page.elements){
      assert.notEqual(element.type,'image');
      assert.ok(element.x>=0&&element.y>=0&&element.x+element.w<=template.page.width+0.01&&element.y+element.h<=template.page.height+0.01,descriptor.id+' '+element.id);
      if(element.type==='text')assert.equal(textLines(element).join(' ').replace(/\s+/g,' ').trim(),element.text.replace(/\s+/g,' ').trim(),descriptor.id+' '+element.text);
    }
  }
});

test('layout families produce distinct geometry with the same briefing and palette',()=>{
  const signatures=layoutIds.map(layout=>{
    const page=designFromBrief({...brief,layout},{width:1080,height:1080});
    return JSON.stringify(page.elements.map(({type,x,y,w,h,fontSize,align})=>({type,x,y,w,h,fontSize,align})));
  });
  assert.equal(new Set(signatures).size,layoutIds.length);
});

test('structured briefs keep all editable text and reject code, unknown presets and excessive text',()=>{
  const page=designFromBrief(brief,{width:1080,height:1920});parsePage(page);
  for(const text of [brief.headline,brief.body,brief.eyebrow,brief.cta])assert.ok(page.elements.some(element=>element.text===text));
  assert.throws(()=>designFromBrief({...brief,headline:'<script>alert(1)</script>'},{width:1080,height:1080}));
  assert.throws(()=>designFromBrief({...brief,layout:'unknown'},{width:1080,height:1080}));
  assert.throws(()=>designFromBrief({...brief,palette:'unknown'},{width:1080,height:1080}));
  assert.throws(()=>designFromBrief({...brief,headline:'x'.repeat(101)},{width:1080,height:1080}));
  assert.throws(()=>designFromBrief(brief,{width:9000,height:1080}));
  assert.throws(()=>designFromBrief({...brief,script:'alert(1)'},{width:1080,height:1080}));
});
