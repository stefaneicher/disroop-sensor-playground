# Motion One – Reproduzierbarkeit

Alle Werkzeuge laufen in Docker; der Host braucht keine CAD- oder Firmware-Toolchain. Aus dem Repo-Wurzelordner:

```sh
# Hardware-/CAD-Werkzeug-Image und dessen Werkzeug-Smoke-Tests
./project hw image
./project hw smoke

# Zephyr-Image und Firmware-Host-Tests/App-Build
./project hw fw-image
./project hw fw "bash hardware/motion-one/firmware/smoke.sh"

# Systems-Budgets
./project hw run "python3 hardware/motion-one/scripts/systems/budgets.py"
```

Die genauen KiCad-, ngspice-, FEM-, Slicer-, Blender- und PDF-Befehle sowie die jeweils verwendeten Tool-Versionen stehen
in `management/handoffs/` und den zugehörigen Skripten. Nach Integration müssen diese gegen die finale V1-Revision
aktualisiert und in `releases/V1_BASELINE/` mit SHA-256-Manifest archiviert werden. Outputs, die Messungen an realer
Hardware voraussetzen, sind nicht durch diese Container-Kommandos reproduzierbar und bleiben bis zur Messung NOT RUN.

Die Eingabequellen sind versionierte Dateien dieses Repos. Vor Builds den Git-Commit notieren; Ergebnisse mit
`sha256sum <datei>` prüfen. Das Werkzeug-Image wird aus `hardware/motion-one/docker/Dockerfile`, das Firmware-Image aus
`hardware/motion-one/docker/firmware/Dockerfile` gebaut.
