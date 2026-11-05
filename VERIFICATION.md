# Prüfübersicht · ExitAI 0.4.0

Stand: 3. November 2026. Ausgeführt auf Linux x86_64 mit Node.js 24.22.1 und Chromium 154. Die Website ist lokal, nicht öffentlich veröffentlicht.

## Bestanden

- `npm test`: 10 Tests, 10 bestanden, keine übersprungen. Echte PDF-/DOCX-Dateien, unzulässige Dokumente, Maskierung/Wiederherstellung, identische Platzhalter im Verlauf, HTTP-API, Metadaten-Audit, fehlerhafte Requests und Datenbackup-Validierung.
- `npm run verify:browser`: echte Website-Demo, Seitenrouten, echter ZIP-Download, PDF-Upload, Versandvorschau, Auswahl des Dokumentkontexts, Vorlagen, Datenexport, Wiederherstellung des gespeicherten Browserstands beim Neuladen, Audit und mobiles Layout.
- `EXITAI_LIVE=1 npm run verify:browser`: derselbe Ablauf mit echtem lokalem qwen2.5:3b. Die PDF-Frage wurde mit „Projekt Atlas startet Montag“ und lokal wiederhergestelltem Originalnamen beantwortet.
- `npm run verify:live`: echte Modelle qwen2.5:3b und qwen2.5:1.5b. Projekt, Budget und Starttermin aus dem Dokument; maskierte Modellantwort, lokale Wiederherstellung und erhaltenes Projektwissen nach Modellwechsel.
- Downloadpaket unabhängig entpackt, per `npm ci` installiert, getestet, gebaut und gestartet. Paketintegrität und Ausschluss von Schlüsseln, .local, Modellen, node_modules und Laufzeitdaten geprüft.
- `bash -n Setup.command Start.command`: Syntaxprüfung. Offizielles macOS-Ollama-Paket und SHA-256-Prüfsumme wurden kontrolliert.

## Nicht verifiziert bzw. nicht enthalten

- Keine praktische Ausführung auf macOS; keine öffentliche Veröffentlichung oder Hosting-Konfiguration.
- Keine echten Cloud-Aufrufe ohne bereitgestellte Schlüssel.
- Die optionale Erweiterung konnte im verwalteten Cloud-Chromium nicht als entpackte Extension geladen werden. Kein bestätigter Schutz auf fremden KI-Webseiten und keine Safari-Erweiterung.
- Keine vollständige Nenna-Parität: kein Unternehmens-SSO, Rollenmanagement, Bildgenerator oder Code-ausführender Office-Agent. Nennas angemeldete Anwendung und Backend wurden nicht rekonstruiert.
- Keine Zusage vollständiger Anonymisierung oder rechtlicher Konformität. KI-Ergebnisse bleiben prüfpflichtig.

Die anfänglich geprüften winzigen Modelle hatten bei weiterführenden Dokumentfragen Qualitätsgrenzen. qwen3:4b war in dieser Laufzeit wegen ausgegebener Überlegungen statt kurzer Antworten ungeeignet. Die ausgelieferte Voreinstellung ist deshalb das im vollständigen Browserablauf geprüfte qwen2.5:3b.

## Ergänzung: zentraler Betrieb 0.5.0

13 Tests bestanden, einschließlich gesalzener Passworthashes, HTTPS-Origin-Konfiguration, Anmeldung, Session-Cookie-Flags, persistenter und widerrufbarer Sitzungen, Passwortänderung, Rollen, Herkunftsprüfung und Anmeldebegrenzung. Docker-App-Image gebaut. Caddy 2.11.7 mit verifizierter lokaler CA getestet: HTTPS, Reverse-Proxy, Anmeldung, Sitzung, Admin-Abgrenzung, Maskierung und Abmeldung funktionieren. App und Modell haben in Compose keine öffentlich freigegebenen Ports. Produktionsrollen und Zertifikatserneuerung sind konfiguriert; echte öffentliche Domain-Zertifikatsausstellung und Remote-Deployment bleiben ungetestet, da Hosting und Domain fehlen. Keine Benutzerdateien, Passwörter oder Sitzungsdaten werden in Git, ZIPs oder Docker-Images kopiert.

## Ergänzung: kostenlose Mac-Freigabe 0.6.0

17 automatisierte Tests bestehen. Neu geprüft: genaue E-Mail-Liste ohne Wildcards, installierte lokale Modelle, HTTPS-Tunnel-Origin, URL plus registrierte Verbindung als Voraussetzung, Abbruch ohne anonymen Fallback, Audit-/Cloud-Anbieter-Sperre, Modell-Zulassung und Widerruf. Cloudflared 2026.10.7 wurde gegen den offiziellen SHA-256-Digest geprüft; die echte Linux-Laufzeit akzeptiert sämtliche verwendeten Flags einschließlich --allowed-mail. Das offizielle macOS-ARM64-Archiv wurde heruntergeladen und auf Prüfsumme und Struktur kontrolliert. Kein echter öffentlicher Tunnel, keine PIN-Zustellung und keine macOS-Ausführung in dieser Cloud verifiziert. Ein lokaler HTTP-Freigabetest ersetzt keinen erfolgreichen externen Cloudflare-Test.

## 0.6.1: Freigabefehler genauer anzeigen

18 automatisierte Tests bestanden. Nicht lesbare Gateway-Antworten werden nach HTTP-Status und Anmeldeumleitung unterschieden; eine HTML-/Textantwort wird nicht mehr pauschal als Sitzungsunterbrechung bezeichnet. Der Abruf des vom Nutzer gezeigten öffentlichen Links lieferte aus der Prüfumgebung HTTP 403 mit „Your request was blocked.“. Dieser Abruf hatte keine Besuchersitzung und belegt nicht die konkrete Ursache im Safari-Browser des Nutzers. Eine Wiederherstellung des öffentlichen Zugangs ist damit nicht nachgewiesen.

## 0.7.0: Statischer Browser-Pilot für GitHub Pages

- 18 automatisierte Tests bestanden; lokale Website/App-Browserprüfung weiterhin bestanden.
- Eigene Pages-Browserprüfung bestanden: Navigation unter /ExitAI/, PDF- und DOCX-Import, identische Maskierung aus gemeinsamem request.mjs/privacy.mjs, Versandvorschau, mobile Darstellung, keine Server-API-Aufrufe und verständlicher Fehler bei fehlendem WebGPU.
- Echte WebLLM-Modellgewichte für Qwen2.5 1.5B wurden heruntergeladen (rund 835 MB) und erfolgreich in WebGPU geladen. Die softwarebasierte Testgrafik lieferte innerhalb von fünf Minuten keine vollständige Antwort. Das ist kein erfolgreicher Ende-zu-Ende-Nachweis einer Antwort. Ein kleineres 0.5B-Modell ist als Option vorhanden. Produktion bricht Modellstart nach zehn Minuten und Antwortgenerierung nach drei Minuten mit einer erklärenden Meldung ab; beendete Worker werden verworfen und können neu gestartet werden.
- GitHub-Pages-Aktivierung per API wurde versucht, von GitHub jedoch mit HTTP 403 „Resource not accessible by integration“ abgelehnt. Die fertigen statischen Dateien liegen in docs/. Die Pages-Website ist bis zur Aktivierung in Settings → Pages und erfolgreichem GitHub-Build nicht online. Kein zentraler KI-Server und keine GitHub-Actions-Dauerlauf-Hostinglösung.
