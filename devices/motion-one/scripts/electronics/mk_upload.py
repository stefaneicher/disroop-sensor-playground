"""Upload-Pakete je Anbieter erzeugen (keine Uploads, nur lokale Dateien).
Aufruf (Repo-Root): python3 devices/motion-one/scripts/electronics/mk_upload.py
Erzeugt manufacturing/upload/<anbieter>/ und gibt SHA-256 aller Dateien aus."""
import csv, hashlib, re, shutil, zipfile
from pathlib import Path

P = Path(__file__).resolve().parents[2]
PCBA, PRINT, UP = P / "manufacturing/pcba", P / "mechanics/print", P / "manufacturing/upload"
PARTS = ["oberschale", "unterschale_glatt", "tastenkappe", "lichtleiter"]

# MPN je LCSC aus BOM_V1.md (Tabellenspalten 1 und 2)
mpn = {}
for line in (P / "sourcing/BOM_V1.md").read_text(encoding="utf-8").splitlines():
    m = re.match(r"\|\s*(C\d+)\s*\|\s*([^|]+?)\s*\|", line)
    if m:
        mpn[m.group(1)] = m.group(2)

def copy_common(d: Path, stl_dir: str):
    d.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PCBA / "motion-one_gerber_r4.zip", d / "motion-one_gerber_r3.zip")
    s = d / stl_dir
    s.mkdir(exist_ok=True)
    for p in PARTS:
        shutil.copy2(PRINT / f"{p}.stl", s / f"VORLAEUFIG_{p}.stl")
        shutil.copy2(PRINT / f"{p}.3mf", s / f"VORLAEUFIG_{p}.3mf")

# JLCPCB + JLC3DP
j = UP / "jlcpcb"
copy_common(j, "jlc3dp_stl")
shutil.copy2(PCBA / "BOM_motion-one_JLC.csv", j / "BOM_motion-one_JLC.csv")
shutil.copy2(PCBA / "CPL_motion-one_JLC.csv", j / "CPL_motion-one_JLC.csv")

# Generisches Format (Schweiz/EU: Schaffner GmbH + Swiss3D, ebenso Aisler/Eurocircuits/PCBWay)
g = UP / "ch_schaffner_swiss3d"
copy_common(g, "swiss3d_stl")
with open(PCBA / "BOM_motion-one_JLC.csv", encoding="utf-8") as f, \
     open(g / "BOM_motion-one_generic.csv", "w", newline="", encoding="utf-8") as o:
    w = csv.writer(o)
    w.writerow(["Pos", "Designators", "Qty/Board", "Value", "Footprint", "Manufacturer_PN", "LCSC_PN", "Note"])
    for i, r in enumerate(csv.DictReader(f), 1):
        refs = r["Designator"].replace(" ", "")
        lc = r.get("LCSC Part #") or r.get("JLCPCB Part #") or list(r.values())[-1]
        note = "BEISTELLUNG empfohlen" if lc in ("C356849", "C22459454") else ""
        w.writerow([i, refs, len(refs.split(",")), r["Comment"], r["Footprint"], mpn.get(lc, ""), lc, note])
with open(PCBA / "CPL_motion-one_JLC.csv", encoding="utf-8") as f, \
     open(g / "CPL_motion-one_generic.csv", "w", newline="", encoding="utf-8") as o:
    w = csv.writer(o)
    w.writerow(["Designator", "X_mm", "Y_mm", "Side", "Rotation_deg_KiCad"])
    for r in csv.DictReader(f):
        w.writerow([r["Designator"], r["Mid X"], r["Mid Y"], r["Layer"], r["Rotation"]])

for d in (j, g):
    zp = UP / f"{d.name}_paket.zip"
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(d.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(UP))
for f in sorted(UP.rglob("*")):
    if f.is_file() and f.suffix != ".md":
        print(hashlib.sha256(f.read_bytes()).hexdigest(), f.relative_to(P))
