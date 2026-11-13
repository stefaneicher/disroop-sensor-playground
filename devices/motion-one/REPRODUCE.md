# Motion One – Reproduzierbarkeit

**Einordnung 2026-11-13:** Der verbindliche Stand steht in
[PROJECT_STATE](management/PROJECT_STATE.md). Mechanikquellen r5 und gespeicherte
r4-Ergebnisse sind nicht dieselbe Revision. Die folgenden Release-Kommandos
dokumentieren den historischen Baseline-Aufbau: `make_release.py` nicht
ungeprüft erneut ausführen, da sonst der Snapshot aus aktuellen, nicht
gemeinsam freigegebenen Eingaben überschrieben werden kann.

## Dateiaudit ohne CAD-/Firmware-Neubau

```sh
node scripts/audit-files.mjs
node --test tests/audit-files.test.mjs
```

Aufruf aus der Repository-Wurzel. Der Generator schreibt ausschliesslich
`docs/DATEI_AUDIT.html`; er hasht Projektdateien und vergleicht vorhandene
Kollisions-/Baugruppen- sowie Release-Kopien. Er führt keine Hardware- oder
CAD-Tests aus und löscht keine Dateien. Referenzhinweise und bytegleiche
Duplikate sind keine automatische Löschentscheidung. Ignorierte lokale
Pfade werden nur aufgelistet, ihre Inhalte nicht untersucht.

Die CAD-/Firmware-Werkzeuge laufen in Docker; der Host braucht keine entsprechende
Toolchain. Das Dateiaudit oben nutzt Node.js. Aus dem Repo-Wurzelordner:

```sh
# Hardware-/CAD-Werkzeug-Image und dessen Werkzeug-Smoke-Tests
./project hw image
./project hw smoke

# Zephyr-Image und Firmware-Host-Tests/App-Build
./project hw fw-image
./project hw fw "bash devices/motion-one/firmware/smoke.sh"

# Systems-Budgets
./project hw run "python3 devices/motion-one/scripts/systems/budgets.py"
```

Die genauen KiCad-, ngspice-, FEM-, Slicer-, Blender- und PDF-Befehle sowie die jeweils verwendeten Tool-Versionen stehen
in `management/handoffs/` und den zugehörigen Skripten. Nach Integration müssen diese gegen die finale V1-Revision
aktualisiert und in `releases/V1_BASELINE/` mit SHA-256-Manifest archiviert werden. Outputs, die Messungen an realer
Hardware voraussetzen, sind nicht durch diese Container-Kommandos reproduzierbar und bleiben bis zur Messung NOT RUN.

Die Eingabequellen sind versionierte Dateien dieses Repos. Vor Builds den Git-Commit notieren; Ergebnisse mit
`sha256sum <datei>` prüfen. Das Werkzeug-Image wird aus `devices/motion-one/docker/Dockerfile`, das Firmware-Image aus
`devices/motion-one/docker/firmware/Dockerfile` gebaut.

## Release 1 (V1 Baseline, Stand r4)

```sh
# Bericht-PDF
./project hw run "cd devices/motion-one/docs/report && pandoc TECHNISCHER_BERICHT_V1.md -o TECHNISCHER_BERICHT_V1.pdf --pdf-engine=xelatex -V geometry:margin=2cm -V mainfont='DejaVu Sans' -V fontsize=10pt"
# Firmware (Handoff firmware 2026-11-09-pinmap): Host-Tests 69/0, pincheck, UF2/HEX
./project hw fw "bash devices/motion-one/firmware/smoke.sh devices/motion-one/logs/fw-pinmap"
# Verifikationsmatrix, releases/V1_BASELINE/, SHA-256-Manifest
python3 devices/motion-one/scripts/release/make_release.py
# Prüfen
(cd devices/motion-one && sha256sum -c <(awk '!/^#/ && NF {print $1"  "$2}' releases/V1_BASELINE/SHA256_MANIFEST.txt))
```

Mechanik-, PCB- und Blender-Befehle: Handoffs `mechanical-engineer/2026-11-09-r4-abschluss.md`, `pcb-engineer/2026-11-09-step-dicht.md`, `docs-media-engineer/2026-11-09-r4-release.md`. Hinweis `zephyr.hex` CRLF/LF: siehe `releases/V1_BASELINE/BEKANNTE_WIDERSPRUECHE.md`.
