import JSZip from 'jszip';
import {readdir,readFile,mkdir,writeFile,stat} from 'node:fs/promises';
const root=new URL('../',import.meta.url),zip=new JSZip();
const exclude=new Set(['.git','.local','.central','.runtime','.release','downloads','docs','node_modules','.env']);
async function visit(dir,relative=''){
 for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(exclude.has(item.name))continue;
  const path=relative+item.name,url=new URL(item.name+(item.isDirectory()?'/':''),dir);
  if(item.isDirectory())await visit(url,path+'/');
  else if(item.isFile()){const info=await stat(url);zip.file('ExitAI/'+path,await readFile(url),{unixPermissions:info.mode,date:new Date('2026-11-03T00:00:00Z')});}
 }
}
await visit(root);await mkdir(new URL('.release/',root),{recursive:true});
const data=await zip.generateAsync({type:'nodebuffer',platform:'UNIX',compression:'DEFLATE'});
await JSZip.loadAsync(data,{checkCRC32:true});
await writeFile(new URL('.release/ExitAI.zip',root),data);
console.log(`Downloadpaket gebaut und geprüft: ${data.length} Bytes, ohne Schlüssel, Modelle oder Laufzeitdaten.`);
