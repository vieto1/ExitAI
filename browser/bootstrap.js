import {prepare} from '../request.mjs';
import {maskTexts,restore} from '../privacy.mjs';
import {browserDocument} from './documents.js';
import {modelId,modelIds,loadModel,answer} from './runtime.js';
const originalFetch=globalThis.fetch.bind(globalThis);
const panel=document.createElement('section');panel.className='pilot-panel';panel.setAttribute('aria-label','Browser-KI starten');
panel.innerHTML='<strong>Online-Pilot · KI auf deinem Gerät</strong><p>Kein Freigabe-Mac nötig. Aktuelles Chrome oder Edge mit WebGPU verwenden. Vor der ersten Antwort das Modell laden: etwa 0,85 GB für 1,5B oder 0,3 GB für das kleinere 0,5B-Modell. Zusätzlich wird Arbeitsspeicher benötigt. Nur Beispieldaten verwenden.</p><button type="button" class="primary">KI laden &amp; starten</button><p role="status" aria-live="polite">Modell noch nicht geladen.</p>';
document.querySelector('#view-chat').prepend(panel);
const status=panel.querySelector('[role=status]'),button=panel.querySelector('button');
function progress(text){status.textContent=text;}
button.onclick=async()=>{button.disabled=true;const choice=document.querySelector('#model');choice.disabled=true;try{await loadModel(progress,choice.value||modelId);progress('KI bereit. Schreibe unten deine Frage.');button.textContent='KI ist bereit';}catch(e){progress(e.message);button.disabled=false;}finally{choice.disabled=false;}};
globalThis.exitaiFetch=async(path,options={})=>{
 if(typeof path!=='string'||!path.startsWith('/api/')&&!path.startsWith('/v1/'))return originalFetch(path,options);
 const url=new URL(path,location.origin);let input;
 try{
  if(options.body&&typeof options.body==='string')input=JSON.parse(options.body);
  let data;
  switch(url.pathname){
   case '/api/session':data={mode:'browser',role:'member',user:null};break;
   case '/api/config':data={providers:[{id:'ollama',name:'WebLLM · in diesem Browser',ready:true}]};break;
   case '/api/models':data={models:modelIds,connected:Boolean(navigator.gpu)};break;
   case '/api/documents/import':data=await browserDocument(await options.body.arrayBuffer(),url.searchParams.get('name'));break;
   case '/v1/mask':{const p=maskTexts([input.text],input.terms);data={masked:p.texts[0],mappings:p.mappings};break;}
   case '/api/preview':case '/api/chat':{
    const p=prepare(input),messages=[{role:'system',content:p.system},...p.messages];
    if(messages.reduce((n,m)=>n+m.content.length,0)>6000)throw new Error('Für die Browser-KI bitte höchstens 6.000 Zeichen aus Frage, Verlauf und ausgewählten Dokumenten verwenden. Einen neuen Chat starten oder kürzere Dokumentauszüge wählen.');
    if(url.pathname==='/api/preview'){data=p;break;}
    if(input.confirmed!==true)throw new Error('Bitte zuerst die maskierte Vorschau bestätigen.');
    if(input.provider!=='ollama'||!modelIds.includes(input.model))throw new Error('Im Browser-Piloten ist nur das angezeigte Browser-Modell verfügbar.');
    progress('KI arbeitet … Beim ersten Aufruf wird das Modell heruntergeladen.');
    const text=await answer(messages,progress,input.model);progress('KI bereit.');data={answer:restore(text,p.mappings),protectedFields:p.mappings.length,auditSaved:false};break;
   }
   default:throw new Error('Diese Server-Funktion ist im Browser-Piloten nicht verfügbar.');
  }
  return Response.json(data);
 }catch(error){progress(error.message);return Response.json({error:error.message},{status:400});}
};
await import('../app.js');
document.querySelector('#model').addEventListener('change',()=>{button.disabled=false;button.textContent='KI laden & starten';progress('Modell gewechselt. Beim nächsten Start wird dieses Modell geladen.');});
