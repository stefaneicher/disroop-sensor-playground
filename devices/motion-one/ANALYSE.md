# Analyse: Master-Prompt „Vacuum“ (203x Uplink)

Quelle: [Master_Prompt_Vacuum.txt](https://github.com/203xUplink/youtube_share/blob/main/Master_Prompt_Vacuum.txt), Video [„Will AI Replace Engineers? I Ran the Experiment“](https://www.youtube.com/watch?v=K5gXc6kDgsE).
Der Prompt lässt eine KI einen Akku-Handstaubsauger als **digitalen Demonstrator** entwickeln: CAD und FEM (FreeCAD/CalculiX), Strömung (OpenFOAM), Elektronik (KiCad), Visualisierung und Handbuch (Blender), Bericht (LaTeX).

## 1. Aufbau des Prompts

| Teil | Inhalt | Zweck |
|---|---|---|
| Kopf „How to use“ | Voraussetzungen, 5 Schritte, Warnungen | Der Mensch weiss, was er vorbereiten muss und was es kostet |
| Kopierbereich | `COPY FROM HERE … COPY UNTIL HERE` | Genau eine Nachricht, keine Missverständnisse |
| Rolle | Manager-Session plus echte Subagents | Ein Ansprechpartner, klare Verantwortung |
| Sprache, Ehrlichkeit | Labels SOURCE / CALCULATION / SIMULATION / MEASUREMENT / ASSUMPTION; Status PASS / PARTIAL / FAIL / BLOCKED / NOT RUN | Keine erfundenen Ergebnisse |
| §0 Ausfüllen | Produkt, Zukaufteile, Ziele, Ordner | Einziger variabler Teil, alles andere wiederverwendbar |
| §1 Agents | 4 Spezialisten, `disallowedTools: [Agent]`, MCP-Zugriff je Agent prüfen | Keine Rollenspiele, keine Delegationsketten |
| §2 Workspace | feste Ordner, `management/`-Dokumente | Nachvollziehbarkeit, Wiederaufnahme |
| §3 Toolchain | Selbst inspizieren, lokal installieren, Admin-Aktionen erfragen, MCP pro GUI-App | Sicherheit und Ehrlichkeit bei Tools |
| §4 Skills | gemeinsamer Evidence-Skill plus einer je Disziplin | Gelerntes bleibt erhalten |
| §5 Smoke-Tests | Je Route ein echter Test gegen einen Lehrbuchwert | Erst Werkzeug beweisen, dann Produkt |
| §6 V1 | Requirements mit IDs und Verifikationsmethode | Messbar statt Prosa |
| §7–10 Aufträge | Je Disziplin konkrete Pflichten und Verbote | Tiefe statt Oberfläche |
| §11 Koordination | Ein Schreiber pro Datei, Locks, Handoffs, 3-Versuche-Regel | Parallel arbeiten ohne Chaos |
| §12 Release | LaTeX-Bericht, `metrics.json`, SHA-256-Manifest, unveränderliche Baseline | Belegbares Ergebnis |
| §13 Change-Prozess | Vorbereitet, nur auf Befehl | Zweite Demo-Runde („Engineering Change“) |
| §14 Start | Reihenfolge Inspektion → Agents → Smoke → V1 | Kein Stehenbleiben beim Plan |

## 2. Was gut ist (und warum es wirkt)

1. **Ein variabler Abschnitt (§0).** Der Rest ist ein Prozess, kein Produkttext. Dadurch ist der Prompt ein wiederverwendbares Werkzeug.
2. **Ehrlichkeitsregel mit festen Wörtern.** Jede Zahl hat eine Herkunft, jeder Schritt einen Status. „Exit-Code 0 ist kein PASS, öffne das Ergebnis.“ Das ist der wichtigste Schutz gegen halluzinierte Erfolge.
3. **Smoke-Tests gegen bekannte Lösungen.** FEM gegen die Balkenformel, Reaktionskräfte im Gleichgewicht, CFD-Massenbilanz. Das Werkzeug wird kalibriert, bevor man ihm glaubt.
4. **Echte Subagents statt Rollenspiel.** „Role-play paragraphs do not count.“ Jeder Spezialist muss wirklich aufgerufen werden, und sein Toolzugang (MCP) wird aus seiner Sicht geprüft.
5. **Eine einzige Liste für den Menschen.** Der Agent findet alles selbst heraus und fragt nur, was kein Befehl beantworten kann. Wartet er, ruht nur die betroffene Arbeit.
6. **Varianten und Konvergenz.** Drei Geometrievarianten, drei Netzstufen, Sensitivität auf die eigenen Annahmen, Nachbarstruktur einmal mitmodellieren. Das ist echte Ingenieursarbeit, nicht ein einziges schönes Bild.
7. **Interdisziplinäre Schleife.** CFD fordert über den Manager eine CAD-Änderung an und rechnet neu. Das zeigt Zusammenarbeit, nicht nur Parallelität.
8. **Klare Verbote.** Nicht bestellen, nicht flashen, keine Anzugsmomente erfinden, Animation ist keine Montageprüfung.
9. **Unveränderliche Baseline plus vorbereiteter Change.** Damit kann man in einer zweiten Demo zeigen, wie eine Änderung sauber durchläuft.
10. **Betriebsregeln für lange Läufe.** `RESUME.md`, Neustart-Anweisungen, Schwergewichte nach Hardware planen, Abbruch nach drei Versuchen ohne neue Information.

## 3. Schwächen und Lücken (für unser Gerät relevant)

| Punkt | Problem | Unsere Lösung |
|---|---|---|
| An Claude Code gebunden | `.claude/agents`, Frontmatter-Felder | Für GitHub Copilot CLI formulieren (`.github/agents/`, `.github/skills/`), Begriffe neutral halten |
| „Installiere lokal“ | Widerspricht unserer Docker-only-Regel | Alles im Devcontainer-Image; GUI-Apps nur, wo es nicht anders geht, und dann ausgewiesen |
| Keine Beschaffbarkeit | Bauteile werden nur „plausibel“ gewählt | Lagerbestand per echter Abfrage (LCSC/JLCPCB) mit Datum, Mindestbestand, Alternativteil |
| Kein Fertigungsoutput | Endet beim digitalen Demonstrator | Fertigungspaket: druckbare 3MF/STL plus geslicter Test, Gerber/BOM/CPL im Format des Bestückers |
| „Nicht bestellen“ | User will automatische Bestellung | Bestellung bis zum Warenkorb vorbereiten (Upload, Preis, DFM-Prüfung); **Bezahlen nur nach ausdrücklichem OK** |
| Keine Firmware-Route | Staubsauger braucht wenig Software | Eigene Firmware-Route mit Build, Unit-Tests und Protokoll-Kompatibilität |
| Keine Systemanforderung aus der Nutzung | Ziele sind grob geschätzt | Anforderungen aus unseren Spielen ableiten (Raten, Bereiche, Schwellen, Latenz), mit Quelle im Repo |
| Marketing nur angedeutet | Video kommt im Prompt nicht vor | Eigener Auftrag: 30–60-s-Video aus echter Geometrie, keine unbelegten Versprechen |
| Keine Integrationsprüfung gegen bestehende Software | Gerät steht allein | Akzeptanz: bestehende Bridge, Web-Spiele und Android-App funktionieren **ohne Codeänderung** |
| Kein Flash-Pfad | Darf nicht flashen | Programmierweg festlegen (SWD-Pads plus Debugger oder Bootloader); flashen erst am echten Board und nur auf Anweisung |
| Akku nur als Zukaufteil | Laden ist nicht Teil der Elektronik | LiPo mit Schutzschaltung, **Laden über USB-C** auf dem eigenen Board, mit Lade- und Thermikanalyse |

## 4. Was wir übernehmen, was wir ändern

**Unverändert übernehmen:** Kopf mit „How to use“, Kopierbereich, §0 als einziger Ausfüllteil, Ehrlichkeitsregel und Status-Wörter, Manager plus echte Spezialisten ohne Weiterdelegation, `management/`-Struktur, Toolchain-Inspektion mit einer Liste für den Menschen, Skills, Smoke-Tests vor der Produktarbeit, Varianten und Sensitivität, Handoffs und Locks, 3-Versuche-Regel, Release-Baseline mit SHA-256, vorbereiteter Change-Prozess.

**Ersetzen:**
- CFD-Spezialist → **Firmware-Spezialist** (BLE, IMU-Treiber, Thingy-kompatibles GATT-Profil).
- FEM bleibt, aber auf das Relevante: Schnappverbindungen, Fall aus 1 m als Abschätzung, Wandstärken für FDM.
- Neu: **Systems-/Sensor-Spezialist** für Anforderungen, IMU-Auswahl, Signalkette, Latenzbudget.
- Neu: **Docs-/Media-Spezialist** für Montageanleitung, Bedienungsanleitung, Marketingvideo.

**Neu dazu:**
- Beschaffbarkeit und Bestellvorbereitung beim Bestücker.
- Vollständige elektrische Analyse (Leistungsbudget, Laufzeit, USB-C-Laden, LDO, Thermik, ESD, Antenne, SPICE).
- Fertigungsoutput: Slicer-fertige Datei und Bestückungspaket.
- Abwärtskompatibilität mit dem bestehenden Protokoll (`docs/protocol.md`).

## 5. Erkenntnisse aus unserem Repo für die Anforderungen

| Grösse | Wert | Quelle |
|---|---|---|
| Bewegungsrate im Spiel | 100 Hz, Minimum 50 Hz | `docs/TENNIS.md` |
| Schlag-Schwelle Gyro | > 350 °/s, Ende < 200 °/s; Tempo bis 1200 °/s | `docs/TENNIS.md` |
| Ski-Sprung | Ruck > 2,1 g | `docs/SKI.md` |
| Ski-Lenkung | Roll, Totzone 3°, voller Einschlag bei ~32° | `docs/SKI.md` |
| BLE-Latenz heute | ≈ 30–60 ms | `docs/TENNIS.md` |
| Rohformat `EF680406` | accel `/1024` g, gyro `/32` °/s, je i16 | `docs/protocol.md` |
| **Folgerung** | i16 `/32` begrenzt das Gyro auf **±1024 °/s**. Tennis nutzt bis 1200 °/s, schnelle Schläge werden also heute abgeschnitten | CALCULATION |
| BLE-Last | 100 Hz × mehrere Ströme bricht unter Windows ab | `JOURNAL.md`, 2026-11-07 |

Das neue Gerät soll deshalb das bestehende Format liefern (kompatibel) und zusätzlich einen erweiterten Kanal mit grösserem Gyro-Bereich anbieten.
