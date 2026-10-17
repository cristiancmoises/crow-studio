import {z} from 'zod';
import {parseDocument,documentSchema,color,fonts,uid} from './scene.js';

export const demoLimits={projects:5,pages:3,elements:60,dimension:1920,documentBytes:65536,storageBytes:524288};
export const demoStorageKey='crow-studio-demo-v1';
const failure=(status,message)=>Object.assign(new Error(message),{status});
const brandSchema=z.object({name:z.string().trim().min(1).max(80),colors:z.array(color).min(1).max(8),fontFamily:z.enum(fonts)}).strict();
const recordSchema=z.object({id:z.string().regex(/^[\w-]{1,80}$/),document:documentSchema,revision:z.number().int().positive(),favorite:z.boolean(),updatedAt:z.string()}).strict();
const stateSchema=z.object({version:z.literal(1),projects:z.array(recordSchema).max(demoLimits.projects),brand:brandSchema}).strict();
const initial=()=>({version:1,projects:[],brand:{name:'Minha marca',colors:['#67e8e3','#0b181c','#f5f7f2'],fontFamily:'Arial'}});
const bytes=value=>new TextEncoder().encode(value).length;

function checkDocument(input){
  const document=parseDocument(input);
  if(document.pages.length>demoLimits.pages||document.pages.some(page=>page.width>demoLimits.dimension||page.height>demoLimits.dimension||page.elements.length>demoLimits.elements))
    throw failure(413,'A demonstração permite até 3 páginas, 1920 px e 60 elementos por página.');
  if(document.pages.some(page=>page.elements.some(element=>element.type==='image')))
    throw failure(413,'Uploads e imagens importadas estão desabilitados na demonstração.');
  if(bytes(JSON.stringify(document))>demoLimits.documentBytes)
    throw failure(413,'O projeto excede os 64 KB permitidos na demonstração.');
  return document;
}
export {checkDocument as validateDemoDocument};

const projectView=project=>({...project,name:project.document.name,preview:project.document.pages[0]});
function parseBody(options){
  if(typeof options.body!=='string'||bytes(options.body)>demoLimits.documentBytes+1024)
    throw failure(413,'A operação excede o tamanho permitido na demonstração.');
  try{return JSON.parse(options.body);}catch{throw failure(400,'JSON inválido.');}
}

export function createDemoStore(storage){
  function load(){
    let value;
    try{value=storage.getItem(demoStorageKey);}catch{throw failure(507,'O navegador não permitiu acessar os dados da demonstração.');}
    if(value===null)return initial();
    try{
      if(bytes(value)>demoLimits.storageBytes)throw new Error('Storage limit');
      const state=stateSchema.parse(JSON.parse(value));
      for(const project of state.projects)checkDocument(project.document);
      return state;
    }catch{throw failure(409,'Os dados locais da demonstração não puderam ser lidos. Use Limpar demonstração para começar novamente.');}
  }
  function save(state){
    const value=JSON.stringify(state);
    if(bytes(value)>demoLimits.storageBytes)throw failure(413,'O armazenamento da demonstração está cheio. Exclua um projeto para continuar.');
    try{storage.setItem(demoStorageKey,value);}catch{throw failure(507,'O navegador não tem espaço para salvar a demonstração. Exporte seu projeto antes de continuar.');}
  }
  function request(path,options={}){
    const method=options.method||'GET';
    if(path==='/session'){
      if(method==='GET')return {authenticated:true};
      throw failure(403,'A demonstração não usa credenciais do estúdio.');
    }
    const match=path.match(/^\/projects\/([\w-]{1,80})$/);
    if(path!=='/projects'&&path!=='/brand'&&!match)throw failure(404,'Operação não disponível na demonstração.');
    const state=load();
    try{
      if(path==='/projects'&&method==='GET')return {projects:state.projects.toSorted((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(({document,...project})=>({...project,name:document.name,preview:document.pages[0]}))};
      if(path==='/projects'&&method==='POST'){
        if(state.projects.length>=demoLimits.projects)throw failure(413,'A demonstração permite até 5 projetos neste navegador. Exporte ou exclua um projeto para continuar.');
        const input=z.object({document:z.unknown()}).strict().parse(parseBody(options));
        const project={id:uid(),document:checkDocument(input.document),revision:1,favorite:false,updatedAt:new Date().toISOString()};
        state.projects.push(project);save(state);return projectView(project);
      }
      if(path==='/brand'&&method==='GET')return state.brand;
      if(path==='/brand'&&method==='PUT'){state.brand=brandSchema.parse(parseBody(options));save(state);return state.brand;}
      if(match){
        const index=state.projects.findIndex(project=>project.id===match[1]);
        if(index<0)throw failure(404,'Projeto não encontrado nesta demonstração.');
        const project=state.projects[index];
        if(method==='GET')return projectView(project);
        if(method==='PUT'){
          const input=z.object({document:z.unknown(),revision:z.number().int().positive(),favorite:z.boolean().optional()}).strict().parse(parseBody(options));
          if(input.revision!==project.revision)throw failure(409,'Este projeto mudou em outra aba. Exporte uma cópia para preservar suas alterações.');
          const updated={...project,document:checkDocument(input.document),revision:project.revision+1,favorite:input.favorite??project.favorite,updatedAt:new Date().toISOString()};
          state.projects[index]=updated;save(state);return projectView(updated);
        }
        if(method==='DELETE'){
          const input=z.object({revision:z.number().int().positive()}).strict().parse(parseBody(options));
          if(input.revision!==project.revision)throw failure(409,'Projeto alterado em outra aba. Atualize antes de excluir.');
          state.projects.splice(index,1);save(state);return {deleted:true};
        }
      }
      throw failure(404,'Operação não disponível na demonstração.');
    }catch(error){
      if(error instanceof z.ZodError)throw failure(400,'Os dados enviados não são válidos.');
      throw error;
    }
  }
  return {request};
}
