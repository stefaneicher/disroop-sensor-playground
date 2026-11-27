import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  weekKey, nextReset, newState, restore, remainingMs, addUsage, addBonus, resetWeek, counts, budgetMs,
  PARENT_CODE_SHA256, formatMs,
} from '../console/kinder/zeitkonto.js';
import { buildCatalog } from '../scripts/kids-catalog.mjs';
import { existsSync } from 'node:fs';
import path from 'node:path';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const play = (s, minutes, start) => { for (let i = 0; i < minutes; i++) addUsage(s, 60_000, start + i * 60_000, 'x'); };

test('Woche beginnt am Samstag um 00:00', () => {
  // 27.11.2026 ist ein Freitag, 28.11.2026 ein Samstag
  assert.equal(weekKey(at(2026, 11, 27)), '2026-11-21');
  assert.equal(weekKey(at(2026, 11, 27, 23, 59)), '2026-11-21');
  assert.equal(weekKey(at(2026, 11, 28, 0, 0)), '2026-11-28');
  assert.equal(nextReset(at(2026, 11, 27)).getTime(), at(2026, 11, 28, 0, 0));
});

test('30 Minuten pro Woche, am Samstag wieder voll', () => {
  const s = newState();
  assert.equal(remainingMs(s, at(2026, 11, 27)), 30 * 60_000);
  play(s, 10, at(2026, 11, 27, 10));
  assert.equal(remainingMs(s, at(2026, 11, 27, 11)), 20 * 60_000);
  play(s, 30, at(2026, 11, 27, 12));
  assert.equal(remainingMs(s, at(2026, 11, 27, 18)), 0);
  assert.equal(remainingMs(s, at(2026, 11, 28, 9)), 30 * 60_000);
});

test('ein Tick zählt höchstens eine Minute (z. B. nach Standby)', () => {
  const s = newState();
  addUsage(s, 3_600_000, at(2026, 11, 27), 'x');
  assert.equal(remainingMs(s, at(2026, 11, 27)), 29 * 60_000);
});

test('Eltern: Bonus, zurücksetzen, unbegrenzt', () => {
  const s = newState();
  const now = at(2026, 11, 27);
  play(s, 30, now - 3_600_000);
  assert.equal(remainingMs(s, now), 0);
  addBonus(s, 10, now);
  assert.equal(budgetMs(s, now), 40 * 60_000);
  assert.equal(remainingMs(s, now), 10 * 60_000);
  resetWeek(s, now);
  assert.equal(remainingMs(s, now), 30 * 60_000);
  s.unlimited = true;
  play(s, 120, now);
  assert.equal(remainingMs(s, now), Infinity);
  assert.equal(formatMs(remainingMs(s, now)), '∞');
});

test('Lernspiele zählen nur, wenn eingestellt', () => {
  const s = newState();
  assert.equal(counts(s, { category: 'Lernen' }), true);
  s.settings.countLearning = false;
  assert.equal(counts(s, { category: 'Lernen' }), false);
  assert.equal(counts(s, { category: 'Rennen' }), true);
});

test('alter Zustand (v1 mit Kinderprofilen) wird zu frischem Konto', () => {
  assert.deepEqual(restore({ version: 1, kids: [] }), newState());
  const s = newState(); s.unlimited = true;
  assert.equal(restore(JSON.parse(JSON.stringify(s))).unlimited, true);
});

test('Eltern-Code ist als SHA-256 hinterlegt', () => {
  assert.match(PARENT_CODE_SHA256, /^[0-9a-f]{64}$/);
  assert.notEqual(PARENT_CODE_SHA256, createHash('sha256').update('spielplatz:000000').digest('hex'));
});

test('Katalog enthält alle Kinderspiele mit gültigem Pfad', () => {
  const { games } = buildCatalog();
  assert.ok(games.length >= 20);
  for (const g of games) {
    assert.match(g.id, /^kids-/);
    assert.ok(g.name && g.category && g.path.endsWith('.html'));
    assert.ok(g.thumb && existsSync(path.join('games', g.id, g.thumb)), `Vorschaubild fehlt: ${g.id}`);
  }
});
