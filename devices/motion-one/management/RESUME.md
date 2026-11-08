# Motion One – Resume

Stand 2026-11-08 06:45 CET. This is the authoritative task resume for Motion One. Read the repo-wide rules and resume hierarchy in [`../../../RESUME.md`](../../../RESUME.md) as well; root RESUME preserves older Thingy:52 context. Also check the repo-wide [`TODO.md`](../../../TODO.md) and [`IDEEN.md`](../../../IDEEN.md) and keep them current; run `git pull --rebase` at session start and push regularly.

## Current state
- §1–§7: project structure, 5 Custom-Agent profiles, 9 Skills, toolchain setup, smoke tests, V1 requirements, architecture and calculated budgets are documented.
- §8 Electronics: KiCad 10 project, 4-layer routed board, BOM, Gerber/CPL, four SPICE analyses and offer comparison exist. PCB ERC 0 errors; DRC 0 errors, 0 unconnected. Status PARTIAL: final costs/shipping are estimates, sample measurements NOT RUN, mechanics integration is ongoing.
- §9 Firmware: Zephyr application, UF2/HEX and 32/32 host tests exist. Status PARTIAL: update the placeholder DTS pin map from `electronics/PINOUT_V1.json`, then rebuild; hardware tests NOT RUN.
- §10 Mechanics: ergonomic enclosure CAD, five printable parts, 3MF/STL, tolerance part, PETG slices and render exist. Status PARTIAL: the first FEM mesh-convergence study and collision validation against the final board STEP need repair/reverification.
- §11 Media/docs, §12 integration review, §13 immutable release baseline are NOT RUN.
- Assembly/user-guide text drafts have been delegated; they must remain DRAFT until final board/enclosure revisions are integrated.
- A German technical-report source draft exists at `docs/report/TECHNISCHER_BERICHT_V1.md`; build the PDF only after final integration review.
- Energy models differ: systems estimate 65 h and PCB estimate 49 h (both BERECHNUNG with differing ANNAHMEN). Use 49 h as the conservative planning estimate; physical runtime remains NOT RUN.
- No hardware has been ordered, printed, flashed, or powered. No hardware-dependent test is a PASS.
- WSL memory setting `C:\Users\stefa\.wslconfig` is 12 GB but takes effect only after `wsl --shutdown`; no restart should be initiated by an agent.

## Immediate continuation
1. Complete cross-disciplinary iteration: PCB engineer adjusts board positions/features to the mechanical handoff; mechanical engineer incorporates current INTERFACES/board STEP and reruns CAD, collision checks and slicing; firmware engineer maps `PINOUT_V1.json` to DTS and reruns tests/build.
2. Review their new handoffs, verify artifacts/reports and resolve discrepancies. Commit/push the integrated design only after this verification.
3. Assign docs-media engineer §11: use exact approved CAD/board revisions, create assembly/user docs, Blender renderings and marketing handoff.
4. Manager creates `metrics.json` from verified handoffs, technical report/PDF, `REPRODUCE.md`, `DEMO_RUNBOOK.md`, requirements verification matrix, SHA-256 manifest, then `releases/V1_BASELINE/`.
5. Update root `README.md` link, `JOURNAL.md`, root `PROGRESS.md`, this Resume, run relevant checks, review diff, commit/push.

## Sourcing rule (user, 2026-11-08)
- Offers must cover PCBA **and** 3D printing of the enclosure parts, ideally from the same manufacturer (one order, one shipment). `sourcing/ANGEBOTE_V1.md` still needs this update and the r3 J2 connector (JST-SH C160402).

## Decisions (ADR)
- Important decisions are recorded per discipline as ADR with image in `adr/` (see `adr/README.md`). ADR-0001 (mechanics): shell joint with lip + groove + shadow gap, accepted 2026-11-08; mechanical engineer implements it in r3.
- Assembly viewer: STLs in assembly position in `mechanics/assembly_stl/` + `explode.json`.

## Key files
- Overall requirements: `PROMPT_1_ENTWICKLUNG.md`
- Current project state: `management/PROJECT_STATE.md`, `management/TASK_BOARD.md`
- Interfaces / board contract: `management/INTERFACES.json` (current PCB revision r2; do not assume mechanical acceptance)
- Pin map: `electronics/PINOUT_V1.json`
- Specialist handoffs: `management/handoffs/{pcb-engineer,mechanical-engineer,firmware-engineer}/`

## Boundaries
- Agents use the roles in `.github/agents/` as instructions but are general-purpose subagents until the user restarts Copilot CLI; do not claim the Custom-Agent runtime was verified.
- No purchasing, payment, hardware flashing, power-on testing, or account login without the user's explicit action/approval.
- Commits go directly to `main` and include the Copilot co-author trailer.

## FEM (2026-11-08)
PAUSIERT auf User-Entscheid („für das Gerät nicht so wichtig“). Letzter Stand: `mechanics/fem/fem_results.json` (03:43, Geometrie v1). r3-Netzstudie nicht gerechnet; nur auf Wunsch wieder aufnehmen.

## User-Entscheide 2026-11-08
- Q-01: Bootloader mit eigener Board-Definition schon in V1.
- Q-02: Kein UART, kein TX-Testpad in r4; Debug ausschliesslich über SWD/Segger RTT.

### User-Entscheid 2026-11-08 (Sourcing)
- Q-03: Hersteller **JLCPCB + JLC3DP** (alles aus einer Hand). Material: Gehäuseteile **SLS PA12**, Lichtleiter **SLA transparent**. Swiss3D/Schaffner bleibt Rückfalloption.
- Konsequenz: Gehäuse-r3-Toleranzen auf SLS-PA12 prüfen (nicht nur PETG-FDM-Profil); Druckteile `VORLAEUFIG_*` nach Gehäuse r3 final ersetzen, `mk_upload.py` neu laufen lassen. E73-Lager vor Bestellung neu prüfen.

### Lücke Vibrationsmotor (2026-11-08)
- Motor war nur als Lötpads J3 („Motor separat“) geführt: kein Modell, nicht in BOM, kein Platz im Gehäuse. Ursache: kein Abgleich „Bauteil ↔ Gehäuseplatz“ für Teile ausserhalb der SMT-BOM.
- F-09 (pcb-engineer, läuft): Modell wählen, BOM, INTERFACES, plus STEP-Modelle E73/USB-C/Taster/Schalter.
- F-10 (mechanical-engineer, nach r3): Mulde in Unterschale + neue Regel: jedes Teil aus BOM/INTERFACES braucht 3D-Modell und Platz in der Kollisionsprüfung.

### User-Entscheid 2026-11-08 (Q-04 Bedienelemente / Wiederverwendung)
- Ziel: Elektronik in eigenen, selbst gedruckten Gehäusen wiederverwendbar.
- PCB r4: 8-pol. JST-SH-Erweiterungsstecker (3V3, GND, EXT1–EXT5, mind. 2 ADC), 2× M2-Befestigungslöcher, LED-Pins auf Nicht-ADC-Pins umlegen.
- Bedienplatine (Tochterplatine, per Kabel): **Analog-Daumenstick** (X/Y + Druck) und **Touch-Fläche** (kapazitiv).
- Gehäuse-Starterkit (Massblatt + CadQuery-Vorlage) folgt. Bestellung verschiebt sich entsprechend.

## Stand 2026-11-08 17:20 (Session-Wechsel für FreeCAD-MCP)
**Erledigt heute:** PCB r4 (J5, LED-Pins, M2, Bedienplatine motion-one-ui) `01023ab`; Firmware r4-Pins, Stick/Touch, BLE EF680380, Motor-PWM (`af21e43`, `f30a401`, `4668da8`); ADRs aller Disziplinen; Gehäuse r3 Zwischenstand `99ba378`; F-08 gemessen `1a4854b`; Windows-FreeCAD-Alternative r4 `4119a86`; Agent-Regeln „nicht warten“ + Timebox.
**Gestoppt (User, zu langsam):** mech-r4 (Container). Stand: params.py/build_enclosure.py mit J5-Schlitz, Dom nur H2 (ADR mechanics/0004, H1 kollidiert mit Akku 64.7 mm³), Motor-Mulde; check_collision_r4.py + export_assembly.py vorbereitet, nicht gelaufen. Handoff `handoffs/mechanical-engineer/2026-11-08-r4.md` (PARTIAL). Uncommittete Mechanik-Dateien prüfen und committen.
**FreeCAD-MCP:** Add-on neka-nat/freecad-mcp in `%APPDATA%\FreeCAD\v1-1\Mod\FreeCADMCP`, RPC 127.0.0.1:9875 mit Autostart; MCP Bridge (CREATeNG) entfernt nach `C:\Users\stefa\freecad-mcp-bridge.removed-2026-11-08`. Eintrag `freecad` in `~/.copilot/mcp-config.json` (cmd.exe /c uvx.exe freecad-mcp), Backup `.bak`. Nach Neustart mit `/mcp` prüfen. Achtung: WSL erreicht Port 9875 nicht direkt, deshalb Start über cmd.exe.
**Nächste Schritte:** 1) MCP testen (FreeCAD offen lassen). 2) Gehäuse r4 fertig: J5-Hüllkörper C160407, Build, Kollision r4, STL dicht, Export print/ + assembly_stl/ – live via MCP oder Container mit Timebox. 3) Slice + `mk_upload.py`, E73-Lager prüfen. 4) Bridge/App: EF680380 optional abonnieren. 5) docs-media, Integrationsreview, Release V1_BASELINE. Offen PCB: TVS für J5, Pin-1 J5, JLC-Rotationen.
