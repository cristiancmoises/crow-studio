import { scryptSync,randomBytes,createHmac,timingSafeEqual,createHash } from 'node:crypto';

export function createAuth(password,{secret,secure=false}={}) {
  if(typeof password!=='string'||password.length<16)throw new Error('Defina STUDIO_PASSWORD com pelo menos 16 caracteres. Execute sh scripts/start.sh para gerar uma senha.');
  const salt=randomBytes(16),hash=scryptSync(password,salt,64),key=secret||createHash('sha256').update(password).digest();
  const sign=text=>createHmac('sha256',key).update(text).digest('base64url');
  const cookie=(value,maxAge)=>`crow_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`;
  return {
    verifyPassword(value){return typeof value==='string'&&value.length<=256&&timingSafeEqual(hash,scryptSync(value,salt,64));},
    login(){const value=Buffer.from(JSON.stringify({expires:Date.now()+12*60*60*1000,nonce:randomBytes(12).toString('hex')})).toString('base64url');return cookie(`${value}.${sign(value)}`,43200);},
    logout:()=>cookie('',0),
    valid(req){
      try {
        const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('crow_session='))?.slice(13);
        if(!token||token.length>1000)return false;
        const [payload,signature,...rest]=token.split('.');
        if(rest.length||!signature)return false;
        const expected=Buffer.from(sign(payload)),actual=Buffer.from(signature);
        return actual.length===expected.length&&timingSafeEqual(actual,expected)&&JSON.parse(Buffer.from(payload,'base64url').toString()).expires>Date.now();
      }catch{return false;}
    }
  };
}
