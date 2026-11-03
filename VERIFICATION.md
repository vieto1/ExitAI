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
