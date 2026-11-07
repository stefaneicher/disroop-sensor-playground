# Progress

Stand: 2026-11-07 20:30. ✅ = erledigt, 🔄 = in Arbeit, ⬜ = offen.

## Meilensteine
| # | Meilenstein | Status | Notiz |
|---|---|---|---|
| 0 | Projekt + GitHub-Repo (öffentlich) | ✅ | https://github.com/stefaneicher/disroop-sensor-playground |
| 1 | Plan (Lavish) freigegeben | ✅ | `docs/plan.html`, Entscheide siehe RESUME.md |
| 2 | Protokoll aus der Werksfirmware analysiert | ✅ | UUIDs, Q-Formate, NFC-Raw, Speaker-Freq-Mode |
| 3 | `shared/chorus.json` (24 Noten) | ✅ | aus blinky `src/chorus.h` |
| 4 | Devcontainer-Image (Go, Node, JDK, Android SDK) | ✅ | Vorgabe: **alles** wird im Devcontainer-Image gebaut |
| 5 | BLE-Scan: Thingy sichtbar? | ✅ | `E3:58:08:1B:53:5F` "Thingy" −43 dBm; tinygo bluetooth funktioniert unter Windows, CGO_ENABLED=0 |
| 6 | `docs/protocol.md` + Telemetrie-JSON-Schema | ✅ | Vertrag für alle Agents |
| 7 | Agent **bridge** (Go: BLE → Terminal + HTTP/SSE, Lied, NFC) | ✅ | TDD, Simulator-Modus für Smoke-Tests |
| 8 | Agent **web** (Dashboard in `bridge/web/`) | ✅ | gegen Mock-SSE getestet |
| 9 | Agent **android** (Kotlin, `ch.disroop.sensorplayground`) | ✅ | Decoder-Unit-Tests, NFC via AAR |
| 10 | Hardware-Smoke-Test (Terminal, Lied, Web live) | ✅ | `./t hw.smoke` |
| 11 | NFC-Tag umschreiben → App öffnet | 🔄 | FW v2.2.0 per DFU, AAR geschrieben; Tap-Test durch User offen |
| 12 | CI (Build + Tests im Devcontainer-Image) + Release exe/apk | ✅ | Pre-Release v0.1.0-preview |
| 13 | Disroop-Look Web + Android, Screenshots | ✅ | 4310fa0, e289159 |
| 14 | Akku-Trend lädt/Akkubetrieb (Heuristik) | ✅ | 56a5035 |
| 15 | Dashboard: Zeitachsen, Zoom, Kompass, ⓘ-Erklärungen | ✅ | 8ea2145, docs/MESSGROESSEN.md |
| 16 | Thingy Tennis (eigene App `tennis/`, /api/motion 100 Hz) | ✅ | docs/TENNIS.md; BLE-Fix fcdde64; Live-Spieltest mit Schwüngen offen |
| 17 | Copilot-Diktat-App (Konzept) | 🔄 | `../copilot-diktat/.lavish/diktat-konzept.html`, Entscheide offen |
| 18 | Thingy Ski (Lauberhorn, Streif), Ton, FPS-Anzeige, Performance | ✅ | docs/SKI.md, 0c38ca9 |
| 19 | Android-UI wie Web, Tennis + Ski in der App | ✅ | 0c38ca9 |
| 20 | Umbenennung zu `disroop-sensor-playground` | ✅ | NFC-Tag neu schreiben offen |
| 21 | Thingy-Ausrichtung im Dashboard (180°?) | 🔄 | wartet auf Kompass-Test des Users |
| 22 | Eigener Controller „Disroop Motion One“: Vorab-Test, Prompt 1 (Entwicklung), Prompt 2 (Video, Produktseite) | ✅ | `devices/motion-one/`, Ausführung NOT RUN |
| 23 | Copyright Stefan Eicher fürs ganze Repo | ✅ | `LICENSE` |

## Erkenntnisse
- Toolversionen (geprüft 2026-11-06): Go 1.27.3, Node 26.13.0 (LTS), Gradle 9.9.0, Android platform 36, build-tools 36.1.0, cmdline-tools 16111833 (android-37 nicht im alten Repo-Format verfügbar), Docker 29.9.3.
- PowerShell kann keine WinRT-BLE-Events abonnieren → BLE nur über die Go-exe.

- Motion One: Aufsetzen (Agents, Skills, Struktur) PASS; Smoke-Tests und V1 NOT RUN. Siehe devices/motion-one/management/PROJECT_STATE.md
