# Ideen

Ungeordnete Ideen und Möglichkeiten, noch **nicht** entschieden. Wird eine Idee beschlossen, wandert sie als Aufgabe in [`TODO.md`](TODO.md) und wird hier durchgestrichen oder gelöscht.

**Regeln**
- Eine Idee pro Zeile oder kurzer Abschnitt. Kein Aufwand, keine Pflicht.
- Gute Idee mit Datum und Quelle (User, Agent) versehen.

## Offen
- Copilot-Diktat: Konzept unter `copilot-diktat/.lavish/diktat-konzept.html` (aus dem früheren Resume übernommen).
- Eigenes Spiel-Device als Nachfolger des Thingy (siehe Motion One).

### Software-Qualität wie in der Medizinentwicklung (User, 2026-11-08)
Weiterentwickelt als Anforderungsentwurf in `devices/motion-one/regulatory/10_Prozessanforderungen.md` (dort PRQ-040 bis PRQ-046).
Idee, noch nicht entschieden. Die Eigenschaften, die der User aus der Medizinalentwicklung kennt, sollen für die Firmware (und sinnvoll auch Bridge/Android) gelten:
- **Warnungen sind Fehler, null Warnungen:** `-Werror` mit `-Wall -Wextra` (und strengeren Sätzen) auf allen Compilern.
- **Mehrere Compiler und Versionen:** Clang, ARM-GCC (ein Compiler) und IAR (vom User bestätigt, 2026-11-08); jeweils in mehreren Versionen.
- **Matrix als Datei** (z. B. `devices/motion-one/firmware/toolchain_matrix.yml`): Welche Komponentenversion muss laufen. Aus ihr entstehen automatisch die Docker-Images und die parallelen CI-Jobs.
- **Build mit Conan 2.0 und modernem CMake** (Targets statt globaler Variablen, `target_link_libraries`, `target_compile_options` über ein Interface-Target `mo_warnings`). Ich habe „Core 2.0“ als **Conan 2.0** gelesen.

Entwurf der Matrix (nur ein Vorschlag, Versionen noch festzulegen):

| Compiler | Zweck | Versionen (Vorschlag) | Bemerkung |
|---|---|---|---|
| Clang (Host, x86) | Host-Unit-Tests, MC/DC, Sanitizer | 18 und neuer | frei |
| ARM GCC (`arm-none-eabi-gcc` / Zephyr SDK) | Zielgerät nRF52840 | Zephyr SDK 1.0.1 plus eine zweite | heutiger Weg über `west` |
| IAR (`iccarm`) | Zielgerät | je Lizenzversion | **kommerziell**: Lizenz, nicht in ein öffentliches Image. Geht nur mit eigenem Runner oder Lizenzserver. Zephyr-Unterstützung für IAR prüfen |

Fragen und Grenzen:
- Die Firmware ist heute mit **Zephyr/west** gebaut, die reinen C-Module (codec, fusion, icm, power, input) mit einem **Makefile** für Host-Tests. Die Matrix lässt sich zuerst auf die reinen Module anwenden (CMake-Bibliotheken je Modul), später auf die ganze App.
- Zielgerät mit mehreren Compilern ist nur so weit möglich, wie Zephyr und der HAL sie unterstützen.
- Gleitkomma (`float`) kann je Compiler leicht abweichen: Tests mit Toleranz, siehe GAP-11 in `devices/motion-one/regulatory/08_Luecken.md`.
- Docker-Images pro Compilerfamilie, Basis-Image per Digest festlegen. Jobs laufen parallel als GitHub-Actions-Matrix.

### IEC-62304-Dokumentation (User, 2026-11-08)
- Siehe `devices/motion-one/regulatory/`: SRS, SAD, SDD, SOUP, Risiko, Matrix, Lücken, Skills als Markdown und HTML mit Code-Links (Gedankenspiel „Medizin Klasse C“).
- Skill-Vorschläge für einen QA-/Regulatory-Spezialisten: `devices/motion-one/regulatory/09_Skills.md`.

## Verworfen
