import {randomBytes} from 'node:crypto';
export function allowedEmails(text){
 const emails=[...new Set(text.split(/[,;\s]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))];
 if(!emails.length||emails.length>50||emails.some(e=>e.length>254||e.includes('*')||! /^[a-z0-9.!#$%&'+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(e)))throw new Error('Bitte 1 bis 50 vollständige E-Mail-Adressen eingeben, mit Kommas getrennt. Keine Wildcards.');
 return emails;
}
export function localModelNames(models){
 return models.filter(m=>typeof m.name==='string'&&m.size>=50000000&&!m.remote_host&&!m.remote_model&&!/cloud/i.test(m.name)).map(m=>m.name);
}
export class ShareAccess{
 #origin=null;#models;
 constructor(emails,models){
  this.emails=Object.freeze(allowedEmails(emails.join(',')));
  if(!models.length||models.some(m=>typeof m!=='string'||!/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,99}$/.test(m)||/cloud/i.test(m)))throw new Error('Mindestens ein installiertes lokales Modell wird benötigt.');
  this.#models=new Set(models);
  Object.defineProperty(this,'host',{value:`exitai-share-${randomBytes(12).toString('hex')}.internal`,enumerable:true});
 }
 get origin(){return this.#origin;}
 activate(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||! /^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(url.hostname))throw new Error('Ungültige HTTPS-Adresse des Quick Tunnels.');
  if(this.#origin&&this.#origin!==url.origin)throw new Error('Die Freigabe-Adresse hat sich unerwartet geändert. Bitte neu starten.');
  this.#origin=url.origin;
 }
 revoke(){this.#origin=null;}
 permitsModel(name){return this.#models.has(name);}
 modelNames(){return [...this.#models];}
}
