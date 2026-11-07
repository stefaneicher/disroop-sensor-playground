# Vorab-Smoke-Test (vor den Master-Prompts)

Bevor ein Master-Prompt gestartet wird, prüft `preflight.sh`, ob Rechner, Programme, Container und MCP-Server bereit sind.
Das Skript prüft nur und installiert nichts. Aufruf aus dem Repo-Wurzelordner in WSL:

```bash
devices/motion-one/preflight.sh
```

Das Ergebnis liegt in [`preflight/PREFLIGHT_RESULT.md`](preflight/PREFLIGHT_RESULT.md). Die Prompts lesen diese Datei und
gleichen den Stand mit dir in einer einzigen Frage ab.

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
1. **Playwright MCP** einrichten (`/mcp` in Copilot CLI bzw. `copilot mcp add`), dann prüfen mit `copilot mcp list`.
2. **Slicer** installieren (PrusaSlicer oder OrcaSlicer) und in Prompt 1 §0 den 3D-Drucker eintragen.
3. **ffmpeg, pandoc, ngspice, xelatex** fehlen im Devcontainer-Image; das erledigt der Agent in Prompt 1 (Image erweitern).
4. Optional: MCP-Server für KiCad, FreeCAD, Blender; sonst arbeitet der Agent über deren Kommandozeilen.

Offen (vor Prompt 2): GitHub Pages aktivieren, Stripe-Konto (Testmodus), Formulardienst für die Warteliste, fal.ai-Konto.
