# Angebotsvergleich V1 – Motion One PCBA + 3D-Druck (pcb-engineer, Board r3, 2026-11-08)

Board r3: 4 Lagen, 70 x 25 mm, 1.0 mm, HASL, einseitig bestückt, 59 Platzierungen, ca. 240 Lötstellen (BERECHNUNG aus CPL), 35 BOM-Positionen, davon 12 Extended. J2 = JST-SH SM02B-SRSS-TB **C160402** (69 101 Stk, 0.1322 USD, QUELLE JLC-API 2026-11-08T10:39Z, https://jlcpcb.com/partdetail/C160402). Teile 20.24 USD/Gerät (BERECHNUNG, `sourcing/BOM_V1.md`).
Druckteile (Gehäuse r3 **vorläufig**, Fügestelle/USB-C-Aussparung in Arbeit): Oberschale 19.35 cm³, Unterschale glatt 24.92 cm³, Tastenkappe 0.54 cm³, Lichtleiter 0.09 cm³ = **44.9 cm³/Satz** (BERECHNUNG trimesh aus `mechanics/print/*.stl`, alle wasserdicht; Bauraum max. 170 x 44 x 17 mm).
Kennzeichnung: QUELLE (URL, Datum), BERECHNUNG, ANNAHME, NOT RUN. 1 USD ≈ 0.80 CHF (ANNAHME). MWST CH 8.1 % (QUELLE ESTV). Industriezoll CH = 0 seit 1.1.2024 (QUELLE allgemein). Verzollungsgebühr Kurier ≈ 18 USD (ANNAHME). Alle Preise ohne Login: Endpreise erst nach Upload durch den User (NOT RUN).

## 1 Vergleichstabelle

| Anbieter | Land | PCB+PCBA | 3D-Druck | gleicher Hersteller | Teile ab Lager | Total 5 Stk inkl. Versand+MWST CH | Total 10 Stk | Lieferzeit | Kennzeichnung |
|---|---|---|---|---|---|---|---|---|---|
| **JLCPCB + JLC3DP** | CN | ja (Economic ≤ 30 Stk) | ja: SLS/MJF PA12, SLA-Harz, FDM (ABS/PLA/ASA, PETG nicht gelistet) | **ja** (ein Konto, gemeinsamer Versand möglich) | **ja**, alle 35 Pos. inkl. E73 (319 Stk) und ICM-45686 (3061 Stk) | **≈ 297 USD ≈ 238 CHF (≈ 48 CHF/Gerät)** | **≈ 498 USD ≈ 398 CHF (≈ 40 CHF/Gerät)** | ≈ 10–14 d | PCBA QUELLE/BERECHNUNG, 3D ANNAHME, Versand ANNAHME |
| PCBWay (inkl. 3D-Druck) | CN | ja (Turnkey) | ja: SLS/MJF PA12, SLA, FDM | ja | teilweise; E73/ICM-45686 Beschaffung durch PCBWay (Marktpreis) oder Beistellung | ≈ 330–480 USD | ≈ 520–750 USD | ≈ 3 Wochen | ANNAHME (Rechner nur nach Upload, NOT RUN) |
| Aisler | DE/NL | ja (Prototyp-PCBA) | nein (separater EU-Druckdienst nötig) | nein | teilweise, E73/ICM-45686 Beistellung wahrscheinlich | ≈ 330–500 EUR + 3D separat | NOT RUN | 7–10 AT | ANNAHME; Preis-/Assembly-Seiten 2026-11-08 404, Rechner nur nach Upload |
| Eurocircuits | BE/HU/DE | ja (PCB proto + Assembly) | nein | nein | teilweise (Beistellung/Bestellung über Partner) | ≈ 400–600 EUR + 3D separat | NOT RUN | 10–15 AT | ANNAHME; https://www.eurocircuits.com/pcb-assembly/ 2026-11-08 404, Rechner NOT RUN |
| **Schaffner GmbH (PCBA) + Swiss3D (Druck)** | **CH** | ja: Prototyp-/Express-Bestückung SMD+THT inkl. Materialbeschaffung; PCB über Partner | Swiss3D: PETG (2–5 AT), SLS PA12 (ab 1 AT), MJF PA12, SLA | nein (2 CH-Firmen) | Materialbeschaffung angeboten; E73/ICM-45686 Beistellung empfohlen (z. B. LCSC/Mouser, ANNAHME) | **auf Anfrage**; Grössenordnung 600–1200 CHF (ANNAHME) | auf Anfrage | Express ab 3 AT, Angebot 1 AT (QUELLE) | QUELLE https://www.schaffner-gmbh.ch/ 2026-11-08; https://swiss3d.ch/materialien/petg 2026-11-08; Preis NOT RUN |
| Lecotronic AG | CH | SMD-Bestückung Klein-/Mittelserien, komplette Abwicklung | nein | nein | eigenes Lager, Beschaffung angeboten | auf Anfrage (Kontaktformular lecotronic.ch) | auf Anfrage | auf Anfrage | QUELLE https://www.lecotronic.ch/produkte-leistungen/smd-bestuckung 2026-11-08 |
| Optiprint AG / Varioprint AG | CH | Leiterplatten (Multilayer, Express-Prototyp), Bestückung nicht Kerngeschäft | nein | nein | – (nur PCB) | auf Anfrage (Optiprint: info@optiprint.ch, +41 71 747 86 86) | auf Anfrage | auf Anfrage | QUELLE Websuche 2026-11-08 (berneck.ch Firmenverzeichnis); Hochpreis-Segment ANNAHME |

## 2 JLCPCB + JLC3DP Detail

| Posten | 5 Stk | 10 Stk | Kennz. |
|---|---|---|---|
| PCB 4L 70x25 1.0 mm | 9.15 | 12.00 | QUELLE cart.jlcpcb.com/quote 2026-11-08 (5 Stk, Screenshot `manufacturing/pcba/jlc_quote_pcb_2026-11-08.png`); 10 Stk ANNAHME |
| Setup Economic | 8.00 | 8.00 | QUELLE jlcpcb.com/help/article/pcb-assembly-faqs 2026-11-08 |
| Schablone | 1.50 | 1.50 | QUELLE dito |
| Lötstellen 240 x 0.0017 x n | 2.04 | 4.08 | BERECHNUNG |
| Extended-Gebühr 12 x 3.00 | 36.00 | 36.00 | BERECHNUNG, Satz QUELLE dito |
| Teile 20.24 x n | 101.20 | 202.40 | BERECHNUNG (BOM_V1 r3) |
| 3D-Druck SLS PA12 schwarz, 44.9 cm³/Satz ≈ 15 USD/Satz | 75.00 | 150.00 | ANNAHME (JLC3DP „ab 0.30 USD“, Quelle https://jlc3dp.com/3d-printing/selective-laser-sintering 2026-11-08; Sofortpreis nur nach Upload NOT RUN) |
| Versand DHL kombiniert | 25.00 | 30.00 | ANNAHME (Versandpreis erst im Warenkorb mit Login) |
| MWST 8.1 % | 20.89 | 35.96 | BERECHNUNG |
| Verzollungsgebühr Kurier | 18.00 | 18.00 | ANNAHME |
| **Total** | **≈ 297 USD** | **≈ 498 USD** | BERECHNUNG |
| **pro Gerät** | **≈ 59 USD ≈ 48 CHF** | **≈ 50 USD ≈ 40 CHF** | BERECHNUNG |

Material: PETG ist bei JLC3DP-FDM nicht gelistet (QUELLE Websuche 2026-11-08, jlc3dp.com/3d-printing/fused-deposition-modeling). Nächste Wahl **SLS/MJF PA12** (Toleranz ±0.3 mm oder 0.4 %, Mindestwand 1.0 mm, Spiel 0.2–0.4 mm; QUELLE SLS-Seite) – Wandstärken/Schnapp-Passungen der Mechanik r3 bitte gegen diese Regeln prüfen. Lichtleiter: transparentes SLA-Harz statt PA12 (PA12 ist opak, ANNAHME).

## 3 CPL-Notiz J2 (r3)
J2 C160402 steht in `manufacturing/pcba/CPL_motion-one_JLC.csv` mit Rotation **180°** (KiCad-Footprint + 180°, analog JST-PH; ANNAHME, nicht aus JLC-Vorschau verifiziert → NOT RUN). Prüfpunkt in der JLC-Vorschau: Die beiden Signalpins des Steckers liegen zur Platinenmitte (+y_if), die Steckeröffnung (Kabeleintritt) zeigt zur Kante y_if = 0 (−y, Griffunterseite); die zwei Halte-Lötfahnen liegen auf den grossen Pads. Falls verdreht: in der Vorschau J2 um 180° drehen und den Wert dem pcb-engineer melden.

## 4 Empfehlung
**JLCPCB + JLC3DP, 5 Stk (≈ 238 CHF total, ≈ 48 CHF/Gerät, BERECHNUNG mit ANNAHMEN für 3D-Druck und Versand).** Begründung: einziger Anbieter mit allen Teilen inkl. E73 und ICM-45686 ab Lager, PCBA und Gehäuse aus einer Hand mit gemeinsamem Versand, Upload-Paket fertig, niedrigster Preis. Risiko: E73 nur 319 Stk Lager – vor Bestellung erneut prüfen.
**Beste CH-Option: Schaffner GmbH (PCBA, Express ab 3 AT, Materialbeschaffung) + Swiss3D (PETG im Original-Material, Sofortpreis nach Upload).** Vorteile: kurze Wege, kein Zollkurier, PETG wie getestetes Druckprofil. Nachteil: Preis nur auf Anfrage, zwei Lieferanten, E73/ICM-45686 vermutlich beizustellen. EU-Optionen (Aisler/Eurocircuits) bieten keinen 3D-Druck und kein Teile-Lager für E73/ICM – daher nicht empfohlen.
