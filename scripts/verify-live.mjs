import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.EXITAI_TEST_URL??'http://127.0.0.1:3210';
const firstModel=process.env.EXITAI_TEST_MODEL??'qwen2.5:3b';
const secondModel=process.env.EXITAI_SECOND_TEST_MODEL??'qwen2.5:1.5b';
const documents=[{name:'Projekt.txt',content:'Kundin: Jasmin Neufeld. Projekt: Atlas. Budget: 85.000 €. Geplanter Start: Montag.'}];
const messages=[{role:'user',content:'/no_think Formuliere eine kurze Bestätigung an Jasmin Neufeld. Nenne Projekt, Budget und geplanten Start aus Quelle 1. Übernimm Platzhalter exakt.'}];
async function call(model,history){const response=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'ollama',model,confirmed:true,terms:['Jasmin Neufeld'],documents,messages:history}),signal:AbortSignal.timeout(150000)});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
const first=await call(firstModel,messages);
assert.match(first.answer,/Atlas/);assert.match(first.answer,/85\.000/);assert.match(first.answer,/Jasmin Neufeld/);assert.match(first.maskedAnswer,/\[EXITAI_\d+\]/);assert.ok(!first.maskedAnswer.includes('Jasmin Neufeld'));assert.ok(!first.maskedAnswer.includes('85.000'));
const history=[...messages,{role:'assistant',content:first.answer},{role:'user',content:'Wie heißt das Projekt aus unserem Gespräch? Antworte nur mit dem Projektnamen.'}];
const second=await call(secondModel,history);assert.match(second.answer,/Atlas/);
const report={at:new Date().toISOString(),firstModel,secondModel,checks:{documentContext:true,masking:true,restoration:true,modelSwitchContext:true},first,second};
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});await writeFile(new URL('../.local/live-verification.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
