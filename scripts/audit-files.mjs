import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTPUT = 'docs/DATEI_AUDIT.html';
const SOURCE_URL = 'https://github.com/stefaneicher/disroop-sensor-playground/blob/main/';
const HISTORY = /(?:^|\/)(?:logs|releases|handoffs|smoke|fem|datasheets)(?:\/|$)/;
const GENERATED = /(?:^|\/)(?:exports|export|pcba|print|assembly_stl|renders|cad)(?:\/|$)/;
const TEXT = /\.(?:md|html|css|json|ya?ml|toml|xml|txt|log|rpt|py|[cm]?jsx?|tsx?|go|kt|kts|c|h|sh|ps1|dts|dtsi|conf|cmake|kicad_(?:pcb|sch|pro|mod|sym))$/;
const ARCHIVES = new Set([
  'devices/motion-one/media/presentation/ZWISCHENBERICHT_2026-11-08_r3.html',
  'devices/motion-one/media/presentation/GEHAEUSE_FERTIGUNG_SLS_2026-11-08.html',
]);

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function classify(file) {
  if (file.startsWith('devices/motion-one/releases/')) {
    return { category: 'Snapshot behalten', reason: 'Release-/Manifest-Nachweiskette; Duplikatkopien sind hier beabsichtigt.' };
  }
  if (file.endsWith('.kicad_prl')) {
    return { category: 'Aufräumkandidat', reason: 'Lokaler KiCad-Anzeigezustand, nicht PCB-/Schaltplanquelle. Vor Entfernen Werkzeugbedarf und .gitignore prüfen.' };
  }
  if (ARCHIVES.has(file) || /\/media\/presentation\/(?:pcb_r3|erweiterung_r4)\//.test(file)) {
    return { category: 'Historisch behalten', reason: 'Datierte Präsentation bzw. deren Assets; alte URLs und Modellabhängigkeiten erhalten.' };
  }
  if (HISTORY.test(file)) {
    return { category: 'Nachweis behalten', reason: 'Protokoll, Handoff, Smoke, Datenblatt oder ältere Simulation; keine aktuelle Gesamtfreigabe daraus ableiten.' };
  }
  if (/\/scripts\/electronics\/(?:if_r[234]|add_pin1_j5|step_fix_leaky)\.py$/.test(file)
      || /\/scripts\/mechanics\/(?:fix_|stl_loc|diag_mesh|holes|brep_fix)/.test(file)) {
    return { category: 'Manuell prüfen', reason: 'Revisions-/Reparaturwerkzeug; Eingaben, Seiteneffekte und Reproduktionsbedarf vor Archivierung klären.' };
  }
  if (GENERATED.test(file) || /\/manufacturing\/upload\//.test(file)) {
    return { category: 'Ergebnis abgleichen', reason: 'Abgeleitetes bzw. paketiertes Artefakt: Eingangsrevision, Hash und Generator prüfen; nicht automatisch r5.' };
  }
  if (file.startsWith('.idea/') || file.startsWith('.vscode/')) {
    return { category: 'Werkzeugkonfiguration', reason: 'IDE-/Editor-Konfiguration, keine Laufzeitquelle; Team-Nutzen vor Entfernen klären.' };
  }
  if (file === OUTPUT) {
    return { category: 'Audit-Ausgabe', reason: 'Mit node scripts/audit-files.mjs regenerierbar; selbst nicht gehasht, um Selbstreferenz zu vermeiden.' };
  }
  return { category: 'Behalten / Nutzung prüfen', reason: 'Quelle, Vertrag, Test, Konfiguration oder Dokumentation. Statische Textsuche ist kein vollständiger Abhängigkeitsbeweis.' };
}

export function referenceIndex(records, corpus) {
  const known = new Set(records.map(record => record.path));
  const names = new Map();
  for (const file of known) {
    const name = path.posix.basename(file);
    if (!names.has(name)) names.set(name, []);
    names.get(name).push(file);
  }
  const result = new Map(records.map(record => [record.path, []]));
  for (const [source, text] of corpus) {
    const hits = new Map();
    for (const [i, line] of text.split(/\r?\n/).entries()) {
      // Embedded meshes/base64 are data, not path references.
      if (line.length > 4096) continue;
      for (const match of line.matchAll(/[\w@.+-]+(?:[\\/][\w@.+-]+)*/g)) {
        const token = match[0].replaceAll('\\', '/');
        const options = [token, path.posix.normalize(path.posix.join(path.posix.dirname(source), token))];
        let target = options.find(option => known.has(option));
        if (!target && token.startsWith('.')) {
          target = options.flatMap(option => ['.ts', '.js', '.mjs', '.py', '/index.ts'].map(ext => option + ext))
            .find(option => known.has(option));
        }
        let kind = 'Pfad';
        if (!target && !token.includes('/') && names.get(token)?.length === 1) {
          target = names.get(token)[0];
          kind = 'eindeutiger Dateiname';
        }
        if (target && target !== source && !hits.has(target)) {
          hits.set(target, { source, line: i + 1, kind });
        }
      }
    }
    for (const [target, reference] of hits) result.get(target).push(reference);
  }
  return result;
}

export function duplicateGroups(records) {
  const hashes = new Map();
  for (const record of records) {
    if (!record.sha256 || record.bytes === 0 || record.symlink) continue;
    if (!hashes.has(record.sha256)) hashes.set(record.sha256, []);
    hashes.get(record.sha256).push(record.path);
  }
  return [...hashes.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([hash, files]) => ({ sha256: hash, files }));
}

export function manifestEntries(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const match = line.match(/^([a-f0-9]{64}) {2}(\S+)(?:\s+.*)?$/);
    if (!match) throw new Error(`Ungültige Manifestzeile: ${line}`);
    const [, hash, file] = match;
    if (entries.has(file) && entries.get(file) !== hash) {
      throw new Error(`Widersprüchliche Manifest-Hashes: ${file}`);
    }
    entries.set(file, hash);
  }
  return [...entries].map(([file, hash]) => ({ file, hash }));
}

function engineeringEvidence(root) {
  const device = 'devices/motion-one/';
  const json = relative => JSON.parse(readFileSync(path.join(root, device, relative), 'utf8'));
  const compare = (file, expected) => {
    const full = path.join(root, file);
    try {
      const actual = sha256(readFileSync(full));
      return { file, expected, actual, status: actual === expected ? 'MATCH' : 'MISMATCH' };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { file, expected, status: 'MISSING' };
    }
  };
  const collision = json('mechanics/cad/collision_r4.json');
  const collisionInputs = Object.entries(collision.build_hash_sha256).map(([name, hash]) =>
    compare(`${device}mechanics/assembly_stl/${name}.stl`, hash));
  const explosionInputs = Object.values(json('mechanics/assembly_stl/explode.json').parts).map(part =>
    compare(`${device}mechanics/assembly_stl/${part.file}`, part.sha256));
  const releaseCopies = [
    ['SCHALTPLAN_r4.pdf', 'electronics/SCHALTPLAN_r4.pdf'],
    ['kicad_quellen_r4.zip', 'kicad/kicad_quellen_r4.zip'],
    ['pruefbelege_r4.zip', 'electronics/pruefbelege_r4.zip'],
  ].map(([source, destination]) => compare(
    `${device}releases/V1_BASELINE/artifacts/${destination}`,
    sha256(readFileSync(path.join(root, device, 'electronics/exports', source))),
  ));
  const testLog = readFileSync(path.join(root, device, 'logs/fw-pinmap/unit-tests.log'), 'utf8');
  const summaries = [...testLog.matchAll(/^(\d+) Tests (\d+) Failures (\d+) Ignored/gm)];
  if (summaries.length === 0) throw new Error('Keine Firmware-Testzusammenfassungen im erwarteten Log.');
  const manifest = manifestEntries(readFileSync(path.join(root, device, 'releases/V1_BASELINE/SHA256_MANIFEST.txt'), 'utf8'))
    .map(({ file, hash }) => compare(`${device}${file}`, hash));
  const gerberHash = sha256(readFileSync(path.join(root, device, 'manufacturing/pcba/motion-one_gerber_r4.zip')));
  const uploadCopies = ['jlcpcb', 'ch_schaffner_swiss3d'].map(provider =>
    compare(`${device}manufacturing/upload/${provider}/motion-one_gerber_r3.zip`, gerberHash));
  return {
    label: 'BERECHNUNG: Datei-Hashes und Auswertung vorhandener Logs; keine neuen Hardware-/CAD-Prüfungen.',
    collisionInputs, explosionInputs, releaseCopies, manifest, uploadCopies,
    firmware: {
      log: `${device}logs/fw-pinmap/unit-tests.log`,
      programs: summaries.length,
      tests: summaries.reduce((sum, match) => sum + Number(match[1]), 0),
      failures: summaries.reduce((sum, match) => sum + Number(match[2]), 0),
    },
  };
}

export function collect(root, { engineering = true } = {}) {
  const tracked = new Set(git(root, 'ls-files', '-z').split('\0').filter(Boolean));
  const untracked = git(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
  const files = [...new Set([...tracked, ...untracked, ...(engineering ? [OUTPUT] : [])])].sort();
  const changes = git(root, 'diff', '--name-only', 'HEAD', '-z').split('\0').filter(Boolean);
  const dates = new Map();
  for (const line of git(root, 'log', '--format=DATE:%cs', '--name-only').split('\n')) {
    if (line.startsWith('DATE:')) {
      dates.set('', line.slice(5));
    } else if (line && !dates.has(line)) {
      dates.set(line, dates.get(''));
    }
  }
  const records = [];
  const corpus = new Map();
  for (const file of files) {
    const record = { path: file, tracked: tracked.has(file), modified: changes.includes(file), lastCommit: dates.get(file) ?? null, ...classify(file) };
    if (file === OUTPUT) {
      records.push(record);
      continue;
    }
    const full = path.join(root, file);
    let stat;
    try {
      stat = lstatSync(full);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      records.push({ ...record, category: 'Fehlt im Arbeitsbaum', reason: 'Versionierter Pfad fehlt lokal; keine Löschfreigabe.' });
      continue;
    }
    if (stat.isDirectory()) {
      records.push({ ...record, category: 'Gitlink / separat prüfen', reason: 'Verzeichnis bzw. Submodul nicht rekursiv als Datei gelesen.' });
      continue;
    }
    const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(full)) : readFileSync(full);
    records.push({ ...record, bytes: bytes.length, sha256: sha256(bytes), symlink: stat.isSymbolicLink() });
    if (!stat.isSymbolicLink() && bytes.length < 2 * 1024 * 1024 && !bytes.includes(0)
        && (TEXT.test(file) || !path.posix.basename(file).includes('.'))) {
      corpus.set(file, bytes.toString('utf8'));
    }
  }
  const references = referenceIndex(records, corpus);
  const duplicates = duplicateGroups(records);
  const duplicateOf = new Map();
  for (const group of duplicates) for (const file of group.files) duplicateOf.set(file, group.files.filter(other => other !== file));
  for (const record of records) {
    record.references = references.get(record.path);
    record.duplicates = duplicateOf.get(record.path) ?? [];
  }
  return {
    baseCommit: git(root, 'rev-parse', 'HEAD').trim(),
    trackedCount: tracked.size,
    referenceFilesScanned: corpus.size,
    ignored: git(root, 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z').split('\0').filter(Boolean),
    records, duplicates,
    evidence: engineering ? engineeringEvidence(root) : null,
  };
}

export function render(report) {
  const data = JSON.stringify(report).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dateiaudit · Sensor Playground</title>
<style>
:root{color-scheme:dark;--bg:#111827;--card:#1f2937;--line:#374151;--lime:#a3e635;--muted:#aab5c2;--warn:#fbbf24}
*{box-sizing:border-box;min-width:0}body{margin:0;background:var(--bg);color:#f9fafb;font:15px/1.6 Inter,system-ui,sans-serif}
main{max-width:1280px;margin:auto;padding:40px 20px}h1{font-size:clamp(2rem,6vw,3.8rem);line-height:1.1}h2{margin-top:32px}
a{color:var(--lime)}p{max-width:1000px}.muted{color:var(--muted)}code,a{overflow-wrap:anywhere}
.notice,details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}.notice{border-left:4px solid var(--warn)}
.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:24px 0}.filters label{flex:1 1 260px}input,select{width:100%;margin-top:5px;padding:11px;background:var(--card);color:inherit;border:1px solid var(--line);border-radius:8px;font:inherit}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}th{background:var(--card)}th:first-child{width:31%}td small{color:var(--muted)}summary{cursor:pointer}ul{padding-left:20px}button{padding:10px 16px;background:var(--card);color:var(--lime);border:1px solid var(--line);border-radius:8px;cursor:pointer}footer{margin-top:30px;color:var(--muted)}
@media(max-width:650px){main{padding:28px 12px}table{table-layout:auto}th,td{padding:8px;font-size:.85rem}.tablewrap{max-width:100%}}
</style></head><body><main>
<a href="../index.html">Startseite</a> · <a href="../devices/motion-one/media/presentation/index.html">Motion-One-Stand</a>
<h1>Dateien nicht nach Alter löschen.</h1>
<p id="coverage"></p>
<div class="notice"><strong>Bewertung, keine Löschliste.</strong> Jeder Pfad erhält eine konservative Einordnung.
Fehlende Textreferenzen beweisen keine Nichtnutzung: Compiler, Ressourcenauflösung, Verzeichnis-Kopien,
Reflection, GitHub Pages und manuelle Werkzeugaufrufe werden nicht vollständig durch Textsuche erfasst.
Dateien mit gleichem Hash können absichtlich getrennte Release-/Buildkopien sein.</div>
<p class="muted">Reproduzieren: <code>node scripts/audit-files.mjs</code>.
Basiscommit: <code id="commit"></code>; Hashes beziehen sich auf Arbeitskopie-Bytes, nicht Git-Blobs.
Modifizierte/unversionierte Dateien sind gekennzeichnet. Die Audit-Ausgabe selbst wird nicht gehasht oder als Referenzquelle verwendet.</p>
<p class="muted">Quelllinks zeigen GitHub <code>main</code>. Lokale Änderungen und neue Dateien
sind dort erst nach Commit und Veröffentlichung sichtbar. Der Pages-Build erzeugt das Audit
aus seinem eigenen Checkout erneut; Text-Hashes können wegen Zeilenenden abweichen.</p>
<section><h2>Gezielt nachgewiesene Integrationsbefunde</h2><div id="evidence"></div></section>
<section><h2>Konkrete Aufräumentscheidungen</h2>
<div class="notice"><strong>Zur späteren Bereinigung vormerken, noch nicht löschen:</strong>
Die drei versionierten <code>.kicad_prl</code>-Dateien sind lokale KiCad-Ansichtszustände.
Die Einzelansicht zeigt die gefundenen Referenzen. Vor Entfernen Team-Bedarf und Ignore-Regel klären;
PCB-, Schaltplan- und Projektdateien sind davon nicht betroffen.</div>
<p><strong>Uploadpakete: neu erzeugen statt nach Dateinamen löschen.</strong>
<code>scripts/electronics/mk_upload.py</code> liest das r4-Gerber-ZIP, schreibt aber weiterhin
den Namen <code>motion-one_gerber_r3.zip</code>. Der Handoff vom 08.11. r4b dokumentiert
bereits r4-Inhalt unter r3-Namen. Der Hash-Abgleich oben vergleicht die heutigen Bytes
mit der heutigen r4-Quelle; ein abweichender Hash beweist keine konkrete Inhaltsrevision.
Paket-Verzeichnisse und ZIPs erst nach freigegebenem gemeinsamen Eingangsstand ersetzen.</p>
<p><strong>Reparatur-/Migrationsskripte sind nicht pauschal tot.</strong>
<code>step_fix_leaky.py</code> wird im Handoff vom 09.11. für einen erneuten STEP-Export benötigt.
<code>if_r2.py</code>, <code>if_r3.py</code> und <code>if_r4.py</code> verlangen jeweils die
vorherige INTERFACES-Revision und verändern die Vertragsdatei; historisch behalten,
nicht auf r4 erneut ausführen. <code>add_pin1_j5.py</code> ist in r4b/r4c-Handoffs dokumentiert.
Keine dieser Dateien wurde allein wegen weniger Referenzen entfernt.</p>
<p><strong>Bytegleiche Release-, Firmware-, Druck- und Renderkopien behalten.</strong>
<code>scripts/release/make_release.py</code> kopiert viele dieser Artefakte bewusst.
Es entfernt vor Neuaufbau sogar den bisherigen Artefaktordner: kein harmloser Prüfaufruf.
Baseline und ihre beiden Manifestkopien nicht neu generieren, um Hashabweichungen zu verdecken.
Das Manifest erfasst auch veränderliche Quelldokumente; deren Drift getrennt von
unveränderlichen Release-Artefakten beurteilen. Zeilenenden können Text-Hashes beeinflussen.</p>
<p class="muted">Belegpfade und Aufrufer stehen in der Einzeldateiansicht:
mk_upload.py, make_release.py sowie management/handoffs/pcb-engineer/
2026-11-08-r4b.md, 2026-11-08-r4c.md und 2026-11-09-step-dicht.md.
Aktuelle Quell-/Ergebnisrevisionen bleiben im PROJECT_STATE dokumentiert.
Keine vollständige semantische oder visuelle Einzelprüfung aller Binärdateien.</p></section>
<section><h2>Bewertung pro Datei</h2>
<div class="filters">
<label>Pfad / Empfehlung suchen<input id="search" type="search" placeholder="z. B. pcb_r3, kicad_prl, releases"></label>
<label>Einordnung<select id="category"><option value="">Alle</option></select></label>
<label>Merkmal<select id="feature"><option value="">Alle</option><option value="duplicates">Bytegleiche Duplikate</option><option value="no-refs">Keine statische Textreferenz gefunden</option><option value="modified">Lokal geändert / neu</option></select></label>
</div><p id="count" aria-live="polite"></p>
<div class="tablewrap"><table><thead><tr><th>Projektpfad / Stand</th><th>Bewertung / Nachweise</th></tr></thead><tbody id="rows"></tbody></table></div>
<p><button id="more" type="button">Weitere Dateien anzeigen</button></p></section>
<section><h2>Ignorierte lokale Inhalte</h2>
<p>Von Git gemeldete ignorierte Pfade, teils als Verzeichnisse zusammengefasst. Inhalte wurden nicht gelesen oder einzeln geprüft.
Darunter können Build-Caches, lokale Einstellungen, aber auch ungesicherte CAD-Exporte und Release-ZIPs liegen.
Deshalb ausdrücklich keine pauschale Cache-/Löschfreigabe.</p>
<details><summary id="ignored-count"></summary><ul id="ignored"></ul></details></section>
<footer>Design aus der Playground-Startseite (Grau/Lime). Statische Referenzanalyse und SHA-256-Gleichheit
sind Prüfhilfen, kein Beweis semantischer Aktualität. Keine Quelldatei durch diesen Generator gelöscht oder verändert.</footer>
<script id="audit-data" type="application/json">${data}</script>
<script>
const report=JSON.parse(document.getElementById('audit-data').textContent);
const byId=id=>document.getElementById(id);
function element(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
byId('coverage').textContent=report.trackedCount+' versionierte Pfade und '+report.records.filter(r=>!r.tracked).length+' nicht ignorierte neue Pfade erfasst; '+report.referenceFilesScanned+' Textdateien auf statische Referenzhinweise untersucht. '+report.duplicates.length+' Gruppen bytegleicher, nicht leerer Dateien.';
byId('commit').textContent=report.baseCommit;
for(const category of [...new Set(report.records.map(r=>r.category))].sort()){const o=element('option',category);o.value=category;byId('category').append(o);}
function hashes(title,entries){const box=document.createElement('details');box.append(element('summary',title+' · '+entries.filter(e=>e.status==='MATCH').length+'/'+entries.length+' MATCH'));for(const entry of entries){box.append(element('p',entry.status+' · '+entry.file));if(entry.status!=='MATCH')box.append(element('code','erwartet: '+entry.expected+' / aktuell: '+(entry.actual??'fehlt')));}byId('evidence').append(box);}
if(report.evidence){const e=report.evidence;byId('evidence').append(element('p',e.label));hashes('r4-Kollisions-Eingaben',e.collisionInputs);hashes('Baugruppen-Metadaten explode.json',e.explosionInputs);hashes('Exportdateien / Release-Kopien',e.releaseCopies);hashes('Baseline-Manifest: geschützte Artefakte',e.manifest.filter(x=>x.file.includes('/releases/')));hashes('Baseline-Manifest: veränderliche Quellen',e.manifest.filter(x=>!x.file.includes('/releases/')));hashes('Alte Anbieter-Gerber / heutige r4-Quelle',e.uploadCopies);byId('evidence').append(element('p','Gespeichertes Firmware-Log: '+e.firmware.tests+' Tests / '+e.firmware.failures+' Fehler in '+e.firmware.programs+' Programmen. Keine neue Testausführung.'));}
function sourceLink(file,line){const a=element('a',file+(line?':'+line:''));a.href=${JSON.stringify(SOURCE_URL)}+file.split('/').map(encodeURIComponent).join('/')+(line?'#L'+line:'');return a;}
let limit=100;
function draw(){const q=byId('search').value.toLowerCase(),cat=byId('category').value,f=byId('feature').value;const filtered=report.records.filter(r=>(r.path+' '+r.reason).toLowerCase().includes(q)&&(!cat||r.category===cat)&&(!f||(f==='duplicates'&&r.duplicates.length)||(f==='no-refs'&&!r.references.length)||(f==='modified'&&(r.modified||!r.tracked))));
byId('count').textContent=filtered.length+' passende Pfade; '+Math.min(limit,filtered.length)+' angezeigt.';byId('rows').replaceChildren();
for(const r of filtered.slice(0,limit)){const tr=document.createElement('tr'),left=document.createElement('td'),right=document.createElement('td');left.append(sourceLink(r.path));left.append(element('p',(r.tracked?'versioniert':'NEU / nicht versioniert')+(r.modified?' · LOKAL GEÄNDERT':'')+' · letzter Commit: '+(r.lastCommit??'nicht vorhanden')));if(r.bytes!==undefined)left.append(element('small',r.bytes+' Bytes'));right.append(element('strong',r.category),element('p',r.reason));const details=document.createElement('details');details.append(element('summary',r.references.length+' Textreferenzen · '+r.duplicates.length+' bytegleiche Partner'));details.append(element('p','SHA-256: '+(r.sha256??'nicht ermittelt (siehe Einordnung)')));for(const ref of r.references){const p=document.createElement('p');p.append(sourceLink(ref.source,ref.line),element('small',' · '+ref.kind));details.append(p);}for(const file of r.duplicates){const p=element('p','Bytegleich: ');p.append(sourceLink(file));details.append(p);}right.append(details);tr.append(left,right);byId('rows').append(tr);}
byId('more').hidden=limit>=filtered.length;}
for(const id of ['search','category','feature'])byId(id).addEventListener('input',()=>{limit=100;draw();});byId('more').addEventListener('click',()=>{limit+=100;draw();});byId('ignored-count').textContent=report.ignored.length+' ignorierte Pfade / Verzeichnisse';for(const file of report.ignored)byId('ignored').append(element('li',file));draw();
</script></main></body></html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const report = collect(root);
  writeFileSync(path.join(root, OUTPUT), render(report), 'utf8');
  console.log(`${OUTPUT}: ${report.records.length} Pfade, ${report.duplicates.length} Duplikatgruppen; keine Dateien gelöscht.`);
}
