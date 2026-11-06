# Engineering-Regeln

- **TDD:** Erst einen fehlschlagenden Test schreiben, dann die minimale Implementierung, dann refactoren. Jede Decoder- oder Logikfunktion hat Unit-Tests mit Bytes aus `docs/protocol.md`.
- **Clean Code:**
  - kleine Funktionen, sprechende Namen
  - Hardware-Zugriff hinter Interfaces (Ports & Adapters), damit die Logik ohne Gerät testbar ist
  - keine globalen Zustände
- **Simulator first:** Jede App hat eine Simulator-Quelle (`source: "sim"`). Damit laufen Smoke-Tests ohne Hardware, in der CI und offline.
- **Alles im Devcontainer:** Builds und Tests laufen nur über `./project …`, und das läuft im Image `.devcontainer/Dockerfile`. Lokal wird nichts installiert. Die CI nutzt dasselbe Image.
- **Best Practices je Disziplin:**
  - **Go:** `gofmt`, `go vet`, `staticcheck`, table-driven Tests, `go test -race` für plattformunabhängige Pakete
  - **Web:** ES-Module ohne Build-Step, reine Logik in testbaren Modulen (`node --test`), Smoke-Test mit headless Chromium gegen die Bridge im Simulator-Modus
  - **Android:** Kotlin, Gradle-Wrapper, Decoder in reinem Kotlin mit JUnit-Tests, Runtime-Permissions sauber (`BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT`), Simulator-Modus in der App
- **Smoke-Tests:** `./project test` muss grün sein. Jede App hat dort mindestens einen Ende-zu-Ende-Smoke-Test gegen den Simulator.
- **Commits:** direkt auf `main`, kleine Schritte. Der Manager committet. Agents committen **nicht** und ändern nur ihre eigenen Pfade.
