import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../public/api-response.js';
test('API preserves server JSON and distinguishes gateway failures from expired access',async()=>{
 assert.deepEqual(await readApiResponse(new Response('{"error":"Fremde Herkunft nicht erlaubt."}',{status:403})),{error:'Fremde Herkunft nicht erlaubt.'});
 await assert.rejects(readApiResponse(new Response('Your request was blocked.',{status:403})),/blockiert.*HTTP 403/);
 await assert.rejects(readApiResponse(new Response('<html>Bad gateway</html>',{status:502})),/Mac ist derzeit nicht erreichbar.*HTTP 502/);
 await assert.rejects(readApiResponse(new Response('<html>Sign in with a one-time PIN</html>',{status:200})),/Anmeldeseite.*HTTP 200/);
 await assert.rejects(readApiResponse(new Response('<html>Unexpected</html>',{status:200})),/keine lesbare ExitAI-Antwort/);
 await assert.rejects(readApiResponse(new Response('null')),/keine lesbare ExitAI-Antwort/);
});
