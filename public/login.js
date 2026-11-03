document.querySelector('#login-form').onsubmit=async event=>{
 event.preventDefault();const button=event.target.querySelector('button'),status=document.querySelector('#login-status');button.disabled=true;
 try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.querySelector('#username').value,password:document.querySelector('#password').value})});const data=await response.json();if(!response.ok)throw new Error(data.error??'Anmeldung fehlgeschlagen.');document.querySelector('#password').value='';location.assign('/app');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
};
