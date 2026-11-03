import {extname} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function extractDocument(bytes,name){
  const extension=extname(name).toLowerCase();
  let text;
  if(['.txt','.md','.csv'].includes(extension))text=bytes.toString('utf8');
  else if(extension==='.docx'){
    const {default:mammoth}=await import('mammoth');
    text=(await mammoth.extractRawText({buffer:bytes})).value;
  }else if(extension==='.pdf'){
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,standardFontDataUrl:fileURLToPath(new URL('./node_modules/pdfjs-dist/standard_fonts/',import.meta.url))});
    try{
      const pdf=await task.promise;
      if(pdf.numPages>100)throw new Error('Maximal 100 PDF-Seiten.');
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);const content=await page.getTextContent();
        pages.push(content.items.filter(item=>'str' in item).map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));
        if(pages.join('\n').length>40000)throw new Error('Maximal 40.000 extrahierte Zeichen pro Dokument.');
      }
      text=pages.join('\n\n');
    }finally{await task.destroy();}
  }else throw new Error('Unterstützt: PDF, DOCX, TXT, MD und CSV.');
  if(text.includes('\u0000'))throw new Error('Die Datei enthält keine unterstützten Textdaten.');
  if(!text.trim())throw new Error('Kein Text gefunden. Gescannte PDFs benötigen vorher eine OCR-Verarbeitung.');
  if(text.length>40000)throw new Error('Maximal 40.000 extrahierte Zeichen pro Dokument.');
  return {name,content:text};
}
