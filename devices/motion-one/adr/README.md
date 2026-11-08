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
