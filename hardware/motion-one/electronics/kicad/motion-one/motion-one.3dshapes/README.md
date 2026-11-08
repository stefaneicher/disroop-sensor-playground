# 3D-Modelle Motion One (Board r3)

Quelle: LCSC/EasyEDA-3D-Bibliothek, geladen am 2026-11-08 mit `easyeda2kicad` v1.0.1 (pip, im Container disroop-motion-one-tools),
`easyeda2kicad --3d --lcsc_id=<C-Nr>`. Lizenz: keine explizite Lizenz angegeben; Nutzung gemaess EasyEDA/LCSC-Nutzungsbedingungen
(ANNAHME: interne Nutzung fuer Visualisierung/Kollisionspruefung zulaessig; vor oeffentlicher Weitergabe pruefen).

| Footprint | LCSC | Datei | Offset (x y z) / Rot z | Hoehe ueber PCB |
|---|---|---|---|---|
| motion-one:E73-2G4M08S1C | C356849 | WIRELM-SMD_L18.0-W13.0-H3.0-E73-2G4M08S1C.step | 0 0 0 / 0 | 3.0 mm |
| Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12 | C165948 | USB-C_SMD-TYPE-C-31-M-12_1.step | 0 1.39 0 / 180 | 3.25 mm |
| Button_Switch_SMD:SW_Push_1P1T_XKB_TS-1187A | C318884 | SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5.step | 0 0 0 / 0 | 1.5 mm |
| Button_Switch_SMD:SW_SPDT_Shouhan_MSK12C02 | C431540 | SW-SMD_3P-L6.6-W2.7-LS7.8-P1.50.step | 0 0.55 0 / 180 | 1.51 mm |

Offsets: BERECHNUNG aus Vergleich EasyEDA-Footprint (Modellursprung) gegen KiCad-Footprint (Pads/Fab), Sitz per `kicad-cli pcb render` geprueft.
