#!/usr/bin/env python3
"""Baut aus den Markdown-Dokumenten dieses Ordners eine HTML-Seite mit Verlinkung in den Firmware-Code.

Aufruf (Repo-Wurzel):  python3 devices/motion-one/regulatory/build_site.py [--check]

Schreibweisen in den Markdown-Dateien:
  [[symbol]]            Funktion, Typ, Makro oder Test aus der Firmware -> Link auf die Quelldatei an der Zeile
  [[firmware/pfad/datei]]  ganze Datei (Pfad relativ zu devices/motion-one/)
  {SRS-010}             Verweis auf eine ID; Ziel ist der Anker <a id="SRS-010"></a> in einem der Dokumente
Fehlende Symbole, Dateien oder IDs sind Fehler (Exit 1). Das ist die automatische Prüfung der Verlinkung.
Mit --check wird nur geprüft und nichts geschrieben. Benötigt pandoc.
"""
import html
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
MO = HERE.parent  # devices/motion-one
FW = MO / "firmware"
SITE = HERE / "site"
SRC_DIRS = ["firmware/app", "firmware/codec", "firmware/fusion", "firmware/icm", "firmware/power", "firmware/input",
            "firmware/tests", "firmware/scripts", "firmware/docs/EXTENDED_CHANNEL.md", "firmware/boards", "firmware/bootloader", "firmware/Makefile", "firmware/smoke.sh",
            "firmware/build-app.sh"]
SRC_EXT = {".c", ".h", ".conf", ".dts", ".dtsi", ".yaml", ".yml", ".cmake", ".sh", ".py", ".mk", ".txt", ".overlay"}
SRC_NAMES = {"Makefile", "Kconfig.motion_one", "motion_one_defconfig"}
DOCS = sorted(p for p in HERE.glob("[0-9][0-9]_*.md"))
INDEX = HERE / "README.md"

errors: list[str] = []


def source_files() -> list[pathlib.Path]:
    out = []
    for d in SRC_DIRS:
        p = MO / d
        if p.is_file():
            out.append(p)
        elif p.is_dir():
            out += [f for f in p.rglob("*") if f.is_file() and "build" not in f.relative_to(MO).parts
                    and (f.suffix in SRC_EXT or f.name in SRC_NAMES)]
    return sorted(set(out))


FUNC = re.compile(r"^(?!#|/\*|\*|\}|return|typedef|extern)[A-Za-z_][\w \t\*]*?\b([A-Za-z_]\w*)\s*\([^;{}]*\)?\s*(?:\{.*)?$")
PROTO = re.compile(r"^(?!#|/\*|\*|\}|return|typedef|extern)[A-Za-z_][\w \t\*]*?\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*;\s*$")
DEFINE = re.compile(r"^#define\s+([A-Za-z_]\w*)")
TYPEDEF_END = re.compile(r"^\}\s*([A-Za-z_]\w*)\s*;")
MACRO_DEF = re.compile(r"^(?:BT_GATT_SERVICE_DEFINE|K_WORK_DELAYABLE_DEFINE|K_WORK_DEFINE|K_SEM_DEFINE|K_MUTEX_DEFINE|"
                       r"K_THREAD_STACK_DEFINE|LOG_MODULE_REGISTER|BT_CONN_CB_DEFINE)\(\s*([A-Za-z_]\w*)")
CTRL = {"if", "for", "while", "switch", "else", "sizeof"}


def page_name(path: pathlib.Path) -> str:
    return "src/" + str(path.relative_to(MO)).replace("/", "__") + ".html"


def build_index(files):
    idx: dict[str, tuple[pathlib.Path, int]] = {}
    ordered = [f for f in files if f.suffix == ".c"] + [f for f in files if f.suffix == ".h"] + \
              [f for f in files if f.suffix not in (".c", ".h")]
    for f in ordered:
        lines = f.read_text(errors="replace").splitlines()
        for n, line in enumerate(lines, 1):
            name = None
            m = DEFINE.match(line) or TYPEDEF_END.match(line) or MACRO_DEF.match(line)
            if m:
                name = m.group(1)
            elif f.suffix in (".c", ".h"):
                m = (FUNC.match(line) if f.suffix == ".c" else PROTO.match(line))
                if m and m.group(1) not in CTRL:
                    name = m.group(1)
            if name and name not in idx:
                idx[name] = (f, n)
    return idx


def src_page(f: pathlib.Path) -> str:
    rows = []
    for n, line in enumerate(f.read_text(errors="replace").splitlines(), 1):
        rows.append(f'<span class="l" id="L{n}"><a href="#L{n}">{n}</a>{html.escape(line)}\n</span>')
    rel = f.relative_to(MO)
    body = "".join(rows)
    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{rel}</title><link rel="stylesheet" href="../style.css"></head><body class="src">
<p><a href="../index.html">← Dokumentation</a> · <code>devices/motion-one/{rel}</code></p>
<pre class="code">{body}</pre></body></html>"""


IDREF = re.compile(r"\{([A-Z]+-\d+)\}")
SYMREF = re.compile(r"\[\[([^\]\n]+)\]\]")
ANCHOR = re.compile(r'<a id="([A-Z]+-\d+)"></a>')


def main() -> int:
    check_only = "--check" in sys.argv
    files = source_files()
    idx = build_index(files)
    relmap = {str(f.relative_to(MO)): f for f in files}
    md_files = DOCS + [INDEX]
    ids: dict[str, str] = {}
    for md in md_files:
        for m in ANCHOR.finditer(md.read_text()):
            ids.setdefault(m.group(1), md.name)

    def sym(m):
        key = m.group(1)
        if key in relmap:
            return f"[`{key}`]({page_name(relmap[key])})"
        if key in idx:
            f, n = idx[key]
            return f"[`{key}`]({page_name(f)}#L{n})"
        errors.append(f"Symbol/Datei nicht gefunden: [[{key}]]")
        return f"`{key}`"

    def ref(m):
        key = m.group(1)
        if key in ids:
            return f"[{key}]({ids[key]}#{key})"
        errors.append(f"ID nicht gefunden: {{{key}}}")
        return key

    pages = []
    for md in md_files:
        text = SYMREF.sub(sym, IDREF.sub(ref, md.read_text()))
        pages.append((md, text))
    # Rückverfolgbarkeit: jede SRS-ID muss in der Matrix (07) vorkommen
    trace = (HERE / "07_Rueckverfolgbarkeit.md").read_text()
    for sid in sorted(i for i in ids if i.startswith("SRS-")):
        if f"{{{sid}}}" not in trace:
            errors.append(f"{sid} fehlt in 07_Rueckverfolgbarkeit.md")
    if errors:
        print("\n".join(sorted(set(errors))))
        print(f"FEHLER: {len(set(errors))}")
        return 1
    if check_only:
        print(f"OK: {len(idx)} Symbole, {len(ids)} IDs, {len(pages)} Dokumente")
        return 0
    if not shutil.which("pandoc"):
        print("pandoc fehlt")
        return 1
    if SITE.exists():
        shutil.rmtree(SITE)
    (SITE / "src").mkdir(parents=True)
    (SITE / "style.css").write_text(CSS)
    for f in files:
        (SITE / page_name(f)).write_text(src_page(f))
    label = {"Rueckverfolgbarkeit": "Rückverfolgbarkeit", "Luecken": "Lücken"}
    nav = " · ".join(f'<a href="{"index" if m == INDEX else m.stem}.html">'
                     f'{"Start" if m == INDEX else label.get(m.stem.split("_", 1)[-1], m.stem.split("_", 1)[-1].replace("_", " "))}</a>'
                     for m in [INDEX] + DOCS)
    for md, text in pages:
        out = SITE / ("index.html" if md == INDEX else md.stem + ".html")
        tmp = SITE / "_tmp.md"
        tmp.write_text(text)
        subprocess.run(["pandoc", "-f", "gfm+attributes", "-t", "html5", "-s", "--toc", "--toc-depth=2",
                        "--metadata", f"pagetitle={md.stem.split('_', 1)[-1].replace('_', ' ') if md != INDEX else 'Motion One Firmware, IEC 62304 Dokumentation'}",
                        "--metadata", "lang=de", "-c", "style.css",
                        "-B", _nav_file(nav), "-o", str(out), str(tmp)], check=True)
        tmp.unlink()
        s = out.read_text()
        s = re.sub(r'href="(\d\d_[^"#]*|README)\.md', lambda m: 'href="' + ("index" if m.group(1) == "README" else m.group(1)) + ".html", s)
        out.write_text(s)
    (SITE / "_nav.html").unlink(missing_ok=True)
    print(f"OK: {len(pages)} Seiten, {len(files)} Quelldateien, {len(idx)} Symbole -> {SITE.relative_to(MO.parent.parent)}")
    return 0


def _nav_file(nav: str) -> str:
    p = SITE / "_nav.html"
    p.write_text(f'<nav class="top">{nav}</nav>')
    return str(p)


CSS = """
:root{--bg:#fff;--fg:#1b1f24;--mut:#59636e;--line:#d0d7de;--acc:#0b5cad;--code:#f6f8fa}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--mut:#8b949e;--line:#30363d;--acc:#58a6ff;--code:#161b22}}
body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:0 16px 48px}
a{color:var(--acc)}nav.top{padding:12px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:2}
table{border-collapse:collapse;display:block;overflow-x:auto;font-size:14px}th,td{border:1px solid var(--line);padding:4px 8px;vertical-align:top}
th{background:var(--code)}code{background:var(--code);padding:1px 4px;border-radius:4px;font-size:90%}
pre{background:var(--code);padding:12px;overflow-x:auto;border-radius:6px}
body.src{max-width:none}pre.code{font-size:13px;line-height:1.4}pre.code a{display:inline-block;width:4em;color:var(--mut);text-decoration:none;user-select:none}
pre.code .l:target{background:#ffd33d55;display:inline-block;width:100%}
header h1.title{font-size:1.6em}#TOC{font-size:14px}
"""

if __name__ == "__main__":
    sys.exit(main())
