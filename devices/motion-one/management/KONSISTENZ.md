# Konsistenz und Aufräumen – Disroop Motion One

Status: **VORSCHLAG** (2026-11-08, noch nicht vom User freigegeben). Ergänzt `PROMPT_1_ENTWICKLUNG.md` §2, §12 und §13.

## Warum

Das Projekt entsteht in vielen KI-Sessions mit fünf Spezialisten, Handoffs und Änderungswünschen. Die Agents sehen frühere
Chats nicht, nur das Repo. Dabei entstehen typische Fehler:

- **Veraltete Verweise:** Ein Dokument nennt noch eine alte Revision, z. B. `INTERFACES r2`, obwohl r4 gilt.
- **Doppelte Wahrheit:** Dieselbe Zahl steht in mehreren Dateien mit verschiedenen Werten.
- **Tote Artefakte:** `VORLAEUFIG_*`-Dateien, Zwischenstände und Varianten bleiben liegen, obwohl sie längst ersetzt sind.
- **Statusdateien, die auseinanderlaufen:** `PROJECT_STATE.md`, `TASK_BOARD.md`, `RESUME.md` und `PROGRESS.md` zeigen
  unterschiedliche Stände.
- **Lücken in der Rückverfolgung:** Eine Anforderung hat kein Designelement oder keinen Nachweis. Oder ein Bauteil hat
  keine Anforderung und keinen Platz im Gehäuse, wie beim Vibrationsmotor (siehe `RESUME.md`, Lücke Vibrationsmotor).

Das Repo ist das Gedächtnis des Projekts. Konsistenz entsteht deshalb nicht in den Chats, sondern über drei Dinge:
klare Wahrheitsquellen, maschinelle Prüfungen und ein festes Aufräumritual.

## 1. Wahrheitsquellen (eine Quelle pro Fakt)

Jeder Fakt hat genau eine Master-Datei. Alle anderen Dateien **verweisen** auf sie, mit Revision, oder werden **aus ihr
erzeugt**. Wer einen Fakt ändert, ändert ihn in der Master-Datei und führt die abgeleiteten Dateien im selben Schritt nach.

| Fakt | Master (editierbar) | Abgeleitet / verweisend | Wie abgeleitet |
|---|---|---|---|
| Anforderungen, Zielwerte, Verifikationsstatus | `management/REQUIREMENTS.md` | Bericht, Release-Status, `TRACEABILITY.md` | Verweis mit REQ-ID |
| Schnittstellen (BLE, Umriss, Bohrungen, Bauhöhen, Stecker, Taster/LED) | `management/INTERFACES.json` (`revision`) | CAD-`params.py`, Massblatt, Anleitungen, Bericht | CAD liest JSON; Dokumente zitieren `INTERFACES rN` |
| Pinbelegung | `electronics/PINOUT_V1.json` | Firmware-DTS, Massblatt | DTS aus JSON bzw. Prüfung gegen JSON |
| Schaltung und Bauteile | KiCad-Projekt `electronics/kicad/` | `sourcing/BOM_V1.md`, CPL, Gerber | **erzeugt** (`kicad-cli`), nie von Hand |
| Lager und Preise | Rohdaten `logs/sourcing-*/` mit Zeitstempel | BOM-Spalten, `ANGEBOTE_V1.md` | Skript `jlc_query.py` |
| Zahlen im Bericht und Marketing | `management/metrics.json` | Bericht, `HANDOFF_MARKETING.md`, Anleitungen | Verweis auf Metrik-ID |
| Entscheide | `adr/<disziplin>/ADR-*.md` | Handoffs, Prompt-Abweichungen | Verweis auf ADR-ID |
| Aktueller Arbeitsstand | `management/RESUME.md` | `PROJECT_STATE.md`, `TASK_BOARD.md`, Root-`PROGRESS.md`, `TODO.md` | Zusammenfassung, gleiche Zeitmarke |
| Verlauf | `JOURNAL.md`, Handoffs, Git | – | nur anhängen |

Regel: Steht eine Zahl ohne Verweis auf ihre Master-Datei in einem Dokument, ist das ein Befund im Konsistenz-Review.

## 2. Revisionskette

- Jedes Artefakt nennt im Kopf seine eigene Revision und die Eingangsrevisionen, z. B.
  `Gehäuse r4 · Eingänge: INTERFACES r4, Board r4c, ADR mechanics/0004`.
- Ein Integrationsstand ist erst konsistent, wenn PCB, Mechanik, Firmware und Doku **dieselbe** `INTERFACES`-Revision
  nennen. Das ist bereits ein Release-Gate in `PROJECT_STATE.md`; hier wird es zur Prüfung bei jedem Review.
- Ändert sich eine Master-Revision, listet der Manager alle Dateien, die die alte Revision zitieren
  (`grep -rn "INTERFACES.*r3" devices/motion-one`), und gibt sie als Nachführaufträge weiter.

## 3. Lebenszyklus von Dateien

| Zustand | Kennzeichen | Regel |
|---|---|---|
| Aktiv | normaler Name | genau eine aktive Fassung je Artefakt |
| Vorläufig | Präfix `VORLAEUFIG_` | nur mit Eintrag in `TODO.md` (Wer ersetzt? Bis zu welcher Revision?) |
| Ersetzt | Kopfzeile `Ersetzt durch <Pfad/ID>` (ADR, Handoff) oder gelöscht | Handoffs und ADRs bleiben als Verlauf erhalten; Arbeitsdateien werden gelöscht, Git ist das Archiv |
| Release | `releases/<Rev>/` | unveränderlich |

- Keine Varianten wie `_v2`, `_neu`, `_alt` oder `_backup` neben der aktiven Datei. Die bestehende Datei wird geändert, die
  Vorgängerin bleibt in Git.
- Wer eine Datei ersetzt, löscht die alte im selben Commit oder markiert sie als ersetzt.
- Bewusst parallel geführte Varianten (z. B. drei Gehäusevarianten für den Vergleich in §10) liegen in einem Ordner mit
  `README.md`, der Zweck und Gewinner nennt.
- Statusdateien mit «Stand …»-Abschnitten wachsen nicht endlos: In `RESUME.md` steht nur der aktuelle Stand. Ältere
  Abschnitte werden beim Review in einer Zeile in `JOURNAL.md` zusammengefasst und entfernt.

## 4. Rückverfolgbarkeit (Traceability)

`management/TRACEABILITY.md` (anzulegen, später aus `REQUIREMENTS.md` und den Handoffs erzeugt) verbindet jede
Anforderung mit Design und Nachweis:

| REQ | Designelement (Revision) | Nachweis (Datei/Befehl) | Status |
|---|---|---|---|
| REQ-004 | IMU ICM-45686, Board r4c U? | `requirements/budgets_output.md` §1 | NOT RUN (Hardware) |

Zusätzlich in umgekehrter Richtung:
- Jede BOM-Position und jedes Zukaufteil (Akku, Motor, Schrauben, Kabel) hat ein 3D-Modell und einen Platz in der
  Kollisionsprüfung. Das ist die Regel aus F-10, hier allgemein gefasst.
- Jedes Designelement ohne Anforderung ist entweder begründet (ADR) oder ein Kandidat zum Entfernen.

Leere Zellen sind Befunde. Diese Matrix ist die geforderte Verifikationsmatrix für `releases/V1_BASELINE/` (§13).

## 5. Konsistenz-Review (Ritual)

**Auslöser:** nach jeder neuen `INTERFACES`- bzw. Board-Revision, vor jeder Bestellung oder jedem Upload beim Hersteller,
vor jedem Release und vor einem Session-Wechsel. Sonst mindestens einmal pro Arbeitstag.

**Ablauf (Skill `consistency-review`):**
1. Am besten in einer **frischen Session** bzw. einem Agent, der den Stand nicht selbst erzeugt hat. So prüft niemand die
   eigene Arbeit.
2. Checkliste `requirements/CHECKLIST_consistency.md` abarbeiten, automatische Prüfungen (§6) laufen lassen.
3. Befunde in `management/reviews/<JJJJ-MM-TT>-konsistenz.md` festhalten: Befund, Fundstelle, betroffene Master-Datei,
   Vorschlag, Status. **Erst auflisten, nichts löschen.**
4. Der User oder der Manager entscheidet. Danach Nachführaufträge an die zuständigen Spezialisten (ein Schreiber pro Datei).
5. Status-Dateien auf dieselbe Zeitmarke bringen, committen.

## 6. Automatische Prüfungen (vorgeschlagen, noch nicht umgesetzt)

Ein Skript `scripts/management/check_consistency.py`, das im Werkzeug-Container und in der CI läuft. Es meldet nur
Befunde und ändert nichts:

| Prüfung | Vorgehen |
|---|---|
| Revisionsverweise | alle `INTERFACES rN`, `Board rN` und `r\d+`-Zitate in Markdown gegen `INTERFACES.json.revision` bzw. die aktuelle Board-Revision |
| BOM ↔ Schaltplan | BOM aus `kicad-cli sch export bom` neu erzeugen und mit `sourcing/BOM_V1.md` vergleichen (Refs, Werte, LCSC) |
| ERC/DRC | `kicad-cli sch erc` / `pcb drc` mit Herstellerregeln, 0 Fehler |
| Pinout ↔ DTS | jeder Pin aus `PINOUT_V1.json` erscheint im DTS mit gleicher Funktion |
| Lager-Frische | jede Lagerangabe älter als 7 Tage → `veraltet`, vor einer Bestellung Pflicht-Neuabfrage |
| Tote Dateien | Dateien, die von keinem Markdown, Skript oder Manifest referenziert werden; `VORLAEUFIG_*` ohne `TODO.md`-Eintrag; Namen mit `_v2`, `_neu`, `_alt`, `_backup` |
| Links | relative Links in allen Markdowns zeigen auf existierende Dateien |
| REQ-Abdeckung | jede REQ-ID aus `REQUIREMENTS.md` erscheint in `TRACEABILITY.md` mit Design und Nachweis |
| Metriken | jede Zahl im Bericht mit Metrik-ID existiert in `metrics.json` mit gleichem Wert |
| Statusgleichheit | Zeitmarke «Stand» in `RESUME.md`, `PROJECT_STATE.md`, `TASK_BOARD.md` höchstens einen Review auseinander |

## 7. Erster Befund (Review 2026-11-08, Stichprobe, nichts geändert)

| # | Befund | Fundstelle | Vorschlag |
|---|---|---|---|
| K-01 | Bericht und Bedienungsanleitung zitieren `INTERFACES r2`, aktuell ist `r4` | `docs/report/TECHNISCHER_BERICHT_V1.md:62, :130`; `docs/user/USER.md:11, :13, :17` | beim §11-Auftrag auf r4 nachführen |
| K-02 | BOM beschreibt Board r3, Board ist r4c (J5, TVS U2 SRV05-4 und Bedienplatine fehlen) | `sourcing/BOM_V1.md` Kopf | BOM aus KiCad r4c neu erzeugen statt nachzuschreiben |
| K-03 | `PROJECT_STATE.md` (Stand 06:45, PCB r2) und `TASK_BOARD.md` sind älter als `RESUME.md` (Stand 21:40, r4c) | `management/` | beim nächsten Review gemeinsam nachführen |
| K-04 | Root-`PROGRESS.md` hat Stand 2026-11-07 20:30 | `PROGRESS.md` | Meilenstein 22 auf r4c aktualisieren |
| K-05 | `VORLAEUFIG_*`-Druckdateien liegen in zwei Upload-Ordnern, Ablösung hängt an Gehäuse r4 | `manufacturing/upload/*/` | in `TODO.md` mit Ablösebedingung führen, nach r4 löschen |
| K-06 | `RESUME.md` wächst mit «Stand …»-Abschnitten und ist teils englisch, obwohl die Sprachregel Deutsch verlangt | `management/RESUME.md` | auf aktuellen Stand kürzen, Verlauf in `JOURNAL.md` |
| K-07 | Zwei Leistungsbudgets (65 h und 49 h) mit verschiedenen Annahmen | `requirements/BUDGETS.md`, `electronics/analysis/ANALYSE_V1.md` | ein Stromprofil als Master festlegen, das andere verweist darauf |
| K-08 | Verifikationsmatrix bzw. `TRACEABILITY.md` fehlt | `management/` | nach §4 anlegen |

Diese Liste ist eine Stichprobe und kein vollständiges Review.
