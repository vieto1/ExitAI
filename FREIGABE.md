# Kostenloser Kollegentest über deinen Mac

Diese Freigabe benötigt kein Hosting-Konto, keine Bankdaten, keine eigene Domain und kein Cloudflare-Konto. Dein Mac bleibt der Server. Die Kollegen benötigen nur einen Browser und ihre freigegebene E-Mail-Adresse.

## Starten

1. Die aktuelle ZIP-Ausgabe herunterladen und in einen neuen Ordner entpacken. Einen vorhandenen ExitAI-Ordner nicht löschen.
2. Ein bisher laufendes `Start.command` mit Ctrl+C beenden. Dann im **neuen Ordner** einmal `Setup.command` ausführen. Die Einrichtung lädt projektlokale Laufzeiten und ein lokales Modell; das kann erneut mehrere GB benötigen.
3. Im selben neuen Ordner **Freigabe.command** doppelklicken. `Start.command` ist für diese Freigabe nicht zusätzlich nötig.
4. Die erlaubten E-Mail-Adressen mit Kommas getrennt eingeben. Für den ersten Test die eigene Adresse mit aufnehmen. Es gibt keine Freigabe für „alle“ und keine Wildcards.
5. Das Programm lädt Cloudflared 2026.10.7 aus der offiziellen Quelle, prüft SHA-256 und baut einen geschützten Quick Tunnel auf.
6. Erst nach erfolgreicher Verbindung erscheint der HTTPS-Link mit `/app`. Diesen an die eingetragenen Kollegen weitergeben.
7. Die Kollegen öffnen den Link, geben ihre freigegebene E-Mail-Adresse ein und bestätigen den zugesandten Einmal-PIN. Danach können sie die App im Browser testen.

Das Freigabefenster offen lassen. Den Mac aufgeklappt, online und möglichst am Strom lassen. Gegen automatischen Leerlaufschlaf startet das Programm unter macOS vorübergehend `caffeinate`; das ersetzt kein Offenlassen des Deckels. Mit Ctrl+C oder Schließen des Fensters endet die Freigabe. Bei jedem neuen Start entsteht ein anderer Link.

## Was freigegeben wird

- Besucher arbeiten mit den beim Start gefundenen installierten lokalen Modellen auf deinem Mac. Modellnamen mit Cloud-Verweis oder Remote-Metadaten werden ausgeschlossen.
- OpenAI-/Anthropic-Anbieter sind für Besucher sowohl in der Oberfläche als auch auf der API gesperrt.
- Besucher können das Audit nicht lesen. Ihnen werden keine privaten Browserdaten des Mac-Besitzers übermittelt; ihre Chats liegen in ihrem eigenen Browserprofil.
- Dokumente und Nachrichten werden über Cloudflare zu deinem Mac übertragen. Die Maskierung erfolgt auf dem Mac. Cloudflare vermittelt und verarbeitet den Webverkehr sowie die erlaubte E-Mail-Liste. Für diesen Test **nur Beispieldaten verwenden**.
- Der Schutz per E-Mail-PIN wird von Cloudflares Quick-Tunnel-Dienst durchgeführt, nicht von den optionalen persönlichen Serverkonten. Die App kennt dadurch keine bestätigte individuelle Besucheridentität und protokolliert im Freigabemodus keine verifizierten Personennamen.

Die lokale App bleibt an die Loopback-Adresse gebunden. Die Freigabe nutzt einen separaten, zufälligen lokalen Port und einen eigenen internen Host-Header. Solange kein gültiger Tunnel bereit ist oder nach dem Widerruf, nimmt dieser Freigabezugang keine Anfragen an. Es wird niemals auf einen ungeschützten Tunnel ohne E-Mail-Liste zurückgefallen.

## Wenn etwas nicht funktioniert

- **„Zuerst Setup.command“:** Die Einrichtung im neuen Ordner abschließen. Die Ordner mit ihren Laufzeiten zusammenlassen.
- **„Kein installiertes lokales Modell“:** Setup bei gestoppter bisheriger App erneut ausführen. Alternativ das passende Modell in einer vorhandenen Ollama-Installation laden und diese laufen lassen.
- **Bestehende Cloudflare-Konfiguration:** Sie wird nicht überschrieben oder umbenannt. Diese Einrichtung muss gesondert geprüft werden.
- **Tunnel wird nicht bereit:** Manche Firmen-/Hotelnetze blockieren die benötigten Tunnelverbindungen. Es wird dann keine ungeschützte Alternative gestartet. Mit einer normalen eigenen Internetverbindung erneut testen.
- **PIN kommt nicht an:** Die beim Start eingegebene Adresse und den Spamordner prüfen. Änderungen der erlaubten Liste erfordern einen Neustart und erzeugen einen neuen Link.
- **Link geht später nicht mehr:** Freigabe beendet, Mac eingeschlafen oder Verbindung unterbrochen. Erneut starten und den neuen Link teilen.
- **Anmeldeseite / HTTP 401:** Den Freigabe-Link in einem neuen Tab öffnen und gegebenenfalls die E-Mail erneut bestätigen.
- **HTTP 403 / Anfrage blockiert:** Die Anfrage wird am Zugang abgewiesen. Das belegt keine abgelaufene Sitzung. Die genaue Fehlermeldung für die Fehlersuche festhalten.
- **HTTP 502, 503, 504 oder 530:** Freigabe.command, Internetverbindung und Wachzustand des Mac prüfen.
- **Nur auf dem eigenen Mac arbeiten:** Start.command öffnen und die angezeigte lokale Adresse verwenden. Dafür wird kein Cloudflare-Zugang benötigt.

## Grenzen und Prüfnachweis

Cloudflare Quick Tunnels sind für Test/Entwicklung gedacht, ohne Verfügbarkeitsgarantie. Laut offizieller Dokumentation sind maximal 200 gleichzeitige laufende Anfragen möglich; SSE wird nicht unterstützt. ExitAI verwendet für Chatantworten normale JSON-Anfragen, kein SSE. Mehrere gleichzeitige Modellaufrufe können deinen Mac auslasten und langsam werden.

Automatisiert geprüft wurden E-Mail-Pflicht, Modellbeschränkung, sichere Origin-/Host-Zuordnung, Tunnel-Bereitschaft und Widerruf, Audit-Sperre, Cloud-Anbieter-Sperre und Maskierung/Wiederherstellung. Die echte Linux-Cloudflared-Laufzeit akzeptiert die verwendeten Flags; Prüfsumme und Archivstruktur der Apple-Silicon-Ausgabe wurden kontrolliert. Der öffentliche Tunnel, die tatsächliche PIN-Zustellung und die macOS-Ausführung müssen auf dem Mac praktisch geprüft werden. Sie sind nicht als bereits erfolgreich getestet ausgewiesen.

Offizielle Grundlage: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
