export async function readApiResponse(response){
 const text=await response.text();
 try{
  const value=JSON.parse(text);
  if(value&&typeof value==='object'&&!Array.isArray(value))return value;
 }catch{}
 const status=response.status;
 const detail=` (HTTP ${status})`;
 if(response.redirected||/<!doctype html|<html/i.test(text)&&/login|sign.?in|one.?time|verification|einmal|anmeld/i.test(text))throw new Error('Die Anfrage wurde auf eine Anmeldeseite umgeleitet'+detail+'. Den Freigabe-Link in einem neuen Tab öffnen und gegebenenfalls den E-Mail-PIN bestätigen.');
 if(status===401)throw new Error('Der Zugang verlangt eine Anmeldung'+detail+'. Den Freigabe-Link erneut öffnen und anmelden.');
 if(status===403)throw new Error('Die Anfrage wurde vor der Verarbeitung blockiert'+detail+'. Das bestätigt keine abgelaufene Sitzung. Für die Fehlersuche einen Screenshot dieser Meldung senden.');
 if([502,503,504,530].includes(status))throw new Error('Der Freigabe-Zugang oder der Mac ist derzeit nicht erreichbar'+detail+'. Freigabe.command und Internetverbindung am Mac prüfen.');
 throw new Error('Der Zugang liefert keine lesbare ExitAI-Antwort'+detail+'. Für die Fehlersuche einen Screenshot dieser Meldung senden.');
}
