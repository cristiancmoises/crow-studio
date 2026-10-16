import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {brotliCompressSync,gzipSync,constants} from 'node:zlib';
async function compress(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())await compress(path);else if(/\.(js|css|svg|html)$/.test(entry.name)){const data=await readFile(path);if(data.length>512){await writeFile(path+'.br',brotliCompressSync(data,{params:{[constants.BROTLI_PARAM_QUALITY]:9}}));await writeFile(path+'.gz',gzipSync(data,{level:9}));}}}}
await compress('dist');
