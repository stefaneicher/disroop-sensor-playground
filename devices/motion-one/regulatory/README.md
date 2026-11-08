# Motion One Firmware: IEC-62304-Dokumentation (Reverse Engineering, Klasse C)

> **Gedankenspiel, keine Zulassungsunterlage.** Die Annahme „Medizinprodukt-Software, Sicherheitsklasse C“ ist ein Auftrag des Users
> (2026-11-08). Das Gerät ist heute ein Spiele-Controller. Die Dokumente sind **rückwärts aus dem vorhandenen Code** entstanden
> (Reverse Engineering) und zeigen, was ein Audit für diese Firmware vorfinden würde. Sie behaupten **keine Konformität**.
> Ausgeführt oder gemessen wurde nichts; alles, was Hardware oder eine Testausführung braucht, ist `NOT RUN`.

## Zuerst die Korrektur der Normnummern

Gemeint sind nicht „62830“ und „608“, sondern:

| Du meintest | Richtig | Inhalt |
|---|---|---|
| IEC 62830 | **IEC 62304** | Software-Lebenszyklus für Medizinprodukte (Sicherheitsklassen A, B, C) |
| 608… | **IEC 60601-1** (Reihe) | Elektrische Sicherheit von Medizinprodukten, enthält Anforderungen an programmierbare Systeme |
| FDI | **FDA** | US-Behörde. Eine FDA-„Klasse C“ gibt es nicht: FDA kennt Geräteklassen I–III und für Software die Dokumentationsstufen *Basic* und *Enhanced* |

Details, weitere Normen und Bezugsquellen: [Normen](01_Normen.md).

## Dokumente

| # | Dokument | Inhalt |
|---|---|---|
| 01 | [Normen](01_Normen.md) | Welche Normen gelten, richtige Nummern, Bezugsquellen, warum keine PDFs im Repo liegen |
| 02 | [SRS](02_SRS.md) | Software Requirements Specification: 47 Anforderungen aus dem Code abgeleitet, dazu 5 fehlende, mit Link auf Code und Tests |
| 03 | [SAD](03_SAD.md) | Software Architecture Document: Bausteine, Threads, Schnittstellen, Zustände |
| 04 | [SDD](04_SDD.md) | Detailentwurf je Software-Einheit (Unit). Die Abkürzung „SCD“ habe ich als *Software Component/Detailed Design* gelesen |
| 05 | [SOUP](05_SOUP.md) | Fremdsoftware mit Version und offenen Prüfungen |
| 06 | [Risiko](06_Risiko.md) | Sicherheitsklasse, Gefährdungen durch Software, Risikokontrollen |
| 07 | [Rückverfolgbarkeit](07_Rueckverfolgbarkeit.md) | Anforderung → Entwurf → Code → Test |
| 08 | [Lücken](08_Luecken.md) | Was für Klasse C und die FDA-Einreichung fehlt, Klausel für Klausel |
| 09 | [Skills](09_Skills.md) | Vorgeschlagene Skills für einen QA-/Regulatory-Spezialisten |

## HTML-Version mit Code-Links

Alle Dokumente gibt es als verlinkte HTML-Seite. Jedes Symbol in doppelten eckigen Klammern in den Markdown-Dateien wird zum Link auf die Quellzeile,
jede ID in geschweiften Klammern zum Link auf die Anforderung, Gefährdung oder Einheit.

```bash
python3 devices/motion-one/regulatory/build_site.py          # baut regulatory/site/ (braucht pandoc)
python3 devices/motion-one/regulatory/build_site.py --check  # prüft nur: Symbole, IDs, Rückverfolgbarkeit
```

Die Prüfung schlägt fehl, wenn ein Code-Symbol nicht mehr existiert oder eine Anforderung in der Matrix fehlt. So veralten die
Links nicht unbemerkt. Die gebaute Seite liegt unter [`site/index.html`](site/index.html).

## Wie ich vorgegangen bin

1. Gesamten eigenen Firmware-Code gelesen (rund 2500 Zeilen C ohne Herstellerreferenz) sowie `management/REQUIREMENTS.md`, `requirements/ARCHITECTURE.md`, `firmware/docs/EXTENDED_CHANNEL.md` und die ADR.
2. Verhalten als „soll“-Anforderungen formuliert. Wo der Code eine Annahme trifft (`ANNAHME` im Quelltext), steht sie als Annahme im Dokument.
3. Jede Anforderung mit Code und Test verknüpft. Tests gibt es nur für die hardwarefreien Module. Die Zephyr-Adapter (BLE, IMU-Thread, UI) haben keine Unit-Tests.
4. Befunde, die ein Audit finden würde, sammle ich in den [Lücken](08_Luecken.md). Die wichtigsten:
   - **Kein Watchdog**, und `main()` kehrt bei einem BLE-Initfehler einfach zurück.
   - **Ein IMU-Ausfall wird nur geloggt** (RTT). Das Gerät läuft weiter und sendet nichts, ohne dass jemand es merkt.
   - **Keine BLE-Kopplung und keine Verschlüsselung** (`CONFIG_BT_SMP=n`): Jeder in Reichweite kann LED, Summer und Konfiguration schreiben.
   - **Keine Firmware-Version, keine Geräte-ID** im Gerät auffindbar.
   - **Die ICM-45686-Registerwerte sind nicht gegen das Datenblatt geprüft** (steht so im Header).
   - Sicherheitsklasse C verlangt zusätzlich Einheitentests für die Adapter, Abdeckungsnachweise, SOUP-Anomalieprüfung und einen Risikomanagement-Prozess nach ISO 14971. Nichts davon ist vorhanden.

## Offene Entscheide an dich

<a id="OPEN-01"></a>**OPEN-01** Zweckbestimmung: Ich habe für die Dokumente eine **angenommene** Zweckbestimmung gesetzt (siehe [SRS §1](02_SRS.md)): handgehaltener Bewegungssensor für Reha-Übungen, Daten per BLE an eine Auswertesoftware. Ohne echte Zweckbestimmung ist auch die Klasse C nur eine Setzung. Bitte bestätigen oder ersetzen.

<a id="OPEN-02"></a>**OPEN-02** Bezugsquellen: Die Normen sind kostenpflichtig, und die FDA-Seite war aus dieser Umgebung nicht erreichbar (Proxy 403). Es liegen deshalb **keine PDFs** im Repo. Falls du Lizenzexemplare hast, gehören sie in einen nicht öffentlichen Ordner, das Repo ist öffentlich.
