# Vorab-Smoke-Test (vor den Master-Prompts)

Bevor ein Master-Prompt gestartet wird, prüft `preflight.sh`, ob Rechner, Programme, Container und MCP-Server bereit sind.
Das Skript prüft nur und installiert nichts. Aufruf aus dem Repo-Wurzelordner in WSL:

```bash
hardware/motion-one/preflight.sh
```

Das Ergebnis liegt lokal in `preflight/PREFLIGHT_RESULT.md`. Die Datei enthält Pfade und Rechnerdaten und wird deshalb nicht
committet (`.gitignore` in diesem Ordner). Die Prompts lesen sie und gleichen den Stand mit dir in einer einzigen Frage ab.

| Bereich | Was geprüft wird |
|---|---|
| Basis | Docker, Devcontainer-Image, `gh`-Anmeldung, Copilot CLI, Node.js |
| MCP | via `copilot mcp list`: GitHub, Playwright (Pflicht), KiCad, FreeCAD, Blender, JLCPCB/LCSC, Stripe (optional) |
| Werkzeuge | Image `disroop-motion-one-tools` und sein Smoke-Test: jedes Werkzeug macht eine echte kleine Aufgabe (siehe unten) |
| Windows | KiCad, FreeCAD, Blender, Bambu Studio: nur optional zum Anschauen und Drucken |
| Prompt 2 | GitHub Pages, fal.ai-Schlüssel in `~/.env` (nur Vorhandensein), Stripe-Konto, Formulardienst für die Warteliste |

Status: PASS = bereit, MISSING = fehlt (Pflicht), OPTIONAL = Kommandozeile reicht, MANUELL = nur du kannst das, INFO.

## Werkzeug-Image: alles im Container

Alle Werkzeuge für Prompt 1 laufen ohne Fenster im Image `disroop-motion-one-tools`
([`docker/Dockerfile`](docker/Dockerfile)), getrennt vom Entwicklungs-Image, damit dessen CI schlank bleibt.
Auf dem Rechner braucht es nur Docker, `gh`, die Copilot CLI und den Playwright-MCP.

```bash
./project hw image     # bauen (einmalig ca. 20-30 min, ca. 7.5 GB)
./project hw smoke     # jedes Werkzeug macht eine echte Aufgabe, Ergebnisse in logs/tools-smoke/
./project hw sh        # Shell im Container
./project hw run "kicad-cli version"
```

| Werkzeug | Version | Smoke-Test |
|---|---|---|
| KiCad (`kicad-cli`) | 10.0 | Testboard als Gerber exportieren |
| FreeCAD (`freecadcmd`) | 1.1.4 | Quader mit Bohrung als STEP und STL |
| trimesh | 5.2 | STL ist wasserdicht |
| Bambu Studio (`bambu-studio`, unter xvfb) | 02.09.01.70 | STL slicen mit den Systemprofilen Bambu Lab P2S 0.4, PLA Basic, 0.20 mm Standard; der G-Code muss `printer_model = Bambu Lab P2S` enthalten |
| Blender (`blender -b`) | 5.2.3 LTS | STL mit Cycles rendern |
| ngspice | 44 | RC-Glied, Spannung nach 5 τ |
| pandoc + xelatex | 3.1 | deutsches PDF mit Umlauten und Sonderzeichen |
| ffmpeg | 7.1 | 2-s-Video aus dem Render |

Windows-Programme sind optional: zum Anschauen der Ergebnisse und zum Senden an den Drucker.

## Stand 2026-11-07

Bereit: Docker, Devcontainer-Image, gh, Copilot CLI 1.0.107, GitHub MCP, Playwright MCP, Werkzeug-Image (8/8 PASS).

Erledigt:
1. Playwright MCP, getestet mit einem echten Aufruf (JLCPCB-Teileseite geladen). So eingerichtet:
   ```bash
   copilot mcp add playwright -- npx -y @playwright/mcp@latest --headless --browser chromium
   npx -y @playwright/mcp@latest install-browser chrome-for-testing   # ohne sudo; Standard „chrome“ fehlt in WSL
   ```
2. Slicer und alle anderen Werkzeuge im Container (oben). Drucker (Prompt 1 §0): Bambu Lab P2S Combo.

Offen vor Prompt 1: nichts. Optional MCP-Server für KiCad, FreeCAD, Blender; sonst arbeitet der Agent über die
Kommandozeilen im Werkzeug-Image.

Offen vor Prompt 2: GitHub Pages aktivieren, Stripe-Konto (Testmodus), Formulardienst für die Warteliste, fal.ai-Konto.
