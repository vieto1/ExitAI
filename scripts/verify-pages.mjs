import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const base=process.env.EXITAI_PAGES_TEST_URL??'http://127.0.0.1:3217/ExitAI';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'/usr/bin/chromium',headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],apiRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/|\/v1\//.test(new URL(r.url()).pathname))apiRequests.push(r.url());});
 await page.goto(base+'/');await page.click('a[href="./app/"]');await page.waitForSelector('#provider option',{state:'attached'});
 assert.match(await page.inputValue('#model'),/Qwen2.5-1.5B/);
 await page.click('[data-view="privacy"]');await page.fill('#terms','Jasmin Neufeld');
 await page.click('[data-view="knowledge"]');await page.setInputFiles('#files',fileURLToPath(new URL('../test/fixtures/example.pdf',import.meta.url)));await page.waitForSelector('#documents button');
 await page.click('[data-view="chat"]');await page.fill('#message','Schreibe eine kurze Begrüßung für Jasmin Neufeld.');await page.click('#preview-button');await page.waitForSelector('dialog[open]');
 const preview=await page.textContent('#preview-content');assert.ok(!preview.includes('Jasmin Neufeld'));assert.match(preview,/Projekt Atlas/);assert.match(preview,/\[EXITAI_1\]/);
 await page.click('#cancel-preview');
 await page.click('[data-view="knowledge"]');await page.setInputFiles('#files',fileURLToPath(new URL('../test/fixtures/example.docx',import.meta.url)));await page.waitForFunction(()=>document.querySelectorAll('#documents button').length===2);await page.click('[data-view="chat"]');
 if(process.env.EXITAI_BROWSER_MODEL_LIVE==='1'){
  await page.click('[data-view="knowledge"]');while(await page.locator('#documents button').count())await page.locator('#documents button').first().click();await page.click('[data-view="chat"]');
  if(process.env.EXITAI_BROWSER_TEST_MODEL)await page.selectOption('#model',process.env.EXITAI_BROWSER_TEST_MODEL);
  await page.fill('#message','Antworte nur mit der Zahl: Was ist 2 plus 3?');await page.click('#preview-button');await page.click('#send');
  const timer=setInterval(async()=>{console.log('Modellstatus:',await page.locator('.pilot-panel [role=status]').textContent().catch(()=>''));},10000);
  try{await page.waitForSelector('.message.assistant',{timeout:300000});console.log('Echte Browser-KI-Antwort:',await page.locator('.message.assistant').textContent());assert.match(await page.locator('.message.assistant').textContent(),/5|fünf/);}finally{clearInterval(timer);}
 }
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(apiRequests,[]);assert.deepEqual(errors,[]);
 const unsupported=await browser.newPage();await unsupported.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));await unsupported.goto(base+'/app/');await unsupported.locator('.pilot-panel button').click();await unsupported.waitForFunction(()=>document.querySelector('.pilot-panel [role=status]').textContent.includes('unterstützt WebGPU nicht'));await unsupported.close();
 console.log('Pages-Browserprüfung bestanden: Navigation, PDF-Import, Maskierung, Vorschau, mobil, keine Server-API-Aufrufe.');
}finally{await browser.close();}
