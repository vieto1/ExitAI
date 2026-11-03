import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const base=process.env.EXITAI_TEST_URL??'http://127.0.0.1:3210';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/chromium'),headless:true});
const output=name=>fileURLToPath(new URL('../research/'+name,import.meta.url));
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.locator('#mask-demo button').click();await p.waitForFunction(()=>document.querySelector('#demo-status').textContent.includes('maskiert'));
 const mask=await p.textContent('#demo-output');assert.ok(!mask.includes('Jasmin'));assert.ok(!mask.includes('85.000'));assert.ok(mask.includes('[EXITAI_'));
 for(const path of ['/installation','/datenschutz']){const response=await p.request.get(base+path);assert.equal(response.status(),200);}
 const zip=await p.request.get(base+'/download');assert.equal(zip.status(),200);assert.equal((await zip.body()).subarray(0,2).toString(),'PK');
 await p.screenshot({path:output('website-desktop.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:output('website-mobile.png'),fullPage:true});
 await p.setViewportSize({width:1440,height:1000});await p.goto(base+'/app');await p.waitForSelector('#provider option',{state:'attached'});
 await p.click('[data-view="privacy"]');await p.fill('#terms','Jasmin Neufeld');
 await p.click('[data-view="knowledge"]');await p.setInputFiles('#files',fileURLToPath(new URL('../test/fixtures/example.pdf',import.meta.url)));await p.waitForSelector('#documents button');
 await p.click('[data-view="chat"]');await p.fill('#message','/no_think Formuliere eine Bestätigung an Jasmin Neufeld. Nenne Projekt und Start aus Quelle 1. Übernimm Platzhalter exakt.');await p.fill('#model',process.env.EXITAI_TEST_MODEL??'qwen2.5:3b');
 await p.click('#preview-button');await p.waitForSelector('dialog[open]');const preview=await p.textContent('#preview-content');assert.ok(!preview.includes('Jasmin'));assert.match(preview,/Projekt Atlas/);assert.match(preview,/\[EXITAI_1\]/);
 if(process.env.EXITAI_LIVE==='1'){await p.click('#send');await p.waitForSelector('.message.assistant',{timeout:150000});const answer=await p.textContent('.message.assistant');assert.match(answer,/Atlas/);assert.match(answer,/Jasmin Neufeld/);console.log('Echte Antwort im Browser:',answer);}else await p.click('#cancel-preview');
 await p.click('[data-view="knowledge"]');await p.uncheck('#documents input[type="checkbox"]');await p.click('[data-view="chat"]');await p.fill('#message','Noch eine Frage ohne Dokumentkontext.');const unselectedPreview=p.waitForResponse(r=>r.url().endsWith('/api/preview')&&r.request().method()==='POST');await p.click('#preview-button');await p.waitForSelector('dialog[open]');assert.ok(!(await (await unselectedPreview).json()).system.includes('Projekt Atlas'));await p.click('#cancel-preview');
 await p.click('[data-view="prompts"]');await p.fill('#prompt-title','Eigene Prüfung');await p.fill('#prompt-text','Fasse diese Angaben zusammen.');await p.click('#prompt-form button');await p.click('#custom-prompts button:first-child');assert.equal(await p.inputValue('#message'),'Fasse diese Angaben zusammen.');
 const backupPromise=p.waitForEvent('download');await p.click('#backup');const backup=await backupPromise;assert.equal(backup.suggestedFilename(),'ExitAI-Datensicherung.json');
 await p.reload();await p.waitForSelector('#provider option',{state:'attached'});await p.click('[data-view="knowledge"]');assert.equal(await p.isChecked('#documents input[type="checkbox"]'),false);
 await p.click('[data-view="audit"]');await p.waitForFunction(()=>document.querySelector('#audit-summary').textContent.includes('Aufrufe'));
 await p.click('[data-view="chat"]');await p.screenshot({path:output('app-desktop.png'),fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('Browserchecks bestanden: Website, Demo, Download, PDF-Import, Versandvorschau, Dokumentauswahl, Vorlagen, Sicherung, Persistenz, Audit und mobile Darstellung.');
}finally{await browser.close();}
