import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractDocument} from '../documents.mjs';
for(const type of ['pdf','docx'])test(`extracts actual ${type.toUpperCase()} bytes into text`,async()=>{
 const bytes=await readFile(new URL(`./fixtures/example.${type}`,import.meta.url));
 const doc=await extractDocument(bytes,`Quelle.${type}`);assert.match(doc.content,/Projekt Atlas startet Montag/);assert.equal(doc.name,`Quelle.${type}`);
});
test('rejects unsupported, binary and oversized documents',async()=>{
 await assert.rejects(extractDocument(Buffer.from('not pdf'),'bad.pdf'));
 await assert.rejects(extractDocument(Buffer.from('hello'),'bad.exe'));
 await assert.rejects(extractDocument(Buffer.from('x'.repeat(40001)),'big.txt'));
 await assert.rejects(extractDocument(Buffer.from(''),'empty.txt'));
});
