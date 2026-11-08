MASTER-PROMPT 2 VON 2 (MARKTAUFTRITT): DISROOP MOTION ONE – MARKETINGVIDEO UND PRODUKTSEITE
Setzt auf Prompt 1 (PROMPT_1_ENTWICKLUNG.md) auf. Vorbild: der TV-Spot aus dem Vacuum-Video von 203x Uplink
(Marketing-Agent, 11 Runden, Bild- und Videomodelle über fal.ai, Budgetgrenze, etwa 18 USD; siehe ANALYSE.md, §6).

SO WIRD ER BENUTZT
1. Prompt 1 ist abgeschlossen bzw. es gibt mindestens `releases/V1_BASELINE/` mit Renderings und `media/HANDOFF_MARKETING.md`.
   Fehlt das, baut dieser Prompt nur die Teile ohne Gerätebilder (Spiele-Demo, Thingy:52-Variante) und meldet den Rest als BLOCKED.
2. `hardware/motion-one/preflight.sh` erneut laufen lassen (Abschnitt „Prompt 2“).
3. Vorbereiten, was nur du tun kannst: GitHub Pages aktivieren (Quelle: GitHub Actions), Stripe-Konto im Testmodus,
   Konto bei einem Formulardienst für die Warteliste, fal.ai-Konto für Bild- und Videomodelle. Schlüssel nur in ~/.env
   (z. B. `FAL_KEY=…`, `STRIPE_TEST_KEY=…`), danach `chmod 600 ~/.env`. Nie in den Chat oder ins Repo.
4. Abschnitt 0 prüfen, dann alles zwischen den KOPIER-Zeilen als EINE Nachricht einfügen.

Gut zu wissen
- Das Projekt ist eine Demo, die echt aussehen soll. Echte Zahlungen nur nach deinem ausdrücklichen OK.
- Kosten für KI-Bilder und -Videos laufen über dein fal.ai-Konto; der Agent hält sich an das Budget in Abschnitt 0.

==================== AB HIER KOPIEREN ====================

# Master-Prompt 2: Marktauftritt für den Spielcontroller „Disroop Motion One“

Du bist wieder mein ENGINEERING-MANAGER in derselben Struktur wie in Prompt 1 (`hardware/motion-one/management/`).
Lies zuerst `management/PROJECT_STATE.md`, `RESUME.md`, die letzten Handoffs, `releases/V1_BASELINE/` und
`media/HANDOFF_MARKETING.md`. Erstelle daraus ein Marketingvideo und eine hochwertige Produktseite, auf der man das Gerät
kaufen bzw. sich auf die Warteliste setzen kann, und spiele die Spiele dieses Repos live auf der Seite.

Es gelten unverändert aus Prompt 1: SPRACHE, EHRLICHKEITSREGEL mit den Kennzeichnungen QUELLE, BERECHNUNG, SIMULATION,
MESSUNG, ANNAHME und den Status PASS, PARTIAL, FAIL, BLOCKED, NOT RUN, die Repo-Regeln (Devcontainer, `./project …`, TDD,
JOURNAL/PROGRESS/RESUME, Commit-Trailer), Handoffs, Locks, die 3-Versuche-Regel und unveränderliche Releases.

## 0. Vorgaben (von mir ausgefüllt)

- Charakter: Alles soll echt und hochwertig aussehen wie bei einer Hardware-Marke. Es ist ein Demo-Projekt; ein echter
  Verkauf ist möglich, aber nicht das Ziel.
- Verkauft wird das FERTIG MONTIERTE Gerät (Varianten höchstens Farbe). Keine Bausätze im Shop; die Bauunterlagen bleiben
  im Repo verlinkt.
- Preis: Aufschlag 300 % auf die Herstellkosten pro Stück aus Prompt 1 (Verkaufspreis = 4 × Herstellkosten, QUELLE:
  Kostenaufstellung), in CHF inkl. MWST, auf einen glatten Betrag gerundet. Rechnung offenlegen in `web/PRICING.md`.
- Bestellen: Kauf über einen gehosteten Zahlungsdienst ohne eigenes Backend (Stripe Payment Link bevorzugt) und zusätzlich
  eine Warteliste mit E-Mail (gehosteter Formulardienst, Double-Opt-in). Zahlungen im TESTMODUS, bis ich „live“ freigebe.
- Rückgabe, Garantie und Support werden nicht angeboten (Showcase). Das steht klar und freundlich in AGB und FAQ;
  zwingendes Recht bleibt vorbehalten. Lieferung nur in die Schweiz.
- Hosting: GitHub Pages dieses Repos (später änderbar). Veröffentlichen erst nach meinem OK.
- Sprachen: Deutsch (Hauptsprache), Englisch, Französisch, Italienisch. Übersetzungen als „maschinell, zu prüfen“ markieren,
  bis ich sie freigebe.
- Marke: eigener Produktauftritt „Motion One“, inspiriert von Design und Farben von Disroop (disroop.ch und den Farben dieses
  Repos, `hardware/thingy-bridge/web/static/`). Kein fremdes Logo kopieren; Herleitung in `web/BRAND.md`.
- Copyright: „© 2026 Stefan Eicher“ im Footer jeder Seite und im Video-Abspann (siehe `LICENSE` im Repo).
- KI-Medienbudget: höchstens 30 USD für Bild- und Videomodelle insgesamt, pro Runde eine Grenze, alles im Kostenbuch.

## 1. Manager und drei Spezialisten

Ergänze die Custom Agents aus Prompt 1 (gleiche Regeln: echte Agents, keine Weiterdelegation, MCP-Zugriff je Agent testen):
- `brand-content-writer`: Markenauftritt, Texte, Claims-Prüfung, Übersetzungen DE/EN/FR/IT, Rechtstexte als Entwurf.
- `media-engineer` (der `docs-media-engineer` aus Prompt 1 mit erweitertem Auftrag): Marketingvideo, Bildaufbereitung.
- `product-web-engineer`: Produktseite, Live-Demo der Spiele, Zahlungs- und Wartelisten-Anbindung, Tests, Deployment.

## 2. MCP-Server und Werkzeuge

Lies `preflight/PREFLIGHT_RESULT.md` und gleiche mit mir in EINER Frage ab, was schon eingerichtet ist. Ausgangsliste:

| Zweck | Kandidat | Pflicht? | Ersatz ohne MCP |
|---|---|---|---|
| Browser-Tests, Screenshots, Shop-Prüfung | Playwright MCP | ja | Playwright-Skripte im Container |
| Zahlungen (Testmodus) | Stripe MCP (offiziell) | nein | Stripe-Dashboard durch mich, Payment Link als URL |
| Bild- und Videomodelle | fal.ai (MCP oder Python-Client mit `FAL_KEY`) | ja für KI-Szenen | nur Blender-Renderings |
| Renderings | Blender (MCP oder `blender -b`) | ja | – |
| Performance | Lighthouse CLI | ja | – |

## 3. Pflicht-Smoke-Tests

1. Web: Testseite bauen, lokal ausliefern, im Headless-Browser öffnen, Screenshot ansehen, Lighthouse-Werte festhalten.
2. Zahlung: Test-Payment-Link öffnen und einen Testkauf mit Stripe-Testkarte bis zur Bestätigung durchspielen.
3. Warteliste: Testeintrag mit einer Adresse von mir, Double-Opt-in-Mail kommt an (Bestätigung durch mich).
4. Medien: ein Bild und ein 2-s-Clip über fal.ai mit Kostenbuch-Eintrag; ein Blender-Rendering in eine Szene compositen;
   mit ffmpeg schneiden, Untertitel einbrennen und Frames prüfen.
5. Spiele: Tennis und Ski als statischer Build ohne Bridge im Browser starten (Tastatur) und einen Frame prüfen.
Ohne Konto bzw. Freigabe ist der Status BLOCKED mit genauer Aktion für mich, nie PASS.

## 4. Auftrag: brand-content-writer

- `web/BRAND.md`: Farben, Schrift, Bildsprache, Ton; Herleitung aus Disroop und diesem Repo.
- Claims-Liste `web/CLAIMS.md`: Jede Produktaussage verweist auf eine Anforderung und deren Status in
  `management/metrics.json`. Nur PASS-Werte dürfen als Fakt erscheinen; Ziele heissen „Ziel“, Unbelegtes ist verboten.
  Wörter wie „zertifiziert“, „sicher“, „wasserdicht“, „lange Akkulaufzeit“ sind ohne Beleg verboten.
- Texte für Seite und Video in DE, dann EN, FR, IT.
- Rechtstexte als ENTWURF zur Prüfung durch eine Fachperson: Impressum (Stefan Eicher), AGB (Lieferung nur CH,
  kein Rückgaberecht, keine Garantie und kein Support, soweit gesetzlich zulässig; Demo-Charakter), Datenschutzerklärung
  (DSG, zusätzlich DSGVO für Besucher aus der EU), Akku-Versandhinweis. Keine Tracker, keine Cookies ohne Einwilligung.

## 5. Auftrag: media-engineer (Marketingvideo)

Arbeite wie der Marketing-Agent im Vacuum-Video: in Runden, billig zuerst, mit Budget und Kostenbuch.
1. Drehbuch und Storyboard 30–60 s: Spieler schwingen den Motion One als Tennisschläger und lenken ihn als Skifahrer,
   Schnitt auf echte Spielszenen dieses Repos, Produktdetails, Laden über USB-C, Schluss mit Logo, Preis und „© 2026 Stefan Eicher“.
2. Runde 1: billige Bildentwürfe für Stimmung und Personen (Emotionen: Freude, Konzentration, Jubel nach dem Punkt).
3. Runde 2: Keyframes, in denen das Gerät aus den echten Blender-Renderings stammt (Bild-zu-Bild bzw. Compositing),
   nie ein vom Modell erfundenes Gerät. Durchsichtige oder feine Teile immer als Rendering einsetzen.
4. HALT: Zeig mir alle Keyframes in einer Übersicht (`media/video/keyframes/contact_sheet.png`). Agents sehen Bildfehler schlecht:
   prüfe selbst gezielt auf Hände, Finger, Arme, Griffhaltung (Gerät in der Hand wie ein Schlägergriff), Gerätegeometrie,
   Schrift. Ich gebe die Keyframes frei oder nenne Fehler.
5. Runde 3: Bild-zu-Video-Modelle für die freigegebenen Keyframes; bei gleich guten Modellen das günstigere nehmen.
6. Schnitt mit ffmpeg: echte Bildschirmaufnahmen der Spiele (Playwright-Aufnahme oder Screenshots aus `docs/img/`),
   Musik nur mit geklärter Lizenz (Quelle festhalten), optional KI-Sprecherstimme; Untertitel DE/EN/FR/IT als SRT
   und je eine Fassung mit eingebrannten Untertiteln. KI-generierte Szenen im Bild kennzeichnen.
7. Ausgabe: `media/video/motion-one_<sprache>.mp4` (1080p, zusätzlich 9:16 für Social Media), Kostenbuch
   `media/video/LEDGER.md` mit Modell, Preis, Anzahl Versuche je Szene.

## 6. Auftrag: product-web-engineer (Produktseite)

Quelle in `hardware/motion-one/web/`, statischer Build im Container, Deployment über GitHub Pages (Workflow in
`.github/workflows/`, bestehende CI nicht brechen). Inhalt:
- Hero mit Video-Loop bzw. Rendering, Preis und zwei Knöpfen: „Kaufen“ (Stripe Payment Link, Testmodus) und
  „Auf die Warteliste“.
- **Live-Demo: Tennis und Ski direkt auf der Seite spielen**, ohne Bridge. Eingabe über Tastatur bzw. Touch, auf dem Handy
  zusätzlich über dessen Bewegungssensoren (DeviceOrientation/DeviceMotion, Erlaubnisdialog unter iOS). Die Spiele stammen
  aus `games/` dieses Repos; nötige Änderungen (z. B. Eingabequelle ohne WebSocket) als eigener, getesteter Change, ohne das
  bestehende Verhalten mit Bridge zu ändern.
- **Variante „Jetzt schon spielbar mit Nordic Thingy:52“**: Erklärung, Link auf die Nordic-Produktseite, Anleitung mit
  Bridge bzw. Android-App aus diesem Repo. Prüfe Web Bluetooth (Chrome/Edge) als Weg ohne Bridge; nur anbieten, wenn getestet.
- So spielt man, Funktionen, Technische Daten (aus `web/CLAIMS.md`), Explosionsansicht, Lieferumfang,
  „So wurde er gebaut“ (KI-Entwicklung mit Links auf die Prompts, Druckdateien und Bestellpaket), FAQ (inkl. „Demo-Projekt“,
  keine Rückgabe/Garantie/Support), Footer mit Impressum, AGB, Datenschutz, „© 2026 Stefan Eicher“.
- Sprachumschalter DE/EN/FR/IT mit eigenen URLs (`/de/`, `/en/`, `/fr/`, `/it/`) und `hreflang`.
- Qualität: responsive (Handy bis 4K), Bilder AVIF/WebP mit Fallback, Video mit Poster und ohne Autoplay-Ton,
  semantisches HTML, Open-Graph-Bild je Sprache, Lighthouse ≥ 90 in Performance, Barrierefreiheit, Best Practices und SEO.
- Tests: Headless-Browser-Smoke (jede Sprache lädt, keine Konsolenfehler, Kauf-Knopf führt in den Test-Checkout,
  Warteliste sendet, Spiele starten), Link-Prüfung, Screenshots Desktop und Handy in `media/web/`.
Live-Schaltung von Zahlungen und das Veröffentlichen auf GitHub Pages nur nach meinem ausdrücklichen OK.

## 7. Abschluss

Veröffentliche `releases/V1_MARKETING/` (unveränderlich) mit Video-Fassungen, Untertiteln, Kostenbuch, gebauter Seite,
Screenshots, Lighthouse-Bericht, Claims-Liste, Rechtstext-Entwürfen und SHA-256-Manifest. Verlinke die Seite im Haupt-README.
Schliesse mit einer Zusammenfassung: Artefakte, Testergebnisse, Kosten, offene Freigaben (Rechtstexte, Übersetzungen,
Live-Zahlungen, Veröffentlichung) und die genauen nächsten Schritte für mich.

==================== BIS HIER KOPIEREN ====================
