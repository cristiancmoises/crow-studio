import {lazy,Suspense,useEffect,useState} from 'react';
import {ArrowRight,Eye,EyeOff,LockKeyhole,CheckCircle2,X,TriangleAlert} from 'lucide-react';
import {api,body} from './api';
import {Logo,Spinner} from './components/UI';
import Dashboard from './components/Dashboard';
import type {Project} from './types';
const Editor=lazy(()=>import('./components/Editor'));
export default function App(){
  const [session,setSession]=useState<boolean|null>(null),[project,setProject]=useState<Project|null>(null),[notice,setNotice]=useState(''),[aiStart,setAiStart]=useState(false),[failure,setFailure]=useState('');
  useEffect(()=>{api('/session').then(x=>setSession(x.authenticated)).catch(e=>setFailure(e.message));},[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
  const open=(p:Project,ai=false)=>{setAiStart(ai);setProject(p);};
  return <>{failure?<div className="full-loading"><TriangleAlert/><p>Não foi possível conectar ao estúdio.</p><button className="primary" onClick={()=>window.location.reload()}>Tentar novamente</button></div>:session===null?<div className="full-loading"><Logo/><Spinner/></div>:!session?<Login onLogin={()=>setSession(true)}/>:project?<Suspense fallback={<div className="full-loading"><Logo/><Spinner/></div>}><Editor key={project.id} project={project} startAi={aiStart} onOpen={open} onBack={()=>setProject(null)} notify={setNotice}/></Suspense>:<Dashboard onOpen={open} notify={setNotice} onLogout={async()=>{try{await api('/session',{method:'DELETE'});setSession(false);}catch(e:any){setNotice(e.message);}}}/>}
    {notice&&<div className="toast" role="status"><CheckCircle2 size={19}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
  </>;
}
function Login({onLogin}:{onLogin:()=>void}){
  const [password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await api('/session',{method:'POST',body:body({password})});onLogin();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  return <div className="login-page"><section className="login-story"><Logo/><div><span className="eyebrow">SEU ESPAÇO PARA CRIAR</span><h1>Suas ideias.<br/>Suas <em>asas.</em></h1><p>Um estúdio inteiro de possibilidades.<br/>Livre para criar. Seu por natureza.</p><div className="login-art" aria-hidden="true"><div/><div/><div/><img src="/crow.svg" alt=""/></div></div><footer>OPEN SOURCE <span>·</span> SELF-HOSTED <span>·</span> FEITO PARA VOCÊ</footer></section><section className="login-form"><div><span className="tiny-tag"><LockKeyhole size={13}/> SEU WORKSPACE PRIVADO</span><h2>Entre no seu estúdio</h2><p>Um lugar para tirar suas ideias do papel.</p><form onSubmit={submit}><label htmlFor="password">Senha do workspace</label><div className="password-field"><input id="password" type={show?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha de acesso"/><button type="button" aria-label={show?'Ocultar senha':'Mostrar senha'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary large" disabled={busy}>{busy?<Spinner/>:<>Abrir meu estúdio<ArrowRight size={19}/></>}</button></form><p className="login-help">A senha foi gerada ao iniciar o Crow Studio.<br/>Peça ao administrador do seu workspace se precisar.</p></div><footer>Crow Studio <span>By Security Ops®</span></footer></section></div>;
}
