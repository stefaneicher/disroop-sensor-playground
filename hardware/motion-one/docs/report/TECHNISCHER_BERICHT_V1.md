# Disroop Motion One – technischer Bericht V1 (Entwurf)

**Status: PARTIAL – kein Fertigungs- oder Hardware-Release.** Dieser Bericht fasst den digitalen V1-Entwurf zusammen.
Die PCB-, Firmware- und Mechanik-Schnittstellen befinden sich in einer Integrationsrunde; bis zu deren Abschluss sind
Positionen und Ausgaben revisionsgebunden, aber noch nicht gemeinsam freigegeben. Keine Platine wurde bestellt, kein
Gehäuse gedruckt und keine Firmware auf Hardware geflasht.

Zahlen sind als QUELLE, BERECHNUNG, SIMULATION, MESSUNG oder ANNAHME gekennzeichnet. „PASS“ bezieht sich nur auf die
genannte digitale Prüfung. Hardwareabhängige Eigenschaften sind NOT RUN.

## 1. Anforderungen und Systemarchitektur

Das Gerät soll als Einhand-Motion-Controller Tennis und Ski bedienen und der Bridge sowie der Android-App gegenüber den
Thingy:52 BLE-Vertrag nachbilden. Die bestehenden Programme werden dadurch nicht geändert. Als gemeinsamer Vertrag gilt
[`../../../../docs/protocol.md`](../../../../docs/protocol.md), ergänzt durch `management/INTERFACES.json`.

Die Spiele verwenden 100 Hz, mindestens 50 Hz (QUELLE: `../../../../docs/TENNIS.md:4,111`). Ein Schlag wird in Tennis
ab etwa 350 °/s erkannt; die Tempo-Skala reicht bis etwa 1200 °/s (QUELLE: `../../../../docs/TENNIS.md:36-37`). Ski
verwendet 3° Roll-Totzone, etwa 32° Vollauslenkung und einen Sprungtrigger über 2,1 g (QUELLE:
`../../../../docs/SKI.md:14,16`). Das sind Spielschwellen, keine Sensor-Auslegungsgrenzen.

| Architektur | Bewertung | Entscheid |
|---|---|---|
| nRF52840 direkt auf dem PCB | Grösste Lieferbarkeit des SoC, aber HF-Layout, Matching-Netzwerk und Antennenmessung selbst erforderlich; höhere Integrationsarbeit | verworfen |
| Ebyte E73-2G4M08S1C mit nRF52840 | Modul mit Antenne, auf JLCPCB als Teil geführt; kleineres HF-Layout-Risiko; einmaliges Bootloader-Flashen per SWD nötig | **gewählt, noch zu verifizieren** |
| Seeed XIAO nRF52840 als Unterbaugruppe | geringer Firmware-Aufwand und Bootloader im Modul, aber Handbestückung/Unterbaugruppe und grösserer Bauraum | Rückfalloption |

QUELLE/ANNAHMEN: `requirements/ARCHITECTURE.md`; Lagerwerte sind Momentaufnahmen vom 2026-11-07 und müssen vor einer
Bestellung neu geprüft werden. Funkzulassungsnachweise des E73-Moduls wurden nicht vollständig verifiziert.

## 2. Sensorik, Schnittstellen und Latenz

Gewählt ist die TDK ICM-45686 (QUELLE: TDK-Produktseite, `requirements/ARCHITECTURE.md`): die dokumentierte Auswahl
deckt ±4000 °/s Gyro und ±32 g Beschleunigung ab, bei einer angegebenen Gyro-Rauschdichte von 3,8 mdps/√Hz und
6-Achsen-Strom von 0,42 mA. Datenblattwerte, insbesondere FIFO-/ODR-Details und ICM-Registerkonfiguration, sind
vor Freigabe mit dem vollständigen Herstellerdatenblatt abzugleichen.

**Messbereiche:** ±4000 °/s Gyro und ±32 g Beschleunigung (BERECHNUNG/Entwurfswahl). Systems-Auslegung zitiert
Tennis-Winkelgeschwindigkeiten von bis zu 3207 °/s im Oberarmmittel plus Standardabweichung bis 4014 °/s
(QUELLE: Fleisig et al. 2003, DOI 10.1080/14763140308522807; van Trigt et al. 2025, Frontiers,
beide siehe `requirements/BUDGETS.md`). ±32 g folgt der Hebelarmabschätzung a=ω²r mit angenommenem Radius
(ANNAHME/BERECHNUNG), nicht aus einer Messung am Motion One.

Der Thingy-Raw-Kanal `EF680406` bleibt 18 Byte lang und wird bei ±1024 °/s geklemmt (QUELLE:
`docs/protocol.md`, `hardware/thingy-bridge/internal/thingy`). Als Erweiterung ist `EF680480` Raw-HR vorgesehen: 16 Byte mit
Beschleunigung /1024 g, Gyro /8 °/s, Sample-Zähler und Sättigungsflags (ANNAHME, nicht Teil des bestehenden
Thingy-Vertrags). Die Bridge unterstützt diese Erweiterung noch nicht; Spielmodus mit Raw-HR ist NOT RUN.

Für Bewegung ist das Spielprofil Quaternion + Raw vorgesehen: 200 Notifications/s. Systems-BERECHNUNG: 3,4 kB/s,
MTU 23 ausreichend, gewünschtes BLE-Intervall 7,5–15 ms. Das PCBA-Profil und die Firmware müssen diese Limits
gemeinsam einhalten; stabile Windows-BLE-Verbindung ist erst am Gerät zu prüfen.

| Latenzabschnitt | Entwurfswert | Kennzeichnung / Grenze |
|---|---:|---|
| Sensor-ODR/FIFO | 0–5 ms Puffer bei 400 Hz und 2 Samples | BERECHNUNG |
| SPI-Lesen, Fusion, Kodierung und Thread | rund 0,34 ms | BERECHNUNG plus Laufzeitannahmen |
| Sensor bis Notification bereit | typisch 2,8 ms, worst case 5,3–6 ms | BERECHNUNG; Hardwaremessung NOT RUN |
| Verbindungsevent, Bridge, Browser und Anzeige | Gesamtsystem typisch 45 ms, worst case 113 ms | BERECHNUNG aus `requirements/budgets_output.md`; nicht gemessen |

## 3. Energie, Laden und Elektronik

Der PCB-Entwurf ist ein 4-Lagen-Board, 70 × 25 × 1,0 mm (QUELLE: KiCad-Layout, Stand INTERFACES r2). Er enthält
E73-Modul, ICM-45686, USB-C mit CC-/ESD-Beschaltung, TP4056-Lader mit NTC, Power-Path, XC6206-3,3-V-Regler,
LiPo-Schutz, Haupttaster, Schiebeschalter SW1, RGB-LED, Summer-Treiber, Vibrationsmotor-Pads, Akku-ADC und SWD-Pads.
Der Schiebeschalter soll die Versorgung über einen MOSFET hardwareseitig ein-/ausschalten; das ist ein Schaltplanentwurf,
nicht am Muster geprüft. Das Laden während des Spielens ist in SPICE simuliert.

**Akku:** 1S LiPo, Klasse 503040, 500 mAh mit Schutz (ANNAHME). Der Ladestrom ist 255 mA (BERECHNUNG aus TP4056
RPROG = 4,7 kΩ), also 0,51 C. Die angenommene Ladezeit liegt bei 2,5–3 h; Ladezeit, Temperatur und Verhalten beim
gleichzeitigen Spielen wurden nicht gemessen.

**Leistungsbudget hat zwei abweichende Modelle:** Systems rechnet 4,72 mA nominal und 6,13 mA mit Reserve, daraus
65 h rechnerisch. Das detaillierte PCB-Budget rechnet mit 8,1 mA und 49 h. Die Differenz kommt aus anderen Annahmen
zu Modul-/Funkstrom, LED und Summer-/Motortastgrad. Für Planung gilt konservativ 49 h (BERECHNUNG); beide Modelle
überschreiten rechnerisch das 6-h-Ziel. Verbrauch und Laufzeit am realen Gerät sind NOT RUN. Siehe
`requirements/BUDGETS.md` und `electronics/analysis/ANALYSE_V1.md`.

**Elektrische Simulation:** vier ngspice-Fälle sind im PCB-Handoff dokumentiert: Power-Path Ein/Aus, Einschaltstrom,
Summer/Motor und Batteriespannungsteiler. Das Modell ergibt beim Einschalten 6,75 A Spitzenstrom (SIMULATION,
PARTIAL; Soft-Start als V2-Änderung empfohlen), stabile 3V3 beim Power-Path sowie 2,097 V ADC bei 4,2 V Akku.
Die Modelle enthalten Annahmen und ersetzen keine Messung. ERC: 0 Fehler; DRC: 0 Fehler und 0 unverbundene Netze,
zwei begründete Silkscreen-Kantenwarnungen am USB-C (PASS auf Designregeln, keine Hardwareprüfung).

## 4. Beschaffung und Fertigungspaket

Die JLCPCB-BOM umfasst 35 Positionen; 12 sind als Extended markiert (QUELLE: `sourcing/BOM_V1.md`). Teilekosten
werden mit 20,33 USD pro Gerät angegeben. Der öffentlich abgefragte PCB-Preis für fünf Boards beträgt 9,15 USD
(QUELLE/Screenshot, 2026-11-08). Die geschätzten PCBA-Gesamtkosten für fünf Geräte betragen rund 213 USD oder
42,60 USD/Gerät (BERECHNUNG). Versand, Zoll-/Kuriergebühren, MWST-Behandlung und finale PCBA-Offerte sind teilweise
ANNAHMEN bzw. NOT RUN; eine Anmeldung oder ein Upload mit Nutzerkonto wurde nicht durchgeführt. PCBWay/Aisler-Vergleiche
sind keine vollständigen echten Angebote. Es wurde nichts bestellt oder bezahlt.

`manufacturing/pcba/` enthält Gerber-/Bohrdaten-ZIP, JLC-BOM, CPL und Renderings. Sieben CPL-Rotationen sind vor
Bestellung in der echten Anbieter-Vorschau zu kontrollieren. Die Fertigungsdaten sind erst nach Abschluss der
Mechanik-/PCB-Integrationsrunde als uploadbereit einzustufen.

## 5. Gehäuse, Ergonomie, Festigkeit und Druck

Das parametrische CAD sieht einen 170-mm-Griff mit tailliertem, spiegelsymmetrischem Superellipsen-Querschnitt,
Daumenmulde, Fingerwellen, Knauf, zweiteiliger Schale, USB-C-Ausschnitt, Tastenkappe, Lichtleiter und Akkufach vor.
Äquivalenter Griffdurchmesser rund 34 mm (BERECHNUNG), im angenommenen Power-Grip-Bereich 30–40 mm (QUELLE:
Pheasant/Haslegrave, *Bodyspace*, 2006; Verweis und Werte im Mechanik-Handoff). Reale Passform/Ergonomie wurde
nicht getestet.

Die glatte Schalenvariante wurde im FEM-Entwurf ausgewählt: mindestens Sicherheitsfaktor 3,0 im genannten
statischen Ersatzmodell, maximale berechnete Verformung 0,083 mm, Reaktionskräfte im Gleichgewicht (SIMULATION).
Der 1-m-Fall wird als statische Ersatzlast mit 2-mm-Bremsweg modelliert; dies ist kein dynamischer Falltest.
Die Tet10-Netzkonvergenz ist PARTIAL, weil die Vernetzung aus STL statt aus gültigem BREP erfolgte. Kollision zum
finalen Board-STEP und alle Gehäuse-Board-Schnittstellen sind bis zur Integrationsrunde offen.

Bambu-Studio-Slices für P2S, 0,4-mm-Düse, PETG, 0,20-mm-Profil: Gehäuse 3 h 56 min und 71,6 g inklusive Stützen,
plus Toleranzkörper 20 min/7,4 g (SIMULATION; `mechanics/print/`). Der tatsächliche Druck, Passprobe und Materialtest
sind NOT RUN. Slicer-Zeit ist keine Zusage für die reale Druckdauer.

## 6. Firmware und Programmierweg

Die Zephyr-Anwendung bildet den notwendigen Thingy-GATT-Teil ab, enthält Codec, 6-Achsen-Fusion, Bias-Kalibrierung,
ICM-45686-SPI-Treiber, Taster, RGB, Summer, Motor, Akku und Schlaf-/Wake-Logik (siehe
`management/handoffs/firmware-engineer/2026-11-07-v1.md`). 32/32 Host-Unit-Tests bestehen (MESSUNG im Testlauf);
Firmware-Image enthält 158 724 Byte Flash und 36 196 Byte RAM (MESSUNG im Build). Firmware und Pinout sind noch
nicht gemeinsam integriert; die Pinbelegung muss aus `electronics/PINOUT_V1.json` in DTS übernommen werden.

Vorgesehener Programmierweg: einmaliges SWD-Aufspielen des UF2-Bootloaders, danach UF2 über USB. Das User-Profil hat
keine SWD-Probe; im Firmware-Handoff werden eine Debug Probe und ein Pico mit Preisen aus einem Schweizer Händler
genannt (QUELLE, abgerufen 2026-11-08). Bestellung, Bootloader- und Firmware-Flash sind NICHT RUN. Das ICM-45686-
Datenblatt war nicht abrufbar; Registerwerte aus TDK-Referenzcode bleiben ein offener Verifikationspunkt.

## 7. Risiken, Grenzen und offene Entscheidungen

1. PCB r2 und Gehäuse sind noch nicht auf dieselben Taster-, LED-, Schalter-, Bohrungs-, Rand- und Steckerdaten abgestimmt.
2. Firmware-Pins, BLE-Integration, IMU-Registerwerte und Bootloader auf tatsächlicher E73-Hardware sind nicht verifiziert.
3. Versorgung, Laufzeit, Laden, thermisches Verhalten, Funkreichweite, Latenz, Übersteuerung und 100-Hz-Stabilität sind nicht gemessen.
4. FEM-Netzkonvergenz und CAD-Kollisionen mit dem finalen Board-STEP sind offen.
5. PCBA-Versand/Endpreis und Komponentenrotationen benötigen eine reale Anbieterprüfung; es wurde nichts bestellt.
6. CE/RED, FCC, UN38.3, EMV und Produktzulassung sind ausdrücklich ausserhalb dieses Prototyp-Entwurfs.

## 8. Validierungsplan am ersten Muster

Nach Nutzerfreigabe der Bestellung: Wareneingang und Bauteilrevisionen dokumentieren; strombegrenzte Erstinbetriebnahme;
Polarität, Kurzschluss und Lade-NTC prüfen; Ruhestrom Aus/Ein und Stromaufnahme je Betriebsart messen; Ladeprofil und
Temperatur protokollieren; Firmware flashen und BLE-Profil mit Bridge/Android prüfen; 100-Hz-Lauf für mindestens
5 Minuten, Latenz und Reichweite messen; Schwung-Sättigung und Orientierung loggen; Toleranzkörper drucken und Passungen
prüfen; danach Gehäuse montieren und Fallversuch aus 1 m auf Holz planen. Keine dieser Hardwareprüfungen gilt als PASS,
bevor Rohdaten, Messaufbau und Ergebnis abgelegt sind.

## Quellen und reproduzierbare Belege

- Repo-Protokoll und Spiele: `../../../../docs/protocol.md`, `../../../../docs/TENNIS.md`, `../../../../docs/SKI.md`
- Architektur, IMU-Quellen und berechnete Budgets: `../../requirements/ARCHITECTURE.md`, `../../requirements/BUDGETS.md`
- PCB-Schaltplan-/SPICE-Analyse und Fertigung: `../../electronics/analysis/ANALYSE_V1.md`, `../../electronics/spice/`,
  `../../sourcing/BOM_V1.md`, `../../sourcing/ANGEBOTE_V1.md`
- Mechanik-/FEM-/Slice-Rohdaten: `../../management/handoffs/mechanical-engineer/2026-11-07-v1.md`,
  `../../mechanics/fem/fem_results.json`, `../../mechanics/print/`
- Firmware-Build/Test: `../../management/handoffs/firmware-engineer/2026-11-07-v1.md`, `../../logs/fw-v1/`

