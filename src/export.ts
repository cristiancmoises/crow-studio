import {toSvg} from '../shared/scene.js';
import type {Page,Document} from './types';
import {isDemoMode} from './demo';
export const safeName=(name:string)=>name.replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,100)||'crow-design';
export function download(data:Blob|string,name:string,type='application/json'){
  const blob=typeof data==='string'?new Blob([data],{type}):data,url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function raster(page:Page,multiplier:number){
  const scale=Math.min(multiplier,4096/page.width,4096/page.height),canvas=document.createElement('canvas');
  canvas.width=Math.round(page.width*scale);canvas.height=Math.round(page.height*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador não oferece exportação de imagem.');
  const url=URL.createObjectURL(new Blob([toSvg(page)],{type:'image/svg+xml;charset=utf-8'}));
  try{const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Não foi possível renderizar a página.'));i.src=url;});ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas;}finally{URL.revokeObjectURL(url);}
}
export async function exportDocument(doc:Document,current:number,format:string,multiplier=1){
  const name=safeName(doc.name),page=doc.pages[current];
  if(format==='json'){download(JSON.stringify(doc,null,2),name+'.json');return;}
  if(format==='pptx'){const {exportPptx}=await import('./pptx');await exportPptx(doc);return;}
  if(format==='svg'){download(toSvg(page),`${name}-${current+1}.svg`,'image/svg+xml');return;}
  if(format==='png'){const canvas=await raster(page,multiplier);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha na exportação PNG.')),'image/png'));download(blob,`${name}-${current+1}.png`);return;}
  if(format==='pdf'){
    const {jsPDF}=await import('jspdf');
    const first=doc.pages[0],pdf=new jsPDF({unit:'px',format:[first.width,first.height],orientation:first.width>first.height?'landscape':'portrait',hotfixes:['px_scaling'],compress:true});
    for(let i=0;i<doc.pages.length;i++){const p=doc.pages[i];if(i)pdf.addPage([p.width,p.height],p.width>p.height?'landscape':'portrait');const canvas=await raster(p,multiplier);pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,p.width,p.height);canvas.width=0;canvas.height=0;}
    pdf.save(name+'.pdf');
  }
}
export async function readImage(file:File):Promise<{src:string;width:number;height:number}>{
  if(isDemoMode())throw new Error('A importação de imagens está desabilitada na demonstração.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Escolha uma imagem PNG, JPEG ou WebP.');
  if(file.size>15*1024*1024)throw new Error('A imagem deve ter até 15 MB antes da otimização.');
  const bitmap=await createImageBitmap(file);
  try{const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível abrir esta imagem.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/webp',.86);if(src.length>4200000)throw new Error('Otimize a imagem para menos de 3 MB.');return {src,width:canvas.width,height:canvas.height};}finally{bitmap.close();}
}
