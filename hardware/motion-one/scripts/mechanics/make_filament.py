"""Erzeugt ein Filamentprofil (P2S PLA Basic) mit explizit gesetzter Dichte/Kosten, da die CLI geerbte Werte nicht aufloest."""
import json, sys
BBL = "/opt/bambu-studio/resources/profiles/BBL/filament/"
p = json.load(open(BBL + "Bambu PLA Basic @BBL P2S.json"))
base = json.load(open(BBL + "Bambu PLA Basic @base.json"))
for k in ("filament_density", "filament_cost"):
    if k in base: p[k] = base[k]
json.dump(p, open(sys.argv[1], "w"), indent=2)
print("density", p.get("filament_density"), "cost", p.get("filament_cost"))
