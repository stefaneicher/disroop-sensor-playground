# Toolchain-Inspektion

Stand: 2026-11-07/08; Versionen und Hardwarebefunde aus Host-Inspektion und Smoke-Handoffs.

## Host / WSL
- Ubuntu 24.04.1 unter WSL2, 12 CPU-Kerne.
- Vor Änderung: `free -g` zeigte 7 GB WSL-RAM. `C:\Users\stefa\.wslconfig` wurde mit `memory=12GB` angelegt; Einstellung wird erst nach `wsl --shutdown` wirksam, daher ist die aktuelle RAM-Zuteilung ohne Neustart nicht bestätigt.
- Freier Speicher auf C: 51 GB bei der Inspektion.
- Windows meldet AMD Radeon (TM) Graphics; `/dev/dxg` ist in WSL vorhanden. GPU-Zugriff aus dem Werkzeug-Container wurde nicht nachgewiesen; Blender-Smoke-Test ist CPU-basiert. `nvidia-smi` fehlt, was keine Aussage gegen die AMD-GPU ist.
- Docker 29.9.3; Copilot CLI 1.0.107.

## Hardware-Werkzeug-Image
`disroop-motion-one-tools`, Aufruf `./project hw run ...`, Smoke-Test `./project hw smoke` (11 Werkzeuge PASS):
- KiCad 10.0.8, FreeCAD 1.1.4, Blender 5.2.3, Bambu Studio 02.09.01.70 mit P2S-Profilen
- ngspice, pandoc + xelatex, ffmpeg, trimesh
- CadQuery 2.8.0, Gmsh 4.15.2, CalculiX 2.21
- Zusätzlich `poppler-utils`, `gerbv`, `librsvg2-bin`, `networkx` im aktualisierten Image.

## Firmware-Image
`disroop-motion-one-fw`: Zephyr 4.5.0, Zephyr SDK 1.0.1 (ARM Toolchain), gcc 14.2.0, Unity 2.6.1. Aufruf `./project hw fw-image` bzw. `./project hw fw "<cmd>"`. Firmware-Smoke und Hosttests sind in den Firmware-Handoffs dokumentiert.

## MCP
- GitHub: über Copilot CLI eingebaut; GitHub-Operationen mit `gh`.
- Playwright: lokal konfiguriert; echter Aufruf für JLCPCB-C1525 erfolgte durch pcb-engineer.
- KiCad-, FreeCAD-, Blender- und dedizierter JLCPCB-MCP: nicht konfiguriert. Für diese Aufgaben wurden Kommandozeilen oder öffentliche Shop-Seiten genutzt; Shellskripte sind keine MCP-Integration.
