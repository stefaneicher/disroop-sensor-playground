# Lückenanalyse: Klasse C und FDA

Was ein Audit finden würde. Klauselnummern nach IEC 62304:2006+A1:2015 **aus dem Gedächtnis**; vor Verwendung gegen den gekauften Normtext prüfen.
Status: **vorhanden** · **teilweise** · **fehlt**. Priorität: **P1** blockiert jede Einreichung, **P2** vor der Einreichung, **P3** Qualität.

## 1. Befunde im Code (aus dem Reverse Engineering)

| ID | Prio | Befund | Bezug | Vorschlag |
|---|---|---|---|---|
| <a id="GAP-05"></a>**GAP-05** | P1 | Kein Watchdog. Initfehler von IMU, UI, Akku und J5 werden nur geloggt, das Gerät läuft weiter ohne Daten. Bei BLE-Initfehler endet `main` und das Gerät ist untätig. | {SRS-070}, {SRS-090}, {SRS-091}, {HAZ-02}, {HAZ-03}, [[main]] | Watchdog einschalten, Fehlerzustand mit LED-Code und BLE-Statuswert, sicherer Zustand definieren |
| <a id="GAP-09"></a>**GAP-09** | P2 | Gemeinsame Daten ohne Sperre: `led_cmd` (BLE-Thread und Rückgabe), `env_cfg`, `sound_cfg`; `rest_samples` wird im IMU-Thread geschrieben und in `main` gelesen; `bias_cal_request` läuft in der Workqueue gegen den IMU-Thread. | [[wr_led]], [[imu_at_rest_for_s]], [[imu_request_calibration]] | Atomare Typen oder Mutex, Race-Analyse, Werkzeug (ThreadSanitizer auf dem Host, statische Analyse) |
| <a id="GAP-10"></a>**GAP-10** | P3 | Keine Tests für den Überlauf der 32-Bit-Millisekundenzeit (nach 49,7 Tagen) in Taster, Touch und Ratenbegrenzer. | [[thingy_button_update]], [[touch_update]] | Grenzwerttests mit Zeit nahe `UINT32_MAX` |
| <a id="GAP-11"></a>**GAP-11** | P3 | Filter ohne Schutz gegen Norm 0 bei der Quaternion-Normalisierung; Gleitkomma-Ergebnisse können je Compiler abweichen. | [[madgwick_update]] | Guard, Toleranz-Tests, Compiler-Matrix (IDEEN.md) |
| <a id="GAP-12"></a>**GAP-12** | P1 | ICM-45686-Registerwerte nicht gegen das Datenblatt (DS-000577) geprüft; der Header sagt es selbst. | [[firmware/icm/include/icm45686.h]], {SOUP-20} | Datenblatt beschaffen, Register Zeile für Zeile abgleichen, am Gerät messen |
| <a id="GAP-13"></a>**GAP-13** | P1 | Keine BLE-Kopplung, keine Verschlüsselung (`BT_SMP=n`); Bootloader ohne Signaturprüfung; kein Bedrohungsmodell; keine SBOM. | {SRS-003}, {SRS-092}, {HAZ-04}, {SOUP-10} | Bedrohungsmodell, LE Secure Connections, signierte Updates, SBOM (IEC 81001-5-1, FDA-Cybersecurity-Leitfaden) |
| <a id="GAP-14"></a>**GAP-14** | P1 | Keine Firmware-Version, keine Geräte-ID (UDI), keine Build-Kennung im Gerät. | {SRS-093}, {HAZ-10} | Device-Information-Service (Version, Seriennummer), Version aus Git-Tag in den Build einbetten |
| <a id="GAP-20"></a>**GAP-20** | P2 | Widerspruch: README nennt 32/32 PASS, im Code stehen 69 `RUN_TEST`. In dieser Sitzung wurden die Tests nicht ausgeführt. | `firmware/README.md`, `firmware/tests/` | Testlauf in CI, Ergebnis als Bericht ablegen, README aus dem Bericht erzeugen |
| <a id="GAP-21"></a>**GAP-21** | P2 | Werkzeuge nicht validiert und nicht unveränderlich gepinnt (`west`, Basis-Image). Nur ein Compiler (GCC des Zephyr-SDK) für die Firmware. | {SOUP-30}, {SOUP-31}, {SOUP-34} | Compiler-Matrix mit Warnungen als Fehler (IDEEN.md), Digest-Pinning, Werkzeugbewertung |

## 2. Prozesslücken nach IEC 62304

| ID | Prio | Klausel | Anforderung (Kurzfassung) | Vorhanden im Repo | Status |
|---|---|---|---|---|---|
| <a id="GAP-01"></a>**GAP-01** | P1 | 4.1 | Qualitätsmanagementsystem (ISO 13485) | nur Prozesshinweise in `RESUME.md` | fehlt |
| <a id="GAP-18"></a>**GAP-18** | P1 | 4.2, 7 | Risikomanagement nach ISO 14971, Risikokontrollen in der Software verifizieren | erste Gefährdungsliste in [Risiko](06_Risiko.md) | teilweise |
| <a id="GAP-02"></a>**GAP-02** | P1 | 4.3 | Sicherheitsklasse aus der Risikoanalyse | Klasse gesetzt, nicht begründet durch Analyse | teilweise |
| <a id="GAP-03"></a>**GAP-03** | P1 | 5.1 | Softwareentwicklungsplan (Normen, Werkzeuge, SOUP, Konfiguration, Verifikation) | verteilt auf `RESUME.md`, `PROMPT_1_ENTWICKLUNG.md`, `management/` | teilweise |
| <a id="GAP-04"></a>**GAP-04** | P1 | 5.2 | Softwareanforderungen: funktional, Leistung, Schnittstellen, Sicherheit, Gebrauchstauglichkeit, Risikokontrollen; geprüft und freigegeben | [SRS](02_SRS.md) rückwärts erstellt, nicht freigegeben, ohne Risiko- und Sicherheitsanforderungen | teilweise |
| <a id="GAP-06"></a>**GAP-06** | P2 | 5.3.5 | Trennung der Einheiten nach Klasse | keine Trennung, alles im selben Adressraum | fehlt |
| <a id="GAP-07"></a>**GAP-07** | P2 | 5.3.6, 5.4.5 | Architektur und Detailentwurf verifizieren (Review) | keine aufgezeichneten Reviews | fehlt |
| <a id="GAP-08"></a>**GAP-08** | P1 | 5.5 | Einheiten implementieren und verifizieren, Abnahmekriterien (Klasse C zusätzlich) | Host-Tests für den Kern; Adapter (UNIT-12 bis UNIT-18) ohne Test; keine Abdeckungsmessung | teilweise |
| <a id="GAP-15"></a>**GAP-15** | P1 | 5.6, 5.7 | Integrations- und Systemtests | Smoke-Tests im Container; Hardware `NOT RUN` | fehlt |
| <a id="GAP-16"></a>**GAP-16** | P2 | 5.8 | Release: Stand, bekannte Anomalien, Archivierung | `releases/V1_BASELINE/` geplant (§13 `NOT RUN`) | fehlt |
| <a id="GAP-17"></a>**GAP-17** | P2 | 5.3.3, 7.1.3 | SOUP: Anforderungen, Fehlerlisten, Bewertung | [SOUP](05_SOUP.md) erfasst, Fehlerlisten ungeprüft | teilweise |
| <a id="GAP-19"></a>**GAP-19** | P2 | 6, 8, 9 | Wartungsplan, Änderungssteuerung, Konfigurationsstatus, Problemlösung | Git-Verlauf, `CHANGE_REQUEST_USAGE.md`, ADR; kein Problembericht-Prozess | teilweise |
| <a id="GAP-22"></a>**GAP-22** | P3 | IEC 62366-1 | Gebrauchstauglichkeit von Taster, LED, Summer, Vibration | keine | fehlt |

## 3. FDA: erwartete Unterlagen (Dokumentationsstufe *Enhanced*)

Nach dem Software-Leitfaden der FDA (2023) enthält die Einreichung etwa: Softwarebeschreibung, Risikomanagement-Akte, SRS, Architektur-Diagramm,
Detailentwurf, Rückverfolgbarkeitsmatrix, Beschreibung der Entwicklungs- und Wartungspraxis, Verifikation und Validierung, Revisionshistorie,
Liste ungelöster Anomalien; dazu Cybersecurity-Unterlagen (Bedrohungsmodell, SBOM, Updatefähigkeit).

| ID | Unterlage | Stand |
|---|---|---|
| <a id="GAP-23"></a>**GAP-23** | Alle oben genannten in einer Form, die ein Prüfer lesen kann | [SRS](02_SRS.md), [SAD](03_SAD.md), [SDD](04_SDD.md), [Matrix](07_Rueckverfolgbarkeit.md) und [SOUP](05_SOUP.md) liegen als Entwurf vor; Risikoakte, V&V-Berichte, Cybersecurity-Unterlagen, Anomalienliste fehlen |

Die Zuordnung zur FDA-Dokumentationsstufe und zur Geräteklasse (I, II, III) ist eine regulatorische Entscheidung (z. B. 510(k) mit Vergleichsprodukt).
Sie gehört in die Hände einer Regulatory-Fachperson und ist hier **nicht** getroffen.

## 4. Reihenfolge, wenn es ernst würde

1. Zweckbestimmung festlegen (OPEN-01), daraus Geräteklasse und Sicherheitsklasse ableiten.
2. P1-Befunde im Code beheben: Watchdog und Fehlerbehandlung ({GAP-05}), Version und UDI ({GAP-14}), BLE-Sicherheit ({GAP-13}), Datenblattabgleich ({GAP-12}).
3. Risikomanagement-Akte aufbauen (ISO 14971), Risikokontrollen als SRS-Anforderungen nachführen.
4. Adapter-Tests (Simulation der Zephyr-APIs oder Hardware-in-the-Loop), Abdeckungsmessung, Systemtests am Gerät.
5. Release-Stand mit Anomalienliste, SBOM, signierte Images.
