# Vorschlag: Skills für einen QA-/Regulatory-Spezialisten

Das Repo hat unter `.github/skills/` bereits Skills (z. B. `engineering-evidence`, `firmware-ble-workflow`) und unter `.github/agents/`
Agent-Profile. Für Medizinprodukt-Software würde ich sie so ergänzen. **Noch nichts angelegt**, das ist ein Vorschlag zur Auswahl.

## Skills

| Skill (Name) | Aufgabe | Wichtigste Regeln |
|---|---|---|
| `iec62304-documentation` | SRS, SAD, SDD, Matrix pflegen; `regulatory/build_site.py --check` laufen lassen | Keine Anforderung ohne ID, Code-Link und Test oder `NOT RUN`. Reverse-engineerte Aussagen als solche kennzeichnen |
| `risk-management-iso14971` | Gefährdungsliste, Risikokontrollen, Restrisiko, Verifikation der Kontrollen | Schweregrad und Wahrscheinlichkeit nur mit Begründung; jede Kontrolle wird zur Anforderung und zum Test |
| `soup-management` | SOUP-Liste, Versionen, Fehlerlisten, Lizenzen, SBOM | Jede SOUP mit Version und Prüfdatum; neue Version heisst neue Bewertung |
| `software-verification-class-c` | Testplanung: Unit, Integration, System; Abdeckung; Grenzwerte; Hardware-in-the-Loop | Statement- und Branch-Abdeckung messen, kritische Teile ggf. MC/DC; Testergebnisse als Bericht, nie als Behauptung |
| `cybersecurity-medical-ble` | Bedrohungsmodell, Kopplung, Updates, SBOM, Schwachstellenmanagement | IEC 81001-5-1 und FDA-Cybersecurity-Leitfaden als Checkliste |
| `fda-premarket-software` | Einreichungspaket zusammenstellen (Softwarebeschreibung, Architektur, V&V, Anomalienliste) | Dokumentationsstufe und Geräteklasse **nicht** selbst festlegen, sondern markieren |
| `change-impact-analysis` | Auswirkung jeder Änderung auf Anforderungen, Risiken, Tests (62304 6.2, 7.4, 8.2) | Kein Merge ohne Einschätzung „betrifft Risiko ja/nein“ |
| `toolchain-qualification` | Compiler-Matrix, Warnungen als Fehler, Werkzeugversionen, Reproduzierbarkeit | Digests statt Tags, Versionen in `toolchain_matrix` festhalten |

## Agent-Profil

Ein Profil `.github/agents/regulatory-qa-engineer.agent.md` neben den bestehenden fünf (Systems, PCB, Firmware, Mechanik, Docs).
Es besitzt die Dokumente unter `devices/motion-one/regulatory/`, prüft Änderungen der anderen Agenten gegen die Matrix und blockt
Freigaben, solange ein P1-Befund aus der [Lückenanalyse](08_Luecken.md) offen ist.

## Reihenfolge

1. `iec62304-documentation` und `software-verification-class-c` (direkt nutzbar, weil die Dokumente jetzt da sind).
2. `risk-management-iso14971` und `soup-management`.
3. Rest, sobald die Zweckbestimmung (OPEN-01) feststeht.

## Grenzen

Ein KI-Skill ersetzt keine verantwortliche Person im Qualitätssystem. Freigaben, Risikoakzeptanz und die Einstufung gegenüber der
FDA sind Entscheidungen von Menschen mit Befugnis. Die Skills bereiten vor und prüfen auf Vollständigkeit.
