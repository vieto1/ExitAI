// Local deterministic masking. Not a general-purpose PII recognizer.
export function maskTexts(texts, terms = []) {
  const mappings = [], byValue = new Map();
  const token = (value, kind) => {
    if (byValue.has(value)) return byValue.get(value);
    const marker = `[EXITAI_${mappings.length + 1}]`;
    byValue.set(value, marker); mappings.push({ marker, value, kind }); return marker;
  };
  const patterns = [
    ['IBAN', /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g],
    ['E-Mail', /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi],
    ['Betrag', /\b\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s?(?:EUR|USD|CHF)\b|\b\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s?€/g],
    ['Telefon', /(?<!\w)\+\d[\d ()/.-]{6,}\d\b/g],
  ];
  const output = texts.map(text => {
    if (/\[EXITAI_\d+\]/u.test(text)) throw Object.assign(new Error('Die Eingabe enthält reservierte ExitAI-Platzhalter.'), {status:400});
    const spans = [];
    for (const value of [...new Set(terms.map(t=>t.trim()).filter(Boolean))].sort((a,b)=>b.length-a.length)) {
      for (let i=text.indexOf(value);i>=0;i=text.indexOf(value,i+value.length)) spans.push({start:i,end:i+value.length,kind:'Eigener Begriff'});
    }
    for(const [kind,re] of patterns) for(const m of text.matchAll(re)) spans.push({start:m.index,end:m.index+m[0].length,kind});
    const accepted=[];
    for(const span of spans) if(!accepted.some(s=>span.start<s.end&&span.end>s.start)) accepted.push(span);
    accepted.sort((a,b)=>a.start-b.start);
    let result='',cursor=0;
    for(const span of accepted) {result+=text.slice(cursor,span.start)+token(text.slice(span.start,span.end),span.kind);cursor=span.end;}
    return result+text.slice(cursor);
  });
  return {texts:output,mappings};
}
export function restore(text,mappings) {
  const values=new Map(mappings.map(m=>[m.marker,m.value]));
  return text.replace(/\[EXITAI_\d+\]/gu,marker=>values.get(marker)??marker);
}
