"""Filamentprofil Generic PETG @BBL P2S mit aufgeloester inherits-Kette (CLI loest Dichte/Kosten nicht auf)."""
import json, sys
BBL = "/opt/bambu-studio/resources/profiles/BBL/filament/"
p = json.load(open(BBL + "Generic PETG @BBL P2S.json"))
chain, cur = [], p
while cur.get("inherits"):
    cur = json.load(open(BBL + cur["inherits"] + ".json")); chain.append(cur)
for k in ("filament_density", "filament_cost", "filament_type"):
    for c in chain:
        if k in c and k not in p:
            p[k] = c[k]; break
p.pop("inherits", None)
json.dump(p, open(sys.argv[1], "w"), indent=2)
print("density", p.get("filament_density"), "cost", p.get("filament_cost"), "type", p.get("filament_type"))
