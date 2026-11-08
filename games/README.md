# games – Spiele des disroop Playground

Spiele im Browser (three.js, TypeScript ohne Bundler) mit gemeinsamer Eingabe. Heute: Tennis und Ski.
Spielanleitungen und Architektur: [docs/TENNIS.md](../docs/TENNIS.md), [docs/SKI.md](../docs/SKI.md).

```bash
./project games build       # dist/ (tsc + static + three.js lokal) → hardware/thingy-bridge/internal/tennisapp/dist
./project games test        # build + typecheck + Unit-Tests + Smoke (headless Chromium)
./project games screenshot  # docs/img/tennis.png, docs/img/ski-*.png
./t tennis.play --sim       # Bridge im Simulator starten und Tennis öffnen
```

`./project tennis …` funktioniert weiterhin als Alias.

| Ordner | Inhalt |
|---|---|
| `src/input/` | Eingabe für alle Spiele: Verbindung zur Bridge oder Android-App (`link.ts`), Bewegungsframes (`motion.ts`), Quaternionen, Kalibrierung, Ausrichtungs-Wizard, Schwungdetektor, `controller.ts` |
| `src/tennis/` | Tennis: Spielkern ohne three.js in `core/` (Physik, Regeln, CPU, Grenzen), Grafik in `gfx/`, Szene, HUD, Audio, `main.ts` |
| `src/ski/` | Ski: Strecken (Lauberhorn, Streif), Physik, Welt, Skifahrer, `main.ts` |
| `src/common/` | Gemeinsames: FPS-Anzeige, Texturen |
| `static/` | `index.html` (Tennis, Importmap), `ski/index.html`, Styles, Header, Logo |
| `test/` | `node --test` Unit-Tests (`.ts` direkt per Type-Stripping) |
| `dev/` | `build.js`, `smoke.js`, `ski-smoke.js` (headless Chromium, Screenshots), `motion-rate.js`, `stats.ts` |

Ausgeliefert werden die Spiele weiterhin unter `/tennis/` und `/tennis/ski/` (Bridge, Android-App).
