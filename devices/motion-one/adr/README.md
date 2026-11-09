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
| [systems/ADR-0001](systems/ADR-0001-fertigung-jlc.md) | Fertigung JLCPCB + JLC3DP | Angenommen | 2026-11-08 |
| [systems/ADR-0002](systems/ADR-0002-ble-bedienplatine.md) | BLE-Format Bedienplatine EF680380 | Angenommen | 2026-11-08 |
| [mechanics/ADR-0002](mechanics/ADR-0002-sls-pa12.md) | Gehäuse SLS PA12, Lichtleiter SLA | Angenommen | 2026-11-08 |
| [mechanics/ADR-0003](mechanics/ADR-0003-fem-pausiert.md) | FEM pausiert | Angenommen | 2026-11-08 |
| [mechanics/ADR-0004](mechanics/ADR-0004-board-befestigung-r4.md) | Board-Befestigung r4 (M2 nur H2), J5-Schlitz, Motor-Mulde | Angenommen | 2026-11-08 |
| [electronics/ADR-0001](electronics/ADR-0001-vibrationsmotor.md) | Vibrationsmotor LCM0827A3038F | Angenommen | 2026-11-08 |
| [electronics/ADR-0002](electronics/ADR-0002-erweiterungsstecker-bedienplatine.md) | Erweiterungsstecker + Bedienplatine (r4) | Angenommen | 2026-11-08 |
| [firmware/ADR-0001](firmware/ADR-0001-bootloader-v1.md) | USB-Bootloader in V1 | Angenommen | 2026-11-08 |
| [firmware/ADR-0002](firmware/ADR-0002-nur-rtt.md) | Kein UART, nur RTT | Angenommen | 2026-11-08 |
| [firmware/ADR-0003](firmware/ADR-0003-motor-leistungsbegrenzung.md) | Motor-PWM ≤ 3.0 V, Arbitrierung | Angenommen | 2026-11-08 |
| [firmware/ADR-0004](firmware/ADR-0004-erweiterung-treiber.md) | Treiber J5: Stick, Touch, LED-Pins r4 | Angenommen | 2026-11-08 |
| [electronics/ADR-0003](electronics/ADR-0003-funkmodul-e73.md) | Funkmodul E73-2G4M08S1C (nRF52840) | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0004](electronics/ADR-0004-imu-icm45686.md) | IMU TDK ICM-45686 | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0005](electronics/ADR-0005-lader-tp4056.md) | Lader TP4056 mit diskretem Power-Path | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0006](electronics/ADR-0006-regler-xc6206.md) | 3V3-Regler XC6206P332MR (LDO) | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0007](electronics/ADR-0007-akkuschutz-dw01a.md) | Akkuschutz DW01A + FS8205A | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0008](electronics/ADR-0008-usb-c-esd.md) | USB-C TYPE-C-31-M-12 mit ESD USBLC6-2SC6 | Angenommen (nachträglich) | 2026-11-09 |
| [electronics/ADR-0009](electronics/ADR-0009-bedienteile.md) | Bedien- und Ausgabeteile: SW1, SW2, RGB-LED, Summer, NTC, Akkustecker | Angenommen (nachträglich) | 2026-11-09 |
