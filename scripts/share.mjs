import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../server.mjs';
import {allowedEmails,localModelNames,ShareAccess} from '../share-access.mjs';
import {ensureCloudflared,startProtectedTunnel} from './share-runtime.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),owned=new Set();let server,access,closing=false;
function own(child){owned.add(child);child.once('exit',()=>owned.delete(child));child.once('error',()=>owned.delete(child));return child;}
async function stop(code){
 if(closing)return;closing=true;access?.revoke();
 server?.closeAllConnections();if(server)server.close();
 await Promise.all([...owned].map(async child=>{if(!child.pid||child.exitCode!==null||child.signalCode!==null)return;const done=once(child,'exit').catch(()=>{});child.kill('SIGTERM');const timer=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');},5000);await done;clearTimeout(timer);}));
 console.log('Freigabe beendet. Der HTTPS-Link ist nicht mehr erreichbar.');process.exit(code);
}
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.once(signal,()=>stop(0));
try{
 if(process.env.EXITAI_PUBLIC_ORIGIN)throw new Error('Die Mac-Freigabe nicht mit einer zentralen Server-Konfiguration kombinieren.');
 if(process.env.EXITAI_OLLAMA_URL&&process.env.EXITAI_OLLAMA_URL!=='http://127.0.0.1:11434')throw new Error('Die kostenlose Freigabe verwendet nur Ollama auf diesem Mac.');
 const input=createInterface({input:stdin,output:stdout});let emails;
 try{console.log('Kostenlose Testfreigabe: Mac und dieses Fenster müssen geöffnet bleiben. Nur Beispieldaten verwenden; der Verkehr läuft über Cloudflare.');emails=allowedEmails(await input.question('Welche E-Mail-Adressen dürfen zugreifen? (mit Kommas trennen): '));}finally{input.close();}
 const binary=await ensureCloudflared(root);
 await mkdir(join(root,'.local','models'),{recursive:true});
 async function models(){const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(2000)});if(!r.ok)throw new Error('Modellserver antwortet nicht.');return (await r.json()).models??[];}
 let installed;
 try{installed=await models();}catch{
  const model=own(spawn(join(root,'.runtime','ollama','ollama'),['serve'],{env:{...process.env,OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_NO_CLOUD:'1',OLLAMA_MODELS:join(root,'.local','models')},stdio:'ignore'}));
  model.once('error',()=>{});
  for(let i=0;i<30;i++){try{installed=await models();break;}catch{}if(!model.pid||model.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,500));}
  if(!installed)throw new Error('Ollama konnte nicht starten. Bitte zuerst Setup.command ausführen.');
 }
 const names=localModelNames(installed);if(!names.length)throw new Error('Kein installiertes lokales Modell gefunden. Bitte zuerst Setup.command ausführen.');
 access=new ShareAccess(emails,names);
 server=makeServer({env:{...process.env,EXITAI_OLLAMA_URL:'http://127.0.0.1:11434'},shareAccess:access});server.listen(0,'127.0.0.1');await once(server,'listening');
 const tunnel=startProtectedTunnel(binary,access,server.address().port);own(tunnel.child);
 tunnel.child.once('exit',()=>{if(!closing)stop(1);});
 console.log('Geschützten HTTPS-Zugang aufbauen …');const origin=await tunnel.ready;
 if(process.platform==='darwin'){const wake=own(spawn('/usr/bin/caffeinate',['-i','-w',String(process.pid)],{stdio:'ignore'}));wake.once('error',()=>{});}
 console.log('\nDein Link für die eingetragenen Kollegen:\n'+origin+'/app\n\nDie Kollegen melden sich mit ihrer E-Mail-Adresse und dem zugesandten PIN an.\nMac aufgeklappt und online lassen. Dieses Fenster offen lassen. Mit Ctrl+C beenden.');
}catch(error){console.error('Freigabe nicht gestartet: '+error.message);await stop(1);}
