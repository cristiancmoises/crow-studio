import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { isIP } from 'node:net';
import { z } from 'zod';
import { parseDocument,color,fonts } from '../shared/scene.js';
import { createStore } from './store.js';
import { createAuth } from './auth.js';

const failure=(status,message)=>Object.assign(new Error(message),{status});
const maxBody=24*1024*1024;
async function json(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw failure(415,'Envie application/json.');
  if(Number(req.headers['content-length'])>maxBody)throw failure(413,'Arquivo excede o limite de 24 MB.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>maxBody)throw failure(413,'Arquivo excede o limite de 24 MB.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw failure(400,'JSON inválido.');}
}
const brandSchema=z.object({name:z.string().trim().min(1).max(80),colors:z.array(color).min(1).max(8),fontFamily:z.enum(fonts)}).strict();
const updateSchema=z.object({document:z.unknown(),revision:z.number().int().positive(),favorite:z.boolean().optional()}).strict();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
function normalizeIp(value) {
  if(typeof value!=='string')return null;
  const family=isIP(value);
  if(family===4)return value;
  if(family!==6)return null;
  if(value.includes('%'))return value;
  const address=new URL(`http://[${value}]/`).hostname.slice(1,-1);
  const mapped=address.match(/^::ffff:([\da-f]+):([\da-f]+)$/);
  if(!mapped)return address;
  const high=parseInt(mapped[1],16),low=parseInt(mapped[2],16);
  return `${high>>8}.${high&255}.${low>>8}.${low&255}`;
}
export function createApp(options={}) {
  const {password=process.env.STUDIO_PASSWORD,dataDir=process.env.DATA_DIR||'data',distDir=resolve('dist'),secret=process.env.SESSION_SECRET,secure=process.env.COOKIE_SECURE==='true',publicUrl=process.env.PUBLIC_URL||'',trustedProxyIps=process.env.TRUSTED_PROXY_IPS||'',aiConfig={},generateDesign}=options;
  if(typeof trustedProxyIps!=='string')throw new Error('TRUSTED_PROXY_IPS deve conter apenas endereços IP válidos.');
  const trustedProxies=new Set(trustedProxyIps.split(',').map(value=>value.trim()).filter(Boolean).map(value=>{
    const address=normalizeIp(value);
    if(!address)throw new Error('TRUSTED_PROXY_IPS deve conter apenas endereços IP válidos.');
    return address;
  }));
  const auth=createAuth(password,{secret,secure}),store=createStore(dataDir),attempts=new Map();
  let aiBusy=false,aiCount=0,aiWindow=Date.now();
  const send=(res,status,body,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(body));};
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const path=new URL(req.url,'http://localhost').pathname,method=req.method;
      if(path==='/healthz'&&method==='GET')return send(res,store.health()?200:503,{status:'ok',version:'0.1.0'});
      if(path.startsWith('/api/')) {
        if(!['GET','HEAD','OPTIONS'].includes(method)&&req.headers.origin) {
          let origin;try{origin=new URL(req.headers.origin).origin;}catch{throw failure(403,'Origem não permitida.');}
          const allowed=publicUrl?new URL(publicUrl).origin:`${secure?'https':'http'}://${req.headers.host}`;
          if(origin!==allowed)throw failure(403,'Origem não permitida.');
        }
        if(path==='/api/session'&&method==='GET')return send(res,200,{authenticated:auth.valid(req)});
        if(path==='/api/session'&&method==='POST') {
          const peer=normalizeIp(req.socket.remoteAddress)||'local';
          const address=(trustedProxies.has(peer)&&normalizeIp(req.headers['x-real-ip']))||peer,now=Date.now();
          if(attempts.size>2048)for(const[k,v]of attempts)if(now-v.start>900000)attempts.delete(k);
          const entry=attempts.get(address)||{start:now,count:0};
          if(now-entry.start>900000){entry.start=now;entry.count=0;}
          if(entry.count>=10)throw failure(429,'Muitas tentativas. Aguarde 15 minutos.');
          entry.count++;attempts.set(address,entry);
          const input=await json(req);
          if(!auth.verifyPassword(input?.password))throw failure(401,'Senha incorreta.');
          attempts.delete(address);return send(res,200,{authenticated:true},{'Set-Cookie':auth.login()});
        }
        if(!auth.valid(req))throw failure(401,'Entre no seu estúdio para continuar.');
        if(path==='/api/session'&&method==='DELETE')return send(res,200,{authenticated:false},{'Set-Cookie':auth.logout()});
        if(path==='/api/projects'&&method==='GET')return send(res,200,{projects:store.list()});
        if(path==='/api/projects'&&method==='POST')return send(res,201,store.create(parseDocument(z.object({document:z.unknown()}).strict().parse(await json(req)).document)));
        const match=path.match(/^\/api\/projects\/([\w-]{1,80})$/);
        if(match) {
          const id=match[1],current=store.get(id);
          if(!current)throw failure(404,'Projeto não encontrado.');
          if(method==='GET')return send(res,200,current);
          if(method==='PUT') {
            const input=updateSchema.parse(await json(req)),document=parseDocument(input.document);
            const result=store.update(id,document,input.revision,input.favorite);
            if(!result)throw failure(409,'Este projeto mudou em outra aba. Baixe seu JSON ou salve uma cópia para preservar suas alterações.');
            return send(res,200,result);
          }
          if(method==='DELETE'){
            const {revision}=z.object({revision:z.number().int().positive()}).strict().parse(await json(req));
            if(!store.remove(id,revision))throw failure(409,'Projeto alterado em outra aba. Atualize antes de excluir.');
            return send(res,200,{deleted:true});
          }
        }
        if(path==='/api/brand'&&method==='GET')return send(res,200,store.getBrand());
        if(path==='/api/brand'&&method==='PUT')return send(res,200,store.setBrand(brandSchema.parse(await json(req))));
        if(path==='/api/ai/status'&&method==='GET')return send(res,200,{configured:Boolean(aiConfig.apiKey&&aiConfig.baseUrl&&aiConfig.model),engine:'Qwen Code',version:'0.25.2',model:aiConfig.model||null});
        if(path==='/api/ai/design'&&method==='POST') {
          if(!aiConfig.apiKey||!aiConfig.baseUrl||!aiConfig.model||!generateDesign)throw failure(503,'Configure OPENAI_API_KEY, OPENAI_BASE_URL e OPENAI_MODEL no servidor para ativar o Qwen Code.');
          const input=await json(req);
          if(res.destroyed)return;
          if(aiBusy)throw failure(429,'O Qwen está trabalhando. Tente novamente em instantes.');
          if(Date.now()-aiWindow>3600000){aiCount=0;aiWindow=Date.now();}
          if(aiCount>=12)throw failure(429,'Limite de 12 criações por hora neste estúdio.');
          aiBusy=true;aiCount++;
          const controller=new AbortController(),onClose=()=>{if(!res.writableEnded)controller.abort();};
          res.once('close',onClose);
          try{const result=await generateDesign(input,aiConfig,{signal:controller.signal});if(!res.destroyed)return send(res,200,result);return;}
          finally{res.removeListener('close',onClose);aiBusy=false;}
        }
        throw failure(404,'Rota não encontrada.');
      }
      if(!['GET','HEAD'].includes(method))throw failure(405,'Método não permitido.');
      const root=resolve(distDir),file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
      if(!file.startsWith(root+sep))throw failure(403,'Caminho não permitido.');
      let chosen=file,encoding;
      const accept=req.headers['accept-encoding']||'';
      for(const [suffix,name] of [['.br','br'],['.gz','gzip']]) {
        if(accept.includes(name)){try{await stat(file+suffix);chosen=file+suffix;encoding=name;break;}catch{}}
      }
      const bytes=await readFile(chosen);
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache',...(encoding?{'Content-Encoding':encoding,Vary:'Accept-Encoding'}:{}),'Content-Length':bytes.length});
      res.end(method==='HEAD'?undefined:bytes);
    } catch(error) {
      const status=error.status||(error instanceof z.ZodError?400:error.code==='ENOENT'?404:500);
      if(status>=500&&status!==503)console.error('[crow]',error.message);
      if(!res.headersSent)send(res,status,{error:status===500?'Não foi possível concluir. Tente novamente.':error instanceof z.ZodError?'Dados inválidos. Verifique tamanhos, cores e elementos.':error.message});
      else res.end();
    }
  });
  server.requestTimeout=30000;server.headersTimeout=15000;
  return {server,store,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();}};
}
