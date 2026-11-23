// Only the latest input may publish a result, even if an older request ignores abort.
export function liveSearch(load,apply,onError,delay=300){
 let timer,controller,version=0;
 const cancel=()=>{clearTimeout(timer);controller?.abort();version++;};
 const search=(value,immediate=false)=>{
  cancel();const current=version;
  timer=setTimeout(async()=>{
   controller=new AbortController();
   try{const result=await load(value,controller.signal);if(current===version)apply(result,value);}
   catch(error){if(current===version&&error.name!=='AbortError')onError(error);}
  },immediate?0:delay);
 };
 return {search,cancel};
}
