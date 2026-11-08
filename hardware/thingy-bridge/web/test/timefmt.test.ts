import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtRelative, fmtRelativePrecise, clockPrecise, fmtSpan } from '../src/timefmt.ts';

test('fmtRelative', () => {
  assert.equal(fmtRelative(0), 'jetzt');
  assert.equal(fmtRelative(-400), 'jetzt');
  assert.equal(fmtRelative(-30_000), '−30 s');
  assert.equal(fmtRelative(-60_000), '−1 min');
  assert.equal(fmtRelative(-90_000), '−1:30 min');
  assert.equal(fmtRelative(-305_000), '−5:05 min');
});

test('fmtRelativePrecise shows tenths', () => {
  assert.equal(fmtRelativePrecise(-12_345), '−12.3 s');
  assert.equal(fmtRelativePrecise(-20), 'jetzt');
  assert.equal(fmtRelativePrecise(-65_200), '−1:05.2 min');
});

test('clockPrecise appends tenths to the local clock time', () => {
  const t = new Date(2026, 10, 7, 10, 38, 47, 360).getTime();
  assert.equal(clockPrecise(t), '10:38:47.3');
});

test('fmtSpan', () => {
  assert.equal(fmtSpan(10_000), '10 s');
  assert.equal(fmtSpan(60_000), '1 min');
  assert.equal(fmtSpan(90_000), '1:30 min');
});
