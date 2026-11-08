import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimeSeries } from '../src/series.ts';

test('TimeSeries keeps the newest samples, missing values as NaN', () => {
  const s = new TimeSeries(['x', 'y'], 3);
  s.push(10, { x: 1, y: null });
  s.push(20, { x: 2, y: 5 });
  s.push(30, null);
  s.push(40, { x: 4, y: 6 });
  assert.equal(s.length, 3);
  assert.deepEqual([0, 1, 2].map((i) => s.time(i)), [20, 30, 40]);
  assert.deepEqual([0, 1, 2].map((i) => s.value('x', i)), [2, NaN, 4]);
  assert.equal(s.oldest, 20);
  assert.equal(s.newest, 40);
});

test('lowerBound and nearest search by time', () => {
  const s = new TimeSeries(['v'], 10);
  for (const t of [100, 200, 300, 400]) s.push(t, { v: t });
  assert.equal(s.lowerBound(50), 0);
  assert.equal(s.lowerBound(200), 1);
  assert.equal(s.lowerBound(250), 2);
  assert.equal(s.lowerBound(999), 4);
  assert.equal(s.nearest(240), 1);
  assert.equal(s.nearest(260), 2);
  assert.equal(s.nearest(-5), 0);
  assert.equal(s.nearest(9999), 3);
  assert.equal(new TimeSeries(['v'], 2).nearest(1), -1);
});

test('TimeSeries rejects invalid capacity', () => {
  assert.throws(() => new TimeSeries(['v'], 0));
});
