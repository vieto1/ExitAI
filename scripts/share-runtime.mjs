import {createHash} from 'node:crypto';
import {mkdir,writeFile,chmod,stat} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {homedir} from 'node:os';
export const execute=promisify(execFile);
const version='2026.10.7';
const assets={
 'darwin-arm64':['cloudflared-darwin-arm64.tgz','3586ccf397e98e5f437e60e7c307ca6ac463e110580503af8bb8e6f9ebf831bd'],
 'darwin-x64':['cloudflared-darwin-amd64.tgz','02f3edfd87684dd5b705607688e4eb4b323f6e777b81e7b3a85af556aa356848'],
 'linux-x64':['cloudflared-linux-amd64','1f99fb518b83dec2ba8d870a7cc991d82a77e6196295a3d2754ba17ab9f91872']
};
export function verifyDownload(bytes,expected){if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('Prüfsumme stimmt nicht. Die heruntergeladene Laufzeit wird nicht ausgeführt.');}
export function tunnelArguments(access,port){
 if(!Number.isInteger(port)||port<1||port>65535||!access.emails.length)throw new Error('Ungültige Freigabe-Konfiguration.');
 return ['tunnel','--no-autoupdate','--protocol','http2','--url',`http://127.0.0.1:${port}`,'--http-host-header',access.host,'--allowed-mail',access.emails.join(',')];
}
export async function ensureCloudflared(root){
 const asset=assets[`${process.platform}-${process.arch}`];if(!asset)throw new Error('Diese Plattform wird für die automatische Freigabe nicht unterstützt.');
 for(const path of [join(homedir(),'.cloudflared','config.yml'),join(homedir(),'.cloudflared','config.yaml'),'/etc/cloudflared/config.yml','/etc/cloudflared/config.yaml']){
  try{await stat(path);throw new Error('Es ist bereits eine Cloudflare-Konfiguration vorhanden. Sie bleibt unverändert. Bitte diese Einrichtung gesondert prüfen.');}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 if(process.env.TUNNEL_TOKEN||process.env.TUNNEL_CONFIG)throw new Error('Es ist bereits ein anderer Cloudflare-Tunnel konfiguriert. Bitte die Freigabe in einer getrennten Umgebung starten.');
 const directory=join(root,'.runtime',`cloudflared-${version}-${process.arch}`);await mkdir(directory,{recursive:true});
 const binary=join(directory,'cloudflared');
 try{await stat(binary);}catch(error){
  if(error.code!=='ENOENT')throw error;
  console.log('Lade die offizielle Freigabe-Laufzeit und prüfe ihre SHA-256-Prüfsumme …');
  const response=await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${version}/${asset[0]}`,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`Download der Freigabe-Laufzeit fehlgeschlagen (HTTP ${response.status}).`);
  const bytes=Buffer.from(await response.arrayBuffer());verifyDownload(bytes,asset[1]);
  if(process.platform==='darwin'){const archive=join(directory,'download.tgz');await writeFile(archive,bytes,{mode:0o600});await execute('tar',['-xzf',archive,'-C',directory]);}else await writeFile(binary,bytes,{mode:0o700});
  await chmod(binary,0o700);
 }
 const help=await execute(binary,['tunnel','--help'],{maxBuffer:1000000});
 if(!help.stdout.includes('--allowed-mail'))throw new Error('Die Laufzeit unterstützt keinen E-Mail-Schutz. Es wird kein ungeschützter Tunnel gestartet.');
 return binary;
}
export function startProtectedTunnel(binary,access,port,{launch=spawn,timeout=60000}={}){
 const child=launch(binary,tunnelArguments(access,port),{stdio:['ignore','pipe','pipe']});
 let origin=null,registered=false,settled=false,buffer='';
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>fail(new Error('Der HTTPS-Tunnel wurde nicht rechtzeitig bereit. Internetverbindung prüfen; Firmen-/Hotelnetze können Tunnel blockieren.')),timeout);
  function fail(error){if(settled)return;settled=true;clearTimeout(timer);reject(error);}
  function check(){if(!settled&&origin&&registered){try{access.activate(origin);settled=true;clearTimeout(timer);resolve(origin);}catch(error){fail(error);}}}
  function data(chunk){
   buffer+=chunk.toString();if(buffer.length>1000000){fail(new Error('Unerwartet große Ausgabe des Freigabe-Dienstes.'));return;}
   const urls=[...buffer.matchAll(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/g)].map(m=>m[0]);
   if(urls.length){if(origin&&urls.some(url=>url!==origin)){fail(new Error('Uneindeutige Freigabe-Adresse.'));return;}origin=urls[0];}
   registered=buffer.includes('Registered tunnel connection');check();
   if(settled)buffer='';
  }
  child.stdout.on('data',data);child.stderr.on('data',data);
  child.once('error',()=>fail(new Error('Die Freigabe-Laufzeit konnte nicht gestartet werden.')));
  child.once('exit',code=>{access.revoke();fail(new Error(`Die Freigabe-Laufzeit wurde beendet (Code ${code??'Signal'}).`));});
 });
 return {child,ready};
}
