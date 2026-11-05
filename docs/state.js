export function decodeState(value){
 const text=(x,max)=>typeof x==='string'&&x.length<=max;
 const array=(x,max,valid)=>Array.isArray(x)&&x.length<=max&&x.every(valid);
 if(!value||!array(value.chats,100,c=>c&&text(c.id,100)&&text(c.title,100)&&array(c.messages,40,m=>m&&['user','assistant'].includes(m.role)&&text(m.content,50000)))||!array(value.documents,5,d=>d&&text(d.name,200)&&text(d.content,40000)&&(d.enabled===undefined||typeof d.enabled==='boolean'))||!text(value.terms,40000)||!array(value.prompts,200,p=>p&&text(p.title,80)&&text(p.text,5000)))throw new Error('Die Datei enthält keine gültige ExitAI-Datensicherung.');
 if(new Set(value.chats.map(c=>c.id)).size!==value.chats.length)throw new Error('Die Datensicherung enthält doppelte Chat-IDs.');
 return {chats:value.chats.map(c=>({id:c.id,title:c.title,messages:c.messages.map(m=>({role:m.role,content:m.content}))})),documents:value.documents.map(d=>({name:d.name,content:d.content,enabled:d.enabled!==false})),terms:value.terms,prompts:value.prompts.map(p=>({title:p.title,text:p.text})),currentId:text(value.currentId,100)?value.currentId:null,provider:['ollama','openai','anthropic'].includes(value.provider)?value.provider:'ollama',model:text(value.model,100)?value.model:'qwen2.5:3b'};
}
