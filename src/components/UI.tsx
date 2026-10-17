import {useEffect,useId,useRef,type ReactNode} from 'react';
import {X,ArrowUpRight,LoaderCircle} from 'lucide-react';
import {toSvg} from '../../shared/scene.js';
import type {Page} from '../types';

export function Logo({small=false}:{small?:boolean}){return <div className={'logo '+(small?'small':'')}><img src="/crow.svg" alt="Corvo, símbolo do Crow Studio"/><span>Crow<span className="logo-studio">Studio</span></span></div>;}
export function Spinner(){return <LoaderCircle size={18} className="spin" aria-label="Carregando"/>;}
export function Preview({page,className=''}:{page:Page;className?:string}){
  return <div className={'scene-preview '+className} style={{background:page.background}} dangerouslySetInnerHTML={{__html:toSvg(page)}}/>;
}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null),id=useId(),closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    (ref.current?.querySelector<HTMLElement>('input,textarea,select')||ref.current?.querySelector<HTMLElement>('button,[tabindex="0"]'))?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeRef.current();}if(e.key==='Tab'){
      const list=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')||[]);
      const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }};
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={'modal '+(wide?'wide':'')}><header><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20}/></button></header>{children}</div></div>;
}
export function Empty({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="empty-state"><div className="empty-orbit"><ArrowUpRight size={25}/></div><div><h3>{title}</h3><p>{description}</p></div>{action}</div>;}
