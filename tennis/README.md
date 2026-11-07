# tennis – Thingy Tennis

Tennis-Spiel im Browser mit dem Thingy:52 als Schläger (three.js, TypeScript ohne Bundler). Spielanleitung, Sensor-Mapping
und Architektur: [docs/TENNIS.md](../docs/TENNIS.md).

```bash
./project tennis build       # dist/ (tsc + static + three.js lokal) → bridge/internal/tennisapp/dist
./project tennis test        # build + typecheck + Unit-Tests + Smoke (headless Chromium)
./project tennis screenshot  # docs/img/tennis.png
./t tennis.play --sim        # Bridge im Simulator starten und das Spiel öffnen
```

| Ordner | Inhalt |
|---|---|
| `src/core/` | deterministischer Spielkern ohne three.js (Physik, Schwung, Regeln, CPU) |
| `src/` | Browser: Szene, HUD, Audio, WebSocket-Link, `main.ts` |
| `static/` | `index.html` (Importmap), `style.css`, Logo |
| `test/` | `node --test` Unit-Tests (`.ts` direkt per Type-Stripping) |
| `dev/` | `build.js`, `smoke.js` (headless Chromium, Screenshot), `motion-rate.js`, `stats.ts` |
