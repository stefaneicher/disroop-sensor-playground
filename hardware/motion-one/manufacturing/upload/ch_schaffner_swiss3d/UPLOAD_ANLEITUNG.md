# Anfrage-Anleitung Schweiz: Schaffner GmbH (PCBA) + Swiss3D (3D-Druck) – Motion One r3 (2026-11-08)

Nichts bestellen ohne Freigabe durch den Manager. **Die Dateien `swiss3d_stl/VORLAEUFIG_*` sind vorläufig. Vor dem Upload müssen sie durch Gehäuse r3 final ersetzt werden.**

## A PCBA-Anfrage Schaffner GmbH
- Kontaktformular: https://www.schaffner-gmbh.ch/kontakt
- Preise gibt es nur auf Anfrage. Es gibt keinen öffentlichen Rechner.

Der User sendet die Anfrage per E-Mail oder Formular mit folgenden Anhängen:
- `motion-one_gerber_r3.zip`
- `BOM_motion-one_generic.csv`
- `CPL_motion-one_generic.csv`

Text der Anfrage:
- Prototyp, 5 Stk (Option 10 Stk)
- Leiterplatte inklusive: 4 Lagen, FR-4, **1.0 mm**, 70 x 25 mm, HASL bleifrei oder ENIG
- Bestückung einseitig Top, 59 Positionen, das kleinste Gehäuse ist 0402 bzw. LGA-14 0.5 mm Pitch
- Materialbeschaffung durch Schaffner für alle Positionen ausser U1 E73-2G4M08S1C und U6 ICM-45686. Für diese zwei bitte angeben, ob Beistellung nötig ist.
- J3, J4 und TP1–6 nicht bestücken.
- Gewünschte Lieferzeit angeben (Express ab 3 AT möglich, QUELLE Website).
- Rotation in der CPL: KiCad-Konvention. J2 JST-SH SM02B-SRSS-TB: Die Steckeröffnung zeigt zur Kante y = 0.

## B 3D-Druck Swiss3D (https://swiss3d.ch/konfigurator, Sofortpreis nach Upload)
1. Folgende Dateien hochladen:
   - `oberschale`
   - `unterschale_glatt`
   - `tastenkappe`
   - `lichtleiter`
   
   STL oder 3MF verwenden, nur die finalen Dateien r3.
2. Material einstellen:
   - Schalen und Tastenkappe: **PETG**, Farbe schwarz oder grau. Schichthöhe 0.12 mm für die Schalen, Toleranz ±0.3 %.
   - Lichtleiter: **SLA Transparent Resin**.
3. Stückzahl: 5 (bzw. 10).
4. Lieferadresse CH angeben.

## C Screenshots an den Manager
1. Swiss3D-Konfigurator mit Preis je Teil und Liefertermin.
2. Antwort-Offerte von Schaffner (PDF).
