# ExitAI Watch: geschützter Composer für Chromium

Dies ist ein bewusst bedienter, lokaler Prompt-Composer. Er ist keine automatische Überwachung aller KI-Tools, kein Datei-Upload-Filter und kein Nachweis einer Funktionsgleichheit zu Nenna Watch.

## Installation

Das ausgelieferte Archiv enthält `privacy.mjs` bereits. Nach Quellcodeänderungen im Projektordner `npm run build:watch` ausführen, um den gemeinsamen Maskierungscode zu übernehmen.

In Chrome/Chromium `chrome://extensions` öffnen, Entwicklermodus aktivieren, „Entpackte Erweiterung laden“ wählen und diesen `watch`-Ordner auswählen. Safari wird nicht unterstützt. Die Cloud-Browserumgebung hat das Laden dieser entpackten Erweiterung im Test nicht ermöglicht. Ein echter Erweiterungsablauf auf unterstützten Zielwebseiten ist noch nicht verifiziert.

## Benutzung

1. Eine gewünschte KI-Webseite öffnen und in deren leeres Texteingabefeld klicken.
2. ExitAI Watch über das Erweiterungssymbol öffnen.
3. Eigene Namen, Firmen oder Geschäftsgeheimnisse unter Schutzbegriffe ergänzen.
4. Den Originalprompt ausschließlich im Erweiterungspopup eingeben, niemals zuerst auf der fremden Seite.
5. Lokal maskieren und die vollständige maskierte Fassung prüfen.
6. „Maskierten Text … einfügen“ wählen. Der Composer ersetzt nur ein eindeutiges oder fokussiertes leeres Eingabefeld. Er sendet den Prompt nicht automatisch ab und überschreibt keine vorhandenen Eingaben.
7. Auf der KI-Webseite nochmals prüfen und selbst absenden.
8. Eine Antwort mit unveränderten Platzhaltern in das Popup kopieren und lokal wiederherstellen.

Eigene Begriffe werden im lokalen Erweiterungsspeicher gespeichert. Die Zuordnung für den letzten Prompt liegt in `chrome.storage.session`; neue Maskierungen ersetzen sie. Sie wird nicht mit der Webseite geteilt. Webseiten können eingefügten maskierten Text schon beim Einfügen lesen, auch bevor abgesendet wird. Nicht erkannte Informationen bleiben dabei sichtbar. Die Erkennung ist unvollständig.

Es gibt keine pauschalen Hostberechtigungen. `activeTab` und `scripting` dienen dem bewussten Einfügen im vom Nutzer gewählten Tab; `storage` speichert die lokalen Einstellungen und die letzte Zuordnung. Komplexe Editoren, eingebettete Frames oder Shadow-DOM-Oberflächen können nicht unterstützt sein. Ungeprüfte Kompatibilität wird nicht als Schutz zugesagt.
