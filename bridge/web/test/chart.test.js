import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valueRange, toPoints } from '../static/js/chart.js';

test('valueRange spans all finite values of all series with padding', () => {
  const r = valueRange([[0, 1], [-1, null]], 0);
  assert.ok(r.min < -1 && r.max > 1);
});

test('valueRange enforces a minimum span around the centre', () => {
  assert.deepEqual(valueRange([[1, 1, 1]], 2), { min: 0, max: 2 });
});

test('valueRange of empty data is the minimum span around zero', () => {
  assert.deepEqual(valueRange([[], [null]], 2), { min: -1, max: 1 });
});

test('toPoints maps samples right-aligned onto the canvas and skips gaps', () => {
  const pts = toPoints([0, null, 10], { min: 0, max: 10 }, { width: 100, height: 50, capacity: 3 });
  assert.deepEqual(pts, [{ x: 0, y: 50 }, null, { x: 100, y: 0 }]);
});

test('toPoints right-aligns a partially filled buffer', () => {
  const pts = toPoints([5], { min: 0, max: 10 }, { width: 100, height: 50, capacity: 3 });
  assert.deepEqual(pts, [{ x: 100, y: 25 }]);
});
