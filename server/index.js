import {createApp} from './app.js';
import {generateDesign} from './qwen.js';
const app=createApp({generateDesign,trustedProxyIps:process.env.TRUSTED_PROXY_IPS||'',aiConfig:{apiKey:process.env.OPENAI_API_KEY,baseUrl:process.env.OPENAI_BASE_URL,model:process.env.OPENAI_MODEL,timeoutMs:Number(process.env.AI_TIMEOUT_MS||120000)}});
const port=Number(process.env.PORT||8080);
app.server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Crow Studio 0.1.0 · http://localhost:${app.server.address().port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await app.close();process.exit(0);});
