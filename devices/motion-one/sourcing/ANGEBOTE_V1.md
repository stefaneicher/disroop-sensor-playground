# Angebotsvergleich V1 – Motion One PCBA (pcb-engineer, 2026-11-08)

Board: 4 Lagen, 70 x 25 mm, 1.0 mm, HASL, einseitig bestueckt, 59 Platzierungen, 236 SMD- + 4 THT-Loetstellen (BERECHNUNG aus CPL), 35 BOM-Positionen, davon 12 Extended (QUELLE `sourcing/BOM_V1.md`). Teile 20.33 USD/Geraet (QUELLE BOM_V1, JLC-Preise bei Menge).
Kennzeichnung: QUELLE (Rechner/Seite, Datum), BERECHNUNG, ANNAHME, NOT RUN. Waehrung USD; 1 USD ≈ 0.80 CHF (ANNAHME).

## 1 JLCPCB
| Posten | 2 Stk | 5 Stk | 10 Stk | Kennz. |
|---|---|---|---|---|
| PCB 4L 70x25 1.0 mm (min. 5 Stk gefertigt), Web-Preis | 9.15 | 9.15 | 12.00 | QUELLE cart.jlcpcb.com/quote 2026-11-08 (5 Stk: Special Offer 8.00 + Entgraten 0.10 + Confirm file 1.05, Screenshot `manufacturing/pcba/jlc_quote_pcb_2026-11-08.png`); 10 Stk ANNAHME |
| Setup Economic | 8.00 | 8.00 | 8.00 | QUELLE jlcpcb.com/help/article/pcb-assembly-faqs (2026-11-08) |
| Schablone | 1.50 | 1.50 | 1.50 | QUELLE dito |
| Loetstellen 240 x 0.0017 x n | 0.82 | 2.04 | 4.08 | BERECHNUNG, Satz QUELLE dito |
| Extended-Gebuehr 12 x 3.00 | 36.00 | 36.00 | 36.00 | BERECHNUNG, Satz QUELLE dito |
| Teile 20.33 x n | 40.66 | 101.65 | 203.30 | BERECHNUNG (BOM_V1) |
| **Zwischensumme** | **96.13** | **158.34** | **264.88** | BERECHNUNG |
| Versand DHL/FedEx nach CH | 22 | 22 | 25 | ANNAHME (Rechner zeigt nur Gewicht 0.14 kg; Versandpreis erst im Warenkorb mit Login -> NOT RUN) |
| MWST CH 8.1 % auf Ware+Versand | 9.57 | 14.61 | 23.47 | BERECHNUNG (Satz QUELLE ESTV 8.1 %) |
| Zoll (Elektronik zollfrei CH seit 2024) + Verzollungsgebuehr Kurier | 18 | 18 | 18 | ANNAHME (Industriezoll CH abgeschafft 1.1.2024 QUELLE-Allgemeinwissen; Gebuehr typ. CHF 15–20) |
| **Total** | **≈ 146** | **≈ 213** | **≈ 331** | BERECHNUNG |
| **pro Geraet** | **≈ 73** | **≈ 42.6** | **≈ 33.1** | BERECHNUNG |
| Lieferzeit | PCB 3–4 d + PCBA ~3 d + Versand 3–6 d ≈ 10–14 d | | | QUELLE Rechner (Build Time), Versand ANNAHME |

Einschraenkungen: Economic nur ≤ 30 Stk, einseitig (QUELLE FAQ) – erfuellt. E73-Modul Bestand 322 (QUELLE q-Abfrage BOM_V1): fuer 10 Stk ausreichend, Preorder-Risiko gering. Rotationen nach JLC-Vorschau pruefen (siehe CPL-Notiz).

## 2 PCBWay
| Posten | 5 Stk | Kennz. |
|---|---|---|
| PCB 4L | ≈ 30–50 | ANNAHME (Seite pcbway.com/pcb-assembly.html: „1–14 layers $5/10pcs" nur 2L; 4L-Preis Rechner orderonline.aspx NOT RUN) |
| PCBA inkl. Setup, Schablone gratis | ≈ 30–88 (Beispiel „$29/20 pcs" Bestueckung) | QUELLE pcbway.com/pcb-assembly.html 2026-11-08 (Werbepreis), konkret NOT RUN |
| Teile (Turnkey, Marktpreise, kein E73-Lager) | ≈ 120–150 | ANNAHME (+20–50 % ggü. JLC-Basic) |
| Versand + MWST + Kurier CH | ≈ 50 | ANNAHME |
| **Total / pro Geraet** | **≈ 230–340 / 46–68** | BERECHNUNG aus ANNAHMEN |
| Lieferzeit | 3–5 d PCBA (QUELLE Seite) + Teilebeschaffung 5–10 d + Versand ≈ 3 Wochen | ANNAHME |

Echte Bestellbeispiele auf der Seite (11-08): 5 Stk 59.63 / 77.03 / 94.69 / 326.31 USD (QUELLE) – Spannbreite je nach BOM.

## 3 Aisler (DE/NL, EU-Fertigung)
Preis-/Bestueckungsseiten (aisler.net/en/pricing, /en/assembly) am 2026-11-08 mit 404 – Rechner nur nach Upload → **NOT RUN**. Groessenordnung 4L-Prototyp + Bestueckung 5 Stk: ≈ 300–450 EUR (ANNAHME), dafuer EU-Lieferung ohne Zoll-Kurier-Gebuehr (MWST CH 8.1 % bleibt), 7–10 Werktage (ANNAHME). E73/ICM-45686 muessten ggf. beigestellt werden (ANNAHME).

## 4 Empfehlung
**JLCPCB Economic, 5 Stk, ≈ 213 USD ≈ 42.6 USD/Geraet (≈ 34 CHF, BERECHNUNG)**: einziger Anbieter mit allen Teilen inkl. E73 und ICM-45686 ab Lager (BOM_V1), Upload-Paket fertig (`manufacturing/pcba/`). Extended-Gebuehr (36 USD) ist groesster Fixposten – Reduktion moeglich durch Basic-Ersatz (siehe BOM_V1 Alternativen). PCBWay als Ausweichoption bei JLC-Fehlbestand, Aisler nur bei Wunsch EU-Fertigung. Echte Endpreise inkl. Versand erst nach Login/Upload durch User (NOT RUN, keine Logins erlaubt).
