import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maskTexts,restore} from '../privacy.mjs';
test('masks email, IBAN, amount and custom names and restores exact input',()=>{
 const input='Angebot für Jasmin Neufeld, IBAN DE89 3704 0044 0532 0130 00, über 85.000 €. Kontakt: j.neufeld@muster-gmbh.de';
 const result=maskTexts([input],['Jasmin Neufeld']);
 for(const secret of ['Jasmin Neufeld','DE89','85.000','j.neufeld@'])assert.ok(!result.texts[0].includes(secret));
 assert.equal(result.mappings.length,4);assert.equal(restore(result.texts[0],result.mappings),input);
});
test('consistent identities across conversation and document with overlapping terms',()=>{
 const result=maskTexts(['Müller GmbH und Müller','Dokument Müller GmbH'],['Müller','Müller GmbH']);
 assert.equal(result.texts[0],'[EXITAI_1] und [EXITAI_2]');
 assert.equal(result.texts[1],'Dokument [EXITAI_1]');
});
test('restoration handles multiple and unknown tokens without recursive replacement',()=>{
 assert.equal(restore('[EXITAI_1], [EXITAI_1], [EXITAI_99]',[{marker:'[EXITAI_1]',value:'Alice'}]),'Alice, Alice, [EXITAI_99]');
 assert.throws(()=>maskTexts(['[EXITAI_1]'],[]));
});
test('unrecognized names remain visible rather than implying universal detection',()=>{
 assert.equal(maskTexts(['Jasmin Neufeld'],[]).texts[0],'Jasmin Neufeld');
});
