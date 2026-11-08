# Änderungsprozess für Disroop Motion One

Der Skill `engineering-change` wird nur auf ausdrückliche Aufforderung des Users ausgelöst, zum Beispiel:

`/engineering-change <Beschreibung der gewünschten Änderung>`

Eine klare Änderungsanfrage im Chat gilt ebenfalls als Auslöser. Diese Beispiele sind keine Freigabe für eine Änderung.

Der Manager bleibt in derselben Session und verwendet die bestehenden Spezialisten. Ablauf:

1. Aktuellen Stand und letzte veröffentlichte Baseline sichern; Release-Dateien nicht überschreiben.
2. Nummerierten Antrag `changes/CR-NNN.md` anlegen, betroffene Anforderungen, Teile, Dokumente, Risiken und Verifikation eintragen.
   Die betroffenen Dokumente aus der Wahrheitsquellen-Tabelle in `KONSISTENZ.md` §1 ableiten (Master-Datei → abgeleitete Dateien).
3. Fachlich betroffene Spezialisten mit Eingangsrevisionen, erlaubten Schreiborten, Abnahmekriterien und Handoff-Format beauftragen.
4. Ergebnisse prüfen und alte/neue Werte und Artefakte vergleichen; Schnittstellenänderungen mit abhängigen Disziplinen abstimmen.
5. Anforderungen, `metrics.json`, Anleitungen, Verifikationsmatrix und Checksummen aktualisieren.
6. Konsistenz-Review (`consistency-review`) ohne Release-blockierende Befunde.
7. Neues unveränderliches Release erstellen. Alte Releases bleiben unverändert; offene Prüfungen bleiben PARTIAL, FAIL, BLOCKED oder NOT RUN.

Bestellung, Bezahlung, Flashen, Einschalten oder physische Tests erfordern eine separate ausdrückliche Freigabe.
