# Zentraler Team-Server mit HTTPS

Diese Konfiguration ist für einen einzelnen eigenen Linux-Server vorgesehen. Caddy terminiert HTTPS und erneuert öffentliche Zertifikate automatisch. Nur Ports 80/443 werden veröffentlicht; App und Ollama bleiben im privaten Docker-Netzwerk. Die App verlangt persönliche Zugänge und verwendet sichere Sitzungscookies. Ohne gültige Benutzerdatei startet der zentrale Modus nicht.

## Noch vor der Veröffentlichung erforderlich

- Ein eigenes Hosting-Konto und ein Linux-Server. Für einen kleinen CPU-basierten Kollegentest mindestens 4 vCPU, 8 GB RAM und 40 GB SSD einplanen; parallele KI-Nutzung kann mehr CPU/RAM oder einen externen Modellanbieter benötigen. Es ist keine GPU erforderlich, Antworten auf CPU sind entsprechend langsamer.
- Eine eigene Domain oder Subdomain, deren A-Eintrag auf die öffentliche IPv4-Adresse zeigt. Nur bei korrekt eingerichteter IPv6 zusätzlich einen AAAA-Eintrag setzen.
- Eine E-Mail-Adresse für Zertifikatsbenachrichtigungen, administrativer Serverzugang und Docker Engine mit Compose-Plugin.
- Firewall: 80/TCP, 443/TCP und optional 443/UDP erreichbar. App-Port 3210 und Ollama-Port 11434 niemals öffentlich freigeben. SSH nur für Administratoren freigeben.

Hosting und Domain sind kostenpflichtig bzw. vom eigenen Vertrag abhängig. Dieses Repository bucht weder einen Server noch eine Domain. Die tatsächliche öffentliche Zertifikatsausstellung kann erst mit gültigem DNS und erreichbarem Server geprüft werden.

## Installation auf dem Server

Docker gemäß der offiziellen Anleitung für das gewählte Betriebssystem installieren: https://docs.docker.com/engine/install/

```bash
git clone https://github.com/vieto1/ExitAI.git
cd ExitAI
mkdir -p .central
chmod 700 .central
cp deploy/server.env.example .central/server.env
```

In `.central/server.env` die echten Werte für `EXITAI_DOMAIN` und `ACME_EMAIL` eintragen. `EXITAI_DOMAIN` enthält nur den Hostnamen, keine URL und keinen Pfad. Zum Beispiel die eigene Subdomain `ai.firma.de`.

Image bauen:

```bash
docker build -t exitai-central:local .
```

Administrator anlegen. Das Passwort wird verdeckt abgefragt, nicht als Argument übergeben und nur als gesalzener Scrypt-Hash gespeichert:

```bash
docker run --rm -it --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$PWD/.central,dst=/config" \
  exitai-central:local node scripts/team-user.mjs admin admin /config/users.json
```

Benutzerdatei und Einstellungen liegen im privaten Verzeichnis `.central`, das weder in Git, Downloadpakete noch Docker-Builds übernommen wird. Die Benutzerdatei ist im Container nur lesbar eingebunden. Sie darf nicht veröffentlicht werden.

Container starten und Modell laden:

```bash
docker compose --env-file .central/server.env -f deploy/compose.yml up -d
docker compose --env-file .central/server.env -f deploy/compose.yml exec ollama ollama pull qwen2.5:3b
```

Anschließend `https://DEINE-DOMAIN/app` öffnen und anmelden. DNS muss bereits auf den Server zeigen, damit Caddy ein öffentlich vertrauenswürdiges Zertifikat ausstellen kann. Die App hat keinen ungeschützten öffentlichen Alternativport.

## Kollegen einladen und Zugänge ändern

Für jeden Kollegen einen eigenen Benutzernamen vergeben, keine gemeinsame Anmeldung:

```bash
docker run --rm -it --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$PWD/.central,dst=/config" \
  exitai-central:local node scripts/team-user.mjs kollege member /config/users.json
docker compose --env-file .central/server.env -f deploy/compose.yml up -d --force-recreate app
```

Für ein bewusstes Passwort-/Rollen-Update als letztes Argument `--replace` ergänzen und den App-Container erneut erstellen. Bestehende Sitzungen mit dem alten Passwort werden dadurch ungültig. Zum Deaktivieren einen Benutzer aus `.central/users.json` entfernen, mindestens einen Administrator beibehalten und den App-Container neu erstellen. Passwörter über einen geeigneten privaten Kanal an Kollegen geben, nicht in öffentliche Issues oder Chatverläufe schreiben.

`member` darf chatten, Dokumente importieren und die Maskierungs-API nutzen. `admin` darf zusätzlich das gemeinsame Audit einsehen. Das Audit enthält im Zentralbetrieb auch den Benutzernamen, aber keine Prompts oder Zuordnungen. Eine Anmeldung gilt maximal acht Stunden; Abmelden widerruft die Sitzung sofort. Nach zehn falschen Anmeldeversuchen pro Benutzer/Verbindung greift eine zeitweise Sperre.

## Datenhaltung und Grenzen

Anbieter und Modell laufen zentral. Dokumente und Verlauf werden weiterhin im jeweiligen Browserprofil gespeichert, getrennt nach Benutzername. Sie werden nicht zu einer serverseitig synchronisierten Wissensbasis. Gemeinsame Browserprofile können die unverschlüsselten lokalen Daten technisch weiterhin lesen; für vertrauliche Nutzung eigene Betriebssystem-/Browserprofile verwenden. Modell-Cloud-Schlüssel sind in dieser Compose-Voreinstellung nicht gesetzt.

Sitzungen und Audit liegen im persistenten Volume `app_data`, Modelle in `model_data`, Zertifikate in den Caddy-Volumes. `docker compose down` erhält diese Daten; **kein `down -v` ausführen**, wenn sie erhalten bleiben sollen. Backups müssen diese Volumes sowie `.central/users.json` und `.central/server.env` privat sichern. Vor einem Datenbankbackup den App-Container stoppen, die Daten kopieren und anschließend wieder starten.

Diese Konfiguration bietet keinen Unternehmens-SSO, keine automatischen Passwort-E-Mails und keine Hochverfügbarkeits-/Mehrserverarchitektur. Auch mit HTTPS gilt die begrenzte Maskierungserkennung der App. Es wird keine Compliance-Zertifizierung zugesagt.

## Prüfung und Diagnose

```bash
docker compose --env-file .central/server.env -f deploy/compose.yml ps
docker compose --env-file .central/server.env -f deploy/compose.yml logs --tail=100 app caddy
```

Die Logs lokal prüfen und vor Weitergabe sensible Werte entfernen. Ohne gültige Domain und Serverzugang lässt sich keine öffentliche HTTPS-Adresse erzeugen.

Die Tests im Repository prüfen Authentifizierung, Session-Persistenz und -Widerruf, Rollen und Herkunftsprüfung. `scripts/verify-https.mjs` prüft ein wirkliches Docker-/Caddy-Setup mit vollständig verifizierter Test-CA unter localhost. Dieser Test ist kein Nachweis einer öffentlich ausgestellten Domain-Zertifikatskette.
