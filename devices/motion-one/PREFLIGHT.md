# Vorab-Smoke-Test (vor den Master-Prompts)

Bevor ein Master-Prompt gestartet wird, prüft `preflight.sh`, ob Rechner, Programme, Container und MCP-Server bereit sind.
Das Skript prüft nur und installiert nichts. Aufruf aus dem Repo-Wurzelordner in WSL:

```bash
devices/motion-one/preflight.sh
```

Das Ergebnis liegt lokal in `preflight/PREFLIGHT_RESULT.md`. Die Datei enthält Pfade und Rechnerdaten und wird deshalb nicht
committet (`.gitignore` in diesem Ordner). Die Prompts lesen sie und gleichen den Stand mit dir in einer einzigen Frage ab.

| Bereich | Was geprüft wird |
|---|---|
| Basis | Docker, Devcontainer-Image, `gh`-Anmeldung, Copilot CLI, Node.js |
| MCP | via `copilot mcp list`: GitHub, Playwright (Pflicht), KiCad, FreeCAD, Blender, JLCPCB/LCSC, Stripe (optional) |
| Programme (Windows) | `kicad-cli`, `freecadcmd`, Blender, ein Slicer mit CLI (PrusaSlicer, OrcaSlicer, Bambu Studio, CuraEngine) |
| Container | ffmpeg, pandoc, ngspice, Python, Node, git, xelatex (FreeCAD/Blender optional) |
| Prompt 2 | GitHub Pages, fal.ai-Schlüssel in `~/.env` (nur Vorhandensein), Stripe-Konto, Formulardienst für die Warteliste |

Status: PASS = bereit, MISSING = fehlt (Pflicht), OPTIONAL = Kommandozeile reicht, MANUELL = nur du kannst das, INFO.

## Stand 2026-11-07

Bereit: Docker, Devcontainer-Image, gh, Copilot CLI 1.0.107, GitHub MCP, KiCad 10.0.7, FreeCAD 1.1, Blender 5.2.3.

Offen (vor Prompt 1):
1. ~~Playwright MCP~~ erledigt 2026-11-07, getestet mit einem echten Aufruf (JLCPCB-Teileseite geladen). So eingerichtet:
   ```bash
   copilot mcp add playwright -- npx -y @playwright/mcp@latest --headless --browser chromium
   npx -y @playwright/mcp@latest install-browser chrome-for-testing   # ohne sudo; Standard „chrome“ fehlt in WSL
   ```
2. **Slicer**: Bambu Studio installieren (https://bambulab.com/download/studio). Drucker-Hypothese in Prompt 1 §0: Bambu Lab P2S Combo.
3. **ffmpeg, pandoc, ngspice, xelatex** fehlen im Devcontainer-Image; das erledigt der Agent in Prompt 1 (Image erweitern).
4. Optional: MCP-Server für KiCad, FreeCAD, Blender; sonst arbeitet der Agent über deren Kommandozeilen.

Offen (vor Prompt 2): GitHub Pages aktivieren, Stripe-Konto (Testmodus), Formulardienst für die Warteliste, fal.ai-Konto.
