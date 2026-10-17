import PptxGenJS from 'pptxgenjs';
import {parseDocument,textLines} from '../shared/scene.js';
import type {Document,SceneElement} from './types';

const pixelsPerInch=96;
const officeText=(text:string)=>text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/gu,'\ufffd');

function paint(value:string,opacity=1){
  if(value==='transparent')return {color:'FFFFFF',transparency:100};
  let hex=value.slice(1);
  if(hex.length===3)hex=hex.split('').map(character=>character+character).join('');
  const alpha=hex.length===8?parseInt(hex.slice(6),16)/255:1;
  return {color:hex.slice(0,6).toUpperCase(),transparency:Math.round((1-alpha*opacity)*100)};
}

function position(element:SceneElement,scale:number,offsetX:number,offsetY:number){
  const angle=element.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  return {
    x:offsetX+(element.x+(element.w*cos-element.h*sin-element.w)/2)*scale,
    y:offsetY+(element.y+(element.w*sin+element.h*cos-element.h)/2)*scale,
    w:element.w*scale,h:element.h*scale,rotate:((element.rotation%360)+360)%360
  };
}

async function rasterForPptx(src:string){
  if(typeof Image==='undefined')throw new Error('A exportação de apresentações com imagens requer um navegador.');
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Não foi possível incorporar uma imagem na apresentação.'));
    image.src=src;
  });
  const width=image.naturalWidth,height=image.naturalHeight;
  if(!width||!height)throw new Error('A imagem da apresentação não possui dimensões válidas.');
  if(!src.startsWith('data:image/webp;'))return {data:src,width,height};
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  try{
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Este navegador não oferece conversão de imagens para apresentações.');
    context.drawImage(image,0,0);
    const data=canvas.toDataURL('image/png');
    if(!data.startsWith('data:image/png;'))throw new Error('Não foi possível converter a imagem para PNG.');
    return {data,width,height};
  }finally{canvas.width=0;canvas.height=0;}
}

export async function createPptx(input:Document):Promise<PptxGenJS>{
  const doc=parseDocument(input) as Document,presentation=new PptxGenJS(),first=doc.pages[0];
  presentation.defineLayout({name:'CROW',width:first.width/pixelsPerInch,height:first.height/pixelsPerInch});
  presentation.layout='CROW';presentation.title=officeText(doc.name);presentation.subject='Crow Studio';
  presentation.author='Crow Studio';presentation.company='Security Ops';
  for(const page of doc.pages){
    const slide=presentation.addSlide(),fit=Math.min(first.width/page.width,first.height/page.height),scale=fit/pixelsPerInch;
    const offsetX=(first.width-page.width*fit)/(2*pixelsPerInch),offsetY=(first.height-page.height*fit)/(2*pixelsPerInch);
    slide.background=paint(page.background);
    for(const element of page.elements){
      if(element.hidden)continue;
      const bounds=position(element,scale,offsetX,offsetY),fill=paint(element.fill,element.opacity);
      if(element.type==='text'){
        slide.addText(officeText(textLines(element).join('\n')),{
          ...bounds,...fill,fontSize:element.fontSize*scale*72,fontFace:element.fontFamily,
          bold:element.fontStyle.includes('bold'),italic:element.fontStyle.includes('italic'),align:element.align,
          margin:0,valign:'top',lineSpacingMultiple:1.2,paraSpaceAfter:0,breakLine:false,fit:'none',
          objectName:element.id
        });
      }else if(element.type==='image'){
        const image=await rasterForPptx(element.src!);
        slide.addImage({
          ...bounds,data:image.data,w:image.width*scale,h:image.height*scale,
          sizing:{type:'cover',w:bounds.w,h:bounds.h},transparency:Math.round((1-element.opacity)*100),
          objectName:element.id,altText:'Imagem do projeto'
        });
      }else{
        const shape=element.type==='ellipse'?presentation.ShapeType.ellipse:element.type==='triangle'?presentation.ShapeType.triangle:element.type==='line'?presentation.ShapeType.line:element.radius>0?presentation.ShapeType.roundRect:presentation.ShapeType.rect;
        slide.addShape(shape,{
          ...bounds,fill:element.type==='line'?{color:'FFFFFF',transparency:100}:fill,
          line:element.type==='line'?{...fill,width:(element.strokeWidth||4)*scale*72}:{...paint(element.stroke,element.opacity),width:element.strokeWidth*scale*72},
          ...(element.type==='rect'&&element.radius>0?{rectRadius:Math.min(element.radius,element.w/2,element.h/2)*scale}:{}),
          objectName:element.id
        });
      }
    }
  }
  return presentation;
}

export async function exportPptx(doc:Document):Promise<void>{
  const presentation=await createPptx(doc),name=doc.name.replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,100)||'crow-design';
  await presentation.writeFile({fileName:name+'.pptx',compression:true});
}
