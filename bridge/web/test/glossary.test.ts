import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOSSARY, glossaryEntry, isExplained } from '../src/glossary.ts';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const example = JSON.parse(read('../../../shared/telemetry.example.json'));
const html = read('../static/index.html');
const doc = read('../../../docs/MESSGROESSEN.md');

// Measurement leaves of the snapshot; identity, timestamps and UI/song state are not physical quantities.
const NOT_MEASURED = ['ts', 'connected', 'device.name', 'device.address', 'device.source', 'sound.song', 'ui'];

function leaves(v: unknown, prefix = ''): string[] {
  if (v === null || typeof v !== 'object') return [prefix];
  return Object.entries(v).flatMap(([k, c]) => leaves(c, prefix ? `${prefix}.${k}` : k));
}

test('every measured snapshot field has an explanation', () => {
  const measured = leaves(example).filter((p) => !NOT_MEASURED.some((n) => p === n || p.startsWith(`${n}.`)));
  assert.ok(measured.length > 20);
  assert.deepEqual(measured.filter((p) => !isExplained(p)), []);
});

test('every entry is complete: unique id, unit, sensor, 2–4 sentences, typical values', () => {
  assert.equal(new Set(GLOSSARY.map((e) => e.id)).size, GLOSSARY.length);
  for (const e of GLOSSARY) {
    for (const k of ['title', 'unit', 'sensor', 'text', 'typical'] as const) assert.ok(e[k].trim().length > 0, `${e.id}.${k}`);
    const sentences = e.text.replace(/z\. B\.|ü\. M\.|bzw\./g, '').split(/(?<=[.!?])\s+(?=\S)/).length;
    assert.ok(sentences >= 2 && sentences <= 4, `${e.id}: ${sentences} sentences`);
  }
});

test('the dashboard has an ⓘ button for every entry and none without one', () => {
  const ids = new Set([...html.matchAll(/data-info="([^"]+)"/g)].map((m) => m[1] ?? ''));
  assert.deepEqual([...ids].filter((id) => !glossaryEntry(id)), []);
  assert.deepEqual(GLOSSARY.map((e) => e.id).filter((id) => !ids.has(id)), []);
});

test('docs/MESSGROESSEN.md lists every quantity', () => {
  assert.deepEqual(GLOSSARY.filter((e) => !doc.includes(`| ${e.title} |`)).map((e) => e.title), []);
});

test('isExplained matches fields by prefix only on path boundaries', () => {
  assert.ok(isExplained('motion.accel_g.x'));
  assert.ok(isExplained('environment.color.clear'));
  assert.ok(!isExplained('motion.accel_gx'));
  assert.equal(glossaryEntry('nope'), undefined);
});
