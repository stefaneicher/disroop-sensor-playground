# Toolchain (Inspektion 2026-11-07)
Host: Ubuntu 24.04 (WSL2), 12 Kerne, 7 GB RAM, 51 GB frei auf C:, keine GPU (nvidia-smi fehlt). Docker 29.9.3. Copilot CLI 1.0.107.
Werkzeug-Image `disroop-motion-one-tools` (QUELLE `./project hw smoke`, preflight/PREFLIGHT_RESULT.md): KiCad 10.0.8, FreeCAD 1.1.4, Blender 5.2.3, Bambu Studio 02.09.01.70 (P2S), ngspice, pandoc+xelatex, ffmpeg, trimesh: PASS.
Fehlend bei Inspektion: CadQuery, Gmsh, CalculiX (wird ergänzt), Zephyr/NCS, west, nrfutil, arm-none-eabi-gcc (eigenes Firmware-Image nötig).
MCP: GitHub (eingebaut), Playwright (lokal): konfiguriert. KiCad/FreeCAD/Blender/JLCPCB-MCP: nicht konfiguriert, Ersatz Kommandozeile.
RAM 7 GB: schwere Läufe (FEM, Render, Firmware-Build) nacheinander.
