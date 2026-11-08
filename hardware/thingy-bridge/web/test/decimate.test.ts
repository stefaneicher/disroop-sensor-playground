import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimeSeries } from '../src/series.ts';
import { decimate, extent, padRange } from '../src/decimate.ts';

const series = (values: (number | null)[], dt = 100): TimeSeries => {
  const s = new TimeSeries(['v'], Math.max(1, values.length));
  values.forEach((v, i) => s.push(i * dt, { v }));
  return s;
};
const pairs = (flat: number[]): [number, number][] => Array.from({ length: flat.length / 2 }, (_, i) => [flat[2 * i]!, flat[2 * i + 1]!]);

test('few samples pass through unchanged', () => {
  const s = series([1, 2, 3]);
  assert.deepEqual(pairs(decimate(s, 'v', 0, 3, 0, 300, 100)), [[0, 1], [100, 2], [200, 3]]);
});

test('missing values and time gaps break the line', () => {
  const s = new TimeSeries(['v'], 10);
  [[0, 1], [100, null], [200, 3], [300, 4], [5000, 5]].forEach(([t, v]) => s.push(t!, { v }));
  const out = pairs(decimate(s, 'v', 0, 5, 0, 5000, 100, 1000));
  assert.deepEqual(out.map(([t, v]) => (Number.isNaN(v) ? 'break' : t)), [0, 'break', 200, 300, 'break', 5000]);
});

test('decimation keeps extremes and bounds the output', () => {
  const values = Array.from({ length: 10_000 }, (_, i) => Math.sin(i / 50));
  values[4321] = 9; values[777] = -9;
  const s = series(values, 10);
  const out = decimate(s, 'v', 0, s.length, 0, 100_000, 200);
  const vs = pairs(out).map(([, v]) => v);
  assert.ok(out.length / 2 <= 4 * 200 + 4, String(out.length));
  assert.ok(vs.includes(9) && vs.includes(-9));
  const ts = pairs(out).map(([t]) => t);
  assert.deepEqual(ts, [...ts].sort((a, b) => a - b));
});

test('extent ignores NaN and padRange enforces a minimum span', () => {
  const s = new TimeSeries(['a', 'b'], 4);
  s.push(0, { a: 1, b: null }); s.push(1, { a: -2, b: 7 });
  assert.deepEqual(extent(s, ['a', 'b'], 0, 2), { min: -2, max: 7 });
  assert.deepEqual(extent(s, ['b'], 0, 1), null);
  assert.deepEqual(padRange(null, 2), { min: -1, max: 1 });
  assert.deepEqual(padRange({ min: 1, max: 1 }, 2), { min: 0, max: 2 });
  const p = padRange({ min: 0, max: 10 }, 1);
  assert.ok(p.min < 0 && p.max > 10);
});
