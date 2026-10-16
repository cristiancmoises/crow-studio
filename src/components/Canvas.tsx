import {useEffect,useRef,useState} from 'react';
import {Stage,Layer,Rect,Ellipse,Line,Text,Image as KImage,Group,Transformer} from 'react-konva';
import Konva from 'konva';
import {textLines} from '../../shared/scene.js';
import {findElementNode} from '../../shared/selection.js';
import type {Page,SceneElement} from '../types';
export default function Canvas({page,selected,scale,onSelect,onPatch,onEditText}:{page:Page;selected:string|null;scale:number;onSelect:(id:string|null)=>void;onPatch:(id:string,patch:Partial<SceneElement>)=>void;onEditText:(id:string)=>void}){
  const layerRef=useRef<Konva.Layer>(null),transformer=useRef<Konva.Transformer>(null);
  useEffect(()=>{const node=selected?findElementNode(layerRef.current,selected):null;transformer.current?.nodes(node&&!page.elements.find(e=>e.id===selected)?.locked?[node]:[]);transformer.current?.getLayer()?.batchDraw();},[selected,page]);
  return <Stage width={page.width*scale} height={page.height*scale} scaleX={scale} scaleY={scale} onMouseDown={e=>{if(e.target===e.target.getStage()||e.target.name()==='page-bg')onSelect(null);}} onTouchStart={e=>{if(e.target===e.target.getStage()||e.target.name()==='page-bg')onSelect(null);}}><Layer ref={layerRef}><Rect name="page-bg" width={page.width} height={page.height} fill={page.background}/>{page.elements.filter(e=>!e.hidden).map(e=><Element key={e.id} element={e} onSelect={()=>onSelect(e.id)} onPatch={patch=>onPatch(e.id,patch)} onEditText={()=>onEditText(e.id)}/>)}<Transformer ref={transformer} rotateEnabled flipEnabled={false} borderStroke="#12cbbf" anchorFill="#fff" anchorStroke="#12cbbf" anchorSize={9/scale} borderStrokeWidth={1.4/scale} rotateAnchorOffset={28/scale} ignoreStroke boundBoxFunc={(oldBox,newBox)=>Math.abs(newBox.width)<12||Math.abs(newBox.height)<12?oldBox:newBox}/></Layer></Stage>;
}
function Element({element:e,onSelect,onPatch,onEditText}:{element:SceneElement;onSelect:()=>void;onPatch:(patch:Partial<SceneElement>)=>void;onEditText:()=>void}){
  const [image,setImage]=useState<HTMLImageElement>();
  useEffect(()=>{if(!e.src)return;let current=true;const img=new window.Image();img.onload=()=>{if(current)setImage(img);};img.src=e.src;return()=>{current=false;};},[e.src]);
  const props={fill:e.fill,stroke:e.stroke,strokeWidth:e.strokeWidth};
  return <Group id={e.id} x={e.x} y={e.y} width={e.w} height={e.h} rotation={e.rotation} opacity={e.opacity} draggable={!e.locked} onClick={evt=>{evt.cancelBubble=true;onSelect();}} onTap={evt=>{evt.cancelBubble=true;onSelect();}} onDblClick={()=>e.type==='text'&&!e.locked&&onEditText()} onDblTap={()=>e.type==='text'&&!e.locked&&onEditText()} onDragEnd={evt=>onPatch({x:Math.round(Math.max(-8192,Math.min(8192,evt.target.x()))),y:Math.round(Math.max(-8192,Math.min(8192,evt.target.y())))})} onTransformEnd={evt=>{
    const node=evt.target,sx=node.scaleX(),sy=node.scaleY();node.scaleX(1);node.scaleY(1);
    onPatch({x:Math.round(Math.max(-8192,Math.min(8192,node.x()))),y:Math.round(Math.max(-8192,Math.min(8192,node.y()))),rotation:Math.round(node.rotation()),w:Math.round(Math.max(8,Math.min(8192,e.w*sx))),h:Math.round(Math.max(8,Math.min(8192,e.h*sy))),...(e.type==='text'?{fontSize:Math.max(4,Math.min(700,Math.round(e.fontSize*sy)))}:{})});
  }}>
    {e.type==='rect'&&<Rect width={e.w} height={e.h} cornerRadius={e.radius} {...props}/>}
    {e.type==='ellipse'&&<Ellipse x={e.w/2} y={e.h/2} radiusX={e.w/2} radiusY={e.h/2} {...props}/>}
    {e.type==='triangle'&&<Line points={[e.w/2,0,e.w,e.h,0,e.h]} closed {...props}/>}
    {e.type==='line'&&<Line points={[0,0,e.w,e.h]} stroke={e.fill} strokeWidth={e.strokeWidth||4} hitStrokeWidth={20}/>}
    {e.type==='text'&&<Text text={textLines(e).join('\n')} width={e.w} height={e.h} fontSize={e.fontSize} fontFamily={e.fontFamily} fontStyle={e.fontStyle} fill={e.fill} align={e.align} lineHeight={1.2} wrap="none"/>}
    {e.type==='image'&&(image?<KImage image={image} width={e.w} height={e.h}/>:<Rect width={e.w} height={e.h} fill="#56636a"/>)}
  </Group>;
}
