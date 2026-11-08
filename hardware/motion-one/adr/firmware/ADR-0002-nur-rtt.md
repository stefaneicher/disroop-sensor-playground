# ADR-0002: Kein UART, Debug nur über SWD/RTT (Q-02)

- **Status:** Angenommen
- **Datum:** 2026-11-08
- **Disziplin:** firmware
- **Entscheider:** User („ja kein UART“)
- **Betrifft:** `firmware/app/prj.conf`, PCB (kein TX-Testpad)

## Entscheid
Das Log läuft über Segger RTT via TC2030/SWD. Das UART-Backend und die Konsole sind aus, auf der PCB gibt es kein TX-Pad.

## Konsequenzen
Zum Debuggen ist eine SWD-Probe nötig. Ein freier Pin bleibt für die Erweiterung (electronics/ADR-0002).
