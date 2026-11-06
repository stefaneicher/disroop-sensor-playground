# Projekt-CLI `./t`

Ein Befehl für alle wichtigen Aufgaben, ohne dass du die Doku lesen musst. Gebaut mit [Python Invoke](https://www.pyinvoke.org/).

```bash
./t              # alle Befehle mit Kurzbeschreibung
./t doctor       # ist alles bereit? (✅/❌ mit Tipps)
./t demo         # geführte Demo: echter Thingy, sonst Simulator
./t <befehl> --help
```

Beim ersten Aufruf installiert `./t` Invoke nach `.tools/py` (nur im Projekt, gitignored, Version in `tasks/requirements.txt`).

## Die wichtigsten Befehle

| Befehl | Was passiert |
|---|---|
| `./t setup` | Docker prüfen, Devcontainer-Image und `thingy.exe` bauen (`--ble`: kurz scannen) |
| `./t doctor` | Docker, Image, exe, APK, Port 8052, Chrome, Git prüfen |
| `./t demo` | Doctor → Build → Thingy da? `live` : `sim` → Browser → Spickzettel |
| `./t live` | Echter Thingy: Live-Anzeige im Terminal + Dashboard auf :8052 |
| `./t sim` | Simulator ohne Hardware auf :8060 |
| `./t scan` · `./t song --volume 40` · `./t song --stop` | Thingys suchen, Lied abspielen/stoppen |
| `./t led --color blau` | LED setzen (`rot`, `gruen`, `#ff8800`, `255,128,0`, `aus` …), braucht eine laufende Bridge |
| `./t nfc` · `./t nfc --restore` | NFC-Tag auf die App umschreiben (Backup zuerst) bzw. zurückschreiben |
| `./t test` · `./t test --area web` | Tests im Devcontainer (`bridge`, `web`, `android`, `cli`) |
| `./t build` · `./t ci` | Alles bauen · Tests + Build wie in der CI |
| `./t android.apk --install` | APK per `adb.exe` aufs Handy (sonst Anleitung zum Sideloaden) |
| `./t hw.smoke --nfc` | Hardware-Smoke-Test gegen den echten Thingy |
| `./t web.serve` · `web.open` · `web.screenshot` | Dashboard mit Mock-Daten, im Browser öffnen, Screenshots |
| `./t status` · `./t docs` | Letzte Commits und offene Meilensteine · Dokumentation |
| `./t release 0.1.0` | Probelauf für ein GitHub-Release, echt mit `--no-dry-run` |
| `./t clean` | `build/` aufräumen (behält `hw-lock` und NFC-Backups) |

## Regeln

- **Bauen und Testen** läuft immer im Devcontainer: Die Tasks rufen `./project` bzw. `scripts/*.sh` auf.
- **Hardware und Windows** (`thingy.exe`, Browser, `curl.exe`, `adb.exe`) laufen auf dem Host über WSL-Interop.
- Gibt es `build/hw-lock`, benutzt gerade jemand anderes den Thingy. Dann brechen `live`, `scan`, `song`, `nfc` und `hw.smoke` ab. Mit `--force` lässt sich das übersteuern.

## Entwickeln

- Pro Bereich ein Modul: `checks`, `dev`, `thingy`, `bridge`, `web`, `android`, `hw`, `info`, `release`, `demo`. Gemeinsame Helfer liegen in `_lib.py`.
- Tests (stdlib `unittest`, Invoke `MockContext`): `./t selftest` im Devcontainer oder `./t selftest --local`.
- Neue Invoke-Version: in `tasks/requirements.txt` **und** im Abschnitt «Python» von `.devcontainer/Dockerfile` ändern. Ein Test prüft, dass beide übereinstimmen.
