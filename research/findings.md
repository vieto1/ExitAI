# Nenna-Untersuchung und ExitAI-Funktionsumfang

Stand: 3. November 2026. Ziel des Nutzers: eigene lokal laufende Web-App für macOS. Die Implementierung ist eigenständig; keine Nenna-Assets, proprietären Server oder angemeldeten Konten wurden kopiert.

## Untersuchte Quellen

- https://nenna.ai und https://nenna.ai/chat (Weiterleitung auf www.nenna.ai): öffentliche Produktbeschreibungen, per HTTPS gelesen.
- https://app.nenna.ai: öffentlich sichtbare Einstiegsseite mit „Get started“ und „Sign in“. Keine Anmeldung oder Kontoerstellung ausgeführt.
- REA `list_browser_targets`: Browserziel bestätigt als „NENNA Chat – Die Privacy-First KI-Plattform“ auf https://www.nenna.ai/chat. Evidence `ev_9c3e71fe7d77b9d655dd7c961cc9ae94db9a993323fbf592f7507a6d102f12d5`.
- REA `inspect_web_page`: öffentliche Seite, Evidence `ev_153940f46344f0fc1265a162a9381ebefa2d60b110243a020aba2a06c973cf11`.
- REA `inspect_web_page` mit Accessibility-Text: Evidence `ev_6f6a1a239a42f1e4d3abd1a47c44948112c6eb0dcacf95794147279222046908`. Lokale Datei `nenna-accessibility-capture.json`.
- REA `analyze_web_bundle`: parent Evidence `ev_12d63909061ade4cef0a4f12c998f9e80be6f3f00315641bf3b36e19b47fc771`. Sechs beobachtete Skripte untersucht, keine Parse-Fehler. Semantische Abdeckung als **partial** gemeldet. Keine Endpoint- oder Route-Kandidaten in dieser begrenzten Aufnahme; dies ist kein Nachweis ihrer Abwesenheit. Vollständiger lokaler Beleg in `nenna-bundle-capture.json`.

## Befunde und Umsetzung

| Öffentliche Herstellerangabe | Eigene Implementierung | Verifizierungsgrenze |
|---|---|---|
| Sensible Angaben vor KI-Verarbeitung maskieren und in Antworten wieder einsetzen | Regelbasierte lokale Maskierung, eigene Schutzbegriffe, vollständige Vorschau, lokale Wiederherstellung | Eigene HTTP-/Privacy-Tests bestanden; keine Behauptung gleicher Erkennungsqualität |
| Mehrere Modelle bei erhaltenem Chatverlauf | Ollama, OpenAI, Anthropic; frei editierbare Modellnamen | Anbieteradapter implementiert; echter Modellaufruf noch nicht verifiziert |
| Eigenes Unternehmenswissen | TXT/MD/CSV als expliziter, maskierter Gesamtkontext | Echtes Browser-Upload und API-Kontext geprüft; kein RAG, kein Office-Import |
| Prompt-Bibliothek | Drei Vorlagen, eigene Vorlagen, lokale Speicherung | Chromium-Workflow und Persistenz geprüft |
| Audit/Governance | Inhaltsfreies lokales Metadaten-Audit | Lokale Datei geprüft; keine Manipulationssicherheit oder Unternehmens-Governance |

Produktangaben sind Herstellerangaben, keine unabhängig bestätigten Datenschutz- oder Compliance-Eigenschaften. Die Umsetzung ist eine begrenzte eigene Designentscheidung und keine aus dem Backend abgeleitete Rekonstruktion.

## Technische Diagnose

Die zuvor blockierten HTTPS-Zugriffe funktionieren nach dem Speichern der Netzwerkeinstellungen. Die Veröffentlichung des Umgebungssnapshots meldete einen Fehler; ihr Erfolg wird nicht behauptet.

REA-Szenario im direkt gestarteten Browser: initiale Navigation nach 20 Sekunden abgebrochen; Cleanup meldete `terminated-owned-process`. Der Direktstart hatte die Cloud-Proxy-Einstellung nicht als Browser-Proxy übernommen. Anschließend wurde ein Browser mit expliziter geerbter Proxy-Einstellung und aktivierter TLS-Prüfung gestartet. REA-Zielauflistung, passive Seiteninspektion und Bundle-Analyse über CDP waren erfolgreich. Das verbundene interaktive Szenario scheiterte mit generischem `execution_failure`; es gilt nicht als erfolgreicher Lauf. Aussagen zu Website-Interaktionen werden deshalb nicht daraus abgeleitet.

## Offene Arbeit

Praktischer macOS-Test mit lokal installiertem Ollama oder bereitgestelltem Cloud-Zugang; danach echte Generierung und Modellwechsel prüfen. Erweiterte Suite-Funktionen (Browser-Erweiterung, SSO, Office-Agenten, Bildgenerierung) sind nicht implementiert. Für eine genaue UI-/Workflow-Nachbildung der angemeldeten Anwendung wäre eine zugängliche Demo oder eine vom Nutzer bereitgestellte Aufzeichnung erforderlich.

## Aktualisierung: Website und lokales Produkt 0.4.0

Inzwischen sind PDF-/DOCX-Textextraktion, die lokale Maskierungs-/Restore-API, Audit-Auswertung, Chatverwaltung, gespeicherte Modellwahl, explizite Dokumentauswahl und geprüfter Browserdaten-Import/-Export implementiert. Die eigene Website enthält Produktseite, echte lokale Maskierungsdemo, Installation, Datennutzung und einen funktionierenden ZIP-Download. Sie wurde nicht öffentlich veröffentlicht.

Zehn automatisierte Tests bestehen. Echte Chromium-Prüfungen für Website, Demo, ZIP-Download, PDF-Import, Versandvorschau, Dokumentauswahl, eigene Vorlagen, Sicherung, Persistenz, Audit und mobiles Layout bestehen. Ein überstehender Glow-Effekt auf Mobilbreite wurde behoben. Mit echten lokalen Modellen qwen3:0.6b und gemma3:270m wurde Dokumentkontext, maskierte Modellanfrage, lokale Wiederherstellung und Modellwechselkontext erneut erfolgreich geprüft. Die kleinen Modelle zeigen bei freien Dokumentfragen Qualitätsgrenzen; ein zuvor fehlgeschlagener UI-Generierungstest wird nicht als bestanden behauptet. Kein praktischer macOS-Test und keine Live-Prüfung der Cloud-Anbieter.

Ältere Aussagen oben, wonach PDF-/DOCX oder echte lokale Inferenz noch fehlen, sind durch diese Aktualisierung überholt. Unternehmensfunktionen und vollständige Nenna-Parität bleiben unbelegt bzw. fehlen; siehe README.

### Abschließende Modellprüfung für 0.4.0

Die vorgesehene Voreinstellung wurde von qwen3:4b auf qwen2.5:3b geändert. Grund: In der vorhandenen Ollama-Laufzeit lieferte qwen3:4b selbst bei explizit deaktiviertem Denkmodus langes Selbstgespräch; die begrenzte Minimalanfrage wurde nicht korrekt beantwortet. Das Modell wird nicht als geeignete Voreinstellung ausgeliefert. Die Kernaufgabe im echten Browser wurde mit qwen2.5:3b korrekt beantwortet: PDF-Kontext „Projekt Atlas“ und Originalname wurden verwendet. Der abschließende API-Live-Test mit qwen2.5:3b und qwen2.5:1.5b bestand einschließlich Budget, Namens-Wiederherstellung und Modellwechsel-Kontext. Es wurden keine Assertions abgeschwächt, um Modellfehler als Erfolg zu zählen. Ein Browser-Testablauffehler nach dem Leeren des gesendeten Nachrichtenfelds wurde korrigiert, indem der Folgeschritt ausdrücklich eine neue Nachricht eingibt.

Das Downloadpaket wurde unabhängig entpackt, per npm ci installiert, getestet, gebaut und gestartet. Spätere Änderungen betreffen insbesondere die jetzt geprüfte Modellvoreinstellung und den gezielten Ollama-Aufruf. Eine vollständige macOS-Ausführung oder öffentliche Veröffentlichung wird weiterhin nicht behauptet.
