---
name: cad-print-workflow
description: "Parametrisches CAD (CadQuery/FreeCAD), FDM-Toleranzen, FEM mit Gmsh/CalculiX, Export 3MF/STL und Bambu-Studio-Slice für den P2S."
---

# cad-print-workflow (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Slice: `bambu-studio --slice 0 --load-settings "<BBL>/machine/Bambu Lab P2S 0.4 nozzle.json;<BBL>/process/0.20mm Standard @BBL P2S.json" --load-filaments "<BBL>/filament/Bambu PLA Basic @BBL P2S.json"` mit BBL=/opt/bambu-studio/resources/profiles/BBL; Druckzeit aus `model printing time` im G-Code.
- FDM: Wand ≥ 1,2 mm (3 Linien), Überhang ≤ 45°, Spiel 0,2 mm Gleitpassung, Gewinde nur via Einpressmuttern; jedes Teil ≤ 180 mm.
- FEM: Reaktionskräfte gegen Last prüfen, mind. 3 Netzstufen, Singularitäten benennen.
