import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceStep, niceScale, stepDecimals, fmtTick, timeStep, timeTicks } from '../src/axis.ts';

test('niceStep rounds up to 1-2-5 × 10^k', () => {
  assert.equal(niceStep(0.7), 1);
  assert.equal(niceStep(1.3), 2);
  assert.equal(niceStep(3), 5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(0.023), 0.05);
  assert.equal(niceStep(200), 200);
  assert.equal(niceStep(0), 1);
});

test('niceScale expands to nice bounds with at most maxTicks intervals', () => {
  assert.deepEqual(niceScale(-0.93, 1.07, 4), { min: -1, max: 2, step: 1, ticks: [-1, 0, 1, 2] });
  const s = niceScale(-0.93, 1.07, 4);
  assert.ok(s.ticks.length - 1 <= 4, JSON.stringify(s));
  assert.ok(s.min <= -0.93 && s.max >= 1.07);
  assert.deepEqual(niceScale(-80, 0, 4), { min: -80, max: 0, step: 20, ticks: [-80, -60, -40, -20, 0] });
});

test('niceScale ticks have no floating point noise and no -0', () => {
  const s = niceScale(-0.3, 0.3, 6);
  assert.deepEqual(s.ticks, [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]);
  assert.ok(!s.ticks.some((t) => Object.is(t, -0)));
});

test('niceScale handles an empty span', () => {
  const s = niceScale(5, 5, 4);
  assert.ok(s.min < 5 && s.max > 5);
});

test('stepDecimals and fmtTick', () => {
  assert.equal(stepDecimals(20), 0);
  assert.equal(stepDecimals(0.5), 1);
  assert.equal(stepDecimals(0.05), 2);
  assert.equal(fmtTick(-0.5, 1), '−0.5');
  assert.equal(fmtTick(-0.0001, 1), '0.0');
  assert.equal(fmtTick(40, 0), '40');
});

test('timeStep picks the smallest step that fits', () => {
  assert.equal(timeStep(30_000, 6), 5_000);
  assert.equal(timeStep(10_000, 10), 1_000);
  assert.equal(timeStep(300_000, 6), 60_000);
});

test('relative time ticks are anchored at now and end with "jetzt"', () => {
  const now = 1_000_000;
  const ticks = timeTicks(now - 30_000, now, 6, 'relative', now);
  assert.deepEqual(ticks.map((t) => t.label), ['−30 s', '−25 s', '−20 s', '−15 s', '−10 s', '−5 s', 'jetzt']);
  assert.equal(ticks.at(-1)?.t, now);
});

test('relative ticks of a paused window lie inside the window', () => {
  const now = 1_000_000;
  const ticks = timeTicks(now - 95_000, now - 65_000, 3, 'relative', now);
  assert.deepEqual(ticks.map((t) => t.label), ['−1:30 min', '−1:20 min', '−1:10 min']);
});

test('clock ticks sit on wall-clock multiples of the step', () => {
  const t0 = Date.UTC(2026, 0, 1, 10, 0, 3);
  const ticks = timeTicks(t0, t0 + 20_000, 4, 'clock', t0);
  assert.equal(ticks.length, 4);
  assert.ok(ticks.every((t) => t.t % 5_000 === 0 && /^\d\d:\d\d:\d\d$/.test(t.label)));
});
