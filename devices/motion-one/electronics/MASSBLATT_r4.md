# Massblatt Motion One PCB r4 + Bedienplatine (2026-11-08, pcb-engineer)

Alle Masse in mm, QUELLE Layout (`export/heights.json`, KiCad r4), sofern nicht anders gekennzeichnet.

## Hauptboard motion-one r4
- Umriss 70 x 25 x 1.0 (4 Lagen); Ursprung Ecke unten links (INTERFACES-Koordinaten, y_if = 25 - y_KiCad). Kopfende x=70 Ecken R2; Griffende Ausklinkungen x 0..10, y 0..5 und 20..25.
- Antennen-Freizone: x >= 66.2 bis 70, alle Lagen; kein Metall/Akku/Motor/Schraube <= 5 mm (QUELLE INTERFACES).
- Befestigung: H1 (42.4; 12.7), H2 (58.5; 22.8), NPTH 2.2 fuer M2, bauteilfreier Ring D 4.4. Schraubenkopf max. D 4.0 (ANNAHME DIN 912 M2 = 3.8).
- Randstreifen 1.5 bauteilfrei an y=0/y=25, Ausnahmen SW1 (y=25), J5 (y=0).
- Stecker: J1 USB-C (3.5; 12.5) H 3.26, Steckrichtung -x; J2 Akku JST-SH 2p (14.5; 5.1) H 2.9; **J5 Erweiterung JST-SH 8p (58.5; 3.35) H 2.9, Steckoeffnung zur Kante y=0** -> Gehaeuse-Durchbruch ca. 11 x 4 (ANNAHME inkl. Spiel), Pin 1 bei kleinerem x (PCB-Ansicht oben, KiCad-Footprint-Orientierung pruefen).
- Bauhoehen oben: SW1 3.5 (20.0; 23.2), U1 E73 3.0 (60.6; 13.5), J5/J2 2.9, BZ1 2.0, SW2 1.5, D4 0.55. Unterseite: 0.
- J5-Belegung: 1 3V3 (max. 10 mA), 2 EXT1 AIN5, 3 EXT2 AIN6, 4 EXT3 AIN7, 5 EXT4 P0.03/AIN1, 6 EXT5 P1.11, 7 RSV NC, 8 GND.

## Bedienplatine motion-one-ui
- Umriss 41 x 27 x 1.6, Ecken R2, 2 Lagen; Ursprung Ecke oben links (KiCad, y nach unten).
- Loecher M2 NPTH 2.2: H1 (37.5; 17.0), H2 (24.0; 23.5).
- Stick SW1 Alps RKJXV1224005 Mitte (12.0; 13.5), THT; Hebelhoehe/Freiraum gemaess Alps-Datenblatt (nicht hier verifiziert, ANNAHME: Deckel-Ausschnitt D >= 12).
- Touch-Flaeche E1 10 x 10 auf F.Cu, Mitte (32.0; 8.0); Gehaeusewand darueber <= 2 mm Kunststoff, kein Metall (ANNAHME).
- J1 JST-SH 8p (33.0; 23.4) H 2.9, Steckoeffnung zur Kante y=27.
- Kabel: JST-SH 8p 1:1 (Pin 1 auf Pin 1); Kabelkonfektion je nach Lage der Platinen pruefen (gleichsinnig vs. gekreuzt).
- STEP: `electronics/kicad/motion-one-ui/export/motion-one-ui-board.step`; Hauptboard: `electronics/kicad/motion-one/export/motion-one-board.step`.
