import {execFileSync,spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {request} from 'node:https';
import assert from 'node:assert/strict';
import {hashPassword} from '../auth.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const id='exitai-tls-'+randomBytes(5).toString('hex'),directory=root+'.central/'+id;
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const docker=(...args)=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,stdio:'pipe',timeout:180000}).toString().trim();
const adminPassword=randomBytes(24).toString('base64url'),memberPassword=randomBytes(24).toString('base64url');
let appCreated=false,caddyCreated=false,networkCreated=false,ca;
await mkdir(directory+'/data',{recursive:true,mode:0o700});
await writeFile(directory+'/users.json',JSON.stringify([{username:'admin',role:'admin',passwordHash:await hashPassword(adminPassword)},{username:'member',role:'member',passwordHash:await hashPassword(memberPassword)}]),{mode:0o644});
function call(path,{body,cookie,origin='https://localhost:8443'}={}){
 return new Promise((resolve,reject)=>{const req=request('https://localhost:8443'+path,{ca,family:4,method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(new Error('HTTPS-Anfrage abgelaufen.')));req.end(body?JSON.stringify(body):undefined);});
}
try{
 docker('network','create',id);networkCreated=true;
 docker('run','-d','--name',id+'-app','--network',id,'--network-alias','app','--read-only','--tmpfs','/tmp:size=128m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges:true','-e','EXITAI_PUBLIC_ORIGIN=https://localhost:8443','-e','EXITAI_USERS_FILE=/run/secrets/team_users','-e','EXITAI_DATA_DIR=/data','--mount',`type=bind,src=${directory}/users.json,dst=/run/secrets/team_users,readonly`,'--mount',`type=bind,src=${directory}/data,dst=/data`,'exitai-central:test');appCreated=true;
 docker('run','-d','--name',id+'-caddy','--network',id,'-e','NO_PROXY=app,ollama,localhost,127.0.0.1','-p','127.0.0.1:8443:443','--mount',`type=bind,src=${root}deploy/Caddyfile.test,dst=/etc/caddy/Caddyfile,readonly`,'caddy:2.11.7-alpine');caddyCreated=true;
 let ready=false,lastError;
 for(let i=0;i<60;i++){
  try{docker('cp',id+'-caddy:/data/caddy/pki/authorities/local/root.crt',directory+'/root.crt');ca=await readFile(directory+'/root.crt');const health=await call('/api/health');if(health.status===200){ready=true;break;}lastError=new Error(`HTTP ${health.status}: ${health.body}`);}catch(error){lastError=error;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.equal(ready,true,'HTTPS-Proxy oder Anwendung wurde nicht bereit: '+lastError?.message);
 assert.equal((await call('/app')).status,302);assert.equal((await call('/api/config')).status,401);
 const admin=await call('/api/auth/login',{body:{username:'admin',password:adminPassword}});assert.equal(admin.status,200);const adminCookie=admin.headers['set-cookie'][0].split(';')[0];
 const member=await call('/api/auth/login',{body:{username:'member',password:memberPassword}});assert.equal(member.status,200);const memberCookie=member.headers['set-cookie'][0].split(';')[0];
 assert.equal((await call('/api/session',{cookie:memberCookie})).status,200);assert.equal((await call('/api/audit',{cookie:memberCookie})).status,403);assert.equal((await call('/api/audit',{cookie:adminCookie})).status,200);
 const preview=await call('/api/preview',{cookie:memberCookie,body:{messages:[{role:'user',content:'alice@example.com'}]}});assert.equal(preview.status,200);assert.equal(JSON.parse(preview.body).messages[0].content,'[EXITAI_1]');
 assert.equal((await call('/api/preview',{cookie:memberCookie,origin:'https://other.example',body:{messages:[]}})).status,403);
 assert.equal((await call('/api/auth/logout',{cookie:memberCookie,body:{}})).status,200);assert.equal((await call('/api/session',{cookie:memberCookie})).status,401);
 console.log('HTTPS-Integration bestanden: verifizierte Zertifikatskette, Reverse-Proxy, Anmeldung, Sitzung, Rollen, Maskierung und Abmeldung. Test-CA statt öffentlicher Domain verwendet.');
}catch(error){
 for(const name of [id+'-app',id+'-caddy']){const log=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs','--tail','25',name],{env:dockerEnv,encoding:'utf8'});console.error((log.stdout??'')+(log.stderr??''));}
 throw error;
}finally{
 if(caddyCreated)docker('rm','-f','-v',id+'-caddy');
 if(appCreated)docker('rm','-f','-v',id+'-app');
 if(networkCreated)docker('network','rm',id);
 await rm(directory,{recursive:true,force:true});
}
