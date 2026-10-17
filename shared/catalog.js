import {z} from 'zod';
import {makeElement,parsePage,textLines} from './scene.js';
import {templates,formats} from './templates.js';

const layouts=[
  ['split-editorial','Editorial dividido'],['type-stack','Tipografia em blocos'],
  ['centered-note','Nota central'],['inset-frame','Moldura editorial'],
  ['side-banner','Faixa lateral'],['stepped-cards','Planos em sequência'],
  ['bold-poster','Cartaz expressivo'],['soft-arch','Arco orgânico'],
  ['orbital','Órbitas'],['three-cards','Três perspectivas'],
  ['quote-card','Citação editorial'],['diagonal','Diagonal gráfica'],
  ['two-columns','Duas colunas'],['horizon','Linha do horizonte'],
  ['bulletin','Boletim'],['showcase','Vitrine'],
  ['ticket','Convite'],['minimal-line','Linha essencial'],
  ['mosaic','Mosaico'],['spotlight','Em destaque']
];
const palettes=[
  {id:'lagoon',name:'Lagoa',bg:'#102d32',ink:'#f4f7ed',muted:'#b6d5cf',accent:'#67e4d5',surface:'#1b4549',accentInk:'#102d32'},
  {id:'paper',name:'Papel',bg:'#f1eee5',ink:'#252e2d',muted:'#52645e',accent:'#d66542',surface:'#dedccf',accentInk:'#252e2d'},
  {id:'terracotta',name:'Terracota',bg:'#873e32',ink:'#fff1d5',muted:'#f0c5aa',accent:'#f0b759',surface:'#a64d38',accentInk:'#3d231a'},
  {id:'forest',name:'Bosque',bg:'#e8eddb',ink:'#203b32',muted:'#516c50',accent:'#517b5e',surface:'#cdd8bc',accentInk:'#f6f8ed'},
  {id:'midnight',name:'Meia-noite',bg:'#151c38',ink:'#f7f3e6',muted:'#bbc5e5',accent:'#9daef2',surface:'#273459',accentInk:'#151c38'},
  {id:'citrus',name:'Cítrico',bg:'#f0ed72',ink:'#253524',muted:'#50613b',accent:'#517c4d',surface:'#d9df79',accentInk:'#f5f6df'}
];
const topics=[
  {id:'business',name:'Negócios',tags:['negócios','business','empresa','gestão','estratégia'],eyebrow:'VISÃO DE NEGÓCIOS',headline:'Decisões que abrem caminhos',body:'Organize prioridades e dê forma ao próximo passo da sua marca.',cta:'Conheça a proposta'},
  {id:'education',name:'Educação',tags:['educação','education','curso','oficina','aprendizado'],eyebrow:'APRENDER EM CONJUNTO',headline:'Aprender muda o horizonte',body:'Uma oficina para trocar experiências, fazer perguntas e construir novas possibilidades.',cta:'Reserve sua participação'},
  {id:'technology',name:'Tecnologia',tags:['tecnologia','technology','produto','inovação','digital'],eyebrow:'IDEIAS EM MOVIMENTO',headline:'Uma ideia à frente',body:'Conecte pessoas, processos e boas ideias para criar soluções úteis.',cta:'Explore a solução'},
  {id:'culture',name:'Cultura',tags:['cultura','culture','evento','arte','música'],eyebrow:'ARTE E CULTURA',headline:'Encontros que viram histórias',body:'Uma programação para descobrir novos olhares e compartilhar boas conversas.',cta:'Veja a programação'},
  {id:'food',name:'Gastronomia',tags:['gastronomia','food','café','restaurante','comércio'],eyebrow:'À MESA',headline:'Feito com tempo e cuidado',body:'Sabores de origem, escolhas cuidadosas e um convite para desacelerar.',cta:'Conheça o cardápio'},
  {id:'wellness',name:'Bem-estar',tags:['bem-estar','wellness','pausa','equilíbrio','presença'],eyebrow:'NO SEU RITMO',headline:'Espaço para respirar melhor',body:'Pequenos momentos de pausa para encontrar presença e cuidar do seu ritmo.',cta:'Encontre seu momento'},
  {id:'nature',name:'Sustentabilidade',tags:['sustentabilidade','natureza','sustainability','comunidade','recursos'],eyebrow:'ESCOLHAS QUE IMPORTAM',headline:'O futuro começa no cuidado',body:'Valorize recursos, aproxime pessoas e transforme boas escolhas em hábitos.',cta:'Faça parte da mudança'},
  {id:'creative',name:'Criação',tags:['criatividade','design','creative','portfólio','estúdio'],eyebrow:'NOVAS PERSPECTIVAS',headline:'Seu próximo olhar',body:'Um espaço para experimentar formas, revelar ideias e encontrar a sua voz.',cta:'Comece a explorar'}
];
export const layoutIds=Object.freeze(layouts.map(([id])=>id));
export const paletteIds=Object.freeze(palettes.map(palette=>palette.id));
export const catalogCategories=Object.freeze(formats.map(format=>({id:format.id,name:format.short})));
export const categories=catalogCategories;
export const catalogCount=templates.length+layouts.length*palettes.length*topics.length*formats.length;
const fold=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const idFor=(layout,palette,topic,format)=>`catalog-${layout}-${palette}-${topic}-${format}`;
function descriptor(layout,palette,topic,format){
  return {id:idFor(layout[0],palette.id,topic.id,format.id),name:`${topic.name} · ${layout[1]} · ${palette.name} · ${format.short}`,category:format.id,tags:[topic.name,...topic.tags,layout[1],palette.name,format.short],width:format.width,height:format.height};
}
function* entries(){
  for(const template of templates)yield {id:template.id,name:template.name,category:template.category,tags:[...template.tags],width:template.page.width,height:template.page.height};
  for(let combination=0;combination<topics.length*palettes.length*formats.length;combination++)for(let index=0;index<layouts.length;index++){
    const topic=topics[combination%topics.length];
    const palette=palettes[(Math.floor(combination/topics.length)+index)%palettes.length];
    const format=formats[(Math.floor(combination/(topics.length*palettes.length))+index)%formats.length];
    yield descriptor(layouts[index],palette,topic,format);
  }
}
export function listTemplates({query='',category='all',page=1,pageSize=24}={}){
  const size=Number.isFinite(Number(pageSize))?Math.max(1,Math.min(48,Math.floor(Number(pageSize)))):24;
  const terms=fold(query).trim().split(/\s+/).filter(Boolean),matched=[];
  for(const item of entries()){
    if(category!=='all'&&item.category!==category)continue;
    if(terms.length){const haystack=fold([item.name,...item.tags].join(' '));if(!terms.every(term=>haystack.includes(term)))continue;}
    matched.push(item);
  }
  const total=matched.length,pages=Math.ceil(total/size);
  const current=Math.max(1,Math.min(pages||1,Number.isFinite(Number(page))?Math.floor(Number(page)):1));
  return {items:matched.slice((current-1)*size,current*size),total,pages,page:current};
}
const plainText=max=>z.string().trim().max(max).refine(value=>!/[<>`]/.test(value),'Use apenas texto, sem marcação ou código.');
const briefSchema=z.object({layout:z.enum(layoutIds),palette:z.enum(paletteIds),headline:plainText(100).refine(Boolean,'Inclua um título.'),body:plainText(200).default(''),eyebrow:plainText(50).default(''),cta:plainText(40).default('')}).strict();
const dimensionsSchema=z.object({width:z.number().int().min(64).max(4096),height:z.number().int().min(64).max(4096)}).strict();
export function designFromBrief(input,dimensions={width:1080,height:1080}){
  const brief=briefSchema.parse(input),{width,height}=dimensionsSchema.parse(dimensions),p=palettes.find(palette=>palette.id===brief.palette);
  const elements=[],unit=Math.min(width,height);
  const add=(type,properties)=>{const element=makeElement(type,{...properties,id:`element-${elements.length+1}`});elements.push(element);return element;};
  const rect=(x,y,w,h,fill=p.surface,radius=0)=>add('rect',{x:x*width,y:y*height,w:w*width,h:h*height,fill,radius:radius*unit});
  const ellipse=(x,y,w,h,fill=p.accent)=>add('ellipse',{x:x*width,y:y*height,w:w*width,h:h*height,fill});
  const text=(content,x,y,w,h,size=.065,fill=p.ink,extra={})=>{
    if(!content)return;
    const properties={text:content,x:x*width,y:y*height,w:w*width,h:h*height,fontSize:Math.max(4,size*unit),fill,fontFamily:'Arial',...extra};
    while(properties.fontSize>4&&textLines({...properties,h:8192}).length*properties.fontSize*1.2>properties.h)properties.fontSize=Math.max(4,properties.fontSize-1);
    if(textLines({...properties,h:8192}).length*properties.fontSize*1.2>properties.h)throw new RangeError('O texto precisa ser mais curto para este tamanho de página.');
    add('text',properties);
  };
  const headline=(x,y,w,h,size=.088,extra={})=>text(brief.headline,x,y,w,h,size,p.ink,{fontStyle:'bold',...extra});
  const body=(x,y,w,h)=>text(brief.body,x,y,w,h,.033,p.muted);
  const eyebrow=(x=.07,y=.065,w=.86,h=.07)=>text(brief.eyebrow,x,y,w,h,.021,p.muted,{fontStyle:'bold'});
  const cta=(x=.07,y=.84,w=.64,h=.09)=>{
    if(!brief.cta)return;
    rect(x,y,w,h,p.ink,.012);text(brief.cta,x+.018,y+.016,w-.036,h-.032,.025,p.bg,{fontStyle:'bold'});
  };
  switch(brief.layout){
    case 'split-editorial':
      rect(.69,.05,.25,.9,p.surface,.12);ellipse(.72,.3,.18,.36);eyebrow(.07,.065,.57);headline(.07,.23,.58,.37);body(.07,.64,.55,.14);cta(.07,.84,.55);break;
    case 'type-stack':
      rect(.07,.19,.86,.025,p.accent);rect(.07,.76,.86,.018,p.accent);eyebrow();headline(.07,.25,.86,.36,.115,{fontFamily:'Impact'});body(.07,.63,.86,.1);cta(.07,.83,.86);break;
    case 'centered-note':
      ellipse(.42,.065,.16,.16);eyebrow(.12,.26,.76,.06);headline(.12,.36,.76,.25,.084,{align:'center'});body(.18,.64,.64,.12);cta(.18,.83,.64);break;
    case 'inset-frame':
      rect(.045,.045,.91,.91,p.ink,.015);rect(.055,.055,.89,.89,p.bg,.012);rect(.08,.08,.09,.015,p.accent);eyebrow(.2,.075,.62,.07);headline(.12,.25,.76,.35,.095,{fontFamily:'Georgia'});body(.12,.65,.76,.12);cta(.12,.82,.76);break;
    case 'side-banner':
      rect(0,0,.19,1,p.accent);rect(.06,.12,.07,.75,p.accentInk,.03);eyebrow(.26,.08,.67);headline(.26,.25,.66,.35,.086);body(.26,.65,.65,.12);cta(.26,.83,.66);break;
    case 'stepped-cards':
      rect(.54,.14,.38,.2,p.surface,.015);rect(.6,.37,.32,.2,p.accent,.015);rect(.66,.6,.26,.2,p.ink,.015);eyebrow(.07,.08,.44);headline(.07,.24,.43,.37,.083);body(.07,.65,.43,.16);cta(.07,.86,.85,.08);break;
    case 'bold-poster':
      rect(.07,.07,.1,.1,p.accent);eyebrow(.22,.085,.7,.06);headline(.07,.24,.86,.38,.12,{fontFamily:'Impact'});ellipse(.67,.68,.26,.22);body(.07,.68,.53,.13);cta(.07,.86,.53,.08);break;
    case 'soft-arch':
      rect(.65,.09,.28,.81,p.accent,.14);rect(.72,.24,.14,.53,p.bg,.07);eyebrow(.07,.085,.51);headline(.07,.27,.52,.34,.087,{fontFamily:'Georgia'});body(.07,.65,.52,.13);cta(.07,.84,.52);break;
    case 'orbital':
      ellipse(.57,.12,.36,.64,p.surface);ellipse(.63,.23,.24,.42,p.accent);ellipse(.69,.34,.12,.2,p.bg);eyebrow(.07,.075,.46);headline(.07,.27,.49,.34,.09);body(.07,.66,.5,.13);cta(.07,.85,.86,.08);break;
    case 'three-cards':
      eyebrow();headline(.07,.19,.86,.27,.085);body(.07,.48,.86,.12);
      for(let index=0;index<3;index++){rect(.07+index*.295,.64,.27,.14,index===1?p.accent:p.surface,.012);text(`0${index+1}`,.09+index*.295,.68,.23,.06,.045,index===1?p.accentInk:p.ink);}
      cta(.07,.84,.86);break;
    case 'quote-card':
      text('“',.07,.07,.24,.18,.23,p.accent,{fontFamily:'Georgia'});eyebrow(.32,.095,.6,.065);headline(.1,.3,.8,.32,.084,{fontFamily:'Georgia'});body(.1,.66,.8,.12);cta(.1,.84,.8);break;
    case 'diagonal':
      add('triangle',{x:width*.57,y:height*.17,w:width*.36,h:height*.58,fill:p.accent});rect(.66,.24,.15,.27,p.bg,.03);eyebrow(.07,.075,.48);headline(.07,.25,.48,.35,.092);body(.07,.65,.5,.14);cta(.07,.85,.86,.08);break;
    case 'two-columns':
      eyebrow();headline(.07,.2,.86,.29,.09,{fontFamily:'Georgia'});rect(.07,.54,.86,.004,p.accent);body(.07,.61,.53,.22);rect(.67,.61,.26,.15,p.surface,.01);text('01 / NOVOS OLHARES',.69,.65,.22,.07,.025);cta(.07,.87,.86,.075);break;
    case 'horizon':
      rect(0,.57,1,.43,p.surface);eyebrow();headline(.07,.22,.86,.3,.1);rect(.07,.61,.13,.012,p.accent);body(.25,.63,.67,.14);cta(.25,.83,.67);break;
    case 'bulletin':
      eyebrow();headline(.07,.18,.86,.28,.09);rect(.07,.51,.055,.25,p.accent);body(.17,.51,.76,.16);rect(.17,.72,.76,.006,p.muted);text('UM CONVITE PARA O PRÓXIMO PASSO',.17,.76,.76,.06,.022,p.muted);cta(.07,.87,.86,.075);break;
    case 'showcase':
      rect(.06,.06,.88,.88,p.surface,.04);rect(.12,.13,.09,.08,p.accent,.02);eyebrow(.26,.14,.6,.06);headline(.12,.31,.76,.29,.089,{align:'center'});body(.12,.64,.76,.12);cta(.12,.82,.76,.08);break;
    case 'ticket':
      rect(.07,.12,.86,.76,p.surface,.05);rect(.11,.19,.09,.62,p.accent,.025);eyebrow(.26,.2,.6,.06);headline(.26,.34,.59,.25,.076);body(.26,.63,.59,.1);cta(.26,.77,.59,.07);break;
    case 'minimal-line':
      rect(.07,.075,.12,.008,p.accent);eyebrow(.07,.15,.86,.06);headline(.07,.31,.86,.29,.09,{fontFamily:'Georgia'});body(.07,.66,.68,.12);rect(.07,.82,.86,.003,p.muted);text(brief.cta,.07,.87,.86,.07,.029,p.ink,{fontStyle:'bold'});break;
    case 'mosaic':
      rect(.64,.07,.29,.2,p.accent,.025);rect(.64,.3,.13,.19,p.surface,.025);rect(.8,.3,.13,.4,p.accent,.025);rect(.64,.52,.13,.18,p.ink,.025);eyebrow(.07,.09,.5);headline(.07,.28,.5,.31,.088);body(.07,.65,.51,.15);cta(.07,.86,.86,.08);break;
    case 'spotlight':
      ellipse(.57,.08,.35,.37,p.accent);ellipse(.65,.16,.19,.2,p.bg);eyebrow(.07,.085,.46);headline(.07,.28,.85,.3,.096);body(.07,.63,.86,.13);rect(.07,.79,.86,.006,p.accent);cta(.07,.85,.86,.08);break;
  }
  return parsePage({id:'generated-page',name:'Página 1',width,height,background:p.bg,elements});
}
export function getTemplate(id){
  const original=templates.find(template=>template.id===id);
  if(original)return structuredClone(original);
  for(const layout of layouts)for(const palette of palettes)for(const topic of topics)for(const format of formats){
    if(id!==idFor(layout[0],palette.id,topic.id,format.id))continue;
    const item=descriptor(layout,palette,topic,format);
    const page=designFromBrief({layout:layout[0],palette:palette.id,headline:topic.headline,body:topic.body,eyebrow:topic.eyebrow,cta:topic.cta},{width:format.width,height:format.height});
    return {...item,page:{...page,id}};
  }
  throw new RangeError('Template não encontrado.');
}
