import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {request} from 'node:http';
import {hashPassword,verifyPassword,centralSettings} from '../auth.mjs';
import {makeServer} from '../server.mjs';
test('passwords use salted slow hashes and incorrect passwords fail',async()=>{
 const a=await hashPassword('only-test-password-123'),b=await hashPassword('only-test-password-123');
 assert.notEqual(a,b);assert.equal(await verifyPassword('only-test-password-123',a),true);assert.equal(await verifyPassword('incorrect-password',a),false);
 await assert.rejects(hashPassword('short'));
});
test('central mode refuses missing authentication and non-HTTPS origins',()=>{
 assert.throws(()=>centralSettings({EXITAI_PUBLIC_ORIGIN:'http://example.com',EXITAI_USERS_FILE:'x'}));
 assert.throws(()=>centralSettings({EXITAI_PUBLIC_ORIGIN:'https://example.com'}));
 assert.throws(()=>makeServer({env:{EXITAI_PUBLIC_ORIGIN:'https://example.com',EXITAI_USERS_FILE:'/does-not-exist'}}));
 assert.equal(centralSettings({}),null);
});
test('central login, origin checks, permissions, persistent sessions, rate limit and logout',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'exitai-central-')),users=join(dir,'users.json');
 await writeFile(users,JSON.stringify([{username:'admin',role:'admin',passwordHash:await hashPassword('admin-test-password-123')},{username:'member',role:'member',passwordHash:await hashPassword('member-test-password-123')}]));
 const env={EXITAI_PUBLIC_ORIGIN:'https://team.example',EXITAI_USERS_FILE:users,EXITAI_DATA_DIR:dir};
 let server=makeServer({env});
 async function listen(){server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${server.address().port}`;}
 let base=await listen();
 const call=(path,{cookie,origin='https://team.example',body,host='team.example'}={})=>new Promise((resolve,reject)=>{
  const req=request(base+path,{method:body?'POST':'GET',headers:{Host:host,Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))})));});
  req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
 const login=async(username,password)=>{const response=await call('/api/auth/login',{body:{username,password}});assert.equal(response.status,200);const header=response.headers.get('set-cookie');assert.match(header,/HttpOnly/);assert.match(header,/Secure/);assert.match(header,/SameSite=Lax/);return header.split(';')[0];};
 try{
  assert.equal((await call('/app')).status,302);assert.equal((await call('/api/config')).status,401);
  assert.equal((await call('/api/preview',{body:{messages:[{role:'user',content:'hello'}]}})).status,401);
  assert.equal((await call('/api/auth/login',{body:{username:'admin',password:'wrong'}})).status,401);
  const admin=await login('admin','admin-test-password-123'),member=await login('member','member-test-password-123');
  assert.equal((await call('/api/audit',{cookie:member})).status,403);assert.equal((await call('/api/audit',{cookie:admin})).status,200);
  assert.equal((await(await call('/api/session',{cookie:member})).json()).user.username,'member');
  assert.equal((await call('/api/config',{cookie:member,host:'attacker.example'})).status,403);
  assert.equal((await call('/v1/mask',{cookie:member,origin:'https://attacker.example',body:{text:'a'}})).status,403);
  const preview=await call('/api/preview',{cookie:member,body:{messages:[{role:'user',content:'alice@example.com'}]}});assert.equal(preview.status,200);assert.ok(!(await preview.text()).includes('"content":"alice@example.com"'));
  await new Promise(resolve=>server.close(resolve));server=makeServer({env});base=await listen();
  assert.equal((await call('/api/session',{cookie:admin})).status,200);
  assert.equal((await call('/api/auth/logout',{cookie:admin,body:{}})).status,200);
  assert.equal((await call('/api/session',{cookie:admin})).status,401);
  const changed=JSON.parse(await readFile(users,'utf8'));changed.find(u=>u.username==='member').passwordHash=await hashPassword('changed-member-password-123');
  await new Promise(resolve=>server.close(resolve));await writeFile(users,JSON.stringify(changed));server=makeServer({env});base=await listen();
  assert.equal((await call('/api/session',{cookie:member})).status,401);
  await login('member','changed-member-password-123');
  for(let i=0;i<10;i++)assert.equal((await call('/api/auth/login',{body:{username:'nobody',password:'incorrect'}})).status,401);
  assert.equal((await call('/api/auth/login',{body:{username:'nobody',password:'incorrect'}})).status,429);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
