import {maskTexts,restore} from './privacy.mjs';
const $=s=>document.querySelector(s);let pending=null,mappings=[];
const status=text=>$('#status').textContent=text;
async function init(){const saved=await chrome.storage.local.get('terms');$('#terms').value=saved.terms??'';const session=await chrome.storage.session.get('mappings');mappings=session.mappings??[];}
init().catch(e=>status(e.message));
function invalidate(){pending=null;$('#insert').disabled=true;$('#masked').value='';}
$('#prompt').oninput=invalidate;
$('#terms').oninput=()=>{invalidate();chrome.storage.local.set({terms:$('#terms').value}).catch(e=>status(e.message));};
$('#mask').onclick=async()=>{
 try{const text=$('#prompt').value;if(!text.trim())throw new Error('Bitte einen Prompt eingeben.');if(text.length>50000)throw new Error('Maximal 50.000 Zeichen.');const result=maskTexts([text],$('#terms').value.split('\n'));pending=result.texts[0];mappings=result.mappings;$('#masked').value=pending;$('#count').textContent=`${mappings.length} unterschiedliche Angaben maskiert. Prüfe alle Inhalte.`;await chrome.storage.session.set({mappings});$('#insert').disabled=false;status('Es wurde nichts an eine Webseite gesendet.');}catch(e){status(e.message);}
};
$('#insert').onclick=async()=>{
 try{
  if(!pending)throw new Error('Zuerst maskieren.');
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id||!/^https?:/.test(tab.url??''))throw new Error('Öffne zuerst eine KI-Webseite.');
  const result=await chrome.scripting.executeScript({target:{tabId:tab.id},args:[pending],func:text=>{
    const editable=e=>e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement&&['text','search'].includes(e.type)||e instanceof HTMLElement&&e.isContentEditable;
    const visible=e=>Boolean(e.getClientRects().length)&&!e.disabled&&!e.readOnly;
    let target=document.activeElement;
    if(!editable(target)||!visible(target)){
      const candidates=[...document.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"]')].filter(e=>editable(e)&&visible(e));
      if(candidates.length!==1)return {ok:false,error:'Klicke zuerst in das gewünschte Eingabefeld. Mehrdeutige Felder werden nicht gewählt.'};
      target=candidates[0];
    }
    const existing=target.isContentEditable?target.textContent:target.value;
    if(existing.trim())return {ok:false,error:'Das Ziel enthält bereits Text. Bitte zuerst selbst leeren, damit nichts überschrieben wird.'};
    target.focus();
    if(target.isContentEditable)target.textContent=text;
    else{const proto=target instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(target,text);}
    target.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));target.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true};
  }});
  if(!result[0]?.result?.ok)throw new Error(result[0]?.result?.error??'Einfügen nicht möglich.');status('Maskierter Text eingefügt. Auf der Webseite prüfen und selbst absenden.');
 }catch(e){status(e.message);}
};
$('#restore').onclick=()=>{$('#restored').textContent=restore($('#answer').value,mappings);status('Nur lokal wiederhergestellt.');};
