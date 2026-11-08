# Sicherheitsklasse und Gefährdungen durch Software

Das ist **keine Risikoanalyse nach ISO 14971**, sondern die Vorarbeit dafür: Gefährdungen, die man beim Lesen des Codes sieht, mit der
Kontrolle, die schon im Code steckt, und der Kontrolle, die fehlt. Schweregrade und Wahrscheinlichkeiten festzulegen ist Sache des
Risikomanagement-Teams ({GAP-18}). Alle Folgen unten beruhen auf der **angenommenen** Zweckbestimmung (OPEN-01).

## 1. Sicherheitsklasse

IEC 62304 (Abschnitt 4.3) legt die Klasse nach der schlimmsten möglichen Folge fest, **nachdem** Risikokontrollen ausserhalb der Software
berücksichtigt sind:

- A: keine Gesundheitsschädigung möglich
- B: Schädigung möglich, aber nicht schwer
- C: Tod oder schwere Schädigung möglich

**Setzung:** Klasse C für die gesamte Firmware (Auftrag des Users). Begründung für die Dokumentation: Das Gerät hat einen Li-Po-Akku mit Lade-
und Entladesteuerung, treibt Motor und Summer, und liefert Messdaten, auf deren Basis eine Fachperson Übungen steuern könnte.
Eine ehrliche Einstufung kann tiefer ausfallen (B), wenn die Risikoanalyse zeigt, dass Hardware (Zellschutz, Strombegrenzung) und
Auswertesoftware die Folgen abfangen. Bis dahin gilt: lieber C dokumentieren als zu tief einstufen.
Die Klasse einzelner Einheiten zu senken verlangt eine Trennung nach 5.3.5, siehe {GAP-06}.

## 2. Gefährdungen

Spalten: *Kontrolle im Code* = was heute schon schützt (mit Link) · *Fehlt* = was ein Audit verlangen würde.

| ID | Gefährdung (Ursache in der Software) | Mögliche Folge (ANNAHME) | Kontrolle im Code | Fehlt |
|---|---|---|---|---|
| <a id="HAZ-01"></a>**HAZ-01** | **Falsche Lage- oder Bewegungsdaten**: Gyro-Bias falsch geschätzt (Ruheschwelle 3 °/s), Sättigung, Filterdrift | Fachperson oder Software beurteilt Bewegung falsch, Übung wird falsch dosiert | Sättigungs- und `fusion_ok`-Flags in Raw-HR ({SRS-035}), Bias-Test ({SRS-025}), Sättigungserkennung ({SRS-023}) | Plausibilitätsprüfung der Bias-Schätzung, Obergrenze für den Bias, Genauigkeitsnachweis am Gerät (NOT RUN) |
| <a id="HAZ-02"></a>**HAZ-02** | **Stiller Sensorausfall**: IMU-Init oder SPI-Lesefehler werden nur geloggt, das Gerät sendet weiter Advertising, aber keine Daten | Auswertung zeigt „keine Bewegung“ statt „Gerät defekt“ | Fehlercodes im Treiber ({SRS-021}) | Fehleranzeige (LED/BLE), Zähler für Lesefehler, Abschaltung ({SRS-091}) |
| <a id="HAZ-03"></a>**HAZ-03** | **Firmware hängt** (Deadlock, Endlosschleife, Stapelüberlauf) | Gerät reagiert nicht mehr, Motor oder Summer bleibt aktiv | Stackschutz durch MPU, Timer beenden Summer und Motor ({SRS-014}, {SRS-043}) | Watchdog, definierter sicherer Zustand ({SRS-090}), Stapelnutzung gemessen |
| <a id="HAZ-04"></a>**HAZ-04** | **Unbefugter BLE-Zugriff**: keine Kopplung, keine Verschlüsselung; jeder in Reichweite schreibt LED, Ton, Konfiguration | Störung der Sitzung, Datenabgriff, im schlimmsten Fall Manipulation der Messkonfiguration | Eine Verbindung gleichzeitig ({SRS-002}), Wertebereiche geprüft ({SRS-010}) | Authentifizierung, Verschlüsselung, Bedrohungsmodell, signierte Updates ({SRS-092}) |
| <a id="HAZ-05"></a>**HAZ-05** | **Akku-Tiefentladung oder falsche Akkuanzeige**: Messung fällt aus (Wert 0 wird ignoriert), Kurve ist eine Annahme | Akku schädigt sich, falsche Restladung, Gerät schaltet unerwartet ab | Messung mit sicherem Abschalten des Teilers ({SRS-050}), Abschaltung unter 3300 mV ({SRS-052}) | Behandlung wiederholter Messfehler, Messung der Kurve am Akku, Nachweis des Zellschutzes (Hardware) |
| <a id="HAZ-06"></a>**HAZ-06** | **Überlast durch Motor und Summer** an USB (Stromgrenze) oder Motorüberspannung | Spannungseinbruch, Überhitzung, Schaden am USB-Host | Tastgrad für ≤ 3,0 V, Arbitrierung, Spitzenstromprüfung ({SRS-043}, {SRS-044}) | Messung am Gerät (NOT RUN) |
| <a id="HAZ-07"></a>**HAZ-07** | **Gerät schaltet nicht ab oder wacht unerwartet auf** | Akku läuft leer, Funk unbemerkt aktiv | Ruheabschaltung 60 s, Wake-Quellen Taster und Bewegung ({SRS-053}) | Messung des Ruhestroms (NOT RUN) |
| <a id="HAZ-08"></a>**HAZ-08** | **Ungültige Konfiguration** durch Client (Bereichsüberschreitung, falsche Länge) | Unerwartetes Verhalten, falsche Rate | Parser prüfen Länge und Bereich ({SRS-010}, {SRS-013}, {SRS-015}) | Fuzz- oder Grenzwerttests für die Adapter-Handler |
| <a id="HAZ-09"></a>**HAZ-09** | **Verlorene Notifications**: Rückgabewert von `bt_gatt_notify` wird ignoriert, Dezimierung bei Überlast | Lücken im Datenstrom werden nicht bemerkt | Sample-Zähler im Raw-HR-Kanal ({SRS-035}), Budget ≤ 200/s ({SRS-032}) | Fehlerzähler im Gerät, Meldung an den Client ({SRS-094}) |
| <a id="HAZ-10"></a>**HAZ-10** | **Keine Rückverfolgbarkeit der Firmware**: Version und Geräte-ID nicht auslesbar | Fehlerberichte nicht zuordenbar, Rückruf nicht eingrenzbar | Git-Verlauf, SHA-256 der Images in `smoke.sh` | Version im Gerät, UDI, Release-Stand ({SRS-093}) |

## 3. Wirkung auf die Entwicklung (Klasse C)

- Jede Risikokontrolle in der Software wird zur **Anforderung** und muss **verifiziert** werden (IEC 62304, Abschnitt 7.2 und 7.3).
- Jede Änderung braucht eine **Auswirkungsanalyse** auf Risiken (7.4).
- Die Analyse prüft auch, welche **SOUP** (siehe [SOUP](05_SOUP.md)) zu einer Gefährdung beitragen kann.
