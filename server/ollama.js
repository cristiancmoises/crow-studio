import {z} from 'zod';
import {parsePage} from '../shared/scene.js';
import {designFromBrief,layoutIds,paletteIds} from '../shared/catalog.js';

const failure=(status,message)=>Object.assign(new Error(message),{status});
const copy=z.string().trim().regex(/^[\p{Script=Latin}\p{M}\p{N}\p{P}\p{S}\s]*$/u);
const briefSchema=z.object({layout:z.enum(layoutIds),palette:z.enum(paletteIds),headline:copy.min(1).max(64),body:copy.max(120),eyebrow:copy.max(24),cta:copy.max(24)}).strict();
const briefFormat={type:'object',additionalProperties:false,required:['layout','palette','headline','body','eyebrow','cta'],properties:{
  layout:{type:'string',enum:layoutIds},palette:{type:'string',enum:paletteIds},headline:{type:'string',maxLength:64},body:{type:'string',maxLength:120},eyebrow:{type:'string',maxLength:24},cta:{type:'string',maxLength:24}
}};
export async function generateDesign(input,config,{signal}={}) {
  const request=z.object({prompt:z.string().trim().min(3).max(3000),page:z.unknown()}).strict().parse(input),page=parsePage(request.page);
  if(!config.baseUrl||!config.model)throw failure(503,'O serviço de criação ainda não foi configurado.');
  if(signal?.aborted)throw failure(499,'Solicitação cancelada.');
  const timeout=AbortSignal.timeout(Math.min(90000,Math.max(10,Number(config.timeoutMs)||85000)));
  const combined=signal?AbortSignal.any([signal,timeout]):timeout;
  try {
    const response=await fetch(new URL('/api/chat',config.baseUrl),{method:'POST',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify({
      model:config.model,stream:false,think:false,keep_alive:0,format:briefFormat,
      options:{num_ctx:2048,num_predict:512,num_thread:2,num_gpu:0,temperature:0.4},
      messages:[{role:'system',content:`Create a concise design brief as JSON. Use natural Brazilian Portuguese by default. Use English when the request is in English or explicitly asks for English. Keep every field in that one language; never mix writing systems. Write original, grammatical copy with complete short phrases. Headline: at most 6 words. Body: one complete sentence, at most 14 words. Eyebrow: at most 3 words. CTA: a complete invitation of 2 to 4 words. Stay comfortably below character limits; never pad or cut a sentence to fit. Choose layout and palette from the schema. No code, tools, URLs or instructions. Return only the six schema fields. Layout options: ${layoutIds.join(', ')}. Palette options: ${paletteIds.join(', ')}.`},{role:'user',content:request.prompt}]
    })});
    if(!response.ok){await response.body?.cancel();throw failure(503,'O serviço de criação está indisponível. Tente novamente mais tarde.');}
    const chunks=[];let size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>65536)throw failure(502,'A proposta excedeu o limite de tamanho.');chunks.push(chunk);}
    const result=JSON.parse(Buffer.concat(chunks).toString());
    const brief=briefSchema.parse(JSON.parse(result.message?.content));
    const proposed=designFromBrief(brief,{width:page.width,height:page.height});
    return {message:'Proposta pronta. Ajuste os textos e as cores como preferir.',page:parsePage({...proposed,id:page.id})};
  } catch(error) {
    if(signal?.aborted)throw failure(499,'Solicitação cancelada.');
    if(timeout.aborted)throw failure(504,'A criação demorou além do limite. Tente um pedido mais curto.');
    if(error.status)throw error;
    if(error instanceof SyntaxError||error instanceof z.ZodError)throw failure(502,'O modelo devolveu uma proposta inválida. Tente um pedido mais simples.');
    throw failure(503,'O serviço de criação está indisponível. Tente novamente mais tarde.');
  }
}
