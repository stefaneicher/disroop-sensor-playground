---
name: thread-board
description: "Team-Status als Threads mit Sub-Threads: Aufträge, Agents, User-Feedback (gruppiert) und offene Fragen in THREADS.json führen und als Lavish-Board anzeigen. Portabel: Ordner in andere Repos kopieren."
---

# thread-board

Der Manager führt wie ein Team-Manager **Threads**: ein Thread ist ein Faden einer Sache, Sub-Threads beliebig tief.

## Daten: `THREADS.json` (Repo-Root)
```json
{"project":"…","updated":"ISO-Zeit","session":"<Copilot-Session-ID>","threads":[
 {"id":"T-01","parent":null,"title":"…","kind":"task|feedback|question|decision","topic":"…",
  "owner":"manager|<agent-name>|user","status":"open|running|done|blocked|needs-user",
  "source":"F-01 / Auftrag / Frage","refs":["commit abc1234","adr/…","handoff …"],"note":"…","archived":false,"agent_id":"<Sub-Agent-ID, optional>"}]}
```
- Status rollt nach oben: Eltern-Thread ist erst `done`, wenn alle Kinder `done` sind (der Generator berechnet das).
- Sub-Thread mit `owner` = Agent/Sub-Agent entspricht einem delegierten Auftrag.
- Typ-Marke je Thread: 💬 aus Chat (`feedback`), ❓ Frage, 📐 Entscheid, 📋 Aufgabe (Manager), 🤖 Agent-Auftrag bzw. pulsierend „Agent arbeitet“ (`task` mit Agent-`owner` und `status:running`).
- Bedienung: Knöpfe „Alle auf/zu“, „Nur offene“; Tasten J/K bzw. ↑/↓, ←/→, Enter, E, C, O, A; Doppelklick klappt einen ganzen Teilbaum.
- `archived:true` blendet einen Thread aus (Schalter „Archivierte ausblenden“, Standard an; Kinder werden mit ausgeblendet). Archivieren/Wiederherstellen per Knopf am Thread → Lavish-Prompt `tag:"archive"`, `data:{thread,archive}`.
- Fragen an den User: `kind:"question"`, `status:"needs-user"`, optional `options:[…]`; **Pflicht** `question` (ganze Frage mit Kontext) und `recommendation` – erscheinen aufklappbar am Thread.

## Regeln für den Manager
1. Jedes User-Feedback erhält eine ID `F-nn`, wird einem Topic zugeordnet und öffnet oder ergänzt einen Thread.
2. Agent starten/fertig, Commit, ADR, Blocker → Thread aktualisieren (`refs`, `status`).
3. **Vorschlagen:** Bei Meilensteinen oder wenn der User nach Stand fragt, das Board neu erzeugen und anbieten:
   `python3 .github/skills/thread-board/render_board.py THREADS.json .lavish/board.html && lavish-axi .lavish/board.html`
4. Antworten aus dem Board (Lavish-Prompts mit `data.thread`) in den Thread übernehmen; `tag:"archive"` → `archived` setzen.
5. **Cockpit-Feed:** Bei jedem sichtbaren Arbeitsschritt (Agent gestartet/fertig, Commit, Prüfung, Blocker) eine Zeile loggen:
   `python3 .github/skills/thread-board/render_board.py --log "mech-r3 gestartet"` (Watcher rendert, Seite lädt alle 10 s nach, Schalter „Live“).
6. `THREADS.json` mit den übrigen Statusdateien committen.

## Export in andere Repos
Ordner `.github/skills/thread-board/` kopieren (oder nach `~/.copilot/skills/` für alle Repos), leeres `THREADS.json` anlegen. Keine Abhängigkeiten ausser Python 3 und lavish-axi.

## Darstellung und Aktualisierung
- Jede Ebene hat einen eigenen Farbton (L0 blau, L1 violett, L2 türkis, L3 bernstein …), Geschwister wechseln die Helligkeit, links eine Farbleiste, oben ein Brotkrumen-Pfad (z. B. `T-01 › T-01.3 › F-01`).
- Nach **jeder** Änderung an `THREADS.json` das Board sofort neu rendern (oder Watcher: `render_board.py --watch THREADS.json .lavish/board.html` rendert bei jeder Dateiänderung automatisch); im Browser ggf. F5.
