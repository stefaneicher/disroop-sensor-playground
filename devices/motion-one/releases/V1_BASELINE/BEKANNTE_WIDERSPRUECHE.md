# Bekannte Widersprüche und offene Befunde (Release 1, V1 Baseline)

| # | Widerspruch | Stand | Label |
|---|---|---|---|
| 1 | `mechanics/assembly_stl/pcb_r4.stl` (SHA 19681e13…): Mechanik misst 72 Körper, davon 38 dicht; PCB-Handoff (`logs/pcb-r4d/pcb_r4_stl_check.json`) meldet 40/40 dicht. Zählmethoden unterschiedlich, ungeklärt. U1/SW1/J1 sind zudem nur Hüllquader. | offen, PCB-Engineer nennt Zählmethode | FAIL/ungeklärt (Mechanik-Gesamtlabel PARTIAL) |
| 2 | Wandstärke: Voxel-EDT (Pitch 0.4 mm) min 0.8 mm < Ziel 1.0 mm (Oberschale 313/41267, Unterschale 130/46335 Medialpunkte <1 mm). Auflösung grob, ggf. Artefakt. | offen: Pitch 0.2 oder `LIP_D0`/Nutwand erhöhen | FAIL gegen 1.0 mm |
| 3 | `zephyr.hex`: Arbeitskopie CRLF (`core.autocrlf=true`), Git-Index LF. SHA-256 der Arbeitskopie cee6809b… = `logs/fw-pinmap/zephyr.sha256`; LF-Checkout liefert anderen Hash. UF2/BIN (binär) sind unkritisch. | dokumentiert | Hinweis |
| 4 | „SW2“ (Auftrag) vs. PINOUT: nur `BTN` (P0.28); SW1 ist der Schiebeschalter (kein GPIO). Firmware wertet `BTN` als gemeinten Taster. | Frage an PCB-Engineer offen | ANNAHME |
| 5 | Laufzeit Spielmodus 49 h (PCB) vs. 65 h (Systems), unterschiedliche Annahmen; 49 h konservativ. | dokumentiert | BERECHNUNG, NOT RUN |
| 6 | Lippenspiel min 0.191 mm unter Soll 0.25 mm (p5 0.252). | Passprobe nötig | SIMULATION |
| 7 | `metrics.json` firmware_* zeigt noch V1 (32 Tests, 158724 B); aktuell 69/0, FLASH 161100 B, RAM 37604 B. | im Bericht korrigiert | MESSUNG |
| 8 | Die UI-Platine an J5 ist eine optionale Erweiterungsplatine, nicht Teil des Geräts r4 und im Gehäuse r4 nicht vorgesehen. | dokumentiert | QUELLE: Schaltplan r4-C, UI-Seite |
| 9 | Bei der hierarchischen Schaltplanintegration wurden auf den PCBs 54 Netze der Hauptplatine bzw. 12 Netze der UI-Platine explizit umbenannt; die Geometrie und elektrischen Pin-Gruppen sind unverändert. Netzklassenmuster und Schaltplan-Verknüpfungen wurden nachgeführt. | Parität 0, offene Verbindungen 0; Beleg pcb_namespace_migration.json | BERECHNUNG, PASS |
