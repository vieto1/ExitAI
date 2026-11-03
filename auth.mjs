import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {readFileSync,mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const derive=promisify(scrypt);
const usernamePattern=/^[a-z0-9][a-z0-9._@-]{0,79}$/;
export async function hashPassword(password){
 if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('Passwort muss 12 bis 256 Zeichen haben.');
 const salt=randomBytes(16).toString('hex'),key=await derive(password,salt,64);
 return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,hash){
 const [,salt,expected]=hash.split('$');
 const actual=await derive(password,salt,64);
 return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
export function readUsers(path){
 const users=JSON.parse(readFileSync(path,'utf8'));
 if(!Array.isArray(users)||!users.length||users.length>1000)throw new Error('Benutzerdatei muss 1 bis 1000 Einträge enthalten.');
 const map=new Map();
 for(const user of users){
  if(!user||!usernamePattern.test(user.username)||!['admin','member'].includes(user.role)||!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(user.passwordHash)||map.has(user.username))throw new Error('Ungültiger oder doppelter Benutzer in der Benutzerdatei.');
  map.set(user.username,{username:user.username,role:user.role,passwordHash:user.passwordHash});
 }
 if(![...map.values()].some(u=>u.role==='admin'))throw new Error('Mindestens ein Administrator wird benötigt.');
 return map;
}
export function centralSettings(env){
 if(!env.EXITAI_PUBLIC_ORIGIN)return null;
 const url=new URL(env.EXITAI_PUBLIC_ORIGIN);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('EXITAI_PUBLIC_ORIGIN muss eine HTTPS-Origin ohne Pfad sein.');
 if(!env.EXITAI_USERS_FILE)throw new Error('EXITAI_USERS_FILE fehlt. Zentraler Betrieb ohne Benutzerdatei ist nicht erlaubt.');
 return {origin:url.origin,host:url.host,usersFile:env.EXITAI_USERS_FILE,dataDir:env.EXITAI_DATA_DIR??new URL('./.local/',import.meta.url).pathname};
}
export function createAuth(settings){
 const users=readUsers(settings.usersFile);
 mkdirSync(settings.dataDir,{recursive:true,mode:0o700});
 const {DatabaseSync}=createRequire(import.meta.url)('node:sqlite');
 const path=join(settings.dataDir,'sessions.sqlite'),db=new DatabaseSync(path);chmodSync(path,0o600);
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, expires INTEGER NOT NULL, auth_hash TEXT NOT NULL)');
 if(!db.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='auth_hash'))db.exec("ALTER TABLE sessions ADD COLUMN auth_hash TEXT NOT NULL DEFAULT ''");
 const cookieName='__Host-exitai_session',sessionTime=8*60*60*1000;
 const digest=token=>createHash('sha256').update(token).digest('hex');
 const cookieToken=req=>{const matches=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));if(matches.length!==1)return null;const token=matches[0].slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(token)?token:null;};
 const attempts=new Map();
 let dummyHash,activeLogins=0;
 return {
  async login(req,res,input){
   const username=typeof input?.username==='string'?input.username.toLowerCase().trim():'';
   const password=typeof input?.password==='string'?input.password:'';
   if(!usernamePattern.test(username)||password.length>256)return null;
   const now=Date.now(),key=`${req.socket.remoteAddress}:${username}`;
   for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
   const bucket=attempts.get(key)??{count:0,until:now+10*60*1000};
   if(bucket.count>=10||attempts.size>=10000)throw Object.assign(new Error('Zu viele Anmeldeversuche. Bitte später erneut versuchen.'),{status:429});
   bucket.count++;attempts.set(key,bucket);
   if(activeLogins>=4)throw Object.assign(new Error('Zu viele gleichzeitige Anmeldungen. Bitte erneut versuchen.'),{status:429});
   activeLogins++;
   try{
    if(!dummyHash)dummyHash=await hashPassword(randomBytes(32).toString('hex'));
    const user=users.get(username),valid=await verifyPassword(password,user?.passwordHash??dummyHash);
    if(!user||!valid)return null;
    attempts.delete(key);
    const token=randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
    db.prepare('INSERT INTO sessions (token_hash, username, expires, auth_hash) VALUES (?, ?, ?, ?)').run(digest(token),username,now+sessionTime,digest(user.passwordHash));
    res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionTime/1000}`);
    return {username:user.username,role:user.role};
   }finally{activeLogins--;}
  },
  user(req){const token=cookieToken(req);if(!token)return null;const row=db.prepare('SELECT username, auth_hash FROM sessions WHERE token_hash=? AND expires>?').get(digest(token),Date.now());const user=row&&users.get(row.username);return user&&row.auth_hash===digest(user.passwordHash)?{username:user.username,role:user.role}:null;},
  logout(req,res){const token=cookieToken(req);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));res.setHeader('Set-Cookie',`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);},
  close(){db.close();}
 };
}
