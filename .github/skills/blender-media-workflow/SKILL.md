---
name: blender-media-workflow
description: "Blender headless: Import echter Geometrie, Renderings, Explosionsansicht, Animation, Video mit ffmpeg."
---

# blender-media-workflow (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- `blender -b -P skript.py`; Import STL/STEP-konvertiert, Einheiten mm prüfen (scale 0.001).
- Renderings ≥ 3840 px, `film_transparent = True`, PNG RGBA; Video: `ffmpeg -framerate 30 -i f_%04d.png -pix_fmt yuv420p`.
