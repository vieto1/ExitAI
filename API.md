# Lokale Datenschutz-API

Alle Endpunkte verwenden ausschließlich den lokalen App-Server, standardmäßig `http://127.0.0.1:3210`. Dies ist keine öffentlich erreichbare oder mandantenfähige Enterprise-API. Fremde Browser-Origin-Anfragen werden abgewiesen; lokale Programme können zugreifen.

## POST /v1/mask

```bash
curl http://127.0.0.1:3210/v1/mask \
  -H 'Content-Type: application/json' \
  -d '{"text":"E-Mail an Alice: alice@example.com","terms":["Alice"]}'
```

Antwort:

```json
{"masked":"E-Mail an [EXITAI_1]: [EXITAI_2]","mappings":[{"marker":"[EXITAI_1]","value":"Alice","kind":"Eigener Begriff"},{"marker":"[EXITAI_2]","value":"alice@example.com","kind":"E-Mail"}]}
```

`text`: maximal 100.000 Zeichen. `terms`: maximal 200 exakte, groß-/kleinschreibungssensitive Einträge mit je 200 Zeichen. Die Zuordnung enthält Originaldaten und muss beim Aufrufer bleiben. Sie darf nicht an ein Cloud-Modell übertragen werden.

## POST /v1/restore

```json
{"text":"Hallo [EXITAI_1]","mappings":[{"marker":"[EXITAI_1]","value":"Alice"}]}
```

Antwort: `{"text":"Hallo Alice"}`. Keine serverseitig gespeicherte Zuordnung. Der Client liefert die passende Zuordnung wieder mit. Unbekannte Platzhalter bleiben unverändert. Freie Modellantworten können Platzhalter auslassen oder verändern; dies kann die Wiederherstellung verhindern.

## Dokumente und Audit

- `POST /api/documents/import?name=Quelle.pdf`: Binärinhalt als Request-Body. PDF, DOCX, TXT, MD, CSV; maximal 10 MB, 100 PDF-Seiten und 40.000 extrahierte Zeichen. Antwort: `{"name":"Quelle.pdf","content":"..."}`. Kein OCR. Keine Ausführung von Dokumentmakros.
- `GET /api/audit`: letzte 500 Audit-Einträge als JSON. Nur Zeitpunkt, Modellanbieter, Modellname sowie Maskierungs- und Dokumentzähler; keine Prompts oder Zuordnungen. Keine Manipulationssicherheit.
- `GET /api/models`: erreichbare lokale Ollama-Modelle.
- `POST /api/preview`: maskierter Chatverlauf einschließlich Dokumentkontext, ohne Modellaufruf.
- `POST /api/chat`: gleicher Request plus `provider`, `model` und `confirmed:true`. Die Vorschau im Browser stellt sicher, dass der Nutzer die tatsächlichen Inhalte vor dem Versand prüfen kann. Diese Bestätigung ist keine serverseitige Authentifizierung.

Die Fehlerantwort hat die Form `{"error":"Beschreibung"}` mit passendem HTTP-Status. Die API implementiert dieselbe begrenzte regelbasierte Erkennung wie die Chat-App; keine Garantie vollständiger Anonymisierung.
