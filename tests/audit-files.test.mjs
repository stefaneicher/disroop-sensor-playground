import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { classify, collect, duplicateGroups, manifestEntries, referenceIndex, render, sha256 } from '../scripts/audit-files.mjs';

test('release copies stay protected while local KiCad state is only a candidate', () => {
  assert.equal(classify('devices/motion-one/releases/V1_BASELINE/a.kicad_prl').category, 'Snapshot behalten');
  assert.equal(classify('devices/motion-one/electronics/smoke/a.kicad_prl').category, 'Aufräumkandidat');
  assert.equal(classify('tennis/src/core/game.ts').category, 'Behalten / Nutzung prüfen');
});

test('references resolve relative paths, extensionless imports and unique names without self references', () => {
  const records = ['app/main.ts', 'app/game.ts', 'docs/readme.md', 'a/index.html', 'b/index.html']
    .map(file => ({ path: file }));
  const refs = referenceIndex(records, new Map([
    ['app/main.ts', "import './game';\nmain.ts"],
    ['docs/readme.md', '../app/main.ts\ngame.ts\nindex.html'],
  ]));
  assert.equal(refs.get('app/main.ts').length, 1);
  assert.equal(refs.get('app/game.ts').length, 2);
  assert.equal(refs.get('app/game.ts')[0].line, 1);
  assert.equal(refs.get('a/index.html').length, 0);
  assert.equal(refs.get('b/index.html').length, 0);
});

test('duplicates require exact nonempty bytes and never imply removal', () => {
  const hash = sha256(Buffer.from('same'));
  const groups = duplicateGroups([
    { path: 'a', sha256: hash, bytes: 4 },
    { path: 'b', sha256: hash, bytes: 4 },
    { path: 'empty1', sha256: 'empty', bytes: 0 },
    { path: 'empty2', sha256: 'empty', bytes: 0 },
  ]);
  assert.deepEqual(groups, [{ sha256: hash, files: ['a', 'b'] }]);
});

test('inventory includes new and missing tracked files, not ignored content', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'file-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init');
  writeFileSync(path.join(root, '.gitignore'), 'ignored/\n');
  writeFileSync(path.join(root, 'tracked.txt'), 'original');
  writeFileSync(path.join(root, 'missing.txt'), 'to remove');
  git('add', '.');
  git('-c', 'user.name=Audit Test', '-c', 'user.email=audit@example.invalid', 'commit', '-m', 'fixture');
  writeFileSync(path.join(root, 'tracked.txt'), 'changed');
  writeFileSync(path.join(root, 'new.txt'), 'new');
  rmSync(path.join(root, 'missing.txt'));
  mkdirSync(path.join(root, 'ignored'));
  writeFileSync(path.join(root, 'ignored', 'local.txt'), 'must not be read');
  const report = collect(root, { engineering: false });
  assert.equal(report.trackedCount, 3);
  assert.equal(report.records.length, 4);
  assert.equal(report.records.find(r => r.path === 'tracked.txt').modified, true);
  assert.equal(report.records.find(r => r.path === 'new.txt').tracked, false);
  assert.equal(report.records.find(r => r.path === 'missing.txt').category, 'Fehlt im Arbeitsbaum');
  assert.ok(report.ignored.includes('ignored/'));
});

test('embedded JSON cannot close its script element', () => {
  const html = render({ records: [], marker: '</script><img src=x>' });
  assert.ok(html.includes('\\u003c/script>\\u003cimg src=x>'));
  assert.ok(!html.includes('</script><img src=x>'));
});

test('manifest entries reject malformed or contradictory lines and deduplicate matching paths', () => {
  const hash = sha256(Buffer.from('same'));
  const line = `${hash}  releases/a.bin   (Quelle logs/a.bin)`;
  assert.deepEqual(manifestEntries(`# comment\r\n${line}\r\n${line}\r\n`), [{ file: 'releases/a.bin', hash }]);
  assert.throws(() => manifestEntries('invalid'), /Ungültige Manifestzeile/);
  assert.throws(() => manifestEntries(`${line}\n${'0'.repeat(64)}  releases/a.bin`), /Widersprüchliche/);
});
