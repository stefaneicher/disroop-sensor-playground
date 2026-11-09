# Pruefbelege r4 (Disroop Motion One)

Stand 2026-11-09. Pfade relativ zu devices/motion-one/. Inhalte wurden gelesen (nicht nur Dateiexistenz). Reale Hardware: NOT RUN.

| Beleg | Ergebnis (1 Zeile) | Label |
|---|---|---|
| ERC Hauptboard (logs/pcb-r4d/erc.json) | 0 Verletzungen, KiCad 10.0.8, 4 Pruefungen ignoriert | MESSUNG |
| ERC UI-Board (logs/pcb-r4c/ui_erc.json) | 0 Verletzungen, 4 Pruefungen ignoriert | MESSUNG |
| DRC Hauptboard (logs/pcb-r4c/motion-one_drc_pin1.json) | 2 Warnungen (silk_edge_clearance), 0 unverbundene, 0 Schaltplan-Paritaet | MESSUNG |
| DRC UI-Board (logs/pcb-r4c/ui_drc.json) | 0 Verletzungen, 0 unverbundene | MESSUNG |
| SPICE Powerpath | VSYS USB 4.875 V, VSYS Akku 3.700 V, Min. 3V3 bei Motor 3.299 V, Akkustrom USB ~0 A | SIMULATION |
| SPICE Inrush | Spitzenstrom 6.75 A, 3V3 nach 0.16 ms | SIMULATION |
| SPICE VBAT-Teiler | ADC 2.097 V eingeschwungen (24 ms), Leck aus 9.4e-12 A | SIMULATION |
| SPICE Buzzer/Motor | 3V3 min 3.073 V, VSW min 3.465 V | SIMULATION |
| SPICE Worst-Case 3.3 / 3.5 V | 3V3 min 2.801 V bzw. 2.986 V, Akku-Spitze 0.128 / 0.136 A | SIMULATION |
| Lippenspiel (logs/lip_clearance_r4.json) | min 0.191 mm, P5 0.252 mm, Soll 0.25 mm, n=8476 | SIMULATION |
| Layout-PDF/SVG, Schaltplan-PDF | neu exportiert (Hauptboard 9 Seiten, UI), Titelblock ergaenzt | MESSUNG (kicad-cli) |

## Auffaelligkeiten
- DRC: 2 Silk-ueber-Kante-Warnungen am Hauptboard (kosmetisch, nicht begruendet geschlossen).
- ERC/DRC-Laeufe stammen aus r4c/r4d, nicht aus einem Neulauf nach dem Titelblock-Zusatz (Titelblock aendert keine Netze).
- Worst-Case 3.3 V: 3V3-Einbruch auf 2.80 V liegt unter 3.0 V; nur gegen die Mindestspannung der Bauteile pruefen (offen).
- Inrush-Spitze 6.75 A (SIMULATION) gegen Stromgrenze von Quelle/Schalter pruefen.
- Lippenspiel-Minimum ist Stichprobe, Untergrenze unsicher; lip_clearance_r4.json stammt aus final_checks_r4.json (Skript nicht neu gelaufen).
- Schaltplan: Bauteile in Rasterform auf A2 verteilt, Beschriftung klein; Netze ueber Labels, keine Verbindungslinien. Lesbar nur gezoomt (Vektor-PDF).
