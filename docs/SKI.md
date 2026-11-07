# Thingy Ski – Lauberhorn und Streif

Abfahrtsspiel im Browser (three.js) und in der Android-App, gesteuert mit dem Thingy:52.
Der Thingy wird wie ein Lenker flach in der Hand gehalten, Ladebuchse zu dir.

- Bridge: `http://127.0.0.1:8052/ski` (leitet auf `/tennis/ski/` um)
- Android: Pill „⛷ Ski“ im Header
- Quellcode: `tennis/src/ski/*` und `tennis/static/ski/`

## Steuerung

| Eingabe | Thingy | Tastatur |
|---|---|---|
| Lenken | seitlich kippen (Roll, gefiltert ca. 70 ms, 3° Totzone, voller Einschlag bei ca. 32°) | ← → / A D |
| Hocke | Nase nach unten kippen (ab 6°, voll bei 28°) oder Knopf halten | ↓ / S |
| Sprung | Ruck > 2,1 g oder Knopf kurz | Leertaste |
| Kamera | – | C (Verfolger / Cockpit / TV) |
| Ton aus | – | M |

Knopf lang drücken kalibriert die Neutrallage. Unten links steht die Bildrate und die Render-Auflösung in Prozent.

## Strecken

| | Lauberhorn (Wengen) | Streif (Kitzbühel) |
|---|---|---|
| Länge | 4480 m | 3312 m |
| Höhendifferenz | 1028 m | 860 m |
| Rekord | 2:22,58 | 1:51,58 |
| Schlüsselstellen | Russisprung, Hundschopf, Minsch-Kante, Canadian Corner, Kernen-S, Wasserstation (Tunnel), Hanneggschuss, Silberhornsprung, Österreicherloch, Ziel-S, Zielsprung | Mausefalle, Karussell, Steilhang, Brückenschuss, Gschöss, Alte Schneise, Seidlalmsprung, Lärchenschuss, Hausbergkante, Traverse, Zielschuss |
| Umgebung | Eiger, Mönch, Jungfrau, Sessellift „Wixi“ beim Start, Wengernalpbahn | Wilder Kaiser, Hahnenkammbahn |

Die Positionen der Schlüsselstellen sind aus Pistenplänen geschätzt. Der Hundschopf ist im Spiel 10 m breit (real deutlich enger), damit er spielbar bleibt.
Quellen: Wikipedia (Lauberhornrennen, Streif), Kitzbüheler Ski Club (Rennstrecke Streif, PDF), bergbahnen.org (Wixi).

## Technik

- Physik (`physics.ts`): Hangabtrieb, Gleitreibung `MU = 0.02`, Luftwiderstand stehend/Hocke, Schwung kostet Tempo, Sprünge an Kanten. Kalibriert auf Siegerzeiten (Autopilot-Test in `tennis/test/ski.test.ts`).
- Welt (`world.ts`): Gelände entlang der Mittellinie, Bäume, Netze, Tore, Zuschauer, Lifte, Tunnel, Panorama.
  Bäume, Netzpfosten und Randstangen sind in Abschnitte von 160 m geteilt, damit Frustum-Culling (auch im Schattenpass) wirkt; alles hinter dem Nebel (2400 m) wird nicht gezeichnet.
- Bildrate (`main.ts`): Die Physik läuft in Teilschritten ≤ 1/60 s, die genau die Bildzeit ergeben (kein Ruckeln bei 75–144 Hz). Fällt die Bildrate unter ca. 50 FPS, sinkt die Render-Auflösung schrittweise (bis 60 %), mit Reserve steigt sie wieder. `?q=1` fixiert die Auflösung.
- Smoke (`tennis/dev/ski-smoke.js`): rendert beide Strecken headless, prüft JS-Fehler, Fortschritt und ein Budget von höchstens 900 000 Dreiecken pro Bild.
