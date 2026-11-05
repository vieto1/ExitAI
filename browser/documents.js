import mammoth from 'mammoth/mammoth.browser.js';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.mjs',import.meta.url).href;
export async function browserDocument(file,name){
 if(file.byteLength>10000000)throw new Error('Maximal 10 MB pro Dokument.');
 let text;const ext=name.split('.').pop().toLowerCase();
 if(['txt','md','csv'].includes(ext))text=new TextDecoder().decode(file);
 else if(ext==='docx')text=(await mammoth.extractRawText({arrayBuffer:file})).value;
 else if(ext==='pdf'){
  const task=getDocument({data:new Uint8Array(file),isEvalSupported:false,useSystemFonts:true});
  try{const pdf=await task.promise;if(pdf.numPages>100)throw new Error('Maximal 100 PDF-Seiten.');const pages=[];
   for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n),content=await p.getTextContent();pages.push(content.items.filter(x=>'str' in x).map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));if(pages.join('\n').length>40000)throw new Error('Maximal 40.000 Zeichen pro Dokument.');}text=pages.join('\n\n');
  }finally{await task.destroy();}
 }else throw new Error('Unterstützt: PDF, DOCX, TXT, MD und CSV.');
 if(text.includes('\u0000')||!text.trim())throw new Error('Kein lesbarer Text. Gescannte PDFs benötigen OCR.');
 if(text.length>40000)throw new Error('Maximal 40.000 Zeichen pro Dokument.');
 return {name,content:text};
}
