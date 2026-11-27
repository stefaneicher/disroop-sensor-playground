import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weekKey, nextReset, newState, remainingMs, addUsage, addBonus, counts, budgetMs,
} from '../console/kinder/zeitkonto.js';
import { buildCatalog } from '../scripts/kids-catalog.mjs';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test('Woche beginnt am Samstag um 00:00', () => {
  // 27.11.2026 ist ein Freitag, 28.11.2026 ein Samstag
  assert.equal(weekKey(at(2026, 11, 27)), '2026-11-21');
  assert.equal(weekKey(at(2026, 11, 27, 23, 59)), '2026-11-21');
  assert.equal(weekKey(at(2026, 11, 28, 0, 0)), '2026-11-28');
  assert.equal(weekKey(at(2026, 11, 28, 10)), '2026-11-28');
  assert.equal(nextReset(at(2026, 11, 27)).getTime(), at(2026, 11, 28, 0, 0));
});

test('jedes Kind hat eigene 30 Minuten', () => {
  const s = newState();
  const now = at(2026, 11, 27);
  assert.equal(remainingMs(s, 'k1', now), 30 * 60_000);
  for (let i = 0; i < 10; i++) addUsage(s, 'k1', 60_000, now + i * 60_000, 'kids-turbo-pokal');
  assert.equal(remainingMs(s, 'k1', now), 20 * 60_000);
  assert.equal(remainingMs(s, 'k2', now), 30 * 60_000);
});

test('Konto ist am Samstag wieder voll', () => {
  const s = newState();
  for (let i = 0; i < 40; i++) addUsage(s, 'k1', 60_000, at(2026, 11, 27, 10) + i * 60_000, 'x');
  assert.equal(remainingMs(s, 'k1', at(2026, 11, 27, 18)), 0);
  assert.equal(remainingMs(s, 'k1', at(2026, 11, 28, 9)), 30 * 60_000);
});

test('ein Tick zählt höchstens eine Minute (z. B. nach Standby)', () => {
  const s = newState();
  const now = at(2026, 11, 27);
  addUsage(s, 'k1', 3_600_000, now, 'x');
  assert.equal(remainingMs(s, 'k1', now), 29 * 60_000);
});

test('Bonus und eigenes Budget pro Kind', () => {
  const s = newState();
  const now = at(2026, 11, 27);
  addBonus(s, 'k2', 10, now);
  assert.equal(budgetMs(s, 'k2', now), 40 * 60_000);
  s.kids[2].minutes = 15;
  assert.equal(budgetMs(s, 'k3', now), 15 * 60_000);
});

test('Lernspiele zählen nur, wenn eingestellt', () => {
  const s = newState();
  assert.equal(counts(s, { category: 'Lernen' }), true);
  s.settings.countLearning = false;
  assert.equal(counts(s, { category: 'Lernen' }), false);
  assert.equal(counts(s, { category: 'Rennen' }), true);
});

test('Katalog enthält alle Kinderspiele mit gültigem Pfad', () => {
  const { games } = buildCatalog();
  assert.ok(games.length >= 20);
  for (const g of games) {
    assert.match(g.id, /^kids-/);
    assert.ok(g.name && g.category && g.path.endsWith('.html'));
  }
});
