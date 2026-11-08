# Motion One – Resume

Stand 2026-11-08 06:45 CET. This is the authoritative task resume for Motion One. Read the repo-wide rules and resume hierarchy in [`../../../RESUME.md`](../../../RESUME.md) as well; root RESUME preserves older Thingy:52 context.

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
