# Erklärvideo «Disroop Sensor Playground»

Rund 2 Minuten, Englisch, mit Sprecherstimme und Untertiteln: Playground-Seite, Thingy:52-Dashboard mit Live-Werten,
Tennis- und Ski-Demo, Motion One als 3D-Explosionsansicht, Platine r3, Stückliste (BOM) und SLS-Gehäuse.

Ergebnis: [`sensor-playground-explainer.mp4`](sensor-playground-explainer.mp4) (1920 × 1080, 30 fps, H.264/AAC).

```bash
./project video build    # alles: web + tennis build, Stimme, Aufnahme, Schnitt (Docker)
./project video render   # nur neu schneiden aus vorhandenen Clips, z. B. nach Textänderung an den Untertiteln
./project video tts      # nur Stimme neu (VOICE=am_michael, andere Kokoro-Stimmen z. B. bm_george)
```

Text ändern: `script.json` (eine Szene pro Eintrag). Danach `tts`, `record`, `render` neu, weil die Szenenlängen
der Stimme folgen.

## Ablauf

| Schritt | Datei | Was |
|---|---|---|
| Stimme | `tts.py` | [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (offline, Apache-2.0) → `build/tts/*.wav`, `build/durations.json` |
| Aufnahme | `rec.py` | Headless Chromium. Spiele mit virtueller Uhr (rAF/`performance.now` pro Bild weitergeschaltet), darum flüssige 30 fps auch mit Software-WebGL. Dashboard in Echtzeit gegen den Mock-Server (Simulator). |
| 3D und BOM | `scene.html`, `bom.py` | three.js-Szenen aus `devices/motion-one/mechanics/assembly_stl` und `devices/motion-one/sourcing/BOM_V1.md`, Bild für Bild über `renderAt(t)` |
| Schnitt | `render.py` | HUD-Rahmen, Zooms, Überblendungen, Untertitel → `build/scenes/*.mp4` |
| Ton | `audio.py` | Stimme + leiser synthetischer Klangteppich |
| Gesamt | `pipeline.sh`, `Dockerfile`, `scripts/video.sh` | Reihenfolge, Werkzeug-Image, `./project video` |

## Aussagen im Video

Nur belegte Aussagen gemäss `devices/motion-one/media/HANDOFF_MARKETING.md`. Die Teilekosten (rund 20 USD pro Gerät)
sind als Berechnung genannt. Laufzeit, Latenz und andere Hardware-Messwerte sind bewusst nicht im Video (NOT RUN).
