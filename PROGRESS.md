# Progress

Stand: 2026-11-06 21:20. ✅ = erledigt, 🔄 = in Arbeit, ⬜ = offen.

## Meilensteine
| # | Meilenstein | Status | Notiz |
|---|---|---|---|
| 0 | Projekt + GitHub-Repo (öffentlich) | ✅ | https://github.com/stefaneicher/thingy52-live |
| 1 | Plan (Lavish) freigegeben | ✅ | `docs/plan.html`, Entscheide siehe RESUME.md |
| 2 | Protokoll aus der Werksfirmware analysiert | ✅ | UUIDs, Q-Formate, NFC-Raw, Speaker-Freq-Mode |
| 3 | `shared/chorus.json` (24 Noten) | ✅ | aus blinky `src/chorus.h` |
| 4 | Devcontainer-Image (Go, Node, JDK, Android SDK) | ⬜ | Vorgabe: **alles** wird im Devcontainer-Image gebaut |
| 5 | BLE-Scan: Thingy sichtbar? | ✅ | `E3:58:08:1B:53:5F` "Thingy" −43 dBm; tinygo bluetooth funktioniert unter Windows, CGO_ENABLED=0 |
| 6 | `docs/protocol.md` + Telemetrie-JSON-Schema | ⬜ | Vertrag für alle Agents |
| 7 | Agent **bridge** (Go: BLE → Terminal + HTTP/SSE, Lied, NFC) | ⬜ | TDD, Simulator-Modus für Smoke-Tests |
| 8 | Agent **web** (Dashboard in `bridge/web/`) | ⬜ | gegen Mock-SSE getestet |
| 9 | Agent **android** (Kotlin, `ch.disroop.thingylive`) | ⬜ | Decoder-Unit-Tests, NFC via AAR |
| 10 | Hardware-Smoke-Test (Terminal, Lied, Web live) | ⬜ | |
| 11 | NFC-Tag umschreiben → App öffnet | ⬜ | |
| 12 | CI (Build + Tests im Devcontainer-Image) + Release exe/apk | ⬜ | |

## Erkenntnisse
- Toolversionen (geprüft 2026-11-06): Go 1.27.3, Node 26.13.0 (LTS), Gradle 9.9.0, Android platforms 37, build-tools 37.0.0, cmdline-tools 9862592, Docker 29.9.3.
- PowerShell kann keine WinRT-BLE-Events abonnieren → BLE nur über die Go-exe.
