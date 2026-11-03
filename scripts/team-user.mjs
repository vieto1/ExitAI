import {hashPassword,readUsers} from '../auth.mjs';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
const [username,role='member',target='.central/users.json',replace]=process.argv.slice(2);
if(!/^[a-z0-9][a-z0-9._@-]{0,79}$/.test(username??'')||!['admin','member'].includes(role))throw new Error('Aufruf: node scripts/team-user.mjs BENUTZER admin|member [DATEI] [--replace]');
let password;
if(process.stdin.isTTY){
 const output=new Writable({write(chunk,encoding,done){done();}});
 const input=createInterface({input:process.stdin,output,terminal:true});
 process.stdout.write('Passwort (12 bis 256 Zeichen, Eingabe verborgen): ');
 try{password=await new Promise(resolve=>input.question('',resolve));}finally{input.close();process.stdout.write('\n');}
}else{const chunks=[];for await(const chunk of process.stdin){chunks.push(chunk);if(Buffer.concat(chunks).length>1024)throw new Error('Passwort zu lang.');}password=Buffer.concat(chunks).toString().replace(/\r?\n$/,'');}
const file=resolve(target);let users=[];
try{await readFile(file);users=[...readUsers(file).values()];}catch(e){if(e.code!=='ENOENT')throw e;}
if(users.some(u=>u.username===username)&&replace!=='--replace')throw new Error('Benutzer existiert bereits. Für bewusstes Ersetzen --replace angeben.');
users=users.filter(u=>u.username!==username);users.push({username,role,passwordHash:await hashPassword(password)});password=undefined;
await mkdir(dirname(file),{recursive:true,mode:0o700});
const temporary=file+'.tmp';await writeFile(temporary,JSON.stringify(users,null,2)+'\n',{mode:0o644});readUsers(temporary);await rename(temporary,file);
console.log(`Zugang für ${username} (${role}) vorbereitet. Im laufenden Zentralbetrieb anschließend den App-Container neu erstellen (up -d --force-recreate app).`);
