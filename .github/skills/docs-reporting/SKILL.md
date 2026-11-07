---
name: docs-reporting
description: "Montageanleitung, Bedienungsanleitung und technischer Bericht: Markdown nach PDF mit Pandoc/xelatex."
---

# docs-reporting (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- `pandoc in.md -o out.pdf --pdf-engine=xelatex -V mainfont="DejaVu Sans" -V lang=de-CH`.
- Keine Behauptung ohne Beleg aus `management/metrics.json`; offene Werte als „offen“ markieren.
