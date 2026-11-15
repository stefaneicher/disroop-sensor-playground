# Erklärvideo «Disroop Sensor Playground»

Rund 2 Minuten, Englisch und Deutsch, mit Sprecherstimme und Untertiteln: Playground-Seite, Thingy:52-Dashboard mit Live-Werten,
Tennis- und Ski-Demo, Motion One als 3D-Explosionsansicht, Platine r3, Stückliste (BOM) und SLS-Gehäuse.

Ergebnis: [`sensor-playground-explainer.mp4`](sensor-playground-explainer.mp4) (1920 × 1080, 30 fps, H.264/AAC), auf YouTube: https://youtu.be/hHnMrmjFHO4 (eingebunden auf der [Startseite](https://stefaneicher.github.io/disroop-sensor-playground/)).
Deutsch: [`sensor-playground-explainer-de.mp4`](sensor-playground-explainer-de.mp4), auf YouTube: https://youtu.be/GS7jUteytK8. Die Startseite zeigt Deutsch, mit Umschalter auf Englisch.

```bash
./project video build    # alles: web + tennis build, Stimme, Aufnahme, Schnitt (Docker)
./project video render   # nur neu schneiden aus vorhandenen Clips, z. B. nach Textänderung an den Untertiteln
./project video tts      # nur Stimme neu (VOICE=am_michael, andere Kokoro-Stimmen z. B. bm_george)
VIDEO_LANG=de ./project video build   # deutsche Fassung (Text: script.de.json, Stimme Piper «Thorsten»)
```

Text ändern: `script.json` bzw. `script.de.json` (eine Szene pro Eintrag; `say` = abweichende Aussprache für die Stimme). Danach `tts`, `record`, `render` neu, weil die Szenenlängen
der Stimme folgen.

## Ablauf

| Schritt | Datei | Was |
|---|---|---|
| Stimme | `tts.py` | Englisch: [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (offline, Apache-2.0). Deutsch: [Piper](https://github.com/rhasspy/piper), Stimme «Thorsten» (offline). → `build/<lang>/tts/*.wav`, `build/<lang>/durations.json` |
| Aufnahme | `rec.py` | Headless Chromium. Spiele mit virtueller Uhr (rAF/`performance.now` pro Bild weitergeschaltet), darum flüssige 30 fps auch mit Software-WebGL. Dashboard in Echtzeit gegen den Mock-Server (Simulator). |
| 3D und BOM | `scene.html`, `bom.py` | three.js-Szenen aus `devices/motion-one/mechanics/assembly_stl` und `devices/motion-one/sourcing/BOM_V1.md`, Bild für Bild über `renderAt(t)` |
| Schnitt | `render.py` | HUD-Rahmen, Zooms, Überblendungen, Untertitel → `build/scenes/*.mp4` |
| Ton | `audio.py` | Stimme + leiser synthetischer Klangteppich |
| Gesamt | `pipeline.sh`, `lang.py`, `Dockerfile`, `scripts/video.sh` | Reihenfolge, Sprache (`VIDEO_LANG`), Werkzeug-Image, `./project video` |

## Aussagen im Video

Nur belegte Aussagen gemäss `devices/motion-one/media/HANDOFF_MARKETING.md`. Die Teilekosten (rund 20 USD pro Gerät)
sind als Berechnung genannt. Laufzeit, Latenz und andere Hardware-Messwerte sind bewusst nicht im Video (NOT RUN).
