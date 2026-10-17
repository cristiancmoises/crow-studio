import {createDemoStore,demoStorageKey} from '../shared/demo-store.js';

export const isDemoMode=()=>typeof window!=='undefined'&&['/demo','/demo/'].includes(window.location.pathname);
const store=createDemoStore({
  getItem:(key:string)=>window.localStorage.getItem(key),
  setItem:(key:string,value:string)=>window.localStorage.setItem(key,value)
});

export async function demoApi(path:string,options:RequestInit={}){
  if(path==='/ai/status'||path==='/ai/design'){
    const response=await fetch('/api/demo'+path,{...options,credentials:'omit',headers:{'Content-Type':'application/json',...options.headers}});
    const data=await response.json();
    if(!response.ok)throw Object.assign(new Error(data.error||'Não foi possível concluir a geração.'),{status:response.status});
    return data;
  }
  return store.request(path,options);
}

export function clearDemo(){window.localStorage.removeItem(demoStorageKey);window.location.reload();}
