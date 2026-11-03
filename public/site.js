const form=document.querySelector('#mask-demo');
if(form)form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button');button.disabled=true;
 const result=document.querySelector('#demo-output'),status=document.querySelector('#demo-status');
 try{const response=await fetch('/v1/mask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:document.querySelector('#demo-text').value,terms:document.querySelector('#demo-terms').value.split('\n')})});const data=await response.json();if(!response.ok)throw new Error(data.error);result.textContent=data.masked;status.textContent=`${data.mappings.length} unterschiedliche Angaben maskiert. Kein KI-Modell aufgerufen.`;}
 catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
