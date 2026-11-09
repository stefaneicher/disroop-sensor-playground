#!/usr/bin/env python3
"""Erzeugt Verifikationsmatrix, releases/V1_BASELINE/ und SHA-256-Manifest (Release 1).
Aufruf im Repo-Wurzelordner: python3 devices/motion-one/scripts/release/make_release.py
"""
import hashlib, re, shutil, pathlib

R = pathlib.Path("devices/motion-one")
REL = R / "releases/V1_BASELINE"
A = REL / "artifacts"

HT = "Host-Tests 69/0 (logs/fw-pinmap/unit-tests.log); Gerät NOT RUN"
ov = {
 "REQ-002": ("PARTIAL", HT),
 "REQ-009": ("PARTIAL", "Fusion-Host-Tests grün (logs/fw-pinmap/unit-tests.log); keine Gerätemessung"),
 "REQ-020": ("PARTIAL", "GATT-Profil-Hosttest grün; Scan am Gerät NOT RUN"),
 "REQ-021": ("PARTIAL", "test_thingy_profile grün (Host); Gerät NOT RUN"),
 "REQ-022": ("PARTIAL", "test_thingy_codec mit Bridge-Vektoren grün (Host); Gerät NOT RUN"),
 "REQ-023": ("PARTIAL", "Profil-Hosttest; Bridge gegen Gerät NOT RUN"),
 "REQ-024": ("PARTIAL", "Codec-Hosttest; Gerät NOT RUN"),
 "REQ-040": ("PARTIAL", "BERECHNUNG 49 h (PCB) vs. 65 h (Systems), unterschiedliche Annahmen; Entladetest NOT RUN"),
 "REQ-042": ("PARTIAL", "BERECHNUNG 255 mA (electronics/analysis/ANALYSE_V1.md); Messung NOT RUN"),
 "REQ-047": ("PARTIAL", "BERECHNUNG max. 6 µA; Messung NOT RUN"),
 "REQ-048": ("PARTIAL", "Host-Test Profil; Gerät NOT RUN"),
 "REQ-050": ("PARTIAL", "Taster BTN P0.28 in PINOUT/DTS (pincheck PASS); Ergonomie/Gerät NOT RUN"),
 "REQ-052": ("PARTIAL", "LED-Pins im DTS (pincheck PASS), Host-Test; Sicht NOT RUN"),
 "REQ-053": ("PARTIAL", "BUZ_PWM im DTS, Host-Test; Gehör NOT RUN"),
 "REQ-056": ("PARTIAL", "CAD-Masse (ANNAHME 170 mm Länge), keine Messung am Druck"),
 "REQ-058": ("PARTIAL", "Akku-Halte-Nasen im CAD, Netzkollision 0 (SIMULATION); Fixierung am Muster NOT RUN"),
 "REQ-060": ("PARTIAL", "Bootloader/UF2 gebaut (logs/fw-bootloader, logs/fw-pinmap); Flashen NOT RUN"),
}

src = (R / "management/REQUIREMENTS.md").read_text(encoding="utf-8")
rows = []
for line in src.splitlines():
    if re.match(r"\| REQ-\d+ \|", line):
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        rows.append((c[0], c[1], c[4]))
out = ["# Anforderungs-Verifikationsmatrix V1 Baseline (Release 1)\n",
 "Erzeugt von `scripts/release/make_release.py` aus `management/REQUIREMENTS.md`. Labels: PASS, PARTIAL, FAIL, BLOCKED, NOT RUN.\n",
 "**Kein Requirement ist PASS**: PASS braucht Messung am Muster; es existiert keine Hardware. PARTIAL = digitaler/Host-Beleg, Hardware-Nachweis NOT RUN. Requirements ohne eigenen Beleg sind NOT RUN (nicht schöngerechnet).\n",
 "| Req-ID | Anforderung | Beleg / Bemerkung | Label |", "|---|---|---|---|"]
cnt = {}
for rid, txt, beleg in rows:
    lab, rem = ov.get(rid, ("NOT RUN", "nur Spezifikation: " + beleg[:90]))
    cnt[lab] = cnt.get(lab, 0) + 1
    out.append(f"| {rid} | {txt[:110].replace('|','/')} | {rem.replace('|','/')} | {lab} |")
out.append("\n## Zusammenfassung\n" + ", ".join(f"{k}: {v}" for k, v in sorted(cnt.items())) + f" (total {len(rows)})\n")
out.append("""## Weitere Prüfungen (Stand r4)
| Prüfung | Label | Beleg |
|---|---|---|
| Hauptboard-ERC (nur Schaltplan) | PASS, 0 Verletzungen | logs/pcb-r4d/erc.json |
| Steuerboard ERC/DRC | PASS | logs/pcb-r4/ |
| Firmware Host-Tests 69/0, pincheck, Build | PASS (nur Host) | logs/fw-pinmap/ |
| Netzkollision 16 Paare | PASS (SIMULATION) | mechanics/cad/collision_r4.json |
| Lippenspiel min 0.191 mm (Soll 0.25) | PASS laut Mechanik-Handoff, unter Soll-Mittel | mechanics/cad/final_checks_r4.json |
| Wandstärke min 0.8 mm, Ziel 1.0 mm | FAIL (grobe Auflösung, evtl. Artefakt) | mechanics/cad/final_checks_r4.json |
| Dichtheit pcb_r4.stl | widersprüchlich 38/72 vs. 40/40 | BEKANNTE_WIDERSPRUECHE.md |
| FEM, Bambu-Slice r4, Toleranzkörperdruck | NOT RUN | - |
""")
REL.mkdir(parents=True, exist_ok=True)
(REL / "VERIFIKATIONSMATRIX.md").write_text("\n".join(out), encoding="utf-8")
print(cnt)

files = {
 "docs/TECHNISCHER_BERICHT_V1.pdf": "docs/report/TECHNISCHER_BERICHT_V1.pdf",
 "docs/ASSEMBLY.pdf": "docs/assembly/ASSEMBLY.pdf",
 "docs/USER.pdf": "docs/user/USER.pdf",
 "docs/VERIFIKATIONSMATRIX.md": "releases/V1_BASELINE/VERIFIKATIONSMATRIX.md",
 "docs/BEKANNTE_WIDERSPRUECHE.md": "releases/V1_BASELINE/BEKANNTE_WIDERSPRUECHE.md",
 "firmware/zephyr.uf2": "logs/fw-pinmap/zephyr.uf2",
 "firmware/zephyr.hex": "logs/fw-pinmap/zephyr.hex",
 "firmware/zephyr.bin": "logs/fw-pinmap/zephyr.bin",
 "electronics/motion-one_gerber_r4.zip": "manufacturing/pcba/motion-one_gerber_r4.zip",
 "electronics/BOM_motion-one_JLC.csv": "manufacturing/pcba/BOM_motion-one_JLC.csv",
 "electronics/CPL_motion-one_JLC.csv": "manufacturing/pcba/CPL_motion-one_JLC.csv",
}
for n in ["oberschale", "unterschale_glatt", "schieber", "tastenkappe", "lichtleiter", "toleranzkoerper"]:
    files[f"mechanics/{n}.stl"] = f"mechanics/print/{n}.stl"
    files[f"mechanics/{n}.3mf"] = f"mechanics/print/{n}.3mf"
for n in ["exploded_labeled", "exploded_raw", "iso_closed", "iso_open", "top_open"]:
    files[f"renders/{n}.png"] = f"media/renders/{n}.png"
if A.exists():
    shutil.rmtree(A)
for dst, s in files.items():
    d = A / dst
    d.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(R / s, d)

sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
man = ["# SHA-256-Manifest Motion One V1 Baseline (Release 1)",
       "# Format: sha256  Pfad relativ zu devices/motion-one/ (Bytes der Arbeitskopie).",
       "# zephyr.hex: Arbeitskopie CRLF (core.autocrlf=true), Git-Index LF -> Hash kann je Checkout abweichen. Referenz: logs/fw-pinmap/zephyr.sha256 (cee6809b...).", ""]
for dst, s in files.items():
    man.append(f"{sha(A/dst)}  releases/V1_BASELINE/artifacts/{dst}   (Quelle {s})")
for e in ["REPRODUCE.md", "DEMO_RUNBOOK.md", "docs/report/TECHNISCHER_BERICHT_V1.md", "management/metrics.json",
          "management/REQUIREMENTS.md", "electronics/PINOUT_V1.json", "mechanics/assembly_stl/pcb_r4.stl",
          "electronics/kicad/motion-one/export/motion-one-board.step", "mechanics/cad/collision_r4.json"]:
    if (R / e).exists():
        man.append(f"{sha(R/e)}  {e}")
(REL / "SHA256_MANIFEST.txt").write_text("\n".join(man) + "\n", encoding="utf-8")
shutil.copy(REL / "SHA256_MANIFEST.txt", A / "SHA256_MANIFEST.txt")
print(len(files), "Artefakte")
