import { z } from 'zod';

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `e${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;
export const fonts = ['Arial','Georgia','Verdana','Impact','Courier New','Trebuchet MS'];
export function contrastInk(background){
  if(background==='transparent')return '#f5f7f2';
  let value=background.slice(1);if(value.length===3)value=value.split('').map(c=>c+c).join('');
  const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);
  return (r*299+g*587+b*114)/1000<145?'#f5f7f2':'#192b31';
}
export const color = z.string().regex(/^(#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8}|transparent)$/i);
const number = (min,max) => z.number().finite().min(min).max(max);
const identifier = z.string().min(1).max(80).regex(/^[\w-]+$/);
const raster = z.string().max(4_200_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/);
export const elementSchema = z.object({
  id:identifier, type:z.enum(['text','rect','ellipse','triangle','line','image']),
  x:number(-8192,8192),y:number(-8192,8192),w:number(1,8192),h:number(1,8192),
  rotation:number(-3600,3600).default(0),fill:color.default('#ffffff'),
  opacity:number(0,1).default(1),stroke:color.default('transparent'),strokeWidth:number(0,100).default(0),
  radius:number(0,4096).default(0),locked:z.boolean().default(false),hidden:z.boolean().default(false),
  text:z.string().max(8000).default(''),fontSize:number(4,700).default(48),
  fontFamily:z.enum(fonts).default('Arial'),fontStyle:z.enum(['normal','bold','italic','bold italic']).default('normal'),
  align:z.enum(['left','center','right']).default('left'),src:raster.optional()
}).strict().refine(e=> e.type !== 'image' || Boolean(e.src),{message:'Imagem precisa de dados PNG, JPEG ou WebP.'});
export const pageSchema = z.object({
  id:identifier,name:z.string().trim().min(1).max(100),width:number(64,4096).int(),height:number(64,4096).int(),
  background:color,elements:z.array(elementSchema).max(200)
}).strict().refine(p=>new Set(p.elements.map(e=>e.id)).size===p.elements.length,{message:'IDs de elementos repetidos.'});
export const documentSchema = z.object({
  version:z.literal(1),name:z.string().trim().min(1).max(120),pages:z.array(pageSchema).min(1).max(20)
}).strict().refine(d=>new Set(d.pages.map(p=>p.id)).size===d.pages.length,{message:'IDs de páginas repetidos.'});
export const parsePage = input => pageSchema.parse(input);
export function parseDocument(input) {
  if (new TextEncoder().encode(JSON.stringify(input)).length>20*1024*1024) throw new Error('Projeto excede 20 MB.');
  return documentSchema.parse(input);
}
export function makeElement(type,properties={}) {
  return {id:uid(),type,x:80,y:80,w:360,h:type==='text'?160:240,rotation:0,fill:'#ffffff',opacity:1,
    stroke:'transparent',strokeWidth:0,radius:0,locked:false,hidden:false,text:type==='text'?'Seu texto aqui':'',
    fontSize:64,fontFamily:'Arial',fontStyle:'normal',align:'left',...properties};
}
export function createDocument(template) {
  if (!template) return {version:1,name:'Design sem título',pages:[{id:uid(),name:'Página 1',width:1080,height:1080,background:'#f7f7f2',elements:[]}]};
  const page = structuredClone(template.page);
  page.id=uid();page.elements=page.elements.map(e=>({...e,id:uid()}));
  return parseDocument({version:1,name:template.name,pages:[page]});
}
export const escapeXml = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function textLines(e) {
  const max = Math.max(1,Math.floor(e.w/(e.fontSize*0.56))),lines=[];
  for (const paragraph of e.text.split('\n')) {
    if (!paragraph) {lines.push('');continue;}
    let line='';
    for (const word of paragraph.split(' ')) {
      if (line && (line.length+word.length+1)>max) {lines.push(line);line='';}
      if (word.length>max) {
        if (line) {lines.push(line);line='';}
        for(let i=0;i<word.length;i+=max) {const chunk=word.slice(i,i+max);if(chunk.length===max)lines.push(chunk);else line=chunk;}
      } else line += (line?' ':'')+word;
    }
    if(line)lines.push(line);
  }
  return lines.slice(0,Math.max(1,Math.floor(e.h/(e.fontSize*1.2))));
}
export function toSvg(input) {
  const page=parsePage(input),esc=escapeXml;
  const parts=page.elements.filter(e=>!e.hidden).map(e=>{
    const attrs=`fill="${e.fill}" stroke="${e.stroke}" stroke-width="${e.strokeWidth}"`;
    let shape='';
    if(e.type==='rect')shape=`<rect width="${e.w}" height="${e.h}" rx="${e.radius}" ${attrs}/>`;
    if(e.type==='ellipse')shape=`<ellipse cx="${e.w/2}" cy="${e.h/2}" rx="${e.w/2}" ry="${e.h/2}" ${attrs}/>`;
    if(e.type==='triangle')shape=`<polygon points="${e.w/2},0 ${e.w},${e.h} 0,${e.h}" ${attrs}/>`;
    if(e.type==='line')shape=`<line x1="0" y1="0" x2="${e.w}" y2="${e.h}" stroke="${e.fill}" stroke-width="${Math.max(1,e.strokeWidth||4)}"/>`;
    if(e.type==='image')shape=`<image width="${e.w}" height="${e.h}" href="${esc(e.src)}" preserveAspectRatio="xMidYMid slice"/>`;
    if(e.type==='text') {
      const anchor=e.align==='center'?'middle':e.align==='right'?'end':'start',x=e.align==='center'?e.w/2:e.align==='right'?e.w:0;
      const lines=textLines(e).map((line,i)=>`<tspan x="${x}" y="${e.fontSize*.9+i*e.fontSize*1.2}">${esc(line)}</tspan>`).join('');
      shape=`<text fill="${e.fill}" font-family="${esc(e.fontFamily)}" font-size="${e.fontSize}" font-weight="${e.fontStyle.includes('bold')?'700':'400'}" font-style="${e.fontStyle.includes('italic')?'italic':'normal'}" text-anchor="${anchor}">${lines}</text>`;
    }
    return `<g transform="translate(${e.x} ${e.y}) rotate(${e.rotation})" opacity="${e.opacity}">${shape}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}"><rect width="100%" height="100%" fill="${page.background}"/>${parts.join('')}</svg>`;
}
