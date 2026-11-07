# Disroop Motion One

Ein eigener Handcontroller für Thingy Tennis und Thingy Ski, der den Nordic Thingy:52 als Bewegungssensor ersetzt.
Er spricht dasselbe BLE-Profil (siehe [docs/protocol.md](../../docs/protocol.md)), damit Bridge, Web-Spiele und Android-App
ohne Änderung funktionieren. Er wird mit USB-C geladen.

Das Gerät soll vollständig von einer KI entwickelt werden: Anforderungen, Elektronik mit elektrischer Analyse, Firmware,
3D-druckbares Gehäuse, Bestellung der bestückten Leiterplatte, Montage- und Bedienungsanleitung, Marketingvideo und
eine Produktseite mit Live-Demo der Spiele, Kauf und Warteliste.

| Datei | Inhalt |
|---|---|
| [PREFLIGHT.md](PREFLIGHT.md) | Vorab-Smoke-Test (`preflight.sh`): Programme, Container, MCP-Server, Konten |
| [PROMPT_1_ENTWICKLUNG.md](PROMPT_1_ENTWICKLUNG.md) | Prompt 1: Gerät entwickeln (Elektronik, Firmware, Gehäuse, Bestellpaket, Anleitungen) |
| [PROMPT_2_MARKTAUFTRITT.md](PROMPT_2_MARKTAUFTRITT.md) | Prompt 2: Marketingvideo und Produktseite (DE/EN/FR/IT, Live-Demo, Kauf im Testmodus, Warteliste) |
| [ANALYSE.md](ANALYSE.md) | Analyse des Vorbilds „Master Prompt Vacuum“ (203x Uplink): Struktur, Stärken, Lücken, was wir übernehmen |

## Name

**Motion One**: Er zeigt den Zweck (Bewegung als Eingabe) und dass weitere Generationen folgen können.
Weitere Ideen: Disroop Swing, Disroop Carve, Disroop Rally.

## Status

Prompts und Vorab-Test sind fertig. Die Entwicklung selbst ist NOT RUN.
Ablauf: `preflight.sh` → Prompt 1 → Prompt 2.
