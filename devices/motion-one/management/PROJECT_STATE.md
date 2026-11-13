# Verbindlicher Projektstand Disroop Motion One

Stand: **2026-11-13**. Gesamtstatus **PARTIAL**. Diese Datei ist der Einstieg für den
aktuellen, durch Repository-Belege abgesicherten Stand. Handoffs, Logs und die
V1-Baseline bleiben historische Nachweise; ältere Übersichten sind keine neueren Freigaben.

## Revisionen und Grenzen

| Bereich | Aktueller Quellenstand | Vorhandener Ergebnisstand | Status / Beleg |
|---|---|---|---|
| PCB / Schaltplan | Hauptplatine r4, Schaltplan r4-C; optionale UI-Platine separat | Integration vom 2026-11-09: Netzlistenvergleich MATCH, ERC ohne Fehler, keine offenen Verbindungen; Hauptplatine mit zwei DRC-Warnungen [QUELLE: `electronics/exports/pruefbelege_schaltplan_r4/hierarchy-integration.json`] | PARTIAL: digitale Prüfung, keine Hardware-/Fertigungsfreigabe |
| Firmware | r4-Pinmap und UI-Erweiterung | 69 Host-Tests ohne Fehler [BERECHNUNG: Summe der acht Testprogramme in `logs/fw-pinmap/unit-tests.log`]; Pinchecks im selben Log; FLASH 161100 B / RAM 37604 B [QUELLE: `logs/fw-pinmap/app-build.log`] | PARTIAL: gespeicherter Build, keine erneute Ausführung bei diesem Abgleich; Hardware NOT RUN |
| Mechanik | r5-Parameter und Prüfwerkzeuge aus Commit `5926bde` | Letzte versionierte Kollisions-/Passungsbelege weiterhin r4; keine Ergebnisdateien `collision_r5.json`, `wall_edt_r5.json` oder `pcb_stl_check_r5.json` vorhanden | PARTIAL: r5-Neubau und erneute Prüfung NOT RUN |
| Anleitungen / Media | r4-Drafts, PDFs und Renderings vorhanden | `docs/assembly/`, `docs/user/`, `media/renders/`; ältere Bilder und eingebettete Modelle stellen keinen r5-Nachweis dar | PARTIAL: nicht am Muster validiert |
| Release | `releases/V1_BASELINE/` vorhanden | Historischer r4-Snapshot mit Manifest und bekannten Widersprüchen | PARTIAL: unverändert aufbewahren; nicht durch laufende Quellen ersetzen |
| Beschaffung | BOM und Angebots-Snapshots vorhanden | Zeitgebundene Preise/Lagerstände, keine aktuelle Bestätigung | PARTIAL: Lager, DFM, Rotation und Gesamtangebot vor Bestellung neu prüfen |
| Hardware / Bestellung | Kein neuer Durchführungsnachweis im Repository | Letzter dokumentierter Stand: nichts bestellt, gedruckt oder geflasht | NOT RUN: physische Funktion, Laden, Temperatur, BLE, Latenz und Passung nicht bestätigt |

Die **r5-Parameter sind Vorgaben, keine gemessenen Ergebnisse**:
`LIP_D0 = 2.4 mm`, `GROOVE_CLR = 0.30 mm`
[ANNAHME: `scripts/mechanics/params.py`]. Alte r4-Messwerte dürfen damit nicht
als r5-Nachweis weiterverwendet werden.

## Abgleich vorhandener Dateien am 2026-11-13

- Die Eingangs-Hashes in `mechanics/cad/collision_r4.json` stimmen mit allen darin
  genannten Dateien unter `mechanics/assembly_stl/` überein
  [BERECHNUNG: SHA-256-Vergleich, reproduzierbar mit `node scripts/audit-files.mjs`].
  Das gespeicherte Gesamtergebnis ist **PARTIAL**, nicht eine r5-Freigabe.
- `mechanics/assembly_stl/explode.json` enthält für `unterschale_glatt.stl` einen
  abweichenden Hash. Die Metadaten stammen vor der dokumentierten STL-Reparatur;
  vor einem neuen Export gemeinsam neu erzeugen. Das alte `watertight: false`
  nicht unbesehen als aktuellen Befund übernehmen.
- Die aktuellen Exportdateien `SCHALTPLAN_r4.pdf`, `kicad_quellen_r4.zip` und
  `pruefbelege_r4.zip` sind bytegleich mit ihren entsprechenden Kopien in der
  V1-Baseline [BERECHNUNG: SHA-256-Vergleich im Dateiaudit].
  Die ältere Handoff-Notiz „Kopieren noch NOT RUN“ ist damit nicht mehr der lokale Stand.
- **Kopiengleichheit ist keine Manifestgültigkeit:** Der vollständige
  SHA-256-Abgleich des Baseline-Manifests meldet auch Abweichungen an
  geschützten Artefakten (u. a. PDF/Prüfbelege und KiCad-Quellen-ZIP).
  Diese Dateien wurden bei diesem Abgleich nicht verändert. Separat weichen
  veränderliche Quelldokumente ab; `REPRODUCE.md` und `management/metrics.json`
  wurden hier bewusst aktualisiert. Details und erwartete/aktuelle Hashes stehen
  im Dateiaudit. Ursache/Revision und gegebenenfalls Text-Zeilenenden klären,
  nicht das historische Manifest passend neu schreiben.
- Die beiden Anbieter-Gerber mit r3-Dateinamen sind bytegleich miteinander,
  aber nicht mit `manufacturing/pcba/motion-one_gerber_r4.zip`.
  `mk_upload.py` kopiert r4-Eingaben weiterhin unter r3-Namen; die konkrete
  Inhaltsrevision ist deshalb nicht aus dem Namen ableitbar. Nach gemeinsamer
  Freigabe neu paketieren, nicht ungeprüft hochladen.
- Der r3-Zwischenbericht bleibt unter seiner bisherigen URL als **historischer
  Snapshot** erreichbar. Der [aktuelle Überblick](../media/presentation/index.html)
  unterscheidet Quellenrevision und Ergebnisrevision ausdrücklich.
- Das [Dateiaudit](../../../docs/DATEI_AUDIT.html) führt jeden versionierten und
  nicht ignorierten neuen Projektpfad mit Hash, Referenzhinweisen, Duplikaten und
  konservativer Empfehlung auf. Fehlende Textreferenzen beweisen keine Nichtnutzung.

## Offene Integrationsgates

| Gate | Stand |
|---|---|
| r5-CAD, Baugruppen-/Druckexport, Kollisions- und PCB-Körperprüfung | NOT RUN; Neubau samt Ergebnis-Hashes fehlt |
| Wandstärke und Lippe/Nut | PARTIAL: r4-Voxelwert 0.8 mm bei 0.4-mm-Raster; Lippenspielminimum 0.191 mm unter damaligem Soll 0.25 mm [SIMULATION: `mechanics/cad/final_checks_r4.json`]. Kein PASS für r5 ableiten |
| PCB-Körper / USB-C | PARTIAL: widersprüchliche Dichtheits-Zählmethoden und vereinfachte Hüllkörper; siehe Baseline-Widersprüche. Buchsenorientierung allein ist keine Passungsfreigabe |
| Schieber / Lichtleiter / Kabel | PARTIAL: r4-Simulationsbelege vorhanden; reale Hebel-/Kabelmaße, Passprobe und Zugentlastung offen |
| Slicer / FEM | NOT RUN für r5; alte Slices/FEM nicht als r5-Ergebnisse ausgeben. FEM bleibt gemäss dokumentiertem Entscheid pausiert |
| Hardware, Lade- und Fertigungssicherheit | NOT RUN; weder Druck noch Bestellung oder Flashen durch diese Dokumentation freigegeben |
| Baseline-Provenienz / Anbieterpakete | PARTIAL: Manifestabweichungen an geschützten Artefakten und veraltete Anbieter-Gerber auflösen; historische Bytes/Manifeste nicht überschreiben |

## Statuspflege und Archivgrenze

Aktuelle Entscheidungen und Belege zuerst hier eintragen. `management/RESUME.md`
verweist für die Fortsetzung hierher; alte datierte Abschnitte dort sowie
`THREADS.json`, Journal und Release-Dateien sind Verlauf, keine Live-Agentenliste.
`management/metrics.json` enthält weiterhin explizit historische V1-/r4-Kennzahlen;
für den aktuellen Stand nicht ohne Prüfung übernehmen.

Es wurden bei diesem Abgleich keine CAD-/PCB-/Firmwarequellen neu gebaut oder
historische Nachweise gelöscht. Doppelte Release-Kopien sind beabsichtigte
Snapshots, keine automatisch entbehrlichen Dateien.
