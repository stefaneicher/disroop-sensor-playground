# Architecture Decision Records (ADR) – Motion One

Wichtige Entscheide werden je Disziplin als ADR festgehalten, **mit Bild** (Skizze/Screenshot der Lavish-Entscheidungsseite).

| Ordner | Disziplin |
|---|---|
| `systems/` | Anforderungen, Architektur, Schnittstellen |
| `electronics/` | Schaltung, Layout, Bauteile |
| `firmware/` | Firmware, BLE, Sensorfusion |
| `mechanics/` | Gehäuse, Fertigung, FEM |
| `docs-media/` | Anleitungen, Renderings |

## Ablauf
1. Optionen als Lavish-Seite mit beschrifteten Bildern zeigen (z. B. Ist vs. Vorschlag).
2. User entscheidet.
3. ADR `<disziplin>/ADR-NNNN-<kurzname>.md` nach [`TEMPLATE.md`](TEMPLATE.md) schreiben; HTML-Seite und PNG-Screenshot nach `<disziplin>/media/` kopieren und im ADR einbetten.
4. ADR in Handoff, `JOURNAL.md` und betroffenen Aufträgen referenzieren. Ersetzte ADRs auf Status `Ersetzt durch ADR-…` setzen, nie löschen.

## Index
| ADR | Titel | Status | Datum |
|---|---|---|---|
| [mechanics/ADR-0001](mechanics/ADR-0001-fuegestelle-lippe-nut.md) | Fügestelle Schalen: Lippe + Nut + Schattenfuge | Angenommen | 2026-11-08 |
| [systems/ADR-0001](systems/ADR-0001-fertigung-jlc.md) | Fertigung JLCPCB + JLC3DP | Angenommen |
| [mechanics/ADR-0002](mechanics/ADR-0002-sls-pa12.md) | Gehäuse SLS PA12, Lichtleiter SLA | Angenommen |
| [mechanics/ADR-0003](mechanics/ADR-0003-fem-pausiert.md) | FEM pausiert | Angenommen |
| [electronics/ADR-0001](electronics/ADR-0001-vibrationsmotor.md) | Vibrationsmotor LCM0827A3038F | Angenommen |
| [electronics/ADR-0002](electronics/ADR-0002-erweiterungsstecker-bedienplatine.md) | Erweiterungsstecker + Bedienplatine (r4) | Angenommen |
| [firmware/ADR-0001](firmware/ADR-0001-bootloader-v1.md) | USB-Bootloader in V1 | Angenommen |
| [firmware/ADR-0002](firmware/ADR-0002-nur-rtt.md) | Kein UART, nur RTT | Angenommen |
| [firmware/ADR-0003](firmware/ADR-0003-motor-leistungsbegrenzung.md) | Motor-PWM ≤ 3.0 V, Arbitrierung | Angenommen |
