import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWindow, zoomView, panView, withSpan, togglePause, liveView, wheelFactor, pinchFactor, presetFor,
  type Limits,
} from '../src/timewindow.ts';

const now = 1_000_000;
const L: Limits = { minSpan: 5_000, maxSpan: 300_000 };

test('live window ends at now', () => {
  assert.deepEqual(resolveWindow({ span: 30_000, end: null }, now), { t0: now - 30_000, t1: now });
  assert.deepEqual(resolveWindow({ span: 10_000, end: now - 5_000 }, now), { t0: now - 15_000, t1: now - 5_000 });
});

test('zooming a live window keeps it live and clamps the span', () => {
  assert.deepEqual(zoomView({ span: 30_000, end: null }, now, 0.5, 0.2, L), { span: 15_000, end: null });
  assert.deepEqual(zoomView({ span: 30_000, end: null }, now, 100, 0.5, L), { span: 300_000, end: null });
  assert.deepEqual(zoomView({ span: 10_000, end: null }, now, 0.01, 0.5, L), { span: 5_000, end: null });
});

test('zooming a paused window keeps the anchor time under the cursor', () => {
  const v = { span: 20_000, end: now - 100_000 };
  const z = zoomView(v, now, 0.5, 0.25, L);
  const before = resolveWindow(v, now);
  const after = resolveWindow(z, now);
  const anchor = before.t0 + 0.25 * 20_000;
  assert.equal(z.span, 10_000);
  assert.equal(after.t0 + 0.25 * 10_000, anchor);
});

test('zooming out a paused window never reaches past now', () => {
  const z = zoomView({ span: 20_000, end: now - 1_000 }, now, 4, 0.5, L);
  assert.equal(z.end, now);
});

test('panning pauses and is clamped to [oldest + span, now]', () => {
  assert.deepEqual(panView({ span: 10_000, end: null }, now, -4_000, L), { span: 10_000, end: now - 4_000 });
  assert.deepEqual(panView({ span: 10_000, end: now - 4_000 }, now, 9_000, L), { span: 10_000, end: now });
  const withHistory = { ...L, oldest: now - 60_000 };
  assert.deepEqual(panView({ span: 10_000, end: null }, now, -500_000, withHistory), { span: 10_000, end: now - 50_000 });
});

test('panning with less history than the span stays at now', () => {
  assert.deepEqual(panView({ span: 30_000, end: null }, now, -5_000, { ...L, oldest: now - 10_000 }), { span: 30_000, end: now });
});

test('withSpan, togglePause, liveView', () => {
  assert.deepEqual(withSpan({ span: 30_000, end: null }, 60_000, now, L), { span: 60_000, end: null });
  assert.deepEqual(togglePause({ span: 30_000, end: null }, now), { span: 30_000, end: now });
  assert.deepEqual(togglePause({ span: 30_000, end: now - 9 }, now), { span: 30_000, end: null });
  assert.deepEqual(liveView({ span: 7_000, end: 5 }), { span: 7_000, end: null });
});

test('wheel and pinch factors', () => {
  assert.ok(wheelFactor(100) > 1 && wheelFactor(-100) < 1);
  assert.equal(wheelFactor(0), 1);
  assert.equal(pinchFactor(100, 200), 0.5);
  assert.equal(pinchFactor(100, 0), 1);
});

test('presetFor recognises preset spans only', () => {
  assert.equal(presetFor({ span: 60_000, end: null }), 60_000);
  assert.equal(presetFor({ span: 61_000, end: null }), null);
});
