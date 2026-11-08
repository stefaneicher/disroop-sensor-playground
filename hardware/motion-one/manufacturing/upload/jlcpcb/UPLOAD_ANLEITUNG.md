# Upload-Anleitung JLCPCB + JLC3DP – Motion One Board r3 (2026-11-08)

Nichts bestellen ohne Freigabe durch den Manager. Login und Upload macht nur der User. **Die Druckteile `jlc3dp_stl/VORLAEUFIG_*` sind vorläufig. Vor dem Upload müssen sie durch Gehäuse r3 final ersetzt werden (Fügestelle, USB-C-Aussparung).**

## A Leiterplatte + Bestückung (jlcpcb.com → „Order now“)
1. Datei `motion-one_gerber_r3.zip` hochladen.
2. Optionen einstellen:
   - Base Material: FR-4
   - Layers: **4**
   - Dimension: 70 x 25 mm (prüfen)
   - PCB Qty: **5** (bzw. 10)
   - PCB Thickness: **1.0 mm**
   - Surface Finish: **HASL (with lead)** oder LeadFree HASL
   - Farbe: grün
   - Remove Order Number: „Specify a location“ oder gegen Aufpreis entfernen
   - Impedanzkontrolle/Stackup: Standard JLC04101H-7628
3. „PCB Assembly“ einschalten:
   - PCBA Type: **Economic**
   - Assembly Side: **Top**
   - PCBA Qty: 5 (bzw. 10)
   - Tooling holes: „Added by JLCPCB“
4. „Next“ wählen. Danach hochladen:
   - BOM: `BOM_motion-one_JLC.csv`
   - CPL: `CPL_motion-one_JLC.csv`
5. Teileliste prüfen:
   - Alle 35 Positionen müssen „matched“ sein.
   - U1 **C356849** (E73) und U6 **C22459454** (ICM-45686) müssen Bestand haben.
   - J2 muss **C160402** sein.
   - J3, J4 und TP1–6 erscheinen nicht oder als „do not place“. Das ist korrekt.
6. Prüfpunkte in der Vorschau (Component Placement):
   - **J2 (JST-SH, bei x 14.5 mm, Kopfende links unten):** Die Steckeröffnung zeigt zur langen Kante y = 0 (Griffunterseite). Die zwei kleinen Signalpads liegen zur Platinenmitte, die beiden Halte-Lötfahnen auf den grossen Pads. Die CPL-Rotation ist 180° (ANNAHME). Falls die Lage falsch ist, J2 in der Vorschau drehen und den neuen Winkel notieren.
   - U1 E73: Antenne zeigt nach rechts zur Kante x = 70 (Keep-out frei).
   - U6 ICM-45686: Pin-1-Punkt stimmt mit der Pin-1-Markierung überein.
   - Polaritäten prüfen: D1–D3, D5, D4 (RGB), U2–U5, Q1–Q7.
   - J1 USB-C: steht an der Kante x = 0 ca. 0.6 mm über (beabsichtigt).
   - SW1: Der Hebel ragt über die Kante y = 25 (beabsichtigt).
7. Nicht auf „Save to cart/Pay“ klicken, wenn keine Freigabe vorliegt.

## B 3D-Druck (jlc3dp.com → „Instant Quote“, mit dem gleichen Konto)
1. Folgende Dateien aus `jlc3dp_stl/` hochladen. Nur finale Dateien r3 verwenden.
   - `oberschale.stl`
   - `unterschale_glatt.stl`
   - `tastenkappe.stl`
   - `lichtleiter.stl`
2. Material einstellen:
   - Schalen und Tastenkappe: **SLS PA12 (z. B. 3201PA-F), schwarz gefärbt**, oder MJF PA12 grau/schwarz. PETG ist bei JLC3DP nicht gelistet.
   - Lichtleiter: **SLA transparentes Harz**, falls angeboten. Sonst SLA weiss.
3. Stückzahl: je Teil 5 (bzw. 10).
4. Oberfläche: Standard (unbehandelt).
5. Gemeinsamen Versand mit der PCB-Bestellung wählen (Option „combine/ship together“, falls angeboten).

## C Was als Screenshot an den Manager zurückgeht
1. PCB-Optionen mit Preis.
2. BOM-Abgleich (alle Teile, Bestand, Extended-Gebühr).
3. Vorschau oben mit Zoom auf J2, U1 und U6.
4. JLC3DP-Angebot je Teil (Material, Preis, Lieferzeit).
5. Warenkorb-Total mit Versandart und Versandpreis nach CH, **ohne zu bezahlen**.
