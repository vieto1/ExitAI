import {readApiResponse} from '/api-response.js';
import {decodeState} from '/state.js';
const $=s=>document.querySelector(s);
const sessionResponse=await fetch('/api/session');
if(sessionResponse.status===401){location.replace('/login');throw new Error('Anmeldung erforderlich.');}
if(!sessionResponse.ok){$('#status').textContent='Verbindung zum Server fehlgeschlagen. Bitte die Seite neu laden.';$('#status').style.display='block';throw new Error('Sitzung konnte nicht geladen werden.');}
let runtime;try{runtime=await readApiResponse(sessionResponse);}catch(error){$('#status').textContent=error.message;$('#status').style.display='block';throw error;}
const storageKey=runtime.mode==='central'?`exitai-v1:${runtime.user.username}`:runtime.mode==='share'?'exitai-v1:share':'exitai-v1';
const templates={summary:{title:'Dokument zusammenfassen',text:'Fasse die angehängten Dokumente zusammen. Nenne die wichtigsten Aussagen, offene Fragen und Quellen.'},email:{title:'E-Mail formulieren',text:'Formuliere eine freundliche, professionelle E-Mail anhand folgender Stichpunkte:\n\n'},ideas:{title:'Ideen entwickeln',text:'Entwickle fünf konkrete Ideen zu folgendem Thema. Nenne jeweils Nutzen, Aufwand und einen ersten Schritt:\n\n'}};
let state={chats:[],documents:[],terms:'',prompts:[]},activeId=null,pending=null,busy=false;
try{const saved=JSON.parse(localStorage.getItem(storageKey)??'null');if(saved){state=decodeState(saved);activeId=state.currentId;}}catch{}
let toastTimer;
function toast(text){$('#status').textContent=text;$('#status').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#status').style.display='none',7000);}
function save(){state.currentId=activeId;try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{toast('Browser-Speicher voll oder gesperrt. Änderungen bleiben nur in dieser Sitzung.');}}
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function current(){return state.chats.find(c=>c.id===activeId);}
function view(name){document.querySelectorAll('.view').forEach(n=>n.classList.toggle('hidden',n.id!==`view-${name}`));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===name));$('#view-title').textContent=({chat:'KI-Arbeitsbereich',knowledge:'Wissensbasis',prompts:'Prompt-Bibliothek',privacy:'Datenschutz',audit:'Audit & API'})[name];if(name==='audit')loadAudit();}
function render(){
  const chat=current();$('#messages').replaceChildren();
  for(const m of chat?.messages??[]){const box=el('article',undefined,`message ${m.role}`);box.append(el('span',m.role==='user'?'Du':'ExitAI','role'),el('div',m.content));$('#messages').append(box);}
  $('#welcome').classList.toggle('hidden',Boolean(chat?.messages.length));
  $('#history').replaceChildren();
  for(const c of [...state.chats].reverse()){
    const row=el('div',undefined,'history-row'),b=el('button',c.title);b.disabled=busy;b.onclick=()=>{activeId=c.id;save();render();view('chat');};
    const rename=el('button','✎');rename.setAttribute('aria-label',`Chat ${c.title} umbenennen`);rename.disabled=busy;rename.onclick=()=>{const title=prompt('Neuer Chatname',c.title);if(title?.trim()){c.title=title.trim().slice(0,100);save();render();}};
    const del=el('button','×');del.setAttribute('aria-label',`Chat ${c.title} löschen`);del.disabled=busy;del.onclick=()=>{if(confirm(`Chat „${c.title}“ löschen?`)){state.chats=state.chats.filter(x=>x.id!==c.id);if(activeId===c.id)activeId=null;save();render();}};
    row.append(b,rename,del);$('#history').append(row);
  }
  const selected=state.documents.filter(d=>d.enabled!==false);
  $('#context-info').textContent=selected.length?`${selected.length} Dokument(e) als Kontext · ${selected.reduce((n,d)=>n+d.content.length,0).toLocaleString('de-DE')} Zeichen`:'';
  $('#documents').replaceChildren();
  state.documents.forEach((d,i)=>{const row=el('div'),label=el('label',undefined,'document-toggle'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=d.enabled!==false;checkbox.setAttribute('aria-label',`${d.name} im Chat verwenden`);checkbox.onchange=()=>{d.enabled=checkbox.checked;save();render();};label.append(checkbox,el('span',`${d.name} · ${d.content.length.toLocaleString('de-DE')} Zeichen`));row.append(label);const b=el('button','Entfernen');b.onclick=()=>{state.documents.splice(i,1);save();render();};row.append(b);$('#documents').append(row);});
  $('#custom-prompts').replaceChildren();
  state.prompts.forEach((p,i)=>{const row=el('div');const b=el('button',p.title);b.onclick=()=>usePrompt(p.text);const del=el('button','Löschen');del.onclick=()=>{state.prompts.splice(i,1);save();render();};row.append(b,del);$('#custom-prompts').append(row);});
}
function usePrompt(text){if(busy)return;view('chat');$('#message').value=text;$('#message').focus();}
async function api(path,data){const r=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const result=await readApiResponse(r);if(r.status===401&&runtime.mode==='central')location.assign('/login');if(!r.ok)throw new Error(result.error??'Anfrage fehlgeschlagen.');return result;}
function setBusy(value){busy=value;$('#preview-button').disabled=value;$('#new-chat').disabled=value;$('#send').disabled=value;render();}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>view(n.dataset.view));
$('#new-chat').onclick=()=>{if(busy)return;activeId=null;save();$('#message').value='';render();view('chat');};
document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>usePrompt(templates[b.dataset.template].text));
for(const t of Object.values(templates)){const b=el('button');b.append(el('strong',t.title),el('p',t.text));b.onclick=()=>usePrompt(t.text);$('#templates').append(b);}
$('#prompt-form').onsubmit=e=>{e.preventDefault();if(state.prompts.length>=200)return toast('Maximal 200 eigene Vorlagen.');if(!$('#prompt-title').value.trim())return toast('Bitte einen Titel eingeben.');state.prompts.push({title:$('#prompt-title').value.trim(),text:$('#prompt-text').value});save();e.target.reset();render();toast('Vorlage gespeichert.');};
$('#terms').value=state.terms;
$('#terms').oninput=()=>{state.terms=$('#terms').value;save();$('#terms-state').textContent='Schutzbegriffe lokal gespeichert.';};
$('#files').onchange=async e=>{
  for(const f of e.target.files){
    if(state.documents.length>=5){toast('Maximal fünf Dokumente.');break;}
    if(!/\.(pdf|docx|txt|md|csv)$/i.test(f.name)||f.size>10000000){toast(`${f.name}: PDF, DOCX, TXT, MD oder CSV, maximal 10 MB.`);continue;}
    try{const response=await fetch('/api/documents/import?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:f});const doc=await readApiResponse(response);if(!response.ok)throw new Error(doc.error);state.documents.push(doc);}catch(error){toast(error.message);}
  }
  e.target.value='';save();render();
};
$('#erase').onclick=()=>{if(busy)return toast('Bitte das Ende der laufenden Anfrage abwarten.');if(!confirm('Alle Chats, Dokumente, Vorlagen und Schutzbegriffe aus diesem Browser löschen? Das serverseitige Audit bleibt erhalten.'))return;state={chats:[],documents:[],terms:'',prompts:[]};activeId=null;save();$('#terms').value='';$('#message').value='';render();toast('Lokale App-Daten gelöscht.');};
$('#export-chat').onclick=()=>{const c=current();if(!c)return toast('Noch kein Chat zum Exportieren.');const text=c.messages.map(m=>`## ${m.role==='user'?'Du':'ExitAI'}\n\n${m.content}`).join('\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));const a=el('a');a.href=url;a.download='ExitAI-Chat.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#composer').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  const content=$('#message').value.trim();if(!content)return;
  if(!current()&&state.chats.length>=100)return toast('Maximal 100 Chats. Bitte alte Chats sichern und löschen.');
  const messages=[...(current()?.messages??[]).map(({role,content})=>({role,content})),{role:'user',content}];
  const request={messages,terms:state.terms.split('\n').filter(t=>t.trim()),documents:state.documents.filter(d=>d.enabled!==false).map(({name,content})=>({name,content})),provider:$('#provider').value,model:$('#model').value.trim()};
  setBusy(true);
  try{
    const preview=await api('/api/preview',request);pending={request,chatId:activeId,content};
    $('#preview-summary').textContent=`${preview.mappings.length} unterschiedliche Angaben maskiert · Ziel: ${request.provider} / ${request.model}${request.provider!=='ollama'?' · Versand an externen Cloud-Anbieter':''}`;
    $('#preview-content').textContent=`SYSTEM & WISSEN\n${preview.system}\n\n`+preview.messages.map(m=>`${m.role.toUpperCase()}\n${m.content}`).join('\n\n');
    $('#mapping-summary').textContent=`${preview.mappings.length} lokale Zuordnungen (werden nicht an das Modell gesendet)`;
    $('#mappings').replaceChildren(...preview.mappings.map(m=>el('div',`${m.marker} → ${m.value} (${m.kind})`)));
    $('#preview').showModal();
  }catch(err){toast(err.message);}finally{setBusy(false);}
};
function closePreview(){if(busy)return;$('#preview').close();pending=null;}
$('#close-preview').onclick=closePreview;$('#cancel-preview').onclick=closePreview;
$('#preview').addEventListener('cancel',e=>{if(busy)e.preventDefault();else pending=null;});
$('#send').onclick=async()=>{
  if(!pending||busy)return;const job=pending;setBusy(true);
  try{
    const result=await api('/api/chat',{...job.request,confirmed:true});
    let chat=state.chats.find(c=>c.id===job.chatId);
    if(!chat){chat={id:crypto.randomUUID(),title:job.content.slice(0,48),messages:[]};state.chats.push(chat);}
    chat.messages.push({role:'user',content:job.content},{role:'assistant',content:result.answer});activeId=chat.id;
    save();$('#message').value='';$('#preview').close();pending=null;
    toast(result.auditSaved?`Antwort erhalten · ${result.protectedFields} Angaben maskiert.`:'Antwort erhalten. Audit konnte nicht gespeichert werden.');
  }catch(err){toast(err.message);}finally{setBusy(false);}
};
$('#provider').onchange=()=>{$('#model').value=({ollama:'qwen2.5:3b',openai:'gpt-4.1-mini',anthropic:'claude-sonnet-4-5'})[$('#provider').value];state.provider=$('#provider').value;state.model=$('#model').value;save();$('#connection').textContent=$('#provider').value==='ollama'?(runtime.mode==='central'?'Modell auf dem Team-Server':'Lokaler Modellserver'):'Maskierte Inhalte werden an den Cloud-Anbieter gesendet';};
$('#model').onchange=()=>{state.model=$('#model').value;save();};
async function init(){
  if(runtime.mode==='central'){
    $('#account-user').textContent=runtime.user.username;$('#logout').classList.remove('hidden');
    $('.local-note').textContent='Team-Server · Verlauf in diesem Browser';
    $('#storage-notice').textContent='Im Teambetrieb gehen Nachrichten und Originaldokumente über HTTPS an euren Server und werden dort vor einem Modellaufruf maskiert. Browserdaten werden nach Benutzername getrennt, bleiben aber im Browserprofil unverschlüsselt. Das Team-Audit enthält zusätzlich den Benutzernamen und ist Administratoren vorbehalten.';
    if(runtime.role!=='admin')$('[data-view="audit"]').classList.add('hidden');
    $('#logout').onclick=async()=>{try{await api('/api/auth/logout',{});location.assign('/login');}catch(error){toast(error.message);}};
  }
  if(runtime.mode==='share'){
    $('#account-user').textContent='E-Mail-Freigabe';$('[data-view="audit"]').classList.add('hidden');
    $('.local-note').textContent='Freigabe-Mac · Zugang über Cloudflare';
    $('#storage-notice').textContent='Diese zeitweilige Freigabe nutzt E-Mail-PINs von Cloudflare. Nachrichten und Originaldokumente laufen über Cloudflare zu dem freigebenden Mac und werden dort maskiert. Nur Beispieldaten verwenden. Cloud-Anbieter und das Audit sind für Besucher gesperrt. Browserdaten werden nur in deinem eigenen Browserprofil gespeichert.';
  }
  render();
  try{const config=await api('/api/config');for(const p of config.providers){const o=el('option',p.name+(p.ready?'':' · Schlüssel fehlt'));o.value=p.id;o.disabled=!p.ready;$('#provider').append(o);}
    const local=await api('/api/models');$('#connection').textContent=local.connected?(runtime.mode==='share'?'● Modell auf dem Freigabe-Mac':runtime.mode==='central'?'● Team-Modellserver verbunden':'● Ollama verbunden'):(runtime.mode!=='local'?'Modellserver noch nicht bereit · Betreiber kontaktieren':'Ollama nicht erreichbar · unter ollama.com installieren und starten');
    for(const model of local.models){const o=el('option');o.value=model;$('#models').append(o);}
    const provider=config.providers.find(p=>p.id===state.provider&&p.ready);$('#provider').value=provider?.id??'ollama';
    $('#model').value=state.model??(local.models.includes('qwen2.5:3b')?'qwen2.5:3b':local.models[0]??'qwen2.5:3b');
    if(runtime.mode==='share'&&!local.models.includes($('#model').value)&&local.models.length)$('#model').value=local.models[0];
  }catch(err){toast(err.message);}
}
init();

let auditEntries=[];
async function loadAudit(){try{const data=await api('/api/audit');auditEntries=data.entries;$('#audit-summary').textContent=`${auditEntries.length} Aufrufe · ${auditEntries.reduce((n,e)=>n+e.maskedFields,0)} maskierte Angaben insgesamt`;$('#audit-entries').replaceChildren(...[...auditEntries].reverse().map(e=>el('p',`${new Date(e.at).toLocaleString('de-DE')} · ${e.provider} / ${e.model} · ${e.maskedFields} Angaben · ${e.documents} Dokumente`)));}catch(error){toast(error.message);}}
$('#refresh-audit').onclick=loadAudit;
$('#export-audit').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(auditEntries,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='ExitAI-Audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#backup').onclick=()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='ExitAI-Datensicherung.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#restore-backup').onchange=async event=>{const file=event.target.files[0];try{if(!file)return;if(busy)throw new Error('Bitte das Ende der laufenden Anfrage abwarten.');if(file.size>5000000)throw new Error('Datensicherung ist größer als 5 MB.');const restored=decodeState(JSON.parse(await file.text()));if(!confirm('Aktuelle Browserdaten durch diese Datensicherung ersetzen?'))return;state=restored;activeId=state.currentId;save();location.reload();}catch(error){toast(error.message);}finally{event.target.value='';}};
