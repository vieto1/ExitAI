import {CreateWebWorkerMLCEngine,prebuiltAppConfig} from '@mlc-ai/web-llm';
export const modelId='Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
export const modelIds=[modelId,'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'];
let engine,pending,worker,loadedId;
function reset(){worker?.terminate();worker=null;engine=null;loadedId=null;}
async function bounded(promise,ms,message){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}finally{clearTimeout(timer);}}
export async function loadModel(progress,id=modelId){
 if(!modelIds.includes(id))throw new Error('Unbekanntes Browser-Modell.');
 if(engine&&loadedId===id)return engine;if(pending)return pending;if(engine)reset();
 pending=(async()=>{
  if(!navigator.gpu)throw new Error('Dieser Browser unterstützt WebGPU nicht. Bitte aktuelles Chrome oder Edge auf einem Computer verwenden.');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('Keine geeignete WebGPU-Grafik gefunden. Hardwarebeschleunigung im Browser aktivieren und Chrome oder Edge neu starten.');
  worker=new Worker(new URL('./model-worker.js',import.meta.url),{type:'module'});
  try{engine=await bounded(CreateWebWorkerMLCEngine(worker,id,{appConfig:{...prebuiltAppConfig,useIndexedDBCache:true},initProgressCallback:info=>progress(info.text)},{context_window_size:4096}),600000,'Der Modellstart dauert länger als zehn Minuten. Internet und freien Speicher prüfen, danach erneut starten.');loadedId=id;return engine;}
  catch(error){reset();throw new Error('KI-Modell konnte nicht geladen werden. Internet, freien Speicher und WebGPU prüfen. '+error.message);}
 })();
 try{return await pending;}finally{pending=null;}
}
export async function answer(messages,progress,id=modelId){
 const model=await loadModel(progress,id);progress('KI formuliert die Antwort …');
 try{
  const result=await bounded(model.chat.completions.create({messages,temperature:0.3,max_tokens:512,stream:false}),180000,'Nach drei Minuten liegt keine Antwort vor. Bitte kürzere Eingaben und ein Gerät mit schnellerer WebGPU-Grafik verwenden.');
  const text=result.choices[0]?.message?.content;if(!text)throw new Error('Das Modell hat keine Textantwort geliefert.');return text;
 }catch(error){reset();throw error;}
}
