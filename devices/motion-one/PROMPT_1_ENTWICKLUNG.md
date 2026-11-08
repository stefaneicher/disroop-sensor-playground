MASTER-PROMPT 1 VON 2 (ENTWICKLUNG): DISROOP MOTION ONE – EIN SPIELCONTROLLER, KOMPLETT MIT KI ENTWICKELT
Vorbild: Master-Prompt „Vacuum“ von 203x Uplink (Analyse in ANALYSE.md). Angepasst auf unseren Spielcontroller,
auf GitHub Copilot CLI und auf die Arbeitsweise dieses Repos (Docker-only, TDD, direkt auf main).

SO WIRD ER BENUTZT
1. Voraussetzungen: Windows mit WSL (Ubuntu) und Docker, GitHub Copilot CLI, dieses Repo ausgecheckt.
   GUI-Programme (KiCad, FreeCAD, Blender, ein Slicer) nur, wenn der Agent sie nach seiner Inspektion verlangt.
2. Vorab-Smoke-Test laufen lassen: `devices/motion-one/preflight.sh` (siehe PREFLIGHT.md). Er zeigt, welche Programme
   und MCP-Server schon bereit sind und was du noch einrichten musst. Ergebnis landet in devices/motion-one/preflight/.
3. Copilot CLI im Repo-Wurzelordner starten. Projektordner des Geräts: devices/motion-one/.
4. Abschnitt 0 prüfen und bei Bedarf anpassen. Alles andere bleibt, wie es ist.
5. Alles zwischen den beiden KOPIER-Zeilen als EINE Nachricht einfügen.
6. Der Agent inspiziert den Rechner, installiert Fehlendes im Devcontainer und liefert EINE Liste mit Dingen,
   die nur du tun kannst (z. B. MCP-Server freigeben, Konto beim Bestücker anlegen, Bestellung bezahlen).
   Erledigen, dann `weiter` schreiben.

Gut zu wissen
- Ergebnis ist ein FERTIGUNGSREIFES PAKET für einen Prototyp, kein zertifiziertes Produkt.
  Funk-, EMV- und Akku-Zulassungen (CE/RED, FCC, UN38.3) sind nicht Teil davon.
- Der Lauf dauert Stunden und braucht viel Kontingent.
- Geld fliesst nur nach deinem ausdrücklichen OK. Der Agent bereitet die Bestellung bis zum Bezahlen vor.
- Danach folgt PROMPT_2_MARKTAUFTRITT.md (Marketingvideo, Produktseite mit Live-Demo und Kauf/Warteliste).
- Keine API-Keys oder Passwörter in den Chat. Wenn ein Dienst einen Key braucht, legst du ihn selbst in eine Datei
  wie ~/.env (nicht im Repo).

==================== AB HIER KOPIEREN ====================

# Master-Prompt: KI-Entwicklungsabteilung für den Spielcontroller „Disroop Motion One“

Du bist mein ENGINEERING-MANAGER. Diese Copilot-CLI-Hauptsession bleibt mein einziger Ansprechpartner. Entwickle das Gerät aus
Abschnitt 0 bis zu einem FERTIGUNGSREIFEN PROTOTYP-PAKET und setze dafür echte Subagents (Custom Agents) als Spezialisten ein.

Liefere einen durchgängigen Entwicklungsablauf: Anforderungen, Elektronik mit vollständiger elektrischer Analyse (KiCad, ngspice),
Firmware, Gehäuse (parametrisches CAD, Festigkeit, 3D-Druck), Beschaffung und Bestückungsauftrag, Montage- und Bedienungsanleitung
sowie Renderings als Grundlage für den Marktauftritt (Marketingvideo und Produktseite folgen in Prompt 2). Am Ende stehen:
- eine 3D-druckbare Datei (3MF, zusätzlich STL), die ich direkt einem Slicer übergeben kann, plus ein getesteter Slicer-Lauf,
- ein Bestellpaket für die bestückte Leiterplatte (Gerber, Bohrdaten, BOM, Bestückungsliste) beim gewählten Bestücker,
  hochgeladen und bis zum Bezahlen vorbereitet,
- Firmware-Image mit Anleitung zum Programmieren,
- Montageanleitung, Bedienungsanleitung, Renderings und ein technischer Bericht.

Bleib nicht bei einem Plan oder bei Agent-Definitionen stehen: Umgebung aufsetzen, testen, dann das Gerät entwickeln.
Halte nur für nötige Freigaben, Software-Aktionen oder Entscheidungen an.

SPRACHE: Deutsch für die Kommunikation und alle selbst verfassten Inhalte (Schweizer Schreibweise, „ss“ statt „ß“).
Rohausgaben von Tools und externe Quellen bleiben unverändert. Code, Bezeichner und Commit-Betreff dürfen Englisch sein.

EHRLICHKEITSREGEL: Erfinde nie erfolgreiche Tool-Aufrufe, Messwerte, Datenblattwerte, Lagerbestände, Preise, Tests oder
Fertigungsreife. Kennzeichne jede Zahl als QUELLE, BERECHNUNG, SIMULATION, MESSUNG oder ANNAHME. Verwende die Status
PASS, PARTIAL, FAIL, BLOCKED und NOT RUN und mach aus einem FAIL nie einen Erfolg. Alles, was echte Hardware braucht
(Funkreichweite, Laufzeit, Fallversuch, Latenz am Gerät), bleibt NOT RUN, bis es gemessen ist.

## 0. Mein Gerät (von mir ausgefüllt)

- Gerät: „Disroop Motion One“, ein Handcontroller für die Spiele dieses Repos (Tennis, Ski).
  Er ersetzt den Nordic Thingy:52 als Bewegungssensor. Inspiration: Griff und Haptik von PlayStation-Move, Wii-Remote und
  Xbox-Controller, aber als Einhand-Gerät, das man wie einen Schlägergriff hält.
- Kompatibilität (Pflicht): Das Gerät spricht den Teil des Thingy:52-BLE-Profils, den Bridge, Web-Spiele und Android-App nutzen
  (Advertising-Name, Services und Formate laut `docs/protocol.md`, mindestens Motion-Config `EF680401`, Quaternion `EF680404`,
  Raw `EF680406`, Euler `EF680407`, Heading `EF680409`, Taster `EF680302`, LED `EF680301`, Speaker `EF680502`, Akku `180F/2A19`).
  Bestehende Software muss OHNE Codeänderung damit spielen können.
- Sensorik (Vorschlag, die Spezialisten dürfen und sollen ihn erweitern oder verbessern): IMU mit Beschleunigung und
  Gyroskop (6-Achsen), Magnetometer optional. Messbereiche aus den Spielen und aus Messdaten menschlicher Bewegungen
  ableiten (siehe §6), nicht schätzen.
- Akku und Laden: wiederaufladbarer LiPo-Akku mit Schutzschaltung, **Laden über USB-C** auf dem eigenen Board
  (Laderegler, Ladeanzeige, Spielen während des Ladens möglich).
- Bedienung: mindestens ein Haupttaster (Kalibrieren, Aufschlag, Sprung), ein Ein/Aus-Konzept, RGB-LED, Summer oder kleiner
  Lautsprecher für Beeps; Vibrationsmotor (Rumble) als Option.
- Zukaufteile (nicht selbst entwickeln): Akku-Zelle, Vibrationsmotor, Schrauben/Einpressmuttern, ggf. ein vorzertifiziertes
  BLE-Modul. Gehäuse wird selbst gedruckt, Leiterplatte wird bestückt bestellt.
- Fertigung: Gehäuse per FDM-3D-Druck (PLA oder PETG, 0,4-mm-Düse). Leiterplatte inklusive Bestückung bei einem
  Online-Bestücker.
- Mein 3D-Drucker und Slicer: Bambu Lab P2S Combo (geschlossen, Bauraum 256 × 256 × 256 mm, AMS für mehrere Farben,
  0,4-mm-Düse) mit **Bambu Studio** (im Werkzeug-Image: `bambu-studio --slice` mit den Systemprofilen „Bambu Lab P2S 0.4 nozzle“). Damit es auch auf anderen Bambu-Druckern passt, jedes Teil ≤ 180 × 180 × 180 mm halten
  (A1 mini); Mehrfarbigkeit nur als Option, nicht als Voraussetzung. Liefere zusätzlich ein Bambu-Studio-Projekt (.3mf mit
  Platte, Material und Profil).
- Bestücker, Lieferbarkeit und Preis: Evaluiere mehrere Online-Bestücker (z. B. JLCPCB mit LCSC-Teilen, PCBWay,
  Aisler, Eurocircuits) und stelle mir **zwei bis drei Angebote** gegenüber, die alle Anforderungen erfüllen. Je Angebot:
  - Lieferbarkeit: jedes Bauteil beim Bestücker an Lager (Lagerstand mit Datum und Quelle), Ersatzteil je kritischem
    Bauteil, Zukaufteile (Akku, Motor, Schrauben) mit Bezugsquelle in die Schweiz.
  - Preis: Leiterplatte, Bestückung, Bauteile, Einrichtkosten, Versand und Zoll in die Schweiz, Total und Preis pro Gerät.
  - Lieferzeit bis zu mir, Mindestmengen und Einschränkungen (z. B. einseitige Bestückung, Bauteile auf Bestellung).
  - 3D-Druck des Gehäuses (alle druckbaren Teile, Material gemäss Mechanik, z. B. PETG) im selben Angebot mit abklären:
    bevorzugt beim gleichen Hersteller wie die Leiterplatte (z. B. JLCPCB/JLC3DP, PCBWay), damit eine Bestellung und ein
    Versand genügen. Je Angebot: Druckverfahren, Material, Toleranz, Preis, Lieferzeit; sonst Alternative begründen.
  - Empfehlung mit Begründung; ich wähle aus. Bestellt wird nichts ohne meine Freigabe.
- Stückzahl V1: mindestens 2 bestückte Geräte, sinnvoll bis 5. Nur wenn die Mindestbestellung des Bestückers grösser ist
  oder es im Vergleich deutlich günstiger pro Stück wird, bis höchstens 10.
- Projektordner: `devices/motion-one/` in diesem Repo.

Alles in Abschnitt 0 ist eine Startannahme, keine geprüfte Spezifikation.

## 1. Genau eine Manager-Session und fünf Spezialisten

Lege die Spezialisten als Custom Agents an (`.github/agents/<name>.agent.md` bzw. das Format, das die installierte Copilot-CLI-Version
dokumentiert). Keine separaten Chatfenster, keine `copilot -p`-Arbeiterprozesse und kein zweites KI-Framework.

- `systems-engineer`: Anforderungen, Sensorauswahl, Signalkette, Latenz- und Leistungsbudget, Kompatibilität mit `docs/protocol.md`.
- `pcb-engineer`: KiCad-Schaltplan und geroutete Leiterplatte, elektrische Analyse inklusive SPICE, Bauteilwahl mit Lagerprüfung,
  Fertigungsdaten für den Bestücker.
- `firmware-engineer`: Firmware (z. B. Zephyr / nRF Connect SDK oder ein gleichwertiges, frei verfügbares SDK), BLE-Profil,
  IMU-Treiber, Sensorfusion, Energiesparen, Bootloader- bzw. Programmierweg.
- `mechanical-engineer`: parametrisches Gehäuse (CadQuery oder FreeCAD), Ergonomie, Toleranzen für FDM, Festigkeit,
  Slicer-Test, druckbare Exporte.
- `docs-media-engineer`: Renderings und Explosionsansicht (Blender), Montageanleitung, Bedienungsanleitung, Übergabe an Prompt 2.

Du verantwortest Anforderungen, Delegation, Schnittstellen, Integrations-Reviews, Berichte und den Release-Status.
Spezialisten delegieren nicht weiter; fachübergreifende Fragen melden sie dir über ihre Handoff-Datei.

Prüfe zuerst die installierte Copilot-CLI-Version und ihre Dokumentation zu Custom Agents, Skills und MCP.
Jede Agent-Datei enthält die Felder, die diese Version unterstützt (Name, Beschreibung, Werkzeuge), und verbietet das
Starten weiterer Agents. Darunter: Zuständigkeit, erlaubte Schreiborte, Eingaben, Prüfungen, Eskalationskriterien und
Handoff-Format. Schränke Werkzeuge nicht so ein, dass MCP-Tools verloren gehen; teste den Zugriff aus JEDEM Spezialisten,
nicht nur aus deiner Session. Jeder Spezialist muss wirklich aufgerufen werden, beschreibende Absätze zählen nicht.

Brauchen neue Agents oder MCP-Server einen Neustart, sichere den Stand in `devices/motion-one/management/RESUME.md`
und nenne mir die genaue Aktion (z. B. `copilot --continue`). Tu nicht so, als wären sie schon aktiv, und starte keinen
zweiten Manager.

## 2. Arbeitsbereich und Repo-Regeln

Lies zuerst `README.md`, `RESUME.md`, `docs/protocol.md`, `docs/TENNIS.md`, `docs/SKI.md` und `ENGINEERING.md`.
Halte dich an die Regeln dieses Repos:
- Alles läuft in Containern, lokal wird nichts installiert. Software (Bridge, Web, App) im Devcontainer-Image
  (`.devcontainer/`, `./project …`). Hardware-Werkzeuge im Werkzeug-Image `disroop-motion-one-tools`
  (`devices/motion-one/docker/`, `./project hw image|smoke|sh|run`): KiCad 10 (`kicad-cli`), FreeCAD 1.1 (`freecadcmd`),
  Blender 5.2 (`blender -b`), Bambu Studio mit den P2S-Systemprofilen (`bambu-studio --slice`), ngspice, pandoc + xelatex,
  ffmpeg, trimesh. `devices/motion-one/docker/smoke.sh` zeigt eine funktionierende Aufrufzeile je Werkzeug. Fehlt etwas
  (z. B. Firmware-Toolchain, Gmsh/CalculiX, CadQuery), erweitere dieses Image bzw. lege ein weiteres an und ergänze den
  Smoke-Test.
- Best Practices in jeder Disziplin, nicht nur im Code. Jede Disziplin hat eine kurze, prüfbare Checkliste (in
  `requirements/`) und einen Smoke-Test bzw. Review, bevor ihr Ergebnis weitergegeben wird:
  - Code und Firmware: TDD, Clean Code, Smoke-Tests.
  - Schema: ERC sauber, Datenblatt-Referenzschaltungen, Schutz (ESD, Verpolung, Akku), Testpunkte.
  - Leiterplatte: DRC sauber, Herstellerregeln des gewählten Bestückers (DFM), Antennen-Freiraum, Wärme, Bestückungsseite.
  - Bauteilanalyse: Datenblattwerte belegt, Toleranzen und Derating, Lieferbarkeit und Alternativen.
  - 3D-Druck: druckbar ohne oder mit wenig Stützmaterial, Wandstärken, Toleranzen für Passungen, getesteter Slice-Lauf.
  - Ergonomie: Griff, Gewicht und Schwerpunkt, Daumenerreichbarkeit, keine scharfen Kanten, Links- und Rechtshänder.
  - Erscheinung: ansprechendes, stimmiges Design in Disroop-Farben (`bridge/web/static/styles.css`), saubere Oberflächen,
    Renderings, die den Anspruch zeigen.
  - Dokumentation und Marketing: richtig, verständlich, konsistent mit dem gebauten Stand; keine Behauptung ohne Beleg.
- Nach jedem sinnvollen Schritt `JOURNAL.md`, `PROGRESS.md`, `RESUME.md` nachführen, direkt auf `main` committen und pushen.
  Commit-Trailer: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

Wenn `devices/motion-one/` schon Inhalte hat, weiterverwenden: nichts löschen, keine Konkurrenzkopie, keine spätere Revision
zurücksetzen. Struktur ungefähr so:

devices/motion-one/
  management/  requirements/  electronics/ (kicad/, spice/, analysis/)  firmware/  mechanics/ (cad/, fem/, print/)
  sourcing/  manufacturing/ (pcba/, print/)  docs/ (assembly/, user/, report/)  media/ (renders/, video/)
  scripts/  logs/  releases/  changes/

Lege mindestens an: `management/PROJECT_STATE.md`, `TASK_BOARD.md`, `REQUIREMENTS.md`, `INTERFACES.json`, `TOOLCHAIN.md`,
`SOURCES.md`, `PATHS.md`, `EXECUTION_METRICS.md` und einen Ordner `handoffs/`.

Eine einzige Quelle der Wahrheit: Die editierbaren Dateien liegen im Repo. Was zwischen Windows und WSL oder in einen Container
wandert, wird mit Revisions-ID und SHA-256 übertragen.

## 3. Software und MCP-Verbindungen herstellen

Finde durch Inspektion heraus, nicht durch Fragen: Betriebssystem, CPU, RAM, freier Speicher, GPU; Docker-Status; vorhandene
Images; Werkzeug-Image `disroop-motion-one-tools` (`./project hw smoke`: KiCad, FreeCAD, Blender, Bambu Studio, ngspice, pandoc,
xelatex, ffmpeg), was darin noch fehlt (Gmsh/CalculiX, CadQuery), Firmware-Toolchain (Zephyr SDK / nRF Connect SDK,
`west`, `nrfutil`), Python, Git, Pandoc und LaTeX; bestehende MCP-Konfigurationen und belegte Ports.

Regeln:
- Vorhandenes wiederverwenden. Freie, geprüfte Abhängigkeiten im passenden Image installieren (siehe §2), nie auf dem Host.
- FRAGEN vor Administrator- oder systemweiten Änderungen, vor dem Ersetzen funktionierender Software, vor kostenpflichtigen
  Diensten und vor Änderungen an Sicherheits- oder Netzwerkeinstellungen.
- Keine pauschalen Freigaben (`--allow-all`, `--yolo`) und kein Umgehen von Sicherheitswarnungen.
- Geheimnisse bleiben aus Logs, Chat und Versionskontrolle.
- Brücken bleiben lokal; keine unauthentifizierten Ports nach aussen.
- MCP-Konfiguration auf Projektebene bevorzugen. Ein Server pro GUI-Anwendung, gemeinsam für alle Agents.
  Gibt es keinen getesteten MCP-Server, ist die Kommandozeile (`kicad-cli`, `freecadcmd`, `blender -b`, Slicer-CLI) zulässig;
  benenne das ehrlich. Ein Shell-Skript ist keine MCP-Integration.
- Bauteil- und Lagerabfragen über öffentliche Seiten oder offizielle APIs des Bestückers bzw. Distributors. Keine Logins mit
  meinen Zugangsdaten durch dich.
- Kann eine Verbindung nicht hergestellt werden: konkreten Blocker nennen und eine klar gekennzeichnete Alternative vorschlagen.

Nach der Inspektion gibst du mir EINE zusammengefasste Liste der Aktionen, die nur ich ausführen kann. Pro Punkt: Anwendung,
genaue Aktion, und wie man prüft, dass es geklappt hat. Stell keine Fragen, die ein Befehl beantworten kann.
Während du wartest, ruht nur die betroffene Arbeit.

MCP-Server: Lies zuerst `devices/motion-one/preflight/PREFLIGHT_RESULT.md` (Ergebnis des Vorab-Smoke-Tests). Gleiche dann
mit mir ab, in EINER Frage mit Tabelle: welche MCP-Server schon eingerichtet und freigegeben sind, welche noch fehlen und
welche du durch die Kommandozeile ersetzen willst. Ausgangsliste (Stand und Paketnamen selbst prüfen, Quelle notieren):

| Zweck | Kandidat | Pflicht? | Ersatz ohne MCP |
|---|---|---|---|
| Repo, Issues, CI | GitHub MCP (in Copilot CLI eingebaut) | ja | `gh` |
| Elektronik | ein KiCad-MCP-Server (Community, z. B. für KiCad 9/10) | nein | `kicad-cli`, KiCad-Python-API |
| Mechanik | FreeCAD-MCP (Community) | nein | `freecadcmd`, CadQuery |
| Renderings | Blender-MCP (Community, Add-on + Server) | nein | `blender -b --python` |
| Browser, Bauteil-Recherche, Bestellseiten | Playwright MCP (Microsoft) | ja | keiner (Lagerabfragen brauchen echte Seiten/APIs) |
| Bauteile/Lager | JLCPCB/LCSC-Teilesuche (offizielle API oder Community-MCP) | nein | Playwright auf den öffentlichen Seiten |
| Dokumentation | Microsoft Learn / Context7 o. ä. für aktuelle API-Doku | nein | Webabruf |

Ein MCP-Server gilt erst als bereit, wenn ein echter Tool-Aufruf aus JEDEM Spezialisten, der ihn braucht, geklappt hat.

## 4. Skills

Lege lokale Projekt-Skills an (`.github/skills/<name>/SKILL.md` oder das Format der installierten Version) und weise sie den Agents zu:
- `engineering-evidence` (für alle): Anforderungen, Revisionen, Labels, Prüfsummen, Locks, Handoffs.
- `kicad-pcb-workflow`: Schaltplan, Layout, ERC/DRC, Fertigungsexporte, BOM/CPL im Format des Bestückers.
- `electrical-analysis`: Leistungsbudget, Ladeschaltung, Thermik, SPICE mit ngspice, Toleranzen, Ergebnisdarstellung.
- `sourcing-availability`: Lagerabfrage mit Datum, Mindestbestand, Alternativteile, Basic-/Extended-Teile, Kostenrechnung.
- `firmware-ble-workflow`: Build im Container, Unit-Tests, GATT-Profil gegen `docs/protocol.md`, Programmierweg.
- `cad-print-workflow`: parametrisches CAD, Toleranzen für FDM, Slicer-CLI, 3MF/STL-Export, Druckzeit und Material.
- `blender-media-workflow`: Import echter Geometrie, Renderings, Explosionsansicht, Animation, Video mit ffmpeg.
- `docs-reporting`: Montageanleitung, Bedienungsanleitung, technischer Bericht (Markdown → PDF mit Pandoc/LaTeX).

Prüfe zuerst offizielle bzw. bestehende Skills (z. B. https://github.com/anthropics/skills, GitHub-Dokumentation zu Copilot-Skills),
beachte Lizenzen und dokumentiere die Herkunft. Wo nichts passt, schreibe ein kurzes Verfahren aus Primärdokumentation mit
getestetem Beispiel und kennzeichne es als lokal verfasst. Ergänze die Skills mit dem, was die Agents lernen.

## 5. Pflicht-Smoke-Tests (vor jeder Produktarbeit)

Jeder Spezialist testet seine eigene Route und sichert Belege:
1. Elektronik: kleinen Schaltplan (LDO + LED) und Platine anlegen, speichern, wieder öffnen, ERC und DRC laufen lassen,
   Gerber/Bohrdaten exportieren und mit einem Gerber-Viewer oder Rendering prüfen. SPICE: einen Spannungsteiler und einen
   RC-Tiefpass mit ngspice rechnen und mit der Handformel vergleichen (Abweichung < 1 %).
2. Beschaffung: ein bekanntes Standardteil (z. B. 100-nF-0402-Kondensator) beim Bestücker abfragen und Bestand, Preis und Datum
   mit Quelle festhalten. Eine Lagerangabe ohne echte Abfrage ist kein PASS.
3. Firmware: ein Beispiel (Blinky oder BLE-Peripheral) für das gewählte Ziel im Container bauen; ein Unit-Test für die Kodierung
   eines Raw-Frames `EF680406` gegen Testvektoren, die du aus `docs/protocol.md` und `bridge/internal/thingy/` ableitest.
4. Mechanik: einen Testkörper (z. B. 20-mm-Würfel mit Bohrung) parametrisch erzeugen, ändern, speichern, wieder öffnen,
   als 3MF und STL exportieren, mit der Slicer-CLI slicen und Druckzeit, Material und Schichtzahl aus dem G-Code lesen.
   FEM: einen eingespannten Balken mit Endlast rechnen und mit der Balkenformel vergleichen; Reaktionskräfte müssen die Last
   ausgleichen.
5. Media: ein Teil bekannter Grösse in Blender importieren, Einheiten prüfen, ein Bild rendern und mit ffmpeg ein 2-s-Video
   erzeugen; Bild und Video öffnen bzw. Frames prüfen.
6. Manager: eine Seite mit Pandoc/LaTeX zu PDF bauen.

Status jeweils PASS, PARTIAL oder BLOCKED mit Agent, Tool, Befehl oder Tool-Aufruf, Version und Ausgabepfad. Ein
Konfigurationseintrag, ein Mock-Ergebnis oder ein bloss gestarteter Prozess ist kein PASS. Exit-Code 0 allein ist kein PASS:
öffne das Ergebnis. Erkläre den Ablauf erst für einsatzbereit, wenn keine Route mehr ungetestet oder blockiert ist.

## 6. Anforderungen V1: aus den Spielen abgeleitet

Bevor du optimierst, schreibe Anforderungen mit IDs und Verifikationsmethode. Leite die Zahlen aus dem Repo ab und zitiere
die Stelle (QUELLE), statt zu schätzen. Bekannte Startwerte:
- Bewegungsrate: Spiele nutzen 100 Hz, Minimum 50 Hz (`docs/TENNIS.md`). Ziel: 100 Hz stabil über BLE, intern höhere ODR.
- Gyroskop: Das Spiel erkennt einen Schlag ab ~350 °/s, die heutige Tempo-Skala endet bei ~1200 °/s (`docs/TENNIS.md`).
  Das ist NICHT die Auslegungsgrenze. Lege den Messbereich aus einer Analyse realer menschlicher Winkelgeschwindigkeiten
  aus: Recherchiere Messwerte (Handgelenk und Unterarm bei Tennis-Aufschlag und Vorhand, schnelle Ski- bzw. Gesten-
  bewegungen) aus Studien oder Sensordaten, zitiere die Quellen, und nimm die Spitzenwerte plus Reserve. Diese Werte liegen
  oft deutlich über 2000 °/s; wähle die IMU so, dass sie nicht übersteuert (z. B. ±4000 °/s), und begründe die Wahl
  gegen Auflösung und Rauschen.
  Achtung: das Thingy-Rohformat (i16 `/32`) begrenzt auf ±1024 °/s. Liefere das kompatible Format UND einen
  dokumentierten erweiterten Kanal ohne diese Grenze; die Erweiterung der Bridge ist ein separater Change.
- Beschleunigung: Ski-Sprung bei Ruck > 2,1 g (`docs/SKI.md`); Schläge erzeugen deutlich mehr. Bereich ebenfalls aus
  recherchierten Messwerten ableiten (Startwert mindestens ±16 g; prüfe, ob ±32 g nötig ist).
- Lage: Lenken über Roll mit 3° Totzone, voller Einschlag bei ~32° (`docs/SKI.md`). Rauschen und Drift der Orientierung
  müssen deutlich unter der Totzone liegen; Sensorfusion (Quaternion) im Gerät.
- Latenz: heute ≈ 30–60 ms BLE (`docs/TENNIS.md`). Ziel: Latenz im Gerät (Sensor → Notification) < 10 ms; Budget bis zum
  Bildschirm aufschlüsseln.
- BLE-Durchsatz: Bekannter Abbruch bei zu vielen 100-Hz-Strömen unter Windows (`JOURNAL.md`, 2026-11-07). Das Gerät muss
  Spielmodus (nur Quaternion + Raw) mit 100 Hz stabil liefern; Verbindungsintervall und MTU begründen.
- Akku und Laden: Laufzeit im Spielmodus ≥ 6 h (Ziel, aus Leistungsbudget belegen), Laden über USB-C mit 5 V, Ladestrom
  passend zur Zelle (≤ 1 C), Ladezeit, Verhalten bei Tiefentladung, Laden während des Spielens.
- Ergonomie und Masse: Einhandbetrieb, Masse ≤ 120 g (ANNAHME, begründen), Taster mit dem Daumen erreichbar, keine scharfen Kanten.
- Robustheit: Fall aus 1 m auf Holz darf Board und Akku nicht lösen (Abschätzung per FEM bzw. Konstruktion, Test NOT RUN bis Hardware).
- Sicherheit: Akku mechanisch fixiert, nicht durchstechbar durch Schrauben, Temperaturüberwachung beim Laden (NTC),
  Verpolschutz, ESD-Schutz am USB-C.
- Wartung: Akku tauschbar mit Standardwerkzeug; Programmieranschluss bei geöffnetem Gehäuse erreichbar.

Baue kein späteres Upgrade vor. Eine spätere Änderung soll echte Ingenieursarbeit bleiben.

## 7. Auftrag: systems-engineer

Wähle die Systemarchitektur und begründe sie mit mindestens DREI Varianten in einer Tabelle, z. B.:
(a) nRF52-SoC direkt auf der Platine, (b) vorzertifiziertes BLE-Modul, (c) fertiges Entwicklungsmodul mit IMU als Unterbaugruppe.
Bewerte Lieferbarkeit beim Bestücker, Kosten bei 5 Stück, Funkzulassung, Antennenrisiko, Bestückbarkeit, Programmierweg und
Firmware-Aufwand. Wähle dann genau eine.

Vergleiche mindestens drei IMUs (Datenblatt-Werte als QUELLE): Messbereiche, Rauschdichte, ODR, FIFO, Stromaufnahme,
Gehäuse, Lagerbestand. Prüfe die Anforderungen aus §6 rechnerisch: Quantisierung, Rauschen bei 100 Hz, Drift über 60 s.

Erstelle das Latenzbudget (Sensor, Filter, BLE-Intervall, Funk, Bridge, Browser, Bildschirm) und das Leistungsbudget
(alle Verbraucher, Betriebsarten, Tastverhältnisse) mit Laufzeitberechnung. Pflege `INTERFACES.json`
(BLE-Profil, Steckverbinder, Board-Umriss, Bohrungen, Bauhöhen, Taster- und LED-Positionen).

## 8. Auftrag: pcb-engineer

Erstelle ein echtes KiCad-Projekt mit Schaltplan und gerouteter Platine, kein platinenförmiges Objekt:
USB-C-Buchse (CC-Widerstände, ESD-Schutz), Laderegler mit NTC und Ladeanzeige, Akku-Schutz bzw. geschützte Zelle,
Power-Path (Spielen beim Laden), Spannungsregler, Ein/Aus-Konzept mit minimalem Ruhestrom, MCU/Modul mit Antenne nach
Herstellervorgabe, IMU, Taster, RGB-LED, Summer- bzw. Lautsprechertreiber, optional Motortreiber mit Freilaufdiode,
Batteriespannungsmessung, Programmier- und Testpunkte.

Elektrische Analyse (Pflicht, jede Zahl gekennzeichnet):
- Leistungsbudget je Betriebsart und Laufzeit; Ruhestrom im Aus-Zustand und Lagerfähigkeit.
- Laderegler: Ladestrom, Verlustleistung und Erwärmung, Verhalten mit und ohne Last.
- Regler: Dropout über den ganzen Akkuspannungsbereich (z. B. 3,0–4,2 V), Verlustleistung, Stabilität mit den gewählten
  Kondensatoren (DC-Bias berücksichtigen).
- SPICE (ngspice): Power-Path beim Einstecken und Ausstecken, Einschaltstrom, Motor- bzw. Summer-Schaltvorgang mit
  Spannungseinbruch, Batteriemessteiler (Fehler und Ruhestrom).
- Leiterbahnbreiten, Strombelastbarkeit, Steckverbinder- und Schutzgrenzen.
- Digitale Schnittstellen: Bus-Timing, Pull-ups, Interrupt-Leitungen zur IMU.
- Antenne: Keepout, Massefläche, Abstand zu Akku und Motor nach Herstellerdokument. Ohne Messung kein Reichweitenversprechen.
- Toleranzanalyse für kritische Teiler und Schwellen.
Wo ein Wert unbekannt ist, rechne einen Bereich und leite eine Entwurfsregel ab.

Bauteile und Beschaffung:
- Nur Bauteile mit passendem Symbol, Footprint und Datenblatt-Link. Bevorzuge Teile, die der Bestücker selbst führt
  (bei JLCPCB: Basic Parts vor Extended Parts).
- Lieferbarkeit: Für jede Position Bestand, Preis, Teilenummer, Abfragezeitpunkt und Quelle festhalten. Mindestbestand
  ≥ 10 × Bedarf. Für jedes kritische Teil ein geprüftes Alternativteil.
- Angebotsvergleich nach §0: zwei bis drei Bestücker, die alles erfüllen, für die gewählte Stückzahl (2 bis 5, höchstens 10)
  inkl. Einrichtungskosten, Versand und Zoll in die Schweiz (Angebot oder Rechner des Bestückers als QUELLE). Die Design-
  Regeln des empfohlenen Bestückers gelten für ERC/DRC; Abweichungen bei den anderen Kandidaten benennen.

Stimme Board-Umriss, Bohrungen, Bauhöhen, Steckerposition, Taster- und LED-Positionen mit Mechanik ab. ERC und DRC mit den
Design-Regeln des Bestückers laufen lassen und jede Ausnahme begründen. Bestanden-DRC ist kein Hardwaretest.

Fertigungspaket: Gerber und Bohrdaten als ZIP, BOM und Bestückungsliste (CPL) im Format des Bestückers, Rotationskorrekturen
geprüft, 3D-Rendering der bestückten Platine. Lade das Paket beim Bestücker hoch bzw. erzeuge es so, dass ich es in einem Schritt
hochladen kann, und halte DFM-Rückmeldung und Angebot fest. BESTELLEN UND BEZAHLEN NUR NACH MEINEM AUSDRÜCKLICHEN OK.

## 9. Auftrag: firmware-engineer

Baue die Firmware im Container, testgetrieben:
- BLE-Profil kompatibel zu `docs/protocol.md` (Advertising, Services, Characteristics, Formate, Motion-Config inkl.
  `motion_freq_hz`), plus der dokumentierte erweiterte Kanal aus §6.
- IMU-Treiber mit FIFO, Sensorfusion zu Quaternion und Euler, Kalibrierung (Gyro-Bias), Taster-Ereignisse,
  LED-Befehle, Summer/Speaker im Frequenzmodus, Akkustand.
- Energiesparen: Schlaf bei Ruhe, Aufwachen per Bewegung oder Taster.
- Programmierweg: SWD-Pads plus günstiger Debugger oder ein Bootloader über USB/BLE. Halte fest, welches Werkzeug ich dafür
  kaufen muss. Ich habe derzeit keine SWD-Probe.
- Kompatibilitätsnachweis ohne Hardware: Die Kodierer der Firmware werden auf dem Host gegen dieselben Testvektoren getestet,
  die die Bridge dekodiert (`bridge/internal/thingy/`). Integration mit echter Hardware bleibt NOT RUN bis zum Board.
Nichts flashen und nichts unter Spannung setzen ohne meine Anweisung.

## 10. Auftrag: mechanical-engineer

Baue ein parametrisches Gehäuse (CadQuery oder FreeCAD), passend zur freigegebenen Board- und Akku-Revision:
geteilte Schale mit Schnappern oder Schrauben in Einpressmuttern, Griffform nach Vorbild Move/Wii/Xbox, Daumentaster,
Lichtleiter für die LED, USB-C-Öffnung, Schallöffnung für den Summer, Halterung für den Vibrationsmotor, Akkufach mit Fixierung.

- Untersuche DREI Varianten des tragenden Teils (z. B. glatte Schale, verrippt, verrippt mit Aussparungen) mit gleichem
  Material, gleichen Schnittstellen und Lastfällen. Vergleiche Masse, Spannung, Verformung und Druckzeit.
- Lastfälle aus dokumentierten Annahmen: Griffkraft, Fall aus 1 m (vereinfachte statische Ersatzlast, als solche kennzeichnen),
  Schnapper-Montage. Mindestens drei Netzstufen für die gewählte Variante, Spannungssingularitäten ausdrücklich behandeln.
- FDM-Regeln: Mindestwandstärken, Überhänge ≤ 45° oder Stützen begründen, Druckorientierung, Spiel für Passungen
  (an einem gedruckten Toleranz-Testkörper als Vorschlag für mich), Gewinde nur über Einpressmuttern.
- Kollisionsprüfung mit Board (inkl. Bauteilhöhen aus KiCad-3D), Akku, Motor und Kabeln.
- Exporte: je Teil 3MF und STL in Druckorientierung, ein Slicer-Projekt bzw. Profil, und ein echter Slicer-Lauf mit
  Druckzeit, Material und Hinweisen. Das ist die Datei, die ich direkt slicen bzw. drucken kann.

## 11. Auftrag: docs-media-engineer

Importiere die freigegebene CAD- und Board-Geometrie in Blender; kein Nachbau. Teile-IDs, Revisionen, Masse und Positionen bleiben.
- Produktansichten, beschriftete Explosionsansicht, nummerierte Montageschritte.
- Montageanleitung: Bestellung und Wareneingang (Platine, Zukaufteile, Werkzeug), Gehäuse drucken (Slicer-Einstellungen),
  Einpressmuttern setzen, Akku anschliessen, Board einsetzen, Firmware programmieren, Funktionsprüfung, Schliessen.
  Keine erfundenen Anzugsmomente; fehlende Werte als offen markieren.
- Bedienungsanleitung für Spieler: Laden über USB-C, Ein/Aus, Koppeln mit Bridge und Android-App, Kalibrieren, Tennis und Ski
  spielen, LED-Bedeutungen, Akku-Sicherheit, Fehlerbehebung.
- Übergabe an Prompt 2: Blender-Szene mit Material- und Kameraeinstellungen, Renderings in hoher Auflösung (mindestens 3840 px
  Breite, transparenter Hintergrund) und eine Liste belegter Produktaussagen mit Status aus `management/metrics.json`
  in `media/HANDOFF_MARKETING.md`. Das Marketingvideo entsteht erst in Prompt 2.
Prüfe Bewegungs- und Werkzeugzugänglichkeit. Die Animation ist kein Montagetest.

## 12. Koordination und Handoffs

- Erst Schnittstellen vereinbaren, dann parallel arbeiten, wo Toolzugriff und Dateibesitz klar sind.
- EIN SCHREIBER PRO DATEI: Nur ein Agent bearbeitet eine Anwendungsdatei gleichzeitig. Locks in `management/locks/`.
- Jeder Auftrag nennt Ziel, Eingangsrevisionen, absolute Pfade, Abnahmekriterien, Ressourcengrenzen und das Handoff-Format.
  Agents sehen dieses Gespräch nicht; beim Wiederaufnehmen lesen sie ihren letzten Handoff.
- Schwere Läufe (FEM, Renderings, Firmware-Builds) nach der gemessenen Hardware planen, nicht alle gleichzeitig.
- Jeder Handoff in `management/handoffs/<agent>/` enthält: Status, bearbeitete Anforderungen, Eingangsrevisionen,
  Ausgabedateien, tatsächlich durchgeführte Prüfungen, Zahlen, Annahmen, Fehler, offene Entscheide, nächste Schritte.
- Mindestens eine echte fachübergreifende Iteration: z. B. Mechanik verlangt über dich eine Änderung am Board-Umriss oder an
  der Steckerposition, Elektronik liefert eine neue Revision, Mechanik prüft erneut.
- Berichte der Spezialisten sind Review-Eingaben, keine Freigaben. Öffne Stichproben und Rohdaten selbst.
- Nach drei erfolglosen Reparaturversuchen ohne neue Information: Diagnose sichern, Ansatz wechseln oder Blocker melden.
- Melde dich bei Meilensteinen und echten Problemen, nicht nach jedem Tool-Aufruf.

## 13. Bericht und unveränderliche Baseline

Schreibe einen technischen Bericht auf Deutsch (Quelle und PDF): Anforderungen, Architekturvarianten, IMU-Vergleich,
Latenz- und Leistungsbudget, elektrische Analyse inkl. SPICE, Beschaffung und Kosten, Gehäusevarianten und Festigkeit,
Druckparameter, Firmware und Kompatibilität, Montage, Entscheide, Grenzen und ein Plan für die physische Validierung
(Messungen am ersten Board: Ruhestrom, Laufzeit, Ladekurve, Temperatur beim Laden, Latenz, Reichweite, Fallversuch).
Jede Zahl stammt aus einer genannten Quelle, einer reproduzierbaren Rechnung oder einer Ergebnisdatei; führe sie in
`management/metrics.json` mit Einheit, Revision und Belegpfad.

Halte in `management/EXECUTION_METRICS.md` Modell-IDs, Einstellungen, Laufzeiten, Tool-Versionen und Wiederholungen fest;
nicht verfügbare Daten als nicht verfügbar markieren.

Veröffentliche `releases/V1_BASELINE/` mit:
- `print/`: 3MF und STL je Teil, Slicer-Profil, Beispiel-G-Code mit Druckzeit,
- `pcba/`: Gerber-ZIP, BOM, CPL, Lagernachweis mit Datum, Angebot,
- `firmware/`: Image, Prüfsumme, Programmieranleitung,
- `docs/`: Montageanleitung, Bedienungsanleitung, Bericht (PDF),
- `media/`: Renderings, Explosionsansicht, `HANDOFF_MARKETING.md`,
- ein SHA-256-Manifest und den Verifikationsstatus jeder Anforderung.
Releases sind unveränderlich; spätere Arbeit bekommt eine neue Revision. Unfertiges bleibt PARTIAL, FAIL oder BLOCKED.
Schreibe zusätzlich `REPRODUCE.md` und ein kurzes `DEMO_RUNBOOK.md`. Verlinke das Gerät im Haupt-`README.md`.

## 14. Änderungsprozess vorbereiten, nicht ausführen

Lege einen Manager-Skill `engineering-change` an. Er läuft nur auf meine ausdrückliche Aufforderung
(`/engineering-change <Beschreibung>` oder eine klare Änderungsanfrage im Chat), bleibt in dieser Manager-Session und nutzt
dieselben Spezialisten. Dokumentiere den Auslöser in `management/CHANGE_REQUEST_USAGE.md` mit neutralem Platzhalter.
Ablauf: Baseline sichern, nummerierten Change-Request eröffnen, betroffene Anforderungen und Teile bewerten, delegieren,
alt und neu vergleichen, Dokumente aktualisieren, neues Release veröffentlichen. Beispiele in der Doku sind keine Freigabe.

## 15. Jetzt starten

Beginne mit der Inspektion von Repo und Umgebung und dem Aufsetzen der Spezialisten. Dann die Smoke-Tests, dann V1.
Frag nur, was nötig ist. Schliesse mit der dokumentierten V1-Baseline und einer Zusammenfassung: Artefakte,
Verifikationsergebnisse, echte Blocker, offene Risiken, gemessener Aufwand und die genauen nächsten Schritte für mich
(Bestellung freigeben, drucken, programmieren, zusammenbauen) und der Hinweis, dass jetzt PROMPT_2_MARKTAUFTRITT.md folgen kann.

Das Ergebnis ist ein nachvollziehbares Entwicklungsprojekt mit Fertigungsdaten für einen Prototyp, keine Behauptung
von Produktionsreife, Zulassung oder physischer Sicherheit.

==================== BIS HIER KOPIEREN ====================
