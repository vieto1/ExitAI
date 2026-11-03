# ExitAI 0.4.0 · Website und lokaler KI-Arbeitsbereich

**[Installationspaket herunterladen](https://github.com/vieto1/ExitAI/raw/refs/heads/main/downloads/ExitAI-Website-und-App.zip)** · [Downloadordner mit Prüfsumme](https://github.com/vieto1/ExitAI/tree/main/downloads)

Eigenständige lokale Web-App mit Website, Chat, Modellwahl, Maskierungsvorschau, PDF-/DOCX-Kontext, Prompt-Bibliothek, Audit und lokaler Datenschutz-API. Entwickelt anhand öffentlich dokumentierter Nenna-Kernideen und mit REA untersuchter Produktseiten. Keine vollständige oder zertifizierte Nenna-Suite.

## Auf dem Mac starten

1. ZIP entpacken und den gesamten ExitAI-Ordner dauerhaft ablegen.
2. Terminal im Ordner öffnen und `bash Setup.command` ausführen. Das lädt gepinntes Node.js 24.22.1 und Ollama 0.40.14 in `.runtime`, prüft SHA-256-Prüfsummen, installiert die Lockfile-Abhängigkeiten, baut das Downloadpaket und lädt `qwen2.5:3b`. Es werden mehrere GB Speicher und Internet benötigt. Bestehende Systemsoftware wird nicht ersetzt.
3. Mit `bash Start.command` starten. Die im Terminal angezeigte Adresse im Browser öffnen, standardmäßig `http://127.0.0.1:3210`.
4. Auf der Website **App öffnen** wählen. Der Arbeitsbereich liegt unter `/app`.
5. Das Terminal während der Nutzung offen lassen. Ctrl+C beendet die App und einen von ihr gestarteten Ollama-Prozess. Bereits laufende Modellserver bleiben bestehen.

**macOS wurde hier noch nicht praktisch getestet.** Die Shellskripte sind syntaktisch geprüft; die Ollama-Paketstruktur und deren offizielle Prüfsumme wurden kontrolliert. Die eigentliche App und die Browserabläufe wurden unter Linux geprüft. Wenn macOS das Doppelklicken heruntergeladener Skripte verhindert, die oben genannten Terminalbefehle verwenden.

Bereits vorhandene Node-/Ollama-Installation, Linux oder manuelle Entwicklung:

```bash
npm ci
npm run package
npm start
```

Ollama separat starten und ein Modell laden. Der Server wird unter `127.0.0.1:11434` erwartet. Modellnamen sind in der App editierbar. Kleine Modelle können für Dokumentfragen ungeeignet sein; alle Ergebnisse anhand der Quellen prüfen.

## Website

- `/`: gestaltete Produktseite mit echter lokaler Maskierungsdemo. Kein Modellaufruf durch die Demo.
- `/installation`: Installation, Benutzung und Fehlerhilfe.
- `/datenschutz`: tatsächliche Datennutzung und Grenzen.
- `/app`: Arbeitsbereich.
- `/download`: aktuelles lokal gebautes ZIP-Paket ohne Schlüssel, Modellgewichte, Browserdaten und Laufzeiten.

Keine externen Schriftarten, Tracking-Skripte, erfundenen Kundenlogos oder Zertifikate. Die Website ist **nicht öffentlich veröffentlicht**. Der Server bindet nur an Loopback. Öffentlicher Betrieb benötigt zusätzlich Authentifizierung, Betriebsabsicherung und rechtliche Angaben des tatsächlichen Betreibers.

## Arbeitsablauf

- Unter **Datenschutz** eigene Namen, Firmen und Geschäftsgeheimnisse als exakte Schutzbegriffe eintragen, ein Begriff pro Zeile. Groß-/Kleinschreibung beachten.
- In der **Wissensbasis** bis zu fünf PDF-, DOCX-, TXT-, MD- oder CSV-Dateien importieren und über die Checkboxen für den Chat auswählen. Maximal 10 MB und 40.000 extrahierte Zeichen je Datei; maximal 100 PDF-Seiten. Kein OCR für Scans. Dokumente werden vollständig als Kontext gesendet, keine Vektorsuche.
- Im **Chat** Anbieter und Modell wählen. **Prüfen & senden** zeigt den maskierten Verlauf und die ausgewählten Dokumente. Erst die Bestätigung ruft ein Modell auf.
- Die Originalwerte werden lokal wieder eingesetzt, sofern das Modell die Platzhalter unverändert verwendet. Der Modellwechsel erhält den Verlauf. Neue Chats über „Neuer Chat“; bestehende Chats in der Seitenleiste auswählen, umbenennen oder löschen.
- **Prompt-Bibliothek**: vorhandene Vorlagen nutzen oder eigene speichern.
- **Audit & API**: Metadaten einsehen und als JSON exportieren. Die API ist in `API.md` beschrieben.
- **Daten sichern** exportiert Verlauf, Dokumente, Vorlagen, Schutzbegriffe und Auswahl als JSON. **Wiederherstellen** prüft und ersetzt nach Bestätigung den aktuellen Browserstand. Sicherungen können sensible Originaldaten enthalten. Maximal 100 Chats mit je 40 Nachrichten und 200 eigene Vorlagen.
- Chatverläufe können als Markdown exportiert werden.

## Cloud-Modelle optional

`.env.example` als `.env` kopieren. Nur lokal die gewünschten Schlüssel eintragen:

```text
EXITAI_OPENAI_KEY=
EXITAI_ANTHROPIC_KEY=
```

Server neu starten. Schlüssel niemals in Chatnachrichten oder Git eintragen. OpenAI verwendet Chat Completions, Anthropic die Messages-API. Nicht jedes Spezialmodell unterstützt diese Schnittstellen; Modellnamen und Berechtigungen müssen zum Anbieter passen. Cloud-Verträge, Datenverarbeitung und Kosten gelten separat. Ohne Schlüssel bleiben diese Anbieter deaktiviert. Cloud-Aufrufe wurden mangels bereitgestellter Schlüssel nicht live verifiziert.

## Datenschutzgrenzen

Regelbasierte Erkennung von E-Mail, IBAN, Telefonnummern mit `+`, bestimmten Geldbeträgen und eigenen Begriffen. **Keine vollständige Erkennung personenbezogener Daten.** Andere Namen, Anschriften, Gesundheitsinformationen und indirekte Identifikatoren können unerkannt bleiben. Die Vorschau stets vollständig prüfen. Auch maskierter Kontext kann vertraulich bleiben.

Verlauf, Schutzbegriffe, Originalantworten und Dokumente liegen unverschlüsselt im Browserprofil. Zuordnungen werden nur lokal verarbeitet und nicht zum Modell gesendet. `.local/audit.jsonl` enthält nur Zeitpunkt, Anbieter, Modell und Zähler; keine Prompts oder Zuordnungen, aber auch keine Manipulationssicherheit. „Lokale App-Daten löschen“ löscht Browserdaten, keine Exporte oder Auditdateien.

Keine Compliance-Zertifizierung und keine Zusage zu DSGVO, BRAO oder §203 StGB. Kein Mehrbenutzerbetrieb, SSO, Rollenmanagement, Bildgenerator oder Code-ausführender Office-Agent. Die optionale Chromium-Erweiterung in `watch` ist ein explizit bedienter Composer, kein Schutz für 300 Webseiten. Ein realer Extension-Ablauf auf fremden Zielseiten konnte hier nicht verifiziert werden; Safari wird nicht unterstützt.

## Prüfungen

```bash
npm test                         # 10 automatisierte Tests
npm run verify:browser           # laufende App und Chromium benötigt
npm run verify:live              # laufende App und zwei Ollama-Modelle benötigt
npm run build:watch
npm run package
```

`BROWSER_PATH` kann die Browserdatei auswählen. Auf macOS ist für Browserprüfungen Google Chrome unter seinem Standardpfad voreingestellt. Die Live-Prüfung verwendet standardmäßig `qwen2.5:3b` und `qwen2.5:1.5b`; sie installiert keine Modelle. Andere Modelle über `EXITAI_TEST_MODEL` und `EXITAI_SECOND_TEST_MODEL` auswählen. Mit `EXITAI_LIVE=1` kann die Browserprüfung zusätzlich eine echte Antwort prüfen.

Die REA-Befunde und ihre begrenzte Abdeckung stehen in `research/findings.md`. Für den vollständigen Abgleich mit Nennas angemeldeter Anwendung fehlt weiterhin eine zugängliche Demo oder Aufzeichnung. Der enthaltene Code ist eine eigenständige lokale Alternative und kein Nachweis vollständiger Nenna-Funktionsgleichheit.
