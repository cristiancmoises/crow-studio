import {isDemoMode,demoApi} from './demo';
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
  if(isDemoMode())return demoApi(path,options);
  const response=await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.error||'Não foi possível concluir.'),{status:response.status});
  return data;
}
export const body=(value:unknown)=>JSON.stringify(value);
