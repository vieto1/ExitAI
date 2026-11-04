import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EventEmitter,once} from 'node:events';
import {PassThrough} from 'node:stream';
import {request} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {allowedEmails,localModelNames,ShareAccess} from '../share-access.mjs';
import {verifyDownload,tunnelArguments,startProtectedTunnel} from '../scripts/share-runtime.mjs';
import {makeServer} from '../server.mjs';
test('sharing requires exact emails, installed local models and a genuine HTTPS tunnel origin',()=>{
 assert.deepEqual(allowedEmails('A@example.com; b@example.com A@example.com'),['a@example.com','b@example.com']);
 for(const input of ['', '*@example.com','anyone','a@-example.com'])assert.throws(()=>allowedEmails(input));
 assert.deepEqual(localModelNames([{name:'qwen2.5:3b',size:1900000000},{name:'remote:cloud',size:1000000000},{name:'remote',size:100,remote_host:'example.com'}]),['qwen2.5:3b']);
 assert.throws(()=>new ShareAccess(['a@example.com'],[]));
 const access=new ShareAccess(['a@example.com'],['qwen2.5:3b']);
 for(const origin of ['http://test.trycloudflare.com','https://test.trycloudflare.com.evil.com','https://test.trycloudflare.com/path','https://user@test.trycloudflare.com'])assert.throws(()=>access.activate(origin));
 access.activate('https://sample-test.trycloudflare.com');assert.equal(access.origin,'https://sample-test.trycloudflare.com');assert.throws(()=>access.activate('https://other.trycloudflare.com'));access.revoke();assert.equal(access.origin,null);
 const bytes=Buffer.from('fixture'),sha=createHash('sha256').update(bytes).digest('hex');verifyDownload(bytes,sha);assert.throws(()=>verifyDownload(Buffer.from('tampered'),sha));
});
function fakeProcess(){const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();return child;}
test('tunnel does not activate until URL and a registered connection are both reported',async()=>{
 const access=new ShareAccess(['a@example.com'],['qwen2.5:3b']),child=fakeProcess();let args;
 const job=startProtectedTunnel('verified-binary',access,3217,{launch:(bin,a)=>{args=a;return child;},timeout:1000});
 assert.deepEqual(args,tunnelArguments(access,3217));assert.ok(args.includes('--allowed-mail'));assert.ok(args.includes('--http-host-header'));assert.ok(!args.includes('--no-tls-verify'));
 child.stderr.write('https://sample-test.trycloudflare.com\n');assert.equal(access.origin,null);
 child.stderr.write('Registered tunnel connection\n');assert.equal(await job.ready,'https://sample-test.trycloudflare.com');
 child.emit('exit',0);assert.equal(access.origin,null);
});
test('failed tunnel never activates an anonymous fallback',async()=>{
 const access=new ShareAccess(['a@example.com'],['qwen2.5:3b']),child=fakeProcess();
 const job=startProtectedTunnel('verified-binary',access,3217,{launch:()=>child,timeout:1000});child.emit('exit',1);await assert.rejects(job.ready);assert.equal(access.origin,null);
});
test('share traffic has no audit, cloud-key or arbitrary model access; revocation closes the gate',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'exitai-share-')),access=new ShareAccess(['a@example.com'],['qwen2.5:3b']);
 const server=makeServer({env:{EXITAI_OPENAI_KEY:'unit-test-only'},auditDir:new URL('file://'+dir+'/'),shareAccess:access});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=(path,{body,host=access.host,origin='https://sample-test.trycloudflare.com',headers={}}={})=>new Promise((resolve,reject)=>{
  const req=request(base+path,{method:body?'POST':'GET',headers:{Host:host,Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,json:()=>JSON.parse(Buffer.concat(chunks).toString())}));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
 let wire;
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');wire=JSON.parse(options.body);return new Response(JSON.stringify({message:{content:'Hallo [EXITAI_1]'}}));});
 try{
  assert.equal((await call('/api/config')).status,503);access.activate('https://sample-test.trycloudflare.com');
  const session=(await call('/api/session',{headers:{'X-Forwarded-Host':'localhost:3217','Cf-Access-Authenticated-User-Email':'admin@example.com'}})).json();assert.equal(session.mode,'share');assert.equal(session.role,'member');
  assert.equal((await call('/api/audit')).status,403);
  assert.equal((await call('/api/config',{origin:'https://other.example'})).status,403);
  const config=(await call('/api/config')).json();assert.equal(config.providers.find(p=>p.id==='openai').ready,false);
  const input={messages:[{role:'user',content:'Schreibe Alice'}],terms:['Alice'],provider:'ollama',model:'qwen2.5:3b',confirmed:true};
  assert.equal((await call('/api/chat',{body:{...input,provider:'openai'}})).status,400);
  assert.equal((await call('/api/chat',{body:{...input,model:'other:cloud'}})).status,400);
  const answer=await call('/api/chat',{body:input});assert.equal(answer.status,200);assert.equal(answer.json().answer,'Hallo Alice');assert.ok(!JSON.stringify(wire).includes('Alice'));
  access.revoke();assert.equal((await call('/api/session')).status,503);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
