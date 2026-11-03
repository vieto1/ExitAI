import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {makeServer} from '../server.mjs';
test('HTTP workflow: masking, provider wire contract, restoration, metadata-only audit and failures',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'exitai-test-'));
 const server=makeServer({env:{},auditDir:pathToFileURL(dir+'/')});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`,nativeFetch=globalThis.fetch;
 const payload={messages:[{role:'user',content:'Angebot für Jasmin Neufeld: 85.000 €, E-Mail jasmin@example.com'}],terms:['Jasmin Neufeld'],documents:[{name:'Vertrag Jasmin Neufeld.txt',content:'Kunde Jasmin Neufeld'}],provider:'ollama',model:'test-model',confirmed:true};
 let wire;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url==='http://127.0.0.1:11434/api/chat'){
   wire=JSON.parse(options.body);return new Response(JSON.stringify({message:{content:'Angebot für [EXITAI_1].'}}),{headers:{'Content-Type':'application/json'}});
  }
  return nativeFetch(url,options);
 });
 const post=(path,p,headers={})=>nativeFetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(p)});
 try{
  assert.equal((await nativeFetch(base+'/api/health')).status,200);
  const masked=await(await post('/v1/mask',{text:'Alice alice@example.com',terms:['Alice']})).json();assert.equal(masked.masked,'[EXITAI_1] [EXITAI_2]');
  assert.equal((await(await post('/v1/restore',{text:masked.masked,mappings:masked.mappings})).json()).text,'Alice alice@example.com');
  assert.equal((await post('/v1/mask',{text:'foo',terms:[null]})).status,400);
  const page=await(await nativeFetch(base+'/app')).text();assert.match(page,/Wissensbasis/);
  const home=await(await nativeFetch(base+'/')).text();assert.match(home,/Mehr Möglichkeiten/);
  for(const path of ['/installation','/datenschutz','/state.js','/site.css'])assert.equal((await nativeFetch(base+path)).status,200);
  const preview=await(await post('/api/preview',payload)).json();assert.equal(preview.mappings.length,3);assert.ok(!JSON.stringify(preview.messages).includes('Jasmin'));
  assert.equal((await post('/api/chat',{...payload,confirmed:false})).status,400);
  const response=await post('/api/chat',payload);assert.equal(response.status,200);const result=await response.json();assert.equal(result.answer,'Angebot für Jasmin Neufeld.');assert.equal(result.auditSaved,true);
  for(const value of ['Jasmin','85.000','jasmin@example.com'])assert.ok(!JSON.stringify(wire).includes(value));
  assert.match(wire.messages[0].content,/Quelle 1/);assert.equal(wire.model,'test-model');
  const audit=await readFile(join(dir,'audit.jsonl'),'utf8');assert.equal(JSON.parse(audit).maskedFields,3);assert.ok(!audit.includes('Jasmin'));assert.ok(!audit.includes('messages'));
  const auditResponse=await(await nativeFetch(base+'/api/audit')).json();assert.equal(auditResponse.entries.length,1);assert.equal(auditResponse.entries[0].maskedFields,3);
  assert.equal((await post('/api/chat',{...payload,provider:'openai'})).status,400);
  assert.equal((await post('/api/chat',{...payload,messages:[]})).status,400);
  assert.equal((await post('/api/chat',payload,{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await nativeFetch(base+'/missing')).status,404);
  assert.equal((await post('/api/preview',{messages:[{role:'user',content:'x'.repeat(610000)}]})).status,413);
  const config=await(await nativeFetch(base+'/api/config')).json();assert.equal(config.providers.find(p=>p.id==='openai').ready,false);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
