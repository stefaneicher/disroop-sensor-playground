# Handoff systems-engineer – V1 Anforderungen, Architektur, Budgets (2026-11-07)

## Status
PARTIAL – Dokumente, Berechnungen und Vorschläge sind fertig. Alle Hardware-Verifikationen sind NOT RUN. INTERFACES r1 ist ein Vorschlag zur Abstimmung.

## Bearbeitete Anforderungen
REQ-001…010 (Sensorik), REQ-020…027 (Kompatibilität), REQ-030…034 (Funk/Latenz), REQ-040…048 (Energie), REQ-050…060 (Bedienung/Mechanik/Sicherheit/Wartung).

## Eingangsrevisionen
REQUIREMENTS r0 (4 Zeilen Startwerte) · INTERFACES r0 · PROMPT_1 §0/§2/§6/§7 · docs/protocol.md, TENNIS.md, SKI.md, JOURNAL.md auf dem aktuellen Arbeitsstand (nicht committet).

## Ausgabedateien (Pfad + SHA-256, relativ zu devices/motion-one/)
- `332cdec0f2f21d7f5ae2dc866221366a9077dbb69c9e6a3b609c5db67d0f91e3` management/REQUIREMENTS.md
- `bf461bce42d97bbefb28b018b0b51ea61285eaa7489abd825640c108f53f9a47` management/INTERFACES.json
- `22f3500ee78e0090a2471850343fdd0deb0d579dd53a87fd69d56339cd27054c` requirements/ARCHITECTURE.md
- `d2d33ca4541d1f820269df06139da5f059c7f21ecd5540d9e78fbb52660ca33f` requirements/BUDGETS.md
- `72a196b53280c83344e3c380c2d42df608ecef8afbc2c8b0f584c37ae347ae1a` requirements/budgets_output.md
- `973fea843c68493561269a3c37f77935306ca4db4cd6110701c4847bbbd7ef48` requirements/stock_jlcpcb_2026-11-07.csv
- `cbbb123fa5b33ae8d2c919d8c8063896173c7e4b481a757b737c803dad16bf8b` requirements/CHECKLIST_appearance.md
- `dd12c618bd06e3cc48e29306f96153dcb9887d574be54cc654544164093ab4da` requirements/CHECKLIST_code_firmware.md
- `161f3c0d3c32b671a451a71a2f8926ca8bf3c6bd0a01ee521fd61ca7e268eaed` requirements/CHECKLIST_components.md
- `ed1be1e077e08e0e736e43a4353d194c5b865a9e356055e84467d7aa504fda3e` requirements/CHECKLIST_docs.md
- `a81806bcbdad4b492a5a8a8839b7533d16e1b3f3ea28600e965a66612c01bd86` requirements/CHECKLIST_ergonomics.md
- `c72a8156b9ea200694eae1c6d5db86a738bdffdbf2bcfc6c4af6d05eb5467fd5` requirements/CHECKLIST_pcb.md
- `5c830d95e5edfde80656bae3518c28e2e2bea4f213e014cd683ce85ede93c58c` requirements/CHECKLIST_print3d.md
- `f6a7e081bc14abbb202d612e9173bc2fcbc84d894c67e55ab3322f8b0f336329` requirements/CHECKLIST_schema.md
- `e3f407333c8db9e25f028907e60f38ebf357540e99cd4ad50ba7471a9c3da3e9` scripts/systems/budgets.py
- `cab88143ff2ba0ff5dd6dcddd9a286af309bd8a5897c0184963262d1d311dc85` scripts/systems/jlc_stock.py

## Tatsächlich durchgeführte Prüfungen
- `./project hw run "python3 devices/motion-one/scripts/systems/budgets.py"`: Python 3.12.3, Exit 0, Ausgabe in requirements/budgets_output.md – PASS (nur Berechnung)
- `python3 -m json.tool management/INTERFACES.json`: gültiges JSON – PASS
- JLCPCB-Bestandsabfrage mit scripts/systems/jlc_stock.py (2026-11-07 ~22:25 UTC) – PASS (Momentaufnahme)
- Webabrufe: Europe PMC (Fleisig), Frontiers (van Trigt), TDK ICM-45686, Bosch BMI270/BMI323 – PASS. ST-Seiten: Timeout → NOT RUN. MDPI und Nordic: HTTP 403 → NOT RUN.
- Zitierte Repo-Zeilen mit sed/grep nachgeprüft – PASS
- Hardware-Messungen – NOT RUN

## Zahlen (für metrics.json)
| Name | Wert | Einheit | Kennz. | Beleg |
|---|---|---|---|---|
| gyro_range_req | 4000 | °/s | BERECHNUNG | budgets_output.md §1, Q-FLEISIG, Q-TRIGT |
| accel_range_req | 32 | g | BERECHNUNG | budgets_output.md §2 |
| peak_wrist_flexion_serve | 1950 | °/s | QUELLE | Fleisig 2003 |
| peak_upperarm_serve_mean | 3206.6 | °/s | QUELLE | van Trigt 2025 |
| gyro_noise_rms_100hz | 0.034 | °/s | BERECHNUNG | budgets_output.md §3 |
| tilt_noise_1sigma | 0.036 | ° | BERECHNUNG | budgets_output.md §3 |
| yaw_drift_60s_worst | 2.73 | ° | BERECHNUNG | budgets_output.md §3 (inkl. ANNAHMEN) |
| latency_device_typ / worst | 2.8 / 6.0 | ms | BERECHNUNG | budgets_output.md §5 |
| latency_screen_typ / worst | 45 / 113 | ms | BERECHNUNG | budgets_output.md §5 |
| current_game_mode | 4.72 (6.13 mit ×1,3) | mA | BERECHNUNG | budgets_output.md §6 |
| runtime_game_500mAh | 65 | h | BERECHNUNG | budgets_output.md §6 |
| battery_min_for_6h | 46 | mAh | BERECHNUNG | budgets_output.md §6 |
| notifications_game | 200 | 1/s | QUELLE | JOURNAL.md:21 |
| ble_payload_game | 3.4 | kB/s | BERECHNUNG | budgets_output.md §4 |
| stock_icm45686 | 3091 | Stk | QUELLE | stock_jlcpcb_2026-11-07.csv |
| stock_e73_c356849 | 322 | Stk | QUELLE | stock_jlcpcb_2026-11-07.csv |

## Annahmen
- Hebelarme bei ω²r, ΔT 5 K, Rest-Bias 0,02 °/s, Filterlaufzeit, Stack-, Browser- und Bildschirmlatenz, Tastgrade von LED, Summer und Motor, Regler-Ruhestrom (alle im Skript markiert).
- Masse ≤ 120 g, Board 70×25 mm, Akku 500 mAh (503040).
- UUID EF680480 ist frei.
- Das E73-Modul kommt ohne Bootloader.

## Fehler
- ST-Datenblätter waren nicht abrufbar. Die Werte für LSM6DSV16X, LSM6DSO32 und LSM6DSV320X sowie für ICM-42688-P sind unbestätigt.
- Die FIFO-Grössen von ICM-45686 und BMI270 stammen nur aus der Websuche.
- Die Funkzulassung des E73-Moduls (FCC/CE/IC) ist nur über eine Sekundärquelle belegt.
- Die nRF52840-Stromwerte stammen aus einem Spiegel des Product Specification (Nordic: HTTP 403).

## Offene Entscheide/Fragen
1. Bootloader-Erstflash ohne SWD-Probe: Der User kauft eine günstige Probe, oder ein Dienstleister bzw. vorprogrammierte Module übernehmen das (firmware-engineer/User).
2. Abstimmung von INTERFACES r1 mit pcb-engineer und Mechanik: Umriss, Antennen-Keep-out, Akkulage, Motorposition.
3. Bridge-Change: Soll Raw-HR EF680480 im Spielmodus Raw ersetzen? Die Grenze von 200 Notifications/s bleibt.
4. Zweitquelle LSM6DSV16X (nur ±16 g): Footprint und Datenblatt prüft pcb-engineer/components-engineer.
5. Rüstgebühren für Extended-Teile und Gesamtkosten bei 5 Stück: NOT RUN, zu klären durch pcb-engineer.

## Nächste Schritte
- pcb-engineer: Schaltplan und Layout nach ARCHITECTURE.md §3 und INTERFACES r1; Datenblatt-Keep-out des E73; Bestand erneut prüfen.
- firmware-engineer: Host-Tests der Kodierer gegen die Bridge-Decoder (REQ-022…025); Bootloader-Konzept.
- Mechanik/Ergonomie: Griffmasse prüfen, Rückmeldung für INTERFACES r2.
