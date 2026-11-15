"""BOM rows for the video (main board r3 table of devices/motion-one/sourcing/BOM_V1.md) -> build/bom.json."""
import json, os
B = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{B}/build", exist_ok=True)
rows = []
for l in open(f"{B}/../../devices/motion-one/sourcing/BOM_V1.md", encoding="utf-8"):
    if l.startswith("| C"):
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if len(c) > 10 and c[8] in ("PASS", "FAIL"):
            rows.append(dict(lcsc=c[0], mpn=c[1], val=c[2], qty=c[5], stock=c[7], ok=c[8], usd=c[10]))
json.dump(rows[:35], open(f"{B}/build/bom.json", "w"), indent=1)
print("bom rows", len(rows[:35]))
