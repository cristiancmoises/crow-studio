export function createAutosave(initial,initialRevision,persist,onChange,delay=800) {
  let latest=initial,saved=JSON.stringify(initial),pending=null,revision=initialRevision,timer,inFlight=null,destroyed=false,lastError=null;
  const emit=(status,error)=>{if(!destroyed)onChange({status,error,revision});};
  const dirty=()=>pending!==null||lastError!==null||JSON.stringify(latest)!==saved;
  async function run() {
    clearTimeout(timer);
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      while(dirty()&&!destroyed) {
        const document=latest,snapshot=JSON.stringify(document);pending=snapshot;emit('saving');
        try {const result=await persist(document,revision);revision=result.revision;saved=snapshot;pending=null;lastError=null;}
        catch(error){pending=null;lastError=error;emit(error.status===409?'conflict':'error',error);throw error;}
      }
      emit(dirty()?'unsaved':'saved');
    })();
    try{await inFlight;}finally{inFlight=null;}
  }
  return {
    set(document){latest=document;clearTimeout(timer);if(!dirty()){emit('saved');return;}emit(lastError?.status===409?'conflict':'unsaved',lastError);if(lastError?.status!==409)timer=setTimeout(()=>run().catch(()=>{}),delay);},
    flush:run,dirty,
    destroy(){destroyed=true;clearTimeout(timer);}
  };
}
