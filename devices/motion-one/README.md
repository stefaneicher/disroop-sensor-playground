# Disroop Motion One

Ein geplanter Einhand-Motion-Controller für Tennis und Ski. Das Gerät soll das Thingy:52-BLE-Profil nachbilden, damit
Bridge, Spiele und Android-App ohne Codeänderungen funktionieren.

> **Aktueller Überblick:** [Projektstand mit Prüfgrenzen und Archiv](media/presentation/index.html).
> Verbindliche Statusquelle: [PROJECT_STATE.md](management/PROJECT_STATE.md), Abgleich vom 2026-11-13.

## Aktueller Stand

V1 ist ein **digitaler Entwicklungsstand**, noch kein fertiges oder geprüftes Produkt: PCB, Firmware und ergonomisches
Gehäuse liegen als Entwürfe vor. Die Gesamtintegration ist noch offen. Nach letztem dokumentiertem Stand wurde nichts bestellt, bezahlt,
gedruckt, geflasht oder unter Spannung gesetzt; ein neuer Durchführungsnachweis fehlt, Hardwaretests sind NOT RUN. Der detaillierte Status und die nächsten
Schritte stehen im [verbindlichen Projektstand](management/PROJECT_STATE.md).
PCB/Firmware: r4; Mechanikquellen: r5, gespeicherte Mechanik-Prüfbelege: r4.
Die V1-Baseline ist ein historischer Snapshot, keine r5-Fertigungsfreigabe.

## Themen

| Bereich | Kurzfassung | Status |
|---|---|---|
| [Elektronik / PCB](electronics/README.md) | KiCad-Board, Schaltplan, SPICE-Analyse und Pinout | Entwurf; finale Mechanik-Abstimmung offen |
| [Firmware](firmware/README.md) | Zephyr-Firmware mit Thingy-Profil, Bewegungserfassung und UF2-Programmierweg | 69 Tests ohne Fehler und Pinchecks im gespeicherten r4-Log [QUELLE: logs/fw-pinmap/unit-tests.log]; Hardware NOT RUN |
| [Mechanik](mechanics/README.md) | Parametrisches, beidhändig nutzbares Griffgehäuse, FEM und 3D-Druck | CAD und Slicer-Daten vorhanden; PCB-Abgleich offen |
| [Fertigung](manufacturing/README.md) | PCBA-Uploadpaket und Slicer-Ausgaben | Dateien vorbereitet; noch kein Auftrag oder Druck |
| [Beschaffung](sourcing/README.md) | BOM, Lagerabfragen und Bestücker-Vergleich | Momentaufnahme; finale Versand- und PCBA-Angebote offen |

## Projektdateien

- [Entwicklungsprompt](PROMPT_1_ENTWICKLUNG.md) und [Marktauftritt-Prompt](PROMPT_2_MARKTAUFTRITT.md)
- [Aktueller Projektüberblick](media/presentation/index.html)
- [Archiv: Zwischenbericht r3 vom 2026-11-08](media/presentation/ZWISCHENBERICHT_2026-11-08_r3.html)
- [Dateiaudit und Aufräumkandidaten](../../docs/DATEI_AUDIT.html)
- [Vorab-Check](PREFLIGHT.md) und [Vorbildanalyse](ANALYSE.md)
- [Hauptprotokoll](../../docs/protocol.md)

Alle Masse, Preise und Leistungswerte sind Quellenangaben, Berechnungen, Simulationen oder Annahmen; Details und
Belegpfade stehen in den jeweiligen Bereichs-README-Dateien und Handoffs. CE/RED, FCC, UN38.3, EMV und physische
Sicherheit sind nicht validiert.
