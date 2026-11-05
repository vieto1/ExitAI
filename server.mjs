import {prepare} from './request.mjs';
import {createServer} from 'node:http';
import {readFile,appendFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {maskTexts,restore} from './privacy.mjs';
import {extractDocument} from './documents.mjs';
import {centralSettings,createAuth} from './auth.mjs';
import {ShareAccess} from './share-access.mjs';
import {resolve,sep} from 'node:path';
const staticFiles={'/':'home.html','/login':'login.html','/login.js':'login.js','/app':'index.html','/app/':'index.html','/installation':'installation.html','/datenschutz':'privacy.html','/api-response.js':'api-response.js','/state.js':'state.js','/site.js':'site.js','/site.css':'site.css','/app.js':'app.js','/style.css':'style.css'};
const types={html:'text/html',js:'text/javascript',css:'text/css'};
function check(ok,message){if(!ok)throw Object.assign(new Error(message),{status:400});}
async function body(req){
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>600000)throw Object.assign(new Error('Maximal 600 KB pro Anfrage.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Object.assign(new Error('Ungültiges JSON.'),{status:400});}
}
async function jsonFetch(url,options){
  let res;try{res=await fetch(String(url),{...options,signal:AbortSignal.timeout(120000)});}catch{throw Object.assign(new Error('Modell nicht erreichbar. Ollama-Server bzw. API-Konfiguration prüfen.'),{status:502});}
  if(!res.ok)throw Object.assign(new Error(`Modellanbieter: HTTP ${res.status}. Modellname, Zugang und Kontingent prüfen.`),{status:502});
  return res.json();
}
export function makeServer({env=process.env,auditDir,shareAccess}={}){
  const central=centralSettings(env);
  if(shareAccess&&(!(shareAccess instanceof ShareAccess)||central))throw new Error('Freigabe und zentraler Betrieb dürfen nicht kombiniert werden.');
  const auth=central?createAuth(central):null;
  auditDir??=central?pathToFileURL(resolve(central.dataDir)+sep):new URL('./.local/',import.meta.url);
  const ollamaUrl=new URL(env.EXITAI_OLLAMA_URL??'http://127.0.0.1:11434');
  if(!['http:','https:'].includes(ollamaUrl.protocol)||ollamaUrl.username||ollamaUrl.password||ollamaUrl.search||ollamaUrl.hash||ollamaUrl.pathname!=='/')throw new Error('Ungültige EXITAI_OLLAMA_URL.');
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'");
    const host=req.headers.host;
    const shared=Boolean(shareAccess&&host===shareAccess.host);
    if(shared&&!shareAccess.origin)return json(res,503,{error:'Freigabe ist noch nicht bereit oder wurde beendet.'});
    if(!host||(!shared&&(central?host!==central.host:!/^(?:127\.0\.0\.1|localhost):\d+$/.test(host))))return json(res,403,{error:'Ungültiger Host.'});
    if(req.headers.origin&&req.headers.origin!==(shared?shareAccess.origin:central?.origin??`http://${host}`))return json(res,403,{error:'Fremde Herkunft nicht erlaubt.'});
    try{
      const path=new URL(req.url,`http://${host}`).pathname;
      const user=auth?.user(req)??null;
      if(req.method==='POST'&&path==='/api/auth/login'&&auth){
        check(req.headers['content-type']?.startsWith('application/json'),'Content-Type application/json benötigt.');
        const signedIn=await auth.login(req,res,await body(req));return json(res,signedIn?200:401,signedIn??{error:'Benutzername oder Passwort falsch.'});
      }
      if(req.method==='POST'&&path==='/api/auth/logout'&&auth){auth.logout(req,res);return json(res,200,{ok:true});}
      if(central&&!user&&path!=='/api/health'){
        if(path==='/app'||path==='/app/'){res.writeHead(302,{'Location':'/login','Cache-Control':'no-store'});return res.end();}
        if(path.startsWith('/api/')||path.startsWith('/v1/'))return json(res,401,{error:'Bitte anmelden.'});
      }
      if(req.method==='GET'&&path==='/api/session')return json(res,200,{mode:shared?'share':central?'central':'local',user,role:shared?'member':user?.role??'admin'});
      if(req.method==='GET'&&path==='/download'){
        try{const file=await readFile(new URL('./.release/ExitAI.zip',import.meta.url));res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="ExitAI.zip"','Cache-Control':'no-store'});return res.end(file);}
        catch(e){if(e.code==='ENOENT')return json(res,503,{error:'Downloadpaket noch nicht gebaut. Im Projektordner npm run package ausführen.'});throw e;}
      }
      if(req.method==='POST'&&path==='/api/documents/import'){
        const name=new URL(req.url,`http://${host}`).searchParams.get('name');
        check(typeof name==='string'&&name.length>0&&name.length<=200,'Ein Dateiname mit maximal 200 Zeichen wird benötigt.');
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;check(size<=10000000,'Maximal 10 MB pro Dokument.');chunks.push(chunk);}
        try{return json(res,200,await extractDocument(Buffer.concat(chunks),name));}
        catch(e){return json(res,400,{error:e.message==='Kein Text gefunden. Gescannte PDFs benötigen vorher eine OCR-Verarbeitung.'?e.message:`Datei konnte nicht eingelesen werden: ${e.message}`});}
      }
      if(req.method==='GET'&&path==='/api/audit'){
        if(shared||(central&&user.role!=='admin'))return json(res,403,{error:'Nur Administratoren dürfen das Team-Audit einsehen.'});
        let entries=[];
        try{entries=(await readFile(new URL('audit.jsonl',auditDir),'utf8')).trim().split('\n').filter(Boolean).slice(-500).map(line=>JSON.parse(line));}catch(e){if(e.code!=='ENOENT')throw e;}
        return json(res,200,{entries,limit:500});
      }
      if(req.method==='POST'&&path==='/v1/mask'){
        check(req.headers['content-type']?.startsWith('application/json'),'Content-Type application/json benötigt.');
        const input=await body(req);check(input&&typeof input.text==='string'&&input.text.length<=100000,'Text mit maximal 100.000 Zeichen benötigt.');
        const terms=input.terms??[];check(Array.isArray(terms)&&terms.length<=200&&terms.every(t=>typeof t==='string'&&t.length<=200),'Ungültige Schutzbegriffe.');
        const result=maskTexts([input.text],terms);return json(res,200,{masked:result.texts[0],mappings:result.mappings});
      }
      if(req.method==='POST'&&path==='/v1/restore'){
        check(req.headers['content-type']?.startsWith('application/json'),'Content-Type application/json benötigt.');
        const input=await body(req);check(input&&typeof input.text==='string'&&input.text.length<=100000&&Array.isArray(input.mappings)&&input.mappings.length<=10000&&input.mappings.every(m=>m&&typeof m.marker==='string'&&/^\[EXITAI_\d+\]$/u.test(m.marker)&&typeof m.value==='string'&&m.value.length<=100000),'Ungültiger Text oder ungültige Zuordnung.');
        return json(res,200,{text:restore(input.text,input.mappings)});
      }
      if(req.method==='GET'&&path==='/api/health')return json(res,200,{status:'ok',app:'ExitAI',version:'0.7.0'});
      if(req.method==='GET'&&path==='/api/config')return json(res,200,{providers:[{id:'ollama',name:shared?'Ollama · Freigabe-Mac':central?'Ollama · Team-Server':'Ollama · lokal',ready:true},{id:'openai',name:'OpenAI · Cloud',ready:!shared&&Boolean(env.EXITAI_OPENAI_KEY)},{id:'anthropic',name:'Anthropic · Cloud',ready:!shared&&Boolean(env.EXITAI_ANTHROPIC_KEY)}]});
      if(req.method==='GET'&&path==='/api/models'){
        try{const data=await jsonFetch(new URL('/api/tags',ollamaUrl));return json(res,200,{models:(data.models??[]).map(m=>m.name).filter(name=>!shared||shareAccess.permitsModel(name)),connected:true});}
        catch{return json(res,200,{models:[],connected:false});}
      }
      if(req.method==='POST'&&['/api/preview','/api/chat'].includes(path)){
        check(req.headers['content-type']?.startsWith('application/json'),'Content-Type application/json benötigt.');
        const input=await body(req),p=prepare(input);
        if(path==='/api/preview')return json(res,200,{messages:p.messages,system:p.system,mappings:p.mappings});
        check(['ollama','openai','anthropic'].includes(input.provider),'Unbekannter Anbieter.');
        check(!shared||input.provider==='ollama','In der kostenlosen Freigabe sind Cloud-Anbieter deaktiviert.');
        check(typeof input.model==='string'&&/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,99}$/.test(input.model),'Gültigen Modellnamen angeben.');
        check(!shared||shareAccess.permitsModel(input.model),'Dieses Modell ist für die Freigabe nicht zugelassen.');
        check(input.confirmed===true,'Maskierte Anfrage vor dem Versand bestätigen.');
        let answer;const messages=[{role:'system',content:p.system},...p.messages];
        if(input.provider==='ollama'){
          const data=await jsonFetch(new URL('/api/chat',ollamaUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:input.model,messages,stream:false,...(/^qwen3(?::|$)/.test(input.model)?{think:false}:{})})});answer=data.message?.content;
        }else if(input.provider==='openai'){
          check(env.EXITAI_OPENAI_KEY,'EXITAI_OPENAI_KEY ist nicht gesetzt.');
          const data=await jsonFetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.EXITAI_OPENAI_KEY}`},body:JSON.stringify({model:input.model,messages})});answer=data.choices?.[0]?.message?.content;
        }else{
          check(env.EXITAI_ANTHROPIC_KEY,'EXITAI_ANTHROPIC_KEY ist nicht gesetzt.');
          const data=await jsonFetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':env.EXITAI_ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:input.model,system:p.system,messages:p.messages,max_tokens:4096})});answer=data.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');
        }
        if(typeof answer!=='string')throw Object.assign(new Error('Der Anbieter hat keine Textantwort geliefert.'),{status:502});
        let auditSaved=true;
        try{await mkdir(auditDir,{recursive:true,mode:0o700});await appendFile(new URL('audit.jsonl',auditDir),JSON.stringify({at:new Date().toISOString(),provider:input.provider,model:input.model,maskedFields:p.mappings.length,documents:p.documents,...(user?{user:user.username}:{})})+'\n',{mode:0o600});}catch{auditSaved=false;}
        return json(res,200,{answer:restore(answer,p.mappings),maskedAnswer:answer,protectedFields:p.mappings.length,auditSaved});
      }
      if(['GET','HEAD'].includes(req.method)&&staticFiles[path]){
        const name=staticFiles[path],data=await readFile(new URL('./public/'+name,import.meta.url));
        res.writeHead(200,{'Content-Type':types[name.split('.').at(-1)]+'; charset=utf-8','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:data);
      }
      return json(res,req.method==='GET'?404:405,{error:'Nicht verfügbar.'});
    }catch(e){return json(res,e.status??500,{error:e.status?e.message:'Interner Fehler. Bitte erneut versuchen.'});}
  });
  server.on('close',()=>auth?.close());
  return server;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const port=Number(process.env.PORT??3210);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Ungültiger PORT.');
  const server=makeServer();server.on('error',e=>{console.error(e.message);process.exitCode=1;});
  const central=centralSettings(process.env);
  server.listen(port,central?'0.0.0.0':'127.0.0.1',()=>console.log(`ExitAI: ${central?.origin??`http://127.0.0.1:${port}`}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
